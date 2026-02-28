"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function QuickStartSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const snippets = [
    {
      title: "Core Installation",
      code: "npm install @promptshield/core",
      language: "bash",
    },
    {
      title: "Minimal Validation",
      code: "import { scan } from '@promptshield/core';\n\nconst result = scan(userInput);\nif (!result.isClean) {\n  throw new Error('Blocked adversarial prompt');\n}",
      language: "typescript",
    },
    {
      title: "CLI Scan Example",
      code: "npx @promptshield/cli scan . --check",
      language: "bash",
    },
  ];

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className="py-24 bg-[var(--color-ps-bg)] relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
          <p className="text-[var(--color-ps-muted-fg)]">
            Deploy defensive validation in seconds.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="bg-[var(--color-ps-card)] rounded-2xl border border-[var(--color-ps-border)] shadow-xl overflow-hidden">
            {snippets.map((snippet, index) => (
              <div
                key={snippet.title}
                className={`${index > 0 ? "border-t border-[var(--color-ps-border)]" : ""}`}
              >
                <div className="bg-[#161B22] border-b border-gray-800 px-4 py-2 flex justify-between items-center text-xs font-medium text-gray-400">
                  {snippet.title}
                  <button
                    type="button"
                    onClick={() => handleCopy(snippet.code, index)}
                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <pre className="p-4 text-sm font-mono text-gray-300 bg-[#0D1117] overflow-x-auto whitespace-pre-wrap">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6 pt-2">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--color-ps-accent)]/20 text-[var(--color-ps-accent)] flex items-center justify-center text-xs">
                  1
                </span>
                Add the Library
              </h3>
              <p className="text-[var(--color-ps-muted-fg)] text-sm">
                Install the core package into your Node.js or TypeScript
                application. It has zero dependencies.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--color-ps-accent)]/20 text-[var(--color-ps-accent)] flex items-center justify-center text-xs">
                  2
                </span>
                Scan the Context
              </h3>
              <p className="text-[var(--color-ps-muted-fg)] text-sm">
                Pass any user-provided string or templated block into{" "}
                <code>scan</code> before touching the LLM.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--color-ps-accent)]/20 text-[var(--color-ps-accent)] flex items-center justify-center text-xs">
                  3
                </span>
                Enforce in CI
              </h3>
              <p className="text-[var(--color-ps-muted-fg)] text-sm">
                Use the CLI to automatically reject repository PRs containing
                embedded malicious prompts.
              </p>
            </div>

            <Link
              href="/docs"
              className="mt-4 text-[var(--color-ps-accent)] hover:text-blue-400 font-medium hover:underline text-sm"
            >
              Read advanced usage strategies in our Docs →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
