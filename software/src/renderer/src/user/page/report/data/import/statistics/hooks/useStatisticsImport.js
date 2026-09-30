import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { queryProdStatsDetail } from '../../services/planRegistrationService'
import { usePageData } from '../../../../../../../context/PageDataContext'

export function useStatisticsImport({
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
    OperationNo: '',
    ItemCode: '',
    MachineCode: '',
    TeamName: '',
    Shift: '',
    Customer: '',
    Status: ''
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const originalDataRef = useRef([])

  // Hàm load dữ liệu thực tế từ Database thông qua DataHub API
  const fetchStatsData = useCallback(
    async (filters = {}) => {
      loadingBarRef?.current?.continuousStart?.()
      try {
        const res = await queryProdStatsDetail(filters)
        const dataList = res?.data || []
        setGridData(dataList)
        setNumRows(dataList.length)
        originalDataRef.current = dataList

        setPageData?.((prev) => ({
          ...prev,
          total: dataList.length,
          totalAll: res?.pageInfo?.totalAll || dataList.length,
          loadedCount: dataList.length,
          totalColumns: 65
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
    fetchStatsData({})
  }, [fetchStatsData])

  // Search từ Backend DataHub khi bấm TÌM KIẾM
  const handleSearchData = useCallback(async () => {
    const dataList = await fetchStatsData(searchValues)
    if (dataList.length > 0) {
      setStatusMessage?.({
        type: 'success',
        text: `Tìm thấy ${dataList.length.toLocaleString('vi-VN')} bản ghi thống kê sản xuất từ hệ thống`
      })
    } else {
      setStatusMessage?.({
        type: 'info',
        text: 'Không tìm thấy dữ liệu thống kê sản xuất phù hợp'
      })
    }
  }, [fetchStatsData, searchValues, setStatusMessage])

  const onResetQuery = useCallback(() => {
    const emptyFilters = {
      OperationNo: '',
      ItemCode: '',
      MachineCode: '',
      TeamName: '',
      Shift: '',
      Customer: '',
      Status: ''
    }
    setSearchValues(emptyFilters)
    fetchStatsData({})
    setStatusMessage?.({
      type: 'info',
      text: 'Đã đặt lại điều kiện và tải lại dữ liệu'
    })
  }, [fetchStatsData, setStatusMessage])

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
        ItemCode: '',
        ItemName: '',
        Version: 'v1.0',
        Model: '',
        DefectMarginWeight: 0,
        TechMarginWeight: 0,
        OperationNo: `LSX-NEW-${Date.now().toString().slice(-4)}`,
        MainWorker: '',
        SubWorker1: '',
        SubWorker2: '',
        BreakdownReason: '',
        MachineCode: '',
        MachineName: '',
        OpTypeCode: '',
        OpTypeName: '',
        UvPlate: 'Không',
        MoldSetQty1: 0,
        MoldSetQty2: 0,
        MoldSetQty3: 0,
        ProdQty: 0,
        PassQty: 0,
        ActualMeters: 0,
        StandardMeters: 0,
        TeamName: '',
        Shift: 'Ca 1',
        StartDate: new Date().toISOString().slice(0, 10),
        StartTime: '07:00',
        EndDate: new Date().toISOString().slice(0, 10),
        EndTime: '15:00',
        StatDate: new Date().toISOString().slice(0, 10),
        StatTicketNo: `PTK-${Date.now().toString().slice(-5)}`,
        StatStaff: '',
        Customer: '',
        SalesStaff: '',
        OrderNo: '',
        ProcessName: '',
        Unit: 'Chiếc',
        ConvUnit: '',
        ProcessSpec: '',
        PartNo: '',
        CorrugatedPartNo: '',
        TrimPartNo: '',
        ColorQty: 0,
        OutPlateType: '',
        FrontColors: 0,
        BackColors: 0,
        JobNumber: '',
        Width: 0,
        Length: 0,
        Height: 0,
        ProductLine: '',
        RawWidth: 0,
        RawLength: 0,
        RawLineCode: '',
        RawLineName: '',
        FlipType: '',
        BomPlates: 0,
        Coating: '',
        SlitterBlades: 0,
        CodePositions: 0,
        PunchHoles: 0,
        StructureCode: '',
        StructureName: '',
        RoutingDocNo: '',
        RoutingDate: '',
        ReleaseDate: '',
        TargetPassQty: 0,
        TargetProdQty: 0,
        RoutingUnit: 'Chiếc',
        BreakdownMinutes: 0,
        WaitingMaterialMinutes: 0,
        SetupMinutes: 0,
        RepairMinutes: 0,
        TotalWasteMinutes: 0,
        RigidBoxGlue: 'Không',
        Outsourcing: 'Không',
        DefectQty: 0,
        DefectRate: '0.00%',
        DefectUnit: 'Chiếc',
        Status: 'Đang sản xuất',
        AutoExport: true,
        AutoImport: true,
        ExportDocNo: '',
        ImportDocNo: '',
        WrongOpCode: false,
        IsAdditionalStat: false,
        TicketCreatedDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
        ActualRunTime: 0,
        ActualCapa: 0,
        CheckPlanStatus: 'Bình thường',
        MesApprovalTime: '',
        SyncDelayMinutes: 0,
        IsDuplicateTicket: false,
        TicketCreationLocation: 'MES Client',
        AutoIoStatus: 'Chờ xử lý'
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
      XLSX.utils.book_append_sheet(wb, ws, 'DangKy_ThongKe_SX')
      XLSX.writeFile(wb, `DangKy_ThongKe_SX_${new Date().toISOString().slice(0, 10)}.xlsx`)
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
