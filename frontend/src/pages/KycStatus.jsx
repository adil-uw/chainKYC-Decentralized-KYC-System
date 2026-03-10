import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getKycRequest } from '../api/kyc';
import { useAppStore } from '../store/appStore';
import { getStoredKycRequestId } from '../store/appStore';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function KycStatus() {
  const storedId = useAppStore((s) => s.kycRequestId) ?? getStoredKycRequestId();
  const [kycRequestId, setKycRequestId] = useState(storedId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchStatus = async () => {
    if (!kycRequestId?.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const res = await getKycRequest(kycRequestId.trim());
      setData(Array.isArray(res) ? res[0] : res);
    } catch (err) {
      setToast({ message: err.message || 'Request not found', variant: 'error' });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storedId && !kycRequestId) setKycRequestId(storedId);
  }, [storedId, kycRequestId]);

  const status = data?.status?.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">KYC Status</h1>
      <p className="text-gray-400 mb-6">Enter your KYC request ID to check status.</p>

      <div className="card space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">KYC Request ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={kycRequestId}
              onChange={(e) => setKycRequestId(e.target.value)}
              placeholder="Paste or enter request ID"
              className="input-field flex-1"
            />
            <button type="button" className="btn-primary" onClick={fetchStatus} disabled={loading || !kycRequestId?.trim()}>
              {loading ? <LoadingSpinner className="w-5 h-5" /> : 'Check'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-400">Request ID</span>
            <code className="text-sm text-accent-cyan font-mono">{data.kycRequestId ?? data.id}</code>
          </div>
          {data.fullName != null && (
            <div>
              <span className="text-sm text-gray-400">Name</span>
              <p className="text-gray-200">{data.fullName}</p>
            </div>
          )}
          <div>
            <span className="text-sm text-gray-400">Status</span>
            <div className="mt-1">
              <StatusBadge status={data.status} />
            </div>
          </div>
          {data.rejectionReason && (
            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/30">
              <p className="text-sm text-status-error">Rejection reason: {data.rejectionReason}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            {status === 'approved' && (
              <Link to="/connect-wallet" className="btn-primary inline-block">
                Connect Wallet
              </Link>
            )}
            {status === 'rejected' && (
              <p className="text-gray-400 text-sm">
                You can submit a new KYC request from the Submit KYC page.
              </p>
            )}
            {status === 'pending' && (
              <p className="text-gray-400 text-sm">Your request is under review. Check back later.</p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
