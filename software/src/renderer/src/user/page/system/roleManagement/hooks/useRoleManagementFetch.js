/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import {
  PostQRoleGroup,
  PostQRootMenuRole,
  PostQMenuRole,
  PostQUserRole,
  PostQActionRole
} from '../../../../../api/system'
import {
  buildMenuTreeFromFlatRows,
  buildComprehensiveMenuTree,
  flattenMenuTree,
  getAllGroupIds
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
      const finalGroups = Array.isArray(groups) ? groups : []

      setRoleGroups(finalGroups)

      if (finalGroups.length > 0) {
        const first = finalGroups[0]
        setGroupId(String(first.Id || ''))
        setGroupName(first.Name || '')
        setComment(first.Comment || '')
        setCreatedByName(first.CreatedByName || first.CreatedBy || '')
      } else {
        setGroupId('')
        setGroupName('')
        setComment('')
        setCreatedByName('')
      }

      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: t('system.loadRoleGroupsSuccess', 'Đã tải danh sách nhóm vai trò thành công!')
        })
      }
    } catch (err) {
      setRoleGroups([])
      setGroupId('')
      setGroupName('')
      setComment('')
      setCreatedByName('')
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

  // 3. Tải chi tiết Action Permissions của Menu đang chọn từ Backend API
  const fetchMenuViewDetails = useCallback(
    async (menuId, groupId, menuName = '', menuKey = '') => {
      if (!menuId || canView === false) {
        setGridDataAction([])
        setNumRowsAction(0)
        return
      }

      try {
        const res = await PostQActionRole({
          groupId: String(groupId || ''),
          menuId: String(menuId)
        })
        const actions = res?.data?.data || res?.data || []
        if (Array.isArray(actions) && actions.length > 0) {
          const finalActions = updateIndexNo(
            actions.map((act) => ({
              ...act,
              Id: String(act.Id || act.ActionKey || act.Key || ''),
              ActionKey: act.ActionKey || act.Key || '',
              Key: act.ActionKey || act.Key || '',
              ActionName: act.ActionName || act.Name || act.ActionKey || '',
              Name: act.ActionName || act.Name || act.ActionKey || '',
              Description: act.Description || '',
              Icon: act.Icon || 'Activity',
              IdxNo: act.IdxNo || 1,
              Allow: Boolean(act.Allow),
              Active: Boolean(act.Active !== false),
              MenuId: String(menuId),
              MenuName: menuName,
              GroupId: String(groupId || ''),
              Status: ''
            }))
          )
          setGridDataAction(finalActions)
          setNumRowsAction(finalActions.length)
        } else {
          setGridDataAction([])
          setNumRowsAction(0)
        }
      } catch (err) {
        console.warn('fetchMenuViewDetails error:', err)
        setGridDataAction([])
        setNumRowsAction(0)
      }

      if (resetTableAction) resetTableAction()
    },
    [canView, resetTableAction, setGridDataAction, setNumRowsAction]
  )

  // 2. Tải toàn bộ Phân hệ Root & Danh sách Menu từ Backend API cho nhóm quyền
  const fetchGroupRoles = useCallback(
    async (groupId, selectedRootId) => {
      if (!groupId || canView === false) {
        setGridDataA([])
        setNumRowsA(0)
        setGridDataB([])
        setNumRowsB(0)
        setGridDataAction([])
        setNumRowsAction(0)
        if (setGridDataUsers) {
          setGridDataUsers([])
          if (setNumRowsUsers) setNumRowsUsers(0)
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
            UserSeq: u.UserSeq || '',
            UserId: u.UserId || '',
            UserName: u.UserName || u.EmpName || u.UserId || '',
            EmpID: u.EmpID || u.EmpCode || '',
            DeptName: u.DeptName || '',
            GroupName: u.GroupName || `ID: ${groupId}`,
            WorkingTag: '',
            Status: ''
          }))

          const cleanList = updateIndexNo(queriedUsers)
          setGridDataUsers(cleanList)
          if (setNumRowsUsers) setNumRowsUsers(cleanList.length)
        }

        let finalA = []
        if (Array.isArray(rootList) && rootList.length > 0) {
          finalA = updateIndexNo(
            rootList.map((m) => {
              const label = m.RootMenuLabel || m.RootMenuName || m.Label || m.Name || ''
              const key = m.RootMenuKey || m.Key || ''
              const id = String(m.RootMenuId || m.Id || '')
              const canView = Boolean(m.View || m.CanView)

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
        }

        let finalB = []
        if (Array.isArray(menuList) && menuList.length > 0) {
          const flatRows = menuList.map((m) => {
            const isSub = m.Type === 'submenu' || m.MenuType === 'submenu'
            const id = String(m.MenuId || m.Id)
            const label = m.MenuLabel || m.Label || m.Name || ''
            const key = m.MenuKey || m.Key || ''
            const parentId = isSub ? 0 : m.MenuSubRootId || m.ParentId || 0
            const rootMenuId = m.RootMenuId || m.MenuRootId || selectedRootId || 1
            const canView = Boolean(m.View || m.CanView)

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
              GroupId: String(groupId),
              Status: ''
            }
          })

          const tree = buildComprehensiveMenuTree(rootList, flatRows)
          const expandedIds = new Set(getAllGroupIds(tree))
          const targetRoot =
            selectedRootId && selectedRootId !== 'ALL' && selectedRootId !== ''
              ? selectedRootId
              : null
          const groupedData = flattenMenuTree(tree, expandedIds, targetRoot)

          finalB = updateIndexNo(groupedData.length > 0 ? groupedData : flatRows)
        }


        setGridDataA(finalA)
        setNumRowsA(finalA.length)
        setGridDataB(finalB)
        setNumRowsB(finalB.length)

        if (resetTableB) resetTableB()

        // Tự nạp Action Perms từ Backend theo dữ liệu của menu đầu tiên
        if (finalB.length > 0) {
          const firstMenu = finalB[0]
          fetchMenuViewDetails(
            firstMenu.MenuId || firstMenu.Id,
            groupId,
            firstMenu.MenuLabel || firstMenu.Label,
            firstMenu.MenuKey || firstMenu.Key
          )
        } else {
          setGridDataAction([])
          setNumRowsAction(0)
        }
      } catch (err) {
        console.error('fetchGroupRoles error:', err)
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [
      canView,
      fetchMenuViewDetails,
      loadingBarRef,
      resetTableB,
      setGridDataA,
      setGridDataAction,
      setGridDataB,
      setGridDataUsers,
      setNumRowsA,
      setNumRowsAction,
      setNumRowsB,
      setNumRowsUsers
    ]
  )

  return {
    fetchRoleGroups,
    fetchGroupRoles,
    fetchMenuViewDetails
  }
}
