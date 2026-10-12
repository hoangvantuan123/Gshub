/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { asBoolean, filterMenuRows, setTreeView } from '../utils/permissionRows'

export default function RoleMenuTable({
  selection,
  setSelection,
  showSearch,
  setShowSearch,
  gridData = [],
  setGridData,
  cols = [],
  setCols,
  defaultCols,
  canEdit = true,
  canCreate = canEdit,
  onAddQueryField,
  onActivate,
  selectedGroupId,
  canSelectMenu = () => true
}) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState('')
  const searchRef = useRef(null)
  const gridRef = useRef(null)
  const config = useTableConfig('role_menu_perms')
  const manager = useTableManager({
    tableId: 'role_menu_perms',
    defaultCols,
    cols,
    setCols,
    gridData,
    setGridData,
    selection,
    setSelection,
    canEdit: canEdit || canCreate,
    onAddQueryField: (key, title, col) => onAddQueryField?.(key, title, col, 'menu', 'Menu')
  })
  const indices = useMemo(() => filterMenuRows(gridData, query, view), [gridData, query, view])
  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])
  useEffect(() => {
    setQuery('')
    setView('')
  }, [selectedGroupId])

  const visibleSelection = useMemo(() => {
    let rows = CompactSelection.empty()
    for (const [start, end] of selection?.rows?.items || []) {
      indices.forEach((index, visible) => {
        if (index >= start && index < end) rows = rows.add(visible)
      })
    }
    const selected = selection?.current
    const visible = selected ? indices.indexOf(selected.cell[1]) : -1
    return {
      columns: selection?.columns || CompactSelection.empty(),
      rows,
      ...(visible < 0
        ? {}
        : {
            current: {
              cell: [selected.cell[0], visible],
              range: { x: selected.cell[0], y: visible, width: 1, height: 1 },
              rangeStack: []
            }
          })
    }
  }, [indices, selection])

  const selectRows = useCallback(
    (next) => {
      const firstSelectedRow = next.rows?.items?.[0]?.[0]
      const index = next.current ? indices[next.current.cell[1]] : indices[firstSelectedRow]
      if (index !== undefined && !canSelectMenu(gridData[index])) return
      let rows = CompactSelection.empty()
      for (const [start, end] of next.rows?.items || []) {
        for (let i = start; i < end; i++) if (indices[i] !== undefined) rows = rows.add(indices[i])
      }
      setSelection({
        ...next,
        rows,
        ...(index === undefined || !next.current
          ? { current: undefined }
          : {
              current: {
                cell: [next.current.cell[0], index],
                range: { x: next.current.cell[0], y: index, width: 1, height: 1 },
                rangeStack: []
              }
            })
      })
    },
    [indices, gridData, canSelectMenu, setSelection]
  )

  const editView = useCallback(
    ([col, visibleRow], cell) => {
      if (cols[col]?.id !== 'View') return
      const index = indices[visibleRow]
      if (index === undefined) return
      if (!(gridData[index]?.RoleRecordId ? canEdit : canCreate)) return
      setGridData((rows) =>
        asBoolean(rows[index]?.View) === asBoolean(cell.data)
          ? rows
          : setTreeView(rows, index, asBoolean(cell.data))
      )
    },
    [canEdit, canCreate, cols, indices, gridData, setGridData]
  )

  const getCellContent = useCallback(
    ([col, visibleRow]) => {
      const row = gridData[indices[visibleRow]]
      const column = cols[col]
      if (!row || !column) return { kind: GridCellKind.Loading, allowOverlay: false }
      const theme =
        row.Level === 0
          ? { bgCell: '#e0e7ff', textDark: '#1e3a8a', baseFontStyle: 'bold 12px' }
          : row.IsGroup
            ? { bgCell: '#f8fafc', baseFontStyle: '600 12px' }
            : {}
      if (column.id === 'View')
        return {
          kind: GridCellKind.Boolean,
          data: asBoolean(row.View),
          allowOverlay: false,
          readonly:
            !(row.RoleRecordId ? canEdit : canCreate) || column.readonly || row.WorkingTag === 'D',
          themeOverride: theme
        }
      const value = String(row[column.id] ?? '')
      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: value,
        readonly: true,
        allowOverlay: false,
        themeOverride: { ...theme, ...manager.getCellTheme(column.id, row) }
      }
    },
    [gridData, indices, cols, canEdit, canCreate, manager.getCellTheme]
  )

  return (
    <div
      className="flex flex-col h-full w-full bg-white overflow-hidden"
      onPointerDownCapture={onActivate}
      onFocusCapture={onActivate}
    >
      <div className="flex items-center gap-2 px-2 h-7 shrink-0 border-b border-slate-200 bg-slate-50 text-xs">
        <button type="button" onClick={() => setShowSearch(true)} className="text-blue-700">
          Bộ lọc (Ctrl+F)
        </button>
        <span className="text-slate-500">
          {indices.length}/{gridData.length} mục
        </span>
        <span className="ml-auto text-slate-500">A: thêm · U: sửa · D: xóa</span>
      </div>
      {showSearch && (
        <div className="flex items-center gap-2 p-2 shrink-0 border-b border-slate-200 bg-slate-50">
          <input
            ref={searchRef}
            aria-label="Tìm menu"
            placeholder="Tìm tên, mã menu hoặc phân loại..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setShowSearch(false)
            }}
            className="h-7 flex-1 min-w-0 border border-slate-300 px-2 text-xs"
          />
          <select
            aria-label="Lọc quyền View"
            value={view}
            onChange={(event) => setView(event.target.value)}
            className="h-7 border border-slate-300 text-xs"
          >
            <option value="">Tất cả quyền View</option>
            <option value="1">Được xem</option>
            <option value="0">Chưa được xem</option>
          </select>
          <button
            type="button"
            className="text-xs text-blue-700"
            onClick={() => {
              setQuery('')
              setView('')
            }}
          >
            Đặt lại
          </button>
          <button
            type="button"
            aria-label="Đóng bộ lọc"
            onClick={() => {
              setQuery('')
              setView('')
              setShowSearch(false)
            }}
          >
            ×
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          rows={indices.length}
          columns={cols}
          getCellContent={getCellContent}
          getCellsForSelection={true}
          onCellEdited={editView}
          gridSelection={visibleSelection}
          onGridSelectionChange={selectRows}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'f') {
              event.preventDefault()
              setShowSearch(true)
            }
          }}
          onPaste={(target, values) => {
            if (!canEdit && !canCreate) return false
            values.forEach((cells, y) =>
              cells.forEach((value, x) => editView([target[0] + x, target[1] + y], { data: value }))
            )
            return true
          }}
          fillHandle={canEdit || canCreate}
          onFillPattern={({ patternSource, fillDestination }) => {
            if (!patternSource || !fillDestination || (!canEdit && !canCreate)) return
            for (let y = 0; y < fillDestination.height; y++) {
              for (let x = 0; x < fillDestination.width; x++) {
                const source = getCellContent([
                  patternSource.x + (x % patternSource.width),
                  patternSource.y + (y % patternSource.height)
                ])
                editView([fillDestination.x + x, fillDestination.y + y], source)
              }
            }
          }}
          theme={manager.gridTheme}
          onColumnMoved={manager.onColumnMoved}
          onColumnResize={manager.onColumnResize}
          onHeaderMenuClick={manager.onHeaderMenuClick}
          onHeaderContextMenu={manager.onHeaderContextMenu}
          freezeColumns={Math.max(1, config.freezeColumnsCount)}
          rowMarkers="both"
          rowHeight={config.rowHeight || 24}
          headerHeight={config.headerHeight || 24}
          smoothScrollX={true}
          smoothScrollY={true}
        />
      </div>
      {manager.showMenu !== null &&
        manager.renderLayer(
          <div {...manager.layerProps} className="z-[9999] outline-none">
            {manager.showMenu.menuType === 'statusMenu' ? (
              <LayoutStatusMenuSheet
                showMenu={manager.showMenu}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={manager.setShowMenu}
                handleReset={manager.handleReset}
                data={gridData}
              />
            ) : (
              <LayoutMenuSheet
                showMenu={manager.showMenu}
                cols={cols}
                setShowSearch={setShowSearch}
                setShowMenu={manager.setShowMenu}
                handleHideColumn={manager.handleHideColumn}
                handleFreezeColumn={config.handleFreezeColumn}
              />
            )}
          </div>
        )}
    </div>
  )
}
