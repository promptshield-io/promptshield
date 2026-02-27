"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  code: string;
  description: string;
}

const tabs: Tab[] = [
  {
    id: "ci",
    label: "For CI/CD (CLI)",
    description:
      "Run PromptShield in your pipeline to block PRs containing adversarial inputs.",
    code: "pnpx @promptshield/cli scan . --fail-on-threat",
  },
  {
    id: "node",
    label: "For Node.js Apps",
    description:
      "Integrate the core engine directly into your prompt handling logic.",
    code: "npm install @promptshield/core\n\nimport { scanPrompt } from '@promptshield/core';\nconst report = scanPrompt(userInput);",
  },
];

export function QuickStartSection() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [copied, setCopied] = useState(false);

  const activeContent = tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 bg-[var(--color-ps-secondary)] relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
          <p className="text-[var(--color-ps-muted-fg)]">
            Integrate PromptShield anywhere prompts are handled.
          </p>
        </div>

        <div className="bg-[var(--color-ps-card)] rounded-2xl border border-[var(--color-ps-border)] overflow-hidden shadow-xl">
          <div className="flex overflow-x-auto border-b border-[var(--color-ps-border)] bg-[var(--color-ps-bg)]">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-[var(--color-ps-accent)] border-b-2 border-[var(--color-ps-accent)] bg-[var(--color-ps-card)]"
                    : "text-[var(--color-ps-muted-fg)] hover:text-[var(--color-ps-fg)] hover:bg-[var(--color-ps-muted)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <p className="text-[var(--color-ps-fg)] mb-6 text-sm">
              {activeContent.description}
            </p>

            <div className="relative group rounded-xl overflow-hidden bg-black/90 dark:bg-black/40 border border-[var(--color-ps-border)]">
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-sm"
                  aria-label="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <pre className="p-6 text-sm text-gray-300 overflow-x-auto font-mono leading-relaxed">
                <code>{activeContent.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
