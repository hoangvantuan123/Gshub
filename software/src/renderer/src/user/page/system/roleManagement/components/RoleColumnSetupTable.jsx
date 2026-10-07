/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'

const BOOLEAN_COLS = new Set(['Visible', 'MaskValue'])

export default function RoleColumnSetupTable({
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
  selectedMenuId,
  selectedMenuName,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const gridRef = useRef(null)

  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])
  const {
    freezeColumnsCount,
    handleFreezeColumn,
    rowHeight,
    headerHeight,
    overscrollX,
    overscrollY
  } = useTableConfig('role_column_setup')

  const handleAddQueryFieldWrapper = useCallback(
    (columnKey, colTitle, activeCol) => {
      if (onAddQueryField) {
        onAddQueryField(columnKey, colTitle, activeCol, 'column', 'Setup Cột')
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
    onHeaderContextMenu,
    onCellContextMenu,
    onCellClicked,
    onCellActivated,
    onKeyDown,
    getCellTheme,
    gridTheme,
    isReadOnlyColumn,
    onItemHovered
  } = useTableManager({
    tableId: 'role_column_setup',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    numRows,
    setNumRows,
    selection,
    setSelection,
    canEdit,
    statusMenuOptions: {
      canInsert: false,
      canDelete: canEdit,
      canRestore: canEdit
    },
    onAddQueryField: handleAddQueryFieldWrapper
  })

  const getCellContent = useCallback(
    ([col, row]) => {
      const colDef = cols[col]
      if (!colDef) return { kind: GridCellKind.Loading, allowOverlay: false }

      const rowData = gridData[row] || {}
      const colId = colDef.id
      const cellValue = rowData[colId]

      if (BOOLEAN_COLS.has(colId)) {
        const isChecked = Boolean(cellValue)
        return {
          kind: GridCellKind.Boolean,
          data: isChecked,
          allowOverlay: false,
          readonly: !canEdit || isReadOnlyColumn(colId, rowData)
        }
      }

      const displayValue = cellValue === null || cellValue === undefined ? '' : String(cellValue)

      return {
        kind: GridCellKind.Text,
        data: displayValue,
        displayData: displayValue,
        allowOverlay: false,
        readonly: !canEdit || isReadOnlyColumn(colId, rowData),
        themeOverride: getCellTheme(colId, rowData)
      }
    },
    [cols, gridData, canEdit, isReadOnlyColumn, getCellTheme]
  )

  const onCellEdited = useCallback(
    ([col, row], newVal) => {
      if (!canEdit) return

      const colDef = cols[col]
      if (!colDef) return
      const colId = colDef.id

      setGridData((prev) => {
        const next = [...prev]
        if (!next[row]) next[row] = {}
        const oldRow = next[row]
        let val = newVal.data

        if (BOOLEAN_COLS.has(colId)) {
          val = Boolean(val)
        }

        const statusVal = oldRow.WorkingTag || oldRow.Status || 'U'
        next[row] = {
          ...oldRow,
          [colId]: val,
          WorkingTag: statusVal,
          Status: statusVal,
          MenuId: selectedMenuId,
          MenuName: selectedMenuName
        }
        return next
      })
    },
    [canEdit, cols, setGridData, selectedMenuId, selectedMenuName]
  )

  const onCellClickedInternal = useCallback(
    (cell, event) => {
      const [colIndex, rowIndex] = cell
      const colDef = cols[colIndex]
      const colId = colDef?.id
      if (colId && BOOLEAN_COLS.has(colId) && canEdit) {
        const rowData = gridData[rowIndex]
        if (rowData) {
          const currentVal = Boolean(rowData[colId])
          const nextVal = !currentVal
          setGridData((prev) => {
            const next = [...prev]
            if (!next[rowIndex]) return prev
            const statusVal = next[rowIndex].WorkingTag || next[rowIndex].Status || 'U'
            next[rowIndex] = {
              ...next[rowIndex],
              [colId]: nextVal,
              WorkingTag: statusVal,
              Status: statusVal,
              isEdited: true
            }
            return next
          })
          return
        }
      }
      if (onCellClicked) onCellClicked(cell, event)
    },
    [cols, canEdit, gridData, onCellClicked, setGridData]
  )

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-white overflow-hidden select-none">
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          columns={cols}
          rows={numRows}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClickedInternal}
          onCellActivated={onCellActivated}
          onKeyDown={onKeyDown}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          rowMarkers="both"
          headerHeight={headerHeight || 23}
          rowHeight={rowHeight || 23}
          overscrollX={overscrollX || 50}
          overscrollY={overscrollY || 20}
          theme={gridTheme}
          freezeColumns={freezeColumnsCount}
          onHeaderMenuClick={onHeaderMenuClick}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onHeaderContextMenu={onHeaderContextMenu}
          onCellContextMenu={onCellContextMenu}
          getCellTheme={getCellTheme}
          onItemHovered={onItemHovered}
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
