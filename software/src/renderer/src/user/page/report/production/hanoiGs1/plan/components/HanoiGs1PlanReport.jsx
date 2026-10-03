/* eslint-disable react/prop-types, no-unused-vars */
import { useState } from 'react'
import {
  RotateCcw,
  FileSpreadsheet,
  Camera,
  Download,
  Copy,
  Search,
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
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts'
import { DataEditor } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import {
  PureButton,
  PureSelect,
  MasterBatchSearchSelect,
  ExecutiveChartTooltip,
  executiveGridTheme,
  gridCustomCss
} from './reportUIComponents'
import { FormulaHandbookModal } from '../../../handbook/FormulaHandbookModal'
import { useHanoiGs1PlanLogic } from '../hooks/useHanoiGs1PlanLogic'

export default function HanoiGs1PlanReport(props) {
  const {
    plantName = 'Nhà máy GS1 Hà Nội',
    factoryCode,
    onFactoryChange,
    factoryOptions,
    masterList = [],
    selectedMasterKey,
    onSelectMaster,
    onRefreshMaster,
    loadingMaster = false,
    dataset = []
  } = props

  const logic = useHanoiGs1PlanLogic({
    dataset,
    plantKey: 'hanoi_gs1',
    plantName,
    maskText: (t) => t
  })

  const {
    // Filters & State
    selectedPic,
    setSelectedPic,
    handleResetFilters,
    hasActiveFilters,
    filterOptions,

    // Modal State
    showFormulaModal,
    setShowFormulaModal,

    // Chart Modes & View Controls
    picChartMode,
    setPicChartMode,

    // Data & Metrics
    sortedData,
    displayDetailList,
    kpiMetrics,
    timeStatusBreakdown,
    capaStatusBreakdown,
    picBreakdown,
    teamBreakdown,
    advancedPlanMetrics,

    // Grid & Detail Table
    gridRef,
    detailGridRef,
    reportRootRef,
    chart1Ref,
    chart2Ref,
    chart3Ref,
    chart4Ref,
    chart5Ref,
    isCapturing,

    columns,
    getCellContent,
    onColumnResize,
    detailGridCols,
    getDetailCellContent,
    onDetailHeaderClicked,
    onDetailColumnResize,
    showDetailSearch,
    setShowDetailSearch,

    // Actions
    handleCopyTable,
    handleExportDetailExcel,
    handleExportExcel,
    handleCaptureScreenshot
  } = logic

  const [timeChartMode, setTimeChartMode] = useState('count')
  const [capaChartMode, setCapaChartMode] = useState('count')

  const handleOpenHandbook = () => {
    try {
      openChildWindow({
        path: '/sub/report/handbook/formula?type=plan',
        title: 'Cẩm nang công thức & Từ điển dữ liệu Kế hoạch Sản xuất',
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

      {/* EXECUTIVE BANNER (Hiển thị cố định trên bản chụp ảnh / in ấn thay cho thanh công cụ web) */}
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
              BÁO CÁO ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT (KHSX)
            </div>
            <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>
              <b>Đơn vị:</b> {plantName || 'Nhà máy GS1 Hà Nội'} • <b>Hệ thống:</b> MES Engine &
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
          {/* 1. Chọn Nhà máy (nếu có prop factoryOptions) */}
          {factoryOptions && factoryOptions.length > 0 && (
            <PureSelect
              options={factoryOptions}
              value={factoryCode}
              onChange={(val) => onFactoryChange && onFactoryChange(val)}
              title="Chọn Nhà máy sản xuất"
              style={{ width: 175, height: 28 }}
            />
          )}

          {/* 2. Chọn đợt KHSX */}
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
              <span>⚠️ Chưa có đợt KHSX nào được đăng ký cho {plantName || 'nhà máy'}</span>
            </div>
          )}

          {/* 3. Lọc theo PIC Điều phối */}
          {filterOptions?.pics && filterOptions.pics.length > 0 && (
            <PureSelect
              options={[
                { value: 'ALL', label: `Tất cả PIC (${filterOptions.pics.length})` },
                ...filterOptions.pics.map((p) => ({ value: p, label: `PIC: ${p}` }))
              ]}
              value={selectedPic}
              onChange={(val) => setSelectedPic && setSelectedPic(val)}
              title="Lọc nhanh theo PIC Điều phối"
              style={{ width: 175, height: 28 }}
            />
          )}

          {/* 4. Nút Đặt lại lọc nhanh */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="uppercase text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50"
              title="Xóa bỏ bộ lọc đang chọn"
            >
              <RotateCcw size={12} className="text-rose-600" />
              <span>BỎ LỌC PIC</span>
            </Button>
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
              textTransform: 'uppercase'
            }}
          >
            BÁO CÁO ĐIỀU PHỐI KẾ HOẠCH SẢN XUẤT (KHSX)
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px 16px',
            marginTop: 6,
            fontSize: 12.5,
            color: '#475569'
          }}
        >
          <div>
            <b>Đơn vị:</b> {plantName || 'Nhà máy GS1 Hà Nội'}
          </div>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <div>
            <b>Hệ thống:</b> MES Engine & Bravo ERP
          </div>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <div>
            <b>Đợt nạp:</b> {selectedMasterKey || 'Hiện hành'}
          </div>
          {selectedPic !== 'ALL' && (
            <>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <div>
                <b>PIC:</b> {selectedPic}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. KPI TỔNG QUAN: 5 THẺ CHỦ CHỐT */}
      <div
        ref={chart1Ref}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 36
        }}
      >
        {/* KPI 1: LỆNH THAO TÁC */}
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
            cursor: 'default',
            minHeight: 110
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
            Lệnh thao tác
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
            {kpiMetrics.totalOrders.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#01411b' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
            Tổng số lệnh trong phạm vi lọc
          </div>
        </div>

        {/* KPI 2: SX SAI NGÀY KH */}
        <div
          style={{
            padding: '16px 18px',
            background: kpiMetrics.sxSaiNgayCount > 0 ? '#fffdf7' : '#ffffff',
            borderLeft: kpiMetrics.sxSaiNgayCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
            borderRight: kpiMetrics.sxSaiNgayCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
            borderBottom: kpiMetrics.sxSaiNgayCount > 0 ? '1px solid #fed7aa' : '1px solid #cbd5e1',
            borderTop: '3.5px solid #ea580c',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'default',
            minHeight: 110
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#ea580c',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            SX sai ngày KH
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: kpiMetrics.sxSaiNgayCount > 0 ? '#ea580c' : '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.sxSaiNgayCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#ea580c' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#ea580c', fontWeight: 700 }}>{kpiMetrics.sxSaiNgayRate}%</span> •{' '}
            <span style={{ color: '#9a3412' }}>Lệch ngày kế hoạch</span>
          </div>
        </div>

        {/* KPI 3: TRƯỢT KH */}
        <div
          style={{
            padding: '16px 18px',
            background: kpiMetrics.truotKhCount > 0 ? '#fff5f5' : '#ffffff',
            borderLeft: kpiMetrics.truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderRight: kpiMetrics.truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderBottom: kpiMetrics.truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderTop: '3.5px solid #dc2626',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'default',
            minHeight: 110
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Trượt KH
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: kpiMetrics.truotKhCount > 0 ? '#dc2626' : '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.truotKhCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#dc2626' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#dc2626', fontWeight: 700 }}>{kpiMetrics.truotKhRate}%</span> •{' '}
            <span style={{ color: '#991b1b' }}>Trượt kế hoạch</span>
          </div>
        </div>

        {/* KPI 4: KHỚP SỐ LƯỢNG */}
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
            cursor: 'default',
            minHeight: 110
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
            Khớp số lượng
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
            {kpiMetrics.khopSlCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#01411b' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#01411b', fontWeight: 700 }}>{kpiMetrics.khopSlRate}%</span> •
            Đạt chuẩn sản lượng
          </div>
        </div>

        {/* KPI 5: KHỚP JOB */}
        <div
          style={{
            padding: '16px 18px',
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            borderTop: '3.5px solid #059669',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'default',
            minHeight: 110
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#059669',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Khớp job
          </div>
          <div
            style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 900,
              color: '#059669',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.khopJobCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#059669' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#059669', fontWeight: 700 }}>{kpiMetrics.khopJobRate}%</span> •
            Khớp đúng quy cách job
          </div>
        </div>
      </div>
      {/* THEO PIC ĐIỀU PHỐI (Biểu đồ ComposedChart kết hợp Cột Khối lượng + Đường Tỷ Lệ Đạt %) */}
      <div
        ref={chart4Ref}
        style={{
          marginBottom: 44,
          width: '100%',
          background: '#ffffff',
          padding: '8px 0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16
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
              Bảng theo dõi và biểu đồ phân tích năng lực điều hành chi tiết theo từng nhân sự điều
              phối (PIC), bao gồm khối lượng, tỷ lệ lệch ngày, tỷ lệ trượt và tỷ lệ đạt chuẩn.
            </div>
          </div>
        </div>

        {/* Switcher & Biểu đồ phân tích chi tiết */}
        <div
          style={{
            marginTop: 20,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '16px'
          }}
        >
          {/* Chart Header & Mode Controls */}
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
                {picChartMode === 'rate'
                  ? 'Biểu đồ Tỷ lệ cơ cấu trạng thái điều phối theo PIC (%)'
                  : picChartMode === 'pass'
                    ? 'Xếp hạng Tỷ lệ đạt chuẩn điều phối (Benchmark 20%)'
                    : 'Cơ cấu khối lượng và trạng thái điều phối theo từng PIC (Lệnh)'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                {picChartMode === 'rate'
                  ? 'So sánh tương quan tỷ lệ % Đạt chuẩn, Lệch ngày và Trượt kế hoạch của từng nhân sự'
                  : picChartMode === 'pass'
                    ? 'Đánh giá tỷ lệ lệnh đạt chuẩn (Khớp SL + Khớp Job) so với mục tiêu 20%'
                    : 'Khối lượng lệnh phân bổ theo: Khớp job, Khớp SL, SX sai ngày và Trượt kế hoạch'}
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="screenshot-hide">
              <Tabs
                value={picChartMode}
                onValueChange={(val) => setPicChartMode(val)}
                className="w-auto"
              >
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

          <div style={{ height: Math.max(260, picBreakdown.length * 48 + 50), width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {picChartMode === 'rate' ? (
                <BarChart
                  layout="vertical"
                  data={[...picBreakdown].map((r) => ({
                    ...r,
                    name: r.pic
                  }))}
                  margin={{ top: 10, right: 30, left: 16, bottom: 10 }}
                  barSize={24}
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
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11.5 }}
                  />
                  <Bar
                    dataKey="khopSlRate"
                    name="Khớp số lượng (%)"
                    stackId="picRate"
                    fill="#01411b"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="khopJobRate"
                    name="Khớp job (%)"
                    stackId="picRate"
                    fill="#059669"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="sxSaiNgayRate"
                    name="SX sai ngày (%)"
                    stackId="picRate"
                    fill="#ea580c"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="truotKhRate"
                    name="Trượt KH (%)"
                    stackId="picRate"
                    fill="#dc2626"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              ) : picChartMode === 'pass' ? (
                <BarChart
                  layout="vertical"
                  data={(() => {
                    const sorted = [...picBreakdown]
                      .map((r) => {
                        const totalPass = (r.khopSl || 0) + (r.khopJob || 0)
                        const passRate =
                          r.totalOrders > 0
                            ? Number(((totalPass / r.totalOrders) * 100).toFixed(1))
                            : 0
                        return { ...r, totalPass, passRate, name: r.pic }
                      })
                      .sort((a, b) => b.passRate - a.passRate)
                    return sorted
                  })()}
                  margin={{ top: 20, right: 180, left: 16, bottom: 10 }}
                  barSize={24}
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
                  <ReferenceLine
                    x={20}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Mục tiêu (20%)',
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11.5,
                      fontWeight: 700
                    }}
                  />
                  <RechartsTooltip content={<ExecutiveChartTooltip />} />
                  <Bar
                    dataKey="passRate"
                    name="Tỷ lệ đạt chuẩn (%)"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="passRate"
                      position="right"
                      fill="#0f172a"
                      fontSize={11.5}
                      fontWeight={700}
                      offset={10}
                      isAnimationActive={false}
                      formatter={(val, entry) => {
                        const row = entry?.payload || {}
                        return `${val}% (${row.totalPass || 0}/${row.totalOrders || 0} lệnh)`
                      }}
                    />
                    {[...picBreakdown]
                      .map((r) => {
                        const totalPass = (r.khopSl || 0) + (r.khopJob || 0)
                        const passRate =
                          r.totalOrders > 0
                            ? Number(((totalPass / r.totalOrders) * 100).toFixed(1))
                            : 0
                        return { ...r, totalPass, passRate }
                      })
                      .sort((a, b) => b.passRate - a.passRate)
                      .map((entry, index) => {
                        const rate = entry.passRate
                        return (
                          <Cell
                            key={`cell-pass-${index}`}
                            fill={rate >= 20 ? '#01411b' : rate >= 10 ? '#059669' : '#ea580c'}
                          />
                        )
                      })}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart
                  layout="vertical"
                  data={[...picBreakdown].map((r) => ({
                    ...r,
                    name: r.pic
                  }))}
                  margin={{ top: 10, right: 90, left: 16, bottom: 10 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#64748b' }}
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
                  <RechartsTooltip content={<ExecutiveChartTooltip unit=" lệnh" />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11.5 }}
                  />
                  <Bar
                    dataKey="khopSl"
                    name="Khớp số lượng"
                    stackId="picVol"
                    fill="#01411b"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="khopJob"
                    name="Khớp job"
                    stackId="picVol"
                    fill="#059669"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="sxSaiNgay"
                    name="SX sai ngày KH"
                    stackId="picVol"
                    fill="#ea580c"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="truotKh"
                    name="Trượt KH"
                    stackId="picVol"
                    fill="#dc2626"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="totalOrders"
                      position="right"
                      fill="#0f172a"
                      fontSize={11.5}
                      fontWeight={700}
                      offset={10}
                      isAnimationActive={false}
                      formatter={(val) => (val > 0 ? `${val} lệnh` : '')}
                    />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        {/* Bảng Gom nhóm theo PIC ĐP Phong Cách OpenAI Technical Table */}
        <div style={{ width: '100%', marginTop: 28, marginBottom: 24 }}>
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
              <tr style={{ borderBottom: '1px solid #0f172a' }}>
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
                  PIC Điều phối
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
                  Tổng lệnh
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
                  SX sai ngày KH
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
                  Khớp số lượng
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
                  Khớp job
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
                  Tỷ lệ đạt chuẩn
                </th>
              </tr>
            </thead>
            <tbody>
              {picBreakdown.map((row, idx) => {
                const totalPass = (row.khopSl || 0) + (row.khopJob || 0)
                const passRate =
                  row.totalOrders > 0 ? ((totalPass / row.totalOrders) * 100).toFixed(1) : '0.0'
                const isSelected = selectedPic === row.pic
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: isSelected ? '#f8fafc' : 'transparent'
                    }}
                  >
                    {/* Cột 1: Tên PIC */}
                    <td
                      style={{
                        padding: '9px 12px',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                    >
                      <span
                        onClick={() => setSelectedPic(isSelected ? 'ALL' : row.pic)}
                        style={{
                          cursor: 'pointer',
                          color: isSelected ? '#0369a1' : '#0f172a',
                          fontWeight: isSelected ? 800 : 600,
                          textDecoration: isSelected ? 'underline' : 'none'
                        }}
                        title={isSelected ? 'Bấm để hủy chọn' : 'Bấm để lọc theo PIC này'}
                      >
                        {row.pic || 'Không xác định'}
                      </span>
                    </td>

                    {/* Cột 2: Tổng lệnh */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {row.totalOrders.toLocaleString('vi-VN')}
                    </td>

                    {/* Cột 3: SX sai ngày KH */}
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>
                        {row.sxSaiNgay.toLocaleString('vi-VN')}
                      </span>{' '}
                      <span style={{ color: '#64748b', fontSize: 12 }}>({row.sxSaiNgayRate}%)</span>
                    </td>

                    {/* Cột 4: Trượt KH */}
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>{row.truotKh.toLocaleString('vi-VN')}</span>{' '}
                      <span style={{ color: '#64748b', fontSize: 12 }}>({row.truotKhRate}%)</span>
                    </td>

                    {/* Cột 5: Khớp số lượng */}
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>{row.khopSl.toLocaleString('vi-VN')}</span>{' '}
                      <span style={{ color: '#64748b', fontSize: 12 }}>({row.khopSlRate}%)</span>
                    </td>

                    {/* Cột 6: Khớp job */}
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>{row.khopJob.toLocaleString('vi-VN')}</span>{' '}
                      <span style={{ color: '#64748b', fontSize: 12 }}>({row.khopJobRate}%)</span>
                    </td>

                    {/* Cột 7: Tỷ lệ đạt chuẩn */}
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: Number(passRate) >= 20 ? '#0f172a' : '#475569'
                      }}
                    >
                      {passRate}%
                    </td>
                  </tr>
                )
              })}

              {/* DÒNG TỔNG CỘNG TOÀN BỘ PIC */}
              {picBreakdown.length > 0 && (
                <tr
                  style={{
                    borderTop: '1.5px solid #0f172a',
                    background: '#fafafa'
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                    TỔNG CỘNG
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {picBreakdown
                      .reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      .toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const total = picBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      const count = picBreakdown.reduce((sum, r) => sum + (r.sxSaiNgay || 0), 0)
                      const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                      return (
                        <>
                          <span>{count.toLocaleString('vi-VN')}</span>{' '}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                        </>
                      )
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const total = picBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      const count = picBreakdown.reduce((sum, r) => sum + (r.truotKh || 0), 0)
                      const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                      return (
                        <>
                          <span>{count.toLocaleString('vi-VN')}</span>{' '}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                        </>
                      )
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const total = picBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      const count = picBreakdown.reduce((sum, r) => sum + (r.khopSl || 0), 0)
                      const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                      return (
                        <>
                          <span>{count.toLocaleString('vi-VN')}</span>{' '}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                        </>
                      )
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const total = picBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      const count = picBreakdown.reduce((sum, r) => sum + (r.khopJob || 0), 0)
                      const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                      return (
                        <>
                          <span>{count.toLocaleString('vi-VN')}</span>{' '}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                        </>
                      )
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const totalOrders = picBreakdown.reduce(
                        (sum, r) => sum + (r.totalOrders || 0),
                        0
                      )
                      const totalPass = picBreakdown.reduce(
                        (sum, r) => sum + (r.khopSl || 0) + (r.khopJob || 0),
                        0
                      )
                      return totalOrders > 0
                        ? `${((totalPass / totalOrders) * 100).toFixed(1)}%`
                        : '0.0%'
                    })()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2 & 3. TRẠNG THÁI THỜI GIAN & TRẠNG THÁI CAPA (BIỂU ĐỒ CỘT) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: 32,
          marginBottom: 44
        }}
      >
        {/* SECTION 2: TRẠNG THÁI THỜI GIAN (SO VỚI ĐM) */}
        <div
          ref={chart2Ref}
          style={{
            width: '100%',
            background: '#ffffff',
            padding: '8px 0'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 14
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                2. TRẠNG THÁI THỜI GIAN (SO VỚI ĐỊNH MỨC)
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                So sánh thời điểm sản xuất thực tế với định mức (ĐM) kế hoạch
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tabs value={timeChartMode} onValueChange={setTimeChartMode}>
                <TabsList>
                  <TabsTrigger value="count">Số lượng (Lệnh)</TabsTrigger>
                  <TabsTrigger value="rate">Tỷ lệ cơ cấu (%)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div
            style={{
              height: 240,
              width: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '14px 16px 14px 6px',
              background: '#ffffff'
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={timeStatusBreakdown}
                margin={{ top: 10, right: 65, left: 24, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  domain={timeChartMode === 'rate' ? [0, 100] : undefined}
                  unit={timeChartMode === 'rate' ? '%' : undefined}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={timeChartMode === 'rate' ? (val) => `${val}%` : undefined}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11.5, fontWeight: 700, fill: '#334155' }}
                  width={110}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <Bar
                  dataKey={timeChartMode === 'rate' ? 'rate' : 'count'}
                  name={timeChartMode === 'rate' ? 'Tỷ lệ' : 'Số lệnh'}
                  barSize={24}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={timeChartMode === 'rate' ? 'rate' : 'count'}
                    position="right"
                    fill="#0f172a"
                    fontSize={11.5}
                    fontWeight={700}
                    offset={8}
                    isAnimationActive={false}
                    formatter={(val) => (timeChartMode === 'rate' ? `${val}%` : `${val} lệnh`)}
                  />
                  {timeStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-t-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 3: TRẠNG THÁI CAPA (ĐÁNH GIÁ THEO NĂNG LỰC) */}
        <div
          ref={chart3Ref}
          style={{
            width: '100%',
            background: '#ffffff',
            padding: '8px 0'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 14
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                3. TRẠNG THÁI CAPA (NĂNG LỰC SẢN XUẤT)
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                Đánh giá việc bố trí sản xuất so với năng lực/capacity của hệ thống
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Tabs value={capaChartMode} onValueChange={setCapaChartMode}>
                <TabsList>
                  <TabsTrigger value="count">Số lượng (Lệnh)</TabsTrigger>
                  <TabsTrigger value="rate">Tỷ lệ cơ cấu (%)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div
            style={{
              height: 240,
              width: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '14px 16px 14px 6px',
              background: '#ffffff'
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={capaStatusBreakdown}
                margin={{ top: 10, right: 65, left: 24, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  domain={capaChartMode === 'rate' ? [0, 100] : undefined}
                  unit={capaChartMode === 'rate' ? '%' : undefined}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tickFormatter={capaChartMode === 'rate' ? (val) => `${val}%` : undefined}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11.5, fontWeight: 700, fill: '#334155' }}
                  width={120}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <Bar
                  dataKey={capaChartMode === 'rate' ? 'rate' : 'count'}
                  name={capaChartMode === 'rate' ? 'Tỷ lệ' : 'Số lệnh'}
                  barSize={24}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={capaChartMode === 'rate' ? 'rate' : 'count'}
                    position="right"
                    fill="#0f172a"
                    fontSize={11.5}
                    fontWeight={700}
                    offset={8}
                    isAnimationActive={false}
                    formatter={(val) => (capaChartMode === 'rate' ? `${val}%` : `${val} lệnh`)}
                  />
                  {capaStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-c-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. PHÂN TÍCH CHUYÊN SÂU HIỆU QUẢ ĐIỀU HÀNH & ĐIỂM NGHẼN TỔ SẢN XUẤT */}
      <div
        ref={chart5Ref}
        style={{
          marginBottom: 44,
          width: '100%',
          background: '#ffffff',
          padding: '8px 0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16
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
              <span>4. ĐÁNH GIÁ CHUYÊN SÂU TIẾN ĐỘ & CÂN BẰNG TẢI CÔNG ĐOẠN</span>
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
              Đo lường mức độ tuân thủ tiến độ (Schedule Adherence), độ lệch ngày bình quân và tình
              trạng cân bằng tải giữa các tổ sản xuất
            </div>
          </div>
        </div>

        {/* 4 Thẻ Chỉ Số Chuyên Sâu */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
            marginBottom: 20
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #059669'
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase'
              }}
            >
              Đáp ứng sản lượng (QFR)
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {advancedPlanMetrics.qtyFulfillmentRate}%
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              {(advancedPlanMetrics.totalActualQty || 0).toLocaleString('vi-VN')} /{' '}
              {(advancedPlanMetrics.totalPlanQty || 0).toLocaleString('vi-VN')} SP
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #0284c7'
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase'
              }}
            >
              Tuân thủ định mức TG
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {advancedPlanMetrics.timeComplianceRate}%
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Đúng/Nhanh hơn định mức thời gian
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #ea580c'
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase'
              }}
            >
              Độ lệch ngày bình quân
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#ea580c', margin: '4px 0' }}>
              {advancedPlanMetrics.avgDriftDays > 0
                ? `+${advancedPlanMetrics.avgDriftDays}`
                : advancedPlanMetrics.avgDriftDays}{' '}
              <span style={{ fontSize: 14, fontWeight: 600 }}>ngày</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#9a3412' }}>Chênh lệch OpDate vs RoutingDate</div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #7c3aed'
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase'
              }}
            >
              Cân bằng tải Capa
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {advancedPlanMetrics.capaComplianceRate}%
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>
              Tỷ lệ lệnh đúng hoặc nằm trong capa máy
            </div>
          </div>
        </div>

        {/* Bảng Đánh Giá Điểm Nghẽn Theo Tổ Sản Xuất Phong Cách OpenAI Technical Table */}
        <div style={{ width: '100%', marginBottom: 12 }}>
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
              <tr style={{ borderBottom: '1px solid #0f172a' }}>
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
                  Tổ / Nhóm công đoạn
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
                  Số lệnh giao
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
                  Tỷ lệ lệch ngày
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
                  Tỷ lệ trượt KH
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
                  Tỷ lệ đạt chuẩn
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
                  Trạng thái tải
                </th>
              </tr>
            </thead>
            <tbody>
              {teamBreakdown.map((row, idx) => {
                const isOverload = row.sxSaiNgayRate > 50 || row.truotKhRate > 40
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: 'transparent'
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {row.teamName}
                    </td>
                    <td
                      style={{
                        padding: '9px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {row.totalOrders.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>
                        {row.sxSaiNgay.toLocaleString('vi-VN')}
                      </span>{' '}
                      <span style={{ color: '#64748b', fontSize: 12 }}>({row.sxSaiNgayRate}%)</span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                      <span style={{ fontWeight: 600 }}>{row.truotKh.toLocaleString('vi-VN')}</span>{' '}
                      <span style={{ color: '#64748b', fontSize: 12 }}>({row.truotKhRate}%)</span>
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
                        color: isOverload ? '#c2410c' : '#047857'
                      }}
                    >
                      {isOverload ? 'Cần cân bằng' : 'Ổn định'}
                    </td>
                  </tr>
                )
              })}

              {/* DÒNG TỔNG CỘNG TỔ CÔNG ĐOẠN */}
              {teamBreakdown.length > 0 && (
                <tr
                  style={{
                    borderTop: '1.5px solid #0f172a',
                    background: '#fafafa'
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                    TỔNG CỘNG
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {teamBreakdown
                      .reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      .toLocaleString('vi-VN')}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const total = teamBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      const count = teamBreakdown.reduce((sum, r) => sum + (r.sxSaiNgay || 0), 0)
                      const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                      return (
                        <>
                          <span>{count.toLocaleString('vi-VN')}</span>{' '}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                        </>
                      )
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const total = teamBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                      const count = teamBreakdown.reduce((sum, r) => sum + (r.truotKh || 0), 0)
                      const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                      return (
                        <>
                          <span>{count.toLocaleString('vi-VN')}</span>{' '}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                        </>
                      )
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {(() => {
                      const totalOrders = teamBreakdown.reduce(
                        (sum, r) => sum + (r.totalOrders || 0),
                        0
                      )
                      const totalPass = teamBreakdown.reduce(
                        (sum, r) => sum + (r.khopSl || 0) + (r.khopJob || 0),
                        0
                      )
                      return totalOrders > 0
                        ? `${((totalPass / totalOrders) * 100).toFixed(1)}%`
                        : '0.0%'
                    })()}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    Toàn xưởng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. LỆNH THEO TRẠNG THÁI ĐP–SX: DANH SÁCH CHI TIẾT TỪNG LỆNH */}
      <div
        style={{
          marginTop: 40,
          marginBottom: 30,
          width: '100%',
          background: '#ffffff'
        }}
      >
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
            <span>5. LỆNH THEO TRẠNG THÁI ĐP – SX (DANH SÁCH CHI TIẾT TỪNG LỆNH)</span>
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
            Bảng dữ liệu chi tiết toàn bộ{' '}
            <b>{(displayDetailList || sortedData || []).length} lệnh</b> điều phối kế hoạch sản xuất
            tại {plantName || 'Nhà máy'}. Tổng hợp chi tiết tiến độ kế hoạch, thực tế sản xuất, định
            mức thời gian, tải capa và trạng thái khớp lệnh.
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
              Tổng số lệnh:{' '}
              <b style={{ color: '#0f172a' }}>
                {(displayDetailList || sortedData || []).length.toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng SL Kế hoạch:{' '}
              <b style={{ color: '#0f172a' }}>
                {(displayDetailList || sortedData || [])
                  .reduce(
                    (acc, d) =>
                      acc + (Number(d.TargetPassQty ?? d.TargetProdQty ?? d.planQty) || 0),
                    0
                  )
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tổng SL Thực tế:{' '}
              <b style={{ color: '#01411b' }}>
                {(displayDetailList || sortedData || [])
                  .reduce((acc, d) => acc + (Number(d.StatPassQty ?? d.actualQty) || 0), 0)
                  .toLocaleString('vi-VN')}
              </b>
            </span>
            <span>
              Tỷ lệ hoàn thành:{' '}
              <b style={{ color: '#01411b' }}>
                {(() => {
                  const list = displayDetailList || sortedData || []
                  const p = list.reduce(
                    (acc, d) =>
                      acc + (Number(d.TargetPassQty ?? d.TargetProdQty ?? d.planQty) || 0),
                    0
                  )
                  const a = list.reduce(
                    (acc, d) => acc + (Number(d.StatPassQty ?? d.actualQty) || 0),
                    0
                  )
                  return p > 0 ? ((a / p) * 100).toFixed(1) : '100.0'
                })()}
                %
              </b>
            </span>
            <span>
              Tổng giờ SX thực tế:{' '}
              <b style={{ color: '#01411b' }}>
                {(displayDetailList || sortedData || [])
                  .reduce((acc, d) => acc + (Number(d.ActualProdTime) || 0), 0)
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
                const colsToCopy = (detailGridCols || columns || []).filter(
                  (c) => c.id && c.id !== 'WorkingTag'
                )
                handleCopyTable(
                  displayDetailList || sortedData,
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
              onClick={handleExportDetailExcel || handleExportExcel}
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
            ref={detailGridRef || gridRef}
            columns={detailGridCols || columns}
            rows={(displayDetailList || sortedData || []).length}
            getCellContent={getDetailCellContent || getCellContent}
            onHeaderClicked={onDetailHeaderClicked}
            onColumnResize={onDetailColumnResize || onColumnResize}
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

      {/* PLAN FORMULA HANDBOOK MODAL */}
      <FormulaHandbookModal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        defaultReportType="plan"
      />
    </div>
  )
}
