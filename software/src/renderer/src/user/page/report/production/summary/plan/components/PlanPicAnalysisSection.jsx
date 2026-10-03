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
  ReferenceLine
} from 'recharts'
import { TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../../hanoiGs1/stat/components/reportUIComponents'

export function PlanPicAnalysisSection({
  picBreakdown = [],
  plantName = 'Nhà máy',
  selectedPic = 'ALL',
  onSelectPic,
  showPicTable,
  setShowPicTable,
  picChartMode = 'volume',
  setPicChartMode
}) {
  const [internalShowTable, setInternalShowTable] = useState(true)
  const [internalMode, setInternalMode] = useState('volume')

  const isTableVisible = showPicTable !== undefined ? showPicTable : internalShowTable
  const currentMode = picChartMode !== undefined ? picChartMode : internalMode
  const handleModeChange = (val) => {
    if (setPicChartMode) setPicChartMode(val)
    else setInternalMode(val)
  }

  const toggleTable = () => {
    if (setShowPicTable) setShowPicTable(!showPicTable)
    else setInternalShowTable(!internalShowTable)
  }

  // Dữ liệu dòng tổng cộng
  const grandTotal = picBreakdown.reduce(
    (acc, row) => {
      acc.totalOrders += row.totalOrders || 0
      acc.sxSaiNgay += row.sxSaiNgay || 0
      acc.truotKh += row.truotKh || 0
      acc.khopSl += row.khopSl || 0
      acc.khopJob += row.khopJob || 0
      acc.totalPlanQty += row.totalPlanQty || 0
      acc.totalActualQty += row.totalActualQty || 0
      return acc
    },
    {
      totalOrders: 0,
      sxSaiNgay: 0,
      truotKh: 0,
      khopSl: 0,
      khopJob: 0,
      totalPlanQty: 0,
      totalActualQty: 0
    }
  )

  const grandKhopTotal = grandTotal.khopSl + grandTotal.khopJob
  const grandPassBenchmarkRate =
    grandTotal.totalOrders > 0
      ? Number(((grandKhopTotal / grandTotal.totalOrders) * 100).toFixed(1))
      : 0
  const grandProgressRate =
    grandTotal.totalPlanQty > 0
      ? Number(((grandTotal.totalActualQty / grandTotal.totalPlanQty) * 100).toFixed(1))
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
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>1. THEO PIC ĐIỀU PHỐI (HIỆU QUẢ THEO TỪNG NGƯỜI ĐIỀU PHỐI)</span>
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
            Bảng theo dõi và biểu đồ phân tích năng lực điều hành chi tiết theo{' '}
            <b>{picBreakdown.length} nhân sự điều phối (PIC)</b> tại {plantName || 'Nhà máy'}, bao
            gồm khối lượng lệnh, tỷ lệ lệch ngày, tỷ lệ trượt và tỷ lệ đạt chuẩn.
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
            title="Bật/tắt xem bảng tổng hợp số liệu theo PIC"
          >
            <TableProperties
              size={13}
              className={isTableVisible ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{isTableVisible ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* Khung Biểu đồ Phân tích PIC */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '16px'
        }}
      >
        {/* Mode switcher bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              {currentMode === 'rate'
                ? 'Biểu đồ Tỷ lệ cơ cấu trạng thái điều phối theo PIC (%)'
                : currentMode === 'pass'
                  ? 'Xếp hạng Tỷ lệ đạt chuẩn điều phối (Benchmark 20%)'
                  : 'Cơ cấu khối lượng và trạng thái điều phối theo từng PIC (Lệnh)'}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              {currentMode === 'rate'
                ? 'So sánh tương quan tỷ lệ % Đạt chuẩn, Lệch ngày và Trượt kế hoạch của từng nhân sự'
                : currentMode === 'pass'
                  ? 'Đánh giá tỷ lệ lệnh đạt chuẩn (Khớp SL + Khớp Job) so với mục tiêu 20%'
                  : 'Khối lượng lệnh phân bổ theo: Khớp job, Khớp SL, SX sai ngày và Trượt kế hoạch'}
            </div>
          </div>

          <div className="screenshot-hide">
            <Tabs value={currentMode} onValueChange={handleModeChange} className="w-auto">
              <TabsList variant="line">
                <TabsTrigger value="volume" variant="line">
                  Khối lượng (Lệnh)
                </TabsTrigger>
                <TabsTrigger value="rate" variant="line">
                  Tỷ lệ cơ cấu (%)
                </TabsTrigger>
                <TabsTrigger value="pass" variant="line">
                  Xếp hạng Đạt chuẩn (%)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Chart View */}
        <div style={{ height: Math.max(300, picBreakdown.length * 48 + 70), width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {currentMode === 'rate' ? (
              <BarChart
                layout="vertical"
                data={[...picBreakdown].map((r) => ({ ...r, name: r.pic }))}
                margin={{ top: 10, right: 30, left: 16, bottom: 10 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }}
                  width={130}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip unit="%" />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11.5, fontWeight: 700 }}
                />
                <Bar
                  dataKey="khopSlRate"
                  name="Khớp số lượng (%)"
                  stackId="picRate"
                  fill="#01411b"
                />
                <Bar
                  dataKey="khopJobRate"
                  name="Khớp job (%)"
                  stackId="picRate"
                  fill="#059669"
                />
                <Bar
                  dataKey="sxSaiNgayRate"
                  name="SX sai ngày KH (%)"
                  stackId="picRate"
                  fill="#ea580c"
                />
                <Bar
                  dataKey="truotKhRate"
                  name="Trượt KH (%)"
                  stackId="picRate"
                  fill="#dc2626"
                />
              </BarChart>
            ) : currentMode === 'pass' ? (
              <BarChart
                layout="vertical"
                data={[...picBreakdown].map((r) => ({
                  ...r,
                  name: r.pic,
                  passRateVal: r.passBenchmarkRate || 0
                }))}
                margin={{ top: 10, right: 40, left: 16, bottom: 10 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  domain={[0, (dataMax) => Math.max(30, Math.ceil(dataMax * 1.15))]}
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }}
                  width={130}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip unit="%" />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11.5, fontWeight: 700 }}
                />
                <ReferenceLine
                  x={20}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Mục tiêu: 20%',
                    position: 'top',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
                <Bar
                  dataKey="passRateVal"
                  name="Tỷ lệ đạt chuẩn (%)"
                  fill="#01411b"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            ) : (
              <BarChart
                layout="vertical"
                data={[...picBreakdown].map((r) => ({ ...r, name: r.pic }))}
                margin={{ top: 10, right: 40, left: 16, bottom: 10 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => v.toLocaleString('vi-VN')}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }}
                  width={130}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip unit=" LSX" />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 11.5, fontWeight: 700 }}
                />
                <Bar
                  dataKey="khopSl"
                  name="Khớp số lượng"
                  stackId="picVolume"
                  fill="#01411b"
                />
                <Bar
                  dataKey="khopJob"
                  name="Khớp job"
                  stackId="picVolume"
                  fill="#059669"
                />
                <Bar
                  dataKey="sxSaiNgay"
                  name="SX sai ngày KH"
                  stackId="picVolume"
                  fill="#ea580c"
                />
                <Bar
                  dataKey="truotKh"
                  name="Trượt KH"
                  stackId="picVolume"
                  fill="#dc2626"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bảng Gom nhóm theo PIC Điều phối */}
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
                  Nhân sự PIC
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
                  Tổng lệnh (LSX)
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#01411b',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Khớp SL
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#059669',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Khớp Job
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#ea580c',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Sai ngày KH
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    fontWeight: 700,
                    color: '#dc2626',
                    fontSize: 12,
                    textAlign: 'right',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}
                >
                  Trượt KH
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
                  Đạt chuẩn (%)
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
                  Tiến độ SL (%)
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
                  Đánh giá
                </th>
              </tr>
            </thead>
            <tbody>
              {picBreakdown.map((row, idx) => {
                const isSelected = selectedPic === row.pic
                const isGood = row.passBenchmarkRate >= 20 || row.khopSlRate >= 50

                return (
                  <tr
                    key={idx}
                    onClick={() =>
                      onSelectPic && onSelectPic(row.pic === selectedPic ? 'ALL' : row.pic)
                    }
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
                    title={onSelectPic ? `Nhấp để lọc nhanh theo PIC: ${row.pic}` : undefined}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>
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
                        <span>{row.pic || 'Chưa phân công'}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {Number(row.totalOrders || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#01411b'
                      }}
                    >
                      {Number(row.khopSl || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#059669'
                      }}
                    >
                      {Number(row.khopJob || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: Number(row.sxSaiNgay) > 0 ? '#ea580c' : '#64748b'
                      }}
                    >
                      {Number(row.sxSaiNgay || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: Number(row.truotKh) > 0 ? '#dc2626' : '#64748b'
                      }}
                    >
                      {Number(row.truotKh || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: isGood ? '#01411b' : '#d97706'
                      }}
                    >
                      {row.passBenchmarkRate}%
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                    >
                      {row.progressRate}%
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          row.passBenchmarkRate >= 20
                            ? '#01411b'
                            : row.passBenchmarkRate >= 10
                              ? '#059669'
                              : '#ea580c'
                      }}
                    >
                      {row.passBenchmarkRate >= 20
                        ? 'Đạt benchmark'
                        : row.passBenchmarkRate >= 10
                          ? 'Khá'
                          : 'Cần cải thiện'}
                    </td>
                  </tr>
                )
              })}

              {/* Dòng Tổng Cộng */}
              {picBreakdown.length > 0 && (
                <tr
                  style={{
                    borderTop: '2px solid #0f172a',
                    background: '#f1f5f9',
                    fontWeight: 800
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#0f172a' }}>
                    TỔNG CỘNG ({picBreakdown.length} PIC)
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>
                    {grandTotal.totalOrders.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                    {grandTotal.khopSl.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>
                    {grandTotal.khopJob.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ea580c' }}>
                    {grandTotal.sxSaiNgay.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>
                    {grandTotal.truotKh.toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                    {grandPassBenchmarkRate}%
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>
                    {grandProgressRate}%
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#01411b' }}>
                    {grandPassBenchmarkRate >= 20 ? 'Đạt chuẩn' : 'Chưa đạt 20%'}
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

export default PlanPicAnalysisSection
