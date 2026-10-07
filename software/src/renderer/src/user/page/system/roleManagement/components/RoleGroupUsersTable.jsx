/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo, useState } from 'react'
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
import useOnFill from '../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { createCodeHelpFetcher } from '../../../../utils/codeHelpUtils'
import { PostQUserAuth } from '../../../../../api/system'

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
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch && setShowSearch(false), [setShowSearch])
  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('role_group_users_sheet')

  // State quản lý Modal Code Help mở tức thì khi click ô
  const [directHelpModal, setDirectHelpModal] = useState({
    isOpen: false,
    rowIndex: -1,
    initialText: ''
  })

  // Cấu hình Code Help tra cứu User
  const codeHelpConfig = useMemo(() => {
    return {
      UserId: {
        title: t('Tra cứu người dùng hệ thống'),
        columns: [
          { id: 'UserId', title: t('Mã Tài Khoản'), width: 150 },
          { id: 'UserName', title: t('Họ Và Tên'), width: 220 },
          { id: 'EmpID', title: t('Mã NV'), width: 120 },
          { id: 'DeptName', title: t('Phòng Ban'), width: 180 }
        ],
        fetchHelpData: createCodeHelpFetcher(PostQUserAuth),
        onSelect: (selected, rowIndex) => {
          if (!selected) return
          setGridData((prev) => {
            const next = [...prev]
            const targetIdx = rowIndex >= 0 ? rowIndex : 0
            while (next.length <= targetIdx) {
              next.push({
                WorkingTag: 'A',
                Status: 'A',
                GroupName: groupName || (groupId ? `ID: ${groupId}` : '')
              })
            }
            const current = { ...(next[targetIdx] || {}) }
            current.UserId = selected.UserId || ''
            current.UserName = selected.UserName || selected.EmpName || selected.UserId || ''
            current.EmpID = selected.EmpID || selected.EmpCode || ''
            current.DeptName = selected.DeptName || ''
            current.GroupName = groupName || (groupId ? `ID: ${groupId}` : '')
            current.WorkingTag = current.Id ? 'U' : 'A'
            current.Status = current.WorkingTag
            current.isEdited = true
            next[targetIdx] = current
            return updateIndexNo(next)
          })
        }
      }
    }
  }, [t, groupName, groupId, setGridData])

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
    onCellContextMenu,
    onHeaderContextMenu
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

  // 2. Hàm truy xuất dữ liệu ô tối ưu
  const getData = useCallback(
    ([col, row]) => {
      const item = gridData[row]
      const meta = colMetadata[col]
      if (!meta) {
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
        value = item?.GroupName || (item?.UserId ? (groupName || `ID: ${groupId}`) : '')
      } else if (item) {
        value = item[columnKey] ?? ''
      }

      if (meta.isStatus) {
        const tag = String(item?.WorkingTag || item?.Status || (item?.UserId ? '' : 'A'))
        return {
          kind: GridCellKind.Text,
          data: tag,
          displayData: tag,
          readonly: true,
          allowOverlay: false,
          hasMenu: meta.hasMenu,
          contentAlign: 'center',
          themeOverride:
            tag === 'A'
              ? { textDark: '#d97706', baseFontStyle: 'bold 12px' }
              : tag === 'U'
                ? { textDark: '#2563eb', baseFontStyle: 'bold 12px' }
                : tag === 'D'
                  ? { textDark: '#dc2626', baseFontStyle: 'bold 12px' }
                  : meta.cellTheme
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

  // 3. Callback khi người dùng chỉnh sửa ô
  const onCellEdited = useCallback(
    ([col, row], cell) => {
      if (!canEdit) return

      const meta = colMetadata[col]
      if (!meta || meta.isReadOnly) return

      const columnKey = meta.columnKey
      const val = cell.data

      setGridData((prev) => {
        const next = [...prev]
        while (next.length <= row) {
          next.push({
            WorkingTag: 'A',
            Status: 'A',
            GroupName: groupName || (groupId ? `ID: ${groupId}` : '')
          })
        }
        const current = { ...(next[row] || {}) }
        current[columnKey] = val
        if (!current.WorkingTag && !current.Id) {
          current.WorkingTag = 'A'
        } else if (!current.WorkingTag) {
          current.WorkingTag = 'U'
        }
        current.Status = current.WorkingTag
        current.isEdited = true
        next[row] = current
        return updateIndexNo(next)
      })
    },
    [canEdit, colMetadata, setGridData, groupName, groupId]
  )

  // 4. CLICK TRỰC TIẾP VÀO Ô CODE HELP ĐỂ MỞ MODAL NGAY LẬP TỨC
  const onCellClicked = useCallback(
    (cell, event) => {
      if (!cell) return
      const [col, row] = cell
      if (col < 0 || row < 0) return
      const meta = colMetadata[col]
      if (!meta) return

      // Khi click vào cột Code Help (UserId), mở ngay modal Code Help
      if (meta.isCodeHelp && canEdit !== false) {
        const currentValue = gridData?.[row]?.[meta.columnKey] || ''
        setDirectHelpModal({
          isOpen: true,
          rowIndex: row,
          initialText: String(currentValue)
        })
      }
    },
    [colMetadata, canEdit, gridData]
  )

  // 5. KÍCH HOẠT CELL (DOUBLE CLICK HOẶC ENTER)
  const onCellActivated = useCallback(
    (cell) => {
      if (!cell) return
      const [col, row] = cell
      if (col < 0 || row < 0) return
      const meta = colMetadata[col]
      if (meta?.isCodeHelp && canEdit !== false) {
        const currentValue = gridData?.[row]?.[meta.columnKey] || ''
        setDirectHelpModal({
          isOpen: true,
          rowIndex: row,
          initialText: String(currentValue)
        })
      }
    },
    [colMetadata, canEdit, gridData]
  )

  // 6. Phím tắt F2 hoặc Enter để mở Code Help
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'F2' || e.key === 'Enter') {
        const currentCell = selection?.current?.cell
        if (currentCell) {
          const [col, row] = currentCell
          const meta = colMetadata[col]
          if (meta?.isCodeHelp && canEdit !== false) {
            e.preventDefault()
            e.stopPropagation()
            const currentValue = gridData?.[row]?.[meta.columnKey] || ''
            setDirectHelpModal({
              isOpen: true,
              rowIndex: row,
              initialText: String(currentValue)
            })
          }
        }
      }
    },
    [selection, colMetadata, canEdit, gridData]
  )

  const handleSelectDirectHelp = (selected) => {
    if (!selected) {
      setDirectHelpModal({ isOpen: false, rowIndex: -1, initialText: '' })
      return
    }

    const config = codeHelpConfig.UserId
    if (config?.onSelect) {
      config.onSelect(selected, directHelpModal.rowIndex)
    }

    setDirectHelpModal({ isOpen: false, rowIndex: -1, initialText: '' })
  }

  // Số lượng dòng thực tế hiển thị
  const totalRows = useMemo(() => {
    const dataLen = gridData.length
    return Math.max(dataLen, 30)
  }, [gridData.length])

  return (
    <div className="h-full w-full bg-white relative overflow-hidden flex flex-col select-none">
      <div className="flex-1 min-h-0 w-full relative">
        <DataEditor
          ref={gridRef}
          width="100%"
          height="100%"
          rows={totalRows}
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
        />
      </div>

      {/* RENDER POPUP VÀ LAYOUT CHUẨN ERP */}
      {showMenu &&
        renderLayer(
          <div {...layerProps}>
            <LayoutMenuSheet
              showMenu={showMenu}
              handleSort={handleSort}
              handleHideColumn={handleHideColumn}
              handleFreezeColumn={handleFreezeColumn}
              handleReset={handleReset}
              showDrawer={showDrawer}
            />
          </div>
        )}

      {/* CODE HELP MODAL TRA CỨU NGƯỜI DÙNG KHI CLICK VÀO Ô HOẶC BẤM F2 */}
      {directHelpModal.isOpen && (
        <GenericCodeHelpModal
          isOpen={directHelpModal.isOpen}
          onClose={() => setDirectHelpModal({ isOpen: false, rowIndex: -1, initialText: '' })}
          title={t('Tra cứu người dùng hệ thống')}
          columns={codeHelpConfig.UserId.columns}
          fetchHelpData={codeHelpConfig.UserId.fetchHelpData}
          onSelect={handleSelectDirectHelp}
          initialSearchText={directHelpModal.initialText}
          isMultiSelect={false}
          storageKey="role_mgmt_user_help"
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
