import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'

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
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef,
  setStatusMessage,
  selectedGroupId
}) {
  const { t } = useTranslation()

  // 1. Lưu phân quyền (Cập nhật Local Mock State)
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

    const changedA = (gridDataA || []).filter(
      (r) => r && (r.WorkingTag === 'U' || r.Status === 'U' || r.isEdited)
    )
    const changedB = (gridDataB || []).filter(
      (r) => r && (r.WorkingTag === 'U' || r.Status === 'U' || r.isEdited)
    )
    const changedCol = (gridDataCol || []).filter(
      (r) => r && (r.WorkingTag === 'U' || r.Status === 'U' || r.isEdited)
    )
    const changedAct = (gridDataAction || []).filter(
      (r) => r && (r.WorkingTag === 'U' || r.Status === 'U' || r.isEdited)
    )
    const changedScope = (gridDataScope || []).filter(
      (r) => r && (r.WorkingTag === 'U' || r.Status === 'U' || r.isEdited)
    )

    const totalChanges =
      changedA.length +
      changedB.length +
      changedCol.length +
      changedAct.length +
      changedScope.length

    if (totalChanges === 0) {
      if (setStatusMessage) {
        setStatusMessage({ type: 'info', text: t('Không có thay đổi nào cần lưu.') })
      }
      return
    }

    togglePageInteraction(true, t('Đang lưu dữ liệu phân quyền (Mock Data)...'))
    loadingBarRef?.current?.continuousStart?.()

    await new Promise((resolve) => setTimeout(resolve, 300))

    // Reset status 'U' và isEdited
    setGridDataA((prev) => prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false })))
    setGridDataB((prev) => prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false })))
    setGridDataCol((prev) =>
      prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
    )
    setGridDataAction((prev) =>
      prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
    )
    if (setGridDataScope) {
      setGridDataScope((prev) =>
        prev.map((r) => ({ ...r, WorkingTag: '', Status: '', isEdited: false }))
      )
    }

    loadingBarRef?.current?.complete?.()
    togglePageInteraction(false)

    if (setStatusMessage) {
      setStatusMessage({
        type: 'success',
        text: t('Đã lưu thành công {{count}} thay đổi phân quyền (Chế độ Mock Data)!', {
          count: totalChanges
        })
      })
    }
  }, [
    canCreate,
    canEdit,
    gridDataA,
    gridDataAction,
    gridDataB,
    gridDataCol,
    gridDataScope,
    loadingBarRef,
    selectedGroupId,
    setGridDataA,
    setGridDataAction,
    setGridDataB,
    setGridDataCol,
    setGridDataScope,
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
        text: t('Đã đặt lại trạng thái phân quyền về mặc định (Chế độ Mock Data).')
      })
    }
  }, [canDelete, setStatusMessage, t])

  return {
    handleSave,
    handleDelete,
    limitModalProps: { isOpen: false, onClose: () => {} }
  }
}
