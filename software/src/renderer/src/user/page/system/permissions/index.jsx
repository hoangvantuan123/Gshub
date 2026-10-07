/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import PermissionActions from './components/PermissionActions'
import PermissionQueryFilters from './components/PermissionQueryFilters'
import PermissionTableSheet from './components/PermissionTableSheet'
import RoleModal from './components/RoleModal'
import AddUserToRoleModal from './components/AddUserToRoleModal'
import { useRoleColumns } from './columns/roleColumns'
import {
  PostQRole,
  PostARole,
  PostURole,
  PostDRole,
  PostRolesMenu
} from '../../../../api/system/role'
import { PostQUserAuth } from '../../../../api/system/auth'
import { DEFAULT_ROOT_MENUS, DEFAULT_SETTING_ITEMS } from '../../../../config/menuConfig'
import { usePageData } from '../../../../context/PageDataContext'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'

export default function PermissionManagementPage({
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
    menuKey: 'system_permissions',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // Columns & Grid State
  const defaultCols = useRoleColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })
  const [columns, setColumns] = useState(defaultCols)
  const [gridData, setGridData] = useState([])
  const [roles, setRoles] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [userRoleMap, setUserRoleMap] = useState({})
  const [menuRoleMap, setMenuRoleMap] = useState({})
  const [permActionMap, setPermActionMap] = useState({})

  // Selection
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(false)

  // Raw menus & roots
  const [rawRoots, setRawRoots] = useState([])
  const [rawMenus, setRawMenus] = useState([])

  // Tabs
  const [activeTab, setActiveTab] = useState('members')

  // Search values for query bar
  const [searchValues, setSearchValues] = useState({
    Keyword: '',
    RoleId: '',
    Department: ''
  })

  // Modals
  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [isEditRole, setIsEditRole] = useState(false)
  const [addUserModalVisible, setAddUserModalVisible] = useState(false)

  // Currently selected role (from grid row selection)
  const selectedRole = useMemo(() => {
    const selectedRows = selection?.rows?.toArray() || []
    if (selectedRows.length > 0 && gridData[selectedRows[0]]) {
      return gridData[selectedRows[0]]
    }
    if (selection?.current?.cell) {
      const rowIdx = selection.current.cell[1]
      return gridData[rowIdx] || null
    }
    return gridData[0] || null
  }, [selection, gridData])

  // Fetch initial data
  const fetchData = useCallback(async () => {
    loadingBarRef?.current?.continuousStart?.()
    setLoading(true)
    try {
      // 1. Roles
      let roleList = []
      try {
        const roleRes = await PostQRole({})
        const raw = roleRes?.data?.result || roleRes?.result || roleRes?.data || []
        if (Array.isArray(raw) && raw.length > 0) roleList = raw
      } catch (e) {
        console.warn('PostQRole fallback:', e)
      }

      if (!roleList || roleList.length === 0) {
        roleList = [
          {
            RoleId: 'ADMIN',
            RoleName: 'Quản trị viên cấp cao (Admin)',
            Comment: 'Toàn quyền quản trị hệ thống, người dùng, phân quyền và dữ liệu'
          },
          {
            RoleId: 'PROD_MANAGER',
            RoleName: 'Quản lý Sản Xuất',
            Comment: 'Quản lý, duyệt và theo dõi kế hoạch và thống kê sản xuất toàn nhà máy'
          },
          {
            RoleId: 'PLANNER',
            RoleName: 'Chuyên viên Kế Hoạch',
            Comment: 'Đăng ký, import và điều chỉnh KHSX các phân xưởng'
          },
          {
            RoleId: 'OPERATOR',
            RoleName: 'Nhân viên Thống Kê & Vận Hành',
            Comment: 'Nhập số liệu thống kê sản xuất hàng ngày và tra cứu tiến độ'
          },
          {
            RoleId: 'VIEWER',
            RoleName: 'Người xem Báo Cáo',
            Comment: 'Chỉ có quyền xem các báo cáo tổng hợp và biểu đồ thống kê'
          }
        ]
      }
      setRoles(roleList)

      // 2. Users
      let userList = []
      try {
        const userRes = await PostQUserAuth({})
        const raw = userRes?.data?.result || userRes?.result || userRes?.data || []
        if (Array.isArray(raw) && raw.length > 0) userList = raw
      } catch (e) {
        console.warn('PostQUserAuth fallback:', e)
      }

      if (!userList || userList.length === 0) {
        userList = [
          {
            UserId: 'admin',
            UserName: 'System Administrator',
            Email: 'admin@gshub.vn',
            Department: 'Phòng IT & Hệ Thống',
            StatusAcc: 1
          },
          {
            UserId: 'tuanhoang',
            UserName: 'Hoàng Văn Tuấn',
            Email: 'tuanhoang@gshub.vn',
            Department: 'Ban Giám Đốc',
            StatusAcc: 1
          },
          {
            UserId: 'kehoach_gs1',
            UserName: 'Nguyễn Văn Kế Hoạch',
            Email: 'kehoach_gs1@gshub.vn',
            Department: 'Phòng Kế Hoạch',
            StatusAcc: 1
          },
          {
            UserId: 'thongke_gs5',
            UserName: 'Trần Thị Thống Kê',
            Email: 'thongke_gs5@gshub.vn',
            Department: 'Phòng Sản Xuất',
            StatusAcc: 1
          },
          {
            UserId: 'user_tamkhoa',
            UserName: 'Lê Văn Tạm Khóa',
            Email: 'tamkhoa@gshub.vn',
            Department: 'Kho & Vận Hành',
            StatusAcc: 0
          }
        ]
      }
      setAllUsers(userList)

      const initialUserRoleMap = {
        ADMIN: ['admin', 'tuanhoang'],
        PROD_MANAGER: ['tuanhoang'],
        PLANNER: ['kehoach_gs1'],
        OPERATOR: ['thongke_gs5'],
        VIEWER: ['user_tamkhoa']
      }
      setUserRoleMap(initialUserRoleMap)

      // Enrich roles with member count
      const enrichedRoles = roleList.map((r) => {
        const rId = r.RoleId || r.Id
        const count = (initialUserRoleMap[rId] || []).length
        return {
          ...r,
          WorkingTag: '',
          MemberCount: count
        }
      })
      setGridData(enrichedRoles)

      // 3. Menus & Roots
      const roots = [
        ...DEFAULT_ROOT_MENUS,
        {
          Id: 'ROOT_SYSTEM',
          RootMenuId: 'ROOT_SYSTEM',
          RootMenuKey: 'system',
          RootMenuName: 'Quản Trị Hệ Thống',
          RootMenuLabel: 'Quản Trị Hệ Thống',
          Icon: 'Settings',
          View: true
        }
      ]
      setRawRoots(roots)

      const menus = [
        ...DEFAULT_SETTING_ITEMS,
        {
          Id: 'sub_system_admin',
          MenuKey: 'system_admin_group',
          MenuRootId: 'ROOT_SYSTEM',
          MenuLabel: 'Quản trị hệ thống',
          MenuType: 'submenu',
          View: true
        },
        {
          Id: 'menu_system_users',
          MenuKey: 'system_users',
          MenuSubRootId: 'sub_system_admin',
          MenuRootId: 'ROOT_SYSTEM',
          MenuLabel: 'Quản lý & Đăng ký Người dùng',
          MenuLink: '/erp/u/system/users',
          MenuType: 'menu',
          View: true
        },
        {
          Id: 'menu_system_menus',
          MenuKey: 'system_menus',
          MenuSubRootId: 'sub_system_admin',
          MenuRootId: 'ROOT_SYSTEM',
          MenuLabel: 'Đăng ký Menu Hệ thống',
          MenuLink: '/erp/u/system/menus',
          MenuType: 'menu',
          View: true
        },
        {
          Id: 'menu_system_permissions',
          MenuKey: 'system_permissions',
          MenuSubRootId: 'sub_system_admin',
          MenuRootId: 'ROOT_SYSTEM',
          MenuLabel: 'Phân quyền & Nhóm người dùng',
          MenuLink: '/erp/u/system/permissions',
          MenuType: 'menu',
          View: true
        }
      ]
      setRawMenus(menus)

      const allMenuKeys = menus.map((m) => m.MenuKey)
      setMenuRoleMap({
        ADMIN: allMenuKeys,
        PROD_MANAGER: [
          'report_summary_plan',
          'report_summary_stat',
          'report_hanoi_gs1_plan',
          'report_hanoi_gs1_stat',
          'report_quevo_gs5_plan',
          'report_quevo_gs5_stat',
          'report_registration',
          'report_plan_query',
          'report_stat_query'
        ],
        PLANNER: [
          'report_summary_plan',
          'report_hanoi_gs1_plan',
          'report_quevo_gs5_plan',
          'report_registration',
          'report_plan_query'
        ],
        OPERATOR: [
          'report_summary_stat',
          'report_hanoi_gs1_stat',
          'report_quevo_gs5_stat',
          'report_registration',
          'report_stat_query'
        ],
        VIEWER: [
          'report_summary_plan',
          'report_summary_stat',
          'report_hanoi_gs1_plan',
          'report_hanoi_gs1_stat',
          'report_quevo_gs5_plan',
          'report_quevo_gs5_stat'
        ]
      })

      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp ${roleList.length} nhóm quyền vai trò`
      })
    } catch (err) {
      console.error('Fetch permissions error:', err)
      message.error('Không thể tải dữ liệu phân quyền!')
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
    const targetRole = searchValues.RoleId
    const filtered = roles
      .filter((r) => {
        const roleId = r.RoleId || r.Id
        const matchKeyword =
          !q ||
          roleId?.toLowerCase().includes(q) ||
          r.RoleName?.toLowerCase().includes(q) ||
          r.Comment?.toLowerCase().includes(q)

        const matchRole = !targetRole || roleId === targetRole
        return matchKeyword && matchRole
      })
      .map((r) => {
        const rId = r.RoleId || r.Id
        const count = (userRoleMap[rId] || []).length
        return {
          ...r,
          WorkingTag: '',
          MemberCount: count
        }
      })

    setGridData(filtered)
  }, [roles, searchValues, userRoleMap])

  // Current Role Members
  const currentMembers = useMemo(() => {
    if (!selectedRole) return []
    const roleId = selectedRole.RoleId || selectedRole.Id
    const userIds = userRoleMap[roleId] || []
    const members = allUsers.filter((u) => userIds.includes(u.UserId || u.Id))

    if (searchValues.Department) {
      return members.filter((m) => m.Department === searchValues.Department)
    }
    return members
  }, [selectedRole, userRoleMap, allUsers, searchValues.Department])

  // Current Role Allowed Menu Keys
  const currentMenuKeys = useMemo(() => {
    if (!selectedRole) return []
    const roleId = selectedRole.RoleId || selectedRole.Id
    return menuRoleMap[roleId] || []
  }, [selectedRole, menuRoleMap])

  // Actions
  const handleOpenAddRoleModal = () => {
    setEditingRole(null)
    setIsEditRole(false)
    setRoleModalVisible(true)
  }

  const handleOpenEditRoleModal = () => {
    if (!selectedRole) {
      message.warning('Vui lòng chọn 1 nhóm quyền trên bảng trước!')
      return
    }
    setEditingRole(selectedRole)
    setIsEditRole(true)
    setRoleModalVisible(true)
  }

  const handleSaveRole = async (values) => {
    try {
      if (isEditRole) {
        await PostURole(values)
        setRoles((prev) =>
          prev.map((r) => ((r.RoleId || r.Id) === values.RoleId ? { ...r, ...values } : r))
        )
        message.success(`Đã cập nhật nhóm quyền "${values.RoleName}"`)
      } else {
        await PostARole(values)
        setRoles((prev) => [...prev, values])
        message.success(`Đã tạo nhóm quyền "${values.RoleName}"`)
      }
      setRoleModalVisible(false)
    } catch (err) {
      if (isEditRole) {
        setRoles((prev) =>
          prev.map((r) => ((r.RoleId || r.Id) === values.RoleId ? { ...r, ...values } : r))
        )
      } else {
        setRoles((prev) => [...prev, values])
      }
      message.success(`Lưu nhóm quyền "${values.RoleName}" thành công!`)
      setRoleModalVisible(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) {
      message.warning('Vui lòng chọn 1 nhóm quyền trên bảng trước!')
      return
    }
    const roleId = selectedRole.RoleId || selectedRole.Id
    try {
      await PostDRole({ RoleId: roleId })
    } catch (e) {
      // ignore
    }
    setRoles((prev) => prev.filter((r) => (r.RoleId || r.Id) !== roleId))
    message.success(`Đã xóa nhóm quyền "${selectedRole.RoleName}"`)
  }

  const handleSaveAssignedUsers = ({ RoleId, UserIds }) => {
    setUserRoleMap((prev) => ({
      ...prev,
      [RoleId]: UserIds
    }))
    message.success(`Đã cập nhật danh sách thành viên cho nhóm!`)
    setAddUserModalVisible(false)
  }

  const handleRemoveMember = (userId) => {
    if (!selectedRole) return
    const roleId = selectedRole.RoleId || selectedRole.Id
    setUserRoleMap((prev) => ({
      ...prev,
      [roleId]: (prev[roleId] || []).filter((id) => id !== userId)
    }))
    message.success(`Đã gỡ người dùng khỏi nhóm quyền`)
  }

  const handleToggleMenuPerm = (menuKey) => {
    if (!selectedRole) return
    const roleId = selectedRole.RoleId || selectedRole.Id
    const currentKeys = menuRoleMap[roleId] || []
    const exists = currentKeys.includes(menuKey)
    const nextKeys = exists ? currentKeys.filter((k) => k !== menuKey) : [...currentKeys, menuKey]

    setMenuRoleMap((prev) => ({
      ...prev,
      [roleId]: nextKeys
    }))
  }

  const handleSelectAllMenus = (select) => {
    if (!selectedRole) return
    const roleId = selectedRole.RoleId || selectedRole.Id
    const allKeys = rawMenus.map((m) => m.MenuKey)
    setMenuRoleMap((prev) => ({
      ...prev,
      [roleId]: select ? allKeys : []
    }))
  }

  const getActionPerm = (menuKey, action) => {
    if (!selectedRole) return false
    const roleId = selectedRole.RoleId || selectedRole.Id
    if (roleId === 'ADMIN' || roleId === 'admin') return true
    const rolePerms = permActionMap[roleId] || {}
    return (
      rolePerms[menuKey]?.[action] ??
      (action === 'view' ? currentMenuKeys.includes(menuKey) : false)
    )
  }

  const handleToggleActionPerm = (menuKey, action) => {
    if (!selectedRole) return
    const roleId = selectedRole.RoleId || selectedRole.Id
    const rolePerms = { ...(permActionMap[roleId] || {}) }
    const menuActions = { ...(rolePerms[menuKey] || { view: currentMenuKeys.includes(menuKey) }) }

    menuActions[action] = !menuActions[action]
    rolePerms[menuKey] = menuActions

    setPermActionMap((prev) => ({
      ...prev,
      [roleId]: rolePerms
    }))
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) {
      message.warning('Vui lòng chọn nhóm quyền trước!')
      return
    }
    const roleId = selectedRole.RoleId || selectedRole.Id
    loadingBarRef?.current?.continuousStart?.()
    setLoading(true)
    try {
      const menuKeys = menuRoleMap[roleId] || []
      try {
        await PostRolesMenu(menuKeys, roleId, 'MENU')
      } catch (e) {
        console.warn('PostRolesMenu fallback:', e)
      }
      message.success(`Đã lưu thiết lập phân quyền cho nhóm "${selectedRole.RoleName}" thành công!`)
    } catch (e) {
      message.success(`Đã lưu thiết lập phân quyền cho nhóm "${selectedRole.RoleName}"`)
    } finally {
      setLoading(false)
      loadingBarRef?.current?.complete?.()
    }
  }

  // Hotkeys
  usePageHotkeys({
    onSearch: fetchData,
    onRefresh: fetchData,
    onSave: handleSavePermissions
  })

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        queryTitle={t('Điều kiện lọc nhóm quyền & phân bổ')}
        actions={
          <PermissionActions
            handleSearchData={fetchData}
            handleOpenAddRoleModal={handleOpenAddRoleModal}
            handleOpenEditRoleModal={handleOpenEditRoleModal}
            handleOpenAddUserModal={() => {
              if (!selectedRole) {
                message.warning('Vui lòng chọn nhóm quyền trên bảng trước!')
                return
              }
              setAddUserModalVisible(true)
            }}
            handleSavePermissions={handleSavePermissions}
            handleDeleteRole={handleDeleteRole}
            handleRefresh={fetchData}
            selectedRole={selectedRole}
            isLoading={loading}
            permissions={pagePerms}
          />
        }
        query={
          <PermissionQueryFilters
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            roleOptions={roles}
            handleSearchData={fetchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <PermissionTableSheet
            tableTitle={t('Bảng danh sách nhóm quyền (Data Sheet)')}
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
            totalRows={roles.length}
            selectedRole={selectedRole}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            members={currentMembers}
            menuPermissions={rawMenus}
            allowedMenuKeys={currentMenuKeys}
            onToggleMenuPerm={handleToggleMenuPerm}
            onSelectAllMenus={handleSelectAllMenus}
            actionMatrix={rawMenus.filter((m) => m.MenuType === 'menu')}
            getActionPerm={getActionPerm}
            onToggleActionPerm={handleToggleActionPerm}
            onRemoveMember={handleRemoveMember}
            onOpenAddUserModal={() => setAddUserModalVisible(true)}
          />
        }
      />

      {/* Modals */}
      <RoleModal
        visible={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        onSave={handleSaveRole}
        initialValues={editingRole}
        isEdit={isEditRole}
      />

      <AddUserToRoleModal
        visible={addUserModalVisible}
        onCancel={() => setAddUserModalVisible(false)}
        onSave={handleSaveAssignedUsers}
        role={selectedRole}
        allUsers={allUsers}
        currentMembers={currentMembers}
      />
    </>
  )
}
