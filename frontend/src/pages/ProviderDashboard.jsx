import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listKycRequests } from '../api/kyc';
import { getStats } from '../api/provider';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { LayoutDashboard, FileCheck, Award, Shield } from 'lucide-react';

export default function ProviderDashboard() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Provider Dashboard</h1>
      <p className="text-gray-400 mb-6">Manage KYC requests and credential lifecycle.</p>

      {(stats || requests.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <FileCheck className="w-4 h-4" />
              <span className="text-sm">Total requests</span>
            </div>
            <p className="text-2xl font-semibold text-gray-100">{stats?.totalRequests ?? requests.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm">Pending</span>
            </div>
            <p className="text-2xl font-semibold text-gray-100">{stats?.pending ?? pending.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Approved</span>
            </div>
            <p className="text-2xl font-semibold text-gray-100">{stats?.approved ?? approved.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <span className="text-sm">Rejected</span>
            </div>
            <p className="text-2xl font-semibold text-gray-100">{stats?.rejected ?? rejected.length}</p>
          </div>
          {stats != null && (
            <>
              {stats.issuedCredentials != null && (
                <div className="card">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Award className="w-4 h-4" />
                    <span className="text-sm">Issued</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-100">{stats.issuedCredentials}</p>
                </div>
              )}
              {stats.registeredCredentials != null && (
                <div className="card">
                  <span className="text-sm text-gray-400">On-chain</span>
                  <p className="text-2xl font-semibold text-gray-100">{stats.registeredCredentials}</p>
                </div>
              )}
              {stats.revokedCredentials != null && (
                <div className="card">
                  <span className="text-sm text-gray-400">Revoked</span>
                  <p className="text-2xl font-semibold text-gray-100">{stats.revokedCredentials}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">KYC Requests</h2>
          <button type="button" className="btn-secondary text-sm" onClick={load} disabled={loading}>
            {loading ? <LoadingSpinner className="w-4 h-4 inline" /> : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-gray-500 py-6 text-center">No requests. Backend may not be running or no data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-gray-400">
                  <th className="pb-2 pr-4">Request ID</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.kycRequestId ?? r.id ?? r._id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-accent-cyan">{r.kycRequestId ?? r.id ?? r._id}</td>
                    <td className="py-3 pr-4 text-gray-300">{r.fullName ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        to={`/provider/screen/${r.kycRequestId ?? r.id ?? r._id}`}
                        className="text-accent-teal hover:underline"
                      >
                        View / Screen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/provider/issue" className="btn-primary">Issue Credential</Link>
        <Link to="/verify" className="btn-secondary">Verify Credential</Link>
      </div>
    </div>
  );
}
