import { type Metadata } from "next";
import Hero from "./Hero";
import FeaturesSection from "./FeaturesSection";
import IntegrationSection from "./IntegrationSection";
import PricingTeaser from "./PricingTeaser";
import LearnMoreSection from "./LearnMoreSection";

export const metadata: Metadata = {
  title: "Smart Picker - Efficient Order Preparation | Barcode Scanning App",
  description:
    "Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately. Perfect for warehouses and distribution centers.",
  keywords:
    "order picking, barcode scanning, warehouse management, inventory management, QuickBooks integration, Xero integration, mobile app, efficiency, digital lists",
};

const LandingPage: React.FC = () => {
  return (
    <main className="bg-white font-sans">
      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- FEATURES SECTION --- */}
      <FeaturesSection />

      {/* --- INTEGRATION SECTION --- */}
      <IntegrationSection />

      {/* --- PRICING TEASER --- */}
      <PricingTeaser />

      {/* --- LEARN MORE SECTION --- */}
      <LearnMoreSection />
    </main>
  );
};

export default LandingPage;
