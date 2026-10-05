/**
 * Format chuỗi ngày hiển thị chuẩn Việt Nam (DD/MM/YYYY)
 */
export function formatToVNDate(dateVal) {
  if (!dateVal || dateVal === 'Khác' || dateVal === 'Kỳ Master') return dateVal || ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.slice(0, 10).split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`
  }
  return s
}

/**
 * Format ngày ngắn hiển thị trên trục X (DD/MM)
 */
export function formatToShortDate(dateVal) {
  if (!dateVal || dateVal === 'Khác' || dateVal === 'Kỳ Master') return dateVal || ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.slice(0, 10).split('-')
    return `${parts[2]}/${parts[1]}`
  }
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}`
  }
  return s
}

/**
 * Tính toán các chỉ số cho từng ngày và so sánh với ngày liền trước
 * @param {Object} current - Bản ghi ngày hiện tại { date, totalOrders, wrongPlanDate, slippedPlan, matchedQuantity, matchedJob, isIncomplete }
 * @param {Object|null} prev - Bản ghi ngày liền trước (nếu có)
 */
export function calculateDayMetrics(current, prev = null) {
  if (!current) return null

  const totalOrders = Number(current.totalOrders || 0)
  const wrongPlanDate = Number(current.wrongPlanDate || 0)
  const slippedPlan = Number(current.slippedPlan || 0)
  const matchedQuantity = Number(current.matchedQuantity || 0)
  const matchedJob = Number(current.matchedJob || 0)
  const isIncomplete = Boolean(current.isIncomplete)

  // 1. Tỷ lệ % trên tổng LSX trong ngày (làm tròn 1 chữ số thập phân)
  // Tỷ lệ ngày = số lệnh chỉ tiêu / tổng LSX ngày * 100%
  const wrongPlanDateRate =
    totalOrders > 0 ? Number(((wrongPlanDate / totalOrders) * 100).toFixed(1)) : 0
  const slippedPlanRate =
    totalOrders > 0 ? Number(((slippedPlan / totalOrders) * 100).toFixed(1)) : 0
  const matchedQuantityRate =
    totalOrders > 0 ? Number(((matchedQuantity / totalOrders) * 100).toFixed(1)) : 0
  const matchedJobRate = totalOrders > 0 ? Number(((matchedJob / totalOrders) * 100).toFixed(1)) : 0

  // 2. Tăng / giảm tổng LSX so với ngày trước:
  // (LSX hôm nay - LSX hôm trước) / LSX hôm trước * 100%
  let totalOrdersGrowthPct = null
  let totalOrdersDiff = null

  if (prev && Number(prev.totalOrders || 0) > 0) {
    const prevOrders = Number(prev.totalOrders)
    totalOrdersDiff = totalOrders - prevOrders
    totalOrdersGrowthPct = Number(((totalOrdersDiff / prevOrders) * 100).toFixed(1))
  }

  // 3. Chênh lệch 4 tỷ lệ chất lượng so với ngày trước bằng điểm phần trăm (pp - percentage points)
  // Ngày đầu hoặc không có ngày trước: null (hiển thị "—")
  let wrongPlanDateRateDiff = null
  let slippedPlanRateDiff = null
  let matchedQuantityRateDiff = null
  let matchedJobRateDiff = null

  if (prev && Number(prev.totalOrders || 0) > 0) {
    const prevWrongRate = Number(
      ((Number(prev.wrongPlanDate || 0) / Number(prev.totalOrders)) * 100).toFixed(1)
    )
    const prevSlippedRate = Number(
      ((Number(prev.slippedPlan || 0) / Number(prev.totalOrders)) * 100).toFixed(1)
    )
    const prevMatchedQtyRate = Number(
      ((Number(prev.matchedQuantity || 0) / Number(prev.totalOrders)) * 100).toFixed(1)
    )
    const prevMatchedJobRate = Number(
      ((Number(prev.matchedJob || 0) / Number(prev.totalOrders)) * 100).toFixed(1)
    )

    wrongPlanDateRateDiff = Number((wrongPlanDateRate - prevWrongRate).toFixed(1))
    slippedPlanRateDiff = Number((slippedPlanRate - prevSlippedRate).toFixed(1))
    matchedQuantityRateDiff = Number((matchedQuantityRate - prevMatchedQtyRate).toFixed(1))
    matchedJobRateDiff = Number((matchedJobRate - prevMatchedJobRate).toFixed(1))
  }

  return {
    date: current.date,
    totalOrders,
    wrongPlanDate,
    slippedPlan,
    matchedQuantity,
    matchedJob,
    isIncomplete,
    // Rates (%)
    wrongPlanDateRate,
    slippedPlanRate,
    matchedQuantityRate,
    matchedJobRate,
    // Deltas
    totalOrdersGrowthPct,
    totalOrdersDiff,
    wrongPlanDateRateDiff,
    slippedPlanRateDiff,
    matchedQuantityRateDiff,
    matchedJobRateDiff
  }
}

/**
 * Tính toán tổng hợp KPI cho toàn bộ khoảng ngày (cả kỳ)
 * QUY TẮC BẮT BUỘC:
 * Tỷ lệ cả kỳ = tổng số lệnh chỉ tiêu / tổng LSX cả kỳ * 100%
 * TUYỆT ĐỐI KHÔNG lấy trung bình đơn giản của tỷ lệ ngày!
 */
export function calculatePeriodSummary(dataList = []) {
  if (!Array.isArray(dataList) || dataList.length === 0) {
    return {
      totalOrders: 0,
      wrongPlanDate: 0,
      slippedPlan: 0,
      matchedQuantity: 0,
      matchedJob: 0,
      wrongPlanDateRate: 0,
      slippedPlanRate: 0,
      matchedQuantityRate: 0,
      matchedJobRate: 0,
      totalDays: 0
    }
  }

  let totalOrders = 0
  let wrongPlanDate = 0
  let slippedPlan = 0
  let matchedQuantity = 0
  let matchedJob = 0

  dataList.forEach((row) => {
    totalOrders += Number(row.totalOrders || 0)
    wrongPlanDate += Number(row.wrongPlanDate || 0)
    slippedPlan += Number(row.slippedPlan || 0)
    matchedQuantity += Number(row.matchedQuantity || 0)
    matchedJob += Number(row.matchedJob || 0)
  })

  const wrongPlanDateRate =
    totalOrders > 0 ? Number(((wrongPlanDate / totalOrders) * 100).toFixed(1)) : 0
  const slippedPlanRate =
    totalOrders > 0 ? Number(((slippedPlan / totalOrders) * 100).toFixed(1)) : 0
  const matchedQuantityRate =
    totalOrders > 0 ? Number(((matchedQuantity / totalOrders) * 100).toFixed(1)) : 0
  const matchedJobRate = totalOrders > 0 ? Number(((matchedJob / totalOrders) * 100).toFixed(1)) : 0

  return {
    totalOrders,
    wrongPlanDate,
    slippedPlan,
    matchedQuantity,
    matchedJob,
    wrongPlanDateRate,
    slippedPlanRate,
    matchedQuantityRate,
    matchedJobRate,
    totalDays: dataList.length
  }
}

/**
 * Định dạng hiển thị % tăng trưởng / thay đổi
 * Ngày đầu hoặc mẫu số bằng 0 -> "—"
 */
export function formatDisplayGrowth(value, unit = '%') {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return '—'
  }
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}${unit}`
}

/**
 * Định dạng hiển thị chênh lệch tỷ lệ (%) so với ngày trước
 */
export function formatDisplayPoints(diff) {
  if (diff === null || diff === undefined || isNaN(diff) || !isFinite(diff)) {
    return '—'
  }
  const prefix = diff > 0 ? '+' : ''
  return `${prefix}${diff.toFixed(1)}%`
}

/**
 * Đánh giá màu sắc ngữ nghĩa (Good / Bad / Neutral)
 * - Sai ngày KH giảm: Tốt (Xanh); Tăng: Xấu (Đỏ)
 * - Trượt KH giảm: Tốt (Xanh); Tăng: Xấu (Đỏ)
 * - Khớp số lượng tăng: Tốt (Xanh); Giảm: Xấu (Đỏ)
 * - Khớp job tăng: Tốt (Xanh); Giảm: Xấu (Đỏ)
 * - Tổng LSX: Luôn dùng màu trung tính (Neutral) vì tăng/giảm chưa đủ kết luận chất lượng
 */
export function getMetricDeltaColor(metricKey, diff) {
  if (diff === null || diff === undefined || isNaN(diff) || diff === 0) {
    return '#64748b' // Slate trung tính
  }

  // Tiêu chí tiêu cực (càng ít càng tốt): Giảm = Xanh, Tăng = Đỏ
  if (metricKey === 'wrongPlanDate' || metricKey === 'slippedPlan') {
    return diff < 0 ? '#16a34a' : '#dc2626'
  }

  // Tiêu chí tích cực (càng nhiều càng tốt): Tăng = Xanh, Giảm = Đỏ
  if (metricKey === 'matchedQuantity' || metricKey === 'matchedJob') {
    return diff > 0 ? '#16a34a' : '#dc2626'
  }

  // Tổng LSX dùng màu trung tính
  return '#475569'
}

export function getWeekPeriodInfo(dateStr) {
  if (!dateStr || dateStr === 'Khác') return { weekKey: 'Khác', shortDate: 'Khác', displayDate: 'Khác' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { weekKey: dateStr, shortDate: dateStr, displayDate: dateStr }

  // ISO week calculation
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  const year = new Date(firstThursday).getFullYear()

  // Start (Mon) and End (Sun) dates
  const curr = new Date(d)
  const day = curr.getDay()
  const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(curr.setDate(diffToMon))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (dt) =>
    `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
  const rangeStr = `${fmt(monday)} - ${fmt(sunday)}`
  const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`

  return {
    weekKey,
    shortDate: `Tuần ${weekNum}`,
    displayDate: `Tuần ${weekNum} (${rangeStr})`,
    rangeStr
  }
}

/**
 * Gom nhóm dữ liệu KHSX ngày thành danh sách theo Tuần, Tháng và theo Quý
 */
export function groupPlanDailyDataByPeriod(dailyList = []) {
  if (!Array.isArray(dailyList) || dailyList.length === 0) {
    return {
      dailyList: [],
      weeklyList: [],
      monthlyList: [],
      quarterlyList: []
    }
  }

  const weekMap = new Map()
  const monthMap = new Map()
  const quarterMap = new Map()

  dailyList.forEach((item) => {
    const rawDate = item.date || item.StatDate || item.prodDate || ''
    let dStr = String(rawDate).trim()
    if (dStr.length > 10) dStr = dStr.slice(0, 10)

    let mKey = dStr.length >= 7 ? dStr.slice(0, 7) : 'Khác'
    let qKey = 'Khác'
    let mLabel = mKey
    let qLabel = qKey
    let mShort = mKey
    let qShort = qKey

    if (dStr.length >= 7) {
      const year = dStr.slice(0, 4)
      const monthNum = parseInt(dStr.slice(5, 7), 10)
      const qNum = Math.ceil(monthNum / 3)
      mKey = `${year}-${String(monthNum).padStart(2, '0')}`
      qKey = `${year}-Q${qNum}`
      mLabel = `Tháng ${monthNum}/${year}`
      qLabel = `Quý ${qNum}/${year}`
      mShort = `T${monthNum}/${year.slice(2)}`
      qShort = `Q${qNum}/${year.slice(2)}`
    }

    const { weekKey, shortDate: wShort, displayDate: wLabel } = getWeekPeriodInfo(dStr)

    const updateAgg = (map, key, displayDate, shortDate) => {
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          displayDate,
          shortDate,
          totalOrders: 0,
          wrongPlanDate: 0,
          slippedPlan: 0,
          matchedQuantity: 0,
          matchedJob: 0,
          totalItems: 0
        })
      }
      const agg = map.get(key)
      agg.totalOrders += Number(item.totalOrders || 0)
      agg.wrongPlanDate += Number(item.wrongPlanDate || 0)
      agg.slippedPlan += Number(item.slippedPlan || 0)
      agg.matchedQuantity += Number(item.matchedQuantity || 0)
      agg.matchedJob += Number(item.matchedJob || 0)
      agg.totalItems += Number(item.totalItems || 0)
    }

    if (dStr && dStr !== 'Khác') {
      updateAgg(weekMap, weekKey, wLabel, wShort)
      updateAgg(monthMap, mKey, mLabel, mShort)
      updateAgg(quarterMap, qKey, qLabel, qShort)
    }
  })

  const formatPeriodList = (map) => {
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    dailyList,
    weeklyList: formatPeriodList(weekMap),
    monthlyList: formatPeriodList(monthMap),
    quarterlyList: formatPeriodList(quarterMap)
  }
}
