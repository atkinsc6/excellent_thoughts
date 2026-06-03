export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          {label}
        </label>
      )}
      <input
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
        style={{
          borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          '--tw-ring-color': 'var(--color-primary)',
        }}
        {...props}
      />
      {error && <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  );
}
