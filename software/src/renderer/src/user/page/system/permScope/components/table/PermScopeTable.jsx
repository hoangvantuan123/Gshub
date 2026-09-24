/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from 'antd'
import { reorderColumns } from '../../../../../components/sheet/js/reorderColumns'
import useOnFill from '../../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../../components/hooks/sheet/useTableConfig'
import GenericCodeHelpModal from '../../../../../components/query/core/GenericCodeHelpModal'
import { CODE_HELP_COLUMNS_SCOPE } from '../../columns/permScopeColumns'
import { useDateFormat } from '../../../../../hooks/useDateFormat'
import { usePageData } from '../../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../../utils/togglePageInteraction'
import { createCodeHelpFetcher, fetchBatchCodeHelp } from '../../../../../utils/codeHelpUtils'
import { PostPermActionsH, PostCodeHelpQ } from '@renderer/api/help'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set(['IsActive', 'Active', 'Allow'])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])
export default function PermScopeTable({
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
  tableStorageKey = 'perm_scope'
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const normalize = (text) =>
    typeof text === 'string' || typeof text === 'number'
      ? text
          .toString()
          .trim()
          .replace(/^[,\s]+|[,\s]+$/g, '')
          .toLowerCase()
          .normalize('NFC')
      : ''

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig(tableStorageKey)

  const codeHelpConfig = useMemo(
    () => ({
      OperationCode: {
        title: t('system.lookupOperation', 'Tra cứu Hành Động Quyền Hạn (perm_action)'),
        fetchHelpData: createCodeHelpFetcher(PostPermActionsH),
        columns: [
          {
            id: 'ActionCode',
            title: t('system.operationCode', 'Mã Hành Động (Action)'),
            width: 160
          },
          {
            id: 'ActionName',
            title: t('system.operationName', 'Tên Hành Động / Nút Bấm'),
            width: 280
          },
          {
            id: 'LangKey',
            title: t('system.langKey', 'Mã Key Ngôn Ngữ'),
            width: 160
          },
          {
            id: 'Comment',
            title: t('system.comment', 'Ghi Chú'),
            width: 220
          }
        ],
        onSelect: (item) => ({
          OperationCode: item?.ActionCode || item?.OperationCode || item?.Key || '',
          OperationName: item?.ActionName || item?.OperationName || item?.Label || '',
          PermActionSeq: item?.IdSeq || item?.PermActionSeq || item?.Id || ''
        })
      },
      DefaultScopeLevel: {
        title: t('system.lookupScopeLevel', 'Tra cứu Cấp Phạm Vi Dữ Liệu (SCOPE_LEVEL - 1001)'),
        fetchHelpData: createCodeHelpFetcher(PostCodeHelpQ, () => ({
          CodeHelpSeq: '1001',
          GroupCode: 'SCOPE_LEVEL'
        })),
        columns: [
          { id: 'AttrValueCode', title: t('system.levelCode', 'Mã Cấp'), width: 140 },
          {
            id: 'AttrValueName',
            title: t('system.levelName', 'Tên Cấp Phạm Vi'),
            width: 240
          },
          { id: 'Comment', title: t('system.description', 'Mô Tả / Diễn Giải'), width: 260 }
        ],
        onSelect: (item) => ({
          DefaultScopeLevel:
            item?.AttrValueCode || item?.DefaultScopeLevel || item?.Key || item?.ItemCode || '',
          DefaultScopeLevelLabel:
            item?.AttrValueName || item?.DefaultScopeLevelLabel || item?.Label || item?.ItemName || '',
          ScopeLevelSeq: item?.IdSeq || item?.ScopeLevelSeq || item?.Id || ''
        })
      },
      RuleCondition: {
        title: t('system.lookupCondition', 'Tra cứu Điều Kiện Trạng Thái Phiếu (RULE_CONDITION - 1002)'),
        fetchHelpData: createCodeHelpFetcher(PostCodeHelpQ, () => ({
          CodeHelpSeq: '1002',
          GroupCode: 'RULE_CONDITION'
        })),
        columns: [
          { id: 'AttrValueCode', title: t('system.conditionCode', 'Mã Điều Kiện'), width: 150 },
          {
            id: 'AttrValueName',
            title: t('system.conditionName', 'Điều Kiện Phiếu'),
            width: 240
          },
          { id: 'Comment', title: t('system.description', 'Diễn giải'), width: 260 }
        ],
        onSelect: (item) => ({
          RuleCondition:
            item?.AttrValueCode || item?.RuleCondition || item?.Key || item?.ItemCode || '',
          RuleConditionLabel:
            item?.AttrValueName || item?.RuleConditionLabel || item?.Label || item?.ItemName || '',
          RuleConditionSeq: item?.IdSeq || item?.RuleConditionSeq || item?.Id || ''
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
    codeHelpColumns: CODE_HELP_COLUMNS_SCOPE,
    codeHelpConfig,
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
      const isCodeHelp = isCodeHelpColumn(columnKey)
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || false
      return {
        columnKey,
        isStatus,
        isBoolean,
        isDate,
        isCodeHelp,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isCodeHelpColumn, isReadOnlyColumn])

  // ── 2. TRUY XUẤT Ô ──
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

      if (meta.isCodeHelp) {
        const strVal = typeof value === 'string' ? value : String(value)
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
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

      // Chặn chỉnh sửa trực tiếp cho cột CodeHelp (phải Double Click hoặc Dán)
      if (
        isReadOnlyColumn(key) ||
        CODE_HELP_COLUMNS_SCOPE.includes(key) ||
        key === 'WorkingTag' ||
        key === 'Status' ||
        key === 'Id' ||
        key === 'IdSeq' ||
        key === 'IdxNo'
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

  // ── 4. DÁN HÀNG LOẠT SIÊU TỐC VỚI GOM NHÓM BATCH RESOLVE ON-DEMAND ──
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
        // 1. Thu thập và Gom nhóm (Deduplicate) các giá trị CodeHelp cần phân giải từ Server On-Demand
        const actionTexts = new Set()
        const scopeTexts = new Set()
        const ruleTexts = new Set()

        for (let r = 0; r < numPastedRows; r++) {
          const rowVals = values[r] || []
          for (let c = 0; c < numPastedCols; c++) {
            const targetCol = startCol + c
            if (targetCol >= cols.length) break
            const colKey = indexes[targetCol]
            const rawVal = String(rowVals[c] ?? '')
              .trim()
              .replace(/^[,\s]+|[,\s]+$/g, '')
            if (!rawVal) continue

            if (colKey === 'OperationCode' || colKey === 'OperationName') {
              actionTexts.add(rawVal)
            } else if (colKey === 'DefaultScopeLevel' || colKey === 'DefaultScopeLevelLabel') {
              scopeTexts.add(rawVal)
            } else if (colKey === 'RuleCondition' || colKey === 'RuleConditionLabel') {
              ruleTexts.add(rawVal)
            }
          }
        }

        // 2. Gửi duy nhất 1 request batch tối đa 200 mã On-Demand
        const batchPromises = []
        if (actionTexts.size > 0) {
          batchPromises.push(
            fetchBatchCodeHelp(PostPermActionsH, actionTexts, 200)
              .then((data) => ({ type: 'action', data }))
              .catch(() => ({ type: 'action', data: [] }))
          )
        }
        if (scopeTexts.size > 0) {
          batchPromises.push(
            fetchBatchCodeHelp(
              (params) =>
                PostCodeHelpQ({
                  ...params,
                  CodeHelpSeq: '1001',
                  GroupCode: 'SCOPE_LEVEL'
                }),
              scopeTexts,
              200
            )
              .then((data) => ({ type: 'scope', data }))
              .catch(() => ({ type: 'scope', data: [] }))
          )
        }
        if (ruleTexts.size > 0) {
          batchPromises.push(
            fetchBatchCodeHelp(
              (params) =>
                PostCodeHelpQ({
                  ...params,
                  CodeHelpSeq: '1002',
                  GroupCode: 'RULE_CONDITION'
                }),
              ruleTexts,
              200
            )
              .then((data) => ({ type: 'rule', data }))
              .catch(() => ({ type: 'rule', data: [] }))
          )
        }

        const batchResults = await Promise.all(batchPromises)

        // 3. Xây dựng Hash Map O(1) từ kết quả phân giải trực tiếp từ Server API
        const batchActionMap = new Map()
        const batchScopeMap = new Map()
        const batchRuleMap = new Map()

        batchResults.forEach((res) => {
          if (res.type === 'action') {
            ;(res.data || []).forEach((item) => {
              const resolved = {
                OperationCode: item.ActionCode || item.OperationCode || item.Key || '',
                OperationName: item.ActionName || item.OperationName || item.Label || '',
                PermActionSeq: item.IdSeq || item.PermActionSeq || item.Id || ''
              }
              if (item.ActionCode) batchActionMap.set(normalize(item.ActionCode), resolved)
              if (item.OperationCode) batchActionMap.set(normalize(item.OperationCode), resolved)
              if (item.Key) batchActionMap.set(normalize(item.Key), resolved)
              if (item.ActionName) batchActionMap.set(normalize(item.ActionName), resolved)
              if (item.OperationName) batchActionMap.set(normalize(item.OperationName), resolved)
              if (item.Label) batchActionMap.set(normalize(item.Label), resolved)
              if (item.IdSeq) batchActionMap.set(normalize(item.IdSeq), resolved)
              if (item.Id) batchActionMap.set(normalize(item.Id), resolved)
            })
          } else if (res.type === 'scope') {
            ;(res.data || []).forEach((item) => {
              const resolved = {
                DefaultScopeLevel: item.AttrValueCode || item.DefaultScopeLevel || item.Key || item.ItemCode || '',
                DefaultScopeLevelLabel: item.AttrValueName || item.DefaultScopeLevelLabel || item.Label || item.ItemName || '',
                ScopeLevelSeq: item.IdSeq || item.ScopeLevelSeq || item.Id || ''
              }
              if (item.AttrValueCode) batchScopeMap.set(normalize(item.AttrValueCode), resolved)
              if (item.DefaultScopeLevel) batchScopeMap.set(normalize(item.DefaultScopeLevel), resolved)
              if (item.Key) batchScopeMap.set(normalize(item.Key), resolved)
              if (item.AttrValueName) batchScopeMap.set(normalize(item.AttrValueName), resolved)
              if (item.DefaultScopeLevelLabel) batchScopeMap.set(normalize(item.DefaultScopeLevelLabel), resolved)
              if (item.Label) batchScopeMap.set(normalize(item.Label), resolved)
              if (item.IdSeq) batchScopeMap.set(normalize(item.IdSeq), resolved)
            })
          } else if (res.type === 'rule') {
            ;(res.data || []).forEach((item) => {
              const resolved = {
                RuleCondition: item.AttrValueCode || item.RuleCondition || item.Key || item.ItemCode || '',
                RuleConditionLabel: item.AttrValueName || item.RuleConditionLabel || item.Label || item.ItemName || '',
                RuleConditionSeq: item.IdSeq || item.RuleConditionSeq || item.Id || ''
              }
              if (item.AttrValueCode) batchRuleMap.set(normalize(item.AttrValueCode), resolved)
              if (item.RuleCondition) batchRuleMap.set(normalize(item.RuleCondition), resolved)
              if (item.Key) batchRuleMap.set(normalize(item.Key), resolved)
              if (item.AttrValueName) batchRuleMap.set(normalize(item.AttrValueName), resolved)
              if (item.RuleConditionLabel) batchRuleMap.set(normalize(item.RuleConditionLabel), resolved)
              if (item.Label) batchRuleMap.set(normalize(item.Label), resolved)
              if (item.IdSeq) batchRuleMap.set(normalize(item.IdSeq), resolved)
            })
          }
        })

        // 4. Áp dụng tuần tự cho từng dòng theo đúng thứ tự và vị trí tương ứng
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
                columnKey === 'IdSeq' ||
                columnKey === 'IdxNo' ||
                (isReadOnlyColumn(columnKey, column) && !CODE_HELP_COLUMNS_SCOPE.includes(columnKey))
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

              if (columnKey === 'OperationCode' || columnKey === 'OperationName') {
                const norm = normalize(cellVal)
                const resolved = norm ? batchActionMap.get(norm) : null
                if (resolved) {
                  existingRow.OperationCode = resolved.OperationCode
                  existingRow.OperationName = resolved.OperationName
                  existingRow.PermActionSeq = resolved.PermActionSeq
                } else {
                  existingRow.OperationCode = ''
                  existingRow.OperationName = ''
                  existingRow.PermActionSeq = ''
                }
              } else if (
                columnKey === 'DefaultScopeLevelLabel' ||
                columnKey === 'DefaultScopeLevel'
              ) {
                const norm = normalize(cellVal)
                const resolved = norm ? batchScopeMap.get(norm) : null
                if (resolved) {
                  existingRow.DefaultScopeLevel = resolved.DefaultScopeLevel
                  existingRow.DefaultScopeLevelLabel = resolved.DefaultScopeLevelLabel
                  existingRow.ScopeLevelSeq = resolved.ScopeLevelSeq
                } else {
                  existingRow.DefaultScopeLevel = ''
                  existingRow.DefaultScopeLevelLabel = ''
                  existingRow.ScopeLevelSeq = ''
                }
              } else if (
                columnKey === 'RuleConditionLabel' ||
                columnKey === 'RuleCondition'
              ) {
                const norm = normalize(cellVal)
                const resolved = norm ? batchRuleMap.get(norm) : null
                if (resolved) {
                  existingRow.RuleCondition = resolved.RuleCondition
                  existingRow.RuleConditionLabel = resolved.RuleConditionLabel
                  existingRow.RuleConditionSeq = resolved.RuleConditionSeq
                } else {
                  existingRow.RuleCondition = ''
                  existingRow.RuleConditionLabel = ''
                  existingRow.RuleConditionSeq = ''
                }
              } else {
                existingRow[columnKey] = cellVal
              }

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
      isReadOnlyColumn,
      setGridData,
      setNumRows,
      setStatusMessage,
      t
    ]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Danh sách Đăng ký Phạm Vi Quyền Hạn')}</span>
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
          onRowAppended={() => handleRowAppend?.(1)}
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
      </div>
    </div>
  )
}
