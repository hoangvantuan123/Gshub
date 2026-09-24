import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import {
  MOCK_ROLE_GROUPS,
  MOCK_ROOT_MENUS,
  MOCK_MENU_TREE,
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
  setNumRowsA,
  setNumRowsB,
  setNumRowsCol,
  setNumRowsAction,
  setNumRowsScope,
  resetTableA,
  resetTableB,
  resetTableCol,
  resetTableAction,
  resetTableScope,
  canView = true,
  loadingBarRef,
  setStatusMessage
}) {
  const { t } = useTranslation()

  // 1. Tải danh sách nhóm quyền mẫu
  const fetchRoleGroups = useCallback(() => {
    if (canView === false) return
    loadingBarRef?.current?.continuousStart?.()

    const groups = [...MOCK_ROLE_GROUPS]
    setRoleGroups(groups)

    if (groups.length > 0) {
      const first = groups[0]
      setGroupId(String(first.Id || ''))
      setGroupName(first.Name || '')
      setComment(first.Comment || '')
      setCreatedByName(first.CreatedByName || '')
    }

    loadingBarRef?.current?.complete?.()
    if (setStatusMessage) {
      setStatusMessage({
        type: 'success',
        text: t('Đã tải danh sách nhóm quyền mẫu thành công!')
      })
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

  // 2. Tải toàn bộ Phân hệ Root & Danh sách Menu mẫu cho nhóm quyền
  const fetchGroupRoles = useCallback(
    (groupId, selectedRootId) => {
      if (!groupId || canView === false) {
        setGridDataA([])
        setNumRowsA(0)
        setGridDataB([])
        setNumRowsB(0)
        return
      }

      loadingBarRef?.current?.continuousStart?.()

      const finalA = updateIndexNo(
        MOCK_ROOT_MENUS.map((m) => ({
          ...m,
          GroupId: groupId,
          Status: ''
        }))
      )

      // Nếu có selectedRootId thì lọc menu theo RootId, ngược lại lấy theo root đầu tiên
      const targetRootId = selectedRootId || finalA[0]?.RootMenuId || 1
      const defaultExpandedIds = new Set(getAllGroupIds(MOCK_MENU_TREE))
      const groupedMenus = flattenMenuTree(MOCK_MENU_TREE, defaultExpandedIds, targetRootId)

      const finalB = updateIndexNo(
        groupedMenus.map((m) => ({
          ...m,
          GroupId: groupId,
          Status: ''
        }))
      )

      setGridDataA(finalA)
      setNumRowsA(finalA.length)
      setGridDataB(finalB)
      setNumRowsB(finalB.length)

      if (resetTableA) resetTableA()
      if (resetTableB) resetTableB()

      // Tự nạp 3 Tabs (Action, Column, Scope) theo dữ liệu đã đăng ký riêng của menu đầu tiên
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

      loadingBarRef?.current?.complete?.()
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
