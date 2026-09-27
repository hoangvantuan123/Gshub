/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { usePageData } from '../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { MOCK_MENU_TREE, flattenMenuTree, getFlatMenuList } from '../mock/mockRoleData'

const BOOLEAN_COLS = new Set(['View'])

// Thu thập tất cả các ID nhóm để mở tất cả (Expand All)
const getAllGroupIds = (nodes = []) => {
  const ids = []
  const walk = (items) => {
    for (const item of items) {
      if (item.IsGroup || (Array.isArray(item.Children) && item.Children.length > 0)) {
        ids.push(item.Id)
        if (item.Children) walk(item.Children)
      }
    }
  }
  walk(nodes)
  return ids
}

export default function RoleMenuTable({
  setSelection,
  selection,
  setShowSearch,
  showSearch,
  setGridData,
  gridData = [],
  numRows,
  setNumRows,
  setCols,
  cols = [],
  canEdit = true,
  defaultCols = [],
  selectedGroupId,
  selectedRootMenuId = 1,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  // State bật/tắt chế độ Gom nhóm (Grouped vs Flat List)
  const [isGrouped, setIsGrouped] = useState(true)

  // State quản lý danh sách các ID nhóm đang được mở rộng
  const [expandedIds, setExpandedIds] = useState(() => new Set(getAllGroupIds(MOCK_MENU_TREE)))

  // Cây dữ liệu nội bộ
  const [treeData, setTreeData] = useState(() => MOCK_MENU_TREE)

  // Khi thay đổi chế độ gom nhóm, selectedRootMenuId, expandedIds hoặc treeData
  useEffect(() => {
    if (isGrouped) {
      const flattened = flattenMenuTree(treeData, expandedIds, selectedRootMenuId || 1)
      setGridData(flattened)
      setNumRows(flattened.length)
    } else {
      const flatList = getFlatMenuList(treeData, selectedRootMenuId || 1)
      setGridData(flatList)
      setNumRows(flatList.length)
    }
  }, [isGrouped, treeData, expandedIds, selectedRootMenuId, setGridData, setNumRows])

  // Hàm toggle mở/thu gọn một nhóm
  const toggleGroup = useCallback((groupId) => {
    if (!groupId) return
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  // Mở rộng tất cả các nhóm
  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(getAllGroupIds(treeData)))
  }, [treeData])

  // Thu gọn tất cả các nhóm
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])
  const {
    freezeColumnsCount,
    handleFreezeColumn,
    rowHeight,
    headerHeight,
    overscrollX,
    overscrollY
  } = useTableConfig('role_menu_perms')

  const handleAddQueryFieldWrapper = useCallback(
    (columnKey, colTitle, activeCol) => {
      if (onAddQueryField) {
        onAddQueryField(columnKey, colTitle, activeCol, 'menu', 'Menu')
      }
    },
    [onAddQueryField]
  )

  const {
    showMenu,
    setShowMenu,
    onHeaderMenuClick,
    layerProps,
    renderLayer,
    handleHideColumn,
    handleReset,
    onColumnMoved,
    onColumnResize,
    handleCellContextMenu,
    onCellClicked: baseOnCellClicked,
    onCellActivated,
    onKeyDown,
    getCellTheme,
    gridTheme,
    isReadOnlyColumn,
    onItemHovered
  } = useTableManager({
    tableId: 'role_menu_perms',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    onAddQueryField: handleAddQueryFieldWrapper
  })

  // Khi click vào cell: nếu là dòng nhóm trong chế độ gom nhóm thì toggle đóng/mở
  const onCellClicked = useCallback(
    (cell, event) => {
      const [colIndex, rowIndex] = cell
      const rowData = gridData[rowIndex]

      if (isGrouped && rowData && rowData._hasChildren) {
        const colDef = cols[colIndex]
        if (
          colDef &&
          (colDef.id === 'MenuLabel' ||
            colDef.id === 'MenuKey' ||
            colDef.id === 'WorkingTag' ||
            colDef.id === 'Status')
        ) {
          toggleGroup(rowData.Id)
        }
      }

      if (baseOnCellClicked) {
        baseOnCellClicked(cell, event)
      }
    },
    [baseOnCellClicked, cols, gridData, isGrouped, toggleGroup]
  )

  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_COLS.has(columnKey)
      const isReadOnly =
        (isReadOnlyColumn && isReadOnlyColumn(columnKey, column)) || column.readonly || false
      const cellTheme = getCellTheme ? getCellTheme(columnKey, column) : {}
      return {
        columnKey,
        isStatus,
        isBoolean,
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

      const { columnKey, isStatus, isBoolean, isReadOnly } = meta
      const val = rowData[columnKey] ?? ''
      const isGroupHeader = isGrouped && rowData.Level === 0
      const isSubGroup = isGrouped && rowData.Level === 1 && rowData._hasChildren

      // Theme cho dòng nhóm trong chế độ Group
      let customTheme = {}
      if (isGroupHeader) {
        customTheme = {
          bgCell: '#edf2f7',
          textDark: '#1e3a8a',
          baseFontStyle: 'bold 12px'
        }
      } else if (isSubGroup) {
        customTheme = {
          bgCell: '#f8fafc',
          textDark: '#0f172a',
          baseFontStyle: '600 12px'
        }
      } else if (rowData.Level === 2) {
        customTheme = {
          textDark: '#334155',
          baseFontStyle: '400 12px'
        }
      }

      if (isStatus) {
        const status = String(val)
        let bg = customTheme.bgCell || '#FFFFFF'
        let text = '#225588'
        if (status === 'A') {
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
            ...customTheme,
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
          themeOverride: customTheme
        }
      }

      return {
        kind: GridCellKind.Text,
        data: String(val),
        displayData: String(val),
        allowOverlay: !isReadOnly && canEdit,
        readonly: isReadOnly || !canEdit,
        themeOverride: customTheme
      }
    },
    [colMetadata, gridData, canEdit, isGrouped]
  )

  // Cập nhật checkbox View trong cây tree
  const updateTreeCheckbox = useCallback((nodes, targetId, newCheckVal) => {
    return nodes.map((node) => {
      if (node.Id === targetId) {
        const setAllChildren = (item, checked) => ({
          ...item,
          View: checked,
          WorkingTag: 'U',
          Status: 'U',
          Children: item.Children ? item.Children.map((c) => setAllChildren(c, checked)) : undefined
        })
        return setAllChildren(node, newCheckVal)
      }
      if (node.Children) {
        return {
          ...node,
          Children: updateTreeCheckbox(node.Children, targetId, newCheckVal)
        }
      }
      return node
    })
  }, [])

  const onCellEdited = useCallback(
    ([col, row], cell) => {
      if (!canEdit) return
      const colId = cols[col]?.id
      if (!colId || colId === 'WorkingTag' || colId === 'Status') return

      const currentRow = gridData[row] || {}
      const targetId = currentRow.Id
      if (!targetId) return

      const isBoolCol = BOOLEAN_COLS.has(colId)
      let newVal = cell.data
      if (isBoolCol) {
        newVal = Boolean(cell.data)
      } else {
        newVal = cell.data ?? ''
      }

      if (colId === 'View') {
        setTreeData((prevTree) => updateTreeCheckbox(prevTree, targetId, newVal))
      } else {
        setGridData((prev) => {
          const next = [...prev]
          next[row] = {
            ...next[row],
            [colId]: newVal,
            WorkingTag: 'U',
            Status: 'U',
            isEdited: true
          }
          return next
        })
      }
    },
    [canEdit, cols, gridData, setGridData, updateTreeCheckbox]
  )

  // Kéo thả fill handle
  const onFillPattern = useCallback(
    ({ patternSource, fillDestination }) => {
      if (!canEdit || !fillDestination || !patternSource) return

      setGridData((prevData) => {
        const updated = [...prevData]

        for (let dy = 0; dy < fillDestination.height; dy++) {
          const targetRow = fillDestination.y + dy
          if (targetRow < 0) continue
          if (!updated[targetRow]) updated[targetRow] = {}
          const rowObj = { ...updated[targetRow] }
          let rowChanged = false

          const srcPatternY = patternSource.y + (dy % patternSource.height)
          const srcRow = updated[srcPatternY] || {}

          for (let dx = 0; dx < fillDestination.width; dx++) {
            const targetCol = fillDestination.x + dx
            const colObj = cols[targetCol]
            const colKey = colObj?.id
            if (
              !colKey ||
              colKey === 'WorkingTag' ||
              colKey === 'Status' ||
              colKey === 'Id' ||
              colObj.readonly
            )
              continue

            const srcPatternX = patternSource.x + (dx % patternSource.width)
            const srcColKey = cols[srcPatternX]?.id
            if (!srcColKey) continue

            const sourceVal = srcRow[srcColKey]
            const isBoolCol = BOOLEAN_COLS.has(colKey)

            if (isBoolCol) {
              const boolVal = Boolean(
                sourceVal === true ||
                sourceVal === 1 ||
                sourceVal === '1' ||
                String(sourceVal).toLowerCase() === 'true'
              )
              const oldBool = Boolean(rowObj[colKey])
              if (oldBool !== boolVal) {
                rowObj[colKey] = boolVal
                rowChanged = true
              }
            } else {
              if (String(rowObj[colKey] ?? '') !== String(sourceVal ?? '')) {
                rowObj[colKey] = sourceVal ?? ''
                rowChanged = true
              }
            }
          }

          if (rowChanged) {
            rowObj.WorkingTag = 'U'
            rowObj.Status = 'U'
            rowObj.isEdited = true
            updated[targetRow] = rowObj
          }
        }
        return updated
      })
    },
    [canEdit, cols, setGridData]
  )

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
          const requiredLength = Math.max(prevData.length, startRow + numPastedRows)
          const nextData = new Array(requiredLength)

          for (let r = 0; r < startRow; r++) {
            nextData[r] = prevData[r] || {}
          }

          for (let r = 0; r < numPastedRows; r++) {
            const targetRow = startRow + r
            const originalRow = prevData[targetRow] || {}
            const modifiedRow = { ...originalRow }
            const rowVals = values[r] || []
            let isRowChanged = false

            for (let c = 0; c < numPastedCols; c++) {
              const targetCol = startCol + c
              if (targetCol >= cols.length) break
              const colKey = indexes[targetCol]
              if (!colKey || colKey === 'WorkingTag' || colKey === 'Status' || colKey === 'Id')
                continue

              let rawVal = rowVals[c] ?? ''
              if (BOOLEAN_COLS.has(colKey)) {
                rawVal =
                  rawVal === true ||
                  rawVal === 1 ||
                  rawVal === '1' ||
                  String(rawVal).toLowerCase() === 'true' ||
                  String(rawVal).toLowerCase() === 'v'
              }

              if (modifiedRow[colKey] !== rawVal) {
                modifiedRow[colKey] = rawVal
                isRowChanged = true
              }
            }

            if (isRowChanged) {
              modifiedRow.WorkingTag = 'U'
              modifiedRow.Status = 'U'
              modifiedRow.isEdited = true
            }

            nextData[targetRow] = modifiedRow
          }

          for (let r = startRow + numPastedRows; r < prevData.length; r++) {
            nextData[r] = prevData[r]
          }

          return nextData
        })

        setNumRows((prev) => Math.max(prev, startRow + numPastedRows))
        return true
      } finally {
        if (isBatch) {
          togglePageInteraction(false)
        }
      }
    },
    [canEdit, cols, setGridData, setNumRows, setStatusMessage, t]
  )

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* THANH CÔNG CỤ NHANH: CHUYỂN ĐỔI GOM NHÓM / BỎ GOM NHÓM & MỞ RỘNG / THU GỌN */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-slate-50 border-b border-slate-300 text-[11px] text-slate-700 shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600 mr-1">{t('Chế độ xem:')}</span>

          {/* Nút Gom nhóm */}
          <button
            type="button"
            onClick={() => setIsGrouped(true)}
            className={`px-2 py-0.5 border rounded-xs text-[11px] font-medium cursor-pointer transition-colors ${
              isGrouped
                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            {t('Gom nhóm phân cấp')}
          </button>

          {/* Nút Bỏ gom nhóm */}
          <button
            type="button"
            onClick={() => setIsGrouped(false)}
            className={`px-2 py-0.5 border rounded-xs text-[11px] font-medium cursor-pointer transition-colors ${
              !isGrouped
                ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            {t('Bỏ gom nhóm (Danh sách phẳng)')}
          </button>

          {/* Cụm nút Mở tất cả / Thu gọn khi ở chế độ Gom nhóm */}
          {isGrouped && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-300 hover:border-blue-400 rounded-xs text-[11px] font-medium shadow-2xs cursor-pointer transition-colors"
                title={t('Mở rộng toàn bộ các cấp submenu và menu con')}
              >
                {t('[+] Mở tất cả')}
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-xs text-[11px] font-medium shadow-2xs cursor-pointer transition-colors"
                title={t('Thu gọn toàn bộ chỉ hiển thị nhóm cấp 2')}
              >
                {t('[-] Thu gọn')}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
          {isGrouped ? (
            <span className="italic">{t('Click vào tên nhóm để đóng/mở')}</span>
          ) : (
            <span className="italic">{t('Hiển thị {{count}} mục phẳng', { count: numRows })}</span>
          )}
        </div>
      </div>

      {/* GLIDE DATA GRID */}
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
          onFillPattern={onFillPattern}
          theme={gridTheme}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          onPaste={onPaste}
          onHeaderMenuClick={onHeaderMenuClick}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onCellContextMenu={handleCellContextMenu}
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
        />
      </div>

      {showMenu !== null &&
        renderLayer(
          <div {...layerProps} className="z-[9999] outline-none">
            {showMenu.menuType === 'statusMenu' ? (
              <LayoutStatusMenuSheet
                showMenu={showMenu}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={setShowMenu}
                handleReset={handleReset}
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
                handleHideColumn={handleHideColumn}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={setShowMenu}
                handleFreezeColumn={handleFreezeColumn}
              />
            )}
          </div>
        )}
    </div>
  )
}
