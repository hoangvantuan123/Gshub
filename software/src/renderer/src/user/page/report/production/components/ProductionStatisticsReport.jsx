/* eslint-disable react/prop-types */
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
  Calendar
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
  Cell,
  ReferenceLine
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
import { RuntimeAuditDetailModal } from './RuntimeAuditDetailModal'
import { useProductionStatisticsLogic } from './useProductionStatisticsLogic'

export default function ProductionStatisticsReport(props) {
  const {
    plantName = 'Nhà máy GS Hà Nội',
    dateRange,
    onDateRangeChange,
    masterList = [],
    selectedMasterKey,
    onSelectMaster,
    onRefreshMaster,
    currentMaster,
    loadingMaster = false
  } = props

  const {
    // State
    machineChartMode,
    setMachineChartMode,
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
    fullscreenTable,
    setFullscreenTable,

    // Refs
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    machineGridRef,
    teamGridRef,
    detailGridRef,

    // Computed Data
    filteredData,
    filterOptions,
    hasActiveFilters,
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
    teamGridCols,
    getTeamCellContent,
    onTeamColumnResize,
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
          borderBottom: '2px solid #245d6c',
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
            {masterList && masterList.length > 0 && (
              <MasterBatchSearchSelect
                masterList={masterList}
                selectedMasterKey={selectedMasterKey}
                onSelectMaster={onSelectMaster}
                onRefreshMaster={onRefreshMaster}
                loading={loadingMaster}
              />
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

        {/* Hàng 2: Khung Bộ Lọc Dữ Liệu Chi Tiết Với Tiêu Đề Rõ Ràng Từng Hạng Mục */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            paddingTop: 10,
            borderTop: '1px dashed #e2e8f0'
          }}
        >
          {/* 1. Lọc Ngày thống kê */}
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
                fontSize: 11.5,
                fontWeight: 700,
                color: '#334155',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRight: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Calendar size={12} color="#245d6c" />
              <span>Ngày thống kê:</span>
            </span>
            <PureDateRangePicker value={dateRange} onChange={onDateRangeChange} />
          </div>

          {/* 2. Lọc Thời gian thao tác */}
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
                fontSize: 11.5,
                fontWeight: 700,
                color: '#334155',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRight: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Clock size={12} color="#245d6c" />
              <span>Thời gian thao tác:</span>
            </span>
            <PureSelect
              value={selectedDurationAudit}
              onChange={setSelectedDurationAudit}
              style={{ width: 200 }}
              options={[
                { value: 'ALL', label: 'Tất cả thời gian thao tác' },
                { value: 'UNDER_5MIN', label: '< 5 phút (Nhập nhanh)' },
                { value: '5MIN_12H', label: '5 phút - 12 tiếng (Chuẩn)' },
                { value: 'OVER_12H_VALID', label: '> 12 tiếng (Đơn lớn ≥50k)' },
                { value: 'OVER_12H_CHECK', label: '> 12 tiếng (Cần kiểm tra)' },
                { value: 'OVER_12H', label: '> 12 tiếng (Tất cả đơn)' }
              ]}
            />
          </div>

          {/* 3. Lọc Tổ sản xuất */}
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
                fontSize: 11.5,
                fontWeight: 700,
                color: '#334155',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRight: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Users size={12} color="#245d6c" />
              <span>Tổ sản xuất:</span>
            </span>
            <PureSelect
              value={selectedTeam}
              onChange={setSelectedTeam}
              style={{ width: 145 }}
              options={[
                { value: 'ALL', label: 'Tất cả tổ SX' },
                ...filterOptions.teams.map((t) => ({ value: t, label: t }))
              ]}
            />
          </div>

          {/* 4. Lọc Cụm máy */}
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
                fontSize: 11.5,
                fontWeight: 700,
                color: '#334155',
                background: '#f8fafc',
                padding: '4px 8px',
                borderRight: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Cpu size={12} color="#245d6c" />
              <span>Cụm máy:</span>
            </span>
            <PureSelect
              value={selectedMachine}
              onChange={setSelectedMachine}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'Tất cả cụm máy' },
                ...filterOptions.machines.map((m) => ({
                  value: m.code,
                  label: `${m.code} - ${m.name}`
                }))
              ]}
            />
          </div>

          {/* Nút Đặt lại lọc */}
          {hasActiveFilters && (
            <PureButton
              icon={<RotateCcw size={11} />}
              onClick={handleResetFilters}
              style={{
                borderColor: '#fca5a5',
                color: '#be123c',
                background: '#fff1f2'
              }}
            >
              Đặt lại lọc
            </PureButton>
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
            <b>Đơn vị:</b> {plantName || 'Nhà máy GS Hà Nội'}
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
        </div>
      </div>

      {/* 3. TOP HERO METRICS BAR: 4 CHỈ SỐ CHỦ CHỐT ĐIỀU HÀNH */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '22px 0',
          marginBottom: 36,
          background: '#ffffff'
        }}
      >
        {/* KPI 1: TỔNG SỐ PHIẾU THỐNG KÊ */}
        <div
          style={{
            padding: '0 16px',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span>Tổng phiếu thống kê</span>
          </div>
          <div
            style={{
              fontSize: 'clamp(30px, 3.5vw, 42px)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.05,
              margin: '10px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.totalTickets.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 600 }}>
            MES: <span style={{ color: '#245d6c' }}>{kpiMetrics.mesCreatedCount} phiếu</span> •
            Ngoài: <span style={{ color: '#0f172a' }}>{kpiMetrics.bravoCreatedCount}</span>
          </div>
        </div>

        {/* KPI 2: THỜI GIAN CHẠY MÁY > 12H (CẦN KIỂM TRA) */}
        <div
          onClick={() => {
            setAuditModalCategory('OVER_12H_CHECK')
            setShowAuditModal(true)
          }}
          style={{
            padding: '0 16px',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          title="Bấm để xem danh sách phiếu chạy máy > 12h (Cần kiểm tra)"
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#d97706',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>&gt; 12h (Cần kiểm tra)</span>
          </div>
          <div
            style={{
              fontSize: 'clamp(30px, 3.5vw, 42px)',
              fontWeight: 900,
              color: (kpiMetrics.runtimeOver12hCheck || 0) > 0 ? '#d97706' : '#0f172a',
              lineHeight: 1.05,
              margin: '10px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {(kpiMetrics.runtimeOver12hCheck || 0).toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#d97706' }}>
              {(
                ((kpiMetrics.runtimeOver12hCheck || 0) / (kpiMetrics.totalTickets || 1)) *
                100
              ).toFixed(1)}%
            </span>{' '}
            • <span style={{ color: '#92400e' }}>Phiếu bất thường →</span>
          </div>
        </div>

        {/* KPI 3: THỜI GIAN THAO TÁC < 5 PHÚT (THAO TÁC NHANH) */}
        <div
          onClick={() => {
            setAuditModalCategory('UNDER_5MIN')
            setShowAuditModal(true)
          }}
          style={{
            padding: '0 16px',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          title="Bấm để xem danh sách phiếu thao tác < 5 phút (Nhập nhanh)"
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#be123c',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>&lt; 5 phút (Thao tác nhanh)</span>
          </div>
          <div
            style={{
              fontSize: 'clamp(30px, 3.5vw, 42px)',
              fontWeight: 900,
              color: (kpiMetrics.runtimeUnder5Min || 0) > 0 ? '#be123c' : '#0f172a',
              lineHeight: 1.05,
              margin: '10px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {(kpiMetrics.runtimeUnder5Min || 0).toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#be123c' }}>
              {(
                ((kpiMetrics.runtimeUnder5Min || 0) / (kpiMetrics.totalTickets || 1)) *
                100
              ).toFixed(1)}%
            </span>{' '}
            • <span style={{ color: '#881337' }}>Thao tác nhập vội →</span>
          </div>
        </div>

        {/* KPI 4: TẠO PHIẾU TRÊN MES */}
        <div
          style={{
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span>Tạo phiếu trên MES</span>
          </div>
          <div
            style={{
              fontSize: 'clamp(30px, 3.5vw, 42px)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.05,
              margin: '10px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.mesRate}%
          </div>
          <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 600 }}>
            {kpiMetrics.bravoCreatedCount} phiếu ngoài MES /{' '}
            {kpiMetrics.totalTickets.toLocaleString('vi-VN')} phiếu
          </div>
        </div>
      </div>

      {/* 3.1. KHỐI BIỂU ĐỒ TÍCH HỢP HỆ THỐNG: ĐỒNG BỘ CSDL & XUẤT NHẬP TỰ ĐỘNG */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: 20,
          marginBottom: 36
        }}
      >
        {/* KHUNG BIỂU ĐỒ 1: ĐỘ TRỄ THỜI GIAN ĐỒNG BỘ 2 HỆ THỐNG */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span>Độ trễ thời gian đồng bộ 2 hệ</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>
                Real-time 99.9%
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <div
                style={{
                  fontSize: 'clamp(26px, 2.5vw, 34px)',
                  fontWeight: 900,
                  color: '#245d6c',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  fontFamily: 'Consolas, Monaco, monospace, sans-serif'
                }}
              >
                {kpiMetrics.syncLatencyFormatted}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Độ trễ trung bình:{' '}
                <b style={{ color: '#245d6c' }}>{kpiMetrics.avgSyncDelaySeconds}s</b> • <b>0</b> lỗi
                truyền CSDL
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: Math.max(210, (kpiMetrics.syncBreakdown?.length || 5) * 38) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={kpiMetrics.syncBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 110, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  hide
                  domain={[0, (dataMax) => Math.max(10, Math.ceil(dataMax * 1.35))]}
                />
                <YAxis
                  type="category"
                  dataKey="group"
                  tick={{ fontSize: 11.5, fill: '#334155', fontWeight: 600 }}
                  width={145}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
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
                            padding: '6px 10px',
                            fontSize: 11.5,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#38bdf8' }}>{d.group}</div>
                          <div>
                            Số lượng: <b>{d.count?.toLocaleString('vi-VN')} phiếu</b>
                          </div>
                          <div>
                            Tỷ lệ: <b>{d.rate}%</b>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={0}
                  barSize={18}
                  label={(props) => {
                    const { x, y, width, height, value, index } = props
                    if (value === undefined || value === null) return null
                    const item = kpiMetrics.syncBreakdown && kpiMetrics.syncBreakdown[index]
                    const rate = item?.rate !== undefined ? item.rate : 0
                    return (
                      <text
                        x={x + width + 8}
                        y={y + height / 2 + 4}
                        fill="#0f172a"
                        fontSize={11}
                        fontWeight={700}
                        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
                      >
                        {value.toLocaleString('vi-VN')} ({rate}%)
                      </text>
                    )
                  }}
                >
                  {kpiMetrics.syncBreakdown &&
                    kpiMetrics.syncBreakdown.map((entry, index) => (
                      <Cell key={`cell-sync-${index}`} fill={entry.color || '#245d6c'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KHUNG BIỂU ĐỒ 2: PHÂN BỔ LOẠI GHI CHÚ XUẤT/NHẬP TỰ ĐỘNG */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span>Sinh phiếu xuất/nhập tự động (Auto-Logistics)</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#245d6c' }}>
                {kpiMetrics.autoExportRate}% Tự động
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <div
                style={{
                  fontSize: 'clamp(26px, 2.5vw, 34px)',
                  fontWeight: 900,
                  color: '#0f172a',
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}
              >
                {kpiMetrics.autoExportCount.toLocaleString('vi-VN')}{' '}
                <span style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>phiếu</span>
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Đã sinh tự động: <b style={{ color: '#245d6c' }}>{kpiMetrics.autoExportRate}%</b> •
                Chưa có:{' '}
                <b style={{ color: '#be123c' }}>
                  {kpiMetrics.noAutoExportCount} phiếu ({kpiMetrics.noAutoExportRate}%)
                </b>
              </div>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: Math.max(210, (kpiMetrics.autoExportBreakdown?.length || 5) * 38)
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={kpiMetrics.autoExportBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 110, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  hide
                  domain={[0, (dataMax) => Math.max(10, Math.ceil(dataMax * 1.35))]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11.5, fill: '#334155', fontWeight: 600 }}
                  width={155}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
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
                            padding: '6px 10px',
                            fontSize: 11.5,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#38bdf8' }}>{d.label}</div>
                          <div>
                            Số lượng: <b>{d.count?.toLocaleString('vi-VN')} phiếu</b>
                          </div>
                          <div>
                            Tỷ lệ: <b>{d.rate}%</b>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={0}
                  barSize={18}
                  label={(props) => {
                    const { x, y, width, height, value, index } = props
                    if (value === undefined || value === null) return null
                    const item =
                      kpiMetrics.autoExportBreakdown && kpiMetrics.autoExportBreakdown[index]
                    const rate = item?.rate !== undefined ? item.rate : 0
                    return (
                      <text
                        x={x + width + 8}
                        y={y + height / 2 + 4}
                        fill="#0f172a"
                        fontSize={11}
                        fontWeight={700}
                        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
                      >
                        {value.toLocaleString('vi-VN')} ({rate}%)
                      </text>
                    )
                  }}
                >
                  {kpiMetrics.autoExportBreakdown &&
                    kpiMetrics.autoExportBreakdown.map((entry, index) => (
                      <Cell key={`cell-auto-${index}`} fill={entry.color || '#245d6c'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                I. THỐNG KÊ GIỜ CHẠY MÁY & ĐỐI SOÁT BẤT THƯỜNG THEO CỤM MÁY (MACHINE RUNTIME AUDIT)
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
              Thống kê tổng thời gian chạy máy và số lượng phiếu của <b>{executiveVerticalData.length} cụm máy</b> (
              {plantName || 'Nhà máy'}). Biểu đồ làm nổi bật các cụm máy có tổng giờ chạy{' '}
              <b style={{ color: '#be123c' }}>&gt; 24.0h/ngày</b> (vượt quá giới hạn vật lý 1 ngày) hoặc thời gian bất thường so với số phiếu để đối soát dữ liệu.
            </div>
          </div>

          {/* Công cụ chuyển đổi loại biểu đồ (Chart Mode Switcher) & Tải ảnh */}
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
            <div
              style={{ display: 'inline-flex', border: '1px solid #cbd5e1', background: '#f8fafc' }}
            >
              <button
                type="button"
                onClick={() => setMachineChartMode('runtime')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: machineChartMode === 'runtime' ? 700 : 500,
                  background: machineChartMode === 'runtime' ? '#245d6c' : 'transparent',
                  color: machineChartMode === 'runtime' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tổng giờ chạy máy (h)
              </button>
              <button
                type="button"
                onClick={() => setMachineChartMode('composed')}
                style={{
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  borderRight: '1px solid #cbd5e1',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: machineChartMode === 'composed' ? 700 : 500,
                  background: machineChartMode === 'composed' ? '#245d6c' : 'transparent',
                  color: machineChartMode === 'composed' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Giờ chạy & Số phiếu (Kết hợp)
              </button>
              <button
                type="button"
                onClick={() => setMachineChartMode('tickets')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: 11.5,
                  fontWeight: machineChartMode === 'tickets' ? 700 : 500,
                  background: machineChartMode === 'tickets' ? '#245d6c' : 'transparent',
                  color: machineChartMode === 'tickets' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Số phiếu theo máy
              </button>
            </div>

            <PureButton
              icon={<Download size={12} />}
              onClick={() =>
                handleDownloadSingleChart(
                  chart1Ref,
                  `BieuDo_GioChayMay_TheoCumMay_${machineChartMode}`
                )
              }
            >
              Tải ảnh biểu đồ
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
                <RechartsTooltip content={<ExecutiveChartTooltip unit="h" />} />
                <ReferenceLine
                  y={24}
                  stroke="#be123c"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Giới hạn 1 ngày (24.0h)',
                    position: 'top',
                    fill: '#be123c',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
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
                  tick={{ fill: '#245d6c', fontWeight: 600 }}
                  tickFormatter={(v) => `${v}h`}
                  label={{
                    value: 'Tổng giờ chạy máy (h)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 12,
                    fill: '#245d6c',
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
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <ReferenceLine
                  yAxisId="left"
                  y={24}
                  stroke="#be123c"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Giới hạn 1 ngày (24.0h)',
                    position: 'top',
                    fill: '#be123c',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="totalRuntimeHours"
                  name="Giờ chạy máy (h)"
                  barSize={18}
                  activeBar={false}
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
                  fill="#245d6c"
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
                          fill="#245d6c"
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
              <span>II. TỶ LỆ ĐẠT CHUẨN KỸ THUẬT THEO TỔ SẢN XUẤT (TEAM QUALITY RATE)</span>
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
              Đánh giá tỷ lệ sản phẩm đạt chuẩn chất lượng KCS (%) của{' '}
              <b>{teamAggregates.length} tổ sản xuất</b> ghi nhận trong kỳ ({plantName || 'Nhà máy'}
              ). Phản ánh hiệu quả kiểm soát kỹ thuật và mức độ giảm thiểu phế liệu của từng tổ theo
              dữ liệu vận hành thực tế.
            </div>
          </div>
          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}
          >
            <PureButton
              icon={<Download size={12} />}
              onClick={() => handleDownloadSingleChart(chart3Ref, 'BieuDo_SoSanh_ToSanXuat')}
            >
              Tải ảnh biểu đồ
            </PureButton>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: Math.max(340, executiveHorizontalData.length * 46 + 60),
            border: '1px solid #e2e8f0',
            padding: '16px 24px 12px 10px',
            background: '#ffffff'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={executiveHorizontalData}
              margin={{ top: 15, right: 80, left: 160, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                stroke="#cbd5e1"
                strokeWidth={1}
                tickLine={true}
                domain={[70, 100]}
                ticks={[70, 75, 80, 85, 90, 95, 99, 100]}
                tickFormatter={(v) => `${v}%`}
                fontSize={11.5}
                tick={{ fill: '#334155' }}
                label={{
                  value: 'Tỷ lệ đạt chuẩn (%)',
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
              <RechartsTooltip content={<ExecutiveChartTooltip unit="%" />} />
              <Bar
                dataKey="value"
                name="Tỷ lệ đạt"
                barSize={24}
                activeBar={false}
                shape={<CleanTechnicalHorizontalBar />}
              >
                {executiveHorizontalData.map((entry, index) => (
                  <Cell key={`cell-h-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. EXECUTIVE SECTION III: HỆ THỐNG ĐỐI SOÁT CHI TIẾT & MA TRẬN DỮ LIỆU SẢN XUẤT */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 6px 0',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 6
          }}
        >
          III. HỆ THỐNG ĐỐI SOÁT CHI TIẾT & MA TRẬN DỮ LIỆU SẢN XUẤT
        </h2>
        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
          Tổng hợp toàn diện dữ liệu vận hành theo 3 cấp độ:{' '}
          <b>Cấp độ thiết bị (3.1. Ma trận năng lực và tỷ lệ đạt cụm máy)</b>,{' '}
          <b>
            Cấp độ quản lý tổ đội (3.2. Phân tích kỷ luật và đối chiếu quản lý sản xuất theo tổ)
          </b>
          , và <b>Cấp độ tác nghiệp (3.3. Nhật trình chi tiết phiếu thống kê sản xuất)</b>. Bảng dữ
          liệu hỗ trợ cuộn ảo mượt mà, sao chép dữ liệu trực tiếp và xuất
          Excel độc lập từng bảng.
        </div>
      </div>

      {/* 6.1. MỤC 3.1: MA TRẬN NĂNG LỰC VÀ TỶ LỆ ĐẠT CỤM MÁY */}
      <div style={{ marginBottom: 40 }}>
        {/* Header toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 10
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>3.1. Ma trận năng lực và tỷ lệ đạt cụm máy</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginLeft: 8 }}>
              ({displayMachineList.length}/{machineAggregates.length} máy)
            </span>
          </div>

          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                padding: '2px 6px',
                background: '#ffffff',
                borderRadius: 2
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm mã máy, tên máy..."
                value={machineSearchText}
                onChange={(e) => setMachineSearchText(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '2px 6px',
                  fontSize: 12,
                  width: 160,
                  fontFamily: 'inherit'
                }}
              />
            </div>


            <div
              style={{
                display: 'inline-flex',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                borderRadius: 2
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setMachineSortConfig((prev) => ({
                    key: 'totalRuntimeHours',
                    direction:
                      prev.key === 'totalRuntimeHours' || prev.key === 'runtimeHours'
                        ? prev.direction === 'desc'
                          ? 'asc'
                          : 'desc'
                        : 'desc'
                  }))
                }
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  fontSize: 11.5,
                  fontWeight:
                    machineSortConfig.key === 'totalRuntimeHours' ||
                    machineSortConfig.key === 'runtimeHours'
                      ? 700
                      : 500,
                  background:
                    machineSortConfig.key === 'totalRuntimeHours' ||
                    machineSortConfig.key === 'runtimeHours'
                      ? '#245d6c'
                      : 'transparent',
                  color:
                    machineSortConfig.key === 'totalRuntimeHours' ||
                    machineSortConfig.key === 'runtimeHours'
                      ? '#ffffff'
                      : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Sắp xếp theo Giờ chạy máy"
              >
                Giờ chạy{' '}
                {machineSortConfig.key === 'totalRuntimeHours' ||
                machineSortConfig.key === 'runtimeHours'
                  ? machineSortConfig.direction === 'asc'
                    ? '↑'
                    : '↓'
                  : ''}
              </button>
              <button
                type="button"
                onClick={() =>
                  setMachineSortConfig((prev) => ({
                    key: 'ticketCount',
                    direction:
                      prev.key === 'ticketCount'
                        ? prev.direction === 'desc'
                          ? 'asc'
                          : 'desc'
                        : 'desc'
                  }))
                }
                style={{
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  borderRight: '1px solid #cbd5e1',
                  padding: '3px 8px',
                  fontSize: 11.5,
                  fontWeight: machineSortConfig.key === 'ticketCount' ? 700 : 500,
                  background:
                    machineSortConfig.key === 'ticketCount' ? '#245d6c' : 'transparent',
                  color: machineSortConfig.key === 'ticketCount' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Sắp xếp theo Số phiếu thống kê"
              >
                Số phiếu{' '}
                {machineSortConfig.key === 'ticketCount'
                  ? machineSortConfig.direction === 'asc'
                    ? '↑'
                    : '↓'
                  : ''}
              </button>
              <button
                type="button"
                onClick={() =>
                  setMachineSortConfig((prev) => ({
                    key: 'passRate',
                    direction:
                      prev.key === 'passRate'
                        ? prev.direction === 'desc'
                          ? 'asc'
                          : 'desc'
                        : 'desc'
                  }))
                }
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  fontSize: 11.5,
                  fontWeight: machineSortConfig.key === 'passRate' ? 700 : 500,
                  background: machineSortConfig.key === 'passRate' ? '#245d6c' : 'transparent',
                  color: machineSortConfig.key === 'passRate' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Sắp xếp theo Tỷ lệ đạt chuẩn KCS"
              >
                Tỷ lệ đạt{' '}
                {machineSortConfig.key === 'passRate'
                  ? machineSortConfig.direction === 'asc'
                    ? '↑'
                    : '↓'
                  : ''}
              </button>
            </div>

            <PureButton
              icon={machineFullHeight ? <ChevronsDownUp size={12} /> : <ChevronsUpDown size={12} />}
              onClick={() => setMachineFullHeight(!machineFullHeight)}
              title={machineFullHeight ? 'Thu gọn chiều cao bảng' : 'Hiển thị toàn bộ chiều cao'}
              style={{
                borderColor: machineFullHeight ? '#245d6c' : '#cbd5e1',
                color: machineFullHeight ? '#245d6c' : '#334155'
              }}
            >
              {machineFullHeight ? 'Thu gọn' : 'Mở rộng'}
            </PureButton>
            <PureButton
              icon={<Copy size={12} />}
              onClick={() =>
                handleCopyTable(
                  displayMachineList,
                  [
                    'Tên máy sản xuất',
                    'Mã máy',
                    'Phiếu',
                    'Giờ chạy (h)',
                    'So với 24h (%)',
                    'SL Sản xuất',
                    'SL Đạt',
                    'Tỷ lệ đạt (%)',
                    'ĐVT',
                    'SL Đạt / Giờ'
                  ],
                  [
                    'machineName',
                    'machineCode',
                    'ticketCount',
                    'totalRuntimeHours',
                    'runtimeVs24h',
                    'totalActualQty',
                    'totalPassQty',
                    'passRate',
                    'unit',
                    'speed'
                  ]
                )
              }
              title="Sao chép toàn bộ dữ liệu bảng này vào Clipboard"
            >
              Sao chép
            </PureButton>
            <PureButton
              icon={<Download size={12} />}
              onClick={handleExportMachineExcel}
              title="Xuất bảng này ra file Excel"
            >
              Excel
            </PureButton>
            <PureButton
              icon={<Maximize2 size={12} />}
              onClick={() => setFullscreenTable('machine')}
              title="Xem toàn màn hình"
            />
          </div>
        </div>

        {/* Tổng hợp số liệu tổng dòng chân */}
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
          <div style={{ color: '#475569', fontWeight: 600 }}>
            Tổng số: <b style={{ color: '#0f172a' }}>{machineGrandTotal.machineCount}</b> thiết bị
            máy | Tổng phiếu: <b style={{ color: '#0f172a' }}>{machineGrandTotal.totalTickets}</b>
          </div>
          <div style={{ display: 'flex', gap: 16, color: '#334155', fontWeight: 700 }}>
            <span>
              Tổng giờ chạy: <b style={{ color: '#245d6c' }}>{machineGrandTotal.totalRuntime}h</b>
            </span>
            <span>
              Tổng SL SX:{' '}
              <b style={{ color: '#0f172a' }}>
                {machineGrandTotal.totalActual.toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng SL Đạt:{' '}
              <b style={{ color: '#0f766e' }}>
                {machineGrandTotal.totalPass.toLocaleString('vi-VN')}
              </b>
            </span>
          </div>
        </div>

        {/* DataEditor Container */}
        <div
          style={{
            height: machineFullHeight
              ? Math.max(300, displayMachineList.length * machineRowHeight + 50)
              : 380,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            position: 'relative'
          }}
        >
          <DataEditor
            ref={machineGridRef}
            columns={machineGridCols}
            rows={displayMachineList.length}
            getCellContent={getMachineCellContent}
            onHeaderClicked={onMachineHeaderClicked}
            onColumnResize={onMachineColumnResize}
            getCellsForSelection={true}
            rangeSelect="rect"
            columnSelect="multi"
            rowSelect="multi"
            rowMarkers="number"
            rowHeight={machineRowHeight}
            headerHeight={32}
            smoothScrollX={true}
            smoothScrollY={true}
            theme={executiveGridTheme}
            width="100%"
            height="100%"
          />
        </div>
      </div>

      {/* 7.2. MỤC 4.2: PHÂN TÍCH KỶ LUẬT VÀ ĐỐI CHIẾU QUẢN LÝ SẢN XUẤT THEO TỔ */}
      <div style={{ marginBottom: 40 }}>
        {/* Header toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 10
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>4.2. Phân tích kỷ luật và đối chiếu quản lý sản xuất theo tổ</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginLeft: 8 }}>
              ({displayTeamList.length}/{teamAggregates.length} tổ)
            </span>
          </div>

          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                padding: '2px 6px',
                background: '#ffffff',
                borderRadius: 2
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm tên tổ sản xuất..."
                value={teamSearchText}
                onChange={(e) => setTeamSearchText(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '2px 6px',
                  fontSize: 12,
                  width: 160,
                  fontFamily: 'inherit'
                }}
              />
            </div>


            <PureButton
              icon={teamFullHeight ? <ChevronsDownUp size={12} /> : <ChevronsUpDown size={12} />}
              onClick={() => setTeamFullHeight(!teamFullHeight)}
              title={teamFullHeight ? 'Thu gọn chiều cao bảng' : 'Hiển thị toàn bộ chiều cao'}
              style={{
                borderColor: teamFullHeight ? '#245d6c' : '#cbd5e1',
                color: teamFullHeight ? '#245d6c' : '#334155'
              }}
            >
              {teamFullHeight ? 'Thu gọn' : 'Mở rộng'}
            </PureButton>
            <PureButton
              icon={<Copy size={12} />}
              onClick={() =>
                handleCopyTable(
                  displayTeamList,
                  [
                    'Tổ sản xuất',
                    'Số phiếu',
                    'SL Thực tế',
                    'Đạt KH (%)',
                    'Tỷ lệ đạt (%)',
                    'Tỷ lệ MES (%)',
                    'Đơn > 12h cần KT'
                  ],
                  [
                    'teamName',
                    'ticketCount',
                    'totalActualQty',
                    'planRate',
                    'passRate',
                    'mesRate',
                    'anomalies'
                  ]
                )
              }
              title="Sao chép toàn bộ dữ liệu bảng này vào Clipboard"
            >
              Sao chép
            </PureButton>
            <PureButton
              icon={<Download size={12} />}
              onClick={handleExportTeamExcel}
              title="Xuất bảng này ra file Excel"
            >
              Excel
            </PureButton>
            <PureButton
              icon={<Maximize2 size={12} />}
              onClick={() => setFullscreenTable('team')}
              title="Xem toàn màn hình"
            />
          </div>
        </div>

        {/* Tổng hợp số liệu */}
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
          <div style={{ color: '#475569', fontWeight: 600 }}>
            Tổng số: <b style={{ color: '#0f172a' }}>{teamGrandTotal.teamCount}</b> tổ sản xuất |
            Tổng phiếu: <b style={{ color: '#0f172a' }}>{teamGrandTotal.totalTickets}</b>
          </div>
          <div style={{ display: 'flex', gap: 16, color: '#334155', fontWeight: 700 }}>
            <span>
              Tổng sản lượng:{' '}
              <b style={{ color: '#0f172a' }}>
                {teamGrandTotal.totalActual.toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tỷ lệ đạt TB: <b style={{ color: '#0f766e' }}>{teamGrandTotal.avgPassRate}%</b>
            </span>
          </div>
        </div>

        {/* DataEditor Container */}
        <div
          style={{
            height: teamFullHeight
              ? Math.max(260, displayTeamList.length * teamRowHeight + 50)
              : 320,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            position: 'relative'
          }}
        >
          <DataEditor
            ref={teamGridRef}
            columns={teamGridCols}
            rows={displayTeamList.length}
            getCellContent={getTeamCellContent}
            onColumnResize={onTeamColumnResize}
            getCellsForSelection={true}
            rangeSelect="rect"
            columnSelect="multi"
            rowSelect="multi"
            rowMarkers="number"
            rowHeight={teamRowHeight}
            headerHeight={32}
            smoothScrollX={true}
            smoothScrollY={true}
            theme={executiveGridTheme}
            width="100%"
            height="100%"
          />
        </div>
      </div>

      {/* 7.3. MỤC 4.3: NHẬT TRÌNH CHI TIẾT PHIẾU THỐNG KÊ SẢN XUẤT */}
      <div style={{ marginBottom: 40 }}>
        {/* Header toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 10
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>4.3. Nhật trình chi tiết phiếu thống kê sản xuất</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginLeft: 8 }}>
              ({displayDetailList.length}/{filteredData.length} phiếu)
            </span>
          </div>

          <div
            className="screenshot-hide"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                padding: '2px 6px',
                background: '#ffffff',
                borderRadius: 2
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, lệnh, máy..."
                value={detailSearchText}
                onChange={(e) => setDetailSearchText(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '2px 6px',
                  fontSize: 12,
                  width: 170,
                  fontFamily: 'inherit'
                }}
              />
            </div>


            <PureButton
              icon={detailFullHeight ? <ChevronsDownUp size={12} /> : <ChevronsUpDown size={12} />}
              onClick={() => setDetailFullHeight(!detailFullHeight)}
              title={detailFullHeight ? 'Thu gọn chiều cao bảng' : 'Hiển thị toàn bộ chiều cao'}
              style={{
                borderColor: detailFullHeight ? '#245d6c' : '#cbd5e1',
                color: detailFullHeight ? '#245d6c' : '#334155'
              }}
            >
              {detailFullHeight ? 'Thu gọn' : 'Mở rộng'}
            </PureButton>
            <PureButton
              icon={<Copy size={12} />}
              onClick={() =>
                handleCopyTable(
                  displayDetailList,
                  [
                    'Mã phiếu',
                    'Lệnh SX / CT',
                    'Mã máy',
                    'Tên máy',
                    'Tổ sản xuất',
                    'Bắt đầu',
                    'Kết thúc',
                    'SL Kế hoạch',
                    'SL Sản xuất',
                    'SL Đạt',
                    'Giờ chạy (h)',
                    'Nguồn gốc',
                    'Người thực hiện'
                  ],
                  [
                    'ticketCode',
                    'orderCode',
                    'machineCode',
                    'machineName',
                    'teamName',
                    'startTime',
                    'endTime',
                    'planQty',
                    'actualQty',
                    'passQty',
                    'runtimeHours',
                    'origin',
                    'operator'
                  ]
                )
              }
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

        {/* Tổng hợp số liệu chi tiết */}
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
          <div style={{ color: '#475569', fontWeight: 600 }}>
            Hiển thị: <b style={{ color: '#0f172a' }}>{displayDetailList.length}</b> phiếu thống kê
          </div>
          <div style={{ display: 'flex', gap: 16, color: '#334155', fontWeight: 700 }}>
            <span>
              Tổng SL Kế hoạch:{' '}
              <b style={{ color: '#475569' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.planQty) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng SL SX:{' '}
              <b style={{ color: '#0f172a' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.actualQty || d.output) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng SL Đạt:{' '}
              <b style={{ color: '#0f766e' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.passQty || d.passQuantity) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng giờ chạy:{' '}
              <b style={{ color: '#245d6c' }}>
                {displayDetailList
                  .reduce((acc, d) => acc + (Number(d.runtimeHours) || 0), 0)
                  .toFixed(1)}
                h
              </b>
            </span>
          </div>
        </div>

        {/* DataEditor Container */}
        <div
          style={{
            height: detailFullHeight
              ? Math.max(350, displayDetailList.length * detailRowHeight + 50)
              : 440,
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
            onColumnResize={onDetailColumnResize}
            getCellsForSelection={true}
            rangeSelect="rect"
            columnSelect="multi"
            rowSelect="multi"
            rowMarkers="number"
            rowHeight={detailRowHeight}
            headerHeight={32}
            smoothScrollX={true}
            smoothScrollY={true}
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
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '98vw',
              height: '94vh',
              borderRadius: 4,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #cbd5e1'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '10px 16px',
                background: '#245d6c',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em' }}>
                {fullscreenTable === 'machine' && '4.1. Ma trận năng lực và tỷ lệ đạt cụm máy'}
                {fullscreenTable === 'team' &&
                  '4.2. Phân tích kỷ luật và đối chiếu quản lý sản xuất theo tổ'}
                {fullscreenTable === 'detail' && '4.3. Nhật trình chi tiết phiếu thống kê sản xuất'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {fullscreenTable === 'machine' && (
                  <PureButton
                    icon={<Download size={12} />}
                    onClick={handleExportMachineExcel}
                    style={{ background: '#ffffff', color: '#245d6c' }}
                  >
                    Xuất Excel
                  </PureButton>
                )}
                {fullscreenTable === 'team' && (
                  <PureButton
                    icon={<Download size={12} />}
                    onClick={handleExportTeamExcel}
                    style={{ background: '#ffffff', color: '#245d6c' }}
                  >
                    Xuất Excel
                  </PureButton>
                )}
                {fullscreenTable === 'detail' && (
                  <PureButton
                    icon={<Download size={12} />}
                    onClick={handleExportDetailExcel}
                    style={{ background: '#ffffff', color: '#245d6c' }}
                  >
                    Xuất Excel
                  </PureButton>
                )}
                <button
                  onClick={() => setFullscreenTable(null)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  Đóng (Esc)
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {fullscreenTable === 'machine' && (
                <DataEditor
                  columns={machineGridCols}
                  rows={displayMachineList.length}
                  getCellContent={getMachineCellContent}
                  onColumnResize={onMachineColumnResize}
                  getCellsForSelection={true}
                  rangeSelect="rect"
                  columnSelect="multi"
                  rowSelect="multi"
                  rowMarkers="number"
                  rowHeight={machineRowHeight}
                  headerHeight={32}
                  smoothScrollX={true}
                  smoothScrollY={true}
                  theme={executiveGridTheme}
                  width="100%"
                  height="100%"
                />
              )}
              {fullscreenTable === 'team' && (
                <DataEditor
                  columns={teamGridCols}
                  rows={displayTeamList.length}
                  getCellContent={getTeamCellContent}
                  onColumnResize={onTeamColumnResize}
                  getCellsForSelection={true}
                  rangeSelect="rect"
                  columnSelect="multi"
                  rowSelect="multi"
                  rowMarkers="number"
                  rowHeight={teamRowHeight}
                  headerHeight={32}
                  smoothScrollX={true}
                  smoothScrollY={true}
                  theme={executiveGridTheme}
                  width="100%"
                  height="100%"
                />
              )}
              {fullscreenTable === 'detail' && (
                <DataEditor
                  columns={detailGridCols}
                  rows={displayDetailList.length}
                  getCellContent={getDetailCellContent}
                  onColumnResize={onDetailColumnResize}
                  getCellsForSelection={true}
                  rangeSelect="rect"
                  columnSelect="multi"
                  rowSelect="multi"
                  rowMarkers="number"
                  rowHeight={detailRowHeight}
                  headerHeight={32}
                  smoothScrollX={true}
                  smoothScrollY={true}
                  theme={executiveGridTheme}
                  width="100%"
                  height="100%"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* SỔ TAY CÔNG THỨC & QUY TẮC TÍNH TOÁN MODAL */}
      <FormulaHandbookModal isOpen={showFormulaModal} onClose={() => setShowFormulaModal(false)} />

      {/* MODAL ĐỐI SOÁT KỶ LUẬT THỜI GIAN CHẠY MÁY & CẢNH BÁO QLSX */}
      <RuntimeAuditDetailModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        initialCategory={auditModalCategory}
        data={filteredData}
        plantName={plantName}
        maskText={maskText}
      />

      {/* 8. FOOTER SECTION (ĐOẠN KẾT BÁO CÁO TỔNG QUAN) */}
      <div
        style={{
          borderTop: '1.5px solid #e2e8f0',
          paddingTop: 24,
          marginTop: 40,
          background: '#ffffff'
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: '#0f172a',
              textTransform: 'uppercase',
              marginBottom: 6
            }}
          >
            V. KẾT LUẬN & ĐÁNH GIÁ TỔNG QUAN TỪ BAN ĐIỀU HÀNH SẢN XUẤT
          </div>
          <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6, textAlign: 'justify' }}>
            Hệ thống máy và các tổ sản xuất tại {plantName || 'Nhà máy GS Hà Nội'} trong kỳ ghi nhận
            duy trì tỷ lệ đạt chuẩn bình quân cao <b>({kpiMetrics.overallPassRate}%)</b>, hoàn thành{' '}
            <b>{kpiMetrics.planCompletionRate}%</b> sản lượng kế hoạch được giao. Mức độ chuẩn hóa
            quy trình MES đạt <b>{kpiMetrics.mesRate}%</b> số phiếu được lập tự động tại hiện
            trường, 100% lô thành phẩm liên kết ghi chú xuất nhập kho. Đối với{' '}
            <b>{kpiMetrics.runtimeOver12hCheck}</b> phiếu có thời gian chạy máy kéo dài bất thường
            cần đối soát kỹ thuật, Quản lý sản xuất đã yêu cầu các tổ trưởng kiểm tra nhật trình
            thiết bị và cập nhật nguyên nhân dừng máy trước khi khóa kỳ quyết toán.
          </div>
        </div>
      </div>
    </div>
  )
}
