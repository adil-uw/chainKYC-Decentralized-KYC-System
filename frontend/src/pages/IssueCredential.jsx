import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listKycRequests } from '../api/kyc';
import { issueCredential } from '../api/credentials';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function IssueCredential() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [issued, setIssued] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    listKycRequests()
      .then((res) => setRequests(Array.isArray(res) ? res : res?.requests ?? res?.items ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  const approved = requests.filter((r) => (r.status || '').toLowerCase() === 'approved');

  const handleIssue = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setIssued(null);
    try {
      const data = await issueCredential(selectedId);
      setIssued(data);
      setToast({ message: 'Credential issued', variant: 'success' });
    } catch (err) {
      const msg = err.message || 'Issue failed';
      if (msg.includes('not found') || err.response?.status === 404) {
        setToast({ message: 'Request not found', variant: 'error' });
      } else if (msg.includes('approved') || err.response?.status === 403) {
        setToast({ message: 'Request not approved', variant: 'error' });
      } else if (msg.includes('wallet') || msg.includes('linked')) {
        setToast({ message: 'Wallet not linked to request', variant: 'error' });
      } else if (msg.includes('duplicate') || err.response?.status === 409) {
        setToast({ message: 'Credential already issued for this request', variant: 'error' });
      } else {
        setToast({ message: msg, variant: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/provider" className="text-gray-400 hover:text-gray-200">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-100">Issue Credential</h1>
      </div>

      <div className="card space-y-4">
        <p className="text-gray-400 text-sm">Select an approved KYC request to issue a credential.</p>
        {loading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : approved.length === 0 ? (
          <p className="text-gray-500">No approved requests. Approve a request from the dashboard first.</p>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-300">KYC Request</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-field"
            >
              <option value="">Select request</option>
              {approved.map((r) => (
                <option key={r.kycRequestId ?? r.id} value={r.kycRequestId ?? r.id}>
                  {r.kycRequestId ?? r.id} — {r.fullName ?? 'Unknown'}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={handleIssue}
              disabled={submitting || !selectedId}
            >
              {submitting && <LoadingSpinner className="w-4 h-4" />}
              Issue Credential
            </button>
          </>
        )}
      </div>

      {issued && (
        <div className="card mt-6 border border-status-success/30 bg-status-success/5">
          <h2 className="text-lg font-semibold text-gray-100 mb-3">Issued credential</h2>
          <dl className="grid gap-2 text-sm">
            {issued.credentialId != null && <><dt className="text-gray-500">Credential ID</dt><dd className="font-mono text-accent-cyan">{issued.credentialId}</dd></>}
            {issued.issuer != null && <><dt className="text-gray-500">Issuer</dt><dd className="font-mono text-gray-300">{issued.issuer}</dd></>}
            {issued.subjectWallet != null && <><dt className="text-gray-500">Subject wallet</dt><dd className="font-mono text-gray-300">{issued.subjectWallet}</dd></>}
            {issued.issuedAt != null && <><dt className="text-gray-500">Issued at</dt><dd className="text-gray-300">{new Date(issued.issuedAt).toLocaleString()}</dd></>}
            {issued.expiry != null && <><dt className="text-gray-500">Expiry</dt><dd className="text-gray-300">{new Date(issued.expiry).toLocaleString()}</dd></>}
          </dl>
          <Link to={`/provider/sign/${issued.credentialId ?? issued.id}`} className="btn-secondary mt-4 inline-block">
            Hash & Sign →
          </Link>
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
