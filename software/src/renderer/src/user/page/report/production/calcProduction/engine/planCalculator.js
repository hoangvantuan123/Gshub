/* eslint-disable no-useless-escape */
import dayjs from 'dayjs'
import { RESULT_KHSX_COLUMN_SCHEMA } from '../constants/calcConstants'
import {
  getEffectiveCalcRules,
  createShiftWindowEvaluator,
  evaluateTimeStatus,
  evaluateCapaStatus,
  evaluateCoordinatorStatus
} from './calcRuleConfig'
import { normalizeRowOperationalTimePair } from './fileParsers'
import { calcTotalProductionMinutes } from './statCalculator'

function normalizeCode(val) {
  if (val === undefined || val === null) return ''
  return String(val).trim().toUpperCase()
}

/**
 * Phân tích linh hoạt chuỗi ngày giờ từ Excel (hỗ trợ dd/MM/yy, dd/MM/yyyy, 12h AM/PM, ISO, số serial Excel)
 */
export function parseDateTimeFlexible(val) {
  if (!val) return null
  if (val instanceof Date && !isNaN(val)) return dayjs(val)

  const str = String(val).trim()
  if (!str) return null

  // 1. Kiểm tra số serial Excel (VD: 45563.4965)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const millis = Math.round(num * 86400000)
    const date = new Date(excelEpoch.getTime() + millis)
    if (!isNaN(date)) return dayjs(date)
  }

  // 2. Format dd/MM/yy hoặc dd/MM/yyyy (kèm giờ phút giây và AM/PM/SA/CH tùy chọn)
  // VD: 28/09/26 11:55 AM, 28/09/2026 13:41:00, 28-09-2026 11:55, 09/10/26 4:59:55 CH
  const dmyMatch = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM|SA|CH))?)?/i
  )
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10)
    const m = parseInt(dmyMatch[2], 10) - 1
    let y = parseInt(dmyMatch[3], 10)
    if (y < 100) y += 2000 // 26 -> 2026
    let h = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null

    if ((ampm === 'PM' || ampm === 'CH') && h < 12) h += 12
    if ((ampm === 'AM' || ampm === 'SA') && h === 12) h = 0

    const date = new Date(y, m, d, h, min, sec)
    if (!isNaN(date)) return dayjs(date)
  }

  // 3. Format YYYY-MM-DD (kèm giờ phút giây và AM/PM/SA/CH)
  const ymdMatch = str.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM|SA|CH))?)?/i
  )
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10)
    const m = parseInt(ymdMatch[2], 10) - 1
    const d = parseInt(ymdMatch[3], 10)
    let h = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0
    const ampm = ymdMatch[7] ? ymdMatch[7].toUpperCase() : null

    if ((ampm === 'PM' || ampm === 'CH') && h < 12) h += 12
    if ((ampm === 'AM' || ampm === 'SA') && h === 12) h = 0

    const date = new Date(y, m, d, h, min, sec)
    if (!isNaN(date)) return dayjs(date)
  }

  // 4. Fallback dayjs parse chuẩn
  const djs = dayjs(str)
  if (djs.isValid()) return djs

  return null
}

/**
 * Định dạng chuỗi ngày thành DD/MM/YYYY chuẩn (chỉ có ngày tháng năm, bỏ qua giờ phút giây)
 */
export function formatDateOnly(val) {
  if (!val) return ''
  const djs = parseDateTimeFlexible(val)
  if (djs && djs.isValid()) {
    return djs.format('DD/MM/YYYY')
  }
  const str = String(val).trim()
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mon = m[2].padStart(2, '0')
    let y = parseInt(m[3], 10)
    if (y < 100) y += 2000
    return `${d}/${mon}/${y}`
  }
  return str
}

/**
 * Tính toán 3 cột điều kiện KHSX cho từng dòng của Tab 3 "Tổng hợp lệnh thao tác":
 * 1. Ngày KHSX thao tác (Date Part)
 * 2. Check KHSX theo Bắt đầu: [ApplyDate 07:00:00 -> ApplyDate+1 06:59:59]
 * 3. Check KHSX toàn diện: [StartTime trong 24h & EndTime trong 24h]
 */
export function computeKhsxChecks(startTimeStr, endTimeStr, applyDateStr, customRules = null) {
  const rules = getEffectiveCalcRules(customRules)
  const startDjs = parseDateTimeFlexible(startTimeStr)
  const endDjs = parseDateTimeFlexible(endTimeStr)
  const applyDjs = parseDateTimeFlexible(applyDateStr)

  let opDateKhsx = ''
  if (startDjs && startDjs.isValid()) {
    opDateKhsx = startDjs.format('DD/MM/YYYY')
  }

  if (!applyDjs || !applyDjs.isValid()) {
    return {
      opDateKhsx,
      checkKhsxStart: rules.khsxStatus.validLabel,
      checkKhsxFull: rules.khsxStatus.validLabel
    }
  }

  const shiftEvaluator = createShiftWindowEvaluator(applyDateStr, rules)
  let checkKhsxStart = rules.khsxStatus.invalidLabel
  let checkKhsxFull = rules.khsxStatus.invalidLabel

  if (startDjs && startDjs.isValid() && shiftEvaluator) {
    const startMs = startDjs.valueOf()
    const isStartValid = shiftEvaluator.isStartValid(startMs)

    if (isStartValid) {
      checkKhsxStart = rules.khsxStatus.validLabel
    }

    if (endDjs && endDjs.isValid()) {
      const endMs = endDjs.valueOf()
      const isEndValid = shiftEvaluator.isEndValid(startMs, endMs)

      if (isStartValid && isEndValid) {
        checkKhsxFull = rules.khsxStatus.validLabel
      }
    } else if (isStartValid) {
      checkKhsxFull = rules.khsxStatus.validLabel
    }
  }

  return {
    opDateKhsx,
    checkKhsxStart,
    checkKhsxFull
  }
}

/**
 * Tự động gán 3 cột tính toán KHSX vào từng dòng của Tab 3 (Tổng hợp lệnh thao tác) để view ngay trên bảng
 */
export function enrichSummaryOpDataWithKhsxChecks(
  summaryOpData = [],
  applyDateStr = '',
  customRules = null
) {
  if (!Array.isArray(summaryOpData) || summaryOpData.length === 0) return []

  return summaryOpData.map((row) => {
    const normalizedRow = { ...row }
    normalizeRowOperationalTimePair(normalizedRow)

    const startTime =
      normalizedRow.PlannedStartTime ??
      normalizedRow.StartTime ??
      normalizedRow['Thời gian bắt đầu (5)'] ??
      normalizedRow['Thời gian bắt đầu\r\n(5)'] ??
      normalizedRow['Thời gian bắt đầu\n(5)'] ??
      normalizedRow['Thời gian bắt đầu'] ??
      normalizedRow['Bắt đầu'] ??
      ''
    const endTime =
      normalizedRow.PlannedEndTime ??
      normalizedRow.EndTime ??
      normalizedRow['Thời gian kết thúc (6)'] ??
      normalizedRow['Thời gian kết thúc\r\n(6)'] ??
      normalizedRow['Thời gian kết thúc\n(6)'] ??
      normalizedRow['Thời gian kết thúc'] ??
      normalizedRow['Kết thúc'] ??
      ''

    const checks = computeKhsxChecks(startTime, endTime, applyDateStr, customRules)

    return {
      ...normalizedRow,
      KhsxOpDate: checks.opDateKhsx,
      CheckKhsxStart: checks.checkKhsxStart,
      CheckKhsx: checks.checkKhsxFull
    }
  })
}

/**
 * Động cơ tính toán đối soát Kết quả KHSX (Tab 6):
 * - Lọc các dòng thỏa mãn KHSX trong Tab 3 (theo đúng Ngày báo cáo KHSX ở Master)
 * - Lấy danh sách DUY NHẤT theo Số lệnh thao tác (Deduplication)
 * - Đổ ra đúng 24 cột chuẩn mực
 */
export const calculateKHSX = (files = {}, masterInfo = {}, customRules = null) => {
  const rules = getEffectiveCalcRules(customRules || masterInfo.calcRules || files.calcRules)
  const applyDate =
    masterInfo.applyDate || files.masterInfo?.applyDate || dayjs().format('YYYY-MM-DD')
  const calcVersion = masterInfo.calcVersion || masterInfo.version || masterInfo.Version || 'V1'
  const regCode = masterInfo.regCode || masterInfo.RegCode || files.masterInfo?.regCode || ''
  const shiftEvaluator = createShiftWindowEvaluator(applyDate, rules)
  const unfinishedOpData = files.unfinished_op?.data || []
  const summaryOpData = files.summary_op?.data || []
  const statReportData = files.stat_report?.data || []

  // 0. TRA CỨU TỪ TAB 3 (TỔNG HỢP LỆNH THAO TÁC) THEO SỐ LỆNH THAO TÁC, BASE CODE & LỆNH CÔNG ĐOẠN
  const summaryOpByCode = new Map()
  const summaryOpByBaseCode = new Map()
  const summaryOpByAlpha = new Map()
  const summaryOpByAlphaBase = new Map()
  const summaryOpByStageOrder = new Map()
  let defaultSummaryIssuer = ''

  const getCleanAlphanumeric = (str) => {
    return String(str || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  // Danh sách các mã/tên không hợp lệ (công đoạn, bộ phận, hệ thống, trạng thái) không bao giờ là PIC ĐP
  const INVALID_ISSUER_NAMES = new Set([
    'INOFFSET', 'KIEM', 'DAN', 'DONGGOI', 'CAT', 'IN', 'BOI', 'XEN', 'UV', 'CAN',
    'MES GSHN', 'MES', 'NGOÀI KHSX', 'NGOAI KHSX', 'ĐÚNG KHSX', 'DUNG KHSX', 'KHÁC KHSX', 'KHAC KHSX'
  ])

  const isValidIssuerName = (val) => {
    if (!val) return false
    const s = String(val).trim()
    if (s.length < 2 || s.startsWith('http') || s.includes('{') || s.includes('}')) return false
    if (INVALID_ISSUER_NAMES.has(s.toUpperCase())) return false
    // Loại trừ ngày tháng thuần túy (VD: 09/10/2026, 2026-10-09, 2026/10/09, số serial excel)
    if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(s) || /^\d{5,}$/.test(s)) return false
    // Bắt buộc phải có ít nhất 1 chữ cái (tên người có dấu hoặc không dấu)
    if (!/[a-zA-ZÀ-ỹ]/.test(s)) return false
    return true
  }

  const findIssuerInRow = (row) => {
    if (!row || typeof row !== 'object') return ''

    // 1. Tìm trực tiếp theo các khóa đã định danh cột "Người phát hành lệnh thao tác"
    // (Bao gồm cả trường hợp file Tab 3 ghi tiêu đề cột là "Ngày phát hành lệnh thao tác" nhưng nội dung thực tế là Tên người)
    const directKeys = [
      'OrderIssuer',
      'Người phát hành lệnh thao tác',
      'Người phát hành',
      'Nguoi_phat_hanh_lenh_thao_tac',
      'Nguoi_phat_hanh',
      'Người phát hành LTT',
      'Người tạo lệnh',
      'Người lập lệnh',
      'PIC Điều phối',
      'PIC ĐP',
      'PicCoordinator',
      'OpOrderReleaseDate',
      'Ngày phát hành lệnh thao tác',
      'Ngày phát hành',
      'Ngay_phat_hanh_lenh_thao_tac',
      'Ngay_phat_hanh'
    ]
    for (const k of directKeys) {
      if (isValidIssuerName(row[k])) {
        return String(row[k]).trim()
      }
    }

    // 2. Quét động các khóa CHÍNH XÁC chứa "người phát hành" / "người tạo" (KHÔNG quét theo tên group)
    for (const [k, v] of Object.entries(row)) {
      if (!isValidIssuerName(v)) continue
      const kLower = k.toLowerCase().replace(/[_\s-]+/g, ' ')
      // Bắt buộc phải có chữ "người" / "nguoi" hoặc tiền tố "pic"
      if (
        (kLower.includes('người') || kLower.includes('nguoi') || kLower.startsWith('pic')) &&
        (kLower.includes('phát hành') ||
          kLower.includes('phat hanh') ||
          kLower.includes('tạo lệnh') ||
          kLower.includes('tao lenh') ||
          kLower.includes('lập lệnh') ||
          kLower.includes('lap lenh') ||
          kLower.includes('điều phối') ||
          kLower.includes('dieu phoi') ||
          kLower.includes('đp') ||
          kLower.includes('dp'))
      ) {
        return String(v).trim()
      }
    }
    return ''
  }

  summaryOpData.forEach((row) => {
    const rawCode =
      row.OperationOrderNo ??
      row.PlannedOperationOrderNo ??
      row['Lệnh thao tác'] ??
      row['Số lệnh thao tác'] ??
      row['Số lệnh TT'] ??
      row['Lệnh TT'] ??
      row['Mã lệnh thao tác'] ??
      row.OperationOrder ??
      row.OpOrderNo ??
      ''
    const code = normalizeCode(rawCode)
    const baseCode = code.replace(/\s*\(.*?\)/g, '').trim()
    const alpha = getCleanAlphanumeric(code)
    const alphaBase = getCleanAlphanumeric(baseCode)

    const rawStage =
      row.StageOrderNo ??
      row['Lệnh công đoạn'] ??
      row['Số lệnh công đoạn'] ??
      row['Số lệnh CĐ'] ??
      ''
    const stageCode = normalizeCode(rawStage)

    if (code && !summaryOpByCode.has(code)) summaryOpByCode.set(code, row)
    if (baseCode && !summaryOpByBaseCode.has(baseCode)) summaryOpByBaseCode.set(baseCode, row)
    if (alpha && !summaryOpByAlpha.has(alpha)) summaryOpByAlpha.set(alpha, row)
    if (alphaBase && !summaryOpByAlphaBase.has(alphaBase)) summaryOpByAlphaBase.set(alphaBase, row)
    if (stageCode && !summaryOpByStageOrder.has(stageCode)) summaryOpByStageOrder.set(stageCode, row)

    const rowIssuer = findIssuerInRow(row)
    if (rowIssuer && !defaultSummaryIssuer) {
      defaultSummaryIssuer = rowIssuer
    }
  })

  // Hàm tìm dòng tương ứng trong Tab 3 đa cấp (khớp chính xác, khớp cơ sở, khớp alphanumeric, khớp lệnh công đoạn)
  const findSummaryOpRow = (code, stageOrderNo = '') => {
    if (!code && !stageOrderNo) return null
    const clean = normalizeCode(code)
    const base = clean.replace(/\s*\(.*?\)/g, '').trim()
    const alphaClean = getCleanAlphanumeric(clean)
    const alphaBase = getCleanAlphanumeric(base)
    const cleanStage = normalizeCode(stageOrderNo)

    if (clean && summaryOpByCode.has(clean)) return summaryOpByCode.get(clean)
    if (base && summaryOpByBaseCode.has(base)) return summaryOpByBaseCode.get(base)
    if (alphaClean && summaryOpByAlpha.has(alphaClean)) return summaryOpByAlpha.get(alphaClean)
    if (alphaBase && summaryOpByAlphaBase.has(alphaBase)) return summaryOpByAlphaBase.get(alphaBase)
    if (cleanStage && summaryOpByStageOrder.has(cleanStage)) return summaryOpByStageOrder.get(cleanStage)

    // Tìm kiếm mờ theo tiền tố mã lệnh
    if (base.length >= 6) {
      for (const [k, r] of summaryOpByCode.entries()) {
        if (k.includes(base) || base.includes(k)) {
          return r
        }
      }
    }

    return null
  }

  // Hàm trích xuất chính xác PIC Điều Phối (CHỈ TÌM ĐÚNG CỘT "Người phát hành lệnh thao tác" TỪ TAB 3)
  const extractPicCoordinator = (code, localRow = {}, unfinRow = {}, statRow = {}) => {
    const stageNo =
      localRow.StageOrderNo ||
      statRow.StageOrderNo ||
      unfinRow.StageOrderNo ||
      localRow['Lệnh công đoạn'] ||
      statRow['Lệnh công đoạn'] ||
      ''
    const sumRow = findSummaryOpRow(code, stageNo) || {}

    // 1. Ưu tiên số 1: Lấy đúng cột "Người phát hành lệnh thao tác" từ Tab 3
    let issuer = findIssuerInRow(sumRow)
    if (issuer) return issuer

    // 2. Lấy từ localRow (nếu chính là dòng Tab 3)
    issuer = findIssuerInRow(localRow)
    if (issuer) return issuer

    // 3. Lấy từ unfinRow (Tab 2) hoặc statRow (Tab 1) nếu có
    issuer = findIssuerInRow(unfinRow) || findIssuerInRow(statRow)
    if (issuer) return issuer

    // TUYỆT ĐỐI KHÔNG kế thừa từ dòng bất kỳ khác (defaultSummaryIssuer)
    // Nếu lệnh này không tìm thấy thông tin hoặc thiếu họ tên thì trả về rỗng để cảnh báo người dùng điền tay
    return ''
  }

  // Hàm trích xuất ngày phát hành lệnh thao tác / ngày tạo lệnh công đoạn
  const extractStageOrderCreatedDate = (code, localRow = {}, unfinRow = {}, statRow = {}) => {
    const stageNo =
      localRow.StageOrderNo ||
      statRow.StageOrderNo ||
      unfinRow.StageOrderNo ||
      localRow['Lệnh công đoạn'] ||
      statRow['Lệnh công đoạn'] ||
      ''
    const sumRow = findSummaryOpRow(code, stageNo) || {}

    const raw = String(
      sumRow.OpOrderReleaseDate ??
        sumRow['Ngày phát hành lệnh thao tác'] ??
        sumRow['Ngày phát hành'] ??
        sumRow['Ngày tạo lệnh'] ??
        localRow.OpOrderReleaseDate ??
        localRow['Ngày phát hành lệnh thao tác'] ??
        localRow['Ngày phát hành'] ??
        unfinRow.OrderCreatedDate ??
        localRow.StageOrderCreatedDate ??
        localRow.StageOrderDate ??
        localRow['Ngày tạo lệnh công đoạn'] ??
        statRow.SlipCreatedDate ??
        statRow.StatDate ??
        ''
    ).trim()
    return formatDateOnly(raw)
  }

  // 0. TRA CỨU TỪ TAB 2 (LỆNH THAO TÁC CHƯA HOÀN THÀNH) THEO SỐ LỆNH THAO TÁC
  const unfinishedMap = new Map()
  unfinishedOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row['Số lệnh thao tác'] ??
        row['Lệnh thao tác'] ??
        row.OperationOrder ??
        ''
    )
    if (code && !unfinishedMap.has(code)) {
      unfinishedMap.set(code, row)
    }
  })

  // 1. TỔNG HỢP THỰC TẾ SẢN XUẤT TỪ TAB 1 THEO LỆNH THAO TÁC (SUM SỐ LƯỢNG ĐẠT)
  const actualStatsMap = new Map()
  const statReportOrdersMap = new Map()

  const getCleanCode = (row) => {
    const raw =
      row.OperationOrderNo ??
      row.OperationNo ??
      row.PlannedOperationOrderNo ??
      row['Số lệnh thao tác'] ??
      row['Số lệnh thao tác\r\n'] ??
      row['Số lệnh thao tác\n'] ??
      row['Lệnh thao tác'] ??
      row['Lệnh TT'] ??
      row['Số lệnh TT'] ??
      row['Mã lệnh thao tác'] ??
      row.OperationOrder ??
      row.OpOrderNo ??
      ''
    return normalizeCode(raw)
  }

  const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0
    const str = String(val).replace(/,/g, '').trim()
    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
  }

  statReportData.forEach((row) => {
    const code = getCleanCode(row)
    if (!code) return

    if (!statReportOrdersMap.has(code)) {
      statReportOrdersMap.set(code, row)
    }

    const produced = parseNum(
      row.ProducedQty ??
        row['Số lượng sản xuất'] ??
        row['Số lượng sản xuất\r\n'] ??
        row['Số lượng sản xuất\n'] ??
        row['SL sản xuất'] ??
        row['Số lượng thực hiện'] ??
        row['Số lượng TK sản xuất (11)'] ??
        0
    )

    const qualified = parseNum(
      row.QualifiedQty ??
        row['Số lượng đạt'] ??
        row['Số lượng đạt\r\n'] ??
        row['Số lượng đạt\n'] ??
        row['Số lượng đạt (12)'] ??
        row['SL đạt'] ??
        row['SL Đạt'] ??
        row['SL Đạt (12)'] ??
        row['Số lượng thống kê đạt (12)'] ??
        row['Số lượng thống kê đạt'] ??
        row.ActualQualifiedQty ??
        produced ??
        0
    )

    const defect = parseNum(
      row.DefectQty ??
        row['Số lượng lỗi'] ??
        row['Số lượng hỏng'] ??
        row['SL lỗi'] ??
        row['Số lượng thống kê lỗi (13)=(11)-(12)'] ??
        0
    )

    let runTimeMin = parseNum(
      row.ActualRunTime ??
        row['Thời gian chạy thực tế'] ??
        row['Thời gian chạy (phút)'] ??
        row['Thời gian sản xuất'] ??
        0
    )

    if (runTimeMin === 0) {
      const sVal =
        row.StartTime ??
        row['Bắt đầu'] ??
        row['Thời gian bắt đầu'] ??
        row['Thời gian bắt đầu (5)'] ??
        row['TG bắt đầu'] ??
        ''
      const eVal =
        row.EndTime ??
        row['Kết thúc'] ??
        row['Thời gian kết thúc'] ??
        row['Thời gian kết thúc (6)'] ??
        row['TG kết thúc'] ??
        ''
      const sDate =
        row.StartDate ??
        row['Ngày bắt đầu'] ??
        row.ExecuteDate ??
        row['Ngày thực hiện'] ??
        ''
      const eDate =
        row.EndDate ??
        row['Ngày kết thúc'] ??
        row.StatDate ??
        row['Ngày thống kê'] ??
        row.ExecuteDate ??
        ''
      const dt = parseNum(
        row.TotalDowntimeMinutes ??
          row['Tổng tg hao phí\r\n(5)=1+2+3+4'] ??
          row['Tổng tg hao phí\n(5)=1+2+3+4'] ??
          row['Tổng tg hao phí (5)=1+2+3+4'] ??
          row['Tổng tg hao phí'] ??
          0
      )

      const calculatedMinutes = calcTotalProductionMinutes(sDate, sVal, eDate, eVal, dt)
      if (calculatedMinutes !== null) {
        runTimeMin = calculatedMinutes
      }
    }

    // Khóa chính xác
    if (!actualStatsMap.has(code)) {
      actualStatsMap.set(code, {
        produced: 0,
        qualified: 0,
        defect: 0,
        runTimeMin: 0,
        ticketCount: 0
      })
    }
    const current = actualStatsMap.get(code)
    current.produced += produced
    current.qualified += qualified
    current.defect += defect
    current.runTimeMin += runTimeMin
    current.ticketCount += 1

    // Khóa rút gọn (loại bỏ phần trong ngoặc đơn nếu có: TT2608-2117(711) -> TT2608-2117)
    const baseCode = code.replace(/\s*\(.*?\)/g, '').trim()
    if (baseCode && baseCode !== code) {
      if (!actualStatsMap.has(baseCode)) {
        actualStatsMap.set(baseCode, {
          produced: 0,
          qualified: 0,
          defect: 0,
          runTimeMin: 0,
          ticketCount: 0
        })
      }
      const baseCur = actualStatsMap.get(baseCode)
      baseCur.produced += produced
      baseCur.qualified += qualified
      baseCur.defect += defect
      baseCur.runTimeMin += runTimeMin
      baseCur.ticketCount += 1
    }
  })

  // 2. LỌC DANH SÁCH THỎA MÃN KHSX THEO NGÀY BÁO CÁO VÀ LẤY DANH SÁCH DUY NHẤT THEO SỐ LỆNH THAO TÁC
  const uniqueOpOrdersMap = new Map()

  summaryOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row.PlannedOperationOrderNo ??
        row['Lệnh thao tác'] ??
        row['Số lệnh thao tác'] ??
        row['Số lệnh TT'] ??
        row.OperationOrder ??
        row.OpOrderNo ??
        ''
    )
    if (!code) return

    const startTime =
      row.PlannedStartTime ??
      row.StartTime ??
      row['Thời gian bắt đầu (5)'] ??
      row['Thời gian bắt đầu\r\n(5)'] ??
      row['Thời gian bắt đầu\n(5)'] ??
      row['Thời gian bắt đầu'] ??
      row['Bắt đầu'] ??
      ''
    const endTime =
      row.PlannedEndTime ??
      row.EndTime ??
      row['Thời gian kết thúc (6)'] ??
      row['Thời gian kết thúc\r\n(6)'] ??
      row['Thời gian kết thúc\n(6)'] ??
      row['Thời gian kết thúc'] ??
      row['Kết thúc'] ??
      ''

    // 1. Kiểm tra điều kiện KHSX theo ngày bắt đầu thuộc ca 24h của ngày master đăng ký
    const checks = computeKhsxChecks(startTime, endTime, applyDate, rules)
    const isKhsxDate = checks.checkKhsxStart === rules.khsxStatus.validLabel

    // Lọc theo ngày KHSX nếu thỏa mãn
    if (isKhsxDate && !uniqueOpOrdersMap.has(code)) {
      uniqueOpOrdersMap.set(code, {
        row,
        startTime,
        endTime,
        checks
      })
    }
  })

  // Nếu không có summary_op nhưng có unfinished_op, kiểm tra theo unfinished_op
  if (uniqueOpOrdersMap.size === 0 && summaryOpData.length === 0 && unfinishedOpData.length > 0) {
    unfinishedOpData.forEach((row) => {
      const code = normalizeCode(
        row.OperationOrderNo ??
          row['Số lệnh thao tác'] ??
          row['Lệnh thao tác'] ??
          row.OperationOrder ??
          ''
      )
      if (!code) return

      const startTime =
        row.PlannedStartTime ??
        row.StartTime ??
        row['Thời gian bắt đầu (5)'] ??
        row['Thời gian bắt đầu'] ??
        row['Bắt đầu'] ??
        ''
      const endTime =
        row.PlannedEndTime ??
        row.EndTime ??
        row['Thời gian kết thúc (6)'] ??
        row['Thời gian kết thúc'] ??
        row['Kết thúc'] ??
        ''

      const checks = computeKhsxChecks(startTime, endTime, applyDate, rules)
      const isKhsxDate = checks.checkKhsxStart === rules.khsxStatus.validLabel

      if (isKhsxDate && !uniqueOpOrdersMap.has(code)) {
        uniqueOpOrdersMap.set(code, {
          row,
          startTime,
          endTime,
          checks
        })
      }
    })
  }

  // CHÚ Ý RÀNG BUỘC KHSX: Chỉ lấy các lệnh thao tác có thời gian bắt đầu thuộc ca 24h của đúng Ngày báo cáo (applyDate).
  // Nếu ngày báo cáo (VD: 10/10/2026) không có lệnh nào khớp trong dữ liệu thì kết quả trả về đúng 0 dòng (rỗng).
  const finalOrdersMap = uniqueOpOrdersMap

  let totalPlannedQty = 0
  let totalTargetQty = 0
  let totalQualifiedQty = 0
  let totalPlannedMinutes = 0
  let totalActualMinutes = 0

  const calculatedRows = []
  const missingOpInfoList = []

  // 3. ĐỔ DỮ LIỆU ĐÚNG 24 CỘT CHUẨN MỰC
  finalOrdersMap.forEach(({ row, startTime, endTime, checks }, code) => {
    const unfinRow = unfinishedMap.get(code) || {}

    // 1. PIC ĐP (Người phát hành lệnh thao tác từ Tab 3)
    const picCoordinator = extractPicCoordinator(code, row, unfinRow)

    // 4. Số lệnh công đoạn
    const stageOrderNo = String(
      row.StageOrderNo ??
        unfinRow.StageOrderNo ??
        row['Lệnh công đoạn'] ??
        row['Số lệnh công đoạn'] ??
        row['Số lệnh CĐ'] ??
        ''
    ).trim()

    // Kiểm tra thông tin lệnh thao tác và họ tên người phát hành (PIC ĐP)
    const sumRow = findSummaryOpRow(code, stageOrderNo)
    const hasSumRow = Boolean(sumRow && Object.keys(sumRow).length > 0)
    const hasPicCoordinator = Boolean(picCoordinator && String(picCoordinator).trim())

    let opInfoStatus = 'Đầy đủ'
    if (!hasSumRow) {
      opInfoStatus = 'Chưa có TT lệnh'
    } else if (!hasPicCoordinator) {
      opInfoStatus = 'Thiếu họ tên LTT'
    }

    if (!hasSumRow || !hasPicCoordinator) {
      missingOpInfoList.push({
        orderNo: code,
        hasSumRow,
        hasPicCoordinator,
        status: opInfoStatus,
        reason: !hasSumRow ? 'Không tìm thấy thông tin lệnh thao tác' : 'Thiếu họ tên PIC ĐP'
      })
    }

    // 2. Số lệnh thao tác: code
    // 3. Ngày thực hiện thao tác
    const opDate = formatDateOnly(
      checks.opDateKhsx ||
      String(
        row.OperationDate ??
          row.KhsxOpDate ??
          row['Ngày KHSX thao tác'] ??
          row['Ngày thực hiện thao tác'] ??
          row['Ngày thao tác'] ??
          unfinRow.ExecuteDate ??
          ''
      ).trim()
    )

    // 5. Ngày tạo lệnh công đoạn / Ngày phát hành lệnh thao tác
    const stageOrderCreatedDate = extractStageOrderCreatedDate(code, row, unfinRow)

    // 6. Mã hàng
    const matCode = String(
      row.MaterialCode ??
        unfinRow.ProductCode ??
        row['Mã vật tư'] ??
        row['Mã hàng'] ??
        row['Mã SP'] ??
        ''
    ).trim()

    // 7. Tên hàng
    const matName = String(
      row.MaterialName ??
        unfinRow.ProductName ??
        row['Tên vật tư'] ??
        row['Tên hàng'] ??
        row['Tên sản phẩm'] ??
        ''
    ).trim()

    // 8. Thao tác (So sánh mã lệnh để lấy từ Tab 2 hoặc Tab 3)
    const opName = String(
      unfinRow.OperationName ??
        row.OperationName ??
        row.PlannedOperationTypeName ??
        row.PlannedOperationTypeCode ??
        row['Thao tác'] ??
        row['Tên thao tác'] ??
        ''
    ).trim()

    // 9. Phân loại thao tác
    const opTypeName = String(
      unfinRow.OperationType ??
        row.PlannedOperationTypeName ??
        row.OperationTypeName ??
        row['Tên phân loại thao tác'] ??
        row['Phân loại thao tác'] ??
        ''
    ).trim()

    // 10. Máy sản xuất (So sánh mã lệnh để lấy từ Tab 2 hoặc Tab 3)
    const machineName = String(
      unfinRow.MachineName ??
        row.PlannedMachineName ??
        row.MachineName ??
        row['Tên máy'] ??
        row['Máy sản xuất'] ??
        ''
    ).trim()

    // 11. Đvt
    const unit = String(row.Unit ?? unfinRow.Unit ?? row['ĐVT'] ?? row['Đvt'] ?? 'Pcs').trim()

    // 12. Số lượng cần đạt LTT
    const targetQty =
      parseFloat(
        String(
          row.TargetQty ??
            unfinRow.TargetQty ??
            row.OpTargetQty ??
            row['Số lượng cần đạt (2)'] ??
            row['Số lượng cần đạt\r\n(2)'] ??
            row['Số lượng cần đạt\n(2)'] ??
            row['Số lượng cần đạt LTT'] ??
            row['Số lượng cần đạt'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // 13. Số lượng cần sản xuất
    const plannedQty =
      parseFloat(
        String(
          row.PlannedQty ??
            unfinRow.PlannedQty ??
            row.OpPlannedQty ??
            row['Số lượng cần sx (1)'] ??
            row['Số lượng cần sx\r\n(1)'] ??
            row['Số lượng cần sx\n(1)'] ??
            row['Số lượng cần sản xuất'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // 14. Số lượng đã thống kê đạt (Khớp thực tế từ Tab 1 Thống kê sản xuất)
    const baseCode = code.replace(/\s*\(.*?\)/g, '').trim()
    const actual = actualStatsMap.get(code) ||
      actualStatsMap.get(baseCode) || {
        produced: 0,
        qualified: 0,
        defect: 0,
        runTimeMin: 0
      }

    let actualQualified = actual.qualified
    if (
      actualQualified === 0 &&
      unfinRow.StatQty !== undefined &&
      unfinRow.StatQty !== null &&
      unfinRow.StatQty !== ''
    ) {
      actualQualified = parseNum(unfinRow.StatQty ?? unfinRow['Số lượng đã thống kê'] ?? 0)
    }

    let actualRunMin = actual.runTimeMin
    if (
      actualRunMin === 0 &&
      unfinRow.ProductionDurationMinutes !== undefined &&
      unfinRow.ProductionDurationMinutes !== null
    ) {
      actualRunMin = parseNum(unfinRow.ProductionDurationMinutes)
    }

    // 15. Thời gian bắt đầu: startTime
    // 16. Thời gian kết thúc: endTime

    // 17. Thời gian sản xuất theo ĐM (phút) =+IF(OR(O3="";P3="");"";ROUND((P3-O3)*1440;0))
    let standardRunMin = 0
    if (startTime && endTime) {
      const sDjs = parseDateTimeFlexible(startTime)
      const eDjs = parseDateTimeFlexible(endTime)
      if (sDjs && eDjs && eDjs.isValid() && sDjs.isValid()) {
        const diffMs = eDjs.diff(sDjs)
        if (diffMs > 0) {
          standardRunMin = Math.round(diffMs / 60000)
        }
      }
    }
    if (standardRunMin === 0) {
      if (
        row.StandardRunMinutes !== undefined &&
        row.StandardRunMinutes !== null &&
        row.StandardRunMinutes !== ''
      ) {
        standardRunMin = parseFloat(String(row.StandardRunMinutes).replace(/,/g, '')) || 0
      } else if (
        row.PlannedTotalHours !== undefined &&
        row.PlannedTotalHours !== null &&
        row.PlannedTotalHours !== ''
      ) {
        standardRunMin = Math.round(
          (parseFloat(String(row.PlannedTotalHours).replace(/,/g, '')) || 0) * 60
        )
      } else if (
        unfinRow.ProductionDurationMinutes !== undefined &&
        unfinRow.ProductionDurationMinutes !== null &&
        unfinRow.ProductionDurationMinutes !== ''
      ) {
        standardRunMin =
          parseFloat(String(unfinRow.ProductionDurationMinutes).replace(/,/g, '')) || 0
      }
    }

    // 18. Thời gian sản xuất thực tế (phút) = Tổng thời gian chạy thực tế từ Tab 1
    // 19. Capa ĐM = (Số lượng cần đạt / Thời gian ĐM phút) * 60 phút
    let standardCapa = 0
    if (standardRunMin > 0 && targetQty > 0) {
      standardCapa = Number(((targetQty / standardRunMin) * 60).toFixed(2))
    } else if (
      row.StandardCapa !== undefined &&
      row.StandardCapa !== null &&
      row.StandardCapa !== ''
    ) {
      standardCapa = parseFloat(String(row.StandardCapa).replace(/,/g, '')) || 0
    }

    // 20. Capa thực tế = (Tổng số lượng đạt / Tổng thời gian chạy thực tế phút) * 60 phút
    let actualCapa = 0
    if (actualRunMin > 0 && actualQualified > 0) {
      actualCapa = Number(((actualQualified * 60) / actualRunMin).toFixed(2))
    }

    // 24. KHSX status
    const khsxStatus = checks.checkKhsxFull || rules.khsxStatus.validLabel

    // 21. Trạng thái ĐP - SX
    let isTimeInsideShift = true
    if (startTime && shiftEvaluator) {
      const sDjs = parseDateTimeFlexible(startTime)
      if (sDjs && sDjs.isValid()) {
        isTimeInsideShift = shiftEvaluator.isInsideShift(sDjs.valueOf())
      }
    }

    const coordinatorStatus = evaluateCoordinatorStatus(
      actualQualified,
      targetQty,
      plannedQty,
      isTimeInsideShift,
      khsxStatus,
      rules
    )

    // 22. Trạng thái thời gian
    const timeStatus = evaluateTimeStatus(standardRunMin, actualRunMin, coordinatorStatus, rules)

    // 23. Trạng thái capa
    const capaStatus = evaluateCapaStatus(
      standardCapa,
      actualCapa,
      standardRunMin,
      coordinatorStatus,
      rules
    )

    let finalPicCoordinator = picCoordinator
    let finalStageOrderNo = stageOrderNo
    let finalStageOrderCreatedDate = stageOrderCreatedDate
    let finalMatCode = matCode
    let finalMatName = matName
    let finalOpName = opName
    let finalOpTypeName = opTypeName
    let finalMachineName = machineName
    let finalUnit = unit
    let finalTargetQty = targetQty
    let finalPlannedQty = plannedQty
    let finalStandardRunMin = standardRunMin
    let finalStandardCapa = standardCapa
    let finalCoordinatorStatus = coordinatorStatus
    let finalTimeStatus = timeStatus
    let finalCapaStatus = capaStatus

    if (opInfoStatus === 'Chưa có TT lệnh') {
      finalPicCoordinator = ''
      finalStageOrderNo = ''
      finalStageOrderCreatedDate = ''
      finalMatCode = ''
      finalMatName = ''
      finalOpName = ''
      finalOpTypeName = ''
      finalMachineName = ''
      finalUnit = ''
      finalTargetQty = ''
      finalPlannedQty = ''
      finalStandardRunMin = ''
      finalStandardCapa = ''
      finalCoordinatorStatus = ''
      finalTimeStatus = ''
      finalCapaStatus = ''
    }

    if (typeof finalPlannedQty === 'number') totalPlannedQty += finalPlannedQty
    if (typeof finalTargetQty === 'number') totalTargetQty += finalTargetQty
    totalQualifiedQty += actualQualified
    if (typeof finalStandardRunMin === 'number') totalPlannedMinutes += finalStandardRunMin
    totalActualMinutes += actualRunMin

    calculatedRows.push({
      // 1. Schema Keys chuẩn (RESULT_KHSX_COLUMN_SCHEMA)
      PicCoordinator: finalPicCoordinator,
      OpInfoStatus: opInfoStatus,
      OperationOrderNo: code,
      OperationDate: opDate,
      StageOrderNo: finalStageOrderNo,
      StageOrderCreatedDate: finalStageOrderCreatedDate,
      MaterialCode: finalMatCode,
      MaterialName: finalMatName,
      OperationName: finalOpName,
      OperationTypeName: finalOpTypeName,
      MachineName: finalMachineName,
      Unit: finalUnit,
      OpTargetQty: finalTargetQty,
      OpPlannedQty: finalPlannedQty,
      ActualQualifiedQty: actualQualified,
      StartTime: startTime,
      EndTime: endTime,
      StandardRunMinutes: finalStandardRunMin !== '' && finalStandardRunMin > 0 ? finalStandardRunMin : '',
      ActualRunMinutes: actualRunMin > 0 ? actualRunMin : '',
      StandardCapa: finalStandardCapa !== '' && finalStandardCapa > 0 ? finalStandardCapa : '',
      ActualCapa: actualCapa > 0 ? actualCapa : '',
      CoordinatorStatus: finalCoordinatorStatus,
      TimeStatus: finalTimeStatus,
      CapaStatus: finalCapaStatus,
      KhsxStatus: khsxStatus,

      // 2. Tiếng Việt trực tiếp (phòng ngừa grid binding theo title)
      'PIC ĐP': finalPicCoordinator,
      'Trạng thái LTT': opInfoStatus,
      'Trạng thái thông tin lệnh': opInfoStatus,
      'Số lệnh thao tác': code,
      'Ngày thực hiện thao tác': opDate,
      'Số lệnh công đoạn': finalStageOrderNo,
      'Ngày tạo lệnh công đoạn': finalStageOrderCreatedDate,
      'Mã hàng': finalMatCode,
      'Tên hàng': finalMatName,
      'Thao tác': finalOpName,
      'Phân loại thao tác': finalOpTypeName,
      'Máy sản xuất': finalMachineName,
      Đvt: finalUnit,
      'Số lượng cần đạt LTT': finalTargetQty,
      'Số lượng cần sản xuất': finalPlannedQty,
      'Số lượng đã thống kê đạt': actualQualified,
      'Thời gian bắt đầu': startTime,
      'Thời gian kết thúc': endTime,
      'Thời gian sản xuất theo ĐM': finalStandardRunMin !== '' && finalStandardRunMin > 0 ? finalStandardRunMin : '',
      'Thời gian sản xuất': actualRunMin > 0 ? actualRunMin : '',
      'Capa ĐM': finalStandardCapa !== '' && finalStandardCapa > 0 ? finalStandardCapa : '',
      'Capa thực tế': actualCapa > 0 ? actualCapa : '',
      'Trạng thái ĐP - SX': finalCoordinatorStatus,
      'Trạng thái thời gian': finalTimeStatus,
      'Trạng thái capa': finalCapaStatus,
      KHSX: khsxStatus,
      CalcVersion: calcVersion,
      'Version tính toán': calcVersion,
      RegCode: regCode,
      'Mã đăng ký': regCode,

      // 3. Aliases tương thích khác
      PicDp: finalPicCoordinator,
      OperationNo: code,
      OpDate: opDate,
      RoutingDocNo: finalStageOrderNo,
      RoutingDocDate: finalStageOrderCreatedDate,
      ItemCode: finalMatCode,
      ItemName: finalMatName,
      OpTypeName: finalOpTypeName,
      TargetPassQty: finalTargetQty,
      TargetProdQty: finalPlannedQty,
      StatPassQty: actualQualified,
      StandardProdTime: finalStandardRunMin !== '' && finalStandardRunMin > 0 ? finalStandardRunMin : '',
      ActualProdTime: actualRunMin > 0 ? actualRunMin : '',
      StatusDpSx: finalCoordinatorStatus,
      KhsxCheck: khsxStatus
    })
  })

  // 4. BỔ SUNG CÁC LỆNH THAO TÁC PHÁT SINH NGOÀI KHSX (Từ Tab 1 Thống kê sản xuất - Đánh dấu Khác KHSX)
  statReportOrdersMap.forEach((statRow, code) => {
    const baseCode = code.replace(/\s*\(.*?\)/g, '').trim()
    if (finalOrdersMap.has(code) || (baseCode && finalOrdersMap.has(baseCode))) {
      return
    }

    const unfinRow = unfinishedMap.get(code) || unfinishedMap.get(baseCode) || {}
    const actual = actualStatsMap.get(code) ||
      actualStatsMap.get(baseCode) || {
        produced: 0,
        qualified: 0,
        defect: 0,
        runTimeMin: 0
      }

    const picCoordinator = extractPicCoordinator(code, {}, unfinRow, statRow)

    const opDate = String(
      statRow.StatDate ??
        statRow.StartDate ??
        statRow['Ngày thống kê'] ??
        statRow['Ngày bắt đầu'] ??
        unfinRow.ExecuteDate ??
        ''
    ).trim()

    const stageOrderNo = String(
      statRow.StageOrderNo ??
        statRow.OrderNo ??
        statRow['Số đơn hàng'] ??
        statRow['Số lệnh công đoạn'] ??
        unfinRow.StageOrderNo ??
        ''
    ).trim()

    const stageOrderCreatedDate = extractStageOrderCreatedDate(code, {}, unfinRow, statRow)

    // Kiểm tra thông tin lệnh thao tác và họ tên người phát hành (PIC ĐP)
    const sumRow = findSummaryOpRow(code, stageOrderNo)
    const hasSumRow = Boolean(sumRow && Object.keys(sumRow).length > 0)
    const hasPicCoordinator = Boolean(picCoordinator && String(picCoordinator).trim())

    let opInfoStatus = 'Đầy đủ'
    if (!hasSumRow) {
      opInfoStatus = 'Chưa có TT lệnh'
    } else if (!hasPicCoordinator) {
      opInfoStatus = 'Thiếu họ tên LTT'
    }

    if (!hasSumRow || !hasPicCoordinator) {
      missingOpInfoList.push({
        orderNo: code,
        hasSumRow,
        hasPicCoordinator,
        status: opInfoStatus,
        reason: !hasSumRow ? 'Không tìm thấy thông tin lệnh thao tác' : 'Thiếu họ tên PIC ĐP'
      })
    }

    const matCode = String(
      statRow.MaterialCode ??
        statRow['Mã vật tư'] ??
        statRow['Mã hàng'] ??
        unfinRow.ProductCode ??
        ''
    ).trim()

    const matName = String(
      statRow.MaterialName ??
        statRow['Tên vật tư'] ??
        statRow['Tên hàng'] ??
        unfinRow.ProductName ??
        ''
    ).trim()

    const opName = String(
      statRow.OperationTypeName ??
        statRow.StageCode ??
        statRow['Công đoạn'] ??
        statRow['Phân loại thao tác'] ??
        unfinRow.OperationName ??
        ''
    ).trim()

    const opTypeName = String(
      statRow.OperationTypeName ??
        statRow['Phân loại thao tác'] ??
        unfinRow.OperationType ??
        'Ngoài KH'
    ).trim()

    const machineName = String(
      statRow.MachineName ??
        statRow['Tên máy sản xuất'] ??
        statRow.MachineCode ??
        statRow['Mã máy sản xuất'] ??
        unfinRow.MachineName ??
        ''
    ).trim()

    const unit = String(
      statRow.Unit ?? statRow['Đvt'] ?? statRow['ĐVT'] ?? unfinRow.Unit ?? 'Pcs'
    ).trim()

    const targetQty =
      parseNum(
        unfinRow.TargetQuantity ??
          unfinRow['Số lượng cần đạt'] ??
          statRow.TargetQuantity ??
          statRow['Số lượng cần đạt'] ??
          0
      ) || 0
    const plannedQty =
      parseNum(
        unfinRow.PlannedQuantity ??
          unfinRow['Số lượng cần sản xuất'] ??
          statRow.PlannedQuantity ??
          statRow['Số lượng cần sản xuất'] ??
          0
      ) || 0
    const actualQualified =
      actual.qualified || parseNum(statRow.QualifiedQty ?? statRow['Số lượng đạt'] ?? 0)
    const startTime = String(
      statRow.StartTime ?? statRow['Bắt đầu'] ?? statRow['Thời gian bắt đầu'] ?? ''
    ).trim()
    const endTime = String(
      statRow.EndTime ?? statRow['Kết thúc'] ?? statRow['Thời gian kết thúc'] ?? ''
    ).trim()
    const startDate = String(
      statRow.StartDate ??
        statRow['Ngày bắt đầu'] ??
        unfinRow.ExecuteDate ??
        unfinRow['Ngày thực hiện'] ??
        ''
    ).trim()
    const endDate = String(
      statRow.EndDate ??
        statRow['Ngày kết thúc'] ??
        statRow.StatDate ??
        statRow['Ngày thống kê'] ??
        unfinRow.ExecuteDate ??
        ''
    ).trim()

    let standardRunMin = 0
    if (startTime && endTime) {
      const sDjs = parseDateTimeFlexible(startTime)
      const eDjs = parseDateTimeFlexible(endTime)
      if (sDjs && eDjs && eDjs.isValid() && sDjs.isValid()) {
        const diffMs = eDjs.diff(sDjs)
        if (diffMs > 0) {
          standardRunMin = Math.round(diffMs / 60000)
        }
      }
    }
    if (standardRunMin === 0) {
      if (
        unfinRow.ProductionDurationMinutes !== undefined &&
        unfinRow.ProductionDurationMinutes !== null &&
        unfinRow.ProductionDurationMinutes !== ''
      ) {
        standardRunMin =
          parseFloat(String(unfinRow.ProductionDurationMinutes).replace(/,/g, '')) || 0
      }
    }

    const actualRunMin =
      parseNum(statRow.ActualRunTime ?? statRow['Thời gian chạy thực tế'] ?? 0) ||
      actual.runTimeMin

    let standardCapa = 0
    if (standardRunMin > 0 && targetQty > 0) {
      standardCapa = Number(((targetQty / standardRunMin) * 60).toFixed(2))
    } else if (
      unfinRow.StandardCapa !== undefined &&
      unfinRow.StandardCapa !== null &&
      unfinRow.StandardCapa !== ''
    ) {
      standardCapa = parseFloat(String(unfinRow.StandardCapa).replace(/,/g, '')) || 0
    }

    const actualCapa =
      actualRunMin > 0 && actualQualified > 0
        ? Number(((actualQualified * 60) / actualRunMin).toFixed(2))
        : 0

    const checks = computeKhsxChecks(startTime, endTime, applyDate, rules)
    const khsxStatus = checks.checkKhsxFull || rules.coordinatorStatus.outsidePlan
    const coordinatorStatus = rules.coordinatorStatus.outsidePlan

    // 22. Trạng thái thời gian
    const timeStatus = evaluateTimeStatus(standardRunMin, actualRunMin, coordinatorStatus, rules)

    // 23. Trạng thái capa
    const capaStatus = evaluateCapaStatus(
      standardCapa,
      actualCapa,
      standardRunMin,
      coordinatorStatus,
      rules
    )

    let finalPicCoordinator = picCoordinator
    let finalStageOrderNo = stageOrderNo
    let finalStageOrderCreatedDate = stageOrderCreatedDate
    let finalMatCode = matCode
    let finalMatName = matName
    let finalOpName = opName
    let finalOpTypeName = opTypeName
    let finalMachineName = machineName
    let finalUnit = unit
    let finalTargetQty = targetQty
    let finalPlannedQty = plannedQty
    let finalStandardRunMin = standardRunMin
    let finalStandardCapa = standardCapa
    let finalCoordinatorStatus = coordinatorStatus
    let finalTimeStatus = timeStatus
    let finalCapaStatus = capaStatus

    if (opInfoStatus === 'Chưa có TT lệnh') {
      finalPicCoordinator = ''
      finalStageOrderNo = ''
      finalStageOrderCreatedDate = ''
      finalMatCode = ''
      finalMatName = ''
      finalOpName = ''
      finalOpTypeName = ''
      finalMachineName = ''
      finalUnit = ''
      finalTargetQty = ''
      finalPlannedQty = ''
      finalStandardRunMin = ''
      finalStandardCapa = ''
      finalCoordinatorStatus = ''
      finalTimeStatus = ''
      finalCapaStatus = ''
    }

    if (typeof finalPlannedQty === 'number') totalPlannedQty += finalPlannedQty
    if (typeof finalTargetQty === 'number') totalTargetQty += finalTargetQty
    totalQualifiedQty += actualQualified
    if (typeof finalStandardRunMin === 'number') totalPlannedMinutes += finalStandardRunMin
    totalActualMinutes += actualRunMin

    calculatedRows.push({
      PicCoordinator: finalPicCoordinator,
      OpInfoStatus: opInfoStatus,
      OperationOrderNo: code,
      OperationDate: opDate,
      StageOrderNo: finalStageOrderNo,
      StageOrderCreatedDate: finalStageOrderCreatedDate,
      MaterialCode: finalMatCode,
      MaterialName: finalMatName,
      OperationName: finalOpName,
      OperationTypeName: finalOpTypeName,
      MachineName: finalMachineName,
      Unit: finalUnit,
      OpTargetQty: finalTargetQty,
      OpPlannedQty: finalPlannedQty,
      ActualQualifiedQty: actualQualified,
      StartTime: startTime,
      EndTime: endTime,
      StandardRunMinutes: finalStandardRunMin !== '' && finalStandardRunMin > 0 ? finalStandardRunMin : '',
      ActualRunMinutes: actualRunMin > 0 ? actualRunMin : '',
      StandardCapa: finalStandardCapa !== '' && finalStandardCapa > 0 ? finalStandardCapa : '',
      ActualCapa: actualCapa > 0 ? actualCapa : '',
      CoordinatorStatus: finalCoordinatorStatus,
      TimeStatus: finalTimeStatus,
      CapaStatus: finalCapaStatus,
      KhsxStatus: khsxStatus,

      'PIC ĐP': finalPicCoordinator,
      'Trạng thái LTT': opInfoStatus,
      'Trạng thái thông tin lệnh': opInfoStatus,
      'Số lệnh thao tác': code,
      'Ngày thực hiện thao tác': opDate,
      'Số lệnh công đoạn': finalStageOrderNo,
      'Ngày tạo lệnh công đoạn': finalStageOrderCreatedDate,
      'Mã hàng': finalMatCode,
      'Tên hàng': finalMatName,
      'Thao tác': finalOpName,
      'Phân loại thao tác': finalOpTypeName,
      'Máy sản xuất': finalMachineName,
      Đvt: finalUnit,
      'Số lượng cần đạt LTT': finalTargetQty,
      'Số lượng cần sản xuất': finalPlannedQty,
      'Số lượng đã thống kê đạt': actualQualified,
      'Thời gian bắt đầu': startTime,
      'Thời gian kết thúc': endTime,
      'Thời gian sản xuất theo ĐM': finalStandardRunMin !== '' && finalStandardRunMin > 0 ? finalStandardRunMin : '',
      'Thời gian sản xuất': actualRunMin > 0 ? actualRunMin : '',
      'Capa ĐM': finalStandardCapa !== '' && finalStandardCapa > 0 ? finalStandardCapa : '',
      'Capa thực tế': actualCapa > 0 ? actualCapa : '',
      'Trạng thái ĐP - SX': finalCoordinatorStatus,
      'Trạng thái thời gian': finalTimeStatus,
      'Trạng thái capa': finalCapaStatus,
      KHSX: khsxStatus,
      CalcVersion: calcVersion,
      'Version tính toán': calcVersion,
      RegCode: regCode,
      'Mã đăng ký': regCode,

      PicDp: finalPicCoordinator,
      OperationNo: code,
      OpDate: opDate,
      RoutingDocNo: finalStageOrderNo,
      RoutingDocDate: finalStageOrderCreatedDate,
      ItemCode: finalMatCode,
      ItemName: finalMatName,
      OpTypeName: finalOpTypeName,
      TargetPassQty: finalTargetQty,
      TargetProdQty: finalPlannedQty,
      StatPassQty: actualQualified,
      StandardProdTime: finalStandardRunMin !== '' && finalStandardRunMin > 0 ? finalStandardRunMin : '',
      ActualProdTime: actualRunMin > 0 ? actualRunMin : '',
      StatusDpSx: finalCoordinatorStatus,
      KhsxCheck: khsxStatus
    })
  })

  return {
    version: calcVersion,
    calcVersion,
    regCode,
    totalPlannedQty,
    totalTargetQty,
    totalQualifiedQty,
    totalPlannedHours: Number((totalPlannedMinutes / 60).toFixed(2)),
    totalActualHours: Number((totalActualMinutes / 60).toFixed(2)),
    totalOrders: calculatedRows.length,
    columns: RESULT_KHSX_COLUMN_SCHEMA,
    calculatedRows,
    missingOpInfoList,
    hasMissingOpInfo: missingOpInfoList.length > 0,
    missingOrdersCount: missingOpInfoList.length
  }
}

export default {
  parseDateTimeFlexible,
  computeKhsxChecks,
  enrichSummaryOpDataWithKhsxChecks,
  calculateKHSX
}
