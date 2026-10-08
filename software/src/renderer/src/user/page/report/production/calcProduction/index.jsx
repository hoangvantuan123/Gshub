import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { CompactSelection } from '@glideapps/glide-data-grid'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
import { useCalcProductionLogic } from './hooks/useCalcProductionLogic'
import { TAB_DEFINITIONS } from './constants/calcConstants'
import { getGridColumnsForTab } from './columns/calcGridColumns'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import CalcDataGridTable from './components/CalcDataGridTable'
import CalcProductionActions from './components/CalcProductionActions'
import CalcProductionQuery from './components/CalcProductionQuery'
import ImportLoadingOverlay from './components/ImportLoadingOverlay'
import ExcelMappingModal from './components/ExcelMappingModal'

export default function CalcProductionPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  ...restProps
}) {
  const { t } = useTranslation()
  const { setStatusMessage, setPageData, setSelectionStats, registerDirtyChecker } =
    usePageData() || {}
  const loadingBarRef = useRef(null)

  const {
    activeTab,
    setActiveTab,
    masterInfo,
    handleChangeMasterInfo,
    handleGenerateNewRegCode,
    activeTabFileData,
    fileSummaries,
    isParsing,
    isCalculating,
    isRegistering,
    isRegistered,
    calcResults,
    storageMode,
    fileStatusSummary,
    importProgress,
    mappingModalState,
    setMappingModalState,
    openMappingModalForCurrentTab,
    handleConfirmMapping,
    handleUploadFileForTab,
    handleDeleteTabFile,
    handleRunCalculation,
    handleRegisterMaster,
    clearAllFiles,
    refreshFiles
  } = useCalcProductionLogic({
    setStatusMessage
  })

  // Đăng ký kiểm tra dữ liệu chưa lưu - Chặn rời trang / chuyển menu khi chưa bấm ĐĂNG KÝ BÁO CÁO
  useEffect(() => {
    if (!registerDirtyChecker) return
    return registerDirtyChecker(() => {
      const uploadedCount = Object.values(fileStatusSummary || {}).filter(
        (s) => s?.isUploaded
      ).length
      const hasData = (activeTabFileData?.data?.length || 0) > 0 || uploadedCount > 0
      return hasData && !isRegistered
    })
  }, [registerDirtyChecker, fileStatusSummary, activeTabFileData, isRegistered])

  const currentTabDef = useMemo(() => {
    return TAB_DEFINITIONS.find((t) => t.id === activeTab) || TAB_DEFINITIONS[0]
  }, [activeTab])

  const currentUploadedAt = activeTabFileData?.uploadedAt
  const currentColumns = activeTabFileData?.columns
  const currentData = activeTabFileData?.data

  // ── Grid State ──
  const [gridData, setGridData] = useState(() => currentData || [])
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // Cột động cho Grid theo từng Tab
  const defaultCols = useMemo(() => {
    return getGridColumnsForTab(activeTab, currentColumns || [])
  }, [activeTab, currentColumns])

  const [cols, setCols] = useState(defaultCols)

  const lastSyncKeyRef = useRef('')

  // Cập nhật khi dữ liệu Tab hiện tại thay đổi
  useEffect(() => {
    const syncKey = `${activeTab}_${currentUploadedAt || 'empty'}_${(currentData || []).length}`
    if (lastSyncKeyRef.current === syncKey) return
    lastSyncKeyRef.current = syncKey

    const rows = currentData || []
    const newCols = getGridColumnsForTab(activeTab, currentColumns || [])

    setGridData(rows)
    setCols(newCols)
    setSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty()
    })

    // Cập nhật Status bar chân trang
    setPageData?.((prev) => ({
      ...prev,
      total: rows.length,
      totalAll: rows.length,
      loadedCount: rows.length,
      totalColumns: newCols.length,
      page: 1,
      pageSize: rows.length,
      totalPages: 1,
      rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
    }))

    if (typeof setStatusMessage === 'function') {
      setStatusMessage({
        type: 'info',
        text: t('Tab: {{name}} • Đã nạp {{count}} dòng vào hệ thống', {
          name: currentTabDef.title,
          count: rows.length.toLocaleString('vi-VN')
        })
      })
    }
  }, [
    activeTab,
    currentUploadedAt,
    currentData,
    currentColumns,
    currentTabDef.title,
    setPageData,
    setStatusMessage,
    t
  ])

  // Cleanup khi unmount trang (rời khỏi menu sang menu khác)
  useEffect(() => {
    return () => {
      setSelectionStats?.(null)
    }
  }, [setSelectionStats])

  // Tính thống kê (SUM, AVG, COUNT) khi bôi đen ô trên bảng
  const lastSelectionJsonRef = useRef('')
  useEffect(() => {
    if (!setSelectionStats) return

    const hasRows = selection?.rows && selection.rows.toArray().length > 0
    const hasRange = Boolean(selection?.current?.range)
    const hasCell = Boolean(selection?.current?.cell)

    if (!hasRows && !hasRange && !hasCell) {
      if (lastSelectionJsonRef.current !== 'empty') {
        lastSelectionJsonRef.current = 'empty'
        setSelectionStats(null)
      }
      return
    }

    const selKey = JSON.stringify({
      rows: selection?.rows?.toArray() || [],
      range: selection?.current?.range || null,
      cell: selection?.current?.cell || null
    })

    if (lastSelectionJsonRef.current === selKey) return
    lastSelectionJsonRef.current = selKey

    const frameId = requestAnimationFrame(() => {
      const stats = calculateSelectionStats(selection, gridData, cols)
      setSelectionStats(stats)
    })

    return () => cancelAnimationFrame(frameId)
  }, [selection, gridData, cols, setSelectionStats])

  const handleOpenInNewWindow = () => {
    const code = masterInfo.regCode || 'CURRENT'
    openChildWindow({
      path: `/sub/report/calc-production-query/detail/${encodeURIComponent(code)}`,
      title: `Chi tiết các bảng KHSX & TKSX - [${code}]`,
      width: 1400,
      height: 850,
      id: `calc_detail_${code}`
    })
  }

  const handleExportExcel = () => {
    if (!gridData || gridData.length === 0) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({ type: 'warning', text: t('Không có dữ liệu để xuất Excel') })
      }
      return
    }

    try {
      const hasGroup = cols.some((c) => Boolean(c.group))
      const headerRow0 = hasGroup
        ? cols.map((c) => c.group || '')
        : cols.map((c) => c.title || c.id)
      const headerRow1 = hasGroup ? cols.map((c) => c.title || c.id) : []

      const matrix = []
      if (hasGroup) {
        matrix.push(headerRow0)
        matrix.push(headerRow1)
      } else {
        matrix.push(headerRow0)
      }

      gridData.forEach((row) => {
        const rowArr = cols.map((col) => {
          const val = row[col.id] !== undefined ? row[col.id] : row[col.title]
          return val !== undefined && val !== null ? val : ''
        })
        matrix.push(rowArr)
      })

      const ws = XLSX.utils.aoa_to_sheet(matrix)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, currentTabDef.shortTitle || 'Sheet1')

      const safeCode = masterInfo.regCode || 'EXPORT'
      const tabKey = activeTab === 'result_tksx' ? 'TKSX_KetQua_98Cot' : currentTabDef.id
      const fileName = `${tabKey}_${safeCode}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`

      XLSX.writeFile(wb, fileName)
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t(`Đã xuất thành công tệp Excel: ${fileName}`)
        })
      }
    } catch (err) {
      console.error('Lỗi xuất Excel:', err)
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({ type: 'error', text: t(`Xuất Excel thất bại: ${err.message}`) })
      }
    }
  }

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <CalcProductionActions
            activeTabDef={currentTabDef}
            activeFileData={activeTabFileData}
            isParsing={isParsing}
            isCalculating={isCalculating}
            isRegistering={isRegistering}
            storageMode={storageMode}
            fileStatusSummary={fileStatusSummary}
            onUploadFile={handleUploadFileForTab}
            onOpenCustomMapping={openMappingModalForCurrentTab}
            onDeleteTabFile={handleDeleteTabFile}
            onClearAll={clearAllFiles}
            onRunCalculation={handleRunCalculation}
            onRegisterMaster={handleRegisterMaster}
            onExportExcel={handleExportExcel}
            onRefresh={refreshFiles}
            onOpenSearch={() => setShowSearch(true)}
            onOpenInNewWindow={handleOpenInNewWindow}
          />
        }
        query={
          <CalcProductionQuery
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            masterInfo={masterInfo}
            onChangeMasterInfo={handleChangeMasterInfo}
            onGenerateRegCode={handleGenerateNewRegCode}
            fileStatusSummary={fileStatusSummary}
            calcResults={calcResults}
          />
        }
        queryTitle={t('Danh sách 4 Tab Kiến Trúc Dữ Liệu & Chỉ Số Tổng Hợp')}
        defaultOpenQuery={true}
        table={
          <CalcDataGridTable
            tableTitle={`${currentTabDef.title} (${(gridData.length || 0).toLocaleString('vi-VN')} dòng)`}
            cols={cols}
            setCols={setCols}
            defaultCols={defaultCols}
            gridData={gridData}
            setGridData={setGridData}
            numRows={gridData.length}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
          />
        }
      />

      {/* Khóa màn hình & chuột kèm thông số thời gian chạy, số cột, tổng dòng nạp chuyên nghiệp */}
      <ImportLoadingOverlay
        isLoading={isParsing}
        progressInfo={importProgress}
        title={t('TIẾN TRÌNH NẠP DỮ LIỆU BÁO CÁO')}
        message={t('Đang đọc và phân tích cấu trúc file Excel...')}
        subMessage={t(
          'Thao tác chuột và bàn phím đang được tạm khóa để bảo vệ toàn vẹn dữ liệu. Vui lòng không tắt hoặc rời khỏi trang.'
        )}
      />

      {/* Modal Cấu hình Dòng Tiêu đề và Ánh xạ Cột khi phát hiện file bất thường hoặc người dùng chủ động chỉnh */}
      {mappingModalState.isOpen && (
        <ExcelMappingModal
          isOpen={mappingModalState.isOpen}
          onClose={() => setMappingModalState((prev) => ({ ...prev, isOpen: false }))}
          targetTabId={mappingModalState.fileType || mappingModalState.tabId}
          file={mappingModalState.rawFile || mappingModalState.file}
          tabTitle={mappingModalState.inspectData?.tabTitle || currentTabDef.title}
          matrixPreview={
            mappingModalState.inspectData?.rawMatrix || mappingModalState.matrixPreview || []
          }
          rawMatrix={mappingModalState.inspectData?.rawMatrix || mappingModalState.rawMatrix || []}
          detectedHeaderRow={
            mappingModalState.inspectData?.detectedHeaderRow ??
            mappingModalState.initialHeaderRow ??
            0
          }
          initialHeaderRow={
            mappingModalState.inspectData?.detectedHeaderRow ??
            mappingModalState.initialHeaderRow ??
            0
          }
          detectedDataStartRow={
            mappingModalState.inspectData?.detectedDataStartRow ??
            mappingModalState.initialDataStartRow ??
            1
          }
          initialDataStartRow={
            mappingModalState.inspectData?.detectedDataStartRow ??
            mappingModalState.initialDataStartRow ??
            1
          }
          availableSchema={
            mappingModalState.inspectData?.availableSchema ||
            mappingModalState.availableSchema ||
            currentTabDef?.columnsSchema ||
            []
          }
          initialMapping={mappingModalState.initialMapping || {}}
          onConfirm={handleConfirmMapping}
        />
      )}
    </>
  )
}
