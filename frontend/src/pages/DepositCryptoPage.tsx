import { useState, useEffect } from 'react';
import { Copy, Shield, AlertTriangle, Clock, Check, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { api } from '../lib/api';

interface Coin {
  symbol: string;
  name: string;
  color: string;
}

const coins: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'USDT', name: 'Tether', color: '#26A17B' },
  { symbol: 'SOL', name: 'Solana', color: '#9945FF' },
  { symbol: 'BNB', name: 'BNB', color: '#F3BA2F' },
];

interface DepositRecord {
  id: string;
  currency: string;
  amount: string;
  network: string;
  txHash: string | null;
  status: string;
  createdAt: string;
}

export default function DepositCryptoPage() {
  const [selectedCoin, setSelectedCoin] = useState(coins[0]);
  const [selectedNetwork, setSelectedNetwork] = useState('Bitcoin');
  const [copied, setCopied] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<DepositRecord[]>([]);
  const [addressInfo, setAddressInfo] = useState<{
    coin: string;
    chains: Array<{
      chainType: string;
      addressDeposit: string;
      tagDeposit: string;
      chain: string;
    }>;
  } | null>(null);
  const [activeChainIndex, setActiveChainIndex] = useState(0);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const fetchAddress = async (coinSymbol: string) => {
    setIsLoadingAddress(true);
    setErrorMsg(null);
    setAddressInfo(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: {
          coin: string;
          chains: Array<{
            chainType: string;
            addressDeposit: string;
            tagDeposit: string;
            chain: string;
          }>;
        };
      }>(`/api/v1/wallet/deposit-address?coin=${coinSymbol}`);
      
      if (res.data && res.data.chains && res.data.chains.length > 0) {
        setAddressInfo(res.data);
        setActiveChainIndex(0);
        setSelectedNetwork(res.data.chains[0].chainType);
      } else {
        setErrorMsg(`No deposit addresses found for ${coinSymbol} on your Bybit account.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to fetch deposit address for ${coinSymbol}.`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleCoinSelect = (coin: Coin) => {
    setSelectedCoin(coin);
    setCopied(false);
    setCopiedTag(false);
    setErrorMsg(null);
    void fetchAddress(coin.symbol);
  };

  const handleCopy = () => {
    const addressToCopy = addressInfo?.chains?.[activeChainIndex]?.addressDeposit;
    if (addressToCopy) {
      navigator.clipboard.writeText(addressToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyTag = () => {
    const tagToCopy = addressInfo?.chains?.[activeChainIndex]?.tagDeposit;
    if (tagToCopy) {
      navigator.clipboard.writeText(tagToCopy);
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    }
  };

  const fetchDeposits = async () => {
    try {
      const res = await api.get<{ success: boolean; data: DepositRecord[] }>('/api/v1/wallet/deposits');
      setRecentDeposits(res.data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchDeposits();
    void fetchAddress(selectedCoin.symbol);
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold">
              Deposit <span className="gradient-text">Crypto</span>
            </h1>
            <p className="text-text-muted mt-2">
              Deposit cryptocurrency to your Cruse X wallet
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Coin Selector Sidebar */}
            <div className="w-full lg:w-64">
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5">
                <h3 className="text-white font-semibold text-lg mb-4">Select Coin</h3>
                <div className="space-y-2">
                  {coins.map((coin) => (
                    <button
                      key={coin.symbol}
                      onClick={() => handleCoinSelect(coin)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedCoin.symbol === coin.symbol
                          ? 'bg-accent-teal/10 border border-accent-teal'
                          : 'bg-card-bg border border-card-border hover:border-accent-teal/40'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: coin.color }}
                      >
                        {coin.symbol}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold text-sm">{coin.symbol}</div>
                        <div className="text-text-muted text-xs">{coin.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deposit Area */}
            <div className="flex-1 space-y-6">
              {/* Error Messages */}
              {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}

              {/* Selected Coin Header */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: selectedCoin.color }}
                  >
                    {selectedCoin.symbol}
                  </div>
                  <div>
                    <h2 className="text-white text-xl font-bold">Deposit {selectedCoin.name}</h2>
                    <p className="text-text-muted text-sm">
                      Send {selectedCoin.symbol} to the address below
                    </p>
                  </div>
                </div>

                {/* Network Selection */}
                {isLoadingAddress ? (
                  <div className="text-text-muted text-sm mb-6">Loading network address details from Bybit...</div>
                ) : addressInfo && addressInfo.chains && addressInfo.chains.length > 0 ? (
                  <>
                    <div className="mb-6">
                      <label className="text-text-light text-sm mb-2 block">Select Network</label>
                      <div className="flex gap-3 flex-wrap">
                        {addressInfo.chains.map((chain, index) => (
                          <button
                            key={chain.chainType}
                            onClick={() => {
                              setActiveChainIndex(index);
                              setSelectedNetwork(chain.chainType);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                              activeChainIndex === index
                                ? 'gradient-btn text-white'
                                : 'bg-card-bg border border-card-border text-text-light hover:border-accent-teal/40'
                            }`}
                          >
                            {chain.chainType}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-6">
                      <div className="bg-white rounded-2xl p-4 w-44 h-44 flex flex-col items-center justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                            addressInfo.chains[activeChainIndex]?.addressDeposit || ''
                          )}`}
                          alt="Deposit Address QR Code"
                          className="w-[130px] h-[130px]"
                        />
                        <p className="text-gray-500 text-[10px] mt-1.5 font-medium">Scan QR Code</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-6">
                      <label className="text-text-light text-sm mb-2 block">{selectedCoin.symbol} Address</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-card-bg border border-card-border rounded-xl px-4 py-3 text-white text-sm font-mono break-all">
                          {addressInfo.chains[activeChainIndex]?.addressDeposit}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="shrink-0 gradient-btn p-3 rounded-xl hover:opacity-90 transition-opacity"
                        >
                          {copied ? <Check size={18} className="text-white" /> : <Copy size={18} className="text-white" />}
                        </button>
                      </div>
                    </div>

                    {/* Memo / Tag if present */}
                    {addressInfo.chains[activeChainIndex]?.tagDeposit && (
                      <div className="mb-6">
                        <label className="text-text-light text-sm mb-2 block">{selectedCoin.symbol} Memo / Tag</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-card-bg border border-card-border rounded-xl px-4 py-3 text-white text-sm font-mono break-all">
                            {addressInfo.chains[activeChainIndex].tagDeposit}
                          </div>
                          <button
                            onClick={handleCopyTag}
                            className="shrink-0 gradient-btn p-3 rounded-xl hover:opacity-90 transition-opacity"
                          >
                            {copiedTag ? <Check size={18} className="text-white" /> : <Copy size={18} className="text-white" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-text-muted text-sm mb-6">No deposit address available for {selectedCoin.symbol}.</div>
                )}


                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
                    <div className="text-text-muted text-xs mb-1">Network Fee</div>
                    <div className="text-white font-semibold text-sm">~0.0001 {selectedCoin.symbol}</div>
                  </div>
                  <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
                    <div className="text-text-muted text-xs mb-1">Expected Arrival</div>
                    <div className="text-white font-semibold text-sm">~30 minutes</div>
                  </div>
                  <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
                    <div className="text-text-muted text-xs mb-1">Minimum Deposit</div>
                    <div className="text-white font-semibold text-sm">0.0001 {selectedCoin.symbol}</div>
                  </div>
                </div>
              </div>

              {/* Security Tips */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={18} className="text-accent-teal" />
                  <h3 className="text-white font-semibold text-lg">Security Tips</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-text-light text-sm">
                      Only send <span className="text-white font-medium">{selectedCoin.symbol}</span> to this address. Sending any other token may result in permanent loss.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Info size={16} className="text-accent-teal mt-0.5 shrink-0" />
                    <p className="text-text-light text-sm">
                      Ensure you are using the correct network (<span className="text-white font-medium">{selectedNetwork}</span>) when sending.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock size={16} className="text-text-muted mt-0.5 shrink-0" />
                    <p className="text-text-light text-sm">
                      Deposits require network confirmations before being credited to your account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Deposits — Live Data */}
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Recent Deposits</h3>
                {recentDeposits.length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-6">No deposits yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentDeposits.map((deposit) => (
                      <div key={deposit.id} className="bg-card-bg border border-card-border rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium text-sm">{deposit.amount} {deposit.currency}</div>
                          <div className="text-text-muted text-xs">
                            {deposit.txHash?.slice(0, 12)}... · {formatTimeAgo(deposit.createdAt)} · {deposit.network}
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                          deposit.status === 'CONFIRMED'
                            ? 'bg-green-400/10 text-green-400'
                            : deposit.status === 'FAILED'
                            ? 'bg-red-400/10 text-red-400'
                            : 'bg-yellow-400/10 text-yellow-400'
                        }`}>
                          {deposit.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
