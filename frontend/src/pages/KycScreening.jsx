import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getKycRequest, screenKycRequest } from '../api/kyc';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import Modal from '../components/Modal';

export default function KycScreening() {
  const { kycRequestId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const load = async () => {
    if (!kycRequestId) return;
    setLoading(true);
    try {
      const res = await getKycRequest(kycRequestId);
      setData(Array.isArray(res) ? res[0] : res);
    } catch (err) {
      setToast({ message: err.message || 'Request not found', variant: 'error' });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [kycRequestId]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await screenKycRequest(kycRequestId, { approved: true });
      setToast({ message: 'Request approved', variant: 'success' });
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to approve', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await screenKycRequest(kycRequestId, { approved: false, reason: rejectReason || undefined });
      setToast({ message: 'Request rejected', variant: 'success' });
      setConfirmRevoke(null);
      setRejectReason('');
      load();
    } catch (err) {
      setToast({ message: err.message || 'Failed to reject', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-gray-400">Request not found.</p>
        <Link to="/provider" className="btn-secondary mt-4 inline-block">Back to Dashboard</Link>
        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    );
  }

  const status = (data.status || '').toLowerCase();
  const canScreen = status === 'pending';

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/provider" className="text-gray-400 hover:text-gray-200">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-100">KYC Screening</h1>
      </div>

      <div className="card space-y-4 mb-6">
        <div>
          <span className="text-sm text-gray-400">Request ID</span>
          <p className="font-mono text-accent-cyan">{data.kycRequestId ?? data.id}</p>
        </div>
        <div>
          <span className="text-sm text-gray-400">Status</span>
          <div className="mt-1"><StatusBadge status={data.status} /></div>
        </div>
        {data.fullName != null && <div><span className="text-sm text-gray-400">Name</span><p className="text-gray-200">{data.fullName}</p></div>}
        {data.email != null && <div><span className="text-sm text-gray-400">Email</span><p className="text-gray-200">{data.email}</p></div>}
        {data.rejectionReason != null && (
          <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/30">
            <p className="text-sm text-status-error">Rejection reason: {data.rejectionReason}</p>
          </div>
        )}
      </div>

      {canScreen && (
        <div className="card flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleApprove}
            disabled={submitting}
          >
            {submitting && <LoadingSpinner className="w-4 h-4" />}
            Approve
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setConfirmRevoke('reject')}
            disabled={submitting}
          >
            Reject
          </button>
        </div>
      )}

      <Modal
        open={confirmRevoke === 'reject'}
        onClose={() => setConfirmRevoke(null)}
        title="Reject request"
      >
        <div className="space-y-3">
          <label className="block text-sm text-gray-400">Reason (optional)</label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="input-field"
            placeholder="e.g. Blacklisted SSN"
          />
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-danger" onClick={handleReject} disabled={submitting}>
              {submitting ? <LoadingSpinner className="w-4 h-4 inline" /> : 'Reject'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmRevoke(null)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
