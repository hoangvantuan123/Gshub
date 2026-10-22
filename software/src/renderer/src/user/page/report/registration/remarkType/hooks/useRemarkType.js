import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../../context/PageDataContext'
import { updateIndexNo } from '../../../../../components/sheet/js/updateIndexNo'
import { generateEmptyData } from '../../../../../components/sheet/js/generateEmptyData'
import {
  createProdStatsRemarkTypes,
  deleteProdStatsRemarkTypes,
  queryProdStatsRemarkTypes,
  updateProdStatsRemarkTypes
} from '../remarkTypeService'

export const EMPTY_TEMPLATE_COUNT = 50

const hasBusinessData = (row) =>
  Boolean(String(row?.TypeCode || '').trim() || String(row?.TypeName || '').trim())

export function useRemarkType({
  gridData,
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  defaultCols,
  canCreate,
  canEdit,
  canSave,
  canView,
  canSearch,
  canDelete,
  loadingBarRef
}) {
  const { t } = useTranslation()
  const { setPageData, setStatusMessage } = usePageData() || {}
  const [filters, setFilters] = useState({ Keyword: '', IsActive: '' })
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const fetchRows = useCallback(async () => {
    if (!canView) return
    loadingBarRef?.current?.continuousStart?.()
    try {
      const params = { page: 1, pageSize: 1000 }
      const keyword = String(filters.Keyword || '').trim()
      if (keyword) params.Keyword = keyword
      if (filters.IsActive !== '') params.IsActive = filters.IsActive

      const result = await queryProdStatsRemarkTypes(params)
      if (!result?.success) {
        setStatusMessage?.({
          type: 'error',
          text: result?.message || t('Không thể tải danh sách phân loại lỗi')
        })
        if (canCreate) {
          const emptyRows = generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultCols || [])
          const finalRows = updateIndexNo(emptyRows)
          setGridData(finalRows)
          setNumRows(finalRows.length)
        } else {
          setGridData([])
          setNumRows(0)
        }
        return
      }

      const records = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.items)
          ? result.data.items
          : []
      const rows = records.map((item, index) => ({
        ...item,
        IdSeq: item.IdSeq ?? item.Id ?? '',
        Id: item.Id ?? item.IdSeq ?? '',
        IdxNo: Number(item.IdxNo ?? index + 1),
        RowVersion: Number(item.RowVersion || 1),
        TypeCode: item.TypeCode || '',
        TypeName: item.TypeName || '',
        Description: item.Description || '',
        IsActive: item.IsActive !== false && item.IsActive !== 0 && item.IsActive !== '0',
        CreatedByName: item.CreatedByName || item.CreatedBy || '',
        UpdatedByName: item.UpdatedByName || item.UpdatedBy || '',
        WorkingTag: '',
        Status: ''
      }))

      let finalRows = rows
      if (canCreate) {
        const emptyRows = generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultCols || [])
        finalRows = [...rows, ...emptyRows]
      }

      finalRows = updateIndexNo(finalRows)
      setGridData(finalRows)
      setNumRows(finalRows.length)
      resetTable?.()
      const pageInfo = result.pageInfo || result.page || {}
      const total = Number(pageInfo.total || pageInfo.totalRows || rows.length)
      setPageData?.({
        page: Number(pageInfo.page || 1),
        pageSize: Number(pageInfo.pageSize || 1000),
        totalRows: total,
        total,
        totalPages: Number(pageInfo.totalPages || 1),
        totalAll: Number(pageInfo.totalAll || total),
        loadedCount: rows.length,
        totalColumns: defaultCols?.length || 11
      })
      setStatusMessage?.(t('Đã tải {{count}} phân loại lỗi.', { count: rows.length }))
    } catch (error) {
      setStatusMessage?.({
        type: 'error',
        text: error?.message || t('Lỗi khi tải danh sách phân loại lỗi')
      })
    } finally {
      loadingBarRef?.current?.complete?.()
    }
  }, [
    canView,
    canCreate,
    filters,
    loadingBarRef,
    setGridData,
    setNumRows,
    resetTable,
    setPageData,
    setStatusMessage,
    defaultCols,
    t
  ])

  const hasChanges = useCallback(
    () =>
      (gridData || []).some((row) => {
        const tag = row?.WorkingTag || row?.Status
        return tag === 'U' || tag === 'D' || (tag === 'A' && hasBusinessData(row))
      }),
    [gridData]
  )

  const handleSearchData = useCallback(() => {
    if (!canView || canSearch === false) {
      setStatusMessage?.({
        type: 'warning',
        text: t('Bạn không có quyền tìm kiếm hoặc xem dữ liệu!')
      })
      return
    }
    if (hasChanges()) {
      setShowConfirmModal(true)
      return
    }
    fetchRows()
  }, [canView, canSearch, setStatusMessage, t, hasChanges, fetchRows])

  const handleConfirmSearch = useCallback(() => {
    setShowConfirmModal(false)
    fetchRows()
  }, [fetchRows])

  const handleCancelSearch = useCallback(() => setShowConfirmModal(false), [])

  const handleDeleteDataSheet = useCallback(() => {
    if (!canDelete) {
      setStatusMessage?.({ type: 'warning', text: t('Bạn không có quyền xóa dữ liệu!') })
      return
    }
    const selected = getSelectedRows?.() || []
    if (!selected.length) {
      setStatusMessage?.({ type: 'warning', text: t('Vui lòng chọn dòng cần xóa!') })
      return
    }
    const selectedRows = new Set(selected)
    const localRows = selected.filter((row) => !row.IdSeq)
    setGridData((prev) =>
      prev
        .filter((row) => !localRows.includes(row))
        .map((row) => (selectedRows.has(row) ? { ...row, WorkingTag: 'D', Status: 'D' } : row))
    )
    if (localRows.length) setNumRows((count) => Math.max(0, count - localRows.length))
    resetTable?.()
    setStatusMessage?.(
      localRows.length
        ? t('Đã xóa dòng mới và đánh dấu xóa dữ liệu đã lưu. Nhấn Lưu để hoàn tất.')
        : t('Đã đánh dấu xóa. Nhấn Lưu để hoàn tất.')
    )
  }, [canDelete, getSelectedRows, setGridData, setNumRows, resetTable, setStatusMessage, t])

  const handleSaveData = useCallback(async () => {
    if (!canSave) {
      setStatusMessage?.({ type: 'warning', text: t('Bạn không có quyền lưu dữ liệu!') })
      return
    }
    const rows = gridData || []
    const additions = rows.filter(
      (row) => (row.WorkingTag || row.Status) === 'A' && hasBusinessData(row)
    )
    const updates = rows.filter((row) => (row.WorkingTag || row.Status) === 'U')
    const deletions = rows.filter((row) => (row.WorkingTag || row.Status) === 'D' && row.IdSeq)

    if (additions.length > 0 && !canCreate) {
      setStatusMessage?.({ type: 'warning', text: t('Bạn không có quyền thêm mới dữ liệu!') })
      return
    }
    if (updates.length > 0 && !canEdit) {
      setStatusMessage?.({ type: 'warning', text: t('Bạn không có quyền chỉnh sửa dữ liệu!') })
      return
    }
    if (deletions.length > 0 && !canDelete) {
      setStatusMessage?.({ type: 'warning', text: t('Bạn không có quyền xóa dữ liệu!') })
      return
    }
    const changed = [...additions, ...updates]
    for (let index = 0; index < changed.length; index++) {
      const row = changed[index]
      if (!String(row.TypeCode || '').trim() || !String(row.TypeName || '').trim()) {
        setStatusMessage?.({
          type: 'error',
          text: t('Dòng {{row}} cần có Mã phân loại và Tên phân loại.', {
            row: row.IdxNo || index + 1
          })
        })
        return
      }
    }
    if (!additions.length && !updates.length && !deletions.length) {
      setStatusMessage?.(t('Không có thay đổi cần lưu.'))
      return
    }

    loadingBarRef?.current?.continuousStart?.()
    try {
      const normalize = (row) => ({
        IdSeq: row.IdSeq || undefined,
        IdxNo: Number(row.IdxNo || 0),
        TypeCode: String(row.TypeCode || '').trim(),
        TypeName: String(row.TypeName || '').trim(),
        Description: String(row.Description || '').trim() || null,
        IsActive: Boolean(row.IsActive),
        RowVersion: Number(row.RowVersion || 1)
      })
      const assertSuccess = (response) => {
        if (!response?.success)
          throw new Error(response?.message || t('Lưu dữ liệu không thành công'))
      }
      if (additions.length)
        assertSuccess(await createProdStatsRemarkTypes(additions.map(normalize)))
      if (updates.length) assertSuccess(await updateProdStatsRemarkTypes(updates.map(normalize)))
      if (deletions.length) {
        assertSuccess(
          await deleteProdStatsRemarkTypes(
            deletions.map((row) => ({ IdSeq: row.IdSeq, RowVersion: Number(row.RowVersion || 1) }))
          )
        )
      }
      setStatusMessage?.(t('Đã lưu thay đổi phân loại lỗi thành công.'))
      await fetchRows()
    } catch (error) {
      setStatusMessage?.({ type: 'error', text: error?.message || t('Lỗi khi lưu phân loại lỗi') })
    } finally {
      loadingBarRef?.current?.complete?.()
    }
  }, [
    canSave,
    canCreate,
    canEdit,
    canDelete,
    gridData,
    setStatusMessage,
    t,
    loadingBarRef,
    fetchRows
  ])

  return {
    filters,
    setFilters,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch
  }
}
