import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listCredentialsByWallet } from '../api/credentials';
import { useAppStore } from '../store/appStore';
import { getConnectedAddress } from '../lib/wallet';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { Award } from 'lucide-react';

export default function MyCredentials() {
  const storedWallet = useAppStore((s) => s.walletAddress);
  const [wallet, setWallet] = useState(storedWallet || '');
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCredentials = async () => {
    if (!wallet?.trim()) return;
    setLoading(true);
    setCredentials(null);
    setToast(null);
    try {
      const data = await listCredentialsByWallet(wallet.trim());
      setCredentials(Array.isArray(data?.credentials) ? data.credentials : data?.credentials ?? []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      const isNotFound = err.response?.status === 404 || /no credentials found|not found for this wallet/i.test(msg);
      if (isNotFound) {
        setCredentials([]);
      } else {
        setToast({ message: msg || 'Failed to load credentials', variant: 'error' });
        setCredentials([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storedWallet) getConnectedAddress().then((a) => a && setWallet(a));
    else setWallet(storedWallet);
  }, [storedWallet]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">My Credentials</h1>
      <p className="text-gray-400 mb-6">View credentials for a wallet address.</p>

      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Wallet address</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="input-field flex-1 font-mono text-sm"
          />
          <button type="button" className="btn-primary" onClick={fetchCredentials} disabled={loading || !wallet?.trim()}>
            {loading ? <LoadingSpinner className="w-5 h-5" /> : 'Load'}
          </button>
        </div>
      </div>

      {credentials && (
        <>
          {credentials.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <Award className="w-12 h-12 mb-3 text-gray-500 opacity-50" />
              <p className="text-gray-400 font-medium">No credentials found for this wallet.</p>
              <p className="text-gray-500 text-sm mt-2 max-w-md">
                Credentials appear here after you: 1) Submit KYC and get approved, 2) Link this wallet on Connect Wallet, 3) A provider issues a credential for your request (Provider Dashboard → Issue Credential).
              </p>
              <div className="flex gap-2 mt-4">
                <Link to="/submit-kyc" className="btn-secondary text-sm">Submit KYC</Link>
                <Link to="/connect-wallet" className="btn-secondary text-sm">Connect Wallet</Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {credentials.map((c) => (
                <div key={c.credentialId ?? c.id} className="card flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <code className="text-sm text-accent-cyan font-mono">{c.credentialId ?? c.id}</code>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={c.status} />
                      {c.revoked && <span className="badge badge-revoked">Revoked</span>}
                    </div>
                    {c.issuedAt && <p className="text-xs text-gray-500 mt-1">Issued: {new Date(c.issuedAt).toLocaleString()}</p>}
                  </div>
                  <Link
                    to={`/credentials/${c.credentialId ?? c.id}`}
                    className="btn-secondary text-sm"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
