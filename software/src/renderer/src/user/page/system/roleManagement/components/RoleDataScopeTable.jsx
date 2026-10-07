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

const BOOLEAN_COLS = new Set(['Allow'])

export default function RoleDataScopeTable({
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
  } = useTableConfig('role_data_scope')

  const handleAddQueryFieldWrapper = useCallback(
    (columnKey, colTitle, activeCol) => {
      if (onAddQueryField) {
        onAddQueryField(columnKey, colTitle, activeCol, 'data_scope', 'Phạm Vi Dữ Liệu')
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
    tableId: 'role_data_scope',
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

  const colMetadata = useMemo(() => {
    return cols.map((c) => ({
      key: c.id,
      isBoolean: BOOLEAN_COLS.has(c.id),
      readonly: c.readonly
    }))
  }, [cols])

  const onCellClickedInternal = useCallback(
    (cell, event) => {
      const [colIndex, rowIndex] = cell
      const meta = colMetadata[colIndex]
      if (meta && meta.isBoolean && canEdit) {
        const rowData = gridData[rowIndex]
        if (rowData) {
          const currentVal = rowData[meta.key] !== false
          const nextVal = !currentVal
          setGridData((prev) => {
            const next = [...prev]
            const targetRow = { ...next[rowIndex] }
            targetRow[meta.key] = nextVal
            const curStatus = targetRow.WorkingTag || targetRow.Status || ''
            if (!curStatus) {
              targetRow.WorkingTag = 'U'
              targetRow.Status = 'U'
            }
            targetRow.isEdited = true
            next[rowIndex] = targetRow
            return next
          })
          return
        }
      }
      if (onCellClicked) onCellClicked(cell, event)
    },
    [colMetadata, canEdit, gridData, onCellClicked, setGridData]
  )

  const getCellContent = useCallback(
    ([col, row]) => {
      const rowData = gridData[row]
      const meta = colMetadata[col]

      if (!rowData || !meta) {
        return {
          kind: GridCellKind.Text,
          allowOverlay: false,
          readonly: true,
          displayData: '',
          data: ''
        }
      }

      const key = meta.key
      const val = rowData[key]

      if (key === 'WorkingTag' || key === 'Status') {
        const curStatus = rowData.WorkingTag || rowData.Status || ''
        const isNew = curStatus === 'I' || curStatus === 'A'
        const isUpdated = curStatus === 'U'
        const isDeleted = curStatus === 'D'
        const statusText = isNew ? '*' : isUpdated ? 'U' : isDeleted ? 'D' : ''
        return {
          kind: GridCellKind.Text,
          allowOverlay: false,
          readonly: true,
          displayData: statusText,
          data: statusText,
          themeOverride: {
            textDark: isNew ? '#16a34a' : isUpdated ? '#2563eb' : isDeleted ? '#dc2626' : '#64748b',
            baseFontStyle: '700 13px'
          }
        }
      }

      if (meta.isBoolean) {
        const isChecked = val !== false
        return {
          kind: GridCellKind.Boolean,
          data: isChecked,
          allowOverlay: false,
          readonly: !canEdit || meta.readonly
        }
      }

      let displayStr = val !== undefined && val !== null ? String(val) : ''
      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        readonly: isReadOnlyColumn(col, row),
        displayData: displayStr,
        data: displayStr
      }
    },
    [colMetadata, gridData, isReadOnlyColumn, canEdit]
  )

  const onCellEdited = useCallback(
    (cell, newValue) => {
      if (!canEdit) return
      const [col, row] = cell
      const meta = colMetadata[col]
      if (!meta || meta.readonly) return

      const key = meta.key
      const val = newValue.data

      setGridData((prev) => {
        const next = [...prev]
        if (!next[row]) return prev
        const updatedRow = { ...next[row] }
        updatedRow[key] = val
        const curStatus = updatedRow.WorkingTag || updatedRow.Status || ''
        if (!curStatus) {
          updatedRow.WorkingTag = 'U'
          updatedRow.Status = 'U'
        }
        updatedRow.isEdited = true
        next[row] = updatedRow
        return next
      })
    },
    [canEdit, colMetadata, setGridData]
  )

  return (
    <div className="h-full w-full flex flex-col min-h-0 bg-white overflow-hidden select-none">
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          columns={cols}
          rows={numRows}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClickedInternal}
          onCellActivated={onCellActivated}
          onKeyDown={onKeyDown}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          rowMarkers="clickable-number"
          width="100%"
          height="100%"
          headerHeight={headerHeight || 23}
          rowHeight={rowHeight || 23}
          freezeColumns={freezeColumnsCount}
          overscrollX={overscrollX || 50}
          overscrollY={overscrollY || 20}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderContextMenu={onHeaderContextMenu}
          onCellContextMenu={onCellContextMenu}
          getCellTheme={getCellTheme}
          theme={gridTheme}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          onItemHovered={onItemHovered}
          smoothScrollX
          smoothScrollY
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
