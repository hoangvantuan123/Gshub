/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Form,
  Input,
  Checkbox,
  Select,
  DatePicker,
  Button,
  Tabs,
  Space,
  Table,
  Tag,
  Divider,
  message,
  Modal,
  Avatar,
  Upload
} from 'antd'
import {
  SaveOutlined,
  ReloadOutlined,
  CloseOutlined,
  KeyOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  LockOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  CheckSquareOutlined,
  CameraOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
  CheckOutlined
} from '@ant-design/icons'
import { SquareArrowOutUpRight } from 'lucide-react'
import TopLoadingBar from 'react-top-loading-bar'
import dayjs from 'dayjs'

import { PostQUserAuth } from '../../../../api/system'
import { PostUUserAuth } from '../../../../api/system'
import { PostUPass } from '../../../../api/system'
import { PostUUserAuthStatusAcc } from '../../../../api/system'

export default function UserDetailForm({ canEdit = true }) {
  const { userSeq } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const loadingBarRef = useRef(null)

  const [activeLeftTab, setActiveLeftTab] = useState('user')
  const [activeRoleTab, setActiveRoleTab] = useState('userRole')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)

  const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}')

  // Sample default roles list (matching ERP format)
  const [rolesData, setRolesData] = useState([
    { key: '1', id: '1', roleName: 'Administrator', selected: true },
    { key: '2', id: '2', roleName: 'Cho phép thêm/sửa đối tượng', selected: false },
    { key: '3', id: '3', roleName: 'Cập nhật LCĐ, LTT', selected: false },
    { key: '4', id: '4', roleName: 'TKSX', selected: false },
    { key: '5', id: '5', roleName: 'Cho phép thêm/sửa vật tư', selected: false },
    { key: '6', id: '6', roleName: 'Vai trò khai báo/ sửa đổi danh mục', selected: false }
  ])

  const [specialRolesData, setSpecialRolesData] = useState([
    { key: '1', id: '1', roleName: 'Xem giá vốn / Giá mua', selected: false },
    { key: '2', id: '2', roleName: 'Sửa ngày chứng từ', selected: false },
    { key: '3', id: '3', roleName: 'Hủy khóa kỳ kế toán', selected: false }
  ])

  const [approvalRolesData, setApprovalRolesData] = useState([
    { key: '1', id: '1', roleName: 'Duyệt đơn đặt hàng mua (PO)', selected: false },
    { key: '2', id: '2', roleName: 'Duyệt phiếu xuất kho thành phẩm', selected: false },
    { key: '3', id: '3', roleName: 'Duyệt phiếu chi tiền mặt', selected: false }
  ])

  // Fetch user details
  const fetchUserData = useCallback(async () => {
    if (!userSeq) return

    setLoading(true)
    loadingBarRef.current?.continuousStart()

    try {
      const response = await PostQUserAuth({
        UserSeq: userSeq,
        KeyItem3: userSeq
      })

      if (response.success && Array.isArray(response.data)) {
        const found =
          response.data.find(
            (u) => String(u.UserSeq) === String(userSeq) || String(u.UserId) === String(userSeq)
          ) || response.data[0]

        if (found) {
          setUserData(found)
          form.setFieldsValue({
            ...found,
            UserId: found.UserId || '',
            UserName: found.UserName || '',
            EmpName: found.EmpName || found.EmpID || '',
            Email: found.Email || found.PwdMailAdder || '',
            Phone: found.Phone || '',
            ManagerName: found.ManagerName || '',
            PurchaseGroup: found.PurchaseGroup || '2: User thuộc phòng CNTT',
            TargetSubject: found.TargetSubject || '',
            Platforms: found.Platforms || '1, 2, 4 (Web, Soft, App)',
            AuthType: 'Xác thực bằng tài khoản hệ thống',
            IsDataLock:
              found.IsDataLock === 1 || found.IsDataLock === true || found.IsDataLock === '1',
            DataLockDate: found.DataLockDate ? dayjs(found.DataLockDate) : null,
            AllowAddTransferRow: found.AllowAddTransferRow ?? false,
            StatusAcc: found.StatusAcc === 1 || found.StatusAcc === true || found.StatusAcc === '1',
            CheckPass1:
              found.CheckPass1 === 1 || found.CheckPass1 === true || found.CheckPass1 === '1',
            Active: found.Active === 1 || found.Active === true || found.Active === '1'
          })
        } else {
          message.warning('Không tìm thấy thông tin tài khoản!')
        }
      } else {
        message.error(response.message || 'Lỗi khi tải dữ liệu người dùng!')
      }
    } catch (error) {
      message.error(error?.message || 'Đã có lỗi xảy ra khi tải dữ liệu!')
    } finally {
      setLoading(false)
      loadingBarRef.current?.complete()
    }
  }, [userSeq, form])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  // Save changes
  const handleSave = async (closeAfterSave = false) => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      loadingBarRef.current?.continuousStart()

      const payload = [
        {
          ...userData,
          ...values,
          UserSeq: userSeq || userData?.UserSeq,
          DataLockDate: values.DataLockDate ? values.DataLockDate.format('YYYY-MM-DD') : '',
          UpdatedBy: currentUser?.UserSeq
        }
      ]

      const res = await PostUUserAuth(payload)
      if (res.success) {
        message.success('Cập nhật thông tin người dùng thành công!')
        if (closeAfterSave) {
          handleClose()
        } else {
          fetchUserData()
        }
      } else {
        message.error(res.message || 'Cập nhật thất bại!')
      }
    } catch (err) {
      if (err?.errorFields) {
        message.warning('Vui lòng kiểm tra lại các trường thông tin hợp lệ!')
      } else {
        message.error(err?.message || 'Có lỗi xảy ra khi lưu!')
      }
    } finally {
      setSaving(false)
      loadingBarRef.current?.complete()
    }
  }

  // Reset Password
  const handleResetPassword = () => {
    Modal.confirm({
      title: 'Xác nhận đặt lại mật khẩu',
      content: `Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản "${userData?.UserId || userSeq}" về mật khẩu mặc định?`,
      okText: 'Đặt lại mật khẩu',
      okType: 'danger',
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        loadingBarRef.current?.continuousStart()
        try {
          const res = await PostUPass([
            {
              UserSeq: userData?.UserSeq || userSeq,
              UserId: userData?.UserId,
              UpdatedBy: currentUser?.UserSeq,
              CheckPass1: false
            }
          ])
          if (res.success) {
            message.success('Đã đặt lại mật khẩu thành công!')
            fetchUserData()
          } else {
            message.error(res.message || 'Lỗi khi đặt lại mật khẩu!')
          }
        } catch (e) {
          message.error(e?.message || 'Lỗi khi thực hiện!')
        } finally {
          loadingBarRef.current?.complete()
        }
      }
    })
  }

  // Close window
  const handleClose = () => {
    if (window.electron?.close) {
      window.electron.close()
    } else {
      window.close()
    }
  }

  // Toggle role selection
  const handleToggleRole = (key, listType = 'userRole') => {
    if (listType === 'userRole') {
      setRolesData((prev) => prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r)))
    } else if (listType === 'specialRole') {
      setSpecialRolesData((prev) =>
        prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r))
      )
    } else {
      setApprovalRolesData((prev) =>
        prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r))
      )
    }
  }

  const roleColumns = [
    {
      title: 'STT',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      align: 'center',
      render: (text) => <span className="text-xs text-slate-500 font-mono">{text}</span>
    },
    {
      title: 'Vai trò người dùng',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (text, record) => (
        <div
          onClick={() => handleToggleRole(record.key, activeRoleTab)}
          className={`cursor-pointer text-xs select-none flex items-center gap-2 py-0.5 px-1 rounded ${
            record.selected
              ? 'bg-blue-600 text-white font-medium'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Checkbox checked={record.selected} />
          <span>{text}</span>
        </div>
      )
    }
  ]

  const getCurrentRoleData = () => {
    if (activeRoleTab === 'specialRole') return specialRolesData
    if (activeRoleTab === 'approvalRole') return approvalRolesData
    return rolesData
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#eef2f5] select-none overflow-hidden font-sans text-xs">
      <TopLoadingBar color="#0284c7" height={2.5} ref={loadingBarRef} />

      {/* 1. TOP ACTION TOOLBAR (Theo chuẩn khung ERP hiện tại) */}
      <div className="bg-white border-b border-slate-200 px-3 py-1 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            key="Search"
            icon={<SearchOutlined style={{ fontSize: '11px' }} />}
            size="small"
            onClick={fetchUserData}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
          >
            {t('TÌM KIẾM')}
          </Button>

          <Button
            key="Save"
            icon={<SaveOutlined style={{ fontSize: '11px' }} />}
            size="small"
            onClick={() => handleSave(false)}
            loading={saving}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-800"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
          >
            {t('LƯU')}
          </Button>

          <Button
            key="ResetPass"
            icon={<KeyOutlined style={{ fontSize: '11px' }} />}
            size="small"
            onClick={handleResetPassword}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-amber-700 hover:text-amber-800"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
          >
            {t('ĐẶT LẠI MK')}
          </Button>

          <Button
            key="Reload"
            icon={<ReloadOutlined style={{ fontSize: '11px' }} />}
            size="small"
            onClick={fetchUserData}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
          >
            {t('LÀM MỚI')}
          </Button>

          <Button
            key="Close"
            icon={<CloseOutlined style={{ fontSize: '11px' }} />}
            size="small"
            onClick={handleClose}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600 hover:text-rose-700"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
          >
            {t('ĐÓNG')}
          </Button>
        </div>
      </div>

      {/* 2. BODY CONTENT (Left Sidebar Tabs + Right Presentation Panel) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* BÊN TRÁI: DANH SÁCH TAB ĐIỀU HƯỚNG */}
        <div className="w-52 bg-[#f6f8fa] border-r border-slate-300 flex flex-col shrink-0 select-none">
          {/* Header thanh bên trái */}
          <div className="bg-[#e4e9ee] border-b border-slate-300 px-2 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>Công cụ</span>
          </div>

          {/* List items bên trái */}
          <div className="flex-1 overflow-y-auto py-1">
            <div
              onClick={() => setActiveLeftTab('user')}
              className={`px-3 py-1.5 cursor-pointer text-[11px] font-medium transition-colors ${
                activeLeftTab === 'user'
                  ? 'bg-[#c9e2f5] text-blue-900 border-l-3 border-blue-600 font-semibold'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Người sử dụng
            </div>

            <div
              onClick={() => setActiveLeftTab('role')}
              className={`px-3 py-1.5 cursor-pointer text-[11px] font-medium transition-colors ${
                activeLeftTab === 'role'
                  ? 'bg-[#c9e2f5] text-blue-900 border-l-3 border-blue-600 font-semibold'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Phân quyền vai trò
            </div>
          </div>
        </div>

        {/* BÊN PHẢI: NỘI DUNG TRÌNH BÀY (Không padding bao ngoài, dính liền sidebar) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          {activeLeftTab === 'user' ? (
            <Form form={form} layout="horizontal" className="flex flex-col w-full">
              {/* KHỐI 1: THÔNG TIN CHUNG NGƯỜI SỬ DỤNG */}
              <div className="border-b border-slate-300 bg-white">
                {/* Header */}
                <div className="bg-[#0284c7] text-white px-2.5 py-1 text-[11px] font-bold border-b border-[#0369a1] flex items-center justify-between">
                  <span>Thông tin chung người sử dụng</span>
                </div>

                <div className="p-2 flex gap-3 items-stretch">
                  {/* Các trường nhập liệu */}
                  <div className="flex-1 flex flex-col gap-1.5 justify-between">
                    {/* 1. Người sử dụng */}
                    <div className="flex items-center text-xs">
                      <label className="w-52 text-slate-700 font-medium">1. Người sử dụng</label>
                      <Form.Item name="UserId" noStyle>
                        <Input
                          disabled
                          className="flex-1 h-6 text-xs bg-slate-50 font-bold text-slate-800 rounded-none border-slate-300 uppercase"
                        />
                      </Form.Item>
                    </div>

                    {/* 2. Tên đầy đủ */}
                    <div className="flex items-center text-xs">
                      <label className="w-52 text-slate-700 font-medium">2. Tên đầy đủ</label>
                      <Form.Item
                        name="UserName"
                        noStyle
                        rules={[{ required: true, message: 'Nhập tên đầy đủ' }]}
                      >
                        <Input className="flex-1 h-6 text-xs rounded-none border-slate-300 uppercase font-semibold" />
                      </Form.Item>
                    </div>

                    {/* 3. Nhân viên */}
                    <div className="flex items-center text-xs">
                      <label className="w-52 text-slate-700 font-medium">3. Nhân viên</label>
                      <Form.Item name="EmpName" noStyle>
                        <Input
                          placeholder="Mã hoặc tên nhân viên"
                          className="flex-1 h-6 text-xs rounded-none border-slate-300"
                        />
                      </Form.Item>
                    </div>

                    {/* 4. Quản lý cấp trên */}
                    <div className="flex items-center text-xs">
                      <label className="w-52 text-slate-700 font-medium">4. Quản lý cấp trên</label>
                      <Form.Item name="ManagerName" noStyle>
                        <Input
                          placeholder="Ví dụ: "
                          className="flex-1 h-6 text-xs rounded-none border-slate-300"
                        />
                      </Form.Item>
                    </div>

                    {/* 5. Email */}
                    <div className="flex items-center text-xs">
                      <label className="w-52 text-slate-700 font-medium">5. Email</label>
                      <Form.Item name="Email" noStyle>
                        <Input className="flex-1 h-6 text-xs rounded-none border-slate-300" />
                      </Form.Item>
                    </div>

                    {/* 6. Phương thức xác thực (Khóa cố định xác thực tài khoản hệ thống) */}
                    <div className="flex items-center text-xs">
                      <label className="w-52 text-slate-700 font-medium">
                        6. Phương thức xác thực
                      </label>
                      <Form.Item
                        name="AuthType"
                        noStyle
                        initialValue="Xác thực bằng tài khoản hệ thống"
                      >
                        <Input
                          disabled
                          className="flex-1 h-6 text-xs bg-slate-50 font-medium text-slate-700 rounded-none border-slate-300"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Vùng ảnh chân dung bên phải */}
                  <div className="w-40 border border-slate-300 bg-[#f8fafc] p-1.5 flex flex-col items-center justify-between shrink-0">
                    <div className="w-full flex justify-end gap-1.5 text-slate-400">
                      <UpOutlined
                        className="cursor-pointer hover:text-slate-700 text-[10px]"
                        title="Ảnh trước"
                      />
                      <DownOutlined
                        className="cursor-pointer hover:text-slate-700 text-[10px]"
                        title="Ảnh sau"
                      />
                      <CloseOutlined
                        onClick={() => setAvatarUrl(null)}
                        className="cursor-pointer hover:text-red-500 text-[10px]"
                        title="Xóa ảnh"
                      />
                    </div>

                    <div className="my-1.5 flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-24 h-28 object-cover border border-slate-300 bg-white shadow-2xs"
                        />
                      ) : (
                        <div className="w-24 h-28 border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
                          <UserOutlined className="text-2xl mb-1 text-slate-300" />
                          <span className="text-[10px] text-slate-400">Chưa có ảnh</span>
                        </div>
                      )}
                    </div>

                    <Upload
                      showUploadList={false}
                      beforeUpload={(file) => {
                        const url = URL.createObjectURL(file)
                        setAvatarUrl(url)
                        return false
                      }}
                    >
                      <button
                        type="button"
                        className="text-[10px] bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-none text-slate-700 flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                      >
                        <CameraOutlined className="text-slate-500" /> Chọn ảnh
                      </button>
                    </Upload>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: KHÓA DỮ LIỆU RIÊNG CHO NGƯỜI SỬ DỤNG */}
              <div className="border-b border-slate-300 bg-white">
                <div className="bg-[#0284c7] text-white px-2.5 py-1 text-[11px] font-bold border-b border-[#0369a1] flex items-center justify-between">
                  <span>Khóa dữ liệu riêng cho người sử dụng</span>
                </div>

                <div className="p-2 flex flex-col gap-1.5">
                  {/* b. Khóa dữ liệu theo người dùng */}
                  <div className="flex items-center text-xs">
                    <label className="w-52 text-slate-700 font-medium">
                      b. Khóa dữ liệu theo người dùng
                    </label>
                    <Form.Item name="IsDataLock" valuePropName="checked" noStyle>
                      <Checkbox />
                    </Form.Item>
                  </div>

                  {/* c. Ngày khóa dữ liệu */}
                  <div className="flex items-center text-xs">
                    <label className="w-52 text-slate-700 font-medium">c. Ngày khóa dữ liệu</label>
                    <Form.Item name="DataLockDate" noStyle>
                      <DatePicker
                        className="w-48 h-6 text-xs rounded-none border-slate-300"
                        format="DD/MM/YY"
                        placeholder="DD/MM/YY"
                      />
                    </Form.Item>
                  </div>

                  {/* d. Được phép thêm dòng trên phiếu chuyển mã */}
                  <div className="flex items-center text-xs">
                    <label className="w-52 text-slate-700 font-medium">
                      d. Được phép thêm dòng trên phiếu chuyển mã
                    </label>
                    <Form.Item name="AllowAddTransferRow" valuePropName="checked" noStyle>
                      <Checkbox />
                    </Form.Item>
                  </div>
                </div>
              </div>

              {/* KHỐI 3: MẬT KHẨU TRUY CẬP */}
              <div className="border-b border-slate-300 bg-white">
                <div className="bg-[#0284c7] text-white px-2.5 py-1 text-[11px] font-bold border-b border-[#0369a1] flex items-center justify-between">
                  <span>Mật khẩu truy cập</span>
                </div>

                <div className="p-2 flex flex-col gap-1.5">
                  {/* e. Mật khẩu cũ */}
                  <div className="flex items-center text-xs">
                    <label className="w-52 text-slate-700 font-medium">e. Mật khẩu cũ</label>
                    <Input.Password
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-64 h-6 text-xs rounded-none border-slate-300"
                    />
                  </div>

                  {/* f. Mật khẩu mới */}
                  <div className="flex items-center text-xs">
                    <label className="w-52 text-slate-700 font-medium">f. Mật khẩu mới</label>
                    <Input.Password
                      placeholder="Nhập mật khẩu mới"
                      className="w-64 h-6 text-xs rounded-none border-slate-300"
                    />
                  </div>

                  {/* g. Gõ lại mật khẩu mới */}
                  <div className="flex items-center text-xs">
                    <label className="w-52 text-slate-700 font-medium">
                      g. Gõ lại mật khẩu mới
                    </label>
                    <Input.Password
                      placeholder="Xác nhận lại mật khẩu mới"
                      className="w-64 h-6 text-xs rounded-none border-slate-300"
                    />
                  </div>

                  <div className="flex items-center text-xs mt-0.5">
                    <label className="w-52 text-slate-700 font-medium">Yêu cầu đổi mật khẩu</label>
                    <Form.Item name="CheckPass1" valuePropName="checked" noStyle>
                      <Checkbox>Bắt buộc đổi mật khẩu khi đăng nhập lần đầu</Checkbox>
                    </Form.Item>
                  </div>
                </div>
              </div>
            </Form>
          ) : (
            /* TAB PHÂN QUYỀN VAI TRÒ */
            <div className="flex-1 flex flex-col bg-white h-full">
              <div className="bg-[#0284c7] text-white px-2.5 py-1 text-[11px] font-bold border-b border-[#0369a1] flex items-center justify-between">
                <span>
                  {activeRoleTab === 'userRole'
                    ? 'Phân quyền vai trò người dùng'
                    : activeRoleTab === 'specialRole'
                      ? 'Vai trò người dùng đặc biệt'
                      : 'Vai trò duyệt chứng từ'}
                </span>
              </div>

              {/* Table Data Sheet View */}
              <div className="p-2 flex-1 overflow-y-auto">
                <Table
                  dataSource={getCurrentRoleData()}
                  columns={roleColumns}
                  pagination={false}
                  size="small"
                  rowKey="key"
                  className="role-dense-table border-collapse"
                  bordered
                />
              </div>

              {/* Sub-tabs điều hướng danh mục vai trò bên dưới */}
              <div className="flex items-center border-t border-slate-300 bg-[#e4e9ee] px-2 py-1 gap-1 text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('userRole')}
                  className={`px-2 py-0.5 border cursor-pointer rounded-xs transition-all ${
                    activeRoleTab === 'userRole'
                      ? 'bg-white border-slate-400 font-bold text-blue-900 shadow-2xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vai trò người dùng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('specialRole')}
                  className={`px-2 py-0.5 border cursor-pointer rounded-xs transition-all ${
                    activeRoleTab === 'specialRole'
                      ? 'bg-white border-slate-400 font-bold text-blue-900 shadow-2xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vai trò đặc biệt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoleTab('approvalRole')}
                  className={`px-2 py-0.5 border cursor-pointer rounded-xs transition-all ${
                    activeRoleTab === 'approvalRole'
                      ? 'bg-white border-slate-400 font-bold text-blue-900 shadow-2xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vai trò duyệt chứng từ
                </button>
              </div>
            </div>
          )}{' '}
        </div>
      </div>
    </div>
  )
}
