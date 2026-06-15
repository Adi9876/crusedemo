import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, BarChart3, Lock, User, Mail, Phone, Calendar, MapPin, Lock as LockIcon, Camera, Upload, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const steps = [
  { num: 1, label: 'Personal Information', sub: 'Provide your basic details' },
  { num: 2, label: 'Identity Verification', sub: 'Upload your ID documents' },
  { num: 3, label: 'Account Setup', sub: 'Complete your profile' },
];

const whyGoLive = [
  { icon: Shield, title: 'Enhanced Security', desc: 'Bank-level encryption and 2FA protection', color: 'bg-accent-teal' },
  { icon: Zap, title: 'Instant Trading', desc: 'Execute trades in milliseconds', color: 'bg-green-500' },
  { icon: BarChart3, title: 'Advanced Tools', desc: 'Access professional trading features', color: 'bg-accent-blue' },
];

export default function OpenAccountPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const { register, isAuthenticated, user, checkAuth } = useAuth();
  const navigate = useNavigate();

  const isVerificationOnly = isAuthenticated && user;

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill for existing users
  useEffect(() => {
    if (isVerificationOnly && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if (user.dateOfBirth) {
        setDob(new Date(user.dateOfBirth).toISOString().split('T')[0]);
      }
      if (user.profile) {
        setAddress(user.profile.addressLine1 || '');
        setCity(user.profile.city || '');
        setPostalCode(user.profile.postalCode || '');
        setCountry(user.profile.country || '');
      }
      // Start at step 2 for existing users
      setCurrentStep(2);
    }
  }, [isVerificationOnly, user]);

  // File states for Step 2
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idType] = useState<'PASSPORT' | 'ID_CARD' | 'DRIVER_LICENSE'>('ID_CARD');

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 3));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!agreed) {
      setError('You must agree to the terms');
      return;
    }
    if (!isVerificationOnly && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (!isVerificationOnly) {
        await register({
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth: dob,
          addressLine1: address,
          city,
          postalCode,
          country,
          password,
        });
      } else {
        // Update profile for existing user
        await api.put('/api/v1/user/profile', {
          firstName,
          lastName,
          phone,
          dateOfBirth: dob,
          addressLine1: address,
          city,
          postalCode,
          country,
        });
      }

      // Upload KYC documents
      if (idFront) {
        await api.post('/api/v1/user/kyc/upload', {
          type: idType,
          fileUrl: `https://mock-storage.com/${idFront.name}`,
        });
      }
      if (idBack) {
        await api.post('/api/v1/user/kyc/upload', {
          type: idType,
          fileUrl: `https://mock-storage.com/${idBack.name}`,
        });
      }
      if (selfie) {
        await api.post('/api/v1/user/kyc/upload', {
          type: 'SELFIE',
          fileUrl: `https://mock-storage.com/${selfie.name}`,
        });
      }

      // Refresh the user state so the Dashboard sees the updated kycStatus
      await checkAuth();

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please try again.');
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
            to="/demo-trading"
            className="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Demo Trading</span>
          </Link>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold">
              {isVerificationOnly ? 'Verify Your' : 'Open Your'}
              <span className="gradient-text">{isVerificationOnly ? ' Identity' : ' Live Account'}</span>
            </h1>
            <p className="text-text-muted mt-3">
              {isVerificationOnly 
                ? 'Complete your verification to access all platform features' 
                : 'Start trading with real funds in just a few minutes'}
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center mb-12">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 ${
                      currentStep > step.num
                        ? 'gradient-btn text-white'
                        : currentStep === step.num
                        ? 'gradient-btn text-white'
                        : 'bg-card-bg border border-card-border text-text-muted'
                    }`}
                  >
                    {currentStep > step.num ? <Check size={18} /> : step.num}
                  </div>
                  <div className="text-white text-xs font-semibold text-center">{step.label}</div>
                  <div className="text-text-muted text-[10px] text-center">{step.sub}</div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-20 md:w-32 h-0.5 mx-4 mb-8 ${
                    currentStep > step.num ? 'bg-accent-teal' : 'bg-card-border'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Why Go Live Sidebar */}
            <div className="w-full lg:w-72 space-y-6">
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Why Go Live?</h3>
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

              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={18} className="text-red-400" />
                  <h3 className="text-white font-semibold">Your Data is Safe</h3>
                </div>
                <p className="text-text-muted text-sm mb-3">
                  We use bank-level encryption to protect your personal information. Your data is never shared with third parties.
                </p>
                <ul className="space-y-1.5">
                  {['256-bit SSL encryption', 'SOC 2 Type II certified', 'GDPR compliant'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-text-light text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Main Form Area */}
            <div className="flex-1 bg-[#002849] border border-accent-teal/20 rounded-2xl p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <>
                  <h2 className="text-white text-xl font-bold mb-1">Personal Information</h2>
                  <p className="text-text-muted text-sm mb-6">
                    Please provide your legal name as it appears on your ID
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-text-light text-sm mb-2 block">First Name *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                          placeholder="John"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-text-light text-sm mb-2 block">Last Name *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                          placeholder="Smith"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">Email Address *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                        placeholder="john.smith@example.com"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">Phone Number *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="text-text-light text-sm mb-2 block">Date of Birth *</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                      />
                    </div>
                  </div>

                  <button
                    onClick={goNext}
                    className="w-full gradient-btn text-white font-medium py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Continue to Verification
                  </button>
                </>
              )}

              {/* Step 2: Identity Verification */}
              {currentStep === 2 && (
                <>
                  <h2 className="text-white text-xl font-bold mb-1">Identity Verification</h2>
                  <p className="text-text-muted text-sm mb-6">
                    Upload a government-issued ID to verify your identity
                  </p>

                  {/* Accepted Documents */}
                  <div className="bg-card-bg border border-card-border rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className="text-accent-teal" />
                      <span className="text-white font-semibold text-sm">Accepted Documents</span>
                    </div>
                    <ul className="space-y-1 text-text-light text-sm ml-6">
                      <li>• Passport</li>
                      <li>• Driver's License</li>
                      <li>• National ID Card</li>
                    </ul>
                  </div>

                  {/* ID Front */}
                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">ID Front Side *</label>
                    <label className="border-2 border-dashed border-card-border rounded-xl p-8 text-center hover:border-accent-teal/40 transition-colors cursor-pointer block">
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setIdFront(e.target.files?.[0] || null)}
                        accept="image/*,.pdf"
                      />
                      <Camera size={32} className={`mx-auto mb-2 ${idFront ? 'text-accent-teal' : 'text-text-muted'}`} />
                      <div className="text-text-light text-sm font-medium">
                        {idFront ? `Selected: ${idFront.name}` : 'Click to upload or drag and drop'}
                      </div>
                      <div className="text-text-muted text-xs mt-1">PNG, JPG or PDF (max. 10MB)</div>
                    </label>
                  </div>

                  {/* ID Back */}
                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">ID Back Side *</label>
                    <label className="border-2 border-dashed border-card-border rounded-xl p-8 text-center hover:border-accent-teal/40 transition-colors cursor-pointer block">
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setIdBack(e.target.files?.[0] || null)}
                        accept="image/*,.pdf"
                      />
                      <Camera size={32} className={`mx-auto mb-2 ${idBack ? 'text-accent-teal' : 'text-text-muted'}`} />
                      <div className="text-text-light text-sm font-medium">
                        {idBack ? `Selected: ${idBack.name}` : 'Click to upload or drag and drop'}
                      </div>
                      <div className="text-text-muted text-xs mt-1">PNG, JPG or PDF (max. 10MB)</div>
                    </label>
                  </div>

                  {/* Selfie */}
                  <div className="mb-8">
                    <label className="text-text-light text-sm mb-2 block">Selfie with ID *</label>
                    <label className="border-2 border-dashed border-card-border rounded-xl p-8 text-center hover:border-accent-teal/40 transition-colors cursor-pointer block">
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                        accept="image/*"
                      />
                      <Upload size={32} className={`mx-auto mb-2 ${selfie ? 'text-accent-teal' : 'text-text-muted'}`} />
                      <div className="text-text-light text-sm font-medium">
                        {selfie ? `Selected: ${selfie.name}` : 'Upload a selfie holding your ID'}
                      </div>
                      <div className="text-text-muted text-xs mt-1">Make sure your face and ID are clearly visible</div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={goBack}
                      className="py-3.5 rounded-xl bg-card-bg border border-card-border text-white font-medium hover:bg-white/10 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={goNext}
                      className="py-3.5 rounded-xl gradient-btn text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      Continue to Setup
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Account Setup */}
              {currentStep === 3 && (
                <>
                  <h2 className="text-white text-xl font-bold mb-1">Complete Your Profile</h2>
                  <p className="text-text-muted text-sm mb-6">
                    Set up your account password and address
                  </p>

                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">Address *</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                        placeholder="123 Main Street, Apt 4B"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-text-light text-sm mb-2 block">City *</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="text-text-light text-sm mb-2 block">Postal Code *</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-text-light text-sm mb-2 block">Country *</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                      placeholder="United States"
                    />
                  </div>

                  {!isVerificationOnly && (
                    <>
                      <div className="mb-5">
                        <label className="text-text-light text-sm mb-2 block">Password *</label>
                        <div className="relative">
                          <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                          />
                        </div>
                        <p className="text-text-muted text-xs mt-1">
                          Must be at least 8 characters with uppercase, lowercase, and numbers
                        </p>
                      </div>

                      <div className="mb-5">
                        <label className="text-text-light text-sm mb-2 block">Confirm Password *</label>
                        <div className="relative">
                          <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-card-bg border border-card-border text-white text-sm focus:outline-none focus:border-accent-teal/40"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mb-8">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-card-border bg-card-bg text-accent-teal focus:ring-accent-teal"
                      />
                      <span className="text-text-muted text-sm">
                        I agree and confirm that my information will be verified and stored securely.
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={goBack}
                      disabled={isSubmitting}
                      className="py-3.5 rounded-xl bg-card-bg border border-card-border text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="py-3.5 rounded-xl gradient-btn text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSubmitting ? (isVerificationOnly ? 'Submitting...' : 'Creating...') : (isVerificationOnly ? 'Complete Verification' : 'Create Live Account')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
