/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { DailyTicketGrowthChart } from './DailyTicketGrowthChart'
import {
  extractDailyTicketGrowthData,
  groupDailyDataByPeriod,
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
  const [periodType, setPeriodType] = useState('daily') // 'daily' | 'monthly' | 'quarterly'
  const [showTable, setShowTable] = useState(true)
  const [visibleSeries, setVisibleSeries] = useState({
    totalTickets: true,
    over12hCount: true,
    under5MinCount: true,
    autoExportedCount: true,
    notAutoExportedCount: true
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

  // 2. Gom nhóm theo khoảng thời gian Ngày / Tháng / Quý
  const periodData = useMemo(() => {
    return groupDailyDataByPeriod(rawDailyData)
  }, [rawDailyData])

  const activeRawList = useMemo(() => {
    if (periodType === 'monthly' && periodData.monthlyList?.length > 0) {
      return periodData.monthlyList
    }
    if (periodType === 'quarterly' && periodData.quarterlyList?.length > 0) {
      return periodData.quarterlyList
    }
    return periodData.dailyList || []
  }, [periodData, periodType])

  // 3. Tính toán các chỉ số tăng trưởng và tổng hợp theo kỳ được chọn
  const { chartData, grandTotal } = useMemo(() => {
    return calculateDailyGrowthSeries(activeRawList)
  }, [activeRawList])

  // 4. Xử lý click trên Legend để bật/tắt chuỗi cột
  const handleToggleSeries = (key) => {
    if (!key) return
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Không có dữ liệu từ API thì không render
  if (!chartData || chartData.length === 0) {
    return null
  }

  const periodUnitText =
    periodType === 'monthly' ? 'THÁNG' : periodType === 'quarterly' ? 'QUÝ' : 'NGÀY'
  const periodUnitLower =
    periodType === 'monthly' ? 'tháng' : periodType === 'quarterly' ? 'quý' : 'ngày'
  const periodLabelText =
    periodType === 'monthly'
      ? `${chartData.length} tháng`
      : periodType === 'quarterly'
        ? `${chartData.length} quý`
        : `chu kỳ ${totalDays || chartData.length} ngày`

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
            <span>
              {sectionNumber}. THỐNG KÊ SỐ PHIẾU &amp; TỐC ĐỘ TĂNG TRƯỞNG THEO {periodUnitText}
            </span>
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
            Thống kê diễn biến tổng số phiếu tiếp nhận &amp; nhịp độ biến động theo{' '}
            {periodUnitLower} của <b>{plantName || 'Nhà máy GS Hà Nội'}</b> ({periodLabelText}) trên
            hệ thống <b>MES Engine &amp; Bravo ERP</b>. Biểu đồ cột khối lượng số lượng từng hạng
            mục nối đỉnh liên tục qua các {periodUnitLower} và thanh trượt điều chỉnh khoảng thời
            gian lọc linh hoạt.
          </div>
        </div>

        {/* Nút Tabs chuyển Ngày / Tháng / Quý và nút mở/đóng bảng */}
        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
        >
          <Tabs value={periodType} onValueChange={setPeriodType}>
            <TabsList>
              <TabsTrigger value="daily">Ngày</TabsTrigger>
              {periodData.monthlyList?.length > 0 && (
                <TabsTrigger value="monthly">Tháng</TabsTrigger>
              )}
              {periodData.quarterlyList?.length > 0 && (
                <TabsTrigger value="quarterly">Quý</TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            className={`uppercase text-[11px] font-semibold ${
              showTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu"
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
        onToggleSeries={handleToggleSeries}
        height={500}
        periodType={periodType}
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
                    minWidth: 100,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  {periodType === 'monthly' ? 'Tháng' : periodType === 'quarterly' ? 'Quý' : 'Ngày'}
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
                      fontWeight: 700,
                      color: '#ea580c'
                    }}
                  >
                    {Number(row.over12hCount || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#8b5cf6'
                    }}
                  >
                    {Number(row.under5MinCount || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#10b981'
                    }}
                  >
                    {Number(row.autoExportedCount || 0).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
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
                  TỔNG CỘNG ({chartData.length} {periodUnitText})
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
