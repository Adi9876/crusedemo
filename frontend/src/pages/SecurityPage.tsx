import { Link } from 'react-router-dom';
import { Shield, HardDrive, Eye, Lock, Fingerprint, Server, CheckCircle, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const securityFeatures = [
  {
    icon: Shield,
    title: 'Multi-Signature Wallets',
    description: 'Assets protected by multi-signature technology requiring multiple approvals for withdrawals.',
  },
  {
    icon: HardDrive,
    title: 'Cold Storage',
    description: '95% of user funds stored offline in geographically distributed cold wallets.',
  },
  {
    icon: Eye,
    title: 'Real-Time Monitoring',
    description: '24/7 automated monitoring systems detect and prevent suspicious activities instantly.',
  },
  {
    icon: Lock,
    title: 'Data Encryption',
    description: 'End-to-end encryption with AES-256 for all sensitive data and communications.',
  },
  {
    icon: Fingerprint,
    title: 'Two-Factor Authentication',
    description: 'Multiple 2FA options including authenticator apps, SMS, and hardware keys.',
  },
  {
    icon: Server,
    title: 'DDoS Protection',
    description: 'Enterprise-grade DDoS mitigation protecting against the largest attacks.',
  },
];

const certifications = [
  { name: 'SOC 2 Type II', status: 'Certified' },
  { name: 'ISO 27001', status: 'Certified' },
  { name: 'PCI DSS', status: 'Compliant' },
  { name: 'GDPR', status: 'Compliant' },
];

const bestPractices = [
  'Enable two-factor authentication on your account',
  'Use a strong, unique password for your account',
  'Add withdrawal addresses to your whitelist',
  'Never share your credentials with anyone',
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-[72px] relative overflow-hidden">
        <div className="absolute w-96 h-96 glow-teal rounded-full top-[176px] left-1/2" />
        <div className="absolute w-96 h-96 glow-blue rounded-full top-[514px] left-1/3" />

        <div className="max-w-[1280px] mx-auto px-6 pt-32 pb-24 text-center relative z-10">
          <div className="inline-block px-5 py-2 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              SECURITY FIRST
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold text-white mb-0">
            Your Assets Are
          </h1>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold gradient-text mb-8">
            Always Protected
          </h1>
          <p className="text-text-light text-lg md:text-xl leading-8 max-w-3xl mx-auto">
            Bank-grade security infrastructure with multiple layers of protection to keep your funds safe.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-card-bg border border-card-border">
              <CheckCircle size={16} className="text-accent-teal" />
              <span className="text-sm text-text-light">$0 Lost in Security Breaches</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-card-bg border border-card-border">
              <CheckCircle size={16} className="text-accent-teal" />
              <span className="text-sm text-text-light">24/7 Monitoring</span>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Layer Security */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Multi-Layer<span className="gradient-text">Security</span>
          </h2>
          <p className="text-text-muted mt-4">Every layer designed to protect your assets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feature) => (
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

      {/* Certifications */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Industry<span className="gradient-text">Certifications</span>
          </h2>
          <p className="text-text-muted mt-4">Audited and certified by leading security organizations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="bg-card-bg border border-card-border rounded-2xl p-6 flex items-center justify-between hover:border-accent-teal/30 transition-colors"
            >
              <div>
                <p className="text-white font-bold text-lg">{cert.name}</p>
                <p className="text-text-muted text-sm">{cert.status}</p>
              </div>
              <CheckCircle size={28} className="text-accent-teal" />
            </div>
          ))}
        </div>
      </section>

      {/* Best Practices */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card-bg border border-card-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-yellow-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Security Best Practices</h3>
            </div>
            <ul className="space-y-4">
              {bestPractices.map((practice) => (
                <li key={practice} className="flex items-center gap-3 text-text-muted text-sm">
                  <CheckCircle size={16} className="text-accent-teal shrink-0" />
                  {practice}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24 text-center">
        <Link
          to="/open-account"
          className="gradient-btn text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base inline-block"
        >
          Learn More About Security
        </Link>
      </section>

      <Footer />
    </div>
  );
}
