/* eslint-disable react/prop-types */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
import {
  TAB_DEFINITIONS,
  STAT_REPORT_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA
} from '../../calcProduction/constants/calcConstants'
import {
  getGridColumnsForTab,
  RESULT_CALC_COLUMNS_SCHEMA
} from '../../calcProduction/columns/calcGridColumns'
import { runProductionCalculations } from '../../calcProduction/engine'
import CalcDataGridTable from '../../calcProduction/components/CalcDataGridTable'
import CalcProductionActions from '../../calcProduction/components/CalcProductionActions'
import CalcProductionQuery from '../../calcProduction/components/CalcProductionQuery'
import CalculationProgressOverlay from '../../calcProduction/components/CalculationProgressOverlay'
import storageAdapter from '../storageAdapterProxy'

export default function CalcProductionDetailView() {
  const { t } = useTranslation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setStatusMessage, setPageData, setSelectionStats } = usePageData() || {}
  const loadingBarRef = useRef(null)

  // Lấy mã đăng ký từ params (:seq, :regCode) hoặc query (?regCode=)
  const targetRegCode = params?.seq || params?.regCode || searchParams.get('regCode') || ''

  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id)
  const [masterRecord, setMasterRecord] = useState(null)
  const [filesDataMap, setFilesDataMap] = useState({})
  const [fileSummaries, setFileSummaries] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // ── Grid State ──
  const [gridData, setGridData] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  const currentTabDef = useMemo(() => {
    return TAB_DEFINITIONS.find((t) => t.id === activeTab) || TAB_DEFINITIONS[0]
  }, [activeTab])

  const [calcResults, setCalcResults] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Nạp dữ liệu chi tiết của phiếu Master từ CSDL
  const fetchDetailData = useCallback(async () => {
    if (!targetRegCode) {
      setIsLoading(false)
      setStatusMessage?.({
        type: 'warning',
        text: 'Không tìm thấy mã đăng ký để truy vấn chi tiết'
      })
      return
    }

    setIsLoading(true)
    setStatusMessage?.({
      type: 'info',
      text: `Đang nạp chi tiết dữ liệu cho phiếu [${targetRegCode}]...`
    })

    try {
      // 1. Lấy thông tin Master
      let master = await storageAdapter.getMasterRegistration(targetRegCode)
      if (!master) {
        const local = localStorage.getItem(`S_MASTER_REG_${targetRegCode}`)
        if (local) {
          master = JSON.parse(local)
        }
      }

      setMasterRecord(master || { regCode: targetRegCode })
      if (master?.fileSummaries) {
        setFileSummaries(master.fileSummaries)
      }

      // 2. Lấy toàn bộ file kiến trúc chi tiết
      const allFiles = await storageAdapter.getAllFiles()
      setFilesDataMap(allFiles || {})

      // 3. Lấy kết quả tính toán nếu có
      const results = await storageAdapter.getCalcResults(targetRegCode)
      if (results) {
        setCalcResults(results)
      }

      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp thành công dữ liệu phiếu [${targetRegCode}]`
      })
    } catch (err) {
      console.error('Lỗi khi nạp chi tiết:', err)
      setStatusMessage?.({ type: 'error', text: `Lỗi nạp dữ liệu: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }, [targetRegCode, setStatusMessage])

  useEffect(() => {
    fetchDetailData()
  }, [fetchDetailData])

  // Trạng thái tóm tắt các file
  const fileStatusSummary = useMemo(() => {
    const summary = {}
    TAB_DEFINITIONS.forEach((tab) => {
      if (tab.id === 'result_tksx') {
        const rows = calcResults?.stat?.calculatedRows || []
        summary[tab.id] = {
          isUploaded: rows.length > 0,
          fileName: 'TKSX_KetQua_98Cot.xlsx',
          rowCount: rows.length,
          uploadedAt: calcResults?.calculatedAt || null,
          isResult: true
        }
      } else if (tab.id === 'result_khsx') {
        const rows = calcResults?.plan?.calculatedRows || []
        summary[tab.id] = {
          isUploaded: rows.length > 0,
          fileName: 'KHSX_KetQua_DoiSoat.xlsx',
          rowCount: rows.length,
          uploadedAt: calcResults?.calculatedAt || null,
          isResult: true
        }
      } else {
        const fileObj = filesDataMap[tab.id] || fileSummaries[tab.id]
        const count = fileObj?.rowCount || fileObj?.data?.length || 0
        summary[tab.id] = {
          isUploaded: Boolean(count > 0),
          fileName: fileObj?.fileName || '',
          rowCount: count,
          uploadedAt: fileObj?.uploadedAt || null
        }
      }
    })
    return summary
  }, [filesDataMap, fileSummaries, calcResults])

  const activeTabFileData = useMemo(() => {
    if (activeTab === 'result_tksx') {
      const rows = calcResults?.stat?.calculatedRows || []
      const statCols =
        calcResults?.stat?.columns ||
        filesDataMap['stat_report']?.columns ||
        fileSummaries['stat_report']?.columns ||
        []

      let mergedColumns = []
      if (statCols && statCols.length > 0) {
        const existingKeys = new Set(statCols.map((c) => c.key || c.id || c.title))
        mergedColumns = [...statCols]
        RESULT_CALC_COLUMNS_SCHEMA.forEach((cc) => {
          if (!existingKeys.has(cc.key) && !existingKeys.has(cc.title)) {
            mergedColumns.push(cc)
          }
        })
      } else {
        mergedColumns = [...STAT_REPORT_COLUMN_SCHEMA, ...RESULT_CALC_COLUMNS_SCHEMA]
      }

      return {
        columns: mergedColumns,
        data: rows,
        rowCount: rows.length,
        fileName: 'TKSX_KetQua_98Cot.xlsx',
        uploadedAt: calcResults?.calculatedAt || new Date().toISOString(),
        isResult: true
      }
    }

    if (activeTab === 'result_khsx') {
      const rows = calcResults?.plan?.calculatedRows || []
      return {
        columns: RESULT_KHSX_COLUMN_SCHEMA,
        data: rows,
        rowCount: rows.length,
        fileName: 'KHSX_KetQua_DoiSoat.xlsx',
        uploadedAt: calcResults?.calculatedAt || new Date().toISOString(),
        isResult: true
      }
    }

    return filesDataMap[activeTab] || null
  }, [filesDataMap, fileSummaries, activeTab, calcResults])

  const currentFileData = activeTabFileData
  const currentColumns = currentFileData?.columns || []
  const currentData = currentFileData?.data || []

  // Cột động cho Grid theo từng Tab
  const defaultCols = useMemo(() => {
    return getGridColumnsForTab(activeTab, currentColumns)
  }, [activeTab, currentColumns])

  const [cols, setCols] = useState(defaultCols)

  // Cập nhật bảng khi đổi Tab hoặc khi dữ liệu nạp xong
  const lastSyncRef = useRef('')
  useEffect(() => {
    const rows = currentData || []
    const newCols = getGridColumnsForTab(activeTab, currentColumns)

    const syncKey = `${activeTab}_${rows.length}_${newCols.length}`
    if (lastSyncRef.current === syncKey) return
    lastSyncRef.current = syncKey

    setGridData(rows)
    setCols(newCols)
    setSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty()
    })

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
  }, [activeTab, currentData, currentColumns, setPageData])

  // Thống kê vùng bôi đen ô
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

  const uploadedCount = useMemo(() => {
    return Object.values(fileStatusSummary).filter((s) => s.isUploaded).length
  }, [fileStatusSummary])

  const [calculationProgress, setCalculationProgress] = useState({
    percent: 0,
    step: 'INIT',
    message: '',
    detail: '',
    storageMode: 'CSDL SQLite / IndexedDB'
  })

  // Chạy tính toán KHSX & TKSX trực tiếp từ dữ liệu các bảng đang xem
  const handleRunCalculation = useCallback(async () => {
    const uploaded = Object.values(fileStatusSummary || {}).filter((s) => s.isUploaded).length
    if (uploaded === 0 && (!activeTabFileData || activeTabFileData.rowCount === 0)) {
      setStatusMessage?.({ type: 'error', text: 'Chưa có đủ dữ liệu để thực hiện tính toán' })
      return
    }

    setIsCalculating(true)
    setCalculationProgress({
      percent: 15,
      step: 'READ_DB',
      message: 'Đang nạp 4 bảng dữ liệu kiến trúc từ CSDL...',
      detail: `Đọc dữ liệu cho phiếu [${targetRegCode || 'Master'}]`,
      storageMode: 'CSDL Lưu Trữ'
    })
    setStatusMessage?.({ type: 'info', text: 'Đang thực hiện tính toán KHSX và TKSX...' })

    try {
      // 1. Lấy toàn bộ file kiến trúc
      let allFiles = filesDataMap
      if (!allFiles || Object.keys(allFiles).length === 0) {
        allFiles = await storageAdapter.getAllFiles()
      }

      setCalculationProgress({
        percent: 45,
        step: 'CALC_TKSX',
        message: 'Đang liên kết & tính toán ma trận TKSX (98 cột)...',
        detail: 'Ghép Thống kê, Dở dang, Tổng hợp và MES',
        storageMode: 'CSDL Lưu Trữ'
      })

      const results = await runProductionCalculations(allFiles)

      setCalculationProgress({
        percent: 80,
        step: 'CALC_KHSX',
        message: 'Đang đối soát & tính toán Kế hoạch KHSX (18 chỉ tiêu)...',
        detail: 'Tính số lượng hoàn thành, tỷ lệ đạt và chênh lệch giờ chạy',
        storageMode: 'CSDL Lưu Trữ'
      })

      setCalcResults(results)

      // 2. Lưu kết quả tính toán vào storage nếu có targetRegCode
      if (targetRegCode && results) {
        setCalculationProgress({
          percent: 95,
          step: 'SAVE_RESULTS',
          message: 'Đang cập nhật kết quả tính toán vào CSDL...',
          detail: `Ghi dữ liệu kết quả cho phiếu [${targetRegCode}]`,
          storageMode: 'CSDL Lưu Trữ'
        })
        try {
          await storageAdapter.saveCalcResults(targetRegCode, results)
        } catch (e) {
          console.warn('Lưu kết quả tính toán:', e)
        }
      }

      setCalculationProgress({
        percent: 100,
        step: 'COMPLETED',
        message: 'Đã hoàn tất tính toán thành công!',
        detail: `Xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng TKSX và ${(results?.plan?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng KHSX`,
        storageMode: 'CSDL Lưu Trữ'
      })

      await new Promise((resolve) => setTimeout(resolve, 350))

      // Tự động chuyển ngay sang Tab Kết Quả TKSX
      setActiveTab('result_tksx')
      setStatusMessage?.({
        type: 'success',
        text: `Đã hoàn thành tính toán! Đã xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng kết quả TKSX.`
      })
    } catch (err) {
      console.error('Lỗi tính toán:', err)
      setStatusMessage?.({ type: 'error', text: `Tính toán thất bại: ${err.message}` })
    } finally {
      setIsCalculating(false)
    }
  }, [filesDataMap, fileStatusSummary, activeTabFileData, targetRegCode, setStatusMessage])

  // Xuất file Excel tab hiện tại với cấu trúc 2 tầng tiêu đề (Group Header)
  const handleExportTabExcel = useCallback(() => {
    if (gridData.length === 0) {
      setStatusMessage?.({ type: 'warning', text: 'Không có dữ liệu trong tab này để xuất Excel' })
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
      XLSX.utils.book_append_sheet(wb, ws, currentTabDef.shortTitle || currentTabDef.id)

      const safeCode = targetRegCode || 'EXPORT'
      const tabKey =
        activeTab === 'result_tksx'
          ? 'TKSX_KetQua_98Cot'
          : activeTab === 'result_khsx'
            ? 'KHSX_KetQua_DoiSoat'
            : currentTabDef.id
      const fileName = `${tabKey}_${safeCode}_${new Date().getTime()}.xlsx`

      XLSX.writeFile(wb, fileName)
      setStatusMessage?.({ type: 'success', text: `Đã xuất thành công: ${fileName}` })
    } catch (err) {
      setStatusMessage?.({ type: 'error', text: `Lỗi xuất Excel: ${err.message}` })
    }
  }, [gridData, cols, targetRegCode, currentTabDef, activeTab, setStatusMessage])

  // Xuất toàn bộ các tab ra 1 file Excel đa Sheet
  const handleExportAllTabsExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new()
      let hasData = false

      TAB_DEFINITIONS.forEach((tab) => {
        let rows = []
        if (tab.id === 'result_tksx') {
          rows = calcResults?.stat?.calculatedRows || []
        } else if (tab.id === 'result_khsx') {
          rows = calcResults?.plan?.calculatedRows || []
        } else {
          const fileObj = filesDataMap[tab.id]
          rows = fileObj?.data || []
        }

        if (rows.length > 0) {
          hasData = true
          const tabCols = getGridColumnsForTab(tab.id, filesDataMap[tab.id]?.columns || [])
          const hasGroup = tabCols.some((c) => Boolean(c.group))
          const matrix = []
          if (hasGroup) {
            matrix.push(tabCols.map((c) => c.group || ''))
            matrix.push(tabCols.map((c) => c.title || c.id))
          } else {
            matrix.push(tabCols.map((c) => c.title || c.id))
          }

          rows.forEach((row) => {
            const rowArr = tabCols.map((col) => {
              const val = row[col.id] !== undefined ? row[col.id] : row[col.title]
              return val !== undefined && val !== null ? val : ''
            })
            matrix.push(rowArr)
          })

          const ws = XLSX.utils.aoa_to_sheet(matrix)
          XLSX.utils.book_append_sheet(wb, ws, (tab.shortTitle || tab.title).slice(0, 31))
        }
      })

      if (!hasData) {
        setStatusMessage?.({ type: 'warning', text: 'Chưa có dữ liệu ở bất kỳ tab nào để xuất' })
        return
      }

      const fileName = `ChiTiet_ToanBoBang_${targetRegCode}_${new Date().getTime()}.xlsx`
      XLSX.writeFile(wb, fileName)
      setStatusMessage?.({ type: 'success', text: `Đã xuất toàn bộ các bảng: ${fileName}` })
    } catch (err) {
      setStatusMessage?.({ type: 'error', text: `Lỗi xuất Excel: ${err.message}` })
    }
  }, [filesDataMap, calcResults, targetRegCode, setStatusMessage])

  const masterInfo = useMemo(() => {
    return {
      regCode: masterRecord?.regCode || targetRegCode,
      factoryName: masterRecord?.factoryName || 'GS1 Hà Nội',
      applyDate: masterRecord?.applyDate || '',
      remark: masterRecord?.remark || ''
    }
  }, [masterRecord, targetRegCode])

  const handleBackOrClose = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/sub/') ||
        window.location.hash.includes('/sub/') ||
        window.history.length <= 1)
    ) {
      if (window.electron?.close) {
        window.electron.close()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:close')
      } else {
        window.close()
      }
    } else {
      navigate(-1)
    }
  }, [navigate])

  return (
    <>
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <CalcProductionActions
          isDetailView={true}
          onBack={handleBackOrClose}
          activeTabDef={currentTabDef}
          activeFileData={activeTabFileData}
          isCalculating={isCalculating}
          fileStatusSummary={fileStatusSummary}
          masterRecord={masterRecord}
          onRunCalculation={handleRunCalculation}
          onOpenSearch={() => setShowSearch(true)}
        />
      }
      query={
        <CalcProductionQuery
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          masterInfo={masterInfo}
          onChangeMasterInfo={() => {}}
          fileStatusSummary={fileStatusSummary}
          calcResults={calcResults}
          disabled={true}
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
    <CalculationProgressOverlay
      isCalculating={isCalculating}
      progressInfo={calculationProgress}
      title={t('TIẾN TRÌNH TÍNH TOÁN KHSX & TKSX')}
      subMessage={t(
        'Hệ thống đang truy vấn CSDL và tính toán đối soát dữ liệu. Vui lòng không đóng trang.'
      )}
    />
    </>
  )
}
