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
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { useDateFormat } from '../../../../hooks/useDateFormat'
import { usePageData } from '../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set(['Active', 'IsDataLock'])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])

const isDbRow = (row) =>
  Boolean(
    row &&
      (row.IdSeq ||
        row.RoleGroupSeq ||
        row.UserSeq ||
        row.RoleRecordId ||
        row.CreatedAt ||
        row.CreatedBy)
  )

export default function RoleGroupTable({
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
  canDelete = true,
  onDeleteRow = null,
  defaultCols,
  tableId = 'role_grp',
  readOnlyBg,
  gridTheme: customGridTheme,
  onVisibleRegionChanged,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig(tableId)

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
    tableId,
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    readOnlyBg,
    gridTheme: customGridTheme,
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
      const isNumber = column.kind === 'Number'
      const isDate =
        DATE_KEYS.has(columnKey) || columnKey.endsWith('Date') || columnKey.endsWith('At')
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly =
        isReadOnlyColumn(columnKey, column) ||
        column.readonly ||
        columnKey === 'CreatedByName' ||
        columnKey === 'CreatedBy' ||
        columnKey === 'CreatedAt' ||
        columnKey === 'UpdatedByName' ||
        columnKey === 'UpdatedBy' ||
        columnKey === 'UpdatedAt' ||
        columnKey === 'Id' ||
        false
      return {
        columnKey,
        isStatus,
        isBoolean,
        isNumber,
        isDate,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, canEdit, getCellTheme, isReadOnlyColumn])

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
      const isReadOnly =
        meta.isReadOnly ||
        (canEdit === false &&
          !(canCreate && (item.WorkingTag || item.Status) === 'A' && !item.IdSeq))

      if (meta.isStatus) {
        const strVal = String(value || '')
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
          readonly: isReadOnly,
          allowOverlay: !isReadOnly,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      if (meta.isNumber) {
        const numberValue = Number(value)
        return {
          kind: GridCellKind.Number,
          data: Number.isFinite(numberValue) ? numberValue : 0,
          displayData: value === '' ? '' : String(value),
          readonly: isReadOnly,
          allowOverlay: !isReadOnly,
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
        readonly: isReadOnly,
        allowOverlay: !isReadOnly,
        hasMenu: meta.hasMenu,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata, formatDateTime, canEdit, canCreate]
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
      const indexes = reorderColumns(cols)
      const [col, row] = cell
      const key = indexes[col]
      const column = cols[col]
      const rowData = gridData[row]
      const isDb = isDbRow(rowData)
      const isNewRow =
        canCreate && !isDb && (rowData?.WorkingTag === 'A' || rowData?.Status === 'A')
      if (canEdit === false && !isNewRow) return

      if (
        isReadOnlyColumn(key, column) ||
        column?.readonly ||
        key === 'WorkingTag' ||
        key === 'Status' ||
        key === 'Id' ||
        key === 'CreatedByName' ||
        key === 'CreatedBy' ||
        key === 'CreatedAt' ||
        key === 'UpdatedByName' ||
        key === 'UpdatedBy' ||
        key === 'UpdatedAt'
      ) {
        return
      }

      setGridData((prevData) => {
        const updatedData = [...prevData]
        if (!updatedData[row]) updatedData[row] = {}

        const rowItem = updatedData[row]
        const isDbItem = isDbRow(rowItem)
        const currentStatus = rowItem['WorkingTag'] || rowItem['Status'] || ''
        const nextStatus = isDbItem ? (currentStatus === 'D' ? 'D' : 'U') : 'A'
        updatedData[row][key] = newValue.data
        updatedData[row]['WorkingTag'] = nextStatus
        updatedData[row]['Status'] = nextStatus

        return updatedData
      })
    },
    [cols, canEdit, canCreate, gridData, isReadOnlyColumn, setGridData]
  )

  // ── 4. DÁN HÀNG LOẠT ──
  const onPaste = useCallback(
    (target, values) => {
      if (!values || values.length === 0) {
        return false
      }

      const [startCol, startRow] = target
      const pastedRows = Array.from(
        { length: values.length },
        (_, index) => gridData[startRow + index]
      )
      const canPasteToNewRows =
        canCreate &&
        pastedRows.every(
          (row) => row && !isDbRow(row) && (row.WorkingTag === 'A' || row.Status === 'A')
        )
      if (canEdit === false && !canPasteToNewRows) return false
      const indexes = reorderColumns(cols)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

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
          const nextData = [...prevData]
          for (let r = 0; r < numPastedRows; r++) {
            const targetRow = startRow + r
            const rowValues = values[r] || []
            const existingRow = nextData[targetRow]
              ? { ...nextData[targetRow] }
              : { WorkingTag: 'A', Status: 'A' }
            const isDb = isDbRow(existingRow)
            const isNewRow =
              !isDb &&
              (!nextData[targetRow] ||
                existingRow.WorkingTag === 'A' ||
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
                columnKey === 'CreatedByName' ||
                columnKey === 'CreatedBy' ||
                columnKey === 'CreatedAt' ||
                columnKey === 'UpdatedByName' ||
                columnKey === 'UpdatedBy' ||
                columnKey === 'UpdatedAt' ||
                column?.readonly ||
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
              const curStatus = existingRow.WorkingTag || existingRow.Status || ''
              const nextStatus = isDb ? (curStatus === 'D' ? 'D' : 'U') : 'A'
              existingRow.WorkingTag = nextStatus
              existingRow.Status = nextStatus
            }

            nextData[targetRow] = existingRow
          }

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

      return false
    },
    [
      cols,
      canEdit,
      canCreate,
      gridData,
      isReadOnlyColumn,
      setGridData,
      setNumRows,
      setStatusMessage,
      t
    ]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  // ── 5. KÉO ĐIỀN (FILL HANDLE / DRAG-FILL) CHUẨN GLIDE DATA GRID ──
  const onFillPattern = useCallback(
    (args) => {
      if (!canEdit && !canCreate) return
      const patternSource = args?.patternSource
      const fillDestination = args?.fillDestination
      if (!patternSource || !fillDestination) return

      const indexes = reorderColumns(cols)

      setGridData((prevData) => {
        const nextData = [...prevData]
        let hasAnyChange = false

        for (let dy = 0; dy < fillDestination.height; dy++) {
          const targetRow = fillDestination.y + dy
          if (targetRow < 0) continue

          if (!nextData[targetRow]) {
            if (!canCreate) continue
            nextData[targetRow] = { WorkingTag: 'A', Status: 'A' }
          }

          const existingRow = { ...nextData[targetRow] }
          const isDb = isDbRow(existingRow)
          const isNewRow =
            !isDb &&
            (!nextData[targetRow] ||
              existingRow.WorkingTag === 'A' ||
              existingRow.Status === 'A')

          if (canEdit === false && !isNewRow) continue

          const srcPatternY = patternSource.y + (dy % patternSource.height)
          const srcRow = prevData[srcPatternY] || {}
          let rowChanged = false

          for (let dx = 0; dx < fillDestination.width; dx++) {
            const targetCol = fillDestination.x + dx
            if (targetCol >= cols.length) continue

            const colKey = indexes[targetCol]
            const column = cols[targetCol]

            if (
              !colKey ||
              colKey === 'WorkingTag' ||
              colKey === 'Status' ||
              colKey === 'Id' ||
              colKey === 'IdSeq' ||
              colKey === 'IdxNo' ||
              colKey === 'CreatedByName' ||
              colKey === 'CreatedBy' ||
              colKey === 'CreatedAt' ||
              colKey === 'UpdatedByName' ||
              colKey === 'UpdatedBy' ||
              colKey === 'UpdatedAt' ||
              column?.readonly ||
              isReadOnlyColumn(colKey, column)
            ) {
              continue
            }

            const srcPatternX = patternSource.x + (dx % patternSource.width)
            const srcColKey = indexes[srcPatternX]
            if (!srcColKey) continue

            const sourceVal = srcRow[srcColKey]
            const isBoolCol = column?.kind === 'Boolean' || BOOLEAN_KEYS.has(colKey)
            const isNumCol = column?.kind === 'Number'

            if (isBoolCol) {
              const boolVal = Boolean(
                sourceVal === true ||
                sourceVal === 1 ||
                sourceVal === '1' ||
                String(sourceVal).toLowerCase() === 'true'
              )
              const oldBool = Boolean(
                existingRow[colKey] === true ||
                existingRow[colKey] === 1 ||
                existingRow[colKey] === '1' ||
                String(existingRow[colKey]).toLowerCase() === 'true'
              )
              if (oldBool !== boolVal) {
                existingRow[colKey] = boolVal
                rowChanged = true
              }
            } else if (isNumCol) {
              const numVal = Number(sourceVal)
              const finalNum = Number.isFinite(numVal) ? numVal : 0
              if (Number(existingRow[colKey]) !== finalNum) {
                existingRow[colKey] = finalNum
                rowChanged = true
              }
            } else {
              const textVal = sourceVal ?? ''
              if (String(existingRow[colKey] ?? '') !== String(textVal)) {
                existingRow[colKey] = textVal
                rowChanged = true
              }
            }
          }

          if (rowChanged) {
            const curStatus = existingRow.WorkingTag || existingRow.Status || ''
            const nextStatus = isDb ? (curStatus === 'D' ? 'D' : 'U') : 'A'
            existingRow.WorkingTag = nextStatus
            existingRow.Status = nextStatus
            nextData[targetRow] = existingRow
            hasAnyChange = true
          }
        }

        if (hasAnyChange) {
          if (typeof setNumRows === 'function' && nextData.length !== prevData.length) {
            setNumRows(nextData.length)
          }
          return nextData
        }
        return prevData
      })
    },
    [canEdit, canCreate, cols, isReadOnlyColumn, setGridData, setNumRows]
  )

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Danh sách Nhóm Quyền')}</span>
        </h2>
        <DataEditor
          ref={gridRef}
          theme={gridTheme}
          columns={cols}
          getCellContent={getData}
          onFillPattern={onFillPattern}
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
          fillHandle={Boolean(canEdit || canCreate)}
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
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onDeleteRow={onDeleteRow}
                  onPaste={onPaste}
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
