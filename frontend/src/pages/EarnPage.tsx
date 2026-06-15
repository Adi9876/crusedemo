import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Wallet, ArrowRight, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface EarningProduct {
  icon: typeof Lock;
  iconColor: string;
  title: string;
  apyLabel: string;
  apy: string;
  description: string;
  features: string[];
}

const earningProducts: EarningProduct[] = [
  {
    icon: Lock,
    iconColor: '#01C6AC',
    title: 'Staking',
    apyLabel: 'APY',
    apy: 'Up to 12% APY',
    description: 'Earn rewards by holding and staking your crypto assets',
    features: ['Flexible & locked periods', 'Auto-compounding', 'Multiple coins supported'],
  },
  {
    icon: Wallet,
    iconColor: '#2EADFA',
    title: 'Savings',
    apyLabel: 'APY',
    apy: 'Up to 8% APY',
    description: 'High-yield savings accounts for your crypto holdings',
    features: ['Daily interest payouts', 'Withdraw anytime', 'Zero fees'],
  },
  {
    icon: Lock,
    iconColor: '#01C6AC',
    title: 'DeFi Yield',
    apyLabel: 'APY',
    apy: 'Up to 20% APY',
    description: 'Access decentralized finance opportunities easily',
    features: ['Liquidity pools', 'Yield farming', 'Expert managed'],
  },
  {
    icon: Wallet,
    iconColor: '#2EADFA',
    title: 'Dual Investment',
    apyLabel: 'APY',
    apy: 'Up to 30% APY',
    description: 'Advanced product linking returns to market performance',
    features: ['Higher potential returns', 'Structured products', 'Professional tools'],
  },
];

interface StakingOption {
  name: string;
  symbol: string;
  color: string;
  iconLetter: string;
  apy: string;
  minimum: string;
  lockPeriod: string;
}

const stakingOptions: StakingOption[] = [
  { name: 'Bitcoin', symbol: 'BTC', color: '#F7931A', iconLetter: 'B', apy: '5.2%', minimum: '0.001 BTC', lockPeriod: '30 days' },
  { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', iconLetter: 'E', apy: '6.8%', minimum: '0.01 ETH', lockPeriod: '60 days' },
  { name: 'Solana', symbol: 'SOL', color: '#9945FF', iconLetter: 'S', apy: '9.5%', minimum: '1 SOL', lockPeriod: '90 days' },
  { name: 'Cardano', symbol: 'ADA', color: '#0033AD', iconLetter: 'A', apy: '7.2%', minimum: '10 ADA', lockPeriod: '120 days' },
];

const steps = [
  { number: '01', title: 'Choose Product', description: 'Select staking or savings product that fits your goals' },
  { number: '02', title: 'Deposit Assets', description: 'Transfer your crypto to start earning immediately' },
  { number: '03', title: 'Earn Rewards', description: 'Watch your holdings grow with automatic rewards' },
];

export default function EarnPage() {
  const [_activeTab] = useState('staking');

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-[72px] relative overflow-hidden">
        <div className="absolute w-96 h-96 glow-teal rounded-full top-[176px] left-1/2 -translate-x-1/2" />
        <div className="absolute w-96 h-96 glow-blue rounded-full top-[516px] left-1/2 -translate-x-1/3" />

        <div className="max-w-[1280px] mx-auto px-6 pt-32 pb-24 text-center relative z-10">
          <div className="inline-block px-5 py-2 rounded-full bg-card-bg border border-accent-teal/20 mb-8">
            <span className="text-sm font-medium tracking-wider uppercase text-accent-teal">
              EARN REWARDS
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold text-white mb-0">
            Make Your Crypto
          </h1>
          <h1 className="text-5xl md:text-6xl lg:text-[96px] lg:leading-[120px] font-bold gradient-text mb-8">
            Work For You
          </h1>
          <p className="text-text-light text-lg md:text-xl leading-8 max-w-3xl mx-auto mb-2">
            Earn passive income on your crypto holdings with our flexible staking and savings products.
          </p>
          <p className="text-text-light text-lg md:text-xl leading-8 max-w-3xl mx-auto">
            Multiple options to suit your investment strategy.
          </p>
          <div className="mt-10">
            <Link to="/open-account" className="gradient-btn text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base inline-flex items-center gap-2">
              Start Earning <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Earning Products */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Earning<span className="gradient-text">Products</span>
          </h2>
          <p className="text-text-muted mt-4">Choose from multiple ways to grow your portfolio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {earningProducts.map((product) => (
            <div
              key={product.title}
              className="bg-card-bg border border-card-border rounded-2xl p-8 hover:border-accent-teal/30 transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${product.iconColor}20` }}
                >
                  <product.icon size={24} style={{ color: product.iconColor }} />
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-muted uppercase">{product.apyLabel}</span>
                  <p className="text-accent-teal font-bold text-lg">{product.apy}</p>
                </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{product.title}</h3>
              <p className="text-text-muted text-sm mb-4">{product.description}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {product.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-text-muted text-sm">
                    <Check size={14} className="text-accent-teal shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full gradient-btn text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity text-sm">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Staking Options */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Popular<span className="gradient-text">Staking Options</span>
          </h2>
          <p className="text-text-muted mt-4">Start earning rewards today with our top staking products</p>
        </div>

        <div className="space-y-4">
          {stakingOptions.map((option) => (
            <div
              key={option.symbol}
              className="bg-card-bg border border-card-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-accent-teal/30 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-[160px]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: option.color }}
                >
                  {option.iconLetter}
                </div>
                <div>
                  <p className="text-white font-semibold">{option.name}</p>
                  <p className="text-text-muted text-xs">{option.symbol}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-accent-teal font-bold text-lg">{option.apy}</p>
                <p className="text-text-muted text-xs">APY</p>
              </div>
              <div className="text-center">
                <p className="text-white font-medium">{option.minimum}</p>
                <p className="text-text-muted text-xs">Minimum</p>
              </div>
              <div className="text-center">
                <p className="text-white font-medium">{option.lockPeriod}</p>
                <p className="text-text-muted text-xs">Lock Period</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Staking Works */}
      <section className="max-w-[1280px] mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
            How <span className="gradient-text">Staking Works</span>
          </h2>
          <p className="text-text-muted mt-4">Start earning in 3 simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-16 h-16 rounded-full gradient-btn flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-lg">{step.number}</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-text-muted text-sm">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/open-account"
            className="gradient-btn text-white font-medium px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity text-base inline-block"
          >
            Start Earning Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
