import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { STAT_REPORT_COLUMN_SCHEMA } from '../constants/calcConstants'
import { normalizeRowOperationalTimePair } from './fileParsers'

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

  // Format "HH:mm" hoặc "H:mm" hoặc "HH:mm:ss" (kèm AM/PM/SA/CH)
  const timeMatch = str.match(
    /(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|SA|CH))?/i
  )
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : ''
    if ((ampm === 'PM' || ampm === 'CH') && hours < 12) hours += 12
    if ((ampm === 'AM' || ampm === 'SA') && hours === 12) hours = 0
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

  // Custom regex parse đa dạng định dạng ngày giờ Việt Nam & ERP (kèm AM/PM/SA/CH)
  const m = str.match(
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|SA|CH)?)?/i
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
    if ((ampm === 'PM' || ampm === 'CH') && hours < 12) hours += 12
    if ((ampm === 'AM' || ampm === 'SA') && hours === 12) hours = 0

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
 * Ghép chuỗi ngày và giờ thành định dạng hoàn chỉnh dd/MM/yy HH:mm:ss
 */
export function combineDateAndTime(dateVal, timeVal) {
  const dStr = dateVal !== undefined && dateVal !== null ? String(dateVal).trim() : ''
  const tStr = timeVal !== undefined && timeVal !== null ? String(timeVal).trim() : ''

  if (!dStr && !tStr) return ''
  if (!dStr) return tStr
  if (!tStr) return dStr

  // Nếu tStr đã bao gồm ngày tháng (chứa '/' hoặc '-' cùng khoảng trắng và giờ)
  if (/\d{1,4}[-/]\d{1,2}[-/]\d{2,4}\s+\d{1,2}:\d{2}/.test(tStr)) {
    return tStr
  }

  // Nếu dStr đã bao gồm cả giờ
  if (/\d{1,4}[-/]\d{1,2}[-/]\d{2,4}\s+\d{1,2}:\d{2}/.test(dStr)) {
    return dStr
  }

  return `${dStr} ${tStr}`
}

/**
 * Tính tổng thời gian sản xuất thực tế (phút) = (Ngày kết thúc + Giờ kết thúc) - (Ngày bắt đầu + Giờ bắt đầu) - Hao phí
 */
export function calcTotalProductionMinutes(
  startDateVal,
  startTimeVal,
  endDateVal,
  endTimeVal,
  downtime = 0
) {
  const startFull = combineDateAndTime(startDateVal, startTimeVal)
  const endFull = combineDateAndTime(endDateVal, endTimeVal)

  const startTs = parseFullDateTime(startFull)
  const endTs = parseFullDateTime(endFull)

  let diffMin = null
  if (startTs !== null && endTs !== null) {
    diffMin = (endTs - startTs) / 60000
    if (diffMin < 0) {
      diffMin += 1440
    }
  } else {
    const sMin = parseTimeToMinutesInDay(startTimeVal)
    const eMin = parseTimeToMinutesInDay(endTimeVal)
    if (sMin !== null && eMin !== null) {
      diffMin = eMin - sMin
      if (diffMin < 0) diffMin += 1440
    }
  }

  if (diffMin !== null) {
    const dt = parseFloat(String(downtime ?? 0).replace(/,/g, '')) || 0
    const rawRunTime = diffMin - dt
    return Math.max(0, Number(rawRunTime.toFixed(2)))
  }

  return null
}

/**
 * Định dạng số giây chênh lệch thành chuỗi "hh:mm:ss" (luôn lấy giá trị dương)
 */
function formatSecondsToHms(diffSec) {
  if (diffSec === null || diffSec === undefined || diffSec === '') return ''
  if (typeof diffSec === 'string') {
    const s = diffSec.trim()
    if (s.includes(':')) return s
  }
  if (isNaN(diffSec)) return ''

  const absSec = Math.abs(Math.round(diffSec))

  const h = Math.floor(absSec / 3600)
  const m = Math.floor((absSec % 3600) / 60)
  const s = absSec % 60

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * Chuẩn hóa số lệnh thao tác & mã phiếu thống kê để khớp chính xác giữa các sheet
 */
function normalizeCode(val) {
  if (val === undefined || val === null) return ''
  return String(val).trim().toUpperCase()
}

/**
 * Tạo danh sách các khóa tra cứu mở rộng (nguyên bản, bỏ ký tự đặc biệt, bỏ số 0 ở đầu)
 */
export function getLookupKeys(code) {
  if (!code) return []
  const norm = normalizeCode(code)
  const clean = norm.replace(/[^A-Z0-9]/g, '')
  const keys = new Set([norm])
  if (clean) {
    keys.add(clean)
    const noLeadingZero = clean.replace(/^0+/, '')
    if (noLeadingZero) keys.add(noLeadingZero)
  }
  return Array.from(keys)
}

/**
 * Trích xuất Số phiếu thống kê / Mã thống kê / Phiếu TK / Số phiếu duyệt từ đối tượng dòng dữ liệu
 */
export function extractTicketOrSlipCode(row) {
  if (!row || typeof row !== 'object') return ''

  // 1. Kiểm tra danh sách các trường thuộc tính phổ biến
  const directCandidates = [
    row.BravoStatCode,
    row.BravoStatSlipNo,
    row['Mã lệnh thống kê Bravo'],
    row['Mã lệnh thống kê bravo'],
    row['Mã lệnh thống kê'],
    row['Mã thống kê Bravo'],
    row['Mã thống kê bravo'],
    row['Mã lệnh TK Bravo'],
    row['Mã TK Bravo'],
    row.StatSlipNo,
    row.ApprovalSlipNo,
    row.TicketNo,
    row.StatTicketNo,
    row.SlipNo,
    row.StatCode,
    row.RegCode,
    row['Phiếu TK'],
    row['Phiếu tk'],
    row['phiếu tk'],
    row['Phiếu Tk'],
    row['Mã TK'],
    row['Mã tk'],
    row['mã tk'],
    row['Mã Thống kê'],
    row['Mã Thống Kê'],
    row['Mã thống kê'],
    row['mã thống kê'],
    row['Số phiếu thống kê'],
    row['Số phiếu TK'],
    row['Số phiếu tk'],
    row['Số phiếu'],
    row['Số thống kê'],
    row['Số TK'],
    row['Số tk'],
    row['Mã phiếu'],
    row['Mã phiếu TK'],
    row['Mã phiếu tk'],
    row['Mã phiếu thống kê'],
    row['Số phiếu duyệt'],
    row['Mã phiếu duyệt'],
    row['Phiếu thống kê'],
    row['Phiếu duyệt'],
    row.Phiếu_TK,
    row.Mã_TK,
    row.Mã_thống_kê,
    row.Mã_Thống_kê,
    row.Số_phiếu_TK,
    row.Số_phiếu_thống_kê,
    row.Số_phiếu_duyệt
  ]

  for (const c of directCandidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      return normalizeCode(c)
    }
  }

  // 2. Quét động các thuộc tính nếu cột có tên đặc thù
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null || String(v).trim() === '') continue
    const cleanKey = k.toLowerCase().replace(/[_\s\-\r\n\t]+/g, '')
    if (
      cleanKey.includes('phieutk') ||
      cleanKey.includes('matk') ||
      cleanKey.includes('sotk') ||
      cleanKey.includes('mathongke') ||
      cleanKey.includes('sothongke') ||
      cleanKey.includes('phieuthongke') ||
      cleanKey.includes('phieuduyet') ||
      cleanKey.includes('statslipno') ||
      cleanKey.includes('approvalslipno') ||
      cleanKey.includes('ticketno') ||
      cleanKey.includes('slipno') ||
      cleanKey.includes('statcode') ||
      cleanKey.includes('regcode') ||
      cleanKey.includes('sophieutk') ||
      cleanKey.includes('sophieuthongke') ||
      cleanKey.includes('sophieuduyet') ||
      cleanKey.includes('maphieutk') ||
      cleanKey.includes('maphieu') ||
      (cleanKey.includes('sophieu') && !cleanKey.includes('xuat') && !cleanKey.includes('nhap'))
    ) {
      return normalizeCode(v)
    }
  }

  return ''
}

/**
 * Trích xuất Thời gian duyệt từ đối tượng dòng duyệt MES
 */
export function extractMesApprovedTime(row) {
  if (!row || typeof row !== 'object') return ''

  const directCandidates = [
    row.ApprovedTime,
    row.ApprovalTime,
    row.MesApprovedTime,
    row.ApprovedDate,
    row.ApprovalDate,
    row.ApproveTime,
    row.TimeApproved,
    row['Thời gian duyệt'],
    row['Thời gian duyệt ở MES'],
    row['Thời gian duyệt phiếu ở MES'],
    row['Thời gian duyệt phiếu'],
    row['Thời gian phê duyệt'],
    row['Thời gian duyệt MES'],
    row['TG duyệt'],
    row['TG duyệt ở MES'],
    row['Ngày duyệt'],
    row['Ngày phê duyệt'],
    row['Ngày duyệt phiếu'],
    row['Ngày duyệt ở MES'],
    row['Giờ duyệt'],
    row.Thời_gian_duyệt,
    row.Thời_gian_duyệt_ở_MES,
    row.Thời_gian_duyệt_phiếu_ở_MES,
    row.TG_duyệt,
    row.TG_duyệt_ở_MES
  ]

  for (const c of directCandidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      return String(c).trim()
    }
  }

  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null || String(v).trim() === '') continue
    const cleanKey = k.toLowerCase().replace(/[_\s\-\r\n\t]+/g, '')
    if (
      cleanKey.includes('approvedtime') ||
      cleanKey.includes('approvaltime') ||
      cleanKey.includes('mesapprovedtime') ||
      cleanKey.includes('thoigianduyet') ||
      cleanKey.includes('tgduyet') ||
      cleanKey.includes('ngayduyet') ||
      cleanKey.includes('thoigianpheduyet') ||
      cleanKey.includes('ngaypheduyet') ||
      cleanKey.includes('gioduyet') ||
      (cleanKey.includes('duyet') &&
        (cleanKey.includes('time') ||
          cleanKey.includes('date') ||
          cleanKey.includes('thoigian') ||
          cleanKey.includes('ngay') ||
          cleanKey.includes('gio') ||
          cleanKey.includes('tg')))
    ) {
      return String(v).trim()
    }
  }

  return ''
}

/**
 * Module tính toán TKSX (Thống kê sản xuất) và đối soát với Duyệt sản lượng MES & KHSX Lệnh thao tác
 */
export const calculateTKSX = (files = {}, masterInfo = {}, planResult = null) => {
  const calcVersion = masterInfo.calcVersion || masterInfo.version || masterInfo.Version || 'V1'
  const regCode = masterInfo.regCode || masterInfo.RegCode || files.masterInfo?.regCode || ''
  const statReportData = files.stat_report?.data || []
  const summaryOpData = files.summary_op?.data || []
  const unfinishedOpData = files.unfinished_op?.data || []
  const mesApprovalData = files.mes_approval?.data || []

  // ── 1. TẠO TỪ ĐIỂN TRA CỨU KẾ HOẠCH LỆNH THAO TÁC (TỪ KẾT QUẢ KHSX) ──
  const opOrderPlanMap = new Map()

  if (planResult && typeof planResult === 'object') {
    // Khi đã có kết quả tính KHSX (kể cả khi 0 dòng) -> chỉ lấy đúng các lệnh có trong KHSX của ngày báo cáo đó
    const planRows = planResult.calculatedRows || []
    planRows.forEach((row) => {
      const code = normalizeCode(
        row.OperationOrderNo ??
          row['Số lệnh thao tác'] ??
          row['Số lệnh TT'] ??
          row['Lệnh thao tác'] ??
          row.OperationOrder ??
          row.OperationNo ??
          ''
      )
      if (code) {
        const keys = getLookupKeys(code)
        keys.forEach((k) => opOrderPlanMap.set(k, 'Có trong KHSX'))
      }
    })
  } else {
    // Chỉ khi không có đối tượng planResult truyền vào mới tra cứu từ dữ liệu thô
    summaryOpData.forEach((row) => {
      const code = normalizeCode(
        row.OperationOrderNo ??
          row['Lệnh thao tác'] ??
          row['Số lệnh thao tác'] ??
          row['Số lệnh TT'] ??
          row.OperationOrder ??
          ''
      )
      if (code) {
        const keys = getLookupKeys(code)
        keys.forEach((k) => opOrderPlanMap.set(k, 'Có trong KHSX'))
      }
    })
  }

  // ── 2. TẠO TỪ ĐIỂN TRA CỨU THỜI GIAN DUYỆT MES (TỪ FILE 4) ──
  // Mục đích: Phục vụ Cột 94 (Thời gian duyệt phiếu ở MES) theo Phiếu TK / Mã thống kê
  const mesApprovalMap = new Map()

  mesApprovalData.forEach((row) => {
    const approvedTime = extractMesApprovedTime(row)
    if (!approvedTime) return

    // 1. Khóa chính: Mã lệnh thống kê Bravo (VD: TK2609-453717, TK2609-031222)
    const bravoCode =
      row.BravoStatCode ??
      row.BravoStatSlipNo ??
      row['Mã lệnh thống kê Bravo'] ??
      row['Mã lệnh thống kê bravo'] ??
      row['Mã lệnh thống kê'] ??
      row['Mã thống kê Bravo'] ??
      row['Mã thống kê'] ??
      ''
    if (bravoCode) {
      const keys = getLookupKeys(bravoCode)
      keys.forEach((k) => mesApprovalMap.set(k, approvedTime))
    }

    // 2. Khóa phụ: Mã phiếu duyệt MES (VD: SLIP-TH-GS1-260929-049)
    const slipNo =
      row.SlipNo ??
      row.ApprovalSlipNo ??
      row['Mã phiếu'] ??
      row['Số phiếu duyệt'] ??
      extractTicketOrSlipCode(row)
    if (slipNo) {
      const keys = getLookupKeys(slipNo)
      keys.forEach((k) => mesApprovalMap.set(k, approvedTime))
    }

    // 3. Khóa dự phòng: Mã lệnh thao tác (VD: CD03-0926-0364(234))
    const opOrderNo = normalizeCode(row.OperationOrderNo ?? row['Mã lệnh thao tác'] ?? '')
    if (opOrderNo) {
      const keys = getLookupKeys(opOrderNo)
      keys.forEach((k) => {
        if (!mesApprovalMap.has(k)) mesApprovalMap.set(k, approvedTime)
      })
    }
  })

  // ── 3. ĐẾM TẦN SUẤT SỐ PHIẾU THỐNG KÊ ĐỂ TÌM PHIẾU TRÙNG (CỘT 96) ──
  const slipCountMap = new Map()
  statReportData.forEach((row) => {
    const slipNo = extractTicketOrSlipCode(row)
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
  let mesMatchedCount = 0

  const statByMachine = {}
  const statByTeam = {}
  const statByTechnician = {}

  const calculatedRows = statReportData.map((row, index) => {
    const rowObj = { ...row }
    normalizeRowOperationalTimePair(rowObj)

    // Lấy các trường dữ liệu cơ bản
    const produced =
      parseFloat(
        String(
          rowObj.ProducedQty ?? rowObj['Số lượng sản xuất'] ?? rowObj['Số lượng thực hiện'] ?? 0
        ).replace(/,/g, '')
      ) || 0
    const qualified =
      parseFloat(String(rowObj.QualifiedQty ?? rowObj['Số lượng đạt'] ?? 0).replace(/,/g, '')) || 0
    const defect =
      parseFloat(String(rowObj.DefectQty ?? rowObj['Số lượng lỗi'] ?? 0).replace(/,/g, '')) || 0
    const downtime =
      parseFloat(
        String(
          rowObj.TotalDowntimeMinutes ??
            rowObj['Tổng tg hao phí\r\n(5)=1+2+3+4'] ??
            rowObj['Tổng tg hao phí\n(5)=1+2+3+4'] ??
            rowObj['Tổng tg hao phí (5)=1+2+3+4'] ??
            rowObj['Tổng tg hao phí'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // Cột 26 (Z): Bắt đầu & Cột 27 (AA): Kết thúc
    const startVal =
      rowObj.StartTime ??
      rowObj['Bắt đầu'] ??
      rowObj['Thời gian bắt đầu'] ??
      rowObj['Thời gian bắt đầu (5)'] ??
      rowObj['Thời gian bắt đầu\r\n(5)'] ??
      rowObj['Thời gian bắt đầu\n(5)'] ??
      rowObj['TG bắt đầu'] ??
      rowObj['Bat dau'] ??
      ''
    const endVal =
      rowObj.EndTime ??
      rowObj['Kết thúc'] ??
      rowObj['Thời gian kết thúc'] ??
      rowObj['Thời gian kết thúc (6)'] ??
      rowObj['Thời gian kết thúc\r\n(6)'] ??
      rowObj['Thời gian kết thúc\n(6)'] ??
      rowObj['TG kết thúc'] ??
      rowObj['Ket thuc'] ??
      ''

    const startDateVal =
      rowObj.StartDate ??
      rowObj['Ngày bắt đầu'] ??
      rowObj['Ngay bat dau'] ??
      ''
    const endDateVal =
      rowObj.EndDate ??
      rowObj['Ngày kết thúc'] ??
      rowObj['Ngay ket thuc'] ??
      rowObj.StatDate ??
      rowObj['Ngày thống kê'] ??
      ''

    // ── CỘT 91 (CM): Thời gian chạy thực tế (phút) = (Ngày kết thúc + Giờ kết thúc) - (Ngày bắt đầu + Giờ bắt đầu) - Hao phí ──
    let actualRunTime = calcTotalProductionMinutes(
      startDateVal,
      startVal,
      endDateVal,
      endVal,
      downtime
    )
    if (actualRunTime === null) {
      if (row.ActualRunTime !== undefined && row.ActualRunTime !== '') {
        actualRunTime = parseFloat(String(row.ActualRunTime).replace(/,/g, '')) || 0
      } else {
        actualRunTime = ''
      }
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

    // ── CỘT 93 (CO): CHECK KHSX (So sánh với kết quả KHSX: 'Có trong KHSX' hoặc 'Khác KHSX') ──
    const opOrderNo = normalizeCode(
      row.OperationOrderNo ??
        row['Số lệnh thao tác'] ??
        row['Số lệnh TT'] ??
        row['Lệnh thao tác'] ??
        row['Lệnh TT'] ??
        row.OpOrderNo ??
        row.OperationNo ??
        ''
    )
    let checkKhsx = 'Khác KHSX'
    if (opOrderNo) {
      const keys = getLookupKeys(opOrderNo)
      const isPlan = keys.some((k) => opOrderPlanMap.has(k))
      if (isPlan) {
        checkKhsx = 'Có trong KHSX'
        insidePlanCount++
      } else {
        checkKhsx = 'Khác KHSX'
        outsidePlanCount++
      }
    } else {
      outsidePlanCount++
    }

    // ── CỘT 94 (CP): Thời gian duyệt phiếu ở MES ──
    // Đối soát Phiếu TK / Mã thống kê giữa file TKSX và file Duyệt MES
    const statSlipNo = extractTicketOrSlipCode(row)
    let mesApprovedTime = ''
    if (statSlipNo) {
      const keys = getLookupKeys(statSlipNo)
      for (const k of keys) {
        if (mesApprovalMap.has(k)) {
          mesApprovedTime = mesApprovalMap.get(k)
          break
        }
      }
    }
    if (!mesApprovedTime) {
      mesApprovedTime =
        extractMesApprovedTime(row) ||
        row.MesApprovedTime ||
        row['Thời gian duyệt phiếu ở MES'] ||
        row['Thời gian duyệt ở MES'] ||
        row['Thời gian duyệt'] ||
        ''
    }
    if (mesApprovedTime) {
      mesMatchedCount++
    }

    // ── CỘT 95 (CQ): Độ trễ thời gian đồng bộ 2 hệ thống ──
    // Công thức Excel: =+IF(OR(CL3="", CP3=""), "", TEXT(ABS(CP3 - CL3), "hh:mm:ss"))
    const slipCreatedDate = row.SlipCreatedDate ?? row['Ngày tạo phiếu'] ?? ''
    let syncLatencySeconds = ''
    if (slipCreatedDate && mesApprovedTime) {
      const createdTs = parseFullDateTime(slipCreatedDate)
      let approvedTs = parseFullDateTime(mesApprovedTime)
      if (createdTs && approvedTs) {
        let diffSec = Math.abs(Math.round((approvedTs - createdTs) / 1000))
        // Tự động phát hiện & sửa lỗi đảo ngày/tháng (MM/DD <-> DD/MM) trong file xuất từ MES
        if (diffSec > 86400) {
          const m = String(mesApprovedTime)
            .trim()
            .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(.*)/)
          if (m) {
            const swappedStr = `${m[2]}/${m[1]}/${m[3]}${m[4]}`
            const swappedTs = parseFullDateTime(swappedStr)
            if (swappedTs) {
              const swappedDiff = Math.abs(Math.round((swappedTs - createdTs) / 1000))
              if (swappedDiff < diffSec) {
                approvedTs = swappedTs
                diffSec = swappedDiff
                mesApprovedTime = swappedStr
              }
            }
          }
        }
        syncLatencySeconds = formatSecondsToHms(diffSec)
        totalSyncDelaySec += diffSec
        syncCount++
      }
    } else if (
      row.SyncLatencySeconds ||
      row.SyncDelayMinutes ||
      row.syncDelayMinutes ||
      row.syncLatencySeconds ||
      row['Độ trễ thời gian đồng bộ 2 hệ thống'] ||
      row['Độ trễ thời gian đồng bộ']
    ) {
      syncLatencySeconds = formatSecondsToHms(
        row.SyncLatencySeconds ??
          row.SyncDelayMinutes ??
          row.syncDelayMinutes ??
          row.syncLatencySeconds ??
          row['Độ trễ thời gian đồng bộ 2 hệ thống'] ??
          row['Độ trễ thời gian đồng bộ']
      )
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
    // Công thức Excel: =IF(AND(CF3=0,CG3=0),"Không sử dụng NVL",IF(CF3=0,"",IF(CH3="","Không có XKTĐ","Có XKTĐ"))&IF(AND(CF3<>0,CG3<>0),", ","")&IF(CG3=0,"",IF(CI3="","Không NKTĐ","Có NKTĐ")))
    const autoExport =
      parseInt(row.IsAutoExport ?? row.AutoExport ?? row['Xuất tự động'] ?? 0, 10) || 0
    const autoImport =
      parseInt(row.IsAutoImport ?? row.AutoImport ?? row['Nhập tự động'] ?? 0, 10) || 0
    const exportSlipNo = String(
      row.ExportSlipNo ??
        row['Số phiếu xuất'] ??
        row['Phiếu xuất'] ??
        row.ExportDocNo ??
        row.StatSlipNo_87 ??
        ''
    ).trim()
    const importSlipNo = String(
      row.ImportSlipNo ??
        row['Số phiếu nhập'] ??
        row['Phiếu nhập'] ??
        row.ImportDocNo ??
        row.StatSlipNo_88 ??
        ''
    ).trim()

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

    // Đồng bộ 2 chiều thời gian thực hiện & ngày tháng
    const statDateVal = rowObj.StatDate ?? rowObj['Ngày thống kê'] ?? ''

    rowObj.StartTime = startVal
    rowObj['Bắt đầu'] = startVal
    rowObj['Thời gian bắt đầu'] = startVal

    rowObj.EndTime = endVal
    rowObj['Kết thúc'] = endVal
    rowObj['Thời gian kết thúc'] = endVal

    rowObj.StartDate = startDateVal
    rowObj['Ngày bắt đầu'] = startDateVal

    rowObj.EndDate = endDateVal
    rowObj['Ngày kết thúc'] = endDateVal

    rowObj.StatDate = statDateVal
    rowObj['Ngày thống kê'] = statDateVal

    // Gán lại đầy đủ cả key tiếng Anh & key tiếng Việt để hỗ trợ hiển thị 100% linh hoạt
    rowObj.CalcVersion = calcVersion
    rowObj['Version tính toán'] = calcVersion
    rowObj['Phiên bản'] = calcVersion
    rowObj.RegCode = regCode
    rowObj['Mã đăng ký'] = regCode

    rowObj.ActualRunTime = actualRunTime
    rowObj['Thời gian chạy thực tế'] = actualRunTime

    rowObj.ActualCapa = actualCapa
    rowObj['capa thực tế'] = actualCapa

    rowObj.CheckKhsx = checkKhsx
    rowObj['CHECK KHSX'] = checkKhsx
    rowObj['Check KHSX'] = checkKhsx
    rowObj['Cột 93'] = checkKhsx

    rowObj.MesApprovedTime = mesApprovedTime
    rowObj.MesApprovalTime = mesApprovedTime
    rowObj['Thời gian duyệt phiếu ở MES'] = mesApprovedTime
    rowObj['Thời gian duyệt ở MES'] = mesApprovedTime
    rowObj['Thời gian duyệt'] = mesApprovedTime

    rowObj.SyncLatencySeconds = syncLatencySeconds
    rowObj.SyncDelayMinutes = syncLatencySeconds
    rowObj.syncDelayMinutes = syncLatencySeconds
    rowObj.syncLatencySeconds = syncLatencySeconds
    rowObj['Độ trễ thời gian đồng bộ 2 hệ thống'] = syncLatencySeconds
    rowObj['Độ trễ thời gian đồng bộ'] = syncLatencySeconds

    rowObj.IsDuplicateSlip = isDuplicateSlip
    rowObj.IsDuplicateTicket = isDuplicateSlip
    rowObj['Phiếu sinh trùng'] = isDuplicateSlip

    rowObj.CreatedLocation = createdLocation
    rowObj.TicketCreationLocation = createdLocation
    rowObj['Vị trí tạo phiếu tk'] = createdLocation

    rowObj.AutoExportImportGenerated = autoExportImportGenerated
    rowObj.AutoIoStatus = autoExportImportGenerated
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

    if (!rowObj.IdSeq) {
      rowObj.IdSeq =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `TKSX-${Date.now()}-${index + 1}`
    }
    if (rowObj.RowVersion === undefined) {
      rowObj.RowVersion = 1
    }
    if (!rowObj.CreatedAt) {
      rowObj.CreatedAt = new Date().toISOString()
    }
    if (!rowObj.WorkingTag && !rowObj.Status) {
      rowObj.WorkingTag = 'A'
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
    version: calcVersion,
    calcVersion,
    regCode,
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
      mesMatchedTickets: mesMatchedCount,
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
    columns: files.stat_report?.columns || STAT_REPORT_COLUMN_SCHEMA
  }
}
