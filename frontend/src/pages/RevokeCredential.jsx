import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCredentialStatus } from '../api/credentials';
import { revokeCredential } from '../api/credentials';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import Modal from '../components/Modal';

export default function RevokeCredential() {
  const { credentialId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    if (!credentialId) return;
    setLoading(true);
    try {
      const res = await getCredentialStatus(credentialId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [credentialId]);

  const handleRevoke = async () => {
    setSubmitting(true);
    try {
      await revokeCredential(credentialId, reason || undefined);
      setToast({ message: 'Credential revoked', variant: 'success' });
      setConfirmOpen(false);
      load();
    } catch (err) {
      const msg = err.message || 'Revocation failed';
      if (msg.includes('already') || err.response?.status === 400) {
        setToast({ message: 'Already revoked or not eligible', variant: 'error' });
      } else {
        setToast({ message: msg, variant: 'error' });
      }
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
        <p className="text-gray-400">Credential not found.</p>
        <Link to="/provider" className="btn-secondary mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  const alreadyRevoked = data.revoked === true;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/provider" className="text-gray-400 hover:text-gray-200">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-100">Revoke Credential</h1>
      </div>

      <div className="card space-y-4">
        <p className="text-sm text-gray-400">Credential ID: <code className="text-accent-cyan">{data.credentialId ?? data.id}</code></p>
        <p className="text-sm text-gray-400">Status: <span className={data.revoked ? 'text-red-400' : 'text-gray-300'}>{data.revoked ? 'Revoked' : 'Active'}</span></p>

        {!alreadyRevoked ? (
          <>
            <label className="block text-sm text-gray-400">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field"
              placeholder="e.g. User requested revocation"
            />
            <button
              type="button"
              className="btn-danger"
              onClick={() => setConfirmOpen(true)}
            >
              Revoke Credential
            </button>
          </>
        ) : (
          <div className="pt-2 border-t border-border">
            <span className="badge badge-revoked">Revoked</span>
            {data.revokedAt && <p className="text-sm text-gray-500 mt-2">Revoked at: {new Date(data.revokedAt).toLocaleString()}</p>}
            {data.revocationReason && <p className="text-sm text-gray-400 mt-1">Reason: {data.revocationReason}</p>}
            {data.revocationTxHash && <p className="text-xs font-mono text-gray-500 mt-1">Tx: {data.revocationTxHash}</p>}
          </div>
        )}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm revocation">
        <p className="text-gray-400 text-sm mb-4">This action cannot be undone. The credential will be marked as revoked on-chain.</p>
        <div className="flex gap-2">
          <button type="button" className="btn-danger" onClick={handleRevoke} disabled={submitting}>
            {submitting && <LoadingSpinner className="w-4 h-4 inline" />}
            Revoke
          </button>
          <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
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
