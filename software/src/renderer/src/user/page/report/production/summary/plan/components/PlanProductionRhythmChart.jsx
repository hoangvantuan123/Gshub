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
  Tooltip as RechartsTooltip
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
 * Vuông vức (borderRadius: 0), hiển thị đúng ngày thực tế không nội suy
 */
function ExecutiveRhythmTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]?.payload
  if (!item) return null

  const dateFormatted = item.displayDate || formatToVNDate(item.date || label)

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #0f172a',
        borderRadius: 0,
        padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        minWidth: 290,
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
          paddingBottom: 6,
          marginBottom: 8
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
              borderRadius: 0,
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
              fontSize: 10.5,
              fontWeight: 700,
              color: '#01411b'
            }}
          >
            Đợt Master
          </span>
        )}
      </div>

      {/* 1. Tổng số LSX và % tăng/giảm so với ngày trước */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 0,
          padding: '6px 10px',
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

      {/* 2. Bốn chỉ tiêu chất lượng (Đường) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '0.04em'
          }}
        >
          Tỷ lệ chất lượng (% trên tổng LSX):
        </div>

        {/* SX sai ngày KH */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                backgroundColor: '#ea580c',
                display: 'inline-block'
              }}
            />
            <span style={{ color: '#334155' }}>SX sai ngày KH:</span>
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

        {/* Trượt KH */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                backgroundColor: '#dc2626',
                display: 'inline-block'
              }}
            />
            <span style={{ color: '#334155' }}>Trượt KH:</span>
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

        {/* Khớp số lượng */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                backgroundColor: '#16a34a',
                display: 'inline-block'
              }}
            />
            <span style={{ color: '#334155' }}>Khớp số lượng:</span>
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

        {/* Khớp job */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                backgroundColor: '#8b5cf6',
                display: 'inline-block'
              }}
            />
            <span style={{ color: '#334155' }}>Khớp job:</span>
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
      </div>

   
    </div>
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
  const [showTable, setShowTable] = useState(false)

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
            Biểu đồ kết hợp cột (Tổng LSX theo mốc ngày Master) và 4 đường tỷ lệ chất lượng: Sai
            ngày KH, Trượt KH, Khớp số lượng, Khớp job tại {plantName || 'Nhà máy GS1 Hà Nội'}.
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
        {/* Chú giải tương tác (Legend) dạng nút bấm phẳng VUÔNG VỨC */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16
          }}
        >
          {/* Cột Tổng LSX */}
          <button
            onClick={() => toggleSeries('totalOrders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 0,
              border: `1px solid ${visibleSeries.totalOrders ? '#93c5fd' : '#cbd5e1'}`,
              background: visibleSeries.totalOrders ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: visibleSeries.totalOrders ? '#1e40af' : '#94a3b8',
              opacity: visibleSeries.totalOrders ? 1 : 0.6
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                backgroundColor: '#93c5fd',
                display: 'inline-block'
              }}
            />
            <span>Tổng LSX (Cột trục trái)</span>
          </button>

          {/* SX sai ngày KH */}
          <button
            onClick={() => toggleSeries('wrongPlanDate')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 0,
              border: `1px solid ${visibleSeries.wrongPlanDate ? '#fed7aa' : '#cbd5e1'}`,
              background: visibleSeries.wrongPlanDate ? '#fff7ed' : '#ffffff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: visibleSeries.wrongPlanDate ? '#ea580c' : '#94a3b8',
              opacity: visibleSeries.wrongPlanDate ? 1 : 0.6
            }}
          >
            <span
              style={{
                width: 12,
                height: 3,
                backgroundColor: '#ea580c',
                display: 'inline-block'
              }}
            />
            <span>SX sai ngày KH (%)</span>
          </button>

          {/* Trượt KH */}
          <button
            onClick={() => toggleSeries('slippedPlan')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 0,
              border: `1px solid ${visibleSeries.slippedPlan ? '#fecdd3' : '#cbd5e1'}`,
              background: visibleSeries.slippedPlan ? '#fef2f2' : '#ffffff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: visibleSeries.slippedPlan ? '#dc2626' : '#94a3b8',
              opacity: visibleSeries.slippedPlan ? 1 : 0.6
            }}
          >
            <span
              style={{
                width: 12,
                height: 2,
                borderTop: '2px dashed #dc2626',
                display: 'inline-block'
              }}
            />
            <span>Trượt KH (%)</span>
          </button>

          {/* Khớp số lượng */}
          <button
            onClick={() => toggleSeries('matchedQuantity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 0,
              border: `1px solid ${visibleSeries.matchedQuantity ? '#bbf7d0' : '#cbd5e1'}`,
              background: visibleSeries.matchedQuantity ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: visibleSeries.matchedQuantity ? '#16a34a' : '#94a3b8',
              opacity: visibleSeries.matchedQuantity ? 1 : 0.6
            }}
          >
            <span
              style={{
                width: 12,
                height: 3,
                backgroundColor: '#16a34a',
                display: 'inline-block'
              }}
            />
            <span>Khớp số lượng (%)</span>
          </button>

          {/* Khớp job */}
          <button
            onClick={() => toggleSeries('matchedJob')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 0,
              border: `1px solid ${visibleSeries.matchedJob ? '#ddd6fe' : '#cbd5e1'}`,
              background: visibleSeries.matchedJob ? '#f5f3ff' : '#ffffff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: visibleSeries.matchedJob ? '#8b5cf6' : '#94a3b8',
              opacity: visibleSeries.matchedJob ? 1 : 0.6
            }}
          >
            <span
              style={{
                width: 12,
                height: 3,
                backgroundColor: '#8b5cf6',
                display: 'inline-block'
              }}
            />
            <span>Khớp job (%)</span>
          </button>
        </div>

        {/* Thân biểu đồ ComposedChart */}
        <div style={{ width: '100%', height: 380 }}>
          {chartProcessedData.length === 0 ? (
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
                data={chartProcessedData}
                margin={{ top: 15, right: 35, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                {/* Trục X: Lấy đúng theo các ngày thực tế của Master */}
                <XAxis
                  dataKey="shortDate"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  interval={0}
                  angle={chartProcessedData.length > 15 ? -40 : 0}
                  textAnchor={chartProcessedData.length > 15 ? 'end' : 'middle'}
                  dy={chartProcessedData.length > 15 ? 4 : 8}
                />

                {/* Trục Y Trái: Số lệnh, bắt đầu từ 0 */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  domain={[0, 'auto']}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => v.toLocaleString('vi-VN')}
                  label={{
                    value: 'Số lệnh (LSX)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11, fontWeight: 600 },
                    offset: 0
                  }}
                />

                {/* Trục Y Phải: Tỷ lệ %, bắt đầu từ 0, cố định domain [0, 100] */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v) => `${v}%`}
                  label={{
                    value: 'Tỷ lệ (%)',
                    angle: 90,
                    position: 'insideRight',
                    style: { textAnchor: 'middle', fill: '#64748b', fontSize: 11, fontWeight: 600 },
                    offset: 0
                  }}
                />

                {/* Tooltip không nội suy, hiển thị chính xác ngày */}
                <RechartsTooltip content={<ExecutiveRhythmTooltip />} />

                {/* Cột Tổng LSX: Cột mảnh, vuông vức phẳng, màu xanh lam nhạt */}
                {visibleSeries.totalOrders && (
                  <Bar
                    yAxisId="left"
                    dataKey="totalOrders"
                    name="Tổng LSX"
                    fill="#93c5fd"
                    stroke="#60a5fa"
                    strokeWidth={1}
                    barSize={chartProcessedData.length <= 4 ? 28 : 14}
                    radius={[0, 0, 0, 0]}
                    isAnimationActive={true}
                  />
                )}

                {/* Đường 1: SX sai ngày KH (Màu cam, linear, độ dày 2.5px, dot nhỏ) */}
                {visibleSeries.wrongPlanDate && (
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="wrongPlanDateRate"
                    name="SX sai ngày KH (%)"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                )}

                {/* Đường 2: Trượt KH (Màu đỏ, nét đứt, linear) */}
                {visibleSeries.slippedPlan && (
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="slippedPlanRate"
                    name="Trượt KH (%)"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#dc2626', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                )}

                {/* Đường 3: Khớp số lượng (Màu xanh lá, linear) */}
                {visibleSeries.matchedQuantity && (
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="matchedQuantityRate"
                    name="Khớp số lượng (%)"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#16a34a', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                )}

                {/* Đường 4: Khớp job (Màu tím, linear) */}
                {visibleSeries.matchedJob && (
                  <Line
                    yAxisId="right"
                    type="linear"
                    dataKey="matchedJobRate"
                    name="Khớp job (%)"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                    isAnimationActive={false}
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
