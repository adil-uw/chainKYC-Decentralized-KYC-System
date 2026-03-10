import { Link } from 'react-router-dom';
import { FileCheck, ClipboardList, Wallet, Award, ShieldCheck, LayoutDashboard } from 'lucide-react';

const links = [
  { to: '/submit-kyc', label: 'Start KYC', icon: FileCheck },
  { to: '/kyc-status', label: 'Check KYC Status', icon: ClipboardList },
  { to: '/connect-wallet', label: 'Connect Wallet', icon: Wallet },
  { to: '/my-credentials', label: 'My Credentials', icon: Award },
  { to: '/verify', label: 'Verify Credential', icon: ShieldCheck },
  { to: '/provider', label: 'Provider Dashboard', icon: LayoutDashboard },
];

export default function Landing() {
  return (
    <div className="animate-fade-in">
      <section className="text-center py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
          ChainKYC
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Blockchain-based reusable KYC verification. Verify once, use everywhere.
        </p>
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

      <section className="card max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">How it works</h2>
        <ul className="space-y-3 text-gray-400 text-sm">
          <li>• <strong className="text-gray-300">Raw KYC data</strong> remains off-chain for privacy.</li>
          <li>• <strong className="text-gray-300">Credential JSON</strong> is created off-chain after approval.</li>
          <li>• Only the <strong className="text-gray-300">credential hash</strong> is stored on-chain.</li>
          <li>• Verifiers can validate credentials without repeating full KYC.</li>
        </ul>
      </section>
    </div>
  );
}
