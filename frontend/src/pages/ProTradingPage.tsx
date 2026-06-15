import { useState, useEffect, useCallback } from 'react';
import { Star, BarChart3, Settings, Sparkles } from 'lucide-react';
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
    if (currentPrice && orderType === 'Limit') {
      setPriceInput(formatOrderPrice(currentPrice));
    }
  }, [currentPrice, orderType]);

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
            <div className="w-9 h-9 rounded-full gradient-btn flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
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
              <button className="flex items-center gap-1.5 text-text-muted hover:text-white text-xs">
                <Sparkles size={14} />
                AI Analysis
              </button>
              <button className="text-text-muted hover:text-white">
                <BarChart3 size={16} />
              </button>
              <button className="text-text-muted hover:text-white">
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
              chartView === 'Depth' ? (
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
                className="w-full px-3 py-2.5 rounded-lg bg-primary border border-card-border text-text-muted text-sm focus:outline-none opacity-80"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                side === 'Buy' ? 'gradient-btn' : 'bg-red-500'
              }`}
            >
              {isSubmitting ? 'Processing...' : `${side} ${selectedSymbol}`}
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
    </div>
  );
}
