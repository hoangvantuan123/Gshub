import { useState } from 'react'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Avatar, List, Typography, Modal, Input, Button, message } from 'antd'

export default function Profile() {
  const userFromLocalStorage = JSON.parse(localStorage.getItem('userInfo'))

  // State mở modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorPass, setErrorPass] = useState('')
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
      <div className="flex items-center space-x-4">
        <Avatar shape="square" size={64} icon={<UserOutlined />} />
        <div>
          <h2 className="text-lg font-medium">{userFromLocalStorage.UserName}</h2>
          <p className="text-gray-500 text-sm">ID: {userFromLocalStorage.UserId}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold text-gray-700">Thông tin cá nhân</h3>
        <List className="mt-3">
          <List.Item>
            <List.Item.Meta title="Email" description="#########" />
          </List.Item>
          <List.Item>
            <List.Item.Meta title="Số điện thoại" description="#########" />
          </List.Item>
        </List>
      </div>
    </div>
  )
}
