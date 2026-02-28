import { ArrowRight, FileWarning, ShieldAlert, Zap } from "lucide-react";
import Link from "next/link";

const bullets = [
  {
    icon: <FileWarning className="w-5 h-5 text-red-500" />,
    title: "Invisible Unicode Bypasses",
    description: "Invisible characters bypass regex and static filters.",
  },
  {
    icon: <Zap className="w-5 h-5 text-orange-500" />,
    title: "Not Content Moderation",
    description:
      "PromptShield doesn't judge semantic toxicity. It acts as a forensic layer to block syntactically obfuscated attacks before semantic parsing.",
  },
  {
    icon: <ShieldAlert className="w-5 h-5 text-yellow-500" />,
    title: "Trojan Source & Homoglyphs",
    description:
      "Lookalike characters and BIDI overrides easily bypass manual code reviews and spoof deterministic inputs.",
  },
];

export function WhyItMattersSection() {
  return (
    <section className="py-20 bg-[var(--color-ps-secondary)] border-y border-[var(--color-ps-border)]">
      <div className="mx-auto max-w-6xl px-4 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <span role="img" aria-label="Stop">
                🛑
              </span>{" "}
              The Problem
            </h2>
            <p className="text-xl text-[var(--color-ps-muted-fg)] leading-relaxed">
              LLM inputs are code. If you can&apos;t see the text, you
              can&apos;t trust the execution.
            </p>
          </div>

          <div className="space-y-6">
            {bullets.map((b) => (
              <div key={b.title} className="flex gap-4 items-start">
                <div className="mt-1 p-2 bg-[var(--color-ps-card)] rounded-lg border border-[var(--color-ps-border)]">
                  {b.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[var(--color-ps-fg)]">
                    {b.title}
                  </h3>
                  <p className="text-[var(--color-ps-muted-fg)]">
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/docs/scanning-pipeline"
            className="inline-flex items-center gap-2 text-[var(--color-ps-accent)] hover:text-blue-400 font-medium transition-colors"
          >
            Learn more in Docs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 w-full relative">
          <div className="absolute inset-0 bg-red-500/10 blur-[80px] rounded-full pointer-events-none -z-10" />
          <div className="bg-[#0D1117] rounded-2xl border border-red-900/30 shadow-2xl overflow-hidden min-h-[300px] flex flex-col">
            <div className="bg-red-950/40 border-b border-red-900/30 px-4 py-3 text-sm font-semibold text-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Trojan Source Injection
              </div>
              <span className="text-xs font-mono text-red-400 bg-red-900/30 px-2 py-0.5 rounded border border-red-800">
                PromptShield X-Ray
              </span>
            </div>
            <div className="p-6 text-gray-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              <div className="mb-6">
                <span className="text-gray-500">
                  {"// What you see in code/logs:"}
                </span>
                <br />
                <span className="text-green-400">
                  Ignore previous instructions
                </span>
              </div>
              <div>
                <span className="text-gray-500">
                  {"// What the LLM actually processes:"}
                </span>
                <br />
                <span className="text-red-400">
                  <span className="text-white bg-red-600/80 px-1 py-0.5 rounded-sm mx-0.5 border border-red-500 text-xs font-bold whitespace-nowrap">
                    [BIDI_UNTERMINATED]
                  </span>
                  Ignore
                  <span className="text-white bg-red-600/80 px-1 py-0.5 rounded-sm mx-0.5 border border-red-500 text-xs font-bold whitespace-nowrap">
                    [U+202E]
                  </span>
                  previous_instructions
                </span>
              </div>
              <div className="mt-8 border-t border-gray-800 pt-4">
                <div className="text-red-400 font-bold flex items-center gap-2 mb-2 bg-red-500/10 px-2 py-1 rounded inline-block">
                  ✖ 2 threats detected
                </div>
                <div className="text-red-300 text-sm space-y-2 mt-2 font-mono">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="font-bold text-red-400">
                      - TROJAN_SOURCE{" "}
                      <span className="text-red-300 font-normal">
                        (BIDI override)
                      </span>
                    </span>
                    <span className="text-gray-500 text-xs">
                      Line 44 &bull; Severity:{" "}
                      <span className="text-red-400">CRITICAL</span>
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="font-bold text-red-400">
                      - PROMPT_INJECTION
                    </span>
                    <span className="text-gray-500 text-xs">
                      Line 44 &bull; Severity:{" "}
                      <span className="text-orange-400">HIGH</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
