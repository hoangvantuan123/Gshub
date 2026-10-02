/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Calendar,
  Download,
  Copy,
  Search,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { PureButton, PureSelect, executiveGridTheme } from './reportUIComponents'

// Modal Đối Soát & Chi Tiết Lệnh Kế Hoạch Điều Phối Sản Xuất
export const PlanAuditDetailModal = ({
  isOpen,
  onClose,
  initialCategory = 'ALL',
  data = [],
  plantName = 'Nhà máy GS1 Hà Nội',
  maskText = (t) => t
}) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPic, setSelectedPic] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const [rowHeight, setRowHeight] = useState(30)
  const gridRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory || 'ALL')
      setSearchQuery('')
      setSelectedPic('ALL')
      setSelectedMachine('ALL')
    }
  }, [isOpen, initialCategory])

  // Lấy danh sách PIC & Máy duy nhất để lọc dropdown
  const picOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      if (item.pic) set.add(item.pic)
    })
    return Array.from(set).sort()
  }, [data])

  const machineOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      if (item.machineCode || item.machineName) set.add(item.machineCode || item.machineName)
    })
    return Array.from(set).sort()
  }, [data])

  // Đếm số lượng từng loại trạng thái ĐP - SX
  const categoryCounts = useMemo(() => {
    let all = data.length
    let sxSaiNgay = 0
    let truotKh = 0
    let khopSl = 0
    let khopJob = 0

    data.forEach((d) => {
      const st = d.dpStatusCode || d.dpStatus
      if (st === 'SX_SAI_NGAY' || String(d.dpStatusText || '').includes('sai ngày')) sxSaiNgay++
      else if (st === 'TRUOT_KH' || String(d.dpStatusText || '').includes('Trượt')) truotKh++
      else if (st === 'KHOP_SL' || String(d.dpStatusText || '').includes('Khớp số lượng')) khopSl++
      else if (st === 'KHOP_JOB' || String(d.dpStatusText || '').includes('Khớp job')) khopJob++
    })

    return { all, sxSaiNgay, truotKh, khopSl, khopJob }
  }, [data])

  // Lọc dữ liệu theo Category + Search Query + PIC + Machine
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const st = item.dpStatusCode || item.dpStatus
      if (activeCategory !== 'ALL') {
        if (
          activeCategory === 'SX_SAI_NGAY' &&
          st !== 'SX_SAI_NGAY' &&
          !String(item.dpStatusText || '').includes('sai ngày')
        )
          return false
        if (
          activeCategory === 'TRUOT_KH' &&
          st !== 'TRUOT_KH' &&
          !String(item.dpStatusText || '').includes('Trượt')
        )
          return false
        if (
          activeCategory === 'KHOP_SL' &&
          st !== 'KHOP_SL' &&
          !String(item.dpStatusText || '').includes('Khớp số lượng')
        )
          return false
        if (
          activeCategory === 'KHOP_JOB' &&
          st !== 'KHOP_JOB' &&
          !String(item.dpStatusText || '').includes('Khớp job')
        )
          return false
      }

      if (selectedPic !== 'ALL' && item.pic !== selectedPic) return false
      if (
        selectedMachine !== 'ALL' &&
        item.machineCode !== selectedMachine &&
        item.machineName !== selectedMachine
      )
        return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (item.docNo && item.docNo.toLowerCase().includes(q)) ||
          (item.orderNo && item.orderNo.toLowerCase().includes(q)) ||
          (item.planNo && item.planNo.toLowerCase().includes(q)) ||
          (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
          (item.itemName && item.itemName.toLowerCase().includes(q)) ||
          (item.customer && item.customer.toLowerCase().includes(q)) ||
          (item.machineCode && item.machineCode.toLowerCase().includes(q)) ||
          (item.machineName && item.machineName.toLowerCase().includes(q)) ||
          (item.pic && item.pic.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [data, activeCategory, selectedPic, selectedMachine, searchQuery])

  // Cột Glide Data Grid & Custom Resize State
  const [colWidths, setColWidths] = useState({})

  const onColumnResize = useCallback((column, newSize) => {
    setColWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  const columns = useMemo(() => {
    const baseCols = [
      { id: 'stt', title: 'STT', width: colWidths['stt'] || 45 },
      { id: 'docNo', title: 'Số LSX', width: colWidths['docNo'] || 135 },
      { id: 'orderNo', title: 'Đơn hàng (SO)', width: colWidths['orderNo'] || 120 },
      { id: 'dpStatus', title: 'Trạng thái ĐP-SX', width: colWidths['dpStatus'] || 155 },
      { id: 'timeStatus', title: 'Trạng thái Thời gian', width: colWidths['timeStatus'] || 145 },
      { id: 'capaStatus', title: 'Trạng thái Capa', width: colWidths['capaStatus'] || 135 },
      { id: 'pic', title: 'PIC Điều phối', width: colWidths['pic'] || 130 },
      { id: 'planDate', title: 'Ngày KH', width: colWidths['planDate'] || 95 },
      { id: 'actualDate', title: 'Ngày thực tế', width: colWidths['actualDate'] || 95 },
      { id: 'planQty', title: 'SL Kế hoạch', width: colWidths['planQty'] || 105 },
      { id: 'actualQty', title: 'SL Thực tế', width: colWidths['actualQty'] || 105 },
      { id: 'completionRate', title: 'Tỷ lệ HT', width: colWidths['completionRate'] || 80 },
      { id: 'machineCode', title: 'Mã máy', width: colWidths['machineCode'] || 100 },
      { id: 'machineName', title: 'Tên máy', width: colWidths['machineName'] || 160 },
      { id: 'itemCode', title: 'Mã sản phẩm', width: colWidths['itemCode'] || 130 },
      { id: 'itemName', title: 'Tên sản phẩm', width: colWidths['itemName'] || 230 },
      { id: 'customer', title: 'Khách hàng', width: colWidths['customer'] || 180 },
      { id: 'note', title: 'Ghi chú điều phối', width: colWidths['note'] || 200 }
    ]
    return baseCols
  }, [colWidths])

  // Cell Content Callback cho Glide Data Grid
  const getCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      if (!item) return { kind: GridCellKind.Loading, allowOverlay: false }

      const colId = columns[col]?.id

      switch (colId) {
        case 'stt':
          return {
            kind: GridCellKind.Number,
            data: row + 1,
            displayData: String(row + 1),
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#64748b' }
          }
        case 'docNo':
          return {
            kind: GridCellKind.Text,
            data: item.docNo || item.orderNo || item.planNo || '',
            displayData: item.docNo || item.orderNo || item.planNo || '',
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
          }
        case 'orderNo':
          return {
            kind: GridCellKind.Text,
            data: item.orderNo || '',
            displayData: item.orderNo || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155' }
          }
        case 'dpStatus': {
          const txt = item.dpStatusText || item.dpStatus || 'Khớp số lượng'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        }
        case 'timeStatus': {
          const txt = item.timeStatusText || item.timeStatus || 'Đúng ĐM'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        }
        case 'capaStatus': {
          const txt = item.capaStatusText || item.capaStatus || 'Đúng capa'
          return {
            kind: GridCellKind.Text,
            data: txt,
            displayData: txt,
            allowOverlay: false,
            themeOverride: { textDark: '#334155', baseFontStyle: '500 12px' }
          }
        }
        case 'pic':
          return {
            kind: GridCellKind.Text,
            data: item.pic || 'Chưa phân công',
            displayData: item.pic || 'Chưa phân công',
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '500 12px' }
          }
        case 'planDate':
          return {
            kind: GridCellKind.Text,
            data: item.planDate || '',
            displayData: item.planDate || '',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: { textDark: '#334155' }
          }
        case 'actualDate':
          return {
            kind: GridCellKind.Text,
            data: item.actualDate || item.prodDate || '',
            displayData: item.actualDate || item.prodDate || '',
            allowOverlay: false,
            contentAlign: 'center',
            themeOverride: {
              textDark:
                item.planDate && item.actualDate && item.planDate !== item.actualDate
                  ? '#d97706'
                  : '#334155',
              baseFontStyle:
                item.planDate && item.actualDate && item.planDate !== item.actualDate
                  ? '700 12px'
                  : '400 12px'
            }
          }
        case 'planQty':
          return {
            kind: GridCellKind.Number,
            data: Number(item.planQty) || 0,
            displayData: (Number(item.planQty) || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#1e293b' }
          }
        case 'actualQty':
          return {
            kind: GridCellKind.Number,
            data: Number(item.actualQty) || 0,
            displayData: (Number(item.actualQty) || 0).toLocaleString('vi-VN'),
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: { textDark: '#047857', baseFontStyle: '700 12px' }
          }
        case 'completionRate': {
          const p = Number(item.planQty) || 0
          const a = Number(item.actualQty) || 0
          const rate = p > 0 ? ((a / p) * 100).toFixed(1) : '100.0'
          return {
            kind: GridCellKind.Text,
            data: `${rate}%`,
            displayData: `${rate}%`,
            allowOverlay: false,
            contentAlign: 'right',
            themeOverride: {
              textDark: Number(rate) >= 95 ? '#047857' : '#be123c',
              baseFontStyle: '700 12px'
            }
          }
        }
        case 'machineCode':
          return {
            kind: GridCellKind.Text,
            data: item.machineCode || '',
            displayData: item.machineCode || '',
            allowOverlay: false,
            themeOverride: { textDark: '#0284c7', baseFontStyle: '600 12px' }
          }
        case 'machineName':
          return {
            kind: GridCellKind.Text,
            data: item.machineName || '',
            displayData: item.machineName || '',
            allowOverlay: false,
            themeOverride: { textDark: '#334155' }
          }
        case 'itemCode':
          return {
            kind: GridCellKind.Text,
            data: item.itemCode || '',
            displayData: item.itemCode || '',
            allowOverlay: false,
            themeOverride: { textDark: '#475569' }
          }
        case 'itemName':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.itemName || ''),
            displayData: maskText(item.itemName || ''),
            allowOverlay: false,
            themeOverride: { textDark: '#0f172a', baseFontStyle: '500 12px' }
          }
        case 'customer':
          return {
            kind: GridCellKind.Text,
            data: maskText(item.customer || ''),
            displayData: maskText(item.customer || ''),
            allowOverlay: false,
            themeOverride: { textDark: '#334155' }
          }
        case 'note':
          return {
            kind: GridCellKind.Text,
            data: item.note || item.remark || '',
            displayData: item.note || item.remark || '',
            allowOverlay: false,
            themeOverride: { textDark: '#64748b' }
          }
        default:
          return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }
    },
    [filteredData, columns, maskText]
  )

  // Xuất file Excel dữ liệu đang lọc
  const handleExportExcel = () => {
    if (!filteredData.length) return

    const exportRows = filteredData.map((item, idx) => ({
      STT: idx + 1,
      'Số LSX': item.docNo || item.planNo || '',
      'Số Đơn Hàng (SO)': item.orderNo || '',
      'Trạng thái ĐP - SX': item.dpStatusText || item.dpStatus || '',
      'Trạng thái Thời gian': item.timeStatusText || item.timeStatus || '',
      'Trạng thái Capa': item.capaStatusText || item.capaStatus || '',
      'PIC Điều phối': item.pic || '',
      'Ngày kế hoạch': item.planDate || '',
      'Ngày thực tế': item.actualDate || item.prodDate || '',
      'SL Kế hoạch': Number(item.planQty) || 0,
      'SL Thực tế': Number(item.actualQty) || 0,
      'Tỷ lệ hoàn thành (%)':
        item.planQty > 0 ? Number(((item.actualQty / item.planQty) * 100).toFixed(1)) : 100,
      'Mã máy': item.machineCode || '',
      'Tên máy': item.machineName || '',
      'Mã sản phẩm': item.itemCode || '',
      'Tên sản phẩm': item.itemName || '',
      'Khách hàng': item.customer || '',
      'Ghi chú': item.note || item.remark || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ChiTiet_DieuPhoi_KHSX')
    XLSX.writeFile(
      wb,
      `ChiTiet_DieuPhoi_KHSX_${activeCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  // Copy toàn bộ bảng ra Clipboard
  const handleCopyTable = () => {
    if (!filteredData.length) return
    const headers = columns.map((c) => c.title).join('\t')
    const rows = filteredData.map((item, idx) => {
      return [
        idx + 1,
        item.docNo || '',
        item.orderNo || '',
        item.dpStatusText || item.dpStatus || '',
        item.timeStatusText || item.timeStatus || '',
        item.capaStatusText || item.capaStatus || '',
        item.pic || '',
        item.planDate || '',
        item.actualDate || '',
        item.planQty || 0,
        item.actualQty || 0,
        item.planQty > 0 ? `${((item.actualQty / item.planQty) * 100).toFixed(1)}%` : '100%',
        item.machineCode || '',
        item.machineName || '',
        item.itemCode || '',
        item.itemName || '',
        item.customer || '',
        item.note || ''
      ].join('\t')
    })
    const fullText = [headers, ...rows].join('\n')
    navigator.clipboard.writeText(fullText)
    alert(`Đã copy ${filteredData.length} dòng dữ liệu điều phối vào Clipboard!`)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '96vw',
          maxWidth: 1440,
          height: '92vh',
          background: '#ffffff',
          borderRadius: 4,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '12px 18px',
            background: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: '#0ea5e9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={18} color="#ffffff" />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span>DANH SÁCH CHI TIẾT LỆNH ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#334155',
                    padding: '1px 8px',
                    borderRadius: 3
                  }}
                >
                  {plantName}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                Đối soát chi tiết theo trạng thái ĐP - SX, thời gian thực hiện so với định mức & tải
                capa
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PureButton
              icon={<Copy size={13} />}
              onClick={handleCopyTable}
              style={{
                background: '#334155',
                color: '#ffffff',
                borderColor: '#475569',
                fontSize: 11.5
              }}
            >
              Copy Bảng
            </PureButton>
            <PureButton
              icon={<Download size={13} />}
              onClick={handleExportExcel}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                borderColor: '#0369a1',
                fontSize: 11.5
              }}
            >
              Xuất Excel
            </PureButton>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 20,
                cursor: 'pointer',
                padding: '0 6px',
                marginLeft: 4
              }}
              title="Đóng (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL TABS: 5 NHÓM TRẠNG THÁI ĐP - SX */}
        <div
          style={{
            padding: '8px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto'
          }}
        >
          <button
            onClick={() => setActiveCategory('ALL')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'ALL' ? '#01411b' : '#cbd5e1',
              background: activeCategory === 'ALL' ? '#01411b' : '#ffffff',
              color: activeCategory === 'ALL' ? '#ffffff' : '#334155',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>Tất cả lệnh</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'ALL' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: activeCategory === 'ALL' ? '#ffffff' : '#334155'
              }}
            >
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('SX_SAI_NGAY')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'SX_SAI_NGAY' ? '#d97706' : '#fde68a',
              background: activeCategory === 'SX_SAI_NGAY' ? '#d97706' : '#fffbeb',
              color: activeCategory === 'SX_SAI_NGAY' ? '#ffffff' : '#92400e',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>1. SX sai ngày KH</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'SX_SAI_NGAY' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                color: activeCategory === 'SX_SAI_NGAY' ? '#ffffff' : '#b45309'
              }}
            >
              {categoryCounts.sxSaiNgay}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('TRUOT_KH')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'TRUOT_KH' ? '#be123c' : '#fecaca',
              background: activeCategory === 'TRUOT_KH' ? '#be123c' : '#fff1f2',
              color: activeCategory === 'TRUOT_KH' ? '#ffffff' : '#9f1239',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>2. Trượt KH</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'TRUOT_KH' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                color: activeCategory === 'TRUOT_KH' ? '#ffffff' : '#be123c'
              }}
            >
              {categoryCounts.truotKh}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('KHOP_SL')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'KHOP_SL' ? '#059669' : '#a7f3d0',
              background: activeCategory === 'KHOP_SL' ? '#059669' : '#ecfdf5',
              color: activeCategory === 'KHOP_SL' ? '#ffffff' : '#065f46',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>3. Khớp số lượng</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'KHOP_SL' ? 'rgba(255,255,255,0.25)' : '#d1fae5',
                color: activeCategory === 'KHOP_SL' ? '#ffffff' : '#047857'
              }}
            >
              {categoryCounts.khopSl}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('KHOP_JOB')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: activeCategory === 'KHOP_JOB' ? '#2563eb' : '#bfdbfe',
              background: activeCategory === 'KHOP_JOB' ? '#2563eb' : '#eff6ff',
              color: activeCategory === 'KHOP_JOB' ? '#ffffff' : '#1e40af',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>4. Khớp job</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 10,
                background: activeCategory === 'KHOP_JOB' ? 'rgba(255,255,255,0.25)' : '#dbeafe',
                color: activeCategory === 'KHOP_JOB' ? '#ffffff' : '#1d4ed8'
              }}
            >
              {categoryCounts.khopJob}
            </span>
          </button>
        </div>

        {/* MODAL TOOLBAR: TÌM KIẾM + LỌC PIC + LỌC MÁY */}
        <div
          style={{
            padding: '8px 16px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
            {/* Search Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                padding: '3px 8px',
                background: '#ffffff',
                width: '100%',
                maxWidth: 320
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm LSX, đơn hàng, khách hàng, mã hàng, PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  width: '100%',
                  marginLeft: 6,
                  color: '#1e293b'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: 11
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Lọc PIC Điều phối */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                background: '#ffffff'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#334155',
                  background: '#f8fafc',
                  padding: '4px 6px',
                  borderRight: '1px solid #cbd5e1'
                }}
              >
                PIC:
              </span>
              <PureSelect
                value={selectedPic}
                onChange={setSelectedPic}
                style={{ width: 150 }}
                options={[
                  { value: 'ALL', label: 'Tất cả PIC ĐP' },
                  ...picOptions.map((p) => ({ value: p, label: p }))
                ]}
              />
            </div>

            {/* Lọc Cụm Máy */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                background: '#ffffff'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#334155',
                  background: '#f8fafc',
                  padding: '4px 6px',
                  borderRight: '1px solid #cbd5e1'
                }}
              >
                Máy:
              </span>
              <PureSelect
                value={selectedMachine}
                onChange={setSelectedMachine}
                style={{ width: 160 }}
                options={[
                  { value: 'ALL', label: 'Tất cả cụm máy' },
                  ...machineOptions.map((m) => ({ value: m, label: m }))
                ]}
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            Hiển thị <strong style={{ color: '#0f172a' }}>{filteredData.length}</strong> /{' '}
            {data.length} lệnh
          </div>
        </div>

        {/* DATA GRID TABLE */}
        <div style={{ flex: 1, width: '100%', position: 'relative' }}>
          <DataEditor
            ref={gridRef}
            width="100%"
            height="100%"
            columns={columns}
            rows={filteredData.length}
            getCellContent={getCellContent}
            onColumnResize={onColumnResize}
            rowHeight={rowHeight}
            headerHeight={34}
            theme={executiveGridTheme}
            smoothScrollX
            smoothScrollY
            getCellsForSelection
          />
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '8px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Phím tắt: Click ô để xem chi tiết • Kéo tiêu đề để giãn cột</span>
          </div>
          <PureButton onClick={onClose} style={{ fontSize: 11.5 }}>
            Đóng cửa sổ
          </PureButton>
        </div>
      </div>
    </div>
  )
}
