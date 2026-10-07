/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Switch, Select, Row, Col } from 'antd'
import { LayoutGrid, Tag } from 'lucide-react'

const { Option } = Select

const AVAILABLE_ICONS = [
  'BarChart3',
  'Settings',
  'ShieldCheck',
  'Users',
  'Package',
  'Factory',
  'Warehouse',
  'Truck',
  'FolderOpen',
  'FileText',
  'Calendar',
  'Workflow',
  'Database',
  'Boxes',
  'SlidersHorizontal'
]

export default function RootMenuModal({
  visible,
  onCancel,
  onSave,
  initialValues,
  isEdit = false
}) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      if (initialValues && isEdit) {
        form.setFieldsValue({
          ...initialValues,
          RootMenuName:
            initialValues.RootMenuName || initialValues.RootMenuLabel || initialValues.Label,
          RootMenuKey: initialValues.RootMenuKey || initialValues.Key,
          RootMenuIcon: initialValues.RootMenuIcon || initialValues.Icon || 'Settings',
          View: initialValues.View !== false,
          OrderSeq: initialValues.OrderSeq || 1
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          RootMenuIcon: 'Settings',
          View: true,
          OrderSeq: 1
        })
      }
    }
  }, [visible, initialValues, isEdit, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onSave({
        ...values,
        Id: isEdit
          ? initialValues.Id || initialValues.RootMenuId
          : values.RootMenuId || `ROOT_${values.RootMenuKey?.toUpperCase()}`,
        RootMenuId: isEdit
          ? initialValues.RootMenuId || initialValues.Id
          : values.RootMenuId || `ROOT_${values.RootMenuKey?.toUpperCase()}`,
        RootMenuLabel: values.RootMenuName,
        Icon: values.RootMenuIcon,
        MenuIcon: values.RootMenuIcon
      })
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base border-b pb-3">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span>
            {isEdit ? 'Chỉnh sửa Root Menu (Module Cấp 1)' : 'Thêm mới Root Menu (Module Cấp 1)'}
          </span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo Root Menu'}
      cancelText="Hủy bỏ"
      width={560}
      destroyOnClose
      okButtonProps={{ className: 'bg-indigo-600 hover:bg-indigo-500' }}
    >
      <Form form={form} layout="vertical" className="pt-3">
        <Form.Item
          name="RootMenuName"
          label={
            <span className="text-xs font-semibold text-slate-700">
              Tên hiển thị Module (Root Menu Label)
            </span>
          }
          rules={[{ required: true, message: 'Vui lòng nhập tên Root Menu' }]}
        >
          <Input placeholder="VD: Quản Trị Hệ Thống / Báo Cáo / Sản Xuất" className="rounded" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="RootMenuKey"
              label={<span className="text-xs font-semibold text-slate-700">Mã Root Key</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập mã key' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: 'Chỉ chứa chữ cái, số và dấu gạch dưới' }
              ]}
            >
              <Input
                prefix={<Tag className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder="VD: system / report / prod"
                disabled={isEdit}
                className="rounded"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="RootMenuIcon"
              label={
                <span className="text-xs font-semibold text-slate-700">Biểu tượng (Icon)</span>
              }
              rules={[{ required: true, message: 'Vui lòng chọn biểu tượng' }]}
            >
              <Select placeholder="Chọn icon" className="rounded">
                {AVAILABLE_ICONS.map((icon) => (
                  <Option key={icon} value={icon}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-indigo-600">{icon}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16} align="middle">
          <Col span={12}>
            <Form.Item
              name="OrderSeq"
              label={
                <span className="text-xs font-semibold text-slate-700">
                  Thứ tự hiển thị (OrderSeq)
                </span>
              }
            >
              <InputNumber min={1} max={99} className="w-full rounded" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md mt-4">
              <div>
                <div className="text-xs font-semibold text-slate-800">Hiển thị module</div>
                <div className="text-[11px] text-slate-500">
                  Bật để xuất hiện trên thanh Sidebar
                </div>
              </div>
              <Form.Item name="View" valuePropName="checked" noStyle>
                <Switch checkedChildren="Bật" unCheckedChildren="Ẩn" />
              </Form.Item>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
