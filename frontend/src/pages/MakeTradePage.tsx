import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface TradeAsset {
  symbol: string;
  price: string;
  priceNum: number;
  color: string;
}

const tradeAssets: TradeAsset[] = [
  { symbol: 'BTC', price: '$67,842.50', priceNum: 67842.50, color: '#F7931A' },
  { symbol: 'ETH', price: '$3,451.20', priceNum: 3451.20, color: '#627EEA' },
  { symbol: 'SOL', price: '$142.87', priceNum: 142.87, color: '#9945FF' },
  { symbol: 'USDT', price: '$1.00', priceNum: 1.00, color: '#26A17B' },
];

interface PortfolioAsset {
  symbol: string;
  amount: string;
  value: string;
  change: string;
  changeValue: number;
}

const portfolioAssets: PortfolioAsset[] = [
  { symbol: 'BTC', amount: '0.1234', value: '$8,374.12', change: '+2.34%', changeValue: 2.34 },
  { symbol: 'ETH', amount: '2.5678', value: '$8,864.73', change: '+1.82%', changeValue: 1.82 },
  { symbol: 'SOL', amount: '45.23', value: '$6,463.11', change: '-1.24%', changeValue: -1.24 },
  { symbol: 'USDT', amount: '23,702.00', value: '$23,702.00', change: '0.00%', changeValue: 0 },
];

interface RecentTrade {
  pair: string;
  detail: string;
  type: 'Buy' | 'Sell';
  time: string;
}

const recentTrades: RecentTrade[] = [
  { pair: 'BTC/USDT', detail: '0.0123 @ $67,845.50', type: 'Buy', time: '2 min ago' },
  { pair: 'ETH/USDT', detail: '0.5 @ $3,452.10', type: 'Sell', time: '15 min ago' },
  { pair: 'SOL/USDT', detail: '10 @ $142.90', type: 'Buy', time: '1 hour ago' },
];

type TradeAction = 'Buy' | 'Sell';
type OrderType = 'Market' | 'Limit';

export default function MakeTradePage() {
  const [selectedAsset, setSelectedAsset] = useState(tradeAssets[0]);
  const [tradeAction, setTradeAction] = useState<TradeAction>('Buy');
  const [orderType, setOrderType] = useState<OrderType>('Market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('67,842.50');

  const numericAmount = parseFloat(amount) || 0;
  const available = tradeAction === 'Buy' ? '23,702.00 USDT' : `0.1234 ${selectedAsset.symbol}`;
  const totalValue = numericAmount * selectedAsset.priceNum;

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-20">
          {/* Back Link */}
          <Link
            to="/demo-trading"
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Demo Trading</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold">
              Make a <span className="gradient-text">Trade</span>
            </h1>
            <p className="text-text-muted mt-2">
              Practice trading with your demo account balance
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Trading Panel */}
            <div className="flex-1 space-y-6">
              {/* Select Asset */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h2 className="text-white font-bold text-lg mb-4">Select Asset</h2>
                <div className="grid grid-cols-4 gap-3">
                  {tradeAssets.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`flex flex-col items-center p-4 rounded-xl border transition-colors ${
                        selectedAsset.symbol === asset.symbol
                          ? 'bg-accent-teal/10 border-accent-teal'
                          : 'bg-card-bg border-card-border hover:border-accent-teal/40'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs mb-2"
                        style={{ backgroundColor: asset.color }}
                      >
                        {asset.symbol}
                      </div>
                      <span className="text-white text-sm font-semibold">{asset.symbol}</span>
                      <span className="text-text-muted text-xs">{asset.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trade Panel */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold text-lg">Trade {selectedAsset.symbol}</h2>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp size={14} className="text-red-400" />
                    <span className="text-red-400">-2.34%</span>
                  </div>
                </div>

                {/* Current Price */}
                <div className="bg-card-bg border border-card-border rounded-xl p-4 mb-5">
                  <div className="text-text-muted text-xs mb-1">Current Price</div>
                  <div className="text-white text-3xl font-bold">{selectedAsset.price}</div>
                </div>

                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setTradeAction('Buy')}
                    className={`py-3 rounded-xl font-medium text-sm transition-colors ${
                      tradeAction === 'Buy'
                        ? 'gradient-btn text-white'
                        : 'bg-card-bg border border-card-border text-text-light'
                    }`}
                  >
                    Buy {selectedAsset.symbol}
                  </button>
                  <button
                    onClick={() => setTradeAction('Sell')}
                    className={`py-3 rounded-xl font-medium text-sm transition-colors ${
                      tradeAction === 'Sell'
                        ? 'bg-red-500 text-white'
                        : 'bg-card-bg border border-card-border text-text-light'
                    }`}
                  >
                    Sell {selectedAsset.symbol}
                  </button>
                </div>

                {/* Order Type Toggle */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setOrderType('Market')}
                    className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      orderType === 'Market'
                        ? 'gradient-btn text-white'
                        : 'bg-card-bg border border-card-border text-text-light'
                    }`}
                  >
                    Market Order
                  </button>
                  <button
                    onClick={() => setOrderType('Limit')}
                    className={`py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      orderType === 'Limit'
                        ? 'gradient-btn text-white'
                        : 'bg-card-bg border border-card-border text-text-light'
                    }`}
                  >
                    Limit Order
                  </button>
                </div>

                {/* Available */}
                <div className="flex justify-between items-center bg-card-bg border border-card-border rounded-xl px-4 py-3 mb-4">
                  <span className="text-text-muted text-sm">Available</span>
                  <span className="text-white text-sm font-medium">{available}</span>
                </div>

                {/* Limit Price (only for Limit orders) */}
                {orderType === 'Limit' && (
                  <div className="mb-4">
                    <label className="text-text-muted text-sm mb-2 block">Limit Price (USDT)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                      <input
                        type="text"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                      />
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="mb-3">
                  <label className="text-text-muted text-sm mb-2 block">
                    Amount ({selectedAsset.symbol})
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-accent-teal/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {['25%', '50%', '75%', '100%'].map((pct) => (
                    <button
                      key={pct}
                      className="py-2 rounded-lg bg-card-bg border border-card-border text-text-light text-sm hover:text-white hover:border-accent-teal/40 transition-colors"
                    >
                      {pct}
                    </button>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="bg-card-bg border border-card-border rounded-xl p-4 mb-6">
                  <h3 className="text-white font-semibold mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Order Type</span>
                      <span className="text-white">{orderType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Amount</span>
                      <span className="text-white">{numericAmount.toFixed(2)} {selectedAsset.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Price</span>
                      <span className="text-white">{selectedAsset.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Fee (Demo - Free)</span>
                      <span className="text-accent-teal">$0.00</span>
                    </div>
                    <div className="border-t border-card-border pt-2 flex justify-between font-semibold">
                      <span className="text-white">Total</span>
                      <span className="text-white">${totalValue.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full py-3.5 rounded-xl font-medium text-white transition-opacity hover:opacity-90 ${
                    tradeAction === 'Buy' ? 'gradient-btn' : 'bg-red-500'
                  }`}
                >
                  {tradeAction} {selectedAsset.symbol}
                </button>

                {/* Disclaimer */}
                <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-card-bg border border-card-border">
                  <Info size={16} className="text-text-muted shrink-0" />
                  <p className="text-text-muted text-xs">
                    This is a demo trade using virtual funds. No real money is involved.
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
              {/* Your Portfolio */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Your Portfolio</h3>
                <div className="space-y-3">
                  {portfolioAssets.map((asset) => (
                    <div key={asset.symbol} className="flex items-center justify-between py-2 border-b border-card-border last:border-0">
                      <div>
                        <div className="text-white font-medium text-sm">{asset.symbol}</div>
                        <div className="text-text-muted text-xs">{asset.amount}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${
                          asset.changeValue > 0 ? 'text-green-400' : asset.changeValue < 0 ? 'text-red-400' : 'text-accent-teal'
                        }`}>
                          {asset.change}
                        </div>
                        <div className="text-white text-sm font-semibold">{asset.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-card-border mt-3 pt-3 flex justify-between">
                  <span className="text-text-muted text-sm">Total Value</span>
                  <span className="text-white text-lg font-bold">$47,403.96</span>
                </div>
              </div>

              {/* Recent Trades */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Recent Trades</h3>
                <div className="space-y-3">
                  {recentTrades.map((trade, i) => (
                    <div key={i} className="bg-card-bg border border-card-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium text-sm">{trade.pair}</div>
                        <div className="text-text-muted text-xs">{trade.detail}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          trade.type === 'Buy'
                            ? 'bg-green-400/10 text-green-400'
                            : 'bg-red-400/10 text-red-400'
                        }`}>
                          {trade.type}
                        </span>
                        <div className="text-text-muted text-xs mt-1">{trade.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Stats */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Market Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">24h Volume</span>
                    <span className="text-white text-sm font-semibold">$2.4B</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">24h High</span>
                    <span className="text-green-400 text-sm font-semibold">$71,234.625</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">24h Low</span>
                    <span className="text-red-400 text-sm font-semibold">$64,450.375</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
