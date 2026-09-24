import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageData } from '../../context/PageDataContext'

/**
 * writeClipboardNativeOrWeb: Hàm ghi dữ liệu vào Clipboard đa nền tảng
 * - Electron Desktop: Tận dụng IPC Native Clipboard qua C++ binding (nhanh tức thì, không nghẽn JS thread).
 * - Web Browser: Tận dụng navigator.clipboard.writeText với fallback document.execCommand.
 */
export async function writeClipboardNativeOrWeb(text) {
  if (typeof text !== 'string') text = String(text || '')

  // 1. Electron Desktop Native Clipboard
  if (typeof window !== 'undefined' && window.electron?.copyToClipboard) {
    try {
      const ok = await window.electron.copyToClipboard(text)
      if (ok) return true
    } catch (err) {
      console.warn('[Desktop Clipboard Warning]', err)
    }
  }

  // 2. Web Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('[Web Clipboard API Warning]', err)
    }
  }

  // 3. Fallback Document ExecCommand cho các trình duyệt cũ / ngữ cảnh không an toàn
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (success) return true
    } catch (e) {
      console.warn('[ExecCommand Warning]', e)
    }
  }

  return false
}

/**
 * useTableClipboard: Hook quản lý toàn diện các chức năng Sao Chép dữ liệu bảng ERP
 * Tối ưu hóa tối đa cho 10.000 - 50.000 dòng dữ liệu
 */
export function useTableClipboard({ gridData = [], cols = [], selection = null }) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}

  /**
   * Lấy danh sách các cột hợp lệ để xuất/copy (bỏ cột hệ thống nội bộ nếu cần)
   */
  const getVisibleColumns = useCallback(() => {
    if (!Array.isArray(cols) || cols.length === 0) return []
    return cols.filter((col) => col?.id !== 'isEdited' && col?.visible !== false)
  }, [cols])

  /**
   * Format mảng dòng dữ liệu thành chuỗi TSV (Chuẩn Excel)
   */
  const formatRowsToTsv = useCallback((rows, columns, includeHeaders = true) => {
    const lines = []

    if (includeHeaders) {
      const headers = columns.map((col) =>
        (col.title || col.name || col.id || '').replace(/[\t\n\r]/g, ' ')
      )
      lines.push(headers.join('\t'))
    }

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      if (!row) continue
      const lineValues = columns.map((col) => {
        const val = row[col.id]
        if (val === null || val === undefined) return ''
        return String(val).replace(/[\t\n\r]/g, ' ')
      })
      lines.push(lineValues.join('\t'))
    }

    return lines.join('\n')
  }, [])

  /**
   * Format mảng dòng dữ liệu thành chuỗi CSV
   */
  const formatRowsToCsv = useCallback((rows, columns, includeHeaders = true) => {
    const lines = []

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""'
      const s = String(str).replace(/"/g, '""')
      return `"${s}"`
    }

    if (includeHeaders) {
      const headers = columns.map((col) => escapeCsv(col.title || col.name || col.id))
      lines.push(headers.join(','))
    }

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      if (!row) continue
      const lineValues = columns.map((col) => escapeCsv(row[col.id]))
      lines.push(lineValues.join(','))
    }

    return lines.join('\n')
  }, [])

  /**
   * Kiểm tra dòng có chứa dữ liệu thực tế hay không (loại bỏ 50 dòng mẫu trống)
   */
  const isRealDataRow = useCallback((row) => {
    if (!row) return false
    const tag = row.WorkingTag || row.Status
    if (tag === 'U' || tag === 'E' || tag === 'D') return true
    if (row.Id || row.IdRow || row.IdSeq) return true
    if (tag === 'A') {
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
      return businessKeys.some((k) => {
        const val = row[k]
        return val !== '' && val !== null && val !== undefined
      })
    }
    return false
  }, [])

  /**
   * 1. Sao chép vùng đang chọn (Cell range hoặc Selected rows)
   */
  const copySelection = useCallback(
    async ({ includeHeaders = false, format = 'tsv' } = {}) => {
      const visibleCols = getVisibleColumns()
      if (visibleCols.length === 0 || !Array.isArray(gridData) || gridData.length === 0) {
        return false
      }

      let rawRows = []
      let selectedCols = visibleCols
      let isSpecificSelection = false

      // A. Nếu có chọn dòng (Row selection)
      if (selection?.rows && selection.rows.items && selection.rows.items.length > 0) {
        isSpecificSelection = true
        const rowIndices = []
        selection.rows.items.forEach(([start, end]) => {
          for (let i = start; i < Math.min(gridData.length, end); i++) {
            rowIndices.push(i)
          }
        })
        rawRows = rowIndices.map((idx) => gridData[idx]).filter(Boolean)
      }
      // B. Nếu có chọn vùng ô (Cell range selection)
      else if (selection?.current?.range) {
        isSpecificSelection = true
        const { range } = selection.current
        const startX = range.x
        const startY = range.y
        const endX = Math.min(cols.length, range.x + range.width)
        const endY = Math.min(gridData.length, range.y + range.height)

        selectedCols = cols.slice(startX, endX)
        for (let y = startY; y < endY; y++) {
          if (gridData[y]) rawRows.push(gridData[y])
        }
      }
      // C. Nếu có chọn 1 ô đơn lẻ (Single cell)
      else if (selection?.current?.cell) {
        isSpecificSelection = true
        const [colIdx, rowIdx] = selection.current.cell
        if (colIdx >= 0 && colIdx < cols.length && rowIdx >= 0 && rowIdx < gridData.length) {
          selectedCols = [cols[colIdx]]
          if (gridData[rowIdx]) rawRows = [gridData[rowIdx]]
        }
      }
      // D. Fallback: Nếu không chọn vùng cụ thể thì sao chép toàn bộ dòng thực tế
      else {
        rawRows = gridData
      }

      // Đối với copy toàn bảng: lọc bỏ các dòng mẫu trống. Đối với copy vùng chọn: giữ nguyên dữ liệu vùng chọn
      const rowsToCopy = isSpecificSelection ? rawRows : rawRows.filter(isRealDataRow)

      if (rowsToCopy.length === 0) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'warning',
            text: t('Không có dòng dữ liệu thực tế nào để sao chép!')
          })
        }
        return false
      }

      let text = ''
      if (format === 'json') {
        text = JSON.stringify(rowsToCopy, null, 2)
      } else if (format === 'csv') {
        text = formatRowsToCsv(rowsToCopy, selectedCols, includeHeaders)
      } else {
        text = formatRowsToTsv(rowsToCopy, selectedCols, includeHeaders)
      }

      const ok = await writeClipboardNativeOrWeb(text)
      if (ok && typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t('Đã sao chép {{count}} dòng dữ liệu vào Clipboard!', {
            count: rowsToCopy.length.toLocaleString()
          })
        })
      }
      return ok
    },
    [
      cols,
      gridData,
      selection,
      getVisibleColumns,
      isRealDataRow,
      formatRowsToTsv,
      formatRowsToCsv,
      setStatusMessage,
      t
    ]
  )

  /**
   * 2. Sao chép toàn bộ dữ liệu trên bảng
   */
  const copyAllRows = useCallback(
    async ({ includeHeaders = true, format = 'tsv' } = {}) => {
      const visibleCols = getVisibleColumns()
      if (!Array.isArray(gridData) || gridData.length === 0) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({ type: 'warning', text: t('Bảng không có dữ liệu để sao chép!') })
        }
        return false
      }

      // Lọc chỉ lấy các dòng có dữ liệu thực tế (bỏ qua 50 dòng mẫu trống)
      const targetRows = gridData.filter(isRealDataRow)

      if (targetRows.length === 0) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({ type: 'warning', text: t('Không có dòng dữ liệu nào để sao chép!') })
        }
        return false
      }

      let text = ''
      if (format === 'json') {
        text = JSON.stringify(targetRows, null, 2)
      } else if (format === 'csv') {
        text = formatRowsToCsv(targetRows, visibleCols, includeHeaders)
      } else {
        text = formatRowsToTsv(targetRows, visibleCols, includeHeaders)
      }

      const ok = await writeClipboardNativeOrWeb(text)
      if (ok && typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t('Đã sao chép toàn bộ {{count}} dòng dữ liệu vào Clipboard!', {
            count: targetRows.length.toLocaleString()
          })
        })
      }
      return ok
    },
    [
      gridData,
      getVisibleColumns,
      isRealDataRow,
      formatRowsToTsv,
      formatRowsToCsv,
      setStatusMessage,
      t
    ]
  )

  /**
   * 3. Sao chép dữ liệu dạng JSON
   */
  const copyAsJson = useCallback(
    async (onlySelected = true) => {
      if (onlySelected) {
        return copySelection({ format: 'json' })
      }
      return copyAllRows({ format: 'json' })
    },
    [copySelection, copyAllRows]
  )

  /**
   * 4. Sao chép 1 ô đơn lẻ
   */
  const copyCell = useCallback(
    async (colKey, rowIndex) => {
      const row = gridData?.[rowIndex]
      if (!row) return false
      const val = row[colKey]
      const text = val !== null && val !== undefined ? String(val) : ''
      const ok = await writeClipboardNativeOrWeb(text)
      if (ok && typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t('Đã sao chép giá trị ô vào Clipboard!')
        })
      }
      return ok
    },
    [gridData, setStatusMessage, t]
  )

  return {
    copySelection,
    copyAllRows,
    copyAsJson,
    copyCell,
    writeClipboardNativeOrWeb
  }
}
