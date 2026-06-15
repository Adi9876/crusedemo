import { env } from '../../config/env.js';

// Supported coins and their CoinGecko IDs
const SUPPORTED_COINS: Record<string, { id: string; name: string; symbol: string; color: string; iconLetter: string; bybitSymbol?: string }> = {
  BTC:  { id: 'bitcoin',       name: 'Bitcoin',    symbol: 'BTC',  color: '#F7931A', iconLetter: 'B' },
  ETH:  { id: 'ethereum',      name: 'Ethereum',   symbol: 'ETH',  color: '#627EEA', iconLetter: 'E' },
  USDT: { id: 'tether',        name: 'Tether',     symbol: 'USDT', color: '#26A17B', iconLetter: 'T' },
  BNB:  { id: 'binancecoin',   name: 'BNB',        symbol: 'BNB',  color: '#F3BA2F', iconLetter: 'B' },
  SOL:  { id: 'solana',        name: 'Solana',     symbol: 'SOL',  color: '#9945FF', iconLetter: 'S' },
  USDC: { id: 'usd-coin',      name: 'USD Coin',   symbol: 'USDC', color: '#2775CA', iconLetter: 'U', bybitSymbol: 'USDCUSDT' },
  XRP:  { id: 'ripple',        name: 'XRP',        symbol: 'XRP',  color: '#808080', iconLetter: 'X' },
  ADA:  { id: 'cardano',       name: 'Cardano',    symbol: 'ADA',  color: '#0033AD', iconLetter: 'A' },
  DOGE: { id: 'dogecoin',      name: 'Dogecoin',   symbol: 'DOGE', color: '#C2A633', iconLetter: 'D' },
  POL:  { id: 'matic-network', name: 'Polygon',    symbol: 'POL',  color: '#8247E5', iconLetter: 'P', bybitSymbol: 'POLUSDT' },
  AVAX: { id: 'avalanche-2',   name: 'Avalanche',  symbol: 'AVAX', color: '#E84142', iconLetter: 'A' },
  LINK: { id: 'chainlink',     name: 'Chainlink',  symbol: 'LINK', color: '#2A5ADA', iconLetter: 'C' },
};

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_MS = 60_000; // 60 seconds

// ── In-memory cache ──

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string, ttl: number = CACHE_TTL_MS): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Types ──

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
  time: number;      // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
}

// ── Service ──

export class MarketService {
  private getBaseUrl(): string {
    return env.BYBIT_USE_TESTNET === 'true'
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
  }

  /** Public market data always uses mainnet — no auth, no testnet instability */
  private getMarketBaseUrl(): string {
    return 'https://api.bybit.com';
  }

  /**
   * Update a specific ticker in the in-memory cache directly from WebSocket updates.
   */
  static updateTickerInCache(
    symbol: string,
    data: {
      price: number;
      change24h?: number;
      high24h?: number;
      low24h?: number;
      volume24h?: number;
    }
  ): void {
    const cacheKey = 'tickers:all';
    let entry = cache.get(cacheKey);
    if (!entry || !entry.data) {
      const tickers: MarketTicker[] = [];
      let rank = 1;
      for (const key of Object.keys(SUPPORTED_COINS)) {
        const coinMeta = SUPPORTED_COINS[key]!;
        if (key === 'USDT') {
          tickers.push({
            rank: rank++,
            name: 'Tether',
            symbol: 'USDT',
            price: 1.0,
            change24h: 0.0,
            change7d: 0.0,
            volume24h: 1000000000,
            marketCap: 100000000000,
            high24h: 1.0,
            low24h: 1.0,
            color: coinMeta.color,
            iconLetter: coinMeta.iconLetter,
          });
          continue;
        }
        tickers.push({
          rank: rank++,
          name: coinMeta.name,
          symbol: key,
          price: 0,
          change24h: 0,
          change7d: 0,
          volume24h: 0,
          marketCap: 0,
          high24h: 0,
          low24h: 0,
          color: coinMeta.color,
          iconLetter: coinMeta.iconLetter,
        });
      }
      entry = { data: tickers, timestamp: Date.now() };
      cache.set(cacheKey, entry);
    }

    const tickers = entry.data as MarketTicker[];
    const ticker = tickers.find((t) => t.symbol === symbol.toUpperCase());
    if (ticker) {
      ticker.price = data.price;
      if (data.change24h !== undefined) {
        ticker.change24h = data.change24h;
        ticker.change7d = data.change24h * 1.2;
      }
      if (data.high24h !== undefined) ticker.high24h = data.high24h;
      if (data.low24h !== undefined) ticker.low24h = data.low24h;
      if (data.volume24h !== undefined) {
        ticker.volume24h = data.volume24h;
        
        // Recalculate market cap
        const mockCirculatingSupplies: Record<string, number> = {
          BTC: 19600000,
          ETH: 120000000,
          BNB: 150000000,
          SOL: 440000000,
          USDC: 28000000000,
          XRP: 55000000000,
          ADA: 35000000000,
          DOGE: 140000000000,
          POL: 9900000000,
          AVAX: 367000000,
          LINK: 587000000,
        };
        const supply = mockCirculatingSupplies[symbol.toUpperCase()] || 100000000;
        ticker.marketCap = data.price * supply;
      }
      // Refresh the timestamp to keep it cached
      entry.timestamp = Date.now();
    }
  }

  /**
   * Get tickers for all supported coins from Bybit.
   */
  async getAllTickers(): Promise<MarketTicker[]> {
    const cacheKey = 'tickers:all';
    const cached = getCached<MarketTicker[]>(cacheKey);
    if (cached) return cached;

    try {
      const baseUrl = this.getMarketBaseUrl();
      const url = `${baseUrl}/v5/market/tickers?category=spot`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Bybit Ticker API error: ${response.status}`);
      }

      const body = (await response.json()) as any;
      if (body.retCode !== 0) {
        throw new Error(`Bybit Ticker API returned code: ${body.retCode}, msg: ${body.retMsg}`);
      }

      const rawList = body.result?.list || [];
      const tickers: MarketTicker[] = [];
      let rank = 1;

      for (const key of Object.keys(SUPPORTED_COINS)) {
        const coinMeta = SUPPORTED_COINS[key]!;

        if (key === 'USDT') {
          tickers.push({
            rank: rank++, name: 'Tether', symbol: 'USDT',
            price: 1.0, change24h: 0.0, change7d: 0.0,
            volume24h: 1000000000, marketCap: 100000000000,
            high24h: 1.0, low24h: 1.0,
            color: coinMeta.color, iconLetter: coinMeta.iconLetter,
          });
          continue;
        }

        const bybitSymbol = coinMeta.bybitSymbol ?? `${key}USDT`;
        const rawTicker = rawList.find((item: any) => item.symbol === bybitSymbol);
        const price = rawTicker ? parseFloat(rawTicker.lastPrice || '0') : 0;
        const change24h = rawTicker ? parseFloat(rawTicker.price24hPcnt || '0') * 100 : 0;
        const volume24h = rawTicker ? parseFloat(rawTicker.turnover24h || '0') : 0;

        const mockCirculatingSupplies: Record<string, number> = {
          BTC: 19600000, ETH: 120000000, BNB: 150000000, SOL: 440000000,
          USDC: 28000000000, XRP: 55000000000, ADA: 35000000000,
          DOGE: 140000000000, POL: 9900000000, AVAX: 367000000, LINK: 587000000,
        };
        const supply = mockCirculatingSupplies[key] || 100000000;

        tickers.push({
          rank: rank++, name: coinMeta.name, symbol: key,
          price, change24h, change7d: change24h * 1.2, volume24h,
          marketCap: price * supply,
          high24h: rawTicker ? parseFloat(rawTicker.highPrice24h || '0') : price,
          low24h: rawTicker ? parseFloat(rawTicker.lowPrice24h || '0') : price,
          color: coinMeta.color, iconLetter: coinMeta.iconLetter,
        });
      }

      setCache(cacheKey, tickers);
      return tickers;
    } catch (err) {
      console.error('[MarketService] getAllTickers failed:', err);
      // Return stale cache if available, else build zeroed list so app doesn't crash
      const stale = cache.get(cacheKey);
      if (stale) return stale.data as MarketTicker[];
      return Object.keys(SUPPORTED_COINS).map((key, i) => {
        const m = SUPPORTED_COINS[key]!;
        return {
          rank: i + 1, name: m.name, symbol: key,
          price: key === 'USDT' ? 1 : 0, change24h: 0, change7d: 0,
          volume24h: 0, marketCap: 0, high24h: 0, low24h: 0,
          color: m.color, iconLetter: m.iconLetter,
        };
      });
    }
  }

  /**
   * Get a single ticker by symbol.
   */
  async getTicker(symbol: string): Promise<MarketTicker | null> {
    const tickers = await this.getAllTickers();
    return tickers.find((t) => t.symbol === symbol.toUpperCase()) ?? null;
  }

  /**
   * Get live order book from Bybit.
   */
  async getOrderBook(symbol: string): Promise<OrderBookData> {
    const baseUrl = this.getBaseUrl();
    const symUpper = symbol.toUpperCase();
    const coinMeta = Object.values(SUPPORTED_COINS).find((c) => c.symbol === symUpper);
    const bybitSymbol = coinMeta?.bybitSymbol ?? `${symUpper}USDT`;
    const url = `${baseUrl}/v5/market/orderbook?category=spot&symbol=${bybitSymbol}&limit=15`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit Orderbook API error: ${response.status}`);
    }

    const body = (await response.json()) as any;
    if (body.retCode !== 0) {
      throw new Error(`Bybit Orderbook API returned code: ${body.retCode}`);
    }

    const result = body.result || {};
    const rawBids = result.b || [];
    const rawAsks = result.a || [];

    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];

    let bidAccumulator = 0;
    for (const rawBid of rawBids) {
      const price = parseFloat(rawBid[0]);
      const amount = parseFloat(rawBid[1]);
      bidAccumulator += price * amount;
      bids.push({
        price,
        amount,
        total: parseFloat(bidAccumulator.toFixed(2)),
      });
    }

    let askAccumulator = 0;
    for (const rawAsk of rawAsks) {
      const price = parseFloat(rawAsk[0]);
      const amount = parseFloat(rawAsk[1]);
      askAccumulator += price * amount;
      asks.push({
        price,
        amount,
        total: parseFloat(askAccumulator.toFixed(2)),
      });
    }

    const ticker = await this.getTicker(symbol);
    const currentPrice = ticker ? ticker.price : (bids[0]?.price || asks[0]?.price || 0);

    return { bids, asks, currentPrice };
  }

  /**
   * Get recent public trades from Bybit.
   */
  async getRecentTrades(symbol: string): Promise<RecentTrade[]> {
    const baseUrl = this.getMarketBaseUrl();
    const symUpper = symbol.toUpperCase();
    const coinMeta = Object.values(SUPPORTED_COINS).find((c) => c.symbol === symUpper);
    const bybitSymbol = coinMeta?.bybitSymbol ?? `${symUpper}USDT`;
    const url = `${baseUrl}/v5/market/recent-trade?category=spot&symbol=${bybitSymbol}&limit=20`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit Recent Trades API error: ${response.status}`);
    }

    const body = (await response.json()) as any;
    if (body.retCode !== 0) {
      throw new Error(`Bybit Recent Trades API returned code: ${body.retCode}`);
    }

    const rawList = body.result?.list || [];
    return rawList.map((t: any) => {
      const timeMs = parseInt(t.time || '0');
      const date = timeMs > 0 ? new Date(timeMs) : new Date();
      return {
        price: parseFloat(t.price || '0'),
        amount: parseFloat(t.size || '0'),
        time: date.toLocaleTimeString('en-US', { hour12: true }),
        side: String(t.side).toLowerCase() === 'sell' ? 'sell' : 'buy',
      };
    });
  }

  /**
   * Get OHLC / kline data from Bybit.
   */
  async getKlines(symbol: string, interval: string): Promise<KlineEntry[]> {
    const symUpper = symbol.toUpperCase();
    // Map our symbol to Bybit trading pair
    const coinMeta = Object.values(SUPPORTED_COINS).find((c) => c.symbol === symUpper);
    const bybitSymbol = coinMeta?.bybitSymbol ?? (symUpper === 'USDC' ? 'USDCUSDT' : `${symUpper}USDT`);

    const bybitIntervalMap: Record<string, string> = {
      '1': '1',
      '15': '15',
      '1H': '60',
      '4H': '240',
      '1D': 'D',
      '1W': 'W',
    };
    const bybitInterval = bybitIntervalMap[interval] ?? bybitIntervalMap[interval.toUpperCase()] ?? 'D';

    const cacheKey = `klines:${symbol}:${interval}`;
    const isLowInterval = interval === '1' || interval === '15';
    const ttl = isLowInterval ? 3000 : CACHE_TTL_MS;
    
    const cached = getCached<KlineEntry[]>(cacheKey, ttl);
    if (cached) return cached;

    const baseUrl = this.getMarketBaseUrl();
    const url = `${baseUrl}/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=${bybitInterval}&limit=200`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Bybit Kline API error: ${response.status}`);
    }

    const body = (await response.json()) as any;
    if (body.retCode !== 0) {
      throw new Error(`Bybit Kline API returned code: ${body.retCode}`);
    }

    const rawList = body.result?.list || [];
    // Sort oldest to newest (Bybit returns newest first)
    const reversed = [...rawList].reverse();

    const klines = reversed.map((candle: any) => ({
      time: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
    }));

    setCache(cacheKey, klines);
    return klines;
  }
}
