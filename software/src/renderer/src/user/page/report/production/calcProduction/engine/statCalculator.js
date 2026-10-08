import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { STAT_REPORT_COLUMN_SCHEMA } from '../constants/calcConstants'

dayjs.extend(customParseFormat)

/**
 * Phân tích chuỗi giờ thành số phút trong ngày (0 - 1439)
 * Hỗ trợ các định dạng: "3:03", "03:03", "18:03:00", "06/10/26 18:03", "2026-10-06 18:03"
 */
function parseTimeToMinutesInDay(val) {
  if (val === undefined || val === null || val === '') return null

  if (typeof val === 'number') {
    if (val >= 0 && val <= 1) {
      return val * 1440
    }
    if (val > 1) {
      const frac = val - Math.floor(val)
      return frac * 1440
    }
    return val
  }

  const str = String(val).trim()
  if (!str) return null

  // Format số float dạng chuỗi
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str)
    if (!isNaN(num)) {
      if (num >= 0 && num <= 1) return num * 1440
      if (num > 1) return (num - Math.floor(num)) * 1440
    }
  }

  // Format "HH:mm" hoặc "H:mm" hoặc "HH:mm:ss"
  const timeMatch = str.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    return hours * 60 + minutes + seconds / 60
  }

  return null
}

/**
 * Phân tích chuỗi ngày giờ thành unix timestamp (milliseconds)
 */
function parseFullDateTime(val) {
  if (val === undefined || val === null || val === '') return null

  if (typeof val === 'number') {
    if (val > 25569) {
      return (val - 25569) * 86400 * 1000
    }
  }

  const str = String(val).trim()
  if (!str) return null

  // Custom regex parse đa dạng định dạng ngày giờ Việt Nam & ERP (kèm AM/PM)
  const m = str.match(
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i
  )
  if (m) {
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10)
    let year = parseInt(m[3], 10)
    if (year < 100) year += 2000
    let hours = m[4] ? parseInt(m[4], 10) : 0
    const mins = m[5] ? parseInt(m[5], 10) : 0
    const secs = m[6] ? parseInt(m[6], 10) : 0
    const ampm = m[7] ? m[7].toUpperCase() : ''
    if (ampm === 'PM' && hours < 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0

    return new Date(year, month - 1, day, hours, mins, secs).getTime()
  }

  // Thử các format dayjs
  const formats = [
    'DD/MM/YYYY HH:mm:ss',
    'DD/MM/YYYY HH:mm',
    'DD/MM/YY HH:mm:ss',
    'DD/MM/YY HH:mm',
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm'
  ]

  for (const fmt of formats) {
    const d = dayjs(str, fmt, true)
    if (d.isValid()) return d.valueOf()
  }

  const d = dayjs(str)
  if (d.isValid()) return d.valueOf()

  return null
}

/**
 * Định dạng số giây chênh lệch thành chuỗi "hh:mm:ss" (hoặc "-hh:mm:ss" nếu âm)
 */
function formatSecondsToHms(diffSec) {
  if (diffSec === null || diffSec === undefined || isNaN(diffSec)) return ''

  const isNeg = diffSec < 0
  const absSec = Math.abs(Math.round(diffSec))

  const h = Math.floor(absSec / 3600)
  const m = Math.floor((absSec % 3600) / 60)
  const s = absSec % 60

  const pad = (n) => String(n).padStart(2, '0')
  const formatted = `${pad(h)}:${pad(m)}:${pad(s)}`
  return isNeg ? `-${formatted}` : formatted
}

/**
 * Chuẩn hóa số lệnh thao tác để khớp chính xác giữa các sheet
 */
function normalizeCode(val) {
  if (!val) return ''
  return String(val).trim().toUpperCase()
}

/**
 * Module tính toán TKSX (Thống kê sản xuất) và đối soát với Duyệt sản lượng MES & KHSX Lệnh thao tác
 */
export const calculateTKSX = (files = {}) => {
  const statReportData = files.stat_report?.data || []
  const summaryOpData = files.summary_op?.data || []
  const unfinishedOpData = files.unfinished_op?.data || []
  const mesApprovalData = files.mes_approval?.data || []

  // ── 1. TẠO TỪ ĐIỂN TRA CỨU KẾ HOẠCH LỆNH THAO TÁC (TỪ FILE 3 VÀ FILE 2) ──
  // Mục đích: Phục vụ Cột 93 (CHECK KHSX: 'KHSX' nếu có lệnh trong file, ngược lại 'Khác KHSX')
  const opOrderPlanMap = new Map()

  summaryOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row['Lệnh thao tác'] ??
        row['Số lệnh thao tác'] ??
        row.OperationOrder ??
        ''
    )
    if (code) {
      opOrderPlanMap.set(code, 'KHSX')
    }
  })

  unfinishedOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
    )
    if (code && !opOrderPlanMap.has(code)) {
      opOrderPlanMap.set(code, 'KHSX')
    }
  })

  // ── 2. TẠO TỪ ĐIỂN TRA CỨU THỜI GIAN DUYỆT MES (TỪ FILE 4) ──
  // Mục đích: Phục vụ Cột 94 (Thời gian duyệt phiếu ở MES) theo Số phiếu thống kê
  const mesApprovalMap = new Map()

  mesApprovalData.forEach((row) => {
    const slipNo = normalizeCode(
      row.ApprovalSlipNo ??
        row['Số phiếu duyệt'] ??
        row['Số phiếu'] ??
        row['Số phiếu thống kê'] ??
        row.StatSlipNo ??
        ''
    )
    const approvedTime =
      row.ApprovedTime ??
      row['Thời gian duyệt'] ??
      row['Thời gian duyệt phiếu'] ??
      row['Thời gian duyệt phiếu ở MES'] ??
      row.ApprovalTime ??
      ''
    if (slipNo && approvedTime) {
      mesApprovalMap.set(slipNo, String(approvedTime).trim())
    }
  })

  // ── 3. ĐẾM TẦN SUẤT SỐ PHIẾU THỐNG KÊ ĐỂ TÌM PHIẾU TRÙNG (CỘT 96) ──
  const slipCountMap = new Map()
  statReportData.forEach((row) => {
    const slipNo = normalizeCode(row.StatSlipNo ?? row['Số phiếu thống kê'] ?? '')
    if (slipNo) {
      slipCountMap.set(slipNo, (slipCountMap.get(slipNo) || 0) + 1)
    }
  })

  // ── 4. TÍNH TOÁN CHI TIẾT TỪNG DÒNG (98 CỘT CHUẨN TKSX) ──
  let totalProducedQty = 0
  let totalQualifiedQty = 0
  let totalDefectQty = 0
  let totalDowntimeMinutes = 0
  let totalSyncDelaySec = 0
  let syncCount = 0
  let insidePlanCount = 0
  let outsidePlanCount = 0
  let mesUserCount = 0
  let bravoUserCount = 0
  let duplicateSlipCount = 0

  const statByMachine = {}
  const statByTeam = {}
  const statByTechnician = {}

  const calculatedRows = statReportData.map((row) => {
    const rowObj = { ...row }

    // Lấy các trường dữ liệu cơ bản
    const produced =
      parseFloat(
        String(
          row.ProducedQty ?? row['Số lượng sản xuất'] ?? row['Số lượng thực hiện'] ?? 0
        ).replace(/,/g, '')
      ) || 0
    const qualified =
      parseFloat(String(row.QualifiedQty ?? row['Số lượng đạt'] ?? 0).replace(/,/g, '')) || 0
    const defect =
      parseFloat(String(row.DefectQty ?? row['Số lượng lỗi'] ?? 0).replace(/,/g, '')) || 0
    const downtime =
      parseFloat(
        String(
          row.TotalDowntimeMinutes ??
            row['Tổng tg hao phí\r\n(5)=1+2+3+4'] ??
            row['Tổng tg hao phí\n(5)=1+2+3+4'] ??
            row['Tổng tg hao phí (5)=1+2+3+4'] ??
            row['Tổng tg hao phí'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // Cột 26 (Z): Bắt đầu & Cột 27 (AA): Kết thúc
    const startVal = row.StartTime ?? row['Bắt đầu'] ?? row['Thời gian bắt đầu'] ?? ''
    const endVal = row.EndTime ?? row['Kết thúc'] ?? row['Thời gian kết thúc'] ?? ''

    const startMin = parseTimeToMinutesInDay(startVal)
    const endMin = parseTimeToMinutesInDay(endVal)

    // ── CỘT 91 (CM): Thời gian chạy thực tế (phút) ──
    // Công thức Excel: =IF(OR(Z3="", AA3=""), "", ROUND((AA3-Z3)*1440, 0) - BY3)
    let actualRunTime = ''
    if (startMin !== null && endMin !== null) {
      let diffMin = endMin - startMin
      if (diffMin < 0) {
        // Làm việc qua đêm (qua 24h)
        diffMin += 1440
      }
      actualRunTime = Math.max(0, Math.round(diffMin) - downtime)
    } else if (row.ActualRunTime !== undefined && row.ActualRunTime !== '') {
      actualRunTime = parseFloat(String(row.ActualRunTime).replace(/,/g, '')) || 0
    }

    // ── CỘT 92 (CN): capa thực tế (Năng suất / giờ) ──
    // Công thức Excel: =+IF(CM3=0, 0, (T3*60 / CM3))
    let actualCapa = ''
    if (typeof actualRunTime === 'number') {
      if (actualRunTime > 0) {
        actualCapa = Number(((produced * 60) / actualRunTime).toFixed(2))
      } else {
        actualCapa = 0
      }
    } else if (row.ActualCapa !== undefined && row.ActualCapa !== '') {
      actualCapa = parseFloat(String(row.ActualCapa).replace(/,/g, '')) || 0
    }

    // ── CỘT 93 (CO): CHECK KHSX ('KHSX' hoặc 'Khác KHSX') ──
    const opOrderNo = normalizeCode(
      row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
    )
    let checkKhsx = 'Khác KHSX'
    if (opOrderNo && opOrderPlanMap.has(opOrderNo)) {
      checkKhsx = 'KHSX'
      insidePlanCount++
    } else {
      outsidePlanCount++
    }

    // ── CỘT 94 (CP): Thời gian duyệt phiếu ở MES ──
    // Công thức Excel: IFERROR(VLOOKUP(AE, '[1]duyet-san-luong'!$T$2:$V, 3, 0), "")
    const statSlipNo = normalizeCode(row.StatSlipNo ?? row['Số phiếu thống kê'] ?? '')
    let mesApprovedTime = ''
    if (statSlipNo && mesApprovalMap.has(statSlipNo)) {
      mesApprovedTime = mesApprovalMap.get(statSlipNo)
    } else if (row.MesApprovedTime || row['Thời gian duyệt phiếu ở MES']) {
      mesApprovedTime = row.MesApprovedTime || row['Thời gian duyệt phiếu ở MES']
    }

    // ── CỘT 95 (CQ): Độ trễ thời gian đồng bộ 2 hệ thống ──
    // Công thức Excel: +IF(OR(CL="", CP=""), "", IF(CP>=CL,"","-") & TEXT(ABS(CP - CL),"hh:mm:ss"))
    const slipCreatedDate = row.SlipCreatedDate ?? row['Ngày tạo phiếu'] ?? ''
    let syncLatencySeconds = ''
    if (slipCreatedDate && mesApprovedTime) {
      const createdTs = parseFullDateTime(slipCreatedDate)
      const approvedTs = parseFullDateTime(mesApprovedTime)
      if (createdTs && approvedTs) {
        const diffSec = Math.round((approvedTs - createdTs) / 1000)
        syncLatencySeconds = formatSecondsToHms(diffSec)

        if (diffSec >= 0) {
          totalSyncDelaySec += diffSec
          syncCount++
        }
      }
    } else if (row.SyncLatencySeconds || row['Độ trễ thời gian đồng bộ 2 hệ thống']) {
      syncLatencySeconds = row.SyncLatencySeconds || row['Độ trễ thời gian đồng bộ 2 hệ thống']
    }

    // ── CỘT 96 (CR): Phiếu sinh trùng (0: không trùng, 1: trùng) ──
    // Công thức Excel: IF(COUNTIF($AE:$AE, AE)=1, 0, 1)
    let isDuplicateSlip = 0
    if (statSlipNo && (slipCountMap.get(statSlipNo) || 0) > 1) {
      isDuplicateSlip = 1
      duplicateSlipCount++
    }

    // ── CỘT 97 (CS): Vị trí tạo phiếu tk (MES hoặc Bravo) ──
    // Quy tắc: Cứ user/nhân viên thống kê có chữ "MES" (không phân biệt hoa/thường) là MES, còn lại Bravo
    const statEmp = String(row.StatEmployee ?? row['Nhân viên thống kê'] ?? '').trim()
    let createdLocation = 'Bravo'
    if (statEmp.toUpperCase().includes('MES')) {
      createdLocation = 'MES'
      mesUserCount++
    } else {
      bravoUserCount++
    }

    // ── CỘT 98 (CT): Sinh phiếu xuất/nhập tự động ──
    // Công thức Excel: IF(AND(CF=0, CG=0), "Không sử dụng NVL", IF(CF=0,"",IF(CH="","Không có XKTĐ","Có XKTĐ")) & IF(AND(CF<>0,CG<>0),", ","") & IF(CG=0,"",IF(CI="","Không NKTĐ","Có NKTĐ")))
    const autoExport = parseInt(row.AutoExport ?? row['Xuất tự động'] ?? 0, 10) || 0
    const autoImport = parseInt(row.AutoImport ?? row['Nhập tự động'] ?? 0, 10) || 0
    const exportSlipNo = String(row.ExportSlipNo ?? row['Số phiếu xuất'] ?? '').trim()
    const importSlipNo = String(row.ImportSlipNo ?? row['Số phiếu nhập'] ?? '').trim()

    let autoExportImportGenerated = 'Không sử dụng NVL'
    if (autoExport === 0 && autoImport === 0) {
      autoExportImportGenerated = 'Không sử dụng NVL'
    } else {
      const parts = []
      if (autoExport !== 0) {
        parts.push(exportSlipNo ? 'Có XKTĐ' : 'Không có XKTĐ')
      }
      if (autoImport !== 0) {
        parts.push(importSlipNo ? 'Có NKTĐ' : 'Không NKTĐ')
      }
      autoExportImportGenerated = parts.join(', ') || 'Không sử dụng NVL'
    }

    // Gán lại đầy đủ cả key tiếng Anh & key tiếng Việt để hỗ trợ hiển thị 100% linh hoạt
    rowObj.ActualRunTime = actualRunTime
    rowObj['Thời gian chạy thực tế'] = actualRunTime

    rowObj.ActualCapa = actualCapa
    rowObj['capa thực tế'] = actualCapa

    rowObj.CheckKhsx = checkKhsx
    rowObj['CHECK KHSX'] = checkKhsx
    rowObj['Cột 93'] = checkKhsx

    rowObj.MesApprovedTime = mesApprovedTime
    rowObj['Thời gian duyệt phiếu ở MES'] = mesApprovedTime

    rowObj.SyncLatencySeconds = syncLatencySeconds
    rowObj['Độ trễ thời gian đồng bộ 2 hệ thống'] = syncLatencySeconds

    rowObj.IsDuplicateSlip = isDuplicateSlip
    rowObj['Phiếu sinh trùng'] = isDuplicateSlip

    rowObj.CreatedLocation = createdLocation
    rowObj['Vị trí tạo phiếu tk'] = createdLocation

    rowObj.AutoExportImportGenerated = autoExportImportGenerated
    rowObj['Sinh phiếu xuất/nhập tự động'] = autoExportImportGenerated

    // Thống kê tổng
    totalProducedQty += produced
    totalQualifiedQty += qualified
    totalDefectQty += defect
    totalDowntimeMinutes += downtime

    const machine = String(
      row.MachineName ??
        row['Tên máy sản xuất'] ??
        row.MachineCode ??
        row['Mã máy sản xuất'] ??
        'Khác'
    ).trim()
    const team = String(row.ProductionTeam ?? row['Tổ sản xuất'] ?? 'Khác').trim()
    const leadTech = String(
      row.LeadTechnicianName ?? row['Thợ chính'] ?? row['Họ tên thợ chính'] ?? 'Khác'
    ).trim()

    if (!statByMachine[machine]) {
      statByMachine[machine] = {
        machine,
        producedQty: 0,
        qualifiedQty: 0,
        defectQty: 0,
        ticketCount: 0
      }
    }
    statByMachine[machine].producedQty += produced
    statByMachine[machine].qualifiedQty += qualified
    statByMachine[machine].defectQty += defect
    statByMachine[machine].ticketCount += 1

    if (!statByTeam[team]) {
      statByTeam[team] = { team, producedQty: 0, qualifiedQty: 0, defectQty: 0 }
    }
    statByTeam[team].producedQty += produced
    statByTeam[team].qualifiedQty += qualified
    statByTeam[team].defectQty += defect

    if (leadTech && leadTech !== 'Khác') {
      if (!statByTechnician[leadTech]) {
        statByTechnician[leadTech] = {
          technician: leadTech,
          producedQty: 0,
          qualifiedQty: 0,
          defectQty: 0
        }
      }
      statByTechnician[leadTech].producedQty += produced
      statByTechnician[leadTech].qualifiedQty += qualified
      statByTechnician[leadTech].defectQty += defect
    }

    return rowObj
  })

  // Đối soát với MES
  let mesApprovedProducedQty = 0
  let mesApprovedQualifiedQty = 0
  let mesApprovedDefectQty = 0

  mesApprovalData.forEach((row) => {
    const p = parseFloat(String(row['SL sản xuất'] ?? row.ProducedQty ?? 0).replace(/,/g, '')) || 0
    const q = parseFloat(String(row['SL đạt'] ?? row.QualifiedQty ?? 0).replace(/,/g, '')) || 0
    const d = parseFloat(String(row['SL lỗi'] ?? row.DefectQty ?? 0).replace(/,/g, '')) || 0
    mesApprovedProducedQty += p
    mesApprovedQualifiedQty += q
    mesApprovedDefectQty += d
  })

  const defectRate =
    totalProducedQty > 0 ? Number(((totalDefectQty / totalProducedQty) * 100).toFixed(2)) : 0
  const avgSyncDelay = syncCount > 0 ? Number((totalSyncDelaySec / syncCount).toFixed(1)) : 0

  return {
    totalProducedQty,
    totalQualifiedQty,
    totalDefectQty,
    defectRate,
    totalTickets: statReportData.length,
    totalDowntimeMinutes,
    avgSyncDelaySeconds: avgSyncDelay,
    insidePlanCount,
    outsidePlanCount,
    mesUserCount,
    bravoUserCount,
    duplicateSlipCount,
    mesApproval: {
      totalApprovedTickets: mesApprovalData.length,
      approvedProducedQty: mesApprovedProducedQty,
      approvedQualifiedQty: mesApprovedQualifiedQty,
      approvedDefectQty: mesApprovedDefectQty,
      discrepancyProducedQty: totalProducedQty - mesApprovedProducedQty,
      discrepancyQualifiedQty: totalQualifiedQty - mesApprovedQualifiedQty
    },
    machineBreakdown: Object.values(statByMachine).sort((a, b) => b.producedQty - a.producedQty),
    teamBreakdown: Object.values(statByTeam).sort((a, b) => b.producedQty - a.producedQty),
    technicianBreakdown: Object.values(statByTechnician).sort(
      (a, b) => b.producedQty - a.producedQty
    ),
    // Bảng dữ liệu kết quả TKSX hoàn chỉnh
    calculatedRows,
    columns: STAT_REPORT_COLUMN_SCHEMA
  }
}
