export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: { backgroundColor: 'rgba(27,67,50,0.1)', color: 'var(--color-primary)' },
    accent:  { backgroundColor: 'rgba(184,151,42,0.15)', color: 'var(--color-accent)' },
    danger:  { backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--color-danger)' },
    muted:   { backgroundColor: 'var(--color-border)', color: 'var(--color-muted)' },
    success: { backgroundColor: 'rgba(22,163,74,0.1)', color: 'var(--color-success, #16A34A)' },
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={variants[variant] || variants.default}
    >
      {children}
    </span>
  );
}
