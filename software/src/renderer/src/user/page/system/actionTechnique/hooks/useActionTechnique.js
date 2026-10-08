/* eslint-disable no-unused-vars, no-empty */
import { useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { ActionQ, ActionA, ActionU, ActionD } from '../../../../../api/system/action'

export function useActionTechnique({
  gridData,
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  defaultCols,
  canCreate,
  canEdit,
  canView,
  canSearch,
  canDelete,
  loadingBarRef,
  controllers
}) {
  const { t } = useTranslation()
  const { setPageData, setStatusMessage } = usePageData() || {}
  const [actionName, setActionName] = useState('')
  const [actionKey, setActionKey] = useState('')
  const [searchValues, setSearchValues] = useState({})
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const isDirtyRef = useRef(false)

  const handleAddQueryField = useCallback((columnKey, colTitle, activeCol) => {
    if (!columnKey) return
    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key === columnKey)) return prev
      return [
        ...prev,
        {
          key: columnKey,
          label: colTitle || columnKey,
          type:
            activeCol?.kind === 'Boolean'
              ? 'select'
              : activeCol?.kind === 'Number'
                ? 'number'
                : 'text',
          options:
            activeCol?.kind === 'Boolean'
              ? [
                  { value: '', label: 'Tất cả' },
                  { value: '1', label: 'Có' },
                  { value: '0', label: 'Không' }
                ]
              : undefined
        }
      ]
    })
  }, [])

  const handleRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== fieldKey))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }, [])

  const handleResetQuery = useCallback(() => {
    setActionName('')
    setActionKey('')
    setSearchValues({})
    setDynamicQueryFields([])
  }, [])

  const fetchActionData = useCallback(
    async (silent = false) => {
      try {
        loadingBarRef?.current?.continuousStart?.()
        const queryParams = {
          ...searchValues,
          ActionName: actionName,
          ActionKey: actionKey,
          keyword: actionName || actionKey || '',
          page: 1,
          pageSize: 1000
        }
        const res = await ActionQ(queryParams)
        if (res && res.success && Array.isArray(res.data)) {
          setGridData(res.data)
          setNumRows(res.data.length)
          isDirtyRef.current = false

          // Cập nhật PageData & Status Bottom Bar
          const pageInfo = {
            page: res.page || 1,
            pageSize: res.pageSize || 1000,
            totalRows: res.totalRows ?? res.total ?? res.data.length,
            total: res.total ?? res.totalRows ?? res.data.length,
            totalPages: res.totalPages || 1,
            totalAll: res.totalAll ?? res.totalRows ?? res.data.length,
            loadedCount: res.loadedCount ?? res.data.length,
            totalColumns: res.totalColumns || defaultCols?.length || 11
          }
          setPageData?.(pageInfo)

          if (setStatusMessage) {
            setStatusMessage(
              t('Đã tải {{count}} hành động (Tổng cộng: {{total}} dòng).', {
                count: res.data.length,
                total: pageInfo.totalRows
              })
            )
          }
        } else {
          setGridData([])
          setNumRows(0)
          setPageData?.({
            page: 1,
            pageSize: 1000,
            totalRows: 0,
            total: 0,
            totalPages: 1,
            totalAll: 0,
            loadedCount: 0,
            totalColumns: defaultCols?.length || 11
          })
          if (setStatusMessage) {
            setStatusMessage(t('Không tìm thấy dữ liệu phù hợp.'))
          }
        }
      } catch (err) {
        console.warn('ActionQ error:', err)
        if (setStatusMessage) {
          setStatusMessage({
            type: 'error',
            text: err?.message || t('Lỗi khi tải danh mục hành động!')
          })
        }
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [
      actionName,
      actionKey,
      searchValues,
      loadingBarRef,
      setGridData,
      setNumRows,
      setPageData,
      setStatusMessage,
      defaultCols,
      t
    ]
  )

  const handleSearchData = useCallback(() => {
    fetchActionData(false)
  }, [fetchActionData])

  const handleConfirmSearch = useCallback(() => {
    setShowConfirmModal(false)
    fetchActionData(false)
  }, [fetchActionData])

  const handleCancelSearch = useCallback(() => {
    setShowConfirmModal(false)
  }, [])

  const handleSaveData = useCallback(async () => {
    if (!canCreate && !canEdit) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Bạn không có quyền lưu danh mục hành động!')
        })
      }
      return
    }

    try {
      loadingBarRef?.current?.continuousStart?.()
      const dataList = Array.isArray(gridData) ? gridData : []

      let successCount = 0
      for (const item of dataList) {
        const tag = item.WorkingTag || item.Status
        if (!item.ActionKey && !item.Key) continue

        if (tag === 'A' || (!item.Id && tag !== 'D')) {
          await ActionA({ data: item })
          successCount++
        } else if (tag === 'U') {
          await ActionU({ data: item })
          successCount++
        } else if (tag === 'D' && item.Id) {
          await ActionD({ id: item.Id })
          successCount++
        } else if (!tag && !item.Id) {
          await ActionA({ data: item })
          successCount++
        }
      }

      if (setStatusMessage) {
        setStatusMessage(t(`Đã lưu thành công ${successCount} hành động!`))
      }
      await fetchActionData(true)
    } catch (err) {
      console.warn('Save action error:', err)
      if (setStatusMessage) {
        setStatusMessage({
          type: 'error',
          text: err?.message || t('Lỗi khi lưu danh mục hành động!')
        })
      }
    } finally {
      loadingBarRef?.current?.complete?.()
    }
  }, [canCreate, canEdit, gridData, loadingBarRef, setStatusMessage, t, fetchActionData])

  const handleDeleteDataSheet = useCallback(async () => {
    if (!canDelete) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Bạn không có quyền xóa danh mục hành động!')
        })
      }
      return
    }

    const selectedRows = getSelectedRows?.() || []
    if (selectedRows.length === 0) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Vui lòng chọn dòng cần xóa!')
        })
      }
      return
    }

    // Đánh dấu WorkingTag = 'D' trên UI giống các sheet ERP khác
    setGridData((prev) => {
      const selectedSet = new Set(selectedRows)
      return prev.map((row) => {
        if (selectedSet.has(row)) {
          return { ...row, WorkingTag: 'D', Status: 'D' }
        }
        return row
      })
    })

    if (setStatusMessage) {
      setStatusMessage(t('Đã đánh dấu xóa. Nhấn Lưu (Ctrl+S) để hoàn tất.'))
    }
  }, [canDelete, getSelectedRows, setGridData, setStatusMessage, t])

  return {
    actionName,
    setActionName,
    actionKey,
    setActionKey,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    handleResetQuery
  }
}
