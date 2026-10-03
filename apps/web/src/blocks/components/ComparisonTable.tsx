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
    <section className="blk">
      {block.heading ? <h2 className="blk__title">{block.heading}</h2> : null}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>&nbsp;</th>
              {columns.map((c, i) => (
                <th key={i}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows ?? []).map((row, ri) => (
              <tr key={ri}>
                <td data-label="">{row.label}</td>
                {(row.values ?? []).map((v, vi) => (
                  <td key={vi} data-label={columns[vi]?.label}>
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
