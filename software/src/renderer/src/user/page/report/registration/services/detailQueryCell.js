// Query tables display BE values verbatim, including signed durations and numeric strings.
export function formatDetailQueryCell(value, column) {
  const text = value == null ? '' : String(value)
  const key = column.id || column.columnKey || ''
  if (key === 'WorkingTag') {
    return { kind: 'text', data: '', displayData: '' }
  }

  return { kind: 'text', data: text, displayData: text }
}
