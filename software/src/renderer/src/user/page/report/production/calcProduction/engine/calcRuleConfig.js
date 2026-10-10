/**
 * Dynamic Rule Engine & Calculation Configurations
 * Module Quản lý Cấu hình và Quy tắc Tính toán Động cho KHSX & TKSX
 */

import dayjs from 'dayjs'

/**
 * Cấu hình quy tắc tính toán mặc định
 */
export const DEFAULT_CALC_RULES = {
  // 1. Cấu hình Ca sản xuất & Khung giờ đối soát KHSX
  shift: {
    startHour: 7,
    startMinute: 0,
    startSecond: 0,
    durationHours: 24, // 24h từ 07:00 ngày T đến 07:00 ngày T+1
    endToleranceMinutes: 0
  },

  // 2. Cấu hình dung sai so sánh số lượng sản xuất
  quantity: {
    tolerancePercent: 5, // Sai số ±5%
    requireTargetRange: true, // Kiểm tra (actual >= target && actual <= planned)
    allowZeroQualifiedAsMissed: true // actual = 0 coi là Trượt KH
  },

  // 3. Quy tắc nhãn Trạng thái ĐP - SX (Coordinator Status)
  coordinatorStatus: {
    outsidePlan: 'SX sai ngày KH',
    missedPlan: 'Trượt KH',
    matchedQty: 'Khớp số lượng',
    matchedJob: 'Khớp job',
    notInPlan: 'Khác KHSX'
  },

  // 4. Quy tắc nhãn Trạng thái Thời gian (Time Status)
  timeStatus: {
    slowLabel: 'Chậm hơn ĐM',
    exactLabel: 'Đúng ĐM',
    fastLabel: 'Nhanh hơn ĐM',
    emptyOnMissedPlan: true,
    emptyOnMissingData: true
  },

  // 5. Quy tắc nhãn Trạng thái Capa (Capa Status)
  capaStatus: {
    slowLabel: 'Chậm hơn ĐM',
    exactLabel: 'Đúng ĐM',
    fastLabel: 'Nhanh hơn ĐM',
    emptyOnMissedPlan: true,
    emptyOnMissingData: true
  },

  // 6. Quy tắc nhãn KHSX
  khsxStatus: {
    validLabel: 'KHSX',
    invalidLabel: 'SX sai ngày KH',
    outsideLabel: 'Khác KHSX'
  },

  // 7. Hiệu năng & Batching
  performance: {
    chunkSize: 1000,
    yieldThresholdMs: 16,
    enableFastTimestampParsing: true
  }
}

/**
 * Trộn cấu hình mặc định với cấu hình tùy chỉnh của người dùng/nhà máy
 */
export function getEffectiveCalcRules(customRules = {}) {
  if (!customRules || typeof customRules !== 'object') {
    return DEFAULT_CALC_RULES
  }

  return {
    ...DEFAULT_CALC_RULES,
    ...customRules,
    shift: { ...DEFAULT_CALC_RULES.shift, ...(customRules.shift || {}) },
    quantity: { ...DEFAULT_CALC_RULES.quantity, ...(customRules.quantity || {}) },
    coordinatorStatus: {
      ...DEFAULT_CALC_RULES.coordinatorStatus,
      ...(customRules.coordinatorStatus || {})
    },
    timeStatus: { ...DEFAULT_CALC_RULES.timeStatus, ...(customRules.timeStatus || {}) },
    capaStatus: { ...DEFAULT_CALC_RULES.capaStatus, ...(customRules.capaStatus || {}) },
    khsxStatus: { ...DEFAULT_CALC_RULES.khsxStatus, ...(customRules.khsxStatus || {}) },
    performance: { ...DEFAULT_CALC_RULES.performance, ...(customRules.performance || {}) }
  }
}

/**
 * Đánh giá Trạng thái thời gian động (TimeStatus)
 * - Trả về rỗng ("") nếu Trạng thái ĐP-SX là 'Trượt KH' hoặc thiếu dữ liệu (standardMin <= 0 || actualMin <= 0)
 * - Trả về 'Chậm hơn ĐM' nếu actualMin > standardMin
 * - Trả về 'Đúng ĐM' nếu actualMin === standardMin
 * - Trả về 'Nhanh hơn ĐM' nếu actualMin < standardMin
 */
export function evaluateTimeStatus(
  standardMin,
  actualMin,
  coordinatorStatus,
  rules = DEFAULT_CALC_RULES
) {
  const cfg = rules.timeStatus || DEFAULT_CALC_RULES.timeStatus
  const coordCfg = rules.coordinatorStatus || DEFAULT_CALC_RULES.coordinatorStatus

  if (cfg.emptyOnMissedPlan && coordinatorStatus === coordCfg.missedPlan) {
    return ''
  }

  const sMin = Number(standardMin) || 0
  const aMin = Number(actualMin) || 0

  if (cfg.emptyOnMissingData && (sMin <= 0 || aMin <= 0)) {
    return ''
  }

  if (aMin > sMin) return cfg.slowLabel
  if (aMin === sMin) return cfg.exactLabel
  return cfg.fastLabel
}

/**
 * Đánh giá Trạng thái Capa động (CapaStatus)
 * - Trả về rỗng ("") nếu Trạng thái ĐP-SX là 'Trượt KH' hoặc thiếu dữ liệu (actualCapa <= 0 || standardMin <= 0 || standardCapa <= 0)
 * - Trả về 'Chậm hơn ĐM' nếu actualCapa > standardCapa
 * - Trả về 'Đúng ĐM' nếu actualCapa === standardCapa
 * - Trả về 'Nhanh hơn ĐM' nếu actualCapa < standardCapa
 */
export function evaluateCapaStatus(
  standardCapa,
  actualCapa,
  standardMin,
  coordinatorStatus,
  rules = DEFAULT_CALC_RULES
) {
  const cfg = rules.capaStatus || DEFAULT_CALC_RULES.capaStatus
  const coordCfg = rules.coordinatorStatus || DEFAULT_CALC_RULES.coordinatorStatus

  if (cfg.emptyOnMissedPlan && coordinatorStatus === coordCfg.missedPlan) {
    return ''
  }

  const sCapa = Number(standardCapa) || 0
  const aCapa = Number(actualCapa) || 0
  const sMin = Number(standardMin) || 0

  if (cfg.emptyOnMissingData && (aCapa <= 0 || sMin <= 0 || sCapa <= 0)) {
    return ''
  }

  if (aCapa > sCapa) return cfg.slowLabel
  if (aCapa === sCapa) return cfg.exactLabel
  return cfg.fastLabel
}

/**
 * Đánh giá Trạng thái Điều phối - Sản xuất (ĐP - SX) động
 */
export function evaluateCoordinatorStatus(
  actualQualified,
  targetQty,
  plannedQty,
  isTimeInsideShift,
  khsxStatus,
  rules = DEFAULT_CALC_RULES
) {
  const coordCfg = rules.coordinatorStatus || DEFAULT_CALC_RULES.coordinatorStatus
  const qtyCfg = rules.quantity || DEFAULT_CALC_RULES.quantity
  const khsxCfg = rules.khsxStatus || DEFAULT_CALC_RULES.khsxStatus

  if (khsxStatus !== khsxCfg.validLabel || !isTimeInsideShift) {
    return coordCfg.outsidePlan
  }

  const actual = Number(actualQualified) || 0
  const target = Number(targetQty) || 0
  const planned = Number(plannedQty) || 0

  if (qtyCfg.allowZeroQualifiedAsMissed && actual === 0) {
    return coordCfg.missedPlan
  }

  const toleranceRatio = (qtyCfg.tolerancePercent || 5) / 100
  const isRangeMatched = qtyCfg.requireTargetRange
    ? actual >= target && actual <= planned
    : actual >= target

  const isToleranceMatched = actual > 0 && Math.abs(target - actual) <= actual * toleranceRatio

  if (isRangeMatched || isToleranceMatched) {
    return coordCfg.matchedQty
  }

  return coordCfg.matchedJob
}

/**
 * Phân tích ngày linh hoạt (hỗ trợ YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Date, số serial Excel)
 */
function parseDateFlexible(val) {
  if (!val) return null
  if (val instanceof Date && !isNaN(val)) return dayjs(val)

  const str = String(val).trim()
  if (!str) return null

  // 1. Kiểm tra số serial Excel
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const millis = Math.round(num * 86400000)
    const date = new Date(excelEpoch.getTime() + millis)
    if (!isNaN(date)) return dayjs(date)
  }

  // 2. Format DD/MM/YYYY hoặc DD-MM-YYYY (kèm giờ phút giây tùy chọn)
  const dmyMatch = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  )
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10)
    const m = parseInt(dmyMatch[2], 10) - 1
    let y = parseInt(dmyMatch[3], 10)
    if (y < 100) y += 2000
    const date = new Date(y, m, d)
    if (!isNaN(date)) return dayjs(date)
  }

  // 3. Fallback dayjs parse chuẩn
  const djs = dayjs(str)
  if (djs.isValid()) return djs

  return null
}

/**
 * Tính toán cửa sổ chu kỳ ngày KHSX động và nhanh bằng timestamp số nguyên
 */
export function createShiftWindowEvaluator(applyDateStr, rules = DEFAULT_CALC_RULES) {
  if (!applyDateStr) return null

  const shiftCfg = rules.shift || DEFAULT_CALC_RULES.shift
  const applyDjs = parseDateFlexible(applyDateStr)
  if (!applyDjs || !applyDjs.isValid()) return null

  const wStart = applyDjs
    .clone()
    .startOf('day')
    .hour(shiftCfg.startHour)
    .minute(shiftCfg.startMinute)
    .second(shiftCfg.startSecond)
  const wStartMs = wStart.valueOf()

  const wEndMs = wStartMs + (shiftCfg.durationHours || 24) * 3600 * 1000
  const wEndMinus1sMs = wEndMs - 1000

  return {
    wStartMs,
    wEndMs,
    wEndMinus1sMs,
    isInsideShift: (ts) => ts >= wStartMs && ts < wEndMs,
    isStartValid: (ts) => ts >= wStartMs && ts <= wEndMinus1sMs,
    isEndValid: (startTs, endTs) => endTs >= startTs && endTs <= wEndMs
  }
}
