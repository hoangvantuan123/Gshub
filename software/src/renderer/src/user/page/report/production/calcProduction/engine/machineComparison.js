const text = (value) => String(value ?? '').trim()
const normalize = (value) => text(value).toUpperCase()
const first = (row, ...keys) => keys.map((key) => text(row?.[key])).find(Boolean) || ''
const orderNo = (row) =>
  first(row, 'OperationOrderNo', 'Số lệnh thao tác', 'Lệnh thao tác', 'Mã lệnh thao tác')
const slipNo = (row) => first(row, 'StatSlipNo', 'Số phiếu thống kê', 'Số thống kê')

export function getMachineComparisonRows(results, summaryRows, mesRows) {
  const stored = results?.machineComparison?.calculatedRows
  if (
    Array.isArray(stored) &&
    (results.machineComparison.matchVersion === 2 || !Array.isArray(results?.stat?.calculatedRows))
  )
    return stored
  const plans = results?.plan?.calculatedRows || []
  return buildMachineComparison(
    results?.stat?.calculatedRows || [],
    summaryRows ? attachDeclaredMachines(plans, summaryRows) : plans,
    results?.machineComparison?.mesMachines || mesRows || []
  )
}

export function getMachineComparisonPage(
  rows,
  page = 1,
  pageSize = 1500,
  filterRows = (items) => items
) {
  const filtered = filterRows(rows)
  const offset = (page - 1) * pageSize
  const pageRows = filtered.slice(offset, offset + pageSize)
  return {
    rows: pageRows,
    total: filtered.length,
    page,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    hasMore: offset + pageRows.length < filtered.length && pageRows.length > 0
  }
}

export const MES_MACHINE_STATUSES = [
  'Khớp máy MES',
  'Khác máy MES',
  'Chưa có phiếu MES',
  'Thiếu máy đối chiếu MES',
  'Nhiều máy MES'
]

// Persist only the fields needed for tab 7, so a saved calculation can be opened
// without depending on which input tabs have been loaded into the UI.
export function getMesMachineSources(rows = []) {
  return rows.map((row) => ({
    BravoStatCode: first(
      row,
      'BravoStatCode',
      'Mã TK',
      'Mã TK Bravo',
      'Mã lệnh thống kê Bravo',
      'BravoStatSlipNo',
      'Mã lệnh thống kê'
    ),
    SlipNo: first(row, 'SlipNo', 'Mã phiếu', 'StatSlipNo'),
    OperationOrderNo: orderNo(row),
    MachineCode: first(row, 'MachineCode', 'ActualMachineCode', 'Mã máy'),
    MachineName: first(row, 'MachineName', 'ActualMachineName', 'Máy', 'Tên máy')
  }))
}

function indexMesMachines(rows) {
  const index = new Map()
  for (const row of getMesMachineSources(rows)) {
    // Only MES's TK code links to a TK slip. MES SlipNo is display information,
    // never a substitute join key, even if its text happens to equal the TK slip.
    const key = normalize(row.BravoStatCode)
    if (!key) continue
    const matches = index.get(key) || []
    matches.push(row)
    index.set(key, matches)
  }
  return index
}

export const MACHINE_COMPARISON_STATUSES = [
  'Khớp máy',
  'Khác máy',
  'Chưa có KHSX',
  'Thiếu lệnh thao tác',
  'Thiếu mã máy thực tế',
  'Thiếu mã máy khai báo',
  'Nhiều máy khai báo'
]

// Only exact operation codes are joined, including their suffixes. Never borrow a
// machine from another operation on the same stage order or from an actual slip.
export function attachDeclaredMachines(planRows = [], summaryRows = []) {
  const byOrder = new Map()
  for (const row of summaryRows) {
    const key = normalize(orderNo(row))
    if (!key) continue
    const machines = byOrder.get(key) || []
    const machine = {
      code: first(row, 'PlannedMachineCode', 'Mã máy'),
      name: first(row, 'PlannedMachineName', 'Tên máy')
    }
    if (
      (machine.code || machine.name) &&
      !machines.some(
        (item) =>
          normalize(item.code) === normalize(machine.code) &&
          normalize(item.name) === normalize(machine.name)
      )
    )
      machines.push(machine)
    byOrder.set(key, machines)
  }
  return planRows.map((row) => ({
    ...row,
    DeclaredMachines: byOrder.get(normalize(orderNo(row))) || []
  }))
}

export function buildMachineComparison(statRows = [], planRows = [], mesRows = []) {
  const mesIndex = indexMesMachines(mesRows)
  const byOrder = new Map()
  for (const row of planRows) {
    const key = normalize(orderNo(row))
    if (!key) continue
    const rows = byOrder.get(key) || []
    rows.push(row)
    byOrder.set(key, rows)
  }

  // A row in TKSX always produces exactly one comparison row, even when the
  // operation, slip or machine repeats. This preserves the source's granularity.
  return statRows.map((stat, index) => {
    const operation = orderNo(stat)
    const plans = byOrder.get(normalize(operation)) || []
    const machines = []
    for (const plan of plans) {
      const declared = Array.isArray(plan.DeclaredMachines)
        ? plan.DeclaredMachines
        : [
            {
              code: first(plan, 'PlannedMachineCode', 'MachineCode', 'Mã máy'),
              name: first(plan, 'PlannedMachineName', 'MachineName', 'Máy sản xuất')
            }
          ]
      for (const machine of declared) {
        if (
          !machines.some(
            (item) =>
              normalize(item.code) === normalize(machine.code) &&
              normalize(item.name) === normalize(machine.name)
          )
        ) {
          machines.push(machine)
        }
      }
    }
    const actualCode = first(stat, 'MachineCode', 'ActualMachineCode', 'Mã máy sản xuất', 'Mã máy')
    const actualName = first(
      stat,
      'MachineName',
      'ActualMachineName',
      'Tên máy sản xuất',
      'Tên máy'
    )
    const mesMatches = (mesIndex.get(normalize(slipNo(stat))) || []).filter(
      (row) =>
        !row.OperationOrderNo ||
        (operation && normalize(row.OperationOrderNo) === normalize(operation))
    )
    const mesMachines = []
    for (const row of mesMatches) {
      if (
        !mesMachines.some(
          (machine) =>
            normalize(machine.MachineCode) === normalize(row.MachineCode) &&
            normalize(machine.MachineName) === normalize(row.MachineName)
        )
      )
        mesMachines.push(row)
    }
    let mesStatus = 'Chưa có phiếu MES'
    if (mesMachines.length > 1) mesStatus = 'Nhiều máy MES'
    else if (mesMachines.length === 1) {
      const mes = mesMachines[0]
      if (actualCode && mes.MachineCode)
        mesStatus =
          normalize(actualCode) === normalize(mes.MachineCode) ? 'Khớp máy MES' : 'Khác máy MES'
      else if (actualName && mes.MachineName)
        mesStatus =
          normalize(actualName) === normalize(mes.MachineName) ? 'Khớp máy MES' : 'Khác máy MES'
      else mesStatus = 'Thiếu máy đối chiếu MES'
    }
    const codes = [...new Set(machines.map((machine) => normalize(machine.code)).filter(Boolean))]
    let status
    if (!operation) status = 'Thiếu lệnh thao tác'
    else if (!plans.length) status = 'Chưa có KHSX'
    else if (!actualCode) status = 'Thiếu mã máy thực tế'
    else if (machines.some((machine) => !text(machine.code)) || !codes.length)
      status = 'Thiếu mã máy khai báo'
    else if (codes.length > 1) status = 'Nhiều máy khai báo'
    else status = codes[0] === normalize(actualCode) ? 'Khớp máy' : 'Khác máy'

    return {
      SourceRow: index + 1,
      StatSlipNo: slipNo(stat),
      StatDate: first(stat, 'StatDate', 'Ngày thống kê', 'Ngày TK'),
      OperationOrderNo: operation,
      StageOrderNo: first(stat, 'StageOrderNo', 'Số lệnh công đoạn'),
      OperationName:
        first(stat, 'OperationTypeName', 'Phân loại thao tác') ||
        first(plans[0], 'OperationName', 'Thao tác'),
      MaterialCode: first(stat, 'MaterialCode', 'Mã vật tư'),
      MaterialName: first(stat, 'MaterialName', 'Tên vật tư'),
      ActualMachineCode: actualCode,
      ActualMachineName: actualName,
      MesSlipNo: [...new Set(mesMatches.map((row) => row.SlipNo).filter(Boolean))].join(' | '),
      MesMachineCode: mesMachines.map((row) => row.MachineCode || '(Không có mã MES)').join(' | '),
      MesMachineName: mesMachines.map((row) => row.MachineName || '(Thiếu tên)').join(' | '),
      MesComparisonStatus: mesStatus,
      MesComparisonBasis:
        mesMachines.length === 1
          ? actualCode && mesMachines[0].MachineCode
            ? 'Mã máy'
            : actualName && mesMachines[0].MachineName
              ? 'Tên máy'
              : ''
          : '',
      PlannedMachineCode: machines.map((machine) => text(machine.code) || '(Thiếu mã)').join(' | '),
      PlannedMachineName: machines
        .map((machine) => text(machine.name) || '(Thiếu tên)')
        .join(' | '),
      MachineComparisonStatus: status,
      MachineDifference:
        status === 'Khác máy'
          ? `Khai báo ${machines[0].code} → Thực tế ${actualCode}`
          : status === 'Nhiều máy khai báo'
            ? `Cần xác định máy khai báo cho phiếu TK; thực tế ${actualCode}`
            : status === 'Khớp máy'
              ? ''
              : status,
      KhsxStatus: first(plans[0], 'KhsxStatus', 'KHSX'),
      ProducedQty: stat.ProducedQty ?? stat['Số lượng sản xuất'] ?? '',
      QualifiedQty: stat.QualifiedQty ?? stat['Số lượng đạt'] ?? ''
    }
  })
}
