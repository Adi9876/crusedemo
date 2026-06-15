import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, Shield, Star, Clock, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface P2POffer {
  id: number;
  username: string;
  avatar: string;
  avatarBg: string;
  rating: number;
  trades: number;
  completion: string;
  isVerified: boolean;
  paymentMethods: string[];
  price: string;
  available: string;
  limitMin: string;
  limitMax: string;
  avgTime: string;
}

const buyOffers: P2POffer[] = [
  {
    id: 1,
    username: 'CryptoKing_24',
    avatar: 'C',
    avatarBg: '#01C6AC',
    rating: 4.9,
    trades: 1247,
    completion: '98.5%',
    isVerified: false,
    paymentMethods: ['Bank Transfer', 'PayPal', 'Wise'],
    price: '$67,890.00',
    available: '0.5234 BTC',
    limitMin: '$500',
    limitMax: '$5,000',
    avgTime: '15 min',
  },
  {
    id: 2,
    username: 'TradeMaster_Pro',
    avatar: 'T',
    avatarBg: '#F7931A',
    rating: 5,
    trades: 856,
    completion: '99.2%',
    isVerified: true,
    paymentMethods: ['Bank Transfer', 'Zelle'],
    price: '$67,875.50',
    available: '1.2341 BTC',
    limitMin: '$1,000',
    limitMax: '$10,000',
    avgTime: '15 min',
  },
  {
    id: 3,
    username: 'BitcoinBoss',
    avatar: 'B',
    avatarBg: '#2A5ADA',
    rating: 4.8,
    trades: 2341,
    completion: '97.8%',
    isVerified: false,
    paymentMethods: ['Bank Transfer', 'Cash App', 'Venmo'],
    price: '$67,920.00',
    available: '0.8765 BTC',
    limitMin: '$100',
    limitMax: '$3,000',
    avgTime: '15 min',
  },
  {
    id: 4,
    username: 'CryptoQueen_88',
    avatar: 'C',
    avatarBg: '#01C6AC',
    rating: 5,
    trades: 567,
    completion: '99.5%',
    isVerified: true,
    paymentMethods: ['Wire Transfer', 'Bank Transfer'],
    price: '$67,865.00',
    available: '2.1234 BTC',
    limitMin: '$2,000',
    limitMax: '$20,000',
    avgTime: '15 min',
  },
];

const howItWorks = [
  { step: '01', title: 'Select Offer', desc: 'Choose an offer from verified merchants with your preferred payment method.' },
  { step: '02', title: 'Make Payment', desc: 'Complete payment using your chosen method. Crypto is held in escrow for safety.' },
  { step: '03', title: 'Receive Crypto', desc: 'Once seller confirms payment, crypto is released from escrow to your wallet.' },
];

export default function P2PBuyPage() {
  const [activeAction] = useState<'Buy' | 'Sell'>('Buy');
  const [cryptoSelect] = useState('Bitcoin (BTC)');
  const [fiatSelect] = useState('USD - US Dollar');
  const [paymentSelect] = useState('All Payments');

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold">
              P2P <span className="gradient-text">Trading</span>
            </h1>
            <p className="text-text-muted mt-2">
              Trade directly with other users with zero fees
            </p>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {/* Action */}
              <div>
                <label className="text-text-muted text-xs mb-2 block">Action</label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeAction === 'Buy'
                        ? 'gradient-btn text-white'
                        : 'bg-card-bg border border-card-border text-text-light'
                    }`}
                  >
                    Buy
                  </button>
                  <Link
                    to="/p2p/sell"
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-card-bg border border-card-border text-text-light text-center hover:text-white transition-colors"
                  >
                    Sell
                  </Link>
                </div>
              </div>

              {/* Crypto */}
              <div>
                <label className="text-text-muted text-xs mb-2 block">Crypto</label>
                <div className="relative">
                  <select className="w-full appearance-none py-2.5 px-3 rounded-lg bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40 pr-8">
                    <option>{cryptoSelect}</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Fiat */}
              <div>
                <label className="text-text-muted text-xs mb-2 block">Fiat</label>
                <div className="relative">
                  <select className="w-full appearance-none py-2.5 px-3 rounded-lg bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40 pr-8">
                    <option>{fiatSelect}</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Payment */}
              <div>
                <label className="text-text-muted text-xs mb-2 block">Payment</label>
                <div className="relative">
                  <select className="w-full appearance-none py-2.5 px-3 rounded-lg bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40 pr-8">
                    <option>{paymentSelect}</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Search Button */}
              <button className="gradient-btn text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Search size={16} />
                Search
              </button>
            </div>
          </div>

          {/* Safe & Secure Banner */}
          <div className="bg-gradient-to-r from-accent-teal/10 to-accent-blue/10 border border-accent-teal/20 rounded-2xl p-5 mb-8 flex items-start gap-3">
            <Shield size={20} className="text-accent-teal shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-medium text-lg">Safe & Secure P2P Trading</h3>
              <p className="text-text-light text-sm">
                All trades are protected by escrow. Funds are only released when both parties confirm the transaction.
              </p>
            </div>
          </div>

          {/* Available Offers Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-bold">Available Offers</h2>
            <button className="flex items-center gap-2 text-text-muted text-sm hover:text-white transition-colors">
              <Filter size={14} />
              Filters
            </button>
          </div>

          {/* Offers List */}
          <div className="space-y-4 mb-16">
            {buyOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6 hover:border-accent-teal/40 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: offer.avatarBg }}
                      >
                        {offer.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{offer.username}</span>
                          {offer.isVerified && (
                            <div className="w-4 h-4 rounded-full bg-accent-teal flex items-center justify-center">
                              <span className="text-white text-[8px]">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Star size={10} className="text-yellow-400 fill-yellow-400" />
                          <span>{offer.rating}</span>
                          <span>·</span>
                          <span>{offer.trades} trades</span>
                          <span className="text-green-400">{offer.completion}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {offer.paymentMethods.map((method) => (
                        <span
                          key={method}
                          className="px-3 py-1 rounded-md bg-card-bg border border-card-border text-text-light text-xs"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price & Available */}
                  <div className="flex-1 lg:text-left">
                    <div className="text-text-muted text-xs mb-1">Price</div>
                    <div className="text-white text-xl font-bold mb-1">{offer.price}</div>
                    <div className="text-text-muted text-xs">Available</div>
                    <div className="text-text-light text-sm">{offer.available}</div>
                  </div>

                  {/* Limit & Time */}
                  <div className="flex-1 lg:text-left">
                    <div className="text-text-muted text-xs mb-1">Limit</div>
                    <div className="text-white text-sm font-medium mb-1">
                      {offer.limitMin} - {offer.limitMax}
                    </div>
                    <div className="flex items-center gap-1 text-text-muted text-xs">
                      <Clock size={12} />
                      Avg. {offer.avgTime}
                    </div>
                  </div>

                  {/* Buy Button */}
                  <div>
                    <button className="gradient-btn text-white font-medium px-8 py-3 rounded-xl hover:opacity-90 transition-opacity min-w-[120px]">
                      Buy BTC
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* How P2P Trading Works */}
          <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              How P2P Trading<span className="gradient-text">Works</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">
              {howItWorks.map((item) => (
                <div key={item.step} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full gradient-btn flex items-center justify-center text-white font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed max-w-xs">{item.desc}</p>
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
