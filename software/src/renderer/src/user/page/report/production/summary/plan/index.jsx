/* eslint-disable react/prop-types */
import { gridCustomCss } from '../../hanoiGs1/stat/components/reportUIComponents'
import { FormulaHandbookModal } from '../../handbook/FormulaHandbookModal'
import ExportExcelModal from '@renderer/user/components/modal/ExportExcelModal'
import { useSummaryPlanLogic } from './hooks/useSummaryPlanLogic'
import { SummaryTopControlBar } from '../common/SummaryTopControlBar'
import { PlanHeroKpiCards } from './components/PlanHeroKpiCards'
import { PlanProductionRhythmChart } from './components/PlanProductionRhythmChart'
import { PlanPicAnalysisSection } from './components/PlanPicAnalysisSection'
import { PlanPicTimelineSection } from './components/PlanPicTimelineSection'
import { PlanTimeAndCapaSection } from './components/PlanTimeAndCapaSection'

export default function SummaryPlanReportPage() {
  const {
    factoryCode,
    setFactoryCode,
    dateRange,
    handleCustomDateChange,
    selectedPreset,
    handleApplyPreset,
    presets,
    selectedMasterKey,
    setSelectedMasterKey,
    masterOptions,
    selectedTeam,
    setSelectedTeam,
    selectedMachine,
    setSelectedMachine,
    selectedPic,
    setSelectedPic,
    picBreakdown,
    picTimelineBreakdown,
    showPicSummaryTable,
    setShowPicSummaryTable,
    picChartMode,
    setPicChartMode,
    loading,
    fetchTimelineData,
    isHandbookModalOpen,
    setIsHandbookModalOpen,
    isCapturing,
    reportRootRef,
    factoryOptions,
    filterOptions,
    planMetrics,
    dailyTrendData,
    timeStatusBreakdown,
    capaStatusBreakdown,
    timeTimelineBreakdown,
    capaTimelineBreakdown,
    displayDetailList,
    detailGridCols,
    handleExportExcel,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportSummaryExcel,
    handleCaptureScreenshot,
    currentPlantName,
    totalDays
  } = useSummaryPlanLogic()

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 w-full overflow-y-auto">
        <div
          ref={reportRootRef}
          className="production-plan-report"
          style={{
            background: '#ffffff',
            minHeight: '100%',
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

          {/* TOP CONTROL BAR CHUẨN ACTION & BỘ LỌC ERP (Bao gồm lọc PIC Điều phối, Tổ SX, Máy SX) */}
          <div className="screenshot-hide" style={{ marginBottom: 24 }}>
            <SummaryTopControlBar
              factoryCode={factoryCode}
              setFactoryCode={setFactoryCode}
              factoryOptions={factoryOptions}
              reportType="plan"
              reportTypeName="Kế hoạch SX"
              handleCustomDateChange={handleCustomDateChange}
              dateRange={dateRange}
              selectedPreset={selectedPreset}
              handleApplyPreset={handleApplyPreset}
              presets={presets}
              selectedMasterKey={selectedMasterKey}
              setSelectedMasterKey={setSelectedMasterKey}
              masterOptions={masterOptions}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              teamOptions={filterOptions?.teams || []}
              selectedMachine={selectedMachine}
              setSelectedMachine={setSelectedMachine}
              machineOptions={filterOptions?.machines || []}
              selectedPic={selectedPic}
              setSelectedPic={setSelectedPic}
              picOptions={filterOptions?.pics || []}
              loading={loading}
              fetchData={fetchTimelineData}
              handleExportExcel={handleExportExcel}
              setIsHandbookModalOpen={setIsHandbookModalOpen}
              handleCaptureScreenshot={handleCaptureScreenshot}
              isCapturing={isCapturing}
            />
          </div>

          {/* MAIN REPORT HEADER */}
          <div
            style={{
              marginTop: 16,
              marginBottom: 36,
              paddingBottom: 18,
              borderBottom: '2px solid #0f172a'
            }}
          >
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
                BÁO CÁO TỔNG HỢP TIẾN ĐỘ KẾ HOẠCH SẢN XUẤT (KHSX)
              </h1>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 10,
                fontSize: 13,
                color: '#475569',
                flexWrap: 'wrap'
              }}
            >
              <span>
                <b>Đơn vị:</b> {currentPlantName}
              </span>
              <span>•</span>
              <span>
                <b>Hệ thống:</b> Điều phối KHSX & Bravo ERP
              </span>
              {dateRange && dateRange[0] && dateRange[1] && (
                <>
                  <span>•</span>
                  <span>
                    <b>Phạm vi ngày đăng ký:</b> {dateRange[0]} đến {dateRange[1]} ({totalDays}{' '}
                    ngày)
                  </span>
                </>
              )}
              {selectedPic !== 'ALL' && (
                <>
                  <span>•</span>
                  <span>
                    <b>PIC:</b> {selectedPic}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* I. HERO KPI METRICS */}
          <PlanHeroKpiCards planMetrics={planMetrics} />

          {/* 1. HẠNG MỤC ĐẦU TIÊN: NHỊP SẢN XUẤT & CHẤT LƯỢNG KẾ HOẠCH */}
          <PlanProductionRhythmChart
            serverDailyData={dailyTrendData || []}
            picTimelineBreakdown={picTimelineBreakdown}
            planMetrics={planMetrics}
            plantName={currentPlantName}
            systemName="Điều phối KHSX & Bravo ERP"
            dateRange={dateRange}
            totalDays={totalDays}
            loading={loading}
          />

          {/* 2. PHÂN TÍCH THEO PIC ĐIỀU PHỐI (HIỆU QUẢ THEO TỪNG NGƯỜI ĐIỀU PHỐI) */}
          <PlanPicAnalysisSection
            picBreakdown={picBreakdown || []}
            plantName={currentPlantName}
            selectedPic={selectedPic}
            onSelectPic={setSelectedPic}
            showPicTable={showPicSummaryTable}
            setShowPicTable={setShowPicSummaryTable}
            picChartMode={picChartMode}
            setPicChartMode={setPicChartMode}
          />

          {/* 2. TIẾN ĐỘ & XU HƯỚNG TĂNG TRƯỞNG KHSX THEO DẢI NGÀY CỦA PIC */}
          <PlanPicTimelineSection
            picTimelineBreakdown={picTimelineBreakdown || { dailyList: [], picList: [] }}
            plantName={currentPlantName}
            totalDays={totalDays}
            selectedPic={selectedPic}
            onSelectPic={setSelectedPic}
          />

          {/* 3 & 4. TRẠNG THÁI THỜI GIAN & TRẠNG THÁI CAPA (SO VỚI ĐỊNH MỨC & NĂNG LỰC) */}
          <PlanTimeAndCapaSection
            timeStatusBreakdown={timeStatusBreakdown || []}
            capaStatusBreakdown={capaStatusBreakdown || []}
            timeTimelineBreakdown={timeTimelineBreakdown}
            capaTimelineBreakdown={capaTimelineBreakdown}
            plantName={currentPlantName}
            totalDays={totalDays}
            dateRange={dateRange}
          />

          {/* MODAL CẨM NANG CÔNG THỨC */}
          <FormulaHandbookModal
            isOpen={isHandbookModalOpen}
            open={isHandbookModalOpen}
            onClose={() => setIsHandbookModalOpen(false)}
            defaultReportType="plan"
          />

          {/* MODAL XUẤT EXCEL CHUẨN */}
          <ExportExcelModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            title="XÁC NHẬN XUẤT EXCEL - TỔNG HỢP KẾ HOẠCH SẢN XUẤT"
            reportName={`Báo cáo Tổng hợp KHSX (${factoryCode === 'GS5' ? 'GS Quế Võ' : 'GS Hà Nội'})`}
            totalRows={(displayDetailList || []).length}
            loadedCount={(displayDetailList || []).length}
            columns={detailGridCols}
            activeFilters={{
              FactoryName: factoryCode === 'GS5' ? 'GS Quế Võ' : 'GS Hà Nội',
              FromDate: dateRange?.[0] || '',
              ToDate: dateRange?.[1] || '',
              PicDp: selectedPic !== 'ALL' ? selectedPic : ''
            }}
            defaultFileName={`BaoCao_TongHop_KHSX_${factoryCode === 'GS5' ? 'GS5_QueVo' : 'GS1_HaNoi'}_${new Date().toISOString().slice(0, 10)}.xlsx`}
            onConfirmExport={executeExportSummaryExcel}
          />
        </div>
      </div>
    </div>
  )
}
