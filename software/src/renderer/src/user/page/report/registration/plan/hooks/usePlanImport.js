import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { queryPlanDetail } from '../../services/planRegistrationService'
import { usePageData } from '../../../../../../context/PageDataContext'

export function usePlanImport({
  gridData = [],
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef
}) {
  const { t } = useTranslation()
  const { setStatusMessage, setPageData } = usePageData()
  const [searchValues, setSearchValues] = useState({
    PicDp: '',
    OperationNo: '',
    ItemCode: '',
    RoutingDocNo: '',
    MachineName: '',
    StatusDpSx: '',
    TimeStatus: '',
    CapaStatus: ''
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const originalDataRef = useRef([])

  // Hàm load dữ liệu thực tế từ Database thông qua DataHub API
  const fetchPlanData = useCallback(
    async (filters = {}) => {
      loadingBarRef?.current?.continuousStart?.()
      try {
        const res = await queryPlanDetail(filters)
        const dataList = res?.data || []
        setGridData(dataList)
        setNumRows(dataList.length)
        originalDataRef.current = dataList

        setPageData?.((prev) => ({
          ...prev,
          total: dataList.length,
          totalAll: res?.pageInfo?.totalAll || dataList.length,
          loadedCount: dataList.length,
          totalColumns: 24
        }))

        return dataList
      } catch (err) {
        setGridData([])
        setNumRows(0)
        originalDataRef.current = []
        setPageData?.((prev) => ({
          ...prev,
          total: 0,
          totalAll: 0,
          loadedCount: 0
        }))
        return []
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [loadingBarRef, setGridData, setNumRows, setPageData]
  )

  // Tự động truy vấn từ DB khi khởi tạo giao diện
  useEffect(() => {
    fetchPlanData({})
  }, [fetchPlanData])

  // Search từ Backend DataHub khi bấm TÌM KIẾM
  const handleSearchData = useCallback(async () => {
    const dataList = await fetchPlanData(searchValues)
    if (dataList.length > 0) {
      setStatusMessage?.({
        type: 'success',
        text: `Tìm thấy ${dataList.length.toLocaleString('vi-VN')} bản ghi kế hoạch sản xuất từ hệ thống`
      })
    } else {
      setStatusMessage?.({
        type: 'info',
        text: 'Không tìm thấy dữ liệu kế hoạch sản xuất phù hợp'
      })
    }
  }, [fetchPlanData, searchValues, setStatusMessage])

  const onResetQuery = useCallback(() => {
    const emptyFilters = {
      PicDp: '',
      OperationNo: '',
      ItemCode: '',
      RoutingDocNo: '',
      MachineName: '',
      StatusDpSx: '',
      TimeStatus: '',
      CapaStatus: ''
    }
    setSearchValues(emptyFilters)
    fetchPlanData({})
    setStatusMessage?.({
      type: 'info',
      text: 'Đã đặt lại điều kiện và tải lại dữ liệu'
    })
  }, [fetchPlanData, setStatusMessage])

  const onAddQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => {
      if (prev.includes(fieldKey)) return prev
      return [...prev, fieldKey]
    })
  }, [])

  const onRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((k) => k !== fieldKey))
  }, [])

  const handleRowAppend = useCallback(
    (count = 1) => {
      if (!canCreate) {
        setStatusMessage?.({
          type: 'warning',
          text: 'Bạn không có quyền thêm mới'
        })
        return
      }
      const newRows = Array.from({ length: count }, (_, idx) => ({
        WorkingTag: 'A',
        PicDp: 'Kế hoạch viên',
        OperationNo: `LTT-NEW-${Date.now().toString().slice(-4)}`,
        OpDate: new Date().toISOString().slice(0, 10),
        RoutingDocNo: `LCD-NEW-${Date.now().toString().slice(-4)}`,
        RoutingDocDate: new Date().toISOString().slice(0, 10),
        ItemCode: '',
        ItemName: '',
        OperationName: 'In Offset UV',
        OpTypeName: 'In Offset',
        MachineName: 'Máy In Offset Heidelberg XL-106',
        Unit: 'Chiếc',
        TargetPassQty: 0,
        TargetProdQty: 0,
        StatPassQty: 0,
        StartTime: '07:00',
        EndTime: '15:00',
        StandardProdTime: 8,
        ActualProdTime: 0,
        StandardCapa: 0,
        ActualCapa: 0,
        StatusDpSx: 'Chưa bắt đầu',
        TimeStatus: 'Đúng hạn',
        CapaStatus: 'Đạt capa'
      }))

      setGridData((prev) => [...prev, ...newRows])
      setNumRows((prev) => (prev ?? 0) + count)
      setStatusMessage?.({
        type: 'info',
        text: `Đã thêm ${count} dòng mới`
      })
    },
    [canCreate, setGridData, setNumRows, setStatusMessage]
  )

  const handleSaveData = useCallback(() => {
    if (!canEdit) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Bạn không có quyền chỉnh sửa'
      })
      return
    }
    const modifiedRows = gridData.filter((r) => r.WorkingTag === 'U' || r.WorkingTag === 'A')
    if (modifiedRows.length === 0) {
      setStatusMessage?.({
        type: 'info',
        text: 'Không có thay đổi nào cần lưu'
      })
      return
    }

    loadingBarRef?.current?.continuousStart?.()
    setTimeout(() => {
      const cleanData = gridData.map((r) => ({ ...r, WorkingTag: '' }))
      setGridData(cleanData)
      originalDataRef.current = cleanData
      loadingBarRef?.current?.complete?.()
      setStatusMessage?.({
        type: 'success',
        text: `Đã lưu thành công ${modifiedRows.length} bản ghi`
      })
    }, 400)
  }, [canEdit, gridData, loadingBarRef, setGridData, setStatusMessage])

  const handleDeleteData = useCallback(() => {
    if (!canDelete) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Bạn không có quyền xóa'
      })
      return
    }
    const selected = getSelectedRows?.() || []
    if (selected.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Vui lòng chọn dòng cần xóa'
      })
      return
    }

    const updated = gridData.filter((_, idx) => !selected.includes(idx))
    setGridData(updated)
    setNumRows(updated.length)
    setStatusMessage?.({
      type: 'success',
      text: `Đã xóa ${selected.length} dòng được chọn`
    })
  }, [canDelete, getSelectedRows, gridData, setGridData, setNumRows, setStatusMessage])

  const handleExportExcel = useCallback(() => {
    if (!gridData || gridData.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Không có dữ liệu để xuất'
      })
      return
    }
    try {
      const exportData = gridData.map((row) => {
        const copy = { ...row }
        delete copy.WorkingTag
        return copy
      })
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'DangKy_KeHoach_SX')
      XLSX.writeFile(wb, `DangKy_KeHoach_SX_${new Date().toISOString().slice(0, 10)}.xlsx`)
      setStatusMessage?.({
        type: 'success',
        text: 'Đã xuất file Excel thành công'
      })
    } catch (err) {
      setStatusMessage?.({
        type: 'error',
        text: 'Xuất Excel thất bại: ' + (err?.message || err)
      })
    }
  }, [gridData, setStatusMessage])

  return {
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleSearchData,
    onResetQuery,
    onAddQueryField,
    onRemoveQueryField,
    handleRowAppend,
    handleSaveData,
    handleDeleteData,
    handleExportExcel
  }
}
