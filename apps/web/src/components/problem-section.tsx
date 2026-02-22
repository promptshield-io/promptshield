import { Ghost, ShieldAlert, Type } from "lucide-react";

const features = [
  {
    icon: <Ghost className="w-6 h-6 text-red-500" />,
    title: "Invisible Characters",
    description:
      "Attackers use zero-width spaces (like \\u200B) to smuggle hidden instructions past your moderation filters.",
  },
  {
    icon: <ShieldAlert className="w-6 h-6 text-orange-500" />,
    title: "Trojan Source",
    description:
      "BIDI overrides make code look like it does one thing while executing another, bypassing manual review.",
  },
  {
    icon: <Type className="w-6 h-6 text-yellow-500" />,
    title: "Homoglyphs",
    description:
      "Lookalike characters (e.g., Cyrillic \u0027а\u0027 vs. Latin \u0027a\u0027) spoon-feed spoofed commands into the LLM context.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-[var(--color-ps-secondary)]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 flex justify-center items-center gap-2">
            <span role="img" aria-label="Stop">
              🛑
            </span>{" "}
            The Problem
          </h2>
          <p className="text-xl text-[var(--color-ps-muted-fg)]">
            LLM inputs are code. If you can&#39;t see the text, you can&#39;t
            trust the execution.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[var(--color-ps-card)] border border-[var(--color-ps-border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1 duration-300"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-[var(--color-ps-muted-fg)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
