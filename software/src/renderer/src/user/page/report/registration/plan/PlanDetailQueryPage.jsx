/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../hooks/usePagePermissions'
import { usePageData } from '../../../../../context/PageDataContext'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import { FormulaHandbookModal } from '../../production/handbook/FormulaHandbookModal'
import { calculateSelectionStats } from '../../../../hooks/useDataGridSheet'
import { loadFromLocalStorageSheet } from '../../../../../localStorage/sheet/sheet'
import { ensureStatusFirstColumn } from '../../../../../utils/systemColumns'
import ExportExcelModal from '../../../../components/modal/ExportExcelModal'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../utils/exportExcelUtils'
import { useDateFormat } from '../../../../hooks/useDateFormat'

import { usePlanImportColumns } from './columns/planImportColumns'
import PlanDetailQueryActions from './components/PlanDetailQueryActions'
import PlanDetailQueryFilters from './components/PlanDetailQueryFilters'
import PlanDetailQueryTable from './components/PlanDetailQueryTable'
import { queryPlanDetail } from '../services/planRegistrationService'

export default function PlanDetailQueryPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  cancelAllRequests,
  ...restProps
}) {
  const { t } = useTranslation()
  const { setPageData, setStatusMessage, setSelectionStats } = usePageData() || {}
  const loadingBarRef = useRef(null)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_plan_query',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // Columns & Grid State
  const defaultCols = usePlanImportColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })
  const [columns, setColumns] = useState(() => {
    const saved = loadFromLocalStorageSheet('S_ERP_COLS_plan_detail_query_table', [])
    if (saved && saved.length > 0) {
      return ensureStatusFirstColumn(saved, defaultCols)
    }
    return defaultCols.filter((col) => col.visible !== false)
  })
  const [gridData, setGridData] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // Pagination & Infinite Scroll State
  const [page, setPage] = useState(1)
  const pageSize = 1000
  const [totalRows, setTotalRows] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const isLoadingRef = useRef(false)
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const gridDataRef = useRef([])
  const searchValuesRef = useRef({
    FactoryName: '',
    RegCode: '',
    ApplyDate: '',
    FromDate: '',
    ToDate: '',
    OpDate: '',
    PicDp: '',
    MachineName: '',
    ItemCode: '',
    StatusDpSx: '',
    CapaStatus: '',
    Keyword: ''
  })
  const colFilterValuesRef = useRef({})

  // Group By State
  const [groupBy, setGroupBy] = useState('none')

  // Per-column Header Filter State
  const [showColFilters, setShowColFilters] = useState(false)
  const [colFilterValues, setColFilterValues] = useState({})

  // Handbook Modal
  const [isHandbookOpen, setIsHandbookOpen] = useState(false)

  // Quản lý trạng thái các trường tìm kiếm động
  const STORAGE_KEY_PLAN_QUERY = 'S_ERP_QUERY_FIELDS_plan_detail'
  const DEFAULT_PLAN_VISIBLE_KEYS = [
    'FactoryName',
    'RegCode',
    'ApplyDate',
    'OperationNo',
    'PicDp',
    'OpDate',
    'ItemCode',
    'ItemName'
  ]

  const [visibleKeys, setVisibleKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAN_QUERY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(parsed)
        }
      }
    } catch {}
    return new Set(DEFAULT_PLAN_VISIBLE_KEYS)
  })

  const handleToggleField = useCallback((fieldKey, isChecked) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (isChecked) {
        next.add(fieldKey)
      } else {
        next.delete(fieldKey)
      }
      try {
        localStorage.setItem(STORAGE_KEY_PLAN_QUERY, JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }, [])

  const handleResetQueryFields = useCallback(() => {
    const next = new Set(DEFAULT_PLAN_VISIBLE_KEYS)
    setVisibleKeys(next)
    try {
      localStorage.setItem(STORAGE_KEY_PLAN_QUERY, JSON.stringify(Array.from(next)))
    } catch {}
  }, [])

  // Dynamic Query Bar State
  const [searchValues, setSearchValues] = useState({
    FactoryName: '',
    RegCode: '',
    ApplyDate: '',
    OperationNo: '',
    OpDate: '',
    PicDp: '',
    MachineName: '',
    ItemCode: '',
    ItemName: '',
    StatusDpSx: '',
    CapaStatus: '',
    Keyword: ''
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  useEffect(() => {
    searchValuesRef.current = searchValues
  }, [searchValues])

  useEffect(() => {
    colFilterValuesRef.current = colFilterValues
  }, [colFilterValues])

  // ── 1. Truy vấn dữ liệu KHSX từ Backend API ──
  const fetchPlanDetailData = useCallback(
    async (currentPage = 1, append = false, customFilters = null) => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setIsLoadingMore(true)
      loadingBarRef?.current?.continuousStart?.()

      const filtersToUse = customFilters || searchValuesRef.current

      try {
        const payload = {
          page: String(currentPage),
          pageSize: String(pageSize),
          ...filtersToUse,
          ...colFilterValuesRef.current
        }

        const res = await queryPlanDetail(payload)
        const rawItems = res?.data || []
        const items = rawItems.map((row) => ({ ...row, WorkingTag: '' }))
        const pageInfo = res?.pageInfo || res?.raw?.pageInfo || res?.page || res?.raw?.page || {}
        const total = Number(
          pageInfo?.total ??
            pageInfo?.totalRows ??
            (append ? gridDataRef.current.length + items.length : items.length)
        )
        const totalAll = Number(pageInfo?.totalAll || total)

        let nextData = []
        if (append) {
          nextData = [...gridDataRef.current, ...items]
        } else {
          nextData = items
        }

        gridDataRef.current = nextData
        setGridData(nextData)
        setTotalRows(total)

        const hasMoreData = items.length > 0 && nextData.length < total
        hasMoreRef.current = hasMoreData
        setHasMore(hasMoreData)

        pageRef.current = currentPage
        setPage(currentPage)

        // Cập nhật đầy đủ chỉ số cho StatusBar dưới đáy
        setPageData?.((prev) => ({
          ...prev,
          total,
          totalAll,
          loadedCount: nextData.length,
          totalColumns: columns.length,
          page: currentPage,
          pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
          hasMore: hasMoreData,
          rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
        }))

        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'success',
            text: t('Đã tải thành công {{loaded}} / {{total}} dòng dữ liệu KHSX', {
              loaded: nextData.length.toLocaleString('vi-VN'),
              total: total.toLocaleString('vi-VN')
            })
          })
        }

        return items
      } catch (err) {
        console.error('Error fetching plan detail data:', err)
        if (!append) {
          gridDataRef.current = []
          setGridData([])
          setTotalRows(0)
        }
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'error',
            text: t('Lỗi nạp dữ liệu chi tiết KHSX từ máy chủ!')
          })
        }
        return []
      } finally {
        isLoadingRef.current = false
        setIsLoadingMore(false)
        loadingBarRef?.current?.complete?.()
      }
    },
    [columns.length, pageSize, setPageData, setStatusMessage, t]
  )

  // Load initial page
  useEffect(() => {
    fetchPlanDetailData(1, false, searchValues)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Search Trigger
  const handleSearch = useCallback(() => {
    pageRef.current = 1
    setPage(1)
    fetchPlanDetailData(1, false, searchValuesRef.current)
  }, [fetchPlanDetailData])

  // Handle Reset Filter
  const handleResetQuery = useCallback(() => {
    const emptyFilters = {
      FactoryName: '',
      RegCode: '',
      ApplyDate: '',
      OperationNo: '',
      OpDate: '',
      PicDp: '',
      MachineName: '',
      ItemCode: '',
      ItemName: '',
      StatusDpSx: '',
      CapaStatus: '',
      Keyword: ''
    }
    setSearchValues(emptyFilters)
    setColFilterValues({})
    searchValuesRef.current = emptyFilters
    colFilterValuesRef.current = {}
    pageRef.current = 1
    setPage(1)
    fetchPlanDetailData(1, false, emptyFilters)
  }, [fetchPlanDetailData])

  // Handle Ctrl+F / Right-click on cell -> Push into query & filter & auto reveal column
  const handleApplyFilterFromCell = useCallback(
    (colKey, value, colTitle) => {
      if (!colKey || colKey === 'WorkingTag' || colKey.startsWith('_')) return

      // 1. Tự động thêm cột vào thanh tìm kiếm nếu chưa hiển thị
      setVisibleKeys((prev) => {
        if (!prev.has(colKey)) {
          const next = new Set(prev)
          next.add(colKey)
          try {
            localStorage.setItem(STORAGE_KEY_PLAN_QUERY, JSON.stringify(Array.from(next)))
          } catch {}
          return next
        }
        return prev
      })

      // 2. Gán giá trị vào searchValues
      const nextFilters = {
        ...searchValuesRef.current,
        [colKey]: value || ''
      }
      setSearchValues(nextFilters)
      searchValuesRef.current = nextFilters

      // 3. Nhảy chuột (Focus) ngay vào ô input của cột đó trên thanh tìm kiếm
      setTimeout(() => {
        const targetInput =
          document.getElementById(`query-input-${colKey}`) ||
          document.querySelector(`[data-query-key="${colKey.toLowerCase()}"]`) ||
          document.querySelector(`input[name="${colKey}"]`)
        if (targetInput) {
          targetInput.focus()
          if (typeof targetInput.select === 'function') {
            targetInput.select()
          }
        }
      }, 60)

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t('Đã tự động tạo điều kiện tìm kiếm cho cột [{{col}}] với giá trị: "{{val}}"', {
            col: colTitle || colKey,
            val: value || t('Tất cả')
          })
        })
      }
    },
    [fetchPlanDetailData, setStatusMessage, t]
  )

  // Handle Infinite Scroll when scrolling reaches row 500 / near bottom
  const onVisibleRegionChanged = useCallback(
    (range) => {
      if (!hasMoreRef.current || isLoadingRef.current) return
      const bottomRow = range.y + range.height
      const currentCount = gridDataRef.current.length
      // Tự động tải tiếp trang khi cuộn đến dòng 500 hoặc cách đáy 500 dòng
      if (
        currentCount > 0 &&
        (bottomRow >= currentCount - 500 || (currentCount === 1000 && bottomRow >= 500))
      ) {
        fetchPlanDetailData(pageRef.current + 1, true)
      }
    },
    [fetchPlanDetailData]
  )

  // ── 2. Bộ lọc Client-Side / Realtime theo từng cột (Hỗ trợ nhiều giá trị dấu phẩy) & Nhóm Group ──
  const filteredAndGroupedData = useMemo(() => {
    let result = [...gridData]

    // Áp dụng bộ lọc từng cột nếu có (hỗ trợ nhiều giá trị cách nhau bằng dấu phẩy)
    const activeFilterEntries = Object.entries(colFilterValues).filter(
      ([, val]) => val && String(val).trim() !== ''
    )
    if (activeFilterEntries.length > 0) {
      result = result.filter((row) => {
        return activeFilterEntries.every(([colId, filterVal]) => {
          const cellVal = String(row[colId] || '').toLowerCase()
          const tokens = String(filterVal)
            .split(/[,;]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
          if (tokens.length <= 1) {
            return cellVal.includes(tokens[0] || '')
          }
          return tokens.some((token) => cellVal.includes(token))
        })
      })
    }

    // Nếu không nhóm dữ liệu
    if (groupBy === 'none') {
      return result.map((item, index) => ({
        ...item,
        _displayIndex: index + 1,
        _isGroupHeader: false
      }))
    }

    // Nhóm dữ liệu theo trường đã chọn
    const groups = {}
    result.forEach((item) => {
      const groupKey = item[groupBy] || t('Chưa xác định / Khác')
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })

    const finalRows = []
    Object.entries(groups).forEach(([groupName, items]) => {
      const totalPlanQty = items.reduce((sum, r) => sum + (Number(r.PlanQty) || 0), 0)

      finalRows.push({
        _isGroupHeader: true,
        _groupTitle: `[${groupName}] - (${items.length} bản ghi)`,
        _totalPlanQty: totalPlanQty,
        [groupBy]: groupName
      })

      items.forEach((it, idx) => {
        finalRows.push({
          ...it,
          _displayIndex: idx + 1,
          _isGroupHeader: false
        })
      })
    })

    return finalRows
  }, [colFilterValues, gridData, groupBy, t])

  // ── 2.5. Tự động tính toán chỉ số thống kê kiểu Excel khi bôi đen / chọn ô trên bảng ──
  const statsRafRef = useRef(null)
  useEffect(() => {
    if (!setSelectionStats) return

    if (statsRafRef.current) {
      cancelAnimationFrame(statsRafRef.current)
    }

    statsRafRef.current = requestAnimationFrame(() => {
      const stats = calculateSelectionStats(selection, filteredAndGroupedData, columns)
      setSelectionStats(stats)
    })

    return () => {
      if (statsRafRef.current) {
        cancelAnimationFrame(statsRafRef.current)
      }
    }
  }, [selection, filteredAndGroupedData, columns, setSelectionStats])

  // Dọn dẹp thống kê khi unmount
  useEffect(() => {
    return () => {
      setSelectionStats && setSelectionStats(null)
    }
  }, [setSelectionStats])

  // Đồng bộ số lượng cột và số dòng hiển thị vào PageData
  useEffect(() => {
    setPageData?.((prev) => ({
      ...prev,
      totalColumns: columns.length,
      loadedCount: filteredAndGroupedData.length
    }))
  }, [columns.length, filteredAndGroupedData.length, setPageData])

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const { formatDate } = useDateFormat()

  const handleOpenExportModal = useCallback(() => {
    const totalCount = totalRows || filteredAndGroupedData.length
    if (totalCount === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: t('Không có dữ liệu phù hợp với điều kiện để xuất Excel!')
      })
      return
    }
    setIsExportModalOpen(true)
  }, [filteredAndGroupedData.length, setStatusMessage, t, totalRows])

  // ── 3. Thực hiện Xuất dữ liệu Excel chuẩn sau khi đã xác nhận thông tin ──
  const executeExportPlanExcel = useCallback(
    async ({
      scope,
      fileName,
      saveDirectory,
      overwriteExisting,
      includeHeaders,
      exportableCols
    }) => {
      loadingBarRef?.current?.continuousStart?.()
      try {
        let dataToExport = []

        if (scope === 'all' || !scope) {
          if (totalRows > gridData.length) {
            const BATCH_SIZE = 3000
            const totalBatches = Math.max(1, Math.ceil(totalRows / BATCH_SIZE))
            const collectedData = []

            for (let pageNum = 1; pageNum <= totalBatches; pageNum++) {
              setStatusMessage?.({
                type: 'info',
                text: t(
                  'Đang nạp an toàn từ máy chủ: {{current}}/{{total}} dòng (Đợt {{page}}/{{totalPages}})...',
                  {
                    current: collectedData.length.toLocaleString('vi-VN'),
                    total: totalRows.toLocaleString('vi-VN'),
                    page: pageNum,
                    totalPages: totalBatches
                  }
                )
              })

              const payload = {
                page: String(pageNum),
                pageSize: String(BATCH_SIZE),
                ...searchValuesRef.current,
                ...colFilterValuesRef.current
              }

              const res = await queryPlanDetail(payload)
              const batchItems = res?.data || []
              if (batchItems.length === 0) break

              // Push trực tiếp để tiết kiệm RAM tối đa, tránh tạo bản sao mảng
              for (let i = 0; i < batchItems.length; i++) {
                collectedData.push(batchItems[i])
              }

              if (collectedData.length >= totalRows) break

              // Nghỉ 40ms giữa các đợt để giải phóng Event Loop, giúp UI mượt và không gây tải dồn dập cho Server
              await new Promise((resolve) => setTimeout(resolve, 40))
            }

            dataToExport = collectedData.map((r, i) => ({
              ...r,
              WorkingTag: '',
              _displayIndex: i + 1,
              _isGroupHeader: false
            }))
          } else {
            dataToExport = filteredAndGroupedData
          }
        } else if (scope === 'selected') {
          const selectedRows = selection?.rows?.items || []
          if (selectedRows.length > 0) {
            const indices = []
            selectedRows.forEach(([start, end]) => {
              for (let i = start; i < Math.min(filteredAndGroupedData.length, end); i++) {
                indices.push(i)
              }
            })
            dataToExport = indices.map((idx) => filteredAndGroupedData[idx]).filter(Boolean)
          } else if (selection?.current?.range) {
            const { y, height } = selection.current.range
            dataToExport = filteredAndGroupedData.slice(
              y,
              Math.min(filteredAndGroupedData.length, y + height)
            )
          } else {
            dataToExport = filteredAndGroupedData
          }
        } else {
          dataToExport = filteredAndGroupedData
        }

        if (dataToExport.length === 0) {
          throw new Error(t('Không có dòng dữ liệu nào để xuất Excel!'))
        }

        const filterText = formatFilterSummary(
          { ...searchValuesRef.current, ...colFilterValuesRef.current },
          formatDate
        )

        const wb = generateExcelWorkbook({
          data: dataToExport,
          columns: exportableCols || columns,
          sheetName: 'ChiTiet_KHSX',
          reportTitle: t('BÁO CÁO TRUY VẤN CHI TIẾT KẾ HOẠCH SẢN XUẤT (ĐIỀU PHỐI KHSX)'),
          filterInfo: filterText,
          includeHeaders: includeHeaders !== false,
          formatDateFn: formatDate
        })

        const saveResult = await saveWorkbookToFile(wb, fileName, saveDirectory, {
          overwriteExisting
        })

        setStatusMessage?.({
          type: 'success',
          text: t('Đã xuất thành công đủ {{count}} dòng dữ liệu ra file [{{file}}]!', {
            count: dataToExport.length.toLocaleString('vi-VN'),
            file: saveResult?.filePath || fileName
          })
        })
      } catch (err) {
        console.error('Lỗi khi xuất file Excel:', err)
        setStatusMessage?.({
          type: 'error',
          text: t('Xuất file Excel thất bại: ') + (err?.message || err)
        })
        throw err
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [
      columns,
      filteredAndGroupedData,
      formatDate,
      gridData.length,
      selection,
      setStatusMessage,
      t,
      totalRows
    ]
  )

  const drawerOpenerRef = useRef(null)
  const [showSearch, setShowSearch] = useState(false)

  // Phím tắt Hotkeys
  usePageHotkeys({
    onSearch: handleSearch,
    onRefresh: () => fetchPlanDetailData(1, false, searchValues),
    onExportExcel: handleOpenExportModal
  })

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <PlanDetailQueryActions
            handleSearchData={handleSearch}
            handleExportExcel={handleOpenExportModal}
            isLoading={isLoadingMore}
            permissions={pagePerms}
          />
        }
        query={
          <PlanDetailQueryFilters
            columns={columns}
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            visibleKeys={visibleKeys}
            onToggleField={handleToggleField}
            onResetFields={handleResetQueryFields}
            dynamicQueryFields={dynamicQueryFields}
            onAddQueryField={setDynamicQueryFields}
            onResetQuery={handleResetQuery}
            handleSearchData={handleSearch}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <PlanDetailQueryTable
            tableTitle={t('Truy vấn chi tiết Kế hoạch sản xuất (KHSX)')}
            cols={columns}
            setCols={setColumns}
            defaultCols={defaultCols}
            gridData={filteredAndGroupedData}
            setGridData={setGridData}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            onVisibleRegionChanged={onVisibleRegionChanged}
            showColFilters={showColFilters}
            colFilterValues={colFilterValues}
            setColFilterValues={setColFilterValues}
            onApplyFilterFromCell={handleApplyFilterFromCell}
            onAddQueryField={handleApplyFilterFromCell}
            onRegisterDrawer={(fn) => {
              drawerOpenerRef.current = fn
            }}
            onExportExcel={handleOpenExportModal}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            loadedCount={gridData.length}
            displayCount={filteredAndGroupedData.length}
            totalRows={totalRows}
          />
        }
      />

      {/* Modal xác nhận và kiểm tra thông tin xuất Excel */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={t('XÁC NHẬN XUẤT EXCEL - CHI TIẾT KHSX')}
        reportName={t('Báo cáo Truy vấn chi tiết Kế hoạch sản xuất (Điều phối KHSX)')}
        totalRows={totalRows}
        loadedCount={gridData.length}
        selectedCount={
          selection?.rows?.items?.reduce((acc, [s, e]) => acc + (e - s), 0) ||
          (selection?.current?.range?.height ? selection.current.range.height : 0)
        }
        columns={columns}
        activeFilters={{ ...searchValues, ...colFilterValues }}
        defaultFileName={`TruyVan_ChiTiet_KHSX_${new Date().toISOString().slice(0, 10)}.xlsx`}
        onConfirmExport={executeExportPlanExcel}
      />

      {/* Modal cẩm nang công thức */}
      <FormulaHandbookModal
        isOpen={isHandbookOpen}
        onClose={() => setIsHandbookOpen(false)}
        defaultReportType="plan"
      />
    </>
  )
}
