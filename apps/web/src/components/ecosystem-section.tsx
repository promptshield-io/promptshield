import {
  Blocks,
  Brain,
  Eye,
  Filter,
  Stethoscope,
  Terminal,
} from "lucide-react";

const packages = [
  {
    name: "@promptshield/core",
    role: "The Engine",
    description: "Zero-dependency, high-performance threat detection logic.",
    icon: <Blocks className="w-6 h-6 text-blue-500" />,
  },
  {
    name: "@promptshield/cli",
    role: "The Gatekeeper",
    description: "CI/CD tool to block malicious prompts securely.",
    icon: <Terminal className="w-6 h-6 text-green-500" />,
  },
  {
    name: "@promptshield/vscode",
    role: "The Lens",
    description:
      "VS Code extension for real-time threat visualization (X-Ray Mode).",
    icon: <Eye className="w-6 h-6 text-purple-500" />,
  },
  {
    name: "@promptshield/lsp",
    role: "The Brain",
    description: "Language Server Protocol implementation.",
    icon: <Brain className="w-6 h-6 text-pink-500" />,
  },
  {
    name: "@promptshield/sanitizer",
    role: "The Cure",
    description: "Deterministic logic to strip invisible threats safely.",
    icon: <Stethoscope className="w-6 h-6 text-teal-500" />,
  },
  {
    name: "@promptshield/ignore",
    role: "The Filter",
    description: "Standardized syntax for suppressing false positives.",
    icon: <Filter className="w-6 h-6 text-yellow-500" />,
  },
];

export function EcosystemSection() {
  return (
    <section className="py-24 bg-[var(--color-ps-bg)]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4">The Ecosystem</h2>
          <p className="text-xl text-[var(--color-ps-muted-fg)]">
            A modular suite of tools designed to integrate seamlessly into your
            workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="group relative bg-[var(--color-ps-card)] border border-[var(--color-ps-border)] rounded-2xl p-6 hover:border-[var(--color-ps-accent)] transition-colors overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-ps-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-[var(--color-ps-secondary)]">
                    {pkg.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold font-mono text-sm mb-1">
                      {pkg.name}
                    </h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-ps-accent)]/10 text-[var(--color-ps-accent)]">
                      {pkg.role}
                    </span>
                  </div>
                </div>
                <p className="text-[var(--color-ps-muted-fg)] text-sm mt-auto">
                  {pkg.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
