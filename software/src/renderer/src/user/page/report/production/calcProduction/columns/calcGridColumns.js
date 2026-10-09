/**
 * Định nghĩa cấu trúc cột cho Glide Data Grid có hỗ trợ Grouped Headers 2 tầng và mapping English Keys
 */
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA,
  ARCHITECTURE_FILE_TYPES,
  TAB_DEFINITIONS
} from '../constants/calcConstants'

export const RESULT_CALC_COLUMNS_SCHEMA = [
  {
    group: 'Kết quả tính toán TKSX',
    title: 'Thời gian chạy thực tế',
    key: 'ActualRunTime',
    kind: 'Number',
    width: 140
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'capa thực tế',
    key: 'ActualCapa',
    kind: 'Number',
    width: 120
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'CHECK KHSX',
    key: 'CheckKhsx',
    kind: 'Text',
    width: 110
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'Thời gian duyệt phiếu ở MES',
    key: 'MesApprovedTime',
    kind: 'Text',
    width: 170
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'Độ trễ thời gian đồng bộ 2 hệ thống',
    key: 'SyncLatencySeconds',
    kind: 'Text',
    width: 180
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'Phiếu sinh trùng',
    key: 'IsDuplicateSlip',
    kind: 'Text',
    width: 110
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'Vị trí tạo phiếu tk',
    key: 'CreatedLocation',
    kind: 'Text',
    width: 130
  },
  {
    group: 'Kết quả tính toán TKSX',
    title: 'Sinh phiếu xuất/nhập tự động',
    key: 'AutoExportImportGenerated',
    kind: 'Text',
    width: 170
  }
]

export function getGridColumnsForTab(fileType, dynamicColumns = []) {
  const tabDef = TAB_DEFINITIONS.find((t) => t.id === fileType)
  const schemaList = tabDef?.columnsSchema || []

  let baseCols = []

  // Nếu có dynamicColumns trả về từ file parser
  if (dynamicColumns && dynamicColumns.length > 0 && typeof dynamicColumns[0] === 'object') {
    baseCols = dynamicColumns.map((col) => {
      const colId = col.key || col.id || ''
      const rawTitle = col.title || ''
      const matched = schemaList.find(
        (s) =>
          s.key === colId ||
          s.title === rawTitle ||
          s.title?.toLowerCase() === rawTitle.toLowerCase() ||
          s.key?.toLowerCase() === colId.toLowerCase()
      )
      let displayTitle = matched?.title || rawTitle || colId
      if (!matched) {
        displayTitle = displayTitle.replace(/_\d+$/, '').replace(/_/g, ' ')
      }
      const isNum =
        matched?.kind === 'Number' ||
        displayTitle.includes('SL') ||
        displayTitle.includes('Số lượng') ||
        displayTitle.includes('Số mét')
      return {
        title: displayTitle,
        id: colId || matched?.key,
        group: col.group || matched?.group || undefined,
        width: matched?.width || Math.max(120, Math.min(260, displayTitle.length * 10 + 30)),
        kind: isNum ? GridCellKind.Number : GridCellKind.Text,
        hasMenu: true,
        readonly: true
      }
    })
  } else if (schemaList.length > 0) {
    // Mặc định lấy theo schemaList chuẩn
    baseCols = schemaList.map((col) => ({
      title: col.title,
      id: col.key || col.id,
      group: col.group,
      width: col.width || 140,
      kind: col.kind === 'Number' ? GridCellKind.Number : GridCellKind.Text,
      hasMenu: true,
      readonly: true
    }))
  } else {
    // Fallback
    baseCols = (dynamicColumns || []).map((col) => {
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

  // Nếu là Tab 5: Kết quả TKSX (result_tksx), ĐẢM BẢO luôn có đầy đủ 8 cột tính toán ở cuối bảng
  if (fileType === 'result_tksx' || fileType === ARCHITECTURE_FILE_TYPES.RESULT_TKSX) {
    const existingKeys = new Set(baseCols.map((c) => c.id || c.key || c.title))
    const calcColsToAdd = RESULT_CALC_COLUMNS_SCHEMA.filter(
      (cc) => !existingKeys.has(cc.key) && !existingKeys.has(cc.id) && !existingKeys.has(cc.title)
    ).map((cc) => ({
      title: cc.title,
      id: cc.key,
      group: cc.group,
      width: cc.width || 140,
      kind: cc.kind === 'Number' ? GridCellKind.Number : GridCellKind.Text,
      hasMenu: true,
      readonly: true
    }))

    return [...baseCols, ...calcColsToAdd]
  }

  return baseCols
}
