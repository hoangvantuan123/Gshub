/* eslint-disable react/prop-types */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { Download, Search, RotateCcw, ArrowLeft, FileSpreadsheet, CheckCircle2 } from 'lucide-react'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { Button } from '@renderer/components/ui/button'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
import { TAB_DEFINITIONS } from '../../calcProduction/constants/calcConstants'
import { getGridColumnsForTab } from '../../calcProduction/columns/calcGridColumns'
import CalcDataGridTable from '../../calcProduction/components/CalcDataGridTable'
import CalcProductionQuery from '../../calcProduction/components/CalcProductionQuery'
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

  const currentFileData = filesDataMap[activeTab] || null
  const currentColumns = currentFileData?.columns || []
  const currentData = currentFileData?.data || []

  // Cột động cho Grid theo từng Tab
  const defaultCols = useMemo(() => {
    return getGridColumnsForTab(activeTab, currentColumns)
  }, [activeTab, currentColumns])

  const [cols, setCols] = useState(defaultCols)

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
      text: `Đang nạp chi tiết 4 bảng cho phiếu [${targetRegCode}]...`
    })

    try {
      // 1. Lấy thông tin Master
      let master = await storageAdapter.getMasterRegistration(targetRegCode)
      if (!master) {
        // Fallback localStorage
        const local = localStorage.getItem(`S_MASTER_REG_${targetRegCode}`)
        if (local) {
          master = JSON.parse(local)
        }
      }

      setMasterRecord(master || { regCode: targetRegCode })
      if (master?.fileSummaries) {
        setFileSummaries(master.fileSummaries)
      }

      // 2. Lấy toàn bộ 4 file kiến trúc chi tiết
      const allFiles = await storageAdapter.getAllFiles()
      setFilesDataMap(allFiles || {})

      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp thành công dữ liệu phiếu [${targetRegCode}]`
      })
    } catch (err) {
      console.error('Lỗi khi nạp chi tiết 4 bảng:', err)
      setStatusMessage?.({ type: 'error', text: `Lỗi nạp dữ liệu: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }, [targetRegCode, setStatusMessage])

  useEffect(() => {
    fetchDetailData()
  }, [fetchDetailData])

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

  // Trạng thái tóm tắt 4 file
  const fileStatusSummary = useMemo(() => {
    const summary = {}
    TAB_DEFINITIONS.forEach((tab) => {
      const fileObj = filesDataMap[tab.id] || fileSummaries[tab.id]
      const count = fileObj?.rowCount || fileObj?.data?.length || 0
      summary[tab.id] = {
        isUploaded: Boolean(count > 0),
        fileName: fileObj?.fileName || '',
        rowCount: count,
        uploadedAt: fileObj?.uploadedAt || null
      }
    })
    return summary
  }, [filesDataMap, fileSummaries])

  const uploadedCount = useMemo(() => {
    return Object.values(fileStatusSummary).filter((s) => s.isUploaded).length
  }, [fileStatusSummary])

  // Xuất file Excel tab hiện tại
  const handleExportTabExcel = useCallback(() => {
    if (gridData.length === 0) {
      setStatusMessage?.({ type: 'warning', text: 'Không có dữ liệu trong tab này để xuất Excel' })
      return
    }

    try {
      const ws = XLSX.utils.json_to_sheet(gridData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, currentTabDef.id)
      const fileName = `${targetRegCode}_${currentTabDef.id}_${new Date().getTime()}.xlsx`
      XLSX.writeFile(wb, fileName)
      setStatusMessage?.({ type: 'success', text: `Đã xuất thành công: ${fileName}` })
    } catch (err) {
      setStatusMessage?.({ type: 'error', text: `Lỗi xuất Excel: ${err.message}` })
    }
  }, [gridData, targetRegCode, currentTabDef, setStatusMessage])

  // Xuất toàn bộ 4 tab ra 1 file Excel đa Sheet
  const handleExportAllTabsExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new()
      let hasData = false

      TAB_DEFINITIONS.forEach((tab) => {
        const fileObj = filesDataMap[tab.id]
        const rows = fileObj?.data || []
        if (rows.length > 0) {
          hasData = true
          const ws = XLSX.utils.json_to_sheet(rows)
          XLSX.utils.book_append_sheet(wb, ws, tab.title.slice(0, 31))
        }
      })

      if (!hasData) {
        setStatusMessage?.({ type: 'warning', text: 'Chưa có dữ liệu ở bất kỳ tab nào để xuất' })
        return
      }

      const fileName = `ChiTiet_4Bang_${targetRegCode}_${new Date().getTime()}.xlsx`
      XLSX.writeFile(wb, fileName)
      setStatusMessage?.({ type: 'success', text: `Đã xuất toàn bộ 4 bảng: ${fileName}` })
    } catch (err) {
      setStatusMessage?.({ type: 'error', text: `Lỗi xuất Excel 4 bảng: ${err.message}` })
    }
  }, [filesDataMap, targetRegCode, setStatusMessage])

  const masterInfo = useMemo(() => {
    return {
      regCode: masterRecord?.regCode || targetRegCode,
      factoryName: masterRecord?.factoryName || 'GS1 Hà Nội',
      applyDate: masterRecord?.applyDate || '',
      remark: masterRecord?.remark || ''
    }
  }, [masterRecord, targetRegCode])

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <div className="flex items-center justify-between w-full h-6 min-h-[24px] max-h-[24px] py-0 overflow-x-auto max-w-full select-none">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <Button
              key="Back"
              icon={<ArrowLeft size={12} className="text-slate-500" />}
              size="small"
              onClick={() => navigate(-1)}
              className="uppercase text-[10px] whitespace-nowrap font-medium"
              style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
              color="default"
              variant="link"
              title="Quay lại danh sách truy vấn"
            >
              {t('QUAY LẠI')}
            </Button>

            <Button
              key="Refresh"
              icon={<RotateCcw size={12} className="text-emerald-500" />}
              size="small"
              onClick={fetchDetailData}
              disabled={isLoading}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700"
              style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
              color="default"
              variant="link"
              title="Nạp lại dữ liệu chi tiết từ CSDL"
            >
              {t('NẠP LẠI')}
            </Button>

            <Button
              key="ExportTab"
              icon={<Download size={12} className="text-blue-600" />}
              size="small"
              onClick={handleExportTabExcel}
              disabled={gridData.length === 0}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-blue-700"
              style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
              color="default"
              variant="link"
              title="Xuất dữ liệu tab hiện tại ra Excel"
            >
              {t('XUẤT TAB NÀY')}
            </Button>

            <Button
              key="ExportAll"
              icon={<FileSpreadsheet size={12} className="text-indigo-600" />}
              size="small"
              onClick={handleExportAllTabsExcel}
              className="uppercase text-[10px] whitespace-nowrap font-semibold text-indigo-700"
              style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
              color="default"
              variant="link"
              title="Xuất toàn bộ 4 bảng ra 1 file Excel nhiều sheet"
            >
              {t('XUẤT CẢ 4 BẢNG')}
            </Button>

            <Button
              key="Search"
              icon={<Search size={12} className="text-blue-500" />}
              size="small"
              onClick={() => setShowSearch(true)}
              className="uppercase text-[10px] whitespace-nowrap font-medium"
              style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
              color="default"
              variant="link"
              title="Tìm kiếm trên bảng (Ctrl+F)"
            >
              {t('TÌM KIẾM')}
            </Button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 uppercase leading-none">
              <span>TIẾN ĐỘ:</span>
              <b className={uploadedCount === 4 ? 'text-emerald-700' : 'text-amber-600'}>
                {uploadedCount}/4 FILE
              </b>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 leading-none">
              <CheckCircle2 size={11} />
              <span>{masterRecord?.status || 'REGISTERED'}</span>
            </span>
          </div>
        </div>
      }
      query={
        <CalcProductionQuery
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          masterInfo={masterInfo}
          onChangeMasterInfo={() => {}}
          fileStatusSummary={fileStatusSummary}
          calcResults={null}
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
  )
}
