import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, RefreshCw, User, Mail, Phone, Calendar, MapPin, ExternalLink, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { api } from '../lib/api';

interface KycDocument {
  id: string;
  type: 'PASSPORT' | 'ID_CARD' | 'DRIVER_LICENSE' | 'SELFIE';
  fileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
}

interface PendingKycUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  profile?: {
    addressLine1?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    kycStatus: string;
  } | null;
  kycDocuments: KycDocument[];
}

export default function AdminKycPage() {
  const [users, setUsers] = useState<PendingKycUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  
  // Track which user is currently being rejected (to show inline reason box)
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPendingKyc = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: PendingKycUser[] }>('/api/v1/admin/kyc');
      setUsers(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending KYC reviews. Admin permissions required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingKyc();
  }, []);

  const handleApprove = async (userId: string) => {
    setActionInProgress(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/api/v1/admin/kyc/${userId}/approve`, {});
      setSuccessMsg('KYC approved successfully');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      setError(err.message || 'Failed to approve KYC');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setActionInProgress(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/api/v1/admin/kyc/${userId}/reject`, { reason: rejectionReason });
      setSuccessMsg('KYC rejected successfully');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setRejectingUserId(null);
      setRejectionReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to reject KYC');
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (dateStr: string | Date | undefined | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-primary">
      <Navbar />

      <section className="pt-[72px]">
        <div className="max-w-[1280px] mx-auto px-6 pt-10 pb-20">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-text-muted text-sm hover:text-white transition-colors mb-6">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold">
                <span className="gradient-text">Admin</span> Dashboard
              </h1>
              <p className="text-text-muted mt-2">Manage user identity verification submissions</p>
            </div>
            <button 
              onClick={fetchPendingKyc} 
              className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-card-bg border border-card-border text-text-light hover:text-white hover:border-accent-teal/40 transition-colors text-sm"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Admin Sub-navigation */}
          <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
            <Link
              to="/admin/withdrawals"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors text-text-muted hover:text-white"
            >
              Withdrawals Manager
            </Link>
            <Link
              to="/admin/kyc"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors bg-accent-teal/15 text-accent-teal border border-accent-teal/30"
            >
              KYC Submissions
            </Link>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
              <Check size={16} /> {successMsg}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Queue Count */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Pending Queue <span className="text-sm text-text-muted">({users.length} submissions)</span>
            </h2>
          </div>

          {/* KYC List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6 animate-pulse h-64" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-12 text-center">
              <p className="text-text-muted text-lg">No pending KYC submissions to review</p>
            </div>
          ) : (
            <div className="space-y-6">
              {users.map((u) => (
                <div key={u.id} className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                  {/* User Profile Info Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 border-b border-white/5">
                    {/* Column 1: Basic Info */}
                    <div>
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <User size={18} className="text-accent-teal" />
                        {u.firstName} {u.lastName}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-text-muted" />
                          <span className="text-text-light">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-text-muted" />
                            <span className="text-text-light">{u.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-text-muted" />
                          <span className="text-text-light">DOB: {formatDate(u.dateOfBirth)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Address Info */}
                    <div>
                      <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <MapPin size={14} className="text-text-muted" />
                        Address Details
                      </h4>
                      <div className="space-y-1.5 text-sm text-text-light">
                        <div>{u.profile?.addressLine1 || 'N/A'}</div>
                        <div>
                          {u.profile?.city && <span>{u.profile.city}, </span>}
                          {u.profile?.postalCode && <span>{u.profile.postalCode}</span>}
                        </div>
                        <div>{u.profile?.country || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Column 3: Summary Metadata */}
                    <div className="flex flex-col justify-between items-start lg:items-end">
                      <div className="text-sm">
                        <span className="text-text-muted">User ID: </span>
                        <span className="font-mono text-xs text-text-light bg-card-bg px-2 py-1 rounded-md border border-card-border">{u.id}</span>
                      </div>
                      <div className="mt-4 lg:mt-0">
                        <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          Status: {u.profile?.kycStatus || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="py-6">
                    <h4 className="text-white/80 font-semibold mb-4">Submitted Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {u.kycDocuments.map((doc) => (
                        <div key={doc.id} className="bg-card-bg border border-card-border rounded-xl p-4 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white text-sm font-semibold">{doc.type.replace('_', ' ')}</span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                doc.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                {doc.status}
                              </span>
                            </div>
                            <div className="text-text-muted text-xs">Uploaded {formatDate(doc.createdAt)}</div>
                          </div>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white font-medium border border-white/5 hover:border-white/10 transition-colors"
                          >
                            View Document <ExternalLink size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-6 border-t border-white/5">
                    {rejectingUserId === u.id ? (
                      <div className="bg-card-bg border border-red-500/20 rounded-xl p-4 space-y-4">
                        <div>
                          <label className="text-red-400 text-sm font-medium mb-1 block">Specify Rejection Reason</label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., ID card image blurry, details mismatch, expired document"
                            className="w-full p-3 rounded-lg bg-primary border border-card-border text-white text-sm focus:outline-none focus:border-red-500/40"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setRejectingUserId(null);
                              setRejectionReason('');
                            }}
                            className="px-4 py-2 bg-white/5 border border-card-border hover:bg-white/10 text-white rounded-lg text-sm transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(u.id)}
                            disabled={actionInProgress === u.id}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setRejectingUserId(u.id);
                            setRejectionReason('');
                          }}
                          disabled={actionInProgress === u.id}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                          <X size={14} /> Reject Submission
                        </button>
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionInProgress === u.id}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                          <Check size={14} /> Approve KYC
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
