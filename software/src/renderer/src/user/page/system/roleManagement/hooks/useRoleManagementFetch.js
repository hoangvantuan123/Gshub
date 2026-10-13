import { buildActionRows } from '../utils/backendPermissions'
/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { generateEmptyData } from '../../../../components/sheet/js/generateEmptyData'
import { PostQRoleGroup, PostQPermResourceTree, PostQRole } from '../../../../../api/system'
import { ActionQ } from '../../../../../api/system/action'
import { buildComprehensiveMenuTree, flattenMenuTree, getAllGroupIds } from '../utils/menuTree'

// Cache toàn cục cho cấu trúc menu hệ thống và danh mục actions (chỉ tải 1 lần duy nhất trong toàn phiên)
let cachedSystemRootList = null
let cachedSystemMenuList = null
let cachedSystemActionList = null

export function useRoleManagementFetch({
  actionDrafts,
  getCurrentActionRows,
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
  canCreate = true,
  defaultColsUsers = [],
  loadingBarRef,
  setStatusMessage
}) {
  const { t } = useTranslation()
  const groupActionsStoreRef = useRef([])
  const currentGroupIdRef = useRef('')
  const groupRequestRef = useRef(0)
  const actionRequestRef = useRef(0)

  // 1. Tải danh sách nhóm quyền từ Backend API
  const fetchRoleGroups = useCallback(async () => {
    if (canView === false) return
    loadingBarRef?.current?.continuousStart?.()

    try {
      const res = await PostQRoleGroup({})
      if (res?.success === false) throw new Error(res.message || 'Không thể tải nhóm quyền')
      let groups = res?.data?.data || res?.data || []
      if (!Array.isArray(groups) || groups.length === 0) {
        groups = []
      }

      setRoleGroups(groups)

      if (groups.length > 0) {
        const first = groups[0]
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
      setStatusMessage?.({ type: 'error', text: err.message || 'Không thể tải nhóm quyền' })
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

  // Selection is local: all grants and the action catalogue were loaded from BE.
  const fetchMenuViewDetails = useCallback(
    async (menuId, groupId, menuName = '') => {
      actionDrafts.stage(currentGroupIdRef.current, getCurrentActionRows())
      const request = ++actionRequestRef.current
      const granted =
        currentGroupIdRef.current === String(groupId)
          ? groupActionsStoreRef.current.filter((row) => String(row.MenuId) === String(menuId))
          : []
      const rows =
        menuId && canView !== false
          ? actionDrafts.get(groupId, menuId) ||
            buildActionRows(cachedSystemActionList || [], granted, menuId, groupId, menuName)
          : []
      if (request !== actionRequestRef.current) return
      setGridDataAction(rows)
      setNumRowsAction(rows.length)
      resetTableAction?.()
    },
    [
      actionDrafts,
      getCurrentActionRows,
      canView,
      resetTableAction,
      setGridDataAction,
      setNumRowsAction
    ]
  )

  const updateSavedActions = useCallback((rows) => {
    const menuIds = new Set(rows.map((row) => String(row.MenuId)))
    if (!menuIds.size) return
    groupActionsStoreRef.current = groupActionsStoreRef.current
      .filter((row) => !menuIds.has(String(row.MenuId)))
      .concat(
        rows
          .filter((row) => row.RoleRecordId)
          .map((row) => ({
            ...row,
            Id: row.RoleRecordId,
            Type: 'action',
            Name: row.ActionKey,
            View: row.Allow
          }))
      )
  }, [])
  // 2. Tải toàn bộ Phân hệ Root, Menu và Thành viên nhóm từ Backend API cho nhóm quyền
  const fetchGroupRoles = useCallback(
    async (groupId, selectedRootId, sheet = 'all') => {
      const request = ++groupRequestRef.current
      if (sheet === 'all') ++actionRequestRef.current
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
        const queryParam = {
          GroupId: String(groupId),
          KeyItem1: String(groupId),
          groupId: String(groupId),
          Sheet: 'details'
        }

        // Tối ưu hóa: Nếu đã có cache danh mục Menu hệ thống thì CHỈ CẦN GỌI ĐÚNG 1 REQUEST DUY NHẤT: PostQRole (Sheet: 'details')
        const promises = [PostQRole(queryParam)]
        if (!cachedSystemRootList || !cachedSystemMenuList) {
          promises.push(PostQPermResourceTree({}))
        }

        if (cachedSystemActionList === null) promises.push(ActionQ({ pageSize: 1000 }))
        const results = await Promise.all(promises)
        const resRoleDetails = results[0]
        const resTree = !cachedSystemRootList || !cachedSystemMenuList ? results[1] : null
        if (cachedSystemActionList === null) {
          const actionResult = results[results.length - 1]
          if (actionResult?.success === false)
            throw new Error(actionResult.message || 'Không thể tải danh mục quyền thao tác')
          const actions =
            actionResult?.data?.data || actionResult?.data?.items || actionResult?.data || []
          cachedSystemActionList = Array.isArray(actions) ? actions : []
        }
        if (request !== groupRequestRef.current) return
        if (resRoleDetails?.success === false || resTree?.success === false) {
          throw new Error(
            resRoleDetails?.message || resTree?.message || 'Không thể truy vấn phân quyền'
          )
        }

        // Cập nhật cache danh mục hệ thống lần đầu trực tiếp từ Backend Database
        if ((!cachedSystemRootList || !cachedSystemMenuList) && resTree) {
          const treeData = resTree?.data?.data || resTree?.data || {}
          if (Array.isArray(treeData?.rootMenus || treeData?.RootMenus)) {
            cachedSystemRootList = treeData?.rootMenus || treeData?.RootMenus
          }
          if (Array.isArray(treeData?.flatMenus || treeData?.FlatMenus)) {
            cachedSystemMenuList = treeData?.flatMenus || treeData?.FlatMenus
          }
        }

        const systemRootList = cachedSystemRootList || []
        const systemMenuList = cachedSystemMenuList || []

        // Trích xuất quyền đã cấp cho nhóm hiện tại (từ bảng _ERPRolesUsers trong 1 response duy nhất)
        const roleDetails = resRoleDetails?.data?.data || resRoleDetails?.data || {}
        const grantedRootMenus = Array.isArray(roleDetails?.rootmenu)
          ? roleDetails.rootmenu
          : Array.isArray(roleDetails?.rootMenu)
            ? roleDetails.rootMenu
            : []
        const grantedMenus = Array.isArray(roleDetails?.menu) ? roleDetails.menu : []
        const grantedUsers = Array.isArray(roleDetails?.user) ? roleDetails.user : []
        const grantedActions = Array.isArray(roleDetails?.action) ? roleDetails.action : []

        const registeredMenuIds = new Set(
          systemMenuList.map((menu) => String(menu.MenuId ?? menu.Id))
        )
        const orphanedActions = grantedActions.filter(
          (action) => !registeredMenuIds.has(String(action.MenuId))
        )
        if (orphanedActions.length) {
          setStatusMessage?.({
            type: 'warning',
            text:
              'Có ' +
              orphanedActions.length +
              ' quyền action đang trỏ tới menu không còn tồn tại. Hãy chọn đúng menu và gán lại các action cần dùng.'
          })
        }

        // Lưu toàn bộ danh sách action của nhóm vào in-memory store để các lần click menu không cần gọi lại API
        currentGroupIdRef.current = String(groupId)
        groupActionsStoreRef.current = grantedActions

        // Map tra cứu nhanh quyền RootMenu đã cấp
        const grantedRootMap = new Map()
        grantedRootMenus.forEach((r) => {
          if (r.RootMenuId) grantedRootMap.set(String(r.RootMenuId), r)
          if (r.RootMenuKey) grantedRootMap.set(String(r.RootMenuKey).toLowerCase(), r)
          if (r.Key) grantedRootMap.set(String(r.Key).toLowerCase(), r)
        })

        // Map tra cứu nhanh quyền Menu đã cấp
        const grantedMenuMap = new Map()
        grantedMenus.forEach((m) => {
          if (m.MenuId) grantedMenuMap.set(String(m.MenuId), m)
          if (m.MenuKey) grantedMenuMap.set(String(m.MenuKey).toLowerCase(), m)
          if (m.Key) grantedMenuMap.set(String(m.Key).toLowerCase(), m)
        })

        // 1. Cột 1: Bảng Root Menu (Phân Hệ Lớn)
        const finalA = updateIndexNo(
          systemRootList.map((rm) => {
            const rmId = String(rm.RootMenuId || rm.Id || '')
            const rmKey = rm.RootMenuKey || rm.Key || ''
            const label =
              rm.RootMenuLabel || rm.RootMenuName || rm.Label || rm.Name || `Phân hệ ${rmId}`
            const granted =
              grantedRootMap.get(rmId) || grantedRootMap.get(rmKey.toLowerCase()) || null

            const canView = Boolean(granted ? (granted.View ?? granted.CanView) : false)

            return {
              ...rm,
              Id: granted?.Id ? String(granted.Id) : rmId,
              RawId: rmId,
              RootMenuId: rmId,
              Key: rmKey,
              RootMenuKey: rmKey,
              Label: label,
              RootMenuName: label,
              RootMenuLabel: label,
              View: canView,
              CanView: canView,
              GroupId: String(groupId),
              RoleRecordId: granted?.Id ? String(granted.Id) : null,
              RowVersion: granted?.RowVersion || 1,
              WorkingTag: '',
              Status: ''
            }
          })
        )

        // 2. Cột 2: Bảng Cây Menu Chi Tiết (Phân Hệ ➔ Submenu ➔ Chức Năng)
        const flatRows = systemMenuList.map((m) => {
          const mId = String(m.MenuId || m.Id || '')
          const mKey = m.MenuKey || m.Key || ''
          const label = m.MenuLabel || m.Label || m.Name || ''
          const isSub =
            m.Type === 'submenu' ||
            m.MenuType === 'submenu' ||
            m.Type === 'Submenu' ||
            m.MenuType === 'Submenu'
          const parentId = m.MenuSubRootId || m.ParentId || 0
          const rootMenuId = String(m.RootMenuId || m.MenuRootId || selectedRootId || 1)

          const granted = grantedMenuMap.get(mId) || grantedMenuMap.get(mKey.toLowerCase()) || null

          const canView = Boolean(granted ? (granted.View ?? granted.CanView) : false)
          const canCreate = Boolean(granted ? granted.Create : false)
          const canEdit = Boolean(granted ? granted.Edit : false)
          const canDelete = Boolean(granted ? granted.Delete : false)

          return {
            ...m,
            Id: granted?.Id ? String(granted.Id) : mId,
            RawId: mId,
            MenuId: mId,
            ParentId: parentId,
            Level: isSub ? 0 : m.Level !== undefined ? m.Level : 1,
            RootMenuId: rootMenuId,
            Key: mKey,
            MenuKey: mKey,
            Label: label,
            MenuLabel: label,
            RawLabel: label,
            Type: isSub ? 'submenu' : 'menu',
            MenuType: isSub ? 'Submenu' : 'Menu',
            View: canView,
            CanView: canView,
            Create: canCreate,
            Edit: canEdit,
            Delete: canDelete,
            GroupId: String(groupId),
            RoleRecordId: granted?.Id ? String(granted.Id) : null,
            RowVersion: granted?.RowVersion || 1,
            WorkingTag: '',
            Status: ''
          }
        })

        const tree = buildComprehensiveMenuTree(finalA, flatRows)
        const expandedIds = new Set(getAllGroupIds(tree))
        const targetRoot =
          selectedRootId && selectedRootId !== 'ALL' && selectedRootId !== ''
            ? selectedRootId
            : null
        const groupedData = flattenMenuTree(tree, expandedIds, targetRoot)
        const finalB = updateIndexNo(groupedData.length > 0 ? groupedData : flatRows)

        if (sheet === 'all' || sheet === 'menu') {
          setGridDataA(finalA)
          setNumRowsA(finalA.length)
          setGridDataB(finalB)
          setNumRowsB(finalB.length)
        }

        if (sheet === 'all' && resetTableB) resetTableB()

        // 3. Tab 2: Thành Viên Thuộc Nhóm
        if (setGridDataUsers && (sheet === 'all' || sheet === 'users')) {
          const queriedUsers = (Array.isArray(grantedUsers) ? grantedUsers : []).map((u) => ({
            Id: u.Id ? String(u.Id) : '',
            UserSeq: u.UserSeq || '',
            UserId: u.UserId || '',
            UserName: u.UserName || u.EmpName || u.UserId || '',
            EmpID: u.EmpID || u.EmpCode || '',
            DeptName: u.DeptName || '',
            GroupName: u.GroupName || `ID: ${groupId}`,
            GroupId: String(groupId),
            RowVersion: u.RowVersion || 1,
            CreatedAt: u.CreatedAt || '',
            WorkingTag: '',
            Status: ''
          }))

          const emptyRows =
            canCreate && defaultColsUsers?.length ? generateEmptyData(50, defaultColsUsers) : []
          const cleanList = updateIndexNo([...queriedUsers, ...emptyRows])
          setGridDataUsers(cleanList)
          if (setNumRowsUsers) setNumRowsUsers(cleanList.length)
        }

        if (finalB.length === 0) {
          setGridDataAction([])
          setNumRowsAction(0)
        }
      } catch (err) {
        if (request !== groupRequestRef.current) return
        console.error('fetchGroupRoles error:', err)
        setStatusMessage?.({ type: 'error', text: err.message || 'Lỗi truy vấn phân quyền' })
        throw err
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
      setNumRowsUsers,
      setStatusMessage
    ]
  )

  return {
    fetchRoleGroups,
    fetchGroupRoles,
    fetchMenuViewDetails,
    updateSavedActions
  }
}
