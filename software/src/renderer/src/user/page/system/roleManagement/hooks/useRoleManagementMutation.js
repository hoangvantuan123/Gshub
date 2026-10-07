/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import {
  PostUUserRole,
  PostAUserRole,
  PostURootMenuRole,
  PostUActionRole
} from '../../../../../api/system'

export function useRoleManagementMutation({
  gridDataA,
  setGridDataA,
  gridDataB,
  setGridDataB,
  gridDataCol,
  setGridDataCol,
  gridDataAction,
  setGridDataAction,
  gridDataScope,
  setGridDataScope,
  gridDataUsers,
  setGridDataUsers,
  selectionUsers,
  selectionB,
  selectionA,
  selectionAction,
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef,
  setStatusMessage,
  selectedGroupId,
  selectedMenuInGrid,
  fetchGroupRoles
}) {
  const { t } = useTranslation()

  // 1. Lưu phân quyền (Menu, Actions, RootMenu) và thành viên qua Backend API
  const handleSave = useCallback(async () => {
    if (!canCreate && !canEdit) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Bạn không có quyền thêm hoặc sửa dữ liệu!')
        })
      }
      return
    }

    if (!selectedGroupId) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Vui lòng chọn một Nhóm quyền trước khi lưu phân quyền!')
        })
      }
      return
    }

    const allMenuPermissions = (gridDataB || []).map((m) => ({
      MenuId: String(m.MenuId || m.Id || ''),
      RootMenuId: String(m.RootMenuId || m.MenuRootId || ''),
      MenuLabel: m.MenuLabel || m.Label || '',
      CanView: Boolean(m.View || m.CanView),
      View: Boolean(m.View || m.CanView)
    }))


    const allRootMenuPermissions = (gridDataA || []).map((rm) => {
      const rmId = String(rm.RootMenuId || rm.Id || '')
      const hasCheckedChild = (gridDataB || []).some(
        (m) =>
          (String(m.RootMenuId || m.MenuRootId || '') === rmId ||
            (rm.RootMenuKey && String(m.RootMenuKey || m.MenuKey || '').startsWith(rm.RootMenuKey))) &&
          Boolean(m.View || m.CanView)
      )
      const canView = Boolean(rm.View || rm.CanView || hasCheckedChild)
      return {
        RootMenuId: rmId,
        RootMenuName: rm.RootMenuLabel || rm.RootMenuName || rm.Label || '',
        CanView: canView,
        View: canView
      }
    })

    const validUserIds = (gridDataUsers || [])
      .map((u) => String(u?.UserId || '').trim())
      .filter(Boolean)

    const selectedMenuId = String(
      selectedMenuInGrid?.MenuId || selectedMenuInGrid?.Id || ''
    ).trim()

    togglePageInteraction(true, t('Đang lưu dữ liệu phân quyền và thành viên nhóm...'))
    loadingBarRef?.current?.continuousStart?.()

    try {
      const savePromises = [
        PostUUserRole({
          groupId: String(selectedGroupId),
          permissions: allMenuPermissions
        })
      ]

      if (allRootMenuPermissions.length > 0) {
        savePromises.push(
          PostURootMenuRole({
            groupId: String(selectedGroupId),
            rootMenus: allRootMenuPermissions
          })
        )
      }

      if (selectedMenuId && Array.isArray(gridDataAction) && gridDataAction.length > 0) {
        savePromises.push(
          PostUActionRole({
            groupId: String(selectedGroupId),
            menuId: selectedMenuId,
            actions: gridDataAction.map((a) => ({
              ActionKey: a.ActionKey || a.Key || '',
              Allow: Boolean(a.Allow)
            }))
          })
        )
      }

      if (Array.isArray(gridDataUsers)) {
        savePromises.push(
          PostAUserRole({
            groupId: String(selectedGroupId),
            userIds: validUserIds
          })
        )
      }

      await Promise.all(savePromises)

      // Reset status 'U' và isEdited
      setGridDataA((prev) =>
        prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
      )
      setGridDataB((prev) =>
        prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
      )
      if (setGridDataAction) {
        setGridDataAction((prev) =>
          prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
        )
      }
      if (setGridDataUsers) {
        setGridDataUsers((prev) =>
          prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
        )
      }

      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: t(
            'system.savePermissionsSuccess',
            'Đã lưu cấu hình phân quyền và thành viên nhóm thành công!'
          )
        })
      }
    } catch (err) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'error',
          text: t('system.savePermissionsError', 'Lỗi lưu phân quyền: {{msg}}', {
            msg: err?.response?.data?.message || err?.message || 'Unknown error'
          })
        })
      }
    } finally {
      loadingBarRef?.current?.complete?.()
      togglePageInteraction(false)
    }
  }, [
    canCreate,
    canEdit,
    gridDataA,
    gridDataB,
    gridDataAction,
    gridDataUsers,
    loadingBarRef,
    selectedGroupId,
    selectedMenuInGrid,
    setGridDataA,
    setGridDataB,
    setGridDataAction,
    setGridDataUsers,
    setStatusMessage,
    t
  ])

  // 2. Xóa dòng đang chọn trong Sheet (XÓA SHEET - Ctrl+Shift+D)
  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Bạn không có quyền xóa dữ liệu!')
        })
      }
      return
    }

    // A. Xóa dòng ở bảng Thành viên trong nhóm (gridDataUsers)
    const selectedUserRowIndices = new Set()
    if (selectionUsers?.rows?.items) {
      for (const [start, end] of selectionUsers.rows.items) {
        for (let i = start; i < end; i++) {
          selectedUserRowIndices.add(i)
        }
      }
    }
    if (selectedUserRowIndices.size === 0 && selectionUsers?.current?.cell) {
      selectedUserRowIndices.add(selectionUsers.current.cell[1])
    }

    if (selectedUserRowIndices.size > 0 && Array.isArray(gridDataUsers) && gridDataUsers.length > 0) {
      const hasValidRow = Array.from(selectedUserRowIndices).some(
        (idx) => idx < gridDataUsers.length && gridDataUsers[idx]?.UserId
      )
      if (hasValidRow && setGridDataUsers) {
        setGridDataUsers((prev) => {
          const next = prev.filter((_, idx) => !selectedUserRowIndices.has(idx))
          return updateIndexNo(next)
        })
        if (setStatusMessage) {
          setStatusMessage({
            type: 'info',
            text: t('Đã gỡ người dùng được chọn khỏi bảng. Nhấn LƯU (Ctrl+S) để cập nhật vào hệ thống!')
          })
        }
        return
      }
    }

    if (setStatusMessage) {
      setStatusMessage({
        type: 'info',
        text: t('Vui lòng chọn dòng cần xóa trên bảng!')
      })
    }
  }, [canDelete, selectionUsers, gridDataUsers, setGridDataUsers, setStatusMessage, t])

  return {
    handleSave,
    handleDelete,
    limitModalProps: { isOpen: false, onClose: () => {} }
  }
}

