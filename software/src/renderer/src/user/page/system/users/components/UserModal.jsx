/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import { Modal, Form, Input, Select, Switch, Row, Col, Divider } from 'antd'
import { User, Mail, Phone, Lock, Tag } from 'lucide-react'

const { Option } = Select

export default function UserModal({
  visible,
  onCancel,
  onSave,
  initialValues,
  isEdit = false,
  roleList = []
}) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      if (initialValues && isEdit) {
        form.setFieldsValue({
          ...initialValues,
          StatusAcc: initialValues.StatusAcc === 1 || initialValues.StatusAcc === true,
          RoleIds: initialValues.RoleIds || (initialValues.RoleId ? [initialValues.RoleId] : [])
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          StatusAcc: true,
          Language: 'vi',
          Department: 'Sản xuất',
          RoleIds: []
        })
      }
    }
  }, [visible, initialValues, isEdit, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        StatusAcc: values.StatusAcc ? 1 : 0
      }
      onSave(payload)
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base border-b pb-3">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
            <User className="w-5 h-5" />
          </div>
          <span>
            {isEdit ? 'Chỉnh sửa thông tin người dùng' : 'Đăng ký tài khoản người dùng mới'}
          </span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
      cancelText="Hủy bỏ"
      width={680}
      destroyOnClose
      okButtonProps={{ className: 'bg-blue-600 hover:bg-blue-500' }}
    >
      <Form form={form} layout="vertical" className="pt-3">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="UserId"
              label={
                <span className="text-xs font-semibold text-slate-700">
                  Mã người dùng (User ID)
                </span>
              }
              rules={[
                { required: true, message: 'Vui lòng nhập Mã người dùng' },
                { pattern: /^[a-zA-Z0-9_.-]+$/, message: 'Chỉ chứa ký tự chữ, số và _.-' }
              ]}
            >
              <Input
                prefix={<Tag className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder="VD: NV_001 / tuanhoang"
                disabled={isEdit}
                className="rounded"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="UserName"
              label={<span className="text-xs font-semibold text-slate-700">Họ và tên đầy đủ</span>}
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
            >
              <Input
                prefix={<User className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder="VD: Hoàng Văn Tuấn"
                className="rounded"
              />
            </Form.Item>
          </Col>
        </Row>

        {!isEdit && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="Password"
                label={<span className="text-xs font-semibold text-slate-700">Mật khẩu</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }
                ]}
              >
                <Input.Password
                  prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder="Nhập mật khẩu"
                  className="rounded"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ConfirmPassword"
                label={
                  <span className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu</span>
                }
                dependencies={['Password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('Password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'))
                    }
                  })
                ]}
              >
                <Input.Password
                  prefix={<Lock className="w-4 h-4 text-slate-400 mr-1" />}
                  placeholder="Nhập lại mật khẩu"
                  className="rounded"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="Email"
              label={<span className="text-xs font-semibold text-slate-700">Địa chỉ Email</span>}
              rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}
            >
              <Input
                prefix={<Mail className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder="VD: tuanhoang@gshub.vn"
                className="rounded"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="Phone"
              label={<span className="text-xs font-semibold text-slate-700">Số điện thoại</span>}
            >
              <Input
                prefix={<Phone className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder="VD: 0987654321"
                className="rounded"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="Department"
              label={
                <span className="text-xs font-semibold text-slate-700">Phòng ban / Bộ phận</span>
              }
            >
              <Select placeholder="Chọn phòng ban" className="rounded">
                <Option value="Ban Giám Đốc">Ban Giám Đốc</Option>
                <Option value="Phòng Sản Xuất">Phòng Sản Xuất</Option>
                <Option value="Phòng Kế Hoạch">Phòng Kế Hoạch</Option>
                <Option value="Phòng Quản Lý Chất Lượng (QC)">Phòng Quản Lý Chất Lượng (QC)</Option>
                <Option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</Option>
                <Option value="Phòng IT & Hệ Thống">Phòng IT & Hệ Thống</Option>
                <Option value="Kho & Vận Hành">Kho & Vận Hành</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="RoleIds"
              label={
                <span className="text-xs font-semibold text-slate-700">
                  Nhóm quyền / Vai trò (Roles)
                </span>
              }
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="Chọn nhóm quyền áp dụng"
                className="rounded"
                maxTagCount="responsive"
              >
                {roleList.map((r) => (
                  <Option key={r.RoleId || r.Id} value={r.RoleId || r.Id}>
                    {r.RoleName || r.Name || r.RoleId}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider className="my-3" />

        <Row gutter={16} align="middle">
          <Col span={12}>
            <Form.Item
              name="Language"
              label={
                <span className="text-xs font-semibold text-slate-700">Ngôn ngữ mặc định</span>
              }
              className="mb-0"
            >
              <Select className="rounded">
                <Option value="vi">Tiếng Việt (vi)</Option>
                <Option value="en">English (en)</Option>
                <Option value="zh">中文 (zh)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md mt-4">
              <div>
                <div className="text-xs font-semibold text-slate-800">Trạng thái tài khoản</div>
                <div className="text-[11px] text-slate-500">
                  Cho phép người dùng đăng nhập hệ thống
                </div>
              </div>
              <Form.Item name="StatusAcc" valuePropName="checked" noStyle>
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
              </Form.Item>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
