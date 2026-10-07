/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { SlidersHorizontal, Users } from 'lucide-react'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from '../../../../../components/ui'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { useDateFormat } from '../../../../hooks/useDateFormat'

export default function UserTableSheet({
  tableTitle = 'Danh sách tài khoản người dùng',
  cols = [],
  setCols,
  defaultCols,
  gridData = [],
  setGridData,
  selection,
  setSelection,
  showSearch,
  setShowSearch,
  onRegisterDrawer,
  totalRows = 0
}) {
  const { t } = useTranslation()
  const { formatDate, formatDateTime } = useDateFormat()
  const gridRef = useRef(null)

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('user_management_table')

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
    tableId: 'user_management_table',
    defaultCols,
    cols,
    setCols,
    setGridData: setGridData || (() => {}),
    gridData,
    selection,
    setSelection,
    canEdit: false,
    setShowSearch
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

  // Pre-computed metadata for fast O(1) lookup
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'StatusAcc' || columnKey === 'StatusAccName'
      const isDate =
        columnKey.endsWith('Date') ||
        columnKey.includes('Time') ||
        columnKey === 'CreatedAt' ||
        columnKey === 'LastLogin'
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || true

      return {
        columnKey,
        isStatus,
        isDate,
        kind: column.kind,
        title: column.title || columnKey,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  // Cell Content Provider
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

      const val = rowItem[meta.columnKey]

      if (meta.columnKey === 'WorkingTag') {
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

      // Status Column
      if (meta.columnKey === 'StatusAccName' || meta.columnKey === 'StatusAcc') {
        const isActive = rowItem.StatusAcc === 1 || rowItem.StatusAcc === true
        const statusText = isActive ? 'Hoạt động' : 'Đã khóa'
        return {
          kind: GridCellKind.Text,
          data: statusText,
          displayData: statusText,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: {
            bgCell: isActive ? '#dcfce7' : '#fee2e2',
            textDark: isActive ? '#166534' : '#991b1b',
            baseFontStyle: 'bold 11px'
          }
        }
      }

      if (meta.columnKey === 'UserId') {
        return {
          kind: GridCellKind.Text,
          data: String(val || ''),
          displayData: `@${val || ''}`,
          readonly: true,
          allowOverlay: false,
          themeOverride: {
            textDark: '#1d4ed8',
            baseFontStyle: 'bold 12px'
          }
        }
      }

      if (meta.isDate && val) {
        const formatted = formatDateTime(val) || formatDate(val) || String(val)
        return {
          kind: GridCellKind.Text,
          data: String(val),
          displayData: formatted,
          readonly: true,
          allowOverlay: false,
          themeOverride: meta.cellTheme
        }
      }

      return {
        kind: GridCellKind.Text,
        data: String(val ?? ''),
        displayData: String(val ?? ''),
        readonly: true,
        allowOverlay: false,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata, formatDate, formatDateTime]
  )

  const numRows = gridData.length

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Table Sheet Header Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#ececf1] border-b border-slate-300 text-xs select-none">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800 uppercase tracking-wide">{tableTitle}</span>
          <span className="text-[11px] text-slate-500 font-medium">
            (Đã tải: <strong className="text-blue-700">{numRows}</strong> / {totalRows || numRows}{' '}
            tài khoản)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={showDrawer}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs"
            title="Cấu hình hiển thị cột"
          >
            <SlidersHorizontal size={12} className="text-slate-500" />
            <span>{t('TÙY CHỈNH CỘT')}</span>
          </button>
        </div>
      </div>

      {/* Main Glide Data Editor Sheet */}
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          columns={cols}
          rows={numRows}
          getCellContent={getCellContent}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          onHeaderMenuClick={onHeaderMenuClick}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onCellContextMenu={onCellContextMenu}
          onHeaderContextMenu={onHeaderContextMenu}
          onKeyDown={baseOnKeyDown}
          freezeColumns={freezeColumnsCount}
          theme={gridTheme}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          keybindings={keybindings}
          smoothScrollX={true}
          smoothScrollY={true}
          rowMarkers="both"
          rowSelect="multi"
          verticalBorder={true}
          drawFocusRing={true}
        />

        {/* Layout Context and Header Menus */}
        <LayoutMenuSheet
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onHeaderMenuClick={onHeaderMenuClick}
          layerProps={layerProps}
          renderLayer={renderLayer}
          handleHideColumn={handleHideColumn}
          handleReset={handleReset}
          handleSort={handleSort}
          handleFreezeColumn={handleFreezeColumn}
          freezeColumnsCount={freezeColumnsCount}
        />

        <LayoutStatusMenuSheet
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onHeaderMenuClick={onHeaderMenuClick}
          layerProps={layerProps}
          renderLayer={renderLayer}
          handleHideColumn={handleHideColumn}
          handleReset={handleReset}
          handleSort={handleSort}
          handleFreezeColumn={handleFreezeColumn}
          freezeColumnsCount={freezeColumnsCount}
        />

        <LayoutContextMenuSheet
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          layerProps={layerProps}
          renderLayer={renderLayer}
        />
      </div>

      {/* Column Customization Drawer */}
      <Drawer
        isOpen={open}
        onClose={onClose}
        title={t('Cấu hình hiển thị cột bảng người dùng')}
        description={t('Tích chọn để ẩn/hiện hoặc kéo thả để đổi thứ tự cột')}
      >
        <div className="space-y-2 p-2">
          {configurableCols.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <Checkbox
                id={`col-${col.id}`}
                checked={!hiddenColumns.includes(col.id)}
                onCheckedChange={(checked) => handleCheckboxChange(col.id, checked)}
              />
              <label
                htmlFor={`col-${col.id}`}
                className="text-xs text-slate-700 cursor-pointer select-none"
              >
                {col.title || col.id}
              </label>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  )
}
