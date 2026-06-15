import { Link } from 'react-router-dom';
import { Zap, Shield, BarChart3, Globe, Fingerprint, Cloud, Smartphone, TrendingUp, Users, Award } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const features = [
  {
    icon: Zap,
    title: 'Lightning-Fast Execution',
    description: 'Execute trades in milliseconds with our high-performance matching engine. Industry-leading speed ensures you never miss an opportunity.',
  },
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    description: 'Your assets are protected with multi-signature wallets, cold storage, and advanced encryption protocols.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Professional charting tools with 100+ technical indicators, real-time data, and customizable dashboards.',
  },
  {
    icon: Globe,
    title: 'Global Market Access',
    description: 'Trade 150+ cryptocurrencies across multiple markets with deep liquidity pools and competitive spreads.',
  },
  {
    icon: Fingerprint,
    title: 'Two-Factor Authentication',
    description: 'Enhanced account security with 2FA, biometric login, and withdrawal whitelist protection.',
  },
  {
    icon: Cloud,
    title: 'Cloud Infrastructure',
    description: '99.99% uptime guaranteed with redundant servers across multiple continents for seamless trading.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Trading',
    description: 'Full-featured mobile apps for iOS and Android. Trade on the go with the same powerful tools.',
  },
  {
    icon: TrendingUp,
    title: 'Margin Trading',
    description: 'Leverage up to 10x on select pairs. Advanced risk management tools help you trade responsibly.',
  },
  {
    icon: Users,
    title: 'Copy Trading',
    description: 'Follow and replicate trades from top performers. Learn from the best while you trade.',
  },
  {
    icon: Award,
    title: 'VIP Programs',
    description: 'Exclusive benefits for high-volume traders including lower fees, priority support, and early access.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-[72px] relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute w-96 h-96 glow-teal rounded-full top-[176px] right-0" />
        <div className="absolute w-96 h-96 glow-blue rounded-full top-[420px] left-0" />

        <div className="max-w-[1280px] mx-auto px-6 pt-32 pb-24 text-center relative z-10">
          <div className="inline-block px-5 py-2 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              PLATFORM FEATURES
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold text-white mb-0">
            Everything You Need
          </h1>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold gradient-text mb-8">
            To Trade Like a Pro
          </h1>
          <p className="text-text-light text-lg md:text-xl leading-8 max-w-3xl mx-auto">
            Built from the ground up with cutting-edge technology to deliver the best trading experience.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card-bg border border-card-border rounded-2xl p-8 hover:border-accent-teal/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl gradient-icon-bg flex items-center justify-center mb-6">
                <feature.icon size={24} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-3">{feature.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
          Ready to Experience
          <span className="gradient-text">Premium Features?</span>
        </h2>
        <div className="mt-8">
          <Link
            to="/open-account"
            className="gradient-btn text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base inline-block"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
