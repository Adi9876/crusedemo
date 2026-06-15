import { useState } from 'react';
import { Wallet, ArrowLeftRight, LayoutDashboard, History } from 'lucide-react';

const tabs = ['Retail Mode', 'Pro Trading'] as const;

const retailFeatures = [
  {
    icon: Wallet,
    label: 'Buy & Sell Crypto',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    icon: ArrowLeftRight,
    label: 'Convert Assets',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10',
  },
  {
    icon: LayoutDashboard,
    label: 'Portfolio Dashboard',
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/10',
  },
  {
    icon: History,
    label: 'Trade History',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
];

export default function TradingModesSection() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Retail Mode');

  return (
    <section className="relative bg-primary py-24 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-5 py-2.5 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              Trading Modes
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[60px] font-bold leading-tight mb-6">
            One Platform,{' '}
            <span className="gradient-text">Two Experiences</span>
          </h2>
          <p className="text-text-muted text-lg max-w-xl mx-auto">
            Whether you're just starting or managing institutional volume, Cruse X adapts to you.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'gradient-btn text-white'
                  : 'bg-card-bg border border-card-border text-text-light hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
          {retailFeatures.map((feature) => (
            <div
              key={feature.label}
              className="bg-card-bg border border-card-border rounded-2xl p-6 flex flex-col items-center text-center hover:border-accent-teal/30 transition-colors"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                <feature.icon size={24} className={feature.color} />
              </div>
              <span className="text-white text-sm font-medium">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Trading Dashboard Preview */}
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute inset-0 gradient-icon-bg opacity-10 blur-3xl rounded-3xl" />
          <div className="relative bg-[#0a1929] border border-card-border rounded-3xl p-6 overflow-hidden">
            {/* Window Controls */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-xs text-text-muted">Cruse X Portfolio</span>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left - Chart Area */}
              <div className="bg-card-bg rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">BTC/USDT</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">LIVE</span>
                    </div>
                    <div className="text-2xl font-bold text-white">$67,842.50</div>
                  </div>
                </div>
                {/* Fake Chart */}
                <div className="h-24 flex items-end gap-1">
                  {[40, 55, 45, 60, 50, 70, 65, 80, 75, 85, 70, 90, 85, 75, 80, 95, 88, 78, 82, 90].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(to top, rgba(1,198,172,0.3), rgba(1,198,172,0.8))`,
                        }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Right - Trade Panel */}
              <div className="space-y-4">
                <div className="bg-card-bg rounded-2xl p-5">
                  <div className="text-xs text-text-muted mb-1">Available Balance</div>
                  <div className="text-xl font-bold text-white">$7,442.80</div>
                </div>
                <div className="bg-card-bg rounded-2xl p-5">
                  <div className="text-xs text-text-muted mb-1">Position</div>
                  <div className="text-xl font-bold text-white">0.5 BTC</div>
                </div>
                <button className="w-full gradient-btn text-white font-medium py-3 rounded-xl">
                  Place Order
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-card-bg border border-card-border text-white py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
                    Buy
                  </button>
                  <button className="bg-card-bg border border-card-border text-white py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
                    Sell
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
