/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect } from 'react'
import { Download, Copy, Search, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { PureButton, PureSelect } from './reportUIComponents'

// Modal Đối Soát Thời Gian Chạy Máy (Layout màu trắng tối giản, tinh tế)
export const RuntimeAuditDetailModal = ({
  isOpen,
  onClose,
  initialCategory = 'ALL',
  data = [],
  plantName = '',
  maskText = (t) => t
}) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory || 'ALL')
      setSearchQuery('')
      setSelectedTeam('ALL')
      setSelectedMachine('ALL')
    }
  }, [isOpen, initialCategory])

  // Lấy danh sách tổ & máy duy nhất
  const teamOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      const t = item.TeamName || item.teamName || item.OpTypeName || item.opTypeName
      if (t) set.add(String(t).trim())
    })
    return Array.from(set).sort()
  }, [data])

  const machineOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      const m = item.MachineCode || item.machineCode
      if (m) set.add(String(m).trim())
    })
    return Array.from(set).sort()
  }, [data])

  // Chuẩn hóa dữ liệu từng dòng
  const classifiedData = useMemo(() => {
    return data.map((item, idx) => {
      const ticketNo =
        item.StatTicketNo ||
        item.statTicketNo ||
        item.ticketCode ||
        item.ticketNo ||
        item.RegCode ||
        `P-${idx + 1}`
      const orderNo =
        item.OperationNo ||
        item.operationNo ||
        item.RoutingDocNo ||
        item.routingDocNo ||
        item.docNo ||
        item.orderCode ||
        ''
      const machineCode = item.MachineCode || item.machineCode || item.MachineId || ''
      const machineName =
        item.MachineName || item.machineName || item.WorkCenter || item.workCenter || machineCode
      const teamName =
        item.TeamName ||
        item.teamName ||
        item.OpTypeName ||
        item.opTypeName ||
        item.SectionName ||
        ''

      const startDate =
        item.StartDate ||
        item.startDate ||
        item.StatDate ||
        item.statDate ||
        item.prodDate ||
        item.date ||
        ''
      const startTime = item.StartTime || item.startTime || item.createdTime || ''
      const endDate =
        item.EndDate ||
        item.endDate ||
        item.StatDate ||
        item.statDate ||
        item.prodDate ||
        item.date ||
        startDate ||
        ''
      const endTime = item.EndTime || item.endTime || item.syncTime || ''

      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0
      const runtimeH = Number(item.runtimeHours || durMin / 60 || 0)
      const actual = Number(item.ProdQty || item.prodQty || item.actualQty || item.output || 0)
      const pass = Number(item.PassQty || item.passQty || item.passQuantity || actual)
      const passRate = actual > 0 ? Number(((pass / actual) * 100).toFixed(1)) : 100
      const operator =
        item.MainWorker ||
        item.mainWorker ||
        item.operator ||
        item.StatStaff ||
        item.statStaff ||
        ''

      const isReversed = Boolean(
        item.isTimeReversed ||
        item.auditCategory === 'INVALID_TIME' ||
        item.timeError === 'REVERSED_TIME' ||
        (startDate &&
          endDate &&
          String(startDate).slice(0, 10) === String(endDate).slice(0, 10) &&
          startTime &&
          endTime &&
          String(endTime) < String(startTime))
      )

      let category = 'NORMAL'
      let auditText = 'Bình thường'

      if (isReversed) {
        category = 'INVALID_TIME'
        auditText = `Sai mốc giờ (${startTime} > ${endTime})`
      } else if (durMin < 5) {
        category = 'UNDER_5MIN'
        auditText = '< 5 phút'
      } else if (durMin > 720) {
        category = 'OVER_12H'
        auditText = '> 12 giờ'
      }

      return {
        ...item,
        ticketNo,
        orderNo,
        machineCode,
        machineName,
        teamName,
        startDate: String(startDate).slice(0, 10),
        startTime: String(startTime).trim(),
        endDate: String(endDate).slice(0, 10),
        endTime: String(endTime).trim(),
        runtimeH,
        durMin,
        actual,
        pass,
        passRate,
        operator,
        isTimeReversed: isReversed,
        auditCategory: category,
        auditText
      }
    })
  }, [data])

  // Đếm số lượng từng loại
  const categoryCounts = useMemo(() => {
    let all = classifiedData.length
    let invalidTime = 0
    let normal = 0
    let over12 = 0
    let under5 = 0

    classifiedData.forEach((d) => {
      if (d.auditCategory === 'INVALID_TIME') invalidTime++
      else if (d.auditCategory === 'NORMAL') normal++
      else if (d.auditCategory === 'OVER_12H') over12++
      else if (d.auditCategory === 'UNDER_5MIN') under5++
    })

    return { all, invalidTime, normal, over12, under5 }
  }, [classifiedData])

  // Lọc dữ liệu
  const filteredData = useMemo(() => {
    return classifiedData.filter((item) => {
      if (activeCategory !== 'ALL' && item.auditCategory !== activeCategory) return false
      if (selectedTeam !== 'ALL' && item.teamName !== selectedTeam) return false
      if (selectedMachine !== 'ALL' && item.machineCode !== selectedMachine) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          item.ticketNo.toLowerCase().includes(q) ||
          item.orderNo.toLowerCase().includes(q) ||
          item.machineCode.toLowerCase().includes(q) ||
          item.machineName.toLowerCase().includes(q) ||
          item.teamName.toLowerCase().includes(q) ||
          item.operator.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [classifiedData, activeCategory, selectedTeam, selectedMachine, searchQuery])

  // Xuất Excel
  const handleExportExcel = () => {
    try {
      const wsData = filteredData.map((item, idx) => ({
        STT: idx + 1,
        'Mã phiếu': item.ticketNo,
        'Lệnh SX / CT': item.orderNo,
        'Mã máy': item.machineCode,
        'Tên máy sản xuất': item.machineName,
        'Tổ sản xuất': item.teamName,
        'Ngày bắt đầu': item.startDate,
        'Giờ bắt đầu': item.startTime,
        'Ngày kết thúc': item.endDate,
        'Giờ kết thúc': item.endTime,
        'Giờ chạy (h)': Number(item.runtimeH.toFixed(2)),
        'SL Sản xuất': item.actual,
        'SL Đạt': item.pass,
        'Tỷ lệ đạt (%)': `${item.passRate}%`,
        'Cảnh báo / Đối soát': item.auditText,
        'Người thực hiện': item.operator
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'DoiSoatThoiGian')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `DoiSoat_ThoiGian_${plantName || 'GS'}_${dateStr}.xlsx`)
    } catch (err) {
      console.error('Export excel error:', err)
    }
  }

  // Sao chép TSV
  const handleCopyTSV = () => {
    try {
      const headers = [
        'STT',
        'Mã phiếu',
        'Lệnh SX',
        'Mã máy',
        'Tên máy',
        'Tổ SX',
        'Ngày BĐ',
        'Giờ BĐ',
        'Ngày KT',
        'Giờ KT',
        'Giờ chạy (h)',
        'SL SX',
        'SL Đạt',
        'Tỷ lệ (%)',
        'Cảnh báo',
        'Người làm'
      ]
      const rows = filteredData.map((item, idx) => [
        idx + 1,
        item.ticketNo,
        item.orderNo,
        item.machineCode,
        item.machineName,
        item.teamName,
        item.startDate,
        item.startTime,
        item.endDate,
        item.endTime,
        item.runtimeH.toFixed(2),
        item.actual,
        item.pass,
        `${item.passRate}%`,
        item.auditText,
        item.operator
      ])
      const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
      navigator.clipboard.writeText(tsvContent)
      alert(`Đã sao chép ${filteredData.length} dòng vào clipboard`)
    } catch (err) {
      console.error('Copy TSV error:', err)
    }
  }

  if (!isOpen) return null

  // Tổng hợp số liệu đang lọc
  const totalActual = filteredData.reduce((acc, d) => acc + d.actual, 0)
  const totalPass = filteredData.reduce((acc, d) => acc + d.pass, 0)
  const totalRuntime = filteredData.reduce((acc, d) => acc + d.runtimeH, 0)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: 'clamp(960px, 92vw, 1440px)',
          height: 'clamp(580px, 88vh, 860px)',
          maxHeight: '92vh',
          maxWidth: '96vw',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Trắng toàn bộ */}
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Đối soát thời gian bắt đầu & kết thúc phiếu sản xuất
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              Cơ sở: {plantName || 'Nhà máy'} • Hiển thị chi tiết ngày, giờ của từng phiếu
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar lọc đơn giản - Nền trắng */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            flexShrink: 0
          }}
        >
          {/* Nhóm tab lọc nhanh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveCategory('ALL')}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: activeCategory === 'ALL' ? 600 : 400,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeCategory === 'ALL' ? '#0f172a' : '#e2e8f0',
                background: activeCategory === 'ALL' ? '#f8fafc' : '#ffffff',
                color: activeCategory === 'ALL' ? '#0f172a' : '#64748b'
              }}
            >
              Tất cả ({categoryCounts.all})
            </button>

            {categoryCounts.invalidTime > 0 && (
              <button
                onClick={() => setActiveCategory('INVALID_TIME')}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: activeCategory === 'INVALID_TIME' ? 600 : 400,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: activeCategory === 'INVALID_TIME' ? '#dc2626' : '#fca5a5',
                  background: activeCategory === 'INVALID_TIME' ? '#fef2f2' : '#ffffff',
                  color: '#dc2626'
                }}
              >
                Sai mốc giờ ({categoryCounts.invalidTime})
              </button>
            )}

            <button
              onClick={() => setActiveCategory('NORMAL')}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: activeCategory === 'NORMAL' ? 600 : 400,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeCategory === 'NORMAL' ? '#0f172a' : '#e2e8f0',
                background: activeCategory === 'NORMAL' ? '#f8fafc' : '#ffffff',
                color: activeCategory === 'NORMAL' ? '#0f172a' : '#64748b'
              }}
            >
              Chuẩn (5p - 12h) ({categoryCounts.normal})
            </button>

            <button
              onClick={() => setActiveCategory('OVER_12H')}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: activeCategory === 'OVER_12H' ? 600 : 400,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeCategory === 'OVER_12H' ? '#0f172a' : '#e2e8f0',
                background: activeCategory === 'OVER_12H' ? '#f8fafc' : '#ffffff',
                color: activeCategory === 'OVER_12H' ? '#0f172a' : '#64748b'
              }}
            >
              &gt; 12 giờ ({categoryCounts.over12})
            </button>

            <button
              onClick={() => setActiveCategory('UNDER_5MIN')}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: activeCategory === 'UNDER_5MIN' ? 600 : 400,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeCategory === 'UNDER_5MIN' ? '#0f172a' : '#e2e8f0',
                background: activeCategory === 'UNDER_5MIN' ? '#f8fafc' : '#ffffff',
                color: activeCategory === 'UNDER_5MIN' ? '#0f172a' : '#64748b'
              }}
            >
              &lt; 5 phút ({categoryCounts.under5})
            </button>
          </div>

          {/* Lọc dropdown & Tìm kiếm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '3px 8px',
                width: 180
              }}
            >
              <Search size={13} color="#94a3b8" style={{ marginRight: 6 }} />
              <input
                type="text"
                placeholder="Tìm phiếu, máy, tổ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  width: '100%',
                  color: '#0f172a'
                }}
              />
            </div>

            <PureSelect
              value={selectedTeam}
              onChange={setSelectedTeam}
              options={[
                { value: 'ALL', label: 'Tất cả tổ' },
                ...teamOptions.map((t) => ({ value: t, label: t }))
              ]}
              style={{ width: 140 }}
            />

            <PureSelect
              value={selectedMachine}
              onChange={setSelectedMachine}
              options={[
                { value: 'ALL', label: 'Tất cả máy' },
                ...machineOptions.map((m) => ({ value: m, label: m }))
              ]}
              style={{ width: 140 }}
            />

            <button
              onClick={handleCopyTSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 12,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              <Copy size={13} />
              <span>Sao chép</span>
            </button>

            <button
              onClick={handleExportExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              <Download size={13} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Thanh tóm tắt số liệu */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '6px 18px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#475569',
            flexShrink: 0
          }}
        >
          <div>
            Hiển thị: <b style={{ color: '#0f172a' }}>{filteredData.length}</b> phiếu
            {categoryCounts.invalidTime > 0 && (
              <span style={{ marginLeft: 8, color: '#dc2626' }}>
                ({categoryCounts.invalidTime} phiếu sai mốc giờ)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>
              Tổng SL SX: <b style={{ color: '#0f172a' }}>{totalActual.toLocaleString('vi-VN')}</b>
            </span>
            <span>
              Tổng SL Đạt: <b style={{ color: '#0f172a' }}>{totalPass.toLocaleString('vi-VN')}</b>
            </span>
            <span>
              Tổng giờ: <b style={{ color: '#0f172a' }}>{totalRuntime.toFixed(1)}h</b>
            </span>
          </div>
        </div>

        {/* Bảng dữ liệu HTML thuần - Nền trắng sạch sẽ */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#ffffff'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              textAlign: 'left'
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: '#f8fafc',
                color: '#334155',
                borderBottom: '1px solid #cbd5e1'
              }}
            >
              <tr>
                <th
                  style={{
                    padding: '6px 6px',
                    textAlign: 'center',
                    width: 40,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    minWidth: 120,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Mã phiếu
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    minWidth: 110,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Lệnh SX
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    minWidth: 80,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Mã máy
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    minWidth: 140,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Tên máy
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    minWidth: 90,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Tổ SX
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    minWidth: 90,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Ngày BĐ
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    minWidth: 80,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Giờ BĐ
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    minWidth: 90,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Ngày KT
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    minWidth: 80,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Giờ KT
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    minWidth: 80,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Giờ chạy
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    minWidth: 85,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  SL SX
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'right',
                    minWidth: 85,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  SL Đạt
                </th>
                <th
                  style={{
                    padding: '6px 6px',
                    textAlign: 'right',
                    minWidth: 65,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Tỷ lệ
                </th>
                <th
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    minWidth: 160,
                    borderRight: '1px solid #e2e8f0',
                    fontWeight: 600
                  }}
                >
                  Cảnh báo
                </th>
                <th
                  style={{ padding: '6px 8px', textAlign: 'left', minWidth: 110, fontWeight: 600 }}
                >
                  Người làm
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}
                  >
                    Không có phiếu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const isErr = item.isTimeReversed
                  return (
                    <tr
                      key={item.ticketNo || idx}
                      style={{
                        background: '#ffffff',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff'
                      }}
                    >
                      <td
                        style={{
                          padding: '5px 6px',
                          textAlign: 'center',
                          color: '#94a3b8',
                          borderRight: '1px solid #f1f5f9'
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          fontWeight: 500,
                          color: '#0f172a',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.ticketNo}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          color: '#475569',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.orderNo || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          color: '#0f172a',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.machineCode || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          color: '#334155',
                          borderRight: '1px solid #f1f5f9'
                        }}
                      >
                        {maskText(item.machineName, 5)}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          color: '#475569',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.teamName || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'center',
                          color: '#334155',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.startDate || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'center',
                          color: isErr ? '#dc2626' : '#0f172a',
                          fontWeight: isErr ? 600 : 400,
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.startTime || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'center',
                          color: '#334155',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.endDate || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'center',
                          color: isErr ? '#dc2626' : '#0f172a',
                          fontWeight: isErr ? 600 : 400,
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.endTime || '-'}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'right',
                          fontWeight: 500,
                          color: isErr ? '#dc2626' : '#0f172a',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.runtimeH.toFixed(2)}h
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'right',
                          color: '#0f172a',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.actual.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          textAlign: 'right',
                          color: '#0f172a',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.pass.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '5px 6px',
                          textAlign: 'right',
                          color: '#334155',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.passRate}%
                      </td>
                      <td
                        style={{
                          padding: '5px 8px',
                          color: isErr ? '#dc2626' : '#64748b',
                          borderRight: '1px solid #f1f5f9',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.auditText}
                      </td>
                      <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {item.operator ? maskText(item.operator, 3) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer - Trắng đơn giản */}
        <div
          style={{
            padding: '8px 18px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}
        >
          <PureButton
            onClick={onClose}
            style={{
              padding: '4px 16px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155'
            }}
          >
            Đóng
          </PureButton>
        </div>
      </div>
    </div>
  )
}
