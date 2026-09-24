import { useMemo, useCallback } from 'react'

export const DEFAULT_CODE_HELP_BG = '#eaf1f8'
export const DEFAULT_READONLY_BG = '#eeeeee'
export const DEFAULT_BORDER_COLOR = '#cbd5e1'

export const DEFAULT_GRID_THEME = {
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  baseFontStyle: '13px',
  headerFontStyle: '600 13px',
  editorFontSize: '13px',
  accentColor: '#1677ff',
  accentLight: '#e6f4ff',
  textDark: '#1e293b',
  textMedium: '#475569',
  textLight: '#94a3b8',
  textHeader: '#0f172a',
  bgCell: '#ffffff',
  bgHeader: '#f8fafc',
  borderColor: '#cbd5e1',
  headerBottomBorderColor: '#cbd5e1'
}

/**
 * Hook quản lý màu sắc và theme cho các cột trong DataEditor Grid Sheet.
 * - Cột Code Help: nền xanh nhạt dịu (#eaf1f8)
 * - Cột Readonly / Không chỉnh sửa: nền xám (#eeeeee)
 * - Cột Status: giữ theme trạng thái CRUD, không áp màu xám
 * - Cột bình thường (được edit): nền mặc định
 *
 * @param {Array} cols - Danh sách cấu hình cột
 * @param {Array} codeHelpColumns - Danh sách ID các cột là Code Help
 * @param {Array} readOnlyColumns - Danh sách ID các cột là ReadOnly bổ sung
 * @param {string} codeHelpBg - Mã màu cho cột Code Help (mặc định '#eaf1f8')
 * @param {string} readOnlyBg - Mã màu cho cột ReadOnly (mặc định '#eeeeee')
 * @param {string} borderColor - Mã màu viền ô (mặc định '#cbd5e1')
 */
export function useTableCellTheme({
  cols = [],
  codeHelpColumns = [],
  readOnlyColumns = [],
  codeHelpBg = DEFAULT_CODE_HELP_BG,
  readOnlyBg = DEFAULT_READONLY_BG,
  borderColor = DEFAULT_BORDER_COLOR
} = {}) {
  const codeHelpSet = useMemo(() => new Set(codeHelpColumns), [codeHelpColumns])
  const readOnlySet = useMemo(() => new Set(readOnlyColumns), [readOnlyColumns])

  const colMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(cols)) {
      cols.forEach((col) => {
        if (col && col.id) {
          map.set(col.id, col)
        }
      })
    }
    return map
  }, [cols])

  const isCodeHelpColumn = useCallback(
    (columnKey) => {
      if (codeHelpSet.has(columnKey)) return true
      const col = colMap.get(columnKey)
      return Boolean(col?.isCodeHelp)
    },
    [codeHelpSet, colMap]
  )

  const isReadOnlyColumn = useCallback(
    (columnKey, column) => {
      if (columnKey === 'WorkingTag' || columnKey === 'Status') return false
      if (readOnlySet.has(columnKey)) return true
      const col = column || colMap.get(columnKey)
      return Boolean(col?.readonly)
    },
    [readOnlySet, colMap]
  )

  const isEditableColumn = useCallback(
    (columnKey, column) => {
      return !isReadOnlyColumn(columnKey, column) && !isCodeHelpColumn(columnKey)
    },
    [isReadOnlyColumn, isCodeHelpColumn]
  )

  const getCellTheme = useCallback(
    (columnKey, column) => {
      const col = column || colMap.get(columnKey)
      const baseTheme = col?.themeOverride || {}

      // Cột WorkingTag / Status phục vụ hiển thị trạng thái CRUD (A/U/D/E), không áp màu xám readonly
      if (columnKey === 'WorkingTag' || columnKey === 'Status') {
        return Object.keys(baseTheme).length > 0
          ? { ...baseTheme, borderColor: baseTheme.borderColor || borderColor }
          : undefined
      }

      if (isCodeHelpColumn(columnKey)) {
        return {
          ...baseTheme,
          bgCell: codeHelpBg,
          borderColor: baseTheme.borderColor || borderColor
        }
      }

      if (isReadOnlyColumn(columnKey, col)) {
        return {
          ...baseTheme,
          bgCell: readOnlyBg,
          borderColor: baseTheme.borderColor || borderColor
        }
      }

      return Object.keys(baseTheme).length > 0 ? baseTheme : undefined
    },
    [colMap, isCodeHelpColumn, isReadOnlyColumn, codeHelpBg, readOnlyBg, borderColor]
  )

  return {
    getCellTheme,
    isCodeHelpColumn,
    isReadOnlyColumn,
    isEditableColumn,
    codeHelpBg,
    readOnlyBg,
    borderColor
  }
}

export default useTableCellTheme
