export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  let cls = 'badge';
  if (s === 'pending') cls += ' badge-pending';
  else if (s === 'approved') cls += ' badge-approved';
  else if (s === 'rejected') cls += ' badge-rejected';
  else if (s === 'revoked') cls += ' badge-revoked';
  else if (s === 'issued' || s === 'active') cls += ' badge-success';
  else cls += ' bg-bg-elevated text-gray-400 border border-border';
  return <span className={cls}>{status || '—'}</span>;
}
