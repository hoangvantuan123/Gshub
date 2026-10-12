import { useCallback } from 'react'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { PostSaveRolePermissions } from '../../../../../api/system'
import { buildPermissionBatch, recordId } from '../utils/permissionRows'
import { reconcilePermissionRows } from '../utils/backendPermissions'

export function useRoleManagementMutation({
  gridDataB,
  setGridDataB,
  gridDataAction,
  setGridDataAction,
  gridDataUsers,
  setGridDataUsers,
  selectionB,
  selectionAction,
  selectionUsers,
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef,
  setStatusMessage,
  selectedGroupId,
  onSaved,
  activeSheet = 'menu'
}) {
  const rows =
    activeSheet === 'users' ? gridDataUsers : activeSheet === 'actions' ? gridDataAction : gridDataB
  const setRows =
    activeSheet === 'users'
      ? setGridDataUsers
      : activeSheet === 'actions'
        ? setGridDataAction
        : setGridDataB
  const selection =
    activeSheet === 'users'
      ? selectionUsers
      : activeSheet === 'actions'
        ? selectionAction
        : selectionB

  const handleSave = useCallback(async () => {
    if (!selectedGroupId) {
      setStatusMessage?.({ type: 'warning', text: 'Vui lòng chọn nhóm quyền trước khi lưu.' })
      return
    }
    try {
      const batch = buildPermissionBatch(rows || [], activeSheet, selectedGroupId)
      if (!batch.insert.length && !batch.update.length && !batch.delete.length) {
        setStatusMessage?.({ type: 'info', text: 'Bảng đang làm việc không có thay đổi cần lưu.' })
        return
      }
      if (
        (batch.insert.length && !canCreate) ||
        (batch.update.length && !canEdit) ||
        (batch.delete.length && !canDelete)
      ) {
        setStatusMessage?.({
          type: 'warning',
          text: 'Bạn không có đủ quyền A/U/D để lưu các dòng đã thay đổi.'
        })
        return
      }
      togglePageInteraction(true, 'Đang lưu bảng phân quyền đang làm việc...')
      loadingBarRef?.current?.continuousStart?.()
      const result = await PostSaveRolePermissions(batch)
      if (!result) throw new Error('BE không trả kết quả lưu phân quyền.')
      const nextRows = reconcilePermissionRows(rows, activeSheet, batch, result)
      setRows(nextRows)
      onSaved?.(activeSheet, nextRows)
      if (result.success === false) throw new Error(result?.message || 'Lỗi lưu phân quyền')
      setStatusMessage?.({ type: 'success', text: 'Đã lưu bảng đang làm việc thành công.' })
    } catch (error) {
      setStatusMessage?.({ type: 'error', text: error?.response?.data?.message || error.message })
    } finally {
      loadingBarRef?.current?.complete?.()
      togglePageInteraction(false)
    }
  }, [
    rows,
    activeSheet,
    selectedGroupId,
    canCreate,
    canEdit,
    canDelete,
    setRows,
    onSaved,
    loadingBarRef,
    setStatusMessage
  ])

  const handleDelete = useCallback(() => {
    if (!canDelete) {
      setStatusMessage?.({ type: 'warning', text: 'Bạn không có quyền xóa dữ liệu.' })
      return
    }
    const indices = new Set()
    for (const [start, end] of selection?.rows?.items || []) {
      for (let i = start; i < end; i++) indices.add(i)
    }
    if (!indices.size && selection?.current?.cell) indices.add(selection.current.cell[1])
    if (!indices.size) {
      setStatusMessage?.({ type: 'info', text: 'Vui lòng chọn dòng trong bảng đang làm việc.' })
      return
    }
    if (activeSheet === 'menu') {
      for (const index of [...indices]) {
        const level = Number(rows[index]?.Level)
        for (let i = index + 1; i < rows.length && Number(rows[i].Level) > level; i++)
          indices.add(i)
      }
    }
    setRows((previous) =>
      previous.flatMap((row, index) => {
        if (!indices.has(index)) return [row]
        if (!recordId(row, activeSheet)) {
          return activeSheet === 'users'
            ? []
            : [
                {
                  ...row,
                  View: false,
                  CanView: false,
                  Allow: false,
                  WorkingTag: '',
                  Status: '',
                  isEdited: false
                }
              ]
        }
        return [
          {
            ...row,
            View: false,
            CanView: false,
            Allow: false,
            WorkingTag: 'D',
            Status: 'D',
            isEdited: true
          }
        ]
      })
    )
    setStatusMessage?.({
      type: 'info',
      text: 'Đã đánh dấu D trong bảng đang làm việc. Nhấn Ctrl+S để lưu.'
    })
  }, [activeSheet, rows, selection, setRows, canDelete, setStatusMessage])

  return { handleSave, handleDelete, limitModalProps: { isOpen: false, onClose: () => {} } }
}
