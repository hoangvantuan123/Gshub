import { useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import LoadingBar from 'react-top-loading-bar'
import ExportExcelModal from '../../../../components/modal/ExportExcelModal'
import { useProductionPlanReportColumns } from './columns/productionPlanReportColumns'
import ProductionPlanReportTable from './components/ProductionPlanReportTable'
import ProductionPlanReportQuery from './components/ProductionPlanReportQuery'
import ProductionPlanReportActions from './components/ProductionPlanReportActions'
import { useProductionPlanReport } from './hooks/useProductionPlanReport'

export default function ProductionPlanReportView({
  plantKey = 'hanoi_gs1',
  pageTitle = 'Báo cáo kế hoạch sản xuất - Điều phối KHSX'
}) {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)

  // Sheet State
  const [gridData, setGridData] = useState([])
  const [numRows, setNumRows] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // Columns hook
  const defaultCols = useProductionPlanReportColumns()
  const [cols, setCols] = useState(defaultCols)

  // Row selection helper
  const getSelectedRows = useCallback(() => {
    if (!selection?.rows) return []
    return selection.rows.toArray()
  }, [selection])

  const {
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleSearchData,
    onResetQuery,
    onAddQueryField,
    onRemoveQueryField,
    handleRowAppend,
    handleSaveData,
    handleDeleteData,
    handleExportExcel,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportPlanExcel,
    kpiStats
  } = useProductionPlanReport({
    plantKey,
    gridData,
    setGridData,
    setNumRows,
    getSelectedRows,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    loadingBarRef
  })

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      <LoadingBar color="#2563eb" ref={loadingBarRef} height={3} />

      {/* Query Bar */}
      <ProductionPlanReportQuery
        searchValues={searchValues}
        setSearchValues={setSearchValues}
        dynamicQueryFields={dynamicQueryFields}
        onAddQueryField={onAddQueryField}
        onRemoveQueryField={onRemoveQueryField}
        onResetQuery={onResetQuery}
        handleSearchData={handleSearchData}
      />

      {/* Action Toolbar & KPI Bar */}
      <ProductionPlanReportActions
        handleSearchData={handleSearchData}
        handleSaveData={handleSaveData}
        handleDeleteData={handleDeleteData}
        handleRowAppend={handleRowAppend}
        handleExportExcel={handleExportExcel}
        onResetQuery={onResetQuery}
        canCreate={true}
        canEdit={true}
        canDelete={true}
        plantKey={plantKey}
        kpiStats={kpiStats}
      />

      {/* Sheet Table */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative">
        <ProductionPlanReportTable
          tableTitle={pageTitle}
          cols={cols}
          setCols={setCols}
          defaultCols={defaultCols}
          gridData={gridData}
          setGridData={setGridData}
          numRows={numRows}
          setNumRows={setNumRows}
          selection={selection}
          setSelection={setSelection}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          handleRowAppend={handleRowAppend}
          canEdit={true}
          canCreate={true}
          onAddQueryField={onAddQueryField}
        />
      </div>

      {/* Modal Xuất Excel Chuẩn ERP */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={executeExportPlanExcel}
        defaultFileName={`BaoCao_KeHoach_SX_${plantKey}_${new Date().toISOString().slice(0, 10)}`}
        totalRows={gridData.length}
        selectedCount={getSelectedRows().length}
        columns={cols}
      />
    </div>
  )
}
