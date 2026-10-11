/* eslint-disable no-unused-vars */
/**
 * Định nghĩa cấu trúc cột cho Glide Data Grid có hỗ trợ Grouped Headers 2 tầng và mapping English Keys sang Tiếng Việt
 */
import { GridCellKind } from '@glideapps/glide-data-grid'
import {
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA,
  RESULT_CALC_COLUMNS_SCHEMA,
  RESULT_TKSX_COLUMN_SCHEMA,
  ARCHITECTURE_FILE_TYPES,
  TAB_DEFINITIONS
} from '../constants/calcConstants'

export { RESULT_CALC_COLUMNS_SCHEMA, RESULT_TKSX_COLUMN_SCHEMA }

// Bảng từ điển chuyển đổi tên cột Tiếng Anh sang Tiếng Việt chuẩn mực
const ENGLISH_KEY_TO_VIETNAMESE = {
  LeadTechnicianName: { title: 'Họ tên', group: 'Thợ chính' },
  AssistantWorker1Name: { title: 'Họ tên', group: 'Thợ phụ 1' },
  AssistantWorker2Name: { title: 'Họ tên', group: 'Thợ phụ 2' },
  TechnicianName: { title: 'Họ tên', group: 'Thợ chính' },
  LeadTechnicianCode: { title: 'Mã thợ', group: 'Thợ chính' },
  AssistantWorker1Code: { title: 'Mã thợ', group: 'Thợ phụ 1' },
  AssistantWorker2Code: { title: 'Mã thợ', group: 'Thợ phụ 2' },
  MaterialCode: { title: 'Mã vật tư', group: 'Thông tin lệnh thao tác' },
  MaterialName: { title: 'Tên vật tư', group: 'Thông tin lệnh thao tác' },
  OperationOrderNo: { title: 'Số lệnh thao tác', group: 'Thông tin lệnh thao tác' },
  MachineCode: { title: 'Mã máy sản xuất', group: 'Thiết bị & Thao tác' },
  MachineName: { title: 'Tên máy sản xuất', group: 'Thiết bị & Thao tác' },
  OperationTypeCode: { title: 'Mã phân loại thao tác', group: 'Thiết bị & Thao tác' },
  OperationTypeName: { title: 'Phân loại thao tác', group: 'Thiết bị & Thao tác' },
  ProducedQty: { title: 'Số lượng sản xuất', group: 'Số lượng thực hiện' },
  QualifiedQty: { title: 'Số lượng đạt', group: 'Số lượng thực hiện' },
  ActualMeters: { title: 'Số mét thực tế', group: 'Số lượng thực hiện' },
  StandardMeters: { title: 'Số mét định mức', group: 'Số lượng thực hiện' },
  DefectQty: { title: 'Số lượng hỏng', group: 'Số lượng hỏng' },
  DefectReason: { title: 'Nguyên nhân hỏng', group: 'Số lượng hỏng' },
  MachineBreakdownReason: { title: 'Nguyên nhân hỏng máy', group: 'Thiết bị & Thao tác' },
  StartTime: { title: 'Bắt đầu', group: 'Thời gian thực hiện' },
  EndTime: { title: 'Kết thúc', group: 'Thời gian thực hiện' },
  StartDate: { title: 'Ngày bắt đầu', group: 'Thông tin thống kê' },
  EndDate: { title: 'Ngày kết thúc', group: 'Thông tin thống kê' },
  StatEmployee: { title: 'Nhân viên thống kê' },
  StatDate: { title: 'Ngày thống kê' },
  StatSlipNo: { title: 'Số phiếu thống kê' },
  PicCoordinator: { title: 'PIC ĐP', group: 'Thông tin lệnh thao tác' },
  OpInfoStatus: { title: 'Trạng thái LTT', group: 'Thông tin lệnh thao tác' }
}

export function getGridColumnsForTab(fileType, dynamicColumns = []) {
  const tabDef = TAB_DEFINITIONS.find((t) => t.id === fileType)
  const schemaList = tabDef?.columnsSchema || []

  let baseCols = []

  // Nếu có dynamicColumns trả về từ file parser
  if (dynamicColumns && dynamicColumns.length > 0 && typeof dynamicColumns[0] === 'object') {
    baseCols = dynamicColumns.map((col) => {
      const colId = col.key || col.id || ''
      const rawTitle = col.title || ''

      // 1. Kiểm tra đối soát theo Key chính xác trước
      let matched = schemaList.find(
        (s) => s.key === colId || s.key?.toLowerCase() === colId.toLowerCase()
      )
      // 2. Nếu không khớp key thì mới tìm theo title (loại trừ các tiêu đề trùng lặp như 'Họ tên')
      if (!matched && rawTitle) {
        matched = schemaList.find(
          (s) =>
            (s.title === rawTitle || s.title?.toLowerCase() === rawTitle.toLowerCase()) &&
            s.title !== 'Họ tên' &&
            s.title !== 'Mã thợ'
        )
      }

      // 3. Kiểm tra từ điển dịch English Key -> Vietnamese Title
      const engMatch =
        ENGLISH_KEY_TO_VIETNAMESE[colId] ||
        ENGLISH_KEY_TO_VIETNAMESE[rawTitle] ||
        (colId.startsWith('TechnicianName')
          ? { title: 'Họ tên', group: col.group || 'Thợ máy' }
          : null) ||
        (colId.startsWith('AssistantWorker')
          ? { title: 'Họ tên', group: col.group || 'Thợ phụ' }
          : null)

      let displayTitle = col.title || matched?.title || engMatch?.title || rawTitle || colId
      let displayGroup =
        fileType === 'result_khsx' || fileType === ARCHITECTURE_FILE_TYPES.RESULT_KHSX
          ? col.group || undefined
          : col.group || matched?.group || engMatch?.group || undefined

      // Xử lý các tên tiếng Anh còn sót
      if (!matched && !engMatch) {
        if (displayTitle === 'TechnicianName' || displayTitle.startsWith('TechnicianName')) {
          displayTitle = 'Họ tên'
          displayGroup = displayGroup || 'Thợ chính'
        } else {
          displayTitle = displayTitle.replace(/_\d+$/, '').replace(/_/g, ' ')
        }
      }

      const isNum =
        matched?.kind === 'Number' ||
        displayTitle.includes('SL') ||
        displayTitle.includes('Số lượng') ||
        displayTitle.includes('Số mét')

      return {
        title: displayTitle,
        id: colId || matched?.key,
        group: displayGroup,
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
      readonly: col.readonly !== undefined ? col.readonly : true
    }))
  } else {
    // Fallback
    baseCols = (dynamicColumns || []).map((col) => {
      const colName = typeof col === 'string' ? col : col.title || col.id || ''
      const colKey = typeof col === 'string' ? col : col.key || col.id || colName
      const engMatch = ENGLISH_KEY_TO_VIETNAMESE[colKey] || ENGLISH_KEY_TO_VIETNAMESE[colName]
      const displayTitle = engMatch?.title || colName
      const displayGroup = (typeof col === 'object' ? col.group : undefined) || engMatch?.group
      const isNum =
        colName.includes('SL') || colName.includes('Số lượng') || colName.includes('Qty')

      return {
        title: displayTitle,
        id: colKey,
        group: displayGroup,
        width: Math.max(120, Math.min(260, displayTitle.length * 10 + 30)),
        kind: isNum ? GridCellKind.Number : GridCellKind.Text,
        hasMenu: true,
        readonly: true
      }
    })
  }

  // Nếu là Tab 1: Thống kê sản xuất (stat_report), TUYỆT ĐỐI LOẠI BỎ nhóm cột kết quả tính toán TKSX
  if (fileType === 'stat_report' || fileType === ARCHITECTURE_FILE_TYPES.STAT_REPORT) {
    const calcKeySet = new Set(RESULT_CALC_COLUMNS_SCHEMA.map((c) => String(c.key).toLowerCase()))
    return baseCols.filter((col) => {
      const colId = String(col.id || col.key || '').toLowerCase()
      const colGroup = String(col.group || '').toLowerCase()
      if (colGroup.includes('kết quả tính toán') || colGroup.includes('ket qua tinh toan')) return false
      if (calcKeySet.has(colId)) return false
      return true
    })
  }

  // Nếu là Tab 5: Kết quả TKSX (result_tksx), ĐẢM BẢO luôn có đầy đủ các cột tính toán ở cuối bảng
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
