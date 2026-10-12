/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import GenericCodeHelpModal from '../../../../components/query/core/GenericCodeHelpModal'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from 'antd'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { generateEmptyData } from '../../../../components/sheet/js/generateEmptyData'
import useOnFill from '../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { usePageData } from '../../../../../context/PageDataContext'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { createCodeHelpFetcher, fetchBatchCodeHelp } from '../../../../utils/codeHelpUtils'
import { PostQUserAuth } from '../../../../../api/system'

const EMPTY_ARRAY = []
const CODE_HELP_COLUMNS = ['UserId']

export default function RoleGroupUsersTable({
  tableTitle,
  gridData = [],
  setGridData,
  selection,
  setSelection,
  numRows,
  setNumRows,
  cols = [],
  setCols,
  defaultCols = [],
  showSearch,
  setShowSearch,
  canEdit = true,
  canCreate = true,
  groupId,
  groupName,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch && setShowSearch(false), [setShowSearch])
  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('role_group_users_sheet')

  // Cấu hình Code Help tra cứu User theo quy chuẩn khung hệ thống ERP
  const codeHelpConfig = useMemo(() => {
    return {
      UserId: {
        title: t('Tra cứu người dùng hệ thống'),
        columns: [
          { id: 'UserId', title: t('Mã tài khoản'), width: 150 },
          { id: 'UserName', title: t('Họ và tên'), width: 220 },
          { id: 'EmpID', title: t('Mã NV'), width: 120 },
          { id: 'DeptName', title: t('Phòng ban'), width: 180 }
        ],
        fetchHelpData: createCodeHelpFetcher(PostQUserAuth),
        onSelect: (selected) => ({
          UserId: selected.UserId || selected.EmpCode || '',
          UserName: selected.UserName || selected.EmpName || selected.UserId || '',
          UserSeq: selected.UserSeq || '',
          EmpID: selected.EmpID || selected.EmpCode || '',
          DeptName: selected.DeptName || '',
          GroupName: groupName || (groupId ? `ID: ${groupId}` : '')
        })
      }
    }
  }, [t, groupName, groupId])

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
    tableId: 'role_group_users_sheet',
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

  // Tự động khởi tạo mảng data mẫu khi bảng chưa có dữ liệu và có quyền tạo mới
  useEffect(() => {
    if (
      canCreate &&
      (!gridData || gridData.length === 0) &&
      (defaultCols?.length || cols?.length)
    ) {
      const empty = generateEmptyData(50, defaultCols || cols)
      const formatted = updateIndexNo(empty)
      setGridData(formatted)
      if (typeof setNumRows === 'function') {
        setNumRows(formatted.length)
      }
    }
  }, [canCreate, defaultCols, cols, gridData?.length, setGridData, setNumRows])

  // Thêm dòng mới vào cuối bảng (chuẩn ERP)
  const handleRowAppend = useCallback(
    (count = 1) => {
      if (canCreate === false) return
      setGridData((prev) => {
        const empty = generateEmptyData(count, defaultCols || cols)
        const next = [...prev, ...empty]
        return updateIndexNo(next)
      })
      if (typeof setNumRows === 'function') {
        setNumRows((prev) => (prev ?? gridData.length) + count)
      }
    },
    [canCreate, defaultCols, cols, setGridData, setNumRows, gridData?.length]
  )

  // 1. Pre-compute Metadata cho các cột
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isStatus = columnKey === 'WorkingTag' || columnKey === 'Status'
      const isCodeHelp =
        columnKey === 'UserId' ||
        (isCodeHelpColumn ? isCodeHelpColumn(columnKey) : CODE_HELP_COLUMNS.includes(columnKey))
      const cellTheme = getCellTheme ? getCellTheme(columnKey, column) : undefined
      const isReadOnly = isReadOnlyColumn
        ? isReadOnlyColumn(columnKey, column) || column.readonly || false
        : column.readonly || false

      return {
        columnKey,
        isStatus,
        isCodeHelp,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isCodeHelpColumn, isReadOnlyColumn])

  // 2. Hàm truy xuất dữ liệu ô tối ưu 60fps
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

      const columnKey = meta.columnKey
      let value = ''

      if (columnKey === 'GroupName') {
        value =
          item.GroupName || (item.UserId ? groupName || (groupId ? `ID: ${groupId}` : '') : '')
      } else {
        value = item[columnKey] ?? ''
      }

      if (meta.isStatus) {
        const tag = String(item.WorkingTag || item.Status || '')
        return {
          kind: GridCellKind.Text,
          data: tag,
          displayData: tag,
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

      const strVal = String(value)
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        readonly: meta.isReadOnly,
        allowOverlay: !meta.isReadOnly,
        hasMenu: meta.hasMenu,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata, groupName, groupId]
  )

  // 3. Callback khi người dùng chỉnh sửa ô đơn lẻ (chặn gõ tay cột CodeHelp)
  const onCellEdited = useCallback(
    ([col, row], cell) => {
      if (canEdit === false) return

      const meta = colMetadata[col]
      if (
        !meta ||
        meta.isReadOnly ||
        meta.isCodeHelp ||
        meta.isStatus ||
        meta.columnKey === 'Id' ||
        meta.columnKey === 'IdxNo'
      ) {
        return
      }

      const columnKey = meta.columnKey
      const val = cell.data

      setGridData((prev) => {
        const next = [...prev]
        if (!next[row]) next[row] = {}
        const current = { ...next[row] }
        current[columnKey] = val
        const curStatus = current.WorkingTag || current.Status || ''
        const nextStatus = current.Id ? 'U' : curStatus === 'A' ? 'A' : 'U'
        current.WorkingTag = nextStatus
        current.Status = nextStatus
        current.isEdited = true
        next[row] = current
        return updateIndexNo(next)
      })
    },
    [canEdit, colMetadata, setGridData]
  )

  // 4. Dán hàng loạt siêu tốc với gom nhóm Batch CodeHelp phân giải thông tin UserId
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
        setStatusMessage?.({
          type: 'error',
          text: t(
            'Số lượng dòng dán ({{count}} dòng) vượt quá giới hạn tối đa cho phép (3,000 dòng)! Vui lòng chia nhỏ dữ liệu.',
            { count: numPastedRows.toLocaleString() }
          )
        })
        return false
      }

      const isBatch = numPastedRows >= 10 || numPastedRows * numPastedCols >= 50
      if (isBatch) {
        const msg = t('Đang xử lý dán {{count}} dòng dữ liệu... Vui lòng không thao tác', {
          count: numPastedRows.toLocaleString()
        })
        togglePageInteraction(true, msg)
        setStatusMessage?.({ type: 'info', text: msg })
      }

      try {
        // 1. Thu thập các mã UserId cần phân giải
        const userTexts = new Set()
        for (let r = 0; r < numPastedRows; r++) {
          const rowVals = values[r] || []
          for (let c = 0; c < numPastedCols; c++) {
            const targetCol = startCol + c
            if (targetCol >= cols.length) break
            const colKey = indexes[targetCol]
            if (colKey === 'UserId') {
              const rawVal = String(rowVals[c] ?? '')
                .trim()
                .replace(/^[,\s]+|[,\s]+$/g, '')
              if (rawVal) userTexts.add(rawVal)
            }
          }
        }

        // 2. Gọi fetchBatchCodeHelp nếu có UserId
        let batchResults = []
        if (userTexts.size > 0) {
          try {
            batchResults = await fetchBatchCodeHelp(PostQUserAuth, userTexts, 200)
          } catch {
            batchResults = []
          }
        }

        // 3. Xây dựng Hash Map O(1) tra cứu
        const normalize = (text) =>
          typeof text === 'string' || typeof text === 'number'
            ? text
                .toString()
                .trim()
                .replace(/^[,\s]+|[,\s]+$/g, '')
                .toLowerCase()
                .normalize('NFC')
            : ''

        const batchUserMap = new Map()
        ;(Array.isArray(batchResults) ? batchResults : []).forEach((u) => {
          if (!u) return
          const resolved = {
            UserId: u.UserId || u.EmpCode || '',
            UserName: u.UserName || u.EmpName || u.UserId || '',
            UserSeq: u.UserSeq || '',
            EmpID: u.EmpID || u.EmpCode || '',
            DeptName: u.DeptName || '',
            GroupName: groupName || (groupId ? `ID: ${groupId}` : '')
          }
          if (u.UserId) batchUserMap.set(normalize(u.UserId), resolved)
          if (u.UserSeq) batchUserMap.set(normalize(u.UserSeq), resolved)
          if (u.EmpID) batchUserMap.set(normalize(u.EmpID), resolved)
          if (u.EmpCode) batchUserMap.set(normalize(u.EmpCode), resolved)
          if (u.UserName) batchUserMap.set(normalize(u.UserName), resolved)
        })

        // 4. Áp dụng tuần tự cho từng dòng bảo toàn vị trí
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

              const cellVal = rowValues[c] ?? ''
              if (columnKey === 'UserId') {
                const norm = normalize(cellVal)
                const resolved = norm ? batchUserMap.get(norm) : null
                if (resolved) {
                  Object.assign(existingRow, resolved)
                } else {
                  existingRow.UserId = String(cellVal).trim()
                  existingRow.GroupName = groupName || (groupId ? `ID: ${groupId}` : '')
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
              existingRow.isEdited = true
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

        setStatusMessage?.({
          type: 'success',
          text: t('Đã dán thành công {{count}} dòng dữ liệu!', {
            count: numPastedRows.toLocaleString()
          })
        })
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
      t,
      groupName,
      groupId
    ]
  )

  const effectiveRows = numRows ?? gridData?.length ?? 0

  return (
    <div className="h-full w-full bg-white relative overflow-hidden flex flex-col select-none">
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          rows={effectiveRows}
          columns={cols}
          getCellContent={getData}
          onCellEdited={onCellEdited}
          getCellsForSelection={true}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
          onKeyDown={onKeyDown}
          onColumnMoved={onColumnMoved}
          onColumnResize={onColumnResize}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderContextMenu={onHeaderContextMenu}
          onCellContextMenu={onCellContextMenu}
          onPaste={onPaste}
          onFill={onFill}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          keybindings={keybindings}
          theme={gridTheme}
          freezeColumns={freezeColumnsCount}
          rowMarkers="both"
          rowHeight={24}
          headerHeight={24}
          smoothScrollX={true}
          smoothScrollY={true}
          rowSelect="multi"
          columnSelect="single"
          trailingRowOptions={{
            hint: ' ',
            sticky: true,
            tint: true
          }}
          onRowAppended={() => handleRowAppend(1)}
          highlightRegions={EMPTY_ARRAY}
        />
      </div>

      {/* RENDER POPUP VÀ MENU SHEET CHUẨN ERP */}
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

      {/* CODE HELP MODAL TRA CỨU NGƯỜI DÙNG CHUẨN KHUNG HỆ THỐNG (DOUBLE-CLICK HOẶC ENTER/F2) */}
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

      {/* DRAWER CẤU HÌNH CỘT ẨN/HIỆN */}
      <Drawer
        title={t('Cấu hình cột hiển thị')}
        placement="right"
        onClose={onClose}
        open={open}
        width={280}
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
  )
}
