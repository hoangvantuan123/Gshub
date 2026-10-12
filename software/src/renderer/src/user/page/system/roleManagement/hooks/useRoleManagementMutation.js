/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { PostSaveRolePermissions } from '../../../../../api/system'

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

    togglePageInteraction(true, t('Đang lưu dữ liệu phân quyền và thành viên nhóm...'))
    loadingBarRef?.current?.continuousStart?.()

    try {
      const itemsToInsert = []
      const itemsToUpdate = []
      const itemsToDelete = []

      // A. Phân quyền Menu & Submenu (Cột B)
      ;(gridDataB || []).forEach((m, idx) => {
        const isRootModule = m.Type === 'Phân hệ' || m.MenuType === 'Phân hệ' || m.Level === 0
        const isSubmenu =
          m.Type === 'Submenu' ||
          m.Type === 'submenu' ||
          m.MenuType === 'Submenu' ||
          (m.Level === 1 && m.IsGroup)

        const hasPerm = Boolean(m.View || m.CanView)
        const isExistingRecord = Boolean(m.RoleRecordId)
        const isModified = m.isEdited || m.WorkingTag === 'U' || m.WorkingTag === 'A'

        // Xử lý dòng Phân hệ ở bảng B (Đồng bộ quyền RootMenu)
        if (isRootModule) {
          if (isModified || hasPerm) {
            const rootId = Number(m.RawId || m.RootMenuId || m.Id || 0)
            if (rootId > 0) {
              const existingIdx = itemsToUpdate.findIndex(
                (it) => it.Sheet === 'rootmenu' && it.RootMenuId === rootId
              )
              if (existingIdx >= 0) {
                itemsToUpdate[existingIdx].View = hasPerm
              } else if (isExistingRecord && isModified) {
                itemsToUpdate.push({
                  Id: Number(m.RoleRecordId),
                  Sheet: 'rootmenu',
                  Type: 'rootmenu',
                  GroupId: Number(selectedGroupId),
                  RootMenuId: rootId,
                  View: hasPerm,
                  IdxNo: idx + 1,
                  RowVersion: Number(m.RowVersion || 1)
                })
              } else if (hasPerm) {
                const insertedIdx = itemsToInsert.findIndex(
                  (it) => it.Sheet === 'rootmenu' && it.RootMenuId === rootId
                )
                if (insertedIdx >= 0) {
                  itemsToInsert[insertedIdx].View = hasPerm
                } else {
                  itemsToInsert.push({
                    Sheet: 'rootmenu',
                    Type: 'rootmenu',
                    GroupId: Number(selectedGroupId),
                    RootMenuId: rootId,
                    View: hasPerm,
                    IdxNo: idx + 1
                  })
                }
              }
            }
          }
          return
        }

        // Xử lý dòng Submenu & Menu chức năng chi tiết
        const permType = isSubmenu ? 'submenu' : 'menu'
        const menuId = Number(m.RawId || m.MenuId || m.Id || 0)

        if (isExistingRecord) {
          if (isModified) {
            itemsToUpdate.push({
              Id: Number(m.RoleRecordId),
              Sheet: 'menu',
              Type: permType,
              GroupId: Number(selectedGroupId),
              MenuId: menuId,
              RootMenuId: Number(m.RootMenuId || 0),
              View: hasPerm,
              Create: Boolean(m.Create),
              Edit: Boolean(m.Edit),
              Delete: Boolean(m.Delete),
              IdxNo: idx + 1,
              RowVersion: Number(m.RowVersion || 1)
            })
          }
        } else if (isModified || hasPerm) {
          itemsToInsert.push({
            Sheet: 'menu',
            Type: permType,
            GroupId: Number(selectedGroupId),
            MenuId: menuId,
            RootMenuId: Number(m.RootMenuId || 0),
            View: hasPerm,
            Create: Boolean(m.Create),
            Edit: Boolean(m.Edit),
            Delete: Boolean(m.Delete),
            IdxNo: idx + 1
          })
        }
      })

      // B. Phân quyền Root Menu (Cột A)
      ;(gridDataA || []).forEach((rm, idx) => {
        const hasPerm = Boolean(rm.View || rm.CanView)
        const isExistingRecord = Boolean(rm.RoleRecordId)
        const isModified = rm.isEdited || rm.WorkingTag === 'U' || rm.WorkingTag === 'A'

        if (isExistingRecord) {
          if (isModified) {
            itemsToUpdate.push({
              Id: Number(rm.RoleRecordId),
              Sheet: 'rootmenu',
              Type: 'rootmenu',
              GroupId: Number(selectedGroupId),
              RootMenuId: Number(rm.RawId || rm.RootMenuId || rm.Id || 0),
              View: hasPerm,
              IdxNo: idx + 1,
              RowVersion: Number(rm.RowVersion || 1)
            })
          }
        } else if (isModified || hasPerm) {
          itemsToInsert.push({
            Sheet: 'rootmenu',
            Type: 'rootmenu',
            GroupId: Number(selectedGroupId),
            RootMenuId: Number(rm.RawId || rm.RootMenuId || rm.Id || 0),
            View: hasPerm,
            IdxNo: idx + 1
          })
        }
      })

      // C. Thành viên thuộc nhóm (Tab 2)
      ;(gridDataUsers || []).forEach((u, idx) => {
        if (u.WorkingTag === 'A' || (!u.Id && u.UserId)) {
          itemsToInsert.push({
            Sheet: 'user',
            Type: 'user',
            GroupId: Number(selectedGroupId),
            UserId: String(u.UserId || ''),
            UserSeq: String(u.UserSeq || ''),
            IdxNo: idx + 1
          })
        } else if (u.WorkingTag === 'D' && u.Id) {
          itemsToDelete.push({
            Id: Number(u.Id),
            Sheet: 'user',
            Type: 'user'
          })
        } else if (u.WorkingTag === 'U' && u.Id) {
          itemsToUpdate.push({
            Id: Number(u.Id),
            Sheet: 'user',
            Type: 'user',
            GroupId: Number(selectedGroupId),
            UserId: String(u.UserId || ''),
            UserSeq: String(u.UserSeq || ''),
            IdxNo: idx + 1,
            RowVersion: Number(u.RowVersion || 1)
          })
        }
      })

      // D. Quyền Action & Nút Lệnh
      const selectedMenuId = String(
        selectedMenuInGrid?.MenuId || selectedMenuInGrid?.Id || ''
      ).trim()
      if (
        selectedMenuId &&
        Array.isArray(gridDataAction) &&
        gridDataAction.some((a) => a.isEdited || a.WorkingTag === 'U' || a.WorkingTag === 'A')
      ) {
        gridDataAction.forEach((act, idx) => {
          const isModified = act.isEdited || act.WorkingTag === 'U' || act.WorkingTag === 'A'
          const recordId = act.RoleRecordId || (act.Id && !isNaN(Number(act.Id)) ? act.Id : null)
          const hasDbRecord = Boolean(recordId && Number(recordId) > 0)

          if (hasDbRecord) {
            if (isModified) {
              itemsToUpdate.push({
                Id: Number(recordId),
                Sheet: 'action',
                Type: 'action',
                GroupId: Number(selectedGroupId),
                MenuId: Number(selectedMenuId),
                Name: String(act.ActionKey || act.Key || act.ActionCode || ''),
                View: Boolean(act.Allow),
                IdxNo: idx + 1,
                RowVersion: Number(act.RowVersion || 1)
              })
            }
          } else if (isModified || act.Allow) {
            itemsToInsert.push({
              Sheet: 'action',
              Type: 'action',
              GroupId: Number(selectedGroupId),
              MenuId: Number(selectedMenuId),
              Name: String(act.ActionKey || act.Key || act.ActionCode || ''),
              View: Boolean(act.Allow),
              IdxNo: idx + 1
            })
          }
        })
      }

      if (
        itemsToInsert.length === 0 &&
        itemsToUpdate.length === 0 &&
        itemsToDelete.length === 0
      ) {
        if (setStatusMessage) {
          setStatusMessage({
            type: 'info',
            text: t('Không có thay đổi nào cần lưu.')
          })
        }
        return
      }

      const saveResult = await PostSaveRolePermissions({
        insert: itemsToInsert,
        update: itemsToUpdate,
        delete: itemsToDelete
      })
      if (saveResult?.success === false) {
        throw new Error(saveResult?.message || 'Lỗi khi lưu phân quyền')
      }

      // Cập nhật lại dữ liệu từ server
      if (fetchGroupRoles) {
        await fetchGroupRoles(selectedGroupId)
      }

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
            msg: err?.response?.data?.message || err?.message || 'Lỗi khi xử lý dữ liệu'
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
    fetchGroupRoles,
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

    if (
      selectedUserRowIndices.size > 0 &&
      Array.isArray(gridDataUsers) &&
      gridDataUsers.length > 0
    ) {
      const hasValidRow = Array.from(selectedUserRowIndices).some(
        (idx) => idx < gridDataUsers.length && gridDataUsers[idx]?.UserId
      )
      if (hasValidRow && setGridDataUsers) {
        setGridDataUsers((prev) => {
          const next = prev.map((item, idx) => {
            if (selectedUserRowIndices.has(idx)) {
              return { ...item, WorkingTag: 'D', Status: 'D', isEdited: true }
            }
            return item
          })
          return updateIndexNo(next)
        })
        if (setStatusMessage) {
          setStatusMessage({
            type: 'info',
            text: t(
              'Đã đánh dấu xóa người dùng được chọn. Nhấn LƯU (Ctrl+S) để cập nhật vào hệ thống!'
            )
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
