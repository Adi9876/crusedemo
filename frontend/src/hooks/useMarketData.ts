import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const PRICE_INTERVAL = 1_000;  // 1s for live prices/orderbook
const KLINE_INTERVAL = 5_000; // 5s for candle data
const TRADE_INTERVAL = 1_500; // 1.5s for recent trades

export interface MarketTicker {
  rank: number;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  color: string;
  iconLetter: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  currentPrice: number;
}

export interface RecentTrade {
  price: number;
  amount: number;
  time: string;
  side: 'buy' | 'sell';
}

export interface KlineEntry {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Map UI timeframe labels to backend kline intervals */
export function mapTimeframeToInterval(tf: string): string {
  const map: Record<string, string> = {
    '1s': '1',
    '15m': '15',
    '1H': '1H',
    '4H': '4H',
    '24H': '1D',
    '1D': '1D',
    '1W': '1W',
    '1M': '1D',
  };
  return map[tf] ?? '1D';
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toFixed(4)}`;
}

export function formatPercent(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(0)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

export function formatCompactVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(0)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`;
  return volume.toFixed(0);
}

export function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toFixed(0)}`;
}

export function formatOrderPrice(price: number): string {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function usePolling<T>(fetcher: () => Promise<T>, deps: unknown[] = [], intervalMs = PRICE_INTERVAL) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return { data, loading, error, refetch: load };
}

export function useMarkets() {
  return usePolling<MarketTicker[]>(async () => {
    const res = await api.get<{ success: boolean; data: MarketTicker[] }>('/api/v1/markets');
    return res.data;
  });
}

export function useMarketTicker(symbol: string) {
  return usePolling<MarketTicker | null>(
    async () => {
      const res = await api.get<{ success: boolean; data: MarketTicker }>(
        `/api/v1/markets/${symbol}`
      );
      return res.data;
    },
    [symbol]
  );
}

export function useOrderBook(symbol: string) {
  return usePolling<OrderBookData | null>(
    async () => {
      const res = await api.get<{ success: boolean; data: OrderBookData }>(
        `/api/v1/markets/${symbol}/orderbook`
      );
      return res.data;
    },
    [symbol]
  );
}

export function useRecentTrades(symbol: string) {
  return usePolling<RecentTrade[]>(
    async () => {
      const res = await api.get<{ success: boolean; data: RecentTrade[] }>(
        `/api/v1/markets/${symbol}/trades`
      );
      return res.data;
    },
    [symbol]
  );
}

export function useKlines(symbol: string, interval: string) {
  return usePolling<KlineEntry[]>(
    async () => {
      const res = await api.get<{ success: boolean; data: KlineEntry[] }>(
        `/api/v1/markets/${symbol}/klines?interval=${interval}`
      );
      return res.data;
    },
    [symbol, interval],
    KLINE_INTERVAL
  );
}

export function useRecentTradesFast(symbol: string) {
  return usePolling<RecentTrade[]>(
    async () => {
      const res = await api.get<{ success: boolean; data: RecentTrade[] }>(
        `/api/v1/markets/${symbol}/trades`
      );
      return res.data;
    },
    [symbol],
    TRADE_INTERVAL
  );
}
