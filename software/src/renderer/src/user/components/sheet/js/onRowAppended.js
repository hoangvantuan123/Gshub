/**
 * onRowAppended: Chèn các dòng mới xuống dưới cùng của mảng dữ liệu (0% xáo trộn data cũ, siêu nhẹ O(N))
 * Giới hạn tối đa 2.000 dòng/lần chèn để đảm bảo hiệu năng 60 FPS
 */
export const MAX_APPEND_ROWS = 2000

export const onRowAppended = (cols, setGridData, setNumRows, setAddedRows, numRowsToAdd = 1) => {
  const actualRowsToAdd = Math.min(MAX_APPEND_ROWS, Math.max(1, Number(numRowsToAdd) || 1))
  if (actualRowsToAdd <= 0) return

  // 1. Tạo Prototype object rỗng 1 lần duy nhất O(C)
  const templateRow = { WorkingTag: 'A', Status: 'A' }
  const colList = Array.isArray(cols) ? cols : []
  for (let i = 0; i < colList.length; i++) {
    const col = colList[i]
    const key = col?.id
    if (
      key &&
      key !== 'WorkingTag' &&
      key !== 'Status' &&
      key !== 'Id' &&
      key !== 'IdSeq' &&
      key !== 'IdxNo'
    ) {
      templateRow[key] = col?.kind === 'Boolean' ? false : ''
    }
  }

  // 2. Pre-allocated array kết hợp cấp phát bộ nhớ tức thì 1 Pass O(N)
  setGridData((prevData) => {
    const prev = Array.isArray(prevData) ? prevData : []
    const prevLen = prev.length
    const nextData = new Array(prevLen + actualRowsToAdd)

    // Giữ nguyên 100% dữ liệu cũ
    for (let i = 0; i < prevLen; i++) {
      nextData[i] = prev[i]
    }

    // Chèn đúng số lượng dòng mới xuống dưới cùng (tối đa 2.000 dòng)
    const newAddedList = []
    for (let i = 0; i < actualRowsToAdd; i++) {
      const newRow = {
        ...templateRow,
        IdxNo: prevLen + i + 1,
        WorkingTag: 'A',
        Status: 'A'
      }
      nextData[prevLen + i] = newRow
      newAddedList.push(newRow)
    }

    if (typeof setAddedRows === 'function') {
      setAddedRows((prevAdded) =>
        Array.isArray(prevAdded) ? [...prevAdded, ...newAddedList] : newAddedList
      )
    }

    return nextData
  })

  if (typeof setNumRows === 'function') {
    setNumRows((prev) => (Number(prev) || 0) + actualRowsToAdd)
  }
}

export const onRowAppendedRow = onRowAppended
