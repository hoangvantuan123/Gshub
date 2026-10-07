/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useEffect, useCallback } from 'react'
import { Modal, Table, Button, Space, Popconfirm, message, Tag, Input, Typography } from 'antd'
import {
  UsergroupAddOutlined,
  UserDeleteOutlined,
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { PostQUserRole, PostAUserRole, PostDUserRole, PostQUserAuth } from '../../../../../api/system'

const { Text } = Typography

export default function RoleGroupMembersModal({
  visible,
  onClose,
  groupId,
  groupName,
  canEdit = true
}) {
  const { t } = useTranslation()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  
  // Modal thêm người dùng
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserKeys, setSelectedUserKeys] = useState([])
  const [userSearchText, setUserSearchText] = useState('')

  // 1. Tải danh sách thành viên hiện tại trong nhóm quyền
  const fetchMembers = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const res = await PostQUserRole({ groupId: String(groupId) })
      const data = res?.data?.data || res?.data || []
      setMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      message.error(t('Lỗi tải danh sách thành viên trong nhóm!'))
    } finally {
      setLoading(false)
    }
  }, [groupId, t])

  useEffect(() => {
    if (visible && groupId) {
      fetchMembers()
    }
  }, [visible, groupId, fetchMembers])

  // 2. Thêm người dùng vào nhóm quyền
  const handleConfirmAddUsers = async () => {
    if (!selectedUserKeys || selectedUserKeys.length === 0) {
      message.warning(t('Vui lòng chọn ít nhất 1 người dùng để gán vào nhóm!'))
      return
    }

    try {
      await PostAUserRole({
        groupId: String(groupId),
        userIds: selectedUserKeys
      })
      message.success(
        t('Đã gán {{count}} người dùng vào nhóm quyền thành công!', { count: selectedUserKeys.length })
      )
      setIsAddUserOpen(false)
      setSelectedUserKeys([])
      fetchMembers()
    } catch (err) {
      message.error(t('Lỗi khi gán người dùng vào nhóm quyền!'))
    }
  }

  // 3. Xóa người dùng khỏi nhóm quyền
  const handleRemoveUser = async (userId) => {
    if (!userId) return
    try {
      await PostDUserRole({
        groupId: String(groupId),
        userIds: [String(userId)]
      })
      message.success(t('Đã xóa người dùng khỏi nhóm quyền thành công!'))
      fetchMembers()
    } catch (err) {
      message.error(t('Lỗi khi xóa người dùng khỏi nhóm quyền!'))
    }
  }

  // 4. Mở modal chọn người dùng
  const handleOpenAddModal = async () => {
    setIsAddUserOpen(true)
    setLoadingUsers(true)
    setSelectedUserKeys([])
    try {
      const res = await PostQUserAuth({})
      const list = res?.data?.data || res?.data || []
      setAllUsers(Array.isArray(list) ? list : [])
    } catch {
      setAllUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const filteredMembers = members.filter((m) => {
    if (!searchText) return true
    const q = searchText.toLowerCase()
    return (
      String(m.UserId || '').toLowerCase().includes(q) ||
      String(m.UserName || '').toLowerCase().includes(q) ||
      String(m.GroupName || '').toLowerCase().includes(q)
    )
  })

  const currentMemberIds = new Set(members.map((m) => String(m.UserId || '').toLowerCase()))

  const filteredAllUsers = allUsers.filter((u) => {
    if (!userSearchText) return true
    const q = userSearchText.toLowerCase()
    return (
      String(u.UserId || '').toLowerCase().includes(q) ||
      String(u.UserName || u.EmpName || '').toLowerCase().includes(q) ||
      String(u.DeptName || '').toLowerCase().includes(q)
    )
  })

  const columns = [
    {
      title: t('Tài Khoản (UserId)'),
      dataIndex: 'UserId',
      key: 'UserId',
      width: 140,
      render: (val) => <strong className="text-blue-700 font-mono">{val}</strong>
    },
    {
      title: t('Tên Người Dùng'),
      dataIndex: 'UserName',
      key: 'UserName',
      width: 220,
      render: (val, row) => val || row.EmpName || row.UserId || '---'
    },
    {
      title: t('Nhóm Phân Quyền'),
      dataIndex: 'GroupName',
      key: 'GroupName',
      width: 200,
      render: (val) => <Tag color="blue">{val || groupName || `Nhóm ID: ${groupId}`}</Tag>
    },
    {
      title: t('Ngày Gán'),
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      width: 160,
      render: (val) => val || '---'
    },
    {
      title: t('Thao Tác'),
      key: 'action',
      width: 90,
      align: 'center',
      render: (_, record) =>
        canEdit ? (
          <Popconfirm
            title={t('Xóa khỏi nhóm?')}
            description={t('Bạn có chắc muốn xóa tài khoản {{id}} khỏi nhóm này?', { id: record.UserId })}
            onConfirm={() => handleRemoveUser(record.UserId)}
            okText={t('Xóa')}
            cancelText={t('Hủy')}
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<UserDeleteOutlined />}
              title={t('Xóa người dùng khỏi nhóm này')}
            />
          </Popconfirm>
        ) : null
    }
  ]

  const userSelectionColumns = [
    {
      title: t('Tài Khoản'),
      dataIndex: 'UserId',
      key: 'UserId',
      width: 130,
      render: (val) => <strong className="text-blue-700 font-mono">{val}</strong>
    },
    {
      title: t('Họ Và Tên'),
      dataIndex: 'UserName',
      key: 'UserName',
      width: 180,
      render: (val, row) => val || row.EmpName || '---'
    },
    {
      title: t('Mã Nhân Viên'),
      dataIndex: 'EmpID',
      key: 'EmpID',
      width: 120
    },
    {
      title: t('Phòng Ban'),
      dataIndex: 'DeptName',
      key: 'DeptName',
      width: 160
    },
    {
      title: t('Trạng Thái'),
      key: 'inGroup',
      width: 110,
      render: (_, row) => {
        const isIn = currentMemberIds.has(String(row.UserId || '').toLowerCase())
        return isIn ? <Tag color="green">{t('Đã trong nhóm')}</Tag> : <Tag color="default">{t('Chưa gán')}</Tag>
      }
    }
  ]

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <UsergroupAddOutlined className="text-blue-600 text-base" />
            <span>{t('Quản Lý Thành Viên Trong Nhóm')}:</span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {groupName || `ID: ${groupId}`}
            </span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            {t('Đóng')}
          </Button>
        ]}
        width={850}
        destroyOnClose
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <Text type="secondary">
                💡 {t('Một tài khoản người dùng có thể tham gia vào')} <strong>{t('nhiều nhóm quyền khác nhau')}</strong>. {t('Quyền thực tế của người dùng khi truy cập hệ thống là phép hợp của tất cả các nhóm quyền mà họ tham gia.')}
              </Text>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder={t('Tìm kiếm tài khoản, tên người dùng trong nhóm...')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="max-w-xs"
              size="small"
              allowClear
            />

            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchMembers}
                loading={loading}
                size="small"
              >
                {t('Tải lại')}
              </Button>
              {canEdit && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleOpenAddModal}
                  size="small"
                >
                  {t('Gán Thêm Người Dùng')}
                </Button>
              )}
            </Space>
          </div>

          <Table
            dataSource={filteredMembers}
            columns={columns}
            rowKey={(r) => r.Id || r.UserId}
            loading={loading}
            size="small"
            pagination={{ pageSize: 8, showTotal: (total) => t('Tổng cộng {{total}} thành viên', { total }) }}
            bordered
          />
        </div>
      </Modal>

      {/* MODAL CHỌN NGƯỜI DÙNG ĐỂ GÁN VÀO NHÓM */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <UserAddOutlined className="text-emerald-600" />
            <span>{t('Chọn Người Dùng Để Gán Vào Nhóm')}:</span>
            <span className="text-blue-700 font-bold">{groupName || groupId}</span>
          </div>
        }
        open={isAddUserOpen}
        onCancel={() => setIsAddUserOpen(false)}
        onOk={handleConfirmAddUsers}
        okText={t('Gán vào nhóm ({{count}})', { count: selectedUserKeys.length })}
        cancelText={t('Hủy')}
        width={750}
        destroyOnClose
      >
        <div className="flex flex-col gap-3 py-1">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder={t('Tìm kiếm theo tài khoản, họ tên, phòng ban...')}
            value={userSearchText}
            onChange={(e) => setUserSearchText(e.target.value)}
            size="small"
            allowClear
          />

          <Table
            dataSource={filteredAllUsers}
            columns={userSelectionColumns}
            rowKey={(r) => r.UserId}
            loading={loadingUsers}
            size="small"
            pagination={{ pageSize: 7 }}
            rowSelection={{
              selectedRowKeys: selectedUserKeys,
              onChange: (keys) => setSelectedUserKeys(keys)
            }}
            bordered
          />
        </div>
      </Modal>
    </>
  )
}
