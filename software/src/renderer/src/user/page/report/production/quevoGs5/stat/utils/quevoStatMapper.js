import { parseCleanNumber, parseDurationToMinutes } from '../../../../common/reportFormatters'
import { getCleanDate } from '../../../../common/reportUtils'

/**
 * Mapper chuyển đổi bản ghi Chi tiết TKSX GS5 Quế Võ sang cấu trúc hiển thị chuẩn
 */
export function mapQuevoStatRow(item, idx, masterInfo) {
  const planQty = parseCleanNumber(
    item.TargetProdQty || item.TargetPassQty || item.StandardMeters || 0
  )
  const actualQty =
    parseCleanNumber(item.ProdQty || item.ActualMeters || item.StatPassQty || 0) || planQty || 0
  const passQty =
    parseCleanNumber(item.PassQty || item.StatPassQty || item.ProdQty || 0) || actualQty || 0
  const parsedDefect = parseCleanNumber(item.DefectQty, 0)
  const defectQty = parsedDefect > 0 ? parsedDefect : Math.max(0, actualQty - passQty)
  const passRate =
    actualQty > 0 ? Number(Math.min(100, Math.max(0, (passQty / actualQty) * 100)).toFixed(2)) : 100

  const rawStart = item.StartTime || item.startTime || item.TicketCreatedDate || ''
  const rawEnd = item.EndTime || item.endTime || item.MesApprovalTime || ''
  const rawStartDate = item.StartDate || item.startDate || item.StatDate || item.statDate || ''
  const rawEndDate = item.EndDate || item.endDate || item.StatDate || item.statDate || ''

  const rawDurationMinutes = parseDurationToMinutes(
    item.DurationMinutes || item.durationMinutes || item.ActualRunTime || item.ActualProdTime,
    rawStart,
    rawEnd,
    rawStartDate,
    rawEndDate
  )

  const rawWaste =
    item.TotalWasteMinutes ??
    item.totalWasteMinutes ??
    item.TotalDowntimeMinutes ??
    item.totalDowntimeMinutes
  let wasteMin = 0
  if (rawWaste !== undefined && rawWaste !== null && rawWaste !== '') {
    wasteMin = parseFloat(String(rawWaste).replace(',', '.')) || 0
  } else {
    const bd =
      parseFloat(String(item.BreakdownMinutes ?? item.breakdownMinutes ?? 0).replace(',', '.')) || 0
    const wm =
      parseFloat(
        String(item.WaitingMaterialMinutes ?? item.waitingMaterialMinutes ?? 0).replace(',', '.')
      ) || 0
    const st =
      parseFloat(String(item.SetupMinutes ?? item.setupMinutes ?? 0).replace(',', '.')) || 0
    const rp =
      parseFloat(String(item.RepairMinutes ?? item.repairMinutes ?? 0).replace(',', '.')) || 0
    wasteMin = bd + wm + st + rp
  }

  const finalDurationMinutes =
    wasteMin > 0 && rawDurationMinutes > 0
      ? Math.max(0, Number((rawDurationMinutes - wasteMin).toFixed(1)))
      : rawDurationMinutes

  const runtimeHours = Number((finalDurationMinutes / 60).toFixed(2))

  const rawDate =
    item.StatDate ||
    item.statDate ||
    item.StartDate ||
    item.startDate ||
    item.OpDate ||
    item.opDate ||
    item.TicketCreatedDate ||
    item.ticketCreatedDate ||
    masterInfo?.ApplyDate ||
    new Date().toISOString().slice(0, 10)

  const prodDate = getCleanDate(rawDate) || new Date().toISOString().slice(0, 10)

  const rawMachineCode =
    item.MachineCode ||
    item.machineCode ||
    item.MachineId ||
    item.machineId ||
    item.RawLineCode ||
    item.rawLineCode ||
    ''

  const rawMachineName =
    item.MachineName ||
    item.machineName ||
    item.RawLineName ||
    item.rawLineName ||
    item.WorkCenter ||
    item.workCenter ||
    ''

  const machineCode = rawMachineCode ? String(rawMachineCode).trim() : ''
  const machineName = rawMachineName ? String(rawMachineName).trim() : machineCode || ''

  const rawTeam =
    item.TeamName ||
    item.teamName ||
    item.team ||
    item.OpTypeName ||
    item.opTypeName ||
    item.OperationName ||
    item.operationName ||
    item.ProcessName ||
    item.processName ||
    item.SectionName ||
    item.DeptName ||
    ''

  const team = rawTeam ? String(rawTeam).trim() : ''
  const teamCode = team
    ? team
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')
    : ''

  return {
    ...item,
    id: item.IdSeq ? String(item.IdSeq) : item.StatTicketNo || String(idx + 1),
    ticketNo: item.StatTicketNo || item.statTicketNo || item.ticketNo || item.RegCode || '',
    StatTicketNo: item.StatTicketNo || item.statTicketNo || item.ticketNo || item.RegCode || '',
    docNo: item.OperationNo || item.operationNo || item.RoutingDocNo || item.routingDocNo || '',
    OperationNo:
      item.OperationNo || item.operationNo || item.RoutingDocNo || item.routingDocNo || '',
    OrderNo: item.OrderNo || item.orderNo || '',
    orderNo: item.OrderNo || item.orderNo || '',
    team,
    teamCode,
    TeamName: item.TeamName || item.teamName || team,
    machineName,
    machineCode,
    MachineCode: item.MachineCode || machineCode,
    MachineName: item.MachineName || machineName,
    isManual: false,
    itemCode: item.ItemCode || item.itemCode || '',
    itemName: item.ItemName || item.itemName || '',
    ItemCode: item.ItemCode || item.itemCode || '',
    ItemName: item.ItemName || item.itemName || '',
    Customer: item.Customer || item.customer || '',
    customer: item.Customer || item.customer || '',
    ProcessName: item.ProcessName || item.processName || '',
    MainWorker: item.MainWorker || item.mainWorker || item.PicDp || '',
    SubWorker1: item.SubWorker1 || item.subWorker1 || '',
    SubWorker2: item.SubWorker2 || item.subWorker2 || '',
    StatStaff: item.StatStaff || item.statStaff || '',
    SalesStaff: item.SalesStaff || item.salesStaff || '',
    BreakdownReason: item.BreakdownReason || item.breakdownReason || '',
    StandardMeters: parseCleanNumber(item.StandardMeters || item.standardMeters, 0),
    ActualMeters: parseCleanNumber(item.ActualMeters || item.actualMeters, 0),
    unit: item.Unit || item.unit || item.RoutingUnit || '',
    Unit: item.Unit || item.unit || item.RoutingUnit || '',
    planQty,
    actualQty,
    ProdQty: actualQty,
    passQty,
    PassQty: passQty,
    defectQty,
    passRate,
    PassRate: passRate,
    runtimeHours,
    durationMinutes: finalDurationMinutes,
    AuditCategory:
      finalDurationMinutes < 5
        ? 'UNDER_5MIN'
        : finalDurationMinutes > 720
          ? 'OVER_12H'
          : '5MIN_12H',
    shift: item.Shift || item.shift || '',
    Shift: item.Shift || item.shift || '',
    prodDate,
    StatDate: item.StatDate || item.statDate || prodDate,
    StartDate: item.StartDate || item.startDate || prodDate,
    EndDate: item.EndDate || item.endDate || prodDate,
    startTime: rawStart ? String(rawStart).replace('T', ' ') : '',
    endTime: rawEnd ? String(rawEnd).replace('T', ' ') : '',
    StartTime: rawStart ? String(rawStart).replace('T', ' ') : '',
    EndTime: rawEnd ? String(rawEnd).replace('T', ' ') : '',
    createdSource: item.TicketCreationLocation || item.createdSource || item.origin || '',
    syncDelayMinutes:
      item.SyncDelayMinutes !== undefined && item.SyncDelayMinutes !== null
        ? item.SyncDelayMinutes
        : item.syncDelayMinutes !== undefined && item.syncDelayMinutes !== null
          ? item.syncDelayMinutes
          : '',
    SyncDelayMinutes:
      item.SyncDelayMinutes !== undefined && item.SyncDelayMinutes !== null
        ? item.SyncDelayMinutes
        : item.syncDelayMinutes !== undefined && item.syncDelayMinutes !== null
          ? item.syncDelayMinutes
          : '',
    TicketCreatedDate: item.TicketCreatedDate || item.ticketCreatedDate || '',
    MesApprovalTime: item.MesApprovalTime || item.mesApprovalTime || '',
    isDuplicate: item.IsDuplicateTicket === 'true' || item.IsDuplicateTicket === '1',
    autoExportNote:
      item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo),
    AutoIoStatus:
      item.AutoIoStatus ||
      item.autoIoStatus ||
      item.AutoIOStatus ||
      (item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo)
        ? 'Có XKTĐ'
        : 'Không áp dụng XNTĐ'),
    autoIoStatus:
      item.AutoIoStatus ||
      item.autoIoStatus ||
      item.AutoIOStatus ||
      (item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo)
        ? 'Có XKTĐ'
        : 'Không áp dụng XNTĐ'),
    supervisor:
      item.MainWorker || item.StatStaff || item.PicDp || item.CreatedByName || 'Quản lý sản xuất',
    status: item.Status || item.StatusDpSx || 'Hoàn thành',
    createdTime:
      item.TicketCreatedDate ||
      (item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('vi-VN') : `${prodDate} 08:00:00`),
    syncTime:
      item.MesApprovalTime ||
      (item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('vi-VN') : `${prodDate} 08:05:00`),
    note:
      item.UserMemo ||
      item.BreakdownReason ||
      (item.ExportDocNo ? `Phiếu xuất ${item.ExportDocNo}` : '') ||
      ''
  }
}
