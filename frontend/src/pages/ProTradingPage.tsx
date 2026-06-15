import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Settings, Sparkles, X, Info } from 'lucide-react';
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
  mapTimeframeToInterval,
  formatOrderPrice,
  formatCompactVolume,
  formatPercent,
  formatPrice,
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

interface OrderHistoryEntry {
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

interface UserTradeEntry {
  id: string;
  symbol: string;
  price: string;
  amount: string;
  side: 'BUY' | 'SELL';
  createdAt: string;
}

type OrderType = 'Limit' | 'Market' | 'Stop';
type ChartTab = 'Chart' | 'Info' | 'Trading Data';
type TimeFrame = '1s' | '15m' | '1H' | '4H' | '1D' | '1W';
type ChartView = 'Original' | 'Trading View' | 'Depth';
type BottomTab = 'Open Orders' | 'Order History' | 'Trade History' | 'Funds';
type TradesTab = 'Market Trades' | 'My Trades';


export default function ProTradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [pairSearch, setPairSearch] = useState('');
  const lastPriceInitRef = useRef('');

  const { data: markets, loading: marketsLoading } = useMarkets();
  const tradingPairs = getTradeableMarkets(markets);
  const currentPair =
    tradingPairs.find((p) => p.symbol === selectedSymbol) ?? tradingPairs[0];

  const { data: ticker } = useMarketTicker(selectedSymbol);
  const { data: orderBook } = useOrderBook(selectedSymbol);
  const { data: recentTrades } = useRecentTradesFast(selectedSymbol);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1D');
  const klineInterval = mapTimeframeToInterval(timeframe);
  const { data: klines, loading: klinesLoading } = useKlines(selectedSymbol, klineInterval);

  // Advanced PRO and Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [confirmOrders, setConfirmOrders] = useState(true);
  const [layoutCompact, setLayoutCompact] = useState(true);
  const [chartTheme, setChartTheme] = useState('dark');
  const [aiReport, setAiReport] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

  const fetchAiAnalysis = async (symbol: string, price: number, change: number, volume: number) => {
    setAiLoading(true);
    setAiReport('');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert crypto technical analyst. Write a concise, professional technical analysis report for ${symbol}/USDT.
Current price: $${price}.
24h change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%.
24h volume: $${volume.toLocaleString()}.
Include a short summary, key support/resistance levels, RSI/MACD interpretation, and a clear final recommendation (STRONG BUY, BUY, NEUTRAL, SELL, STRONG SELL). Keep the response structured, highly professional, and under 250 words.`
            }]
          }]
        })
      });
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate analysis.';
      setAiReport(text);
    } catch (err) {
      console.error(err);
      setAiReport('Error generating AI analysis. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenAiModal = () => {
    setIsAiModalOpen(true);
    const priceVal = currentPrice || 0;
    const changeVal = ticker?.change24h || 0;
    const volVal = ticker?.volume24h || 0;
    void fetchAiAnalysis(selectedSymbol, priceVal, changeVal, volVal);
  };

  // Integration States
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [tradeHistory, setTradeHistory] = useState<UserTradeEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: WalletBalance[] }>('/api/v1/wallet/balances');
      if (res.success) setBalances(res.data);
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  }, []);

  const fetchOpenOrders = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: OpenOrder[] }>('/api/v1/trading/orders/open');
      if (res.success) setOpenOrders(res.data);
    } catch (err) {
      console.error('Error fetching open orders:', err);
    }
  }, []);

  const fetchOrderHistory = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: OrderHistoryEntry[] }>('/api/v1/trading/orders/history');
      if (res.success) setOrderHistory(res.data);
    } catch (err) {
      console.error('Error fetching order history:', err);
    }
  }, []);

  const fetchTradeHistory = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: UserTradeEntry[] }>('/api/v1/trading/trades');
      if (res.success) setTradeHistory(res.data);
    } catch (err) {
      console.error('Error fetching trade history:', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchBalances(),
      fetchOpenOrders(),
      fetchOrderHistory(),
      fetchTradeHistory(),
    ]);
  }, [fetchBalances, fetchOpenOrders, fetchOrderHistory, fetchTradeHistory]);

  useEffect(() => {
    void fetchAllData();
    const interval = setInterval(() => {
      void fetchAllData();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    if (tradingPairs.length && !tradingPairs.some((p) => p.symbol === selectedSymbol)) {
      setSelectedSymbol(tradingPairs[0].symbol);
    }
  }, [tradingPairs, selectedSymbol]);

  const lastCandle = klines?.[klines.length - 1];
  const candleChange =
    lastCandle && lastCandle.open
      ? ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
      : 0;

  const sellOrders = [...(orderBook?.asks ?? [])].reverse().slice(0, 15);
  const buyOrders = (orderBook?.bids ?? []).slice(0, 15);
  const currentPrice = orderBook?.currentPrice ?? ticker?.price ?? 0;
  const changeAbs = ticker ? (ticker.price * ticker.change24h) / 100 : 0;

  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [orderType, setOrderType] = useState<OrderType>('Limit');
  const [chartTab, setChartTab] = useState<ChartTab>('Chart');
  const [chartView, setChartView] = useState<ChartView>('Original');
  const [bottomTab, setBottomTab] = useState<BottomTab>('Open Orders');
  const [tradesTab, setTradesTab] = useState<TradesTab>('Market Trades');

  // Form state
  const [priceInput, setPriceInput] = useState('0.00');
  const [stopPrice, setStopPrice] = useState('0.00');
  const [amountInput, setAmountInput] = useState('0.00');
  const [totalInput, setTotalInput] = useState('0.00');

  // Sync price input with ticker
  useEffect(() => {
    const initKey = `${selectedSymbol}-${orderType}`;
    if (currentPrice && orderType === 'Limit' && lastPriceInitRef.current !== initKey) {
      setPriceInput(formatOrderPrice(currentPrice));
      lastPriceInitRef.current = initKey;
    }
  }, [currentPrice, orderType, selectedSymbol]);

  // Calculate Available Balance
  const activeBalanceAsset = side === 'Buy' ? 'USDT' : selectedSymbol;
  const currentBalanceObj = balances.find((b) => b.currency === activeBalanceAsset);
  const availableBalanceStr = currentBalanceObj ? currentBalanceObj.available : '0.0000';
  const availableBalanceNum = parseFloat(availableBalanceStr) || 0;

  // Calculate total balance across all assets in USDT
  const totalBalanceUSDT = balances.reduce((sum, b) => {
    const val = parseFloat(b.balance) || 0;
    if (b.currency === 'USDT' || b.currency === 'USDC') return sum + val;
    const tickerObj = markets?.find((m) => m.symbol === b.currency);
    const priceVal = tickerObj?.price ?? 0;
    return sum + val * priceVal;
  }, 0);

  // Percent Helper
  const handlePercentClick = (pct: number) => {
    if (side === 'Buy') {
      const currentPriceVal = orderType === 'Limit' ? parseFloat(priceInput) : (currentPrice || 0);
      if (currentPriceVal > 0) {
        const amtVal = (availableBalanceNum * pct) / currentPriceVal;
        setAmountInput(amtVal.toFixed(5));
      }
    } else {
      const amtVal = availableBalanceNum * pct;
      setAmountInput(amtVal.toFixed(5));
    }
  };

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amtNum = parseFloat(amountInput);
    if (isNaN(amtNum) || amtNum <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (orderType === 'Limit') {
      const priceNum = parseFloat(priceInput);
      if (isNaN(priceNum) || priceNum <= 0) {
        setFormError('Please enter a valid price greater than 0');
        return;
      }
    }

    if (orderType === 'Stop') {
      const stopPriceNum = parseFloat(stopPrice);
      const priceNum = parseFloat(priceInput);
      if (isNaN(stopPriceNum) || stopPriceNum <= 0) {
        setFormError('Please enter a valid stop price greater than 0');
        return;
      }
      if (isNaN(priceNum) || priceNum <= 0) {
        setFormError('Please enter a valid limit price greater than 0');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        symbol: selectedSymbol,
        type: orderType.toUpperCase(),
        side: side.toUpperCase(),
        amount: amountInput,
      };

      if (orderType === 'Limit' || orderType === 'Stop') {
        payload.price = priceInput;
      }
      if (orderType === 'Stop') {
        payload.stopPrice = stopPrice;
      }

      const res = await api.post<{ success: boolean; data: any }>('/api/v1/trading/orders', payload);
      if (res.success) {
        setFormSuccess(`Order placed successfully: ${side} ${amountInput} ${selectedSymbol}`);
        setAmountInput('0.00');
        void fetchAllData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Order
  const handleCancelOrder = async (orderId: string) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await api.delete<{ success: boolean }>(`/api/v1/trading/orders/${orderId}`);
      if (res.success) {
        setFormSuccess('Order canceled successfully');
        void fetchAllData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to cancel order');
    }
  };

  // Clear errors when switching key fields
  useEffect(() => {
    setFormError(null);
    setFormSuccess(null);
  }, [selectedSymbol, side, orderType]);

  // Sync Total field
  useEffect(() => {
    const p = orderType === 'Market' ? currentPrice : parseFloat(priceInput);
    const a = parseFloat(amountInput);
    if (!isNaN(p) && !isNaN(a)) {
      setTotalInput((p * a).toFixed(2));
    } else {
      setTotalInput('0.00');
    }
  }, [priceInput, amountInput, orderType, currentPrice]);

  // Derived Margin calculations for simulated leverage
  const entryPrice = orderType === 'Market' ? currentPrice : (parseFloat(priceInput) || currentPrice || 0);
  const mmr = 0.005; // 0.5% Maintenance Margin Ratio
  let liqPrice = 0;
  if (entryPrice > 0) {
    if (side === 'Buy') {
      liqPrice = entryPrice * (1 - 1 / leverage + mmr);
      if (liqPrice < 0) liqPrice = 0;
    } else {
      liqPrice = entryPrice * (1 + 1 / leverage - mmr);
    }
  }
  const formattedLiqPrice = liqPrice > 0 ? formatOrderPrice(liqPrice) : '—';
  const collateralRequired = parseFloat(totalInput) > 0 ? (parseFloat(totalInput) / leverage).toFixed(2) : '0.00';
  const marginRatio = leverage > 1 ? `${((1 / leverage) * 100).toFixed(1)}%` : '100%';

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b border-accent-teal/20">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Left: Pair Info */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 min-w-0">
              <Star size={16} className="text-accent-teal shrink-0" />
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: currentPair?.color ?? '#F7931A' }}
              >
                <span className="text-white font-bold text-xs">
                  {currentPair?.iconLetter ?? '?'}
                </span>
              </div>
              <div className="min-w-0 xl:hidden">
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-transparent text-white font-bold text-lg leading-tight focus:outline-none max-w-[140px]"
                >
                  {tradingPairs.map((p) => (
                    <option key={p.symbol} value={p.symbol} className="bg-primary">
                      {p.symbol}/USDT
                    </option>
                  ))}
                </select>
                <p className="text-text-muted text-xs truncate">
                  {currentPair?.name ?? '—'} Price ≈
                </p>
              </div>
              <div className="min-w-0 hidden xl:block">
                <p className="text-white font-bold text-lg leading-tight">
                  {selectedSymbol}/USDT
                </p>
                <p className="text-text-muted text-xs truncate">
                  {currentPair?.name ?? '—'} Price ≈
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-teal font-bold text-2xl">
                {formatOrderPrice(currentPrice)}
              </span>
              <span className="text-text-muted text-sm">${formatOrderPrice(currentPrice)}</span>
            </div>
          </div>

          {/* Center: Market Stats */}
          <div className="hidden xl:flex items-center gap-8 text-xs">
            <div>
              <span className="text-text-muted">24h Chg</span>
              <p className={`font-semibold ${(ticker?.change24h ?? 0) >= 0 ? 'text-accent-teal' : 'text-red-400'}`}>
                {ticker
                  ? `${changeAbs >= 0 ? '+' : ''}${formatOrderPrice(Math.abs(changeAbs))} ${formatPercent(ticker.change24h)}`
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">24h High</span>
              <p className="text-white font-semibold">
                {ticker ? formatOrderPrice(ticker.high24h) : '—'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">24h Low</span>
              <p className="text-white font-semibold">
                {ticker ? formatOrderPrice(ticker.low24h) : '—'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">24h Vol({selectedSymbol})</span>
              <p className="text-white font-semibold">
                {ticker && ticker.price > 0
                  ? (ticker.volume24h / ticker.price).toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-text-muted">24h Vol(USDT)</span>
              <p className="text-white font-semibold">
                {ticker
                  ? ticker.volume24h.toLocaleString('en-US', { maximumFractionDigits: 2 })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Right: Balance */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-text-muted text-xs">Total Balance</span>
              <p className="text-accent-teal font-bold text-lg">
                ${totalBalanceUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Link to="/dashboard" className="w-9 h-9 rounded-full gradient-btn flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity" title="Go to Dashboard">
              <span className="text-white font-bold text-sm">U</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Pair list */}
        <PairSelector
          className="w-[200px] shrink-0 hidden xl:flex border-0 border-r border-accent-teal/20 rounded-none"
          pairs={tradingPairs}
          selectedSymbol={selectedSymbol}
          onSelect={setSelectedSymbol}
          searchQuery={pairSearch}
          onSearchChange={setPairSearch}
          loading={marketsLoading}
        />

        {/* Left: Order Book */}
        <div className="w-[260px] border-r border-accent-teal/20 flex flex-col shrink-0 hidden lg:flex">
          {/* Order Book Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-accent-teal/20">
            <span className="text-white font-semibold text-sm">Order Book</span>
            <div className="flex items-center gap-2">
              <button className="w-5 h-5 bg-red-400/20 rounded-sm" />
              <button className="w-5 h-5 bg-accent-teal/20 rounded-sm" />
              <button className="text-text-muted">···</button>
            </div>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-3 px-4 py-2 text-[10px] text-text-muted border-b border-card-border">
            <span>Price (USDT)</span>
            <span className="text-right">Amount ({selectedSymbol})</span>
            <span className="text-right">Total</span>
          </div>

          {/* Sell Orders (Red) */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4">
              {sellOrders.map((row, i) => (
                <div key={i} className="grid grid-cols-3 py-[3px] text-[11px] hover:bg-white/5 cursor-pointer">
                  <span className="text-red-400">{formatOrderPrice(row.price)}</span>
                  <span className="text-right text-text-light">{row.amount.toFixed(5)}</span>
                  <span className="text-right text-text-muted">{formatCompactVolume(row.total)}</span>
                </div>
              ))}
            </div>

            {/* Current Price */}
            <div className="px-4 py-3 border-y border-card-border">
              <span className="text-accent-teal font-bold text-xl">{formatOrderPrice(currentPrice)}</span>
              <span className="text-text-muted text-xs ml-2">≈ ${formatOrderPrice(currentPrice)}</span>
            </div>

            {/* Buy Orders (Green) */}
            <div className="px-4">
              {buyOrders.map((row, i) => (
                <div key={i} className="grid grid-cols-3 py-[3px] text-[11px] hover:bg-white/5 cursor-pointer">
                  <span className="text-accent-teal">{formatOrderPrice(row.price)}</span>
                  <span className="text-right text-text-light">{row.amount.toFixed(5)}</span>
                  <span className="text-right text-text-muted">{formatCompactVolume(row.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Chart + Bottom Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chart Tabs */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-accent-teal/20">
            <div className="flex items-center gap-1">
              {(['Chart', 'Info', 'Trading Data'] as ChartTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    chartTab === tab
                      ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAiModal}
                className="flex items-center gap-1.5 text-text-muted hover:text-white text-xs bg-accent-teal/10 px-2.5 py-1 rounded-lg border border-accent-teal/20 transition-all hover:bg-accent-teal/20"
              >
                <Sparkles size={14} className="text-accent-teal" />
                AI Analysis
              </button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="text-text-muted hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors">
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Time frame + Chart mode */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-card-border">
            <div className="flex items-center gap-4">
              <span className="text-text-muted text-xs">Time</span>
              {(['1s', '15m', '1H', '4H', '1D', '1W'] as TimeFrame[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    timeframe === tf
                      ? 'bg-accent-teal/20 text-accent-teal'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(['Original', 'Trading View', 'Depth'] as ChartView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    chartView === v
                      ? 'bg-card-bg border border-accent-teal/30 text-white'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 min-h-[300px] relative px-4 py-3">
            {lastCandle && chartTab === 'Chart' && (
              <div className="text-[10px] text-text-muted mb-2 flex flex-wrap gap-x-3 gap-y-1">
                <span>{new Date(lastCandle.time).toLocaleString()}</span>
                <span>Open: {formatOrderPrice(lastCandle.open)}</span>
                <span>
                  High: <span className="text-accent-teal">{formatOrderPrice(lastCandle.high)}</span>
                </span>
                <span>Low: {formatOrderPrice(lastCandle.low)}</span>
                <span>Close: {formatOrderPrice(lastCandle.close)}</span>
                <span className={candleChange >= 0 ? 'text-accent-teal' : 'text-red-400'}>
                  CHANGE: {formatPercent(candleChange)}
                </span>
              </div>
            )}

            {chartTab === 'Chart' ? (
              chartView === 'Trading View' ? (
                <div className="w-full h-[280px] rounded-xl overflow-hidden border border-card-border bg-primary/20 mb-2">
                  <iframe
                    src={`https://s.tradingview.com/widgetembed/?symbol=BYBIT%3A${selectedSymbol}USDT&interval=${
                      timeframe === '15m' ? '15' : timeframe === '1H' ? '60' : timeframe === '4H' ? '240' : timeframe === '1D' ? 'D' : timeframe === '1W' ? 'W' : '1'
                    }&theme=dark&style=1&timezone=Etc%2FUTC&locale=en`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              ) : chartView === 'Depth' ? (
                <DepthChart
                  bids={orderBook?.bids ?? []}
                  asks={orderBook?.asks ?? []}
                  height={280}
                  className="w-full mb-2"
                />
              ) : (
                <PriceChart
                  klines={klines ?? []}
                  loading={klinesLoading}
                  height={280}
                  livePrice={currentPrice || undefined}
                  showVolume
                  className="w-full mb-2"
                />
              )
            ) : chartTab === 'Info' ? (
              <div className="h-[280px] overflow-y-auto rounded-xl border border-card-border bg-primary/20 p-4 mb-2">
                <h3 className="text-white font-bold mb-4">{currentPair?.name ?? selectedSymbol} — Market Info</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Current Price', value: ticker ? formatPrice(ticker.price) : '—', color: (ticker?.change24h ?? 0) >= 0 ? 'text-accent-teal' : 'text-red-400' },
                    { label: '24h Change', value: ticker ? formatPercent(ticker.change24h) : '—', color: (ticker?.change24h ?? 0) >= 0 ? 'text-accent-teal' : 'text-red-400' },
                    { label: '24h High', value: ticker ? formatOrderPrice(ticker.high24h) : '—', color: 'text-accent-teal' },
                    { label: '24h Low', value: ticker ? formatOrderPrice(ticker.low24h) : '—', color: 'text-red-400' },
                    { label: '24h Volume (USDT)', value: ticker ? formatCompactVolume(ticker.volume24h) : '—', color: 'text-white' },
                    { label: `24h Volume (${selectedSymbol})`, value: ticker && ticker.price > 0 ? formatCompactVolume(ticker.volume24h / ticker.price) : '—', color: 'text-white' },
                    { label: 'Market Cap', value: ticker ? formatCompactVolume(ticker.marketCap) : '—', color: 'text-white' },
                    { label: 'Rank', value: ticker ? `#${ticker.rank}` : '—', color: 'text-text-light' },
                  ].map((item, i) => (
                    <div key={i} className="bg-card-bg rounded-xl p-3 border border-card-border">
                      <p className="text-text-muted text-xs mb-1">{item.label}</p>
                      <p className={`font-bold text-base ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Trading Data tab
              <div className="h-[280px] overflow-y-auto rounded-xl border border-card-border bg-primary/20 p-4 mb-2">
                <h3 className="text-white font-bold mb-4">Order Book Snapshot</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-muted text-xs mb-2">Top Bids</p>
                    <div className="space-y-1.5">
                      {(orderBook?.bids ?? []).slice(0, 8).map((e, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-accent-teal">{formatOrderPrice(e.price)}</span>
                          <span className="text-text-light">{e.amount.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs mb-2">Top Asks</p>
                    <div className="space-y-1.5">
                      {(orderBook?.asks ?? []).slice(0, 8).map((e, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-red-400">{formatOrderPrice(e.price)}</span>
                          <span className="text-text-light">{e.amount.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {ticker && (
              <div className="mt-1 text-xs text-text-muted">
                24h Vol(USDT):{' '}
                {ticker.volume24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>

          {/* Bottom Panel: Tabs */}
          <div className="border-t border-accent-teal/20 flex-1 flex flex-col min-h-[250px]">
            <div className="flex items-center border-b border-card-border">
              {(['Open Orders', 'Order History', 'Trade History', 'Funds'] as BottomTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  className={`px-6 py-3 text-xs font-medium border-b-2 transition-colors ${
                    bottomTab === tab
                      ? 'text-white border-accent-teal'
                      : 'text-text-muted border-transparent hover:text-white'
                  }`}
                >
                  {tab === 'Open Orders' ? `Open Orders (${openOrders.length})` : tab}
                </button>
              ))}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto max-h-[350px]">
              {bottomTab === 'Open Orders' && (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-text-muted border-b border-card-border">
                      <th className="py-3 px-4 font-medium">Date/Time</th>
                      <th className="py-3 px-4 font-medium">Pair</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Side</th>
                      <th className="py-3 px-4 font-medium text-right">Price</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium text-right">Filled</th>
                      <th className="py-3 px-4 font-medium text-right">Remaining</th>
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-text-muted">
                          No open orders
                        </td>
                      </tr>
                    ) : (
                      openOrders.map((order) => (
                        <tr key={order.id} className="border-b border-card-border hover:bg-white/5">
                          <td className="py-3 px-4 text-text-light">{new Date(order.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-white font-semibold">{order.symbol}/USDT</td>
                          <td className="py-3 px-4 text-text-light">{order.type}</td>
                          <td className={`py-3 px-4 font-medium ${order.side === 'BUY' ? 'text-accent-teal' : 'text-red-400'}`}>
                            {order.side}
                          </td>
                          <td className="py-3 px-4 text-right text-text-light">
                            {order.price ? parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'Market'}
                          </td>
                          <td className="py-3 px-4 text-right text-text-light">{parseFloat(order.amount).toFixed(5)}</td>
                          <td className="py-3 px-4 text-right text-text-light">{parseFloat(order.filledAmount).toFixed(5)}</td>
                          <td className="py-3 px-4 text-right text-text-light">{parseFloat(order.remainingAmount).toFixed(5)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {bottomTab === 'Order History' && (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-text-muted border-b border-card-border">
                      <th className="py-3 px-4 font-medium">Date/Time</th>
                      <th className="py-3 px-4 font-medium">Pair</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium">Side</th>
                      <th className="py-3 px-4 font-medium text-right">Price</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium text-right">Filled</th>
                      <th className="py-3 px-4 font-medium text-right">Remaining</th>
                      <th className="py-3 px-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderHistory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-text-muted">
                          No order history
                        </td>
                      </tr>
                    ) : (
                      orderHistory.map((order) => (
                        <tr key={order.id} className="border-b border-card-border hover:bg-white/5">
                          <td className="py-3 px-4 text-text-light">{new Date(order.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-white font-semibold">{order.symbol}/USDT</td>
                          <td className="py-3 px-4 text-text-light">{order.type}</td>
                          <td className={`py-3 px-4 font-medium ${order.side === 'BUY' ? 'text-accent-teal' : 'text-red-400'}`}>
                            {order.side}
                          </td>
                          <td className="py-3 px-4 text-right text-text-light">
                            {order.price ? parseFloat(order.price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'Market'}
                          </td>
                          <td className="py-3 px-4 text-right text-text-light">{parseFloat(order.amount).toFixed(5)}</td>
                          <td className="py-3 px-4 text-right text-text-light">{parseFloat(order.filledAmount).toFixed(5)}</td>
                          <td className="py-3 px-4 text-right text-text-light">{parseFloat(order.remainingAmount).toFixed(5)}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            <span className={order.status === 'FILLED' ? 'text-accent-teal' : order.status === 'CANCELED' ? 'text-text-muted' : 'text-white'}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {bottomTab === 'Trade History' && (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-text-muted border-b border-card-border">
                      <th className="py-3 px-4 font-medium">Date/Time</th>
                      <th className="py-3 px-4 font-medium">Pair</th>
                      <th className="py-3 px-4 font-medium">Side</th>
                      <th className="py-3 px-4 font-medium text-right">Price</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium text-right">Total (USDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-text-muted">
                          No trade history
                        </td>
                      </tr>
                    ) : (
                      tradeHistory.map((trade) => {
                        const price = parseFloat(trade.price) || 0;
                        const amount = parseFloat(trade.amount) || 0;
                        return (
                          <tr key={trade.id} className="border-b border-card-border hover:bg-white/5">
                            <td className="py-3 px-4 text-text-light">{new Date(trade.createdAt).toLocaleString()}</td>
                            <td className="py-3 px-4 text-white font-semibold">{trade.symbol}/USDT</td>
                            <td className={`py-3 px-4 font-medium ${trade.side === 'BUY' ? 'text-accent-teal' : 'text-red-400'}`}>
                              {trade.side}
                            </td>
                            <td className="py-3 px-4 text-right text-text-light">
                              {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-text-light">{amount.toFixed(5)}</td>
                            <td className="py-3 px-4 text-right text-text-light">
                              {(price * amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {bottomTab === 'Funds' && (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-text-muted border-b border-card-border">
                      <th className="py-3 px-4 font-medium">Asset</th>
                      <th className="py-3 px-4 font-medium text-right">Total Balance</th>
                      <th className="py-3 px-4 font-medium text-right">Available</th>
                      <th className="py-3 px-4 font-medium text-right">Locked</th>
                      <th className="py-3 px-4 font-medium text-right">Est. Value (USDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-muted">
                          No assets found
                        </td>
                      </tr>
                    ) : (
                      balances.map((bal) => {
                        const total = parseFloat(bal.balance) || 0;
                        const available = parseFloat(bal.available) || 0;
                        const locked = parseFloat(bal.locked) || 0;
                        let estVal = total;
                        if (bal.currency !== 'USDT' && bal.currency !== 'USDC') {
                          const tickerObj = tradingPairs?.find((m) => m.symbol === bal.currency);
                          const priceVal = tickerObj?.price ?? 0;
                          estVal = total * priceVal;
                        }
                        return (
                          <tr key={bal.currency} className="border-b border-card-border hover:bg-white/5">
                            <td className="py-3 px-4 text-white font-semibold">{bal.currency}</td>
                            <td className="py-3 px-4 text-right text-text-light">{total.toFixed(5)}</td>
                            <td className="py-3 px-4 text-right text-text-light">{available.toFixed(5)}</td>
                            <td className="py-3 px-4 text-right text-text-light">{locked.toFixed(5)}</td>
                            <td className="py-3 px-4 text-right text-accent-teal font-medium">
                              ${estVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right: Order Form + Trades */}
        <div className="w-[300px] border-l border-accent-teal/20 flex flex-col shrink-0 hidden lg:flex">
          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 border-b border-accent-teal/20">
            <button
              onClick={() => setSide('Buy')}
              className={`py-3 text-sm font-semibold transition-colors ${
                side === 'Buy'
                  ? 'text-accent-teal border-b-2 border-accent-teal bg-accent-teal/5'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('Sell')}
              className={`py-3 text-sm font-semibold transition-colors ${
                side === 'Sell'
                  ? 'text-red-400 border-b-2 border-red-400 bg-red-400/5'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="flex items-center gap-1 p-3 border-b border-card-border">
            {(['Limit', 'Market', 'Stop'] as OrderType[]).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  orderType === t
                    ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30'
                    : 'text-text-muted hover:text-white border border-transparent'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Order Form */}
          <form onSubmit={handleSubmitOrder} className="px-4 py-4 border-b border-accent-teal/20 space-y-3">
            {/* Available */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-xs">Available</span>
              <span className="text-white text-sm font-medium">
                {availableBalanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {activeBalanceAsset}
              </span>
            </div>

            {formError && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-2 bg-accent-teal/10 border border-accent-teal/20 rounded-lg text-accent-teal text-xs">
                {formSuccess}
              </div>
            )}

            {/* Stop Price (only for Stop orders) */}
            {orderType === 'Stop' && (
              <div>
                <label className="text-text-muted text-xs mb-1 block">Stop Price (USDT)</label>
                <input
                  type="text"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                />
              </div>
            )}

            {/* Price (for Limit and Stop) */}
            {orderType !== 'Market' && (
              <div>
                <label className="text-text-muted text-xs mb-1 block">Price (USDT)</label>
                <input
                  type="text"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-text-muted text-xs mb-1 block">Amount ({selectedSymbol})</label>
              <input
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
              />
            </div>

            {/* Quick Percentages */}
            <div className="grid grid-cols-4 gap-1.5">
              {['25%', '50%', '75%', '100%'].map((pct) => {
                const val = parseFloat(pct) / 100;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentClick(val)}
                    className="py-1.5 rounded-lg bg-primary border border-card-border text-text-muted text-xs font-medium hover:text-white hover:border-accent-teal/30 transition-colors"
                  >
                    {pct}
                  </button>
                );
              })}
            </div>

            {/* Total */}
            <div>
              <label className="text-text-muted text-xs mb-1 block">Total (USDT)</label>
              <input
                type="text"
                value={totalInput}
                disabled
                className="w-full px-3 py-2 bg-primary border border-card-border text-text-muted text-xs focus:outline-none opacity-80"
              />
            </div>

            {/* Simulated Leverage Selector */}
            <div className="space-y-1.5 pt-1 border-t border-card-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Leverage</span>
                <span className="text-accent-teal font-bold">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1 bg-card-border rounded-lg appearance-none cursor-pointer accent-accent-teal"
              />
              <div className="grid grid-cols-6 gap-1">
                {[1, 5, 10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLeverage(val)}
                    className={`py-0.5 text-[10px] font-semibold border rounded transition-colors ${
                      leverage === val
                        ? 'border-accent-teal/50 bg-accent-teal/10 text-accent-teal'
                        : 'border-card-border text-text-muted hover:text-white'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Margin Information */}
            <div className="bg-primary/40 rounded-lg border border-accent-teal/10 p-2.5 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Margin Required</span>
                <span className="text-white font-medium">{collateralRequired} USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted flex items-center gap-1">
                  Est. Liq Price
                  <span title="Estimated price where position is liquidated" className="cursor-help">
                    <Info size={11} className="text-text-muted" />
                  </span>
                </span>
                <span className={`font-semibold ${side === 'Buy' ? 'text-red-400' : 'text-accent-teal'}`}>
                  {formattedLiqPrice} USDT
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Initial Margin %</span>
                <span className="text-white font-medium">{marginRatio}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Risk Level</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    leverage >= 50
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : leverage >= 20
                      ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                      : 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20'
                  }`}
                >
                  {leverage >= 50 ? 'Extremely High' : leverage >= 20 ? 'High' : leverage >= 10 ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-lg text-white font-semibold text-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'Buy' ? 'gradient-btn' : 'bg-red-500'
              }`}
            >
              {isSubmitting ? 'Processing...' : `${side} ${selectedSymbol} ${leverage}x`}
            </button>

            <p className="text-text-muted text-[10px] text-center">
              Trading Fee: 0.1% • Min Order: 10 USDT
            </p>
          </form>

          {/* Market Trades / My Trades */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center border-b border-card-border">
              {(['Market Trades', 'My Trades'] as TradesTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTradesTab(tab)}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
                    tradesTab === tab
                      ? 'text-white border-accent-teal'
                      : 'text-text-muted border-transparent hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Trades Table Header */}
            <div className="grid grid-cols-3 px-4 py-2 text-[10px] text-text-muted border-b border-card-border">
              <span>Price (USDT)</span>
              <span className="text-right">Amount ({selectedSymbol})</span>
              <span className="text-right">Time</span>
            </div>

            {/* Trades List */}
            <div className="flex-1 overflow-y-auto">
              {tradesTab === 'Market Trades' ? (
                (recentTrades ?? []).map((trade, i) => (
                  <div key={i} className="grid grid-cols-3 px-4 py-[4px] text-[11px] hover:bg-white/5">
                    <span className={trade.side === 'buy' ? 'text-accent-teal' : 'text-red-400'}>
                      {formatOrderPrice(trade.price)}
                    </span>
                    <span className="text-right text-text-light">{trade.amount.toFixed(5)}</span>
                    <span className="text-right text-text-muted">{trade.time}</span>
                  </div>
                ))
              ) : (
                <>
                  {tradeHistory.filter((t) => t.symbol === selectedSymbol).length === 0 ? (
                    <div className="py-8 text-center text-text-muted text-xs">
                      No trade history
                    </div>
                  ) : (
                    tradeHistory
                      .filter((t) => t.symbol === selectedSymbol)
                      .map((trade) => (
                        <div key={trade.id} className="grid grid-cols-3 px-4 py-[4px] text-[11px] hover:bg-white/5">
                          <span className={trade.side === 'BUY' ? 'text-accent-teal' : 'text-red-400'}>
                            {formatOrderPrice(parseFloat(trade.price))}
                          </span>
                          <span className="text-right text-text-light">{parseFloat(trade.amount).toFixed(5)}</span>
                          <span className="text-right text-text-muted">
                            {new Date(trade.createdAt).toLocaleTimeString(undefined, { hour12: false })}
                          </span>
                        </div>
                      ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0b1217]/95 border border-accent-teal/30 p-6 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(20,184,166,0.15)] relative text-white">
            <button
              onClick={() => setIsAiModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-accent-teal animate-pulse" size={20} />
              <h3 className="font-bold text-lg">AI Technical Analysis ({selectedSymbol}/USDT)</h3>
            </div>

            {aiLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-16 h-16">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-accent-teal/20 border-t-accent-teal animate-spin" />
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-accent-teal/80 shadow-[0_0_8px_#14b8a6] animate-bounce" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-accent-teal animate-pulse">Running Market Intelligence Scan...</p>
                  <p className="text-xs text-text-muted mt-1">Analyzing RSI, MACD, Order Book & 24h Volume Data</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tech Signals Badges */}
                <div className="grid grid-cols-3 gap-2 bg-[#121c24] p-3 rounded-xl border border-card-border">
                  <div className="text-center">
                    <span className="text-[10px] text-text-muted block">RSI (14)</span>
                    <span className="text-xs font-semibold text-accent-teal">54.2 (Neutral)</span>
                  </div>
                  <div className="text-center border-x border-card-border">
                    <span className="text-[10px] text-text-muted block">MACD (12, 26)</span>
                    <span className="text-xs font-semibold text-accent-teal">Bullish Cross</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-text-muted block">AI Recommendation</span>
                    <span className="text-xs font-bold text-accent-teal px-1.5 py-0.5 rounded bg-accent-teal/10">BUY</span>
                  </div>
                </div>

                {/* Main AI Report */}
                <div className="text-sm text-text-light bg-[#121c24]/50 p-4 rounded-xl border border-card-border/50 max-h-[280px] overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono text-xs">
                  {aiReport}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-card-border">
                  <button
                    onClick={() => void handleOpenAiModal()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent-teal/10 text-accent-teal border border-accent-teal/20 hover:bg-accent-teal/20 transition-colors"
                  >
                    Rescan Market
                  </button>
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 transition-colors text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0b1217]/95 border border-card-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative text-white">
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Settings className="text-accent-teal" size={20} />
              <h3 className="font-bold text-lg">PRO Trading Preferences</h3>
            </div>

            <div className="space-y-5">
              {/* Confirm Orders Option */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold block">Confirm Orders</label>
                  <span className="text-[11px] text-text-muted">Prompt confirmation before submitting new trades</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmOrders(!confirmOrders)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    confirmOrders ? 'bg-accent-teal' : 'bg-card-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                      confirmOrders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Layout Size Option */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold block">Compact Layout Grid</label>
                  <span className="text-[11px] text-text-muted">Use tighter typography and smaller spacings</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLayoutCompact(!layoutCompact)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    layoutCompact ? 'bg-accent-teal' : 'bg-card-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                      layoutCompact ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Chart Theme Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold block">Terminal Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dark', label: 'Dark Classic' },
                    { id: 'light', label: 'Light Mode' },
                    { id: 'monochrome', label: 'Monochrome' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setChartTheme(theme.id)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        chartTheme === theme.id
                          ? 'border-accent-teal bg-accent-teal/5 text-accent-teal'
                          : 'border-card-border text-text-muted hover:text-white'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leverage Cap Preference */}
              <div className="space-y-2 pt-2 border-t border-card-border/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Simulated Leverage Value</span>
                  <span className="text-accent-teal font-bold">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full h-1 bg-card-border rounded-lg appearance-none cursor-pointer accent-accent-teal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-card-border">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-accent-teal hover:bg-accent-teal/90 text-primary transition-colors font-bold"
                >
                  Save & Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
