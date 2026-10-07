/* eslint-disable react/prop-types, no-unused-vars, no-empty */
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
const BOOLEAN_KEYS = new Set(['Active'])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])

export default function ActionTable({
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

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('system_actions')

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
    tableId: 'system_actions',
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

  // ── 2. TRUY XUẤT Ô (60 FPS VIRTUAL SCROLLING) ──
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

      let value = item[meta.columnKey]
      if (value === undefined || value === null) {
        const k = meta.columnKey
        if (k === 'ActionKey') value = item.Key
        else if (k === 'ActionName') value = item.Name
        else if (k === 'OrderSeq') value = item.IdxNo
        else if (k === 'CreatedByName') value = item.CreatedBy
        else if (k === 'UpdatedByName') value = item.UpdatedBy
        else value = item[k.charAt(0).toLowerCase() + k.slice(1)] ?? ''
      }
      if (value === undefined || value === null) {
        value = ''
      }

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

      if (meta.columnKey === 'OrderSeq' || meta.columnKey === 'IdxNo') {
        const numVal = Number(value) || 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: String(value || 0),
          readonly: meta.isReadOnly,
          allowOverlay: !meta.isReadOnly,
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

      if (isReadOnlyColumn(key) || key === 'WorkingTag' || key === 'Status' || key === 'Id') {
        return
      }

      setGridData((prevData) => {
        const updatedData = [...prevData]
        if (!updatedData[row]) updatedData[row] = {}

        const currentStatus = updatedData[row]['WorkingTag'] || updatedData[row]['Status'] || ''
        const nextStatus = currentStatus === 'A' ? 'A' : 'U'
        updatedData[row][key] = newValue.data
        if (key === 'ActionKey') updatedData[row]['Key'] = newValue.data
        if (key === 'ActionName') updatedData[row]['Name'] = newValue.data
        if (key === 'OrderSeq') updatedData[row]['IdxNo'] = newValue.data

        updatedData[row]['WorkingTag'] = nextStatus
        updatedData[row]['Status'] = nextStatus

        return updatedData
      })
    },
    [cols, canEdit, isReadOnlyColumn, setGridData]
  )

  // ── 4. DÁN DỮ LIỆU BẢNG ──
  const onPaste = useCallback(
    (target, values) => {
      if (!values || values.length === 0 || canEdit === false) {
        return false
      }

      const [startCol, startRow] = target
      const indexes = reorderColumns(cols)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

      if (numPastedRows > 3000) {
        if (setStatusMessage) {
          setStatusMessage(t('msg.pasteLimitExceeded', 'Số lượng dòng dán vượt quá giới hạn 3,000 dòng.'))
        }
        return false
      }

      togglePageInteraction(true)

      setTimeout(() => {
        try {
          setGridData((prevData) => {
            const rowCount = prevData.length
            const newRowCount = Math.max(rowCount, startRow + numPastedRows)
            const updatedData = new Array(newRowCount)

            for (let i = 0; i < rowCount; i++) {
              updatedData[i] = prevData[i] ? { ...prevData[i] } : {}
            }
            for (let i = rowCount; i < newRowCount; i++) {
              updatedData[i] = {}
            }

            for (let rIndex = 0; rIndex < numPastedRows; rIndex++) {
              const currentRowIndex = startRow + rIndex
              const rowValues = values[rIndex]
              if (!rowValues) continue

              const rowObj = updatedData[currentRowIndex]
              const currentStatus = rowObj['WorkingTag'] || rowObj['Status'] || ''
              const isNewRow = currentRowIndex >= rowCount || currentStatus === 'A'
              const nextStatus = isNewRow ? 'A' : 'U'

              rowObj['WorkingTag'] = nextStatus
              rowObj['Status'] = nextStatus

              for (let cIndex = 0; cIndex < numPastedCols; cIndex++) {
                const currentColIndex = startCol + cIndex
                if (currentColIndex >= indexes.length) break

                const columnKey = indexes[currentColIndex]
                if (
                  isReadOnlyColumn(columnKey) ||
                  columnKey === 'WorkingTag' ||
                  columnKey === 'Status' ||
                  columnKey === 'Id'
                ) {
                  continue
                }

                const rawVal = rowValues[cIndex]
                if (BOOLEAN_KEYS.has(columnKey)) {
                  rowObj[columnKey] =
                    rawVal === 'true' || rawVal === '1' || rawVal === true || rawVal === 'TRUE'
                } else if (columnKey === 'OrderSeq' || columnKey === 'IdxNo') {
                  rowObj[columnKey] = Number(rawVal) || 0
                } else {
                  rowObj[columnKey] = rawVal ?? ''
                }
              }
            }

            return updatedData
          })

          if (startRow + numPastedRows > (gridData?.length || 0)) {
            setNumRows?.(startRow + numPastedRows)
          }

          if (setStatusMessage) {
            setStatusMessage(
              t('msg.pasteSuccess', 'Đã dán {{rows}} dòng x {{cols}} cột thành công.', {
                rows: numPastedRows,
                cols: numPastedCols
              })
            )
          }
        } finally {
          togglePageInteraction(false)
        }
      }, 0)

      return false
    },
    [cols, canEdit, isReadOnlyColumn, setGridData, setNumRows, setStatusMessage, t, gridData?.length]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Danh mục Quyền nút & Hành động (Actions)')}</span>
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
          onRowAppended={() => handleRowAppend && handleRowAppend(1)}
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
              ) : (
                <LayoutMenuSheet
                  showMenu={showMenu}
                  handleSort={handleSort}
                  cols={cols}
                  renderLayer={renderLayer}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  layerProps={layerProps}
                  handleReset={handleReset}
                  showDrawer={showDrawer}
                  handleHideColumn={handleHideColumn}
                  handleFreezeColumn={handleFreezeColumn}
                />
              )}
            </div>
          )}
        <Drawer
          title={t('CÀI ĐẶT CỘT')}
          placement="right"
          onClose={onClose}
          open={open}
          closable={false}
          width={300}
        >
          <div className="flex flex-col gap-2">
            {configurableCols.map((col) => (
              <Checkbox
                key={col.id}
                checked={!hiddenColumns.includes(col.id)}
                onChange={(e) => handleCheckboxChange(col.id, e.target.checked)}
              >
                {col.title}
              </Checkbox>
            ))}
          </div>
        </Drawer>
      </div>
    </div>
  )
}
