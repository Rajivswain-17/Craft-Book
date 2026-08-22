import {
    countUserMessages,
    countUserSources,
    countUserWorkspaces,
    findUserPlanDetails,
    findUserTotalArtifacts,
    findUserTotalPodcasts,
    incrementUserArtifactCount as incrementUserArtifactCountRepo,
    incrementUserPodcastCount as incrementUserPodcastCountRepo,
} from "../repository/user.repository.js";
import { ForbiddenError } from "../types/app-error.js";
import type { PlanType } from "../generated/prisma/client.js";

export const PLAN_LIMITS: Record<
    PlanType,
    {
        WORKSPACES: number;
        MESSAGES: number | null;
        SOURCES: number;
        ARTIFACTS: number;
        PODCASTS: number | null;
    }
> = {
    FREE: {
        WORKSPACES: 3,
        MESSAGES: 10,
        SOURCES: 3,
        ARTIFACTS: 3,
        PODCASTS: 2, // Lifetime audio podcast generations for free users
    },
    PRO: {
        WORKSPACES: 3,
        MESSAGES: null, // Unlimited chats
        SOURCES: 15,
        ARTIFACTS: 10,
        PODCASTS: null, // Unlimited podcasts
    },
    PRO_PLUS: {
        WORKSPACES: 10,
        MESSAGES: null, // Unlimited chats
        SOURCES: 30,
        ARTIFACTS: 25,
        PODCASTS: null, // Unlimited podcasts
    },
};

export interface LimitDetails {
    limitType:
        | "workspaces"
        | "artifacts"
        | "sources"
        | "messages"
        | "podcasts";
    current: number;
    max: number | null;
    plan: PlanType;
}

export async function getUserPlan(userId: string) {
    const user = await findUserPlanDetails(userId);

    const isExpired =
        user?.planExpiresAt && new Date(user.planExpiresAt) <= new Date();

    const plan: PlanType = isExpired ? "FREE" : user?.plan ?? "FREE";
    const isPro = plan === "PRO" || plan === "PRO_PLUS";
    const isProPlus = plan === "PRO_PLUS";

    return {
        plan,
        planExpiresAt: user?.planExpiresAt ?? null,
        isPro,
        isProPlus,
        limits: PLAN_LIMITS[plan],
    };
}

export async function getUserUsage(userId: string) {
    const { plan, isPro, isProPlus, planExpiresAt, limits } =
        await getUserPlan(userId);

    const [workspaceCount, sourceCount, userArtifacts, userPodcasts, messageCount] =
        await Promise.all([
            countUserWorkspaces(userId),
            countUserSources(userId),
            findUserTotalArtifacts(userId),
            findUserTotalPodcasts(userId),
            countUserMessages(userId),
        ]);

    const totalArtifactsCreated = userArtifacts?.totalArtifactsCreated ?? 0;
    const totalPodcastsCreated = userPodcasts?.totalPodcastsCreated ?? 0;

    return {
        plan,
        isPro,
        isProPlus,
        planExpiresAt,
        workspaces: {
            count: workspaceCount,
            limit: limits.WORKSPACES,
            exceeded: workspaceCount >= limits.WORKSPACES,
        },
        sources: {
            count: sourceCount,
            limit: limits.SOURCES,
            exceeded: sourceCount >= limits.SOURCES,
        },
        artifacts: {
            count: totalArtifactsCreated,
            limit: limits.ARTIFACTS,
            exceeded: totalArtifactsCreated >= limits.ARTIFACTS,
        },
        podcasts: {
            count: totalPodcastsCreated,
            limit: limits.PODCASTS,
            exceeded:
                limits.PODCASTS !== null &&
                totalPodcastsCreated >= limits.PODCASTS,
        },
        messages: {
            count: messageCount,
            limit: limits.MESSAGES,
            exceeded:
                limits.MESSAGES !== null && messageCount >= limits.MESSAGES,
        },
    };
}

export async function assertCanCreateWorkspace(userId: string): Promise<void> {
    const { plan, limits } = await getUserPlan(userId);

    const count = await countUserWorkspaces(userId);
    if (count >= limits.WORKSPACES) {
        const nextPlan = plan === "FREE" ? "Pro" : "Pro+";
        throw new ForbiddenError(
            `${plan} plan limit reached: You can create a maximum of ${limits.WORKSPACES} workspace${limits.WORKSPACES > 1 ? "s" : ""} on the ${plan} plan. Upgrade to ${nextPlan} for more workspaces.`,
            {
                code: "LIMIT_REACHED",
                limitType: "workspaces",
                current: count,
                max: limits.WORKSPACES,
                plan,
            } satisfies LimitDetails & { code: string },
        );
    }
}

export async function assertCanCreateSource(userId: string): Promise<void> {
    const { plan, limits } = await getUserPlan(userId);

    const count = await countUserSources(userId);
    if (count >= limits.SOURCES) {
        const nextPlan = plan === "FREE" ? "Pro" : "Pro+";
        throw new ForbiddenError(
            `${plan} plan limit reached: You can upload a maximum of ${limits.SOURCES} sources on the ${plan} plan. Upgrade to ${nextPlan} for more sources.`,
            {
                code: "LIMIT_REACHED",
                limitType: "sources",
                current: count,
                max: limits.SOURCES,
                plan,
            } satisfies LimitDetails & { code: string },
        );
    }
}

export async function assertCanCreateArtifact(userId: string): Promise<void> {
    const { plan, limits } = await getUserPlan(userId);

    const user = await findUserTotalArtifacts(userId);
    const totalCreated = user?.totalArtifactsCreated ?? 0;

    if (totalCreated >= limits.ARTIFACTS) {
        const nextPlan = plan === "FREE" ? "Pro" : "Pro+";
        throw new ForbiddenError(
            `${plan} plan limit reached: You have already created ${totalCreated} of ${limits.ARTIFACTS} allowed artifacts on the ${plan} plan. Deleting artifacts does not restore your quota. Upgrade to ${nextPlan} for more artifacts.`,
            {
                code: "LIMIT_REACHED",
                limitType: "artifacts",
                current: totalCreated,
                max: limits.ARTIFACTS,
                plan,
            } satisfies LimitDetails & { code: string },
        );
    }
}

export async function assertCanCreateArtifactType(
    userId: string,
    artifactType: string,
): Promise<void> {
    const { plan, limits } = await getUserPlan(userId);

    if (artifactType !== "PODCAST") {
        return;
    }

    if (limits.PODCASTS === null) {
        return; // Unlimited podcasts on paid plans
    }

    const user = await findUserTotalPodcasts(userId);
    const totalCreated = user?.totalPodcastsCreated ?? 0;

    if (totalCreated >= limits.PODCASTS) {
        throw new ForbiddenError(
            `${plan} plan limit reached: You have already generated ${totalCreated} of ${limits.PODCASTS} allowed Audio Debate Podcasts on the ${plan} plan. Deleting podcasts does not restore your quota. Upgrade to ${plan === "FREE" ? "Pro" : "Pro+"} for unlimited podcasts.`,
            {
                code: "LIMIT_REACHED",
                limitType: "podcasts",
                current: totalCreated,
                max: limits.PODCASTS,
                plan,
            } satisfies LimitDetails & { code: string },
        );
    }
}

export async function incrementArtifactCount(userId: string): Promise<void> {
    await incrementUserArtifactCountRepo(userId);
}

export async function incrementPodcastCount(userId: string): Promise<void> {
    await incrementUserPodcastCountRepo(userId);
}

export async function assertCanSendMessage(userId: string): Promise<void> {
    const { plan, limits } = await getUserPlan(userId);

    if (limits.MESSAGES === null) {
        return; // Unlimited chats
    }

    const count = await countUserMessages(userId);
    if (count >= limits.MESSAGES) {
        throw new ForbiddenError(
            `${plan} plan limit reached: You can send a maximum of ${limits.MESSAGES} chat messages on the ${plan} plan. Upgrade to Pro for unlimited chats.`,
            {
                code: "LIMIT_REACHED",
                limitType: "messages",
                current: count,
                max: limits.MESSAGES,
                plan,
            } satisfies LimitDetails & { code: string },
        );
    }
}
