/* eslint-disable react/prop-types */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LabelList,
  Cell
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export function SyncLatencySection({ kpiMetrics, showSyncTable, setShowSyncTable, plantName }) {
  const totalTickets = kpiMetrics.totalTickets || 0

  return (
    <div style={{ width: '100%', background: '#ffffff', padding: '8px 0' }}>
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
              fontSize: 15,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span>3. THỐNG KÊ ĐỘ TRỄ THỜI GIAN ĐỒNG BỘ 2 HỆ THỐNG</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#475569',
              marginTop: 4,
              lineHeight: 1.5
            }}
          >
            Độ trễ truyền tải từ MES về Bravo ERP trên toàn bộ{' '}
            <b>{totalTickets.toLocaleString('vi-VN')} phiếu</b> ({plantName || 'Nhà máy'}). Độ trễ
            TB: <b style={{ color: '#01411b' }}>{kpiMetrics.avgSyncDelaySeconds}s</b> (
            {kpiMetrics.syncLatencyFormatted}) • Tức thời:{' '}
            <b style={{ color: '#01411b' }}>{kpiMetrics.syncSuccessRate}</b>.
          </div>
        </div>
        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSyncTable(!showSyncTable)}
            className={`uppercase text-[11px] font-semibold ${
              showSyncTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng phân bổ độ trễ đồng bộ"
          >
            <TableProperties
              size={13}
              className={showSyncTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showSyncTable ? 'Đóng bảng' : 'Mở bảng'}</span>
          </Button>
        </div>
      </div>

      {/* Biểu đồ phân bổ độ trễ đồng bộ */}
      <div
        style={{
          width: '100%',
          height: Math.max(260, (kpiMetrics.syncBreakdown?.length || 5) * 44 + 50),
          border: '1px solid #e2e8f0',
          padding: '14px 16px 14px 6px',
          background: '#ffffff'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={kpiMetrics.syncBreakdown}
            layout="vertical"
            margin={{ top: 10, right: 60, left: 115, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              stroke="#cbd5e1"
              strokeWidth={1}
              tickLine={true}
              tickFormatter={(v) => v.toLocaleString('vi-VN')}
              fontSize={11}
              tick={{ fill: '#334155' }}
            />
            <YAxis
              type="category"
              dataKey="group"
              stroke="#cbd5e1"
              strokeWidth={1}
              tickLine={true}
              fontSize={11.5}
              tick={{ fill: '#0f172a', fontWeight: 700 }}
              width={110}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload
                  return (
                    <div
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '8px 12px',
                        fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: 2
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                        {d.group}
                      </div>
                      <div>
                        Số lượng phiếu:{' '}
                        <b style={{ color: '#ffffff' }}>
                          {Number(d.count || 0).toLocaleString('vi-VN')} phiếu
                        </b>
                      </div>
                      <div>
                        Tỷ lệ chiếm: <b style={{ color: '#a7f3d0' }}>{d.rate}%</b>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="count" barSize={18} radius={[0, 2, 2, 0]}>
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v, entry) => {
                  const item = entry || {}
                  const rate = item.rate !== undefined ? item.rate : 0
                  return v ? `${Number(v).toLocaleString('vi-VN')} (${rate}%)` : ''
                }}
                style={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }}
              />
              {kpiMetrics.syncBreakdown &&
                kpiMetrics.syncBreakdown.map((entry, index) => (
                  <Cell key={`cell-sync-${index}`} fill={entry.color || '#01411b'} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bảng Gom nhóm phân bổ độ trễ đồng bộ */}
      {showSyncTable && (
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
                  Khoảng độ trễ đồng bộ
                </th>
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
                  Đánh giá mức độ
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
                  Số lượng phiếu
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
                  Tỷ lệ (%)
                </th>
              </tr>
            </thead>
            <tbody>
              {kpiMetrics.syncBreakdown &&
                kpiMetrics.syncBreakdown.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 1 ? '#fafafa' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 12px',
                        fontWeight: 600,
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: row.color || '#01411b',
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                      {row.group}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', fontSize: 12 }}>
                      {row.group.includes('≤ 10')
                        ? 'Tức thời (<10s)'
                        : row.group.includes('11 – 30')
                          ? 'Nhanh (11–30s)'
                          : row.group.includes('31 – 60')
                            ? 'Chấp nhận được'
                            : row.group.includes('> 60')
                              ? 'Độ trễ cao (>60s)'
                              : 'Chưa đồng bộ'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {Number(row.count || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {row.rate}%
                    </td>
                  </tr>
                ))}
              <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                  TỔNG CỘNG
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  {totalTickets.toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 900,
                    color: '#0f172a'
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
  )
}
