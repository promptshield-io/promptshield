import { AlertTriangle, CheckCircle2, XOctagon } from "lucide-react";

export function ScopeLimitationsSection() {
  return (
    <section className="py-24 bg-[var(--color-ps-bg)] border-t border-[var(--color-ps-border)]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            Scope & Limitations
          </h2>
          <p className="text-[var(--color-ps-fg)] text-xl font-bold mb-4">
            PromptShield is a lexical security layer, not a semantic AI
            firewall.
          </p>
          <p className="text-[var(--color-ps-muted-fg)] text-lg">
            We believe in security credibility over product hype. PromptShield
            is a specialized forensic layer, not a magic bullet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* What it DOES */}
          <div className="bg-[var(--color-ps-card)] border border-green-900/30 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-[50px] rounded-full pointer-events-none" />
            <h3 className="text-xl font-semibold text-green-400 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> What It Protects Against
            </h3>
            <ul className="space-y-4 text-[var(--color-ps-muted-fg)] leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">•</span>
                <span>
                  <strong>Invisible Poisoning:</strong> Zero-width characters
                  smuggling instructions past visual review or traditional
                  string matches.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">•</span>
                <span>
                  <strong>Trojan Source:</strong> BIDI embedded overrides
                  maliciously altering the logical execution flow of the prompt.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">•</span>
                <span>
                  <strong>Homoglyph Spoofing:</strong> Attackers using
                  Cyrillic/Greek lookalikes to bypass keyword blacklists.
                </span>
              </li>
            </ul>
          </div>

          {/* What it DOES NOT */}
          <div className="bg-[var(--color-ps-card)] border border-red-900/30 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[50px] rounded-full pointer-events-none" />
            <h3 className="text-xl font-semibold text-red-400 mb-6 flex items-center gap-2">
              <XOctagon className="w-5 h-5" /> What It Does NOT Do
            </h3>
            <ul className="space-y-4 text-[var(--color-ps-muted-fg)] leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-red-500 mt-1">•</span>
                <span>
                  <strong>Semantic Jailbreaks:</strong> We do not parse the{" "}
                  <em>meaning</em> of the English text. "Ignore previous
                  commands" will pass if plainly typed.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-500 mt-1">•</span>
                <span>
                  <strong>Prompt Injection Analysis:</strong> We do not run a
                  secondary AI model to guess if a prompt is manipulative. This
                  is purely deterministic.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-500 mt-1">•</span>
                <span>
                  <strong>Content Moderation:</strong> We do not block
                  profanity, PII, or NSFW content natively.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
