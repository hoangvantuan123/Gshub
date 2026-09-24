import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { useSaveGenericData } from '../../../../hooks/useSaveGenericData'
import { useAudLimit } from '../../../../hooks/useAudLimit'
import { PostAPermFields, PostUPermFields, PostDPermFields } from '../../../../../api/system'

export function usePermFieldMutation({
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
    menuKey: 'PAGE_PERM_FIELD',
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
          text: t('Bạn không có quyền tìm kiếm hoặc xem dữ liệu màn hình này!')
        })
      }
      return
    }

    const rowsA = (gridData || []).filter((r) => {
      const tag = r?.WorkingTag || r?.Status
      if (tag !== 'A') return false
      const hasResource = Boolean(r.ResourceCode && String(r.ResourceCode).trim() !== '')
      const hasField = Boolean(r.FieldCode && String(r.FieldCode).trim() !== '')
      const hasName = Boolean(r.FieldName && String(r.FieldName).trim() !== '')
      const hasLang = Boolean(r.LangKey && String(r.LangKey).trim() !== '')
      const hasComment = Boolean(r.Comment && String(r.Comment).trim() !== '')
      return hasResource || hasField || hasName || hasLang || hasComment
    })
    const hasEditedRows = (gridData || []).some((row) => {
      const tag = row?.WorkingTag || row?.Status
      return (
        (tag === 'U' || tag === 'E' || tag === 'D') &&
        Boolean(row.IdSeq || row.ResourceCode || row.FieldCode || row.FieldName)
      )
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
          text: t('Bạn không có quyền thêm hoặc sửa dữ liệu!')
        })
      }
      return
    }

    const isSaveLimitValid = validateSaveData({ gridData })
    if (!isSaveLimitValid) {
      return
    }

    const isBusinessRow = (r) => {
      if (!r) return false
      const hasResource = Boolean(r.ResourceCode && String(r.ResourceCode).trim() !== '')
      const hasField = Boolean(r.FieldCode && String(r.FieldCode).trim() !== '')
      const hasName = Boolean(r.FieldName && String(r.FieldName).trim() !== '')
      const hasDict = Boolean(r.DictSeq !== undefined && r.DictSeq !== null && String(r.DictSeq).trim() !== '')
      const hasLang = Boolean(r.LangKey && String(r.LangKey).trim() !== '')
      const hasComment = Boolean(r.Comment && String(r.Comment).trim() !== '')
      return hasResource || hasField || hasName || hasDict || hasLang || hasComment
    }

    const rowsToValidate = (gridData || []).filter((row) => {
      if (!row) return false
      const tag = row.WorkingTag || row.Status
      if (tag === 'A') {
        return isBusinessRow(row)
      }
      if (tag === 'U') {
        return true
      }
      return false
    })

    if (rowsToValidate.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Không có dữ liệu mới hoặc thay đổi cần lưu!')
        })
      }
      return
    }

    const validationErrors = []
    for (let i = 0; i < rowsToValidate.length; i++) {
      const row = rowsToValidate[i]
      const rowIdx = row.IdxNo || i + 1

      if (!row.ResourceCode || !String(row.ResourceCode).trim()) {
        validationErrors.push(`Dòng ${rowIdx}: Mã Chức Năng không được để trống`)
      }
      if (!row.FieldCode || !String(row.FieldCode).trim()) {
        validationErrors.push(`Dòng ${rowIdx}: Mã Trường Dữ Liệu không được để trống`)
      }
      if (!row.FieldName || !String(row.FieldName).trim()) {
        validationErrors.push(`Dòng ${rowIdx}: Tên Trường Dữ Liệu không được để trống`)
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
      addFunction: PostAPermFields,
      updateFunction: PostUPermFields,
      userFrom,
      setStatusMessage,
      loadingText: t('Đang lưu dữ liệu Trường Phân Quyền...'),
      successText: t('Lưu danh sách Trường Phân Quyền thành công!'),
      matchKey: 'IdxNo',
      prepareAddRows: (rows) =>
        rows.map((item) => ({
          IdxNo: Number(item.IdxNo || 0),
          ResourceSeq: item.ResourceSeq !== undefined && item.ResourceSeq !== null ? String(item.ResourceSeq) : '',
          ResourceCode: item.ResourceCode || '',
          FieldCode: item.FieldCode || '',
          FieldName: item.FieldName || '',
          DictSeq: item.DictSeq !== undefined && item.DictSeq !== null && item.DictSeq !== '' ? Number(item.DictSeq) : null,
          LangKey: item.LangKey || '',
          IsMaskable: item.IsMaskable === true || item.IsMaskable === 1 || item.IsMaskable === '1',
          IsSensitive: item.IsSensitive === true || item.IsSensitive === 1 || item.IsSensitive === '1',
          OrderNo: item.OrderNo !== undefined && item.OrderNo !== null && item.OrderNo !== '' ? Number(item.OrderNo) : 0,
          Comment: item.Comment || '',
          CreatedBy: userFrom?.UserSeq || userFrom?.UserId || '',
          UpdatedBy: userFrom?.UserSeq || userFrom?.UserId || ''
        })),
      prepareUpdateRows: (rows) =>
        rows.map((item) => ({
          IdSeq: item.IdSeq || item.Id || '',
          IdxNo: Number(item.IdxNo || 0),
          ResourceSeq: item.ResourceSeq !== undefined && item.ResourceSeq !== null ? String(item.ResourceSeq) : '',
          ResourceCode: item.ResourceCode || '',
          FieldCode: item.FieldCode || '',
          FieldName: item.FieldName || '',
          DictSeq: item.DictSeq !== undefined && item.DictSeq !== null && item.DictSeq !== '' ? Number(item.DictSeq) : null,
          LangKey: item.LangKey || '',
          IsMaskable: item.IsMaskable === true || item.IsMaskable === 1 || item.IsMaskable === '1',
          IsSensitive: item.IsSensitive === true || item.IsSensitive === 1 || item.IsSensitive === '1',
          OrderNo: item.OrderNo !== undefined && item.OrderNo !== null && item.OrderNo !== '' ? Number(item.OrderNo) : 0,
          Comment: item.Comment || '',
          RowVersion:
            item.RowVersion !== undefined && item.RowVersion !== null ? Number(item.RowVersion) : 0,
          UpdatedAt: item.UpdatedAt ? String(item.UpdatedAt) : '',
          UpdatedBy: userFrom?.UserSeq || userFrom?.UserId || ''
        })),
      mapReturnedFields: (found) => ({
        WorkingTag: '',
        Status: '',
        IdxNo: found.IdxNo,
        IdSeq: found.IdSeq || found.Id,
        ResourceSeq: found.ResourceSeq || '',
        ResourceCode: found.ResourceCode || '',
        ResourceName: found.ResourceName || '',
        FieldCode: found.FieldCode || '',
        FieldName: found.FieldName || '',
        DictSeq: found.DictSeq !== undefined && found.DictSeq !== null ? Number(found.DictSeq) : '',
        LangKey: found.LangKey || '',
        IsMaskable: found.IsMaskable === true || found.IsMaskable === 1 || found.IsMaskable === '1',
        IsSensitive: found.IsSensitive === true || found.IsSensitive === 1 || found.IsSensitive === '1',
        OrderNo: found.OrderNo !== undefined && found.OrderNo !== null ? Number(found.OrderNo) : 0,
        Comment: found.Comment || '',
        RowVersion:
          found.RowVersion !== undefined && found.RowVersion !== null
            ? Number(found.RowVersion)
            : 0,
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
    const selectedRows = getSelectedRows()
    if (!selectedRows || selectedRows.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Vui lòng chọn dòng cần xóa!')
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
          RowVersion: Number(row.RowVersion || 0)
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
      setNumRows((prev) => Math.max(0, prev - rowsLocalToRemove.length))
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
            text: t('Bạn không có quyền xóa dữ liệu!')
          })
        }
        return
      }

      togglePageInteraction(true)
      loadingBarRef.current?.continuousStart()
      if (setStatusMessage) {
        setStatusMessage({ type: 'info', text: t('Đang xóa dữ liệu Trường Phân Quyền...') })
      }

      PostDPermFields(rowsDbToDelete)
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
            setNumRows((prev) => Math.max(0, prev - selectedRows.length))
            if (resetTable) resetTable()
            if (setStatusMessage) {
              setStatusMessage({
                type: 'success',
                text: t('Xóa Trường Phân Quyền thành công!')
              })
            }
          } else {
            if (setStatusMessage) {
              setStatusMessage({
                type: 'error',
                text: response?.message || t('Lỗi khi xóa dữ liệu!')
              })
            }
          }
        })
        .catch((error) => {
          if (setStatusMessage) {
            setStatusMessage({
              type: 'error',
              text: error?.message || t('Có lỗi xảy ra!')
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
