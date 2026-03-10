import { useState } from 'react';
import { verifyCredential } from '../api/credentials';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function VerifyCredential() {
  const [credentialInput, setCredentialInput] = useState('');
  const [signatureInput, setSignatureInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleVerify = async () => {
    let cred;
    try {
      cred = credentialInput.trim() ? JSON.parse(credentialInput.trim()) : null;
    } catch {
      setToast({ message: 'Invalid JSON for credential', variant: 'error' });
      return;
    }
    if (!cred) {
      setToast({ message: 'Paste credential JSON', variant: 'error' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await verifyCredential({
        credential: cred,
        signature: signatureInput.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      setResult({
        verificationStatus: 'error',
        message: err.message || 'Verification failed',
        signatureValid: false,
        registeredOnChain: false,
        revoked: false,
        expired: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const status = result?.verificationStatus ?? result?.valid;
  const isValid = status === 'valid' || status === true;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Verify Credential</h1>
      <p className="text-gray-400 mb-6">Paste credential JSON and signature to verify.</p>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Credential JSON</label>
          <textarea
            value={credentialInput}
            onChange={(e) => setCredentialInput(e.target.value)}
            placeholder='{"credentialId":"...", ...}'
            className="input-field font-mono text-sm min-h-[140px]"
            rows={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Signature (optional if embedded)</label>
          <input
            type="text"
            value={signatureInput}
            onChange={(e) => setSignatureInput(e.target.value)}
            placeholder="0x..."
            className="input-field font-mono text-sm"
          />
        </div>
        <button
          type="button"
          className="btn-primary flex items-center gap-2"
          onClick={handleVerify}
          disabled={loading || !credentialInput.trim()}
        >
          {loading && <LoadingSpinner className="w-4 h-4" />}
          Verify
        </button>
      </div>

      {result && (
        <div
          className={`card mt-6 border-2 ${
            isValid ? 'border-status-success/50 bg-status-success/5' : 'border-status-error/50 bg-status-error/5'
          }`}
        >
          <h2 className="text-lg font-semibold text-gray-100 mb-3">Result</h2>
          <p className={`font-medium mb-3 ${isValid ? 'text-status-success' : 'text-status-error'}`}>
            {result.message ?? (isValid ? 'Valid' : 'Invalid')}
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {result.credentialHash != null && <><dt className="text-gray-500">Hash</dt><dd className="font-mono break-all text-gray-300">{result.credentialHash}</dd></>}
            {result.signatureValid != null && <><dt className="text-gray-500">Signature</dt><dd className={result.signatureValid ? 'text-green-400' : 'text-red-400'}>{result.signatureValid ? 'Valid' : 'Invalid'}</dd></>}
            {result.registeredOnChain != null && <><dt className="text-gray-500">On-chain</dt><dd className="text-gray-300">{result.registeredOnChain ? 'Yes' : 'No'}</dd></>}
            {result.revoked != null && <><dt className="text-gray-500">Revoked</dt><dd className="text-gray-300">{result.revoked ? 'Yes' : 'No'}</dd></>}
            {result.expired != null && <><dt className="text-gray-500">Expired</dt><dd className="text-gray-300">{result.expired ? 'Yes' : 'No'}</dd></>}
          </dl>
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
