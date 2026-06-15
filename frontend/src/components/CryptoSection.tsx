import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

const cryptos = [
  {
    rank: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    price: '$67,842.50',
    change: '+2.5%',
    isPositive: true,
    color: '#F7931A',
    iconLetter: 'B',
  },
  {
    rank: 2,
    name: 'Ethereum',
    symbol: 'ETH',
    price: '$3,451.20',
    change: '+1.89%',
    isPositive: true,
    color: '#627EEA',
    iconLetter: 'E',
  },
  {
    rank: 3,
    name: 'Tether',
    symbol: 'USDT',
    price: '$1.00',
    change: '+0.05%',
    isPositive: true,
    color: '#26A17B',
    iconLetter: 'T',
  },
  {
    rank: 4,
    name: 'SOL',
    symbol: 'SOLANA',
    price: '$1.00',
    change: '-3.66%',
    isPositive: false,
    color: '#9945FF',
    iconLetter: 'S',
  },
];

export default function CryptoSection() {
  return (
    <section className="relative bg-primary-light py-24 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-5 py-2.5 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              Digital Assets
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[60px] font-bold leading-tight">
            Trade Top{' '}
            <span className="gradient-text">Cryptocurrencies</span>
          </h2>
        </div>

        {/* Crypto List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {cryptos.map((crypto) => (
            <div
              key={crypto.symbol}
              className="bg-card-bg border border-card-border rounded-2xl px-6 py-5 flex items-center justify-between hover:border-accent-teal/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-text-muted text-sm w-6">{crypto.rank}</span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: crypto.color }}
                >
                  {crypto.iconLetter}
                </div>
                <div>
                  <div className="text-white font-semibold">{crypto.name}</div>
                  <div className="text-text-muted text-sm">{crypto.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold text-lg">{crypto.price}</div>
                <div className={`flex items-center gap-1 justify-end text-sm ${
                  crypto.isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {crypto.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {crypto.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Link to="/markets" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card-bg border border-card-border text-white text-sm font-medium hover:border-accent-teal/30 transition-colors">
            View All Markets
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
