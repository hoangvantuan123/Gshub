/**
 * Định nghĩa cấu trúc cột cho Glide Data Grid có hỗ trợ Grouped Headers 2 tầng và mapping English Keys
 */
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  ARCHITECTURE_FILE_TYPES,
  TAB_DEFINITIONS
} from '../constants/calcConstants'

export function getGridColumnsForTab(fileType, dynamicColumns = []) {
  const tabDef = TAB_DEFINITIONS.find((t) => t.id === fileType)
  const schemaList = tabDef?.columnsSchema || []

  // Nếu có dynamicColumns trả về từ file parser
  if (dynamicColumns && dynamicColumns.length > 0 && typeof dynamicColumns[0] === 'object') {
    return dynamicColumns.map((col) => {
      const matched = schemaList.find((s) => s.key === col.key || s.key === col.id || s.title === col.title)
      const isNum = matched?.kind === 'Number' || col.title?.includes('SL') || col.title?.includes('Số lượng')
      return {
        title: col.title || matched?.title || col.key,
        id: col.key || col.id || matched?.key,
        group: col.group || matched?.group || undefined,
        width: matched?.width || Math.max(120, Math.min(260, (col.title || '').length * 10 + 30)),
        kind: isNum ? GridCellKind.Number : GridCellKind.Text,
        hasMenu: true,
        readonly: true
      }
    })
  }

  // Mặc định lấy theo schemaList chuẩn
  if (schemaList.length > 0) {
    return schemaList.map((col) => ({
      title: col.title,
      id: col.key,
      group: col.group,
      width: col.width || 140,
      kind: col.kind === 'Number' ? GridCellKind.Number : GridCellKind.Text,
      hasMenu: true,
      readonly: true
    }))
  }

  // Fallback
  return dynamicColumns.map((col) => {
    const colName = typeof col === 'string' ? col : col.title || col.id || ''
    const colKey = typeof col === 'string' ? col : col.key || col.id || colName
    const isNum = colName.includes('SL') || colName.includes('Số lượng') || colName.includes('Qty')

    return {
      title: colName,
      id: colKey,
      group: typeof col === 'object' ? col.group : undefined,
      width: Math.max(120, Math.min(260, colName.length * 10 + 30)),
      kind: isNum ? GridCellKind.Number : GridCellKind.Text,
      hasMenu: true,
      readonly: true
    }
  })
}
