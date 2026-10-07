/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import {
  PostQRoleGroup,
  PostQRootMenuRole,
  PostQMenuRole,
  PostQUserRole
} from '../../../../../api/system'
import {
  MOCK_ROLE_GROUPS,
  MOCK_ROOT_MENUS,
  MOCK_MENU_TREE,
  buildMenuTreeFromFlatRows,
  flattenMenuTree,
  getAllGroupIds,
  getRegisteredMenuPermissions
} from '../mock/mockRoleData'

export function useRoleManagementFetch({
  setGroupId,
  setGroupName,
  setComment,
  setCreatedByName,
  setRoleGroups,
  setGridDataA,
  setGridDataB,
  setGridDataCol,
  setGridDataAction,
  setGridDataScope,
  setGridDataUsers,
  setNumRowsA,
  setNumRowsB,
  setNumRowsCol,
  setNumRowsAction,
  setNumRowsScope,
  setNumRowsUsers,
  resetTableA,
  resetTableB,
  resetTableCol,
  resetTableAction,
  resetTableScope,
  resetTableUsers,
  canView = true,
  loadingBarRef,
  setStatusMessage
}) {
  const { t } = useTranslation()

  // 1. Tải danh sách nhóm quyền từ Backend API
  const fetchRoleGroups = useCallback(async () => {
    if (canView === false) return
    loadingBarRef?.current?.continuousStart?.()

    try {
      const res = await PostQRoleGroup({})
      const groups = res?.data?.data || res?.data || []
      const finalGroups = Array.isArray(groups) && groups.length > 0 ? groups : MOCK_ROLE_GROUPS

      setRoleGroups(finalGroups)

      if (finalGroups.length > 0) {
        const first = finalGroups[0]
        setGroupId(String(first.Id || ''))
        setGroupName(first.Name || '')
        setComment(first.Comment || '')
        setCreatedByName(first.CreatedByName || first.CreatedBy || '')
      }

      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: t('system.loadRoleGroupsSuccess', 'Đã tải danh sách nhóm vai trò thành công!')
        })
      }
    } catch (err) {
      const groups = [...MOCK_ROLE_GROUPS]
      setRoleGroups(groups)
      if (groups.length > 0) {
        const first = groups[0]
        setGroupId(String(first.Id || ''))
        setGroupName(first.Name || '')
        setComment(first.Comment || '')
        setCreatedByName(first.CreatedByName || '')
      }
    } finally {
      loadingBarRef?.current?.complete?.()
    }
  }, [
    canView,
    loadingBarRef,
    setComment,
    setCreatedByName,
    setGroupId,
    setGroupName,
    setRoleGroups,
    setStatusMessage,
    t
  ])

  // 2. Tải toàn bộ Phân hệ Root & Danh sách Menu từ Backend API cho nhóm quyền
  const fetchGroupRoles = useCallback(
    async (groupId, selectedRootId) => {
      if (!groupId || canView === false) {
        setGridDataA([])
        setNumRowsA(0)
        setGridDataB([])
        setNumRowsB(0)
        if (setGridDataUsers) {
          const initialBlank = Array.from({ length: 30 }, (_, idx) => ({
            IndexNo: idx + 1,
            WorkingTag: 'A',
            Status: 'A',
            UserId: '',
            UserName: '',
            EmpID: '',
            DeptName: '',
            GroupName: ''
          }))
          setGridDataUsers(initialBlank)
          if (setNumRowsUsers) setNumRowsUsers(30)
        }
        return
      }

      loadingBarRef?.current?.continuousStart?.()

      try {
        // Gọi song song API lấy Root Menus, Menus và Users in Group
        const [resRoot, resMenu, resUsers] = await Promise.all([
          PostQRootMenuRole({ groupId }).catch(() => null),
          PostQMenuRole({ groupId, rootMenuId: selectedRootId || '' }).catch(() => null),
          PostQUserRole({ groupId }).catch(() => null)
        ])

        const rootList = resRoot?.data?.data || resRoot?.data || []
        const menuList = resMenu?.data?.data || resMenu?.data || []
        const userList = resUsers?.data?.data || resUsers?.data || []

        if (setGridDataUsers) {
          const queriedUsers = (Array.isArray(userList) ? userList : []).map((u) => ({
            ...u,
            UserId: u.UserId || '',
            UserName: u.UserName || u.EmpName || u.UserId || '',
            EmpID: u.EmpID || u.EmpCode || '',
            DeptName: u.DeptName || '',
            GroupName: u.GroupName || `ID: ${groupId}`,
            WorkingTag: '',
            Status: ''
          }))

          const blankRows = Array.from({ length: 30 }, () => ({
            WorkingTag: 'A',
            Status: 'A',
            UserId: '',
            UserName: '',
            EmpID: '',
            DeptName: '',
            GroupName: `ID: ${groupId}`
          }))

          const combined = updateIndexNo([...queriedUsers, ...blankRows])
          setGridDataUsers(combined)
          if (setNumRowsUsers) setNumRowsUsers(combined.length)
        }

        let finalA = []
        if (Array.isArray(rootList) && rootList.length > 0) {
          finalA = updateIndexNo(
            rootList.map((m) => {
              const label = m.RootMenuLabel || m.RootMenuName || m.Label || m.Name || ''
              const key = m.RootMenuKey || m.Key || ''
              const id = String(m.RootMenuId || m.Id || '')
              const canView = m.View !== undefined ? Boolean(m.View) : m.CanView !== undefined ? Boolean(m.CanView) : true

              return {
                ...m,
                Id: id,
                RootMenuId: id,
                Key: key,
                RootMenuKey: key,
                Label: label,
                RootMenuName: label,
                RootMenuLabel: label,
                View: canView,
                CanView: canView,
                GroupId: String(groupId),
                Status: ''
              }
            })
          )
        } else {
          finalA = updateIndexNo(
            MOCK_ROOT_MENUS.map((m) => ({
              ...m,
              RootMenuLabel: m.RootMenuLabel || m.RootMenuName || m.Label || '',
              GroupId: groupId,
              Status: ''
            }))
          )
        }

        let finalB = []
        if (Array.isArray(menuList) && menuList.length > 0) {
          const flatRows = menuList.map((m) => {
            const isSub = m.Type === 'submenu' || m.MenuType === 'submenu'
            const id = m.MenuId || m.Id
            const label = m.MenuLabel || m.Label || m.Name || ''
            const key = m.MenuKey || m.Key || ''
            const parentId = isSub ? 0 : (m.MenuSubRootId || m.ParentId || 0)
            const rootMenuId = m.RootMenuId || m.MenuRootId || selectedRootId || 1
            const canView = m.View !== undefined ? Boolean(m.View) : m.CanView !== undefined ? Boolean(m.CanView) : true
            const canCreate = m.Create !== undefined ? Boolean(m.Create) : m.CanCreate !== undefined ? Boolean(m.CanCreate) : true
            const canEdit = m.Edit !== undefined ? Boolean(m.Edit) : m.CanEdit !== undefined ? Boolean(m.CanEdit) : true
            const canDelete = m.Delete !== undefined ? Boolean(m.Delete) : m.CanDelete !== undefined ? Boolean(m.CanDelete) : true
            const canImport = m.Import !== undefined ? Boolean(m.Import) : m.CanImport !== undefined ? Boolean(m.CanImport) : true
            const canExport = m.Export !== undefined ? Boolean(m.Export) : m.CanExport !== undefined ? Boolean(m.CanExport) : true

            return {
              ...m,
              Id: id,
              MenuId: id,
              ParentId: parentId,
              Level: isSub ? 0 : 1,
              RootMenuId: rootMenuId,
              Key: key,
              MenuKey: key,
              Label: label,
              MenuLabel: label,
              RawLabel: label,
              Type: isSub ? 'submenu' : 'menu',
              MenuType: isSub ? 'Submenu' : 'Menu',
              View: canView,
              CanView: canView,
              Create: canCreate,
              CanCreate: canCreate,
              Edit: canEdit,
              CanEdit: canEdit,
              Delete: canDelete,
              CanDelete: canDelete,
              Import: canImport,
              CanImport: canImport,
              Export: canExport,
              CanExport: canExport,
              GroupId: String(groupId),
              Status: ''
            }
          })

          const tree = buildMenuTreeFromFlatRows(flatRows)
          const expandedIds = new Set(getAllGroupIds(tree))
          const targetRoot = selectedRootId || finalA[0]?.RootMenuId || 1
          const groupedData = flattenMenuTree(tree, expandedIds, targetRoot)

          finalB = updateIndexNo(groupedData.length > 0 ? groupedData : flatRows)
        } else {
          const targetRootId = selectedRootId || finalA[0]?.RootMenuId || 1
          const defaultExpandedIds = new Set(getAllGroupIds(MOCK_MENU_TREE))
          const groupedMenus = flattenMenuTree(MOCK_MENU_TREE, defaultExpandedIds, targetRootId)
          finalB = updateIndexNo(
            groupedMenus.map((m) => ({
              ...m,
              GroupId: groupId,
              Status: ''
            }))
          )
        }

        setGridDataA(finalA)
        setNumRowsA(finalA.length)
        setGridDataB(finalB)
        setNumRowsB(finalB.length)

        if (resetTableB) resetTableB()

        // Tự nạp 3 Tabs (Action, Column, Scope) theo dữ liệu của menu đầu tiên
        if (finalB.length > 0) {
          const firstMenu = finalB[0]
          const menuPerms = getRegisteredMenuPermissions(
            firstMenu.MenuId,
            firstMenu.MenuKey || firstMenu.Key,
            firstMenu.MenuLabel || firstMenu.Label
          )

          const finalActions = updateIndexNo(
            menuPerms.actions.map((act) => ({
              ...act,
              MenuId: firstMenu.MenuId,
              MenuName: firstMenu.MenuLabel,
              GroupId: groupId,
              Status: ''
            }))
          )
          const finalCols = updateIndexNo(
            menuPerms.columns.map((col) => ({
              ...col,
              MenuId: firstMenu.MenuId,
              MenuName: firstMenu.MenuLabel,
              GroupId: groupId,
              Status: ''
            }))
          )
          const finalScopes = updateIndexNo(
            menuPerms.scopes.map((scp) => ({
              ...scp,
              MenuId: firstMenu.MenuId,
              MenuName: firstMenu.MenuLabel,
              GroupId: groupId,
              Status: ''
            }))
          )

          setGridDataAction(finalActions)
          setNumRowsAction(finalActions.length)
          setGridDataCol(finalCols)
          setNumRowsCol(finalCols.length)
          if (setGridDataScope) {
            setGridDataScope(finalScopes)
            setNumRowsScope(finalScopes.length)
          }

          if (resetTableAction) resetTableAction()
          if (resetTableCol) resetTableCol()
          if (resetTableScope) resetTableScope()
        }
      } catch (err) {
        console.error('fetchGroupRoles error:', err)
        const fallbackA = updateIndexNo(
          MOCK_ROOT_MENUS.map((m) => ({
            ...m,
            RootMenuLabel: m.RootMenuLabel || m.RootMenuName || m.Label || '',
            GroupId: groupId,
            Status: ''
          }))
        )
        const defaultExpandedIds = new Set(getAllGroupIds(MOCK_MENU_TREE))
        const fallbackB = updateIndexNo(
          flattenMenuTree(MOCK_MENU_TREE, defaultExpandedIds, selectedRootId || 1).map((m) => ({
            ...m,
            GroupId: groupId,
            Status: ''
          }))
        )
        setGridDataA(fallbackA)
        setNumRowsA(fallbackA.length)
        setGridDataB(fallbackB)
        setNumRowsB(fallbackB.length)
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [
      canView,
      loadingBarRef,
      resetTableA,
      resetTableAction,
      resetTableB,
      resetTableCol,
      resetTableScope,
      setGridDataA,
      setGridDataAction,
      setGridDataB,
      setGridDataCol,
      setGridDataScope,
      setNumRowsA,
      setNumRowsAction,
      setNumRowsB,
      setNumRowsCol,
      setNumRowsScope
    ]
  )

  // 3. Tải chi tiết 3 Tabs theo đúng dữ liệu đã đăng ký riêng cho từng Menu
  const fetchMenuViewDetails = useCallback(
    (menuId, groupId, menuName = '', menuKey = '') => {
      if (!menuId || canView === false) {
        setGridDataCol([])
        setNumRowsCol(0)
        setGridDataAction([])
        setNumRowsAction(0)
        if (setGridDataScope) {
          setGridDataScope([])
          setNumRowsScope(0)
        }
        return
      }

      const menuPerms = getRegisteredMenuPermissions(menuId, menuKey, menuName)

      const finalActions = updateIndexNo(
        menuPerms.actions.map((act) => ({
          ...act,
          MenuId: menuId,
          MenuName: menuName || act.MenuName,
          GroupId: groupId,
          Status: ''
        }))
      )

      const finalCols = updateIndexNo(
        menuPerms.columns.map((col) => ({
          ...col,
          MenuId: menuId,
          MenuName: menuName || col.FieldName,
          GroupId: groupId,
          Status: ''
        }))
      )

      const finalScopes = updateIndexNo(
        menuPerms.scopes.map((scp) => ({
          ...scp,
          MenuId: menuId,
          MenuName: menuName || scp.OperationName,
          GroupId: groupId,
          Status: ''
        }))
      )

      setGridDataAction(finalActions)
      setNumRowsAction(finalActions.length)
      setGridDataCol(finalCols)
      setNumRowsCol(finalCols.length)
      if (setGridDataScope) {
        setGridDataScope(finalScopes)
        setNumRowsScope(finalScopes.length)
      }

      if (resetTableAction) resetTableAction()
      if (resetTableCol) resetTableCol()
      if (resetTableScope) resetTableScope()
    },
    [
      canView,
      resetTableAction,
      resetTableCol,
      resetTableScope,
      setGridDataAction,
      setGridDataCol,
      setGridDataScope,
      setNumRowsAction,
      setNumRowsCol,
      setNumRowsScope
    ]
  )

  return {
    fetchRoleGroups,
    fetchGroupRoles,
    fetchMenuViewDetails
  }
}
