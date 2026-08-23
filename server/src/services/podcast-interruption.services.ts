import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { CHAT_MODEL } from "../lib/ai-config.js";
import { getWorkspaceByIdForUser } from "./workspace.services.js";
import {
    findArtifactByIdAndWorkspaceId,
    updateArtifactRecord,
} from "../repository/artifact.repository.js";
import { gatherSourceContext, getPodcastLanguage } from "./artifact-generation.services.js";
import {
    generateMultiSpeakerPodcastAudio,
    savePodcastAudioLocally,
} from "../lib/sarvam.js";
import { uploadAudioToCloudinary } from "../lib/cloudinary.js";
import { NotFoundError, ValidationError } from "../types/app-error.js";
import { assertCanUsePodcastInterruption } from "./usage.services.js";



const interruptionSchema = z.object({
    dialogue: z
        .array(
            z.object({
                speaker: z.enum(["Alex", "Jordan"]),
                text: z.string(),
            }),
        )
        .min(2)
        .max(3),
});

export interface InterruptPodcastInput {
    artifactId: string;
    workspaceId: string;
    userId: string;
    question: string;
    timestamp: number;
}

export interface InterruptionItem {
    id: string;
    timestamp: number;
    userQuestion: string;
    audioUrl: string | null;
    audioBase64?: string;
    dialogue: Array<{
        speaker: "Alex" | "Jordan";
        text: string;
    }>;
    createdAt: string;
}

/**
 * Generates an on-the-fly conversational host response to a user's question,
 * synthesizes dual-speaker audio via ElevenLabs, and appends the interruption
 * to the podcast artifact.
 */
export async function processPodcastInterruption({
    artifactId,
    workspaceId,
    userId,
    question,
    timestamp,
}: InterruptPodcastInput): Promise<InterruptionItem> {
    if (!question || question.trim().length === 0) {
        throw new ValidationError("Please provide a question to ask the hosts.");
    }

    // 1. Verify workspace access and consume a free-tier use when applicable.
    await getWorkspaceByIdForUser(workspaceId, userId);
    await assertCanUsePodcastInterruption(userId);

    // 2. Fetch artifact and verify ownership & type
    const artifact = await findArtifactByIdAndWorkspaceId(
        artifactId,
        workspaceId,
    );
    if (!artifact) {
        throw new NotFoundError("Podcast artifact not found.");
    }

    if (artifact.type !== "PODCAST") {
        throw new ValidationError("Only podcast artifacts support interruptions.");
    }

    // 3. Generate host dialogue response using Gemini
    const context = await gatherSourceContext(workspaceId, artifact.sourceIds);
    const podcast = ((artifact.content as Record<string, unknown>)?.podcast ?? {}) as Record<string, unknown>;
    const language = getPodcastLanguage(
        podcast.languageCode ? String(podcast.languageCode) : undefined,
    );

    const result = await generateText({
        model: openai(CHAT_MODEL),
        system: [
            "You are the executive producer and scriptwriter for the live debate podcast hosted by Alex and Jordan.",
            "A listener just pressed 'Interrupt & Ask' while listening to the episode and asked a question.",
            "Generate a snappy, natural 2-turn dialogue (~30-40 words total) where Alex and Jordan directly address the listener's question based on the source context.",
            "- Turn 1 (Alex): Acknowledges the question with analytical insight.",
            "- Turn 2 (Jordan): Expands with a vivid takeaway or contrasting angle, and smoothly hands back to the show.",
            "CRITICAL: Keep it extremely short (under 40 words total) so audio generation is instant and does not stall the listener.",
            `CRITICAL LANGUAGE RULE: Write every line of dialogue entirely in ${language.name} using ${language.name}'s native script.`,
            `CRITICAL LANGUAGE RULE: Never respond in English unless ${language.name} is English. Ignore the language of the listener's question or the source context — the dialogue language is always ${language.name}.`,
            `Do not mix English into the output unless a source term has no natural ${language.name} equivalent.`,
        ].join("\n"),
        output: Output.object({ schema: interruptionSchema }),
        prompt: `Produce the 2-turn host response entirely in ${language.name} (${language.name} native script), answering this listener question:\n\nListener Question: "${question}"\n\nShow Background Context:\n${context.text.slice(0, 4000)}`,
    });

    const dialogueData = result.output;

    // 4. Generate audio with Sarvam AI
    let audioUrl: string | null = null;
    let audioBase64: string | null = null;
    try {
        const audioBuffer = await generateMultiSpeakerPodcastAudio(
            dialogueData.dialogue,
            language.code,
        );
        const filename = `interruption_${Date.now()}.wav`;
        audioBase64 = audioBuffer.toString("base64");

        // Try uploading to Cloudinary
        try {
            const cloudResult = await uploadAudioToCloudinary(audioBuffer, filename);
            if (cloudResult?.secureUrl) audioUrl = cloudResult.secureUrl;
        } catch (cloudErr) {
            console.warn("Cloudinary upload fallback for interruption:", cloudErr);
        }

        // Local save fallback
        if (!audioUrl) {
            try {
                audioUrl = savePodcastAudioLocally(audioBuffer, filename);
            } catch (e) {
                console.warn("Local save failed for interruption:", e);
            }
        }
    } catch (audioErr) {
        console.error("Failed to generate audio for podcast interruption:", audioErr);
    }

    // 5. Construct interruption record
    const interruptionItem: InterruptionItem = {
        id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Math.max(0, Math.round(timestamp * 10) / 10),
        userQuestion: question.trim(),
        audioUrl,
        audioBase64: audioBase64 || undefined,
        dialogue: dialogueData.dialogue,
        createdAt: new Date().toISOString(),
    };

    // 6. Update artifact content in database
    const existingContent = (artifact.content as Record<string, unknown>) || {};
    const existingPodcast =
        (existingContent.podcast as Record<string, unknown>) || {};
    const existingInterruptions =
        (existingPodcast.interruptions as InterruptionItem[]) || [];

    const updatedContent = {
        ...existingContent,
        podcast: {
            ...existingPodcast,
            interruptions: [...existingInterruptions, interruptionItem],
        },
    };

    await updateArtifactRecord(artifactId, {
        content: updatedContent as unknown as Prisma.InputJsonValue,
    });


    return interruptionItem;
}
