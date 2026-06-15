import { Link } from 'react-router-dom';
import { TrendingUp, RotateCcw, Play, Trophy, BarChart3 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface Asset {
  symbol: string;
  name: string;
  amount: string;
  value: string;
  change: string;
  changeValue: number;
  color: string;
}

const assets: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', amount: '0.1234 BTC', value: '$8,374.12', change: '+2.34%', changeValue: 2.34, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', amount: '2.5678 ETH', value: '$8,864.73', change: '+1.82%', changeValue: 1.82, color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', amount: '45.23 SOL', value: '$6,463.11', change: '-1.24%', changeValue: -1.24, color: '#9945FF' },
];

interface LeaderboardEntry {
  rank: number;
  username: string;
  profit: string;
  returnPct: string;
  color: string;
  isYou?: boolean;
}

const leaderboard: LeaderboardEntry[] = [
  { rank: 1, username: 'CryptoMaster', profit: '+$45,234', returnPct: '+45.23%', color: '#F7931A' },
  { rank: 2, username: 'TradeKing_99', profit: '+$38,567', returnPct: '+38.57%', color: '#627EEA' },
  { rank: 3, username: 'BitWizard', profit: '+$32,891', returnPct: '+32.89%', color: '#E84142' },
  { rank: 4, username: 'You', profit: '+$23,702', returnPct: '+23.70%', color: '#01C6AC', isYou: true },
  { rank: 5, username: 'CoinQueen', profit: '+$21,458', returnPct: '+21.46%', color: '#94A3B8' },
];

export default function DemoTradingPage() {
  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold">
                Demo <span className="gradient-text">Trading</span>
              </h1>
              <p className="text-text-muted mt-2">
                Practice trading with virtual funds - zero risk, real market data
              </p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card-bg border border-card-border text-text-light text-sm hover:text-white transition-colors">
                <RotateCcw size={16} />
                Reset Account
              </button>
              <Link
                to="/demo-trading/trade"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-btn text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Play size={14} />
                Start Trading
              </Link>
            </div>
          </div>

          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-accent-teal/10 to-accent-blue/10 border border-accent-teal/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full gradient-icon-bg flex items-center justify-center shrink-0">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Welcome to Demo Trading!</h3>
                <p className="text-text-light text-sm mb-3">
                  You have been credited with <span className="text-accent-teal font-semibold">$100,000</span> in virtual funds. Practice your trading strategies with real-time market data without any financial risk.
                </p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-text-light text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                    Real market prices and data
                  </li>
                  <li className="flex items-center gap-2 text-text-light text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                    No time limits - practice as long as you need
                  </li>
                  <li className="flex items-center gap-2 text-text-light text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                    Reset your account anytime
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Portfolio Value */}
            <div className="bg-gradient-to-r from-accent-teal/15 to-accent-blue/15 border border-accent-teal/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl gradient-btn flex items-center justify-center opacity-80">
                <BarChart3 size={20} className="text-white" />
              </div>
              <div className="text-text-muted text-xs mb-1">Portfolio Value</div>
              <div className="text-white text-3xl font-bold mb-1">$123,702</div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp size={14} />
                $23,702 (23.70%)
              </div>
            </div>

            {/* Starting Balance */}
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
              <div className="text-text-muted text-xs mb-1">Starting Balance</div>
              <div className="text-white text-3xl font-bold mb-1">$100,000</div>
              <div className="text-text-muted text-sm">Virtual USD</div>
            </div>

            {/* Your Ranking */}
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
              <div className="text-text-muted text-xs mb-1">Your Ranking</div>
              <div className="text-white text-3xl font-bold">
                #4 <span className="text-text-muted text-base font-normal">of 1,247</span>
              </div>
              <div className="flex items-center gap-1 text-accent-teal text-sm mt-1">
                <Trophy size={14} />
                Top 1% trader
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Your Assets */}
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">Your Assets</h2>
              <div className="space-y-3">
                {assets.map((asset) => (
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
                        <div className="text-text-muted text-xs">{asset.amount}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{asset.value}</div>
                      <div className={`text-xs ${asset.changeValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {asset.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/demo-trading/trade"
                className="block w-full mt-4 gradient-btn text-white font-medium py-3 rounded-xl text-center hover:opacity-90 transition-opacity"
              >
                Make a Trade
              </Link>
            </div>

            {/* Leaderboard */}
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={20} className="text-accent-teal" />
                <h2 className="text-white font-bold text-lg">Leaderboard</h2>
              </div>
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`rounded-xl p-4 flex items-center justify-between ${
                      entry.isYou
                        ? 'bg-accent-teal/10 border border-accent-teal/30'
                        : 'bg-card-bg border border-card-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          entry.rank <= 3 ? '' : 'bg-card-bg border border-card-border'
                        }`}
                        style={entry.rank <= 3 ? { backgroundColor: entry.color } : {}}
                      >
                        {entry.rank}
                      </div>
                      <span className={`font-semibold ${entry.isYou ? 'text-accent-teal' : 'text-white'}`}>
                        {entry.username}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-accent-teal font-semibold text-sm">{entry.profit}</div>
                      <div className="text-text-muted text-xs">{entry.returnPct}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Competition Banner */}
              <div className="mt-4 bg-gradient-to-r from-accent-teal/15 to-accent-blue/15 border border-accent-teal/30 rounded-xl p-4">
                <div className="text-white font-semibold text-sm mb-1">Top traders compete for prizes!</div>
                <p className="text-text-muted text-xs">
                  Switch to a real account to participate in trading competitions and win real rewards.
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Performance */}
          <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6 mb-8">
            <h2 className="text-white font-bold text-lg mb-6">Portfolio Performance</h2>
            <div className="bg-card-bg border border-card-border rounded-xl h-48 flex flex-col items-center justify-center mb-6">
              <TrendingUp size={32} className="text-accent-teal mb-2" />
              <div className="text-text-muted text-sm">Performance Chart</div>
              <div className="text-text-muted text-xs">Track your demo trading progress</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-text-muted text-xs mb-1">Total Trades</div>
                <div className="text-white text-2xl font-bold">47</div>
              </div>
              <div className="text-center">
                <div className="text-text-muted text-xs mb-1">Win Rate</div>
                <div className="text-green-400 text-2xl font-bold">68.1%</div>
              </div>
              <div className="text-center">
                <div className="text-text-muted text-xs mb-1">Avg. Return</div>
                <div className="text-green-400 text-2xl font-bold">+3.4%</div>
              </div>
            </div>
          </div>

          {/* Ready to Trade CTA */}
          <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-full gradient-btn flex items-center justify-center mx-auto mb-6">
              <Trophy size={28} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">
              Ready to Trade<span className="gradient-text">For Real?</span>
            </h2>
            <p className="text-text-muted text-sm max-w-lg mx-auto mb-8">
              You've mastered demo trading! Open a live account and start trading with real funds.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/open-account"
                className="gradient-btn text-white font-medium px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Open Live Account
              </Link>
              <Link
                to="/features"
                className="px-8 py-3 rounded-xl bg-card-bg border border-card-border text-white font-medium hover:bg-white/10 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
