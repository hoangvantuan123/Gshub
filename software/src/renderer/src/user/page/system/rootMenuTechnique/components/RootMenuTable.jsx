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
const BOOLEAN_KEYS = new Set(['Utilities', 'Active', 'IsDataLock'])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])

export default function RootMenuTable({
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

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('root_menu')

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
    tableId: 'root_menu',
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

  // ── 1. PRE-COMPUTE METADATA CHO CÁC CỘT (O(1) Cell Provider Lookup) ──
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)
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
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  // ── 2. SIÊU TỐI ƯU HÓA HÀM TRUY XUẤT Ô (60 FPS VIRTUAL SCROLLING) ──
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

      if (meta.isStatus) {
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
          typeof value === 'boolean' ? value : value === 1 || value === '1' || value === 'true'
        return {
          kind: GridCellKind.Boolean,
          data: booleanValue,
          readonly: meta.isReadOnly,
          allowOverlay: true,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

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

  const onKeyUp = useCallback(() => {}, [])

  // ── 3. CHỈNH SỬA Ô ĐƠN LẺ ──
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
      if (canEdit === false) {
        return
      }
      const indexes = reorderColumns(cols)
      const [col, row] = cell
      const key = indexes[col]

      if (
        isReadOnlyColumn(key) ||
        key === 'WorkingTag' ||
        key === 'Status' ||
        key === 'Id'
      ) {
        return
      }

      setGridData((prevData) => {
        const updatedData = [...prevData]
        if (!updatedData[row]) updatedData[row] = {}

        const currentStatus =
          updatedData[row]['WorkingTag'] || updatedData[row]['Status'] || ''
        const nextStatus = currentStatus === 'A' ? 'A' : 'U'
        updatedData[row][key] = newValue.data
        updatedData[row]['WorkingTag'] = nextStatus
        updatedData[row]['Status'] = nextStatus

        return updatedData
      })
    },
    [cols, canEdit, isReadOnlyColumn, setGridData]
  )

  // ── 4. DÁN HÀNG LOẠT 10.000 DÒNG SIÊU TỐC TRONG 1 PASS O(N) KÈM KHÓA CHUỘT TRÁNH XUNG ĐỘT ──
  const onPaste = useCallback(
    (target, values) => {
      if (!values || values.length === 0 || canEdit === false) {
        return false
      }

      const [startCol, startRow] = target
      const indexes = reorderColumns(cols)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

      // Chặn và cảnh báo nếu số lượng dòng dán vượt quá giới hạn 3,000 dòng
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

      // Khóa chuột và chặn toàn bộ tương tác người dùng khi đang dán lượng lớn dữ liệu
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

          // 1. Giữ nguyên các dòng trước vùng dán
          for (let r = 0; r < startRow; r++) {
            nextData[r] = prevData[r] || {}
          }

          // 2. Điền và xử lý hàng loạt các dòng được dán trong 1 vòng lặp O(N) duy nhất
          for (let r = 0; r < numPastedRows; r++) {
            const targetRow = startRow + r
            const existingRow = prevData[targetRow] ? { ...prevData[targetRow] } : {}
            const rowValues = values[r] || []
            const isNewRow =
              !existingRow.Id &&
              !existingRow.IdSeq &&
              (!existingRow.WorkingTag ||
                existingRow.WorkingTag === 'A' ||
                !existingRow.Status ||
                existingRow.Status === 'A')

            let hasRowModified = false

            for (let c = 0; c < numPastedCols; c++) {
              const targetCol = startCol + c
              if (targetCol >= cols.length) break

              const columnKey = indexes[targetCol]
              const column = cols[targetCol]

              if (
                !columnKey ||
                columnKey === 'WorkingTag' ||
                columnKey === 'Status' ||
                columnKey === 'Id' ||
                columnKey === 'IdxNo' ||
                isReadOnlyColumn(columnKey, column)
              ) {
                continue
              }

              let cellVal = rowValues[c] ?? ''
              if (column?.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)) {
                cellVal =
                  cellVal === 'true' ||
                  cellVal === '1' ||
                  cellVal === true ||
                  String(cellVal).toLowerCase() === 'true'
              }

              existingRow[columnKey] = cellVal
              hasRowModified = true
            }

            if (hasRowModified || isNewRow) {
              existingRow.IdxNo = targetRow + 1
              const curStatus = existingRow.WorkingTag || existingRow.Status || ''
              const nextStatus = isNewRow ? 'A' : curStatus === 'A' ? 'A' : 'U'
              existingRow.WorkingTag = nextStatus
              existingRow.Status = nextStatus
            }

            nextData[targetRow] = existingRow
          }

          // 3. Giữ nguyên các dòng sau vùng dán (nếu có)
          for (let r = startRow + numPastedRows; r < prevData.length; r++) {
            nextData[r] = prevData[r]
          }

          if (typeof setNumRows === 'function' && nextData.length !== prevData.length) {
            setNumRows(nextData.length)
          }

          return nextData
        })

        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'success',
            text: t('Đã dán thành công {{count}} dòng dữ liệu!', {
              count: numPastedRows.toLocaleString()
            })
          })
        }
      } finally {
        if (isBatch) {
          // Tính thời gian render an toàn theo số lượng dòng (tối đa 1.5s cho 20.000 dòng)
          const unlockDelay = Math.min(1500, Math.max(250, Math.round(numPastedRows * 0.04)))
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                togglePageInteraction(false)
              }, unlockDelay)
            })
          })
        }
      }

      // Return false để Glide Data Grid không chạy fallback vòng lặp từng cell làm freeze trình duyệt
      return false
    },
    [cols, canEdit, isReadOnlyColumn, setGridData, setNumRows, setStatusMessage, t]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Danh sách Root Menu')}</span>
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
          freezeTrailingRows={0}
          rowHeight={23}
          onPaste={onPaste}
          fillHandle={true}
          keybindings={keybindings}
          isDraggable={false}
          onRowAppended={() => handleRowAppend(1)}
          onCellEdited={onCellEdited}
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
          title={<span className="text-xs flex items-center justify-end font-bold">CÀI ĐẶT SHEET</span>}
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
