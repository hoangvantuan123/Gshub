/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '@renderer/user/components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '@renderer/user/components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '@renderer/user/components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from '@renderer/components/ui'
import useOnFill from '@renderer/user/components/hooks/sheet/onFillHook'
import useTableManager from '@renderer/user/components/hooks/sheet/useTableManager'
import useTableConfig from '@renderer/user/components/hooks/sheet/useTableConfig'

const EMPTY_ARRAY = []

export default function CalcDataGridTable({
  tableTitle,
  setSelection,
  selection,
  setShowSearch,
  showSearch,
  setGridData,
  gridData = [],
  numRows,
  setCols,
  cols = [],
  defaultCols = [],
  onVisibleRegionChanged
}) {
  const { t } = useTranslation()
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])
  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('calc_production_table')

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
    tableId: 'calc_production_table',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit: false,
    setShowSearch
  })

  const onClose = () => setOpen(false)

  // Precompute column metadata for fast O(1) cell provider
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const columnTitle = column.title || ''
      const isNum = column.kind === GridCellKind.Number
      const cellTheme = getCellTheme(columnKey, column)
      return {
        columnKey,
        columnTitle,
        isNum,
        kind: column.kind,
        cellTheme,
        hasMenu: column.hasMenu || true
      }
    })
  }, [cols, getCellTheme])

  // Tính tổng SUM cho từng cột số liệu hiển thị ở hàng cuối cùng (Summary Row) - Tối ưu Single Pass O(N)
  const columnSums = useMemo(() => {
    if (!gridData || gridData.length === 0 || !cols || cols.length === 0) return {}

    // 1. Lọc trước danh sách các cột dạng Số
    const numericCols = []
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]
      const colId = col.id || ''
      const colTitle = col.title || ''
      const isNumericKind = col.kind === GridCellKind.Number
      if (isNumericKind || col.isNumeric || col.isNumber) {
        numericCols.push({ colId, colTitle, total: 0, hasValidNumber: false })
      }
    }

    if (numericCols.length === 0) return {}

    // 2. Duyệt 1 vòng lặp duy nhất qua toàn bộ các dòng dữ liệu (Single Pass O(N))
    const totalRows = gridData.length
    for (let r = 0; r < totalRows; r++) {
      const item = gridData[r]
      if (!item) continue

      for (let c = 0; c < numericCols.length; c++) {
        const nc = numericCols[c]
        const rawVal = item[nc.colId] !== undefined ? item[nc.colId] : item[nc.colTitle]
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/,/g, ''))
          if (!isNaN(num) && isFinite(num)) {
            nc.total += num
            nc.hasValidNumber = true
          }
        }
      }
    }

    // 3. Đóng gói kết quả tổng
    const sums = {}
    for (let c = 0; c < numericCols.length; c++) {
      const nc = numericCols[c]
      if (nc.hasValidNumber) {
        sums[nc.colId] = Number(nc.total.toFixed(2))
      }
    }

    return sums
  }, [gridData, cols])

  const getData = useCallback(
    ([col, row]) => {
      try {
        const meta = colMetadata[col]
        const colKey = meta?.columnKey || ''

        // 1. Nếu là hàng cuối cùng (Pinned SUM / Summary Row)
        if (row === gridData.length) {
          const isFirstCol = col === 0

          if (isFirstCol) {
            return {
              kind: GridCellKind.Text,
              data: 'TỔNG CỘNG',
              displayData: 'TỔNG CỘNG',
              readonly: true,
              allowOverlay: false,
              themeOverride: {
                bgCell: '#f1f5f9',
                textDark: '#0f172a',
                baseFontStyle: '700 11px Inter, sans-serif'
              }
            }
          }

          if (columnSums[colKey] !== undefined) {
            const sumVal = columnSums[colKey]
            return {
              kind: GridCellKind.Number,
              data: sumVal,
              displayData: sumVal.toLocaleString('vi-VN'),
              readonly: true,
              allowOverlay: false,
              themeOverride: {
                bgCell: '#f8fafc',
                textDark: '#047857',
                baseFontStyle: '700 11px Inter, sans-serif'
              }
            }
          }

          return {
            kind: GridCellKind.Text,
            data: '',
            displayData: '',
            readonly: true,
            allowOverlay: false,
            themeOverride: {
              bgCell: '#f8fafc'
            }
          }
        }

        // 2. Dòng dữ liệu thông thường
        const item = gridData[row]
        if (!meta || !item) {
          return {
            kind: GridCellKind.Text,
            data: '',
            displayData: '',
            readonly: true,
            allowOverlay: false
          }
        }

        let value = item[meta.columnKey]
        if (value === undefined || value === null || value === '') {
          if (meta.columnTitle && item[meta.columnTitle] !== undefined) {
            value = item[meta.columnTitle]
          } else {
            value = ''
          }
        }

        if (meta.isNum) {
          if (value === '' || value === null || value === undefined) {
            return {
              kind: GridCellKind.Text,
              data: '',
              displayData: '',
              readonly: true,
              allowOverlay: false,
              hasMenu: meta.hasMenu,
              themeOverride: meta.cellTheme
            }
          }
          const numVal =
            typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''))
          if (!isNaN(numVal)) {
            return {
              kind: GridCellKind.Number,
              data: numVal,
              displayData: numVal.toLocaleString('vi-VN'),
              readonly: true,
              allowOverlay: false,
              hasMenu: meta.hasMenu,
              themeOverride: meta.cellTheme
            }
          }
        }

        const strVal = value !== null && value !== undefined ? String(value) : ''
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      } catch (err) {
        console.warn('Lỗi đọc ô bảng tính:', err)
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }
    },
    [gridData, colMetadata, cols, columnSums]
  )

  const hasData = gridData && gridData.length > 0
  const effectiveRows = hasData ? gridData.length + 1 : 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Dữ liệu bảng tính KHSX & TKSX')}</span>
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
          trailingRowOptions={{
            hint: ' ',
            sticky: true,
            tint: true
          }}
          freezeColumns={freezeColumnsCount}
          headerHeight={23}
          overscrollY={20}
          overscrollX={50}
          smoothScrollY={true}
          smoothScrollX={true}
          freezeTrailingRows={hasData ? 1 : 0}
          rowHeight={23}
          fillHandle={true}
          keybindings={keybindings}
          isDraggable={false}
          highlightRegions={EMPTY_ARRAY}
          onColumnResize={onColumnResize}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderContextMenu={onHeaderContextMenu}
          onColumnMoved={onColumnMoved}
          onKeyDown={onKeyDown}
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
