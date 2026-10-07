/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import { Modal, Form, Input } from 'antd'
import { ShieldCheck, Tag as TagIcon } from 'lucide-react'

const { TextArea } = Input

export default function RoleModal({ visible, onCancel, onSave, initialValues, isEdit = false }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      if (initialValues && isEdit) {
        form.setFieldsValue({
          RoleId: initialValues.RoleId || initialValues.Id,
          RoleName: initialValues.RoleName || initialValues.Name,
          Comment: initialValues.Comment || initialValues.Description
        })
      } else {
        form.resetFields()
      }
    }
  }, [visible, initialValues, isEdit, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onSave({
        ...values,
        Id: isEdit ? initialValues.Id || initialValues.RoleId : values.RoleId,
        Name: values.RoleName
      })
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base border-b pb-3">
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span>
            {isEdit ? 'Chỉnh sửa nhóm vai trò / Phân quyền' : 'Tạo nhóm vai trò / Phân quyền mới'}
          </span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo nhóm quyền'}
      cancelText="Hủy bỏ"
      width={520}
      destroyOnClose
      okButtonProps={{ className: 'bg-purple-600 hover:bg-purple-500' }}
    >
      <Form form={form} layout="vertical" className="pt-3">
        <Form.Item
          name="RoleId"
          label={
            <span className="text-xs font-semibold text-slate-700">Mã nhóm quyền (Role ID)</span>
          }
          rules={[
            { required: true, message: 'Vui lòng nhập Mã nhóm quyền' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: 'Chỉ chứa chữ cái, số và dấu gạch dưới' }
          ]}
        >
          <Input
            prefix={<TagIcon className="w-4 h-4 text-slate-400 mr-1" />}
            placeholder="VD: PROD_PLANNER / QC_LEAD / OPERATOR"
            disabled={isEdit}
            className="rounded font-mono"
          />
        </Form.Item>

        <Form.Item
          name="RoleName"
          label={
            <span className="text-xs font-semibold text-slate-700">Tên hiển thị nhóm quyền</span>
          }
          rules={[{ required: true, message: 'Vui lòng nhập tên nhóm quyền' }]}
        >
          <Input placeholder="VD: Quản lý Kế hoạch Sản xuất" className="rounded" />
        </Form.Item>

        <Form.Item
          name="Comment"
          label={
            <span className="text-xs font-semibold text-slate-700">Mô tả nhiệm vụ & Quyền hạn</span>
          }
        >
          <TextArea
            rows={3}
            placeholder="Mô tả phạm vi quyền hạn và người dùng áp dụng..."
            className="rounded"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
