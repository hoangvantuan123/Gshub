/* eslint-disable react/prop-types */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LabelList
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'

export function TeamOutputSection({
  teamAggregates,
  teamGrandTotal,
  showTeamSummaryTable,
  setShowTeamSummaryTable,
  plantName,
  sectionNumber = 2
}) {
  const chartData = teamAggregates.map((t) => ({
    name: t.teamName,
    actualQty: Number(t.totalActualQty || 0),
    passQty: Number(t.totalPassQty || 0),
    defectQty: Number(t.totalDefectQty || 0),
    ticketCount: t.ticketCount
  }))

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* Header & Controls */}
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
            <span>{sectionNumber}. THỐNG KÊ SẢN LƯỢNG SẢN XUẤT &amp; ĐẠT THEO TỔ SẢN XUẤT</span>
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
            Thống kê đối chiếu tổng sản lượng sản xuất thực tế và sản lượng đạt chuẩn KCS của{' '}
            <b>{teamAggregates.length} tổ sản xuất</b> ghi nhận trong kỳ ({plantName || 'Nhà máy'}).
            Phản ánh trực quan khối lượng sản xuất thực tế, số lượng đạt và lượng lỗi phát sinh của
            từng tổ.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTeamSummaryTable(!showTeamSummaryTable)}
            className={`uppercase text-[11px] font-semibold ${
              showTeamSummaryTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu theo tổ"
          >
            <TableProperties
              size={13}
              className={showTeamSummaryTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showTeamSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* Khung biểu đồ ngang */}
      <div
        style={{
          width: '100%',
          height: Math.max(380, chartData.length * 56 + 90),
          border: '1px solid #e2e8f0',
          padding: '16px 24px 16px 10px',
          background: '#ffffff'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 15, right: 90, left: 160, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              stroke="#cbd5e1"
              strokeWidth={1}
              tickLine={true}
              tickFormatter={(v) => v.toLocaleString('vi-VN')}
              fontSize={11.5}
              tick={{ fill: '#334155' }}
              label={{
                value: 'Sản lượng (SP)',
                position: 'insideBottom',
                offset: -12,
                fill: '#334155',
                fontSize: 12,
                fontWeight: 700
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#cbd5e1"
              strokeWidth={1}
              tickLine={true}
              fontSize={12}
              tick={{ fill: '#0f172a', fontWeight: 700 }}
              width={150}
            />
            <RechartsTooltip content={<ExecutiveChartTooltip unit=" SP" />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
            />
            <Bar
              dataKey="actualQty"
              name="SL Sản xuất thực tế"
              fill="#01411b"
              barSize={14}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="actualQty"
                position="right"
                formatter={(v) =>
                  v !== undefined && v !== null && v > 0 ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#01411b', fontSize: 10, fontWeight: 700 }}
              />
            </Bar>
            <Bar
              dataKey="passQty"
              name="SL Đạt KCS"
              fill="#166534"
              barSize={14}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="passQty"
                position="right"
                formatter={(v) =>
                  v !== undefined && v !== null && v > 0 ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#166534', fontSize: 10, fontWeight: 700 }}
              />
            </Bar>
            <Bar
              dataKey="defectQty"
              name="SL Lỗi / Phế phẩm"
              fill="#be123c"
              barSize={14}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="defectQty"
                position="right"
                formatter={(v) =>
                  v !== undefined && v !== null && v > 0 ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#be123c', fontSize: 10, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng Gom nhóm theo Tổ Sản Xuất Phong Cách OpenAI Technical Table */}
      {showTeamSummaryTable && (
        <div style={{ width: '100%', marginTop: 20, marginBottom: 8, overflowX: 'auto' }}>
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
                  Tổ sản xuất
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
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
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tỷ lệ MES
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Cảnh báo (&lt;5p / &gt;12h)
                </th>
              </tr>
            </thead>
            <tbody>
              {teamAggregates.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 1 ? '#fafafa' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.teamName || 'Không xác định'}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {row.ticketCount?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#334155'
                    }}
                  >
                    {row.totalActualQty?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  >
                    {row.totalPassQty?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: Number(row.totalDefectQty) > 0 ? '#dc2626' : '#64748b'
                    }}
                  >
                    <span style={{ fontWeight: Number(row.totalDefectQty) > 0 ? 700 : 400 }}>
                      {row.totalDefectQty?.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {row.passRate}%
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#334155'
                    }}
                  >
                    {row.mesRate}%
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12 }}>
                    {row.under5Min > 0 && (
                      <span
                        style={{ color: '#dc2626', fontWeight: 700, marginRight: 6 }}
                        title="Số đơn nhập dưới 5 phút"
                      >
                        {row.under5Min} (&lt;5p)
                      </span>
                    )}
                    {row.anomalies > 0 && (
                      <span
                        style={{ color: '#dc2626', fontWeight: 700 }}
                        title="Số đơn chạy trên 12h cần kiểm tra"
                      >
                        {row.anomalies} (&gt;12h)
                      </span>
                    )}
                    {!row.under5Min && !row.anomalies && (
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Chuẩn</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Dòng TỔNG CỘNG */}
              {teamGrandTotal && (
                <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                    TỔNG CỘNG ({teamAggregates.length} TỔ)
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {teamGrandTotal.totalTickets?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {teamGrandTotal.totalActual?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {teamGrandTotal.totalPass?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: teamGrandTotal.totalDefect > 0 ? '#dc2626' : '#0f172a'
                    }}
                  >
                    {teamGrandTotal.totalDefect?.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {teamGrandTotal.avgPassRate}%
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {teamGrandTotal.avgMesRate}%
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                    {teamGrandTotal.totalUnder5 > 0 && (
                      <span style={{ color: '#dc2626', marginRight: 6 }}>
                        {teamGrandTotal.totalUnder5} (&lt;5p)
                      </span>
                    )}
                    {teamGrandTotal.totalAnomalies > 0 && (
                      <span style={{ color: '#dc2626' }}>
                        {teamGrandTotal.totalAnomalies} (&gt;12h)
                      </span>
                    )}
                    {!teamGrandTotal.totalUnder5 && !teamGrandTotal.totalAnomalies && (
                      <span style={{ color: '#64748b' }}>Chuẩn</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
