import { EcosystemSection } from "../../components/ecosystem-section";
import { Footer } from "../../components/footer";
import { HeroSection } from "../../components/hero-section";
import { ProblemSection } from "../../components/problem-section";
import { QuickStartSection } from "../../components/quick-start-section";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 w-full bg-[var(--color-ps-bg)] text-[var(--color-ps-fg)] antialiased">
      <HeroSection />
      <ProblemSection />
      <EcosystemSection />
      <QuickStartSection />
      <Footer />
    </div>
  );
}
