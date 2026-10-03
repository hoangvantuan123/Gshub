/* eslint-disable react/prop-types */
import { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ExecutiveChartTooltip } from '../../../hanoiGs1/stat/components/reportUIComponents'

const COLORS = ['#01411b', '#16a34a', '#d97706', '#ef4444', '#0284c7', '#6366f1', '#64748b']

export function PlanWorkOrderFulfillmentSection({
  statusDistribution = [],
  plantName = 'Nhà máy'
}) {
  const [showStatusTable, setShowStatusTable] = useState(true)

  const totalCount = statusDistribution.reduce((acc, s) => acc + (Number(s.value) || 0), 0)

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
            <span>2. PHÂN BỔ TRẠNG THÁI TIẾN ĐỘ LỆNH KẾ HOẠCH</span>
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
            Thống kê cơ cấu trạng thái thực hiện các lệnh sản xuất trong kỳ kế hoạch tại{' '}
            {plantName || 'Nhà máy'}. Theo dõi tỷ lệ lệnh khớp số lượng, khớp job, trượt tiến độ và
            sản xuất sai ngày.
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStatusTable(!showStatusTable)}
            className={`uppercase text-[11px] font-semibold ${
              showStatusTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp phân bổ trạng thái"
          >
            <TableProperties
              size={13}
              className={showStatusTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showStatusTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* Grid biểu đồ & bảng phân bổ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showStatusTable ? 'repeat(auto-fit, minmax(420px, 1fr))' : '1fr',
          gap: 20,
          alignItems: 'start'
        }}
      >
        {/* Khung Pie Chart */}
        <div
          style={{
            height: 320,
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            background: '#ffffff'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={92}
                innerRadius={52}
                paddingAngle={3}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={true}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip content={<ExecutiveChartTooltip unit=" LSX" />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bảng chi tiết cơ cấu trạng thái */}
        {showStatusTable && (
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #e2e8f0',
              padding: '12px 16px',
              background: '#ffffff'
            }}
          >
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
                <tr style={{ borderBottom: '2px solid #0f172a', background: '#f8fafc' }}>
                  <th
                    style={{
                      padding: '8px 10px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase'
                    }}
                  >
                    Trạng thái tiến độ
                  </th>
                  <th
                    style={{
                      padding: '8px 10px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Số lệnh (LSX)
                  </th>
                  <th
                    style={{
                      padding: '8px 10px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textAlign: 'right',
                      textTransform: 'uppercase'
                    }}
                  >
                    Tỷ trọng (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {statusDistribution.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 1 ? '#fafafa' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: COLORS[idx % COLORS.length],
                            display: 'inline-block'
                          }}
                        />
                        <span>{row.name || 'Khác'}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {Number(row.value || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: COLORS[idx % COLORS.length]
                      }}
                    >
                      {row.rate}%
                    </td>
                  </tr>
                ))}

                {/* DÒNG TỔNG CỘNG */}
                <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 800, color: '#0f172a' }}>
                    TỔNG CỘNG
                  </td>
                  <td
                    style={{
                      padding: '9px 10px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {totalCount.toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 10px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#01411b'
                    }}
                  >
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlanWorkOrderFulfillmentSection
