/* eslint-disable react/prop-types, no-unused-vars */
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
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'

export function DailyTimelineProgressSection({
  dailyAggregates = [],
  plantName = 'Nhà máy',
  totalDays = 1,
  showDailySummaryTable = true,
  setShowDailySummaryTable,
  sectionNumber = 3
}) {
  // Format data for timeline analysis
  const { chartData, grandTotal } = useMemo(() => {
    if (!dailyAggregates || dailyAggregates.length === 0) {
      return {
        chartData: [],
        grandTotal: {
          ticketCount: 0,
          totalActual: 0,
          totalPass: 0,
          totalDefect: 0,
          totalRuntime: 0,
          avgPassRate: 100,
          avgDailyOutput: 0,
          avgSpeedPerHour: 0
        }
      }
    }

    let totalActual = 0
    let totalPass = 0
    let totalDefect = 0
    let totalRuntime = 0
    let totalTickets = 0

    const formatted = dailyAggregates.map((d) => {
      const rawDate = d.date || d.Date || ''
      const shortDate = rawDate.length >= 10 ? rawDate.slice(5) : rawDate // MM-DD
      const actual = Number(d.actualQty ?? d.ActualQty ?? d.prodQty ?? d.ProdQty ?? 0)
      const pass = Number(d.passQty ?? d.PassQty ?? actual)
      const defect = Number(d.defectQty ?? d.DefectQty ?? Math.max(0, actual - pass))
      const runtime = Number(d.runtimeHours ?? d.RuntimeHours ?? 0)
      const tickets = Number(d.ticketCount ?? d.TicketCount ?? 0)
      const passRate =
        actual > 0 ? Number(Math.min(100, Math.max(0, (pass / actual) * 100)).toFixed(2)) : 100
      const speedPerHour = runtime > 0 ? Math.round(actual / runtime) : 0

      totalActual += actual
      totalPass += pass
      totalDefect += defect
      totalRuntime += runtime
      totalTickets += tickets

      return {
        date: rawDate,
        shortDate,
        name: shortDate || rawDate,
        actualQty: actual,
        passQty: pass,
        defectQty: defect,
        runtimeHours: Number(runtime.toFixed(1)),
        ticketCount: tickets,
        passRate,
        speedPerHour
      }
    })

    const activeDays = formatted.filter((f) => f.actualQty > 0 || f.runtimeHours > 0).length || 1
    const avgDailyOutput = Math.round(totalActual / activeDays)
    const avgSpeedPerHour = totalRuntime > 0 ? Math.round(totalActual / totalRuntime) : 0
    const avgPassRate = totalActual > 0 ? Number(((totalPass / totalActual) * 100).toFixed(2)) : 100

    return {
      chartData: formatted,
      grandTotal: {
        ticketCount: totalTickets,
        totalActual,
        totalPass,
        totalDefect,
        totalRuntime: Number(totalRuntime.toFixed(1)),
        avgPassRate,
        avgDailyOutput,
        avgSpeedPerHour
      }
    }
  }, [dailyAggregates])

  if (chartData.length === 0) {
    return null
  }

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* Header & Controls theo khung chuẩn hệ thống */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 12
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span>{sectionNumber}. THỐNG KÊ TIẾN TRÌNH SẢN LƯỢNG THEO DÒNG THỜI GIAN</span>
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
            Thống kê diễn biến tổng sản lượng sản xuất thực tế, sản lượng đạt chuẩn KCS và tỷ lệ đạt
            qua từng ngày ghi nhận trong chu kỳ (<b>{chartData.length} ngày</b> tại{' '}
            {plantName || 'Nhà máy'}). Biểu đồ cung cấp đường tham chiếu mức bình quân (
            <b>{grandTotal.avgDailyOutput.toLocaleString('vi-VN')} SP/ngày</b>) giúp theo dõi trực
            quan sự ổn định về khối lượng và chất lượng theo thời gian.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setShowDailySummaryTable ? setShowDailySummaryTable(!showDailySummaryTable) : null
            }
            className={`uppercase text-[11px] font-semibold ${
              showDailySummaryTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu theo ngày"
          >
            <TableProperties
              size={13}
              className={showDailySummaryTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showDailySummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* Khung Biểu Đồ Chuẩn Phân Tích Kép */}
      <div
        style={{
          width: '100%',
          height: 380,
          border: '1px solid #e2e8f0',
          padding: '16px 24px 16px 10px',
          background: '#ffffff',
          boxSizing: 'border-box'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 35, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString('vi-VN')
              }
              label={{
                value: 'Sản lượng (SP)',
                angle: -90,
                position: 'insideLeft',
                fill: '#475569',
                fontSize: 11,
                offset: 5
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[70, 100]}
              tick={{ fontSize: 11, fill: '#16a34a' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              label={{
                value: '% Đạt KCS',
                angle: 90,
                position: 'insideRight',
                fill: '#16a34a',
                fontSize: 11,
                offset: 5
              }}
            />
            <RechartsTooltip content={<ExecutiveChartTooltip unit=" SP" />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
            />
            <Bar
              yAxisId="left"
              dataKey="actualQty"
              name="SL Sản Xuất (Thực tế)"
              fill="#01411b"
              barSize={chartData.length > 20 ? 10 : 16}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="actualQty"
                position="top"
                formatter={(v) =>
                  v && chartData.length <= 15 ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#01411b', fontSize: 9.5, fontWeight: 700 }}
              />
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="passQty"
              name="SL Đạt Chuẩn KCS"
              fill="#166534"
              barSize={chartData.length > 20 ? 10 : 16}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="passQty"
                position="top"
                formatter={(v) =>
                  v && chartData.length <= 15 ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#166534', fontSize: 9.5, fontWeight: 700 }}
              />
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="passRate"
              name="Tỷ Lệ Đạt (% Pass Rate)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="passRate"
                position="top"
                formatter={(v) =>
                  v !== undefined && v !== null && chartData.length <= 15 ? `${v}%` : ''
                }
                style={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
              />
            </Line>
            {grandTotal.avgDailyOutput > 0 && (
              <ReferenceLine
                yAxisId="left"
                y={grandTotal.avgDailyOutput}
                stroke="#d97706"
                strokeDasharray="4 4"
                label={{
                  value: `Mức BQ: ${grandTotal.avgDailyOutput.toLocaleString('vi-VN')} SP`,
                  position: 'insideTopLeft',
                  fill: '#d97706',
                  fontSize: 10.5,
                  fontWeight: 600
                }}
              />
            )}
            <ReferenceLine
              yAxisId="right"
              y={95}
              stroke="#ca8a04"
              strokeDasharray="3 3"
              label={{
                value: 'Chỉ tiêu: 95%',
                position: 'insideBottomRight',
                fill: '#ca8a04',
                fontSize: 10
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng tổng hợp số liệu chuẩn hệ thống (không có tag/pill) */}
      {showDailySummaryTable && (
        <div
          style={{
            marginTop: 16,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            background: '#ffffff'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              fontWeight: 700,
              color: '#0f172a'
            }}
          >
            <span>BẢNG TỔNG HỢP SỐ LIỆU TIẾN TRÌNH THEO NGÀY ({chartData.length} NGÀY)</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>
              Tổng SL thực tế: <b>{grandTotal.totalActual.toLocaleString('vi-VN')} SP</b> | Tổng giờ
              chạy: <b>{grandTotal.totalRuntime}h</b>
            </span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 420 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
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
                      textTransform: 'uppercase'
                    }}
                  >
                    Ngày sản xuất
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Số phiếu
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    SL Sản xuất
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    SL Đạt KCS
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Phế phẩm / Lỗi
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Tỷ lệ đạt KCS
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Thời gian chạy
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Tốc độ SX (SP/h)
                  </th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr
                    key={row.date || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 1 ? '#fafafa' : '#ffffff'
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {row.date}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                      {row.ticketCount}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#01411b'
                      }}
                    >
                      {row.actualQty.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#166534' }}>
                      {row.passQty.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        color: row.defectQty > 0 ? '#dc2626' : '#94a3b8'
                      }}
                    >
                      {row.defectQty.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          row.passRate >= 95
                            ? '#166534'
                            : row.passRate >= 85
                              ? '#d97706'
                              : '#dc2626'
                      }}
                    >
                      {row.passRate.toFixed(1)}%
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                      {row.runtimeHours}h
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        color: '#334155',
                        fontWeight: 600
                      }}
                    >
                      {row.speedPerHour.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderTop: '2px solid #0f172a',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  <td style={{ padding: '10px 12px' }}>TỔNG CỘNG ({chartData.length} NGÀY)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {grandTotal.ticketCount}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                    {grandTotal.totalActual.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                    {grandTotal.totalPass.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>
                    {grandTotal.totalDefect.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                    {grandTotal.avgPassRate.toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {grandTotal.totalRuntime}h
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                    {grandTotal.avgSpeedPerHour.toLocaleString('vi-VN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
