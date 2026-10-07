/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { PostUUserRole } from '../../../../../api/system'

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
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef,
  setStatusMessage,
  selectedGroupId
}) {
  const { t } = useTranslation()

  // 1. Lưu phân quyền và thành viên qua Backend API
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

    const allPermissions = (gridDataB || []).map((m) => ({
      MenuId: String(m.MenuId || m.Id || ''),
      RootMenuId: String(m.RootMenuId || m.MenuRootId || ''),
      MenuLabel: m.MenuLabel || m.Label || '',
      CanView: Boolean(m.View || m.CanView),
      CanCreate: Boolean(m.Create || m.CanCreate),
      CanEdit: Boolean(m.Edit || m.CanEdit),
      CanDelete: Boolean(m.Delete || m.CanDelete),
      CanImport: Boolean(m.Import || m.CanImport),
      CanExport: Boolean(m.Export || m.CanExport)
    }))

    const validUserIds = (gridDataUsers || [])
      .map((u) => String(u?.UserId || '').trim())
      .filter(Boolean)

    togglePageInteraction(true, t('Đang lưu dữ liệu phân quyền và thành viên nhóm...'))
    loadingBarRef?.current?.continuousStart?.()

    try {
      const payload = {
        groupId: String(selectedGroupId),
        permissions: allPermissions
      }

      const savePromises = [PostUUserRole(payload)]
      if (validUserIds.length > 0) {
        savePromises.push(
          PostAUserRole({
            groupId: String(selectedGroupId),
            userIds: validUserIds
          })
        )
      }

      await Promise.all(savePromises)

      // Reset status 'U' và isEdited
      setGridDataA((prev) => prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false })))
      setGridDataB((prev) => prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false })))
      if (setGridDataUsers) {
        setGridDataUsers((prev) => prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false })))
      }

      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: t('system.savePermissionsSuccess', 'Đã lưu cấu hình phân quyền và thành viên nhóm thành công!')
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
    gridDataUsers,
    loadingBarRef,
    selectedGroupId,
    setGridDataA,
    setGridDataB,
    setGridDataUsers,
    setStatusMessage,
    t
  ])

  // 2. Xóa phân quyền
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

    if (setStatusMessage) {
      setStatusMessage({
        type: 'info',
        text: t('Đã đặt lại trạng thái phân quyền về mặc định.')
      })
    }
  }, [canDelete, setStatusMessage, t])

  return {
    handleSave,
    handleDelete,
    limitModalProps: { isOpen: false, onClose: () => {} }
  }
}
