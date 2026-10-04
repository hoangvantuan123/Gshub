/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { RotateCw, SlidersHorizontal, X } from 'lucide-react'

import LayoutMenuSheet from '../../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from '../../../../../../components/ui'
import useTableManager from '../../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../../components/hooks/sheet/useTableConfig'
import { useDateFormat } from '../../../../../hooks/useDateFormat'

const EMPTY_ARRAY = []

export default function StatDetailQueryTable({
  tableTitle,
  cols = [],
  setCols,
  defaultCols,
  gridData = [],
  setGridData,
  selection,
  setSelection,
  showSearch,
  setShowSearch,
  onVisibleRegionChanged,
  showColFilters = false,
  colFilterValues = {},
  setColFilterValues,
  onApplyFilterFromCell,
  onAddQueryField,
  onRegisterDrawer,
  onExportExcel,
  isLoadingMore = false,
  hasMore = false,
  loadedCount = 0,
  displayCount = 0,
  totalRows = 0
}) {
  const { t } = useTranslation()
  const { formatDate } = useDateFormat()
  const gridRef = useRef(null)

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('stat_detail_query_table')

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
    onKeyDown: baseOnKeyDown,
    onCellContextMenu,
    onHeaderContextMenu
  } = useTableManager({
    tableId: 'stat_detail_query_table',
    defaultCols,
    cols,
    setCols,
    setGridData: setGridData || (() => {}),
    gridData,
    selection,
    setSelection,
    canEdit: false,
    setShowSearch,
    onAddQueryField: onAddQueryField || onApplyFilterFromCell
  })

  useEffect(() => {
    if (typeof onRegisterDrawer === 'function') {
      onRegisterDrawer(showDrawer)
    }
  }, [onRegisterDrawer, showDrawer])

  const onSearchClose = useCallback(() => {
    if (typeof setShowSearch === 'function') setShowSearch(false)
  }, [setShowSearch])

  const onClose = () => setOpen(false)

  // ── 1. PRE-COMPUTE METADATA CHO CÁC CỘT (O(1) Cell Provider Lookup) ──
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isNumber =
        column.kind === 'Number' ||
        columnKey.includes('Qty') ||
        columnKey.includes('Hours') ||
        columnKey.includes('Rate') ||
        columnKey.includes('Minute') ||
        columnKey.includes('Total') ||
        columnKey.includes('Output') ||
        columnKey.includes('Speed') ||
        columnKey.includes('Waste') ||
        columnKey.includes('Pass')
      const isDate = columnKey.endsWith('Date') || columnKey.includes('Time')
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || true

      return {
        columnKey,
        isStatus,
        isNumber,
        isDate,
        kind: column.kind,
        title: column.title || columnKey,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  // ── 2. SIÊU TỐI ƯU HÓA HÀM TRUY XUẤT Ô (60 FPS VIRTUAL SCROLLING) ──
  const getCellContent = useCallback(
    ([col, row]) => {
      const rowItem = gridData[row]
      const meta = colMetadata[col]
      if (!meta || !rowItem) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      // Xử lý dòng tiêu đề Nhóm (Group Header)
      if (rowItem._isGroupHeader) {
        if (col === 0 || col === 1) {
          return {
            kind: GridCellKind.Text,
            data: rowItem._groupTitle || '',
            displayData: rowItem._groupTitle || '',
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              bgCell: '#f1f5f9',
              textDark: '#1e293b',
              baseFontStyle: 'bold 12px'
            }
          }
        }
        if (meta.columnKey === 'ActualQty' && rowItem._totalActualQty !== undefined) {
          const num = Number(rowItem._totalActualQty) || 0
          return {
            kind: GridCellKind.Number,
            data: num,
            displayData: num.toLocaleString('vi-VN'),
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              bgCell: '#f1f5f9',
              textDark: '#16a34a',
              baseFontStyle: 'bold 12px'
            }
          }
        }
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false,
          themeOverride: { bgCell: '#f8fafc' }
        }
      }

      const val = rowItem[meta.columnKey]

      // Cột WorkingTag / Status trong màn hình truy vấn luôn để trống ""
      if (meta.columnKey === 'WorkingTag' || meta.columnKey === 'Status') {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: meta.cellTheme
        }
      }

      // Cột ngày tháng
      if (meta.isDate && val) {
        const dateStr = formatDate(val)
        return {
          kind: GridCellKind.Text,
          data: String(val),
          displayData: dateStr || String(val),
          readonly: true,
          allowOverlay: false,
          themeOverride: meta.cellTheme
        }
      }

      // Cột số liệu
      if (meta.isNumber || typeof val === 'number') {
        const numVal = Number(val) || 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: numVal.toLocaleString('vi-VN'),
          readonly: true,
          allowOverlay: false,
          themeOverride: meta.cellTheme
        }
      }

      // Cột chuỗi mặc định
      const strVal = val !== undefined && val !== null ? String(val) : ''
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        readonly: true,
        allowOverlay: false,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata, formatDate]
  )

  // ── 3. BẮT SỰ KIỆN CTRL+F KHI ĐANG FOCUS Ô VÀ ĐẨY VÀO FILTER ──
  const handleKeyDown = useCallback(
    (event) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey
      const key = event.key ? event.key.toLowerCase() : ''

      if (isCtrlOrMeta && key === 'f') {
        event.preventDefault()
        event.stopPropagation()

        const currentCell = selection?.current?.cell
        if (currentCell && typeof onApplyFilterFromCell === 'function') {
          const [col, row] = currentCell
          if (row >= 0 && row < (gridData?.length || 0)) {
            const rowItem = gridData[row]
            const meta = colMetadata[col]
            if (meta && rowItem && !rowItem._isGroupHeader) {
              const cellValue =
                rowItem[meta.columnKey] !== undefined && rowItem[meta.columnKey] !== null
                  ? String(rowItem[meta.columnKey])
                  : ''
              onApplyFilterFromCell(meta.columnKey, cellValue)
              return
            }
          }
        }
        if (typeof setShowSearch === 'function') {
          setShowSearch(true)
        }
        return
      }

      if (typeof baseOnKeyDown === 'function') {
        baseOnKeyDown(event)
      }
    },
    [selection, gridData, colMetadata, onApplyFilterFromCell, setShowSearch, baseOnKeyDown]
  )

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden select-none">
      {/* ── Table Header Banner (Chuẩn hệ thống) ── */}
      <h2 className="text-[10px] italic text-blue-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
        <span className="w-1 h-3 bg-blue-600 rounded-full inline-block shrink-0" />
        <span>{tableTitle || t('Danh sách Thống kê sản xuất chi tiết')}</span>
      </h2>

      {/* ── GlideDataGrid Data Editor ── */}
      <div className="flex-1 w-full h-full relative" onKeyDown={handleKeyDown}>
        <DataEditor
          ref={gridRef}
          theme={gridTheme}
          columns={cols}
          getCellContent={getCellContent}
          rows={gridData.length}
          showSearch={Boolean(showSearch)}
          onSearchClose={onSearchClose}
          rowMarkers="both"
          width="100%"
          height="100%"
          rowSelect="multi"
          columnSelect="single"
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          getCellsForSelection={true}
          freezeColumns={freezeColumnsCount}
          headerHeight={23}
          rowHeight={23}
          overscrollY={20}
          overscrollX={50}
          smoothScrollY={true}
          smoothScrollX={true}
          keybindings={keybindings}
          isDraggable={false}
          highlightRegions={EMPTY_ARRAY}
          onColumnResize={onColumnResize}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderContextMenu={onHeaderContextMenu}
          onColumnMoved={onColumnMoved}
          onKeyDown={handleKeyDown}
          onVisibleRegionChanged={onVisibleRegionChanged}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onCellContextMenu={onCellContextMenu}
        />

        {/* ── Context Menu & Header Menus ── */}
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
                  onExportExcel={onExportExcel}
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

        {/* ── Cài đặt hiển thị cột (Drawer) ── */}
        <Drawer
          title={
            <span className="text-xs flex items-center justify-between font-bold text-slate-800">
              <span>{t('CÀI ĐẶT CỘT DỮ LIỆU')}</span>
              <button
                onClick={handleReset}
                className="text-[11px] font-normal text-blue-600 hover:underline"
              >
                {t('Khôi phục mặc định')}
              </button>
            </span>
          }
          styles={{ body: { padding: 15 } }}
          onClose={onClose}
          open={open}
        >
          <div className="flex flex-col gap-2 max-h-full overflow-y-auto">
            {(configurableCols || []).map((col) => (
              <div key={col.id} className="py-0.5">
                <Checkbox
                  checked={!hiddenColumns.includes(col.id)}
                  onChange={(e) => handleCheckboxChange(col.id, e.target.checked)}
                >
                  <span className="text-xs text-slate-700">{col.title || col.id}</span>
                </Checkbox>
              </div>
            ))}
          </div>
        </Drawer>
      </div>
    </div>
  )
}
