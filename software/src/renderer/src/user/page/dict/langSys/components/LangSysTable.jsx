import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from 'antd'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useOnFill from '../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { useDateFormat } from '../../../../hooks/useDateFormat'
import { usePageData } from '../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'

const EMPTY_ARRAY = []
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])

export default function LangSysTable({
  tableTitle,
  setSelection,
  selection,
  setShowSearch,
  showSearch,
  setGridData,
  gridData = [],
  numRows,
  setNumRows,
  handleRowAppend,
  setCols,
  cols = [],
  canEdit,
  canCreate,
  defaultCols,
  onVisibleRegionChanged,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('PAGE_LANG_SYS')

  const {
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
    openDrawer: open,
    setOpenDrawer: setOpen,
    showDrawer,
    handleCheckboxChange,
    configurableCols,
    keybindings,
    getCellTheme,
    isReadOnlyColumn,
    gridTheme,
    onCellClicked,
    onCellActivated,
    onKeyDown,
    onCellContextMenu,
    onHeaderContextMenu
  } = useTableManager({
    tableId: 'PAGE_LANG_SYS',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    setShowSearch,
    onAddQueryField
  })

  const onClose = () => setOpen(false)

  // Pre-compute metadata cho các cột
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isBoolean = column.kind === 'Boolean'
      const isDate =
        DATE_KEYS.has(columnKey) || columnKey.endsWith('Date') || columnKey.endsWith('At')
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || false

      return {
        columnKey,
        isStatus,
        isBoolean,
        isDate,
        cellTheme,
        isReadOnly
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  const getCellContent = useCallback(
    ([colIdx, rowIdx]) => {
      const row = gridData[rowIdx] || {}
      const meta = colMetadata[colIdx]

      if (!meta) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          allowOverlay: false,
          readonly: true
        }
      }

      const { columnKey, isStatus, isBoolean, isDate, cellTheme, isReadOnly } = meta
      const rawVal = row[columnKey]

      if (isStatus) {
        const val = rawVal || ''
        return {
          kind: GridCellKind.Text,
          data: val,
          displayData: val,
          allowOverlay: false,
          readonly: true,
          themeOverride: cellTheme
        }
      }

      if (isBoolean) {
        const boolVal = rawVal === true || rawVal === 1 || rawVal === '1' || rawVal === 'true'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          allowOverlay: false,
          readonly: isReadOnly || !canEdit,
          themeOverride: cellTheme
        }
      }

      if (isDate) {
        const dateStr = rawVal ? formatDateTime(rawVal) : ''
        return {
          kind: GridCellKind.Text,
          data: dateStr,
          displayData: dateStr,
          allowOverlay: !isReadOnly && canEdit,
          readonly: isReadOnly || !canEdit,
          themeOverride: cellTheme
        }
      }

      const display = rawVal !== undefined && rawVal !== null ? String(rawVal) : ''
      return {
        kind: GridCellKind.Text,
        data: display,
        displayData: display,
        allowOverlay: !isReadOnly && canEdit,
        readonly: isReadOnly || !canEdit,
        themeOverride: cellTheme
      }
    },
    [gridData, colMetadata, canEdit, formatDateTime]
  )

  const onCellEdited = useCallback(
    ([colIdx, rowIdx], newValue) => {
      if (!canEdit) return

      const col = cols[colIdx]
      if (!col) return

      const colKey = col.id
      if (colKey === 'WorkingTag' || colKey === 'Status' || colKey === 'LanguageSeq') return

      let updatedVal = newValue.data
      if (col.kind === 'Boolean') {
        updatedVal = Boolean(newValue.data)
      } else if (typeof updatedVal === 'string') {
        updatedVal = updatedVal.trim()
      }

      setGridData((prev) => {
        const next = [...prev]
        const currentRow = next[rowIdx] || {}
        const currentVal = currentRow[colKey]

        if (currentVal === updatedVal) return prev

        const currentStatus = currentRow.WorkingTag || currentRow.Status || ''
        let newStatus = currentStatus
        if (!currentStatus || currentStatus === '' || currentStatus === 'R') {
          newStatus = 'U'
        }

        next[rowIdx] = {
          ...currentRow,
          [colKey]: updatedVal,
          WorkingTag: newStatus,
          Status: newStatus
        }
        return next
      })
    },
    [canEdit, cols, setGridData]
  )

  return (
    <div className="relative w-full h-full flex flex-col bg-white">
      <div className="flex-1 w-full min-h-0 relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          rows={numRows}
          columns={cols}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onKeyDown={onKeyDown}
          onCellContextMenu={onCellContextMenu}
          onHeaderContextMenu={onHeaderContextMenu}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          onHeaderMenuClick={onHeaderMenuClick}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          freezeColumns={freezeColumnsCount}
          onVisibleRegionChanged={onVisibleRegionChanged}
          onRowAppended={handleRowAppend}
          theme={gridTheme}
          keybindings={keybindings}
          onFill={onFill}
          getCellsForSelection={true}
          smoothScrollX={true}
          smoothScrollY={true}
        />
      </div>

      {showMenu &&
        renderLayer(
          <div {...layerProps} className="z-50">
            {showMenu.menuType === 'status' ? (
              <LayoutStatusMenuSheet
                showMenu={showMenu}
                handleSort={handleSort}
                setShowMenu={setShowMenu}
                handleHideColumn={handleHideColumn}
                handleReset={handleReset}
              />
            ) : (
              <LayoutMenuSheet
                showMenu={showMenu}
                handleSort={handleSort}
                setShowMenu={setShowMenu}
                handleHideColumn={handleHideColumn}
                handleReset={handleReset}
              />
            )}
          </div>
        )}

      <LayoutContextMenuSheet
        tableId="PAGE_LANG_SYS"
        gridData={gridData}
        setGridData={setGridData}
        selection={selection}
        setSelection={setSelection}
        numRows={numRows}
        setNumRows={setNumRows}
        cols={cols}
        canEdit={canEdit}
        canCreate={canCreate}
        defaultCols={defaultCols}
        showDrawer={showDrawer}
        freezeColumnsCount={freezeColumnsCount}
        handleFreezeColumn={handleFreezeColumn}
      />

      <Drawer
        title={t('Cấu hình cột hiển thị')}
        placement="right"
        onClose={onClose}
        open={open}
        width={320}
      >
        <div className="flex flex-col gap-2">
          {(configurableCols || []).map((col) => (
            <Checkbox
              key={col.id}
              checked={!hiddenColumns.includes(col.id)}
              onChange={(e) => handleCheckboxChange(col.id, e.target.checked)}
            >
              {col.title || col.id}
            </Checkbox>
          ))}
        </div>
      </Drawer>
    </div>
  )
}
