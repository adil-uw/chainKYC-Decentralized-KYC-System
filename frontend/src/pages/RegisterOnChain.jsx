import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCredential } from '../api/credentials';
import { registerCredentialOnChain } from '../api/credentials';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import CopyButton from '../components/CopyButton';

export default function RegisterOnChain() {
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

  const handleRegister = async () => {
    setSubmitting(true);
    try {
      const result = await registerCredentialOnChain(credentialId);
      setData((prev) => ({ ...prev, ...result, registeredOnChain: true }));
      setToast({ message: 'Registered on-chain', variant: 'success' });
    } catch (err) {
      const msg = err.message || 'Registration failed';
      if (msg.includes('already') || err.response?.status === 409) {
        setToast({ message: 'Already registered on-chain', variant: 'error' });
      } else if (msg.includes('blockchain') || msg.includes('RPC') || err.response?.status === 502) {
        setToast({ message: 'Blockchain/RPC error. Check network.', variant: 'error' });
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

  const registered = data.registeredOnChain === true;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/provider" className="text-gray-400 hover:text-gray-200">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-100">Register On-Chain</h1>
      </div>

      <div className="card space-y-4">
        <p className="text-sm text-gray-400">Credential ID: <code className="text-accent-cyan">{data.credentialId ?? data.id}</code></p>
        {data.credentialHash && <p className="text-sm text-gray-400">Hash: <code className="font-mono text-xs break-all">{data.credentialHash}</code></p>}
        {data.expiry && <p className="text-sm text-gray-400">Expiry: {new Date(data.expiry).toLocaleString()}</p>}
        {data.issuer && <p className="text-sm text-gray-400">Issuer: <code className="font-mono text-xs">{data.issuer}</code></p>}

        {!registered ? (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleRegister}
            disabled={submitting}
          >
            {submitting && <LoadingSpinner className="w-4 h-4" />}
            Register On-Chain
          </button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-border">
            <span className="badge badge-success">Registered</span>
            {data.transactionHash && (
              <div>
                <span className="text-sm text-gray-400">Transaction hash</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono break-all text-gray-300">{data.transactionHash}</code>
                  <CopyButton text={data.transactionHash} />
                </div>
              </div>
            )}
            {data.registeredAt && <p className="text-sm text-gray-500">Registered at: {new Date(data.registeredAt).toLocaleString()}</p>}
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
