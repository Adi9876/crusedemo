import { Link } from 'react-router-dom';
import { Zap, Shield, Code, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const apiFeatures = [
  {
    icon: Zap,
    title: 'High Performance',
    description: 'Low latency REST and WebSocket APIs optimized for high-frequency trading.',
  },
  {
    icon: Shield,
    title: 'Secure Authentication',
    description: 'Industry-standard API key authentication with IP whitelisting support.',
  },
  {
    icon: Code,
    title: 'Easy Integration',
    description: 'Comprehensive SDKs for Python, JavaScript, Go, and more languages.',
  },
  {
    icon: FileText,
    title: 'Detailed Documentation',
    description: 'Clear documentation with examples and interactive API explorer.',
  },
];

const endpoints = [
  { method: 'GET', color: '#01C6AC', path: '/api/v1/markets', description: 'Get all trading markets' },
  { method: 'GET', color: '#01C6AC', path: '/api/v1/ticker/{symbol}', description: 'Get market ticker' },
  { method: 'POST', color: '#F7931A', path: '/api/v1/orders', description: 'Place a new order' },
  { method: 'GET', color: '#01C6AC', path: '/api/v1/orders', description: 'Get user orders' },
  { method: 'DELETE', color: '#EF4444', path: '/api/v1/orders/{id}', description: 'Cancel an order' },
  { method: 'GET', color: '#01C6AC', path: '/api/v1/account/balance', description: 'Get account balance' },
];

const stats = [
  { value: '99.9%', label: 'API Uptime' },
  { value: '<50ms', label: 'Avg Response' },
  { value: '10K+', label: 'Requests/sec' },
];

const codeExample = `// JavaScript Example
const CruseX = require('crusex-api');

const client = new CruseX({
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_SECRET',
});

// Get market data
const ticker = await client
  .getTicker('BTC/USDT');

console.log(ticker);

// Place an order
const order = await client
  .createOrder({
    symbol: 'BTC/USDT',
    side: 'buy',
    type: 'limit',
    quantity: 0.01,
    price: 67000
  });`;

export default function ApiPage() {
  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-[72px] relative overflow-hidden">
        <div className="absolute w-96 h-96 glow-teal rounded-full top-[176px] left-1/2 -translate-x-1/3" />
        <div className="absolute w-96 h-96 glow-blue rounded-full top-[478px] left-1/2" />

        <div className="max-w-[1280px] mx-auto px-6 pt-32 pb-24 text-center relative z-10">
          <div className="inline-block px-5 py-2 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              DEVELOPER API
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold text-white mb-0">
            Build with
          </h1>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold gradient-text mb-8">
            Our API
          </h1>
          <p className="text-text-light text-lg md:text-xl leading-8 max-w-3xl mx-auto">
            Professional-grade REST and WebSocket APIs for algorithmic trading, portfolio management, and more.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <button className="gradient-btn text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base">
              Get API Key
            </button>
            <button className="bg-card-bg border border-card-border text-white font-medium px-8 py-3.5 rounded-full hover:border-accent-teal/30 transition-colors text-base">
              View Documentation
            </button>
          </div>
        </div>
      </section>

      {/* API Features */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {apiFeatures.map((feature) => (
            <div
              key={feature.title}
              className="bg-card-bg border border-card-border rounded-2xl p-6 text-center hover:border-accent-teal/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl gradient-icon-bg flex items-center justify-center mx-auto mb-4">
                <feature.icon size={24} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-base mb-2">{feature.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code Example & Endpoints */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Simple<span className="gradient-text">Integration</span>
          </h2>
          <p className="text-text-muted mt-4">Get started with just a few lines of code</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Code Example */}
          <div className="bg-[#0a1929] border border-card-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border flex items-center gap-2">
              <Code size={16} className="text-accent-teal" />
              <span className="text-text-light text-sm">JavaScript Example</span>
            </div>
            <pre className="p-6 text-sm text-text-light overflow-x-auto leading-relaxed">
              <code>{codeExample}</code>
            </pre>
          </div>

          {/* Endpoints */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <FileText size={16} className="text-accent-teal" />
              <h3 className="text-white font-bold text-lg">Popular Endpoints</h3>
            </div>
            <div className="space-y-3">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.path}
                  className="bg-card-bg border border-card-border rounded-xl p-4 hover:border-accent-teal/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${endpoint.color}20`, color: endpoint.color }}
                    >
                      {endpoint.method}
                    </span>
                    <span className="text-white text-sm font-mono">{endpoint.path}</span>
                  </div>
                  <p className="text-text-muted text-xs ml-[52px]">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="bg-card-bg border border-card-border rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-text-muted text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
          Ready to Start<span className="gradient-text">Building?</span>
        </h2>
        <p className="text-text-muted mt-4 mb-8">Get your API keys and start trading programmatically</p>
        <Link
          to="/open-account"
          className="gradient-btn text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base inline-block"
        >
          Get Started Free
        </Link>
      </section>

      <Footer />
    </div>
  );
}
