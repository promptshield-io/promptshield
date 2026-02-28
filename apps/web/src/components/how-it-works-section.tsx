import {
  ArrowRight,
  BoxSelect,
  CheckCircle,
  Shield,
  XCircle,
} from "lucide-react";

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-[var(--color-ps-secondary)]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-[var(--color-ps-muted-fg)]">
            A deterministic pipeline executed locally before requests hit the
            LLM.
          </p>
        </div>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 max-w-4xl mx-auto">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-[var(--color-ps-border)] via-[var(--color-ps-accent)] to-[var(--color-ps-border)] -translate-y-1/2 -z-10 opacity-30" />
          {/* Connector Line (Mobile) */}
          <div className="block md:hidden absolute left-1/2 top-0 h-full w-0.5 bg-gradient-to-b from-[var(--color-ps-border)] via-[var(--color-ps-accent)] to-[var(--color-ps-border)] -translate-x-1/2 -z-10 opacity-30" />

          {/* Step 1 */}
          <div className="bg-[var(--color-ps-card)] border border-[var(--color-ps-border)] rounded-2xl p-6 flex flex-col items-center text-center w-64 shadow-lg shadow-black/5 relative z-10 transition-transform hover:-translate-y-1 duration-300">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <BoxSelect className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-2">User Input</h3>
            <p className="text-sm text-[var(--color-ps-muted-fg)]">
              Raw prompt data enters the application.
            </p>
          </div>

          <ArrowRight className="hidden md:block w-6 h-6 text-[var(--color-ps-accent)] bg-[var(--color-ps-bg)]" />

          {/* Step 2 */}
          <div className="bg-[var(--color-ps-accent)]/10 border border-[var(--color-ps-accent)] rounded-2xl p-6 flex flex-col items-center text-center w-64 shadow-xl shadow-[var(--color-ps-accent)]/5 relative z-10 transition-transform hover:-translate-y-1 duration-300">
            <div className="w-12 h-12 bg-[var(--color-ps-accent)] text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-[var(--color-ps-accent)]/30">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-[var(--color-ps-accent)] mb-2">
              Deterministic Lexical Scan
            </h3>
            <p className="text-sm text-[var(--color-ps-muted-fg)]">
              Detects invisible chars, homoglyphs, and BIDI.
            </p>
          </div>

          <ArrowRight className="hidden md:block w-6 h-6 text-[var(--color-ps-accent)] bg-[var(--color-ps-bg)]" />

          {/* Step 3 */}
          <div className="bg-[var(--color-ps-card)] border border-[var(--color-ps-border)] rounded-2xl p-6 flex flex-col items-center text-center w-64 shadow-lg shadow-black/5 relative z-10 transition-transform hover:-translate-y-1 duration-300">
            <div className="flex gap-2 mb-4">
              <div className="flex flex-col items-center">
                <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
                <span className="text-[10px] font-bold text-green-500 uppercase">
                  Pass
                </span>
              </div>
              <div className="flex flex-col items-center border-l border-r border-[var(--color-ps-border)] px-2">
                <Shield className="w-6 h-6 text-blue-500 mb-1" />
                <span className="text-[10px] font-bold text-blue-500 uppercase">
                  Sanitize
                </span>
              </div>
              <div className="flex flex-col items-center">
                <XCircle className="w-6 h-6 text-red-500 mb-1" />
                <span className="text-[10px] font-bold text-red-500 uppercase">
                  Block
                </span>
              </div>
            </div>
            <h3 className="font-semibold mb-2">Safe Output</h3>
            <p className="text-sm text-[var(--color-ps-muted-fg)]">
              Only clean, verified prompts reach the LLM.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
