/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'

export function AutoExportSection({
  kpiMetrics,
  missingAutoExportTickets = [],
  showAutoExportTable,
  setShowAutoExportTable,
  plantName
}) {
  const [activeTab, setActiveTab] = useState('breakdown') // 'breakdown' | 'missing_list'
  const [missingSearchText, setMissingSearchText] = useState('')
  const [copiedNotification, setCopiedNotification] = useState(false)

  const totalTickets = kpiMetrics.totalTickets || 0
  const autoExportCount = Number(kpiMetrics.autoExportCount || 0)
  const noAutoExportCount = Number(kpiMetrics.noAutoExportCount || 0)
  const noMaterialCount = Number(kpiMetrics.noMaterialAutoIoCount || 0)
  const totalApplicable =
    kpiMetrics.totalApplicableAutoIo || autoExportCount + noAutoExportCount || totalTickets

  const filteredMissingTickets = useMemo(() => {
    if (!missingSearchText.trim()) return missingAutoExportTickets
    const q = missingSearchText.toLowerCase().trim()
    return missingAutoExportTickets.filter((t) => {
      return (
        String(t.ticketNo || '')
          .toLowerCase()
          .includes(q) ||
        String(t.docNo || '')
          .toLowerCase()
          .includes(q) ||
        String(t.orderNo || '')
          .toLowerCase()
          .includes(q) ||
        String(t.itemCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.itemName || '')
          .toLowerCase()
          .includes(q) ||
        String(t.team || '')
          .toLowerCase()
          .includes(q) ||
        String(t.machineCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.regCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.autoExportType || '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [missingAutoExportTickets, missingSearchText])

  const handleCopyMissingList = () => {
    if (filteredMissingTickets.length === 0) return
    const headers = ['STT', 'Ngày SX', 'Số phiếu / WO', 'Trạng thái chứng từ', 'Nguồn dữ liệu']
    const rows = filteredMissingTickets.map((t, idx) => [
      idx + 1,
      t.prodDate || t.date || t.StatDate || '',
      t.ticketNo || t.docNo || '',
      t.autoExportType || 'Chưa sinh chứng từ',
      `${t.source || 'MES'}${t.pic ? ' - ' + t.pic : ''}`
    ])
    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedNotification(true)
      setTimeout(() => setCopiedNotification(false), 2000)
    })
  }

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
            <span>4. THỐNG KÊ PHÂN BỔ LOẠI CHỨNG TỪ XUẤT/NHẬP TỰ ĐỘNG</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#475569',
              marginTop: 4,
              lineHeight: 1.5
            }}
          >
            Liên kết tự động xuất/nhập kho trên <b>{totalTickets.toLocaleString('vi-VN')} phiếu</b>{' '}
            ({plantName || 'Nhà máy'}).
            <span style={{ marginLeft: 6 }}>
              Tỷ lệ tự động: <b style={{ color: '#01411b' }}>{kpiMetrics.autoExportRate}%</b> (
              {autoExportCount.toLocaleString('vi-VN')} / {totalApplicable.toLocaleString('vi-VN')}{' '}
              phiếu áp dụng) • Chưa sinh/thiếu:{' '}
              <b style={{ color: '#dc2626' }}>
                {noAutoExportCount.toLocaleString('vi-VN')} phiếu ({kpiMetrics.noAutoExportRate}%)
              </b>
              {noMaterialCount > 0 && (
                <span>
                  {' '}
                  • Không NVL: <b>{noMaterialCount.toLocaleString('vi-VN')}</b>
                </span>
              )}
              .
            </span>
          </div>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAutoExportTable(!showAutoExportTable)}
            className={`uppercase text-[11px] font-semibold ${
              showAutoExportTable
                ? 'text-blue-700 hover:text-blue-800'
                : 'text-slate-600 hover:text-slate-800'
            }`}
            title="Bật/tắt xem bảng chi tiết chứng từ"
          >
            <TableProperties
              size={13}
              className={showAutoExportTable ? 'text-blue-600' : 'text-slate-500'}
            />
            <span>{showAutoExportTable ? 'Đóng bảng chi tiết' : 'Mở bảng chi tiết'}</span>
          </Button>
        </div>
      </div>

      {/* View Tabs Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 10
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val)
            if (val === 'missing_list' && !showAutoExportTable) {
              setShowAutoExportTable(true)
            }
          }}
          className="w-auto"
        >
          <TabsList variant="line">
            <TabsTrigger value="breakdown" variant="line">
              Biểu đồ phân bổ loại
            </TabsTrigger>
            <TabsTrigger value="missing_list" variant="line">
              Danh sách phiếu chưa có XNTĐ
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Công thức tính vắn tắt */}
        <div style={{ fontSize: 11.5, color: '#64748b' }}>
          CT: <b>(Đã sinh / Tổng áp dụng)</b> = {autoExportCount}/{totalApplicable} ={' '}
          <b>{kpiMetrics.autoExportRate}%</b>
        </div>
      </div>

      {/* TAB 1: BIỂU ĐỒ & BẢNG PHÂN BỔ LOẠI CHỨNG TỪ */}
      {activeTab === 'breakdown' && (
        <div>
          {/* Biểu đồ phân bổ loại chứng từ tự động */}
          <div
            style={{
              width: '100%',
              height: Math.max(240, (kpiMetrics.autoExportBreakdown?.length || 5) * 42 + 40),
              border: '1px solid #e2e8f0',
              padding: '12px 16px 12px 6px',
              background: '#ffffff'
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={kpiMetrics.autoExportBreakdown}
                layout="vertical"
                margin={{ top: 10, right: 60, left: 135, bottom: 10 }}
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
                  dataKey="label"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  tickLine={true}
                  fontSize={11.5}
                  tick={({ x, y, payload }) => {
                    const label = payload?.value || ''
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={-8}
                          y={4}
                          textAnchor="end"
                          fill="#0f172a"
                          fontWeight={600}
                          fontSize={11.5}
                        >
                          {label}
                        </text>
                      </g>
                    )
                  }}
                  width={130}
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
                            {d.label}
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
                          <div>
                            Đánh giá:{' '}
                            <b
                              style={{
                                color: d.isMissing
                                  ? '#fca5a5'
                                  : d.isNoMaterial
                                    ? '#cbd5e1'
                                    : '#a7f3d0'
                              }}
                            >
                              {d.isMissing
                                ? 'Chưa sinh / Thiếu phiếu'
                                : d.isNoMaterial
                                  ? 'Không sử dụng NVL'
                                  : 'Đã sinh / Hợp lệ'}
                            </b>
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
                  {kpiMetrics.autoExportBreakdown &&
                    kpiMetrics.autoExportBreakdown.map((entry, index) => (
                      <Cell key={`cell-auto-${index}`} fill={entry.color || '#01411b'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bảng Gom nhóm phân bổ loại chứng từ tự động Phong Cách OpenAI Technical Table */}
          {showAutoExportTable && (
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
                      Loại trạng thái chứng từ tự động
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
                      Đánh giá KPI
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
                      Tỷ lệ chiếm (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kpiMetrics.autoExportBreakdown &&
                    kpiMetrics.autoExportBreakdown.map((row, idx) => {
                      const isMissing = row.isMissing
                      const isNoMaterial = row.isNoMaterial
                      return (
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
                                background:
                                  row.color ||
                                  (isMissing ? '#dc2626' : isNoMaterial ? '#94a3b8' : '#01411b'),
                                display: 'inline-block',
                                flexShrink: 0
                              }}
                            />
                            {row.label}
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: isMissing ? '#dc2626' : isNoMaterial ? '#64748b' : '#059669'
                            }}
                          >
                            {isMissing
                              ? 'Chưa sinh / Thiếu phiếu'
                              : isNoMaterial
                                ? 'Không sử dụng NVL'
                                : 'Đã sinh / Hợp lệ'}
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
                      )
                    })}
                  <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                    <td
                      colSpan={2}
                      style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}
                    >
                      TỔNG CỘNG ({kpiMetrics.autoExportBreakdown?.length || 0} LOẠI)
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
      )}

      {/* TAB 2: DANH SÁCH CHI TIẾT CÁC PHIẾU CHƯA CÓ / THIẾU CHỨNG TỪ XK/NK TỰ ĐỘNG (OPENAI TECHNICAL TABLE) */}
      {activeTab === 'missing_list' && (
        <div style={{ width: '100%', marginTop: 12 }}>
          {/* Controls Bar for Missing List */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
              <input
                type="text"
                placeholder="Tìm theo số phiếu, LSX, mã hàng, tên hàng, tổ SX..."
                value={missingSearchText}
                onChange={(e) => setMissingSearchText(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 3,
                  outline: 'none',
                  width: '100%',
                  maxWidth: 360,
                  background: '#ffffff',
                  color: '#0f172a'
                }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Hiển thị <b>{filteredMissingTickets.length.toLocaleString('vi-VN')}</b> /{' '}
                {missingAutoExportTickets.length.toLocaleString('vi-VN')} phiếu
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMissingList}
                className={`h-7 text-[11.5px] font-semibold ${
                  copiedNotification
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {copiedNotification ? '✓ Đã sao chép DS' : 'Sao chép DS phiếu'}
              </Button>
            </div>
          </div>

          {/* Bảng Phong Cách OpenAI Technical Table */}
          <div
            style={{
              width: '100%',
              maxHeight: 460,
              overflowY: 'auto',
              overflowX: 'auto',
              borderTop: '2px solid #0f172a',
              borderBottom: '2px solid #0f172a',
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
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f8fafc',
                  zIndex: 2,
                  borderBottom: '1px solid #0f172a'
                }}
              >
                <tr style={{ background: '#f8fafc' }}>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      width: 50
                    }}
                  >
                    STT
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      width: 120
                    }}
                  >
                    Ngày SX
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      width: 180
                    }}
                  >
                    Số phiếu / WO
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      width: 220
                    }}
                  >
                    Trạng thái chứng từ
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
                    Nguồn dữ liệu
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMissingTickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '28px 12px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontStyle: 'italic',
                        fontSize: 12
                      }}
                    >
                      {missingAutoExportTickets.length === 0
                        ? 'Tuyệt vời! Không có phiếu nào bị thiếu chứng từ xuất/nhập tự động.'
                        : 'Không tìm thấy phiếu nào phù hợp với từ khóa tìm kiếm.'}
                    </td>
                  </tr>
                ) : (
                  filteredMissingTickets.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                        transition: 'background 0.12s ease'
                      }}
                    >
                      <td style={{ padding: '9px 12px', color: '#64748b', fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '9px 12px', color: '#334155' }}>
                        {row.prodDate || row.date || row.StatDate || '-'}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>
                        <div>{row.ticketNo || row.docNo || '-'}</div>
                        {row.regCode && row.regCode !== row.ticketNo && (
                          <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 400 }}>
                            {row.regCode}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#dc2626',
                            fontSize: 11.5
                          }}
                        >
                          {row.autoExportType || 'Chưa sinh chứng từ'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 11.5, color: '#475569' }}>
                        <div>
                          {row.source || 'MES'}
                          {row.pic ? ` - ${row.pic}` : ''}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {filteredMissingTickets.length > 0 && (
                  <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                    <td
                      colSpan={3}
                      style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}
                    >
                      TỔNG CỘNG ({filteredMissingTickets.length.toLocaleString('vi-VN')} PHIẾU CHƯA
                      CÓ XNTĐ)
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        padding: '10px 12px',
                        color: '#dc2626',
                        fontWeight: 700,
                        fontSize: 11.5
                      }}
                    >
                      Cần kiểm tra đối soát dữ liệu xuất/nhập tự động
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
