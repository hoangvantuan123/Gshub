/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { Drawer, Checkbox } from 'antd'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useOnFill from '../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { useDateFormat } from '../../../../hooks/useDateFormat'
import { usePageData } from '../../../../../context/PageDataContext'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set(['IsSettled'])
const NUMBER_KEYS = new Set([
  'DoRequiredQty',
  'InitialAdjustQty',
  'AdjustedRequiredQty',
  'WasteCompensationQty',
  'ProductionRequiredQty',
  'SettlementQty',
  'PlannedAchievedQty',
  'PlannedProductionQty',
  'StatAchievedQty',
  'StatProductionQty',
  'WarehouseReceiptQty'
])
const DATE_KEYS = new Set(['SettledDate', 'CreatedAt', 'UpdatedAt'])

export default function OrderSettlementTable({
  tableTitle,
  setSelection,
  selection,
  setShowSearch,
  showSearch,
  setGridData,
  gridData = [],
  rawFlatData = [],
  setRawFlatData,
  numRows,
  setNumRows,
  setCols,
  cols = [],
  canEdit = true,
  canCreate = true,
  defaultCols = [],
  toggleGroup,
  onVisibleRegionChanged,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('order_settlement_main')

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
    onCellActivated,
    onKeyDown,
    onCellContextMenu,
    onHeaderContextMenu
  } = useTableManager({
    tableId: 'order_settlement_main',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    setShowSearch,
    onAddQueryField,
    readOnlyBg: '#ffffff'
  })

  const onClose = () => setOpen(false)

  // ── 1. PRE-COMPUTE METADATA CHO CÁC CỘT (O(1) Cell Provider Lookup) ──
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)
      const isNumber = column.kind === 'Number' || NUMBER_KEYS.has(columnKey)
      const isDate =
        DATE_KEYS.has(columnKey) || columnKey.endsWith('Date') || columnKey.endsWith('At')
      const isStatusText = columnKey === 'Status'
      const rawTheme = getCellTheme(columnKey, column)
      // Loại bỏ hoàn toàn màu xám cho các dòng chi tiết: ép nền trắng #ffffff
      const cellTheme = {
        ...rawTheme,
        bgCell: '#ffffff'
      }
      const isReadOnly =
        isReadOnlyColumn(columnKey, column) ||
        column.readonly ||
        columnKey === 'WorkingTag' ||
        columnKey === 'Id' ||
        columnKey === 'CreatedByName' ||
        columnKey === 'CreatedAt' ||
        columnKey === 'UpdatedByName' ||
        columnKey === 'UpdatedAt' ||
        false

      return {
        columnKey,
        title: column.title || columnKey,
        isStatus,
        isBoolean,
        isNumber,
        isDate,
        isStatusText,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu !== false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  // ── 2. TRUY XUẤT DỮ LIỆU Ô GRID VỚI MÀU SẮC & CĂN LỀ CHUẨN ──
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

      const isGroupRow = Boolean(item.IsGroup)
      const value = item[meta.columnKey] ?? ''

      // Dòng đầu Group: đổi màu nền nổi bật (xanh nhạt sang trọng) + chữ đậm sắc nét
      const groupThemeOverride = isGroupRow
        ? {
            bgCell: '#e0f2fe', // sky-100 / blue-100 nổi bật rõ ràng giữa các dòng
            textDark: '#0369a1', // xanh đậm nổi bật
            baseFontStyle: 'bold 12px Inter, sans-serif'
          }
        : meta.cellTheme

      // Cột WorkingTag (A = Xanh lá, U = Xanh dương, D = Đỏ)
      if (meta.isStatus) {
        const strVal = isGroupRow ? '' : String(value)
        const tagTheme =
          strVal === 'A'
            ? { textDark: '#16a34a', baseFontStyle: 'bold 12px Inter, sans-serif' }
            : strVal === 'U'
              ? { textDark: '#2563eb', baseFontStyle: 'bold 12px Inter, sans-serif' }
              : strVal === 'D'
                ? { textDark: '#dc2626', baseFontStyle: 'bold 12px Inter, sans-serif' }
                : meta.cellTheme

        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          contentAlign: 'center',
          themeOverride: tagTheme
        }
      }

      // Cột Boolean (IsSettled) - Áp dụng cho CẢ Lệnh Công Đoạn (Master) và Lệnh Thao Tác (Detail)
      if (meta.isBoolean) {
        const boolVal =
          typeof value === 'boolean' ? value : value === 1 || value === '1' || value === 'true'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          readonly: meta.isReadOnly,
          allowOverlay: true,
          hasMenu: meta.hasMenu,
          themeOverride: isGroupRow ? groupThemeOverride : meta.cellTheme
        }
      }

      // Group Header Row: hiển thị giá trị gom nhóm cho các cột văn bản / số
      if (isGroupRow) {
        let displayVal = String(value)
        if (meta.isNumber && typeof value === 'number') {
          displayVal = value.toLocaleString('vi-VN')
        }
        return {
          kind: GridCellKind.Text,
          data: displayVal,
          displayData: displayVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          contentAlign: meta.isNumber ? 'right' : 'left',
          themeOverride: groupThemeOverride
        }
      }

      // Cột Trạng thái (Màu sắc badge chuyên nghiệp)
      if (meta.isStatusText) {
        const strStatus = String(value)
        const statusTheme =
          strStatus === 'Đã quyết toán'
            ? { textDark: '#15803d', baseFontStyle: '600 12px Inter, sans-serif' }
            : strStatus === 'Chờ quyết toán'
              ? { textDark: '#b45309', baseFontStyle: '600 12px Inter, sans-serif' }
              : strStatus === 'Đang sản xuất'
                ? { textDark: '#1d4ed8', baseFontStyle: '600 12px Inter, sans-serif' }
                : meta.cellTheme

        return {
          kind: GridCellKind.Text,
          data: strStatus,
          displayData: strStatus,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          contentAlign: 'center',
          themeOverride: statusTheme
        }
      }

      // Cột Số lượng (Căn phải 100%, định dạng có dấu phân cách hàng nghìn)
      if (meta.isNumber) {
        const numVal = typeof value === 'number' ? value : Number(value) || 0
        const displayVal =
          value !== null && value !== undefined && value !== ''
            ? numVal.toLocaleString('vi-VN')
            : ''
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: displayVal,
          readonly: meta.isReadOnly,
          allowOverlay: !meta.isReadOnly,
          hasMenu: meta.hasMenu,
          contentAlign: 'right',
          themeOverride: meta.cellTheme
        }
      }

      // Cột Date & Text thông thường
      const strValue = typeof value === 'string' ? value : String(value)
      const displayData = meta.isDate && value ? formatDateTime(value) || strValue : strValue

      return {
        kind: GridCellKind.Text,
        data: strValue,
        displayData: displayData,
        readonly: meta.isReadOnly,
        allowOverlay: !meta.isReadOnly,
        hasMenu: meta.hasMenu,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata, formatDateTime]
  )

  // ── 3. CHỈNH SỬA Ô & TỰ ĐỘNG ĐỔI TRẠNG THÁI WORKINGTAG ──
  const onCellEdited = useCallback(
    async (cell, newValue) => {
      if (canEdit === false) return
      const [col, row] = cell
      const item = gridData[row]
      if (!item) return

      const indexes = reorderColumns(cols)
      const key = indexes[col]
      const column = cols[col]

      if (
        isReadOnlyColumn(key, column) ||
        column?.readonly ||
        key === 'WorkingTag' ||
        key === 'Id'
      ) {
        return
      }

      const val = newValue.data

      // Trường hợp 1: Chỉnh sửa dòng Gom nhóm Master (Lệnh Công Đoạn)
      if (item.IsGroup) {
        if (key === 'IsSettled') {
          const isSettledVal = Boolean(val)
          const todayStr = new Date().toLocaleDateString('vi-VN')
          const childIds = new Set((item.children || []).map((c) => c.id))

          if (setRawFlatData) {
            setRawFlatData((prev) =>
              prev.map((r) => {
                if (childIds.has(r.id) || r.StageOrderNo === item.GroupValue) {
                  const currentStatus = r.WorkingTag || ''
                  const nextStatus = currentStatus === 'A' ? 'A' : 'U'
                  return {
                    ...r,
                    IsSettled: isSettledVal,
                    Status: isSettledVal ? 'Đã quyết toán' : 'Chờ quyết toán',
                    SettledDate: isSettledVal ? todayStr : '',
                    WorkingTag: nextStatus
                  }
                }
                return r
              })
            )
          }
        }
        return
      }

      // Trường hợp 2: Chỉnh sửa dòng Chi tiết (Lệnh Thao Tác)
      if (setRawFlatData) {
        setRawFlatData((prev) =>
          prev.map((r) => {
            if (r.id === item.id) {
              const currentStatus = r.WorkingTag || ''
              const nextStatus = currentStatus === 'A' ? 'A' : 'U'
              const updatedRow = {
                ...r,
                [key]: val,
                WorkingTag: nextStatus
              }

              // Logic tự động cập nhật Trạng thái khi tích quyết toán
              if (key === 'IsSettled') {
                if (val) {
                  updatedRow.Status = 'Đã quyết toán'
                  if (!updatedRow.SettledDate) {
                    updatedRow.SettledDate = new Date().toLocaleDateString('vi-VN')
                  }
                } else {
                  updatedRow.Status = 'Chờ quyết toán'
                  updatedRow.SettledDate = ''
                }
              }

              return updatedRow
            }
            return r
          })
        )
      } else {
        setGridData((prev) => {
          const updated = [...prev]
          if (!updated[row]) return updated
          const currentStatus = updated[row].WorkingTag || ''
          const nextStatus = currentStatus === 'A' ? 'A' : 'U'
          updated[row] = {
            ...updated[row],
            [key]: val,
            WorkingTag: nextStatus
          }
          return updated
        })
      }
    },
    [cols, canEdit, isReadOnlyColumn, gridData, setRawFlatData, setGridData]
  )

  // Click vào ô: nếu là group header row thì toggle expand/collapse thu gọn lại (trừ khi click vào checkbox)
  const onCellClicked = useCallback(
    (cell) => {
      const [col, row] = cell
      const item = gridData[row]
      const meta = colMetadata[col]
      if (item && item.IsGroup && toggleGroup) {
        // Nếu click vào cột Checkbox Quyết toán thì không toggle mở/đóng group
        if (meta?.isBoolean) return
        toggleGroup(item.id)
      }
    },
    [gridData, colMetadata, toggleGroup]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        {/* Khung tiêu đề chuẩn hệ thống (RoleGroup / RoleManagement) */}
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>
            {tableTitle ||
              t('production.orderSettlementTitle', 'Danh sách Quyết toán Lệnh sản xuất')}
          </span>
        </h2>

        {/* DataEditor với Group Header 2 tầng, Cột số căn phải, rowMarkers="number" */}
        <DataEditor
          ref={gridRef}
          theme={gridTheme}
          columns={cols}
          getCellContent={getData}
          onFill={onFill}
          rows={effectiveRows}
          showSearch={false}
          onSearchClose={onSearchClose}
          rowMarkers="number"
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
          headerHeight={28}
          overscrollY={20}
          overscrollX={50}
          smoothScrollY={true}
          smoothScrollX={true}
          freezeTrailingRows={0}
          rowHeight={24}
          fillHandle={true}
          keybindings={{
            ...keybindings,
            search: false
          }}
          isDraggable={false}
          onCellEdited={onCellEdited}
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

        {/* Menu chuột phải & Menu Header chuẩn hệ thống */}
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
                  handleRowAppend={() => {}}
                />
              ) : showMenu.menuType === 'contextMenu' ? (
                <LayoutContextMenuSheet
                  showMenu={showMenu}
                  cols={cols}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  data={gridData}
                  handleRowAppend={() => {}}
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

        {/* Drawer Cài đặt Sheet */}
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
