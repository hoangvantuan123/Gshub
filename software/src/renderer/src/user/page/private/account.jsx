import { useState, useEffect } from 'react'
import { UserOutlined, LockOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons'
import { Typography, List, Modal, Input, Button } from 'antd'

export default function Account() {
  const userFromLocalStorage = JSON.parse(localStorage.getItem('userInfo') || '{}')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorPass, setErrorPass] = useState('')
  const [loggedUsers, setLoggedUsers] = useState([])

  const loadLoggedUsers = async () => {
    let users = []
    if (window?.electron?.readDataFromFile) {
      try {
        const data = await window.electron.readDataFromFile('save_users_log.json')
        if (Array.isArray(data)) users = data
      } catch {
        users = []
      }
    }
    if (!users || users.length === 0) {
      try {
        const data = localStorage.getItem('save_users_log')
        if (data) users = JSON.parse(data)
      } catch {
        users = []
      }
    }
    setLoggedUsers(users || [])
  }

  useEffect(() => {
    loadLoggedUsers()
  }, [])

  const handleDeleteUserLog = async (userSeq, userId) => {
    const updated = loggedUsers.filter((u) => u.UserSeq !== userSeq && u.UserId !== userId)
    setLoggedUsers(updated)
    localStorage.setItem('save_users_log', JSON.stringify(updated))
    if (window?.electron?.saveDataToFile) {
      try {
        await window.electron.saveDataToFile('save_users_log.json', updated)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorPass('Vui lòng nhập đầy đủ thông tin!')
      return
    }
    const isValidLength =
      newPassword.length >= 15 ||
      (newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword))

    if (!isValidLength) {
      setErrorPass(
        'Mật khẩu mới phải có ít nhất 15 ký tự hoặc ít nhất 8 ký tự bao gồm cả chữ và số!'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorPass('Mật khẩu mới không khớp!')
      return
    }

    if (newPassword === oldPassword) {
      setErrorPass('Mật khẩu mới không được giống với mật khẩu cũ. Vui lòng chọn mật khẩu khác!')
      return
    }

    try {
      /*   const response = await ChangePassword(userFromLocalStorage.UserId, oldPassword, newPassword);
              if (response.success) {
                  message.success(response.message || 'Đã đổi mật khẩu thành công!');
                  setNewPassword('');
                  setConfirmPassword('');
                  setOldPassword('');
                  setErrorPass('');
                  setIsModalOpen(false)
              } else {
                  setErrorPass(response.message);
              } */
    } catch (error) {
      setErrorPass('Đã xảy ra lỗi khi thay đổi mật khẩu. Vui lòng thử lại sau.')
    }
  }

  const handleOpenModal = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsModalOpen(true)
  }
  return (
    <div>
      <Typography.Title level={5}>Tài khoản</Typography.Title>
      <Typography.Text type="secondary" className="text-xs italic">
        Điều chỉnh các tùy chọn liên quan đến tài khoản và quyền riêng tư.
      </Typography.Text>
      {/* Bảo mật tài khoản */}
      <div className="mt-6">
        <h3 className="text-md font-semibold text-gray-700">Bảo mật tài khoản</h3>
        <List className="mt-3">
          <List.Item>
            <List.Item.Meta
              avatar={<UserOutlined />}
              title="Tên đăng nhập"
              description={userFromLocalStorage?.UserId || 'N/A'}
            />
          </List.Item>
          <List.Item
            actions={[
              <Button type="link" onClick={handleOpenModal}>
                Đổi mật khẩu
              </Button>
            ]}
          >
            <List.Item.Meta avatar={<LockOutlined />} title="Mật khẩu" description="••••••••" />
          </List.Item>
        </List>
      </div>

      {/* Nhật ký tài khoản đã đăng nhập */}
      <div className="mt-6">
        <h3 className="text-md font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
          <HistoryOutlined />
          <span>Tài khoản</span>
        </h3>
        <List
          className="bg-white rounded border border-gray-200"
          dataSource={loggedUsers}
          locale={{ emptyText: 'Chưa có lịch sử tài khoản nào' }}
          renderItem={(user) => (
            <List.Item
              actions={[
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteUserLog(user.UserSeq, user.UserId)}
                >
                  Xóa
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div className="w-8 h-8 rounded-full bg-[#163B2B] text-white flex items-center justify-center text-xs font-bold">
                    {user.UserName?.charAt(0)?.toUpperCase() ||
                      user.UserId?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </div>
                }
                title={
                  <span className="font-semibold text-xs text-gray-800">
                    {user.UserName ? `${user.UserName} (${user.UserId})` : user.UserId}
                  </span>
                }
                description={
                  <span className="text-[11px] text-gray-500">
                    Đăng nhập gần nhất:{' '}
                    {user.LastLoginTime
                      ? new Date(user.LastLoginTime).toLocaleString('vi-VN')
                      : 'N/A'}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <LockOutlined className="text-blue-500 text-lg" />
            <span>Đổi Mật Khẩu</span>
          </div>
        }
        open={isModalOpen}
        centered
        closable={false}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleChangePassword}>
            Xác nhận
          </Button>
        ]}
      >
        {/* Mô tả */}
        <div className="mb-4 p-3 bg-gray-100 rounded-md">
          <h3 className="text-sm font-medium">Đặt mật khẩu</h3>
          <p className="text-xs text-gray-600 italic">
            Sử dụng mật khẩu dài ít nhất <b>15 ký tự</b> hoặc dài ít nhất <b>8 ký tự</b> bao gồm cả
            chữ cái và số.
          </p>
        </div>

        {/* Input nhập mật khẩu */}
        <div className="space-y-4">
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Mật khẩu cũ"
            value={oldPassword}
            name="oldPassword"
            autoComplete="current-password"
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Mật khẩu mới"
            value={newPassword}
            name="newPassword"
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            name="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {errorPass && (
          <div className="flex items-center justify-center mb-5 mt-5 gap-2 self-end rounded bg-red-100 p-1 text-red-600">
            <span className="text-xs font-medium">{errorPass}</span>
          </div>
        )}
      </Modal>
    </div>
  )
}
