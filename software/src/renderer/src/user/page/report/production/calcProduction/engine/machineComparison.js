const text = (value) => String(value ?? '').trim()
const normalize = (value) => text(value).toUpperCase()
const first = (row, ...keys) => keys.map((key) => text(row?.[key])).find(Boolean) || ''
const orderNo = (row) =>
  first(row, 'OperationOrderNo', 'Số lệnh thao tác', 'Lệnh thao tác', 'Mã lệnh thao tác')
const slipNo = (row) => first(row, 'StatSlipNo', 'Số phiếu thống kê', 'Số thống kê')

export function mapMasterFactoryToCatalogKey(factoryName) {
  if (!factoryName) return ''
  const normalized = String(factoryName)
    .trim()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  const tokens = normalized.match(/[A-Z0-9]+/g) || []
  const compact = tokens.join('')

  if (
    tokens.includes('GS51B') ||
    (tokens.includes('GS5') && tokens.includes('1B')) ||
    (tokens.includes('QUE') && tokens.includes('VO') && tokens.includes('1B')) ||
    tokens.includes('QV1B')
  ) {
    return 'GS51B'
  }
  if (
    tokens.includes('GS52') ||
    (tokens.includes('GS5') && tokens.includes('2')) ||
    (tokens.includes('QUE') && tokens.includes('VO') && tokens.includes('2')) ||
    tokens.includes('QV2')
  ) {
    return 'GS52'
  }
  // GS1B is a distinct factory code. Checking it before GS1 avoids prefix collisions.
  if (tokens.includes('GS1B')) {
    return 'GS1B'
  }
  if (
    tokens.includes('GS1') ||
    tokens.includes('HN') ||
    tokens.includes('HANOI') ||
    (tokens.includes('HA') && tokens.includes('NOI'))
  ) {
    return 'GS1'
  }
  return compact || normalized
}

const rawFactoryOf = (row) =>
  first(row, 'Factory', 'Nhà máy', 'factory', 'FactoryName', 'factory_name')

export function filterMachineCatalogByFactory(machines, factoryName) {
  const factoryKey = mapMasterFactoryToCatalogKey(factoryName)
  if (!factoryKey || !Array.isArray(machines)) return []
  return machines.filter((machine) => {
    const rawFactory = rawFactoryOf(machine)
    return rawFactory && mapMasterFactoryToCatalogKey(rawFactory) === factoryKey
  })
}

// Shared by tabs 6 and 7. Every listed production machine must belong to the factory.
export function createFactoryMachineChecker(catalogMachines = [], factoryName = '') {
  const target = mapMasterFactoryToCatalogKey(factoryName)
  const hasFactory = catalogMachines.some((machine) => rawFactoryOf(machine))
  const splitCodes = (value) => String(value ?? '').split(/[|,;\n\r/]+/)
    .map((code) => code.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean)
  const validCode = (code) => !['NULL', 'UNDEFINED', '(THIẾUMÃ)', '-'].includes(code)
  const codes = new Set()
  for (const machine of catalogMachines) {
    const factory = rawFactoryOf(machine)
    if (target && (factory ? mapMasterFactoryToCatalogKey(factory) !== target : hasFactory)) continue
    for (const code of splitCodes(first(machine, 'MachineCode', 'machine_code', 'machineCode',
      'Code', 'code', 'Mã máy', 'Mã máy sản xuất', 'machine_id'))) {
      if (validCode(code)) codes.add(code)
    }
  }
  return (value) => {
    const machines = splitCodes(value)
    return machines.length > 0 && machines.every((code) => validCode(code) && codes.has(code))
      ? 'TRUE' : 'FALSE'
  }
}

export function attachFactoryMembership(rows = [], catalogMachines = [], factoryName = '', actual = false) {
  const check = createFactoryMachineChecker(catalogMachines, factoryName)
  return rows.map((row) => {
    const value = check(actual
      ? first(row, 'ActualMachineCode', 'MachineCode', 'Mã máy sản xuất', 'Mã máy thực tế')
      : first(row, 'MachineCode', 'Mã máy sản xuất', 'PlannedMachineCode'))
    if (row.IsBelongToFactory === value && (!actual || row['Thuộc nhà máy'] === value)) return row
    return { ...row, IsBelongToFactory: value,
      ...(actual ? { 'Thuộc nhà máy': value, 'Máy thuộc nhà máy': value } : {}) }
  })
}

export function isMachineComparisonCurrent(results, factoryName) {
  const comparison = results?.machineComparison
  if (!factoryName || !comparison || !Array.isArray(comparison.calculatedRows)) return false

  const factoryKey = mapMasterFactoryToCatalogKey(factoryName)
  const savedFactoryKey = mapMasterFactoryToCatalogKey(
    comparison.factoryKey || comparison.factoryName
  )
  if (savedFactoryKey && factoryKey && savedFactoryKey !== factoryKey) return false

  const savedCatalog = comparison.catalogMachines
  if (Array.isArray(savedCatalog) && savedCatalog.length > 0) {
    const explicitFactoryRows = savedCatalog.filter((machine) => rawFactoryOf(machine))
    if (
      (explicitFactoryRows.length > 0 && explicitFactoryRows.length !== savedCatalog.length) ||
      explicitFactoryRows.some(
        (machine) => mapMasterFactoryToCatalogKey(rawFactoryOf(machine)) !== factoryKey
      )
    ) {
      return false
    }
  }
  return true
}

export function getMachineComparisonRows(results, summaryRows, mesRows, options = {}) {
  const stored = results?.machineComparison?.calculatedRows
  const storedMatchesFactory =
    !options?.factoryName || isMachineComparisonCurrent(results, options.factoryName)
  // Version 2 is the authoritative calculation snapshot. Legacy snapshots must
  // be rebuilt from their TKSX rows so they cannot stay stale or use old joins.
  if (
    Array.isArray(stored) &&
    storedMatchesFactory &&
    (results?.machineComparison?.matchVersion === 2 ||
      !Array.isArray(results?.stat?.calculatedRows))
  ) {
    return attachFactoryMembership(stored,
      options.catalogMachines?.length ? options.catalogMachines : results.machineComparison.catalogMachines || [],
      options.factoryName || results.machineComparison.factoryName, true)
  }

  const plans = results?.plan?.calculatedRows || []
  return buildMachineComparison(
    results?.stat?.calculatedRows || [],
    summaryRows ? attachDeclaredMachines(plans, summaryRows) : plans,
    results?.machineComparison?.mesMachines || mesRows || [],
    options
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

const opName = (row) =>
  first(
    row,
    'OperationName',
    'Thao tác',
    'Tên thao tác',
    'OperationTypeName',
    'Phân loại thao tác',
    'PlannedOperationTypeName'
  )

// Only exact operation codes are joined, including their suffixes. When operation names
// are available, machines are matched to the specific operation step.
export function attachDeclaredMachines(planRows = [], summaryRows = []) {
  const byOrderAndOp = new Map()
  const byOrder = new Map()
  for (const row of summaryRows) {
    const key = normalize(orderNo(row))
    if (!key) continue
    const op = normalize(opName(row))
    const machine = {
      code: first(row, 'PlannedMachineCode', 'MachineCode', 'Mã máy', 'Mã máy sản xuất'),
      name: first(row, 'PlannedMachineName', 'MachineName', 'Máy sản xuất', 'Tên máy')
    }
    if (machine.code || machine.name) {
      if (op) {
        const fullKey = `${key}__${op}`
        const machines = byOrderAndOp.get(fullKey) || []
        if (
          !machines.some(
            (item) =>
              normalize(item.code) === normalize(machine.code) &&
              normalize(item.name) === normalize(machine.name)
          )
        )
          machines.push(machine)
        byOrderAndOp.set(fullKey, machines)
      }
      const machines = byOrder.get(key) || []
      if (
        !machines.some(
          (item) =>
            normalize(item.code) === normalize(machine.code) &&
            normalize(item.name) === normalize(machine.name)
        )
      )
        machines.push(machine)
      byOrder.set(key, machines)
    }
  }
  return planRows.map((row) => {
    const key = normalize(orderNo(row))
    const op = normalize(opName(row))
    const specific = op ? byOrderAndOp.get(`${key}__${op}`) : null
    return {
      ...row,
      DeclaredMachines: specific && specific.length > 0 ? specific : byOrder.get(key) || []
    }
  })
}

export function buildMachineComparison(
  statRows = [],
  planRows = [],
  mesRows = [],
  options = {}
) {
  const mesIndex = indexMesMachines(mesRows)
  const byOrder = new Map()
  for (const row of planRows) {
    const key = normalize(orderNo(row))
    if (!key) continue
    const rows = byOrder.get(key) || []
    rows.push(row)
    byOrder.set(key, rows)
  }

  const factoryName = options?.factoryName || options?.masterInfo?.factoryName || ''
  const catalogMachines = Array.isArray(options?.catalogMachines)
    ? options.catalogMachines
    : Array.isArray(options?.machineCatalog)
      ? options.machineCatalog
      : Array.isArray(options?.factoryMachines)
        ? options.factoryMachines
        : []

  const checkFactoryMachine = createFactoryMachineChecker(catalogMachines, factoryName)

  // A row in TKSX always produces exactly one comparison row, even when the
  // operation, slip or machine repeats. This preserves the source's granularity.
  return statRows.map((stat, index) => {
    const operation = orderNo(stat)
    const statOp = normalize(opName(stat))
    const allPlans = byOrder.get(normalize(operation)) || []
    let plans = allPlans
    if (statOp && allPlans.length > 0) {
      const matching = allPlans.filter((p) => {
        const pOp = normalize(opName(p))
        return pOp && (pOp === statOp || pOp.includes(statOp) || statOp.includes(pOp))
      })
      if (matching.length > 0) {
        plans = matching
      }
    }
    const machines = []
    for (const plan of plans) {
      const declared = Array.isArray(plan.DeclaredMachines)
        ? plan.DeclaredMachines
        : [
            {
              code: first(plan, 'PlannedMachineCode', 'MachineCode', 'Mã máy', 'Mã máy sản xuất'),
              name: first(plan, 'PlannedMachineName', 'MachineName', 'Máy sản xuất', 'Tên máy')
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

    const isBelongToFactory = checkFactoryMachine(actualCode)

    let plannedCodeStr = machines
      .map((machine) => text(machine.code))
      .filter((c) => c && c !== '(Thiếu mã)')
      .join(' | ')
    let plannedNameStr = machines
      .map((machine) => text(machine.name))
      .filter((n) => n && n !== '(Thiếu tên)')
      .join(' | ')

    if (!plannedCodeStr && plans.length > 0) {
      plannedCodeStr = plans
        .map((p) => first(p, 'PlannedMachineCode', 'MachineCode', 'Mã máy sản xuất', 'Mã máy'))
        .filter(Boolean)
        .join(' | ')
    }
    if (!plannedNameStr && plans.length > 0) {
      plannedNameStr = plans
        .map((p) => first(p, 'PlannedMachineName', 'MachineName', 'Máy sản xuất', 'Tên máy'))
        .filter(Boolean)
        .join(' | ')
    }

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
      PlannedMachineCode: plannedCodeStr || '',
      PlannedMachineName: plannedNameStr || '',
      IsBelongToFactory: isBelongToFactory,
      'Thuộc nhà máy': isBelongToFactory,
      'Máy thuộc nhà máy': isBelongToFactory,
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
