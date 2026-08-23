import fs from "fs";
import path from "path";
import { AppError } from "../types/app-error.js";

// Sarvam AI Bulbul TTS speakers
export const SARVAM_VOICES = {
    ALEX: "amit",
    JORDAN: "kavya",
} as const;

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_SAMPLE_RATE = 22050;

const SARVAM_LANGUAGE_CODES: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    or: "od-IN",
    od: "od-IN",
    mr: "mr-IN",
    bn: "bn-IN",
    ta: "ta-IN",
    te: "te-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    gu: "gu-IN",
};

export interface SpeechTurn {
    speaker: "Alex" | "Jordan";
    text: string;
}

/** Maps internal short language codes (en, hi, or...) to Sarvam locale codes (en-IN, hi-IN, od-IN...). */
export function toSarvamLanguageCode(languageCode?: string): string {
    if (!languageCode) return "en-IN";
    return (
        SARVAM_LANGUAGE_CODES[languageCode.toLowerCase()] ??
        `${languageCode}-IN`
    );
}

/**
 * Synthesizes a single turn of text into a WAV buffer using the Sarvam AI TTS API.
 */
export async function synthesizeSarvamSpeech(
    text: string,
    speaker: string,
    languageCode?: string,
): Promise<Buffer> {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new AppError(
            500,
            "SARVAM_API_KEY is not configured in server/.env",
        );
    }

    const response = await fetch(SARVAM_TTS_URL, {
        method: "POST",
        headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            inputs: [text],
            target_language_code: toSarvamLanguageCode(languageCode),
            speaker,
            model: "bulbul:v3",
            speech_sample_rate: SARVAM_SAMPLE_RATE,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Sarvam TTS Error:", response.status, errorText);
        throw new AppError(
            500,
            `Sarvam TTS generation failed (${response.status}): ${errorText || "API Error"}`,
        );
    }

    const result = (await response.json()) as {
        audios?: string[];
        detail?: string;
        message?: string;
    };

    const audioBase64 = result.audios?.[0];
    if (!audioBase64) {
        throw new AppError(
            500,
            `Sarvam TTS returned no audio: ${result.detail ?? result.message ?? "empty response"}`,
        );
    }

    return Buffer.from(audioBase64, "base64");
}

interface WavChunks {
    fmtChunk: Buffer | null;
    pcm: Buffer;
}

function parseWav(buffer: Buffer): WavChunks | null {
    if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") {
        return null;
    }

    let offset = 12; // skip RIFF header + "WAVE"
    let fmtChunk: Buffer | null = null;
    const pcmParts: Buffer[] = [];

    while (offset + 8 <= buffer.length) {
        const chunkId = buffer.toString("ascii", offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        const chunkStart = offset + 8;
        if (chunkStart + chunkSize > buffer.length) break;

        if (chunkId === "fmt ") {
            fmtChunk = buffer.subarray(chunkStart - 8, chunkStart + chunkSize);
        } else if (chunkId === "data") {
            pcmParts.push(buffer.subarray(chunkStart, chunkStart + chunkSize));
        }

        offset = chunkStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
    }

    if (!fmtChunk || pcmParts.length === 0) return null;
    return { fmtChunk, pcm: Buffer.concat(pcmParts) };
}

/**
 * Merges multiple same-format WAV buffers into a single valid WAV buffer.
 * Falls back to naive concatenation when a buffer cannot be parsed.
 */
function mergeWavBuffers(buffers: Buffer[]): Buffer {
    if (buffers.length <= 1) return buffers[0];

    const parsed = buffers.map(parseWav);
    if (parsed.some((chunk) => chunk === null)) {
        console.warn("Sarvam: non-WAV audio detected, concatenating raw buffers");
        return Buffer.concat(buffers);
    }

    const chunks = parsed as Array<{ fmtChunk: Buffer; pcm: Buffer }>;
    const fmtChunk = chunks[0].fmtChunk;
    const pcm = Buffer.concat(chunks.map((chunk) => chunk.pcm));

    const dataSize = pcm.length;
    const totalSize =
        12 + // RIFF + size + WAVE
        fmtChunk.length +
        8 +
        dataSize;

    const output = Buffer.alloc(totalSize);
    let cursor = 0;

    output.write("RIFF", cursor);
    cursor += 4;
    output.writeUInt32LE(totalSize - 8, cursor);
    cursor += 4;
    output.write("WAVE", cursor);
    cursor += 4;

    fmtChunk.copy(output, cursor);
    cursor += fmtChunk.length;

    output.write("data", cursor);
    cursor += 4;
    output.writeUInt32LE(dataSize, cursor);
    cursor += 4;

    pcm.copy(output, cursor);

    return output;
}

/**
 * Generates audio for a multi-speaker debate podcast via Sarvam AI and returns a merged audio buffer.
 */
export async function generateMultiSpeakerPodcastAudio(
    turns: SpeechTurn[],
    languageCode?: string,
): Promise<Buffer> {
    const audioBuffers: Buffer[] = [];

    for (const turn of turns) {
        const speaker =
            turn.speaker === "Alex"
                ? SARVAM_VOICES.ALEX
                : SARVAM_VOICES.JORDAN;

        try {
            const buffer = await synthesizeSarvamSpeech(
                turn.text,
                speaker,
                languageCode,
            );
            audioBuffers.push(buffer);
        } catch (error) {
            console.error(`Failed to synthesize turn for ${turn.speaker}:`, error);
        }
    }

    if (audioBuffers.length === 0) {
        throw new AppError(
            500,
            "Failed to synthesize podcast audio with Sarvam AI. Please verify your SARVAM_API_KEY.",
        );
    }

    return mergeWavBuffers(audioBuffers);
}

/**
 * Saves generated podcast audio to the local uploads directory and returns the public URL.
 */
export function savePodcastAudioLocally(
    buffer: Buffer,
    filename: string,
): string {
    try {
        const uploadsDir = path.join(process.cwd(), "uploads", "podcasts");
        fs.mkdirSync(uploadsDir, { recursive: true });

        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, buffer);
    } catch (err) {
        console.warn("Could not save podcast to local disk:", err);
    }

    const serverUrl =
        process.env.SERVER_URL ||
        process.env.BACKEND_URL ||
        process.env.BETTER_AUTH_URL ||
        (process.env.PORT ? `http://localhost:${process.env.PORT}` : "http://localhost:8081");

    return `${serverUrl.replace(/\/$/, "")}/uploads/podcasts/${filename}`;
}
