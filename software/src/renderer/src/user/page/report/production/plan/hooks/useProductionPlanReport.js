import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { message, notification } from 'antd'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { initialHanoiGs1Plans, initialQuevoGs5Plans } from '../../../common/reportUtils'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../../utils/exportExcelUtils'

export function useProductionPlanReport({
  plantKey = 'hanoi_gs1',
  gridData = [],
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef,
  controllers
}) {
  const { t } = useTranslation()
  const [searchValues, setSearchValues] = useState({
    plantKey: plantKey || '',
    OpDate: [],
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

  // Nạp dữ liệu ban đầu theo nhà máy
  useEffect(() => {
    const rawData = plantKey === 'quevo_gs5' ? initialQuevoGs5Plans : initialHanoiGs1Plans
    const formatted = rawData.map((r, i) => {
      const targetPass = r.TargetPassQty || r.requiredQty || 200000
      const targetProd = r.TargetProdQty || Math.round(targetPass * 1.02)
      const statPass = r.StatPassQty || r.completedQty || 48200
      const stdProdTime = r.StandardProdTime || 7.5
      const actualProdTime = r.ActualProdTime || 6.8
      const stdCapa = r.StandardCapa || 26000
      const actualCapa = r.ActualCapa || 29000

      return {
        ...r,
        WorkingTag: '',
        PicDp: r.PicDp || (i % 2 === 0 ? 'Nguyễn Văn Hùng' : 'Trần Đình Trọng'),
        OperationNo: r.OperationNo || r.operationNo || r.docNo || `LTT-DP-2026-${100 + i}`,
        OpDate: r.OpDate || r.startDate || '2026-09-28',
        RoutingDocNo: r.RoutingDocNo || r.routingDocNo || `LCD-2026-${200 + i}`,
        RoutingDocDate: r.RoutingDocDate || r.startDate || '2026-09-27',
        ItemCode: r.ItemCode || r.itemCode || `SP-${i + 1}`,
        ItemName: r.ItemName || r.itemName || 'Sản phẩm bao bì chất lượng cao',
        OperationName:
          r.OperationName || (i % 2 === 0 ? 'In Offset UV 6 Màu' : 'Bế Tự Động Định Hình'),
        OpTypeName: r.OpTypeName || (i % 2 === 0 ? 'In Offset' : 'Bế Hộp'),
        MachineName:
          r.MachineName ||
          (i % 2 === 0 ? 'Máy In Offset Heidelberg XL-106' : 'Máy Bế Bobst Novacut 106'),
        Unit: r.Unit || r.unit || 'Chiếc',
        TargetPassQty: targetPass,
        TargetProdQty: targetProd,
        StatPassQty: statPass,
        StartTime: r.StartTime || '07:00',
        EndTime: r.EndTime || '15:30',
        StandardProdTime: stdProdTime,
        ActualProdTime: actualProdTime,
        StandardCapa: stdCapa,
        ActualCapa: actualCapa,
        StatusDpSx:
          r.StatusDpSx || r.status || (statPass >= targetPass ? 'Hoàn thành' : 'Đang sản xuất'),
        TimeStatus:
          r.TimeStatus || (actualProdTime <= stdProdTime ? 'Đúng hạn' : 'Vượt giờ định mức'),
        CapaStatus: r.CapaStatus || (actualCapa >= stdCapa ? 'Đạt capa' : 'Không đạt capa')
      }
    })

    originalDataRef.current = formatted
    setGridData(formatted)
    setNumRows(formatted.length)
  }, [plantKey, setGridData, setNumRows])

  // KPIs
  const kpiStats = useMemo(() => {
    const totalRecords = gridData.length
    const totalTargetProd = gridData.reduce((acc, row) => acc + (Number(row.TargetProdQty) || 0), 0)
    const totalStatPass = gridData.reduce((acc, row) => acc + (Number(row.StatPassQty) || 0), 0)
    const avgProgress =
      totalTargetProd > 0 ? ((totalStatPass / totalTargetProd) * 100).toFixed(2) : '0.00'

    return {
      totalRecords,
      totalTargetProd,
      totalStatPass,
      avgProgress
    }
  }, [gridData])

  // Tìm kiếm dữ liệu
  const handleSearchData = useCallback(() => {
    loadingBarRef?.current?.continuousStart?.()
    setTimeout(() => {
      let filtered = [...originalDataRef.current]

      if (searchValues.PicDp) {
        filtered = filtered.filter((r) =>
          String(r.PicDp || '')
            .toLowerCase()
            .includes(searchValues.PicDp.toLowerCase())
        )
      }
      if (searchValues.OperationNo) {
        filtered = filtered.filter((r) =>
          String(r.OperationNo || '')
            .toLowerCase()
            .includes(searchValues.OperationNo.toLowerCase())
        )
      }
      if (searchValues.ItemCode) {
        filtered = filtered.filter((r) =>
          String(r.ItemCode || '')
            .toLowerCase()
            .includes(searchValues.ItemCode.toLowerCase())
        )
      }
      if (searchValues.RoutingDocNo) {
        filtered = filtered.filter((r) =>
          String(r.RoutingDocNo || '')
            .toLowerCase()
            .includes(searchValues.RoutingDocNo.toLowerCase())
        )
      }
      if (searchValues.StatusDpSx) {
        filtered = filtered.filter((r) => String(r.StatusDpSx || '') === searchValues.StatusDpSx)
      }
      if (searchValues.TimeStatus) {
        filtered = filtered.filter((r) => String(r.TimeStatus || '') === searchValues.TimeStatus)
      }
      if (searchValues.CapaStatus) {
        filtered = filtered.filter((r) => String(r.CapaStatus || '') === searchValues.CapaStatus)
      }

      setGridData(filtered)
      setNumRows(filtered.length)
      loadingBarRef?.current?.complete?.()
      message.success(t('Tìm thấy {{count}} bản ghi kế hoạch', { count: filtered.length }))
    }, 200)
  }, [searchValues, loadingBarRef, setGridData, setNumRows, t])

  const onResetQuery = useCallback(() => {
    setSearchValues({
      plantKey: plantKey || '',
      OpDate: [],
      PicDp: '',
      OperationNo: '',
      ItemCode: '',
      RoutingDocNo: '',
      MachineName: '',
      StatusDpSx: '',
      TimeStatus: '',
      CapaStatus: ''
    })
    setGridData(originalDataRef.current)
    setNumRows(originalDataRef.current.length)
    message.info(t('Đã đặt lại điều kiện tìm kiếm'))
  }, [plantKey, setGridData, setNumRows, t])

  const onAddQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => {
      if (prev.includes(fieldKey)) return prev
      return [...prev, fieldKey]
    })
  }, [])

  const onRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((k) => k !== fieldKey))
  }, [])

  // Thêm dòng mới
  const handleRowAppend = useCallback(
    (count = 1) => {
      if (!canCreate) {
        notification.warning({ message: t('Bạn không có quyền thêm mới') })
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
      message.info(t('Đã thêm dòng mới'))
    },
    [canCreate, setGridData, setNumRows, t]
  )

  // Lưu dữ liệu
  const handleSaveData = useCallback(() => {
    if (!canEdit) {
      notification.warning({ message: t('Bạn không có quyền chỉnh sửa dữ liệu') })
      return
    }
    const modifiedRows = gridData.filter((r) => r.WorkingTag === 'U' || r.WorkingTag === 'A')
    if (modifiedRows.length === 0) {
      message.info(t('Không có thay đổi nào cần lưu'))
      return
    }

    loadingBarRef?.current?.continuousStart?.()
    setTimeout(() => {
      const cleanData = gridData.map((r) => ({ ...r, WorkingTag: '' }))
      setGridData(cleanData)
      originalDataRef.current = cleanData
      loadingBarRef?.current?.complete?.()
      message.success(t('Đã lưu thành công {{count}} bản ghi', { count: modifiedRows.length }))
    }, 400)
  }, [canEdit, gridData, loadingBarRef, setGridData, t])

  // Xóa dòng
  const handleDeleteData = useCallback(() => {
    if (!canDelete) {
      notification.warning({ message: t('Bạn không có quyền xóa dữ liệu') })
      return
    }
    const selected = getSelectedRows?.() || []
    if (selected.length === 0) {
      message.warning(t('Vui lòng chọn dòng cần xóa'))
      return
    }

    const updated = gridData.filter((_, idx) => !selected.includes(idx))
    setGridData(updated)
    setNumRows(updated.length)
    message.success(t('Đã xóa {{count}} dòng được chọn', { count: selected.length }))
  }, [canDelete, getSelectedRows, gridData, setGridData, setNumRows, t])

  // ── Quản lý Modal Xuất Excel ──
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const handleOpenExportModal = useCallback(() => {
    if (!gridData || gridData.length === 0) {
      message.warning(t('Không có dữ liệu để xuất'))
      return
    }
    setIsExportModalOpen(true)
  }, [gridData, t])

  const executeExportPlanExcel = useCallback(
    async ({
      fileName,
      saveDirectory,
      overwriteExisting,
      includeHeaders,
      exportScope = 'all',
      exportableCols
    }) => {
      try {
        const selectedIndices = getSelectedRows?.() || []
        let targetData = gridData
        if (exportScope === 'selected' && selectedIndices.length > 0) {
          targetData = selectedIndices.map((idx) => gridData[idx]).filter(Boolean)
        }

        const plantDisplayName = plantKey === 'quevo_gs5' ? 'GS5 Quế Võ' : 'GS1 Hà Nội'
        const reportTitle = `BÁO CÁO KẾ HOẠCH SẢN XUẤT - ${plantDisplayName.toUpperCase()}`
        const filterSummary = formatFilterSummary(searchValues)

        const defaultColsToExport = [
          { id: 'OpDate', name: 'Ngày KH', width: 110, group: 'Thông tin chung' },
          { id: 'PicDp', name: 'Người ĐP', width: 140, group: 'Thông tin chung' },
          { id: 'OperationNo', name: 'Mã Lệnh ĐP', width: 150, group: 'Lệnh sản xuất' },
          { id: 'RoutingDocNo', name: 'Số Lệnh Công Đoạn', width: 150, group: 'Lệnh sản xuất' },
          { id: 'ItemCode', name: 'Mã Sản Phẩm', width: 130, group: 'Sản phẩm' },
          { id: 'ItemName', name: 'Tên Sản Phẩm', width: 220, group: 'Sản phẩm' },
          { id: 'OperationName', name: 'Công Đoạn', width: 160, group: 'Công đoạn & Máy' },
          { id: 'MachineName', name: 'Thiết Bị / Máy', width: 200, group: 'Công đoạn & Máy' },
          { id: 'Unit', name: 'ĐVT', width: 80, group: 'Sản lượng' },
          { id: 'TargetPassQty', name: 'SL Đạt KH', width: 110, group: 'Sản lượng' },
          { id: 'TargetProdQty', name: 'SL Tổng KH', width: 110, group: 'Sản lượng' },
          { id: 'StatPassQty', name: 'SL Thực Đạt', width: 110, group: 'Sản lượng' },
          { id: 'StartTime', name: 'Bắt Đầu', width: 90, group: 'Thời gian & Tiến độ' },
          { id: 'EndTime', name: 'Kết Thúc', width: 90, group: 'Thời gian & Tiến độ' },
          { id: 'StandardProdTime', name: 'Giờ ĐM (h)', width: 100, group: 'Thời gian & Tiến độ' },
          { id: 'ActualProdTime', name: 'Giờ TT (h)', width: 100, group: 'Thời gian & Tiến độ' },
          { id: 'StandardCapa', name: 'Capa ĐM', width: 100, group: 'Năng lực sản xuất' },
          { id: 'ActualCapa', name: 'Capa TT', width: 100, group: 'Năng lực sản xuất' },
          { id: 'StatusDpSx', name: 'Trạng Thái ĐP', width: 130, group: 'Đánh giá' },
          { id: 'TimeStatus', name: 'Tiến Độ Thời Gian', width: 130, group: 'Đánh giá' },
          { id: 'CapaStatus', name: 'Đánh Giá Capa', width: 130, group: 'Đánh giá' }
        ]

        const validCols = exportableCols || defaultColsToExport

        const wb = generateExcelWorkbook({
          data: targetData,
          columns: validCols,
          sheetName: 'KeHoachSanXuat',
          reportTitle,
          filterInfo: filterSummary,
          includeHeaders: includeHeaders !== false
        })

        await saveWorkbookToFile(wb, fileName, saveDirectory, { overwriteExisting })
        message.success(t('Xuất dữ liệu Excel thành công!'))
      } catch (err) {
        console.error('Export Excel failed:', err)
        message.error(t('Xuất file thất bại: ') + (err?.message || 'Lỗi không xác định'))
        throw err
      }
    },
    [gridData, getSelectedRows, plantKey, searchValues, t]
  )

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
    handleExportExcel: handleOpenExportModal,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportPlanExcel,
    kpiStats
  }
}
