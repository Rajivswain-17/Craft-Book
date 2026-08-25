import { createAuthClient } from "better-auth/react";

function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:8081"
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});

export const { signIn, signUp, signOut, useSession } = authClient;

