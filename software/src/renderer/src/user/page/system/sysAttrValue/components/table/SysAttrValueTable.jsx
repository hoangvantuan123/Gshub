/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../../components/sheet/jsx/layoutContextMenu'
import GenericCodeHelpModal from '../../../../../components/query/core/GenericCodeHelpModal'
import { Drawer, Checkbox } from 'antd'
import { reorderColumns } from '../../../../../components/sheet/js/reorderColumns'
import useOnFill from '../../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../../components/hooks/sheet/useTableConfig'
import { CODE_HELP_COLUMNS_ATTR_VALUE } from '../../columns/sysAttrValueColumns'
import { useDateFormat } from '../../../../../hooks/useDateFormat'
import { usePageData } from '../../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../../utils/togglePageInteraction'
import { PostSysAttrGroupH } from '@renderer/api/help'
import { createCodeHelpFetcher } from '../../../../../utils/codeHelpUtils'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set(['IsActive', 'Active'])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])

// Bộ nhớ đệm cache nhóm thuộc tính cục bộ (tránh gọi API lặp lại)
const globalGroupCache = new Map()

const normalizeKey = (text) =>
  typeof text === 'string' || typeof text === 'number'
    ? text
        .toString()
        .trim()
        .replace(/^[,\s]+|[,\s]+$/g, '')
        .toLowerCase()
        .normalize('NFC')
    : ''

const fetchAndCacheSysAttrGroups = async (missingKeywords = []) => {
  try {
    const res = await PostSysAttrGroupH({
      Keyword: '',
      Page: '1',
      Limit: '500'
    })

    let rawItems = []
    if (res && res.success) {
      const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      if (Array.isArray(parsed)) rawItems = parsed
    }

    rawItems.forEach((item) => {
      const resolved = {
        GroupCode: item.GroupCode || item.groupCode || item.Key || item.Code || '',
        GroupName: item.GroupName || item.groupName || item.Label || item.Name || '',
        AttrGroupSeq: item.IdSeq || item.idSeq || item.Id || item.id || ''
      }
      if (resolved.GroupCode) globalGroupCache.set(normalizeKey(resolved.GroupCode), resolved)
      if (resolved.GroupName) globalGroupCache.set(normalizeKey(resolved.GroupName), resolved)
      if (resolved.AttrGroupSeq) globalGroupCache.set(normalizeKey(resolved.AttrGroupSeq), resolved)
    })

    const stillMissing = (missingKeywords || []).filter(
      (kw) => kw && !globalGroupCache.has(normalizeKey(kw))
    )
    if (stillMissing.length > 0) {
      await Promise.all(
        stillMissing.slice(0, 10).map(async (kw) => {
          try {
            const kwRes = await PostSysAttrGroupH({
              Keyword: String(kw).trim(),
              Page: '1',
              Limit: '10'
            })
            if (kwRes && kwRes.success) {
              const kwParsed = typeof kwRes.data === 'string' ? JSON.parse(kwRes.data) : kwRes.data
              if (Array.isArray(kwParsed)) {
                kwParsed.forEach((item) => {
                  const resolved = {
                    GroupCode: item.GroupCode || item.groupCode || item.Key || item.Code || '',
                    GroupName: item.GroupName || item.groupName || item.Label || item.Name || '',
                    AttrGroupSeq: item.IdSeq || item.idSeq || item.Id || item.id || ''
                  }
                  if (resolved.GroupCode)
                    globalGroupCache.set(normalizeKey(resolved.GroupCode), resolved)
                  if (resolved.GroupName)
                    globalGroupCache.set(normalizeKey(resolved.GroupName), resolved)
                  if (resolved.AttrGroupSeq)
                    globalGroupCache.set(normalizeKey(resolved.AttrGroupSeq), resolved)
                })
              }
            }
          } catch (e) {
            console.warn('Query single keyword error:', e)
          }
        })
      )
    }
  } catch (err) {
    console.warn('Fetch and cache SysAttrGroupH error:', err)
  }
}

export default function SysAttrValueTable({
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
  onAddQueryField,
  tableStorageKey = 'sys_attr_val',
  liveGroups = [],
  groupHelpData = [],
  groupHelpColumns = []
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig(tableStorageKey)

  const fallbackHelpColumns = useMemo(() => {
    if (groupHelpColumns && groupHelpColumns.length > 0) return groupHelpColumns
    return [
      { id: 'GroupCode', title: t('system.groupCode', 'Mã Nhóm'), width: 180 },
      { id: 'GroupName', title: t('system.groupName', 'Tên Nhóm'), width: 280 },
      { id: 'CodeHelp', title: t('system.codeHelp', 'CodeHelp'), width: 100 },
      { id: 'Comment', title: t('system.comment', 'Ghi Chú'), width: 220 }
    ]
  }, [groupHelpColumns, t])

  // Cấu hình CodeHelp: CHỈ cột GroupCode là CodeHelp
  const codeHelpConfig = useMemo(
    () => ({
      GroupCode: {
        title: t('system.lookupAttrGroupModal', 'Tra cứu Nhóm Thuộc Tính'),
        helpData: groupHelpData,
        fetchHelpData: createCodeHelpFetcher(PostSysAttrGroupH),
        columns: fallbackHelpColumns,
        onSelect: (selected) => {
          if (!selected) return
          const resolved = {
            AttrGroupSeq: selected.IdSeq || selected.idSeq || selected.Id || '',
            GroupCode:
              selected.GroupCode || selected.groupCode || selected.Key || selected.Code || '',
            GroupName:
              selected.GroupName || selected.groupName || selected.Label || selected.Name || ''
          }
          if (resolved.GroupCode) globalGroupCache.set(normalizeKey(resolved.GroupCode), resolved)
          if (resolved.GroupName) globalGroupCache.set(normalizeKey(resolved.GroupName), resolved)
          if (resolved.AttrGroupSeq)
            globalGroupCache.set(normalizeKey(resolved.AttrGroupSeq), resolved)
          return resolved
        }
      }
    }),
    [fallbackHelpColumns, groupHelpData, t]
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
    isCodeHelpColumn,
    isReadOnlyColumn,
    gridTheme,
    onCellClicked,
    onCellActivated,
    onKeyDown,
    onCellContextMenu,
    onHeaderContextMenu,
    codeHelpModal,
    closeCodeHelpModal,
    handleSelectCodeHelp
  } = useTableManager({
    tableId: tableStorageKey,
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    codeHelpColumns: CODE_HELP_COLUMNS_ATTR_VALUE,
    codeHelpConfig,
    setShowSearch,
    onAddQueryField
  })

  const onClose = () => setOpen(false)

  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isCodeHelp =
        CODE_HELP_COLUMNS_ATTR_VALUE.includes(columnKey) || isCodeHelpColumn(columnKey)
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)
      const isDate =
        DATE_KEYS.has(columnKey) || columnKey.endsWith('Date') || columnKey.endsWith('At')
      const isNumber = column.kind === 'Number'
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || false

      return {
        columnKey,
        isStatus,
        isCodeHelp,
        isBoolean,
        isDate,
        isNumber,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isCodeHelpColumn, isReadOnlyColumn])

  const getCellContent = useCallback(
    ([colIndex, rowIndex]) => {
      const meta = colMetadata[colIndex]
      if (!meta) return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }

      const row = gridData[rowIndex] || {}
      const rawValue = row[meta.columnKey]

      if (meta.isStatus) {
        const strVal = String(rawValue ?? '')
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          allowOverlay: false,
          readonly: true,
          hasMenu: meta.hasMenu,
          contentAlign: 'center',
          themeOverride: meta.cellTheme
        }
      }

      if (meta.isCodeHelp) {
        const strVal = String(rawValue ?? '')
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          allowOverlay: false,
          readonly: true,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      if (meta.isBoolean) {
        const boolVal = rawValue === true || rawValue === 1 || rawValue === '1'
        return {
          kind: GridCellKind.Boolean,
          data: boolVal,
          allowOverlay: false,
          readonly: !canEdit || meta.isReadOnly,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      if (meta.isNumber) {
        const numVal = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: String(rawValue ?? ''),
          readonly: !canEdit || meta.isReadOnly,
          allowOverlay: !meta.isReadOnly,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      if (meta.isDate && rawValue) {
        const formattedDate = formatDateTime(rawValue)
        return {
          kind: GridCellKind.Text,
          data: formattedDate,
          displayData: formattedDate,
          allowOverlay: true,
          readonly: !canEdit || meta.isReadOnly,
          hasMenu: meta.hasMenu,
          themeOverride: meta.cellTheme
        }
      }

      const strVal = rawValue !== null && rawValue !== undefined ? String(rawValue) : ''
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        allowOverlay: !meta.isReadOnly,
        readonly: !canEdit || meta.isReadOnly,
        hasMenu: meta.hasMenu,
        themeOverride: meta.cellTheme
      }
    },
    [colMetadata, gridData, canEdit, formatDateTime]
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
        meta.columnKey === 'IdSeq' ||
        meta.columnKey === 'GroupName'
      )
        return

      let valToSet = newValue?.data
      if (meta.isBoolean) {
        valToSet = Boolean(newValue?.data)
      } else if (cols[colIndex]?.kind === 'Number') {
        valToSet = valToSet === '' || valToSet === undefined ? null : Number(valToSet)
      }

      setGridData((prev) => {
        const next = [...prev]
        if (!next[rowIndex]) return prev

        const updatedRow = { ...next[rowIndex], [meta.columnKey]: valToSet }

        // Tự động map GroupName và AttrGroupSeq khi gõ GroupCode
        if (meta.columnKey === 'GroupCode') {
          const normVal = normalizeKey(valToSet)
          const match =
            globalGroupCache.get(normVal) ||
            (liveGroups || []).find(
              (g) => normalizeKey(g.GroupCode) === normVal || normalizeKey(g.GroupName) === normVal
            )

          if (match) {
            updatedRow.GroupCode = match.GroupCode
            updatedRow.GroupName = match.GroupName
            updatedRow.AttrGroupSeq = match.IdSeq || match.AttrGroupSeq || ''
          } else if (valToSet) {
            // Gọi bất đồng bộ nếu chưa có trong cache
            fetchAndCacheSysAttrGroups([valToSet]).then(() => {
              const asyncMatch = globalGroupCache.get(normalizeKey(valToSet))
              if (asyncMatch) {
                setGridData((currentData) => {
                  const nextData = [...currentData]
                  if (nextData[rowIndex]) {
                    nextData[rowIndex] = {
                      ...nextData[rowIndex],
                      GroupCode: asyncMatch.GroupCode,
                      GroupName: asyncMatch.GroupName,
                      AttrGroupSeq: asyncMatch.AttrGroupSeq
                    }
                  }
                  return nextData
                })
              }
            })
          } else {
            updatedRow.GroupName = ''
            updatedRow.AttrGroupSeq = ''
          }
        }

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
    [canEdit, colMetadata, cols, liveGroups, setGridData, setStatusMessage, t]
  )

  const onPaste = useCallback(
    async (target, values) => {
      if (!values || values.length === 0 || canEdit === false) {
        return false
      }

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
          setStatusMessage({
            type: 'info',
            text: msg
          })
        }
      }

      try {
        // 1. Thu thập các giá trị GroupCode và GroupName cần phân giải
        const groupTexts = new Set()
        for (let r = 0; r < numPastedRows; r++) {
          const rowVals = values[r] || []
          for (let c = 0; c < numPastedCols; c++) {
            const targetCol = startCol + c
            if (targetCol >= cols.length) break
            const colKey = indexes[targetCol]
            const rawVal = String(rowVals[c] ?? '').trim()
            if (!rawVal) continue

            if (colKey === 'GroupCode' || colKey === 'GroupName') {
              groupTexts.add(rawVal)
            }
          }
        }

        // Nạp trước từ cache liveGroups cục bộ nếu có
        ;(liveGroups || []).forEach((item) => {
          const resolved = {
            GroupCode: item.GroupCode || '',
            GroupName: item.GroupName || '',
            AttrGroupSeq: item.IdSeq || ''
          }
          if (item.GroupCode) globalGroupCache.set(normalizeKey(item.GroupCode), resolved)
          if (item.GroupName) globalGroupCache.set(normalizeKey(item.GroupName), resolved)
          if (item.IdSeq) globalGroupCache.set(normalizeKey(item.IdSeq), resolved)
        })

        // Phân giải các mã chưa có trong cache
        const missingGroupTexts = Array.from(groupTexts).filter(
          (text) => !globalGroupCache.has(normalizeKey(text))
        )

        if (missingGroupTexts.length > 0 || globalGroupCache.size === 0) {
          await fetchAndCacheSysAttrGroups(missingGroupTexts)
        }

        // 2. Thực hiện cập nhật dữ liệu bảng DataEditor
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
                columnKey === 'IdxNo'
              ) {
                continue
              }

              let cellVal = rowValues[c] ?? ''

              if (columnKey === 'GroupCode') {
                const normVal = normalizeKey(cellVal)
                const matched = globalGroupCache.get(normVal)
                if (matched) {
                  existingRow.GroupCode = matched.GroupCode
                  existingRow.GroupName = matched.GroupName
                  existingRow.AttrGroupSeq = matched.AttrGroupSeq
                } else {
                  existingRow.GroupCode = cellVal
                }
                hasRowModified = true
                continue
              }

              if (columnKey === 'GroupName') {
                const normVal = normalizeKey(cellVal)
                const matched = globalGroupCache.get(normVal)
                if (matched) {
                  if (!existingRow.GroupCode) existingRow.GroupCode = matched.GroupCode
                  existingRow.GroupName = matched.GroupName
                  existingRow.AttrGroupSeq = matched.AttrGroupSeq
                } else if (!existingRow.GroupName) {
                  existingRow.GroupName = cellVal
                }
                hasRowModified = true
                continue
              }

              if (isReadOnlyColumn(columnKey, column)) {
                continue
              }

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
    [cols, canEdit, isReadOnlyColumn, liveGroups, setGridData, setNumRows, setStatusMessage, t]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>
            {tableTitle ||
              t(
                'system.sysAttrValueListTitle',
                'Danh sách Đăng ký Chi Tiết Giá Trị Thuộc Tính Hệ Thống'
              )}
          </span>
        </h2>
        <div className="flex-1 min-h-0 relative">
          <DataEditor
            ref={gridRef}
            theme={gridTheme}
            columns={cols}
            rows={effectiveRows}
            getCellContent={getCellContent}
            onCellEdited={onCellEdited}
            onFill={onFill}
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
            onRowAppended={() => handleRowAppend?.(1)}
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
        </div>

        {/* Modal CodeHelp View Sheet (F3 / Double Click) */}
        {codeHelpModal?.isOpen && (
          <GenericCodeHelpModal
            isOpen={codeHelpModal.isOpen}
            onClose={closeCodeHelpModal}
            title={codeHelpModal.title}
            helpData={codeHelpModal.helpData}
            fetchHelpData={codeHelpModal.fetchHelpData}
            columns={codeHelpModal.columns}
            initialSearchText={codeHelpModal.initialSearchText}
            onSelect={handleSelectCodeHelp}
          />
        )}

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
