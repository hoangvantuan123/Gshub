import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from 'antd'
import useOnFill from '../../../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../../../components/hooks/sheet/useTableConfig'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set([
  'AutoExport',
  'AutoImport',
  'WrongOpCode',
  'IsAdditionalStat',
  'IsDuplicateTicket'
])

export default function StatisticsImportTable({
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
  canEdit = true,
  canCreate = true,
  defaultCols,
  onVisibleRegionChanged,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('import_stat_table')

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
    tableId: 'import_stat_table',
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

  // Pre-compute Metadata
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || false
      return {
        columnKey,
        isStatus,
        isBoolean,
        kind: column.kind,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  const getData = useCallback(
    ([col, row]) => {
      const item = gridData[row]
      const meta = colMetadata[col]
      if (!meta || !item) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const value = item[meta.columnKey] ?? item[meta.columnKey.charAt(0).toLowerCase() + meta.columnKey.slice(1)] ?? ''

      if (meta.isStatus && meta.columnKey === 'WorkingTag') {
        const strVal = String(value)
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          contentAlign: 'center',
          themeOverride: meta.cellTheme
        }
      }

      if (meta.isBoolean) {
        const booleanValue =
          typeof value === 'boolean'
            ? value
            : value === 1 || value === '1' || value === 'true' || value === 'Có'
        return {
          kind: GridCellKind.Boolean,
          data: booleanValue,
          readonly: meta.isReadOnly,
          allowOverlay: true,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      if (meta.kind === 'Number' || typeof value === 'number') {
        const numVal = Number(value) || 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: numVal.toLocaleString('vi-VN'),
          readonly: meta.isReadOnly,
          allowOverlay: !meta.isReadOnly,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      const strValue = typeof value === 'string' ? value : String(value)

      return {
        kind: GridCellKind.Text,
        data: strValue,
        displayData: strValue,
        readonly: meta.isReadOnly,
        allowOverlay: !meta.isReadOnly,
        hasMenu: meta.hasMenu,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata]
  )

  const onKeyUp = useCallback(() => {}, [])

  const onCellEdited = useCallback(
    async (cell, newValue) => {
      if (
        newValue.kind !== GridCellKind.Text &&
        newValue.kind !== GridCellKind.Custom &&
        newValue.kind !== GridCellKind.Boolean &&
        newValue.kind !== GridCellKind.Number
      ) {
        return
      }
      if (canEdit === false) return
      const [col, row] = cell
      const meta = colMetadata[col]
      if (!meta || meta.isReadOnly || meta.columnKey === 'WorkingTag') return

      setGridData((prevData) => {
        const updatedData = [...prevData]
        if (!updatedData[row]) updatedData[row] = {}

        const currentStatus = updatedData[row]['WorkingTag'] || ''
        const nextStatus = currentStatus === 'A' ? 'A' : 'U'
        updatedData[row][meta.columnKey] = newValue.data
        updatedData[row]['WorkingTag'] = nextStatus

        // Tự động tính tổng thời gian hao phí (5)=1+2+3+4
        if (
          meta.columnKey === 'BreakdownMinutes' ||
          meta.columnKey === 'WaitingMaterialMinutes' ||
          meta.columnKey === 'SetupMinutes' ||
          meta.columnKey === 'RepairMinutes'
        ) {
          const r = updatedData[row]
          const sum =
            (Number(r.BreakdownMinutes) || 0) +
            (Number(r.WaitingMaterialMinutes) || 0) +
            (Number(r.SetupMinutes) || 0) +
            (Number(r.RepairMinutes) || 0)
          r.TotalWasteMinutes = sum
        }

        // Tự động tính Tỷ lệ NG %
        if (meta.columnKey === 'ProdQty' || meta.columnKey === 'PassQty' || meta.columnKey === 'DefectQty') {
          const r = updatedData[row]
          const prod = Number(r.ProdQty) || 0
          const defect = Number(r.DefectQty) || 0
          if (prod > 0) {
            r.DefectRate = `${((defect / prod) * 100).toFixed(2)}%`
          }
        }

        return updatedData
      })
    },
    [colMetadata, canEdit, setGridData]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Dữ liệu Đăng ký Báo cáo Thống kê sản xuất (TKSX)')}</span>
        </h2>
        <DataEditor
          ref={gridRef}
          theme={gridTheme}
          columns={cols}
          getCellContent={getData}
          onFill={onFill}
          rows={effectiveRows}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          rowMarkers="both"
          width="100%"
          height="100%"
          rowSelect="multi"
          columnSelect="single"
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          getCellsForSelection={true}
          trailingRowOptions={
            canCreate
              ? {
                  hint: ' ',
                  sticky: true,
                  tint: true
                }
              : undefined
          }
          freezeColumns={freezeColumnsCount}
          headerHeight={23}
          overscrollY={20}
          overscrollX={50}
          smoothScrollY={true}
          smoothScrollX={true}
          freezeTrailingRows={0}
          rowHeight={23}
          fillHandle={Boolean(canEdit)}
          keybindings={keybindings}
          isDraggable={false}
          onRowAppended={() => canCreate && handleRowAppend && handleRowAppend(1)}
          onCellEdited={canEdit ? onCellEdited : undefined}
          highlightRegions={EMPTY_ARRAY}
          onColumnResize={onColumnResize}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderContextMenu={onHeaderContextMenu}
          onColumnMoved={onColumnMoved}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onVisibleRegionChanged={onVisibleRegionChanged}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onCellContextMenu={onCellContextMenu}
        />
        {showMenu !== null &&
          renderLayer(
            <div {...layerProps} className="z-[9999] outline-none">
              {showMenu.menuType === 'statusMenu' ? (
                <LayoutStatusMenuSheet
                  showMenu={showMenu}
                  handleSort={handleSort}
                  cols={cols}
                  renderLayer={renderLayer}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  layerProps={layerProps}
                  handleReset={handleReset}
                  showDrawer={showDrawer}
                  data={gridData}
                  handleRowAppend={handleRowAppend}
                />
              ) : showMenu.menuType === 'contextMenu' ? (
                <LayoutContextMenuSheet
                  showMenu={showMenu}
                  cols={cols}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  data={gridData}
                  handleRowAppend={handleRowAppend}
                  selection={selection}
                  canCreate={canCreate}
                />
              ) : (
                <LayoutMenuSheet
                  showMenu={showMenu}
                  handleSort={handleSort}
                  handleHideColumn={handleHideColumn}
                  cols={cols}
                  renderLayer={renderLayer}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  layerProps={layerProps}
                  handleFreezeColumn={handleFreezeColumn}
                  showDrawer={showDrawer}
                />
              )}
            </div>
          )}
        <Drawer
          title={
            <span className="text-xs flex items-center justify-end font-bold">CÀI ĐẶT SHEET</span>
          }
          styles={{ body: { padding: 15 } }}
          onClose={onClose}
          open={open}
        >
          {(configurableCols || []).map((col) => (
            <div key={col.id} style={{ marginBottom: '10px' }}>
              <Checkbox
                checked={!hiddenColumns.includes(col.id)}
                onChange={(e) => handleCheckboxChange(col.id, e.target.checked)}
              >
                {col.title || col.id}
              </Checkbox>
            </div>
          ))}
        </Drawer>
      </div>
    </div>
  )
}
