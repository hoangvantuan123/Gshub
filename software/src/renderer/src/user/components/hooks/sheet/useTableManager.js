import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { CompactSelection } from '@glideapps/glide-data-grid'
import {
  loadFromLocalStorageSheet,
  saveToLocalStorageSheet
} from '../../../../localStorage/sheet/sheet'
import { useLayer } from 'react-laag'
import { updateIndexNo } from '../../sheet/js/updateIndexNo'
import useTableCellTheme, { DEFAULT_GRID_THEME } from './useTableCellTheme'
import { usePageData } from '../../../../context/PageDataContext'
import { useTableClipboard } from '../../../hooks/useTableClipboard'
import {
  isSystemHiddenColumn,
  filterConfigurableColumns,
  ensureStatusFirstColumn
} from '../../../../utils/systemColumns'

export { DEFAULT_GRID_THEME, isSystemHiddenColumn, filterConfigurableColumns, ensureStatusFirstColumn }

export default function useTableManager(arg1, arg2, arg3, arg4, arg5, arg6) {
  let options = {}
  if (Array.isArray(arg1)) {
    // Positional signature: (cols, setCols, defaultCols, tableId, setGridData, extraOptions)
    options = {
      cols: arg1,
      setCols: arg2,
      defaultCols: arg3,
      tableId: arg4,
      setGridData: arg5,
      ...(arg6 || {})
    }
  } else {
    // Object signature: ({ tableId, defaultCols, cols, ... })
    options = arg1 || {}
  }

  const {
    tableId,
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData = [],
    selection,
    setSelection,
    canEdit = true,
    codeHelpColumns = [],
    codeHelpConfig = {},
    readOnlyColumns = [],
    codeHelpBg,
    readOnlyBg,
    borderColor,
    gridTheme: customGridTheme,
    onAddQueryField
  } = options

  const { setStatusMessage } = usePageData() || {}

  // Theme & Cell Styling Helper (Tự động nhận diện codehelp, readonly, editable)
  const {
    getCellTheme,
    isCodeHelpColumn,
    isReadOnlyColumn,
    isEditableColumn,
    codeHelpBg: effectiveCodeHelpBg,
    readOnlyBg: effectiveReadOnlyBg
  } = useTableCellTheme({
    cols,
    codeHelpColumns:
      codeHelpColumns.length > 0 ? codeHelpColumns : Object.keys(codeHelpConfig || {}),
    readOnlyColumns,
    codeHelpBg,
    readOnlyBg,
    borderColor
  })

  const gridTheme = useMemo(
    () => ({
      ...DEFAULT_GRID_THEME,
      ...customGridTheme
    }),
    [customGridTheme]
  )

  // CodeHelp Modal State & Handlers
  const [codeHelpModal, setCodeHelpModal] = useState({
    isOpen: false,
    columnKey: '',
    rowIndex: -1,
    title: '',
    helpData: [],
    columns: [],
    initialSearchText: '',
    onSelect: null
  })

  const openCodeHelpModal = useCallback(
    (columnKey, rowIndex, initialText = '') => {
      if (canEdit === false) return
      const config = codeHelpConfig?.[columnKey] || {}
      const currentRow = rowIndex >= 0 ? gridData?.[rowIndex] : null

      const wrappedFetchHelpData = config.fetchHelpData
        ? (text, page, limit, searchColumn) =>
            config.fetchHelpData(text, page, limit, searchColumn, currentRow)
        : null

      setCodeHelpModal({
        isOpen: true,
        columnKey,
        rowIndex,
        title: config.title || `Tra cứu ${columnKey}`,
        helpData: config.helpData || [],
        fetchHelpData: wrappedFetchHelpData,
        columns: config.columns || [],
        initialSearchText: initialText,
        onSelect: config.onSelect
      })
    },
    [codeHelpConfig, canEdit, gridData]
  )

  const closeCodeHelpModal = useCallback(() => {
    setCodeHelpModal((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleSelectCodeHelp = useCallback(
    (selectedItem) => {
      if (!selectedItem || codeHelpModal.rowIndex < 0) {
        closeCodeHelpModal()
        return
      }

      const { columnKey, rowIndex, onSelect } = codeHelpModal

      setGridData((prevData) => {
        const updated = [...prevData]
        if (!updated[rowIndex]) updated[rowIndex] = {}
        const rowData = { ...updated[rowIndex] }

        if (typeof onSelect === 'function') {
          const customUpdates = onSelect(selectedItem, rowIndex, prevData)
          if (customUpdates && typeof customUpdates === 'object') {
            Object.assign(rowData, customUpdates)
          }
        } else {
          const code =
            selectedItem[columnKey] ||
            selectedItem.Code ||
            selectedItem.IdSeq ||
            selectedItem.UserId ||
            selectedItem.EmpCode ||
            selectedItem.Name ||
            ''
          rowData[columnKey] = code
        }

        const currentStatus = rowData.WorkingTag || rowData.Status || ''
        const nextStatus = currentStatus === 'A' ? 'A' : 'U'
        rowData.WorkingTag = nextStatus
        rowData.Status = nextStatus
        updated[rowIndex] = rowData
        return updated
      })

      closeCodeHelpModal()
    },
    [codeHelpModal, setGridData, closeCodeHelpModal]
  )

  const lastClickRef = useRef({ time: 0, cell: null })

  const onCellClicked = useCallback(
    (cell, event) => {
      if (!cell) return
      const [col, row] = cell
      if (row < 0 || row >= (gridData?.length || 0)) return
      const column = cols[col]
      const columnKey = column?.id || ''

      const now = Date.now()
      const isDouble =
        event?.detail === 2 ||
        (lastClickRef.current.cell &&
          lastClickRef.current.cell[0] === col &&
          lastClickRef.current.cell[1] === row &&
          now - lastClickRef.current.time < 350)

      lastClickRef.current = { time: now, cell }

      // Chỉ mở CodeHelp modal khi double click
      if (isDouble && isCodeHelpColumn(columnKey) && canEdit !== false) {
        const currentValue = gridData?.[row]?.[columnKey] || ''
        openCodeHelpModal(columnKey, row, String(currentValue))
      }
    },
    [cols, gridData, isCodeHelpColumn, canEdit, openCodeHelpModal]
  )

  const onCellActivated = useCallback(() => {
    // Chỉ kích hoạt khi người dùng chủ động nhấn F2 / Enter (trong onKeyDown) hoặc double-click (trong onCellClicked)
  }, [])

  const { copySelection } = useTableClipboard({
    gridData,
    cols,
    selection
  })

  const onKeyDown = useCallback(
    (event) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey
      const key = event.key ? event.key.toLowerCase() : ''

      // 1. Enter / F2: Mở Code Help Modal
      if (event.key === 'Enter' || event.key === 'F2') {
        const currentCell = selection?.current?.cell
        if (currentCell) {
          const [col, row] = currentCell
          if (row >= 0 && row < (gridData?.length || 0)) {
            const column = cols[col]
            const columnKey = column?.id || ''
            if (isCodeHelpColumn(columnKey) && canEdit !== false) {
              event.preventDefault()
              event.stopPropagation()
              const currentValue = gridData?.[row]?.[columnKey] || ''
              openCodeHelpModal(columnKey, row, String(currentValue))
            }
          }
        }
        return
      }

      // 2. Ctrl + A: Chỉ chọn vùng có dữ liệu thực tế (bỏ qua 50 dòng mẫu trống)
      if (isCtrlOrMeta && key === 'a' && !event.shiftKey && !event.altKey) {
        if (Array.isArray(gridData) && gridData.length > 0) {
          let lastRealIndex = -1
          for (let i = gridData.length - 1; i >= 0; i--) {
            const r = gridData[i]
            const tag = r?.WorkingTag || r?.Status
            if (
              r &&
              (r.Id ||
                r.IdRow ||
                r.IdSeq ||
                tag === 'U' ||
                tag === 'E' ||
                tag === 'D' ||
                (tag === 'A' &&
                  Object.keys(r).some(
                    (k) =>
                      ![
                        'Id',
                        'IdRow',
                        'IdSeq',
                        'CreatedBy',
                        'CreatedAt',
                        'UpdatedBy',
                        'UpdatedAt',
                        'isEdited',
                        'WorkingTag',
                        'Status',
                        'IdxNo',
                        'Idx'
                      ].includes(k) &&
                      r[k] !== '' &&
                      r[k] !== null &&
                      r[k] !== undefined
                  )))
            ) {
              lastRealIndex = i
              break
            }
          }

          if (lastRealIndex >= 0 && typeof setSelection === 'function') {
            event.preventDefault()
            event.stopPropagation()
            setSelection({
              columns: CompactSelection.empty().add([0, cols.length]),
              rows: CompactSelection.empty().add([0, lastRealIndex + 1])
            })
            return
          }
        }
      }

      // 3. Ctrl + Shift + C: Sao chép kèm tiêu đề cột
      if (isCtrlOrMeta && event.shiftKey && key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        copySelection({ includeHeaders: true })
        return
      }

      // 4. Ctrl + F: Tìm kiếm theo kiến trúc bộ lọc truy vấn (Query Bar)
      if (isCtrlOrMeta && key === 'f' && !event.shiftKey && !event.altKey) {
        const queryInput = document.querySelector(
          '.dynamic-query-bar input, [data-query-bar] input, input[placeholder*="Tìm"], input[placeholder*="Nhập"]'
        )
        if (queryInput) {
          event.preventDefault()
          event.stopPropagation()
          queryInput.focus()
          queryInput.select?.()
          return
        }
      }
    },
    [
      selection,
      cols,
      gridData,
      isCodeHelpColumn,
      canEdit,
      openCodeHelpModal,
      setSelection,
      copySelection
    ]
  )

  // Hover state
  const [hoverRow, setHoverRow] = useState(null)
  const onItemHovered = useCallback((args) => {
    const [, row] = args.location
    setHoverRow(args.kind !== 'cell' ? undefined : row)
  }, [])

  // Menu state & layer
  const [showMenu, setShowMenu] = useState(null)
  const onHeaderMenuClick = useCallback(
    (col, bounds) => {
      const colId = cols[col]?.id
      if (colId === 'WorkingTag' || colId === 'Status') {
        setShowMenu({ col, bounds, menuType: 'statusMenu' })
      } else {
        setShowMenu({ col, bounds, menuType: 'defaultMenu' })
      }
    },
    [cols]
  )

  const onHeaderContextMenu = useCallback(
    (col, event) => {
      event?.preventDefault?.()
      const bounds = event?.bounds || {
        x: event?.clientX || 0,
        y: event?.clientY || 0,
        width: 1,
        height: 1
      }
      const colId = cols[col]?.id
      if (colId === 'WorkingTag' || colId === 'Status') {
        setShowMenu({ col, bounds, menuType: 'statusMenu' })
      } else {
        setShowMenu({ col, bounds, menuType: 'defaultMenu' })
      }
    },
    [cols]
  )

  const onCellContextMenu = useCallback((cell, event) => {
    event?.preventDefault?.()
    const [col, row] = cell
    const bounds = event?.bounds || {
      x: event?.clientX || 0,
      y: event?.clientY || 0,
      width: 1,
      height: 1
    }
    setShowMenu({
      col,
      row,
      bounds,
      cell,
      menuType: 'contextMenu'
    })
  }, [])

  const { renderLayer, layerProps } = useLayer({
    isOpen: showMenu !== null,
    triggerOffset: 4,
    onOutsideClick: () => setShowMenu(null),
    trigger: {
      getBounds: () => ({
        bottom: (showMenu?.bounds.y ?? 0) + (showMenu?.bounds.height ?? 0),
        height: showMenu?.bounds.height ?? 0,
        left: showMenu?.bounds.x ?? 0,
        right: (showMenu?.bounds.x ?? 0) + (showMenu?.bounds.width ?? 0),
        top: showMenu?.bounds.y ?? 0,
        width: showMenu?.bounds.width ?? 0
      })
    },
    placement: 'bottom-start',
    auto: true,
    possiblePlacements: ['bottom-start', 'top-start', 'bottom-end', 'top-end']
  })

  // Hidden Columns State
  const [hiddenColumns, setHiddenColumns] = useState(() =>
    loadFromLocalStorageSheet(`H_ERP_COLS_${tableId}`, [])
  )

  const updateHiddenColumns = (newHiddenColumns) => {
    setHiddenColumns((prevHidden) => {
      const newHidden = [...new Set([...prevHidden, ...newHiddenColumns])]
      saveToLocalStorageSheet(`H_ERP_COLS_${tableId}`, newHidden)
      return newHidden
    })
  }

  const updateVisibleColumns = (newVisibleColumns) => {
    setCols((prevCols) => {
      const newCols = [...new Set([...prevCols, ...newVisibleColumns])]
      const uniqueCols = newCols.filter(
        (col, index, self) => index === self.findIndex((c) => c.id === col.id)
      )
      saveToLocalStorageSheet(`S_ERP_COLS_${tableId}`, uniqueCols)
      return uniqueCols
    })
  }

  const handleHideColumn = (colIndex) => {
    const columnId = cols[colIndex]?.id
    if (cols.length > 1) {
      updateHiddenColumns([columnId])
      setCols((prevCols) => {
        const newCols = prevCols.filter((_, idx) => idx !== colIndex)
        const uniqueCols = newCols.filter(
          (col, index, self) => index === self.findIndex((c) => c.id === col.id)
        )
        saveToLocalStorageSheet(`S_ERP_COLS_${tableId}`, uniqueCols)
        return uniqueCols
      })
      setShowMenu(null)
    }
  }

  // Danh sách các cột người dùng có thể cấu hình ẩn / hiện (loại bỏ Status và các cột ẩn hệ thống như IdSeq, RowVersion)
  const configurableCols = useMemo(() => {
    return filterConfigurableColumns(defaultCols)
  }, [defaultCols])

  const handleReset = () => {
    const visibleCols = ensureStatusFirstColumn(
      (defaultCols || []).filter((col) => col.visible && !isSystemHiddenColumn(col)),
      defaultCols
    )
    setCols(visibleCols)
    setHiddenColumns([])
    localStorage.removeItem(`S_ERP_COLS_${tableId}`)
    localStorage.removeItem(`H_ERP_COLS_${tableId}`)
  }

  const onColumnMoved = useCallback(
    (startIndex, endIndex) => {
      setCols((prevCols) => {
        const updatedCols = [...prevCols]
        const [movedColumn] = updatedCols.splice(startIndex, 1)
        updatedCols.splice(endIndex, 0, movedColumn)
        const finalCols = ensureStatusFirstColumn(updatedCols, defaultCols)
        saveToLocalStorageSheet(`S_ERP_COLS_${tableId}`, finalCols)
        return finalCols
      })
    },
    [setCols, tableId, defaultCols]
  )

  const onColumnResize = useCallback(
    (column, newSize) => {
      const index = cols.indexOf(column)
      if (index !== -1) {
        const newCol = { ...column, width: newSize }
        const newCols = [...cols]
        newCols.splice(index, 1, newCol)
        setCols(newCols)
      }
    },
    [cols, setCols]
  )

  // Sort
  const handleSort = (columnId, direction) => {
    setGridData((prevData) => {
      const rowsWithStatusA = prevData.filter((row) => (row.WorkingTag || row.Status) === 'A')
      const rowsWithoutStatusA = prevData.filter((row) => (row.WorkingTag || row.Status) !== 'A')

      const sortedData = rowsWithoutStatusA.sort((a, b) => {
        if (a[columnId] < b[columnId]) return direction === 'asc' ? -1 : 1
        if (a[columnId] > b[columnId]) return direction === 'asc' ? 1 : -1
        return 0
      })

      const updatedData = updateIndexNo([...sortedData, ...rowsWithStatusA])
      return updatedData
    })
    setShowMenu(null)
  }

  // Drawer state
  const [openDrawer, setOpenDrawer] = useState(false)
  const showDrawer = () => {
    const invisibleCols = (defaultCols || [])
      .filter((col) => col.visible === false && !isSystemHiddenColumn(col))
      .map((col) => col.id)
    const currentVisibleCols = loadFromLocalStorageSheet(`S_ERP_COLS_${tableId}`, []).map(
      (col) => col.id
    )
    const newInvisibleCols = invisibleCols.filter((col) => !currentVisibleCols.includes(col))
    updateHiddenColumns(newInvisibleCols)
    updateVisibleColumns(
      ensureStatusFirstColumn(
        (defaultCols || []).filter(
          (col) => col.visible && !hiddenColumns.includes(col.id) && !isSystemHiddenColumn(col)
        ),
        defaultCols
      )
    )
    setOpenDrawer(true)
  }

  const handleCheckboxChange = (columnId, isChecked) => {
    if (isSystemHiddenColumn(columnId)) return

    if (isChecked) {
      const restoredColumn = defaultCols.find((col) => col.id === columnId)
      if (!restoredColumn) return
      setCols((prevCols) => {
        const newCols = ensureStatusFirstColumn([...prevCols, restoredColumn], defaultCols)
        saveToLocalStorageSheet(`S_ERP_COLS_${tableId}`, newCols)
        return newCols
      })
      setHiddenColumns((prevHidden) => {
        const newHidden = prevHidden.filter((id) => id !== columnId)
        saveToLocalStorageSheet(`H_ERP_COLS_${tableId}`, newHidden)
        return newHidden
      })
    } else {
      setCols((prevCols) => {
        const newCols = ensureStatusFirstColumn(
          prevCols.filter((col) => col.id !== columnId),
          defaultCols
        )
        saveToLocalStorageSheet(`S_ERP_COLS_${tableId}`, newCols)
        return newCols
      })
      setHiddenColumns((prevHidden) => {
        const newHidden = [...prevHidden, columnId]
        saveToLocalStorageSheet(`H_ERP_COLS_${tableId}`, newHidden)
        return newHidden
      })
    }
  }

  // Keybindings
  const [keybindings] = useState({
    downFill: true,
    rightFill: true,
    selectColumn: true
  })

  // Hàm focus thông minh từ cột đang chọn trên Sheet đến ô Input tương ứng trong điều kiện truy vấn
  const handleSmartFocusQuery = useCallback(() => {
    let colIdx = null
    if (selection?.columns && typeof selection.columns.first === 'function') {
      colIdx = selection.columns.first()
    }
    if ((colIdx === null || colIdx === undefined) && selection?.current?.cell) {
      colIdx = selection.current.cell[0]
    }

    const activeCol = colIdx !== null && colIdx !== undefined ? cols?.[colIdx] : null
    const columnKey = activeCol?.id || ''
    const colTitle = activeCol?.title || columnKey
    const normalizedColKey = columnKey.toLowerCase()

    if (
      !columnKey ||
      columnKey === 'WorkingTag' ||
      columnKey === 'Status' ||
      columnKey === 'StatusAcc' ||
      columnKey === 'userStatus' ||
      columnKey === 'IndexNo' ||
      columnKey === 'IdSeq'
    ) {
      if (!columnKey && setStatusMessage) {
        setStatusMessage({
          type: 'info',
          text: 'Vui lòng chọn một cột trên bảng để tìm kiếm.'
        })
      }
      return
    }

    let targetInput = null

    // 1. Chỉ tìm ô input có data-query-key hoặc id khớp chính xác với cột đó
    targetInput =
      document.querySelector(`[data-query-key="${normalizedColKey}"]`) ||
      document.getElementById(`query-input-${columnKey}`) ||
      document.getElementById(`query-input-${normalizedColKey}`)

    // Nếu có ô tìm kiếm -> Focus vào ô đó. Nếu chưa có và hỗ trợ thêm động -> Thêm lên thanh truy vấn
    if (targetInput) {
      targetInput.focus()
      if (typeof targetInput.select === 'function') {
        targetInput.select()
      }
      targetInput.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    } else if (onAddQueryField) {
      onAddQueryField(columnKey, colTitle, activeCol)
      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: `Đã thêm "${colTitle}" lên điều kiện truy vấn.`
        })
      }
      setTimeout(() => {
        const newInput =
          document.querySelector(`[data-query-key="${normalizedColKey}"]`) ||
          document.getElementById(`query-input-${columnKey}`) ||
          document.getElementById(`query-input-${normalizedColKey}`)
        if (newInput) {
          newInput.focus()
          if (typeof newInput.select === 'function') {
            newInput.select()
          }
          newInput.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
        }
      }, 80)
    } else {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: `Cột "${colTitle}" không có trong điều kiện truy vấn!`
        })
      }
    }
  }, [selection, cols, setStatusMessage, onAddQueryField])

  // Hotkeys (Ctrl + F: Nhảy thẳng đến ô input tương ứng trong điều kiện truy vấn)
  useEffect(() => {
    let unsubscribeFind = null
    let unsubscribeApp = null

    if (window.electron) {
      if (window.electron.onActionFind) {
        unsubscribeFind = window.electron.onActionFind(() => {
          handleSmartFocusQuery()
        })
      }
      if (window.electron.onAppAction) {
        unsubscribeApp = window.electron.onAppAction((action) => {
          if (action === 'find') {
            handleSmartFocusQuery()
          }
        })
      }
    }

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        e.stopPropagation()
        handleSmartFocusQuery()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      if (unsubscribeFind) unsubscribeFind()
      if (unsubscribeApp) unsubscribeApp()
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleSmartFocusQuery])

  return {
    // Theme & styling
    getCellTheme,
    isCodeHelpColumn,
    isReadOnlyColumn,
    isEditableColumn,
    gridTheme,
    codeHelpBg: effectiveCodeHelpBg,
    readOnlyBg: effectiveReadOnlyBg,

    // CodeHelp Modal handlers
    onCellClicked,
    onCellActivated,
    onKeyDown,
    openCodeHelpModal,
    closeCodeHelpModal,
    handleSelectCodeHelp,
    codeHelpModal,
    codeHelpModalProps: {
      isOpen: Boolean(codeHelpModal.isOpen),
      onClose: closeCodeHelpModal,
      onSelect: handleSelectCodeHelp,
      title: codeHelpModal.title,
      helpData: codeHelpModal.helpData,
      fetchHelpData: codeHelpModal.fetchHelpData,
      columns: codeHelpModal.columns,
      initialSearchText: codeHelpModal.initialSearchText
    },

    // Sheet manager interactions
    hoverRow,
    onItemHovered,
    showMenu,
    setShowMenu,
    onHeaderMenuClick,
    layerProps,
    renderLayer,
    hiddenColumns,
    handleHideColumn,
    handleReset,
    onColumnMoved,
    onColumnResize,
    handleSort,
    openDrawer,
    setOpenDrawer,
    showDrawer,
    handleCheckboxChange,
    configurableCols,
    isSystemHiddenColumn,
    keybindings,
    onCellContextMenu,
    onHeaderContextMenu
  }
}
