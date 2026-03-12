import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCredentialStatus } from '../api/credentials';
import StatusBadge from '../components/StatusBadge';
import CopyButton from '../components/CopyButton';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function CredentialDetails() {
  const { credentialId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = async () => {
    if (!credentialId) return;
    setLoading(true);
    try {
      const res = await getCredentialStatus(credentialId);
      setData(res);
    } catch (err) {
      setToast({ message: err.message || 'Credential not found', variant: 'error' });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [credentialId]);

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
        <Link to="/my-credentials" className="btn-secondary mt-4 inline-block">Back to My Credentials</Link>
        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    );
  }

  const credJson = data.credential && (typeof data.credential === 'object' ? JSON.stringify(data.credential, null, 2) : data.credential);
  const signature = data.signature ?? data.signatureHex;
  const hash = data.credentialHash ?? data.hash;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Credential Details</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={load}>Refresh</button>
          <Link to="/my-credentials" className="btn-secondary">Back</Link>
          <Link to={`/provider/revoke/${credentialId}`} className="btn-danger text-sm">Revoke (Provider)</Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-sm text-gray-400">Credential ID</span>
            <CopyButton text={data.credentialId ?? data.id} />
          </div>
          <code className="text-sm text-accent-cyan font-mono break-all">{data.credentialId ?? data.id}</code>
        </div>

        <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-400">Status</span>
            <div className="mt-1"><StatusBadge status={data.status} /></div>
          </div>
          {data.issuer != null && (
            <div>
              <span className="text-sm text-gray-400">Issuer</span>
              <p className="font-mono text-sm text-gray-200 break-all">{data.issuer}</p>
            </div>
          )}
          {data.wallet != null && (
            <div>
              <span className="text-sm text-gray-400">Wallet</span>
              <p className="font-mono text-sm text-gray-200 break-all">{data.wallet}</p>
            </div>
          )}
          {data.issuedAt != null && (
            <div>
              <span className="text-sm text-gray-400">Issued at</span>
              <p className="text-gray-200">{new Date(data.issuedAt).toLocaleString()}</p>
            </div>
          )}
          {data.expiry != null && (
            <div>
              <span className="text-sm text-gray-400">Expiry</span>
              <p className="text-gray-200">{new Date(data.expiry).toLocaleString()}</p>
            </div>
          )}
          {data.registeredOnChain != null && (
            <div>
              <span className="text-sm text-gray-400">On-chain</span>
              <p className="text-gray-200">{data.registeredOnChain ? 'Yes' : 'No'}</p>
            </div>
          )}
          {data.revoked != null && (
            <div>
              <span className="text-sm text-gray-400">Revoked</span>
              <p className="text-gray-200">{data.revoked ? 'Yes' : 'No'}</p>
            </div>
          )}
          {data.transactionHash != null && (
            <div className="sm:col-span-2">
              <span className="text-sm text-gray-400">Transaction hash</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono break-all text-gray-300">{data.transactionHash}</code>
                <CopyButton text={data.transactionHash} />
              </div>
            </div>
          )}
          {data.signedAt != null && <div><span className="text-sm text-gray-400">Signed at</span><p className="text-gray-200">{new Date(data.signedAt).toLocaleString()}</p></div>}
          {data.registeredAt != null && <div><span className="text-sm text-gray-400">Registered at</span><p className="text-gray-200">{new Date(data.registeredAt).toLocaleString()}</p></div>}
          {data.revokedAt != null && <div><span className="text-sm text-gray-400">Revoked at</span><p className="text-gray-200">{new Date(data.revokedAt).toLocaleString()}</p></div>}
          {data.revocationReason != null && <div><span className="text-sm text-gray-400">Revocation reason</span><p className="text-gray-200">{data.revocationReason}</p></div>}
        </div>

        {hash && (
          <div className="card">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-gray-400">Credential hash</span>
              <CopyButton text={hash} />
            </div>
            <code className="text-xs font-mono break-all text-gray-300 block">{hash}</code>
          </div>
        )}

        {signature && (
          <div className="card">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-gray-400">Signature</span>
              <CopyButton text={signature} />
            </div>
            <code className="text-xs font-mono break-all text-gray-300 block">{signature}</code>
          </div>
        )}

        {credJson && (
          <div className="card">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-gray-400">Credential JSON</span>
              <CopyButton text={credJson} label="Copy JSON" />
            </div>
            <pre className="text-xs font-mono text-gray-300 overflow-auto max-h-64 rounded bg-bg-muted p-3">{credJson}</pre>
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
