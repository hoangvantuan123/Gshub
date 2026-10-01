/* eslint-disable react/prop-types */
import { useState, useRef } from 'react'
import {
  RotateCcw,
  FileSpreadsheet,
  Camera,
  Cpu,
  Users,
  Clock,
  Download,
  Maximize2,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Copy,
  Calendar,
  Layers
} from 'lucide-react'
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
import { FormulaHandbookModal } from './FormulaHandbookModal'
import { useProductionStatisticsLogic } from '../hooks/useProductionStatisticsLogic'

export default function ProductionStatisticsReport(props) {
  const {
    plantName = 'Nhà máy GS Hà Nội',
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
    fullscreenTable,
    setFullscreenTable,

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
              <b>Đơn vị:</b> {plantName || 'Nhà máy GS Hà Nội'} • <b>Hệ thống:</b> MES Engine &
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

      {/* 1. TOP TOOLBAR & CONTROLS (Ẩn khi chụp ảnh và in ấn để văn bản sạch đẹp) */}
      <div
        className="report-interactive-toolbar screenshot-hide"
        style={{
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 0',
          marginBottom: 26,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {masterList && masterList.length > 0 ? (
              <MasterBatchSearchSelect
                masterList={masterList}
                selectedMasterKey={selectedMasterKey}
                onSelectMaster={onSelectMaster}
                onRefreshMaster={onRefreshMaster}
                loading={loadingMaster}
              />
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 4,
                  fontSize: 12,
                  color: '#92400e',
                  fontWeight: 600
                }}
              >
                <span>⚠️ Chưa có đợt TKSX nào được đăng ký cho {plantName || 'nhà máy'}</span>
              </div>
            )}
          </div>

          {/* Nhóm công cụ thao tác */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <PureButton
              icon={
                <span style={{ fontWeight: 900, fontSize: 13, color: '#0369a1', lineHeight: 1 }}>
                  !
                </span>
              }
              onClick={() => setShowFormulaModal(true)}
              style={{
                borderColor: '#38bdf8',
                color: '#0369a1',
                background: '#f0f9ff',
                fontWeight: 700
              }}
              title="Xem toàn bộ sổ tay công thức, nguồn dữ liệu và vị trí áp dụng"
            >
              Công thức & Chỉ số (!)
            </PureButton>
            <PureButton icon={<FileSpreadsheet size={12} />} onClick={handleExportExcel}>
              Xuất Excel (XLSX)
            </PureButton>
            <PureButton
              type="primary"
              loading={isCapturing}
              icon={<Camera size={12} />}
              onClick={handleCaptureScreenshot}
            >
              Tải ảnh toàn bộ báo cáo
            </PureButton>
          </div>
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
            <b>Đơn vị:</b> {plantName || 'Nhà máy GS Hà Nội'}
          </span>
          <span>•</span>
          <span>
            <b>Hệ thống:</b> MES Engine & Bravo ERP
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
              color: '#0f172a',
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
            <span style={{ color: kpiMetrics.noAutoExportCount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
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
              <span>
                I. THỐNG KÊ TỔNG GIỜ CHẠY MÁY & PHÂN BỔ TẢI TRỌNG THEO CỤM MÁY
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
              Thống kê tổng thời gian chạy máy (giờ) và số lượng phiếu thực hiện của{' '}
              <b>{executiveVerticalData.length} cụm máy / tổ sản xuất</b> ({plantName || 'Nhà máy'}
              ). Biểu đồ cung cấp góc nhìn trực quan về tổng giờ chạy máy tích lũy, phân bổ tải
              trọng và mối tương quan giữa khối lượng thao tác với thời gian vận hành giữa các thiết
              bị.
            </div>
          </div>

          {/* Công cụ chuyển đổi loại biểu đồ (Chart Mode Switcher) & Lọc máy thủ công & Tải ảnh */}
          <div
            className="screenshot-hide"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              marginTop: 2
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                color: showManualMachines ? '#01411b' : '#475569',
                cursor: 'pointer',
                userSelect: 'none',
                background: showManualMachines ? '#f0fdf4' : '#ffffff',
                border: `1px solid ${showManualMachines ? '#86efac' : '#cbd5e1'}`,
                padding: '0 8px',
                borderRadius: 3,
                boxSizing: 'border-box',
                transition: 'all 0.15s ease'
              }}
              title="Mặc định ẩn các máy/tổ có tên 'Thủ công'. Tích chọn để hiển thị cả máy thủ công."
            >
              <input
                type="checkbox"
                checked={showManualMachines}
                onChange={(e) => setShowManualMachines(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#01411b' }}
              />
              <span>Hiện máy thủ công</span>
            </label>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                border: '1px solid #cbd5e1',
                borderRadius: 3,
                background: '#f8fafc',
                overflow: 'hidden',
                boxSizing: 'border-box',
                verticalAlign: 'middle'
              }}
            >
              <button
                type="button"
                onClick={() => setMachineChartMode('runtime')}
                style={{
                  height: '100%',
                  border: 'none',
                  padding: '0 10px',
                  fontSize: 11.5,
                  fontWeight: machineChartMode === 'runtime' ? 700 : 500,
                  background: machineChartMode === 'runtime' ? '#01411b' : 'transparent',
                  color: machineChartMode === 'runtime' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  lineHeight: 1
                }}
              >
                Tổng giờ chạy máy (h)
              </button>
              <button
                type="button"
                onClick={() => setMachineChartMode('composed')}
                style={{
                  height: '100%',
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  borderRight: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: 11.5,
                  fontWeight: machineChartMode === 'composed' ? 700 : 500,
                  background: machineChartMode === 'composed' ? '#01411b' : 'transparent',
                  color: machineChartMode === 'composed' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  lineHeight: 1
                }}
              >
                Giờ chạy & Số phiếu (Kết hợp)
              </button>
              <button
                type="button"
                onClick={() => setMachineChartMode('tickets')}
                style={{
                  height: '100%',
                  border: 'none',
                  padding: '0 10px',
                  fontSize: 11.5,
                  fontWeight: machineChartMode === 'tickets' ? 700 : 500,
                  background: machineChartMode === 'tickets' ? '#01411b' : 'transparent',
                  color: machineChartMode === 'tickets' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  lineHeight: 1
                }}
              >
                Số phiếu theo máy
              </button>
            </div>

            <PureButton
              icon={<Layers size={12} />}
              onClick={() => setShowMachineSummaryTable(!showMachineSummaryTable)}
              title={
                showMachineSummaryTable
                  ? 'Thu gọn bảng dữ liệu tóm tắt'
                  : 'Mở bảng dữ liệu tóm tắt cụm máy'
              }
              style={{
                borderColor: showMachineSummaryTable ? '#01411b' : '#cbd5e1',
                color: showMachineSummaryTable ? '#01411b' : '#334155',
                background: showMachineSummaryTable ? '#f0fdf4' : '#ffffff',
                fontWeight: showMachineSummaryTable ? 700 : 500
              }}
            >
              {showMachineSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}
            </PureButton>
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
              <span>
                II. THỐNG KÊ SẢN LƯỢNG SẢN XUẤT & ĐẠT THEO TỔ SẢN XUẤT
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
              Thống kê đối chiếu tổng sản lượng sản xuất thực tế và sản lượng đạt chuẩn KCS của{' '}
              <b>{teamAggregates.length} tổ sản xuất</b> ghi nhận trong kỳ ({plantName || 'Nhà máy'}
              ). Phản ánh trực quan khối lượng sản xuất thực tế, số lượng đạt và lượng lỗi phát sinh
              của từng tổ.
            </div>
          </div>
          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
          >
            <PureButton
              icon={<Layers size={12} />}
              onClick={() => setShowTeamSummaryTable(!showTeamSummaryTable)}
              title={
                showTeamSummaryTable
                  ? 'Thu gọn bảng dữ liệu tóm tắt'
                  : 'Mở bảng dữ liệu tóm tắt tổ sản xuất'
              }
              style={{
                borderColor: showTeamSummaryTable ? '#01411b' : '#cbd5e1',
                color: showTeamSummaryTable ? '#01411b' : '#334155',
                background: showTeamSummaryTable ? '#f0fdf4' : '#ffffff',
                fontWeight: showTeamSummaryTable ? 700 : 500
              }}
            >
              {showTeamSummaryTable ? 'Đóng bảng số liệu' : 'Mở bảng số liệu'}
            </PureButton>
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
        <div
          ref={syncChartRef}
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
                <span>III. THỐNG KÊ ĐỘ TRỄ THỜI GIAN ĐỒNG BỘ 2 HỆ THỐNG</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#475569',
                  marginTop: 4,
                  lineHeight: 1.5
                }}
              >
                Độ trễ truyền tải từ MES về Bravo ERP trên toàn bộ <b>{kpiMetrics.totalTickets.toLocaleString('vi-VN')} phiếu</b> ({plantName || 'Nhà máy'}). Độ trễ TB: <b style={{ color: '#01411b' }}>{kpiMetrics.avgSyncDelaySeconds}s</b> ({kpiMetrics.syncLatencyFormatted}) • Tức thời: <b style={{ color: '#01411b' }}>{kpiMetrics.syncSuccessRate}</b>.
              </div>
            </div>
            <div
              className="screenshot-hide"
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}
            >
              <PureButton
                icon={<Layers size={12} />}
                onClick={() => setShowSyncTable(!showSyncTable)}
                title={showSyncTable ? 'Thu gọn bảng dữ liệu tóm tắt' : 'Mở bảng dữ liệu tóm tắt'}
                style={{
                  borderColor: showSyncTable ? '#01411b' : '#cbd5e1',
                  color: showSyncTable ? '#01411b' : '#334155',
                  background: showSyncTable ? '#f0fdf4' : '#ffffff',
                  fontWeight: showSyncTable ? 700 : 500,
                  fontSize: 11.5,
                  padding: '4px 8px'
                }}
              >
                {showSyncTable ? 'Đóng bảng' : 'Mở bảng'}
              </PureButton>
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
                          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>{d.group}</div>
                          <div>Số lượng phiếu: <b style={{ color: '#ffffff' }}>{d.count?.toLocaleString('vi-VN')} phiếu</b></div>
                          <div>Tỷ lệ chiếm: <b style={{ color: '#a7f3d0' }}>{d.rate}%</b></div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="count"
                  barSize={18}
                  radius={[0, 2, 2, 0]}
                >
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
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Dải thời gian đồng bộ
                    </th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Đánh giá mức độ
                    </th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Số phiếu
                    </th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: row.color || '#01411b', display: 'inline-block', flexShrink: 0 }} />
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
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {row.count?.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {row.rate}%
                        </td>
                      </tr>
                    ))}
                  <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                    <td colSpan={2} style={{ padding: '9px 10px', fontWeight: 800, color: '#0f172a' }}>
                      TỔNG CỘNG
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {kpiMetrics.totalTickets?.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
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
                <span>IV. THỐNG KÊ PHÂN BỔ LOẠI CHỨNG TỪ XUẤT/NHẬP TỰ ĐỘNG</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#475569',
                  marginTop: 4,
                  lineHeight: 1.5
                }}
              >
                Liên kết tự động xuất/nhập kho trên <b>{kpiMetrics.totalTickets.toLocaleString('vi-VN')} phiếu</b> ({plantName || 'Nhà máy'}). Tỷ lệ tự động: <b style={{ color: '#0d9488' }}>{kpiMetrics.autoExportRate}%</b> ({kpiMetrics.autoExportCount.toLocaleString('vi-VN')} phiếu) • Chưa sinh/thiếu: <b style={{ color: '#dc2626' }}>{kpiMetrics.noAutoExportCount.toLocaleString('vi-VN')} phiếu ({kpiMetrics.noAutoExportRate}%)</b>.
              </div>
            </div>
            <div
              className="screenshot-hide"
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}
            >
              <PureButton
                icon={<Layers size={12} />}
                onClick={() => setShowAutoExportTable(!showAutoExportTable)}
                title={showAutoExportTable ? 'Thu gọn bảng dữ liệu tóm tắt' : 'Mở bảng dữ liệu tóm tắt'}
                style={{
                  borderColor: showAutoExportTable ? '#01411b' : '#cbd5e1',
                  color: showAutoExportTable ? '#01411b' : '#334155',
                  background: showAutoExportTable ? '#f0fdf4' : '#ffffff',
                  fontWeight: showAutoExportTable ? 700 : 500,
                  fontSize: 11.5,
                  padding: '4px 8px'
                }}
              >
                {showAutoExportTable ? 'Đóng bảng' : 'Mở bảng'}
              </PureButton>
            </div>
          </div>

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
                          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>{d.label}</div>
                          <div>Số lượng phiếu: <b style={{ color: '#ffffff' }}>{d.count?.toLocaleString('vi-VN')} phiếu</b></div>
                          <div>Tỷ lệ chiếm: <b style={{ color: '#a7f3d0' }}>{d.rate}%</b></div>
                          <div>Đánh giá: <b style={{ color: d.isMissing ? '#fca5a5' : d.isNoMaterial ? '#cbd5e1' : '#a7f3d0' }}>{d.isMissing ? 'Chưa sinh / Thiếu phiếu' : d.isNoMaterial ? 'Không sử dụng NVL' : 'Đã sinh / Hợp lệ'}</b></div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="count"
                  barSize={18}
                  radius={[0, 2, 2, 0]}
                >
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

          {/* Bảng Gom nhóm phân bổ loại chứng từ tự động */}
          {showAutoExportTable && (
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
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Loại trạng thái chứng từ tự động
                    </th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Đánh giá KPI
                    </th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Số phiếu
                    </th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Tỷ lệ (%)
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
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: row.color || (isMissing ? '#dc2626' : isNoMaterial ? '#94a3b8' : '#01411b'), display: 'inline-block', flexShrink: 0 }} />
                            {row.label}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: isMissing ? '#dc2626' : isNoMaterial ? '#64748b' : '#059669' }}>
                            {isMissing ? 'Chưa sinh / Thiếu phiếu' : isNoMaterial ? 'Không sử dụng NVL' : 'Đã sinh / Hợp lệ'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            {row.count?.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {row.rate}%
                          </td>
                        </tr>
                      )
                    })}
                  <tr style={{ borderTop: '1.5px solid #0f172a', background: '#f1f5f9' }}>
                    <td colSpan={2} style={{ padding: '9px 10px', fontWeight: 800, color: '#0f172a' }}>
                      TỔNG CỘNG
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {kpiMetrics.totalTickets?.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                      100.0%
                    </td>
                  </tr>
                </tbody>
              </table>
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
            <span>
              V. NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT
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
            Bảng dữ liệu chi tiết toàn bộ <b>{filteredData.length} phiếu</b> thống kê tác nghiệp sản xuất tại {plantName || 'Nhà máy'}. Tổng hợp chi tiết thời gian chạy máy, công đoạn, phân xưởng, sản lượng thực tế và tỷ lệ đạt KCS theo từng phiếu.
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
                  .reduce((acc, d) => acc + (Number(d.PassQty ?? d.passQty ?? d.passQuantity) || 0), 0)
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
            <PureButton
              icon={<Search size={12} />}
              onClick={() => setShowDetailSearch((prev) => !prev)}
              title="Mở tìm kiếm nhanh trong bảng (Ctrl + F)"
              style={{
                borderColor: showDetailSearch ? '#01411b' : '#cbd5e1',
                color: showDetailSearch ? '#01411b' : '#334155',
                background: showDetailSearch ? '#f0fdf4' : '#ffffff'
              }}
            >
              Tìm kiếm (Ctrl+F)
            </PureButton>
            <PureButton
              icon={<Copy size={12} />}
              onClick={() => {
                const colsToCopy = (detailGridCols || []).filter((c) => c.id && c.id !== 'WorkingTag')
                handleCopyTable(
                  displayDetailList,
                  colsToCopy.map((c) => c.title || c.id),
                  colsToCopy.map((c) => c.id)
                )
              }}
              title="Sao chép toàn bộ dữ liệu bảng này vào Clipboard"
            >
              Sao chép
            </PureButton>
            <PureButton
              icon={<Download size={12} />}
              onClick={handleExportDetailExcel}
              title="Xuất bảng chi tiết ra file Excel"
            >
              Excel
            </PureButton>
            <PureButton
              icon={<Maximize2 size={12} />}
              onClick={() => setFullscreenTable('detail')}
              title="Xem toàn màn hình"
            />
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

      {/* FULLSCREEN DATA GRID MODAL */}
      {fullscreenTable && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Top Bar */}
          <div
            style={{
              padding: '10px 18px',
              background: '#01411b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                V. NHẬT TRÌNH CHI TIẾT TOÀN BỘ PHIẾU THỐNG KÊ SẢN XUẤT
              </div>
              <span
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '2px 8px',
                  borderRadius: 2,
                  fontSize: 11.5,
                  fontWeight: 700
                }}
              >
                {displayDetailList.length} / {filteredData.length} phiếu
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PureButton
                icon={<Search size={12} />}
                onClick={() => setShowDetailSearch((prev) => !prev)}
                style={{
                  background: showDetailSearch ? '#f0fdf4' : 'rgba(255,255,255,0.12)',
                  color: showDetailSearch ? '#01411b' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)'
                }}
                title="Mở tìm kiếm nhanh trong bảng (Ctrl + F)"
              >
                Tìm kiếm (Ctrl+F)
              </PureButton>
              <PureButton
                icon={<Copy size={12} />}
                onClick={() => {
                  const colsToCopy = (detailGridCols || []).filter((c) => c.id && c.id !== 'WorkingTag')
                  handleCopyTable(
                    displayDetailList,
                    colsToCopy.map((c) => c.title || c.id),
                    colsToCopy.map((c) => c.id)
                  )
                }}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)'
                }}
                title="Sao chép toàn bộ dữ liệu bảng"
              >
                Sao chép
              </PureButton>
              <PureButton
                icon={<Download size={12} />}
                onClick={handleExportDetailExcel}
                style={{ background: '#ffffff', color: '#01411b', border: 'none', fontWeight: 700 }}
              >
                Xuất Excel
              </PureButton>
              <button
                type="button"
                onClick={() => setFullscreenTable(null)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#ffffff',
                  height: 28,
                  padding: '0 14px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
              >
                Đóng (Esc)
              </button>
            </div>
          </div>

          {/* Main Workspace: Left Query Panel + Right Table */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff' }}>
            {/* Left Sidebar: Điều kiện truy vấn & Lọc tìm kiếm */}
            <div
              style={{
                width: 300,
                flexShrink: 0,
                borderRight: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
              }}
            >
              {/* Sidebar Header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  ĐIỀU KIỆN TRUY VẤN
                </div>
                {(detailSearchText || hasActiveFilters) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailSearchText('')
                      handleResetFilters()
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '2px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                      color: '#475569',
                      fontWeight: 600
                    }}
                  >
                    Đặt lại
                  </button>
                )}
              </div>

              {/* Sidebar Content */}
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Tìm kiếm nhanh từ khóa */}
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Từ khóa tìm kiếm:
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '4px 8px',
                      gap: 6
                    }}
                  >
                    <Search size={13} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Mã phiếu, lệnh, sản phẩm, nhân viên..."
                      value={detailSearchText}
                      onChange={(e) => setDetailSearchText(e.target.value)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        fontSize: 12,
                        width: '100%',
                        fontFamily: 'inherit',
                        color: '#0f172a'
                      }}
                    />
                    {detailSearchText && (
                      <button
                        type="button"
                        onClick={() => setDetailSearchText('')}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Lọc theo Tổ sản xuất */}
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Tổ sản xuất:
                  </label>
                  <PureSelect
                    value={selectedTeam}
                    onChange={setSelectedTeam}
                    options={[
                      { value: 'ALL', label: `Tất cả tổ (${filterOptions.teams.length})` },
                      ...filterOptions.teams.map((t) => ({ value: t, label: t }))
                    ]}
                    style={{ width: '100%', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* 3. Lọc theo Cụm máy */}
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Cụm máy:
                  </label>
                  <PureSelect
                    value={selectedMachine}
                    onChange={setSelectedMachine}
                    options={[
                      { value: 'ALL', label: `Tất cả máy (${filterOptions.machines.length})` },
                      ...filterOptions.machines.map((m) => ({
                        value: m.code,
                        label: `${m.code} - ${m.name}`
                      }))
                    ]}
                    style={{ width: '100%', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* 4. Lọc theo Phân loại thời gian chạy máy */}
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Kiểm toán thời gian chạy:
                  </label>
                  <PureSelect
                    value={selectedDurationAudit}
                    onChange={setSelectedDurationAudit}
                    options={[
                      { value: 'ALL', label: 'Tất cả mức thời gian' },
                      { value: 'UNDER_5MIN', label: '1. Thao tác < 5 phút' },
                      { value: '5MIN_12H', label: '2. Tiêu chuẩn (5p - 12h)' },
                      { value: 'OVER_12H', label: '3. Thao tác > 12 giờ' }
                    ]}
                    style={{ width: '100%', border: '1px solid #cbd5e1' }}
                  />
                </div>

                {/* KPI Overview Box inside sidebar */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#01411b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                    TỔNG HỢP SỐ LIỆU ĐANG LỌC
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#475569' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Số lượng phiếu:</span>
                      <b style={{ color: '#0f172a' }}>{displayDetailList.length}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng SL sản xuất:</span>
                      <b style={{ color: '#0f172a' }}>
                        {displayDetailList
                          .reduce((acc, d) => acc + (Number(d.ProdQty ?? d.actualQty ?? d.output) || 0), 0)
                          .toLocaleString('vi-VN')}
                      </b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng SL đạt:</span>
                      <b style={{ color: '#01411b' }}>
                        {displayDetailList
                          .reduce((acc, d) => acc + (Number(d.PassQty ?? d.passQty ?? d.passQuantity) || 0), 0)
                          .toLocaleString('vi-VN')}
                      </b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng mét thực tế:</span>
                      <b style={{ color: '#0f172a' }}>
                        {displayDetailList
                          .reduce((acc, d) => acc + (Number(d.ActualMeters ?? d.actualMeters) || 0), 0)
                          .toLocaleString('vi-VN')}
                      </b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng giờ chạy:</span>
                      <b style={{ color: '#01411b' }}>
                        {displayDetailList
                          .reduce((acc, d) => acc + (Number(d.runtimeHours) || 0), 0)
                          .toFixed(1)}h
                      </b>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Main Table Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Strip summary on top of table */}
              <div
                style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '7px 14px',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0
                }}
              >
                <div style={{ color: '#475569', fontWeight: 600 }}>
                  Danh sách kết quả: <b style={{ color: '#0f172a' }}>{displayDetailList.length}</b> phiếu thống kê
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Click tiêu đề cột để sắp xếp • Nhấp đúp kéo rộng cột • Phím tắt: Ctrl + F để tìm trong lưới
                </div>
              </div>

              {/* Grid Canvas */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <DataEditor
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
          </div>
        </div>
      )}

      {/* SỔ TAY CÔNG THỨC & QUY TẮC TÍNH TOÁN MODAL */}
      <FormulaHandbookModal isOpen={showFormulaModal} onClose={() => setShowFormulaModal(false)} />
    </div>
  )
}
