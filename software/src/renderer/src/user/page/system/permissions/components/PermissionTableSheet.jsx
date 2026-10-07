/* eslint-disable react/prop-types */
import { useCallback, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { SlidersHorizontal, ShieldCheck, Users, FolderTree, Sliders, UserMinus } from 'lucide-react'
import { Tabs, Table, Checkbox, Tag, Avatar, Button, Tooltip, Popconfirm, Empty } from 'antd'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox as UICheckbox } from '../../../../../components/ui'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'

export default function PermissionTableSheet({
  tableTitle = 'Phân quyền & Nhóm người dùng',
  cols = [],
  setCols,
  defaultCols,
  gridData = [],
  setGridData,
  selection,
  setSelection,
  showSearch,
  setShowSearch,
  onRegisterDrawer,
  selectedRole,
  activeTab = 'members',
  onTabChange,
  members = [],
  menuPermissions = [],
  allowedMenuKeys = [],
  onToggleMenuPerm,
  onSelectAllMenus,
  actionMatrix = [],
  getActionPerm,
  onToggleActionPerm,
  onRemoveMember
}) {
  const { t } = useTranslation()
  const gridRef = useRef(null)

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('role_management_table')

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
    onKeyDown: baseOnKeyDown,
    onCellContextMenu,
    onHeaderContextMenu
  } = useTableManager({
    tableId: 'role_management_table',
    defaultCols,
    cols,
    setCols,
    setGridData: setGridData || (() => {}),
    gridData,
    selection,
    setSelection,
    canEdit: false,
    setShowSearch
  })

  useEffect(() => {
    if (typeof onRegisterDrawer === 'function') {
      onRegisterDrawer(showDrawer)
    }
  }, [onRegisterDrawer, showDrawer])

  const onSearchClose = useCallback(() => {
    if (typeof setShowSearch === 'function') setShowSearch(false)
  }, [setShowSearch])

  const onClose = () => setOpen(false)

  // Pre-computed metadata for fast O(1) lookup
  const colMetadata = useMemo(() => {
    return (cols || []).map((column) => {
      const columnKey = column.id || ''
      const isNumber = column.kind === 'Number' || columnKey === 'MemberCount'
      const cellTheme = getCellTheme(columnKey, column)
      const isReadOnly = isReadOnlyColumn(columnKey, column) || column.readonly || true

      return {
        columnKey,
        isNumber,
        kind: column.kind,
        title: column.title || columnKey,
        cellTheme,
        isReadOnly,
        hasMenu: column.hasMenu || false
      }
    })
  }, [cols, getCellTheme, isReadOnlyColumn])

  // Cell Content Provider
  const getCellContent = useCallback(
    ([col, row]) => {
      const rowItem = gridData[row]
      const meta = colMetadata[col]
      if (!meta || !rowItem) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const val = rowItem[meta.columnKey]

      if (meta.columnKey === 'WorkingTag') {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: meta.cellTheme
        }
      }

      if (meta.columnKey === 'RoleId') {
        return {
          kind: GridCellKind.Text,
          data: String(val || ''),
          displayData: String(val || ''),
          readonly: true,
          allowOverlay: false,
          themeOverride: {
            textDark: '#7c3aed',
            baseFontStyle: 'bold 12px'
          }
        }
      }

      if (meta.isNumber) {
        const num = Number(val) || 0
        return {
          kind: GridCellKind.Number,
          data: num,
          displayData: String(num),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: {
            textDark: '#2563eb',
            baseFontStyle: 'bold 12px'
          }
        }
      }

      return {
        kind: GridCellKind.Text,
        data: String(val ?? ''),
        displayData: String(val ?? ''),
        readonly: true,
        allowOverlay: false,
        themeOverride: meta.cellTheme
      }
    },
    [gridData, colMetadata]
  )

  const numRows = gridData.length

  // Columns for Right Detail Tabs
  const memberColumns = [
    {
      title: 'Mã người dùng',
      dataIndex: 'UserId',
      key: 'UserId',
      width: 130,
      render: (userId) => (
        <span className="font-mono font-semibold text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
          @{userId}
        </span>
      )
    },
    {
      title: 'Họ và tên',
      key: 'UserName',
      width: 180,
      render: (_, record) => {
        const initials = (record.UserName || record.UserId || 'U')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
        return (
          <div className="flex items-center gap-2">
            <Avatar
              size="small"
              className="bg-purple-600 text-white font-semibold shrink-0 text-xs"
            >
              {initials}
            </Avatar>
            <span className="font-semibold text-slate-800 text-xs truncate">{record.UserName}</span>
          </div>
        )
      }
    },
    {
      title: 'Phòng ban',
      dataIndex: 'Department',
      key: 'Department',
      width: 150,
      render: (dept) => <span className="text-xs text-slate-700">{dept || 'Chưa phân bổ'}</span>
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const isActive = record.StatusAcc === 1 || record.StatusAcc === true
        return (
          <Tag color={isActive ? 'success' : 'error'} className="text-[10px] m-0">
            {isActive ? 'Hoạt động' : 'Đã khóa'}
          </Tag>
        )
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="Gỡ khỏi nhóm quyền"
          description={`Gỡ ${record.UserName} khỏi nhóm ${selectedRole?.RoleName}?`}
          onConfirm={() => onRemoveMember?.(record.UserId)}
          okText="Gỡ"
          cancelText="Hủy"
        >
          <Tooltip title="Gỡ khỏi nhóm">
            <Button
              type="text"
              size="small"
              icon={<UserMinus className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />}
            />
          </Tooltip>
        </Popconfirm>
      )
    }
  ]

  const menuPermColumns = [
    {
      title: 'Tên Menu / Chức năng',
      key: 'MenuLabel',
      width: 260,
      render: (_, record) => {
        const isSub = record.MenuType === 'submenu'
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={isSub ? 'font-bold text-slate-800 text-xs' : 'text-slate-700 text-xs pl-3'}
            >
              {isSub ? '📁 ' : '📄 '} {record.MenuLabel || record.Label}
            </span>
          </div>
        )
      }
    },
    {
      title: 'Mã Key',
      dataIndex: 'MenuKey',
      key: 'MenuKey',
      width: 170,
      render: (key) => <span className="font-mono text-xs text-slate-500">{key}</span>
    },
    {
      title: 'Quyền xem',
      key: 'perm',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const isAllowed = allowedMenuKeys.includes(record.MenuKey)
        const isAdmin = selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'
        return (
          <Checkbox
            checked={isAdmin || isAllowed}
            disabled={isAdmin}
            onChange={() => onToggleMenuPerm?.(record.MenuKey)}
          />
        )
      }
    }
  ]

  const actionMatrixColumns = [
    {
      title: 'Màn hình',
      key: 'MenuLabel',
      width: 180,
      render: (_, record) => (
        <span className="font-semibold text-xs text-slate-800">
          {record.MenuLabel || record.Label}
        </span>
      )
    },
    {
      title: 'Xem (View)',
      key: 'view',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'view')}
          disabled={selectedRole?.RoleId === 'ADMIN'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'view')}
        />
      )
    },
    {
      title: 'Thêm',
      key: 'create',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'create')}
          disabled={selectedRole?.RoleId === 'ADMIN'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'create')}
        />
      )
    },
    {
      title: 'Sửa',
      key: 'edit',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'edit')}
          disabled={selectedRole?.RoleId === 'ADMIN'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'edit')}
        />
      )
    },
    {
      title: 'Xóa',
      key: 'delete',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'delete')}
          disabled={selectedRole?.RoleId === 'ADMIN'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'delete')}
        />
      )
    },
    {
      title: 'Xuất Excel',
      key: 'export',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'export')}
          disabled={selectedRole?.RoleId === 'ADMIN'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'export')}
        />
      )
    }
  ]

  return (
    <div className="flex h-full bg-white relative">
      {/* Left Column: Roles Glide Table Sheet */}
      <div className="w-1/2 border-r border-slate-300 flex flex-col relative">
        <div className="flex items-center justify-between px-3 py-1 bg-[#ececf1] border-b border-slate-300 text-xs select-none">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-slate-800 uppercase tracking-wide">{tableTitle}</span>
            <span className="text-[11px] text-slate-500 font-medium">
              (Đã tải: <strong className="text-purple-700">{numRows}</strong> nhóm quyền)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={showDrawer}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs"
              title="Cấu hình hiển thị cột"
            >
              <SlidersHorizontal size={12} className="text-slate-500" />
              <span>{t('TÙY CHỈNH CỘT')}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full relative">
          <DataEditor
            ref={gridRef}
            columns={cols}
            rows={numRows}
            getCellContent={getCellContent}
            gridSelection={selection}
            onGridSelectionChange={setSelection}
            onHeaderMenuClick={onHeaderMenuClick}
            onColumnMoved={onColumnMoved}
            onColumnResize={onColumnResize}
            onCellClicked={onCellClicked}
            onCellActivated={onCellActivated}
            onCellContextMenu={onCellContextMenu}
            onHeaderContextMenu={onHeaderContextMenu}
            onKeyDown={baseOnKeyDown}
            freezeColumns={freezeColumnsCount}
            theme={gridTheme}
            showSearch={showSearch}
            onSearchClose={onSearchClose}
            keybindings={keybindings}
            smoothScrollX={true}
            smoothScrollY={true}
            rowMarkers="both"
            rowSelect="multi"
            verticalBorder={true}
            drawFocusRing={true}
          />

          <LayoutMenuSheet
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            onHeaderMenuClick={onHeaderMenuClick}
            layerProps={layerProps}
            renderLayer={renderLayer}
            handleHideColumn={handleHideColumn}
            handleReset={handleReset}
            handleSort={handleSort}
            handleFreezeColumn={handleFreezeColumn}
            freezeColumnsCount={freezeColumnsCount}
          />

          <LayoutStatusMenuSheet
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            onHeaderMenuClick={onHeaderMenuClick}
            layerProps={layerProps}
            renderLayer={renderLayer}
            handleHideColumn={handleHideColumn}
            handleReset={handleReset}
            handleSort={handleSort}
            handleFreezeColumn={handleFreezeColumn}
            freezeColumnsCount={freezeColumnsCount}
          />

          <LayoutContextMenuSheet
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            layerProps={layerProps}
            renderLayer={renderLayer}
          />
        </div>
      </div>

      {/* Right Column: Role Details & Permissions */}
      <div className="w-1/2 flex flex-col bg-white">
        {selectedRole ? (
          <>
            <div className="flex items-center justify-between px-3 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2 py-1">
                <span className="text-xs font-bold text-purple-800">
                  {selectedRole.RoleName} ({selectedRole.RoleId})
                </span>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={onTabChange}
                className="permission-tabs mb-[-1px]"
                items={[
                  {
                    key: 'members',
                    label: (
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <Users className="w-3.5 h-3.5" />
                        Thành Viên ({members.length})
                      </span>
                    )
                  },
                  {
                    key: 'menus',
                    label: (
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <FolderTree className="w-3.5 h-3.5" />
                        Phân Quyền Menu ({allowedMenuKeys.length})
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    label: (
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <Sliders className="w-3.5 h-3.5" />
                        Ma Trận CRUD
                      </span>
                    )
                  }
                ]}
              />
            </div>

            {activeTab === 'menus' && (
              <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-200 text-xs">
                <span className="text-slate-500 font-medium text-[11px]">
                  Tích chọn menu được phép truy cập
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    onClick={() => onSelectAllMenus(true)}
                    className="text-[11px]"
                  >
                    Chọn tất cả
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onSelectAllMenus(false)}
                    className="text-[11px]"
                  >
                    Bỏ chọn tất cả
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-2">
              {activeTab === 'members' && (
                <Table
                  columns={memberColumns}
                  dataSource={members}
                  rowKey="UserId"
                  pagination={false}
                  size="small"
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có thành viên nào trong nhóm này."
                      />
                    )
                  }}
                  className="system-erp-table"
                />
              )}

              {activeTab === 'menus' && (
                <Table
                  columns={menuPermColumns}
                  dataSource={menuPermissions}
                  rowKey="MenuKey"
                  pagination={false}
                  size="small"
                  className="system-erp-table"
                />
              )}

              {activeTab === 'actions' && (
                <Table
                  columns={actionMatrixColumns}
                  dataSource={actionMatrix}
                  rowKey="MenuKey"
                  pagination={false}
                  size="small"
                  className="system-erp-table"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Chọn một nhóm quyền ở bảng bên trái để cấu hình phân quyền
          </div>
        )}
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={open}
        onClose={onClose}
        title={t('Cấu hình hiển thị cột bảng nhóm quyền')}
        description={t('Tích chọn để ẩn/hiện hoặc kéo thả để đổi thứ tự cột')}
      >
        <div className="space-y-2 p-2">
          {configurableCols.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <UICheckbox
                id={`col-${col.id}`}
                checked={!hiddenColumns.includes(col.id)}
                onCheckedChange={(checked) => handleCheckboxChange(col.id, checked)}
              />
              <label
                htmlFor={`col-${col.id}`}
                className="text-xs text-slate-700 cursor-pointer select-none"
              >
                {col.title || col.id}
              </label>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  )
}
