import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, RefreshCw, ToggleLeft, ToggleRight, Shield, Users, Download, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { api } from '../lib/api';

interface WithdrawalItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  currency: string;
  amount: string;
  fee: string;
  network: string;
  toAddress: string;
  txHash?: string | null;
  status: string;
  reviewedBy?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface AdminStats {
  pendingWithdrawals: number;
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  autoApprovalEnabled: boolean;
}

export default function AdminWithdrawalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [autoApproval, setAutoApproval] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'pending' ? '/api/v1/admin/withdrawals/pending' : '/api/v1/admin/withdrawals';
      const [wdRes, statsRes, toggleRes] = await Promise.all([
        api.get<{ success: boolean; data: WithdrawalItem[] }>(endpoint),
        api.get<{ success: boolean; data: AdminStats }>('/api/v1/admin/stats'),
        api.get<{ success: boolean; data: { enabled: boolean } }>('/api/v1/admin/settings/auto-approval'),
      ]);
      setWithdrawals(wdRes.data);
      setStats(statsRes.data);
      setAutoApproval(toggleRes.data.enabled);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data. Make sure your account has ADMIN role.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleApprove = async (id: string) => {
    setActionInProgress(id);
    setSuccessMsg(null);
    try {
      await api.post(`/api/v1/admin/withdrawals/${id}/approve`, {});
      setSuccessMsg(`Withdrawal ${id.slice(0, 8)}... approved`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionInProgress(id);
    setSuccessMsg(null);
    try {
      await api.post(`/api/v1/admin/withdrawals/${id}/reject`, {});
      setSuccessMsg(`Withdrawal ${id.slice(0, 8)}... rejected`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleAutoApproval = async () => {
    try {
      const res = await api.post<{ success: boolean; data: { enabled: boolean } }>(
        '/api/v1/admin/settings/auto-approval',
        { enabled: !autoApproval }
      );
      setAutoApproval(res.data.enabled);
      setSuccessMsg(`Auto-approval ${res.data.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle');
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

  const statusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-400/10 text-green-400';
      case 'REJECTED': return 'bg-red-400/10 text-red-400';
      case 'PENDING_REVIEW': return 'bg-yellow-400/10 text-yellow-400';
      case 'PROCESSING': return 'bg-accent-teal/10 text-accent-teal';
      default: return 'bg-card-border text-text-muted';
    }
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
              <p className="text-text-muted mt-2">Manage withdrawal requests and platform settings</p>
            </div>
            <button onClick={fetchData} className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-card-bg border border-card-border text-text-light hover:text-white hover:border-accent-teal/40 transition-colors text-sm">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Admin Sub-navigation */}
          <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
            <Link
              to="/admin/withdrawals"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors bg-accent-teal/15 text-accent-teal border border-accent-teal/30"
            >
              Withdrawals Manager
            </Link>
            <Link
              to="/admin/kyc"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors text-text-muted hover:text-white"
            >
              KYC Submissions
            </Link>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-center gap-2">
              <Check size={16} />{successMsg}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
          )}

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
                  <Shield size={14} className="text-yellow-400" />
                  <span>Pending</span>
                </div>
                <div className="text-white text-3xl font-bold">{stats.pendingWithdrawals}</div>
              </div>
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
                  <Users size={14} className="text-accent-teal" />
                  <span>Users</span>
                </div>
                <div className="text-white text-3xl font-bold">{stats.totalUsers}</div>
              </div>
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
                  <Download size={14} className="text-green-400" />
                  <span>Total Deposits</span>
                </div>
                <div className="text-white text-3xl font-bold">{stats.totalDeposits}</div>
              </div>
              <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
                  <Upload size={14} className="text-red-400" />
                  <span>Total Withdrawals</span>
                </div>
                <div className="text-white text-3xl font-bold">{stats.totalWithdrawals}</div>
              </div>
            </div>
          )}

          {/* Auto-Approval Toggle */}
          <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">Auto-Approval Mode</h3>
                <p className="text-text-muted text-sm mt-1">
                  {autoApproval
                    ? 'Withdrawals are automatically approved and processed immediately.'
                    : 'Withdrawals require manual admin review before processing.'}
                </p>
              </div>
              <button
                onClick={handleToggleAutoApproval}
                className="flex items-center gap-2 transition-colors"
              >
                {autoApproval ? (
                  <ToggleRight size={40} className="text-green-400" />
                ) : (
                  <ToggleLeft size={40} className="text-text-muted" />
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'gradient-btn text-white'
                  : 'bg-card-bg border border-card-border text-text-light hover:text-white'
              }`}
            >
              Pending Review {stats ? `(${stats.pendingWithdrawals})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'gradient-btn text-white'
                  : 'bg-card-bg border border-card-border text-text-light hover:text-white'
              }`}
            >
              All Withdrawals
            </button>
          </div>

          {/* Withdrawals List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6 animate-pulse h-24" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-12 text-center">
              <p className="text-text-muted text-lg">
                {activeTab === 'pending' ? 'No pending withdrawals' : 'No withdrawal records'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="bg-[#002849] border border-accent-teal/20 rounded-2xl p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-bold text-lg">{w.amount} {w.currency}</span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${statusColor(w.status)}`}>
                          {w.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-text-muted">User: </span>
                          <span className="text-text-light">{w.userName}</span>
                          <span className="text-text-muted text-xs ml-1">({w.userEmail})</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Network: </span>
                          <span className="text-text-light">{w.network}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Fee: </span>
                          <span className="text-text-light">{w.fee} {w.currency}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="text-text-muted">To: </span>
                        <span className="text-text-light font-mono text-xs">{w.toAddress}</span>
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        Requested {formatTimeAgo(w.createdAt)}
                        {w.txHash && <span> · TX: {w.txHash.slice(0, 16)}...</span>}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    {w.status === 'PENDING_REVIEW' && (
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => handleApprove(w.id)}
                          disabled={actionInProgress === w.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 font-medium text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(w.id)}
                          disabled={actionInProgress === w.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-medium text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          <X size={14} /> Reject
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
