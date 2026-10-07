/* eslint-disable react/prop-types */
import { Table, Tag, Avatar, Button, Tooltip, Popconfirm, Tabs, Checkbox, Empty } from 'antd'
import { ShieldCheck, Shield, Users, UserMinus, FolderTree, Sliders } from 'lucide-react'

export default function PermissionTable({
  roles = [],
  selectedRole,
  onSelectRole,
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
  const memberColumns = [
    {
      title: 'Mã người dùng',
      dataIndex: 'UserId',
      key: 'UserId',
      width: 150,
      render: (userId) => (
        <span className="font-mono font-semibold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
          @{userId}
        </span>
      )
    },
    {
      title: 'Họ và tên',
      key: 'UserName',
      width: 220,
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
      width: 180,
      render: (dept) => <span className="text-xs text-slate-700">{dept || 'Chưa phân bổ'}</span>
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      width: 200,
      render: (email) => <span className="text-xs text-slate-500 font-mono">{email || '-'}</span>
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const isActive = record.StatusAcc === 1 || record.StatusAcc === true
        return (
          <Tag color={isActive ? 'success' : 'error'} className="text-[10px] m-0">
            {isActive ? 'Hoạt động' : 'Bị khóa'}
          </Tag>
        )
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
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
      width: 320,
      render: (_, record) => {
        const isSub = record.MenuType === 'submenu'
        return (
          <div className="flex items-center gap-2">
            <span
              className={isSub ? 'font-bold text-slate-800 text-xs' : 'text-slate-700 text-xs pl-4'}
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
      width: 220,
      render: (key) => <span className="font-mono text-xs text-slate-500">{key}</span>
    },
    {
      title: 'Đường dẫn Route',
      dataIndex: 'MenuLink',
      key: 'MenuLink',
      width: 260,
      render: (link) => (
        <span className="text-xs text-blue-600 font-mono truncate">{link || '-'}</span>
      )
    },
    {
      title: 'Quyền truy cập',
      key: 'perm',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const isAllowed = allowedMenuKeys.includes(record.MenuKey)
        const isAdmin = selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'
        return (
          <Checkbox
            checked={isAdmin || isAllowed}
            disabled={isAdmin}
            onChange={() => onToggleMenuPerm?.(record.MenuKey)}
          >
            <span className="text-xs font-medium">Cho phép xem</span>
          </Checkbox>
        )
      }
    }
  ]

  const actionMatrixColumns = [
    {
      title: 'Màn hình / Nghiệp vụ',
      key: 'MenuLabel',
      width: 260,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-xs text-slate-800">
            {record.MenuLabel || record.Label}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">{record.MenuKey}</div>
        </div>
      )
    },
    {
      title: 'Xem (View)',
      key: 'view',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'view')}
          disabled={selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'view')}
        />
      )
    },
    {
      title: 'Thêm mới (Create)',
      key: 'create',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'create')}
          disabled={selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'create')}
        />
      )
    },
    {
      title: 'Chỉnh sửa (Edit)',
      key: 'edit',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'edit')}
          disabled={selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'edit')}
        />
      )
    },
    {
      title: 'Xóa (Delete)',
      key: 'delete',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'delete')}
          disabled={selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'delete')}
        />
      )
    },
    {
      title: 'Xuất Excel (Export)',
      key: 'export',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'export')}
          disabled={selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'export')}
        />
      )
    },
    {
      title: 'Phê duyệt (Approve)',
      key: 'approve',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={getActionPerm(record.MenuKey, 'approve')}
          disabled={selectedRole?.RoleId === 'ADMIN' || selectedRole?.RoleId === 'admin'}
          onChange={() => onToggleActionPerm(record.MenuKey, 'approve')}
        />
      )
    }
  ]

  return (
    <div className="flex h-full bg-white border-t border-slate-200">
      {/* Left Column: Role Selector */}
      <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-2.5 border-b border-slate-200 flex items-center gap-1.5 bg-slate-100/70">
          <Shield className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Danh Sách Nhóm Quyền
          </span>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {roles.map((role) => {
            const roleId = role.RoleId || role.Id
            const isSelected = selectedRole?.RoleId === roleId || selectedRole?.Id === roleId
            const isAdmin = roleId === 'ADMIN' || roleId === 'admin'

            return (
              <div
                key={roleId}
                onClick={() => onSelectRole?.(role)}
                className={`p-2.5 rounded border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-purple-50/80 border-purple-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    {role.RoleName || role.Name}
                  </span>
                  {isAdmin && (
                    <Tag color="purple" className="text-[9px] m-0 px-1 py-0">
                      Super
                    </Tag>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{roleId}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Master-Detail Permissions Table */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedRole ? (
          <>
            {/* Header with Tabs */}
            <div className="flex items-center justify-between px-3 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800">
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
                        Phân Quyền Thao Tác (CRUD)
                      </span>
                    )
                  }
                ]}
              />
            </div>

            {/* Sub-toolbar for current active tab */}
            {activeTab === 'menus' && (
              <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  Cấp quyền hiển thị menu trên thanh điều hướng cho nhóm quyền này
                </span>
                <div className="flex items-center gap-2">
                  <Button size="small" onClick={() => onSelectAllMenus(true)} className="text-xs">
                    Chọn tất cả
                  </Button>
                  <Button size="small" onClick={() => onSelectAllMenus(false)} className="text-xs">
                    Bỏ chọn tất cả
                  </Button>
                </div>
              </div>
            )}

            {/* Tab Table Body */}
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
                        description="Chưa có thành viên nào trong nhóm này. Bấm nút 'GÁN THÀNH VIÊN' ở thanh công cụ phía trên."
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
                  scroll={{ x: 800 }}
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
                  scroll={{ x: 950 }}
                  className="system-erp-table"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Chọn nhóm quyền ở danh sách bên trái để bắt đầu phân quyền
          </div>
        )}
      </div>
    </div>
  )
}
