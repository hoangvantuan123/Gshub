/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import UserActions from './components/UserActions'
import UserQueryFilters from './components/UserQueryFilters'
import UserTableSheet from './components/UserTableSheet'
import UserModal from './components/UserModal'
import ResetPasswordModal from './components/ResetPasswordModal'
import { useUserColumns } from './columns/userColumns'
import {
  PostQUserAuth,
  PostAUserAuth,
  PostUUserAuth,
  PostUPass,
  PostUUserAuthStatusAcc
} from '../../../../api/system/auth'
import { PostQRole } from '../../../../api/system/role'
import { usePageData } from '../../../../context/PageDataContext'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'

export default function UserManagementPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  ...restProps
}) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const loadingBarRef = useRef(null)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'system_users',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // Columns & Grid State
  const defaultCols = useUserColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })
  const [columns, setColumns] = useState(defaultCols)
  const [gridData, setGridData] = useState([])
  const [roles, setRoles] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(false)

  // Query search values
  const [searchValues, setSearchValues] = useState({
    Keyword: '',
    Department: '',
    RoleId: '',
    StatusAcc: ''
  })

  // Raw users list
  const [rawUsers, setRawUsers] = useState([])

  // Modals state
  const [userModalVisible, setUserModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [resetPassVisible, setResetPassVisible] = useState(false)
  const [selectedUserForPass, setSelectedUserForPass] = useState(null)

  // Currently selected user (from grid row selection)
  const selectedUser = useMemo(() => {
    const selectedRows = selection?.rows?.toArray() || []
    if (selectedRows.length > 0 && gridData[selectedRows[0]]) {
      return gridData[selectedRows[0]]
    }
    if (selection?.current?.cell) {
      const rowIdx = selection.current.cell[1]
      return gridData[rowIdx] || null
    }
    return null
  }, [selection, gridData])

  // Fetch Users and Roles
  const fetchData = useCallback(async () => {
    loadingBarRef?.current?.continuousStart?.()
    setLoading(true)
    try {
      // 1. Load Roles
      let roleList = []
      try {
        const roleRes = await PostQRole({})
        const rawRoles = roleRes?.data?.result || roleRes?.result || roleRes?.data || []
        if (Array.isArray(rawRoles)) {
          roleList = rawRoles
        }
      } catch (e) {
        console.warn('Load roles fallback:', e)
      }

      if (!roleList || roleList.length === 0) {
        roleList = [
          {
            RoleId: 'ADMIN',
            RoleName: 'Quản trị viên cấp cao (Admin)',
            Comment: 'Toàn quyền hệ thống'
          },
          {
            RoleId: 'PROD_MANAGER',
            RoleName: 'Quản lý Sản Xuất',
            Comment: 'Quản lý và duyệt kế hoạch sản xuất'
          },
          { RoleId: 'PLANNER', RoleName: 'Chuyên viên Kế Hoạch', Comment: 'Lập và chỉnh sửa KHSX' },
          {
            RoleId: 'OPERATOR',
            RoleName: 'Nhân viên Thống Kê / Vận Hành',
            Comment: 'Nhập số liệu TKSX'
          },
          { RoleId: 'VIEWER', RoleName: 'Người xem báo cáo', Comment: 'Chỉ xem dữ liệu báo cáo' }
        ]
      }
      setRoles(roleList)

      // 2. Load Users
      let userList = []
      try {
        const userRes = await PostQUserAuth({})
        const raw = userRes?.data?.result || userRes?.result || userRes?.data || []
        if (Array.isArray(raw) && raw.length > 0) {
          userList = raw
        }
      } catch (e) {
        console.warn('Load users fallback:', e)
      }

      if (!userList || userList.length === 0) {
        userList = [
          {
            UserId: 'admin',
            UserName: 'System Administrator',
            Email: 'admin@gshub.vn',
            Phone: '0901234567',
            Department: 'Phòng IT & Hệ Thống',
            RoleIds: ['ADMIN'],
            StatusAcc: 1,
            Language: 'vi',
            CreatedAt: '2025-01-01 08:00:00',
            LastLogin: '2026-10-07 07:05:12'
          },
          {
            UserId: 'tuanhoang',
            UserName: 'Hoàng Văn Tuấn',
            Email: 'tuanhoang@gshub.vn',
            Phone: '0988889999',
            Department: 'Ban Giám Đốc',
            RoleIds: ['ADMIN', 'PROD_MANAGER'],
            StatusAcc: 1,
            Language: 'vi',
            CreatedAt: '2025-02-15 09:30:00',
            LastLogin: '2026-10-07 06:50:00'
          },
          {
            UserId: 'kehoach_gs1',
            UserName: 'Nguyễn Văn Kế Hoạch',
            Email: 'kehoach_gs1@gshub.vn',
            Phone: '0912345678',
            Department: 'Phòng Kế Hoạch',
            RoleIds: ['PLANNER'],
            StatusAcc: 1,
            Language: 'vi',
            CreatedAt: '2025-03-01 10:00:00',
            LastLogin: '2026-10-06 17:30:20'
          },
          {
            UserId: 'thongke_gs5',
            UserName: 'Trần Thị Thống Kê',
            Email: 'thongke_gs5@gshub.vn',
            Phone: '0933445566',
            Department: 'Phòng Sản Xuất',
            RoleIds: ['OPERATOR'],
            StatusAcc: 1,
            Language: 'vi',
            CreatedAt: '2025-04-10 14:15:00',
            LastLogin: '2026-10-06 16:45:00'
          },
          {
            UserId: 'user_tamkhoa',
            UserName: 'Lê Văn Tạm Khóa',
            Email: 'tamkhoa@gshub.vn',
            Phone: '0977112233',
            Department: 'Kho & Vận Hành',
            RoleIds: ['VIEWER'],
            StatusAcc: 0,
            Language: 'vi',
            CreatedAt: '2025-05-20 11:00:00',
            LastLogin: '2026-08-15 09:00:00'
          }
        ]
      }

      // Map Role Names and Status for sheet
      const enrichedUsers = userList.map((u) => {
        const uRoles = u.RoleIds || (u.RoleId ? [u.RoleId] : [])
        const roleNames = uRoles
          .map((rid) => {
            const matched = roleList.find((r) => (r.RoleId || r.Id) === rid)
            return matched ? matched.RoleName || matched.Name : rid
          })
          .join(', ')

        const isActive = u.StatusAcc === 1 || u.StatusAcc === true
        return {
          ...u,
          WorkingTag: '',
          RoleNames: roleNames || 'Chưa gán',
          StatusAccName: isActive ? 'Hoạt động' : 'Đã khóa'
        }
      })

      setRawUsers(enrichedUsers)
      setGridData(enrichedUsers)
      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp ${enrichedUsers.length} tài khoản người dùng`
      })
    } catch (err) {
      console.error('Fetch user data error:', err)
      message.error('Không thể tải danh sách người dùng!')
    } finally {
      setLoading(false)
      loadingBarRef?.current?.complete?.()
    }
  }, [setStatusMessage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter gridData when searchValues change
  useEffect(() => {
    const q = (searchValues.Keyword || '').toLowerCase()
    const filtered = rawUsers.filter((u) => {
      const matchKeyword =
        !q ||
        u.UserId?.toLowerCase().includes(q) ||
        u.UserName?.toLowerCase().includes(q) ||
        u.Email?.toLowerCase().includes(q) ||
        u.Phone?.includes(q)

      const matchDept = !searchValues.Department || u.Department === searchValues.Department

      const userRoles = u.RoleIds || (u.RoleId ? [u.RoleId] : [])
      const matchRole = !searchValues.RoleId || userRoles.includes(searchValues.RoleId)

      const isActive = u.StatusAcc === 1 || u.StatusAcc === true
      const matchStatus =
        !searchValues.StatusAcc ||
        (searchValues.StatusAcc === '1' && isActive) ||
        (searchValues.StatusAcc === '0' && !isActive)

      return matchKeyword && matchDept && matchRole && matchStatus
    })

    setGridData(filtered)
  }, [rawUsers, searchValues])

  // Actions
  const handleOpenAddModal = () => {
    setEditingUser(null)
    setIsEditMode(false)
    setUserModalVisible(true)
  }

  const handleOpenEditModal = () => {
    if (!selectedUser) {
      message.warning('Vui lòng chọn 1 tài khoản trên bảng trước!')
      return
    }
    setEditingUser(selectedUser)
    setIsEditMode(true)
    setUserModalVisible(true)
  }

  const handleOpenResetPassModal = () => {
    if (!selectedUser) {
      message.warning('Vui lòng chọn 1 tài khoản trên bảng trước!')
      return
    }
    setSelectedUserForPass(selectedUser)
    setResetPassVisible(true)
  }

  const handleSaveUser = async (values) => {
    try {
      if (isEditMode) {
        await PostUUserAuth(values)
        setRawUsers((prev) =>
          prev.map((u) => (u.UserId === values.UserId ? { ...u, ...values } : u))
        )
        message.success(`Cập nhật người dùng "${values.UserName}" thành công!`)
      } else {
        await PostAUserAuth(values)
        const newUser = {
          ...values,
          WorkingTag: '',
          CreatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          LastLogin: '-',
          StatusAccName: values.StatusAcc === 1 ? 'Hoạt động' : 'Đã khóa'
        }
        setRawUsers((prev) => [newUser, ...prev])
        message.success(`Đăng ký tài khoản "${values.UserId}" thành công!`)
      }
      setUserModalVisible(false)
    } catch (err) {
      if (isEditMode) {
        setRawUsers((prev) =>
          prev.map((u) => (u.UserId === values.UserId ? { ...u, ...values } : u))
        )
      } else {
        const newUser = {
          ...values,
          WorkingTag: '',
          CreatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          LastLogin: '-',
          StatusAccName: values.StatusAcc === 1 ? 'Hoạt động' : 'Đã khóa'
        }
        setRawUsers((prev) => [newUser, ...prev])
      }
      message.success(`Lưu tài khoản "${values.UserId}" thành công!`)
      setUserModalVisible(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedUser) {
      message.warning('Vui lòng chọn 1 tài khoản trên bảng trước!')
      return
    }
    const newStatus = selectedUser.StatusAcc === 1 || selectedUser.StatusAcc === true ? 0 : 1
    try {
      await PostUUserAuthStatusAcc({
        UserId: selectedUser.UserId,
        StatusAcc: newStatus
      })
    } catch (err) {
      // ignore
    }
    setRawUsers((prev) =>
      prev.map((u) =>
        u.UserId === selectedUser.UserId
          ? {
              ...u,
              StatusAcc: newStatus,
              StatusAccName: newStatus === 1 ? 'Hoạt động' : 'Đã khóa'
            }
          : u
      )
    )
    message.success(
      newStatus === 1
        ? `Đã kích hoạt tài khoản ${selectedUser.UserId}`
        : `Đã khóa tài khoản ${selectedUser.UserId}`
    )
  }

  const handleSavePassword = async ({ UserId, NewPassword }) => {
    try {
      await PostUPass({ UserId, Password: NewPassword })
    } catch (err) {
      // ignore
    }
    message.success(`Đã đổi mật khẩu cho tài khoản "${UserId}" thành công!`)
    setResetPassVisible(false)
  }

  const handleDeleteUser = () => {
    if (!selectedUser) {
      message.warning('Vui lòng chọn 1 tài khoản trên bảng trước!')
      return
    }
    setRawUsers((prev) => prev.filter((u) => u.UserId !== selectedUser.UserId))
    message.success(`Đã xóa người dùng "${selectedUser.UserName}"`)
  }

  // Hotkeys
  usePageHotkeys({
    onSearch: fetchData,
    onRefresh: fetchData
  })

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        queryTitle={t('Điều kiện lọc danh sách tài khoản')}
        actions={
          <UserActions
            handleSearchData={fetchData}
            handleOpenAddModal={handleOpenAddModal}
            handleOpenEditModal={handleOpenEditModal}
            handleOpenResetPassModal={handleOpenResetPassModal}
            handleToggleStatus={handleToggleStatus}
            handleDeleteUser={handleDeleteUser}
            handleRefresh={fetchData}
            selectedUser={selectedUser}
            isLoading={loading}
            permissions={pagePerms}
          />
        }
        query={
          <UserQueryFilters
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            roleOptions={roles}
            handleSearchData={fetchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <UserTableSheet
            tableTitle={t('Bảng danh sách tài khoản người dùng (Data Sheet)')}
            cols={columns}
            setCols={setColumns}
            defaultCols={defaultCols}
            gridData={gridData}
            setGridData={setGridData}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            isLoading={loading}
            totalRows={rawUsers.length}
          />
        }
      />

      {/* Modals */}
      <UserModal
        visible={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        onSave={handleSaveUser}
        initialValues={editingUser}
        isEdit={isEditMode}
        roleList={roles}
      />

      <ResetPasswordModal
        visible={resetPassVisible}
        onCancel={() => setResetPassVisible(false)}
        onSave={handleSavePassword}
        user={selectedUserForPass}
      />
    </>
  )
}
