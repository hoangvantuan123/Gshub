import {
  getAutoExportType,
  isPassAutoIo,
  isMissingAutoIo
} from '../../../hanoiGs1/stat/hooks/useProductionStatisticsLogic'
import { getCleanDate } from '../../../../common/reportUtils'

/**
 * Format chuỗi ngày hiển thị chuẩn Việt Nam (DD/MM/YYYY)
 */
export function formatToVNDate(dateVal) {
  if (!dateVal || dateVal === 'Khác') return 'Khác'
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
 * Format ngày ngắn (DD/MM)
 */
export function formatToShortDate(dateVal) {
  if (!dateVal || dateVal === 'Khác') return 'Khác'
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
 * Hàm tính tốc độ tăng trưởng ngày (%) theo công thức chuẩn:
 * Tăng trưởng ngày (%) = (Giá trị hôm nay − Giá trị hôm trước) / Giá trị hôm trước × 100%.
 */
export function calculateSingleGrowth(currVal, prevVal, isFirst = false) {
  const current = currVal === null || currVal === undefined ? null : Number(currVal)
  const previous = prevVal === null || prevVal === undefined ? null : Number(prevVal)

  if (isFirst || previous === null || isNaN(previous)) {
    return {
      rate: 0,
      label: '—',
      status: 'first',
      isNew: false
    }
  }

  if (previous === 0) {
    if (current > 0) {
      return {
        rate: 100,
        label: 'Phát sinh mới',
        status: 'new',
        isNew: true
      }
    }
    return {
      rate: 0,
      label: '—',
      status: 'zero',
      isNew: false
    }
  }

  if (current === null || isNaN(current)) {
    return {
      rate: 0,
      label: '—',
      status: 'missing',
      isNew: false
    }
  }

  const rawRate = ((current - previous) / previous) * 100
  const rate = Number(rawRate.toFixed(1))
  const sign = rate > 0 ? '+' : ''
  const label = `${sign}${rate.toFixed(1)}%`

  return {
    rate,
    label,
    status: rate > 0 ? 'up' : rate < 0 ? 'down' : 'stable',
    isNew: false
  }
}

/**
 * Trích xuất và nhóm dữ liệu số phiếu & 4 chỉ tiêu theo từng ngày từ API thực tế
 * Đồng bộ 100% logic với KPI Cards của hệ thống MES Engine & Bravo ERP
 */
export function extractDailyTicketGrowthData(
  filteredData = [],
  dailyAggregates = [],
  backendReportData = null,
  kpiMetrics = null,
  dateRange = []
) {
  // 1. Khi có danh sách chi tiết (filteredData)
  if (Array.isArray(filteredData) && filteredData.length > 0) {
    const dayMap = new Map()

    filteredData.forEach((item) => {
      const rawDate = item.date || item.StatDate || item.prodDate || item.ApplyDate || 'Khác'
      const normDate = rawDate === 'Khác' ? 'Khác' : getCleanDate(rawDate) || rawDate.slice(0, 10)

      if (!dayMap.has(normDate)) {
        dayMap.set(normDate, {
          date: normDate,
          displayDate: formatToVNDate(normDate),
          shortDate: formatToShortDate(normDate),
          totalTickets: 0,
          over12hCount: 0,
          under5MinCount: 0,
          autoExportedCount: 0,
          notAutoExportedCount: 0,
          mesCount: 0,
          nonMesCount: 0
        })
      }

      const rec = dayMap.get(normDate)
      rec.totalTickets += 1

      // Chỉ tiêu 1 & 2: Thời lượng chạy máy (> 12h và < 5 phút)
      const rHours = Number(item.runtimeHours || 0)
      const durMin = Number(item.durationMinutes ?? rHours * 60)
      if (rHours > 12 || durMin > 720) {
        rec.over12hCount += 1
      }
      if (durMin < 5) {
        rec.under5MinCount += 1
      }

      // Chỉ tiêu 3: Sinh phiếu X/N tự động (Đã sinh vs Chưa sinh)
      const typeKey = getAutoExportType(item)
      if (isPassAutoIo(typeKey)) {
        rec.autoExportedCount += 1
      } else if (isMissingAutoIo(typeKey)) {
        rec.notAutoExportedCount += 1
      }

      // Chỉ tiêu 4: Nguồn MES vs Ngoài MES (Đồng bộ 100% với kpiMetrics)
      const origin = String(item.origin || item.createdSource || item.source || '').toUpperCase()
      if (origin.includes('MES')) {
        rec.mesCount += 1
      } else {
        rec.nonMesCount += 1
      }
    })

    const result = Array.from(dayMap.values()).sort((a, b) => {
      if (a.date === 'Khác') return 1
      if (b.date === 'Khác') return -1
      return String(a.date).localeCompare(String(b.date))
    })

    if (result.length > 0) {
      return result
    }
  }

  // 2. Khi backend trả sẵn dữ liệu tổng hợp theo ngày
  const backendList = backendReportData?.dailyTicketGrowthData || backendReportData?.chartByDay
  if (Array.isArray(backendList) && backendList.length > 0) {
    return backendList.map((d) => {
      const tickets = Number(d.totalTickets ?? d.ticketCount ?? d.tickets ?? 0)
      const nonMes = Number(d.nonMesCount ?? 0)
      const mes = Number(d.mesCount ?? Math.max(0, tickets - nonMes))
      return {
        date: d.date || d.Date,
        displayDate: formatToVNDate(d.date || d.Date),
        shortDate: formatToShortDate(d.date || d.Date),
        totalTickets: tickets,
        over12hCount: Number(d.over12hCount ?? d.anomalies ?? 0),
        under5MinCount: Number(d.under5MinCount ?? d.under5Min ?? 0),
        autoExportedCount: Number(
          d.autoExportedCount ?? d.autoExportPass ?? d.autoExportCount ?? 0
        ),
        notAutoExportedCount: Number(
          d.notAutoExportedCount ?? d.autoExportMissing ?? d.noAutoExportCount ?? 0
        ),
        mesCount: mes,
        nonMesCount: nonMes
      }
    })
  }

  // 3. Khi có dailyAggregates từ luồng báo cáo tổng hợp
  if (Array.isArray(dailyAggregates) && dailyAggregates.length > 0) {
    return dailyAggregates.map((d) => {
      const tickets = Number(d.ticketCount ?? d.tickets ?? d.orderCount ?? d.totalTickets ?? 0)
      const nonMes = Number(d.nonMesCount ?? 0)
      const mes = Number(d.mesCount ?? Math.max(0, tickets - nonMes))
      return {
        date: d.date || d.Date,
        displayDate: formatToVNDate(d.date || d.Date),
        shortDate: formatToShortDate(d.date || d.Date),
        totalTickets: tickets,
        over12hCount: Number(d.over12hCount ?? d.anomalies ?? 0),
        under5MinCount: Number(d.under5MinCount ?? d.under5Min ?? 0),
        autoExportedCount: Number(
          d.autoExportedCount ?? d.autoExportPass ?? d.autoExportCount ?? 0
        ),
        notAutoExportedCount: Number(
          d.notAutoExportedCount ?? d.autoExportMissing ?? d.noAutoExportCount ?? 0
        ),
        mesCount: mes,
        nonMesCount: nonMes
      }
    })
  }

  // 4. Khi filteredData rỗng nhưng kpiMetrics có sẵn tổng hợp từ backend
  if (kpiMetrics && Number(kpiMetrics.totalTickets || 0) > 0) {
    const singleDate = dateRange?.[0] || new Date().toISOString().slice(0, 10)
    const totalTickets = Number(kpiMetrics.totalTickets || 0)
    const mesCount = Number(kpiMetrics.mesCount ?? kpiMetrics.mesCreatedCount ?? totalTickets)
    const nonMesCount = Number(kpiMetrics.bravoCreatedCount ?? Math.max(0, totalTickets - mesCount))
    const over12hCount = Number(kpiMetrics.over12hCount ?? kpiMetrics.runtimeOver12hCheck ?? 0)
    const under5MinCount = Number(kpiMetrics.under5MinCount ?? kpiMetrics.runtimeUnder5Min ?? 0)
    const autoExportedCount = Number(kpiMetrics.autoExportCount || 0)
    const notAutoExportedCount = Number(kpiMetrics.noAutoExportCount || 0)

    return [
      {
        date: singleDate,
        displayDate: formatToVNDate(singleDate),
        shortDate: formatToShortDate(singleDate),
        totalTickets,
        over12hCount,
        under5MinCount,
        autoExportedCount,
        notAutoExportedCount,
        mesCount,
        nonMesCount
      }
    ]
  }

  // Không có dữ liệu từ API
  return []
}

/**
 * Gom nhóm dữ liệu ngày thành danh sách theo Tháng và theo Quý
 */
export function groupDailyDataByPeriod(dailyList = []) {
  if (!Array.isArray(dailyList) || dailyList.length === 0) {
    return {
      dailyList: [],
      monthlyList: [],
      quarterlyList: []
    }
  }

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

    const updateAgg = (map, key, displayDate, shortDate) => {
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          displayDate,
          shortDate,
          totalTickets: 0,
          over12hCount: 0,
          under5MinCount: 0,
          autoExportedCount: 0,
          notAutoExportedCount: 0,
          mesCount: 0,
          nonMesCount: 0
        })
      }
      const agg = map.get(key)
      agg.totalTickets += Number(item.totalTickets || 0)
      agg.over12hCount += Number(item.over12hCount || 0)
      agg.under5MinCount += Number(item.under5MinCount || 0)
      agg.autoExportedCount += Number(item.autoExportedCount || 0)
      agg.notAutoExportedCount += Number(item.notAutoExportedCount || 0)
      agg.mesCount += Number(item.mesCount || 0)
      agg.nonMesCount += Number(item.nonMesCount || 0)
    }

    if (dStr && dStr !== 'Khác') {
      updateAgg(monthMap, mKey, mLabel, mShort)
      updateAgg(quarterMap, qKey, qLabel, qShort)
    }
  })

  const formatPeriodList = (map) => {
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    dailyList,
    monthlyList: formatPeriodList(monthMap),
    quarterlyList: formatPeriodList(quarterMap)
  }
}

/**
 * Tính toán toàn bộ 4 chuỗi dữ liệu + % tăng trưởng cho biểu đồ
 */
export function calculateDailyGrowthSeries(rawDailyData = []) {
  if (!Array.isArray(rawDailyData) || rawDailyData.length === 0) {
    return {
      chartData: [],
      grandTotal: {
        totalTickets: 0,
        totalOver12h: 0,
        totalUnder5Min: 0,
        totalAutoExported: 0,
        totalNotAutoExported: 0,
        totalMes: 0,
        totalNonMes: 0,
        mesRate: 100
      }
    }
  }

  let sumTickets = 0
  let sumOver12h = 0
  let sumUnder5Min = 0
  let sumAutoExport = 0
  let sumNotAutoExport = 0
  let sumMes = 0
  let sumNonMes = 0

  const chartData = rawDailyData.map((curr, idx) => {
    const prev = idx > 0 ? rawDailyData[idx - 1] : null
    const isFirst = idx === 0

    // 1. Tổng phiếu thống kê
    const totalGrowth = calculateSingleGrowth(curr.totalTickets, prev?.totalTickets, isFirst)

    // 2. Phiếu > 12h
    const over12hGrowth = calculateSingleGrowth(curr.over12hCount, prev?.over12hCount, isFirst)

    // 3. Phiếu < 5 phút
    const under5MinGrowth = calculateSingleGrowth(
      curr.under5MinCount,
      prev?.under5MinCount,
      isFirst
    )

    // 4. Sinh phiếu X/N tự động
    const autoExportGrowth = calculateSingleGrowth(
      curr.autoExportedCount,
      prev?.autoExportedCount,
      isFirst
    )

    const totalTickets = Number(curr.totalTickets || 0)
    const mesCount = Number(curr.mesCount || 0)
    const nonMesCount = Number(curr.nonMesCount ?? Math.max(0, totalTickets - mesCount))
    const over12hCount = Number(curr.over12hCount || 0)
    const under5MinCount = Number(curr.under5MinCount || 0)
    const autoExportedCount = Number(curr.autoExportedCount || 0)
    const notAutoExportedCount = Number(curr.notAutoExportedCount || 0)
    const mesRate = totalTickets > 0 ? Number(((mesCount / totalTickets) * 100).toFixed(1)) : 100

    const over12hRate =
      totalTickets > 0 ? Number(((over12hCount / totalTickets) * 100).toFixed(1)) : 0
    const under5MinRate =
      totalTickets > 0 ? Number(((under5MinCount / totalTickets) * 100).toFixed(1)) : 0
    const totalApplicableAuto = autoExportedCount + notAutoExportedCount
    const autoExportRate =
      totalApplicableAuto > 0
        ? Number(((autoExportedCount / totalApplicableAuto) * 100).toFixed(1))
        : totalTickets > 0 && notAutoExportedCount === 0
          ? 100
          : 0

    sumTickets += totalTickets
    sumOver12h += over12hCount
    sumUnder5Min += under5MinCount
    sumAutoExport += autoExportedCount
    sumNotAutoExport += notAutoExportedCount
    sumMes += mesCount
    sumNonMes += nonMesCount

    return {
      ...curr,
      index: idx,
      isFirst,
      displayDate: curr.displayDate || formatToVNDate(curr.date),
      shortDate: curr.shortDate || formatToShortDate(curr.date),

      // Giá trị tuyệt đối
      totalTickets,
      over12hCount,
      under5MinCount,
      autoExportedCount,
      notAutoExportedCount,
      mesCount,
      nonMesCount,
      mesRate,

      // Tỷ lệ % của từng chỉ tiêu theo ngày (Dùng cho 3 đường Line trên trục Y phải)
      over12hRate,
      under5MinRate,
      autoExportRate,

      // Giá trị tăng trưởng (%)
      totalTicketsGrowth: totalGrowth.rate,
      totalTicketsGrowthLabel: totalGrowth.label,
      totalTicketsGrowthStatus: totalGrowth.status,

      over12hGrowth: over12hGrowth.rate,
      over12hGrowthLabel: over12hGrowth.label,
      over12hGrowthStatus: over12hGrowth.status,

      under5MinGrowth: under5MinGrowth.rate,
      under5MinGrowthLabel: under5MinGrowth.label,
      under5MinGrowthStatus: under5MinGrowth.status,

      autoExportGrowth: autoExportGrowth.rate,
      autoExportGrowthLabel: autoExportGrowth.label,
      autoExportGrowthStatus: autoExportGrowth.status
    }
  })

  const overallMesRate = sumTickets > 0 ? Number(((sumMes / sumTickets) * 100).toFixed(1)) : 100

  return {
    chartData,
    grandTotal: {
      totalTickets: sumTickets,
      totalOver12h: sumOver12h,
      totalUnder5Min: sumUnder5Min,
      totalAutoExported: sumAutoExport,
      totalNotAutoExported: sumNotAutoExport,
      totalMes: sumMes,
      totalNonMes: sumNonMes,
      mesRate: overallMesRate
    }
  }
}
