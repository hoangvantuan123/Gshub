/* eslint-disable react/prop-types */
import { useState, useMemo, useRef, memo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts'

/**
 * Custom Executive Tooltip đồng bộ hoàn toàn với hệ thống báo cáo Gshub
 */
function DailyTicketGrowthTooltip({ active, payload, label, visibleSeries, periodType = 'daily' }) {
  if (!active || !payload || payload.length === 0) return null

  const row = payload[0]?.payload || {}
  const isFirst = row.isFirst
  const periodLabel =
    periodType === 'monthly' ? 'Tháng' : periodType === 'quarterly' ? 'Quý' : 'Ngày'

  const renderBadge = (growthVal, growthLabel, growthStatus) => {
    if (isFirst || growthLabel === '—' || growthVal === null) {
      if (growthStatus === 'new' || growthLabel === 'Phát sinh mới') {
        return (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              background: '#dbeafe',
              color: '#1e40af'
            }}
          >
            Phát sinh mới
          </span>
        )
      }
      return (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: 4,
            background: '#f1f5f9',
            color: '#64748b'
          }}
        >
          {isFirst ? 'Mốc đầu (—)' : '—'}
        </span>
      )
    }

    const isUp = growthVal > 0
    const isDown = growthVal < 0
    const bg = isUp ? '#ecfdf5' : isDown ? '#fef2f2' : '#f1f5f9'
    const color = isUp ? '#065f46' : isDown ? '#991b1b' : '#334155'

    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: 4,
          background: bg,
          color: color
        }}
      >
        {growthLabel}
      </span>
    )
  }

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
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Header Ngày / Tháng / Quý */}
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
          {periodLabel}: {row.displayDate || label}
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>MES Engine &amp; Bravo ERP</span>
      </div>

      {/* 4 Chỉ tiêu chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
        {/* 1. Tổng phiếu thống kê */}
        {(!visibleSeries || visibleSeries.totalTickets !== false) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  background: '#01411b',
                  border: '1px solid #01411b'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Tổng phiếu thống kê:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>
                {Number(row.totalTickets || 0).toLocaleString('vi-VN')}
              </span>
              {renderBadge(
                row.totalTicketsGrowth,
                row.totalTicketsGrowthLabel,
                row.totalTicketsGrowthStatus
              )}
            </div>
          </div>
        )}

        {/* 2. Phiếu > 12 giờ */}
        {(!visibleSeries || visibleSeries.over12hCount !== false) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#ea580c'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Phiếu &gt; 12 giờ:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {Number(row.over12hCount || 0).toLocaleString('vi-VN')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: '#fff7ed',
                  color: '#ea580c'
                }}
              >
                {row.over12hRate ?? 0}%
              </span>
            </div>
          </div>
        )}

        {/* 3. Phiếu < 5 phút */}
        {(!visibleSeries || visibleSeries.under5MinCount !== false) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#8b5cf6'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Phiếu &lt; 5 phút:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {Number(row.under5MinCount || 0).toLocaleString('vi-VN')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: '#f5f3ff',
                  color: '#8b5cf6'
                }}
              >
                {row.under5MinRate ?? 0}%
              </span>
            </div>
          </div>
        )}

        {/* 4. Sinh phiếu X/N tự động */}
        {(!visibleSeries || visibleSeries.autoExportedCount !== false) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  transform: 'rotate(45deg)',
                  background: '#10b981'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>Sinh phiếu X/N tự động:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {Number(row.autoExportedCount || 0).toLocaleString('vi-VN')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: '#ecfdf5',
                  color: '#065f46'
                }}
              >
                {row.autoExportRate ?? 0}%
              </span>
            </div>
          </div>
        )}

        {/* 5. X/N chưa sinh */}
        {(!visibleSeries || visibleSeries.notAutoExportedCount !== false) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: '#d97706'
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>X/N chưa sinh:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {Number(row.notAutoExportedCount || 0).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Thông tin bổ sung */}
      <div
        style={{
          borderTop: '1px dashed #cbd5e1',
          paddingTop: 8,
          fontSize: 11.5,
          color: '#475569',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>• Số phiếu MES / Tỷ lệ MES:</span>
          <b style={{ color: '#01411b' }}>
            {Number(row.mesCount || 0).toLocaleString('vi-VN')} ({row.mesRate ?? 100}%)
          </b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>• Số phiếu ngoài MES:</span>
          <b>{Number(row.nonMesCount || 0).toLocaleString('vi-VN')}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>• X/N chưa sinh tự động:</span>
          <b style={{ color: Number(row.notAutoExportedCount || 0) > 0 ? '#d97706' : '#64748b' }}>
            {Number(row.notAutoExportedCount || 0).toLocaleString('vi-VN')}
          </b>
        </div>
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
    isDiamond,
    seriesKey,
    collectorRef
  } = props

  if (x === undefined || y === undefined || width === undefined || height === undefined) return null

  const cx = x + width / 2
  const cy = y

  if (collectorRef && collectorRef.current) {
    if (index === 0 || !collectorRef.current[seriesKey]) {
      collectorRef.current[seriesKey] = []
    }
    collectorRef.current[seriesKey][index] = { cx, cy, value }
  }

  const prev = collectorRef?.current?.[seriesKey]?.[index - 1]
  const validVal = value !== null && value !== undefined && !isNaN(value)
  const displayVal = validVal && value > 0 ? Number(value).toLocaleString('vi-VN') : null

  return (
    <g className={`custom-bar-${seriesKey}-${index}`}>
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

      {/* 3. Điểm đánh dấu đỉnh (Circle hoặc Diamond) */}
      {isDiamond ? (
        <polygon
          points={`${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      ) : (
        <circle cx={cx} cy={cy} r={3.5} fill={fill} stroke="#ffffff" strokeWidth={1.5} />
      )}

      {/* 4. Nhãn số lượng thuần túy trên đỉnh cột (không kèm %) */}
      {displayVal && (
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize={10} fontWeight={700}>
          {displayVal}
        </text>
      )}
    </g>
  )
}

/**
 * Component chính: Biểu đồ kết hợp các cột số lượng và đường nối đỉnh qua các ngày
 * Kèm thanh trượt kéo lọc khoảng thời gian (Brush) ở dưới
 */
export function DailyTicketGrowthChartComponent({
  chartData = [],
  visibleSeries: externalVisibleSeries,
  onToggleSeries,
  height = 500,
  periodType = 'daily'
}) {
  const [rangeFilter, setRangeFilter] = useState('all')
  const [internalVisibleSeries, setInternalVisibleSeries] = useState({
    totalTickets: true,
    over12hCount: true,
    under5MinCount: true,
    autoExportedCount: true,
    notAutoExportedCount: true
  })

  const visibleSeries = externalVisibleSeries || internalVisibleSeries

  const toggleSeries = (key) => {
    if (onToggleSeries) {
      onToggleSeries(key)
    } else {
      setInternalVisibleSeries((prev) => ({
        ...prev,
        [key]: !prev[key]
      }))
    }
  }

  const displayedChartData = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) return []
    if (rangeFilter === '10') return chartData.slice(-10)
    if (rangeFilter === '30') return chartData.slice(-30)
    return chartData
  }, [chartData, rangeFilter])

  const pointsCollector = useRef({})

  const legendItems = [
    { key: 'totalTickets', label: 'Tổng phiếu thống kê', color: '#01411b' },
    { key: 'over12hCount', label: 'Phiếu > 12 giờ', color: '#ea580c' },
    { key: 'under5MinCount', label: 'Phiếu < 5 phút', color: '#8b5cf6' },
    { key: 'autoExportedCount', label: 'Sinh phiếu X/N tự động', color: '#10b981' },
    { key: 'notAutoExportedCount', label: 'X/N chưa sinh', color: '#d97706' }
  ]

  return (
    <div
      style={{
        width: '100%',
        height,
        border: '1px solid #e2e8f0',
        padding: '16px 20px 10px 16px',
        background: '#ffffff',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
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
          marginBottom: 12,
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
          {legendItems.map((item) => {
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
        {chartData.length > 5 && (
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
              {
                value: '10',
                label:
                  periodType === 'monthly'
                    ? '6 tháng'
                    : periodType === 'quarterly'
                      ? '4 quý'
                      : '10 ngày'
              },
              {
                value: '30',
                label:
                  periodType === 'monthly'
                    ? '12 tháng'
                    : periodType === 'quarterly'
                      ? '8 quý'
                      : '30 ngày'
              },
              {
                value: 'all',
                label: `Tất cả (${chartData.length}${periodType === 'monthly' ? 'T' : periodType === 'quarterly' ? 'Q' : 'N'})`
              }
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

      <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedChartData}
            margin={{ top: 25, right: 25, left: 10, bottom: 0 }}
          >
            {/* Lưới nền nhạt */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

            {/* Trục X: Ngày đăng ký */}
            <XAxis
              dataKey="shortDate"
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              interval={0}
              angle={displayedChartData.length > 15 ? -40 : 0}
              textAnchor={displayedChartData.length > 15 ? 'end' : 'middle'}
              dy={displayedChartData.length > 15 ? 4 : 6}
            />

            {/* Trục Y: Tổng số phiếu / Số lượng các chỉ tiêu, bắt đầu từ 0 */}
            <YAxis
              orientation="left"
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
              allowDecimals={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString('vi-VN')
              }
              label={{
                value: 'Số lượng (phiếu)',
                angle: -90,
                position: 'insideLeft',
                fill: '#475569',
                fontSize: 11,
                offset: 5
              }}
            />

            {/* Custom Tooltip */}
            <RechartsTooltip
              content={
                <DailyTicketGrowthTooltip visibleSeries={visibleSeries} periodType={periodType} />
              }
              cursor={{ fill: 'rgba(241, 245, 249, 0.45)' }}
            />

            {/* 1. Tổng phiếu thống kê: Cột xanh lá đậm GS Hub (#01411b) + Đường nối đỉnh đúng vị trí cột */}
            {visibleSeries?.totalTickets !== false && (
              <Bar
                dataKey="totalTickets"
                name="Tổng phiếu thống kê"
                fill="#01411b"
                stroke="#01411b"
                barSize={chartData.length > 20 ? 10 : 20}
                isAnimationActive={false}
                shape={(props) => (
                  <CustomBarWithPeak
                    {...props}
                    fill="#01411b"
                    stroke="#01411b"
                    seriesKey="totalTickets"
                    collectorRef={pointsCollector}
                  />
                )}
              />
            )}

            {/* 2. Phiếu > 12 giờ: Cột cam (#ea580c) + Đường nối đỉnh cam đúng vị trí cột */}
            {visibleSeries?.over12hCount !== false && visibleSeries?.over12hRate !== false && (
              <Bar
                dataKey="over12hCount"
                name="Phiếu > 12 giờ"
                fill="#ea580c"
                stroke="#ea580c"
                barSize={chartData.length > 20 ? 10 : 20}
                isAnimationActive={false}
                shape={(props) => (
                  <CustomBarWithPeak
                    {...props}
                    fill="#ea580c"
                    stroke="#ea580c"
                    seriesKey="over12hCount"
                    collectorRef={pointsCollector}
                  />
                )}
              />
            )}

            {/* 3. Phiếu < 5 phút: Cột tím (#8b5cf6) + Đường nối đỉnh tím nét đứt đúng vị trí cột */}
            {visibleSeries?.under5MinCount !== false && visibleSeries?.under5MinRate !== false && (
              <Bar
                dataKey="under5MinCount"
                name="Phiếu < 5 phút"
                fill="#8b5cf6"
                stroke="#8b5cf6"
                barSize={chartData.length > 20 ? 10 : 20}
                isAnimationActive={false}
                shape={(props) => (
                  <CustomBarWithPeak
                    {...props}
                    fill="#8b5cf6"
                    stroke="#8b5cf6"
                    dashArray="4 4"
                    seriesKey="under5MinCount"
                    collectorRef={pointsCollector}
                  />
                )}
              />
            )}

            {/* 4. Sinh phiếu X/N tự động: Cột xanh ngọc (#10b981) + Đường nối đỉnh xanh ngọc đúng vị trí cột */}
            {visibleSeries?.autoExportedCount !== false && (
              <Bar
                dataKey="autoExportedCount"
                name="Sinh phiếu X/N tự động"
                fill="#10b981"
                stroke="#10b981"
                barSize={chartData.length > 20 ? 10 : 20}
                isAnimationActive={false}
                shape={(props) => (
                  <CustomBarWithPeak
                    {...props}
                    fill="#10b981"
                    stroke="#10b981"
                    isDiamond={true}
                    seriesKey="autoExportedCount"
                    collectorRef={pointsCollector}
                  />
                )}
              />
            )}

            {/* 5. X/N chưa sinh: Cột màu hổ phách (#d97706) + Đường nối đỉnh đúng vị trí cột */}
            {visibleSeries?.notAutoExportedCount !== false && (
              <Bar
                dataKey="notAutoExportedCount"
                name="X/N chưa sinh"
                fill="#d97706"
                stroke="#d97706"
                barSize={chartData.length > 20 ? 10 : 20}
                isAnimationActive={false}
                shape={(props) => (
                  <CustomBarWithPeak
                    {...props}
                    fill="#d97706"
                    stroke="#d97706"
                    seriesKey="notAutoExportedCount"
                    collectorRef={pointsCollector}
                  />
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const DailyTicketGrowthChart = memo(DailyTicketGrowthChartComponent)
export default DailyTicketGrowthChart
