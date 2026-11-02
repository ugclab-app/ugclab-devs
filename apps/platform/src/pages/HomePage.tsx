import { CountryChecker } from "@/landing/country-checker";
import { Hero } from "@/landing/hero";
import { SavingsCalculator } from "@/landing/savings-calculator";
import {
  ComparisonSection,
  DemoStoreCta,
  FactsSection,
  FaqSection,
  FeaturesSection,
  FinalCta,
  FounderSection,
  HowItWorksSection,
  IntegrationsStrip,
  PayoutsSection,
  PricingSection,
  SecuritySection,
  SiteBuilderShowcase,
} from "@/landing/sections";
import { UseCases } from "@/landing/use-cases";

export function HomePage() {
  return (
    <>
      <Hero />
      <IntegrationsStrip />
      <CountryChecker />
      <PayoutsSection />
      <FeaturesSection />
      <UseCases />
      <FactsSection />
      <SavingsCalculator />
      <DemoStoreCta />
      <SiteBuilderShowcase />
      <HowItWorksSection />
      <ComparisonSection />
      <SecuritySection />
      <PricingSection />
      <FounderSection />
      <FaqSection />
      <FinalCta />
    </>
  );
}
