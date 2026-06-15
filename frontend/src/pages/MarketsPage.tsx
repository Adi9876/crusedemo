import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  useMarkets,
  formatPrice,
  formatPercent,
  formatVolume,
  formatMarketCap,
} from '../hooks/useMarketData';

type FilterTab = 'All' | 'Gainers' | 'Losers';

function SkeletonRow() {
  return (
    <div className="bg-card-bg border border-card-border rounded-2xl px-6 py-5 grid grid-cols-1 md:grid-cols-[auto_1fr_140px_120px_120px_120px_120px] gap-4 items-center animate-pulse">
      <div className="w-12 h-4 bg-card-border/50 rounded" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-card-border/50" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 bg-card-border/50 rounded" />
          <div className="h-3 w-12 bg-card-border/50 rounded" />
        </div>
      </div>
      <div className="h-4 bg-card-border/50 rounded ml-auto w-20" />
      <div className="h-4 bg-card-border/50 rounded mx-auto w-16" />
      <div className="h-4 bg-card-border/50 rounded mx-auto w-16" />
      <div className="h-4 bg-card-border/50 rounded ml-auto w-16" />
      <div className="h-4 bg-card-border/50 rounded ml-auto w-16" />
    </div>
  );
}

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const { data: markets, loading, error } = useMarkets();

  const filtered = (markets ?? [])
    .filter((c) => {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
    })
    .filter((c) => {
      if (activeFilter === 'Gainers') return c.change24h > 0;
      if (activeFilter === 'Losers') return c.change24h < 0;
      return true;
    });

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-block px-5 py-2 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              ALL MARKETS
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-2">Explore</h1>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold gradient-text mb-6">
            150+ Markets
          </h1>
          <p className="text-text-muted text-lg">
            Trade the most popular cryptocurrencies with competitive fees
          </p>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 pb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-accent-teal/40"
            />
          </div>
          <div className="flex gap-2">
            {(['All', 'Gainers', 'Losers'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeFilter === tab
                    ? 'gradient-btn text-white'
                    : 'bg-card-bg border border-card-border text-text-light hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="hidden md:grid grid-cols-[auto_1fr_140px_120px_120px_120px_120px] gap-4 px-6 py-3 text-text-muted text-xs uppercase tracking-wider">
          <span className="w-12"></span>
          <span>Name</span>
          <span className="text-right">Price</span>
          <span className="text-center">24h Change</span>
          <span className="text-center">7d Change</span>
          <span className="text-right">Volume (24h)</span>
          <span className="text-right">Market Cap</span>
        </div>

        {error && (
          <p className="text-red-400 text-center py-8 text-sm">{error}</p>
        )}

        <div className="space-y-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            : filtered.map((crypto) => (
                <div
                  key={crypto.symbol}
                  className="bg-card-bg border border-card-border rounded-2xl px-6 py-5 grid grid-cols-1 md:grid-cols-[auto_1fr_140px_120px_120px_120px_120px] gap-4 items-center hover:border-accent-teal/30 transition-colors"
                >
                  <div className="flex items-center gap-2 w-12">
                    <Star size={14} className="text-text-muted hover:text-yellow-400 cursor-pointer" />
                    <span className="text-text-muted text-sm">#{crypto.rank}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                      style={{ backgroundColor: crypto.color }}
                    >
                      {crypto.iconLetter}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{crypto.name}</div>
                      <div className="text-text-muted text-xs">{crypto.symbol}</div>
                    </div>
                  </div>

                  <div className="text-white font-semibold text-right">
                    {formatPrice(crypto.price)}
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    {crypto.change24h > 0 ? (
                      <TrendingUp size={14} className="text-green-400" />
                    ) : crypto.change24h < 0 ? (
                      <TrendingDown size={14} className="text-red-400" />
                    ) : (
                      <TrendingUp size={14} className="text-yellow-400" />
                    )}
                    <span
                      className={`text-sm font-medium px-2 py-0.5 rounded ${
                        crypto.change24h > 0
                          ? 'text-green-400 bg-green-400/10'
                          : crypto.change24h < 0
                          ? 'text-red-400 bg-red-400/10'
                          : 'text-yellow-400 bg-yellow-400/10'
                      }`}
                    >
                      {formatPercent(crypto.change24h)}
                    </span>
                  </div>

                  <div
                    className={`text-sm text-center ${
                      crypto.change7d > 0
                        ? 'text-green-400'
                        : crypto.change7d < 0
                        ? 'text-red-400'
                        : 'text-text-muted'
                    }`}
                  >
                    {formatPercent(crypto.change7d)}
                  </div>

                  <div className="text-text-light text-sm text-right">
                    {formatVolume(crypto.volume24h)}
                  </div>

                  <div className="text-white font-semibold text-sm text-right">
                    {formatMarketCap(crypto.marketCap)}
                  </div>
                </div>
              ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 pb-24 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-2">
          Ready to Start<span className="gradient-text">Trading?</span>
        </h2>
        <p className="text-text-muted text-lg mb-8">
          Join thousands of traders on Cruse X
        </p>
        <Link to="/open-account" className="gradient-btn text-white font-medium text-lg px-8 py-4 rounded-full hover:opacity-90 transition-opacity inline-block">
          Get Started Now
        </Link>
      </section>

      <Footer />
    </div>
  );
}
