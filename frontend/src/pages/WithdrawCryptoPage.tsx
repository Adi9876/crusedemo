import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { api } from '../lib/api';

interface WalletBalance {
  currency: string;
  balance: string;
  locked: string;
  available: string;
}

interface CoinDisplay {
  symbol: string;
  name: string;
  balance: string;
  available: string;
  color: string;
}

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
};

const networks: Record<string, string[]> = {
  BTC: ['Bitcoin'],
  ETH: ['ERC-20', 'Arbitrum One', 'Optimism'],
  USDT: ['ERC-20', 'TRC-20', 'BEP-20'],
  SOL: ['Solana'],
  BNB: ['BEP-20', 'BEP-2'],
  USDC: ['ERC-20'],
  XRP: ['XRP Ledger'],
  ADA: ['Cardano'],
  DOGE: ['Dogecoin'],
};

interface WithdrawalRecord {
  id: string;
  currency: string;
  amount: string;
  fee: string;
  toAddress: string;
  status: string;
  createdAt: string;
}

export default function WithdrawCryptoPage() {
  const [step, setStep] = useState(1);
  const [coins, setCoins] = useState<CoinDisplay[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinDisplay | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [networkFee, setNetworkFee] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<WithdrawalRecord[]>([]);

  // Fetch wallet balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await api.get<{ success: boolean; data: WalletBalance[] }>('/api/v1/wallet/balances');
        const wallets = res.data.map((w) => ({
          symbol: w.currency,
          name: coinMeta[w.currency]?.name ?? w.currency,
          balance: w.balance,
          available: w.available,
          color: coinMeta[w.currency]?.color ?? '#888',
        }));
        setCoins(wallets);
        if (wallets.length > 0 && !selectedCoin) {
          setSelectedCoin(wallets[0]);
          setSelectedNetwork(networks[wallets[0].symbol]?.[0] ?? '');
        }
      } catch {
        // If no wallets yet, show empty state
        setCoins([]);
      }
    };
    fetchBalances();
  }, []);

  // Fetch withdrawals
  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const res = await api.get<{ success: boolean; data: WithdrawalRecord[] }>('/api/v1/wallet/withdrawals');
        setRecentWithdrawals(res.data);
      } catch { /* silent */ }
    };
    fetchWithdrawals();
  }, []);

  // Fetch network fee when coin changes
  useEffect(() => {
    if (!selectedCoin) return;
    const fetchFee = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { fee: string } }>(`/api/v1/wallet/fee/${selectedCoin.symbol}`);
        setNetworkFee(res.data.fee);
      } catch { setNetworkFee('0'); }
    };
    fetchFee();
  }, [selectedCoin?.symbol]);

  const handleCoinSelect = (coin: CoinDisplay) => {
    setSelectedCoin(coin);
    setSelectedNetwork(networks[coin.symbol]?.[0] ?? '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const numericAmount = parseFloat(amount) || 0;
  const numericFee = parseFloat(networkFee) || 0;
  const receiveAmount = Math.max(0, numericAmount - numericFee);

  const handleConfirmWithdrawal = async () => {
    if (!selectedCoin) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post<{ success: boolean; data: { withdrawalId: string; status: string } }>(
        '/api/v1/wallet/withdraw',
        {
          currency: selectedCoin.symbol,
          amount: amount,
          network: selectedNetwork,
          toAddress: withdrawAddress,
        }
      );
      const statusLabel = res.data.status === 'COMPLETED' ? 'completed (auto-approved)' : 'submitted for review';
      setSuccessMsg(`Withdrawal ${statusLabel}. ID: ${res.data.withdrawalId.slice(0, 8)}...`);
      setStep(1);
      setAmount('');
      setWithdrawAddress('');
      setVerificationCode('');

      // Refresh balances and withdrawals
      const [balRes, wdRes] = await Promise.all([
        api.get<{ success: boolean; data: WalletBalance[] }>('/api/v1/wallet/balances'),
        api.get<{ success: boolean; data: WithdrawalRecord[] }>('/api/v1/wallet/withdrawals'),
      ]);
      const wallets = balRes.data.map((w) => ({
        symbol: w.currency,
        name: coinMeta[w.currency]?.name ?? w.currency,
        balance: w.balance,
        available: w.available,
        color: coinMeta[w.currency]?.color ?? '#888',
      }));
      setCoins(wallets);
      if (wallets.length > 0) setSelectedCoin(wallets.find((w) => w.symbol === selectedCoin.symbol) ?? wallets[0]);
      setRecentWithdrawals(wdRes.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Withdrawal failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (coins.length === 0 && !selectedCoin) {
    return (
      <div className="min-h-screen bg-primary">
        <Navbar />
        <section className="pt-[72px]">
          <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-text-muted text-sm hover:text-white transition-colors mb-6">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <div className="mb-6">
              <h1 className="text-4xl font-bold">Withdraw <span className="gradient-text">Crypto</span></h1>
              <p className="text-text-muted mt-2">Send your crypto to external wallets</p>
            </div>
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-12 text-center">
              <p className="text-text-muted text-lg mb-4">No wallet balances found</p>
              <p className="text-text-muted text-sm mb-6">Deposit crypto first to start withdrawing.</p>
              <Link to="/deposit" className="gradient-btn text-white font-medium px-8 py-3.5 rounded-xl inline-block hover:opacity-90 transition-opacity">
                Go to Deposit
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-text-muted text-sm hover:text-white transition-colors mb-6">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <div className="mb-6">
            <h1 className="text-4xl font-bold">Withdraw <span className="gradient-text">Crypto</span></h1>
            <p className="text-text-muted mt-2">Send your crypto to external wallets</p>
          </div>

          {/* Success/Error */}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
              <Check size={16} />{successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{errorMsg}</div>
          )}

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > 1 ? 'gradient-btn text-white' : 'bg-accent-teal text-white'}`}>
                {step > 1 ? <Check size={14} /> : '1'}
              </div>
              <span className="text-white text-sm font-medium">Enter Details</span>
            </div>
            <div className={`w-20 h-0.5 ${step > 1 ? 'bg-accent-teal' : 'bg-card-border'}`} />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === 2 ? 'bg-accent-teal border-accent-teal text-white' : 'border-card-border bg-card-bg text-text-muted'}`}>
                2
              </div>
              <span className={`text-sm font-medium ${step === 2 ? 'text-white' : 'text-text-muted'}`}>Confirm</span>
            </div>
          </div>

          {/* STEP 1 */}
          {step === 1 && selectedCoin && (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-64 shrink-0">
                <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5">
                  <h3 className="text-white font-semibold text-lg mb-4">Select Coin</h3>
                  <div className="space-y-2">
                    {coins.map((coin) => (
                      <button key={coin.symbol} onClick={() => handleCoinSelect(coin)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedCoin.symbol === coin.symbol ? 'bg-accent-teal/10 border border-accent-teal' : 'bg-card-bg border border-card-border hover:border-accent-teal/40'}`}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: coin.color }}>
                          {coin.symbol}
                        </div>
                        <div className="text-left">
                          <div className="text-white font-semibold text-sm">{coin.symbol}</div>
                          <div className="text-text-muted text-xs">{coin.available} available</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: selectedCoin.color }}>
                      {selectedCoin.symbol}
                    </div>
                    <div>
                      <h2 className="text-white text-xl font-bold">Withdraw {selectedCoin.name}</h2>
                      <p className="text-text-muted text-sm">Available: <span className="text-accent-teal font-semibold">{selectedCoin.available} {selectedCoin.symbol}</span></p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">Select Network</label>
                    <div className="flex gap-3 flex-wrap">
                      {(networks[selectedCoin.symbol] ?? []).map((network) => (
                        <button key={network} onClick={() => setSelectedNetwork(network)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedNetwork === network ? 'gradient-btn text-white' : 'bg-card-bg border border-card-border text-text-light hover:border-accent-teal/40'}`}>
                          {network}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">Withdrawal Address *</label>
                    <input type="text" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} placeholder={`Enter ${selectedCoin.symbol} address`} className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-teal/40" />
                  </div>

                  <div className="mb-3">
                    <label className="text-text-light text-sm mb-2 block">Amount ({selectedCoin.symbol})</label>
                    <div className="relative">
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 pr-16 rounded-xl bg-card-bg border border-card-border text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-teal/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <button onClick={() => setAmount(selectedCoin.available)} className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-teal text-sm font-semibold">Max</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {['25%', '50%', '75%', '100%'].map((pct) => {
                      const pctVal = parseInt(pct) / 100;
                      return (
                        <button key={pct} onClick={() => setAmount((parseFloat(selectedCoin.available) * pctVal).toString())} className="py-2 rounded-lg bg-card-bg border border-card-border text-text-light text-sm hover:text-white hover:border-accent-teal/40 transition-colors">{pct}</button>
                      );
                    })}
                  </div>

                  <div className="bg-card-bg border border-card-border rounded-xl p-4 mb-6">
                    <h3 className="text-white font-semibold mb-3">Fee Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="text-white">{numericAmount.toFixed(4)} {selectedCoin.symbol}</span></div>
                      <div className="flex justify-between"><span className="text-text-muted">Network Fee</span><span className="text-white">{networkFee} {selectedCoin.symbol}</span></div>
                      <div className="border-t border-card-border pt-2 flex justify-between font-semibold"><span className="text-white">You'll Receive</span><span className="text-accent-teal">{receiveAmount.toFixed(4)} {selectedCoin.symbol}</span></div>
                    </div>
                  </div>

                  <button onClick={() => setStep(2)} disabled={!amount || !withdrawAddress} className="w-full gradient-btn text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">Continue</button>
                </div>

                <div className="bg-[#002849] border border-yellow-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} className="text-yellow-400" />
                    <h3 className="text-white font-semibold">Security Warning</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {['Double-check withdrawal address', 'Verify network selection', 'Withdrawals are irreversible', 'Wrong address = permanent loss'].map((msg) => (
                      <li key={msg} className="flex items-start gap-2 text-text-light text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />{msg}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent Withdrawals — Live */}
                <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">Recent Withdrawals</h3>
                  {recentWithdrawals.length === 0 ? (
                    <p className="text-text-muted text-sm text-center py-6">No withdrawals yet</p>
                  ) : (
                    <div className="space-y-3">
                      {recentWithdrawals.map((w) => (
                        <div key={w.id} className="bg-card-bg border border-card-border rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium text-sm">{w.amount} {w.currency}</div>
                            <div className="text-text-muted text-xs">To: {w.toAddress.slice(0, 8)}...{w.toAddress.slice(-4)} · {formatTimeAgo(w.createdAt)}</div>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                            w.status === 'COMPLETED' ? 'bg-green-400/10 text-green-400' :
                            w.status === 'REJECTED' ? 'bg-red-400/10 text-red-400' :
                            w.status === 'PENDING_REVIEW' ? 'bg-yellow-400/10 text-yellow-400' :
                            'bg-accent-teal/10 text-accent-teal'
                          }`}>{w.status.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && selectedCoin && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-8">
                <h2 className="text-white text-2xl font-bold mb-6">Confirm Withdrawal</h2>

                <div className="space-y-3 mb-4">
                  <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3">
                    <div className="text-text-muted text-xs mb-1">Coin</div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[8px] shrink-0" style={{ backgroundColor: selectedCoin.color }}>
                        {selectedCoin.symbol.slice(0, 3)}
                      </div>
                      <span className="text-white font-semibold text-sm">{selectedCoin.symbol} - {selectedCoin.name}</span>
                    </div>
                  </div>
                  <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3">
                    <div className="text-text-muted text-xs mb-1">Network</div>
                    <div className="text-white font-semibold text-sm">{selectedNetwork}</div>
                  </div>
                  <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3">
                    <div className="text-text-muted text-xs mb-1">Withdrawal Address</div>
                    <div className="text-white font-semibold text-sm font-mono break-all">{withdrawAddress}</div>
                  </div>
                </div>

                <div className="bg-card-bg border border-card-border rounded-xl px-4 py-3 mb-6">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="text-white">{numericAmount.toFixed(6)} {selectedCoin.symbol}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Network Fee</span><span className="text-white">{networkFee} {selectedCoin.symbol}</span></div>
                    <div className="border-t border-card-border pt-2.5 flex justify-between"><span className="text-white font-bold">You'll Receive</span><span className="text-accent-teal font-bold">{receiveAmount.toFixed(6)} {selectedCoin.symbol}</span></div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-white font-semibold text-base mb-3">2FA Verification Code</div>
                  <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="w-full px-4 py-4 rounded-xl bg-card-bg border border-card-border text-white text-lg text-center tracking-[0.4em] placeholder:text-text-muted placeholder:tracking-normal focus:outline-none focus:border-accent-teal/40 mb-2" />
                  <div className="flex items-center gap-1.5 text-text-muted text-xs">
                    <Lock size={12} />Enter the 6-digit code from your authenticator app
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setStep(1)} disabled={isSubmitting} className="py-3.5 rounded-xl bg-card-bg border border-card-border text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50">Back</button>
                  <button onClick={handleConfirmWithdrawal} disabled={isSubmitting} className="py-3.5 rounded-xl gradient-btn text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
