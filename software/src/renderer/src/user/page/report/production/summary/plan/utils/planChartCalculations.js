/**
 * Công thức tính toán chuẩn cho Báo cáo Kế hoạch Sản xuất & Biểu đồ Nhịp sản xuất
 * Tách biệt logic tính toán khỏi UI để dễ dàng bảo trì và kết nối API Bravo ERP
 */

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
 * Định dạng hiển thị chênh lệch điểm phần trăm (pp)
 */
export function formatDisplayPoints(diff) {
  if (diff === null || diff === undefined || isNaN(diff) || !isFinite(diff)) {
    return '—'
  }
  const prefix = diff > 0 ? '+' : ''
  return `${prefix}${diff.toFixed(1)} pp`
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
