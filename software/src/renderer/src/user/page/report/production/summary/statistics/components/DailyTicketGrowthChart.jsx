/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  LabelList
} from 'recharts'

/**
 * Custom SVG Diamond Dot cho chuỗi "Sinh phiếu X/N tự động"
 */
const renderDiamondDot = (props) => {
  const { cx, cy, stroke, payload, dataKey } = props
  const val = payload?.[dataKey]
  if (val === null || val === undefined || isNaN(cx) || isNaN(cy)) return null
  const size = 4
  const points = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`
  return (
    <polygon
      points={points}
      fill={stroke || '#10b981'}
      stroke="#ffffff"
      strokeWidth={1.5}
      key={`diamond-dot-${cx}-${cy}`}
    />
  )
}

const renderActiveDiamondDot = (props) => {
  const { cx, cy, stroke } = props
  if (isNaN(cx) || isNaN(cy)) return null
  const size = 6
  const points = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`
  return (
    <polygon
      points={points}
      fill={stroke || '#10b981'}
      stroke="#ffffff"
      strokeWidth={2}
      key={`active-diamond-${cx}-${cy}`}
    />
  )
}

/**
 * Custom Executive Tooltip đồng bộ hoàn toàn với hệ thống báo cáo Gshub
 */
function DailyTicketGrowthTooltip({ active, payload, label, visibleSeries }) {
  if (!active || !payload || payload.length === 0) return null

  const row = payload[0]?.payload || {}
  const isFirst = row.isFirst

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
      {/* Header Ngày */}
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
          📅 Ngày: {row.displayDate || label}
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>MES Engine &amp; Bravo ERP</span>
      </div>

      {/* 4 Chỉ tiêu chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
        {/* 1. Tổng phiếu thống kê */}
        {(!visibleSeries || visibleSeries.totalTickets) && (
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
                  background: '#93c5fd',
                  border: '1px solid #60a5fa'
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
        {(!visibleSeries || visibleSeries.over12hRate || visibleSeries.over12hGrowth) && (
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
        {(!visibleSeries || visibleSeries.under5MinRate || visibleSeries.under5MinGrowth) && (
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
        {(!visibleSeries || visibleSeries.autoExportRate || visibleSeries.autoExportGrowth) && (
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
 * Component chính: Biểu đồ ComposedChart chuẩn 1 Bar + 3 Line + 2 YAxis
 */
export function DailyTicketGrowthChart({
  chartData = [],
  visibleSeries = {
    totalTickets: true,
    over12hRate: true,
    under5MinRate: true,
    autoExportRate: true
  },
  onLegendClick,
  height = 380
}) {
  // Tính toán miền giá trị YAxis trục phải (Tỷ lệ %)
  const rightYDomain = useMemo(() => {
    let maxRate = 20

    chartData.forEach((d) => {
      if (typeof d.over12hRate === 'number') {
        maxRate = Math.max(maxRate, d.over12hRate)
      }
      if (typeof d.under5MinRate === 'number') {
        maxRate = Math.max(maxRate, d.under5MinRate)
      }
      if (typeof d.autoExportRate === 'number') {
        maxRate = Math.max(maxRate, d.autoExportRate)
      }
    })

    const padMax = Math.min(100, Math.ceil((maxRate + 5) / 10) * 10)
    return [0, Math.max(padMax, 30)]
  }, [chartData])

  return (
    <div
      style={{
        width: '100%',
        height,
        border: '1px solid #e2e8f0',
        padding: '16px 24px 16px 10px',
        background: '#ffffff',
        boxSizing: 'border-box'
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 15, right: 35, left: 10, bottom: 20 }}>
          {/* Lưới nền nhạt */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

          {/* Trục X: Ngày đăng ký */}
          <XAxis
            dataKey="shortDate"
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            interval={0}
            angle={chartData.length > 15 ? -40 : 0}
            textAnchor={chartData.length > 15 ? 'end' : 'middle'}
            dy={chartData.length > 15 ? 4 : 8}
          />

          {/* Trục Y Trái: Tổng số phiếu trong ngày, bắt đầu từ 0 */}
          <YAxis
            yAxisId="left"
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
              value: 'Tổng số phiếu (phiếu)',
              angle: -90,
              position: 'insideLeft',
              fill: '#475569',
              fontSize: 11,
              offset: 5
            }}
          />

          {/* Trục Y Phải: Tỷ lệ % từng chỉ tiêu trong ngày */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={rightYDomain}
            tick={{ fontSize: 11, fill: '#16a34a' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'Tỷ lệ chỉ tiêu (%)',
              angle: 90,
              position: 'insideRight',
              fill: '#16a34a',
              fontSize: 11,
              offset: 5
            }}
          />

          {/* Đường tham chiếu 0% nét đứt mảnh */}
          <ReferenceLine
            yAxisId="right"
            y={0}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeWidth={1}
          />

          {/* Custom Tooltip */}
          <RechartsTooltip
            content={<DailyTicketGrowthTooltip visibleSeries={visibleSeries} />}
            cursor={{ fill: 'rgba(241, 245, 249, 0.45)' }}
          />

          {/* Chú giải tương tác chuẩn Recharts Legend */}
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 12, paddingBottom: 10, cursor: 'pointer' }}
            onClick={onLegendClick}
          />

          {/* 1. Bar: Tổng phiếu thống kê (cột xanh lam nhạt, hình chữ nhật vuông góc, không bo góc) */}
          <Bar
            yAxisId="left"
            dataKey="totalTickets"
            name="Tổng phiếu thống kê"
            fill="#93c5fd"
            radius={[0, 0, 0, 0]}
            barSize={chartData.length > 20 ? 12 : 24}
            hide={!visibleSeries?.totalTickets}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="totalTicketsGrowthLabel"
              position="top"
              formatter={(v) => (v !== undefined && v !== null && v !== '—' ? v : '')}
              style={{ fill: '#1e40af', fontSize: 10, fontWeight: 700 }}
            />
          </Bar>

          {/* 2. Line: Phiếu > 12 giờ (đường cam, điểm tròn) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="over12hRate"
            name="Tỷ lệ >12 giờ"
            stroke="#ea580c"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
            connectNulls={true}
            hide={
              visibleSeries &&
              visibleSeries.over12hRate === false &&
              visibleSeries.over12hGrowth === false
            }
            isAnimationActive={false}
          />

          {/* 3. Line: Phiếu < 5 phút (đường tím nét đứt, điểm tròn) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="under5MinRate"
            name="Tỷ lệ <5 phút"
            stroke="#8b5cf6"
            strokeDasharray="4 4"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
            connectNulls={true}
            hide={
              visibleSeries &&
              visibleSeries.under5MinRate === false &&
              visibleSeries.under5MinGrowth === false
            }
            isAnimationActive={false}
          />

          {/* 4. Line: Sinh phiếu X/N tự động (đường xanh lá, điểm hình thoi) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="autoExportRate"
            name="Tỷ lệ sinh X/N tự động"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={(dotProps) =>
              renderDiamondDot({
                ...dotProps,
                stroke: '#10b981',
                dataKey: 'autoExportRate'
              })
            }
            activeDot={renderActiveDiamondDot}
            connectNulls={true}
            hide={
              visibleSeries &&
              visibleSeries.autoExportRate === false &&
              visibleSeries.autoExportGrowth === false
            }
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailyTicketGrowthChart
