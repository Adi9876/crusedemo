import { useState, useEffect } from 'react';
import { Search, CreditCard, Building2, Wallet, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useMarkets, formatPrice, formatPercent, formatVolume } from '../hooks/useMarketData';
import { api } from '../lib/api';

interface CryptoOption {
  symbol: string;
  name: string;
  price: string;
  rawPrice: number;
  change24h: number;
  volume24h: number;
  icon: string;
}

interface WalletBalance {
  id: string;
  currency: string;
  balance: string;
  locked: string;
  available: string;
  updatedAt: string;
}

const fallbackCryptoOptions: CryptoOption[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$67,543.21', rawPrice: 67543.21, change24h: 2.45, volume24h: 28500000000, icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,245.67', rawPrice: 3245.67, change24h: 1.85, volume24h: 14200000000, icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether', price: '$1.00', rawPrice: 1.0, change24h: 0.0, volume24h: 60000000000, icon: '₮' },
  { symbol: 'BNB', name: 'BNB', price: '$542.89', rawPrice: 542.89, change24h: -0.5, volume24h: 1200000000, icon: 'BNB' },
  { symbol: 'SOL', name: 'Solana', price: '$145.32', rawPrice: 145.32, change24h: 5.12, volume24h: 3400000000, icon: '◎' },
  { symbol: 'XRP', name: 'XRP', price: '$0.523', rawPrice: 0.523, change24h: 0.12, volume24h: 850000000, icon: 'XRP' },
  { symbol: 'ADA', name: 'Cardano', price: '$0.452', rawPrice: 0.452, change24h: -1.2, volume24h: 320000000, icon: 'ADA' },
  { symbol: 'DOGE', name: 'Dogecoin', price: '$0.082', rawPrice: 0.082, change24h: -2.4, volume24h: 550000000, icon: 'Ð' },
];

const CRYPTO_ICONS: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  BNB: 'BNB',
  SOL: '◎',
  USDC: 'USDC',
  XRP: 'XRP',
  ADA: 'ADA',
  DOGE: 'Ð',
  POL: 'P',
  AVAX: 'A',
  LINK: 'C',
};

const quickAmounts = [100, 500, 1000, 5000];

type PaymentMethod = 'card' | 'bank' | 'wallet';

export default function BuyCryptoPage() {
  const { data: markets } = useMarkets();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll balances
  const fetchBalances = async () => {
    try {
      const res = await api.get<{ success: boolean; data: WalletBalance[] }>('/api/v1/wallet/balances');
      if (res.success && res.data) {
        setBalances(res.data);
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  useEffect(() => {
    void fetchBalances();
    const id = setInterval(() => void fetchBalances(), 5000);
    return () => clearInterval(id);
  }, []);

  // Build crypto options list dynamically
  const coinsList: CryptoOption[] = markets && markets.length > 0
    ? markets.map((m) => ({
        symbol: m.symbol,
        name: m.name,
        price: formatPrice(m.price),
        rawPrice: m.price,
        change24h: m.change24h,
        volume24h: m.volume24h,
        icon: CRYPTO_ICONS[m.symbol] || m.symbol,
      }))
    : fallbackCryptoOptions;

  const selectedCrypto = coinsList.find((c) => c.symbol === selectedSymbol) || coinsList[0];

  const numericAmount = parseFloat(amount) || 0;
  const feeRate = 0.015;
  const fee = numericAmount * feeRate;
  const total = numericAmount + fee;
  const receiveAmount = numericAmount > 0 ? (numericAmount / selectedCrypto.rawPrice).toFixed(6) : '0.000000';

  const filteredCryptos = coinsList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usdtBalance = balances.find((b) => b.currency === 'USDT');

  const handleBuy = async () => {
    setSuccessMessage(null);
    setErrorMessage(null);

    if (numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0');
      return;
    }

    if (paymentMethod !== 'wallet') {
      setErrorMessage('To pay with Credit Card or Bank Transfer, identity verification (KYC) is required. Please verify your account or use your Wallet Balance instead.');
      return;
    }

    const availableUsdt = usdtBalance ? parseFloat(usdtBalance.available) : 0;
    if (total > availableUsdt) {
      setErrorMessage(`Insufficient USDT balance. You need ${total.toFixed(2)} USDT (including fee), but only have ${availableUsdt.toFixed(2)} USDT available.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        symbol: selectedSymbol,
        type: 'MARKET',
        side: 'BUY',
        amount: receiveAmount,
      };

      const res = await api.post<{ success: boolean; data: any }>('/api/v1/trading/orders', payload);
      if (res.success) {
        setSuccessMessage(`Successfully purchased ${receiveAmount} ${selectedSymbol}!`);
        setAmount('');
        void fetchBalances();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          <h1 className="text-[30px] font-medium text-white mb-8">Buy Crypto</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Card */}
            <div className="flex-1 bg-[#002849] border border-accent-teal/20 rounded-[14px] p-6">
              {/* Select Cryptocurrency */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-4 block">
                  Select Cryptocurrency
                </label>

                {/* Search */}
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search crypto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card-bg border border-card-border text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-accent-teal/40"
                  />
                </div>

                {/* Crypto Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredCryptos.map((crypto) => (
                    <button
                      key={crypto.symbol}
                      onClick={() => {
                        setSelectedSymbol(crypto.symbol);
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                      className={`flex flex-col items-center justify-center p-4 rounded-[10px] border transition-colors ${
                        selectedSymbol === crypto.symbol
                          ? 'bg-accent-teal/10 border-accent-teal'
                          : 'bg-[#002849] border-accent-teal/20 hover:border-accent-teal/40'
                      }`}
                    >
                      <span className="text-white text-2xl font-medium mb-1">{crypto.icon}</span>
                      <span className="text-white text-sm font-semibold">{crypto.symbol}</span>
                      <span className="text-[#94A3B8] text-xs">{crypto.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* You Pay */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-3 block">You Pay</label>
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className="w-full pl-8 pr-4 py-3 rounded-lg bg-card-bg border border-card-border text-white placeholder:text-text-muted text-sm focus:outline-none focus:border-accent-teal/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => {
                        setAmount(String(qa));
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        amount === String(qa)
                          ? 'gradient-btn text-white'
                          : 'bg-card-bg border border-card-border text-text-light hover:text-white hover:border-accent-teal/40'
                      }`}
                    >
                      ${qa}
                    </button>
                  ))}
                </div>
              </div>

              {/* You Receive */}
              <div className="mb-6">
                <label className="text-text-muted text-sm mb-2 block">You Receive</label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card-bg border border-card-border">
                  <span className="text-accent-teal text-lg">{selectedCrypto.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-lg">{receiveAmount}</div>
                    <div className="text-text-muted text-xs">{selectedCrypto.symbol}</div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="text-white text-sm font-medium mb-3 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setPaymentMethod('card');
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-colors ${
                      paymentMethod === 'card'
                        ? 'bg-accent-teal/10 border-accent-teal'
                        : 'bg-card-bg border-card-border hover:border-accent-teal/40'
                    }`}
                  >
                    <CreditCard size={20} className={paymentMethod === 'card' ? 'text-accent-teal' : 'text-text-muted'} />
                    <span className="text-white text-xs font-medium">Credit/Debit Card</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('bank');
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-colors ${
                      paymentMethod === 'bank'
                        ? 'bg-accent-teal/10 border-accent-teal'
                        : 'bg-card-bg border-card-border hover:border-accent-teal/40'
                    }`}
                  >
                    <Building2 size={20} className={paymentMethod === 'bank' ? 'text-accent-teal' : 'text-text-muted'} />
                    <span className="text-white text-xs font-medium">Bank Transfer</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('wallet');
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-colors ${
                      paymentMethod === 'wallet'
                        ? 'bg-accent-teal/10 border-accent-teal'
                        : 'bg-card-bg border-card-border hover:border-accent-teal/40'
                    }`}
                  >
                    <Wallet size={20} className={paymentMethod === 'wallet' ? 'text-accent-teal' : 'text-text-muted'} />
                    <span className="text-white text-xs font-medium">Wallet Balance</span>
                    <span className="text-[#94A3B8] text-[10px] mt-0.5">
                      {usdtBalance ? `${parseFloat(usdtBalance.available).toFixed(2)} USDT` : 'Loading...'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-card-bg border border-card-border rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Amount</span>
                  <span className="text-white">${numericAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Fee (1.5%)</span>
                  <span className="text-white">${fee.toFixed(2)}</span>
                </div>
                <div className="border-t border-card-border pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-accent-teal">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Success / Error Messages */}
              {successMessage && (
                <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  {successMessage}
                </div>
              )}
              {errorMessage && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={handleBuy}
                disabled={isSubmitting}
                className="w-full gradient-btn text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : `Buy ${selectedCrypto.symbol}`}
              </button>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 space-y-6">
              {/* How to Buy */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-[14px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={20} className="text-accent-teal" />
                  <h3 className="text-white font-semibold text-lg">How to Buy</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Select cryptocurrency',
                    'Enter amount to buy',
                    'Choose payment method',
                    'Review and confirm',
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-teal shrink-0" />
                      <span className="text-text-light text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Market Info */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-[14px] p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Market Info</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-text-muted text-xs mb-1">Current Price</div>
                    <div className="text-accent-teal text-xl font-bold">{selectedCrypto.price}</div>
                  </div>
                  <div>
                    <div className="text-text-muted text-xs mb-1">24h Change</div>
                    <span className={`font-semibold ${selectedCrypto.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(selectedCrypto.change24h)}
                    </span>
                  </div>
                  <div>
                    <div className="text-text-muted text-xs mb-1">24h Volume</div>
                    <div className="text-white font-bold text-lg">{formatVolume(selectedCrypto.volume24h)}</div>
                  </div>
                </div>
              </div>

              {/* Instant Delivery */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-[14px] p-6">
                <h3 className="text-accent-teal font-semibold text-lg mb-2">Instant Delivery</h3>
                <p className="text-text-light text-sm leading-relaxed">
                  Your crypto will be delivered instantly to your wallet after payment confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
