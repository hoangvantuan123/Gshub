import { gridCustomCss } from '../hanoiGs1/stat/components/reportUIComponents'
import { FormulaHandbookModal } from '../handbook/FormulaHandbookModal'
import ExportExcelModal from '../../../../components/modal/ExportExcelModal'
import { useTimelineSummaryLogic } from './hooks/useTimelineSummaryLogic'
import { TopControlBar } from './components/TopControlBar'
import { HeroKpiCards } from './components/HeroKpiCards'
import { MachineRuntimeSection } from './components/MachineRuntimeSection'
import { TeamOutputSection } from './components/TeamOutputSection'
import { SyncLatencySection } from './components/SyncLatencySection'
import { AutoExportSection } from './components/AutoExportSection'

export default function TimelineSummaryReportPage() {
  const {
    factoryCode,
    setFactoryCode,
    reportType,
    setReportType,
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
    filterOptions,
    loading,
    fetchTimelineData,
    showMachineSummaryTable,
    setShowMachineSummaryTable,
    showTeamSummaryTable,
    setShowTeamSummaryTable,
    showSyncTable,
    setShowSyncTable,
    showAutoExportTable,
    setShowAutoExportTable,
    showManualMachines,
    setShowManualMachines,
    machineChartMode,
    setMachineChartMode,
    isHandbookModalOpen,
    setIsHandbookModalOpen,
    isCapturing,
    reportRootRef,
    factoryOptions,
    kpiMetrics,
    rawDataset,
    backendReportData,
    dailyAggregates,
    machineTimelineBreakdown,
    displayMachineList,
    machineGrandTotal,
    teamAggregates,
    teamTimelineBreakdown,
    teamGrandTotal,
    missingAutoExportTickets,
    displayDetailList,
    detailGridCols,
    handleExportExcel,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportTimelineExcel,
    handleCaptureScreenshot,
    currentPlantName,
    totalDays,
    standardCapacityHours
  } = useTimelineSummaryLogic()

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 w-full overflow-y-auto">
        <div
          style={{
            width: '100%',
            minHeight: '100%',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <style>{gridCustomCss}</style>

          {/* 1. TOP CONTROL BAR (STICKY HEADER) */}
          <TopControlBar
            factoryCode={factoryCode}
            setFactoryCode={setFactoryCode}
            factoryOptions={factoryOptions}
            reportType={reportType}
            setReportType={setReportType}
            dateRange={dateRange}
            handleCustomDateChange={handleCustomDateChange}
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
            loading={loading}
            fetchTimelineData={fetchTimelineData}
            handleExportExcel={handleExportExcel}
            setIsHandbookModalOpen={setIsHandbookModalOpen}
            handleCaptureScreenshot={handleCaptureScreenshot}
            isCapturing={isCapturing}
          />

          {/* 2. KHU VỰC NỘI DUNG BÁO CÁO (REPORT ROOT) */}
          <div
            ref={reportRootRef}
            style={{
              flex: 1,
              padding: '24px 28px 48px',
              maxWidth: 1600,
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* DOCUMENT HEADER */}
            <div
              style={{
                borderBottom: '2px solid #0f172a',
                paddingBottom: 18,
                marginTop: 12,
                marginBottom: 36
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
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.2
                  }}
                >
                  BÁO CÁO TỔNG HỢP TOÀN TRÌNH LỊCH SỬ SẢN XUẤT
                </h1>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 6,
                  fontSize: 12.5,
                  color: '#475569',
                  flexWrap: 'wrap'
                }}
              >
                <span>
                  <b>Đơn vị:</b> {currentPlantName}
                </span>
                <span>•</span>
                <span>
                  <b>Khoảng thời gian:</b> {dateRange[0]} đến {dateRange[1]} ({totalDays} ngày)
                </span>
                <span>•</span>
                <span>
                  <b>Chế độ:</b>{' '}
                  {reportType === 'plan'
                    ? 'Kế hoạch sản xuất điều phối'
                    : 'Thống kê sản xuất & Năng suất'}
                </span>
              </div>
            </div>

            {/* 3. 4 TOP HERO KPI CARDS */}
            <HeroKpiCards kpiMetrics={kpiMetrics} />

            {/* 4. MỤC 1: TỔNG GIỜ CHẠY MÁY & PHÂN BỔ TẢI TRỌNG THEO CỤM MÁY */}
            <MachineRuntimeSection
              displayMachineList={displayMachineList}
              machineTimelineBreakdown={machineTimelineBreakdown}
              machineGrandTotal={machineGrandTotal}
              showMachineSummaryTable={showMachineSummaryTable}
              setShowMachineSummaryTable={setShowMachineSummaryTable}
              showManualMachines={showManualMachines}
              setShowManualMachines={setShowManualMachines}
              machineChartMode={machineChartMode}
              setMachineChartMode={setMachineChartMode}
              plantName={currentPlantName}
              totalDays={totalDays}
              standardCapacityHours={standardCapacityHours}
            />

            {/* 5. MỤC 2: SẢN LƯỢNG SẢN XUẤT & ĐẠT THEO TỔ SẢN XUẤT */}
            <TeamOutputSection
              teamAggregates={teamAggregates}
              teamTimelineBreakdown={teamTimelineBreakdown}
              teamGrandTotal={teamGrandTotal}
              showTeamSummaryTable={showTeamSummaryTable}
              setShowTeamSummaryTable={setShowTeamSummaryTable}
              plantName={currentPlantName}
            />

            {/* 4.1. THỐNG KÊ ĐỘ TRỄ THỜI GIAN ĐỒNG BỘ 2 HỆ THỐNG */}
            <div style={{ marginBottom: 44, width: '100%' }}>
              <SyncLatencySection
                sectionNumber="4.1"
                kpiMetrics={kpiMetrics}
                filteredData={rawDataset || displayDetailList}
                dailyAggregates={dailyAggregates}
                backendReportData={backendReportData}
                showSyncTable={showSyncTable}
                setShowSyncTable={setShowSyncTable}
                plantName={currentPlantName}
              />
            </div>

            {/* 4.2. THỐNG KÊ PHÂN BỔ LOẠI CHỨNG TỪ XUẤT/NHẬP TỰ ĐỘNG */}
            <div style={{ marginBottom: 44, width: '100%' }}>
              <AutoExportSection
                sectionNumber="4.2"
                kpiMetrics={kpiMetrics}
                filteredData={rawDataset || displayDetailList}
                dailyAggregates={dailyAggregates}
                backendReportData={backendReportData}
                missingAutoExportTickets={missingAutoExportTickets}
                showAutoExportTable={showAutoExportTable}
                setShowAutoExportTable={setShowAutoExportTable}
                plantName={currentPlantName}
              />
            </div>
          </div>

          {/* MODAL CẨM NANG CÔNG THỨC */}
          <FormulaHandbookModal
            isOpen={isHandbookModalOpen}
            open={isHandbookModalOpen}
            onClose={() => setIsHandbookModalOpen(false)}
            defaultReportType="stat"
          />

          {/* MODAL XUẤT EXCEL CHUẨN */}
          <ExportExcelModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            title="XÁC NHẬN XUẤT EXCEL - BÁO CÁO TOÀN TRÌNH SẢN XUẤT"
            reportName={`Báo cáo Toàn trình Diễn biến SX (${factoryCode === 'GS5' ? 'GS Quế Võ' : 'GS Hà Nội'})`}
            totalRows={(displayDetailList || []).length}
            loadedCount={(displayDetailList || []).length}
            columns={detailGridCols}
            activeFilters={{
              FactoryName: factoryCode === 'GS5' ? 'GS Quế Võ' : 'GS Hà Nội',
              FromDate: dateRange?.[0] || '',
              ToDate: dateRange?.[1] || ''
            }}
            defaultFileName={`BaoCao_ToanTrinh_${reportType?.toUpperCase() || 'STAT'}_${factoryCode === 'GS5' ? 'GS5_QueVo' : 'GS1_HaNoi'}_${new Date().toISOString().slice(0, 10)}.xlsx`}
            onConfirmExport={executeExportTimelineExcel}
          />
        </div>
      </div>
    </div>
  )
}
