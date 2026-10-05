/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { DailyTicketGrowthChart } from './DailyTicketGrowthChart'
import {
  extractDailyTicketGrowthData,
  calculateDailyGrowthSeries
} from '../utils/dailyTicketGrowthCalculations'

export function DailyTicketGrowthSection({
  filteredData = [],
  dailyAggregates = [],
  backendReportData = null,
  kpiMetrics = null,
  dateRange = [],
  plantName = 'Nhà máy GS Hà Nội',
  totalDays = 1,
  sectionNumber = 1
}) {
  const [showTable, setShowTable] = useState(true)
  const [visibleSeries, setVisibleSeries] = useState({
    totalTickets: true,
    over12hRate: true,
    under5MinRate: true,
    autoExportRate: true
  })

  // 1. Trích xuất dữ liệu thô từ API thực tế
  const rawDailyData = useMemo(() => {
    return extractDailyTicketGrowthData(
      filteredData,
      dailyAggregates,
      backendReportData,
      kpiMetrics,
      dateRange
    )
  }, [filteredData, dailyAggregates, backendReportData, kpiMetrics, dateRange])

  // 2. Tính toán các chỉ số tăng trưởng và tổng hợp
  const { chartData, grandTotal } = useMemo(() => {
    return calculateDailyGrowthSeries(rawDailyData)
  }, [rawDailyData])

  // 3. Xử lý click trên Legend để bật/tắt chuỗi
  const handleLegendClick = (e) => {
    const dataKey = e?.dataKey
    if (!dataKey) return
    setVisibleSeries((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }))
  }

  // Không có dữ liệu từ API thì không render (chuẩn theo phong cách các section trong hệ thống)
  if (!chartData || chartData.length === 0) {
    return null
  }

  return (
    <div
      style={{
        marginBottom: 44,
        width: '100%',
        background: '#ffffff',
        padding: '8px 0',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. Header & Controls theo chuẩn thiết kế hệ thống */}
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
            <span>{sectionNumber}. THỐNG KÊ SỐ PHIẾU &amp; TỐC ĐỘ TĂNG TRƯỞNG THEO NGÀY</span>
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
            Thống kê diễn biến tổng số phiếu tiếp nhận &amp; nhịp độ biến động tăng trưởng theo ngày
            của <b>{plantName || 'Nhà máy GS Hà Nội'}</b> (chu kỳ{' '}
            <b>{totalDays || chartData.length} ngày</b>) trên hệ thống{' '}
            <b>MES Engine &amp; Bravo ERP</b>. Biểu đồ kết hợp cột khối lượng tổng phiếu với 3 chỉ
            tiêu tăng trưởng trọng yếu (Phiếu chạy kéo dài &gt;12h, phiếu siêu ngắn &lt;5 phút và
            tốc độ sinh phiếu Xuất/Nhập tự động).
          </div>
        </div>

        {/* Nút hành động mở/đóng bảng theo phong cách hệ thống */}
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

      {/* 2. Khung Biểu Đồ Chuẩn Hệ Thống */}
      <DailyTicketGrowthChart
        chartData={chartData}
        visibleSeries={visibleSeries}
        onLegendClick={handleLegendClick}
        height={380}
      />

      {/* 3. Bảng tổng hợp số liệu chuẩn hệ thống (Phong cách Technical Table) */}
      {showTable && (
        <div style={{ width: '100%', marginTop: 18, marginBottom: 8, overflowX: 'auto' }}>
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
                    width: 50,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    minWidth: 110,
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
                    color: '#1e3a8a',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Tổng phiếu
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#9a3412',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  &gt; 12 giờ
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#6d28d9',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  &lt; 5 phút
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#065f46',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  X/N đã sinh
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#475569',
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  X/N chưa sinh
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr
                  key={row.date || idx}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.displayDate}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#1e3a8a'
                    }}
                  >
                    {Number(row.totalTickets || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#ea580c'
                    }}
                  >
                    {Number(row.over12hCount || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#8b5cf6'
                    }}
                  >
                    {Number(row.under5MinCount || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#10b981'
                    }}
                  >
                    {Number(row.autoExportedCount || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      color: Number(row.notAutoExportedCount || 0) > 0 ? '#d97706' : '#64748b'
                    }}
                  >
                    {Number(row.notAutoExportedCount || 0).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: '2px solid #0f172a',
                  background: '#f8fafc',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                <td colSpan={2} style={{ padding: '10px 12px', textTransform: 'uppercase' }}>
                  TỔNG CỘNG ({chartData.length} NGÀY)
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e3a8a' }}>
                  {grandTotal.totalTickets.toLocaleString('vi-VN')}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ea580c' }}>
                  {grandTotal.totalOver12h.toLocaleString('vi-VN')}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#8b5cf6' }}>
                  {grandTotal.totalUnder5Min.toLocaleString('vi-VN')}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#10b981' }}>
                  {grandTotal.totalAutoExported.toLocaleString('vi-VN')}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706' }}>
                  {grandTotal.totalNotAutoExported.toLocaleString('vi-VN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export default DailyTicketGrowthSection
