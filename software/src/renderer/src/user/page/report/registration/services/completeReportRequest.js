// Factory screens calculate their existing formulas and exports from the full
// dataset. Never publish a partial page as if it were the complete report.
export async function completeReportRequest(fetchPage, filters = {}) {
  const first = await fetchPage({ ...filters, page: 1, includeItems: 'all' })
  if (first?.success === false) throw new Error(first.message || 'Không tải được báo cáo.')
  const report = first?.data?.data?.items ? first.data.data : first?.data
  if (!report || !Array.isArray(report.items)) return first
  const expected = Number(
    report.pagination?.total ?? report.pagination?.totalRows ?? report.items.length
  )
  const rows = [...report.items]
  if (!Number.isSafeInteger(expected) || expected < rows.length) {
    throw new Error('Số lượng dữ liệu báo cáo không hợp lệ. Vui lòng tải lại.')
  }
  let page = 1
  const seen = new Set(rows.map((row) => row.IdSeq || row.id).filter(Boolean))
  while (rows.length < expected) {
    page += 1
    const next = await fetchPage({ ...filters, includeItems: 'all', page })
    const nextReport = next?.data?.data?.items ? next.data.data : next?.data
    const nextTotal = Number(nextReport?.pagination?.total ?? nextReport?.pagination?.totalRows)
    const chunk = nextReport?.items
    if (nextTotal !== expected || !Array.isArray(chunk) || chunk.length === 0) {
      throw new Error('Dữ liệu báo cáo đã thay đổi hoặc tải chưa đủ. Vui lòng tải lại.')
    }
    for (const row of chunk) {
      const id = row.IdSeq || row.id
      if (id && seen.has(id)) throw new Error('Dữ liệu báo cáo bị trùng trang. Vui lòng tải lại.')
      if (id) seen.add(id)
      rows.push(row)
    }
    if (rows.length > expected) throw new Error('Dữ liệu báo cáo đã thay đổi. Vui lòng tải lại.')
  }
  const complete = {
    ...report,
    items: rows,
    pagination: {
      ...report.pagination,
      page: 1,
      pageSize: rows.length,
      loadedCount: rows.length,
      totalPages: 1
    }
  }
  return first.data === report
    ? { ...first, data: complete }
    : { ...first, data: { ...first.data, data: complete } }
}
