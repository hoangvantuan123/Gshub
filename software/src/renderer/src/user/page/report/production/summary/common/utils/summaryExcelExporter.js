import * as XLSX from 'xlsx'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '@renderer/utils/exportExcelUtils'
import { formatVNDateShort } from './summaryReportUtils'

/**
 * Xuất file Excel chuẩn hóa cho Báo Cáo Tổng Hợp Sản Xuất (KHSX & TKSX)
 * Đồng bộ 100% với khung xuất chuẩn của hệ thống Gshub ERP
 */
export const executeExportSummaryExcel = async ({
  reportType = 'stat',
  factoryCode = 'GS1',
  fileName,
  saveDirectory,
  overwriteExisting,
  exportableCols,
  rawCols = [],
  displayDetailList = [],
  picBreakdown = [],
  dailyAggregates = [],
  displayMachineList = [],
  teamAggregates = [],
  activeFilters = {},
  includeHeaders = true
}) => {
  const plantDisplayName = factoryCode === 'GS5' ? 'NHÀ MÁY GS QUẾ VÕ 1B' : 'NHÀ MÁY GS HÀ NỘI'
  const validCols = exportableCols || (rawCols || []).filter((c) => c.id && c.id !== 'WorkingTag')
  const filterInfo = formatFilterSummary(activeFilters, formatVNDateShort)

  if (reportType === 'plan') {
    // 1. Sheet 1: Chi tiết KHSX Điều phối theo khung chuẩn hệ thống (Title, Filter Info, 2-Tier Header, STT)
    const reportTitle = `BÁO CÁO CHI TIẾT ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT - ${plantDisplayName}`
    const wb = generateExcelWorkbook({
      data: displayDetailList,
      columns: validCols,
      sheetName: 'ChiTiet_DieuPhoi_KHSX',
      reportTitle,
      filterInfo,
      includeHeaders: includeHeaders !== false
    })

    // 2. Sheet 2: Tổng hợp theo PIC Điều phối
    if (picBreakdown && picBreakdown.length > 0) {
      const wsPic = XLSX.utils.json_to_sheet(
        picBreakdown.map((p, idx) => ({
          STT: idx + 1,
          'PIC Điều phối': p.pic || p.picName || '',
          'Tổng lệnh (WO)': p.totalOrders || 0,
          'Khớp Số lượng': p.khopSl || 0,
          'Khớp Job': p.khopJob || 0,
          'SX Sai ngày KH': p.sxSaiNgay || 0,
          'Trượt KH': p.truotKh || 0,
          'Tổng Khớp': (p.khopSl || 0) + (p.khopJob || 0),
          'Tỷ lệ Khớp SL (%)': p.khopSlRate || 0,
          'Tỷ lệ Khớp Job (%)': p.khopJobRate || 0,
          'Tỷ lệ Sai ngày (%)': p.sxSaiNgayRate || 0,
          'Tỷ lệ Trượt KH (%)': p.truotKhRate || 0,
          'Tỷ lệ Đạt chuẩn (%)': p.passBenchmarkRate || p.khopRate || 0,
          'Tổng SL Kế hoạch': p.totalPlanQty || 0,
          'Tổng SL Thực tế': p.totalActualQty || 0,
          'Tiến độ sản lượng (%)': p.progressRate || 0
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsPic, 'TongHop_Theo_PIC')
    }

    // 3. Sheet 3: Tiến độ theo ngày
    if (dailyAggregates && dailyAggregates.length > 0) {
      const wsDaily = XLSX.utils.json_to_sheet(
        dailyAggregates.map((d, idx) => ({
          STT: idx + 1,
          'Ngày KHSX': d.date,
          'Số lệnh (WO)': d.ticketCount || d.orderCount || 0,
          'Tổng SL Kế hoạch': d.planQty || 0,
          'Tổng SL Thực tế': d.actualQty || 0,
          'Đạt KCS': d.passQty || 0,
          'Tỷ lệ đạt (%)':
            (d.actualQty || 0) > 0
              ? Number((((d.passQty || 0) / d.actualQty) * 100).toFixed(1))
              : 100
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsDaily, 'TienDo_Theo_Ngay')
    }

    await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
  } else {
    // 1. Sheet 1: Chi tiết Thống kê sản xuất theo khung chuẩn hệ thống
    const reportTitle = `BÁO CÁO NHẬT TRÌNH CHI TIẾT THỐNG KÊ SẢN XUẤT - ${plantDisplayName}`
    const wb = generateExcelWorkbook({
      data: displayDetailList,
      columns: validCols,
      sheetName: 'NhatTrinh_ChiTiet_TKSX',
      reportTitle,
      filterInfo,
      includeHeaders: includeHeaders !== false
    })

    // 2. Sheet 2: Tổng hợp theo Máy
    if (displayMachineList && displayMachineList.length > 0) {
      const wsMachine = XLSX.utils.json_to_sheet(
        displayMachineList.map((m, idx) => ({
          STT: idx + 1,
          'Mã máy': m.machineCode || '',
          'Tên máy': m.machineName || '',
          'Tổ phụ trách': m.team || m.teamName || '',
          'Số phiếu': m.tickets || m.ticketCount || 0,
          'Tổng giờ chạy (h)': m.runtimeHours || 0,
          'Hiệu suất ĐM/24h (%)': m.runtimeVsCapacity || 0,
          'Số lần > 12h': m.over12hCount || 0,
          'Sản lượng SX': m.actualQty || 0,
          'Sản lượng đạt': m.passQty || 0,
          'Phế phẩm': m.defectQty || 0,
          'Tỷ lệ đạt (%)': m.passRate || 0,
          'Tỷ lệ MES (%)': m.mesRate || 0,
          'Tốc độ (SP/h)': m.speedPerHour || 0
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsMachine, 'TongHop_Theo_May')
    }

    // 3. Sheet 3: Tổng hợp theo Tổ SX
    if (teamAggregates && teamAggregates.length > 0) {
      const wsTeam = XLSX.utils.json_to_sheet(
        teamAggregates.map((t, idx) => ({
          STT: idx + 1,
          'Tổ sản xuất': t.team || t.teamName || '',
          'Số phiếu': t.tickets || t.ticketCount || 0,
          'Sản lượng SX': t.actualQty || 0,
          'Sản lượng đạt': t.passQty || 0,
          'Phế phẩm': t.defectQty || 0,
          'Tỷ lệ đạt (%)': t.passRate || 0,
          'Giờ máy chạy (h)': t.runtimeHours || 0,
          'Tốc độ (SP/h)': t.speedPerHour || 0
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsTeam, 'TongHop_Theo_To_SX')
    }

    // 4. Sheet 4: Tiến độ theo Ngày
    if (dailyAggregates && dailyAggregates.length > 0) {
      const wsDaily = XLSX.utils.json_to_sheet(
        dailyAggregates.map((d, idx) => ({
          STT: idx + 1,
          'Ngày sản xuất': d.date,
          'Số phiếu SX': d.ticketCount || 0,
          'Sản lượng SX': d.actualQty || 0,
          'Đạt KCS': d.passQty || 0,
          'Phế phẩm': d.defectQty || 0,
          'Tổng giờ chạy (h)': Number((d.runtimeHours || 0).toFixed(1)),
          'Tỷ lệ đạt (%)':
            (d.actualQty || 0) > 0
              ? Number((((d.passQty || 0) / d.actualQty) * 100).toFixed(1))
              : 100
        }))
      )
      XLSX.utils.book_append_sheet(wb, wsDaily, 'TienDo_Theo_Ngay')
    }

    await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
  }
}
