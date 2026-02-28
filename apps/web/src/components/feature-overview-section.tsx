import { Blocks, Eye, ShieldCheck, Terminal, Webhook, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  {
    name: "Zero Dependencies",
    description:
      "Core library performs high-speed security scanning without bloating your application.",
    icon: <Eye className="w-5 h-5 text-purple-500" />,
    link: "/docs/core",
  },
  {
    name: "Deterministic Scan",
    description:
      "Catch adversarial input instantly with AST-like lexical parsing. No slow LLM guesses.",
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    link: "/docs/detectors",
  },
  {
    name: "No External API Calls",
    description:
      "Your prompt data never leaves your environment. True privacy by design.",
    icon: <ShieldCheck className="w-5 h-5 text-green-500" />,
    link: "/docs/security",
  },
  {
    name: "Local Execution",
    description:
      "Execute entirely in Node.js, directly in existing input pipelines before network calls.",
    icon: <Terminal className="w-5 h-5 text-orange-500" />,
    link: "/docs/core",
  },
  {
    name: "Workspace Scanning",
    description:
      "Scan entire codebases, markdown docs, and source files—not just runtime prompts.",
    icon: <Webhook className="w-5 h-5 text-blue-500" />,
    link: "/docs/workspace",
  },
  {
    name: "IDE Defenses",
    description:
      "Identify hidden overrides and homoglyphs live in VSCode with X-Ray mode.",
    icon: <Blocks className="w-5 h-5 text-indigo-500" />,
    link: "/docs/lsp",
  },
];

export function FeatureOverviewSection() {
  return (
    <section className="py-24 bg-[var(--color-ps-secondary)]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4">Feature Overview</h2>
          <p className="text-[var(--color-ps-muted-fg)] text-lg">
            Deterministic, local, zero-dependency LLM input security.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.name}
              href={feature.link}
              className="block group bg-[var(--color-ps-card)] border border-[var(--color-ps-border)] rounded-2xl p-6 hover:border-[var(--color-ps-accent)] transition-all hover:-translate-y-1 hover:shadow-md duration-300"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-2.5 rounded-xl bg-[var(--color-ps-bg)] border border-[var(--color-ps-border)] group-hover:border-[var(--color-ps-accent)]/50 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-[var(--color-ps-fg)] group-hover:text-[var(--color-ps-accent)] transition-colors">
                  {feature.name}
                </h3>
              </div>
              <p className="text-[var(--color-ps-muted-fg)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
