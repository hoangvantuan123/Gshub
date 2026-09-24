import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { useSaveGenericData } from '../../../../hooks/useSaveGenericData'
import { useAudLimit } from '../../../../hooks/useAudLimit'
import { PostAPermScopes, PostUPermScopes, PostDPermScopes } from '../../../../../api/system'

export function usePermScopeMutation({
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
    menuKey: 'PAGE_PERM_SCOPE',
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
      const hasCode = Boolean(r.ScopeCode && String(r.ScopeCode).trim() !== '')
      const hasName = Boolean(r.ScopeName && String(r.ScopeName).trim() !== '')
      const hasLang = Boolean(r.LangKey && String(r.LangKey).trim() !== '')
      const hasComment = Boolean(r.Comment && String(r.Comment).trim() !== '')
      return hasCode || hasName || hasLang || hasComment
    })
    const hasEditedRows = (gridData || []).some((row) => {
      const tag = row?.WorkingTag || row?.Status
      return (
        (tag === 'U' || tag === 'E' || tag === 'D') &&
        Boolean(row.IdSeq || row.ScopeCode || row.ScopeName)
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
      const hasCode = Boolean(r.ScopeCode && String(r.ScopeCode).trim() !== '')
      const hasName = Boolean(r.ScopeName && String(r.ScopeName).trim() !== '')
      const hasOp = Boolean(r.OperationCode && String(r.OperationCode).trim() !== '')
      const hasLang = Boolean(r.LangKey && String(r.LangKey).trim() !== '')
      const hasLevel = Boolean(r.DefaultScopeLevel && String(r.DefaultScopeLevel).trim() !== '')
      const hasRule = Boolean(r.RuleCondition && String(r.RuleCondition).trim() !== '')
      const hasSql = Boolean(r.ConditionSql && String(r.ConditionSql).trim() !== '')
      const hasComment = Boolean(r.Comment && String(r.Comment).trim() !== '')
      return hasCode || hasName || hasOp || hasLang || hasLevel || hasRule || hasSql || hasComment
    }

    // 1. Phân biệt rõ:
    // - Dòng mới tạo (A): Status === 'A' và người dùng có nhập dữ liệu nghiệp vụ
    // - Dòng chỉnh sửa (U): Status === 'U' (dòng gốc DB đã sửa)
    // - Dòng mẫu (Template): Bỏ qua hoàn toàn, không validate và không gửi lên server
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

      if (!row.ScopeCode || !String(row.ScopeCode).trim()) {
        validationErrors.push(`Dòng ${rowIdx}: Mã Quy Tắc Phạm Vi không được để trống`)
      }
      if (!row.ScopeName || !String(row.ScopeName).trim()) {
        validationErrors.push(`Dòng ${rowIdx}: Tên Quy Tắc Phạm Vi không được để trống`)
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
      addFunction: PostAPermScopes,
      updateFunction: PostUPermScopes,
      userFrom,
      setStatusMessage,
      loadingText: t('Đang lưu dữ liệu Phạm Vi Quyền Hạn...'),
      successText: t('Lưu danh sách Phạm Vi Quyền Hạn thành công!'),
      matchKey: 'IdxNo',
      prepareAddRows: (rows) =>
        rows.map((item) => ({
          IdxNo: Number(item.IdxNo || 0),
          ScopeCode: item.ScopeCode || '',
          ScopeName: item.ScopeName || '',
          PermActionSeq: item.PermActionSeq || '',
          LangKey: item.LangKey || '',
          ScopeLevelSeq: item.ScopeLevelSeq || '',
          RuleConditionSeq: item.RuleConditionSeq || '',
          ConditionSql: item.ConditionSql || '',
          Comment: item.Comment || '',
          CreatedBy: userFrom?.UserSeq || userFrom?.UserId || '',
          UpdatedBy: userFrom?.UserSeq || userFrom?.UserId || ''
        })),
      prepareUpdateRows: (rows) =>
        rows.map((item) => ({
          IdSeq: item.IdSeq || item.Id || '',
          IdxNo: Number(item.IdxNo || 0),
          ScopeCode: item.ScopeCode || '',
          ScopeName: item.ScopeName || '',
          PermActionSeq: item.PermActionSeq || '',
          LangKey: item.LangKey || '',
          ScopeLevelSeq: item.ScopeLevelSeq || '',
          RuleConditionSeq: item.RuleConditionSeq || '',
          ConditionSql: item.ConditionSql || '',
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
        ScopeCode: found.ScopeCode || '',
        ScopeName: found.ScopeName || '',
        OperationCode: found.OperationCode || '',
        OperationName: found.OperationName || '',
        PermActionSeq: found.PermActionSeq || '',
        LangKey: found.LangKey || '',
        DefaultScopeLevel: found.DefaultScopeLevel || '',
        DefaultScopeLevelLabel: found.DefaultScopeLevelLabel || '',
        ScopeLevelSeq: found.ScopeLevelSeq || '',
        RuleCondition: found.RuleCondition || '',
        RuleConditionLabel: found.RuleConditionLabel || '',
        RuleConditionSeq: found.RuleConditionSeq || '',
        ConditionSql: found.ConditionSql || '',
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
        setStatusMessage({ type: 'info', text: t('Đang xóa dữ liệu Phạm Vi Quyền Hạn...') })
      }

      PostDPermScopes(rowsDbToDelete)
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
                text: t('Xóa Phạm Vi Quyền Hạn thành công!')
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
