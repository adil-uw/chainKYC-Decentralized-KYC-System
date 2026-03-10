import { Wallet } from 'lucide-react';
import CopyButton from './CopyButton';

export default function WalletCard({ address, label = 'Connected wallet' }) {
  if (!address) return null;
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div className="card flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent-teal/20 text-accent-teal">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="font-mono text-sm text-gray-200">{short}</p>
        </div>
      </div>
      <CopyButton text={address} label="Copy" />
    </div>
  );
}
