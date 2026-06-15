import { Zap, Droplets, Shield, BarChart3, Globe, AlertTriangle } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Execution',
    description: 'Ultra-fast order placing with high throughput for professional trading environments.',
  },
  {
    icon: Droplets,
    title: 'Deep Liquidity',
    description: 'Efficiently execute orders across multiple liquidity providers for optimal price execution.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'End-to-end data encryption with multi-layer perimeter across the entire platform.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Trading',
    description: 'Margin, limit, stop, market, and trailing stop orders for every trading strategy.',
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Serving retail traders, OTC brokerages, and devoted institutions across 150+ countries.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Management',
    description: 'Smart risk limits, position-level, counterparty protection, and transparent activity detection.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative bg-primary-light py-24 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute w-96 h-96 top-0 left-1/3 bg-accent-teal/5 blur-[64px] rounded-full" />
      <div className="absolute w-96 h-96 bottom-0 right-1/3 bg-accent-blue/5 blur-[64px] rounded-full" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-block px-5 py-2.5 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              Platform Features
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[60px] font-bold leading-tight mb-6">
            Built for{' '}
            <span className="gradient-text">Serious Traders</span>
          </h2>
          <p className="text-text-muted text-lg max-w-xl mx-auto">
            Every component engineered for performance, security, and scale.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card-bg border border-card-border rounded-3xl p-8 hover:border-accent-teal/30 transition-colors group"
            >
              {/* Icon */}
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 gradient-icon-bg opacity-20 blur-xl rounded-2xl" />
                <div className="relative w-16 h-16 rounded-2xl bg-card-bg border border-card-border flex items-center justify-center">
                  <feature.icon size={28} className="text-accent-teal" />
                </div>
              </div>
              <h3 className="text-white text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-text-muted text-base leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
