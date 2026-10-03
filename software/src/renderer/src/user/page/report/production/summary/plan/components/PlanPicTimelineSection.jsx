/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

// Mini Sparkline SVG thanh mảnh chuẩn BI
function CleanSparkline({ data = [], isUp = true, color = '#059669', width = 100, height = 24 }) {
  if (!data || data.length === 0) return <span style={{ color: '#cbd5e1' }}>—</span>
  const vals = data.map((d) => d.orders || 0)
  const maxVal = Math.max(1, ...vals)
  const minVal = Math.min(0, ...vals)
  const range = maxVal - minVal || 1
  const step = data.length > 1 ? width / (data.length - 1) : width

  const points = data
    .map((d, idx) => {
      const x = idx * step
      const y = height - Math.round(((d.orders - minVal) / range) * (height - 6)) - 3
      return `${x},${y}`
    })
    .join(' ')

  const fillPoints = `0,${height} ${points} ${width},${height}`

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', width, height }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon fill={`url(#grad-${color.replace('#', '')})`} points={fillPoints} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.length > 0 && (
          <circle
            cx={(data.length - 1) * step}
            cy={
              height - Math.round(((vals[vals.length - 1] - minVal) / range) * (height - 6)) - 3
            }
            r="3"
            fill={color}
          />
        )}
      </svg>
    </div>
  )
}

export function PlanPicTimelineSection({
  picTimelineBreakdown = {
    dailyList: [],
    monthlyList: [],
    quarterlyList: [],
    picList: [],
    picGrowthList: []
  },
  plantName = 'Nhà máy',
  totalDays = 1,
  selectedPic = 'ALL',
  onSelectPic
}) {
  const monthlyList = picTimelineBreakdown?.monthlyList || []
  const dailyList = picTimelineBreakdown?.dailyList || []
  const quarterlyList = picTimelineBreakdown?.quarterlyList || []
  const picList = picTimelineBreakdown?.picList || []

  // Quyết định danh sách chu kỳ: Ưu tiên Tháng nếu >= 2 tháng, ngược lại dùng Ngày
  const periodList = useMemo(() => {
    if (monthlyList.length >= 2) return monthlyList
    if (quarterlyList.length >= 2) return quarterlyList
    return dailyList
  }, [monthlyList, quarterlyList, dailyList])

  // Tính ma trận tăng trưởng chuẩn BI cho từng PIC qua các tháng/kỳ
  const matrixData = useMemo(() => {
    const list = picList.map((p) => {
      let khopSlTotal = 0
      let khopJobTotal = 0

      const series = periodList.map((period) => {
        const cnt = period[p] || 0
        const stat = period.picStats?.[p] || {}
        khopSlTotal += stat.khopSl || 0
        khopJobTotal += stat.khopJob || 0

        return {
          periodKey: period.periodKey || period.name,
          name: period.name || period.periodLabel || period.periodKey,
          orders: cnt,
          passRate: period[`${p}_passRate`] || 0
        }
      })

      const totalOrders = series.reduce((sum, s) => sum + s.orders, 0)
      const firstPeriodOrders = series.length > 0 ? series[0].orders : 0
      const lastPeriodOrders = series.length > 0 ? series[series.length - 1].orders : 0
      const diff = lastPeriodOrders - firstPeriodOrders

      let growthRate = 0
      if (firstPeriodOrders > 0) {
        growthRate = Number(
          (((lastPeriodOrders - firstPeriodOrders) / firstPeriodOrders) * 100).toFixed(1)
        )
      } else if (lastPeriodOrders > 0) {
        growthRate = 100
      }

      const passOrders = khopSlTotal + khopJobTotal
      const passRate =
        totalOrders > 0 ? Number(((passOrders / totalOrders) * 100).toFixed(1)) : 0

      const isUp = growthRate > 5 || diff >= 3
      const isDown = growthRate < -5 || diff <= -3
      const trend = isUp ? 'UP' : isDown ? 'DOWN' : 'STABLE'

      return {
        pic: p,
        totalOrders,
        firstPeriodOrders,
        lastPeriodOrders,
        diff,
        growthRate,
        trend,
        passRate,
        series
      }
    })

    return list.sort((a, b) => b.totalOrders - a.totalOrders)
  }, [picList, periodList])

  // Tổng hợp toàn bộ xưởng
  const grandTotalOrders = matrixData.reduce((sum, r) => sum + r.totalOrders, 0)
  const grandFirstOrders = matrixData.reduce((sum, r) => sum + r.firstPeriodOrders, 0)
  const grandLastOrders = matrixData.reduce((sum, r) => sum + r.lastPeriodOrders, 0)
  const grandDiff = grandLastOrders - grandFirstOrders
  const grandGrowthRate =
    grandFirstOrders > 0
      ? Number((((grandLastOrders - grandFirstOrders) / grandFirstOrders) * 100).toFixed(1))
      : 0

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* Header Hạng mục */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 8
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
            <span>2. TỐC ĐỘ TĂNG TRƯỞNG PIC THEO THÁNG</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
            Theo dõi biến động số lệnh điều phối và tốc độ tăng trưởng qua các tháng của từng nhân sự
            điều phối (PIC).
          </div>
        </div>

        {selectedPic !== 'ALL' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPic && onSelectPic('ALL')}
            className="text-[11px] h-7 px-2.5 font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            Đang chọn: <b>{selectedPic}</b> (Bấm để xem tất cả)
          </Button>
        )}
      </div>

      {/* BẢNG MA TRẬN ĐIỀU HÀNH TĂNG TRƯỞNG (TRÌNH BÀY PHẲNG, KHÔNG KHUNG BẬC LỒNG NHAU) */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderTop: '2px solid #0f172a',
            borderBottom: '2px solid #0f172a',
            fontSize: 12,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'left'
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #0f172a', background: '#f8fafc' }}>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  minWidth: 160
                }}
              >
                Nhân sự PIC
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  minWidth: 90
                }}
              >
                Tổng lệnh
              </th>

              {/* Các cột từng Tháng / Quý / Ngày */}
              {periodList.map((p) => (
                <th
                  key={p.periodKey || p.name}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#0369a1',
                    textTransform: 'uppercase',
                    minWidth: 85
                  }}
                >
                  {p.name}
                </th>
              ))}

              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  minWidth: 115
                }}
              >
                Xu hướng
              </th>

              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  minWidth: 100
                }}
              >
                Chênh lệch
              </th>

              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  minWidth: 120
                }}
              >
                Tăng trưởng
              </th>

              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  color: '#01411b',
                  textTransform: 'uppercase',
                  minWidth: 95
                }}
              >
                Đạt chuẩn (%)
              </th>

              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  minWidth: 110
                }}
              >
                Đánh giá
              </th>
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, idx) => {
              const isSelected = selectedPic === row.pic
              const isUp = row.trend === 'UP'
              const isDown = row.trend === 'DOWN'
              const rateColor = isUp ? '#16a34a' : isDown ? '#dc2626' : '#475569'
              const sparkColor = isUp ? '#16a34a' : isDown ? '#ea580c' : '#64748b'
              const diffSign = row.diff > 0 ? '+' : ''

              return (
                <tr
                  key={idx}
                  onClick={() => onSelectPic && onSelectPic(isSelected ? 'ALL' : row.pic)}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: isSelected
                      ? '#eff6ff'
                      : idx % 2 === 1
                        ? '#fafafa'
                        : 'transparent',
                    cursor: onSelectPic ? 'pointer' : 'default',
                    transition: 'background 0.15s ease'
                  }}
                  title={onSelectPic ? `Nhấp để lọc theo PIC: ${row.pic}` : undefined}
                >
                  {/* Cột 1: Tên PIC */}
                  <td
                    style={{
                      padding: '9px 12px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#1d4ed8' : '#0f172a'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isSelected && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#2563eb'
                          }}
                        />
                      )}
                      <span>{row.pic}</span>
                    </div>
                  </td>

                  {/* Cột 2: Tổng lệnh */}
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {row.totalOrders.toLocaleString('vi-VN')}
                  </td>

                  {/* Các cột số lệnh qua từng tháng */}
                  {row.series.map((s, sIdx) => (
                    <td
                      key={sIdx}
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: s.orders > 0 ? 600 : 400,
                        color: s.orders > 0 ? '#0f172a' : '#94a3b8'
                      }}
                    >
                      {s.orders > 0 ? s.orders.toLocaleString('vi-VN') : '—'}
                    </td>
                  ))}

                  {/* Đồ thị Sparkline SVG */}
                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                    <CleanSparkline
                      data={row.series}
                      isUp={isUp}
                      color={sparkColor}
                      width={85}
                      height={20}
                    />
                  </td>

                  {/* Chênh lệch lệnh */}
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: isUp ? '#16a34a' : isDown ? '#dc2626' : '#64748b'
                    }}
                  >
                    {diffSign}
                    {row.diff.toLocaleString('vi-VN')} lệnh
                  </td>

                  {/* Tốc độ tăng trưởng % */}
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: rateColor
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: isUp ? '#dcfce7' : isDown ? '#fee2e2' : '#f1f5f9'
                      }}
                    >
                      {isUp && <ArrowUpRight size={12} className="text-emerald-700" />}
                      {isDown && <ArrowDownRight size={12} className="text-rose-700" />}
                      {!isUp && !isDown && <Minus size={12} className="text-slate-500" />}
                      <span>
                        {row.growthRate > 0 ? `+${row.growthRate}%` : `${row.growthRate}%`}
                      </span>
                    </span>
                  </td>

                  {/* Tỷ lệ đạt chuẩn % */}
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: row.passRate >= 20 ? '#01411b' : '#d97706'
                    }}
                  >
                    {row.passRate}%
                  </td>

                  {/* Đánh giá */}
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: isUp ? '#f0fdf4' : isDown ? '#fff7ed' : '#f8fafc',
                        color: isUp ? '#166534' : isDown ? '#c2410c' : '#475569',
                        border: isUp
                          ? '1px solid #bbf7d0'
                          : isDown
                            ? '1px solid #fed7aa'
                            : '1px solid #e2e8f0'
                      }}
                    >
                      {isUp ? 'TĂNG TRƯỞNG' : isDown ? 'SUY GIẢM' : 'ỔN ĐỊNH'}
                    </span>
                  </td>
                </tr>
              )
            })}

            {/* Dòng Tổng cộng */}
            {matrixData.length > 0 && (
              <tr
                style={{
                  borderTop: '1.5px solid #0f172a',
                  background: '#fafafa',
                  fontWeight: 800
                }}
              >
                <td style={{ padding: '10px 12px', color: '#0f172a' }}>TỔNG CỘNG</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>
                  {grandTotalOrders.toLocaleString('vi-VN')}
                </td>
                {periodList.map((p) => {
                  const totalP = matrixData.reduce((sum, r) => {
                    const match = r.series.find((s) => s.periodKey === (p.periodKey || p.name))
                    return sum + (match?.orders || 0)
                  }, 0)
                  return (
                    <td
                      key={p.periodKey || p.name}
                      style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}
                    >
                      {totalP.toLocaleString('vi-VN')}
                    </td>
                  )
                })}
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                  {grandTotalOrders.toLocaleString('vi-VN')} LSX
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: grandDiff >= 0 ? '#16a34a' : '#dc2626'
                  }}
                >
                  {grandDiff > 0 ? `+${grandDiff}` : grandDiff} lệnh
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: grandGrowthRate >= 0 ? '#16a34a' : '#dc2626'
                  }}
                >
                  {grandGrowthRate > 0 ? `+${grandGrowthRate}%` : `${grandGrowthRate}%`}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    color: '#01411b'
                  }}
                >
                  {(() => {
                    const totalPassed = matrixData.reduce(
                      (sum, r) => sum + Math.round((r.totalOrders * r.passRate) / 100),
                      0
                    )
                    return grandTotalOrders > 0
                      ? `${((totalPassed / grandTotalOrders) * 100).toFixed(1)}%`
                      : '0.0%'
                  })()}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0f172a' }}>
                  {grandGrowthRate > 5
                    ? 'TĂNG TRƯỞNG'
                    : grandGrowthRate < -5
                      ? 'SUY GIẢM'
                      : 'ỔN ĐỊNH'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PlanPicTimelineSection
