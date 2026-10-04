/* eslint-disable react/prop-types */
import { useState } from 'react'
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
import { ExecutiveChartTooltip } from '../../../hanoiGs1/stat/components/reportUIComponents'

export function PlanTeamProgressSection({
  teamChartData = [],
  plantName = 'Nhà máy',
  showTeamTable,
  setShowTeamTable
}) {
  const [internalShowTable, setInternalShowTable] = useState(true)
  const isTableVisible = showTeamTable !== undefined ? showTeamTable : internalShowTable
  const toggleTable = () => {
    if (setShowTeamTable) {
      setShowTeamTable(!showTeamTable)
    } else {
      setInternalShowTable(!internalShowTable)
    }
  }

  // Tính dòng tổng cộng
  const grandTotal = teamChartData.reduce(
    (acc, t) => {
      acc.planQty += Number(t.planQty || 0)
      acc.actualQty += Number(t.actualQty || 0)
      return acc
    },
    { planQty: 0, actualQty: 0 }
  )
  const grandPassRate =
    grandTotal.planQty > 0
      ? Number(((grandTotal.actualQty / grandTotal.planQty) * 100).toFixed(1))
      : 100

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
            <span>1. TIẾN ĐỘ THỰC HIỆN KẾ HOẠCH THEO TỔ SẢN XUẤT</span>
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
            So sánh tương quan giữa sản lượng giao theo kế hoạch và sản lượng thực tế thực hiện của{' '}
            <b>{teamChartData.length} tổ sản xuất</b> tại {plantName || 'Nhà máy'}. Phản ánh mức độ
            hoàn thành định mức và chênh lệch sản lượng từng tổ.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTable}
            className={`uppercase text-[11px] font-semibold ${
              isTableVisible
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu tiến độ theo tổ"
          >
            <TableProperties
              size={13}
              className={isTableVisible ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{isTableVisible ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* Khung biểu đồ */}
      <div
        style={{
          width: '100%',
          height: Math.max(360, teamChartData.length * 48 + 90),
          border: '1px solid #e2e8f0',
          padding: '16px 24px 16px 10px',
          background: '#ffffff'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={teamChartData}
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
              dataKey="team"
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
              dataKey="planQty"
              name="SL Kế hoạch (Target)"
              fill="#64748b"
              barSize={14}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="planQty"
                position="right"
                formatter={(v) =>
                  v !== undefined && v !== null ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              />
            </Bar>
            <Bar
              dataKey="actualQty"
              name="SL Thực tế (Actual)"
              fill="#01411b"
              barSize={14}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="actualQty"
                position="right"
                formatter={(v) =>
                  v !== undefined && v !== null ? Number(v).toLocaleString('vi-VN') : ''
                }
                style={{ fill: '#01411b', fontSize: 10, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng Gom nhóm theo Tổ Sản Xuất */}
      {isTableVisible && (
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
                  SL Kế hoạch (Target)
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
                  SL Thực tế (Actual)
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
                  Chênh lệch (Actual - Plan)
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
                  Tỷ lệ hoàn thành
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
                  Đánh giá tiến độ
                </th>
              </tr>
            </thead>
            <tbody>
              {teamChartData.map((row, idx) => {
                const diff = (row.actualQty || 0) - (row.planQty || 0)
                const rate =
                  row.passRate ?? (row.planQty > 0 ? (row.actualQty / row.planQty) * 100 : 100)
                const isOver = rate >= 100
                const isGood = rate >= 95

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 1 ? '#fafafa' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {row.team || 'Tổ sản xuất'}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#64748b'
                      }}
                    >
                      {Number(row.planQty || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#01411b'
                      }}
                    >
                      {Number(row.actualQty || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: diff >= 0 ? '#166534' : '#dc2626'
                      }}
                    >
                      {diff > 0 ? `+${diff.toLocaleString('vi-VN')}` : diff.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: isGood ? '#01411b' : '#d97706'
                      }}
                    >
                      {Number(rate).toFixed(1)}%
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {isOver ? (
                        <span style={{ color: '#01411b' }}>Vượt chỉ tiêu</span>
                      ) : isGood ? (
                        <span style={{ color: '#166534' }}>Đạt chỉ tiêu</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>Chưa đạt</span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {/* DÒNG TỔNG CỘNG */}
              <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                  TỔNG CỘNG ({teamChartData.length} TỔ)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#475569'
                  }}
                >
                  {grandTotal.planQty.toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#01411b'
                  }}
                >
                  {grandTotal.actualQty.toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: grandTotal.actualQty >= grandTotal.planQty ? '#166534' : '#dc2626'
                  }}
                >
                  {grandTotal.actualQty >= grandTotal.planQty
                    ? `+${(grandTotal.actualQty - grandTotal.planQty).toLocaleString('vi-VN')}`
                    : (grandTotal.actualQty - grandTotal.planQty).toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: grandPassRate >= 95 ? '#01411b' : '#d97706'
                  }}
                >
                  {grandPassRate}%
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800 }}>
                  <span style={{ color: grandPassRate >= 95 ? '#01411b' : '#dc2626' }}>
                    {grandPassRate >= 100
                      ? 'Vượt chỉ tiêu'
                      : grandPassRate >= 95
                        ? 'Đạt chỉ tiêu'
                        : 'Chưa đạt'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PlanTeamProgressSection
