/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useRef, useMemo } from 'react'
import {
  RotateCcw,
  FileSpreadsheet,
  Camera,
  Cpu,
  Users,
  Clock,
  Download,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Copy,
  Calendar,
  Layers,
  BookOpen,
  ExternalLink,
  TableProperties,
  Eye,
  EyeOff
} from 'lucide-react'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import { Button } from '@renderer/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts'
import { DataEditor } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import {
  PureButton,
  PureSelect,
  PureDateRangePicker,
  MasterBatchSearchSelect,
  ExecutiveChartTooltip,
  MachineRuntimeVerticalBar,
  CleanTechnicalVerticalBar,
  CleanTechnicalHorizontalBar,
  executiveGridTheme,
  gridCustomCss
} from './reportUIComponents'
import { FormulaHandbookModal } from '../../../handbook/FormulaHandbookModal'
import { useProductionStatisticsLogic } from '../hooks/useProductionStatisticsLogic'

export default function ProductionStatisticsReport(props) {
  const {
    plantName = 'Nhà máy GS5 Quế Võ',
    dateRange: _propDateRange,
    onDateRangeChange: _propOnDateRangeChange,
    masterList = [],
    selectedMasterKey,
    onSelectMaster,
    onRefreshMaster,
    currentMaster,
    loadingMaster = false
  } = props

  const [showMachineSummaryTable, setShowMachineSummaryTable] = useState(true)
  const [showTeamSummaryTable, setShowTeamSummaryTable] = useState(true)
  const [showSyncTable, setShowSyncTable] = useState(true)
  const [showAutoExportTable, setShowAutoExportTable] = useState(true)
  const [autoExportTab, setAutoExportTab] = useState('breakdown') // 'breakdown' | 'missing_list'
  const [missingAutoExportSearchText, setMissingAutoExportSearchText] = useState('')
  const [copiedMissingAutoExport, setCopiedMissingAutoExport] = useState(false)

  const {
    // State
    machineChartMode,
    setMachineChartMode,
    showManualMachines,
    setShowManualMachines,
    selectedTeam,
    setSelectedTeam,
    selectedMachine,
    setSelectedMachine,
    selectedDurationAudit,
    setSelectedDurationAudit,
    isCapturing,
    showFormulaModal,
    setShowFormulaModal,
    showAuditModal,
    setShowAuditModal,
    auditModalCategory,
    setAuditModalCategory,
    machineFullHeight,
    setMachineFullHeight,
    teamFullHeight,
    setTeamFullHeight,
    detailFullHeight,
    setDetailFullHeight,
    machineRowHeight,
    setMachineRowHeight,
    teamRowHeight,
    setTeamRowHeight,
    detailRowHeight,
    setDetailRowHeight,
    machineSearchText,
    setMachineSearchText,
    teamSearchText,
    setTeamSearchText,
    detailSearchText,
    setDetailSearchText,
    showDetailSearch,
    setShowDetailSearch,

    // Refs
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    syncChartRef,
    autoExportChartRef,
    machineGridRef,
    teamGridRef,
    detailGridRef,

    // Computed Data
    filteredData,
    filterOptions,
    hasActiveFilters,
    dateRange,
    onDateRangeChange,
    kpiMetrics,
    missingAutoExportTickets = [],
    machineAggregates,
    displayMachineList,
    machineGrandTotal,
    teamAggregates,
    displayTeamList,
    teamGrandTotal,
    displayDetailList,
    executiveVerticalData,
    executiveHorizontalData,
    runtimeAuditChartData,

    // Handlers
    maskText,
    handleResetFilters,
    handleCopyTable,
    handleExportMachineExcel,
    handleExportTeamExcel,
    handleExportDetailExcel,
    handleExportExcel,
    handleDownloadSingleChart,
    handleCaptureScreenshot,

    // Glide Grids
    machineSortConfig,
    setMachineSortConfig,
    onMachineHeaderClicked,
    machineGridCols,
    getMachineCellContent,
    onMachineColumnResize,
    teamSortConfig,
    setTeamSortConfig,
    onTeamHeaderClicked,
    teamGridCols,
    getTeamCellContent,
    onTeamColumnResize,
    detailSortConfig,
    setDetailSortConfig,
    onDetailHeaderClicked,
    detailGridCols,
    getDetailCellContent,
    onDetailColumnResize
  } = useProductionStatisticsLogic(props)

  const filteredMissingAutoExportTickets = useMemo(() => {
    if (!missingAutoExportSearchText.trim()) return missingAutoExportTickets
    const q = missingAutoExportSearchText.toLowerCase().trim()
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
        String(t.teamName || t.team || '')
          .toLowerCase()
          .includes(q) ||
        String(t.machineCode || '')
          .toLowerCase()
          .includes(q) ||
        String(t.machineName || '')
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
  }, [missingAutoExportTickets, missingAutoExportSearchText])

  const handleCopyMissingAutoExport = () => {
    if (filteredMissingAutoExportTickets.length === 0) return
    const headers = ['STT', 'Ngày SX', 'Số phiếu / WO', 'Trạng thái chứng từ', 'Nguồn dữ liệu']
    const rows = filteredMissingAutoExportTickets.map((t, idx) => [
      idx + 1,
      t.prodDate || t.date || t.StatDate || '',
      t.ticketNo || t.docNo || '',
      t.autoExportType || 'Chưa sinh chứng từ',
      `${t.source || 'MES'}${t.pic ? ' - ' + t.pic : ''}`
    ])
    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedMissingAutoExport(true)
      setTimeout(() => setCopiedMissingAutoExport(false), 2000)
    })
  }

  const handleOpenHandbook = () => {
    try {
      openChildWindow({
        path: '/sub/report/handbook/formula?type=stat',
        title: 'Cẩm nang công thức & Từ điển dữ liệu Báo cáo Sản xuất',
        width: 1250,
        height: 850,
        id: 'report-formula-handbook-window'
      })
    } catch (e) {
      console.warn('Lỗi mở window con cẩm nang, fallback sang modal:', e)
      setShowFormulaModal(true)
    }
  }

  return (
    <div
      ref={reportRootRef}
      className="production-statistics-report"
      style={{
        background: '#ffffff',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: '24px 32px 60px 32px',
        color: '#0f172a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      <style>{gridCustomCss}</style>

      {/* EXECUTIVE BANNER (Hiển thị cố định trên bản chụp ảnh / in PDF thay cho thanh công cụ web) */}
      <div
        className="screenshot-show"
        style={{
          display: 'none',
          borderBottom: '2px solid #01411b',
          paddingBottom: 14,
          marginBottom: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: '#0f172a',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em'
              }}
            >
              BÁO CÁO THỐNG KÊ HIỆU SUẤT SẢN XUẤT
            </div>
            <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>
              <b>Đơn vị:</b> {plantName || 'Nhà máy GS5 Quế Võ'} • <b>Hệ thống:</b> MES Engine &
              Bravo ERP • <b>Đợt nạp:</b> {selectedMasterKey || 'Hiện hành'}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
            <div>
              Thời điểm xuất: <b>{new Date().toLocaleString('vi-VN')}</b>
            </div>
          </div>
        </div>
      </div>

      {/* 1. TOP TOOLBAR & CONTROLS (Chuẩn Action Toolbar ERP) */}
      <div className="report-interactive-toolbar screenshot-hide w-full bg-white border-y border-slate-200 px-3 py-1.5 flex items-center justify-between gap-3 flex-wrap mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {masterList && masterList.length > 0 ? (
            <MasterBatchSearchSelect
              masterList={masterList}
              selectedMasterKey={selectedMasterKey}
              onSelectMaster={onSelectMaster}
              onRefreshMaster={onRefreshMaster}
              loading={loadingMaster}
            />
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-semibold">
              <span>⚠️ Chưa có đợt TKSX nào được đăng ký cho {plantName || 'nhà máy'}</span>
            </div>
          )}
        </div>

        {/* Nhóm nút tác vụ chuẩn ERP */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenHandbook}
            className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
            title="Mở cẩm nang công thức và giải thích thuật ngữ trong cửa sổ mới"
          >
            <BookOpen size={13} className="text-emerald-600" />
            <span>CẨM NANG</span>
          </Button>

          {handleExportExcel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportExcel}
              className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
              title="Xuất file Excel báo cáo"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>XUẤT EXCEL</span>
            </Button>
          )}

          {handleCaptureScreenshot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCaptureScreenshot}
              disabled={isCapturing}
              className="uppercase text-[11px] font-semibold text-indigo-700 hover:text-indigo-800"
              title="Chụp ảnh toàn bộ báo cáo để xuất file PNG"
            >
              <Camera size={13} className="text-indigo-600" />
              <span>{isCapturing ? 'ĐANG CHỤP...' : 'TẢI ẢNH BÁO CÁO'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. MAIN REPORT HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.2
            }}
          >
            BÁO CÁO THỐNG KÊ HIỆU SUẤT SẢN XUẤT
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
            fontSize: 13,
            color: '#475569',
            flexWrap: 'wrap'
          }}
        >
          <span>
            <b>Đơn vị:</b> {plantName || 'Nhà máy GS5 Quế Võ'}
          </span>
          <span>•</span>
          <span>
            <b>Hệ thống:</b> MES Engine & Bravo ERP
          </span>
          <span>•</span>
          <span>
            <b>Thời gian đăng ký TKSX:</b>{' '}
            {currentMaster?.ApplyDate ||
              currentMaster?.CreatedAt?.slice(0, 10) ||
              currentMaster?.RegDate ||
              (selectedMasterKey ? selectedMasterKey : 'Đợt nạp hiện hành')}
          </span>
          {dateRange && dateRange[0] && dateRange[1] && (
            <>
              <span>•</span>
              <span>
                <b>Phạm vi thống kê:</b> {dateRange[0]} đến {dateRange[1]}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3. TOP HERO METRICS BAR: 4 CHỈ SỐ CHỦ CHỐT ĐIỀU HÀNH */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32
        }}
      >
        {/* KPI 1: TỔNG SỐ PHIẾU THỐNG KÊ & TỶ LỆ MES */}
        <div
          style={{
            padding: '16px 18px',
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            borderTop: '3.5px solid #01411b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 120
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Tổng phiếu thống kê (Tỷ lệ MES)
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.totalTickets.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            MES:{' '}
            <span style={{ color: '#01411b', fontWeight: 700 }}>
              {kpiMetrics.mesCreatedCount} ({kpiMetrics.mesRate}%)
            </span>{' '}
            • Ngoài: <span style={{ color: '#0f172a' }}>{kpiMetrics.bravoCreatedCount}</span>
          </div>
        </div>

        {/* KPI 2: THỜI GIAN CHẠY MÁY > 12H (CẦN KIỂM TRA) */}
        <div
          style={{
            padding: '16px 18px',
            background: (kpiMetrics.runtimeOver12hCheck || 0) > 0 ? '#fffdf7' : '#ffffff',
            borderLeft:
              (kpiMetrics.runtimeOver12hCheck || 0) > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
            borderRight:
              (kpiMetrics.runtimeOver12hCheck || 0) > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
            borderBottom:
              (kpiMetrics.runtimeOver12hCheck || 0) > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
            borderTop: '3.5px solid #d97706',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 120,
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#d97706',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            &gt; 12h (Cần kiểm tra)
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: (kpiMetrics.runtimeOver12hCheck || 0) > 0 ? '#d97706' : '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {(kpiMetrics.runtimeOver12hCheck || 0).toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#d97706', fontWeight: 700 }}>
              {(
                ((kpiMetrics.runtimeOver12hCheck || 0) / (kpiMetrics.totalTickets || 1)) *
                100
              ).toFixed(1)}
              %
            </span>{' '}
            • <span style={{ color: '#92400e' }}>Phiếu bất thường</span>
          </div>
        </div>

        {/* KPI 3: THỜI GIAN THAO TÁC < 5 PHÚT (THAO TÁC NHANH) */}
        <div
          style={{
            padding: '16px 18px',
            background: (kpiMetrics.runtimeUnder5Min || 0) > 0 ? '#fff5f5' : '#ffffff',
            borderLeft:
              (kpiMetrics.runtimeUnder5Min || 0) > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderRight:
              (kpiMetrics.runtimeUnder5Min || 0) > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderBottom:
              (kpiMetrics.runtimeUnder5Min || 0) > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderTop: '3.5px solid #be123c',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 120,
            transition: 'all 0.15s ease'
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#be123c',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            &lt; 5 phút (Thao tác nhanh)
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: (kpiMetrics.runtimeUnder5Min || 0) > 0 ? '#be123c' : '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {(kpiMetrics.runtimeUnder5Min || 0).toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#be123c', fontWeight: 700 }}>
              {(
                ((kpiMetrics.runtimeUnder5Min || 0) / (kpiMetrics.totalTickets || 1)) *
                100
              ).toFixed(1)}
              %
            </span>{' '}
            • <span style={{ color: '#881337' }}>Nhập vội</span>
          </div>
        </div>

        {/* KPI 4: SINH PHIẾU XUẤT/NHẬP TỰ ĐỘNG */}
        <div
          style={{
            padding: '16px 18px',
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            borderTop: '3.5px solid #01411b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 120
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#01411b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Sinh phiếu X/N tự động
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: '#01411b',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.autoExportRate}%
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Đã sinh:{' '}
            <span style={{ color: '#01411b', fontWeight: 700 }}>
              {kpiMetrics.autoExportCount.toLocaleString('vi-VN')}
            </span>{' '}
            • Chưa:{' '}
            <span
              style={{
                color: kpiMetrics.noAutoExportCount > 0 ? '#dc2626' : '#64748b',
                fontWeight: 700
              }}
            >
              {kpiMetrics.noAutoExportCount.toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. EXECUTIVE SECTION I: BIỂU ĐỒ 1 - THỐNG KÊ GIỜ CHẠY MÁY & CẢNH BÁO BẤT THƯỜNG */}
      <div
        ref={chart1Ref}
        style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}
      >
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
              <b>{executiveVerticalData.length} cụm máy / tổ sản xuất</b> ({plantName || 'Nhà máy'}
              ). Biểu đồ cung cấp góc nhìn trực quan về tổng giờ chạy máy tích lũy, phân bổ tải
              trọng và mối tương quan giữa khối lượng thao tác với thời gian vận hành giữa các thiết
              bị.
            </div>
          </div>

          {/* Công cụ chuyển đổi loại biểu đồ (Chart Mode Switcher) & Lọc máy thủ công */}
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
            {/* Tabs line cho chế độ biểu đồ */}
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

            {/* Action Button: Bật / tắt máy thủ công */}
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
              <span>{showManualMachines ? 'Hiện máy thủ công' : 'Ẩn máy thủ công'}</span>
            </Button>

            {/* Action Button: Bật / tắt bảng số liệu tóm tắt */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMachineSummaryTable(!showMachineSummaryTable)}
              className={`uppercase text-[11px] font-semibold ${
                showMachineSummaryTable
                  ? 'text-emerald-700 hover:text-emerald-800'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Bật/tắt bảng tổng hợp số liệu máy"
            >
              <TableProperties
                size={13}
                className={showMachineSummaryTable ? 'text-emerald-600' : 'text-slate-500'}
              />
              <span>{showMachineSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
            </Button>
          </div>
        </div>

        {/* Khung biểu đồ */}
        <div
          style={{
            width: '100%',
            height: 'clamp(480px, 56vh, 560px)',
            border: '1px solid #e2e8f0',
            padding: '20px 20px 10px 0',
            background: '#ffffff'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {machineChartMode === 'runtime' ? (
              <BarChart
                data={executiveVerticalData}
                margin={{ top: 25, right: 25, left: 10, bottom: 85 }}
              >
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
                  domain={[0, (dataMax) => Math.max(26, Math.ceil(dataMax * 1.1))]}
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
                  y={24}
                  stroke="#dc2626"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Mức chuẩn 24h/ngày',
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
                  shape={<MachineRuntimeVerticalBar />}
                >
                  {executiveVerticalData.map((entry, index) => (
                    <Cell key={`cell-v-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : machineChartMode === 'composed' ? (
              <ComposedChart
                data={executiveVerticalData}
                margin={{ top: 25, right: 50, left: 15, bottom: 85 }}
              >
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
                  domain={[0, (dataMax) => Math.max(26, Math.ceil(dataMax * 1.1))]}
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
                  y={24}
                  stroke="#dc2626"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Mức chuẩn 24h/ngày',
                    position: 'top',
                    fill: '#dc2626',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="totalRuntimeHours"
                  name="Giờ chạy máy (h)"
                  barSize={18}
                  activeBar={false}
                  shape={<MachineRuntimeVerticalBar />}
                >
                  {executiveVerticalData.map((entry, index) => (
                    <Cell key={`cell-comp-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ticketCount"
                  name="Số lượng phiếu (phiếu)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#d97706', stroke: '#ffffff', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={executiveVerticalData}
                margin={{ top: 25, right: 25, left: 15, bottom: 85 }}
              >
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
                  activeBar={false}
                  shape={(props) => {
                    const { x, y, width, height, fill, value } = props
                    if (height === 0 || isNaN(y)) return null
                    const centerX = x + width / 2
                    return (
                      <g>
                        <rect x={x} y={y} width={width} height={height} fill={fill} />
                        <text
                          x={centerX}
                          y={Math.max(12, y - 6)}
                          fill="#01411b"
                          textAnchor="middle"
                          fontSize={10.5}
                          fontWeight={700}
                          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        >
                          {value ? Number(value).toLocaleString('vi-VN') : 0}
                        </text>
                      </g>
                    )
                  }}
                />
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
                  const isSelected =
                    selectedMachine === row.machineCode || selectedMachine === row.machineName
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isSelected
                          ? '#f0fdfa'
                          : idx % 2 === 1
                            ? '#fafafa'
                            : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                        <span
                          onClick={() =>
                            setSelectedMachine(
                              isSelected ? 'ALL' : row.machineCode || row.machineName
                            )
                          }
                          style={{
                            cursor: 'pointer',
                            color: isSelected ? '#0f766e' : '#0f172a',
                            fontWeight: isSelected ? 800 : 600,
                            textDecoration: isSelected ? 'underline' : 'none'
                          }}
                          title={isSelected ? 'Bấm để hủy lọc' : 'Bấm để lọc theo cụm máy này'}
                        >
                          <b style={{ color: '#01411b', marginRight: 6 }}>{row.machineCode}</b> -{' '}
                          {row.machineName}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', color: '#475569', fontSize: 12 }}>
                        {row.teamName || 'Tổ SX'}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        {row.ticketCount?.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: Number(row.totalRuntimeHours) > 24 ? '#dc2626' : '#01411b'
                        }}
                      >
                        {Number(row.totalRuntimeHours).toLocaleString('vi-VN', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1
                        })}
                        h
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#334155'
                        }}
                      >
                        {row.totalActualQty?.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#01411b'
                        }}
                      >
                        {row.totalPassQty?.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b' }}>
                        {row.speed
                          ? `${Number(row.speed).toLocaleString('vi-VN')} ${row.unit || 'SP'}/h`
                          : '-'}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color:
                            Number(row.passRate) >= 95
                              ? '#01411b'
                              : Number(row.passRate) >= 80
                                ? '#d97706'
                                : '#dc2626'
                        }}
                      >
                        {row.passRate}%
                      </td>
                    </tr>
                  )
                })}
                {displayMachineList.length > 0 && (
                  <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                    <td
                      colSpan={2}
                      style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}
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
                      {machineGrandTotal.totalTickets?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#01411b'
                      }}
                    >
                      {Number(machineGrandTotal.totalRuntime).toLocaleString('vi-VN', {
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
                      {machineGrandTotal.totalActual?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f766e'
                      }}
                    >
                      {machineGrandTotal.totalPass?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#475569'
                      }}
                    >
                      {machineGrandTotal.avgSpeed
                        ? `${Number(machineGrandTotal.avgSpeed).toLocaleString('vi-VN')} SP/h`
                        : '-'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 900,
                        color: '#0f766e'
                      }}
                    >
                      {machineGrandTotal.avgPassRate}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic', marginTop: 6 }}>
          * Nguồn dữ liệu: Dữ liệu đối soát tự động từ hệ thống MES và Bravo ERP.
        </div>
      </div>

      {/* 5. EXECUTIVE SECTION II: BIỂU ĐỒ 2 - ĐỐI CHIẾU NĂNG SUẤT GIỮA CÁC TỔ SẢN XUẤT */}
      <div
        ref={chart3Ref}
        style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}
      >
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
              <span>2. THỐNG KÊ SẢN LƯỢNG SẢN XUẤT & ĐẠT THEO TỔ SẢN XUẤT</span>
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
              Thống kê đối chiếu tổng sản lượng sản xuất thực tế và sản lượng đạt chuẩn KCS của{' '}
              <b>{teamAggregates.length} tổ sản xuất</b> ghi nhận trong kỳ ({plantName || 'Nhà máy'}
              ). Phản ánh trực quan khối lượng sản xuất thực tế, số lượng đạt và lượng lỗi phát sinh
              của từng tổ.
            </div>
          </div>
          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTeamSummaryTable(!showTeamSummaryTable)}
              className={`uppercase text-[11px] font-semibold ${
                showTeamSummaryTable
                  ? 'text-emerald-700 hover:text-emerald-800'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Bật/tắt bảng tổng hợp số liệu theo tổ"
            >
              <TableProperties
                size={13}
                className={showTeamSummaryTable ? 'text-emerald-600' : 'text-slate-500'}
              />
              <span>{showTeamSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}</span>
            </Button>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: Math.max(380, executiveHorizontalData.length * 56 + 90),
            border: '1px solid #e2e8f0',
            padding: '16px 24px 16px 10px',
            background: '#ffffff'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={executiveHorizontalData}
              margin={{ top: 15, right: 90, left: 160, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                tickFormatter={(v) => v.toLocaleString('vi-VN')}
                fontSize={11.5}
                tick={{ fill: '#334155' }}
                label={{
                  value: 'Sản lượng (SP)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: '#334155',
                  fontSize: 12,
                  fontWeight: 700
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                fontSize={12}
                tick={{ fill: '#0f172a', fontWeight: 700 }}
                width={150}
              />
              <RechartsTooltip content={<ExecutiveChartTooltip unit=" SP" />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
              />
              <Bar
                dataKey="actualQty"
                name="SL Sản xuất thực tế"
                fill="#01411b"
                barSize={14}
                radius={[0, 2, 2, 0]}
              >
                <LabelList
                  dataKey="actualQty"
                  position="right"
                  formatter={(v) => (v ? Number(v).toLocaleString('vi-VN') : '')}
                  style={{ fill: '#01411b', fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
              <Bar
                dataKey="passQty"
                name="SL Đạt KCS"
                fill="#166534"
                barSize={14}
                radius={[0, 2, 2, 0]}
              >
                <LabelList
                  dataKey="passQty"
                  position="right"
                  formatter={(v) => (v ? Number(v).toLocaleString('vi-VN') : '')}
                  style={{ fill: '#166534', fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
              <Bar
                dataKey="defectQty"
                name="SL Lỗi / Phế phẩm"
                fill="#be123c"
                barSize={14}
                radius={[0, 2, 2, 0]}
              >
                <LabelList
                  dataKey="defectQty"
                  position="right"
                  formatter={(v) => (v > 0 ? Number(v).toLocaleString('vi-VN') : '')}
                  style={{ fill: '#be123c', fontSize: 10, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bảng Gom nhóm theo Tổ Sản Xuất Phong Cách OpenAI Technical Table */}
        {showTeamSummaryTable && (
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
                    Phế phẩm / Lỗi
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
                    Tỷ lệ MES
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
                    Cảnh báo (&lt;5p / &gt;12h)
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayTeamList.map((row, idx) => {
                  const isSelected = selectedTeam === row.teamName
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isSelected
                          ? '#f0fdf4'
                          : idx % 2 === 1
                            ? '#fafafa'
                            : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                        <span
                          onClick={() => setSelectedTeam(isSelected ? 'ALL' : row.teamName)}
                          style={{
                            cursor: 'pointer',
                            color: isSelected ? '#01411b' : '#0f172a',
                            fontWeight: isSelected ? 800 : 600,
                            textDecoration: isSelected ? 'underline' : 'none'
                          }}
                          title={isSelected ? 'Bấm để hủy lọc' : 'Bấm để lọc theo tổ này'}
                        >
                          {row.teamName || 'Không xác định'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        {row.ticketCount?.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#334155'
                        }}
                      >
                        {row.totalActualQty?.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#0f172a'
                        }}
                      >
                        {row.totalPassQty?.toLocaleString('vi-VN')}
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          color: Number(row.totalDefectQty) > 0 ? '#dc2626' : '#64748b'
                        }}
                      >
                        <span style={{ fontWeight: Number(row.totalDefectQty) > 0 ? 700 : 400 }}>
                          {row.totalDefectQty?.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        {row.passRate}%
                      </td>
                      <td
                        style={{
                          padding: '9px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#334155'
                        }}
                      >
                        {row.mesRate}%
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12 }}>
                        {row.under5Min > 0 && (
                          <span
                            style={{ color: '#dc2626', fontWeight: 700, marginRight: 6 }}
                            title="Số đơn nhập dưới 5 phút"
                          >
                            {row.under5Min} (&lt;5p)
                          </span>
                        )}
                        {row.anomalies > 0 && (
                          <span
                            style={{ color: '#dc2626', fontWeight: 700 }}
                            title="Số đơn chạy trên 12h cần kiểm tra"
                          >
                            {row.anomalies} (&gt;12h)
                          </span>
                        )}
                        {!row.under5Min && !row.anomalies && (
                          <span style={{ color: '#64748b', fontWeight: 500 }}>Chuẩn</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {displayTeamList.length > 0 && (
                  <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                      TỔNG CỘNG ({displayTeamList.length} TỔ)
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {teamGrandTotal.totalTickets?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {teamGrandTotal.totalActual?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {teamGrandTotal.totalPass?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: teamGrandTotal.totalDefect > 0 ? '#dc2626' : '#0f172a'
                      }}
                    >
                      {teamGrandTotal.totalDefect?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {teamGrandTotal.avgPassRate}%
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {teamGrandTotal.mesRate}%
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#334155'
                      }}
                    >
                      {teamGrandTotal.totalUnder5 > 0 ? `${teamGrandTotal.totalUnder5} (<5p)` : ''}{' '}
                      {teamGrandTotal.totalAnomalies > 0
                        ? `${teamGrandTotal.totalAnomalies} (>12h)`
                        : ''}
                      {!teamGrandTotal.totalUnder5 && !teamGrandTotal.totalAnomalies ? 'Chuẩn' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6 & 7. EXECUTIVE ROW: BIỂU ĐỒ III & BIỂU ĐỒ IV (CHIA ĐÔI 1 HÀNG) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: 24,
          marginBottom: 44,
          width: '100%',
          alignItems: 'start'
        }}
      >
        {/* CỘT TRÁI: III. THỐNG KÊ ĐỘ TRỄ THỜI GIAN ĐỒNG BỘ 2 HỆ THỐNG */}
        <div ref={syncChartRef} style={{ width: '100%', background: '#ffffff', padding: '8px 0' }}>
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
                <b>{kpiMetrics.totalTickets.toLocaleString('vi-VN')} phiếu</b> (
                {plantName || 'Nhà máy'}). Độ trễ TB:{' '}
                <b style={{ color: '#01411b' }}>{kpiMetrics.avgSyncDelaySeconds}s</b> (
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
                              {d.count?.toLocaleString('vi-VN')} phiếu
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
            <div style={{ width: '100%', marginTop: 14, overflowX: 'auto' }}>
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
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Dải thời gian đồng bộ
                    </th>
                    <th
                      style={{
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Đánh giá mức độ
                    </th>
                    <th
                      style={{
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: '#0f172a',
                        textAlign: 'right',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Số phiếu
                    </th>
                    <th
                      style={{
                        padding: '8px 10px',
                        fontWeight: 700,
                        color: '#0f172a',
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
                            padding: '8px 10px',
                            fontWeight: 600,
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: 2,
                              background: row.color || '#01411b',
                              display: 'inline-block',
                              flexShrink: 0
                            }}
                          />
                          {row.group}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569', fontSize: 11 }}>
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
                            padding: '8px 10px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: '#0f172a'
                          }}
                        >
                          {row.count?.toLocaleString('vi-VN')}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
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
                    <td
                      colSpan={2}
                      style={{ padding: '9px 10px', fontWeight: 800, color: '#0f172a' }}
                    >
                      TỔNG CỘNG
                    </td>
                    <td
                      style={{
                        padding: '9px 10px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a'
                      }}
                    >
                      {kpiMetrics.totalTickets?.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '9px 10px',
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

        {/* CỘT PHẢI: IV. THỐNG KÊ PHÂN BỔ LOẠI CHỨNG TỪ XUẤT/NHẬP TỰ ĐỘNG */}
        <div
          ref={autoExportChartRef}
          style={{ width: '100%', background: '#ffffff', padding: '8px 0' }}
        >
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
                Liên kết tự động xuất/nhập kho trên{' '}
                <b>{kpiMetrics.totalTickets.toLocaleString('vi-VN')} phiếu</b> (
                {plantName || 'Nhà máy'}). Tỷ lệ tự động:{' '}
                <b style={{ color: '#01411b' }}>{kpiMetrics.autoExportRate}%</b> (
                {Number(kpiMetrics.autoExportCount || 0).toLocaleString('vi-VN')} /{' '}
                {Number(
                  kpiMetrics.totalApplicableAutoIo ||
                    Number(kpiMetrics.autoExportCount || 0) +
                      Number(kpiMetrics.noAutoExportCount || 0) ||
                    kpiMetrics.totalTickets
                ).toLocaleString('vi-VN')}{' '}
                phiếu áp dụng) • Chưa sinh/thiếu:{' '}
                <b style={{ color: '#dc2626' }}>
                  {Number(kpiMetrics.noAutoExportCount || 0).toLocaleString('vi-VN')} phiếu (
                  {kpiMetrics.noAutoExportRate}%)
                </b>
                {Number(kpiMetrics.noMaterialAutoIoCount || 0) > 0 && (
                  <span>
                    {' '}
                    • Không NVL:{' '}
                    <b>{Number(kpiMetrics.noMaterialAutoIoCount).toLocaleString('vi-VN')}</b>
                  </span>
                )}
                .
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
              value={autoExportTab}
              onValueChange={(val) => {
                setAutoExportTab(val)
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
                <TabsTrigger value="missing_list" variant="line" indicatorColor="#dc2626">
                  Danh sách phiếu chưa có XNTĐ
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Công thức tính vắn tắt */}
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              CT: <b>(Đã sinh / Tổng áp dụng)</b> ={' '}
              {Number(kpiMetrics.autoExportCount || 0).toLocaleString('vi-VN')}/
              {(
                Number(kpiMetrics.totalApplicableAutoIo) ||
                Number(kpiMetrics.autoExportCount || 0) +
                  Number(kpiMetrics.noAutoExportCount || 0) ||
                Number(kpiMetrics.totalTickets || 0)
              ).toLocaleString('vi-VN')}{' '}
              = <b>{kpiMetrics.autoExportRate}%</b>
            </div>
          </div>

          {/* TAB 1: BIỂU ĐỒ & BẢNG PHÂN BỔ LOẠI CHỨNG TỪ */}
          {autoExportTab === 'breakdown' && (
            <div>
              {/* Biểu đồ phân bổ loại chứng từ tự động */}
              <div
                style={{
                  width: '100%',
                  height: Math.max(260, (kpiMetrics.autoExportBreakdown?.length || 5) * 44 + 50),
                  border: '1px solid #e2e8f0',
                  padding: '14px 16px 14px 6px',
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
                                  {d.count?.toLocaleString('vi-VN')} phiếu
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
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                                      (isMissing
                                        ? '#dc2626'
                                        : isNoMaterial
                                          ? '#94a3b8'
                                          : '#01411b'),
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
                                  color: isMissing
                                    ? '#dc2626'
                                    : isNoMaterial
                                      ? '#64748b'
                                      : '#059669'
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
                                {row.count?.toLocaleString('vi-VN')}
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
                          {kpiMetrics.totalTickets?.toLocaleString('vi-VN')}
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
          {autoExportTab === 'missing_list' && (
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
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}
                >
                  <input
                    type="text"
                    placeholder="Tìm theo số phiếu, LSX, mã hàng, tên hàng, tổ SX..."
                    value={missingAutoExportSearchText}
                    onChange={(e) => setMissingAutoExportSearchText(e.target.value)}
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
                    Hiển thị{' '}
                    <b>{filteredMissingAutoExportTickets.length.toLocaleString('vi-VN')}</b> /{' '}
                    {missingAutoExportTickets.length.toLocaleString('vi-VN')} phiếu
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PureButton
                    onClick={handleCopyMissingAutoExport}
                    style={{
                      borderColor: copiedMissingAutoExport ? '#059669' : '#cbd5e1',
                      background: copiedMissingAutoExport ? '#ecfdf5' : '#ffffff',
                      color: copiedMissingAutoExport ? '#059669' : '#334155',
                      fontWeight: 600,
                      fontSize: 11.5,
                      padding: '5px 12px'
                    }}
                  >
                    {copiedMissingAutoExport ? '✓ Đã sao chép DS' : 'Sao chép DS phiếu'}
                  </PureButton>
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
                    {filteredMissingAutoExportTickets.length === 0 ? (
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
                      filteredMissingAutoExportTickets.map((row, idx) => (
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
                    {filteredMissingAutoExportTickets.length > 0 && (
                      <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                        <td
                          colSpan={3}
                          style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}
                        >
                          TỔNG CỘNG (
                          {filteredMissingAutoExportTickets.length.toLocaleString('vi-VN')} PHIẾU
                          CHƯA CÓ XNTĐ)
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
      </div>

      {/* 8. EXECUTIVE SECTION V: NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT */}
      <div style={{ marginBottom: 40, marginTop: 40 }}>
        {/* Header Section */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span>5. NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT</span>
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
            Bảng dữ liệu chi tiết toàn bộ <b>{filteredData.length} phiếu</b> thống kê tác nghiệp sản
            xuất tại {plantName || 'Nhà máy'}. Tổng hợp chi tiết thời gian chạy máy, công đoạn, phân
            xưởng, sản lượng thực tế và tỷ lệ đạt KCS theo từng phiếu.
          </div>
        </div>

        {/* Header toolbar & Tổng hợp số liệu chi tiết */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderBottom: 'none',
            padding: '6px 12px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              color: '#334155',
              fontWeight: 700,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <span>
              Tổng SL Sản xuất:{' '}
              <b style={{ color: '#0f172a' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.ProdQty ?? d.actualQty ?? d.output) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng SL Đạt:{' '}
              <b style={{ color: '#01411b' }}>
                {displayDetailList
                  .reduce(
                    (acc, d) => acc + (Number(d.PassQty ?? d.passQty ?? d.passQuantity) || 0),
                    0
                  )
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng Mét Thực tế:{' '}
              <b style={{ color: '#0f172a' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.ActualMeters ?? d.actualMeters) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng Mét Định mức:{' '}
              <b style={{ color: '#475569' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.StandardMeters ?? d.standardMeters) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng giờ chạy:{' '}
              <b style={{ color: '#01411b' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.runtimeHours) || 0), 0)
                  .toFixed(1)}
                h
              </b>
            </span>
          </div>

          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailSearch((prev) => !prev)}
              className={`uppercase text-[11px] font-semibold ${
                showDetailSearch
                  ? 'text-emerald-700 hover:text-emerald-800'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="Mở tìm kiếm nhanh trong bảng (Ctrl + F)"
            >
              <Search size={13} className="text-blue-500" />
              <span>TÌM KIẾM (CTRL+F)</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const colsToCopy = (detailGridCols || []).filter(
                  (c) => c.id && c.id !== 'WorkingTag'
                )
                handleCopyTable(
                  displayDetailList,
                  colsToCopy.map((c) => c.title || c.id),
                  colsToCopy.map((c) => c.id)
                )
              }}
              className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
              title="Sao chép toàn bộ dữ liệu bảng này vào Clipboard"
            >
              <Copy size={13} className="text-slate-500" />
              <span>SAO CHÉP</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportDetailExcel}
              className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900"
              title="Xuất bảng chi tiết ra file Excel"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>XUẤT EXCEL</span>
            </Button>
          </div>
        </div>

        {/* DataEditor Container */}
        <div
          style={{
            height: 480,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            position: 'relative'
          }}
        >
          <DataEditor
            ref={detailGridRef}
            columns={detailGridCols}
            rows={displayDetailList.length}
            getCellContent={getDetailCellContent}
            onHeaderClicked={onDetailHeaderClicked}
            onColumnResize={onDetailColumnResize}
            getCellsForSelection={true}
            rangeSelect="rect"
            columnSelect="multi"
            rowSelect="multi"
            rowMarkers="both"
            rowHeight={23}
            headerHeight={23}
            smoothScrollX={true}
            smoothScrollY={true}
            showSearch={showDetailSearch}
            onSearchClose={() => setShowDetailSearch(false)}
            keybindings={{ search: true, downFill: true, rightFill: true }}
            theme={executiveGridTheme}
            width="100%"
            height="100%"
          />
        </div>
      </div>

      {/* SỔ TAY CÔNG THỨC & QUY TẮC TÍNH TOÁN MODAL */}
      <FormulaHandbookModal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        defaultReportType="stat"
      />
    </div>
  )
}
