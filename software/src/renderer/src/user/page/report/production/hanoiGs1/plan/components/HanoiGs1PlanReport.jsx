/* eslint-disable react/prop-types */
import {
  RotateCcw,
  FileSpreadsheet,
  Camera,
  Cpu,
  Users,
  Clock,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Copy,
  Maximize2
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
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
  CleanTechnicalVerticalBar,
  CleanTechnicalHorizontalBar,
  executiveGridTheme,
  gridCustomCss
} from './reportUIComponents'
import { PlanAuditDetailModal } from './PlanAuditDetailModal'
import { useHanoiGs1PlanLogic } from '../hooks/useHanoiGs1PlanLogic'

export default function HanoiGs1PlanReport(props) {
  const {
    plantName = 'Nhà máy GS1 Hà Nội',
    masterList = [],
    selectedMasterKey,
    onSelectMaster,
    onRefreshMaster,
    currentMaster,
    loadingMaster = false,
    dataset = []
  } = props

  const logic = useHanoiGs1PlanLogic({
    dataset,
    plantName,
    maskText: (t) => t
  })

  const {
    dateRange,
    setDateRange,
    selectedPic,
    setSelectedPic,
    selectedDpStatus,
    setSelectedDpStatus,
    selectedTimeStatus,
    setSelectedTimeStatus,
    selectedCapaStatus,
    setSelectedCapaStatus,
    selectedMachine,
    setSelectedMachine,
    searchQuery,
    setSearchQuery,
    handleResetFilters,
    hasActiveFilters,
    filterOptions,

    showAuditModal,
    setShowAuditModal,
    auditModalCategory,
    setAuditModalCategory,

    filteredData,
    sortedData,
    kpiMetrics,
    dpStatusBreakdown,
    timeStatusBreakdown,
    capaStatusBreakdown,
    picBreakdown,

    gridRef,
    reportContainerRef,
    columns,
    getCellContent,
    onColumnResize,
    rowHeight,
    setRowHeight,
    sortConfig,
    setSortConfig,

    handleExportExcel,
    handleTakeScreenshot
  } = logic

  return (
    <div
      ref={reportContainerRef}
      style={{
        padding: '24px 32px',
        background: '#f8fafc',
        minHeight: '100vh',
        color: '#0f172a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      <style>{gridCustomCss}</style>

      {/* 1. KHỐI BỘ LỌC DỮ LIỆU & ĐIỀU HÀNH BÁO CÁO (SECTION 1) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          padding: '12px 16px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 10
          }}
        >
          {/* Chọn Đợt nạp dữ liệu Master */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 320 }}>
            <MasterBatchSearchSelect
              masterList={masterList}
              selectedKey={selectedMasterKey}
              onSelect={onSelectMaster}
              loading={loadingMaster}
              placeholder="Chọn đợt nạp KHSX điều phối GS1..."
            />
            {onRefreshMaster && (
              <PureButton
                icon={<RotateCcw size={12} />}
                onClick={onRefreshMaster}
                loading={loadingMaster}
                title="Làm mới danh sách đợt nạp"
              >
                Làm mới đợt nạp
              </PureButton>
            )}
          </div>

          {/* Nhóm Nút Thao tác Báo cáo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PureButton
              icon={<Camera size={12} />}
              onClick={handleTakeScreenshot}
              style={{ borderColor: '#cbd5e1', color: '#334155' }}
            >
              Chụp ảnh
            </PureButton>
            <PureButton
              icon={<FileSpreadsheet size={12} />}
              onClick={handleExportExcel}
              style={{
                borderColor: '#10b981',
                color: '#ffffff',
                background: '#059669',
                fontWeight: 700
              }}
            >
              Xuất Excel
            </PureButton>
          </div>
        </div>

        {/* Thanh Bộ Lọc Điều Phối Chi Tiết */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px dashed #e2e8f0'
          }}
        >
          {/* Lọc Ngày thực hiện */}
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
              <span>Ngày thực hiện:</span>
            </span>
            <PureDateRangePicker value={dateRange} onChange={setDateRange} />
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
              <UserCheck size={12} color="#245d6c" />
              <span>PIC ĐP:</span>
            </span>
            <PureSelect
              value={selectedPic}
              onChange={setSelectedPic}
              style={{ width: 170 }}
              options={[
                { value: 'ALL', label: 'Tất cả PIC ĐP' },
                ...filterOptions.pics.map((p) => ({ value: p, label: p }))
              ]}
            />
          </div>

          {/* Lọc Trạng thái ĐP - SX */}
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
              <Activity size={12} color="#245d6c" />
              <span>Trạng thái ĐP-SX:</span>
            </span>
            <PureSelect
              value={selectedDpStatus}
              onChange={setSelectedDpStatus}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'SX_SAI_NGAY', label: '1. SX sai ngày KH' },
                { value: 'TRUOT_KH', label: '2. Trượt KH' },
                { value: 'KHOP_SL', label: '3. Khớp số lượng' },
                { value: 'KHOP_JOB', label: '4. Khớp job' }
              ]}
            />
          </div>

          {/* Lọc Trạng thái Thời gian */}
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
              <span>Thời gian vs ĐM:</span>
            </span>
            <PureSelect
              value={selectedTimeStatus}
              onChange={setSelectedTimeStatus}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả thời gian' },
                { value: 'CHAM_DM', label: 'Chậm hơn ĐM' },
                { value: 'NHANH_DM', label: 'Nhanh hơn ĐM' },
                { value: 'DUNG_DM', label: 'Đúng ĐM' },
                { value: 'NO_DATA', label: 'Chưa có dữ liệu' }
              ]}
            />
          </div>

          {/* Lọc Trạng thái Capa */}
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
              <Layers size={12} color="#245d6c" />
              <span>Tải Capa:</span>
            </span>
            <PureSelect
              value={selectedCapaStatus}
              onChange={setSelectedCapaStatus}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả capa' },
                { value: 'NHANH_DM', label: 'Nhanh hơn ĐM' },
                { value: 'CHAM_DM', label: 'Chậm hơn ĐM' },
                { value: 'TRONG_HOAC_DUNG', label: 'Trống / Đúng capa' }
              ]}
            />
          </div>

          {/* Lọc Cụm máy */}
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
              style={{ width: 170 }}
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

      {/* HEADER BÁO CÁO */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: '#245d6c',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: 2
            }}
          >
            BÁO CÁO ĐIỀU HÀNH KẾ HOẠCH
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>•</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
            {plantName}
          </span>
        </div>
        <h1
          style={{
            fontSize: 'clamp(20px, 2.4vw, 26px)',
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em'
          }}
        >
          Báo Cáo Điều Phối Kế Hoạch Sản Xuất (KHSX)
        </h1>
        <div style={{ fontSize: 12.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            Phạm vi phân tích:{' '}
            <strong style={{ color: '#0f172a' }}>
              {dateRange[0]} đến {dateRange[1]}
            </strong>
          </span>
          <span>•</span>
          <span>
            PIC:{' '}
            <strong style={{ color: '#0f172a' }}>
              {selectedPic === 'ALL' ? 'Tất cả PIC ĐP' : selectedPic}
            </strong>
          </span>
        </div>
      </div>

      {/* 2. KPI TỔNG QUAN: 5 THẺ CHỦ CHỐT (SECTION 2) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32
        }}
      >
        {/* KPI 1: LỆNH THAO TÁC */}
        <div
          onClick={() => {
            setAuditModalCategory('ALL')
            setShowAuditModal(true)
          }}
          style={{
            padding: '16px 18px',
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            borderTop: '3.5px solid #245d6c',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: 120
          }}
          title="Bấm để xem danh sách toàn bộ lệnh"
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
            Lệnh thao tác
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
            {kpiMetrics.totalOrders.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#64748b' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tổng số lệnh trong phạm vi lọc →
          </div>
        </div>

        {/* KPI 2: SX SAI NGÀY KH */}
        <div
          onClick={() => {
            setAuditModalCategory('SX_SAI_NGAY')
            setShowAuditModal(true)
          }}
          style={{
            padding: '16px 18px',
            background: kpiMetrics.sxSaiNgayCount > 0 ? '#fffdf7' : '#ffffff',
            borderLeft: kpiMetrics.sxSaiNgayCount > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
            borderRight: kpiMetrics.sxSaiNgayCount > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
            borderBottom: kpiMetrics.sxSaiNgayCount > 0 ? '1px solid #fde68a' : '1px solid #cbd5e1',
            borderTop: '3.5px solid #c27803',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: 120,
            transition: 'all 0.15s ease'
          }}
          title="Bấm để xem danh sách lệnh SX sai ngày KH"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#c27803',
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
              color: kpiMetrics.sxSaiNgayCount > 0 ? '#c27803' : '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.sxSaiNgayCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#c27803' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#c27803', fontWeight: 700 }}>
              {kpiMetrics.sxSaiNgayRate}%
            </span>{' '}
            • <span style={{ color: '#92400e' }}>Lệch ngày KH →</span>
          </div>
        </div>

        {/* KPI 3: TRƯỢT KH */}
        <div
          onClick={() => {
            setAuditModalCategory('TRUOT_KH')
            setShowAuditModal(true)
          }}
          style={{
            padding: '16px 18px',
            background: kpiMetrics.truotKhCount > 0 ? '#fff5f5' : '#ffffff',
            borderLeft: kpiMetrics.truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderRight: kpiMetrics.truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderBottom: kpiMetrics.truotKhCount > 0 ? '1px solid #fecdd3' : '1px solid #cbd5e1',
            borderTop: '3.5px solid #b91c1c',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: 120,
            transition: 'all 0.15s ease'
          }}
          title="Bấm để xem danh sách lệnh Trượt KH"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#b91c1c',
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
              color: kpiMetrics.truotKhCount > 0 ? '#b91c1c' : '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.truotKhCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#b91c1c' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#b91c1c', fontWeight: 700 }}>
              {kpiMetrics.truotKhRate}%
            </span>{' '}
            • <span style={{ color: '#881337' }}>Trượt kế hoạch →</span>
          </div>
        </div>

        {/* KPI 4: KHỚP SỐ LƯỢNG */}
        <div
          onClick={() => {
            setAuditModalCategory('KHOP_SL')
            setShowAuditModal(true)
          }}
          style={{
            padding: '16px 18px',
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            borderTop: '3.5px solid #0f766e',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: 120
          }}
          title="Bấm để xem danh sách lệnh Khớp số lượng"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#0f766e',
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
              color: '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.khopSlCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#0f766e' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#0f766e', fontWeight: 700 }}>
              {kpiMetrics.khopSlRate}%
            </span>{' '}
            • Đạt chuẩn SL →
          </div>
        </div>

        {/* KPI 5: KHỚP JOB */}
        <div
          onClick={() => {
            setAuditModalCategory('KHOP_JOB')
            setShowAuditModal(true)
          }}
          style={{
            padding: '16px 18px',
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            borderRight: '1px solid #cbd5e1',
            borderBottom: '1px solid #cbd5e1',
            borderTop: '3.5px solid #2b6b79',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: 120
          }}
          title="Bấm để xem danh sách lệnh Khớp job"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#2b6b79',
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
              color: '#0f172a',
              lineHeight: 1.05,
              margin: '8px 0 6px 0',
              letterSpacing: '-0.04em'
            }}
          >
            {kpiMetrics.khopJobCount.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: 16, fontWeight: 600, color: '#2b6b79' }}>lệnh</span>
          </div>
          <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
            Tỷ lệ:{' '}
            <span style={{ color: '#2b6b79', fontWeight: 700 }}>
              {kpiMetrics.khopJobRate}%
            </span>{' '}
            • Khớp đúng job →
          </div>
        </div>
      </div>

      {/* 3. TRẠNG THÁI ĐP - SX (SECTION 3) */}
      <div
        style={{
          marginBottom: 36,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>3. TRẠNG THÁI ĐIỀU PHỐI – SẢN XUẤT (ĐP – SX)</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 3 }}>
                Tổng {kpiMetrics.totalOrders} lệnh
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Phân loại kết quả điều phối sản xuất chi tiết theo 4 nhóm chủ chốt
            </div>
          </div>
        </div>

        {/* Multi-segment Progress Bar trực quan */}
        <div
          style={{
            display: 'flex',
            height: 28,
            width: '100%',
            background: '#f1f5f9',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 20,
            border: '1px solid #cbd5e1'
          }}
        >
          {dpStatusBreakdown.map((item, idx) => {
            if (item.rate <= 0) return null
            return (
              <div
                key={idx}
                style={{
                  width: `${item.rate}%`,
                  background: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 11.5,
                  fontWeight: 700,
                  transition: 'width 0.3s ease',
                  whiteSpace: 'nowrap',
                  padding: '0 4px'
                }}
                title={`${item.name}: ${item.count} lệnh (${item.rate}%)`}
              >
                {item.rate >= 8 ? `${item.name} (${item.rate}%)` : `${item.rate}%`}
              </div>
            )
          })}
        </div>

        {/* Biểu đồ Recharts ComposedChart cho 4 nhóm */}
        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dpStatusBreakdown}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12, fontWeight: 700 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<ExecutiveChartTooltip />} />
              <Bar dataKey="count" name="Số lệnh" barSize={50} radius={[3, 3, 0, 0]}>
                <LabelList dataKey="count" position="top" fill="#1e293b" fontSize={12} fontWeight={700} offset={6} />
                {dpStatusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4 & 5. TRẠNG THÁI THỜI GIAN & TRẠNG THÁI CAPA (SECTION 4 & 5) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: 20,
          marginBottom: 36
        }}
      >
        {/* SECTION 4: TRẠNG THÁI THỜI GIAN (SO VỚI ĐM) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              4. TRẠNG THÁI THỜI GIAN (SO VỚI ĐỊNH MỨC)
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              So sánh thời điểm sản xuất thực tế với định mức (ĐM) kế hoạch
            </div>
          </div>

          <div style={{ height: 230, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={timeStatusBreakdown}
                margin={{ top: 10, right: 45, left: 30, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11.5, fontWeight: 700 }} width={110} />
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <Bar dataKey="count" name="Số lệnh" barSize={22} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="count" position="right" fill="#1e293b" fontSize={11.5} fontWeight={700} offset={8} />
                  {timeStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-t-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 5: TRẠNG THÁI CAPA (ĐÁNH GIÁ THEO NĂNG LỰC) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              5. TRẠNG THÁI CAPA (NĂNG LỰC SẢN XUẤT)
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Đánh giá việc bố trí sản xuất so với năng lực/capacity của hệ thống
            </div>
          </div>

          <div style={{ height: 230, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={capaStatusBreakdown}
                margin={{ top: 10, right: 45, left: 30, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11.5, fontWeight: 700 }} width={120} />
                <RechartsTooltip content={<ExecutiveChartTooltip />} />
                <Bar dataKey="count" name="Số lệnh" barSize={22} radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="count" position="right" fill="#1e293b" fontSize={11.5} fontWeight={700} offset={8} />
                  {capaStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-c-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. THEO PIC ĐIỀU PHỐI (SECTION 6) */}
      <div
        style={{
          marginBottom: 36,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>6. THEO PIC ĐIỀU PHỐI (HIỆU QUẢ THEO TỪNG NGƯỜI ĐIỀU PHỐI)</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 3 }}>
              {picBreakdown.length} nhân sự
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Gom toàn bộ KPI theo từng PIC ĐP, giúp nhìn xem mỗi PIC đang quản lý bao nhiêu lệnh và kết quả ra sao
          </div>
        </div>

        {/* Bảng Gom nhóm theo PIC ĐP */}
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
              textAlign: 'left'
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#1e293b' }}>PIC Điều phối</th>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>Tổng lệnh</th>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#c27803', textAlign: 'right' }}>SX sai ngày KH</th>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#b91c1c', textAlign: 'right' }}>Trượt KH</th>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#0f766e', textAlign: 'right' }}>Khớp số lượng</th>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#2b6b79', textAlign: 'right' }}>Khớp job</th>
                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#0f766e', textAlign: 'right' }}>Tỷ lệ đạt chuẩn</th>
              </tr>
            </thead>
            <tbody>
              {picBreakdown.map((row, idx) => {
                const totalPass = (row.khopSl || 0) + (row.khopJob || 0)
                const passRate = row.totalOrders > 0 ? ((totalPass / row.totalOrders) * 100).toFixed(1) : '0.0'
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: idx % 2 === 0 ? '#ffffff' : '#fcfdfd'
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                      <span
                        onClick={() => {
                          setSelectedPic(row.pic)
                        }}
                        style={{ color: '#0284c7', cursor: 'pointer', textDecoration: 'underline' }}
                        title="Bấm để lọc theo PIC này"
                      >
                        {row.pic}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                      {row.totalOrders}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#c27803', fontWeight: 600 }}>
                      {row.sxSaiNgay} ({row.sxSaiNgayRate}%)
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>
                      {row.truotKh} ({row.truotKhRate}%)
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0f766e', fontWeight: 600 }}>
                      {row.khopSl} ({row.khopSlRate}%)
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2b6b79', fontWeight: 600 }}>
                      {row.khopJob} ({row.khopJobRate}%)
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: Number(passRate) >= 20 ? '#0f766e' : '#c27803' }}>
                      {passRate}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Biểu đồ Stacked Bar Chart theo từng PIC */}
        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={picBreakdown}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="pic" stroke="#64748b" tick={{ fontSize: 11.5, fontWeight: 700 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <RechartsTooltip content={<ExecutiveChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="sxSaiNgay" name="SX sai ngày KH" stackId="a" fill="#c27803" />
              <Bar dataKey="truotKh" name="Trượt KH" stackId="a" fill="#b91c1c" />
              <Bar dataKey="khopSl" name="Khớp số lượng" stackId="a" fill="#0f766e" />
              <Bar dataKey="khopJob" name="Khớp job" stackId="a" fill="#2b6b79" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 7. LỆNH THEO TRẠNG THÁI ĐP–SX: DANH SÁCH CHI TIẾT TỪNG LỆNH (SECTION 7) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Table Toolbar Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            background: '#ffffff'
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              7. LỆNH THEO TRẠNG THÁI ĐP – SX (DANH SÁCH CHI TIẾT TỪNG LỆNH)
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Bảng dữ liệu chi tiết toàn bộ lệnh sản xuất điều phối, hỗ trợ lọc, tìm kiếm và xuất dữ liệu
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                padding: '3px 8px',
                background: '#ffffff',
                width: 260
              }}
            >
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm LSX, đơn hàng, SP, PIC..."
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 11 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Độ cao dòng */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                background: '#ffffff'
              }}
            >
              <button
                onClick={() => setRowHeight(26)}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  background: rowHeight === 26 ? '#245d6c' : 'transparent',
                  color: rowHeight === 26 ? '#ffffff' : '#334155',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Thu gọn dòng"
              >
                Gọn
              </button>
              <button
                onClick={() => setRowHeight(32)}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  background: rowHeight === 32 ? '#245d6c' : 'transparent',
                  color: rowHeight === 32 ? '#ffffff' : '#334155',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Chuẩn"
              >
                Chuẩn
              </button>
            </div>
          </div>
        </div>

        {/* Glide Data Grid Table */}
        <div style={{ height: 600, width: '100%', position: 'relative' }}>
          <DataEditor
            ref={gridRef}
            width="100%"
            height="100%"
            columns={columns}
            rows={sortedData.length}
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

        {/* Table Footer */}
        <div
          style={{
            padding: '8px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#64748b'
          }}
        >
          <div>
            Hiển thị <strong style={{ color: '#0f172a' }}>{sortedData.length}</strong> / {filteredData.length} lệnh
          </div>
          <div>
            Kéo mép cột để giãn rộng • Nhấn Ctrl+C để sao chép dữ liệu
          </div>
        </div>
      </div>

      {/* PLAN AUDIT DETAIL MODAL */}
      <PlanAuditDetailModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        initialCategory={auditModalCategory}
        data={filteredData}
        plantName={plantName}
        maskText={(t) => t}
      />
    </div>
  )
}
