/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import {
  CheckSquareOutlined,
  BorderOutlined,
  UnlockOutlined,
  LockOutlined,
  AppstoreOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { usePageData } from '../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'

const BOOLEAN_COLS = new Set(['View', 'Create', 'Edit', 'Delete', 'Import', 'Export', 'CanPrint'])

export default function RoleMenuTable({
  setSelection,
  selection,
  setShowSearch,
  showSearch,
  setGridData,
  gridData = [],
  numRows,
  setNumRows,
  setCols,
  cols = [],
  canEdit = true,
  defaultCols = [],
  selectedGroupId,
  selectedRootMenuId = 1,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])
  const {
    freezeColumnsCount,
    handleFreezeColumn,
    rowHeight,
    headerHeight,
    overscrollX,
    overscrollY
  } = useTableConfig('role_menu_perms')

  const handleAddQueryFieldWrapper = useCallback(
    (columnKey, colTitle, activeCol) => {
      if (onAddQueryField) {
        onAddQueryField(columnKey, colTitle, activeCol, 'menu', 'Menu')
      }
    },
    [onAddQueryField]
  )

  const {
    showMenu,
    setShowMenu,
    onHeaderMenuClick,
    layerProps,
    renderLayer,
    handleHideColumn,
    handleReset,
    onColumnMoved,
    onColumnResize,
    onCellContextMenu,
    onCellClicked: baseOnCellClicked,
    onCellActivated,
    onKeyDown,
    getCellTheme,
    gridTheme,
    isReadOnlyColumn,
    onItemHovered
  } = useTableManager({
    tableId: 'role_menu_perms',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    onAddQueryField: handleAddQueryFieldWrapper
  })

  // Chọn nhanh toàn bộ quyền theo cột
  const handleBatchToggleColumn = useCallback(
    (columnKey, value) => {
      if (!canEdit) return
      setGridData((prev) => {
        return prev.map((row) => {
          if (!row || row.Id === undefined) return row
          const curStatus = row.WorkingTag || row.Status || ''
          return {
            ...row,
            [columnKey]: value,
            WorkingTag: curStatus === 'A' ? 'A' : 'U',
            Status: curStatus === 'A' ? 'A' : 'U',
            isEdited: true
          }
        })
      })
    },
    [canEdit, setGridData]
  )

  // Cấp toàn quyền hoặc xóa toàn quyền cho tất cả các dòng
  const handleBatchAllPermissions = useCallback(
    (allowAll = true) => {
      if (!canEdit) return
      setGridData((prev) => {
        return prev.map((row) => {
          if (!row || row.Id === undefined) return row
          const curStatus = row.WorkingTag || row.Status || ''
          return {
            ...row,
            View: allowAll,
            Create: allowAll,
            Edit: allowAll,
            Delete: allowAll,
            Import: allowAll,
            Export: allowAll,
            WorkingTag: curStatus === 'A' ? 'A' : 'U',
            Status: curStatus === 'A' ? 'A' : 'U',
            isEdited: true
          }
        })
      })
    },
    [canEdit, setGridData]
  )

  const onCellClicked = useCallback(
    (cell, event) => {
      if (baseOnCellClicked) {
        baseOnCellClicked(cell, event)
      }
    },
    [baseOnCellClicked]
  )

  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_COLS.has(columnKey)
      const isReadOnly =
        (isReadOnlyColumn && isReadOnlyColumn(columnKey, column)) || column.readonly || false
      const cellTheme = getCellTheme ? getCellTheme(columnKey, column) : {}
      return {
        columnKey,
        isStatus,
        isBoolean,
        isReadOnly,
        cellTheme,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  const getCellContent = useCallback(
    ([col, row]) => {
      const rowData = gridData[row] || {}
      const meta = colMetadata[col]

      if (!meta) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          allowOverlay: false,
          readonly: true
        }
      }

      const { columnKey, isStatus, isBoolean, isReadOnly, cellTheme } = meta
      let val = rowData[columnKey]
      if (val === undefined || val === null || val === '') {
        if (columnKey === 'MenuLabel') {
          val = rowData.Label || rowData.Name || ''
        } else if (columnKey === 'MenuKey') {
          val = rowData.Key || ''
        } else if (columnKey === 'MenuType') {
          val = rowData.Type || 'menu'
        } else if (columnKey === 'MenuId') {
          val = rowData.Id || ''
        }
      }
      if (val === undefined || val === null) {
        val = ''
      }

      const isSubmenu = rowData.Type === 'submenu' || rowData.MenuType === 'submenu' || rowData.Level === 0
      let customTheme = { ...cellTheme }
      if (isSubmenu) {
        customTheme = {
          ...customTheme,
          bgCell: '#f1f5f9',
          textDark: '#0f172a',
          baseFontStyle: 'bold 12px'
        }
      }

      if (isStatus) {
        const status = String(val)
        let bg = customTheme.bgCell || '#FFFFFF'
        let text = '#225588'
        if (status === 'A') {
          bg = '#ebfbee'
          text = '#2b8a3e'
        } else if (status === 'U') {
          bg = '#fff9db'
          text = '#e67700'
        } else if (status === 'D') {
          bg = '#fff5f5'
          text = '#e03131'
        }
        return {
          kind: GridCellKind.Text,
          data: status,
          displayData: status,
          allowOverlay: false,
          readonly: true,
          themeOverride: {
            ...customTheme,
            bgCell: bg,
            textDark: text,
            baseFontStyle: '600 12px'
          }
        }
      }

      if (isBoolean) {
        const boolVal =
          val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          allowOverlay: false,
          readonly: !canEdit || isReadOnly,
          themeOverride: customTheme
        }
      }

      return {
        kind: GridCellKind.Text,
        data: String(val),
        displayData: String(val),
        allowOverlay: !isReadOnly && canEdit,
        readonly: isReadOnly || !canEdit,
        themeOverride: customTheme
      }
    },
    [colMetadata, gridData, canEdit]
  )

  const onCellEdited = useCallback(
    ([col, row], cell) => {
      if (!canEdit) return
      const colId = cols[col]?.id
      if (!colId || colId === 'WorkingTag' || colId === 'Status') return

      const isBoolCol = BOOLEAN_COLS.has(colId)
      let newVal = cell.data
      if (isBoolCol) {
        newVal = Boolean(cell.data)
      } else {
        newVal = cell.data ?? ''
      }

      setGridData((prev) => {
        const updated = [...prev]
        const currentRow = { ...(updated[row] || {}) }
        const oldVal = currentRow[colId]
        const oldBoolVal =
          oldVal === true ||
          oldVal === 1 ||
          oldVal === '1' ||
          String(oldVal).toLowerCase() === 'true'
        const isChanged = isBoolCol
          ? oldBoolVal !== newVal
          : String(oldVal ?? '') !== String(newVal ?? '')

        if (isChanged) {
          currentRow[colId] = newVal
          const curStatus = currentRow.WorkingTag || currentRow.Status || ''
          if (!curStatus || curStatus === '') {
            currentRow.WorkingTag = 'U'
            currentRow.Status = 'U'
          }
          if (selectedGroupId && !currentRow.GroupId) {
            currentRow.GroupId = selectedGroupId
          }
          currentRow.isEdited = true
          updated[row] = currentRow
        }
        return updated
      })
    },
    [cols, canEdit, selectedGroupId, setGridData]
  )

  // Kéo thả một loạt (Fill handle / Drag-fill) cho cả checkbox và text chuẩn Glide Data Grid
  const onFillPattern = useCallback(
    (arg1, arg2) => {
      if (!canEdit) return
      const patternSource = arg1?.patternSource || arg1
      const fillDestination = arg1?.fillDestination || arg2
      if (!patternSource || !fillDestination) return

      setGridData((prev) => {
        const updated = [...prev]

        for (let dy = 0; dy < fillDestination.height; dy++) {
          const targetRow = fillDestination.y + dy
          if (targetRow < 0) continue
          if (!updated[targetRow]) updated[targetRow] = {}
          const rowObj = { ...updated[targetRow] }
          let rowChanged = false

          const srcPatternY = patternSource.y + (dy % patternSource.height)
          const srcRow = prev[srcPatternY] || {}

          for (let dx = 0; dx < fillDestination.width; dx++) {
            const targetCol = fillDestination.x + dx
            const colObj = cols[targetCol]
            const colKey = colObj?.id
            if (
              !colKey ||
              colKey === 'WorkingTag' ||
              colKey === 'Status' ||
              colKey === 'Id' ||
              colObj.readonly
            )
              continue

            const srcPatternX = patternSource.x + (dx % patternSource.width)
            const srcColKey = cols[srcPatternX]?.id
            if (!srcColKey) continue

            const sourceVal = srcRow[srcColKey]
            const isBoolCol = BOOLEAN_COLS.has(colKey)

            if (isBoolCol) {
              const boolVal = Boolean(
                sourceVal === true ||
                sourceVal === 1 ||
                sourceVal === '1' ||
                String(sourceVal).toLowerCase() === 'true'
              )
              const oldBool =
                rowObj[colKey] === true ||
                rowObj[colKey] === 1 ||
                rowObj[colKey] === '1' ||
                String(rowObj[colKey]).toLowerCase() === 'true'
              if (oldBool !== boolVal) {
                rowObj[colKey] = boolVal
                rowChanged = true
              }
            } else {
              if (String(rowObj[colKey] ?? '') !== String(sourceVal ?? '')) {
                rowObj[colKey] = sourceVal ?? ''
                rowChanged = true
              }
            }
          }

          if (rowChanged) {
            const curStatus = rowObj.WorkingTag || rowObj.Status || ''
            if (!curStatus || curStatus === '') {
              rowObj.WorkingTag = 'U'
              rowObj.Status = 'U'
            }
            if (selectedGroupId && !rowObj.GroupId) {
              rowObj.GroupId = selectedGroupId
            }
            rowObj.isEdited = true
            updated[targetRow] = rowObj
          }
        }
        return updated
      })
    },
    [canEdit, cols, selectedGroupId, setGridData]
  )

  const onPaste = useCallback(
    (target, values) => {
      if (!values || values.length === 0 || canEdit === false) {
        return false
      }

      const [startCol, startRow] = target
      const indexes = reorderColumns(cols)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

      if (numPastedRows > 3000) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'error',
            text: t(
              'Số lượng dòng dán ({{count}} dòng) vượt quá giới hạn tối đa cho phép (3,000 dòng)! Vui lòng chia nhỏ dữ liệu.',
              { count: numPastedRows.toLocaleString() }
            )
          })
        }
        return false
      }

      const isBatch = numPastedRows >= 10 || numPastedRows * numPastedCols >= 50
      if (isBatch) {
        const msg = t('Đang xử lý dán {{count}} dòng dữ liệu... Vui lòng không thao tác', {
          count: numPastedRows.toLocaleString()
        })
        togglePageInteraction(true, msg)
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'info',
            text: msg
          })
        }
      }

      try {
        setGridData((prevData) => {
          const requiredLength = Math.max(prevData.length, startRow + numPastedRows)
          const nextData = new Array(requiredLength)

          for (let r = 0; r < startRow; r++) {
            nextData[r] = prevData[r] || {}
          }

          for (let r = 0; r < numPastedRows; r++) {
            const targetRow = startRow + r
            const originalRow = prevData[targetRow] || {}
            const modifiedRow = { ...originalRow }
            const rowVals = values[r] || []
            let isRowChanged = false

            for (let c = 0; c < numPastedCols; c++) {
              const targetCol = startCol + c
              if (targetCol >= cols.length) break
              const colKey = indexes[targetCol]
              if (!colKey || colKey === 'WorkingTag' || colKey === 'Status' || colKey === 'Id')
                continue

              let rawVal = rowVals[c] ?? ''
              if (BOOLEAN_COLS.has(colKey)) {
                rawVal =
                  rawVal === true ||
                  rawVal === 1 ||
                  rawVal === '1' ||
                  String(rawVal).toLowerCase() === 'true' ||
                  String(rawVal).toLowerCase() === 'v'
              }

              if (modifiedRow[colKey] !== rawVal) {
                modifiedRow[colKey] = rawVal
                isRowChanged = true
              }
            }

            if (isRowChanged) {
              const curStatus = modifiedRow.WorkingTag || modifiedRow.Status || ''
              if (!curStatus || curStatus === '') {
                modifiedRow.WorkingTag = 'U'
                modifiedRow.Status = 'U'
              }
              if (selectedGroupId && !modifiedRow.GroupId) {
                modifiedRow.GroupId = selectedGroupId
              }
              modifiedRow.isEdited = true
            }

            nextData[targetRow] = modifiedRow
          }

          for (let r = startRow + numPastedRows; r < prevData.length; r++) {
            nextData[r] = prevData[r]
          }

          return nextData
        })

        setNumRows((prev) => Math.max(prev, startRow + numPastedRows))
        return true
      } finally {
        if (isBatch) {
          togglePageInteraction(false)
        }
      }
    },
    [canEdit, cols, selectedGroupId, setGridData, setNumRows, setStatusMessage, t]
  )

  return (
    <div className="flex flex-col h-full w-full bg-white relative overflow-hidden">
      {/* DATA EDITOR BẢNG PHÂN QUYỀN TOÀN MÀN HÌNH */}
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          rows={numRows}
          columns={cols}
          getCellContent={getCellContent}
          getCellsForSelection={true}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onKeyDown={onKeyDown}
          onItemHovered={onItemHovered}
          fillHandle={true}
          onFillPattern={onFillPattern}
          theme={gridTheme}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          onPaste={onPaste}
          onHeaderMenuClick={onHeaderMenuClick}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onCellContextMenu={onCellContextMenu}
          freezeColumns={freezeColumnsCount}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          rowMarkers="both"
          rowHeight={rowHeight || 23}
          headerHeight={headerHeight || 23}
          overscrollX={overscrollX || 50}
          overscrollY={overscrollY || 20}
          smoothScrollX={true}
          smoothScrollY={true}
        />
      </div>

      {showMenu !== null &&
        renderLayer(
          <div {...layerProps} className="z-[9999] outline-none">
            {showMenu.menuType === 'statusMenu' ? (
              <LayoutStatusMenuSheet
                showMenu={showMenu}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={setShowMenu}
                handleReset={handleReset}
                data={gridData}
              />
            ) : showMenu.menuType === 'contextMenu' ? (
              <LayoutContextMenuSheet
                showMenu={showMenu}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={setShowMenu}
                data={gridData}
                selection={selection}
                canCreate={false}
              />
            ) : (
              <LayoutMenuSheet
                showMenu={showMenu}
                handleHideColumn={handleHideColumn}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={setShowMenu}
                handleFreezeColumn={handleFreezeColumn}
              />
            )}
          </div>
        )}
    </div>
  )
}
