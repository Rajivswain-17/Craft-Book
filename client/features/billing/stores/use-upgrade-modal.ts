"use client";

import { create } from "zustand";

interface UpgradeModalStore {
  isOpen: boolean;
  reason?: string;
  limitType?: "workspaces" | "artifacts" | "sources" | "messages" | "podcasts" | "general";
  openUpgradeModal: (options?: {
    reason?: string;
    limitType?: "workspaces" | "artifacts" | "sources" | "messages" | "podcasts" | "general";
  }) => void;
  closeUpgradeModal: () => void;
}

// TESTING ONLY: Set to true to restore upgrade dialogs throughout the frontend.
const SUBSCRIPTION_LIMITS_ENABLED = true;

export const useUpgradeModal = create<UpgradeModalStore>((set) => ({
  isOpen: false,
  reason: undefined,
  limitType: "general",
  openUpgradeModal: (options) => {
    if (!SUBSCRIPTION_LIMITS_ENABLED) return;
    set({
      isOpen: true,
      reason: options?.reason,
      limitType: options?.limitType || "general",
    });
  },
  closeUpgradeModal: () =>
    set({
      isOpen: false,
      reason: undefined,
      limitType: "general",
    }),
}));
