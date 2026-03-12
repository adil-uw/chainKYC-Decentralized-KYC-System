import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listKycRequests } from '../api/kyc';
import { getStats } from '../api/provider';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LayoutDashboard,
  FileCheck,
  Award,
  Shield,
  XCircle,
  RefreshCw,
  ChevronRight,
  ClipboardList,
  KeyRound,
  Link2,
  ArrowRight,
} from 'lucide-react';

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenId, setScreenId] = useState('');
  const [credentialIdForPipeline, setCredentialIdForPipeline] = useState('');
  const [showSignInput, setShowSignInput] = useState(false);
  const [showRegisterInput, setShowRegisterInput] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqRes, statsRes] = await Promise.all([
        listKycRequests().catch(() => []),
        getStats(),
      ]);
      setRequests(Array.isArray(reqRes) ? reqRes : reqRes?.requests ?? reqRes?.items ?? []);
      setStats(statsRes);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = requests.filter((r) => (r.status || '').toLowerCase() === 'pending');
  const approved = requests.filter((r) => (r.status || '').toLowerCase() === 'approved');
  const rejected = requests.filter((r) => (r.status || '').toLowerCase() === 'rejected');

  const statCards = [
    {
      label: 'Total requests',
      value: stats?.totalRequests ?? requests.length,
      icon: FileCheck,
      color: 'text-accent-cyan',
      bg: 'bg-accent-cyan/10',
      border: 'border-accent-cyan/20',
    },
    {
      label: 'Pending',
      value: stats?.pending ?? pending.length,
      icon: LayoutDashboard,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Approved',
      value: stats?.approved ?? approved.length,
      icon: Shield,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'Rejected',
      value: stats?.rejected ?? rejected.length,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    ...(stats?.issuedCredentials != null
      ? [{ label: 'Issued credentials', value: stats.issuedCredentials, icon: Award, color: 'text-accent-teal', bg: 'bg-accent-teal/10', border: 'border-accent-teal/20' }]
      : []),
    ...(stats?.registeredCredentials != null
      ? [{ label: 'On-chain', value: stats.registeredCredentials, icon: Link2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }]
      : []),
    ...(stats?.revokedCredentials != null
      ? [{ label: 'Revoked', value: stats.revokedCredentials, icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' }]
      : []),
  ];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-accent-teal/20 border border-accent-teal/30">
              <LayoutDashboard className="w-8 h-8 text-accent-teal" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Provider Dashboard</h1>
          </div>
          <p className="text-gray-400 mt-1 ml-1">Manage KYC requests and the credential lifecycle.</p>
        </div>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2 self-start sm:self-center"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      {(stats || requests.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={`rounded-xl border p-5 transition-all duration-200 hover:border-opacity-60 ${bg} ${border}`}
            >
              <div className={`flex items-center gap-2 mb-2 ${color}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-100 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* KYC Requests table */}
      <div className="card overflow-hidden mb-8">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border">
          <ClipboardList className="w-5 h-5 text-accent-teal" />
          <h2 className="text-lg font-semibold text-gray-100">KYC Requests</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No requests yet. Backend may not be running or there is no data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-border">
                  <th className="pb-3 pr-4 font-medium">Request ID</th>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pl-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.kycRequestId ?? r.id ?? r._id}
                    className="border-b border-border/50 hover:bg-bg-muted/50 transition-colors"
                  >
                    <td className="py-3.5 pr-4 font-mono text-xs text-accent-cyan">
                      {r.kycRequestId ?? r.id ?? r._id}
                    </td>
                    <td className="py-3.5 pr-4 text-gray-300">{r.fullName ?? '—'}</td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link
                        to={`/provider/screen/${r.kycRequestId ?? r.id ?? r._id}`}
                        className="inline-flex items-center gap-1 text-accent-teal hover:text-accent-teal/80 font-medium"
                      >
                        View / Screen
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions: Screen by ID */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-100 mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Screen by KYC Request ID
        </h2>
        <p className="text-gray-400 text-sm mb-4">Run screening for a pending request.</p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={screenId}
            onChange={(e) => setScreenId(e.target.value)}
            placeholder="Paste KYC request ID"
            className="input-field font-mono flex-1 min-w-[200px]"
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={() => screenId.trim() && navigate(`/provider/screen/${screenId.trim()}`)}
            disabled={!screenId.trim()}
          >
            Go to screening
          </button>
        </div>
      </div>

      {/* Credential pipeline */}
      <div className="card border-accent-teal/30 bg-gradient-to-br from-bg-card to-bg-card/80 mb-8">
        <h2 className="text-lg font-semibold text-gray-100 mb-1 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-accent-teal" />
          Credential pipeline (Use cases 4, 5, 6)
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Issue a credential for an approved KYC, then hash & sign it, then register on-chain.
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Link
            to="/provider/issue"
            className="btn-primary inline-flex items-center gap-2 shrink-0"
          >
            1. Issue Credential (UC4)
            </Link>
          <ArrowRight className="w-4 h-4 text-gray-500 shrink-0 hidden sm:block" />
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 shrink-0"
            onClick={() => {
              setShowSignInput(true);
              setShowRegisterInput(false);
            }}
          >
            2. Hash & Sign (UC5)
          </button>
          <ArrowRight className="w-4 h-4 text-gray-500 shrink-0 hidden sm:block" />
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 shrink-0"
            onClick={() => {
              setShowRegisterInput(true);
              setShowSignInput(false);
            }}
          >
            3. Register on-chain (UC6)
          </button>
        </div>
        {(showSignInput || showRegisterInput) && (
          <div className="mt-6 pt-6 border-t border-border">
            <label className="block text-sm font-medium text-gray-400 mb-2">Credential ID</label>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text"
                value={credentialIdForPipeline}
                onChange={(e) => setCredentialIdForPipeline(e.target.value)}
                placeholder="e.g. cred_69afc80d8f732cf3dc562c90"
                className="input-field font-mono flex-1 min-w-[220px]"
              />
              {showSignInput && (
                <button
                  type="button"
                  className="btn-primary shrink-0"
                  onClick={() =>
                    credentialIdForPipeline.trim() &&
                    navigate(`/provider/sign/${credentialIdForPipeline.trim()}`)
                  }
                  disabled={!credentialIdForPipeline.trim()}
                >
                  Go to Hash & Sign
                </button>
              )}
              {showRegisterInput && (
                <button
                  type="button"
                  className="btn-primary shrink-0"
                  onClick={() =>
                    credentialIdForPipeline.trim() &&
                    navigate(`/provider/register/${credentialIdForPipeline.trim()}`)
                  }
                  disabled={!credentialIdForPipeline.trim()}
                >
                  Go to Register on-chain
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/provider/issue" className="btn-primary inline-flex items-center gap-2">
          Issue Credential
        </Link>
        <Link to="/verify" className="btn-secondary inline-flex items-center gap-2">
          Verify Credential
        </Link>
      </div>
    </div>
  );
}
