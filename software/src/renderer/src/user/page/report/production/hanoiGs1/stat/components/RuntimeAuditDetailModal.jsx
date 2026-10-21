/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Download, Copy, Search, X } from 'lucide-react'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import * as XLSX from 'xlsx'
import { PureButton, PureSelect, executiveGridTheme } from './reportUIComponents'

const AUDIT_COLUMNS = [
  { id: 'stt', title: 'STT', width: 50 },
  { id: 'ticketNo', title: 'Mã phiếu', width: 140 },
  { id: 'orderNo', title: 'Lệnh SX', width: 130 },
  { id: 'machineCode', title: 'Mã máy', width: 100 },
  { id: 'machineName', title: 'Tên máy', width: 180 },
  { id: 'teamName', title: 'Tổ SX', width: 120 },
  { id: 'startDate', title: 'Ngày BĐ', width: 110 },
  { id: 'startTime', title: 'Giờ BĐ', width: 100 },
  { id: 'endDate', title: 'Ngày KT', width: 110 },
  { id: 'endTime', title: 'Giờ KT', width: 100 },
  { id: 'runtimeH', title: 'Giờ chạy', width: 100 },
  { id: 'actual', title: 'SL SX', width: 110 },
  { id: 'pass', title: 'SL Đạt', width: 110 },
  { id: 'passRate', title: 'Tỷ lệ', width: 80 },
  { id: 'auditText', title: 'Cảnh báo', width: 220 },
  { id: 'operator', title: 'Người làm', width: 160 }
]

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
  const [columnWidths, setColumnWidths] = useState({})
  const [columnOrder, setColumnOrder] = useState(() => AUDIT_COLUMNS.map((column) => column.id))
  const [hiddenColumns, setHiddenColumns] = useState([])

  const columns = useMemo(
    () =>
      columnOrder
        .filter((id) => !hiddenColumns.includes(id))
        .map((id) => {
          const column = AUDIT_COLUMNS.find((item) => item.id === id)
          return { ...column, width: columnWidths[id] ?? column.width }
        }),
    [columnOrder, hiddenColumns, columnWidths]
  )

  const onColumnResize = useCallback((column, width) => {
    setColumnWidths((previous) => ({ ...previous, [column.id]: width }))
  }, [])

  const onColumnMoved = useCallback(
    (startIndex, endIndex) => {
      const sourceId = columns[startIndex]?.id
      const targetId = columns[endIndex]?.id
      if (!sourceId || !targetId || sourceId === targetId) return
      setColumnOrder((previous) => {
        const next = [...previous]
        const sourceIndex = next.indexOf(sourceId)
        const targetIndex = next.indexOf(targetId)
        next.splice(sourceIndex, 1)
        next.splice(targetIndex, 0, sourceId)
        return next
      })
    },
    [columns]
  )

  const toggleColumn = (id) => {
    setHiddenColumns((previous) => {
      if (previous.includes(id)) return previous.filter((columnId) => columnId !== id)
      if (previous.length === AUDIT_COLUMNS.length - 1) return previous
      return [...previous, id]
    })
  }

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

  const getCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      const columnId = columns[col]?.id
      if (!item || !columnId) return { kind: GridCellKind.Loading, allowOverlay: false }

      const isTimeError =
        item.isTimeReversed && ['startTime', 'endTime', 'runtimeH', 'auditText'].includes(columnId)
      const themeOverride = { textDark: isTimeError ? '#dc2626' : '#334155' }
      const numericValue = columnId === 'stt' ? row + 1 : item[columnId]

      if (['stt', 'runtimeH', 'actual', 'pass', 'passRate'].includes(columnId)) {
        let displayData = String(numericValue)
        if (columnId === 'runtimeH') displayData = `${numericValue.toFixed(2)}h`
        if (columnId === 'actual' || columnId === 'pass') {
          displayData = numericValue.toLocaleString('vi-VN')
        }
        if (columnId === 'passRate') displayData = `${numericValue}%`
        return {
          kind: GridCellKind.Number,
          data: numericValue,
          displayData,
          readonly: true,
          allowOverlay: false,
          contentAlign: columnId === 'stt' ? 'center' : 'right',
          themeOverride
        }
      }

      let value = item[columnId]
      if (columnId === 'machineName') value = maskText(value, 5)
      if (columnId === 'operator' && value) value = maskText(value, 3)
      const text = String(value || '-')
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        readonly: true,
        allowOverlay: false,
        contentAlign: ['startDate', 'startTime', 'endDate', 'endTime'].includes(columnId)
          ? 'center'
          : 'left',
        themeOverride
      }
    },
    [filteredData, columns, maskText]
  )

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
          width: 'calc(100vw - 32px)',
          height: 'calc(100dvh - 32px)',
          maxHeight: 'calc(100dvh - 32px)',
          maxWidth: '100%',
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
            <details style={{ position: 'relative', fontSize: 12, color: '#334155' }}>
              <summary
                style={{ cursor: 'pointer', padding: '4px 10px', border: '1px solid #e2e8f0' }}
              >
                Ẩn / hiện cột ({columns.length}/{AUDIT_COLUMNS.length})
              </summary>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 20,
                  width: 220,
                  maxHeight: '45vh',
                  overflowY: 'auto',
                  padding: 10,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
                }}
              >
                {columnOrder.map((id) => {
                  const column = AUDIT_COLUMNS.find((item) => item.id === id)
                  const visible = !hiddenColumns.includes(id)
                  return (
                    <label key={id} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={visible}
                        disabled={visible && columns.length === 1}
                        onChange={() => toggleColumn(id)}
                      />
                      {column.title}
                    </label>
                  )
                })}
                <PureButton
                  onClick={() => {
                    setHiddenColumns([])
                    setColumnOrder(AUDIT_COLUMNS.map((column) => column.id))
                    setColumnWidths({})
                  }}
                >
                  Khôi phục cột mặc định
                </PureButton>
              </div>
            </details>
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

        {/* Dùng cùng Data Grid với bảng chi tiết của báo cáo. */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#ffffff' }}>
          <DataEditor
            columns={columns}
            rows={filteredData.length}
            getCellContent={getCellContent}
            onColumnResize={onColumnResize}
            onColumnMoved={onColumnMoved}
            getCellsForSelection
            rangeSelect="rect"
            columnSelect="multi"
            rowSelect="multi"
            rowMarkers="both"
            rowHeight={28}
            headerHeight={32}
            smoothScrollX
            smoothScrollY
            theme={executiveGridTheme}
            width="100%"
            height="100%"
          />
          {filteredData.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: 64,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: '#94a3b8',
                pointerEvents: 'none'
              }}
            >
              Không có phiếu nào phù hợp.
            </div>
          )}
        </div>
        {/* Modal Footer - Trắng đơn giản */}
        <div
          style={{
            padding: '8px 18px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Kéo tiêu đề để đổi vị trí cột • Kéo mép để giãn cột • Ẩn / hiện cột trên thanh công cụ •
            Ctrl+C sao chép vùng chọn
          </span>
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
