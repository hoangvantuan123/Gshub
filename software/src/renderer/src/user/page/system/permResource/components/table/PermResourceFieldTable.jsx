/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { Drawer, Checkbox } from 'antd'

import LayoutMenuSheet from '../../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../../components/sheet/jsx/layoutContextMenu'
import { reorderColumns } from '../../../../../components/sheet/js/reorderColumns'
import useTableManager from '../../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../../components/hooks/sheet/useTableConfig'
import GenericCodeHelpModal from '../../../../../components/query/core/GenericCodeHelpModal'
import { CODE_HELP_COLUMNS_FIELD } from '../../columns/permFieldColumns'
import { createCodeHelpFetcher } from '../../../../../utils/codeHelpUtils'
import { PostSubMenuH, PostCodeHelpQ } from '@renderer/api/help'
import { usePageData } from '../../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../../utils/togglePageInteraction'

const BOOLEAN_COLS = new Set(['IsMaskable', 'IsSensitive'])
const NUMBER_COLS = new Set(['DictSeq', 'OrderNo', 'RowVersion'])

export default function PermResourceFieldTable({
  gridData = [],
  setGridData,
  selection,
  setSelection,
  numRows = 0,
  setNumRows,
  cols = [],
  setCols,
  defaultCols = [],
  showSearch,
  setShowSearch,
  canEdit = true,
  canCreate = true,
  selectedResource = {},
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onSearchClose = useCallback(() => setShowSearch && setShowSearch(false), [setShowSearch])
  const {
    freezeColumnsCount,
    handleFreezeColumn,
    rowHeight,
    headerHeight,
    overscrollX,
    overscrollY
  } = useTableConfig('perm_res_field')

  const handleAddQueryFieldWrapper = useCallback(
    (columnKey, colTitle, activeCol) => {
      if (onAddQueryField) {
        onAddQueryField(columnKey, colTitle, activeCol, 'field', 'Trường Dữ Liệu')
      }
    },
    [onAddQueryField]
  )

  const codeHelpConfig = useMemo(
    () => ({
      FieldCode: {
        title: t('system.lookupField', 'Tra cứu Danh Mục Trường Dữ Liệu Hệ Thống'),
        fetchHelpData: createCodeHelpFetcher(PostCodeHelpQ, () => ({
          CodeHelpSeq: '1003',
          GroupCode: 'FIELD_TYPE'
        })),
        columns: [
          { id: 'AttrValueCode', title: t('system.fieldCode', 'Mã Trường'), width: 150 },
          { id: 'AttrValueName', title: t('system.fieldName', 'Tên Trường Dữ Liệu'), width: 220 },
          { id: 'Comment', title: t('system.description', 'Mô Tả / Diễn Giải'), width: 200 }
        ],
        onSelect: (item) => ({
          FieldCode: item?.AttrValueCode || item?.FieldCode || item?.Key || '',
          FieldName: item?.AttrValueName || item?.FieldName || item?.Label || '',
          DataType: item?.ExtraValue || item?.DataType || 'VARCHAR'
        })
      },
      ResourceCode: {
        title: t('system.lookupResource', 'Tra cứu Chức Năng / Phân Hệ'),
        fetchHelpData: createCodeHelpFetcher(PostSubMenuH),
        columns: [
          { id: 'SubMenuCode', title: t('system.resourceCode', 'Mã Chức Năng'), width: 160 },
          {
            id: 'SubMenuName',
            title: t('system.resourceName', 'Tên Chức Năng / Menu'),
            width: 240
          },
          { id: 'RootMenuName', title: t('system.module', 'Phân Hệ / Nhóm'), width: 160 }
        ],
        onSelect: (item) => ({
          ResourceCode: item?.SubMenuCode || item?.ResourceCode || item?.Key || '',
          ResourceName: item?.SubMenuName || item?.ResourceName || item?.Label || ''
        })
      }
    }),
    [t]
  )

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
    isReadOnlyColumn,
    onCellClicked,
    onCellActivated,
    onKeyDown,
    onCellContextMenu,
    onHeaderContextMenu,
    codeHelpModal,
    closeCodeHelpModal,
    handleSelectCodeHelp,
    onItemHovered
  } = useTableManager({
    tableId: 'perm_res_field',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    codeHelpColumns: CODE_HELP_COLUMNS_FIELD,
    codeHelpConfig,
    setShowSearch,
    onAddQueryField: handleAddQueryFieldWrapper
  })

  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_COLS.has(columnKey)
      const isNumber = column.kind === 'Number' || NUMBER_COLS.has(columnKey)
      const isReadOnly =
        (isReadOnlyColumn && isReadOnlyColumn(columnKey, column)) || column.readonly || false
      const cellTheme = getCellTheme ? getCellTheme(columnKey, column) : {}
      return {
        columnKey,
        isStatus,
        isBoolean,
        isNumber,
        isReadOnly,
        cellTheme,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  const getCellContent = useCallback(
    ([col, row]) => {
      const rowData = gridData[row] || {}
      const meta = colMetadata[col]

      if (!meta) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          allowOverlay: false,
          readonly: true
        }
      }

      const { columnKey, isStatus, isBoolean, isNumber, isReadOnly, cellTheme } = meta
      const val = rowData[columnKey] ?? ''

      if (isStatus) {
        const status = String(val)
        let bg = '#FFFFFF'
        let text = '#225588'
        if (status === 'I' || status === 'A') {
          bg = '#ebfbee'
          text = '#2b8a3e'
        } else if (status === 'U') {
          bg = '#fff9db'
          text = '#e67700'
        } else if (status === 'D') {
          bg = '#fff5f5'
          text = '#e03131'
        }
        return {
          kind: GridCellKind.Text,
          data: status,
          displayData: status,
          allowOverlay: false,
          readonly: true,
          themeOverride: {
            bgCell: bg,
            textDark: text,
            baseFontStyle: '600 12px'
          }
        }
      }

      if (isBoolean) {
        const boolVal =
          val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          allowOverlay: false,
          readonly: !canEdit || isReadOnly,
          themeOverride: cellTheme
        }
      }

      if (isNumber) {
        const numVal = val !== '' && val !== null && !isNaN(Number(val)) ? Number(val) : 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: val === '' || val === null ? '' : String(val),
          allowOverlay: true,
          readonly: !canEdit || isReadOnly,
          themeOverride: cellTheme
        }
      }

      return {
        kind: GridCellKind.Text,
        data: String(val),
        displayData: String(val),
        allowOverlay: true,
        readonly: !canEdit || isReadOnly,
        themeOverride: cellTheme
      }
    },
    [colMetadata, gridData, canEdit]
  )

  const onCellEdited = useCallback(
    ([colIndex, rowIndex], newValue) => {
      if (!canEdit) return
      const meta = colMetadata[colIndex]
      if (
        !meta ||
        meta.isReadOnly ||
        meta.columnKey === 'WorkingTag' ||
        meta.columnKey === 'Status' ||
        meta.columnKey === 'IdSeq'
      )
        return

      let valToSet = newValue?.data
      if (meta.isBoolean) {
        valToSet = Boolean(newValue?.data)
      } else if (meta.isNumber) {
        valToSet =
          newValue?.data !== '' && !isNaN(Number(newValue?.data)) ? Number(newValue?.data) : 0
      }

      setGridData((prev) => {
        const next = [...prev]
        if (!next[rowIndex]) return prev

        const updatedRow = { ...next[rowIndex], [meta.columnKey]: valToSet }
        const curStatus = updatedRow.WorkingTag || updatedRow.Status || ''
        const nextStatus = curStatus === 'A' || curStatus === 'I' ? curStatus : 'U'
        updatedRow.WorkingTag = nextStatus
        updatedRow.Status = nextStatus
        next[rowIndex] = updatedRow
        return next
      })

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'info',
          text: t('system.rowUpdated', 'Đã cập nhật dòng')
        })
      }
    },
    [canEdit, colMetadata, setGridData, setStatusMessage, t]
  )

  const onPaste = useCallback(
    (target, values) => {
      if (!values || values.length === 0 || canEdit === false) return false

      const [startCol, startRow] = target
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
          setStatusMessage({ type: 'info', text: msg })
        }
      }

      try {
        setGridData((prevData) => {
          const requiredLength = Math.max(prevData.length, startRow + numPastedRows)
          const nextData = new Array(requiredLength)

          for (let r = 0; r < startRow; r++) {
            nextData[r] = prevData[r] || {}
          }

          for (let r = 0; r < numPastedRows; r++) {
            const targetRow = startRow + r
            const existingRow = prevData[targetRow] ? { ...prevData[targetRow] } : {}
            const rowValues = values[r] || []
            const isNewRow =
              !existingRow.IdSeq &&
              (!existingRow.WorkingTag ||
                existingRow.WorkingTag === 'A' ||
                existingRow.WorkingTag === 'I' ||
                !existingRow.Status ||
                existingRow.Status === 'A' ||
                existingRow.Status === 'I')

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
                columnKey === 'IdSeq' ||
                columnKey === 'IdxNo' ||
                isReadOnlyColumn(columnKey, column)
              ) {
                continue
              }

              let cellVal = rowValues[c] ?? ''
              if (column?.kind === 'Boolean' || BOOLEAN_COLS.has(columnKey)) {
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
              const nextStatus = isNewRow
                ? 'A'
                : curStatus === 'A' || curStatus === 'I'
                  ? curStatus
                  : 'U'
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
    [cols, canEdit, isReadOnlyColumn, setGridData, setNumRows, setStatusMessage, t]
  )

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden relative">
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          rows={numRows}
          columns={cols}
          getCellContent={getCellContent}
          getCellsForSelection={true}
          onCellEdited={onCellEdited}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onKeyDown={onKeyDown}
          onItemHovered={onItemHovered}
          fillHandle={true}
          theme={gridTheme}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          onPaste={onPaste}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderContextMenu={onHeaderContextMenu}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onCellContextMenu={onCellContextMenu}
          freezeColumns={freezeColumnsCount}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          rowMarkers="both"
          rowHeight={rowHeight || 23}
          headerHeight={headerHeight || 23}
          overscrollX={overscrollX || 50}
          overscrollY={overscrollY || 20}
          smoothScrollX={true}
          smoothScrollY={true}
          keybindings={keybindings}
        />
      </div>

      {/* MODAL CODEHELP TRA CỨU DANH MỤC TRƯỜNG DỮ LIỆU */}
      {codeHelpModal?.isOpen && (
        <GenericCodeHelpModal
          isOpen={codeHelpModal.isOpen}
          onClose={closeCodeHelpModal}
          title={codeHelpModal.title}
          helpData={codeHelpModal.helpData}
          columns={codeHelpModal.columns}
          initialSearchText={codeHelpModal.initialSearchText}
          onSelect={handleSelectCodeHelp}
        />
      )}

      {/* HEADER & CONTEXT MENU */}
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

      {/* DRAWER CÀI ĐẶT ẨN / HIỆN CỘT */}
      <Drawer
        title={
          <span className="text-xs flex items-center justify-end font-bold">CÀI ĐẶT CỘT SHEET</span>
        }
        styles={{ body: { padding: 15 } }}
        onClose={() => setOpen(false)}
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
  )
}
