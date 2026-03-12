import { useState, useEffect } from 'react';
import { linkWallet } from '../api/kyc';
import { useAppStore } from '../store/appStore';
import { connectWallet, getConnectedAddress, isValidEthereumAddress, isMetaMaskAvailable } from '../lib/wallet';
import WalletCard from '../components/WalletCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

const METAMASK_INSTALL_URL = 'https://metamask.io/download/';

export default function ConnectWallet() {
  const storedKycId = useAppStore((s) => s.kycRequestId);
  const setWalletAddress = useAppStore((s) => s.setWalletAddress);
  const storedWallet = useAppStore((s) => s.walletAddress);
  const [kycRequestId, setKycRequestId] = useState(storedKycId || '');
  const [address, setAddress] = useState(storedWallet || '');
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (storedKycId && !kycRequestId) setKycRequestId(storedKycId);
  }, [storedKycId, kycRequestId]);

  useEffect(() => {
    if (storedWallet) setAddress(storedWallet);
    else getConnectedAddress().then((a) => { if (a) setAddress(a); });
  }, [storedWallet]);

  const handleConnect = async () => {
    if (!isMetaMaskAvailable()) {
      setToast({
        message: 'MetaMask not detected. Install the extension, then refresh this page.',
        variant: 'error',
      });
      return;
    }
    setConnecting(true);
    setToast(null);
    try {
      const { address: a } = await connectWallet();
      setAddress(a);
      setWalletAddress(a);
      setToast({ message: 'Wallet connected', variant: 'success' });
    } catch (err) {
      const msg = err?.message || 'Failed to connect';
      const isNotInstalled = /metamask|not installed|not detected/i.test(msg);
      setToast({
        message: isNotInstalled
          ? 'MetaMask not detected. Install the extension, then refresh this page.'
          : msg,
        variant: 'error',
      });
    } finally {
      setConnecting(false);
    }
  };

  const metamaskAvailable = isMetaMaskAvailable();

  const kycIdToUse = kycRequestId?.trim() || '';

  const handleLink = async () => {
    if (!isValidEthereumAddress(address)) {
      setToast({ message: 'Invalid Ethereum address', variant: 'error' });
      return;
    }
    if (!kycIdToUse) {
      setToast({ message: 'Enter your KYC Request ID (from KYC Status after approval).', variant: 'error' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      await linkWallet(kycIdToUse, address);
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
      <p className="text-gray-400 mb-6">Connect MetaMask and link your wallet to your approved KYC request. Your KYC Request ID is pre-filled if you came from KYC Status.</p>

      {!address ? (
        <div className="card">
          {metamaskAvailable ? (
            <>
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting && <LoadingSpinner className="w-4 h-4" />}
                Connect MetaMask
              </button>
              <p className="text-sm text-gray-500 mt-3">Make sure MetaMask is unlocked.</p>
            </>
          ) : (
            <div className="border border-amber-500/30 rounded-lg bg-amber-500/5 p-4 text-center">
              <p className="text-amber-400 font-medium mb-2">MetaMask not detected</p>
              <p className="text-gray-400 text-sm mb-4">
                Install the MetaMask browser extension to connect your wallet and link it to your KYC.
              </p>
              <a
                href={METAMASK_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30 font-medium text-sm"
              >
                Get MetaMask
              </a>
              <p className="text-xs text-gray-500 mt-3">After installing, refresh this page.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <WalletCard address={address} label="Connected wallet" />
          <div className="card mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">KYC Request ID</label>
              <input
                type="text"
                value={kycRequestId}
                onChange={(e) => setKycRequestId(e.target.value)}
                placeholder="Paste your approved KYC request ID (from KYC Status)"
                className="input-field font-mono w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Pre-filled from KYC Status when approved.</p>
            </div>
            {kycIdToUse ? (
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
              <p className="text-amber-400 text-sm">Enter your KYC Request ID above (get it from KYC Status after approval).</p>
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
