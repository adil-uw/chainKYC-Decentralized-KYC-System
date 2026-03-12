import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { screenKycRequest } from '../api/kyc';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function KycScreening() {
  const { kycRequestId } = useParams();
  const [screeningResult, setScreeningResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleRunScreening = async () => {
    if (!kycRequestId) return;
    setSubmitting(true);
    setScreeningResult(null);
    try {
      const result = await screenKycRequest(kycRequestId);
      setScreeningResult(result);
      setToast({ message: 'Screening complete', variant: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Screening failed', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/provider" className="text-gray-400 hover:text-gray-200">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-100">KYC Screening</h1>
      </div>

      <div className="card space-y-4 mb-6">
        <div>
          <span className="text-sm text-gray-400">KYC Request ID</span>
          <p className="font-mono text-accent-cyan">{kycRequestId}</p>
        </div>
        <p className="text-gray-400 text-sm">
          Run screening against the blacklist. The backend will set status to approved or rejected.
        </p>
        <button
          type="button"
          className="btn-primary flex items-center gap-2"
          onClick={handleRunScreening}
          disabled={submitting}
        >
          {submitting && <LoadingSpinner className="w-4 h-4" />}
          Run screening
        </button>
      </div>

      {screeningResult && (
        <div className="card border-border space-y-3">
          <h2 className="text-lg font-semibold text-gray-100">Screening result</h2>
          <div>
            <span className="text-sm text-gray-400">Status</span>
            <div className="mt-1"><StatusBadge status={screeningResult.status} /></div>
          </div>
          {(screeningResult.reason ?? screeningResult.rejectionReason) != null && (
            <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/30">
              <p className="text-sm text-status-error">Rejection reason: {screeningResult.reason ?? screeningResult.rejectionReason}</p>
            </div>
          )}
          {screeningResult.message != null && (
            <p className="text-sm text-gray-400">{screeningResult.message}</p>
          )}
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
