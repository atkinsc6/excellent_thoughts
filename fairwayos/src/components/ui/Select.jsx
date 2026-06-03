export function Select({ label, options = [], className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          {label}
        </label>
      )}
      <select
        className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all appearance-none"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
