import { Search } from 'lucide-react';
import { formatPrice, formatPercent, type MarketTicker } from '../hooks/useMarketData';

interface PairSelectorProps {
  pairs: MarketTicker[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
  className?: string;
}

export default function PairSelector({
  pairs,
  selectedSymbol,
  onSelect,
  searchQuery,
  onSearchChange,
  loading = false,
  className = '',
}: PairSelectorProps) {
  const filtered = pairs.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.symbol.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      `${p.symbol}/usdt`.includes(q)
    );
  });

  return (
    <div className={`flex flex-col h-full bg-card-bg border border-card-border rounded-2xl p-4 ${className}`}>
      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-primary border border-card-border text-white placeholder:text-text-muted text-xs focus:outline-none focus:border-accent-teal/40"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[calc(100vh-220px)]">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-primary/50 animate-pulse" />
            ))
          : filtered.map((pair) => (
              <button
                key={pair.symbol}
                type="button"
                onClick={() => onSelect(pair.symbol)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                  selectedSymbol === pair.symbol
                    ? 'bg-primary border border-accent-teal/30'
                    : 'hover:bg-primary/50 border border-transparent'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                  style={{ backgroundColor: pair.color }}
                >
                  {pair.iconLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {pair.symbol}/USDT
                  </p>
                  <p className="text-text-muted text-xs truncate">
                    {formatPrice(pair.price)}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium shrink-0 ${
                    pair.change24h >= 0 ? 'text-accent-teal' : 'text-red-400'
                  }`}
                >
                  {formatPercent(pair.change24h)}
                </span>
              </button>
            ))}
        {!loading && filtered.length === 0 && (
          <p className="text-text-muted text-xs text-center py-4">No pairs found</p>
        )}
      </div>
    </div>
  );
}
