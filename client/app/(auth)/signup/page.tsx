import { Metadata } from "next";
import { AuthLayout } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign up - BookCraft",
  description: "Create your BookCraft account and unlock insights with AI.",
};

export default function SignupPage() {
  return <AuthLayout mode="signup" />;
}
