"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

const STAGES = [
  {
    text: "Scanning 10% src/main.ts \u2014 0 threats",
    delay: 200,
    type: "progress",
  },
  {
    text: "Scanning 25% src/utils.ts \u2014 0 threats",
    delay: 200,
    type: "progress",
  },
  {
    text: "Scanning 40% src/prompts.txt \u2014 1 threat",
    delay: 200,
    type: "progress",
  },
  { text: "  ✖ TROJAN_SOURCE (BIDI override)", delay: 800, type: "error_log" },
  { text: "done", delay: 3000, type: "end" },
];

export function TryItOutSection() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentStep >= STAGES.length) {
      const timeout = setTimeout(() => setCurrentStep(0), 2000);
      return () => clearTimeout(timeout);
    }
    const stage = STAGES[currentStep];
    const timeout = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, stage.delay);
    return () => clearTimeout(timeout);
  }, [currentStep]);

  const handleCopy = () => {
    navigator.clipboard.writeText("pnpx @promptshield/cli scan --check");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const visibleLines = [];
  let currentProgress = null;

  for (let i = 0; i < currentStep; i++) {
    if (i >= STAGES.length) break;
    const stage = STAGES[i];
    if (stage.type === "progress") {
      currentProgress = stage.text;
    } else if (stage.type === "error_log") {
      if (currentProgress) {
        visibleLines.push(
          <div key={`prog-${i}`} className="text-gray-300">
            {currentProgress}
          </div>,
        );
        currentProgress = null;
      }
      visibleLines.push(
        <div key={`err-${i}`} className="text-red-400 whitespace-pre">
          {stage.text}
        </div>,
      );
    }
  }

  return (
    <section className="py-24 bg-gradient-to-b from-[var(--color-ps-secondary)] to-orange-950/10 dark:to-orange-950/5 relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-4 font-mono text-yellow-500 uppercase tracking-widest opacity-90">
            Try It Out.
          </h2>
        </div>

        <div className="flex flex-col gap-4 max-w-3xl mx-auto mb-12">
          {/* Copy Command Box */}
          <div className="bg-[#111111] rounded-xl border border-white/10 flex justify-between items-center px-6 py-4 shadow-xl">
            <code className="text-[#a5b4fc] font-mono text-sm font-medium">
              pnpx @promptshield/cli scan --check
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              aria-label="Copy command"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Console Box */}
          <div className="bg-[#111111] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
            <div className="bg-[#161B22] border-b border-white/5 px-4 py-3 flex justify-between items-center relative">
              <div className="flex items-center gap-2 text-white font-mono text-sm font-semibold">
                <span className="text-gray-400">&gt;_</span> Terminal
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-80" />
            </div>

            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto min-h-[240px] text-gray-300 flex flex-col relative z-0">
              <div className="text-gray-400 mb-6">
                pnpx @promptshield/cli scan --check
              </div>

              {visibleLines}

              <div className="flex items-center whitespace-pre text-gray-300">
                {currentStep < STAGES.length &&
                  STAGES[currentStep]?.type === "progress" && (
                    <span>{STAGES[currentStep].text}</span>
                  )}
                {currentStep < STAGES.length &&
                  STAGES[currentStep]?.type !== "progress" &&
                  currentProgress && <span>{currentProgress}</span>}
              </div>

              {currentStep >= STAGES.length - 1 && (
                <div className="mt-8">
                  <div className="text-red-400 font-bold mb-1">
                    ✖ 1 threat detected
                  </div>
                  <div className="text-gray-500 text-xs">
                    Process exited with code 1
                  </div>
                </div>
              )}
            </div>

            {/* Soft backdrop glow inside the terminal */}
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none -z-10" />
          </div>
        </div>

        {/* Extensions Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 bg-[#161B22] p-8 rounded-2xl border border-[var(--color-ps-border)] text-center sm:text-left shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent pointer-events-none -z-10" />
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Live in your Editor</h3>
            <p className="text-[var(--color-ps-muted-fg)] text-sm leading-relaxed">
              Install our VSCode Extension for real-time X-Ray visualization of
              hidden threats as you type.
            </p>
          </div>
          <a
            href="vscode:extension/mayank1513.promptshield"
            className="flex shrink-0 items-center justify-center gap-2 bg-[#0066b8] hover:bg-[#005294] text-white px-8 py-3.5 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-500/20 z-10"
          >
            Open in VSCode
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
