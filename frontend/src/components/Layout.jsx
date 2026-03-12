import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  FileCheck,
  ClipboardList,
  Wallet,
  Award,
  ShieldCheck,
  LayoutDashboard,
  TestTube,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { connectWallet, getConnectedAddress, onAccountsChanged, isMetaMaskAvailable } from '../lib/wallet';

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/submit-kyc', label: 'Submit KYC', icon: FileCheck },
  { to: '/kyc-status', label: 'KYC Status', icon: ClipboardList },
  { to: '/connect-wallet', label: 'Connect Wallet', icon: Wallet },
  { to: '/my-credentials', label: 'My Credentials', icon: Award },
  { to: '/provider', label: 'Provider Dashboard', icon: LayoutDashboard },
  { to: '/verify', label: 'Verify Credential', icon: ShieldCheck },
  { to: '/test-cases', label: 'API Scenarios', icon: TestTube },
];

export default function Layout({ children }) {
  const walletAddress = useAppStore((s) => s.walletAddress);
  const setWalletAddress = useAppStore((s) => s.setWalletAddress);
  const clearWalletAddress = useAppStore((s) => s.clearWalletAddress);
  const [connecting, setConnecting] = useState(false);
  const [metaMaskAvailable, setMetaMaskAvailable] = useState(false);

  useEffect(() => {
    setMetaMaskAvailable(isMetaMaskAvailable());
    getConnectedAddress().then((addr) => {
      if (addr) setWalletAddress(addr);
    });
  }, [setWalletAddress]);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAccountsChanged((addr) => {
        if (addr) setWalletAddress(addr);
        else clearWalletAddress();
      });
    } catch (_) {}
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [setWalletAddress, clearWalletAddress]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (_) {
      // Error can be shown via toast on Connect Wallet page if needed
    } finally {
      setConnecting(false);
    }
  };

  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ minHeight: '100vh', backgroundColor: '#0a0e17' }}>
      <header className="border-b border-border bg-bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex flex-wrap items-center gap-1">
              {nav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent-teal/20 text-accent-teal'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-bg-elevated'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {metaMaskAvailable ? (
                walletAddress ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border">
                    <Wallet className="w-4 h-4 text-accent-teal" />
                    <span className="font-mono text-sm text-gray-200">{shortAddress}</span>
                    <button
                      type="button"
                      onClick={clearWalletAddress}
                      className="text-xs text-gray-500 hover:text-gray-300"
                      title="Disconnect"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    <Wallet className="w-4 h-4" />
                    {connecting ? 'Connecting…' : 'Connect MetaMask'}
                  </button>
                )
              ) : (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-medium transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Install MetaMask
                </a>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children != null ? children : <p className="text-gray-400">Loading…</p>}
      </main>
    </div>
  );
}
