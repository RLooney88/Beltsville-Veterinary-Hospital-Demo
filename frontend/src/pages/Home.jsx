import React from "react";
import DynamicHero from "../components/DynamicHero";
import IntentSelector from "../components/IntentSelector";
import SubIntentPrompt from "../components/SubIntentPrompt";
import FeaturedCare from "../components/FeaturedCare";
import Testimonials from "../components/Testimonials";
import TeamSection from "../components/TeamSection";
import FAQSection from "../components/FAQSection";
import ContactSection from "../components/ContactSection";
import InlineCTA from "../components/InlineCTA";
import { useSmartSite } from "../context/SmartSiteContext";

export default function Home() {
  const { track } = useSmartSite();
  return (
    <div data-testid="home-page">
      {/* Full-bleed dynamic hero */}
      <DynamicHero />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <IntentSelector />
        <SubIntentPrompt />
        <FeaturedCare />

        <InlineCTA />
        <FAQSection />
        <Testimonials />
        <TeamSection />
        <ContactSection />
      </div>
    </div>
  );
}
