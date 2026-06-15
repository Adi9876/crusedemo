import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Download, Upload, Clock, Wallet, Eye, Plus, ArrowLeftRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Clock as ClockIcon } from 'lucide-react';
import {
  useMarkets,
  formatPrice,
  formatPercent,
  formatVolume,
} from '../hooks/useMarketData';
import { getTradeableMarkets } from '../lib/tradingPairs';
import { api } from '../lib/api';

const coinMeta: Record<string, { name: string; color: string }> = {
  BTC:  { name: 'Bitcoin',   color: '#F7931A' },
  ETH:  { name: 'Ethereum',  color: '#627EEA' },
  USDT: { name: 'Tether',    color: '#26A17B' },
  SOL:  { name: 'Solana',    color: '#9945FF' },
  BNB:  { name: 'BNB',       color: '#F3BA2F' },
  USDC: { name: 'USD Coin',  color: '#2775CA' },
  XRP:  { name: 'XRP',       color: '#808080' },
  ADA:  { name: 'Cardano',   color: '#0033AD' },
  DOGE: { name: 'Dogecoin',  color: '#C2A633' },
  POL:  { name: 'Polygon',   color: '#8247E5' },
  AVAX: { name: 'Avalanche', color: '#E84142' },
  LINK: { name: 'Chainlink', color: '#2A5ADA' },
};

interface WalletBalance {
  currency: string;
  balance: string;
  locked: string;
  available: string;
}

interface Activity {
  type: 'Buy' | 'Sell' | 'Deposit' | 'Withdraw';
  pair: string;
  amount: string;
  time: string;
  status: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: markets, loading: marketsLoading } = useMarkets();
  const kycStatus = user?.profile?.kycStatus || 'NOT_STARTED';
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await api.get<{ success: boolean; data: WalletBalance[] }>('/api/v1/wallet/balances');
        setWallets(res.data);
      } catch { /* user may not have wallets yet */ }
    };
    const fetchOpenOrders = async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>('/api/v1/trading/orders/open');
        setOpenOrders(res.data);
      } catch { /* ignore */ }
    };
    const fetchActivity = async () => {
      try {
        const [tradesRes, depositsRes, withdrawalsRes] = await Promise.all([
          api.get<{ success: boolean; data: any[] }>('/api/v1/trading/trades').catch(() => ({ success: false, data: [] })),
          api.get<{ success: boolean; data: any[] }>('/api/v1/wallet/deposits').catch(() => ({ success: false, data: [] })),
          api.get<{ success: boolean; data: any[] }>('/api/v1/wallet/withdrawals').catch(() => ({ success: false, data: [] })),
        ]);

        const items: Array<{ type: 'Buy' | 'Sell' | 'Deposit' | 'Withdraw'; pair: string; amount: string; status: string; date: Date }> = [];

        if (tradesRes.success && tradesRes.data) {
          tradesRes.data.forEach((t) => {
            const sym = t.symbol.includes('/') ? t.symbol : (t.symbol.endsWith('USDT') ? t.symbol.replace(/USDT$/, '/USDT') : t.symbol + '/USDT');
            const coin = sym.split('/')[0];
            items.push({
              type: t.side === 'BUY' ? 'Buy' : 'Sell',
              pair: sym,
              amount: `${t.side === 'BUY' ? '+' : '-'}${parseFloat(t.amount)} ${coin}`,
              status: 'Completed',
              date: new Date(t.createdAt),
            });
          });
        }

        if (depositsRes.success && depositsRes.data) {
          depositsRes.data.forEach((d) => {
            items.push({
              type: 'Deposit',
              pair: d.currency,
              amount: `+${parseFloat(d.amount)} ${d.currency}`,
              status: d.status === 'CONFIRMED' ? 'Completed' : d.status,
              date: new Date(d.createdAt),
            });
          });
        }

        if (withdrawalsRes.success && withdrawalsRes.data) {
          withdrawalsRes.data.forEach((w) => {
            items.push({
              type: 'Withdraw',
              pair: w.currency,
              amount: `-${parseFloat(w.amount)} ${w.currency}`,
              status: w.status === 'COMPLETED' ? 'Completed' : (w.status === 'PENDING_REVIEW' ? 'Pending' : 'Failed'),
              date: new Date(w.createdAt),
            });
          });
        }

        items.sort((a, b) => b.date.getTime() - a.date.getTime());

        const formatTimeAgo = (d: Date) => {
          const diff = Date.now() - d.getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) return 'Just now';
          if (mins < 60) return `${mins}m ago`;
          const hours = Math.floor(mins / 60);
          if (hours < 24) return `${hours}h ago`;
          const days = Math.floor(hours / 24);
          return `${days}d ago`;
        };

        const formatted: Activity[] = items.slice(0, 5).map((item) => ({
          type: item.type,
          pair: item.pair,
          amount: item.amount,
          time: formatTimeAgo(item.date),
          status: item.status,
        }));

        setRecentActivity(formatted);
      } catch (err) {
        console.error('Error fetching recent activity:', err);
      }
    };

    fetchWallets();
    fetchOpenOrders();
    fetchActivity();
    const interval = setInterval(() => {
      fetchWallets();
      fetchOpenOrders();
      fetchActivity();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const marketOverview = getTradeableMarkets(markets).slice(0, 4);

  // Build portfolio assets from wallets × market prices
  const portfolioAssets = wallets
    .filter((w) => parseFloat(w.balance) > 0)
    .map((w) => {
      const ticker = markets?.find((m) => m.symbol === w.currency);
      const balance = parseFloat(w.balance);
      const price = ticker?.price ?? (w.currency === 'USDT' || w.currency === 'USDC' ? 1 : 0);
      const value = balance * price;
      const change24h = ticker?.change24h ?? 0;
      return {
        symbol: w.currency,
        name: coinMeta[w.currency]?.name ?? w.currency,
        balance,
        value,
        change24h,
        color: coinMeta[w.currency]?.color ?? '#888',
      };
    })
    .sort((a, b) => b.value - a.value);

  const totalPortfolioValue = portfolioAssets.reduce((sum, a) => sum + a.value, 0);

  // Calculate dynamic 24h P&L change
  const totalChange24hUSDT = portfolioAssets.reduce((sum, a) => {
    const changePct = a.change24h;
    const valBefore = a.value / (1 + changePct / 100);
    return sum + (a.value - valBefore);
  }, 0);

  const totalValueBefore = totalPortfolioValue - totalChange24hUSDT;
  const totalPctChange = totalValueBefore > 0 ? (totalChange24hUSDT / totalValueBefore) * 100 : 0;

  const openBuyCount = openOrders.filter((o) => o.side === 'BUY').length;
  const openSellCount = openOrders.filter((o) => o.side === 'SELL').length;
  const totalOpenOrders = openOrders.length;

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          {/* KYC Status Banner */}
          {kycStatus !== 'APPROVED' && (
            <div className={`mb-8 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              kycStatus === 'REJECTED' ? 'bg-red-500/10 border-red-500/30' :
              kycStatus === 'PENDING' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-accent-teal/10 border-accent-teal/30'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  kycStatus === 'REJECTED' ? 'bg-red-500/20' :
                  kycStatus === 'PENDING' ? 'bg-yellow-500/20' :
                  'bg-accent-teal/20'
                }`}>
                  {kycStatus === 'REJECTED' ? <ShieldAlert className="text-red-400" /> :
                   kycStatus === 'PENDING' ? <ClockIcon className="text-yellow-400" /> :
                   <ShieldAlert className="text-accent-teal" />}
                </div>
                <div>
                  <h3 className="text-white font-bold">
                    {kycStatus === 'REJECTED' ? 'Verification Rejected' :
                     kycStatus === 'PENDING' ? 'Verification in Progress' :
                     'Complete Your Verification'}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {kycStatus === 'REJECTED' ? 'Please re-upload your documents to access all features.' :
                     kycStatus === 'PENDING' ? 'We are reviewing your documents. This usually takes 24-48 hours.' :
                     'Verify your identity to increase your limits and access live trading.'}
                  </p>
                </div>
              </div>
              {kycStatus !== 'PENDING' && (
                <Link
                  to="/open-account"
                  className="px-6 py-2.5 rounded-xl gradient-btn text-white font-medium text-sm whitespace-nowrap"
                >
                  {kycStatus === 'REJECTED' ? 'Retry Verification' : 'Verify Now'}
                </Link>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">
                Welcome back, <span className="gradient-text">{user?.firstName || 'User'}</span>
              </h1>
              <p className="text-text-muted mt-2">
                Here's what's happening with your portfolio today
              </p>
            </div>
          </div>

          {/* Stats Grid: Large portfolio card (left) + 2 stacked cards (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {/* Total Portfolio Card — spans 2 of 3 columns */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#001e3c] to-[#002a4a] border border-accent-teal/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-5 right-5 w-10 h-10 rounded-xl gradient-btn flex items-center justify-center">
                <Wallet size={20} className="text-white" />
              </div>

              <div className="flex items-center gap-2 text-text-muted text-sm mb-3">
                <span>Total Portfolio Value</span>
                <Eye size={14} />
              </div>

              <div className="text-white text-4xl md:text-5xl font-bold mb-2">{formatPrice(totalPortfolioValue)}</div>

              <div className={`flex items-center gap-1 text-sm mb-8 ${totalChange24hUSDT >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalChange24hUSDT >= 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                <span>
                  {totalChange24hUSDT >= 0 ? '+' : ''}
                  {formatPrice(totalChange24hUSDT)} ({totalPctChange >= 0 ? '+' : ''}
                  {totalPctChange.toFixed(2)}%) 24h
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-4 gap-3">
                <Link
                  to="/buy-crypto"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl bg-card-bg border border-card-border hover:border-accent-teal/40 transition-colors"
                >
                  <Plus size={20} className="text-accent-teal" />
                  <span className="text-white text-sm">Buy</span>
                </Link>
                <Link
                  to="/spot-trading"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl bg-card-bg border border-card-border hover:border-accent-teal/40 transition-colors"
                >
                  <ArrowLeftRight size={20} className="text-accent-teal" />
                  <span className="text-white text-sm">Trade</span>
                </Link>
                <Link
                  to="/deposit"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl bg-card-bg border border-card-border hover:border-accent-teal/40 transition-colors"
                >
                  <Download size={20} className="text-accent-teal" />
                  <span className="text-white text-sm">Deposit</span>
                </Link>
                <Link
                  to="/withdraw"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl bg-card-bg border border-card-border hover:border-accent-teal/40 transition-colors"
                >
                  <Upload size={20} className="text-accent-teal" />
                  <span className="text-white text-sm">Withdraw</span>
                </Link>
              </div>
            </div>

            {/* Right column — 2 stacked cards */}
            <div className="flex flex-col gap-4">
              {/* Today's P&L */}
              <div className="flex-1 bg-[#002849] border border-accent-teal/20 rounded-2xl p-5 relative">
                <div className={`absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center ${totalChange24hUSDT >= 0 ? 'bg-green-400/10' : 'bg-red-400/10'}`}>
                  <TrendingUp size={16} className={totalChange24hUSDT >= 0 ? 'text-green-400' : 'text-red-400 rotate-180'} />
                </div>
                <div className="text-text-muted text-sm mb-3">Today's P&L</div>
                <div className={`text-3xl font-bold mb-1 ${totalChange24hUSDT >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalChange24hUSDT >= 0 ? '+' : ''}
                  {formatPrice(totalChange24hUSDT)}
                </div>
                <div className={`flex items-center gap-1 text-sm ${totalChange24hUSDT >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <TrendingUp size={12} className={totalChange24hUSDT >= 0 ? '' : 'rotate-180'} />
                  <span>{totalPctChange >= 0 ? '+' : ''}{totalPctChange.toFixed(2)}%</span>
                </div>
              </div>

              {/* Open Orders */}
              <div className="flex-1 bg-[#002849] border border-accent-teal/20 rounded-2xl p-5 relative">
                <div className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Clock size={16} className="text-accent-blue" />
                </div>
                <div className="text-text-muted text-sm mb-3">Open Orders</div>
                <div className="text-white text-3xl font-bold mb-1">{totalOpenOrders}</div>
                <div className="text-accent-teal text-sm">{openBuyCount} Buy • {openSellCount} Sell</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Your Assets */}
            <div className="lg:col-span-2 bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">Your Assets</h2>
              {portfolioAssets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted text-sm mb-3">No assets yet</p>
                  <Link to="/deposit" className="text-accent-teal text-sm hover:underline">Deposit crypto to get started</Link>
                </div>
              ) : (
              <div className="space-y-3">
                {portfolioAssets.map((asset) => {
                  const allocation = totalPortfolioValue > 0 ? ((asset.value / totalPortfolioValue) * 100).toFixed(1) : '0';
                  return (
                  <div
                    key={asset.symbol}
                    className="bg-card-bg border border-card-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: asset.color }}
                      >
                        {asset.symbol}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{asset.name}</div>
                        <div className="text-text-muted text-xs">{asset.balance} {asset.symbol}</div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                      <div>
                        <div className="text-white font-semibold">{formatPrice(asset.value)}</div>
                        <div className="text-text-muted text-xs">{allocation}%</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        asset.change24h >= 0
                          ? 'bg-green-400/10 text-green-400'
                          : 'bg-red-400/10 text-red-400'
                      }`}>
                        {formatPercent(asset.change24h)}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-accent-teal" />
                <h2 className="text-white font-bold text-lg">Recent Activity</h2>
              </div>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-text-muted text-sm">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((activity, i) => (
                    <div key={i} className="bg-card-bg border border-card-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            activity.type === 'Buy' ? 'bg-green-400/10 text-green-400' :
                            activity.type === 'Sell' ? 'bg-red-400/10 text-red-400' :
                            activity.type === 'Deposit' ? 'bg-accent-teal/10 text-accent-teal' :
                            'bg-yellow-400/10 text-yellow-400'
                          }`}>
                            {activity.type}
                          </span>
                          <span className="text-white text-sm font-medium">{activity.pair}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted text-xs">{activity.time}</span>
                        <span className="text-text-light text-xs">{activity.amount}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Market Overview */}
          <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Market Overview</h2>
              <Link to="/markets" className="text-accent-teal text-sm hover:underline">
                View All Markets
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {marketsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-card-bg border border-card-border rounded-xl p-4 animate-pulse h-24"
                    />
                  ))
                : marketOverview.map((pair) => (
                <div
                  key={pair.symbol}
                  className="bg-card-bg border border-card-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{pair.symbol}/USDT</span>
                    {pair.change24h >= 0 ? (
                      <ArrowUpRight size={16} className="text-green-400" />
                    ) : (
                      <ArrowDownRight size={16} className="text-red-400" />
                    )}
                  </div>
                  <div className="text-white text-lg font-bold mb-1">{formatPrice(pair.price)}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      pair.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(pair.change24h)}
                    </span>
                    <span className="text-text-muted text-xs">Vol: {formatVolume(pair.volume24h)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
