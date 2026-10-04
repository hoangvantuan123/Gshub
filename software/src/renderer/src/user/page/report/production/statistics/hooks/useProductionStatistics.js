import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { message, notification } from 'antd'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { initialHanoiGs1Stats, initialQuevoGs5Stats } from '../../../common/reportUtils'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../../../utils/exportExcelUtils'

export function useProductionStatistics({
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
    StatDate: [],
    OperationNo: '',
    ItemCode: '',
    MachineCode: '',
    TeamName: '',
    Shift: '',
    Customer: '',
    Status: ''
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const originalDataRef = useRef([])

  // Nạp dữ liệu ban đầu theo nhà máy
  useEffect(() => {
    const rawData = plantKey === 'quevo_gs5' ? initialQuevoGs5Stats : initialHanoiGs1Stats
    const formatted = rawData.map((r, i) => ({
      ...r,
      WorkingTag: '',
      ItemCode: r.ItemCode || r.itemCode || `SP-${i + 1}`,
      ItemName: r.ItemName || r.itemName || 'Sản phẩm bao bì',
      Version: r.Version || r.version || 'v1.0',
      Model: r.Model || r.model || 'Goldsun Box',
      DefectMarginWeight: r.DefectMarginWeight || r.defectMarginWeight || 0.15,
      TechMarginWeight: r.TechMarginWeight || r.techMarginWeight || 0.25,
      OperationNo: r.OperationNo || r.operationNo || r.docNo || `LSX-${i + 100}`,
      MainWorker: r.MainWorker || r.mainWorker || r.supervisor || 'Nguyễn Văn Hùng',
      SubWorker1: r.SubWorker1 || r.subWorker1 || 'Trần Văn A',
      SubWorker2: r.SubWorker2 || r.subWorker2 || 'Lê Văn B',
      BreakdownReason: r.BreakdownReason || r.breakdownReason || '',
      MachineCode: r.MachineCode || r.machineCode || 'OFFSET-01',
      MachineName: r.MachineName || r.machineName || 'Máy In Offset Heidelberg XL-106',
      OpTypeCode: r.OpTypeCode || r.opTypeCode || 'OP_IN',
      OpTypeName: r.OpTypeName || r.opTypeName || 'In Offset UV',
      UvPlate: r.UvPlate || r.uvPlate || 'Có',
      MoldSetQty1: r.MoldSetQty1 ?? r.moldSetQty1 ?? 1,
      MoldSetQty2: r.MoldSetQty2 ?? r.moldSetQty2 ?? 0,
      MoldSetQty3: r.MoldSetQty3 ?? r.moldSetQty3 ?? 0,
      ProdQty: r.ProdQty || r.prodQty || r.actualQty || 25000,
      PassQty: r.PassQty || r.passQty || 24850,
      ActualMeters: r.ActualMeters || r.actualMeters || 12500,
      StandardMeters: r.StandardMeters || r.standardMeters || 12000,
      TeamName: r.TeamName || r.teamName || r.team || 'Tổ In Offset',
      Shift: r.Shift || r.shift || 'Ca 1',
      StartDate: r.StartDate || r.startDate || r.prodDate || '2026-09-28',
      StartTime: r.StartTime || r.startTime || '07:00',
      EndDate: r.EndDate || r.endDate || r.prodDate || '2026-09-28',
      EndTime: r.EndTime || r.endTime || '15:00',
      StatDate: r.StatDate || r.statDate || r.prodDate || '2026-09-28',
      StatTicketNo: r.StatTicketNo || r.statTicketNo || r.ticketNo || `PTK-${i + 101}`,
      StatStaff: r.StatStaff || r.statStaff || r.supervisor || 'Nguyễn Văn Hùng',
      Customer: r.Customer || r.customer || 'Samsung Electronics VN',
      SalesStaff: r.SalesStaff || r.salesStaff || 'Trần Thị Mai',
      OrderNo: r.OrderNo || r.orderNo || `SO-2026-${i + 500}`,
      ProcessName: r.ProcessName || r.processName || 'In Offset',
      Unit: r.Unit || r.unit || 'Chiếc',
      ConvUnit: r.ConvUnit || r.convUnit || 'Hộp',
      ProcessSpec: r.ProcessSpec || r.processSpec || 'QTCN-01',
      PartNo: r.PartNo || r.partNo || '1/2',
      CorrugatedPartNo: r.CorrugatedPartNo || r.corrugatedPartNo || '',
      TrimPartNo: r.TrimPartNo || r.trimPartNo || '4',
      ColorQty: r.ColorQty || r.colorQty || 6,
      OutPlateType: r.OutPlateType || r.outPlateType || 'CTP UV',
      FrontColors: r.FrontColors || r.frontColors || 6,
      BackColors: r.BackColors || r.backColors || 0,
      JobNumber: r.JobNumber || r.jobNumber || `JOB-${i + 1}`,
      Width: r.Width || r.width || 720,
      Length: r.Length || r.length || 1020,
      Height: r.Height || r.height || 85,
      ProductLine: r.ProductLine || r.productLine || 'Bao bì xuất khẩu',
      RawWidth: r.RawWidth || r.rawWidth || 740,
      RawLength: r.RawLength || r.rawLength || 1040,
      RawLineCode: r.RawLineCode || r.rawLineCode || 'NVL-IVORY-350',
      RawLineName: r.RawLineName || r.rawLineName || 'Giấy Ivory 350gsm',
      FlipType: r.FlipType || r.flipType || 'Trở đầu đuôi',
      BomPlates: r.BomPlates || r.bomPlates || 6,
      Coating: r.Coating || r.coating || 'Phủ UV bóng',
      SlitterBlades: r.SlitterBlades || r.slitterBlades || 2,
      CodePositions: r.CodePositions || r.codePositions || 1,
      PunchHoles: r.PunchHoles || r.punchHoles || 0,
      StructureCode: r.StructureCode || r.structureCode || 'KC-HOP-KHOA-DAY',
      StructureName: r.StructureName || r.structureName || 'Hộp khóa đáy nắp gài',
      RoutingDocNo: r.RoutingDocNo || r.routingDocNo || `LCD-${i + 10}`,
      RoutingDate: r.RoutingDate || r.routingDate || '2026-09-27',
      ReleaseDate: r.ReleaseDate || r.releaseDate || '2026-09-27',
      TargetPassQty: r.TargetPassQty || r.targetPassQty || 25000,
      TargetProdQty: r.TargetProdQty || r.targetProdQty || 25200,
      RoutingUnit: r.RoutingUnit || r.routingUnit || 'Chiếc',
      BreakdownMinutes: r.BreakdownMinutes || r.breakdownMinutes || 0,
      WaitingMaterialMinutes: r.WaitingMaterialMinutes || r.waitingMaterialMinutes || 15,
      SetupMinutes: r.SetupMinutes || r.setupMinutes || 30,
      RepairMinutes: r.RepairMinutes || r.repairMinutes || 0,
      TotalWasteMinutes:
        (r.BreakdownMinutes || r.breakdownMinutes || 0) +
        (r.WaitingMaterialMinutes || r.waitingMaterialMinutes || 15) +
        (r.SetupMinutes || r.setupMinutes || 30) +
        (r.RepairMinutes || r.repairMinutes || 0),
      RigidBoxGlue: r.RigidBoxGlue || r.rigidBoxGlue || 'Không',
      Outsourcing: r.Outsourcing || r.outsourcing || 'Không',
      DefectQty: r.DefectQty || r.defectQty || 150,
      DefectRate: `${(((r.DefectQty || r.defectQty || 150) / (r.ProdQty || r.prodQty || r.actualQty || 25000)) * 100).toFixed(2)}%`,
      DefectUnit: r.DefectUnit || r.defectUnit || 'Chiếc',
      Status: r.Status || r.status || 'Hoàn thành',
      AutoExport: r.AutoExport ?? r.autoExport ?? true,
      AutoImport: r.AutoImport ?? r.autoImport ?? true,
      ExportDocNo: r.ExportDocNo || r.exportDocNo || `PXK-${i + 101}`,
      ImportDocNo: r.ImportDocNo || r.importDocNo || `PNK-${i + 101}`,
      WrongOpCode: r.WrongOpCode ?? r.wrongOpCode ?? false,
      IsAdditionalStat: r.IsAdditionalStat ?? r.isAdditionalStat ?? false,
      TicketCreatedDate: r.TicketCreatedDate || r.ticketCreatedDate || '2026-09-28 08:00',
      ActualRunTime: r.ActualRunTime || r.actualRunTime || r.runtimeHours || 7.5,
      ActualCapa: r.ActualCapa || r.actualCapa || 3300,
      CheckPlanStatus: r.CheckPlanStatus || r.checkPlanStatus || 'Đạt tiến độ',
      MesApprovalTime: r.MesApprovalTime || r.mesApprovalTime || '2026-09-28 08:05',
      SyncDelayMinutes: r.SyncDelayMinutes || r.syncDelayMinutes || 2.5,
      IsDuplicateTicket: r.IsDuplicateTicket ?? r.isDuplicateTicket ?? r.isDuplicate ?? false,
      TicketCreationLocation:
        r.TicketCreationLocation || r.ticketCreationLocation || 'MES Client GS1',
      AutoIoStatus: r.AutoIoStatus || r.autoIoStatus || 'Đã sinh tự động'
    }))

    originalDataRef.current = formatted
    setGridData(formatted)
    setNumRows(formatted.length)
  }, [plantKey, setGridData, setNumRows])

  // KPIs
  const kpiStats = useMemo(() => {
    const totalRecords = gridData.length
    const totalProd = gridData.reduce(
      (acc, row) => acc + (Number(row.ProdQty || row.prodQty) || 0),
      0
    )
    const totalPass = gridData.reduce(
      (acc, row) => acc + (Number(row.PassQty || row.passQty) || 0),
      0
    )
    const totalDefect = gridData.reduce(
      (acc, row) => acc + (Number(row.DefectQty || row.defectQty) || 0),
      0
    )
    const totalWasteTime = gridData.reduce(
      (acc, row) => acc + (Number(row.TotalWasteMinutes || row.totalWasteMinutes) || 0),
      0
    )
    const avgPassRate = totalProd > 0 ? ((totalPass / totalProd) * 100).toFixed(2) : '100.00'

    return {
      totalRecords,
      totalProd,
      totalPass,
      totalDefect,
      totalWasteTime,
      avgPassRate
    }
  }, [gridData])

  // Tìm kiếm dữ liệu
  const handleSearchData = useCallback(() => {
    loadingBarRef?.current?.continuousStart?.()
    setTimeout(() => {
      let filtered = [...originalDataRef.current]

      if (searchValues.OperationNo) {
        filtered = filtered.filter((r) =>
          String(r.OperationNo || r.operationNo || '')
            .toLowerCase()
            .includes(searchValues.OperationNo.toLowerCase())
        )
      }
      if (searchValues.ItemCode) {
        filtered = filtered.filter((r) =>
          String(r.ItemCode || r.itemCode || '')
            .toLowerCase()
            .includes(searchValues.ItemCode.toLowerCase())
        )
      }
      if (searchValues.MachineCode) {
        filtered = filtered.filter(
          (r) => String(r.MachineCode || r.machineCode || '') === searchValues.MachineCode
        )
      }
      if (searchValues.TeamName) {
        filtered = filtered.filter(
          (r) => String(r.TeamName || r.teamName || '') === searchValues.TeamName
        )
      }
      if (searchValues.Shift) {
        filtered = filtered.filter((r) => String(r.Shift || r.shift || '') === searchValues.Shift)
      }
      if (searchValues.Customer) {
        filtered = filtered.filter((r) =>
          String(r.Customer || r.customer || '')
            .toLowerCase()
            .includes(searchValues.Customer.toLowerCase())
        )
      }
      if (searchValues.Status) {
        filtered = filtered.filter(
          (r) => String(r.Status || r.status || '') === searchValues.Status
        )
      }

      setGridData(filtered)
      setNumRows(filtered.length)
      loadingBarRef?.current?.complete?.()
      message.success(t('Tìm thấy {{count}} bản ghi', { count: filtered.length }))
    }, 200)
  }, [searchValues, loadingBarRef, setGridData, setNumRows, t])

  const onResetQuery = useCallback(() => {
    setSearchValues({
      plantKey: plantKey || '',
      StatDate: [],
      OperationNo: '',
      ItemCode: '',
      MachineCode: '',
      TeamName: '',
      Shift: '',
      Customer: '',
      Status: ''
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

  const executeExportStatExcel = useCallback(
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
        const reportTitle = `BÁO CÁO THỐNG KÊ SẢN XUẤT - ${plantDisplayName.toUpperCase()}`
        const filterSummary = formatFilterSummary(searchValues)

        const defaultColsToExport = [
          { id: 'StatDate', name: 'Ngày Thống Kê', width: 110, group: 'Thông tin chung' },
          { id: 'StatTicketNo', name: 'Số Phiếu TK', width: 140, group: 'Thông tin chung' },
          { id: 'OperationNo', name: 'Mã Lệnh SX', width: 140, group: 'Lệnh sản xuất' },
          { id: 'RoutingDocNo', name: 'Số Lệnh CĐ', width: 140, group: 'Lệnh sản xuất' },
          { id: 'ItemCode', name: 'Mã Sản Phẩm', width: 130, group: 'Sản phẩm' },
          { id: 'ItemName', name: 'Tên Sản Phẩm', width: 220, group: 'Sản phẩm' },
          { id: 'Customer', name: 'Khách Hàng', width: 180, group: 'Sản phẩm' },
          { id: 'OpTypeName', name: 'Công Đoạn', width: 150, group: 'Công đoạn & Máy' },
          { id: 'MachineCode', name: 'Mã Máy', width: 120, group: 'Công đoạn & Máy' },
          { id: 'MachineName', name: 'Tên Máy', width: 190, group: 'Công đoạn & Máy' },
          { id: 'TeamName', name: 'Tổ Sản Xuất', width: 130, group: 'Nhân sự & Ca' },
          { id: 'Shift', name: 'Ca SX', width: 80, group: 'Nhân sự & Ca' },
          { id: 'MainWorker', name: 'Trưởng Ca / Thợ Chính', width: 150, group: 'Nhân sự & Ca' },
          { id: 'Unit', name: 'ĐVT', width: 80, group: 'Sản lượng' },
          { id: 'ProdQty', name: 'SL Sản Xuất', width: 110, group: 'Sản lượng' },
          { id: 'PassQty', name: 'SL Đạt', width: 110, group: 'Sản lượng' },
          { id: 'DefectQty', name: 'SL Hỏng', width: 100, group: 'Sản lượng' },
          { id: 'DefectRate', name: 'Tỷ Lệ Hỏng', width: 100, group: 'Sản lượng' },
          { id: 'ActualRunTime', name: 'Giờ Chạy Máy', width: 110, group: 'Thời gian & Lãng phí' },
          {
            id: 'TotalWasteMinutes',
            name: 'Phút Lãng Phí',
            width: 110,
            group: 'Thời gian & Lãng phí'
          },
          { id: 'Status', name: 'Trạng Thái', width: 120, group: 'Trạng thái & Đồng bộ' },
          {
            id: 'AutoIoStatus',
            name: 'Tự Động Xuất Nhập',
            width: 130,
            group: 'Trạng thái & Đồng bộ'
          }
        ]

        const validCols = exportableCols || defaultColsToExport

        const wb = generateExcelWorkbook({
          data: targetData,
          columns: validCols,
          sheetName: 'ThongKeSanXuat',
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
    executeExportStatExcel,
    showConfirmModal,
    handleConfirmSearch: () => setShowConfirmModal(false),
    handleCancelSearch: () => setShowConfirmModal(false),
    kpiStats
  }
}
