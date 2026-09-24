import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { useSaveGenericData } from '../../../../hooks/useSaveGenericData'
import { useAudLimit } from '../../../../hooks/useAudLimit'
import { filterValidRows } from '../../../../../utils/filterUorA'
import { PostALang, PostULang, PostDLang } from '../../../../../api/dict'

export function useLangSysMutation({
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
    menuKey: 'LANGUAGE',
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
          text: t('Bạn không có quyền thêm hoặc sửa dữ liệu!')
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
        if (row.LanguageCode || row.LanguageName || row.Remark) {
          if (!row.LanguageCode || !String(row.LanguageCode).trim()) {
            validationErrors.push(`Dòng ${rowIdx}: Mã ngôn ngữ không được để trống`)
          }
          if (!row.LanguageName || !String(row.LanguageName).trim()) {
            validationErrors.push(`Dòng ${rowIdx}: Tên ngôn ngữ không được để trống`)
          }
        }
      } else if (status === 'U' || status === 'E') {
        if (!row.LanguageCode || !String(row.LanguageCode).trim()) {
          validationErrors.push(`Dòng ${rowIdx}: Mã ngôn ngữ không được để trống`)
        }
        if (!row.LanguageName || !String(row.LanguageName).trim()) {
          validationErrors.push(`Dòng ${rowIdx}: Tên ngôn ngữ không được để trống`)
        }
      }
    }

    if (validationErrors.length > 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'error',
          text: validationErrors.slice(0, 3).join('; ') + (validationErrors.length > 3 ? '...' : '')
        })
      }
      return
    }

    const rowsA = (gridData || [])
      .filter((row) => {
        const tag = row?.WorkingTag || row?.Status
        return (
          tag === 'A' &&
          (String(row?.LanguageCode || '').trim() !== '' ||
            String(row?.LanguageName || '').trim() !== '')
        )
      })
      .map((row) => ({
        IdxNo: Number(row.IdxNo) || 1,
        LanguageCode: String(row.LanguageCode || '').trim(),
        LanguageName: String(row.LanguageName || '').trim(),
        Remark: String(row.Remark || '').trim(),
        CreatedBy: userFrom?.UserId || userFrom?.username || ''
      }))

    const rowsU = (gridData || [])
      .filter((row) => {
        const tag = row?.WorkingTag || row?.Status
        return (tag === 'U' || tag === 'E') && row?.LanguageSeq
      })
      .map((row) => ({
        LanguageSeq: Number(row.LanguageSeq),
        IdxNo: Number(row.IdxNo) || 1,
        LanguageCode: String(row.LanguageCode || '').trim(),
        LanguageName: String(row.LanguageName || '').trim(),
        Remark: String(row.Remark || '').trim(),
        UpdatedBy: userFrom?.UserId || userFrom?.username || ''
      }))

    const rowsD = (gridData || [])
      .filter((row) => {
        const tag = row?.WorkingTag || row?.Status
        return tag === 'D' && row?.LanguageSeq
      })
      .map((row) => Number(row.LanguageSeq))

    if (rowsA.length === 0 && rowsU.length === 0 && rowsD.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'info',
          text: t('Không có thay đổi nào cần lưu!')
        })
      }
      return
    }

    await handleSave({
      dataA: rowsA,
      dataU: rowsU,
      dataD: rowsD,
      postA: PostALang,
      postU: PostULang,
      postD: PostDLang,
      onSuccess: () => {
        if (resetTable) resetTable()
        executeSearch({ isManual: true })
        if (setStatusMessage) {
          setStatusMessage({
            type: 'success',
            text: t('Lưu dữ liệu ngôn ngữ thành công!')
          })
        }
      },
      onError: (err) => {
        if (setStatusMessage) {
          setStatusMessage({
            type: 'error',
            text: err?.message || t('Lỗi khi lưu dữ liệu ngôn ngữ!')
          })
        }
      }
    })
  }, [
    canCreate,
    canEdit,
    gridData,
    validateSaveData,
    userFrom,
    handleSave,
    t,
    setStatusMessage,
    resetTable,
    executeSearch
  ])

  const handleDeleteDataSheet = useCallback(() => {
    if (!canDelete) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Bạn không có quyền xóa dữ liệu!')
        })
      }
      return
    }

    const selectedRows = getSelectedRows ? getSelectedRows() : []
    if (!selectedRows || selectedRows.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'info',
          text: t('Vui lòng chọn dòng cần xóa!')
        })
      }
      return
    }

    const isDeleteLimitValid = validateDeleteData({ selectedRows })
    if (!isDeleteLimitValid) return

    setGridData((prev) => {
      const selectedIndices = new Set(selectedRows.map((r) => r.rowIndex))
      const next = prev
        .map((row, idx) => {
          if (!selectedIndices.has(idx)) return row
          const tag = row.WorkingTag || row.Status
          if (tag === 'A') {
            return null // Xóa bỏ dòng mới tạo trực tiếp
          }
          const nextTag = tag === 'D' ? '' : 'D'
          return {
            ...row,
            WorkingTag: nextTag,
            Status: nextTag // Toggle trạng thái D
          }
        })
        .filter(Boolean)

      const reIndexed = updateIndexNo(next)
      if (setNumRows) setNumRows(reIndexed.length)
      return reIndexed
    })
  }, [canDelete, getSelectedRows, validateDeleteData, setGridData, setNumRows, setStatusMessage, t])

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
