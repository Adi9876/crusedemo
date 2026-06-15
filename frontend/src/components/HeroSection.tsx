import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles, ChevronRight } from 'lucide-react';

const stats = [
  { value: '$2.4B+', label: 'TRADING VOLUME', glowColor: 'teal' },
  { value: '150+', label: 'MARKETS', glowColor: 'blue' },
  { value: '<1ms', label: 'LATENCY', glowColor: 'teal' },
  { value: '99.99%', label: 'UPTIME', glowColor: 'blue' },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-primary pt-[72px]">
      {/* Background Effects */}
      <div className="absolute w-96 h-96 top-20 left-0 glow-teal opacity-70 rounded-full" />
      <div className="absolute w-[600px] h-[600px] top-96 right-0 glow-blue rounded-full" />

      {/* Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 pt-16 pb-20 flex flex-col items-center">
        {/* Badge */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-card-bg border border-accent-teal/20 mb-10">
          <div className="w-6 h-6 rounded-full gradient-icon-bg flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-sm font-medium gradient-text">Next-Gen Digital Asset Trading</span>
          <ChevronRight size={16} className="text-accent-teal" />
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-center leading-tight mb-2">
          Trade Digital Assets
        </h1>
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-center leading-tight gradient-text mb-8">
          Without Limits
        </h1>

        {/* Subtitle */}
        <p className="text-text-light text-lg md:text-xl text-center max-w-2xl mb-4 leading-relaxed">
          Institutional-grade infrastructure for retail and professional traders.
        </p>
        <p className="text-text-light text-lg md:text-xl text-center max-w-2xl mb-10 leading-relaxed">
          Deep liquidity, lightning execution, and global market access.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <Link to="/spot-trading" className="gradient-btn text-white font-medium text-lg px-8 py-4 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity">
            Start Trading
            <ArrowUpRight size={16} />
          </Link>
          <Link to="/api" className="px-8 py-4 rounded-full border border-accent-blue/30 bg-card-bg text-white font-medium text-lg hover:bg-white/10 transition-colors">
            Explore API
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-4xl">
          {stats.map((stat) => (
            <div key={stat.label} className="relative group">
              {/* Glow */}
              <div
                className={`absolute inset-0 rounded-2xl blur-3xl opacity-30 ${
                  stat.glowColor === 'teal'
                    ? 'bg-accent-teal/20'
                    : 'bg-accent-blue/20'
                }`}
              />
              {/* Card */}
              <div className="relative bg-card-bg border border-card-border rounded-2xl p-6 text-center">
                <div className="stat-text text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-text-muted text-xs tracking-wider uppercase">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
