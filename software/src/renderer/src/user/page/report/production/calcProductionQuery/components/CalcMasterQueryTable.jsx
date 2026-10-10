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

export default function CalcMasterQueryTable({
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
  onRowDoubleClick,
  onVisibleRegionChanged
}) {
  const { t } = useTranslation()
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])
  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('calc_master_query_table')

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
    gridTheme,
    onCellClicked,
    onCellActivated,
    onKeyDown,
    onCellContextMenu,
    onHeaderContextMenu
  } = useTableManager({
    tableId: 'calc_master_query_table',
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

  // Precompute column metadata
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isNum = column.kind === GridCellKind.Number
      const cellTheme = getCellTheme(columnKey, column)
      return {
        columnKey,
        isNum,
        kind: column.kind,
        cellTheme,
        hasMenu: column.hasMenu || true
      }
    })
  }, [cols, getCellTheme])

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

      const value = item[meta.columnKey] ?? ''

      // Tùy biến ô Mã đăng ký (Hiển thị nổi bật dạng liên kết)
      if (meta.columnKey === 'regCode') {
        const strVal = String(value)
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          themeOverride: {
            textDark: '#1e40af',
            bgCell: '#eff6ff'
          }
        }
      }

      // Ô Trạng thái
      if (meta.columnKey === 'status') {
        const strVal = String(value).toUpperCase()
        let displayStatus = strVal
        let textColor = '#334155'
        let bgColor = '#f8fafc'

        if (strVal === 'DRAFT' || strVal === 'DRAFTING' || strVal.includes('ĐANG LẬP')) {
          displayStatus = 'Đang lập (DRAFT)'
          textColor = '#b45309'
          bgColor = '#fffbeb'
        } else if (
          strVal === 'REGISTERED' ||
          strVal.includes('ĐÃ ĐĂNG KÝ') ||
          strVal.includes('ĐÃ LƯU')
        ) {
          displayStatus = 'Đã lưu (REGISTERED)'
          textColor = '#1d4ed8'
          bgColor = '#eff6ff'
        } else if (
          strVal === 'PUBLISHED' ||
          strVal.includes('ĐÃ CÔNG BỐ') ||
          strVal.includes('ĐÃ PHÁT HÀNH')
        ) {
          displayStatus = 'Đã công bố (PUBLISHED)'
          textColor = '#047857'
          bgColor = '#ecfdf5'
        } else if (
          strVal === 'APPROVED' ||
          strVal.includes('ĐÃ PHÊ DUYỆT') ||
          strVal.includes('ĐÃ DUYỆT')
        ) {
          displayStatus = 'Đã duyệt (APPROVED)'
          textColor = '#0f766e'
          bgColor = '#f0fdfa'
        }

        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: displayStatus,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          themeOverride: {
            textDark: textColor,
            bgCell: bgColor
          }
        }
      }

      if (meta.isNum || typeof value === 'number') {
        const numVal =
          typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')) || 0
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

      const strVal = String(value)
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        readonly: true,
        allowOverlay: false,
        hasMenu: meta.hasMenu,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata]
  )

  const handleCellClickInternal = useCallback(
    (cell, event) => {
      onCellClicked?.(cell, event)
    },
    [onCellClicked]
  )

  const handleCellActivatedInternal = useCallback(
    (cell) => {
      onCellActivated?.(cell)
      const rowIndex = cell[1]
      const rowItem = gridData[rowIndex]
      if (rowItem && typeof onRowDoubleClick === 'function') {
        onRowDoubleClick(rowItem)
      }
    },
    [gridData, onCellActivated, onRowDoubleClick]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Danh sách phiếu đăng ký Master KHSX & TKSX')}</span>
          <span className="text-slate-400 font-normal ml-2 text-[9px]">
            {t('(Nhấp đúp dòng hoặc bấm Mã Đăng Ký để mở chi tiết 4 bảng)')}
          </span>
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
          rowSelect="single"
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
          freezeTrailingRows={0}
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
          onCellClicked={handleCellClickInternal}
          onCellActivated={handleCellActivatedInternal}
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
