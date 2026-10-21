/* eslint-disable react/prop-types, no-unused-vars */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { CompactSelection, GridCellKind } from '@glideapps/glide-data-grid'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
import { useCalcProductionLogic } from './hooks/useCalcProductionLogic'
import {
  TAB_DEFINITIONS,
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA
} from './constants/calcConstants'
import { getGridColumnsForTab, RESULT_CALC_COLUMNS_SCHEMA } from './columns/calcGridColumns'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import CalcDataGridTable from './components/CalcDataGridTable'
import CalcProductionActions from './components/CalcProductionActions'
import CalcProductionQuery from './components/CalcProductionQuery'
import ImportLoadingOverlay from './components/ImportLoadingOverlay'
import CalculationProgressOverlay from './components/CalculationProgressOverlay'
import ExcelMappingModal from './components/ExcelMappingModal'
import PlanRegistrationPushModal from './components/PlanRegistrationPushModal'
import PlanRegistrationSelectModal from './components/PlanRegistrationSelectModal'
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
    filesDataMap,
    isParsing,
    isCalculating,
    setIsCalculating,
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
    isSelectRegistrationOpen,
    registrationSelectInfo,
    closeSelectRegistrationModal,
    handleConfirmPushRegistration,
    closePushRegistrationModal,
    clearAllFiles,
    refreshFiles,
    setCalcResults,
    isDirty,
    setIsDirty
  } = useCalcProductionLogic({
    setStatusMessage
  })

  // Đăng ký kiểm tra dữ liệu chưa lưu - Chặn rời trang / chuyển menu khi chưa bấm ĐĂNG KÝ BÁO CÁO
  useEffect(() => {
    if (!registerDirtyChecker) return
    return registerDirtyChecker(() => {
      return Boolean(isDirty)
    })
  }, [registerDirtyChecker, isDirty])

  const currentTabDef = useMemo(() => {
    return TAB_DEFINITIONS.find((t) => t.id === activeTab) || TAB_DEFINITIONS[0]
  }, [activeTab])

  const currentUploadedAt = activeTabFileData?.uploadedAt
  const currentColumns = activeTabFileData?.columns
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  // Mảng dữ liệu nguồn độc lập của từng Tab (Tab nào có file thì lấy file đó, chưa có file thì dứt khoát là mảng rỗng [])
  const currentTabRows = useMemo(() => {
    if (activeTab === 'machine_comparison') return activeTabFileData?.data || []
    if (activeTab === 'result_tksx') {
      return calcResults?.stat?.calculatedRows || []
    }
    if (activeTab === 'result_khsx') {
      return calcResults?.plan?.calculatedRows || []
    }
    const sum = fileSummaries[activeTab]
    if (!sum || !sum.rowCount || sum.rowCount <= 0) {
      return []
    }
    const curFileData = filesDataMap[activeTab]
    if (curFileData && Array.isArray(curFileData.data) && curFileData.data.length > 0) {
      return curFileData.data
    }
    return []
  }, [activeTab, calcResults, fileSummaries, filesDataMap, activeTabFileData])

  // Lưu trữ riêng biệt mảng dữ liệu của từng tab, triệt tiêu 100% việc dùng chung giữa các tab
  const [tabDataMap, setTabDataMap] = useState({})

  useEffect(() => {
    setTabDataMap((previous) => {
      const next = { ...previous }
      delete next.result_tksx
      delete next.result_khsx
      delete next.machine_comparison
      return next
    })
  }, [calcResults?.calculatedAt])

  const gridData = useMemo(() => {
    if (activeTab === 'machine_comparison') return currentTabRows
    if (tabDataMap[activeTab] !== undefined) {
      return tabDataMap[activeTab]
    }
    return currentTabRows
  }, [tabDataMap, activeTab, currentTabRows])

  const setGridData = useCallback((updater) => {
    setTabDataMap((prev) => {
      const cur = prev[activeTabRef.current] !== undefined ? prev[activeTabRef.current] : []
      const nextVal = typeof updater === 'function' ? updater(cur) : updater
      return {
        ...prev,
        [activeTabRef.current]: Array.isArray(nextVal) ? nextVal : []
      }
    })
  }, [])

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

  // Cột động cho Grid theo từng Tab riêng biệt
  const defaultCols = useMemo(() => {
    if (activeTab === 'machine_comparison') return getGridColumnsForTab(activeTab)
    if (activeTab === 'result_tksx') {
      const statCols = calcResults?.stat?.columns || fileSummaries['stat_report']?.columns || []
      let merged = []
      if (statCols && statCols.length > 0) {
        const existingKeys = new Set(statCols.map((c) => c.key || c.id || c.title))
        merged = [...statCols]
        RESULT_CALC_COLUMNS_SCHEMA.forEach((cc) => {
          if (!existingKeys.has(cc.key) && !existingKeys.has(cc.title)) {
            merged.push(cc)
          }
        })
      } else {
        merged = [...STAT_REPORT_COLUMN_SCHEMA, ...RESULT_CALC_COLUMNS_SCHEMA]
      }
      return getGridColumnsForTab('result_tksx', merged)
    }

    if (activeTab === 'result_khsx') {
      return getGridColumnsForTab('result_khsx', RESULT_KHSX_COLUMN_SCHEMA)
    }

    if (activeTab === 'stat_report') {
      return getGridColumnsForTab(
        'stat_report',
        filesDataMap['stat_report']?.columns?.length > 0
          ? filesDataMap['stat_report'].columns
          : STAT_REPORT_COLUMN_SCHEMA
      )
    }

    if (activeTab === 'unfinished_op') {
      return getGridColumnsForTab(
        'unfinished_op',
        filesDataMap['unfinished_op']?.columns?.length > 0
          ? filesDataMap['unfinished_op'].columns
          : UNFINISHED_OP_COLUMN_SCHEMA
      )
    }

    if (activeTab === 'summary_op') {
      return getGridColumnsForTab(
        'summary_op',
        filesDataMap['summary_op']?.columns?.length > 0
          ? filesDataMap['summary_op'].columns
          : SUMMARY_OP_COLUMN_SCHEMA
      )
    }

    if (activeTab === 'mes_approval') {
      return getGridColumnsForTab(
        'mes_approval',
        filesDataMap['mes_approval']?.columns?.length > 0
          ? filesDataMap['mes_approval'].columns
          : MES_APPROVAL_COLUMN_SCHEMA
      )
    }

    return getGridColumnsForTab(activeTab, [])
  }, [activeTab, filesDataMap, fileSummaries, calcResults])

  const [tabColsMap, setTabColsMap] = useState({})
  const cols = useMemo(() => {
    const columns = tabColsMap[activeTab] || defaultCols
    return activeTab === 'machine_comparison'
      ? columns.filter((col) => !['KhsxStatus', 'ProducedQty', 'QualifiedQty'].includes(col.id || col.key))
      : columns
  }, [tabColsMap, activeTab, defaultCols])

  const setCols = useCallback((updater) => {
    setTabColsMap((prev) => {
      const cur = prev[activeTabRef.current] || []
      const nextVal = typeof updater === 'function' ? updater(cur) : updater
      return {
        ...prev,
        [activeTabRef.current]: Array.isArray(nextVal) ? nextVal : []
      }
    })
  }, [])

  // Cập nhật Status bar chân trang khi đổi tab hoặc dữ liệu tab thay đổi
  useEffect(() => {
    const rows = gridData || []
    setSearchText('')
    setStatusFilter('ALL')
    setFilterValues({})
    setSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty()
    })

    setPageData?.((prev) => ({
      ...prev,
      total: rows.length,
      totalAll: rows.length,
      loadedCount: rows.length,
      totalColumns: cols.length,
      page: 1,
      pageSize: rows.length || 50,
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
    gridData.length,
    cols.length,
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
        if (activeTab === 'machine_comparison') {
          return row.MachineComparisonStatus === statusFilter || row.MesComparisonStatus === statusFilter
        }
        if (
          ['Thiếu họ tên LTT', 'Chưa có TT lệnh', 'Thiếu TT lệnh'].includes(statusFilter)
        ) {
          const lttStatus = String(
            row.OpInfoStatus ?? row['Trạng thái LTT'] ?? row['Trạng thái thông tin lệnh'] ?? ''
          )
          return lttStatus === statusFilter || lttStatus.startsWith(`${statusFilter}:`)
        }
        const st = String(
          row.MachineComparisonStatus ??
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
  }, [gridData, searchText, statusFilter, filterValues, activeTab])

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
      setIsDirty?.(true)

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
    if (activeTab === 'machine_comparison') return
    handleDeleteSelectedRows(selectedRowsIndices)
  }, [activeTab, handleDeleteSelectedRows, selectedRowsIndices])

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
            isDirty={isDirty}
            isPublishing={isPublishing}
            isPublished={Boolean(masterInfo.isPublished || masterInfo.status === 'PUBLISHED')}
            isExporting={isExporting}
            masterInfo={masterInfo}
            storageMode={storageMode}
            fileStatusSummary={fileStatusSummary}
            selectedRowsCount={activeTab === 'machine_comparison' ? 0 : selectedRowsIndices.length}
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
            onExportTabExcel={handleExportExcel}
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
            key={activeTab}
            tableId={`calc_production_${activeTab}`}
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
            canEdit={activeTab !== 'machine_comparison'}
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
        steps={[
          t('1. Chuẩn bị dữ liệu'),
          t('2. Tính TKSX (tab 5)'),
          t('3. Tính KHSX (tab 6)'),
          t('4. Đối chiếu máy MES (tab 7)')
        ]}
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

      {/* Modal Tùy chọn báo cáo KHSX / TKSX trước khi đẩy */}
      <PlanRegistrationSelectModal
        isOpen={isSelectRegistrationOpen}
        onClose={closeSelectRegistrationModal}
        onConfirm={handleConfirmPushRegistration}
        masterInfo={masterInfo}
        khsxRowsCount={registrationSelectInfo?.khsxRowsCount || 0}
        statRowsCount={registrationSelectInfo?.statRowsCount || 0}
        isLoading={isPushingRegistration}
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
