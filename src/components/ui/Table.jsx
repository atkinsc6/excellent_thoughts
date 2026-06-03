export function Table({ columns, data, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left font-semibold text-xs uppercase tracking-wide ${col.className || ''}`}
                style={{ color: 'var(--color-muted)' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid var(--color-border)' }}
              className="hover:bg-gray-50 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className={`px-3 py-2.5 ${col.className || ''}`} style={{ color: 'var(--color-text)' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
