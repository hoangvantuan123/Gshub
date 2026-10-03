/* eslint-disable react/prop-types */
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  Cell,
  LabelList
} from 'recharts'
import { Eye, EyeOff, TableProperties } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { ExecutiveChartTooltip } from '../../hanoiGs1/stat/components/reportUIComponents'

export function MachineRuntimeSection({
  displayMachineList,
  machineGrandTotal,
  showMachineSummaryTable,
  setShowMachineSummaryTable,
  showManualMachines,
  setShowManualMachines,
  machineChartMode,
  setMachineChartMode,
  plantName,
  totalDays = 1,
  standardCapacityHours = 24
}) {
  const chartData = displayMachineList.map((m) => {
    const code = m.machineCode || m.machineName || 'M-UNKNOWN'
    const name = m.machineName || code
    const isOverCapacity = (m.runtimeHours || 0) > standardCapacityHours
    return {
      ...m,
      name: code,
      fullCode: code,
      fullName: name,
      machineCode: code,
      machineName: name,
      totalRuntimeHours: m.runtimeHours || 0,
      ticketCount: m.tickets || 0,
      fill: isOverCapacity ? '#d97706' : '#01411b'
    }
  })

  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
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
            <span>1. THỐNG KÊ TỔNG GIỜ CHẠY MÁY & PHÂN BỔ TẢI TRỌNG THEO CỤM MÁY</span>
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
            Thống kê tổng thời gian chạy máy (giờ) và số lượng phiếu thực hiện của{' '}
            <b>{displayMachineList.length} cụm máy / tổ sản xuất</b> ({plantName || 'Nhà máy'} — chu
            kỳ <b>{totalDays} ngày</b>, định mức trần 24h/ngày ={' '}
            <b>{standardCapacityHours.toLocaleString('vi-VN')}h</b>). Biểu đồ cung cấp góc nhìn trực
            quan về tổng giờ chạy máy tích lũy, phân bổ tải trọng và mối tương quan giữa khối lượng
            thao tác với thời gian vận hành giữa các thiết bị.
          </div>
        </div>

        {/* Nút lọc & Switcher chuẩn shadcn/ui Tabs (line) & Action buttons */}
        <div
          className="screenshot-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 2
          }}
        >
          {/* Tabs line chuẩn shadcn/ui cho chế độ biểu đồ */}
          <Tabs
            value={machineChartMode}
            onValueChange={(val) => setMachineChartMode(val)}
            className="w-auto"
          >
            <TabsList variant="line">
              <TabsTrigger value="runtime" variant="line">
                Tổng giờ chạy máy (h)
              </TabsTrigger>
              <TabsTrigger value="composed" variant="line">
                Giờ chạy &amp; Số phiếu
              </TabsTrigger>
              <TabsTrigger value="tickets" variant="line">
                Số phiếu theo máy
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-slate-300">|</span>

          {/* Action Button: Bật / tắt máy thủ công (không viền, chuẩn action button) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualMachines(!showManualMachines)}
            className={`uppercase text-[11px] font-semibold ${
              showManualMachines
                ? 'text-emerald-700 hover:text-emerald-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Mặc định ẩn các máy/tổ thủ công. Bấm để hiển thị hoặc ẩn máy thủ công."
          >
            {showManualMachines ? (
              <Eye size={13} className="text-emerald-600" />
            ) : (
              <EyeOff size={13} className="text-slate-400" />
            )}
            <span>{showManualMachines ? 'Đang hiện máy thủ công' : 'Hiện máy thủ công'}</span>
          </Button>

          {/* Action Button: Mở / đóng bảng số liệu (không viền, chuẩn action button) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMachineSummaryTable(!showMachineSummaryTable)}
            className={`uppercase text-[11px] font-semibold ${
              showMachineSummaryTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng tổng hợp số liệu"
          >
            <TableProperties
              size={13}
              className={showMachineSummaryTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showMachineSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
          </Button>
        </div>
      </div>

      {/* Khung biểu đồ */}
      <div
        style={{
          width: '100%',
          height: 'clamp(440px, 50vh, 520px)',
          border: '1px solid #e2e8f0',
          padding: '20px 20px 10px 0',
          background: '#ffffff'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {machineChartMode === 'runtime' ? (
            <BarChart data={chartData} margin={{ top: 25, right: 25, left: 10, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={75}
                fontSize={11}
                tick={{ fill: '#0f172a', fontWeight: 600, dy: 6, dx: -2 }}
              />
              <YAxis
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={11}
                domain={[
                  0,
                  (dataMax) =>
                    Math.max(
                      standardCapacityHours + Math.ceil(standardCapacityHours * 0.1),
                      Math.ceil(dataMax * 1.15)
                    )
                ]}
                tick={{ fill: '#334155' }}
                tickFormatter={(v) => `${v}h`}
                label={{
                  value: 'Tổng giờ chạy máy (h)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 12,
                  fill: '#334155',
                  fontSize: 12,
                  fontWeight: 700
                }}
              />
              <ReferenceLine
                y={standardCapacityHours}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Mức trần 24h/ngày (${standardCapacityHours.toLocaleString('vi-VN')}h / ${totalDays} ngày)`,
                  position: 'top',
                  fill: '#dc2626',
                  fontSize: 11,
                  fontWeight: 700
                }}
              />
              <RechartsTooltip content={<ExecutiveChartTooltip unit="h" />} />
              <Bar
                dataKey="totalRuntimeHours"
                name="Tổng giờ chạy máy"
                activeBar={false}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="totalRuntimeHours"
                  position="top"
                  fill="#0f172a"
                  fontSize={10}
                  fontWeight={700}
                  formatter={(v) => (v > 0 ? `${v}h` : '')}
                />
                {chartData.map((entry, index) => (
                  <Cell key={`cell-v-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          ) : machineChartMode === 'composed' ? (
            <ComposedChart data={chartData} margin={{ top: 25, right: 50, left: 15, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={75}
                fontSize={11}
                tick={{ fill: '#0f172a', fontWeight: 600, dy: 6, dx: -2 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={11}
                domain={[
                  0,
                  (dataMax) =>
                    Math.max(
                      standardCapacityHours + Math.ceil(standardCapacityHours * 0.1),
                      Math.ceil(dataMax * 1.15)
                    )
                ]}
                tick={{ fill: '#01411b', fontWeight: 600 }}
                tickFormatter={(v) => `${v}h`}
                label={{
                  value: 'Tổng giờ chạy máy (h)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 12,
                  fill: '#01411b',
                  fontSize: 12,
                  fontWeight: 700
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={11}
                tick={{ fill: '#d97706', fontWeight: 600 }}
                label={{
                  value: 'Số lượng phiếu (phiếu)',
                  angle: 90,
                  position: 'insideRight',
                  offset: 15,
                  fill: '#d97706',
                  fontSize: 12,
                  fontWeight: 700
                }}
              />
              <ReferenceLine
                yAxisId="left"
                y={standardCapacityHours}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Mức trần (${standardCapacityHours.toLocaleString('vi-VN')}h)`,
                  position: 'top',
                  fill: '#dc2626',
                  fontSize: 11,
                  fontWeight: 700
                }}
              />
              <RechartsTooltip content={<ExecutiveChartTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
              />
              <Bar
                yAxisId="left"
                dataKey="totalRuntimeHours"
                name="Tổng giờ chạy máy (h)"
                fill="#01411b"
                barSize={20}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="totalRuntimeHours"
                  position="top"
                  fill="#01411b"
                  fontSize={10}
                  fontWeight={700}
                  formatter={(v) => (v > 0 ? `${v}h` : '')}
                />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ticketCount"
                name="Số phiếu (phiếu)"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#d97706' }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="ticketCount"
                  position="top"
                  fill="#d97706"
                  fontSize={10}
                  fontWeight={700}
                  formatter={(v) => (v > 0 ? `${v}` : '')}
                />
              </Line>
            </ComposedChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 25, right: 25, left: 10, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={75}
                fontSize={11}
                tick={{ fill: '#0f172a', fontWeight: 600, dy: 6, dx: -2 }}
              />
              <YAxis
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={11}
                tick={{ fill: '#334155' }}
                label={{
                  value: 'Số lượng phiếu (phiếu)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 12,
                  fill: '#334155',
                  fontSize: 12,
                  fontWeight: 700
                }}
              />
              <RechartsTooltip content={<ExecutiveChartTooltip unit=" phiếu" />} />
              <Bar
                dataKey="ticketCount"
                name="Số phiếu thống kê"
                fill="#01411b"
                barSize={20}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="ticketCount"
                  position="top"
                  fill="#01411b"
                  fontSize={10}
                  fontWeight={700}
                  formatter={(v) => (v > 0 ? `${v} phiếu` : '')}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Bảng Gom nhóm theo Cụm Máy Phong Cách OpenAI Technical Table */}
      {showMachineSummaryTable && (
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
                  Mã & Cụm máy sản xuất
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
                  Giờ chạy (h)
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
                  % Tải chu kỳ ({totalDays}N)
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
                  Tốc độ (SP/h)
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
              </tr>
            </thead>
            <tbody>
              {displayMachineList.map((row, idx) => {
                const runtimeHours = Number(row.runtimeHours || 0)
                const actualQty = Number(row.actualQty || 0)
                const speed = runtimeHours > 0 ? Math.round(actualQty / runtimeHours) : 0
                const loadPercent =
                  standardCapacityHours > 0
                    ? ((runtimeHours / standardCapacityHours) * 100).toFixed(1)
                    : '0.0'
                const isOverCapacity = runtimeHours > standardCapacityHours

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 1 ? '#fafafa' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {row.machineCode}
                      {row.machineName && row.machineName !== row.machineCode && (
                        <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                          ({row.machineName})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{row.team || '-'}</td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {Number(row.tickets || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: isOverCapacity ? '#d97706' : '#01411b'
                      }}
                    >
                      {runtimeHours.toLocaleString('vi-VN', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      })}
                      h
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: isOverCapacity ? '#d97706' : '#0f172a'
                      }}
                    >
                      {loadPercent}%
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {actualQty.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#01411b'
                      }}
                    >
                      {Number(row.passQty || 0).toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#475569'
                      }}
                    >
                      {speed > 0 ? `${speed.toLocaleString('vi-VN')} SP/h` : '-'}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: (row.passRate || 0) >= 95 ? '#01411b' : '#dc2626'
                      }}
                    >
                      {row.passRate}%
                    </td>
                  </tr>
                )
              })}

              {/* Dòng TỔNG CỘNG */}
              {machineGrandTotal && (
                <tr
                  style={{
                    borderTop: '2px solid #0f172a',
                    borderBottom: '2px solid #0f172a',
                    background: '#f8fafc'
                  }}
                >
                  <td
                    colSpan={2}
                    style={{
                      padding: '10px 12px',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontSize: 12.5
                    }}
                  >
                    TỔNG CỘNG ({displayMachineList.length} MÁY)
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {(
                      machineGrandTotal.tickets ??
                      machineGrandTotal.totalTickets ??
                      0
                    ).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#01411b'
                    }}
                  >
                    {Number(
                      machineGrandTotal.runtimeHours ?? machineGrandTotal.totalRuntime ?? 0
                    ).toLocaleString('vi-VN', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1
                    })}
                    h
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {machineGrandTotal.runtimeVsCapacity != null
                      ? machineGrandTotal.runtimeVsCapacity
                      : displayMachineList.length > 0 && standardCapacityHours > 0
                        ? (
                            (Number(
                              machineGrandTotal.runtimeHours ?? machineGrandTotal.totalRuntime ?? 0
                            ) /
                              (displayMachineList.length * standardCapacityHours)) *
                            100
                          ).toFixed(1)
                        : '0.0'}
                    %
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {(
                      machineGrandTotal.actualQty ??
                      machineGrandTotal.totalActual ??
                      0
                    ).toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#01411b'
                    }}
                  >
                    {(machineGrandTotal.passQty ?? machineGrandTotal.totalPass ?? 0).toLocaleString(
                      'vi-VN'
                    )}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#475569'
                    }}
                  >
                    {(machineGrandTotal.speedPerHour ?? machineGrandTotal.avgSpeed)
                      ? `${Number(machineGrandTotal.speedPerHour ?? machineGrandTotal.avgSpeed).toLocaleString('vi-VN')} SP/h`
                      : '-'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 900,
                      color: '#01411b'
                    }}
                  >
                    {machineGrandTotal.passRate ?? machineGrandTotal.avgPassRate ?? 100}%
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
