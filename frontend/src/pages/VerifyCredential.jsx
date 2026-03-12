import { useState } from 'react';
import { verifyCredential } from '../api/credentials';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import CopyButton from '../components/CopyButton';

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
    if (!signatureInput.trim()) {
      setToast({ message: 'Signature is required', variant: 'error' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await verifyCredential({
        credential: cred,
        signature: signatureInput.trim(),
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
      <p className="text-gray-400 mb-6">Paste credential JSON and signature (Use Case 7). Response JSON can be copied or downloaded to verify the user later.</p>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Credential JSON</label>
          <textarea
            value={credentialInput}
            onChange={(e) => setCredentialInput(e.target.value)}
            placeholder='{"credentialId":"cred_001","issuer":"KYCProvider","subjectWallet":"0x...","identityVerified":true,"idType":"ssn","issuedAt":"2026-03-07T22:00:00Z","expiry":"2027-03-07T22:00:00Z","status":"active"}'
            className="input-field font-mono text-sm min-h-[140px]"
            rows={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Signature (required)</label>
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
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
            {result.credentialHash != null && <><dt className="text-gray-500">Hash</dt><dd className="font-mono break-all text-gray-300">{result.credentialHash}</dd></>}
            {result.signatureValid != null && <><dt className="text-gray-500">Signature</dt><dd className={result.signatureValid ? 'text-green-400' : 'text-red-400'}>{result.signatureValid ? 'Valid' : 'Invalid'}</dd></>}
            {result.registeredOnChain != null && <><dt className="text-gray-500">On-chain</dt><dd className="text-gray-300">{result.registeredOnChain ? 'Yes' : 'No'}</dd></>}
            {result.revoked != null && <><dt className="text-gray-500">Revoked</dt><dd className="text-gray-300">{result.revoked ? 'Yes' : 'No'}</dd></>}
            {result.expired != null && <><dt className="text-gray-500">Expired</dt><dd className="text-gray-300">{result.expired ? 'Yes' : 'No'}</dd></>}
          </dl>
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-gray-400 mb-2">Verification result (JSON) — copy or download to verify the user later</p>
            <pre className="bg-bg-muted rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto mb-2 max-h-40 overflow-y-auto">
              {JSON.stringify({
                credentialHash: result.credentialHash,
                signatureValid: result.signatureValid,
                registeredOnChain: result.registeredOnChain,
                revoked: result.revoked,
                expired: result.expired,
                verificationStatus: result.verificationStatus ?? (isValid ? 'valid' : 'invalid'),
                message: result.message,
              }, null, 2)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <CopyButton
                text={JSON.stringify({
                  credentialHash: result.credentialHash,
                  signatureValid: result.signatureValid,
                  registeredOnChain: result.registeredOnChain,
                  revoked: result.revoked,
                  expired: result.expired,
                  verificationStatus: result.verificationStatus ?? (isValid ? 'valid' : 'invalid'),
                  message: result.message,
                })}
                label="Copy JSON"
              />
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify({
                    credentialHash: result.credentialHash,
                    signatureValid: result.signatureValid,
                    registeredOnChain: result.registeredOnChain,
                    revoked: result.revoked,
                    expired: result.expired,
                    verificationStatus: result.verificationStatus ?? (isValid ? 'valid' : 'invalid'),
                    message: result.message,
                  }, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `verification-result-${result.credentialHash?.slice(0, 18) ?? 'cred'}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-bg-elevated border border-border text-gray-300 hover:border-accent-teal/50 text-sm transition-colors"
              >
                Download JSON
              </button>
            </div>
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
