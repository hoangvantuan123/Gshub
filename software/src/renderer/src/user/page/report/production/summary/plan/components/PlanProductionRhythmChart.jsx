/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LabelList
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  calculateDayMetrics,
  calculatePeriodSummary,
  formatDisplayGrowth,
  formatDisplayPoints,
  getMetricDeltaColor,
  formatToVNDate,
  formatToShortDate
} from '../utils/planChartCalculations'


/**
 * Custom Tooltip chuẩn Executive Dashboard
 * Đồng bộ phong cách thẻ báo cáo, hiển thị đúng ngày thực tế và theo dõi các chỉ tiêu đang bật
 */
function ExecutiveRhythmTooltip({ active, payload, label, visibleSeries }) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]?.payload
  if (!item) return null

  const dateFormatted = item.displayDate || formatToVNDate(item.date || label)

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '12px 16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        minWidth: 300,
        maxWidth: 380,
        fontSize: 12,
        color: '#0f172a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {/* Header ngày và trạng thái */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 8,
          marginBottom: 10
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
          Ngày: {dateFormatted}
        </span>
        {item.isIncomplete ? (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a'
            }}
          >
            Chưa đủ ngày
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#01411b'
            }}
          >
            Đợt Master
          </span>
        )}
      </div>

      {/* 1. Tổng số LSX và % tăng/giảm so với ngày trước */}
      {(!visibleSeries || visibleSeries.totalOrders !== false) && (
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 6,
            padding: '7px 10px',
            marginBottom: 10,
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#334155', fontWeight: 600 }}>Tổng số LSX (Cột):</span>
            <b style={{ color: '#01411b', fontSize: 13.5 }}>
              {item.totalOrders.toLocaleString('vi-VN')} lệnh
            </b>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 3,
              fontSize: 11,
              color: '#64748b'
            }}
          >
            <span>Tăng/giảm so với ngày trước:</span>
            <b style={{ color: '#475569' }}>{formatDisplayGrowth(item.totalOrdersGrowthPct)}</b>
          </div>
        </div>
      )}

      {/* 2. Bốn chỉ tiêu chất lượng */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {/* SX sai ngày KH */}
        {(!visibleSeries || visibleSeries.wrongPlanDate !== false) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                  display: 'inline-block'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>SX sai ngày KH:</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ color: '#ea580c' }}>
                {item.wrongPlanDate.toLocaleString('vi-VN')} lệnh ({item.wrongPlanDateRate}%)
              </b>
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: getMetricDeltaColor('wrongPlanDate', item.wrongPlanDateRateDiff)
                }}
              >
                ({formatDisplayPoints(item.wrongPlanDateRateDiff)})
              </span>
            </div>
          </div>
        )}

        {/* Trượt KH */}
        {(!visibleSeries || visibleSeries.slippedPlan !== false) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  display: 'inline-block'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Trượt KH:</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ color: '#dc2626' }}>
                {item.slippedPlan.toLocaleString('vi-VN')} lệnh ({item.slippedPlanRate}%)
              </b>
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: getMetricDeltaColor('slippedPlan', item.slippedPlanRateDiff)
                }}
              >
                ({formatDisplayPoints(item.slippedPlanRateDiff)})
              </span>
            </div>
          </div>
        )}

        {/* Khớp số lượng */}
        {(!visibleSeries || visibleSeries.matchedQuantity !== false) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                  display: 'inline-block'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Khớp số lượng:</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ color: '#16a34a' }}>
                {item.matchedQuantity.toLocaleString('vi-VN')} lệnh ({item.matchedQuantityRate}%)
              </b>
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: getMetricDeltaColor('matchedQuantity', item.matchedQuantityRateDiff)
                }}
              >
                ({formatDisplayPoints(item.matchedQuantityRateDiff)})
              </span>
            </div>
          </div>
        )}

        {/* Khớp job */}
        {(!visibleSeries || visibleSeries.matchedJob !== false) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: '#8b5cf6',
                  display: 'inline-block'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Khớp job:</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ color: '#8b5cf6' }}>
                {item.matchedJob.toLocaleString('vi-VN')} lệnh ({item.matchedJobRate}%)
              </b>
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: getMetricDeltaColor('matchedJob', item.matchedJobRateDiff)
                }}
              >
                ({formatDisplayPoints(item.matchedJobRateDiff)})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Custom Bar Shape vẽ cột và tự động nối đường giữa các đỉnh của cột cùng loại qua các ngày
 */
const CustomBarWithPeak = (props) => {
  const {
    x,
    y,
    width,
    height,
    value,
    index,
    fill,
    stroke,
    dashArray,
    seriesKey,
    collectorRef
  } = props

  if (x === undefined || y === undefined || width === undefined || height === undefined) return null

  const cx = x + width / 2
  const cy = y

  if (collectorRef && collectorRef.current) {
    if (!collectorRef.current[seriesKey]) {
      collectorRef.current[seriesKey] = []
    }
    collectorRef.current[seriesKey][index] = { cx, cy, value }
  }

  const prev = collectorRef?.current?.[seriesKey]?.[index - 1]
  const validVal = value !== null && value !== undefined && !isNaN(value)
  const displayVal = validVal && value > 0 ? Number(value).toLocaleString('vi-VN') : null

  return (
    <g className={`custom-plan-bar-${seriesKey}-${index}`}>
      {/* 1. Hình chữ nhật cột */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(0, height)}
        fill={fill}
        stroke={stroke || fill}
        strokeWidth={1}
      />

      {/* 2. Đường nối từ đỉnh cột ngày trước đến đỉnh cột ngày này */}
      {prev && prev.cx !== undefined && !isNaN(prev.cx) && !isNaN(prev.cy) && (
        <line
          x1={prev.cx}
          y1={prev.cy}
          x2={cx}
          y2={cy}
          stroke={stroke || fill}
          strokeWidth={2}
          strokeDasharray={dashArray || undefined}
          strokeLinecap="round"
        />
      )}

      {/* 3. Điểm đánh dấu đỉnh */}
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={1.5}
      />

      {/* 4. Nhãn số lượng thuần túy trên đỉnh cột (không kèm %) */}
      {displayVal && (
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="#1e293b"
          fontSize={10}
          fontWeight={700}
        >
          {displayVal}
        </text>
      )}
    </g>
  )
}

/**
 * Component Mục 1: Nhịp sản xuất & chất lượng kế hoạch
 * - Khung & thẻ VUÔNG VỨC (borderRadius: 0), chuẩn thiết kế phẳng giống y hệt các biểu đồ bên dưới
 * - Thứ tự: Tiêu đề đề mục -> 5 Thẻ thông tin KPI -> Khung Biểu đồ -> Bảng số liệu chi tiết bên dưới
 * - Thời gian: Lấy đúng các ngày thực tế từ Master / Server
 */
export function PlanProductionRhythmChart({
  serverDailyData = [],
  picTimelineBreakdown = null,
  masterList = [],
  planMetrics = {},
  plantName = 'Nhà máy GS1 Hà Nội',
  dateRange = null,
  totalDays = 1,
  loading = false
}) {
  const [showTable, setShowTable] = useState(true)
  const [rangeFilter, setRangeFilter] = useState('all')

  const pointsCollector = useMemo(() => ({ current: {} }), [])
  pointsCollector.current = {}

  // Trạng thái bật/tắt từng chỉ tiêu trên biểu đồ
  const [visibleSeries, setVisibleSeries] = useState({
    totalOrders: true,
    wrongPlanDate: true,
    slippedPlan: true,
    matchedQuantity: true,
    matchedJob: true
  })

  const toggleSeries = (key) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // 1. Trích xuất danh sách ngày THỰC TẾ từ Master và Server (KHÔNG tự sinh ngày)
  const actualMasterDailyData = useMemo(() => {
    // Ưu tiên 1: Dữ liệu theo ngày thực tế từ Server API (dailyTrendData)
    if (Array.isArray(serverDailyData) && serverDailyData.length > 0) {
      return serverDailyData.map((d) => ({
        date: d.date || d.Date,
        totalOrders: Number(d.totalOrders ?? d.orderCount ?? d.totalTickets ?? 0),
        wrongPlanDate: Number(d.wrongPlanDate ?? d.sxSaiNgayCount ?? 0),
        slippedPlan: Number(d.slippedPlan ?? d.truotKhCount ?? 0),
        matchedQuantity: Number(d.matchedQuantity ?? d.khopSlCount ?? 0),
        matchedJob: Number(d.matchedJob ?? d.khopJobCount ?? 0),
        totalItems: Number(d.totalItems ?? 0)
      }))
    }

    // Ưu tiên 2: Dữ liệu timeline theo ngày của Master (picTimelineBreakdown?.dailyList)
    if (
      picTimelineBreakdown &&
      Array.isArray(picTimelineBreakdown.dailyList) &&
      picTimelineBreakdown.dailyList.length > 0
    ) {
      return picTimelineBreakdown.dailyList.map((d) => ({
        date: d.date,
        totalOrders: Number(d.totalOrders || 0),
        wrongPlanDate: Number(d.sxSaiNgay ?? d.wrongPlanDate ?? 0),
        slippedPlan: Number(d.truotKh ?? d.slippedPlan ?? 0),
        matchedQuantity: Number(d.khopSl ?? d.matchedQuantity ?? 0),
        matchedJob: Number(d.khopJob ?? d.matchedJob ?? 0),
        totalItems: Number(d.totalItems ?? 0)
      }))
    }

    // Ưu tiên 3: Nếu có planMetrics tổng hợp (ví dụ 1 kỳ báo cáo Master hiện hành)
    if (planMetrics && (planMetrics.totalOrders > 0 || planMetrics.totalTickets > 0)) {
      const singleDate = dateRange?.[0] || 'Kỳ Master'
      return [
        {
          date: singleDate,
          totalOrders: Number(planMetrics.totalOrders || planMetrics.totalTickets || 0),
          wrongPlanDate: Number(planMetrics.sxSaiNgayCount || 0),
          slippedPlan: Number(planMetrics.truotKhCount || 0),
          matchedQuantity: Number(planMetrics.khopSlCount || 0),
          matchedJob: Number(planMetrics.khopJobCount || 0),
          totalItems: Number(planMetrics.totalItems || 0)
        }
      ]
    }

    return []
  }, [serverDailyData, picTimelineBreakdown, planMetrics, dateRange])

  // 2. Tính toán các chỉ số tăng/giảm và chênh lệch điểm phần trăm so với ngày trước
  const chartProcessedData = useMemo(() => {
    const list = [...actualMasterDailyData].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    )

    return list.map((cur, index) => {
      const prev = index > 0 ? list[index - 1] : null
      const computed = calculateDayMetrics(cur, prev)
      const shortDate = formatToShortDate(cur.date)
      const displayDate = formatToVNDate(cur.date)

      return {
        ...computed,
        shortDate,
        displayDate
      }
    })
  }, [actualMasterDailyData])

  const displayedChartData = useMemo(() => {
    if (!Array.isArray(chartProcessedData) || chartProcessedData.length === 0) return []
    if (rangeFilter === '10') return chartProcessedData.slice(-10)
    if (rangeFilter === '30') return chartProcessedData.slice(-30)
    return chartProcessedData
  }, [chartProcessedData, rangeFilter])

  // 3. Tính KPI cả kỳ: BẮT BUỘC dùng tổng số lệnh chỉ tiêu / tổng LSX cả kỳ * 100%
  const periodKpi = useMemo(() => {
    if (planMetrics && (planMetrics.totalOrders > 0 || planMetrics.totalTickets > 0)) {
      const totalOrders = planMetrics.totalOrders || planMetrics.totalTickets || 0
      return {
        totalOrders,
        wrongPlanDate: planMetrics.sxSaiNgayCount || 0,
        slippedPlan: planMetrics.truotKhCount || 0,
        matchedQuantity: planMetrics.khopSlCount || 0,
        matchedJob: planMetrics.khopJobCount || 0,
        wrongPlanDateRate: planMetrics.sxSaiNgayRate || 0,
        slippedPlanRate: planMetrics.truotKhRate || 0,
        matchedQuantityRate: planMetrics.khopSlRate || 0,
        matchedJobRate: planMetrics.khopJobRate || 0,
        totalItems: planMetrics.totalItems || 0,
        totalDays: chartProcessedData.length || totalDays || 1
      }
    }
    const calc = calculatePeriodSummary(actualMasterDailyData)
    return {
      ...calc,
      totalItems: planMetrics.totalItems || 0
    }
  }, [planMetrics, actualMasterDailyData, chartProcessedData.length, totalDays])

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* 1. HEADER ĐỀ MỤC: TIÊU ĐỀ & THÔNG TIN CHỈ DẪN */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>1. NHỊP SẢN XUẤT &amp; CHẤT LƯỢNG KẾ HOẠCH</span>
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: '#475569',
              marginTop: 4,
              lineHeight: 1.5,
              maxWidth: 960
            }}
          >
            Thống kê nhịp sản xuất &amp; chất lượng thực thi kế hoạch theo ngày của{' '}
            <b>{plantName || 'Nhà máy GS1 Hà Nội'}</b> (chu kỳ{' '}
            <b>{totalDays || chartProcessedData.length} ngày</b>) trên hệ thống{' '}
            <b>MES Engine &amp; Bravo ERP</b>. Biểu đồ cột khối lượng số lượng từng hạng mục nối đỉnh
            liên tục qua các ngày và thanh trượt điều chỉnh khoảng thời gian lọc linh hoạt.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className={`uppercase text-[11px] font-semibold ${
              showTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu theo ngày"
          >
            <TableProperties size={13} className={showTable ? 'text-blue-600' : 'text-slate-500'} />
            <span>{showTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KHUNG BIỂU ĐỒ (VUÔNG VỨC borderRadius: 0, VIỀN PHẲNG GIỐNG Y HỆT BIỂU ĐỒ DƯỚI) */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 0,
          padding: '16px'
        }}
      >
        {/* Thanh chú giải văn bản phẳng & Bộ lọc xem 10 ngày / 30 ngày / Tất cả */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 14,
            userSelect: 'none'
          }}
        >
          {/* Danh sách Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px 20px'
            }}
          >
            {[
              { key: 'totalOrders', label: 'Tổng LSX', color: '#01411b' },
              { key: 'wrongPlanDate', label: 'SX sai ngày KH', color: '#ea580c' },
              { key: 'slippedPlan', label: 'Trượt KH', color: '#dc2626' },
              { key: 'matchedQuantity', label: 'Khớp số lượng', color: '#16a34a' },
              { key: 'matchedJob', label: 'Khớp job', color: '#8b5cf6' }
            ].map((item) => {
              const isVisible = visibleSeries[item.key] !== false
              return (
                <div
                  key={item.key}
                  onClick={() => toggleSeries(item.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: isVisible ? 700 : 500,
                    color: isVisible ? '#1e293b' : '#94a3b8',
                    textDecoration: isVisible ? 'none' : 'line-through',
                    opacity: isVisible ? 1 : 0.55,
                    transition: 'all 0.15s ease'
                  }}
                  title={`Bấm để ${isVisible ? 'ẩn' : 'hiện'} cột "${item.label}"`}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: isVisible ? item.color : '#cbd5e1',
                      borderRadius: 2,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>

          {/* Bộ lọc xem nhanh 10 ngày / 30 ngày / Tất cả */}
          {chartProcessedData.length > 5 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                background: '#f1f5f9',
                padding: '2px 4px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                fontSize: 11
              }}
            >
              {[
                { value: '10', label: '10 ngày' },
                { value: '30', label: '30 ngày' },
                { value: 'all', label: `Tất cả (${chartProcessedData.length}N)` }
              ].map((opt) => {
                const isActive = rangeFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRangeFilter(opt.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: isActive ? '#01411b' : 'transparent',
                      color: isActive ? '#ffffff' : '#475569',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Hiển thị ${opt.label}`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Thân biểu đồ ComposedChart */}
        <div style={{ width: '100%', height: 500 }}>
          {displayedChartData.length === 0 ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                borderRadius: 0,
                color: '#64748b',
                fontSize: 13
              }}
            >
              Không có dữ liệu theo ngày trong đợt Master này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={displayedChartData}
                margin={{ top: 25, right: 25, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                {/* Trục X: Lấy đúng theo các ngày thực tế của Master */}
                <XAxis
                  dataKey="shortDate"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  interval={0}
                  angle={displayedChartData.length > 15 ? -40 : 0}
                  textAnchor={displayedChartData.length > 15 ? 'end' : 'middle'}
                  dy={displayedChartData.length > 15 ? 4 : 6}
                />

                {/* Trục Y: Số lượng LSX, bắt đầu từ 0 */}
                <YAxis
                  orientation="left"
                  domain={[0, 'auto']}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => v.toLocaleString('vi-VN')}
                  label={{
                    value: 'Số lượng (lệnh / LSX)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11, fontWeight: 600 },
                    offset: 0
                  }}
                />

                {/* Tooltip không nội suy, hiển thị chính xác ngày */}
                <RechartsTooltip content={<ExecutiveRhythmTooltip visibleSeries={visibleSeries} />} />

                {/* 1. Tổng LSX: Cột xanh lá đậm GS Hub (#01411b) + Line nối đỉnh đúng vị trí cột */}
                {visibleSeries.totalOrders && (
                  <Bar
                    dataKey="totalOrders"
                    name="Tổng LSX"
                    fill="#01411b"
                    stroke="#01411b"
                    barSize={chartProcessedData.length > 20 ? 10 : 18}
                    isAnimationActive={false}
                    shape={(props) => (
                      <CustomBarWithPeak
                        {...props}
                        fill="#01411b"
                        stroke="#01411b"
                        seriesKey="totalOrders"
                        collectorRef={pointsCollector}
                      />
                    )}
                  />
                )}

                {/* 2. SX sai ngày KH: Cột cam (#ea580c) + Line cam nối đỉnh đúng vị trí cột */}
                {visibleSeries.wrongPlanDate && (
                  <Bar
                    dataKey="wrongPlanDate"
                    name="SX sai ngày KH"
                    fill="#ea580c"
                    stroke="#ea580c"
                    barSize={chartProcessedData.length > 20 ? 10 : 18}
                    isAnimationActive={false}
                    shape={(props) => (
                      <CustomBarWithPeak
                        {...props}
                        fill="#ea580c"
                        stroke="#ea580c"
                        seriesKey="wrongPlanDate"
                        collectorRef={pointsCollector}
                      />
                    )}
                  />
                )}

                {/* 3. Trượt KH: Cột đỏ (#dc2626) + Line đỏ nét đứt nối đỉnh đúng vị trí cột */}
                {visibleSeries.slippedPlan && (
                  <Bar
                    dataKey="slippedPlan"
                    name="Trượt KH"
                    fill="#dc2626"
                    stroke="#dc2626"
                    barSize={chartProcessedData.length > 20 ? 10 : 18}
                    isAnimationActive={false}
                    shape={(props) => (
                      <CustomBarWithPeak
                        {...props}
                        fill="#dc2626"
                        stroke="#dc2626"
                        dashArray="4 4"
                        seriesKey="slippedPlan"
                        collectorRef={pointsCollector}
                      />
                    )}
                  />
                )}

                {/* 4. Khớp số lượng: Cột xanh lá (#16a34a) + Line xanh lá nối đỉnh đúng vị trí cột */}
                {visibleSeries.matchedQuantity && (
                  <Bar
                    dataKey="matchedQuantity"
                    name="Khớp số lượng"
                    fill="#16a34a"
                    stroke="#16a34a"
                    barSize={chartProcessedData.length > 20 ? 10 : 18}
                    isAnimationActive={false}
                    shape={(props) => (
                      <CustomBarWithPeak
                        {...props}
                        fill="#16a34a"
                        stroke="#16a34a"
                        seriesKey="matchedQuantity"
                        collectorRef={pointsCollector}
                      />
                    )}
                  />
                )}

                {/* 5. Khớp job: Cột tím (#8b5cf6) + Line tím nối đỉnh đúng vị trí cột */}
                {visibleSeries.matchedJob && (
                  <Bar
                    dataKey="matchedJob"
                    name="Khớp job"
                    fill="#8b5cf6"
                    stroke="#8b5cf6"
                    barSize={chartProcessedData.length > 20 ? 10 : 18}
                    isAnimationActive={false}
                    shape={(props) => (
                      <CustomBarWithPeak
                        {...props}
                        fill="#8b5cf6"
                        stroke="#8b5cf6"
                        seriesKey="matchedJob"
                        collectorRef={pointsCollector}
                      />
                    )}
                  />
                )}


              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. BẢNG SỐ LIỆU CHI TIẾT THEO NGÀY (HIỂN THỊ PHẲNG BÊN DƯỚI BIỂU ĐỒ KHI BẤM MỞ) */}
      {showTable && chartProcessedData.length > 0 && (
        <div style={{ marginTop: 20, overflowX: 'auto' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 8
            }}
          >
            Bảng số liệu chi tiết theo từng ngày
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
              fontSize: 12,
              textAlign: 'left',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #0f172a', background: '#f8fafc' }}>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Ngày
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#01411b',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tổng LSX
                </th>

                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#ea580c',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  SX sai ngày KH
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#dc2626',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Trượt KH
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#16a34a',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Khớp số lượng
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#8b5cf6',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Khớp job
                </th>
              </tr>
            </thead>
            <tbody>
              {chartProcessedData.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 1 ? '#f8fafc' : '#ffffff'
                  }}
                >
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.displayDate || row.date}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#01411b'
                    }}
                  >
                    {row.totalOrders.toLocaleString('vi-VN')}
                  </td>

                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <b style={{ color: '#ea580c' }}>{row.wrongPlanDate.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#9a3412', marginLeft: 4 }}>
                      ({row.wrongPlanDateRate}%)
                    </span>
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: getMetricDeltaColor('wrongPlanDate', row.wrongPlanDateRateDiff)
                      }}
                    >
                      [{formatDisplayPoints(row.wrongPlanDateRateDiff)}]
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <b style={{ color: '#dc2626' }}>{row.slippedPlan.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#991b1b', marginLeft: 4 }}>
                      ({row.slippedPlanRate}%)
                    </span>
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: getMetricDeltaColor('slippedPlan', row.slippedPlanRateDiff)
                      }}
                    >
                      [{formatDisplayPoints(row.slippedPlanRateDiff)}]
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <b style={{ color: '#16a34a' }}>
                      {row.matchedQuantity.toLocaleString('vi-VN')}
                    </b>
                    <span style={{ fontSize: 11, color: '#166534', marginLeft: 4 }}>
                      ({row.matchedQuantityRate}%)
                    </span>
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: getMetricDeltaColor('matchedQuantity', row.matchedQuantityRateDiff)
                      }}
                    >
                      [{formatDisplayPoints(row.matchedQuantityRateDiff)}]
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <b style={{ color: '#8b5cf6' }}>{row.matchedJob.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#6d28d9', marginLeft: 4 }}>
                      ({row.matchedJobRate}%)
                    </span>
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: getMetricDeltaColor('matchedJob', row.matchedJobRateDiff)
                      }}
                    >
                      [{formatDisplayPoints(row.matchedJobRateDiff)}]
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PlanProductionRhythmChart
