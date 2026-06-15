import { Link } from 'react-router-dom';
import { Users, ShieldCheck, Clock, MapPin, Award } from 'lucide-react';

const trustStats = [
  { icon: ShieldCheck, label: 'Bank Grade', sub: 'Security' },
  { icon: Clock, label: '24/7', sub: 'Support' },
  { icon: MapPin, label: '50+', sub: 'Countries' },
  { icon: Award, label: 'Licensed', sub: '& Regulated' },
];

export default function CTASection() {
  return (
    <section className="relative bg-primary py-24 overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent-teal/10 blur-[100px] rounded-full" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card-bg border border-accent-teal/20 mb-10">
          <Users size={16} className="text-accent-teal" />
          <span className="text-sm font-medium gradient-text">Join 10,000+ Active Traders</span>
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl lg:text-[60px] font-bold leading-tight mb-2">
          Ready to Start
        </h2>
        <h2 className="text-4xl md:text-5xl lg:text-[60px] font-bold leading-tight gradient-text mb-8">
          Trading?
        </h2>

        {/* Subtitle */}
        <p className="text-text-muted text-lg max-w-xl mx-auto mb-10">
          Join thousands of traders and institutions already using Cruse X for digital asset trading.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link to="/open-account" className="gradient-btn text-white font-medium text-lg px-8 py-4 rounded-full hover:opacity-90 transition-opacity">
            Create Account
          </Link>
          <Link to="/features" className="px-8 py-4 rounded-full border border-card-border bg-card-bg text-white font-medium text-lg hover:bg-white/10 transition-colors">
            Contact Sales
          </Link>
        </div>

        {/* Trust Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
          {trustStats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <stat.icon size={28} className="text-accent-teal mb-3" />
              <div className="text-white font-bold text-lg">{stat.label}</div>
              <div className="text-text-muted text-sm">{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
