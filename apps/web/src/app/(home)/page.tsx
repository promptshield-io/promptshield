import type { Metadata } from "next";
import { EcosystemSection } from "../../components/ecosystem-section";
import { FeatureOverviewSection } from "../../components/feature-overview-section";
import { Footer } from "../../components/footer";
import { HeroSection } from "../../components/hero-section";
import { HowItWorksSection } from "../../components/how-it-works-section";
import { QuickStartSection } from "../../components/quick-start-section";
import { ScopeLimitationsSection } from "../../components/scope-limitations-section";
import { TryItOutSection } from "../../components/try-it-out-section";
import { WhyItMattersSection } from "../../components/why-it-matters-section";

export const metadata: Metadata = {
  title: "PromptShield - The Security Layer for AI Prompts",
  description:
    "A unified ecosystem for detecting and neutralizing adversarial Unicode, invisible character poisoning, and homoglyph attacks in LLM workflows.",
  openGraph: {
    title: "PromptShield - The Security Layer for AI Prompts",
    description:
      "A unified ecosystem for detecting and neutralizing adversarial Unicode, invisible character poisoning, and homoglyph attacks in LLM workflows.",
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 w-full bg-[var(--color-ps-bg)] text-[var(--color-ps-fg)] antialiased">
      <HeroSection />
      <WhyItMattersSection />
      <ScopeLimitationsSection />
      <TryItOutSection />
      <HowItWorksSection />
      <EcosystemSection />
      <FeatureOverviewSection />
      <QuickStartSection />
      <Footer />
    </div>
  );
}
