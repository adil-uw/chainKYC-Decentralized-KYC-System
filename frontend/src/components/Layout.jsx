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
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border bg-bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-1 py-3">
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
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
