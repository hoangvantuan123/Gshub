/* eslint-disable no-unused-vars */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { message } from 'antd'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { getNow_yyyymmdd_hhmmss } from '../../../../../utils/getToday_yyyymmdd_hhmmss'
import { useOrderSettlementColumns } from '../columns/orderSettlementColumns'
import {
  MOCK_SETTLEMENT_FLAT_DATA,
  buildDynamicGroupedTree,
  flattenDynamicTree,
  getAllGroupKeys
} from '../mock/mockSettlementData'

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
  // 1. Query Filters
  const [stageOrderNo, setStageOrderNo] = useState('')
  const [itemCode, setItemCode] = useState('')
  const [itemName, setItemName] = useState('')
  const [operationCode, setOperationCode] = useState('')
  const [status, setStatus] = useState('')
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  // 2. Dynamic Grouping State (Group by any column key, e.g. 'StageOrderNo', 'ItemCode', or null for flat view)
  const [groupByColumn, setGroupByColumn] = useState('StageOrderNo')
  const [rawFlatData, setRawFlatData] = useState(MOCK_SETTLEMENT_FLAT_DATA)
  
  // Tree & Expanded groups (mặc định mở full toàn bộ)
  const treeData = useMemo(() => {
    return buildDynamicGroupedTree(rawFlatData, 'StageOrderNo')
  }, [rawFlatData])

  const [expandedIds, setExpandedIds] = useState(() => new Set(getAllGroupKeys(buildDynamicGroupedTree(MOCK_SETTLEMENT_FLAT_DATA, 'StageOrderNo'))))

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
  const handleAddQueryField = useCallback((fieldKey, fieldTitle, activeCol, source, sourceTitle) => {
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
  }, [])

  const handleRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== fieldKey))
  }, [])

  const handleResetQuery = useCallback(() => {
    setStageOrderNo('')
    setItemCode('')
    setItemName('')
    setOperationCode('')
    setStatus('')
    setDynamicQueryFields([])
  }, [])

  // Actions
  const handleSearch = useCallback(() => {
    setShowSearch(true)
  }, [])

  const handleReload = useCallback(() => {
    setRawFlatData(MOCK_SETTLEMENT_FLAT_DATA)
    setExpandedIds(new Set(getAllGroupKeys(buildDynamicGroupedTree(MOCK_SETTLEMENT_FLAT_DATA, 'StageOrderNo'))))
    message.success('Đã tải lại dữ liệu quyết toán lệnh sản xuất!')
  }, [])

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

    message.success(`Đã cập nhật quyết toán cho ${targetRows.length} chi tiết lệnh! Bấm Lưu (F10) để hoàn tất.`)
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

    setRawFlatData((prev) =>
      prev.map((r) => (targetIds.has(r.id) ? { ...r, WorkingTag: 'D' } : r))
    )

    message.info(`Đã đánh dấu xóa ${targetRows.length} dòng (WorkingTag = D). Bấm Lưu (F10) để xác nhận.`)
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
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `QuyetToanLenhSX_${getNow_yyyymmdd_hhmmss()}.xlsx`)
    message.success('Đã xuất file Excel thành công!')
  }, [rawFlatData])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return {
    // Query
    stageOrderNo,
    setStageOrderNo,
    itemCode,
    setItemCode,
    itemName,
    setItemName,
    operationCode,
    setOperationCode,
    status,
    setStatus,
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
    handleReload
  }
}
