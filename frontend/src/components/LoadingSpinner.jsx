export default function LoadingSpinner({ className = '' }) {
  return (
    <div
      className={`inline-block w-8 h-8 border-2 border-border border-t-accent-teal rounded-full animate-spin ${className}`}
      role="status"
    />
  );
}
