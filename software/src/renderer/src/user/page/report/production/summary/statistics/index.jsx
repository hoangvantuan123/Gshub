/* eslint-disable react/prop-types */
import { gridCustomCss } from '../../hanoiGs1/stat/components/reportUIComponents'
import { FormulaHandbookModal } from '../../handbook/FormulaHandbookModal'
import { useSummaryStatisticsLogic } from './hooks/useSummaryStatisticsLogic'
import { SummaryTopControlBar } from '../common/SummaryTopControlBar'
import { HeroKpiCards } from '../../timelineSummary/components/HeroKpiCards'
import { DailyTimelineProgressSection } from '../../timelineSummary/components/DailyTimelineProgressSection'
import { MachineRuntimeSection } from '../../timelineSummary/components/MachineRuntimeSection'
import { TeamOutputSection } from '../../timelineSummary/components/TeamOutputSection'
import { SyncLatencySection } from '../../timelineSummary/components/SyncLatencySection'
import { AutoExportSection } from '../../timelineSummary/components/AutoExportSection'

export default function SummaryStatisticsReportPage() {
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
    loading,
    fetchTimelineData,
    showDailySummaryTable,
    setShowDailySummaryTable,
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
    dailyAggregates,
    displayMachineList,
    machineGrandTotal,
    teamAggregates,
    teamGrandTotal,
    missingAutoExportTickets,
    handleCaptureScreenshot,
    handleDownloadSingleChart,
    currentPlantName,
    totalDays,
    standardCapacityHours
  } = useSummaryStatisticsLogic()

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 w-full overflow-y-auto">
        <div
          ref={reportRootRef}
          className="production-statistics-report"
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

          {/* TOP CONTROL BAR */}
          <div className="screenshot-hide" style={{ marginBottom: 24 }}>
            <SummaryTopControlBar
              factoryCode={factoryCode}
              setFactoryCode={setFactoryCode}
              factoryOptions={factoryOptions}
              reportType="stat"
              reportTypeName="Thống kê SX"
              handleCustomDateChange={handleCustomDateChange}
              dateRange={dateRange}
              selectedPreset={selectedPreset}
              handleApplyPreset={handleApplyPreset}
              presets={presets}
              selectedMasterKey={selectedMasterKey}
              setSelectedMasterKey={setSelectedMasterKey}
              masterOptions={masterOptions}
              loading={loading}
              fetchData={fetchTimelineData}
              handleExportExcel={
                handleDownloadSingleChart ? () => handleDownloadSingleChart('report-excel') : null
              }
              setIsHandbookModalOpen={setIsHandbookModalOpen}
              handleCaptureScreenshot={handleCaptureScreenshot}
              isCapturing={isCapturing}
            />
          </div>

          {/* 2. MAIN REPORT HEADER */}
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
                BÁO CÁO THỐNG KÊ HIỆU SUẤT SẢN XUẤT
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
                <b>Hệ thống:</b> MES Engine & Bravo ERP
              </span>
              {dateRange && dateRange[0] && dateRange[1] && (
                <>
                  <span>•</span>
                  <span>
                    <b>Phạm vi thống kê:</b> {dateRange[0]} đến {dateRange[1]} ({totalDays} ngày)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* I. HERO KPI METRICS */}
          <HeroKpiCards kpiMetrics={kpiMetrics} />

          {/* 1. MACHINE RUNTIME & CAPACITY ANALYSIS */}
          <MachineRuntimeSection
            displayMachineList={displayMachineList}
            machineGrandTotal={machineGrandTotal}
            machineChartMode={machineChartMode}
            setMachineChartMode={setMachineChartMode}
            showManualMachines={showManualMachines}
            setShowManualMachines={setShowManualMachines}
            showMachineSummaryTable={showMachineSummaryTable}
            setShowMachineSummaryTable={setShowMachineSummaryTable}
            totalDays={totalDays}
            standardCapacityHours={standardCapacityHours}
            plantName={currentPlantName}
            handleDownloadSingleChart={handleDownloadSingleChart}
          />

          {/* 2. TEAM OUTPUT & EFFICIENCY ANALYSIS */}
          <TeamOutputSection
            teamAggregates={teamAggregates}
            teamGrandTotal={teamGrandTotal}
            showTeamSummaryTable={showTeamSummaryTable}
            setShowTeamSummaryTable={setShowTeamSummaryTable}
            plantName={currentPlantName}
            handleDownloadSingleChart={handleDownloadSingleChart}
          />

          {/* 3. DAILY TIMELINE & PROGRESS EVOLUTION ANALYSIS */}
          <DailyTimelineProgressSection
            dailyAggregates={dailyAggregates}
            plantName={currentPlantName}
            totalDays={totalDays}
            showDailySummaryTable={showDailySummaryTable}
            setShowDailySummaryTable={setShowDailySummaryTable}
          />

          {/* IV. SYNC LATENCY & AUTO EXPORT LOGISTICS ANALYSIS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: 24,
              marginBottom: 28
            }}
          >
            <SyncLatencySection
              kpiMetrics={kpiMetrics}
              showSyncTable={showSyncTable}
              setShowSyncTable={setShowSyncTable}
              plantName={currentPlantName}
              handleDownloadSingleChart={handleDownloadSingleChart}
            />
            <AutoExportSection
              kpiMetrics={kpiMetrics}
              missingAutoExportTickets={missingAutoExportTickets}
              showAutoExportTable={showAutoExportTable}
              setShowAutoExportTable={setShowAutoExportTable}
              plantName={currentPlantName}
              handleDownloadSingleChart={handleDownloadSingleChart}
            />
          </div>

          {/* MODAL CẨM NANG CÔNG THỨC */}
          <FormulaHandbookModal
            isOpen={isHandbookModalOpen}
            open={isHandbookModalOpen}
            onClose={() => setIsHandbookModalOpen(false)}
            defaultReportType="stat"
          />
        </div>
      </div>
    </div>
  )
}
