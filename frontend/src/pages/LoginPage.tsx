import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Shield, Zap, BarChart3 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const whyGoLive = [
  { icon: Shield, title: 'Enhanced Security', desc: 'Bank-level encryption and 2FA protection', color: 'bg-accent-teal' },
  { icon: Zap, title: 'Instant Trading', desc: 'Execute trades in milliseconds', color: 'bg-green-500' },
  { icon: BarChart3, title: 'Advanced Tools', desc: 'Access professional trading features', color: 'bg-accent-blue' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const verified = searchParams.get('verified');
  const verifyError = searchParams.get('error');

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-8 pb-20">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold">
              Welcome<span className="gradient-text">Back</span>
            </h1>
            <p className="text-text-muted mt-3">
              Log in to your Cruse X account to continue trading
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 max-w-4xl mx-auto">
            {/* Why Go Live Sidebar */}
            <div className="w-full lg:w-72 space-y-6">
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Cruse X Benefits</h3>
                <div className="space-y-4">
                  {whyGoLive.map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                        <item.icon size={18} className="text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{item.title}</div>
                        <div className="text-text-muted text-xs">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Form Area */}
            <div className="flex-1 bg-[#002849] border border-accent-teal/20 rounded-2xl p-8">
              <h2 className="text-white text-xl font-bold mb-1">Log In</h2>
              <p className="text-text-muted text-sm mb-6">
                Enter your email and password to access your dashboard
              </p>

              {verified === 'true' && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                  Email verified successfully! You can now log in.
                </div>
              )}

              {verified === 'false' && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {verifyError || 'Email verification failed. The link may have expired or is invalid.'}
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="text-text-light text-sm mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    <label className="text-text-light text-sm block">Password</label>
                    <Link to="#" className="text-accent-teal text-xs hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gradient-btn text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Logging in...' : 'Log In'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-text-muted text-sm">
                  Don't have an account?{' '}
                  <Link to="/open-account" className="text-accent-teal font-semibold hover:underline">
                    Create one here
                  </Link>
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
