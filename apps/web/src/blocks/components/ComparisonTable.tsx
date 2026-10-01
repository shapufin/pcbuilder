export function ComparisonTable({
  block,
}: {
  block: {
    heading?: string | null
    columns?: { label: string }[] | null
    rows?: { label: string; values?: { value?: string | null }[] | null }[] | null
  }
}) {
  const columns = block.columns ?? []
  if (columns.length === 0) return null
  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {block.heading ? <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 20px' }}>{block.heading}</h2> : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600 }}>
                &nbsp;
              </th>
              {columns.map((c, i) => (
                <th
                  key={i}
                  style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 15 }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows ?? []).map((row, ri) => (
              <tr key={ri}>
                <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-surface)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {row.label}
                </td>
                {(row.values ?? []).map((v, vi) => (
                  <td key={vi} style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-surface)', color: 'var(--color-border-strong)' }}>
                    {v.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
