import { useState, useCallback, useEffect, useRef } from 'react'
import { CompactSelection } from '@glideapps/glide-data-grid'
import { loadFromLocalStorageSheet } from '../../localStorage/sheet/sheet'
import { onRowAppended } from '../components/sheet/js/onRowAppended'
import { generateEmptyData } from '../components/sheet/js/generateEmptyData'
import { updateIndexNo } from '../components/sheet/js/updateIndexNo'
import { usePageData } from '../../context/PageDataContext'
import { ensureStatusFirstColumn, SYSTEM_INTERNAL_HIDDEN_COLUMNS } from '../../utils/systemColumns'

/**
 * Hàm tính toán chỉ số thống kê (Sum, Count, Average, Min, Max, Cột, Dòng) theo chuẩn Excel khi bôi đen / chọn vùng
 */
export function calculateSelectionStats(selection, gridData, cols) {
  if (
    !selection ||
    !Array.isArray(gridData) ||
    gridData.length === 0 ||
    !Array.isArray(cols) ||
    cols.length === 0
  ) {
    return null
  }

  let count = 0
  let numericCount = 0
  let sum = 0
  let min = Infinity
  let max = -Infinity
  let totalProcessed = 0
  const MAX_STATS_CELLS = 5000

  const rowsSet = new Set()
  const colsSet = new Set()

  const processCell = (r, c) => {
    if (totalProcessed >= MAX_STATS_CELLS) return
    const rowData = gridData[r]
    const column = cols[c]
    if (!rowData || !column) return

    totalProcessed++
    const colKey = column.id || column.key || ''
    if (!colKey) return

    const val = rowData[colKey] ?? rowData[colKey.charAt(0).toLowerCase() + colKey.slice(1)]
    if (val !== undefined && val !== null && val !== '') {
      count++
      const cleanVal = typeof val === 'string' ? val.replace(/,/g, '').trim() : val
      const num = typeof cleanVal === 'number' ? cleanVal : Number(cleanVal)
      if (!isNaN(num) && typeof val !== 'boolean' && cleanVal !== '') {
        numericCount++
        sum += num
        if (num < min) min = num
        if (num > max) max = num
      }
    }
  }

  // 1. Vùng ô bôi đen qua chuột (Cell range hoặc Single cell)
  if (selection.current) {
    const { cell, range, rangeStack } = selection.current
    const ranges = [range, ...(rangeStack || [])].filter(Boolean)

    if (ranges.length > 0) {
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i]
        const endX = Math.min(cols.length, r.x + r.width)
        const endY = Math.min(gridData.length, r.y + r.height)
        for (let y = r.y; y < endY; y++) {
          rowsSet.add(y)
          for (let x = r.x; x < endX; x++) {
            colsSet.add(x)
            processCell(y, x)
            if (totalProcessed >= MAX_STATS_CELLS) break
          }
          if (totalProcessed >= MAX_STATS_CELLS) break
        }
        if (totalProcessed >= MAX_STATS_CELLS) break
      }
    } else if (cell) {
      const [colIdx, rowIdx] = cell
      if (colIdx >= 0 && colIdx < cols.length && rowIdx >= 0 && rowIdx < gridData.length) {
        rowsSet.add(rowIdx)
        colsSet.add(colIdx)
        processCell(rowIdx, colIdx)
      }
    }
  }

  // 2. Dòng được chọn (Row selection)
  if (selection.rows && selection.rows.length > 0) {
    if (selection.rows.items && selection.rows.items.length > 0) {
      for (let i = 0; i < selection.rows.items.length; i++) {
        const [startRow, endRow] = selection.rows.items[i]
        const actualEndRow = Math.min(gridData.length, endRow)
        for (let y = startRow; y < actualEndRow; y++) {
          rowsSet.add(y)
          for (let x = 0; x < cols.length; x++) {
            colsSet.add(x)
            processCell(y, x)
            if (totalProcessed >= MAX_STATS_CELLS) break
          }
          if (totalProcessed >= MAX_STATS_CELLS) break
        }
        if (totalProcessed >= MAX_STATS_CELLS) break
      }
    } else if (typeof selection.rows.toArray === 'function') {
      const rowArr = selection.rows.toArray()
      for (const y of rowArr) {
        if (y < gridData.length) {
          rowsSet.add(y)
          for (let x = 0; x < cols.length; x++) {
            colsSet.add(x)
            processCell(y, x)
            if (totalProcessed >= MAX_STATS_CELLS) break
          }
        }
        if (totalProcessed >= MAX_STATS_CELLS) break
      }
    }
  }

  // 3. Cột được chọn (Column selection)
  if (selection.columns && selection.columns.length > 0) {
    if (selection.columns.items && selection.columns.items.length > 0) {
      for (let i = 0; i < selection.columns.items.length; i++) {
        const [startCol, endCol] = selection.columns.items[i]
        const actualEndCol = Math.min(cols.length, endCol)
        for (let x = startCol; x < actualEndCol; x++) {
          colsSet.add(x)
          for (let y = 0; y < gridData.length; y++) {
            rowsSet.add(y)
            processCell(y, x)
            if (totalProcessed >= MAX_STATS_CELLS) break
          }
          if (totalProcessed >= MAX_STATS_CELLS) break
        }
        if (totalProcessed >= MAX_STATS_CELLS) break
      }
    } else if (typeof selection.columns.toArray === 'function') {
      const colArr = selection.columns.toArray()
      for (const x of colArr) {
        if (x < cols.length) {
          colsSet.add(x)
          for (let y = 0; y < gridData.length; y++) {
            rowsSet.add(y)
            processCell(y, x)
            if (totalProcessed >= MAX_STATS_CELLS) break
          }
        }
        if (totalProcessed >= MAX_STATS_CELLS) break
      }
    }
  }

  const totalCells = rowsSet.size * colsSet.size
  if (count === 0 && totalCells === 0) return null

  return {
    count: count > 0 ? count : totalCells,
    totalCells,
    numericCount,
    selectedColsCount: colsSet.size,
    selectedRowsCount: rowsSet.size,
    hasNumericStats: numericCount > 0,
    sum: numericCount > 0 ? sum : 0,
    average: numericCount > 0 ? sum / numericCount : 0,
    min: numericCount > 0 && min !== Infinity ? min : 0,
    max: numericCount > 0 && max !== -Infinity ? max : 0
  }
}

/**
 * Hook quản lý State và hành vi chuẩn của Glide Data Grid cho các trang ERP
 * @param {string} storageKey - Khóa lưu localStorage cho columns (vd: 'S_ERP_COLS_PAGE_USERS_MANAGE')
 * @param {Array} defaultCols - Danh sách cột mặc định từ hook cols
 * @param {boolean} canCreate - Quyền thêm dòng mới
 * @param {number} initialRowCount - Số dòng trống khởi tạo ban đầu (mặc định 100)
 */
export function useDataGridSheet({
  storageKey,
  defaultCols = [],
  canCreate = true,
  canView = true,
  initialRowCount = 100
}) {
  const { registerDirtyChecker, setSelectionStats, setPageData, setStatusMessage } =
    usePageData() || {}
  const [gridData, setGridData] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [showSearch, setShowSearch] = useState(false)
  const [addedRows, setAddedRows] = useState([])
  const [editedRows, setEditedRows] = useState([])
  const [numRows, setNumRows] = useState(0)

  // Khởi tạo cột từ LocalStorage hoặc cấu hình default
  const [cols, setCols] = useState(() => {
    const rawCols = storageKey
      ? loadFromLocalStorageSheet(
          storageKey,
          defaultCols.filter((col) => col.visible)
        )
      : defaultCols.filter((col) => col.visible)
    return ensureStatusFirstColumn(rawCols, defaultCols)
  })

  const prevColsSignatureRef = useRef('')

  // Cập nhật lại cols nếu defaultCols thực sự thay đổi nội dung (tránh re-render loop gây lag máy)
  useEffect(() => {
    if (storageKey && Array.isArray(defaultCols)) {
      const signature = defaultCols
        .map(
          (col) => `${col.id}:${col.visible !== false}:${col.readonly || false}:${col.title || ''}`
        )
        .join('|')

      if (prevColsSignatureRef.current === signature) {
        return
      }
      prevColsSignatureRef.current = signature

      const rawCols = loadFromLocalStorageSheet(
        storageKey,
        defaultCols.filter((col) => col.visible)
      )
      setCols(ensureStatusFirstColumn(rawCols, defaultCols))
    }
  }, [storageKey, defaultCols])

  // Cập nhật tổng số cột vào PageDataContext khi số lượng cột thay đổi thực sự
  useEffect(() => {
    if (setPageData && cols) {
      setPageData((prev) => {
        if (!prev || prev.totalColumns === cols.length) return prev
        return { ...prev, totalColumns: cols.length }
      })
    }
  }, [cols?.length, setPageData])

  const isInitializedRef = useRef(false)

  // Khởi tạo dòng trống lúc load ban đầu (chỉ tạo 1 lần duy nhất lúc mount nếu có quyền Xem canView)
  useEffect(() => {
    if (!isInitializedRef.current && canView && defaultCols && defaultCols.length > 0) {
      isInitializedRef.current = true
      const emptyData = generateEmptyData(initialRowCount, defaultCols)
      const updatedData = updateIndexNo(emptyData)
      setGridData(updatedData)
      setNumRows(updatedData.length)
    } else if (!canView) {
      setGridData([])
      setNumRows(0)
    }
  }, [canView, defaultCols, initialRowCount])

  const gridDataRef = useRef(gridData)
  gridDataRef.current = gridData

  useEffect(() => {
    if (!registerDirtyChecker) return

    return registerDirtyChecker(() => {
      const data = gridDataRef.current
      if (!Array.isArray(data) || data.length === 0) return false

      const systemKeys = new Set([
        'Id',
        'IdRow',
        'IdSeq',
        'CreatedBy',
        'CreatedAt',
        'CreatedByName',
        'CreatedDate',
        'UpdatedBy',
        'UpdatedAt',
        'UpdatedByName',
        'UpdatedDate',
        'isEdited',
        'WorkingTag',
        'Status',
        'IdxNo',
        'Idx'
      ])

      return data.some((row) => {
        if (!row) return false
        const tag = row.WorkingTag || row.Status
        if (tag === 'U' || tag === 'E' || tag === 'D') return true
        if (tag === 'A') {
          const keys = Object.keys(row)
          return keys.some((k) => {
            if (systemKeys.has(k)) return false
            const val = row[k]
            return val !== '' && val !== null && val !== undefined
          })
        }
        return false
      })
    })
  }, [registerDirtyChecker])

  // Tự động tính toán số liệu thống kê kiểu Excel khi bôi đen (Debounced requestAnimationFrame chống giật lag)
  const statsRafRef = useRef(null)
  useEffect(() => {
    if (!setSelectionStats) return

    if (statsRafRef.current) {
      cancelAnimationFrame(statsRafRef.current)
    }

    statsRafRef.current = requestAnimationFrame(() => {
      const stats = calculateSelectionStats(selection, gridData, cols)
      setSelectionStats(stats)
    })

    return () => {
      if (statsRafRef.current) {
        cancelAnimationFrame(statsRafRef.current)
      }
    }
  }, [selection, gridData, cols, setSelectionStats])

  // Đồng bộ số lượng trạng thái dòng (A, U, D, E) xuống StatusBar (A chỉ tính dòng hợp lệ có dữ liệu)
  const statusCountsRafRef = useRef(null)
  useEffect(() => {
    if (!setPageData) return

    if (statusCountsRafRef.current) {
      cancelAnimationFrame(statusCountsRafRef.current)
    }

    statusCountsRafRef.current = requestAnimationFrame(() => {
      let aCount = 0
      let uCount = 0
      let dCount = 0
      let eCount = 0

      if (Array.isArray(gridData) && gridData.length > 0) {
        for (let i = 0; i < gridData.length; i++) {
          const row = gridData[i]
          if (!row) continue
          const tag = row.WorkingTag || row.Status
          if (tag === 'E' || Boolean(row.ErrorMessage || row.Error)) {
            eCount++
          }
          if (tag === 'U') {
            uCount++
          } else if (tag === 'D') {
            dCount++
          } else if (tag === 'A') {
            // Chỉ đếm dòng 'A' có dữ liệu thực sự hợp lệ (không tính dòng mẫu/AA/trắng)
            const businessKeys = Object.keys(row).filter(
              (k) =>
                ![
                  'Id',
                  'IdRow',
                  'IdSeq',
                  'CreatedBy',
                  'CreatedAt',
                  'UpdatedBy',
                  'UpdatedAt',
                  'isEdited',
                  'WorkingTag',
                  'Status',
                  'IdxNo',
                  'Idx'
                ].includes(k)
            )
            const hasData = businessKeys.some((k) => {
              const val = row[k]
              return val !== '' && val !== null && val !== undefined
            })
            if (hasData) {
              aCount++
            }
          }
        }
      }

      setPageData((prev) => {
        const prevCounts = prev?.rowStatusCounts
        if (
          prevCounts &&
          prevCounts.aCount === aCount &&
          prevCounts.uCount === uCount &&
          prevCounts.dCount === dCount &&
          prevCounts.eCount === eCount
        ) {
          return prev
        }
        return {
          ...prev,
          rowStatusCounts: { aCount, uCount, dCount, eCount }
        }
      })
    })

    return () => {
      if (statusCountsRafRef.current) {
        cancelAnimationFrame(statusCountsRafRef.current)
      }
    }
  }, [gridData, setPageData])

  // Đồng bộ thông tin Audit Log của dòng đang chọn xuống StatusBar (Chỉ kích hoạt khi đổi dòng thực tế)
  const lastAuditedRowRef = useRef(null)
  useEffect(() => {
    if (!setPageData) return
    let selectedRowIdx = null
    const selectedRows = selection?.rows?.items
    if (selectedRows && selectedRows.length > 0) {
      selectedRowIdx = selectedRows[0][0]
    } else if (selection?.current?.cell) {
      selectedRowIdx = selection.current.cell[1]
    }

    if (selectedRowIdx === null || selectedRowIdx === undefined) return
    const selectedRowData = gridData[selectedRowIdx]
    if (!selectedRowData) return

    const auditKey = `${selectedRowIdx}_${selectedRowData.CreatedAt}_${selectedRowData.UpdatedAt}_${selectedRowData.CreatedByName || selectedRowData.CreatedBy}_${selectedRowData.UpdatedByName || selectedRowData.UpdatedBy}`
    if (lastAuditedRowRef.current === auditKey) return
    lastAuditedRowRef.current = auditKey

    if (
      selectedRowData.CreatedAt ||
      selectedRowData.UpdatedAt ||
      selectedRowData.CreatedByName ||
      selectedRowData.UpdatedByName ||
      selectedRowData.CreatedBy ||
      selectedRowData.UpdatedBy
    ) {
      const formatTime = (val) => {
        if (!val) return ''
        try {
          const d = new Date(val)
          if (isNaN(d.getTime())) return String(val)
          return d.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        } catch {
          return String(val)
        }
      }

      setPageData((prev) => ({
        ...prev,
        createdAt: formatTime(selectedRowData.CreatedAt),
        createdBy: selectedRowData.CreatedByName || selectedRowData.CreatedBy || '',
        updatedAt: formatTime(selectedRowData.UpdatedAt),
        updatedBy: selectedRowData.UpdatedByName || selectedRowData.UpdatedBy || ''
      }))
    }
  }, [selection, gridData, setPageData])

  // Dọn dẹp thống kê khi unmount
  useEffect(() => {
    return () => {
      setSelectionStats && setSelectionStats(null)
    }
  }, [setSelectionStats])

  // Reset bảng và đưa con trỏ chuột về ô đầu tiên [0, 0] của dòng đầu tiên
  const resetTable = useCallback(() => {
    setSelection({
      current: { cell: [0, 0], range: { x: 0, y: 0, width: 1, height: 1 }, rangeStack: [] },
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty()
    })
    setAddedRows([])
    setEditedRows([])
    if (setSelectionStats) {
      setSelectionStats(null)
    }
  }, [setSelectionStats])

  // Lấy các dòng đang được chọn từ selection.rows
  const getSelectedRows = useCallback(() => {
    const selectedRows = selection.rows.items
    let rows = []
    selectedRows.forEach((range) => {
      const start = range[0]
      const end = range[1] - 1
      for (let i = start; i <= end; i++) {
        if (gridData[i]) {
          rows.push(gridData[i])
        }
      }
    })
    return rows
  }, [selection, gridData])

  // Thêm dòng mới vào bảng (Kiểm soát chặt chẽ theo phân quyền canCreate)
  const handleRowAppend = useCallback(
    (numRowsToAdd) => {
      if (!canCreate) {
        if (setStatusMessage) {
          setStatusMessage({
            type: 'warning',
            text: 'Bạn không có quyền thêm dữ liệu trên trang này!'
          })
        }
        return
      }
      onRowAppended(cols, setGridData, setNumRows, setAddedRows, numRowsToAdd)
    },
    [canCreate, cols, setStatusMessage]
  )

  // Gom các props thường xuyên truyền cho Table component
  const tableProps = {
    cols,
    setCols,
    gridData,
    setGridData,
    numRows,
    setNumRows,
    selection,
    setSelection,
    showSearch,
    setShowSearch,
    handleRowAppend: canCreate ? handleRowAppend : null,
    canCreate,
    addedRows,
    setAddedRows,
    editedRows,
    setEditedRows,
    defaultCols,
    resetTable
  }

  return {
    gridData,
    setGridData,
    selection,
    setSelection,
    showSearch,
    setShowSearch,
    addedRows,
    editedRows,
    numRows,
    setNumRows,
    cols,
    setCols,
    resetTable,
    getSelectedRows,
    handleRowAppend,
    tableProps
  }
}
