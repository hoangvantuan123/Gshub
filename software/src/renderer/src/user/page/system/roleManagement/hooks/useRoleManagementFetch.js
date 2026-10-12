/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import {
  PostQRoleGroup,
  PostQPermResourceTree,
  PostQRole,
  PostQRootMenuRole,
  PostQMenuRole,
  PostQUserRole,
  PostQActionRole,
  PostQRootMenu,
  PostQMenu
} from '../../../../../api/system'
import { ActionQ } from '../../../../../api/system/action'
import {
  buildMenuTreeFromFlatRows,
  buildComprehensiveMenuTree,
  flattenMenuTree,
  getAllGroupIds,
  MOCK_ROOT_MENUS,
  MOCK_FLAT_MENUS_SQL,
  MOCK_ROLE_GROUPS,
  getRegisteredMenuPermissions
} from '../mock/mockRoleData'

// Cache toàn cục cho cấu trúc menu hệ thống và danh mục actions (chỉ tải 1 lần duy nhất trong toàn phiên)
let cachedSystemRootList = null
let cachedSystemMenuList = null
let cachedSystemActionList = null

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
  const groupActionsStoreRef = useRef([])
  const currentGroupIdRef = useRef('')

  // 1. Tải danh sách nhóm quyền từ Backend API
  const fetchRoleGroups = useCallback(async () => {
    if (canView === false) return
    loadingBarRef?.current?.continuousStart?.()

    try {
      const res = await PostQRoleGroup({})
      let groups = res?.data?.data || res?.data || []
      if (!Array.isArray(groups) || groups.length === 0) {
        groups = MOCK_ROLE_GROUPS
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
      setRoleGroups(MOCK_ROLE_GROUPS)
      if (MOCK_ROLE_GROUPS.length > 0) {
        const first = MOCK_ROLE_GROUPS[0]
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

  // 3. Tải chi tiết Action Permissions của Menu đang chọn từ In-Memory Store (0 API Call khi click chọn menu)
  const fetchMenuViewDetails = useCallback(
    async (menuId, groupId, menuName = '', menuKey = '') => {
      if (!menuId || canView === false) {
        setGridDataAction([])
        setNumRowsAction(0)
        return
      }

      try {
        let dbActions = []
        // Ưu tiên đọc trực tiếp từ in-memory store đã được tải trọn gói bởi fetchGroupRoles (0 network spam)
        if (
          currentGroupIdRef.current === String(groupId) &&
          Array.isArray(groupActionsStoreRef.current) &&
          groupActionsStoreRef.current.length > 0
        ) {
          dbActions = groupActionsStoreRef.current.filter(
            (a) => String(a.MenuId || a.menuId || '') === String(menuId)
          )
        } else {
          // Chỉ fallback gọi API nếu chưa có dữ liệu nhóm
          const resRoleActions = await PostQActionRole({
            groupId: String(groupId || ''),
            menuId: String(menuId),
            KeyItem1: String(groupId || ''),
            KeyItem2: String(menuId)
          }).catch(() => null)
          const rawActions = resRoleActions?.data?.data || resRoleActions?.data || []
          dbActions = Array.isArray(rawActions) ? rawActions : []
        }

        // Đảm bảo có danh mục action hệ thống (tải 1 lần duy nhất trong toàn phiên)
        if (!cachedSystemActionList) {
          const resSysActions = await ActionQ({ pageSize: 1000 }).catch(() => null)
          const sysRaw =
            resSysActions?.data?.data ||
            resSysActions?.data?.items ||
            resSysActions?.data ||
            []
          if (Array.isArray(sysRaw) && sysRaw.length > 0) {
            cachedSystemActionList = sysRaw
          }
        }
        const sysActions = cachedSystemActionList || []

        // Lấy cấu hình action chuẩn của menu làm mẫu ban đầu (để giữ icon và tên Tiếng Việt chuẩn)
        const defaultActions =
          getRegisteredMenuPermissions(menuId, menuKey, menuName).actions || []

        // Tạo map danh mục action: ưu tiên danh mục thực tế từ server (_ERPPermActions)
        const masterActionMap = new Map()

        // 1. Nạp từ template mặc định trước (để có icon đẹp, tên chuẩn)
        defaultActions.forEach((def, idx) => {
          const code = (def.ActionCode || def.ActionKey || '').toUpperCase()
          if (code) {
            masterActionMap.set(code, {
              ...def,
              ActionCode: code,
              ActionKey: code,
              IdxNo: def.IdxNo || idx + 1
            })
          }
        })

        // 2. Nạp và bổ sung từ danh mục thực tế hệ thống (gồm bất kỳ action nào mới thêm ở /erp/u/system/actions)
        sysActions.forEach((sys, idx) => {
          const code = (sys.ActionCode || sys.ActionKey || '').toUpperCase()
          if (code) {
            const existing = masterActionMap.get(code)
            masterActionMap.set(code, {
              ...(existing || {}),
              ActionCode: code,
              ActionKey: code,
              ActionName: sys.ActionName || existing?.ActionName || code,
              Description: sys.Comment || sys.Description || existing?.Description || '',
              Icon: existing?.Icon || 'Activity',
              IdxNo: sys.IdxNo ?? existing?.IdxNo ?? idx + 1,
              IsDefaultAllow: sys.IsDefaultAllow ?? existing?.IsDefaultAllow ?? false,
              Active: true
            })
          }
        })

        // Bộ action thô cơ bản không được hiển thị lặp lại trong bảng Action vì đã có ở cột Menu (View là duy nhất)
        const RAW_CRUD_ACTIONS = new Set([
          'VIEW',
          'CREATE',
          'EDIT',
          'DELETE',
          'IMPORT',
          'EXPORT',
          'PRINT',
          'APPROVE',
          'REJECT'
        ])

        const mergedMap = new Set()
        const mergedList = []

        // Sắp xếp danh mục master action theo thứ tự hiển thị IdxNo
        const sortedMasterActions = Array.from(masterActionMap.values()).sort(
          (a, b) => (Number(a.IdxNo) || 999) - (Number(b.IdxNo) || 999)
        )

        sortedMasterActions.forEach((actionDef, idx) => {
          const actionKey = (actionDef.ActionCode || actionDef.ActionKey || '').toUpperCase()
          if (RAW_CRUD_ACTIONS.has(actionKey)) return
          mergedMap.add(actionKey)

          const dbItem = dbActions.find((a) => {
            const k = (a.ActionKey || a.Name || a.ActionCode || '').toUpperCase()
            return k === actionKey
          })

          const isSavedInDb = Boolean(dbItem?.Id && !isNaN(Number(dbItem.Id)))

          mergedList.push({
            ...actionDef,
            Id: isSavedInDb ? String(dbItem.Id) : '',
            RoleRecordId: isSavedInDb ? String(dbItem.Id) : '',
            ActionKey: actionKey,
            Key: actionKey,
            ActionName: actionDef.ActionName || dbItem?.ActionName || actionKey,
            Name: actionDef.ActionName || dbItem?.ActionName || actionKey,
            Description: actionDef.Description || actionDef.Comment || '',
            Icon: actionDef.Icon || 'Activity',
            IdxNo: idx + 1,
            Allow: dbItem ? Boolean(dbItem.Allow ?? dbItem.View) : Boolean(actionDef.IsDefaultAllow ?? false),
            Active: true,
            MenuId: String(menuId),
            MenuName: menuName,
            GroupId: String(groupId || ''),
            RowVersion: Number(dbItem?.RowVersion || 1),
            Status: '',
            isEdited: false
          })
        })

        // Bổ sung các custom action khác có trong DB nếu là action nút lệnh hợp lệ (bắt đầu bằng BTN_)
        dbActions.forEach((dbAct) => {
          const actKey = (dbAct.ActionKey || dbAct.Name || dbAct.ActionCode || '').toUpperCase()
          if (actKey && !RAW_CRUD_ACTIONS.has(actKey) && !mergedMap.has(actKey) && actKey.startsWith('BTN_')) {
            mergedMap.add(actKey)
            mergedList.push({
              Id: String(dbAct.Id || ''),
              RoleRecordId: String(dbAct.Id || ''),
              ActionKey: dbAct.ActionKey || dbAct.Name || dbAct.ActionCode || '',
              Key: dbAct.ActionKey || dbAct.Name || dbAct.ActionCode || '',
              ActionName: dbAct.ActionName || dbAct.Name || actKey,
              Name: dbAct.ActionName || dbAct.Name || actKey,
              Description: dbAct.Description || '',
              Icon: 'Activity',
              IdxNo: mergedList.length + 1,
              Allow: Boolean(dbAct.Allow ?? dbAct.View),
              Active: true,
              MenuId: String(menuId),
              MenuName: menuName,
              GroupId: String(groupId || ''),
              RowVersion: Number(dbAct.RowVersion || 1),
              Status: '',
              isEdited: false
            })
          }
        })

        const finalActions = updateIndexNo(mergedList)
        setGridDataAction(finalActions)
        setNumRowsAction(finalActions.length)
      } catch (err) {
        const defaultActions =
          getRegisteredMenuPermissions(menuId, menuKey, menuName).actions || []
        const fallbackActions = updateIndexNo(
          defaultActions.map((act, idx) => ({
            ...act,
            Id: '',
            RoleRecordId: '',
            ActionKey: act.ActionCode || act.ActionKey || '',
            Key: act.ActionCode || act.ActionKey || '',
            ActionName: act.ActionName || act.Name || '',
            Name: act.ActionName || act.Name || '',
            Description: act.Comment || act.Description || '',
            IdxNo: act.IdxNo || idx + 1,
            Allow: Boolean(act.Allow),
            Active: true,
            MenuId: String(menuId),
            MenuName: menuName,
            GroupId: String(groupId || ''),
            Status: '',
            isEdited: false
          }))
        )
        setGridDataAction(fallbackActions)
        setNumRowsAction(fallbackActions.length)
      }

      if (resetTableAction) resetTableAction()
    },
    [canView, resetTableAction, setGridDataAction, setNumRowsAction]
  )

  // 2. Tải toàn bộ Phân hệ Root, Menu và Thành viên nhóm từ Backend API cho nhóm quyền
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
        const queryParam = {
          GroupId: String(groupId),
          KeyItem1: String(groupId),
          groupId: String(groupId),
          Sheet: 'details'
        }

        // Tối ưu hóa: Nếu đã có cache danh mục Menu hệ thống thì CHỈ CẦN GỌI ĐÚNG 1 REQUEST DUY NHẤT: PostQRole (Sheet: 'details')
        const promises = [PostQRole(queryParam).catch(() => null)]
        if (!cachedSystemRootList || !cachedSystemMenuList) {
          promises.push(PostQPermResourceTree({}).catch(() => null))
        }

        const [resRoleDetails, resTree] = await Promise.all(promises)

        // Cập nhật cache danh mục hệ thống lần đầu
        if ((!cachedSystemRootList || !cachedSystemMenuList) && resTree) {
          const treeData = resTree?.data?.data || resTree?.data || {}
          cachedSystemRootList =
            treeData?.rootMenus || treeData?.RootMenus || MOCK_ROOT_MENUS
          cachedSystemMenuList =
            treeData?.flatMenus || treeData?.FlatMenus || MOCK_FLAT_MENUS_SQL
        }

        const systemRootList = cachedSystemRootList || MOCK_ROOT_MENUS
        const systemMenuList = cachedSystemMenuList || MOCK_FLAT_MENUS_SQL

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

            const canView = Boolean(granted ? granted.View || granted.CanView : false)

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
          const parentId = isSub ? 0 : m.MenuSubRootId || m.ParentId || 0
          const rootMenuId = String(m.RootMenuId || m.MenuRootId || selectedRootId || 1)

          const granted = grantedMenuMap.get(mId) || grantedMenuMap.get(mKey.toLowerCase()) || null

          const canView = Boolean(granted ? granted.View || granted.CanView : false)
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

        setGridDataA(finalA)
        setNumRowsA(finalA.length)
        setGridDataB(finalB)
        setNumRowsB(finalB.length)

        if (resetTableB) resetTableB()

        // 3. Tab 2: Thành Viên Thuộc Nhóm
        if (setGridDataUsers) {
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

          const cleanList = updateIndexNo(queriedUsers)
          setGridDataUsers(cleanList)
          if (setNumRowsUsers) setNumRowsUsers(cleanList.length)
        }

        if (finalB.length === 0) {
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
