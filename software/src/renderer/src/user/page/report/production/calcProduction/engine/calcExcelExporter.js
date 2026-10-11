import * as XLSX from 'xlsx'
import {
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA,
  RESULT_TKSX_COLUMN_SCHEMA
} from '../constants/calcConstants'
import { formatCellForExcel, saveWorkbookToFile } from '../../../../../../utils/exportExcelUtils'

/**
 * Tạo Worksheet Excel chuẩn ERP với Header 2 tầng (Group tiếng Việt + Tên cột tiếng Việt)
 */
export function buildWorksheetWithVietnameseHeaders(data = [], schemaCols = [], sheetTitle = '') {
  if (!Array.isArray(data)) data = []

  // Lấy danh sách cột từ schema hoặc từ dòng dữ liệu đầu tiên
  let cols = Array.isArray(schemaCols) && schemaCols.length > 0 ? schemaCols : []
  if (cols.length === 0 && data.length > 0) {
    cols = Object.keys(data[0]).map((k) => ({ id: k, key: k, title: k }))
  }

  const validCols = cols.filter(
    (c) =>
      c.id !== 'WorkingTag' &&
      c.id !== 'isEdited' &&
      c.id !== 'Id' &&
      c.id !== 'IdRow' &&
      c.id !== 'IdSeq' &&
      c.id !== 'RowVersion' &&
      c.visible !== false
  )

  const hasGroup = validCols.some((c) => Boolean(c.group))
  const totalCols = validCols.length + 1 // +1 cho cột STT
  const colWidths = [
    8, // Cột STT
    ...validCols.map((c) => Math.max(String(c.title || c.key || c.id).length + 4, 12))
  ]

  const aoaRows = []
  const merges = []

  if (hasGroup) {
    const rowGroup = ['STT']
    const rowTitle = ['STT']

    let currentGroup = null
    let groupStartIndex = -1

    validCols.forEach((col, idx) => {
      const colIdx = idx + 1 // STT ở cột 0
      const groupName = col.group || ''
      const colTitle = col.title || col.key || col.id

      rowGroup.push(groupName)
      rowTitle.push(colTitle)

      if (groupName) {
        if (groupName !== currentGroup) {
          if (currentGroup && groupStartIndex !== -1 && colIdx - 1 > groupStartIndex) {
            merges.push({
              s: { r: 0, c: groupStartIndex },
              e: { r: 0, c: colIdx - 1 }
            })
          }
          currentGroup = groupName
          groupStartIndex = colIdx
        }
      } else {
        if (currentGroup && groupStartIndex !== -1 && colIdx - 1 > groupStartIndex) {
          merges.push({
            s: { r: 0, c: groupStartIndex },
            e: { r: 0, c: colIdx - 1 }
          })
        }
        currentGroup = null
        groupStartIndex = -1
        // Cột không có nhóm: merge dọc từ hàng 0 xuống hàng 1
        merges.push({
          s: { r: 0, c: colIdx },
          e: { r: 1, c: colIdx }
        })
      }
    })

    if (currentGroup && groupStartIndex !== -1 && totalCols - 1 > groupStartIndex) {
      merges.push({
        s: { r: 0, c: groupStartIndex },
        e: { r: 0, c: totalCols - 1 }
      })
    }

    // Merge dọc STT
    merges.push({
      s: { r: 0, c: 0 },
      e: { r: 1, c: 0 }
    })

    aoaRows.push(rowGroup)
    aoaRows.push(rowTitle)
  } else {
    const rowTitle = ['STT', ...validCols.map((c) => c.title || c.key || c.id)]
    aoaRows.push(rowTitle)
  }

  // Dữ liệu dòng
  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue

    const dataRow = [r + 1]
    for (let c = 0; c < validCols.length; c++) {
      const col = validCols[c]
      const colKey = col.key || col.id || col.title
      const rawVal =
        row[colKey] ??
        row[col.id] ??
        row[col.key] ??
        row[col.title] ??
        row[colKey.charAt(0).toLowerCase() + colKey.slice(1)]

      const cellVal = formatCellForExcel(rawVal, col)
      dataRow.push(cellVal)

      const len = String(cellVal).length
      if (len + 3 > colWidths[c + 1]) {
        colWidths[c + 1] = Math.min(len + 3, 50)
      }
    }
    aoaRows.push(dataRow)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoaRows)
  if (merges.length > 0) {
    ws['!merges'] = merges
  }
  ws['!cols'] = colWidths.map((w) => ({ wch: w }))
  return ws
}

/**
 * Định nghĩa 6 Tab xuất Excel với tiêu đề tiếng Việt chuẩn
 */
export const FULL_6_TABS_EXPORT_SCHEMA = [
  {
    id: 'result_khsx',
    sheetName: 'Kết quả KHSX',
    title: '1. Bảng Kết Quả Kế Hoạch Sản Xuất & Đối Soát',
    schema: RESULT_KHSX_COLUMN_SCHEMA,
    getData: (calcResults) => calcResults?.plan?.calculatedRows || []
  },
  {
    id: 'result_tksx',
    sheetName: 'Kết quả TKSX',
    title: '2. Bảng Kết Quả Thống Kê Sản Xuất (98 Cột)',
    schema: RESULT_TKSX_COLUMN_SCHEMA,
    getData: (calcResults) => calcResults?.stat?.calculatedRows || []
  },
  {
    id: 'stat_report',
    sheetName: 'Báo cáo TKSX',
    title: '3. Báo Cáo Thống Kê Sản Xuất Chi Tiết',
    schema: STAT_REPORT_COLUMN_SCHEMA,
    getData: (_, allFiles) => allFiles?.stat_report?.data || []
  },
  {
    id: 'unfinished_op',
    sheetName: 'Lệnh TT chưa hoàn thành',
    title: '4. Báo Cáo Lệnh Thao Tác Chưa Hoàn Thành',
    schema: UNFINISHED_OP_COLUMN_SCHEMA,
    getData: (_, allFiles) => allFiles?.unfinished_op?.data || []
  },
  {
    id: 'summary_op',
    sheetName: 'Tổng hợp lệnh TT',
    title: '5. Báo Cáo Tổng Hợp Lệnh Thao Tác',
    schema: SUMMARY_OP_COLUMN_SCHEMA,
    getData: (_, allFiles) => allFiles?.summary_op?.data || []
  },
  {
    id: 'mes_approval',
    sheetName: 'Duyệt sản lượng MES',
    title: '6. Báo Cáo Duyệt Sản Lượng MES',
    schema: MES_APPROVAL_COLUMN_SCHEMA,
    getData: (_, allFiles) => allFiles?.mes_approval?.data || []
  }
]

/**
 * Xuất toàn bộ 6 Tab dữ liệu ra 1 file Excel siêu nhẹ kèm tiến trình trực quan chuẩn ERP
 */
export async function exportFull6TabsProductionExcel({
  calcResults = null,
  allFiles = {},
  regCode = '',
  fileName = '',
  saveDirectory = '',
  onProgress = null
}) {
  const wb = XLSX.utils.book_new()
  let totalExportedRows = 0
  let sheetsExported = 0

  const totalTabs = FULL_6_TABS_EXPORT_SCHEMA.length

  for (let i = 0; i < totalTabs; i++) {
    const tab = FULL_6_TABS_EXPORT_SCHEMA[i]
    const percent = Math.round(15 + ((i + 1) / totalTabs) * 75)

    onProgress?.({
      percent,
      step: `TAB_${i + 1}`,
      message: `Đang tổng hợp ${tab.title}...`,
      detail: `Tiến độ: Bảng ${i + 1}/${totalTabs} [${tab.sheetName}]`,
      statusTag: 'Đang tổng hợp Excel'
    })

    // Nghỉ nhẹ 30ms để giải phóng render event loop cho UI animation mượt mà
    await new Promise((resolve) => setTimeout(resolve, 30))

    const rawRows = tab.getData(calcResults, allFiles) || []
    const ws = buildWorksheetWithVietnameseHeaders(rawRows, tab.schema, tab.sheetName)
    XLSX.utils.book_append_sheet(wb, ws, tab.sheetName.slice(0, 31))

    totalExportedRows += rawRows.length
    sheetsExported++
  }

  onProgress?.({
    percent: 95,
    step: 'SAVING',
    message: 'Đang lưu tệp Excel vào ổ đĩa...',
    detail: `Đã đóng gói ${sheetsExported} bảng (${totalExportedRows.toLocaleString('vi-VN')} dòng dữ liệu)`,
    statusTag: 'Đang lưu tệp'
  })

  await new Promise((resolve) => setTimeout(resolve, 50))

  const finalFileName = fileName || `DATA_KHSX_${regCode || 'EXPORT'}_${new Date().getTime()}.xlsx`
  const saveResult = await saveWorkbookToFile(wb, finalFileName, saveDirectory, {
    overwriteExisting: true
  })

  onProgress?.({
    percent: 100,
    isComplete: true,
    step: 'COMPLETED',
    message: `Đã xuất thành công trọn bộ 6 bảng dữ liệu (${totalExportedRows.toLocaleString('vi-VN')} dòng)!`,
    detail: `Tệp đã được lưu: ${saveResult?.filePath || finalFileName}`,
    statusTag: 'Hoàn tất xuất Excel'
  })

  return {
    success: true,
    totalRows: totalExportedRows,
    sheetsCount: sheetsExported,
    filePath: saveResult?.filePath || finalFileName
  }
}
