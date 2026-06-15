import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavLink {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: { label: string; href: string }[];
}

const navLinks: NavLink[] = [
  { label: 'Buy Crypto', href: '/buy-crypto' },
  { label: 'Market', href: '/markets' },
  {
    label: 'Trade',
    href: '#',
    hasDropdown: true,
    dropdownItems: [
      { label: 'Spot Trading', href: '/spot-trading' },
      { label: 'Pro Trading', href: '/pro-trading' },
      { label: 'P2P Trading', href: '/p2p' },
      { label: 'Demo Trading', href: '/demo-trading' },
    ],
  },
  { label: 'Features', href: '/features' },
  { label: 'Earn', href: '/earn' },
  {
    label: 'More',
    href: '#',
    hasDropdown: true,
    dropdownItems: [
      { label: 'Security', href: '/security' },
      { label: 'API', href: '/api' },
    ],
  },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-btn flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-white font-semibold text-lg">Cruse X</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8" ref={dropdownRef}>
          {navLinks.map((link) =>
            link.hasDropdown && link.dropdownItems ? (
              <div key={link.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)}
                  className="text-sm text-text-light hover:text-white transition-colors flex items-center gap-1"
                >
                  {link.label}
                  <ChevronDown size={14} className="text-text-muted" />
                </button>
                {openDropdown === link.label && (
                  <div className="absolute top-full left-0 mt-2 w-44 bg-primary-light border border-card-border rounded-xl shadow-xl overflow-hidden z-50">
                    {link.dropdownItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="block px-4 py-3 text-sm text-text-light hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setOpenDropdown(null)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : link.href.startsWith('/') && !link.href.startsWith('/#') ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm text-text-light hover:text-white transition-colors flex items-center gap-1"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-text-light hover:text-white transition-colors flex items-center gap-1"
              >
                {link.label}
              </a>
            )
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {user?.role === 'ADMIN' && (
                <div className="flex items-center gap-4 mr-2 border-r border-white/10 pr-4">
                  <Link to="/admin/withdrawals" className="text-xs text-yellow-500 hover:text-yellow-400 font-semibold transition-colors">
                    Withdrawals
                  </Link>
                  <Link to="/admin/kyc" className="text-xs text-yellow-500 hover:text-yellow-400 font-semibold transition-colors">
                    KYC Reviews
                  </Link>
                </div>
              )}
              <Link to="/dashboard" className="text-sm text-text-light hover:text-white transition-colors flex items-center gap-2">
                <User size={16} className="text-accent-teal" />
                <span className="max-w-[100px] truncate">{user?.firstName}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm text-text-light hover:text-white transition-colors flex items-center gap-1"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-text-light hover:text-white transition-colors">
                Log In
              </Link>
              <Link to="/open-account" className="gradient-btn text-white text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-primary border-t border-white/5 px-6 py-4 space-y-4">
          {navLinks.map((link) =>
            link.hasDropdown && link.dropdownItems ? (
              <div key={link.label}>
                <span className="block text-sm text-text-muted font-medium mb-2">{link.label}</span>
                {link.dropdownItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block text-sm text-text-light hover:text-white transition-colors pl-4 py-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : link.href.startsWith('/') && !link.href.startsWith('/#') ? (
              <Link
                key={link.label}
                to={link.href}
                className="block text-sm text-text-light hover:text-white transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm text-text-light hover:text-white transition-colors"
              >
                {link.label}
              </a>
            )
          )}
          <div className="pt-4 border-t border-white/10 space-y-3">
            {isAuthenticated ? (
              <>
                {user?.role === 'ADMIN' && (
                  <>
                    <Link to="/admin/withdrawals" className="block text-sm text-yellow-500 font-semibold" onClick={() => setMobileOpen(false)}>Admin Withdrawals</Link>
                    <Link to="/admin/kyc" className="block text-sm text-yellow-500 font-semibold" onClick={() => setMobileOpen(false)}>Admin KYC Reviews</Link>
                  </>
                )}
                <Link to="/dashboard" className="block text-sm text-text-light" onClick={() => setMobileOpen(false)}>Dashboard ({user?.firstName})</Link>
                <button onClick={handleLogout} className="block text-sm text-text-light">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-sm text-text-light" onClick={() => setMobileOpen(false)}>Log In</Link>
                <Link to="/open-account" className="block w-full gradient-btn text-white text-sm font-medium px-5 py-2.5 rounded-full text-center" onClick={() => setMobileOpen(false)}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
