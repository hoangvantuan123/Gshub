/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import GenericCodeHelpModal from '../../../../components/query/core/GenericCodeHelpModal'
import { Drawer, Checkbox } from 'antd'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useOnFill from '../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { useDateFormat } from '../../../../hooks/useDateFormat'
import { usePageData } from '../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { PostRootMenuH, PostSubMenuH } from '@renderer/api/help'
import { createCodeHelpFetcher, fetchBatchCodeHelp } from '../../../../utils/codeHelpUtils'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set([
  'Utilities',
  'Active',
  'IsDataLock',
  'View',
  'Create',
  'Edit',
  'Delete',
  'Import',
  'Export'
])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'CreatedDate', 'UpdatedDate'])
const CODE_HELP_COLUMNS = ['MenuRootName', 'MenuSubRootName', 'Type']

export default function MenuTechniqueTable({
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

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('menu_tech')

  // Cấu hình CodeHelp tra cứu chuẩn ERP (Chỉ tải dữ liệu On-Demand khi tìm kiếm / mở modal)
  const codeHelpConfig = useMemo(() => {
    const typeList = [
      { id: 'menu', type: 'menu', description: 'menu (Main Menu)' },
      { id: 'submenu', type: 'submenu', description: 'submenu (Sub Menu)' },
      { id: 'menuitem', type: 'menuitem', description: 'menuitem (Menu Item)' }
    ]

    return {
      MenuRootName: {
        title: t('Tra cứu Module (Cấp 1)'),
        columns: [
          { id: 'Key', title: t('Mã Key'), width: 180 },
          { id: 'Label', title: t('Tên Root Menu'), width: 250 },
          { id: 'Id', title: t('ID'), width: 80 }
        ],
        fetchHelpData: createCodeHelpFetcher(PostRootMenuH),
        onSelect: (selected) => ({
          MenuRootName: selected.Label || selected.Key || '',
          MenuRootId: selected.Id || selected.IdSeq || ''
        })
      },
      MenuSubRootName: {
        title: t('Tra cứu Submenu (Cấp 2)'),
        columns: [
          { id: 'Key', title: t('Mã Key'), width: 180 },
          { id: 'Label', title: t('Tên Submenu'), width: 250 },
          { id: 'Id', title: t('ID'), width: 80 }
        ],
        fetchHelpData: createCodeHelpFetcher(PostSubMenuH, (currentRow) =>
          currentRow?.MenuRootId ? { KeyItem3: String(currentRow.MenuRootId) } : {}
        ),
        onSelect: (selected) => ({
          MenuSubRootName: selected.Label || selected.Key || '',
          MenuSubRootId: selected.Id || selected.IdSeq || '',
          ...(selected.MenuRootId ? { MenuRootId: selected.MenuRootId } : {})
        })
      },
      Type: {
        title: t('Chọn loại Menu'),
        helpData: typeList,
        columns: [
          { id: 'type', title: t('Loại Menu'), width: 140 },
          { id: 'description', title: t('Mô tả'), width: 250 }
        ],
        onSelect: (selected) => ({
          Type: selected.type || selected.id || selected
        })
      }
    }
  }, [t])

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
    tableId: 'menu_tech',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    setShowSearch,
    codeHelpColumns: CODE_HELP_COLUMNS,
    codeHelpConfig,
    onAddQueryField
  })

  const onClose = () => setOpen(false)

  // ── 1. PRE-COMPUTE METADATA CHO CÁC CỘT (O(1) Cell Provider Lookup) ──
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isCodeHelp = isCodeHelpColumn
        ? isCodeHelpColumn(columnKey)
        : CODE_HELP_COLUMNS.includes(columnKey)
      const isNumber = column.kind === 'Number' || columnKey === 'OrderSeq'
      const isBoolean = column.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)
      const isDate =
        DATE_KEYS.has(columnKey) || columnKey.endsWith('Date') || columnKey.endsWith('At')
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || false
      return {
        columnKey,
        isStatus,
        isCodeHelp,
        isNumber,
        isBoolean,
        isDate,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isCodeHelpColumn, isReadOnlyColumn])

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

      if (meta.isCodeHelp) {
        const strVal = String(value)
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

      if (meta.isNumber) {
        const numVal = typeof value === 'number' ? value : Number(value) || 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: String(value),
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

  // ── 3. CHỈNH SỬA Ô ĐƠN LẺ (KHÔNG CHO PHÉP GÕ TRỰC TIẾP Ở CÁC CỘT CODEHELP) ──
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
        CODE_HELP_COLUMNS.includes(key) ||
        key === 'WorkingTag' ||
        key === 'Status' ||
        key === 'Id'
      ) {
        return
      }

      setGridData((prevData) => {
        const updatedData = [...prevData]
        if (!updatedData[row]) updatedData[row] = {}

        const currentStatus = updatedData[row]['WorkingTag'] || updatedData[row]['Status'] || ''
        const nextStatus = currentStatus === 'A' ? 'A' : 'U'
        updatedData[row][key] = newValue.data
        updatedData[row]['WorkingTag'] = nextStatus
        updatedData[row]['Status'] = nextStatus

        return updatedData
      })
    },
    [cols, canEdit, isReadOnlyColumn, setGridData]
  )

  // ── 4. DÁN HÀNG LOẠT SIÊU TỐC VỚI GOM NHÓM BATCH RESOLVE BẢO TOÀN VỊ TRÍ DÒNG ──
  const onPaste = useCallback(
    async (target, values) => {
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
        // 1. Thu thập và Gom nhóm (Deduplicate) các giá trị CodeHelp cần phân giải từ Server
        const rootTexts = new Set()
        const subTexts = new Set()

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

            if (colKey === 'MenuRootName') {
              rootTexts.add(rawVal)
            } else if (colKey === 'MenuSubRootName') {
              subTexts.add(rawVal)
            }
          }
        }

        // 2. Gửi duy nhất 1 request tối đa 200 mã (các mã ngoài 200 sẽ bị bỏ qua)
        const batchPromises = []
        if (rootTexts.size > 0) {
          batchPromises.push(
            fetchBatchCodeHelp(PostRootMenuH, rootTexts, 200)
              .then((data) => ({ type: 'root', data }))
              .catch(() => ({ type: 'root', data: [] }))
          )
        }
        if (subTexts.size > 0) {
          batchPromises.push(
            fetchBatchCodeHelp(PostSubMenuH, subTexts, 200)
              .then((data) => ({ type: 'sub', data }))
              .catch(() => ({ type: 'sub', data: [] }))
          )
        }

        const batchResults = await Promise.all(batchPromises)

        // 3. Xây dựng Hash Map O(1) từ kết quả phân giải
        const normalize = (text) =>
          typeof text === 'string' || typeof text === 'number'
            ? text
                .toString()
                .trim()
                .replace(/^[,\s]+|[,\s]+$/g, '')
                .toLowerCase()
                .normalize('NFC')
            : ''

        const batchRootMap = new Map()
        const batchSubMap = new Map()

        batchResults.forEach((res) => {
          if (res.type === 'root') {
            ;(res.data || []).forEach((item) => {
              const resolved = {
                MenuRootName: item.Label || item.Key || '',
                MenuRootId: item.Id || item.IdSeq || ''
              }
              if (item.Id !== undefined && item.Id !== null) {
                batchRootMap.set(normalize(item.Id), resolved)
              }
              if (item.IdSeq !== undefined && item.IdSeq !== null) {
                batchRootMap.set(normalize(item.IdSeq), resolved)
              }
              if (item.Key) batchRootMap.set(normalize(item.Key), resolved)
              if (item.Label) batchRootMap.set(normalize(item.Label), resolved)
            })
          } else if (res.type === 'sub') {
            ;(res.data || []).forEach((item) => {
              const resolved = {
                MenuSubRootName: item.Label || item.Key || '',
                MenuSubRootId: item.Id || item.IdSeq || '',
                ...(item.MenuRootId ? { MenuRootId: item.MenuRootId } : {})
              }
              if (item.Id !== undefined && item.Id !== null) {
                batchSubMap.set(normalize(item.Id), resolved)
              }
              if (item.IdSeq !== undefined && item.IdSeq !== null) {
                batchSubMap.set(normalize(item.IdSeq), resolved)
              }
              if (item.Key) batchSubMap.set(normalize(item.Key), resolved)
              if (item.Label) batchSubMap.set(normalize(item.Label), resolved)
            })
          }
        })

        const resolveType = (val) => {
          const valStr = normalize(val)
          if (
            valStr.includes('sub') ||
            valStr === 's' ||
            valStr.includes('cấp 2') ||
            valStr.includes('cap 2')
          ) {
            return { Type: 'submenu' }
          }
          if (
            valStr.includes('item') ||
            valStr === 'i' ||
            valStr.includes('cấp 3') ||
            valStr.includes('cap 3')
          ) {
            return { Type: 'menuitem' }
          }
          if (
            valStr.includes('menu') ||
            valStr === 'm' ||
            valStr === 'main' ||
            valStr.includes('cấp 1') ||
            valStr.includes('cap 1')
          ) {
            return { Type: 'menu' }
          }
          return { Type: val }
        }

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
              } else if (column?.kind === 'Number' || columnKey === 'OrderSeq') {
                cellVal = Number(cellVal) || 0
              }

              if (columnKey === 'MenuRootName') {
                const norm = normalize(cellVal)
                const resolved = norm ? batchRootMap.get(norm) : null
                if (resolved) {
                  existingRow.MenuRootName = resolved.MenuRootName
                  existingRow.MenuRootId = resolved.MenuRootId
                } else {
                  // Không tìm thấy bản ghi trong CSDL -> Để trống
                  existingRow.MenuRootName = ''
                  existingRow.MenuRootId = ''
                }
              } else if (columnKey === 'MenuSubRootName') {
                const norm = normalize(cellVal)
                const resolved = norm ? batchSubMap.get(norm) : null
                if (resolved) {
                  existingRow.MenuSubRootName = resolved.MenuSubRootName
                  existingRow.MenuSubRootId = resolved.MenuSubRootId
                  if (resolved.MenuRootId) {
                    existingRow.MenuRootId = resolved.MenuRootId
                  }
                } else {
                  // Không tìm thấy bản ghi trong CSDL -> Để trống
                  existingRow.MenuSubRootName = ''
                  existingRow.MenuSubRootId = ''
                }
              } else if (columnKey === 'Type') {
                const resolved = resolveType(cellVal)
                Object.assign(existingRow, resolved)
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
    [cols, canEdit, isReadOnlyColumn, setGridData, setNumRows, setStatusMessage, t]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Danh sách Menu Hệ thống')}</span>
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

        {/* Modal CodeHelp View Sheet Tra cứu danh mục chuẩn ERP */}
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
