/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import { Modal, Form, Input, Alert } from 'antd'
import { KeyRound, Lock } from 'lucide-react'

export default function ResetPasswordModal({ visible, onCancel, onSave, user }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      form.resetFields()
    }
  }, [visible, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onSave({
        UserId: user?.UserId,
        NewPassword: values.NewPassword
      })
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base border-b pb-3">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
            <KeyRound className="w-5 h-5" />
          </div>
          <span>Đặt lại mật khẩu người dùng</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Cập nhật mật khẩu"
      cancelText="Hủy bỏ"
      width={480}
      destroyOnClose
      okButtonProps={{ className: 'bg-amber-600 hover:bg-amber-500' }}
    >
      <div className="pt-2">
        <Alert
          message={
            <div className="text-xs">
              Đang đặt lại mật khẩu cho tài khoản:{' '}
              <strong className="text-slate-800 font-medium">
                {user?.UserName} ({user?.UserId})
              </strong>
            </div>
          }
          type="info"
          showIcon
          className="mb-4"
        />

        <Form form={form} layout="vertical">
          <Form.Item
            name="NewPassword"
            label={<span className="text-xs font-semibold text-slate-700">Mật khẩu mới</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' }
            ]}
          >
            <Input.Password
              prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
              placeholder="Nhập mật khẩu mới"
              className="rounded"
            />
          </Form.Item>

          <Form.Item
            name="ConfirmPassword"
            label={
              <span className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu mới</span>
            }
            dependencies={['NewPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận lại mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('NewPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'))
                }
              })
            ]}
          >
            <Input.Password
              prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
              placeholder="Nhập lại mật khẩu mới"
              className="rounded"
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  )
}
