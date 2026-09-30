/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Clock, Download, Copy, Search } from 'lucide-react'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { PureButton, PureSelect, executiveGridTheme } from './reportUIComponents'

// Modal Đối Soát Kỷ Luật Thời Gian & Cảnh Báo QLSX (Chuẩn Modal Vuông Trực Quan, Bộ Lọc & Data Grid)
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
  const [rowHeight, setRowHeight] = useState(30)
  const gridRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory || 'ALL')
      setSearchQuery('')
      setSelectedTeam('ALL')
      setSelectedMachine('ALL')
    }
  }, [isOpen, initialCategory])

  // Lấy danh sách tổ & máy duy nhất để lọc dropdown
  const teamOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      if (item.teamName) set.add(item.teamName)
    })
    return Array.from(set).sort()
  }, [data])

  const machineOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      if (item.machineCode) set.add(item.machineCode)
    })
    return Array.from(set).sort()
  }, [data])

  // Phân loại kiểm toán từng dòng
  const classifiedData = useMemo(() => {
    return data.map((item) => {
      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0
      const actual = Number(item.actualQty || item.output) || 0
      const plan = Number(item.planQty) || 0
      let category = 'NORMAL'
      let auditText = 'Chuẩn tiến độ (5p - 12h)'
      let isWarning = false
      let badgeColor = '#0f766e'
      let badgeBg = '#f0fdfa'

      if (durMin < 5 && durMin >= 0) {
        category = 'UNDER_5MIN'
        auditText = '< 5p Nhập nhanh (Cảnh báo)'
        isWarning = true
        badgeColor = '#be123c'
        badgeBg = '#fff1f2'
      } else if (durMin > 720) {
        category = 'OVER_12H'
        auditText = '> 12h Cần kiểm tra (Cảnh báo)'
        isWarning = true
        badgeColor = '#b45309'
        badgeBg = '#fffbeb'
      }

      return {
        ...item,
        auditCategory: category,
        auditText,
        isWarning,
        badgeColor,
        badgeBg,
        actualQtyNum: actual,
        planQtyNum: plan,
        durMin
      }
    })
  }, [data])

  // Đếm số lượng từng loại
  const categoryCounts = useMemo(() => {
    let all = classifiedData.length
    let normal = 0
    let over12 = 0
    let under5 = 0

    classifiedData.forEach((d) => {
      if (d.auditCategory === 'NORMAL') normal++
      else if (d.auditCategory === 'OVER_12H') over12++
      else if (d.auditCategory === 'UNDER_5MIN') under5++
    })

    return { all, normal, over12, under5 }
  }, [classifiedData])

  // Lọc dữ liệu theo Category + Search Query + Team + Machine
  const filteredData = useMemo(() => {
    return classifiedData.filter((item) => {
      if (activeCategory !== 'ALL' && item.auditCategory !== activeCategory) return false
      if (selectedTeam !== 'ALL' && item.teamName !== selectedTeam) return false
      if (selectedMachine !== 'ALL' && item.machineCode !== selectedMachine) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (item.ticketCode && item.ticketCode.toLowerCase().includes(q)) ||
          (item.ticketNo && item.ticketNo.toLowerCase().includes(q)) ||
          (item.orderCode && item.orderCode.toLowerCase().includes(q)) ||
          (item.docNo && item.docNo.toLowerCase().includes(q)) ||
          (item.machineCode && item.machineCode.toLowerCase().includes(q)) ||
          (item.machineName && item.machineName.toLowerCase().includes(q)) ||
          (item.teamName && item.teamName.toLowerCase().includes(q)) ||
          (item.operator && item.operator.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [classifiedData, activeCategory, selectedTeam, selectedMachine, searchQuery])

  // Cột Glide Data Grid & Custom Resize State
  const [auditColWidths, setAuditColWidths] = useState({})

  const onAuditColumnResize = useCallback((column, newSize) => {
    setAuditColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const auditGridCols = useMemo(() => {
    const base = [
      { title: 'Mã phiếu', width: 130, id: 'ticketCode' },
      { title: 'Lệnh SX / CT', width: 125, id: 'orderCode' },
      { title: 'Mã máy', width: 95, id: 'machineCode' },
      { title: 'Tên máy sản xuất', width: 175, id: 'machineName' },
      { title: 'Tổ sản xuất', width: 140, id: 'teamName' },
      { title: 'Thời gian bắt đầu', width: 130, id: 'startTime' },
      { title: 'Thời gian kết thúc', width: 130, id: 'endTime' },
      { title: 'SL Sản xuất', width: 110, id: 'actualQty' },
      { title: 'SL Đạt', width: 110, id: 'passQty' },
      { title: 'SL Lỗi', width: 100, id: 'defectQty' },
      { title: 'Tỷ lệ đạt (%)', width: 105, id: 'passRate' },
      { title: 'Giờ chạy (h)', width: 100, id: 'runtimeHours' },
      { title: 'Kiểm toán & Cảnh báo QLSX', width: 200, id: 'auditStatus' },
      { title: 'Nguồn gốc', width: 95, id: 'origin' },
      { title: 'Người thực hiện', width: 140, id: 'operator' }
    ]
    return base.map((col) => ({
      ...col,
      width: auditColWidths[col.id] || col.width
    }))
  }, [auditColWidths])

  const getAuditCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
      const colId = auditGridCols[col]?.id
      const actual = Number(item.actualQty || item.output) || 0
      const pass = Number(item.passQty || item.passQuantity) || 0
      const parsedDef =
        item.defectQty !== undefined && item.defectQty !== null ? Number(item.defectQty) : 0
      const defect = parsedDef > 0 ? parsedDef : Math.max(0, actual - pass)
      const passRateVal = actual > 0 ? ((pass / actual) * 100).toFixed(1) : '100.0'

      switch (colId) {
        case 'ticketCode':
          return {
            kind: GridCellKind.Text,
            data: item.ticketCode || item.ticketNo || '',
            displayData: item.ticketCode || item.ticketNo || '',
            allowOverlay: false
          }
        case 'orderCode':
          return {
            kind: GridCellKind.Text,
            data: item.orderCode || item.docNo || '',
            displayData: item.orderCode || item.docNo || '',
            allowOverlay: false
          }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode || '',
            displayData: item.machineCode || '',
            allowOverlay: false
          }
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName || '',
            displayData: maskText(item.machineName || '', 5),
            allowOverlay: false
          }
        case 'teamName':
          return {
            kind: GridCellKind.Text,
            data: item.teamName || '',
            displayData: item.teamName || '',
            allowOverlay: false
          }
        case 'startTime':
          return {
            kind: GridCellKind.Text,
            data: item.startTime || item.prodDate || '',
            displayData: item.startTime || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'endTime':
          return {
            kind: GridCellKind.Text,
            data: item.endTime || item.prodDate || '',
            displayData: item.endTime || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: actual,
            displayData: actual.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passQty':
          return {
            kind: GridCellKind.Number,
            data: pass,
            displayData: pass.toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'defectQty':
          return {
            kind: GridCellKind.Number,
            data: defect,
            displayData: defect > 0 ? defect.toLocaleString('vi-VN') : '0',
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'passRate':
          return {
            kind: GridCellKind.Text,
            data: `${passRateVal}%`,
            displayData: `${passRateVal}%`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'runtimeHours':
          return {
            kind: GridCellKind.Text,
            data: `${(Number(item.runtimeHours) || 0).toFixed(1)}h`,
            displayData: `${(Number(item.runtimeHours) || 0).toFixed(1)}h`,
            allowOverlay: false,
            contentAlign: 'right'
          }
        case 'auditStatus':
          return {
            kind: GridCellKind.Text,
            data: item.auditText,
            displayData: item.auditText,
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'origin':
          return {
            kind: GridCellKind.Text,
            data: item.origin || 'MES',
            displayData: item.origin || 'MES',
            allowOverlay: false,
            contentAlign: 'center'
          }
        case 'operator':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.operator || 'Kỹ thuật viên', 3),
            displayData: maskText(item.operator || 'Kỹ thuật viên', 3),
            allowOverlay: false
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [filteredData, auditGridCols, maskText]
  )

  const handleExportExcel = () => {
    try {
      const wsData = filteredData.map((item, idx) => {
        const actual = Number(item.actualQty || item.output) || 0
        const pass = Number(item.passQty || item.passQuantity) || 0
        const parsedDef =
          item.defectQty !== undefined && item.defectQty !== null ? Number(item.defectQty) : 0
        const defect = parsedDef > 0 ? parsedDef : Math.max(0, actual - pass)
        const passRateVal = actual > 0 ? ((pass / actual) * 100).toFixed(1) : '100.0'
        return {
          STT: idx + 1,
          'Mã phiếu': item.ticketCode || item.ticketNo || '',
          'Lệnh sản xuất / CT': item.orderCode || item.docNo || '',
          'Mã máy': item.machineCode || '',
          'Tên máy sản xuất': item.machineName || '',
          'Tổ sản xuất': item.teamName || '',
          'Thời gian bắt đầu': item.startTime || item.prodDate || '',
          'Thời gian kết thúc': item.endTime || item.prodDate || '',
          'SL Sản xuất': actual,
          'SL Đạt': pass,
          'SL Lỗi': defect,
          'Tỷ lệ đạt (%)': `${passRateVal}%`,
          'Giờ chạy (h)': (Number(item.runtimeHours) || 0).toFixed(1),
          'Kiểm toán & Cảnh báo QLSX': item.auditText,
          'Nguồn gốc': item.origin || 'MES',
          'Người thực hiện': item.operator || 'Kỹ thuật viên'
        }
      })
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'DoiSoatKyLuatQLSX')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `DoiSoat_KyLuat_ThoiGian_${plantName || 'GS'}_${dateStr}.xlsx`)
    } catch (err) {
      console.error('Export audit excel error:', err)
    }
  }

  const handleCopyTSV = () => {
    try {
      const headers = [
        'Mã phiếu',
        'Lệnh SX / CT',
        'Mã máy',
        'Tên máy',
        'Tổ SX',
        'Bắt đầu',
        'Kết thúc',
        'SL SX',
        'SL Đạt',
        'SL Lỗi',
        'Tỷ lệ đạt (%)',
        'Giờ chạy (h)',
        'Kiểm toán QLSX',
        'Nguồn',
        'Người làm'
      ]
      const headerRow = headers.join('\t')
      const bodyRows = filteredData
        .map((item) => {
          const actual = Number(item.actualQty || item.output) || 0
          const pass = Number(item.passQty || item.passQuantity) || 0
          const parsedDef =
            item.defectQty !== undefined && item.defectQty !== null ? Number(item.defectQty) : 0
          const defect = parsedDef > 0 ? parsedDef : Math.max(0, actual - pass)
          const passRateVal = actual > 0 ? ((pass / actual) * 100).toFixed(1) : '100.0'
          return [
            item.ticketCode || item.ticketNo || '',
            item.orderCode || item.docNo || '',
            item.machineCode || '',
            item.machineName || '',
            item.teamName || '',
            item.startTime || item.prodDate || '',
            item.endTime || item.prodDate || '',
            actual,
            pass,
            defect,
            `${passRateVal}%`,
            (Number(item.runtimeHours) || 0).toFixed(1),
            item.auditText,
            item.origin || 'MES',
            item.operator || 'Kỹ thuật viên'
          ].join('\t')
        })
        .join('\n')
      navigator.clipboard.writeText(`${headerRow}\n${bodyRows}`)
      alert('Đã sao chép danh sách phiếu kiểm toán vào Clipboard (định dạng Excel/TSV)')
    } catch (err) {
      console.error('Copy audit error:', err)
    }
  }

  if (!isOpen) return null

  // Tổng hợp số liệu đang lọc
  const totalActual = filteredData.reduce((acc, d) => acc + (d.actualQtyNum || 0), 0)
  const totalPass = filteredData.reduce((acc, d) => acc + (Number(d.passQty) || 0), 0)
  const totalRuntime = filteredData.reduce((acc, d) => acc + (Number(d.runtimeHours) || 0), 0)
  const totalWarnings = filteredData.filter((d) => d.isWarning).length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: 'clamp(920px, 86vw, 1380px)',
          height: 'clamp(620px, 88vh, 880px)',
          maxHeight: '94vh',
          maxWidth: '96vw',
          border: '1.5px solid #245d6c',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#245d6c',
            color: '#ffffff',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1a4550',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.01em' }}>
                ĐỐI SOÁT KỶ LUẬT THỜI GIAN CHẠY MÁY & CẢNH BÁO QUẢN LÝ SẢN XUẤT (QLSX AUDIT)
              </div>
              <div style={{ fontSize: 11.5, color: '#e2e8f0', marginTop: 1 }}>
                Cơ sở: <b>{plantName || 'Nhà máy GS'}</b> • Tự động lọc các đơn hàng &lt; 5 phút
                hoặc &gt; 12 giờ
              </div>
            </div>
          </div>
        </div>

        {/* Modal Category Filter Bar (Pills with Counts) */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setActiveCategory('ALL')}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'ALL' ? '#245d6c' : '#cbd5e1',
              background: activeCategory === 'ALL' ? '#245d6c' : '#ffffff',
              color: activeCategory === 'ALL' ? '#ffffff' : '#334155',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>Tất cả phiếu</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'ALL' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: activeCategory === 'ALL' ? '#ffffff' : '#475569'
              }}
            >
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('NORMAL')}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'NORMAL' ? '#245d6c' : '#cbd5e1',
              background: activeCategory === 'NORMAL' ? '#245d6c' : '#ffffff',
              color: activeCategory === 'NORMAL' ? '#ffffff' : '#334155',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>1. Chuẩn tiến độ (5p - 12h)</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'NORMAL' ? 'rgba(255,255,255,0.25)' : '#ecfdf5',
                color: activeCategory === 'NORMAL' ? '#ffffff' : '#047857'
              }}
            >
              {categoryCounts.normal}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('OVER_12H')}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'OVER_12H' ? '#d97706' : '#fde68a',
              background: activeCategory === 'OVER_12H' ? '#d97706' : '#fffbeb',
              color: activeCategory === 'OVER_12H' ? '#ffffff' : '#92400e',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>2. Thao tác &gt; 12 giờ (Cảnh báo)</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'OVER_12H' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                color: activeCategory === 'OVER_12H' ? '#ffffff' : '#b45309'
              }}
            >
              {categoryCounts.over12}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('UNDER_5MIN')}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'UNDER_5MIN' ? '#be123c' : '#fecaca',
              background: activeCategory === 'UNDER_5MIN' ? '#be123c' : '#fff1f2',
              color: activeCategory === 'UNDER_5MIN' ? '#ffffff' : '#9f1239',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>3. Thao tác &lt; 5 phút (Cảnh báo)</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'UNDER_5MIN' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                color: activeCategory === 'UNDER_5MIN' ? '#ffffff' : '#be123c'
              }}
            >
              {categoryCounts.under5}
            </span>
          </button>
        </div>

        {/* Modal Secondary Toolbar (Search + Filters + Spacing) */}
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                padding: '3px 8px',
                background: '#ffffff',
                borderRadius: 2
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, lệnh, máy, tổ, người làm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '2px 6px',
                  fontSize: 12,
                  width: 220,
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Lọc theo tổ */}
            <PureSelect
              value={selectedTeam}
              onChange={setSelectedTeam}
              options={[
                { value: 'ALL', label: 'Tất cả tổ sản xuất' },
                ...teamOptions.map((t) => ({ value: t, label: t }))
              ]}
              style={{ width: 170, border: '1px solid #cbd5e1' }}
            />

            {/* Lọc theo máy */}
            <PureSelect
              value={selectedMachine}
              onChange={setSelectedMachine}
              options={[
                { value: 'ALL', label: 'Tất cả cụm máy' },
                ...machineOptions.map((m) => ({ value: m, label: m }))
              ]}
              style={{ width: 170, border: '1px solid #cbd5e1' }}
            />

            {(searchQuery ||
              selectedTeam !== 'ALL' ||
              selectedMachine !== 'ALL' ||
              activeCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedTeam('ALL')
                  setSelectedMachine('ALL')
                  setActiveCategory('ALL')
                }}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '3px 8px',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  color: '#475569',
                  borderRadius: 2,
                  fontWeight: 600
                }}
              >
                Đặt lại lọc
              </button>
            )}
          </div>
        </div>

        {/* Summary Indicators Strip */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '6px 16px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            flexShrink: 0
          }}
        >
          <div style={{ color: '#475569', fontWeight: 600 }}>
            Hiển thị: <b style={{ color: '#0f172a' }}>{filteredData.length}</b> phiếu kiểm toán
            {totalWarnings > 0 && (
              <span style={{ marginLeft: 8, color: '#b91c1c', fontSize: 12, fontWeight: 700 }}>
                • {totalWarnings} phiếu cần đối soát
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, color: '#334155', fontWeight: 700 }}>
            <span>
              Tổng SL SX: <b style={{ color: '#0f172a' }}>{totalActual.toLocaleString('vi-VN')}</b>
            </span>
            <span>
              Tổng SL Đạt: <b style={{ color: '#0f766e' }}>{totalPass.toLocaleString('vi-VN')}</b>
            </span>
            <span>
              Tổng Giờ chạy: <b style={{ color: '#245d6c' }}>{totalRuntime.toFixed(1)}h</b>
            </span>
          </div>
        </div>

        {/* Table Container (Glide Data Grid DataEditor) */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#ffffff' }}>
          <DataEditor
            ref={gridRef}
            columns={auditGridCols}
            rows={filteredData.length}
            getCellContent={getAuditCellContent}
            onColumnResize={onAuditColumnResize}
            getCellsForSelection={true}
            rangeSelect="rect"
            columnSelect="multi"
            rowSelect="multi"
            rowMarkers="number"
            rowHeight={rowHeight}
            headerHeight={32}
            smoothScrollX={true}
            smoothScrollY={true}
            theme={executiveGridTheme}
            width="100%"
            height="100%"
          />
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            * Quy chuẩn QLSX: Thao tác &lt; 5 phút yêu cầu nhập đúng quy trình; thời gian &gt; 12h
            với sản lượng lớn được tự động xác nhận đạt chuẩn.
          </div>
          <PureButton type="primary" onClick={onClose} style={{ padding: '5px 16px' }}>
            Đóng bảng kiểm toán
          </PureButton>
        </div>
      </div>
    </div>
  )
}
