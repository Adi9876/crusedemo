import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw, BarChart2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PriceChart from '../components/PriceChart';
import PairSelector from '../components/PairSelector';
import DepthChart from '../components/DepthChart';
import { getTradeableMarkets } from '../lib/tradingPairs';
import { api } from '../lib/api';
import {
  useMarkets,
  useMarketTicker,
  useOrderBook,
  useRecentTradesFast,
  useKlines,
  formatPrice,
  formatPercent,
  formatCompactVolume,
  formatOrderPrice,
} from '../hooks/useMarketData';

interface WalletBalance {
  currency: string;
  balance: string;
  locked: string;
  available: string;
}

interface OpenOrder {
  id: string;
  symbol: string;
  type: 'LIMIT' | 'MARKET' | 'STOP';
  side: 'BUY' | 'SELL';
  status: string;
  price: string | null;
  stopPrice: string | null;
  amount: string;
  filledAmount: string;
  remainingAmount: string;
  createdAt: string;
}

interface TradeEntry {
  id: string;
  symbol: string;
  price: string;
  amount: string;
  side: 'BUY' | 'SELL';
  createdAt: string;
}

type OrderType = 'Limit' | 'Market' | 'Stop';
type TimeFrame = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W';
type BottomTab = 'Open Orders' | 'Trade History';
type ChartMode = 'Candles' | 'Depth';

const TIMEFRAMES: TimeFrame[] = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];

function mapTF(tf: TimeFrame): string {
  const m: Record<string, string> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '1H': '1H',
    '4H': '4H',
    '1D': '1D',
    '1W': '1W',
  };
  return m[tf] ?? '1D';
}

export default function SpotTradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [searchQuery, setSearchQuery] = useState('');
  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [orderType, setOrderType] = useState<OrderType>('Limit');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [timeframe, setTimeframe] = useState<TimeFrame>('1D');
  const [chartMode, setChartMode] = useState<ChartMode>('Candles');
  const [bottomTab, setBottomTab] = useState<BottomTab>('Open Orders');
  const lastPriceInitRef = useRef('');

  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeEntry[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: markets, loading: marketsLoading } = useMarkets();
  const { data: ticker } = useMarketTicker(selectedSymbol);
  const { data: orderBook, loading: orderBookLoading } = useOrderBook(selectedSymbol);
  const { data: recentTrades } = useRecentTradesFast(selectedSymbol);
  const klineInterval = mapTF(timeframe);
  const { data: klines, loading: klinesLoading } = useKlines(selectedSymbol, klineInterval);

  const tradingPairs = getTradeableMarkets(markets);
  // const currentPair = tradingPairs.find((p) => p.symbol === selectedSymbol) ?? tradingPairs[0];
  const currentPrice = orderBook?.currentPrice ?? ticker?.price ?? 0;

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: WalletBalance[] }>('/api/v1/wallet/balances');
      if (res.success) setBalances(res.data);
    } catch {}
  }, []);

  const fetchOpenOrders = useCallback(async (initial = false) => {
    if (initial) setOrdersLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: OpenOrder[] }>('/api/v1/trading/orders/open');
      if (res.success) setOpenOrders(res.data);
    } catch {} finally {
      if (initial) setOrdersLoading(false);
    }
  }, []);

  const fetchTradeHistory = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: TradeEntry[] }>('/api/v1/trading/trades');
      if (res.success) setTradeHistory(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    void fetchBalances();
    void fetchOpenOrders(true);
    void fetchTradeHistory();
    const i = setInterval(() => {
      void fetchBalances();
      void fetchOpenOrders(false);
      void fetchTradeHistory();
    }, 3000);
    return () => clearInterval(i);
  }, [fetchBalances, fetchOpenOrders, fetchTradeHistory]);

  const activeBalanceAsset = side === 'Buy' ? 'USDT' : selectedSymbol;
  const currentBalanceObj = balances.find((b) => b.currency === activeBalanceAsset);
  const availableBalance = parseFloat(currentBalanceObj?.available ?? '0') || 0;

  const handlePercentClick = (pct: number) => {
    if (side === 'Buy') {
      const p = orderType === 'Limit' ? parseFloat(price) : currentPrice;
      if (p > 0) setAmount(((availableBalance * pct) / p).toFixed(6));
    } else {
      setAmount((availableBalance * pct).toFixed(6));
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) return setFormError('Enter a valid amount');
    if (orderType !== 'Market') {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0) return setFormError('Enter a valid price');
    }
    if (orderType === 'Stop') {
      const sp = parseFloat(stopPrice);
      if (isNaN(sp) || sp <= 0) return setFormError('Enter a valid stop price');
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        symbol: selectedSymbol,
        type: orderType.toUpperCase(),
        side: side.toUpperCase(),
        amount,
      };
      if (orderType !== 'Market') payload.price = price;
      if (orderType === 'Stop') payload.stopPrice = stopPrice;

      const res = await api.post<{ success: boolean }>('/api/v1/trading/orders', payload);
      if (res.success) {
        setFormSuccess(`✓ ${side} order placed — ${amount} ${selectedSymbol}`);
        setAmount('0.00');
        void fetchBalances();
        void fetchOpenOrders();
        void fetchTradeHistory();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      await api.delete(`/api/v1/trading/orders/${id}`);
      setFormSuccess('Order cancelled');
      void fetchBalances();
      void fetchOpenOrders();
    } catch (err: any) {
      setFormError(err.message || 'Failed to cancel');
    }
  };

  useEffect(() => {
    setFormError(null);
    setFormSuccess(null);
  }, [selectedSymbol, side, orderType]);

  useEffect(() => {
    if (tradingPairs.length && !tradingPairs.some((p) => p.symbol === selectedSymbol)) {
      setSelectedSymbol(tradingPairs[0].symbol);
    }
  }, [tradingPairs, selectedSymbol]);

  useEffect(() => {
    const initKey = `${selectedSymbol}-${orderType}`;
    if (currentPrice && orderType === 'Limit' && lastPriceInitRef.current !== initKey) {
      setPrice(formatOrderPrice(currentPrice));
      lastPriceInitRef.current = initKey;
    }
  }, [currentPrice, orderType, selectedSymbol]);

  const ordersForPair = openOrders.filter((o) => o.symbol === selectedSymbol);
  const tradesForPair = tradeHistory.filter((t) => t.symbol === selectedSymbol);

  const totalEstimate = (() => {
    const p = orderType === 'Limit' || orderType === 'Stop' ? parseFloat(price) : currentPrice;
    const a = parseFloat(amount) || 0;
    return isNaN(p) ? 0 : p * a;
  })();

  // const priceDeltaAbs = ticker ? Math.abs((ticker.price * ticker.change24h) / 100) : 0;
  const isUp = (ticker?.change24h ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              Spot <span className="gradient-text">Trading</span>
            </h1>
            {ticker && (
              <div className="flex items-center gap-4 text-sm ml-4">
                <span className={`font-bold text-xl ${isUp ? 'text-accent-teal' : 'text-red-400'}`}>
                  {formatPrice(ticker.price)}
                </span>
                <span className={`flex items-center gap-1 text-xs ${isUp ? 'text-accent-teal' : 'text-red-400'}`}>
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {formatPercent(ticker.change24h)}
                </span>
                <span className="text-text-muted text-xs hidden lg:block">
                  24h High: <span className="text-white">{formatOrderPrice(ticker.high24h)}</span>
                </span>
                <span className="text-text-muted text-xs hidden lg:block">
                  24h Low: <span className="text-white">{formatOrderPrice(ticker.low24h)}</span>
                </span>
                <span className="text-text-muted text-xs hidden xl:block">
                  24h Vol: <span className="text-white">{formatCompactVolume(ticker.volume24h)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 pb-4">
        <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_280px] gap-3">
          {/* Pair List */}
          <PairSelector
            className="hidden xl:flex"
            pairs={tradingPairs}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={marketsLoading}
          />

          {/* Mobile pair picker */}
          <div className="xl:hidden mb-1 col-span-full">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
            >
              {tradingPairs.map((p) => (
                <option key={p.symbol} value={p.symbol}>{p.symbol}/USDT — {formatPrice(p.price)}</option>
              ))}
            </select>
          </div>

          {/* Center column */}
          <div className="space-y-3">
            {/* Chart card */}
            <div className="bg-card-bg border border-card-border rounded-2xl p-4">
              {/* Chart controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 flex-wrap">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        timeframe === tf
                          ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30'
                          : 'text-text-muted hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartMode('Candles')}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${chartMode === 'Candles' ? 'bg-card-border text-white' : 'text-text-muted hover:text-white'}`}
                  >
                    <BarChart2 size={12} className="inline mr-1" />Candles
                  </button>
                  <button
                    onClick={() => setChartMode('Depth')}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors ${chartMode === 'Depth' ? 'bg-card-border text-white' : 'text-text-muted hover:text-white'}`}
                  >
                    <Activity size={12} className="inline mr-1" />Depth
                  </button>
                </div>
              </div>

              {chartMode === 'Candles' ? (
                <PriceChart
                  klines={klines ?? []}
                  loading={klinesLoading}
                  height={260}
                  livePrice={currentPrice || undefined}
                  showVolume
                  className="w-full"
                />
              ) : (
                <DepthChart
                  bids={orderBook?.bids ?? []}
                  asks={orderBook?.asks ?? []}
                  height={260}
                  loading={orderBookLoading}
                />
              )}
            </div>

            {/* Order Book + Recent Trades split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Order Book */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-sm">Order Book</h3>
                  <span className={`text-xs font-bold ${isUp ? 'text-accent-teal' : 'text-red-400'}`}>
                    {currentPrice ? formatOrderPrice(currentPrice) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-[10px] text-text-muted mb-2 pb-1.5 border-b border-card-border">
                  <span>Price (USDT)</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Total</span>
                </div>
                {/* Asks */}
                <div className="space-y-[2px] mb-1">
                  {orderBookLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-4 bg-primary/50 rounded animate-pulse" />
                      ))
                    : [...(orderBook?.asks ?? [])].reverse().slice(0, 8).map((e, i) => (
                        <div key={i} className="grid grid-cols-3 text-[11px] relative">
                          <div
                            className="absolute inset-0 bg-red-400/8 rounded"
                            style={{ width: `${Math.min(100, (e.total / ((orderBook?.asks[0]?.total ?? 1) * 2)) * 100)}%` }}
                          />
                          <span className="relative text-red-400">{formatOrderPrice(e.price)}</span>
                          <span className="relative text-right text-text-light">{e.amount.toFixed(4)}</span>
                          <span className="relative text-right text-text-muted">{formatCompactVolume(e.total)}</span>
                        </div>
                      ))}
                </div>
                {/* Spread */}
                <div className="py-1.5 text-center text-xs text-text-muted border-y border-card-border my-1">
                  <span className={`font-bold text-sm ${isUp ? 'text-accent-teal' : 'text-red-400'}`}>
                    {currentPrice ? formatOrderPrice(currentPrice) : '—'}
                  </span>
                </div>
                {/* Bids */}
                <div className="space-y-[2px] mt-1">
                  {(orderBook?.bids ?? []).slice(0, 8).map((e, i) => (
                    <div key={i} className="grid grid-cols-3 text-[11px] relative">
                      <div
                        className="absolute inset-0 bg-accent-teal/8 rounded"
                        style={{ width: `${Math.min(100, (e.total / ((orderBook?.bids[0]?.total ?? 1) * 2)) * 100)}%` }}
                      />
                      <span className="relative text-accent-teal">{formatOrderPrice(e.price)}</span>
                      <span className="relative text-right text-text-light">{e.amount.toFixed(4)}</span>
                      <span className="relative text-right text-text-muted">{formatCompactVolume(e.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Market Trades */}
              <div className="bg-card-bg border border-card-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-sm">Recent Trades</h3>
                  <span className="text-[10px] text-text-muted">{selectedSymbol}/USDT</span>
                </div>
                <div className="grid grid-cols-3 text-[10px] text-text-muted mb-2 pb-1.5 border-b border-card-border">
                  <span>Price (USDT)</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Time</span>
                </div>
                <div className="space-y-[3px] overflow-y-auto max-h-[220px]">
                  {(recentTrades ?? []).slice(0, 25).map((t, i) => (
                    <div key={i} className="grid grid-cols-3 text-[11px] hover:bg-white/5 rounded px-0.5">
                      <span className={t.side === 'buy' ? 'text-accent-teal' : 'text-red-400'}>
                        {formatOrderPrice(t.price)}
                      </span>
                      <span className="text-right text-text-light">{t.amount.toFixed(5)}</span>
                      <span className="text-right text-text-muted">{t.time}</span>
                    </div>
                  ))}
                  {!recentTrades?.length && (
                    <div className="text-center py-8 text-text-muted text-xs">No recent trades</div>
                  )}
                </div>
              </div>
            </div>

            {/* Open Orders / Trade History */}
            <div className="bg-card-bg border border-card-border rounded-2xl">
              <div className="flex items-center border-b border-card-border px-2">
                {(['Open Orders', 'Trade History'] as BottomTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setBottomTab(tab)}
                    className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors -mb-[1px] ${
                      bottomTab === tab
                        ? 'text-white border-accent-teal'
                        : 'text-text-muted border-transparent hover:text-white'
                    }`}
                  >
                    {tab === 'Open Orders' ? `Open Orders (${ordersForPair.length})` : tab}
                  </button>
                ))}
                <button onClick={() => { void fetchOpenOrders(); void fetchTradeHistory(); }} className="ml-auto mr-2 text-text-muted hover:text-white">
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[280px]">
                {bottomTab === 'Open Orders' && (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card-bg">
                      <tr className="text-text-muted border-b border-card-border">
                        {['Time', 'Pair', 'Type', 'Side', 'Price', 'Amount', 'Filled', 'Progress', ''].map((h, i) => (
                          <th key={i} className={`py-2.5 px-3 font-medium ${i > 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ordersLoading ? (
                        <tr><td colSpan={9} className="py-8 text-center text-text-muted">Loading...</td></tr>
                      ) : ordersForPair.length === 0 ? (
                        <tr><td colSpan={9} className="py-8 text-center text-text-muted">No open orders for {selectedSymbol}</td></tr>
                      ) : ordersForPair.map((order) => {
                        const filled = parseFloat(order.filledAmount);
                        const total = parseFloat(order.amount);
                        const pct = total > 0 ? (filled / total) * 100 : 0;
                        return (
                          <tr key={order.id} className="border-b border-card-border/50 hover:bg-white/5">
                            <td className="py-2.5 px-3 text-text-muted">{new Date(order.createdAt).toLocaleTimeString()}</td>
                            <td className="py-2.5 px-3 text-white font-semibold">{order.symbol}/USDT</td>
                            <td className="py-2.5 px-3 text-text-light">{order.type}</td>
                            <td className={`py-2.5 px-3 font-semibold ${order.side === 'BUY' ? 'text-accent-teal' : 'text-red-400'}`}>{order.side}</td>
                            <td className="py-2.5 px-3 text-right">{order.price ? formatOrderPrice(parseFloat(order.price)) : 'MKT'}</td>
                            <td className="py-2.5 px-3 text-right text-text-light">{parseFloat(order.amount).toFixed(5)}</td>
                            <td className="py-2.5 px-3 text-right text-text-light">{filled.toFixed(5)}</td>
                            <td className="py-2.5 px-3 text-right min-w-[80px]">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-primary overflow-hidden">
                                  <div className="h-full rounded-full bg-accent-teal transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-text-muted w-8 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button onClick={() => handleCancelOrder(order.id)} className="text-red-400 hover:text-red-300 font-medium text-[11px]">Cancel</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {bottomTab === 'Trade History' && (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card-bg">
                      <tr className="text-text-muted border-b border-card-border">
                        {['Time', 'Pair', 'Side', 'Price', 'Amount', 'Total (USDT)'].map((h, i) => (
                          <th key={i} className={`py-2.5 px-3 font-medium ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tradesForPair.length === 0 ? (
                        <tr><td colSpan={6} className="py-8 text-center text-text-muted">No trade history for {selectedSymbol}</td></tr>
                      ) : tradesForPair.map((t) => {
                        const p = parseFloat(t.price);
                        const a = parseFloat(t.amount);
                        return (
                          <tr key={t.id} className="border-b border-card-border/50 hover:bg-white/5">
                            <td className="py-2.5 px-3 text-text-muted">{new Date(t.createdAt).toLocaleTimeString()}</td>
                            <td className="py-2.5 px-3 text-white font-semibold">{t.symbol}/USDT</td>
                            <td className={`py-2.5 px-3 font-semibold ${t.side === 'BUY' ? 'text-accent-teal' : 'text-red-400'}`}>{t.side}</td>
                            <td className="py-2.5 px-3 text-right text-text-light">{p.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="py-2.5 px-3 text-right text-text-light">{a.toFixed(5)}</td>
                            <td className="py-2.5 px-3 text-right text-text-light">{(p * a).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Order Form */}
          <form onSubmit={handleSubmitOrder} className="bg-card-bg border border-card-border rounded-2xl p-5 self-start">
            {/* Buy / Sell */}
            <div className="grid grid-cols-2 gap-1 bg-primary rounded-xl p-1 mb-4">
              <button
                type="button"
                onClick={() => setSide('Buy')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${side === 'Buy' ? 'gradient-btn text-white' : 'text-text-muted hover:text-white'}`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide('Sell')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${side === 'Sell' ? 'bg-red-500 text-white' : 'text-text-muted hover:text-white'}`}
              >
                Sell
              </button>
            </div>

            {/* Order types */}
            <div className="grid grid-cols-3 gap-1 mb-4">
              {(['Limit', 'Market', 'Stop'] as OrderType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors border ${
                    orderType === t
                      ? 'bg-accent-teal/15 text-accent-teal border-accent-teal/30'
                      : 'text-text-muted border-card-border hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {formError && (
              <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{formError}</div>
            )}
            {formSuccess && (
              <div className="mb-3 p-2.5 bg-accent-teal/10 border border-accent-teal/20 rounded-xl text-accent-teal text-xs">{formSuccess}</div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-text-muted text-xs">Available</span>
              <span className="text-white text-sm font-medium">
                {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {activeBalanceAsset}
              </span>
            </div>

            {orderType === 'Stop' && (
              <div className="mb-3">
                <label className="text-text-muted text-xs mb-1.5 block">Stop Trigger (USDT)</label>
                <input
                  type="text"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-yellow-400/40"
                />
                <p className="text-[10px] text-text-muted mt-1">Order triggers when price reaches stop price</p>
              </div>
            )}

            {orderType !== 'Market' && (
              <div className="mb-3">
                <label className="text-text-muted text-xs mb-1.5 block">
                  {orderType === 'Stop' ? 'Limit Price (USDT)' : 'Price (USDT)'}
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                />
              </div>
            )}

            {orderType === 'Market' && (
              <div className="mb-3 p-2.5 bg-primary rounded-xl border border-card-border">
                <span className="text-text-muted text-xs">Market Price</span>
                <p className={`text-lg font-bold ${isUp ? 'text-accent-teal' : 'text-red-400'}`}>
                  {formatOrderPrice(currentPrice)}
                </p>
              </div>
            )}

            <div className="mb-3">
              <label className="text-text-muted text-xs mb-1.5 block">Amount ({selectedSymbol})</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {['25%', '50%', '75%', '100%'].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentClick(parseFloat(pct) / 100)}
                  className="py-1.5 rounded-lg bg-primary border border-card-border text-text-muted text-xs hover:text-white hover:border-accent-teal/30 transition-colors"
                >
                  {pct}
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Est. Total</span>
                <span className="text-white font-medium">{totalEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Fee (0.1%)</span>
                <span className="text-white font-medium">{(totalEstimate * 0.001).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'Buy' ? 'gradient-btn' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isSubmitting ? 'Processing...' : `${side} ${selectedSymbol}`}
            </button>

            <p className="text-text-muted text-[10px] text-center mt-2.5">
              Trading fee 0.1% · Min order 10 USDT
            </p>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
