import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import TradingModesSection from '../components/TradingModesSection';
import CryptoSection from '../components/CryptoSection';
import CTASection from '../components/CTASection';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-primary">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <TradingModesSection />
      <CryptoSection />
      <CTASection />
      <Footer />
    </div>
  );
}
