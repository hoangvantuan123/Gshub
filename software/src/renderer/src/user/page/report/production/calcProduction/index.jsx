import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
import CalculationProgressOverlay from './components/CalculationProgressOverlay'
import ExcelMappingModal from './components/ExcelMappingModal'
import PlanRegistrationPushModal from './components/PlanRegistrationPushModal'
import { usePageHotkeys } from '@renderer/user/hooks/usePageHotkeys'
import { Send } from 'lucide-react'

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
    calculationProgress,
    mappingModalState,
    setMappingModalState,
    openMappingModalForCurrentTab,
    handleConfirmMapping,
    handleUploadFileForTab,
    handleDeleteTabFile,
    handleDeleteSelectedRows,
    handleRunCalculation,
    handleRegisterMaster,
    handlePublishReport,
    handleUnlockForEdit,
    handleExportBundle,
    isPublishing,
    setIsPublishing,
    publishProgress,
    isExporting,
    isPushingRegistration,
    pushRegistrationProgress,
    handleRegisterReportsToSystem,
    closePushRegistrationModal,
    clearAllFiles,
    refreshFiles,
    setCalcResults
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

  // ── Grid State & Fast Search ──
  const [gridData, setGridData] = useState(() => currentData || [])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dynamicFilterFields, setDynamicFilterFields] = useState([])
  const [filterValues, setFilterValues] = useState({})
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  const handleAddQueryField = useCallback(
    (columnKey, colTitle) => {
      if (!columnKey) return
      const title = colTitle || columnKey

      setDynamicFilterFields((prev) => {
        if (prev.some((f) => f.key === columnKey)) return prev
        return [...prev, { key: columnKey, label: title, type: 'text' }]
      })

      setStatusMessage?.({
        type: 'info',
        text: `Đã thêm bộ lọc tìm kiếm cho cột "${title}". Bạn có thể nhập giá trị để tìm kiếm ngay.`
      })

      setTimeout(() => {
        const input =
          document.getElementById(`query-input-${columnKey}`) ||
          document.querySelector(`[data-query-key="${String(columnKey).toLowerCase()}"]`)
        if (input) {
          input.focus()
          input.select?.()
        }
      }, 50)
    },
    [setStatusMessage]
  )

  const handleDynamicFilterChange = useCallback((fieldKey, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [fieldKey]: value
    }))
  }, [])

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
    setSearchText('')
    setStatusFilter('ALL')
    setFilterValues({})
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

  // Lọc dữ liệu thời gian thực theo từ khóa tìm kiếm & trạng thái (Hỗ trợ tìm nhiều mã / nhiều bản ghi cùng lúc)
  const filteredGridData = useMemo(() => {
    let result = gridData || []

    if (statusFilter && statusFilter !== 'ALL') {
      result = result.filter((row) => {
        if (!row) return false
        const st = String(
          row.StatusDpSx ??
            row.CoordinatorStatus ??
            row['Trạng thái ĐP - SX'] ??
            row.CheckKhsx ??
            row['CHECK KHSX'] ??
            row.OpInfoStatus ??
            row['Trạng thái LTT'] ??
            row['Trạng thái thông tin lệnh'] ??
            ''
        )
        return st === statusFilter
      })
    }

    // 1. Lọc theo ô tìm kiếm chung SearchText (Phân tách nhiều bản ghi bằng dấu phẩy, chấm phẩy, xuống dòng, tab, pipe)
    if (searchText && searchText.trim()) {
      const tokens = String(searchText)
        .split(/[,;\n\r\t|]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      if (tokens.length > 0) {
        result = result.filter((row) => {
          if (!row) return false
          return Object.values(row).some((val) => {
            if (val === undefined || val === null) return false
            const strVal = String(val).toLowerCase()
            return tokens.some((token) => strVal.includes(token))
          })
        })
      }
    }

    // 2. Lọc theo các trường tìm kiếm động sinh ra từ Ctrl + F (Phân tách nhiều mã bằng dấu phẩy, chấm phẩy, xuống dòng, tab, pipe)
    const activeFilters = Object.entries(filterValues).filter(
      ([, val]) => val !== undefined && val !== null && String(val).trim() !== ''
    )

    if (activeFilters.length > 0) {
      result = result.filter((row) => {
        if (!row) return false
        return activeFilters.every(([key, filterVal]) => {
          const tokens = String(filterVal)
            .split(/[,;\n\r\t|]+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)

          if (tokens.length === 0) return true

          const rowVal =
            row[key] !== undefined
              ? row[key]
              : row[key.toLowerCase()] !== undefined
              ? row[key.toLowerCase()]
              : Object.entries(row).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]

          if (rowVal === null || rowVal === undefined) return false
          const rowValStr = String(rowVal).toLowerCase()
          return tokens.some((token) => rowValStr.includes(token))
        })
      })
    }

    return result
  }, [gridData, searchText, statusFilter, filterValues])

  // Xử lý chỉnh sửa trực tiếp ô trên bảng tính (hỗ trợ nhập tay PIC ĐP, họ tên, hoặc trạng thái)
  const handleCellEdited = useCallback(
    (cell, newValue) => {
      const [col, row] = cell
      const targetRowData = filteredGridData[row]
      if (!targetRowData) return

      const targetCol = cols[col]
      if (!targetCol || targetCol.readonly) return

      const colKey = targetCol.id || targetCol.key
      const colTitle = targetCol.title
      const val = newValue.kind === GridCellKind.Number ? newValue.data : (newValue.data ?? '')

      setGridData((prevGrid) => {
        const nextGrid = [...prevGrid]
        const targetIndex = nextGrid.findIndex(
          (r) =>
            r === targetRowData ||
            (r.OperationOrderNo && r.OperationOrderNo === targetRowData.OperationOrderNo) ||
            (r['Số lệnh thao tác'] && r['Số lệnh thao tác'] === targetRowData['Số lệnh thao tác'])
        )
        const editIdx = targetIndex >= 0 ? targetIndex : row
        if (!nextGrid[editIdx]) return prevGrid

        const updatedRow = { ...nextGrid[editIdx] }
        updatedRow[colKey] = val
        if (colTitle && colTitle !== colKey) {
          updatedRow[colTitle] = val
        }

        // Tự động cập nhật Trạng thái LTT khi sửa PIC ĐP / Họ tên
        if (colKey === 'PicCoordinator' || colKey === 'PIC ĐP') {
          const hasVal = Boolean(val && String(val).trim())
          const newStatus = hasVal ? 'Đã bổ sung' : 'Thiếu họ tên LTT'
          updatedRow['OpInfoStatus'] = newStatus
          updatedRow['Trạng thái LTT'] = newStatus
          updatedRow['Trạng thái thông tin lệnh'] = newStatus
        }

        nextGrid[editIdx] = updatedRow
        return nextGrid
      })

      // Đồng bộ trực tiếp vào calcResults nếu đang đứng tại Tab Kết quả KHSX
      if (activeTab === 'result_khsx' && setCalcResults) {
        setCalcResults((prev) => {
          if (!prev?.plan?.calculatedRows) return prev
          const calcRows = [...prev.plan.calculatedRows]
          const targetIndex = calcRows.findIndex(
            (r) =>
              r === targetRowData ||
              (r.OperationOrderNo && r.OperationOrderNo === targetRowData.OperationOrderNo) ||
              (r['Số lệnh thao tác'] && r['Số lệnh thao tác'] === targetRowData['Số lệnh thao tác'])
          )
          if (targetIndex >= 0) {
            const updatedRow = { ...calcRows[targetIndex] }
            updatedRow[colKey] = val
            if (colTitle && colTitle !== colKey) updatedRow[colTitle] = val
            if (colKey === 'PicCoordinator' || colKey === 'PIC ĐP') {
              const hasVal = Boolean(val && String(val).trim())
              const newStatus = hasVal ? 'Đã bổ sung' : 'Thiếu họ tên LTT'
              updatedRow['OpInfoStatus'] = newStatus
              updatedRow['Trạng thái LTT'] = newStatus
              updatedRow['Trạng thái thông tin lệnh'] = newStatus
            }
            calcRows[targetIndex] = updatedRow
            return {
              ...prev,
              plan: {
                ...prev.plan,
                calculatedRows: calcRows
              }
            }
          }
          return prev
        })
      }
    },
    [filteredGridData, cols, activeTab, setCalcResults]
  )

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
      const tabKey =
        activeTab === 'result_tksx'
          ? 'TKSX_KetQua_98Cot'
          : activeTab === 'result_khsx'
            ? 'KHSX_KetQua_DoiSoat'
            : currentTabDef.id
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

  const selectedRowsIndices = useMemo(() => {
    const indices = []
    if (selection?.rows) {
      selection.rows.toArray().forEach((idx) => {
        if (!indices.includes(idx)) indices.push(idx)
      })
    }
    if (selection?.current?.range) {
      const { y, height } = selection.current.range
      for (let i = y; i < y + height; i++) {
        if (!indices.includes(i)) indices.push(i)
      }
    }
    if (selection?.current?.cell && indices.length === 0) {
      indices.push(selection.current.cell[1])
    }
    return indices
  }, [selection])

  const handleDeleteRows = useCallback(() => {
    handleDeleteSelectedRows(selectedRowsIndices)
  }, [handleDeleteSelectedRows, selectedRowsIndices])

  usePageHotkeys({
    onDelete: handleDeleteRows,
    onSave: handleRegisterMaster,
    onSearch: () => setShowSearch(true)
  })

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
            isPublishing={isPublishing}
            isPublished={Boolean(masterInfo.isPublished || masterInfo.status === 'PUBLISHED')}
            isExporting={isExporting}
            masterInfo={masterInfo}
            storageMode={storageMode}
            fileStatusSummary={fileStatusSummary}
            selectedRowsCount={selectedRowsIndices.length}
            onUploadFile={handleUploadFileForTab}
            onOpenCustomMapping={openMappingModalForCurrentTab}
            onDeleteSelectedRows={handleDeleteRows}
            onDeleteTabFile={handleDeleteTabFile}
            onClearAll={clearAllFiles}
            onRunCalculation={handleRunCalculation}
            onRegisterMaster={handleRegisterMaster}
            onPublishReport={handlePublishReport}
            onUnlockForEdit={handleUnlockForEdit}
            onPushRegistration={handleRegisterReportsToSystem}
            isPushingRegistration={isPushingRegistration}
            onExportBundle={handleExportBundle}
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
            searchText={searchText}
            setSearchText={setSearchText}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dynamicFilterFields={dynamicFilterFields}
            filterValues={filterValues}
            onDynamicFilterChange={handleDynamicFilterChange}
            totalRowsCount={gridData.length}
            filteredRowsCount={filteredGridData.length}
          />
        }
        queryTitle={t('ĐĂNG KÝ MASTER & BỘ LỌC DỮ LIỆU KHSX - TKSX')}
        defaultOpenQuery={true}
        table={
          <CalcDataGridTable
            tableTitle={`${currentTabDef.title} (${filteredGridData.length.toLocaleString('vi-VN')}/${(gridData.length || 0).toLocaleString('vi-VN')} dòng)`}
            cols={cols}
            setCols={setCols}
            defaultCols={defaultCols}
            gridData={filteredGridData}
            setGridData={setGridData}
            numRows={filteredGridData.length}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            onAddQueryField={handleAddQueryField}
            onCellEdited={handleCellEdited}
            canEdit={true}
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

      {/* Modal Tiến trình Tính Toán KHSX & TKSX từ CSDL */}
      <CalculationProgressOverlay
        isCalculating={isCalculating}
        progressInfo={calculationProgress}
        title={t('TIẾN TRÌNH TÍNH TOÁN KHSX & TKSX')}
        subMessage={t(
          'Thao tác chuột và bàn phím đang được tạm khóa để đảm bảo tính toán đồng bộ và toàn vẹn dữ liệu. Vui lòng không tắt trang.'
        )}
        onClose={() => setIsCalculating(false)}
      />

      {/* Modal Tiến trình Công Bố Báo Cáo */}
      <CalculationProgressOverlay
        isCalculating={isPublishing}
        progressInfo={publishProgress}
        title={t('TIẾN TRÌNH CÔNG BỐ BÁO CÁO')}
        icon={Send}
        steps={[
          t('1. Chuẩn bị dữ liệu'),
          t('2. Tổng hợp kết quả'),
          t('3. Lưu trữ hệ thống'),
          t('4. Hoàn tất công bố')
        ]}
        subMessage={t(
          'Thao tác chuột và bàn phím đang được tạm khóa để bảo đảm dữ liệu công bố chính xác và an toàn.'
        )}
        onClose={() => setIsPublishing(false)}
      />

      {/* Modal Theo Dõi Tiến Trình Đăng Ký 2 Báo Cáo KHSX & TKSX Lên Hệ Thống */}
      <PlanRegistrationPushModal
        isOpen={pushRegistrationProgress.isOpen}
        progressInfo={pushRegistrationProgress}
        onClose={closePushRegistrationModal}
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
