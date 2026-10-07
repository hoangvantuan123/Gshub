/* eslint-disable react/prop-types */
import { Table, Tag, Avatar, Space, Button, Tooltip, Popconfirm } from 'antd'
import {
  Edit3,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Shield,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react'

export default function UserTable({
  tableTitle = 'Danh sách tài khoản người dùng',
  users = [],
  roles = [],
  loading = false,
  selectedUser,
  onSelectUser,
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onDeleteUser
}) {
  const columns = [
    {
      title: 'Mã người dùng',
      dataIndex: 'UserId',
      key: 'UserId',
      width: 150,
      render: (userId) => (
        <span className="font-mono font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
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
        const isActive = record.StatusAcc === 1 || record.StatusAcc === true

        return (
          <div className="flex items-center gap-2.5">
            <Avatar
              size="small"
              className={`font-semibold shrink-0 text-xs ${
                isActive ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}
            >
              {initials}
            </Avatar>
            <div className="min-w-0 font-semibold text-slate-800 text-xs truncate">
              {record.UserName}
            </div>
          </div>
        )
      }
    },
    {
      title: 'Thông tin liên hệ',
      key: 'contact',
      width: 230,
      render: (_, record) => (
        <div className="text-[11px] space-y-0.5">
          {record.Email && (
            <div className="text-slate-600 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{record.Email}</span>
            </div>
          )}
          {record.Phone && (
            <div className="text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{record.Phone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Phòng ban',
      dataIndex: 'Department',
      key: 'Department',
      width: 170,
      render: (dept) => (
        <div className="text-xs text-slate-700 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{dept || 'Chưa phân bổ'}</span>
        </div>
      )
    },
    {
      title: 'Nhóm quyền / Vai trò',
      key: 'roles',
      width: 240,
      render: (_, record) => {
        const userRoles = record.RoleIds || (record.RoleId ? [record.RoleId] : [])
        if (!userRoles || userRoles.length === 0) {
          return <span className="text-xs text-slate-400 italic">Chưa gán vai trò</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {userRoles.map((roleId) => {
              const matched = roles.find((r) => (r.RoleId || r.Id) === roleId)
              const name = matched ? matched.RoleName || matched.Name : roleId
              const isAdmin = roleId === 'ADMIN' || roleId === 'admin'
              return (
                <Tag
                  key={roleId}
                  color={isAdmin ? 'purple' : 'blue'}
                  className="text-[10px] font-medium m-0 flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  {name}
                </Tag>
              )
            })}
          </div>
        )
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const isActive = record.StatusAcc === 1 || record.StatusAcc === true
        return (
          <Tag
            color={isActive ? 'success' : 'error'}
            className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 m-0"
          >
            {isActive ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Hoạt động</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-rose-500" />
                <span>Bị khóa</span>
              </>
            )}
          </Tag>
        )
      }
    },
    {
      title: 'Đăng nhập gần nhất',
      dataIndex: 'LastLogin',
      key: 'LastLogin',
      width: 150,
      render: (text) => <span className="text-[11px] text-slate-500 font-mono">{text || '-'}</span>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const isActive = record.StatusAcc === 1 || record.StatusAcc === true
        return (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                type="text"
                size="small"
                icon={<Edit3 className="w-3.5 h-3.5 text-blue-600" />}
                onClick={() => onEditUser?.(record)}
              />
            </Tooltip>

            <Tooltip title="Đặt lại mật khẩu">
              <Button
                type="text"
                size="small"
                icon={<KeyRound className="w-3.5 h-3.5 text-amber-600" />}
                onClick={() => onResetPassword?.(record)}
              />
            </Tooltip>

            <Tooltip title={isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
              <Button
                type="text"
                size="small"
                icon={
                  isActive ? (
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  )
                }
                onClick={() => onToggleStatus?.(record)}
              />
            </Tooltip>

            <Popconfirm
              title="Xóa người dùng"
              description={`Bạn có chắc chắn muốn xóa tài khoản "${record.UserName}" không?`}
              onConfirm={() => onDeleteUser?.(record)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa tài khoản">
                <Button
                  type="text"
                  size="small"
                  icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  const activeCount = users.filter((u) => u.StatusAcc === 1 || u.StatusAcc === true).length

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Table Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {tableTitle}
          </span>
          <span className="text-[11px] text-slate-500">
            ({users.length} tài khoản | <strong className="text-emerald-600">{activeCount}</strong>{' '}
            hoạt động)
          </span>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-2">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="UserId"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} tài khoản`
          }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedUser ? [selectedUser.UserId] : [],
            onChange: (_, selectedRows) => onSelectUser?.(selectedRows[0] || null)
          }}
          onRow={(record) => ({
            onClick: () => onSelectUser?.(record),
            className:
              selectedUser?.UserId === record.UserId
                ? 'cursor-pointer bg-blue-50/50'
                : 'cursor-pointer hover:bg-slate-50'
          })}
          scroll={{ x: 1100 }}
          size="small"
          className="system-erp-table"
        />
      </div>
    </div>
  )
}
