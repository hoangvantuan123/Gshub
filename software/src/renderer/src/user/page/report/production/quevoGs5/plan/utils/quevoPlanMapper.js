import { parseCleanNumber, normalizeDateString } from '../../../../common/reportFormatters'

/**
 * Mapper chuyển đổi bản ghi DB _ERPPlanDetail sang đối tượng hiển thị KHSX chuẩn hóa của GS5 Quế Võ
 */
export function mapQuevoPlanRow(item, idx, master) {
  const planQty = parseCleanNumber(
    item.TargetProdQty ?? item.TargetPassQty ?? item.PlanQty ?? item.planQty ?? item.RequiredQty,
    0
  )
  const actualQty = parseCleanNumber(
    item.StatPassQty ?? item.ActualQty ?? item.actualQty ?? item.CompletedQty ?? item.TargetPassQty,
    planQty
  )

  const rawPlanDate = item.RoutingDocDate || item.PlanDate || item.planDate || item.StartDate || ''
  const rawActualDate =
    item.OpDate || item.ActualDate || item.actualDate || item.ProdDate || item.EndDate || ''

  const planDate =
    normalizeDateString(rawPlanDate) ||
    normalizeDateString(rawActualDate) ||
    (master?.ApplyDate ? String(master.ApplyDate).slice(0, 10) : '2026-09-29')
  const actualDate = normalizeDateString(rawActualDate) || planDate

  // Trạng thái ĐP - SX
  let dpStatusText = String(
    item.StatusDpSx || item.DpStatusText || item.dpStatusText || item.Status || ''
  ).trim()
  let dpStatusCode = 'KHOP_SL'

  const lowerDp = dpStatusText.toLowerCase()
  if (lowerDp.includes('sai ngày')) {
    dpStatusCode = 'SX_SAI_NGAY'
    dpStatusText = 'SX sai ngày KH'
  } else if (lowerDp.includes('trượt')) {
    dpStatusCode = 'TRUOT_KH'
    dpStatusText = 'Trượt KH'
  } else if (lowerDp.includes('khớp số lượng') || lowerDp.includes('khớp sl')) {
    dpStatusCode = 'KHOP_SL'
    dpStatusText = 'Khớp số lượng'
  } else if (lowerDp.includes('khớp job') || lowerDp.includes('job')) {
    dpStatusCode = 'KHOP_JOB'
    dpStatusText = 'Khớp job'
  } else {
    if (planDate && actualDate && planDate !== actualDate) {
      dpStatusCode = 'SX_SAI_NGAY'
      dpStatusText = 'SX sai ngày KH'
    } else if (planQty > 0 && actualQty < planQty * 0.9) {
      dpStatusCode = 'TRUOT_KH'
      dpStatusText = 'Trượt KH'
    } else {
      dpStatusCode = 'KHOP_SL'
      dpStatusText = 'Khớp số lượng'
    }
  }

  // Trạng thái Thời gian
  const timeStatus = String(item.TimeStatus || item.timeStatus || 'Đúng ĐM').trim()
  const timeStatusText = timeStatus

  // Trạng thái Capa
  const capaStatus = String(item.CapaStatus || item.capaStatus || 'Trống / Đúng capa').trim()
  const capaStatusText = capaStatus

  const docNo =
    item.OperationNo ||
    item.RoutingDocNo ||
    item.DocNo ||
    item.docNo ||
    item.PlanNo ||
    `LSX-QV-${String(idx + 1).padStart(4, '0')}`
  const orderNo = item.RoutingDocNo || item.OrderNo || item.orderNo || item.SoNo || 'SO-2026-0000'
  const planNo =
    item.OperationNo ||
    item.PlanNo ||
    item.planNo ||
    `KH-QV-W39-${String(idx + 1).padStart(3, '0')}`
  const pic =
    item.PicDp || item.pic || item.Pic || item.Dispatcher || item.Planner || 'Chưa phân công'

  return {
    ...item,
    PicDp: pic,
    OperationNo: item.OperationNo || planNo,
    OpDate: item.OpDate || planDate,
    RoutingDocNo: item.RoutingDocNo || orderNo,
    RoutingDocDate: item.RoutingDocDate || actualDate,
    ItemCode: item.ItemCode || item.itemCode || 'CAN-FSB-00360',
    ItemName: item.ItemName || item.itemName || 'Sản phẩm GS5',
    OperationName: item.OperationName || item.operationName || '',
    OpTypeName: item.OpTypeName || item.opTypeName || '',
    MachineName: item.MachineName || item.machineName || item.MachineCode || 'CHUNG',
    Unit: item.Unit || item.unit || 'Pcs',
    TargetPassQty: parseCleanNumber(item.TargetPassQty, planQty),
    TargetProdQty: parseCleanNumber(item.TargetProdQty, planQty),
    StatPassQty: parseCleanNumber(item.StatPassQty, actualQty),
    StartTime: item.StartTime || '',
    EndTime: item.EndTime || '',
    StandardProdTime: parseCleanNumber(item.StandardProdTime, 0),
    ActualProdTime: parseCleanNumber(item.ActualProdTime, 0),
    StandardCapa: parseCleanNumber(item.StandardCapa, 0),
    ActualCapa: parseCleanNumber(item.ActualCapa, 0),
    StatusDpSx: dpStatusText,
    TimeStatus: timeStatusText,
    CapaStatus: capaStatusText,

    id: item.IdSeq || item.id || `QV-PL-${String(idx + 1).padStart(4, '0')}`,
    docNo,
    orderNo,
    planNo,
    pic,
    machineCode: item.MachineCode || item.machineCode || item.MachineName || 'CHUNG',
    machineName: item.MachineName || item.machineName || 'Thiết bị sản xuất GS5',
    teamName:
      item.OpTypeName || item.OperationName || item.TeamName || item.teamName || 'Tổ sản xuất GS5',
    itemCode: item.ItemCode || item.itemCode || 'CAN-FSB-00360',
    itemName: item.ItemName || item.itemName || 'Sản phẩm GS5',
    operationNo: item.OperationNo || planNo,
    operationName: item.OperationName || '',
    opTypeName: item.OpTypeName || '',
    unit: item.Unit || item.unit || 'Pcs',
    customer: item.CustomerName || item.customer || 'Khách hàng Goldsun GS5',
    planDate,
    actualDate,
    rawPlanDate,
    rawActualDate,
    planQty,
    actualQty,
    targetPassQty: parseCleanNumber(item.TargetPassQty, planQty),
    targetProdQty: parseCleanNumber(item.TargetProdQty, planQty),
    statPassQty: parseCleanNumber(item.StatPassQty, actualQty),
    startTime: item.StartTime || '',
    endTime: item.EndTime || '',
    standardProdTime: parseCleanNumber(item.StandardProdTime, 0),
    actualProdTime: parseCleanNumber(item.ActualProdTime, 0),
    standardCapa: parseCleanNumber(item.StandardCapa, 0),
    actualCapa: parseCleanNumber(item.ActualCapa, 0),
    dpStatusCode,
    dpStatusText,
    timeStatus,
    timeStatusText,
    capaStatus,
    capaStatusText,
    note: item.UserMemo || item.note || item.Remark || ''
  }
}
