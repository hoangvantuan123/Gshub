/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import GenericCodeHelpModal from '../../../../components/query/core/GenericCodeHelpModal'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox, Button, message } from 'antd'
import { UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons'
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

  // State quản lý Modal Code Help mở tức thì khi click ô hoặc nút Thêm
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
          const selectedList = Array.isArray(selected) ? selected : [selected]
          if (selectedList.length === 0) return

          setGridData((prev) => {
            let next = [...prev]

            if (rowIndex !== undefined && rowIndex >= 0 && selectedList.length === 1) {
              const u = selectedList[0]
              while (next.length <= rowIndex) {
                next.push({
                  WorkingTag: 'A',
                  Status: 'A',
                  GroupName: groupName || (groupId ? `ID: ${groupId}` : '')
                })
              }
              const current = { ...(next[rowIndex] || {}) }
              current.UserSeq = u.UserSeq || ''
              current.UserId = u.UserId || ''
              current.UserName = u.UserName || u.EmpName || u.UserId || ''
              current.EmpID = u.EmpID || u.EmpCode || ''
              current.DeptName = u.DeptName || ''
              current.GroupName = groupName || (groupId ? `ID: ${groupId}` : '')
              current.WorkingTag = current.Id ? 'U' : 'A'
              current.Status = current.WorkingTag
              current.isEdited = true
              next[rowIndex] = current
              return updateIndexNo(next)
            }

            // Gán danh sách nhiều tài khoản
            selectedList.forEach((u) => {
              const existingIdx = next.findIndex(
                (item) =>
                  String(item?.UserId || '').toLowerCase() === String(u?.UserId || '').toLowerCase()
              )
              if (existingIdx >= 0) {
                if (next[existingIdx].WorkingTag === 'D') {
                  next[existingIdx] = {
                    ...next[existingIdx],
                    WorkingTag: 'U',
                    Status: 'U',
                    isEdited: true
                  }
                }
                return
              }

              next.push({
                WorkingTag: 'A',
                Status: 'A',
                UserSeq: u.UserSeq || '',
                UserId: u.UserId || '',
                UserName: u.UserName || u.EmpName || u.UserId || '',
                EmpID: u.EmpID || u.EmpCode || '',
                DeptName: u.DeptName || '',
                GroupName: groupName || (groupId ? `ID: ${groupId}` : ''),
                isEdited: true
              })
            })

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
    onHeaderContextMenu,
    onPaste
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
        value = item?.GroupName || (item?.UserId ? groupName || `ID: ${groupId}` : '')
      } else if (item) {
        value = item[columnKey] ?? ''
      }

      if (meta.isStatus) {
        const tag = String(item?.WorkingTag || item?.Status || '')
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

  // Gỡ thành viên đang chọn trong sheet
  const handleDeleteSelectedMembers = useCallback(() => {
    if (!selection?.rows || selection.rows.length === 0) {
      message.warning(t('Vui lòng chọn ít nhất 1 dòng thành viên để gỡ khỏi nhóm!'))
      return
    }

    const selectedRowIndices = new Set()
    for (const range of selection.rows) {
      for (let i = range[0]; i < range[1]; i++) {
        selectedRowIndices.add(i)
      }
    }

    setGridData((prev) => {
      const next = prev.filter((_, idx) => !selectedRowIndices.has(idx))
      return updateIndexNo(next)
    })

    message.info(
      t('Đã gỡ thành viên khỏi bảng. Nhấn LƯU (Ctrl+S) để cập nhật thay đổi vào hệ thống!')
    )
  }, [selection, setGridData, t])

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
          title={t('Tra cứu và chọn tài khoản người dùng')}
          columns={codeHelpConfig.UserId.columns}
          fetchHelpData={codeHelpConfig.UserId.fetchHelpData}
          onSelect={handleSelectDirectHelp}
          initialSearchText={directHelpModal.initialText}
          isMultiSelect={true}
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
