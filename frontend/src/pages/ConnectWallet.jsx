import { useState, useEffect } from 'react';
import { linkWallet } from '../api/kyc';
import { useAppStore } from '../store/appStore';
import { connectWallet, getConnectedAddress, isValidEthereumAddress } from '../lib/wallet';
import WalletCard from '../components/WalletCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

export default function ConnectWallet() {
  const kycRequestId = useAppStore((s) => s.kycRequestId);
  const setWalletAddress = useAppStore((s) => s.setWalletAddress);
  const [address, setAddress] = useState('');
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getConnectedAddress().then((a) => {
      if (a) setAddress(a);
    });
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address: a } = await connectWallet();
      setAddress(a);
      setWalletAddress(a);
      setToast({ message: 'Wallet connected', variant: 'success' });
    } catch (err) {
      setToast({ message: err.message || 'Failed to connect', variant: 'error' });
    } finally {
      setConnecting(false);
    }
  };

  const handleLink = async () => {
    if (!isValidEthereumAddress(address)) {
      setToast({ message: 'Invalid Ethereum address', variant: 'error' });
      return;
    }
    if (!kycRequestId?.trim()) {
      setToast({ message: 'No KYC request ID. Complete KYC and use the link from KYC Status.', variant: 'error' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      await linkWallet(kycRequestId.trim(), address);
      setLinked(true);
      setWalletAddress(address);
      setToast({ message: 'Wallet linked successfully', variant: 'success' });
    } catch (err) {
      const msg = err.message || 'Linking failed';
      if (msg.includes('approved') || err.response?.status === 403) {
        setToast({ message: 'Request not approved yet. Wait for KYC approval.', variant: 'error' });
      } else if (msg.includes('already') || err.response?.status === 409) {
        setToast({ message: 'Wallet already linked to another request.', variant: 'error' });
      } else {
        setToast({ message: msg, variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Connect Wallet</h1>
      <p className="text-gray-400 mb-6">Connect MetaMask and link your wallet to your approved KYC request.</p>

      {!address ? (
        <div className="card">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting && <LoadingSpinner className="w-4 h-4" />}
            Connect MetaMask
          </button>
          <p className="text-sm text-gray-500 mt-3">Make sure MetaMask is installed.</p>
        </div>
      ) : (
        <>
          <WalletCard address={address} label="Connected wallet" />
          <div className="card mt-4">
            <p className="text-sm text-gray-400 mb-2">
              KYC Request ID used for linking: <code className="text-accent-cyan">{kycRequestId || '—'}</code>
            </p>
            {kycRequestId ? (
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={handleLink}
                disabled={loading}
              >
                {loading && <LoadingSpinner className="w-4 h-4" />}
                {linked ? 'Linked' : 'Link wallet to KYC'}
              </button>
            ) : (
              <p className="text-amber-400 text-sm">Submit KYC and get approved first, then return here from KYC Status.</p>
            )}
          </div>
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
