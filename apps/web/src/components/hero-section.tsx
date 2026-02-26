import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto max-w-6xl px-4 text-center">
        {/* Decorative background blurs using CSS vars */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--color-ps-accent)]/20 blur-[120px] rounded-full point-events-none -z-10 animate-[var(--animate-pulse-slow)]" />

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-[var(--animate-fade-in-up)]">
          PromptShield: <br />
          <span className="text-[var(--color-ps-accent)]">
            The Security Layer for AI Prompts
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg md:text-xl text-[var(--color-ps-muted-fg)] mb-10 animate-[var(--animate-fade-in-up)] [animation-delay:200ms] opacity-0">
          A unified ecosystem for detecting and neutralizing adversarial
          Unicode, invisible character poisoning, and homoglyph attacks in LLM
          workflows.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-[var(--animate-fade-in-up)] [animation-delay:400ms] opacity-0">
          <Link
            href="/docs/overview"
            className="flex items-center gap-2 bg-[var(--color-ps-accent)] hover:bg-blue-600 text-[var(--color-ps-accent-fg)] px-8 py-3 rounded-full font-medium transition-colors"
          >
            Quick Start
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/promptshield-io/promptshield"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-[var(--color-ps-secondary)] hover:bg-[var(--color-ps-border)] text-[var(--color-ps-fg)] px-8 py-3 rounded-full font-medium transition-colors border border-[var(--color-ps-border)]"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
