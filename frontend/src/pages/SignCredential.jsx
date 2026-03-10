import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCredential } from '../api/credentials';
import { signCredential } from '../api/credentials';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import CopyButton from '../components/CopyButton';

export default function SignCredential() {
  const { credentialId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    if (!credentialId) return;
    setLoading(true);
    try {
      const res = await getCredential(credentialId);
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

  const handleSign = async () => {
    setSubmitting(true);
    try {
      const result = await signCredential(credentialId);
      setData((prev) => ({ ...prev, ...result }));
      setToast({ message: 'Credential signed', variant: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Signing failed', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const alreadySigned = data?.signature ?? data?.credentialHash;

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

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/provider" className="text-gray-400 hover:text-gray-200">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-100">Hash & Sign Credential</h1>
      </div>

      <div className="card space-y-4">
        <p className="text-sm text-gray-400">Credential ID: <code className="text-accent-cyan">{data.credentialId ?? data.id}</code></p>
        {!alreadySigned ? (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleSign}
            disabled={submitting}
          >
            {submitting && <LoadingSpinner className="w-4 h-4" />}
            Hash & Sign
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-green-400 text-sm font-medium">Signed</p>
            {data.credentialHash && (
              <div>
                <span className="text-sm text-gray-400">Credential hash</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono break-all text-gray-300">{data.credentialHash}</code>
                  <CopyButton text={data.credentialHash} />
                </div>
              </div>
            )}
            {data.signature && (
              <div>
                <span className="text-sm text-gray-400">Signature</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono break-all text-gray-300">{data.signature}</code>
                  <CopyButton text={data.signature} />
                </div>
              </div>
            )}
            {data.signedAt && <p className="text-sm text-gray-500">Signed at: {new Date(data.signedAt).toLocaleString()}</p>}
            <Link to={`/provider/register/${credentialId}`} className="btn-primary inline-block">
              Register On-Chain →
            </Link>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
