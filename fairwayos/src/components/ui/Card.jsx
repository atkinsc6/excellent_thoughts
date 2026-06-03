export function Card({ children, className = '', style = {}, onClick }) {
  return (
    <div
      className={`rounded-lg shadow-sm border p-4 ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold ${className}`} style={{ fontFamily: 'Cormorant Garamond, serif', color: 'var(--color-text)' }}>
      {children}
    </h3>
  );
}
