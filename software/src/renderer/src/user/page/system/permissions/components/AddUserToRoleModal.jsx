/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { Modal, Transfer, Alert } from 'antd'
import { UserPlus } from 'lucide-react'

export default function AddUserToRoleModal({
  visible,
  onCancel,
  onSave,
  role,
  allUsers = [],
  currentMembers = []
}) {
  const [targetKeys, setTargetKeys] = useState([])

  useEffect(() => {
    if (visible) {
      // Keys already in role
      const memberIds = currentMembers.map((m) => m.UserId || m.Id)
      setTargetKeys(memberIds)
    }
  }, [visible, currentMembers])

  const dataSource = allUsers.map((u) => ({
    key: u.UserId || u.Id,
    title: u.UserName || u.UserId,
    description: `${u.UserId} - ${u.Department || 'Chưa phân bổ'}`,
    department: u.Department,
    email: u.Email
  }))

  const handleChange = (newTargetKeys) => {
    setTargetKeys(newTargetKeys)
  }

  const handleOk = () => {
    onSave({
      RoleId: role?.RoleId || role?.Id,
      UserIds: targetKeys
    })
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base border-b pb-3">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
            <UserPlus className="w-5 h-5" />
          </div>
          <span>Gán người dùng vào nhóm: {role?.RoleName || role?.RoleId}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Lưu danh sách thành viên"
      cancelText="Hủy bỏ"
      width={720}
      destroyOnClose
      okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-500' }}
    >
      <div className="pt-2">
        <Alert
          message={
            <div className="text-xs">
              Chọn tài khoản từ danh sách bên trái và chuyển sang bên phải để gán vào nhóm{' '}
              <strong className="text-purple-700">{role?.RoleName}</strong>.
            </div>
          }
          type="info"
          showIcon
          className="mb-4"
        />

        <Transfer
          dataSource={dataSource}
          titles={['Người dùng hệ thống', 'Thành viên trong nhóm']}
          targetKeys={targetKeys}
          onChange={handleChange}
          render={(item) => (
            <div className="py-1">
              <div className="font-semibold text-xs text-slate-800">{item.title}</div>
              <div className="text-[11px] text-slate-500">{item.description}</div>
            </div>
          )}
          showSearch
          filterOption={(inputValue, item) =>
            item.title.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1 ||
            item.description.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
          }
          listStyle={{
            width: 310,
            height: 360
          }}
          className="user-transfer-control"
        />
      </div>
    </Modal>
  )
}
