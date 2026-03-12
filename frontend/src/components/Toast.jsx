import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Toast({ message, variant = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    variant === 'error'
      ? 'bg-status-error/20 border-status-error/50'
      : variant === 'success'
      ? 'bg-status-success/20 border-status-success/50'
      : 'bg-bg-elevated border-border';

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border ${bg} shadow-lg animate-fade-in`}
    >
      <span className="text-sm text-gray-200">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-white/10 text-gray-400"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
