import { Metadata } from "next";
import { AuthLayout } from "@/features/auth";

export const metadata: Metadata = {
  title: "Log in - BookCraft",
  description: "Access your BookCraft workspaces, documents, and notes.",
};

export default function LoginPage() {
  return <AuthLayout mode="login" />;
}
