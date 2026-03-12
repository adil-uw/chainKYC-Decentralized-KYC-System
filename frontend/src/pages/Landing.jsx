import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ClipboardList, Wallet, Award, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { connectWallet, getConnectedAddress, isMetaMaskAvailable } from '../lib/wallet';

const links = [
  { to: '/submit-kyc', label: 'Start KYC', icon: FileCheck },
  { to: '/kyc-status', label: 'Check KYC Status', icon: ClipboardList },
  { to: '/connect-wallet', label: 'Connect Wallet', icon: Wallet },
  { to: '/my-credentials', label: 'My Credentials', icon: Award },
  { to: '/verify', label: 'Verify Credential', icon: ShieldCheck },
  { to: '/provider', label: 'Provider Dashboard', icon: LayoutDashboard },
];

export default function Landing() {
  const walletAddress = useAppStore((s) => s.walletAddress);
  const setWalletAddress = useAppStore((s) => s.setWalletAddress);
  const clearWalletAddress = useAppStore((s) => s.clearWalletAddress);
  const [connecting, setConnecting] = useState(false);
  const [metaMaskAvailable, setMetaMaskAvailable] = useState(false);

  useEffect(() => {
    setMetaMaskAvailable(isMetaMaskAvailable());
  }, []);

  useEffect(() => {
    if (!walletAddress) getConnectedAddress().then((a) => a && setWalletAddress(a));
  }, [walletAddress, setWalletAddress]);

  const handleConnect = async () => {
    if (!isMetaMaskAvailable()) return;
    setConnecting(true);
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (_) {}
    finally {
      setConnecting(false);
    }
  };

  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '';

  return (
    <div className="animate-fade-in">
      <section className="text-center py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
          ChainKYC
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Blockchain-based reusable KYC verification. Verify once, use everywhere.
        </p>

        {/* Connect MetaMask — prominent on landing */}
        <div className="max-w-md mx-auto mb-10">
          {metaMaskAvailable ? (
            walletAddress ? (
              <div className="card border-accent-teal/40 bg-accent-teal/5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Wallet className="w-6 h-6 text-accent-teal shrink-0" />
                <span className="font-mono text-gray-200">Connected: {shortAddress}</span>
                <div className="flex gap-2">
                  <Link to="/connect-wallet" className="btn-secondary text-sm">Link to KYC</Link>
                  <button
                    type="button"
                    onClick={clearWalletAddress}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-bg-elevated border border-border text-gray-300 hover:bg-bg-muted hover:text-gray-100 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="w-full card border-accent-teal/40 bg-accent-teal/10 hover:bg-accent-teal/20 flex items-center justify-center gap-3 py-4 transition-colors disabled:opacity-60"
              >
                <Wallet className="w-6 h-6 text-accent-teal" />
                <span className="font-medium text-accent-teal">
                  {connecting ? 'Connecting…' : 'Connect MetaMask'}
                </span>
              </button>
            )
          ) : (
            <div className="card border-amber-500/30 bg-amber-500/5 text-center py-4">
              <p className="text-amber-400 text-sm font-medium mb-1">MetaMask not detected</p>
              <p className="text-gray-400 text-xs">
                Install the <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-accent-teal hover:underline">MetaMask extension</a> to connect your wallet.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="card flex items-center gap-4 hover:border-accent-teal/50 transition-colors group"
          >
            <div className="p-3 rounded-lg bg-accent-teal/20 text-accent-teal group-hover:bg-accent-teal/30 transition-colors">
              <Icon className="w-6 h-6" />
            </div>
            <span className="font-medium text-gray-200 group-hover:text-accent-teal transition-colors">
              {label}
            </span>
          </Link>
        ))}
      </section>

      <section className="card max-w-3xl mx-auto mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">How it works</h2>
        <ul className="space-y-3 text-gray-400 text-sm">
          <li>• <strong className="text-gray-300">Raw KYC data</strong> remains off-chain for privacy.</li>
          <li>• <strong className="text-gray-300">Credential JSON</strong> is created off-chain after approval.</li>
          <li>• Only the <strong className="text-gray-300">credential hash</strong> is stored on-chain.</li>
          <li>• Verifiers can validate credentials without repeating full KYC.</li>
        </ul>
      </section>

      <section className="card max-w-3xl mx-auto border-accent-cyan/30 bg-accent-cyan/5">
        <p className="text-sm text-gray-300 mb-1">
          <strong className="text-accent-cyan">Backend required for Submit KYC and API features.</strong>
        </p>
        <p className="text-xs text-gray-500 font-mono">
          In a terminal: <code className="text-gray-400">cd backend && uvicorn main:app --reload</code>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Then the backend runs at <span className="text-gray-400">http://localhost:8000</span>. This frontend proxies <code className="text-gray-400">/api</code> to it.
        </p>
      </section>
    </div>
  );
}
