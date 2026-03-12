import { useState, useEffect, useRef } from 'react';
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

  const [notFound, setNotFound] = useState(false);
  const didAutoFetch = useRef(false);

  const [errorType, setErrorType] = useState(null); // 'network' | 'not_found' | 'server'

  const fetchStatus = async () => {
    if (!kycRequestId?.trim()) return;
    setLoading(true);
    setData(null);
    setNotFound(false);
    setErrorType(null);
    try {
      const res = await getKycRequest(kycRequestId.trim());
      setData(Array.isArray(res) ? res[0] : res);
      setNotFound(false);
      setErrorType(null);
    } catch (err) {
      setData(null);
      setNotFound(true);
      const status = err.response?.status;
      const msg = (err.message || '').toLowerCase();
      if (status === 404 || msg.includes('not found')) {
        setErrorType('not_found');
        setToast({ message: 'KYC request not found for this ID.', variant: 'error' });
      } else if (status != null && status >= 500) {
        setErrorType('server');
        setToast({ message: err.message || 'Server error. Check backend logs.', variant: 'error' });
      } else {
        setErrorType('network');
        setToast({ message: err.message || 'Backend not reachable.', variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storedId && !kycRequestId) setKycRequestId(storedId);
  }, [storedId, kycRequestId]);

  // Auto-fetch once when page loads with a pre-filled ID (e.g. after redirect from Submit KYC)
  useEffect(() => {
    const id = kycRequestId?.trim();
    if (id && !didAutoFetch.current) {
      didAutoFetch.current = true;
      fetchStatus();
    }
  }, [kycRequestId]);

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

      {notFound && (
        <div className="card border-amber-500/40 bg-amber-500/5 space-y-4">
          <p className="text-amber-400 font-medium">
            {errorType === 'network' ? 'Backend not reachable' : errorType === 'server' ? 'Server error' : 'KYC request not found'}
          </p>
          <p className="text-gray-400 text-sm">
            That request ID doesn’t exist or the backend may not have a status endpoint yet. </p>
          <p className="text-gray-400 text-sm mt-2"><strong>1. Start the backend</strong> (if not already running): open a terminal, run <code className="bg-bg-muted px-1 rounded">cd backend</code> then <code className="bg-bg-muted px-1 rounded">uvicorn main:app --reload</code>. Check <a href="http://localhost:8000/api/health" target="_blank" rel="noopener noreferrer" className="text-accent-teal hover:underline">http://localhost:8000/api/health</a> returns <code className="bg-bg-muted px-1 rounded">{"{ \"status\": \"ok\" }"}</code>.</p>
          <p className="text-gray-400 text-sm"><strong>2. Submit a new KYC</strong> using the button below (the current ID may have been created when the backend was off or on a different DB). After submit you will be redirected here and the new ID will be checked automatically.</p>
          <Link to="/submit-kyc" className="btn-primary inline-block mt-2">
            Submit KYC
          </Link>
        </div>
      )}

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
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Next: link your wallet to this request so you can receive credentials.</p>
                <Link to="/connect-wallet" className="btn-primary inline-flex items-center gap-2">
                  Connect Wallet
                </Link>
              </div>
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
