import Link from "next/link";
import { BookCraftLogo } from "@/features/auth/components/bookcraft-logo";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FFF2C9] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-[#FDFAF4] dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-12 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <BookCraftLogo size={28} textSize="text-xl" />
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100">
            Terms & Conditions
          </h1>
          <p>
            Welcome to <strong>BookCraft</strong>. By accessing or using our platform,
            you agree to be bound by these terms.
          </p>

          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-2">
            1. Use of Services
          </h2>
          <p>
            BookCraft provides AI-powered notebook and audio generation tools for personal
            and educational research. You agree not to misuse or reverse engineer our services.
          </p>

          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-2">
            2. Privacy & Data
          </h2>
          <p>
            Your uploaded sources, notes, and generated podcasts remain your property and
            are processed securely to generate insights.
          </p>

          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 pt-2">
            3. AI Generations
          </h2>
          <p>
            AI outputs, summaries, and multilingual podcasts are provided for assistance.
            Please verify critical educational and analytical information independently.
          </p>
        </div>
      </div>
    </div>
  );
}
