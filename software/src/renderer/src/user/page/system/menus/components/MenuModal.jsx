/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Switch, Select, Row, Col, Radio } from 'antd'
import { FolderTree, Tag, Link as LinkIcon } from 'lucide-react'

const { Option } = Select

const AVAILABLE_ICONS = [
  'Users',
  'LayoutGrid',
  'ShieldCheck',
  'Settings',
  'FolderOutlined',
  'Calendar',
  'BarChart3',
  'FileSpreadsheet',
  'FileText',
  'KeyRound',
  'BookOpen',
  'Workflow',
  'Database',
  'Boxes',
  'SlidersHorizontal',
  'CheckCircle2',
  'Tag',
  'Lock',
  'UserCheck'
]

export default function MenuModal({
  visible,
  onCancel,
  onSave,
  initialValues,
  isEdit = false,
  rootMenus = [],
  subMenus = []
}) {
  const [form] = Form.useForm()
  const menuType = Form.useWatch('MenuType', form)

  useEffect(() => {
    if (visible) {
      if (initialValues && isEdit) {
        form.setFieldsValue({
          ...initialValues,
          MenuLabel: initialValues.MenuLabel || initialValues.Label,
          MenuKey: initialValues.MenuKey || initialValues.Key,
          MenuType: initialValues.MenuType || (initialValues.MenuSubRootId ? 'menu' : 'submenu'),
          MenuIcon: initialValues.MenuIcon || initialValues.Icon || 'FolderOutlined',
          MenuLink: initialValues.MenuLink || initialValues.Link || '',
          MenuRootId: initialValues.MenuRootId || 'ROOT_SYSTEM',
          MenuSubRootId: initialValues.MenuSubRootId || undefined,
          View: initialValues.View !== false,
          OrderSeq: initialValues.OrderSeq || 1
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          MenuType: initialValues?.MenuType || 'menu',
          MenuRootId:
            initialValues?.MenuRootId ||
            rootMenus[0]?.RootMenuId ||
            rootMenus[0]?.Id ||
            'ROOT_SYSTEM',
          MenuSubRootId: initialValues?.MenuSubRootId || undefined,
          MenuIcon: 'FolderOutlined',
          View: true,
          OrderSeq: 1
        })
      }
    }
  }, [visible, initialValues, isEdit, rootMenus, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const isSubmenu = values.MenuType === 'submenu'
      onSave({
        ...values,
        Id: isEdit
          ? initialValues.Id
          : isSubmenu
            ? `sub_${values.MenuKey}`
            : `menu_${values.MenuKey}`,
        Icon: values.MenuIcon,
        MenuSubRootId: isSubmenu ? undefined : values.MenuSubRootId
      })
    } catch (err) {
      console.error('Validation failed:', err)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base border-b pb-3">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
            <FolderTree className="w-5 h-5" />
          </div>
          <span>
            {isEdit
              ? `Chỉnh sửa ${menuType === 'submenu' ? 'Submenu (Nhóm)' : 'Menu chức năng'}`
              : `Đăng ký ${menuType === 'submenu' ? 'Submenu (Nhóm)' : 'Menu chức năng'} mới`}
          </span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText={isEdit ? 'Lưu thay đổi' : 'Đăng ký Menu'}
      cancelText="Hủy bỏ"
      width={640}
      destroyOnClose
      okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-500' }}
    >
      <Form form={form} layout="vertical" className="pt-3">
        <Form.Item
          name="MenuType"
          label={<span className="text-xs font-semibold text-slate-700">Loại Menu</span>}
          rules={[{ required: true }]}
        >
          <Radio.Group buttonStyle="solid" className="w-full">
            <Radio.Button value="submenu" className="w-1/2 text-center text-xs">
              📁 Submenu (Menu nhóm cha)
            </Radio.Button>
            <Radio.Button value="menu" className="w-1/2 text-center text-xs">
              📄 Menu chức năng (Liên kết trang)
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="MenuRootId"
              label={
                <span className="text-xs font-semibold text-slate-700">Thuộc Root Module</span>
              }
              rules={[{ required: true, message: 'Vui lòng chọn Root Module' }]}
            >
              <Select placeholder="Chọn Root Module" className="rounded">
                {rootMenus.map((r) => {
                  const id = r.RootMenuId || r.Id
                  const name = r.RootMenuName || r.RootMenuLabel || r.Label || id
                  return (
                    <Option key={id} value={id}>
                      {name} ({id})
                    </Option>
                  )
                })}
              </Select>
            </Form.Item>
          </Col>

          {menuType === 'menu' && (
            <Col span={12}>
              <Form.Item
                name="MenuSubRootId"
                label={
                  <span className="text-xs font-semibold text-slate-700">
                    Thuộc Submenu (Nhóm cha)
                  </span>
                }
                rules={[{ required: true, message: 'Vui lòng chọn Submenu cha' }]}
              >
                <Select placeholder="Chọn Submenu cha" className="rounded">
                  {subMenus.map((s) => {
                    const id = s.Id || s.MenuKey
                    const name = s.MenuLabel || s.Label || id
                    return (
                      <Option key={id} value={id}>
                        {name}
                      </Option>
                    )
                  })}
                </Select>
              </Form.Item>
            </Col>
          )}
        </Row>

        <Form.Item
          name="MenuLabel"
          label={
            <span className="text-xs font-semibold text-slate-700">
              Tên hiển thị Menu (Menu Label)
            </span>
          }
          rules={[{ required: true, message: 'Vui lòng nhập tên menu' }]}
        >
          <Input placeholder="VD: Quản lý Người dùng / Đăng ký Báo cáo" className="rounded" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="MenuKey"
              label={
                <span className="text-xs font-semibold text-slate-700">
                  Mã Menu Key (Permission Key)
                </span>
              }
              rules={[
                { required: true, message: 'Vui lòng nhập mã key' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: 'Chỉ chứa chữ cái, số và dấu gạch dưới' }
              ]}
            >
              <Input
                prefix={<Tag className="w-4 h-4 text-slate-400 mr-1" />}
                placeholder="VD: system_users / report_plan"
                disabled={isEdit}
                className="rounded"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="MenuIcon"
              label={
                <span className="text-xs font-semibold text-slate-700">Biểu tượng (Icon)</span>
              }
              rules={[{ required: true, message: 'Vui lòng chọn icon' }]}
            >
              <Select placeholder="Chọn icon" className="rounded">
                {AVAILABLE_ICONS.map((icon) => (
                  <Option key={icon} value={icon}>
                    <span className="font-mono text-xs text-emerald-600">{icon}</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {menuType === 'menu' && (
          <Form.Item
            name="MenuLink"
            label={
              <span className="text-xs font-semibold text-slate-700">
                Đường dẫn Route (URL Link)
              </span>
            }
            rules={[{ required: true, message: 'Vui lòng nhập đường dẫn URL' }]}
          >
            <Input
              prefix={<LinkIcon className="w-4 h-4 text-slate-400 mr-1" />}
              placeholder="VD: /erp/u/system/users"
              className="rounded"
            />
          </Form.Item>
        )}

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
                <div className="text-xs font-semibold text-slate-800">Hiển thị trên Sidebar</div>
                <div className="text-[11px] text-slate-500">
                  Bật để hiển thị trong cây điều hướng
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
