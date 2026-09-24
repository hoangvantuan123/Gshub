import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { useSaveGenericData } from '../../../../hooks/useSaveGenericData'
import { useAudLimit } from '../../../../hooks/useAudLimit'
import { filterValidRows } from '../../../../../utils/filterUorA'
import { PostASysAttrItems, PostUSysAttrItems, PostDSysAttrItems } from '../../../../../api/system'

export function useSysAttrValueMutation({
  gridData,
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  canCreate,
  canEdit,
  canView,
  canSearch,
  canDelete,
  loadingBarRef,
  executeSearch,
  userFrom,
  setStatusMessage,
  customLimits
}) {
  const { t } = useTranslation()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const { handleSave } = useSaveGenericData(loadingBarRef)
  const { validateSaveData, validateDeleteData, getLimit, limitModalProps } = useAudLimit({
    menuKey: 'PAGE_SYS_ATTR_VALUE',
    customLimits,
    setStatusMessage
  })

  const handleConfirmSearch = useCallback(() => {
    setShowConfirmModal(false)
    if (resetTable) resetTable()
    executeSearch({ isManual: true })
  }, [resetTable, executeSearch])

  const handleCancelSearch = useCallback(() => {
    setShowConfirmModal(false)
  }, [])

  const handleSearchData = useCallback(async () => {
    if (!canView || canSearch === false) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('system.noPermissionSearch', 'Bạn không có quyền truy vấn dữ liệu')
        })
      }
      return
    }

    const rowsA = filterValidRows(gridData || [], 'A')
    const hasEditedRows = (gridData || []).some((row) => {
      const tag = row?.WorkingTag || row?.Status
      return tag === 'U' || tag === 'E' || tag === 'D'
    })

    if (rowsA.length > 0 || hasEditedRows) {
      setShowConfirmModal(true)
      return
    }

    executeSearch({ isManual: true })
  }, [canView, canSearch, gridData, t, executeSearch, setStatusMessage])

  const handleSaveData = useCallback(async () => {
    if (!canCreate && !canEdit) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('system.noPermissionSave', 'Bạn không có quyền lưu dữ liệu')
        })
      }
      return
    }

    const isSaveLimitValid = validateSaveData({ gridData })
    if (!isSaveLimitValid) {
      return
    }

    const validationErrors = []
    for (let i = 0; i < (gridData || []).length; i++) {
      const row = gridData[i]
      if (!row) continue

      const status = row.WorkingTag || row.Status
      const rowIdx = row.IdxNo || i + 1

      if (status === 'A') {
        if (
          row.GroupCode ||
          row.AttrValueCode ||
          row.AttrValueName ||
          row.LangKey ||
          row.ExtraValue ||
          row.Comment
        ) {
          if (!row.GroupCode || !String(row.GroupCode).trim()) {
            validationErrors.push(`Dòng ${rowIdx}: Mã Nhóm Thuộc Tính không được để trống`)
          }
          if (!row.AttrValueCode || !String(row.AttrValueCode).trim()) {
            validationErrors.push(`Dòng ${rowIdx}: Mã Giá Trị Thuộc Tính không được để trống`)
          }
          if (!row.AttrValueName || !String(row.AttrValueName).trim()) {
            validationErrors.push(`Dòng ${rowIdx}: Tên Giá Trị Thuộc Tính không được để trống`)
          }
        }
      } else if (status === 'U') {
        if (!row.GroupCode || !String(row.GroupCode).trim()) {
          validationErrors.push(`Dòng ${rowIdx}: Mã Nhóm Thuộc Tính không được để trống`)
        }
        if (!row.AttrValueCode || !String(row.AttrValueCode).trim()) {
          validationErrors.push(`Dòng ${rowIdx}: Mã Giá Trị Thuộc Tính không được để trống`)
        }
        if (!row.AttrValueName || !String(row.AttrValueName).trim()) {
          validationErrors.push(`Dòng ${rowIdx}: Tên Giá Trị Thuộc Tính không được để trống`)
        }
      }
    }

    if (validationErrors.length > 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'error',
          text:
            validationErrors.slice(0, 2).join(' | ') +
            (validationErrors.length > 2 ? ` (+${validationErrors.length - 2} lỗi khác)` : '')
        })
      }
      return
    }

    await handleSave({
      canCreate: canCreate || canEdit,
      gridData,
      setGridData,
      maxRowsPerSave: getLimit('SAVE'),
      addFunction: PostASysAttrItems,
      updateFunction: PostUSysAttrItems,
      userFrom,
      setStatusMessage,
      loadingText: t('system.savingAttrValues', 'Đang lưu dữ liệu Giá Trị Thuộc Tính...'),
      successText: t('system.saveSuccess', 'Lưu thành công dữ liệu giá trị thuộc tính'),
      matchKey: 'IdxNo',
      prepareAddRows: (rows) =>
        rows.map((item) => ({
          IdxNo: Number(item.IdxNo || 0),
          AttrGroupSeq: item.AttrGroupSeq || '',
          GroupCode: item.GroupCode || '',
          AttrValueCode: item.AttrValueCode || '',
          AttrValueName: item.AttrValueName || '',
          LangKey: item.LangKey || '',
          ExtraValue: item.ExtraValue || '',
          Comment: item.Comment || '',
          IsActive: item.IsActive !== undefined ? Boolean(item.IsActive) : true,
          CreatedBy: userFrom?.UserSeq || userFrom?.UserId || '',
          UpdatedBy: userFrom?.UserSeq || userFrom?.UserId || ''
        })),
      prepareUpdateRows: (rows) =>
        rows.map((item) => ({
          IdSeq: item.IdSeq || item.Id || '',
          IdxNo: Number(item.IdxNo || 0),
          AttrGroupSeq: item.AttrGroupSeq || '',
          GroupCode: item.GroupCode || '',
          AttrValueCode: item.AttrValueCode || '',
          AttrValueName: item.AttrValueName || '',
          LangKey: item.LangKey || '',
          ExtraValue: item.ExtraValue || '',
          Comment: item.Comment || '',
          IsActive: item.IsActive !== undefined ? Boolean(item.IsActive) : true,
          RowVersion:
            item.RowVersion !== undefined && item.RowVersion !== null ? Number(item.RowVersion) : 1,
          UpdatedAt: item.UpdatedAt ? String(item.UpdatedAt) : '',
          UpdatedBy: userFrom?.UserSeq || userFrom?.UserId || ''
        })),
      mapReturnedFields: (found) => ({
        WorkingTag: '',
        Status: '',
        IdxNo: found.IdxNo,
        IdSeq: found.IdSeq || found.Id,
        RowVersion:
          found.RowVersion !== undefined && found.RowVersion !== null
            ? Number(found.RowVersion)
            : 1,
        CreatedAt: found.CreatedAt || '',
        CreatedByName: found.CreatedByName || userFrom?.UserName || userFrom?.UserId || '',
        CreatedBy: found.CreatedBy || userFrom?.UserSeq || userFrom?.UserId || '',
        UpdatedAt: found.UpdatedAt || '',
        UpdatedByName: found.UpdatedByName || userFrom?.UserName || userFrom?.UserId || '',
        UpdatedBy: found.UpdatedBy || userFrom?.UserSeq || userFrom?.UserId || ''
      })
    })
  }, [
    canCreate,
    canEdit,
    gridData,
    setGridData,
    userFrom,
    handleSave,
    validateSaveData,
    getLimit,
    setStatusMessage,
    t
  ])

  const handleDeleteDataSheet = useCallback(() => {
    const selectedRows = typeof getSelectedRows === 'function' ? getSelectedRows() : []
    if (!selectedRows || selectedRows.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('system.selectRowsToDelete', 'Vui lòng chọn dòng cần xóa trên bảng')
        })
      }
      return
    }

    const isDeleteLimitValid = validateDeleteData(selectedRows)
    if (!isDeleteLimitValid) {
      return
    }

    const rowsLocalToRemove = []
    const rowsDbToDelete = []

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i]
      if (!row) continue
      const rawId = row.IdSeq ?? row.Id
      if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
        rowsDbToDelete.push({
          IdSeq: String(rawId),
          RowVersion: Number(row.RowVersion || 1)
        })
      } else {
        rowsLocalToRemove.push(row)
      }
    }

    if (rowsDbToDelete.length === 0 && rowsLocalToRemove.length > 0) {
      const localIdxs = new Set(
        rowsLocalToRemove.map((r) => r.IdxNo).filter((x) => x !== undefined)
      )
      setGridData((prev) => {
        const updated = prev.filter((x) => !localIdxs.has(x.IdxNo))
        return updateIndexNo(updated)
      })
      if (typeof setNumRows === 'function') {
        setNumRows((prev) => Math.max(0, (prev || 0) - rowsLocalToRemove.length))
      }
      if (resetTable) resetTable()
      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: t('Đã xóa {{count}} dòng mới thêm!', { count: rowsLocalToRemove.length })
        })
      }
      return
    }

    if (rowsDbToDelete.length > 0) {
      if (!canDelete) {
        if (setStatusMessage) {
          setStatusMessage({
            type: 'warning',
            text: t('system.noPermissionDelete', 'Bạn không có quyền xóa dữ liệu')
          })
        }
        return
      }

      togglePageInteraction(true)
      loadingBarRef.current?.continuousStart()
      if (setStatusMessage) {
        setStatusMessage({ type: 'info', text: t('Đang xóa dữ liệu Giá Trị Thuộc Tính...') })
      }

      PostDSysAttrItems(rowsDbToDelete)
        .then((response) => {
          if (response && response.success) {
            const deletedDbIds = new Set(rowsDbToDelete.map((item) => String(item.IdSeq)))
            const localIdxs = new Set(
              rowsLocalToRemove.map((r) => r.IdxNo).filter((x) => x !== undefined)
            )

            setGridData((prev) => {
              const updated = prev.filter((row) => {
                const rId = String(row.IdSeq ?? row.Id ?? '')
                if (rId && deletedDbIds.has(rId)) return false
                if (row.IdxNo !== undefined && localIdxs.has(row.IdxNo)) return false
                return true
              })
              return updateIndexNo(updated)
            })
            if (typeof setNumRows === 'function') {
              setNumRows((prev) => Math.max(0, (prev || 0) - selectedRows.length))
            }
            if (resetTable) resetTable()
            if (setStatusMessage) {
              setStatusMessage({
                type: 'success',
                text: t('Xóa Giá Trị Thuộc Tính thành công!')
              })
            }
          } else {
            if (setStatusMessage) {
              setStatusMessage({
                type: 'error',
                text: response?.message || t('system.error', 'Lỗi khi xóa dữ liệu!')
              })
            }
          }
        })
        .catch((error) => {
          if (setStatusMessage) {
            setStatusMessage({
              type: 'error',
              text: error?.message || t('system.error', 'Có lỗi xảy ra!')
            })
          }
        })
        .finally(() => {
          loadingBarRef.current?.complete()
          togglePageInteraction(false)
        })
    }
  }, [
    canDelete,
    getSelectedRows,
    setGridData,
    setNumRows,
    resetTable,
    loadingBarRef,
    validateDeleteData,
    setStatusMessage,
    t
  ])

  return {
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    limitModalProps
  }
}
