/* eslint-disable no-unused-vars */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { message } from 'antd'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { getNow_yyyymmdd_hhmmss } from '../../../../../utils/getToday_yyyymmdd_hhmmss'
import { useOrderSettlementColumns } from '../columns/orderSettlementColumns'
import {
  buildDynamicGroupedTree,
  flattenDynamicTree,
  getAllGroupKeys
} from '../mock/mockSettlementData'
import { queryOrderSettlement } from '../../../../../api/production/orderSettlementApi'
import { usePageData } from '../../../../../context/PageDataContext'
import {
  isSessionExpiredError,
  triggerSessionExpired
} from '../../../../../utils/sessionExpiredHelper'

export function useOrderSettlement({
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canView = true,
  canSearch = true,
  loadingBarRef,
  controllers,
  customLimits
}) {
  const { setPageData, setStatusMessage, setLoadingInfo } = usePageData() || {}

  // 1. Query Filters (Cấu trúc tìm kiếm chuẩn học từ WorkProcess)
  const [searchValues, setSearchValues] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return {
      StageOrderNo: '',
      DetailNo: '',
      FactoryName: '',
      DateRange: [`${y}-${m}-01`, `${y}-${m}-${d}`],
      ItemCode: '',
      ItemName: '',
      OperationCode: '',
      Status: '',
      BranchCode: 'A01',
      FiscalYear: String(y)
    }
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const [loading, setLoading] = useState(false)
  const isSearchingRef = useRef(false)

  // 2. Dynamic Grouping State (Group by any column key, e.g. 'StageOrderNo', 'ItemCode', or null for flat view)
  const [groupByColumn, setGroupByColumn] = useState('StageOrderNo')
  const [rawFlatData, setRawFlatData] = useState([])

  // Tree & Expanded groups (mặc định mở full toàn bộ)
  const treeData = useMemo(() => {
    return buildDynamicGroupedTree(rawFlatData, groupByColumn || 'StageOrderNo')
  }, [rawFlatData, groupByColumn])

  const [expandedIds, setExpandedIds] = useState(() => new Set())

  // 3. Grid Columns & Display Data
  const defaultCols = useOrderSettlementColumns()
  const [cols, setCols] = useState(() => defaultCols.filter((c) => c.visible !== false))
  const [gridData, setGridData] = useState([])
  const [numRows, setNumRows] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // Recompute gridData when grouping, treeData, expandedIds or rawFlatData change
  useEffect(() => {
    if (groupByColumn) {
      const flattened = flattenDynamicTree(treeData, expandedIds, groupByColumn)
      setGridData(flattened)
      setNumRows(flattened.length)
    } else {
      setGridData(rawFlatData)
      setNumRows(rawFlatData.length)
    }
  }, [groupByColumn, treeData, expandedIds, rawFlatData])

  // Toggle Group Expand/Collapse
  const toggleGroup = useCallback((groupId) => {
    if (!groupId) return
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const handleExpandAll = useCallback(() => {
    if (treeData.length > 0) {
      setExpandedIds(new Set(getAllGroupKeys(treeData)))
    }
  }, [treeData])

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const handleToggleGroupingMode = useCallback(() => {
    setGroupByColumn((prev) => (prev ? null : 'StageOrderNo'))
  }, [])

  // Selected row derived from selection
  const selectedRowIndex = useMemo(() => {
    if (!selection?.rows || selection.rows.length === 0) return -1
    const firstItem = selection.rows.items?.[0]
    if (Array.isArray(firstItem)) return firstItem[0]
    return -1
  }, [selection])

  const selectedRow = useMemo(() => {
    if (selectedRowIndex >= 0 && selectedRowIndex < gridData.length) {
      return gridData[selectedRowIndex]
    }
    return null
  }, [selectedRowIndex, gridData])

  // Query Field Handlers
  const handleAddQueryField = useCallback(
    (fieldKey, fieldTitle, activeCol, source, sourceTitle) => {
      setDynamicQueryFields((prev) => {
        if (prev.some((f) => f.key === fieldKey)) return prev
        return [
          ...prev,
          {
            key: fieldKey,
            label: fieldTitle || fieldKey,
            value: '',
            source: source || 'settlement',
            sourceTitle: sourceTitle || 'Quyết toán'
          }
        ]
      })
    },
    []
  )

  const handleRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== fieldKey))
  }, [])

  const handleResetQuery = useCallback(() => {
    setSearchValues({
      StageOrderNo: '',
      FactoryName: '',
      DateRange: ['', ''],
      ItemCode: '',
      ItemName: '',
      OperationCode: '',
      Status: '',
      BranchCode: 'A01',
      FiscalYear: String(new Date().getFullYear())
    })
    setDynamicQueryFields([])
  }, [])

  // Đồng bộ số lượng dòng hiển thị và số lượng cột xuống StatusBar
  useEffect(() => {
    if (setPageData) {
      setPageData((prev) => ({
        ...prev,
        loadedCount: gridData.length,
        totalColumns: cols.length
      }))
    }
  }, [gridData.length, cols.length, setPageData])

  // Fetch Data from DataHub API (Chuẩn hóa cấu trúc theo WorkProcess)
  const fetchData = useCallback(
    async (overrideParams = {}) => {
      // Thu thập tất cả các trường tìm kiếm bổ sung/động sang column_filters giống WorkProcess
      const extraColumnFilters = {}
      const effectiveSearch = { ...searchValues, ...overrideParams }

      Object.entries(effectiveSearch).forEach(([k, v]) => {
        if (
          k !== 'StageOrderNo' &&
          k !== 'DocNo' &&
          k !== 'ItemCode' &&
          k !== 'ItemName' &&
          k !== 'OperationCode' &&
          k !== 'Status' &&
          k !== 'FactoryName' &&
          k !== 'DateRange' &&
          k !== 'FromDate' &&
          k !== 'ToDate' &&
          k !== 'BranchCode' &&
          k !== 'FiscalYear' &&
          v !== undefined &&
          v !== null &&
          String(v).trim() !== ''
        ) {
          extraColumnFilters[k] = String(v).trim()
        }
      })

      const formatDateStr = (val) => {
        if (!val) return undefined
        if (typeof val === 'string') {
          const s = val.trim()
          if (!s) return undefined
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
          const d = new Date(s)
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${day}`
          }
          return s
        }
        if (val instanceof Date && !isNaN(val.getTime())) {
          const y = val.getFullYear()
          const m = String(val.getMonth() + 1).padStart(2, '0')
          const day = String(val.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
        if (typeof val?.format === 'function') {
          return val.format('YYYY-MM-DD')
        }
        return String(val).trim()
      }

      let fromDate = formatDateStr(effectiveSearch.FromDate)
      let toDate = formatDateStr(effectiveSearch.ToDate)
      if (Array.isArray(effectiveSearch.DateRange) && effectiveSearch.DateRange.length === 2) {
        if (effectiveSearch.DateRange[0]) fromDate = formatDateStr(effectiveSearch.DateRange[0])
        if (effectiveSearch.DateRange[1]) toDate = formatDateStr(effectiveSearch.DateRange[1])
      }

      const searchSummary =
        effectiveSearch.StageOrderNo?.trim() ||
        effectiveSearch.ItemCode?.trim() ||
        effectiveSearch.ItemName?.trim() ||
        effectiveSearch.OperationCode?.trim() ||
        (fromDate && toDate ? `${fromDate} ~ ${toDate}` : fromDate || toDate) ||
        (effectiveSearch.FactoryName?.trim() &&
        effectiveSearch.FactoryName.trim() !== '-- Tất cả nhà máy --'
          ? effectiveSearch.FactoryName.trim()
          : '') ||
        effectiveSearch.Status?.trim() ||
        Object.values(extraColumnFilters)[0] ||
        'tất cả'

      setLoading(true)
      setLoadingInfo?.({ isLoading: true })
      loadingBarRef?.current?.continuousStart?.()
      setStatusMessage?.({
        type: 'info',
        text: `Đang tra cứu quyết toán theo "${searchSummary}" từ Bravo ERP...`
      })

      try {
        const queryParams = {
          stage_order_no: effectiveSearch.StageOrderNo?.trim() || undefined,
          doc_no: effectiveSearch.DocNo?.trim() || undefined,
          item_code: effectiveSearch.ItemCode?.trim() || undefined,
          item_name: effectiveSearch.ItemName?.trim() || undefined,
          operation_code: effectiveSearch.OperationCode?.trim() || undefined,
          status: effectiveSearch.Status?.trim() || undefined,
          factory_name: effectiveSearch.FactoryName?.trim() || undefined,
          from_date: fromDate,
          to_date: toDate,
          factory_id: effectiveSearch.FactoryId || undefined,
          factory_id_tt: effectiveSearch.FactoryIdTT || undefined,
          stt_ltt: effectiveSearch.Stt_LTT?.trim() || undefined,
          item_id: effectiveSearch.ItemId || undefined,
          dept_id: effectiveSearch.DeptId || undefined,
          branch_code: effectiveSearch.BranchCode?.trim() || 'A01',
          fiscal_year: effectiveSearch.FiscalYear?.trim() || String(new Date().getFullYear()),
          column_filters:
            Object.keys(extraColumnFilters).length > 0 ? extraColumnFilters : undefined,
          page: 0,
          page_size: 100,
          include_raw: false
        }

        const res = await queryOrderSettlement(queryParams)
        if (res.success && Array.isArray(res.data?.items)) {
          const items = res.data.items
          setRawFlatData(items)
          const newTree = buildDynamicGroupedTree(items, groupByColumn || 'StageOrderNo')
          setExpandedIds(new Set(getAllGroupKeys(newTree)))

          setLoadingInfo?.({
            isLoading: false,
            lastLoadTime: res.latency
          })
          setStatusMessage?.({
            type: 'success',
            text: `Tải thành công ${items.length} chi tiết quyết toán (${res.latency} ms)`
          })
          message.success(`Đã tải ${items.length} dòng dữ liệu quyết toán (${res.latency}ms)`)
        } else {
          message.warning(res.message || 'Không có dữ liệu quyết toán phù hợp')
          setStatusMessage?.({
            type: 'warning',
            text: res.message || 'Không có dữ liệu quyết toán phù hợp'
          })
        }
      } catch (err) {
        if (isSessionExpiredError(err)) {
          triggerSessionExpired()
          return
        }
        message.error(`Lỗi tải dữ liệu quyết toán: ${err.message || err}`)
        setStatusMessage?.({
          type: 'error',
          text: `Lỗi tải dữ liệu: ${err.message || err}`
        })
      } finally {
        setLoading(false)
        setLoadingInfo?.({ isLoading: false })
        loadingBarRef?.current?.complete?.()
      }
    },
    [searchValues, groupByColumn, loadingBarRef, setLoadingInfo, setStatusMessage]
  )

  // Actions
  const handleSearch = useCallback(
    (overrideStageOrderNo = null) => {
      setShowSearch(true)
      if (typeof overrideStageOrderNo === 'string' && overrideStageOrderNo.trim()) {
        fetchData({ StageOrderNo: overrideStageOrderNo.trim() })
      } else {
        fetchData()
      }
    },
    [fetchData]
  )

  const handleReload = useCallback(() => {
    fetchData()
  }, [fetchData])

  // Save (F10) - Process WorkingTag === 'A' | 'U' | 'D'
  const handleSave = useCallback(async () => {
    const dirtyRows = rawFlatData.filter(
      (r) => r.WorkingTag === 'A' || r.WorkingTag === 'U' || r.WorkingTag === 'D'
    )

    if (dirtyRows.length === 0) {
      message.info('Không có dữ liệu thay đổi cần lưu!')
      return
    }

    loadingBarRef?.current?.continuousStart()
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setRawFlatData((prev) =>
        prev
          .filter((r) => r.WorkingTag !== 'D')
          .map((r) => ({
            ...r,
            WorkingTag: ''
          }))
      )

      message.success(`Đã lưu thành công ${dirtyRows.length} dòng dữ liệu quyết toán!`)
    } catch (err) {
      message.error(`Lưu thất bại: ${err.message || 'Lỗi hệ thống'}`)
    } finally {
      loadingBarRef?.current?.complete()
    }
  }, [rawFlatData, loadingBarRef])

  // Duyệt / Quyết toán đóng lệnh
  const handleApprove = useCallback(async () => {
    const selectedIndices = []
    if (selection?.rows?.items) {
      selection.rows.items.forEach(([start, end]) => {
        for (let i = start; i < end; i++) {
          selectedIndices.push(i)
        }
      })
    }

    const targetRows = []
    if (selectedIndices.length > 0) {
      selectedIndices.forEach((idx) => {
        const item = gridData[idx]
        if (!item) return
        if (item.IsGroup && Array.isArray(item.children)) {
          targetRows.push(...item.children)
        } else if (!item.IsGroup) {
          targetRows.push(item)
        }
      })
    } else {
      targetRows.push(...rawFlatData)
    }

    if (targetRows.length === 0) {
      message.warning('Vui lòng chọn dòng cần quyết toán đóng lệnh!')
      return
    }

    const todayStr = new Date().toLocaleDateString('vi-VN')
    const targetIds = new Set(targetRows.map((r) => r.id))

    setRawFlatData((prev) =>
      prev.map((r) => {
        if (targetIds.has(r.id)) {
          return {
            ...r,
            Status: 'Đã quyết toán',
            IsSettled: true,
            SettledDate: todayStr,
            WorkingTag: 'U'
          }
        }
        return r
      })
    )

    message.success(
      `Đã cập nhật quyết toán cho ${targetRows.length} chi tiết lệnh! Bấm Lưu (F10) để hoàn tất.`
    )
  }, [selection, gridData, rawFlatData])

  const handleCloseOrder = useCallback(() => {
    handleApprove()
  }, [handleApprove])

  const handleDelete = useCallback(() => {
    const selectedIndices = []
    if (selection?.rows?.items) {
      selection.rows.items.forEach(([start, end]) => {
        for (let i = start; i < end; i++) {
          selectedIndices.push(i)
        }
      })
    }

    if (selectedIndices.length === 0) {
      message.warning('Vui lòng chọn dòng cần xóa!')
      return
    }

    const targetRows = []
    selectedIndices.forEach((idx) => {
      const item = gridData[idx]
      if (!item) return
      if (item.IsGroup && Array.isArray(item.children)) {
        targetRows.push(...item.children)
      } else if (!item.IsGroup) {
        targetRows.push(item)
      }
    })
    const targetIds = new Set(targetRows.map((r) => r.id))

    setRawFlatData((prev) => prev.map((r) => (targetIds.has(r.id) ? { ...r, WorkingTag: 'D' } : r)))

    message.info(
      `Đã đánh dấu xóa ${targetRows.length} dòng (WorkingTag = D). Bấm Lưu (F10) để xác nhận.`
    )
  }, [selection, gridData])

  // Export Excel
  const handleExportExcel = useCallback(() => {
    const exportData = rawFlatData.map((row) => ({
      'Lệnh công đoạn': row.StageOrderNo || '',
      'Mặt hàng': row.ItemCode || '',
      'Tên vật tư, hàng hóa': row.ItemName || '',
      'SL cần đạt theo DO': row.DoRequiredQty ?? '',
      'SL điều chỉnh ban đầu': row.InitialAdjustQty ?? '',
      'SL cần đạt sau điều chỉnh': row.AdjustedRequiredQty ?? '',
      'SL bù hao': row.WasteCompensationQty ?? '',
      'SL cần sản xuất': row.ProductionRequiredQty ?? '',
      'Quyết toán': row.IsSettled ? 'Đã quyết toán' : 'Chưa quyết toán',
      'SL quyết toán': row.SettlementQty ?? '',
      'Số chi tiết': row.DetailNo || '',
      'Mã TT': row.OperationCode || '',
      'Tên thao tác': row.OperationName || '',
      'SL đạt đã lên lệnh TT': row.PlannedAchievedQty ?? '',
      'SL SX đã lên lệnh TT': row.PlannedProductionQty ?? '',
      'SL đạt đã thống kê': row.StatAchievedQty ?? '',
      'SL SX đã thống kê': row.StatProductionQty ?? '',
      'SL Nhập kho': row.WarehouseReceiptQty ?? '',
      'Trạng thái': row.Status || '',
      'Ngày quyết toán': row.SettledDate || '',
      'Ghi chú quyết toán': row.Notes || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'QuyetToanLenhSX')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, `QuyetToanLenhSX_${getNow_yyyymmdd_hhmmss()}.xlsx`)
    message.success('Đã xuất file Excel thành công!')
  }, [rawFlatData])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return {
    // Query Filters & Search Values
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    // Dynamic Grouping
    groupByColumn,
    setGroupByColumn,
    expandedIds,
    toggleGroup,
    handleExpandAll,
    handleCollapseAll,
    handleToggleGroupingMode,
    // Grid Table State
    gridData,
    setGridData,
    rawFlatData,
    setRawFlatData,
    selection,
    setSelection,
    numRows,
    setNumRows,
    cols,
    setCols,
    defaultCols,
    showSearch,
    setShowSearch,
    selectedRow,
    // Actions
    handleSearch,
    handleSave,
    handleApprove,
    handleCloseOrder,
    handleExportExcel,
    handlePrint,
    handleDelete,
    handleReload,
    fetchData,
    loading
  }
}
