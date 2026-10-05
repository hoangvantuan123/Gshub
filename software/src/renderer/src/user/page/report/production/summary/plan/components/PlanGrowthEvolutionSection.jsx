/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useMemo } from 'react'
import {
  TrendingUp,
  BarChart3,
  Layers,
  TableProperties,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import { Button } from '@renderer/components/ui/button'

// Format hiển thị ngày chuẩn Việt Nam (DD/MM hoặc DD/MM/YYYY)
function formatShortDate(dateStr) {
  if (!dateStr || dateStr === 'Khác') return 'Khác'
  const parts = String(dateStr).slice(0, 10).split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

function formatFullDate(dateStr) {
  if (!dateStr || dateStr === 'Khác') return 'Khác'
  const parts = String(dateStr).slice(0, 10).split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

// Custom Tooltip Cao cấp chuẩn Executive Dashboard
function GrowthChartTooltip({ active, payload, label, mode }) {
  if (!active || !payload || payload.length === 0) return null

  const rowData = payload[0]?.payload || {}
  const dateStr = formatFullDate(rowData.date || label)

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '12px 16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        minWidth: 260,
        fontSize: 12,
        color: '#0f172a'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 8,
          marginBottom: 10
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>📅 Ngày: {dateStr}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 9999,
            background: '#ecfdf5',
            color: '#065f46'
          }}
        >
          {mode === 'rate' ? 'Tỷ lệ %' : mode === 'cumulative' ? 'Tích lũy' : 'Số lượng'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payload.map((entry, idx) => {
          const color = entry.color || entry.stroke || '#0f172a'
          let valText = ''
          if (mode === 'rate') {
            valText = `${Number(entry.value || 0).toFixed(1)}%`
          } else {
            valText = `${Number(entry.value || 0).toLocaleString('vi-VN')} ${entry.dataKey === 'totalItems' || entry.dataKey === 'cumItems' ? 'SP' : 'lệnh'}`
          }

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'inline-block'
                  }}
                />
                <span style={{ color: '#475569', fontWeight: 600 }}>{entry.name}:</span>
              </div>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{valText}</span>
            </div>
          )
        })}
      </div>

      {/* Tóm tắt độ khớp tổng */}
      {rowData.totalOrders > 0 && mode !== 'rate' && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px dashed #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#64748b'
          }}
        >
          <span>Khớp SL + Job:</span>
          <b style={{ color: '#059669' }}>
            {((rowData.khopSlCount || 0) + (rowData.khopJobCount || 0)).toLocaleString('vi-VN')}{' '}
            lệnh (
            {Number(
              (
                (((rowData.khopSlCount || 0) + (rowData.khopJobCount || 0)) /
                  (rowData.totalOrders || 1)) *
                100
              ).toFixed(1)
            )}
            %)
          </b>
        </div>
      )}
    </div>
  )
}

/**
 * PlanGrowthEvolutionSection: Hạng mục đầu tiên - Biểu đồ tăng trưởng các chỉ số KHSX chủ chốt
 * Đọc dữ liệu trực tiếp từ API: http://localhost:9643/api/v2/report/production/summary/plan
 */
export function PlanGrowthEvolutionSection({
  dailyTrendData = [],
  planMetrics = {},
  totalDays = 1,
  plantName = ''
}) {
  const [viewMode, setViewMode] = useState('count') // 'count' | 'rate' | 'cumulative'
  const [showTable, setShowTable] = useState(false)

  // Bộ lọc ẩn/hiện từng thông số (6 metrics cốt lõi)
  const [visibleMetrics, setVisibleMetrics] = useState({
    totalOrders: true,
    totalItems: true,
    sxSaiNgay: true,
    truotKh: true,
    khopSl: true,
    khopJob: true
  })

  const toggleMetric = (key) => {
    setVisibleMetrics((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Định nghĩa màu sắc và thuộc tính 6 chỉ số cốt lõi
  const metricConfigs = useMemo(
    () => ({
      totalOrders: {
        key: 'totalOrders',
        label: 'Lệnh thao tác (LSX)',
        shortLabel: 'LSX',
        unit: 'lệnh',
        color: '#01411b',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        currentValue: (planMetrics.totalOrders || planMetrics.totalTickets || 0).toLocaleString(
          'vi-VN'
        ),
        currentRate: null,
        description: 'Tổng khối lượng lệnh điều phối sản xuất'
      },
      totalItems: {
        key: 'totalItems',
        label: 'Mặt hàng điều phối (SP)',
        shortLabel: 'Mặt hàng',
        unit: 'SP',
        color: '#2563eb',
        bgColor: '#eff6ff',
        borderColor: '#bfdbfe',
        currentValue: (planMetrics.totalItems || 0).toLocaleString('vi-VN'),
        currentRate: null,
        description: 'Số mã sản phẩm/SKU điều phối trong kỳ'
      },
      sxSaiNgay: {
        key: 'sxSaiNgay',
        label: 'SX sai ngày KH',
        shortLabel: 'Sai ngày',
        unit: 'lệnh',
        color: '#ea580c',
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
        currentValue: (planMetrics.sxSaiNgayCount || 0).toLocaleString('vi-VN'),
        currentRate: planMetrics.sxSaiNgayRate || 0,
        description: 'Lệnh chạy thực tế lệch so với ngày kế hoạch'
      },
      truotKh: {
        key: 'truotKh',
        label: 'Trượt KH',
        shortLabel: 'Trượt KH',
        unit: 'lệnh',
        color: '#dc2626',
        bgColor: '#fef2f2',
        borderColor: '#fecdd3',
        currentValue: (planMetrics.truotKhCount || 0).toLocaleString('vi-VN'),
        currentRate: planMetrics.truotKhRate || 0,
        description: 'Lệnh không hoàn thành theo tiến độ đã giao'
      },
      khopSl: {
        key: 'khopSl',
        label: 'Khớp số lượng',
        shortLabel: 'Khớp SL',
        unit: 'lệnh',
        color: '#059669',
        bgColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        currentValue: (planMetrics.khopSlCount || 0).toLocaleString('vi-VN'),
        currentRate: planMetrics.khopSlRate || 0,
        description: 'Lệnh đạt chuẩn sản lượng giao'
      },
      khopJob: {
        key: 'khopJob',
        label: 'Khớp job',
        shortLabel: 'Khớp job',
        unit: 'lệnh',
        color: '#0d9488',
        bgColor: '#f0fdfa',
        borderColor: '#99f6e4',
        currentValue: (planMetrics.khopJobCount || 0).toLocaleString('vi-VN'),
        currentRate: planMetrics.khopJobRate || 0,
        description: 'Lệnh khớp đúng quy cách kỹ thuật và công đoạn'
      }
    }),
    [planMetrics]
  )

  // Chuẩn hóa dữ liệu biểu đồ từ dailyTrendData
  const chartData = useMemo(() => {
    let source = Array.isArray(dailyTrendData) ? [...dailyTrendData] : []

    // Nếu API chỉ trả về tổng hợp và mảng daily rỗng, tự động tạo 1 điểm thời gian hiện tại
    if (source.length === 0) {
      source = [
        {
          date: 'Kỳ báo cáo',
          orderCount: planMetrics.totalOrders || planMetrics.totalTickets || 0,
          totalOrders: planMetrics.totalOrders || planMetrics.totalTickets || 0,
          totalItems: planMetrics.totalItems || 0,
          sxSaiNgayCount: planMetrics.sxSaiNgayCount || 0,
          sxSaiNgayRate: planMetrics.sxSaiNgayRate || 0,
          truotKhCount: planMetrics.truotKhCount || 0,
          truotKhRate: planMetrics.truotKhRate || 0,
          khopSlCount: planMetrics.khopSlCount || 0,
          khopSlRate: planMetrics.khopSlRate || 0,
          khopJobCount: planMetrics.khopJobCount || 0,
          khopJobRate: planMetrics.khopJobRate || 0,
          passRate: planMetrics.avgPassRate || 100
        }
      ]
    }

    // Sắp xếp theo ngày tăng dần
    source.sort((a, b) => String(a.date).localeCompare(String(b.date)))

    let cumOrders = 0
    let cumItems = 0
    let cumSxSaiNgay = 0
    let cumTruotKh = 0
    let cumKhopSl = 0
    let cumKhopJob = 0

    return source.map((d, index) => {
      const orders = Number(d.totalOrders || d.orderCount || 0)
      const items = Number(d.totalItems || 0)
      const sxSaiNgay = Number(d.sxSaiNgayCount || 0)
      const truotKh = Number(d.truotKhCount || 0)
      const khopSl = Number(d.khopSlCount || 0)
      const khopJob = Number(d.khopJobCount || 0)

      cumOrders += orders
      cumItems += items
      cumSxSaiNgay += sxSaiNgay
      cumTruotKh += truotKh
      cumKhopSl += khopSl
      cumKhopJob += khopJob

      // Tỷ lệ %
      const sxSaiNgayRate =
        d.sxSaiNgayRate !== undefined && d.sxSaiNgayRate !== null
          ? Number(d.sxSaiNgayRate)
          : orders > 0
            ? Number(((sxSaiNgay / orders) * 100).toFixed(1))
            : 0

      const truotKhRate =
        d.truotKhRate !== undefined && d.truotKhRate !== null
          ? Number(d.truotKhRate)
          : orders > 0
            ? Number(((truotKh / orders) * 100).toFixed(1))
            : 0

      const khopSlRate =
        d.khopSlRate !== undefined && d.khopSlRate !== null
          ? Number(d.khopSlRate)
          : orders > 0
            ? Number(((khopSl / orders) * 100).toFixed(1))
            : 0

      const khopJobRate =
        d.khopJobRate !== undefined && d.khopJobRate !== null
          ? Number(d.khopJobRate)
          : orders > 0
            ? Number(((khopJob / orders) * 100).toFixed(1))
            : 0

      const passBenchmarkRate = Number((khopSlRate + khopJobRate).toFixed(1))

      return {
        date: d.date,
        shortDate: formatShortDate(d.date),
        fullDate: formatFullDate(d.date),
        // Số lượng tuyệt đối
        totalOrders: orders,
        totalItems: items,
        sxSaiNgayCount: sxSaiNgay,
        truotKhCount: truotKh,
        khopSlCount: khopSl,
        khopJobCount: khopJob,
        // Tỷ lệ %
        sxSaiNgayRate,
        truotKhRate,
        khopSlRate,
        khopJobRate,
        passBenchmarkRate,
        passRate: Number(d.passRate || 0),
        // Tích lũy
        cumOrders,
        cumItems,
        cumSxSaiNgay,
        cumTruotKh,
        cumKhopSl,
        cumKhopJob,
        // Tỷ lệ tăng trưởng so với ngày trước (nếu có)
        growthOrders:
          index > 0 && source[index - 1].orderCount > 0
            ? Number(
                (
                  ((orders - (source[index - 1].orderCount || 0)) /
                    (source[index - 1].orderCount || 1)) *
                  100
                ).toFixed(1)
              )
            : 0
      }
    })
  }, [dailyTrendData, planMetrics])

  // Thống kê tăng trưởng tổng quát
  const growthSummary = useMemo(() => {
    if (chartData.length < 2) return null
    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    const orderDiff = last.totalOrders - first.totalOrders
    const orderGrowthPct =
      first.totalOrders > 0 ? Number(((orderDiff / first.totalOrders) * 100).toFixed(1)) : 0

    return {
      orderDiff,
      orderGrowthPct,
      firstDate: first.shortDate,
      lastDate: last.shortDate
    }
  }, [chartData])

  return (
    <div
      style={{
        marginBottom: 36,
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '22px 24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* 1. Header & Điều khiển Chế độ Biểu đồ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 18,
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 16
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#01411b',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 900
              }}
            >
              1
            </span>
            <span>BIỂU ĐỒ TĂNG TRƯỞNG & XU HƯỚNG CÁC CHỈ SỐ KHSX CHỦ CHỐT</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#047857',
                background: '#ecfdf5',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #a7f3d0'
              }}
            >
              API: /api/v2/report/production/summary/plan
            </span>
          </div>

          <div
            style={{
              fontSize: 12.5,
              color: '#64748b',
              marginTop: 6,
              lineHeight: 1.5,
              maxWidth: 960
            }}
          >
            Theo dõi tiến trình tăng trưởng và sự biến thiên của 6 thông số cốt lõi:{' '}
            <b style={{ color: '#01411b' }}>Lệnh thao tác (LSX)</b>,{' '}
            <b style={{ color: '#2563eb' }}>Mặt hàng điều phối (SP)</b>,{' '}
            <b style={{ color: '#ea580c' }}>SX sai ngày KH</b>,{' '}
            <b style={{ color: '#dc2626' }}>Trượt KH</b>,{' '}
            <b style={{ color: '#059669' }}>Khớp số lượng</b> và{' '}
            <b style={{ color: '#0d9488' }}>Khớp job</b> qua từng mốc ngày.
          </div>
        </div>

        {/* Nút chuyển đổi View Mode & Bảng */}
        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
        >
          {/* Pills chuyển đổi chế độ */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: 6,
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              onClick={() => setViewMode('count')}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: viewMode === 'count' ? '#ffffff' : 'transparent',
                color: viewMode === 'count' ? '#01411b' : '#64748b',
                boxShadow: viewMode === 'count' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📊 Số lượng (Lệnh & SP)
            </button>
            <button
              onClick={() => setViewMode('rate')}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: viewMode === 'rate' ? '#ffffff' : 'transparent',
                color: viewMode === 'rate' ? '#01411b' : '#64748b',
                boxShadow: viewMode === 'rate' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📈 Tỷ lệ chất lượng (% KH)
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: viewMode === 'cumulative' ? '#ffffff' : 'transparent',
                color: viewMode === 'cumulative' ? '#01411b' : '#64748b',
                boxShadow: viewMode === 'cumulative' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🚀 Tăng trưởng tích lũy
            </button>
          </div>

          {/* Nút Xem bảng số liệu chi tiết */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#334155',
              borderColor: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <TableProperties size={14} />
            <span>{showTable ? 'Đóng bảng' : 'Bảng số liệu'}</span>
            {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </div>

      {/* 2. Interactive KPI Badges / Bộ chọn hiển thị thông số */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10,
          marginBottom: 20
        }}
      >
        {Object.values(metricConfigs).map((cfg) => {
          const isVisible = visibleMetrics[cfg.key]
          return (
            <div
              key={cfg.key}
              onClick={() => toggleMetric(cfg.key)}
              title={`Nhấp để ${isVisible ? 'ẩn' : 'hiện'} đường biểu đồ: ${cfg.label}`}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                border: `1.5px solid ${isVisible ? cfg.color : '#e2e8f0'}`,
                background: isVisible ? cfg.bgColor : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: isVisible ? 1 : 0.55,
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: cfg.color
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: isVisible ? cfg.color : '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    {cfg.shortLabel}
                  </span>
                </div>
                {isVisible ? (
                  <Eye size={13} style={{ color: cfg.color }} />
                ) : (
                  <EyeOff size={13} style={{ color: '#94a3b8' }} />
                )}
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: isVisible ? cfg.color : '#64748b',
                  lineHeight: 1.15
                }}
              >
                {cfg.currentValue} <span style={{ fontSize: 11, fontWeight: 600 }}>{cfg.unit}</span>
              </div>

              {cfg.currentRate !== null && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: cfg.color,
                    marginTop: 2
                  }}
                >
                  Tỷ lệ: {cfg.currentRate}%
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 3. Khối Biểu đồ chính Recharts */}
      <div style={{ width: '100%', height: 350, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="grad-orders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#01411b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#01411b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-items" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-sxSaiNgay" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-truotKh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-khopSl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-khopJob" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="shortDate"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 11.5, fill: '#475569', fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(v) =>
                viewMode === 'rate'
                  ? `${v}%`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(1)}k`
                    : v.toLocaleString('vi-VN')
              }
              domain={viewMode === 'rate' ? [0, 100] : ['auto', 'auto']}
            />

            <RechartsTooltip content={<GrowthChartTooltip mode={viewMode} />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 11.5, fontWeight: 700, paddingBottom: 12 }}
            />

            {/* CHẾ ĐỘ 1: SỐ LƯỢNG TUYỆT ĐỐI (COUNT) */}
            {viewMode === 'count' && (
              <>
                {visibleMetrics.totalOrders && (
                  <Area
                    type="monotone"
                    dataKey="totalOrders"
                    name="Lệnh thao tác (LSX)"
                    stroke="#01411b"
                    strokeWidth={2.8}
                    fillOpacity={1}
                    fill="url(#grad-orders)"
                    dot={{ r: 4, fill: '#01411b', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {visibleMetrics.totalItems && (
                  <Line
                    type="monotone"
                    dataKey="totalItems"
                    name="Mặt hàng điều phối (SP)"
                    stroke="#2563eb"
                    strokeWidth={2.4}
                    dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.sxSaiNgay && (
                  <Line
                    type="monotone"
                    dataKey="sxSaiNgayCount"
                    name="SX sai ngày KH"
                    stroke="#ea580c"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#ea580c' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.truotKh && (
                  <Line
                    type="monotone"
                    dataKey="truotKhCount"
                    name="Trượt KH"
                    stroke="#dc2626"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#dc2626' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.khopSl && (
                  <Line
                    type="monotone"
                    dataKey="khopSlCount"
                    name="Khớp số lượng"
                    stroke="#059669"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#059669' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.khopJob && (
                  <Line
                    type="monotone"
                    dataKey="khopJobCount"
                    name="Khớp job"
                    stroke="#0d9488"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#0d9488' }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </>
            )}

            {/* CHẾ ĐỘ 2: TỶ LỆ CHẤT LƯỢNG (% KH) */}
            {viewMode === 'rate' && (
              <>
                {visibleMetrics.sxSaiNgay && (
                  <Line
                    type="monotone"
                    dataKey="sxSaiNgayRate"
                    name="% SX sai ngày KH"
                    stroke="#ea580c"
                    strokeWidth={2.6}
                    dot={{ r: 4, fill: '#ea580c' }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {visibleMetrics.truotKh && (
                  <Line
                    type="monotone"
                    dataKey="truotKhRate"
                    name="% Trượt KH"
                    stroke="#dc2626"
                    strokeWidth={2.6}
                    dot={{ r: 4, fill: '#dc2626' }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {visibleMetrics.khopSl && (
                  <Line
                    type="monotone"
                    dataKey="khopSlRate"
                    name="% Khớp số lượng"
                    stroke="#059669"
                    strokeWidth={2.6}
                    dot={{ r: 4, fill: '#059669' }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {visibleMetrics.khopJob && (
                  <Line
                    type="monotone"
                    dataKey="khopJobRate"
                    name="% Khớp job"
                    stroke="#0d9488"
                    strokeWidth={2.6}
                    dot={{ r: 4, fill: '#0d9488' }}
                    activeDot={{ r: 6 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="passBenchmarkRate"
                  name="% Tổng khớp (SL + Job)"
                  stroke="#01411b"
                  strokeWidth={2.8}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: '#01411b' }}
                  activeDot={{ r: 6 }}
                />
              </>
            )}

            {/* CHẾ ĐỘ 3: TĂNG TRƯỞNG TÍCH LŨY (CUMULATIVE) */}
            {viewMode === 'cumulative' && (
              <>
                {visibleMetrics.totalOrders && (
                  <Area
                    type="monotone"
                    dataKey="cumOrders"
                    name="Tích lũy Lệnh (LSX)"
                    stroke="#01411b"
                    strokeWidth={2.8}
                    fillOpacity={1}
                    fill="url(#grad-orders)"
                    dot={{ r: 4, fill: '#01411b' }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {visibleMetrics.totalItems && (
                  <Line
                    type="monotone"
                    dataKey="cumItems"
                    name="Tích lũy Mặt hàng (SP)"
                    stroke="#2563eb"
                    strokeWidth={2.4}
                    dot={{ r: 3.5, fill: '#2563eb' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.khopSl && (
                  <Line
                    type="monotone"
                    dataKey="cumKhopSl"
                    name="Tích lũy Khớp SL"
                    stroke="#059669"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#059669' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.sxSaiNgay && (
                  <Line
                    type="monotone"
                    dataKey="cumSxSaiNgay"
                    name="Tích lũy Sai ngày"
                    stroke="#ea580c"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#ea580c' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.truotKh && (
                  <Line
                    type="monotone"
                    dataKey="cumTruotKh"
                    name="Tích lũy Trượt KH"
                    stroke="#dc2626"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#dc2626' }}
                    activeDot={{ r: 5 }}
                  />
                )}
                {visibleMetrics.khopJob && (
                  <Line
                    type="monotone"
                    dataKey="cumKhopJob"
                    name="Tích lũy Khớp job"
                    stroke="#0d9488"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#0d9488' }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Bảng Số liệu Chi tiết theo từng mốc ngày (Collapsible) */}
      {showTable && (
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid #e2e8f0',
            overflowX: 'auto'
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>BẢNG CHI TIẾT SỐ LIỆU TĂNG TRƯỞNG THEO NGÀY</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
              Tổng cộng {chartData.length} mốc ngày ghi nhận
            </span>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              textAlign: 'left'
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0f172a' }}>Ngày</th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#01411b',
                    textAlign: 'right'
                  }}
                >
                  Lệnh thao tác (LSX)
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#2563eb',
                    textAlign: 'right'
                  }}
                >
                  Mặt hàng (SP)
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#ea580c',
                    textAlign: 'right'
                  }}
                >
                  SX sai ngày KH
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#dc2626',
                    textAlign: 'right'
                  }}
                >
                  Trượt KH
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#059669',
                    textAlign: 'right'
                  }}
                >
                  Khớp số lượng
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#0d9488',
                    textAlign: 'right'
                  }}
                >
                  Khớp job
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    fontWeight: 800,
                    color: '#01411b',
                    textAlign: 'right'
                  }}
                >
                  Độ khớp tổng
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 1 ? '#fafafa' : '#ffffff'
                  }}
                >
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                    {row.fullDate}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#01411b'
                    }}
                  >
                    {row.totalOrders.toLocaleString('vi-VN')}
                    {row.growthOrders !== 0 && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          color: row.growthOrders > 0 ? '#166534' : '#b91c1c'
                        }}
                      >
                        {row.growthOrders > 0 ? `+${row.growthOrders}%` : `${row.growthOrders}%`}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#2563eb'
                    }}
                  >
                    {row.totalItems.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <b style={{ color: '#ea580c' }}>{row.sxSaiNgayCount.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#9a3412', marginLeft: 4 }}>
                      ({row.sxSaiNgayRate}%)
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <b style={{ color: '#dc2626' }}>{row.truotKhCount.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#991b1b', marginLeft: 4 }}>
                      ({row.truotKhRate}%)
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <b style={{ color: '#059669' }}>{row.khopSlCount.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#065f46', marginLeft: 4 }}>
                      ({row.khopSlRate}%)
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <b style={{ color: '#0d9488' }}>{row.khopJobCount.toLocaleString('vi-VN')}</b>
                    <span style={{ fontSize: 11, color: '#115e59', marginLeft: 4 }}>
                      ({row.khopJobRate}%)
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#01411b'
                    }}
                  >
                    {row.passBenchmarkRate}%
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

export default PlanGrowthEvolutionSection
