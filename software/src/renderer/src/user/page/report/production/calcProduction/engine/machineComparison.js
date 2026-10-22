const text = (value) => String(value ?? '').trim()
const normalize = (value) => text(value).toUpperCase()
const first = (row, ...keys) => keys.map((key) => text(row?.[key])).find(Boolean) || ''
const orderNo = (row) =>
  first(row, 'OperationOrderNo', 'Số lệnh thao tác', 'Lệnh thao tác', 'Mã lệnh thao tác')
const slipNo = (row) => first(row, 'StatSlipNo', 'Số phiếu thống kê', 'Số thống kê')

export function mapMasterFactoryToCatalogKey(factoryName) {
  if (!factoryName) return ''
  const upper = String(factoryName).trim().toUpperCase()
  if (
    upper.includes('1B') ||
    upper.includes('GS51B') ||
    (upper.includes('GS5') && upper.includes('QUẾ VÕ 1B'))
  ) {
    return 'GS51B'
  }
  if (
    upper.includes('QUẾ VÕ 2') ||
    upper.includes('QV2') ||
    (upper.includes('GS5') && upper.includes('2'))
  ) {
    return 'GS52'
  }
  if (upper.includes('GS1') || upper.includes('HÀ NỘI') || upper.includes('HN')) {
    return 'GS1'
  }
  return upper
}

export function getMachineComparisonRows(results, summaryRows, mesRows, options = {}) {
  const stored = results?.machineComparison?.calculatedRows
  // Version 2 is the authoritative calculation snapshot. Legacy snapshots must
  // be rebuilt from their TKSX rows so they cannot stay stale or use old joins.
  if (
    Array.isArray(stored) &&
    (results?.machineComparison?.matchVersion === 2 ||
      !Array.isArray(results?.stat?.calculatedRows))
  ) {
    return stored
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

  const targetFactoryKey = normalize(mapMasterFactoryToCatalogKey(factoryName))
  const normFactoryName = normalize(factoryName)

  const factoryMachineCodes = new Set()

  const addMachineCode = (val) => {
    if (!val) return
    const str = String(val).trim().toUpperCase()
    if (!str || str === 'NULL' || str === 'UNDEFINED') return
    const parts = str.split(/[|,;\n\r/]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
    for (const p of parts) {
      factoryMachineCodes.add(p)
      const noSpace = p.replace(/\s+/g, '')
      if (noSpace) factoryMachineCodes.add(noSpace)
    }
  }

  const isCodeInFactory = (val) => {
    if (!val) return false
    const str = String(val).trim().toUpperCase()
    if (!str || str === 'NULL' || str === 'UNDEFINED' || str === '(THIẾU MÃ)' || str === '-') return false
    if (factoryMachineCodes.has(str)) return true
    const noSpace = str.replace(/\s+/g, '')
    if (factoryMachineCodes.has(noSpace)) return true
    return false
  }

  for (const m of catalogMachines) {
    const rawCode = first(
      m,
      'MachineCode',
      'machine_code',
      'machineCode',
      'Code',
      'code',
      'Mã máy',
      'Mã máy sản xuất',
      'machine_id'
    )
    if (!rawCode) continue

    const rawMFactory = m.Factory || m['Nhà máy'] || m.factory || m.FactoryName || m.factory_name || ''
    const mFactory = normalize(rawMFactory)
    const mFactoryKey = normalize(mapMasterFactoryToCatalogKey(rawMFactory))

    const isMatch =
      !targetFactoryKey ||
      !mFactory ||
      mFactory === targetFactoryKey ||
      mFactoryKey === targetFactoryKey ||
      mFactory === normFactoryName ||
      (targetFactoryKey && mFactory.includes(targetFactoryKey)) ||
      (targetFactoryKey && targetFactoryKey.includes(mFactory)) ||
      (normFactoryName && mFactory.includes(normFactoryName)) ||
      (normFactoryName && normFactoryName.includes(mFactory))

    if (isMatch) {
      addMachineCode(rawCode)
    }
  }

  // Fallback: Nếu catalogMachines có dữ liệu nhưng do tên nhà máy bên trong khác định dạng
  // dẫn đến factoryMachineCodes rỗng, thì nạp toàn bộ vì catalogMachines vốn dĩ đã được tải theo nhà máy.
  if (factoryMachineCodes.size === 0 && catalogMachines.length > 0) {
    for (const m of catalogMachines) {
      const rawCode = first(
        m,
        'MachineCode',
        'machine_code',
        'machineCode',
        'Code',
        'code',
        'Mã máy',
        'Mã máy sản xuất',
        'machine_id'
      )
      if (rawCode) addMachineCode(rawCode)
    }
  }

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

    // Thu thập và bóc tách tất cả mã máy khai báo (hỗ trợ dấu |, phẩy, chấm phẩy...)
    const rawDeclaredStrings = []
    for (const m of machines) {
      if (m?.code) rawDeclaredStrings.push(String(m.code))
    }
    if (rawDeclaredStrings.length === 0) {
      for (const p of plans) {
        const pCode = first(p, 'PlannedMachineCode', 'MachineCode', 'Mã máy sản xuất', 'Mã máy')
        if (pCode) rawDeclaredStrings.push(pCode)
      }
    }

    const extractedCodes = []
    for (const raw of rawDeclaredStrings) {
      const parts = raw.split(/[|,;\n\r/]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
      for (const p of parts) {
        if (p && p !== '(THIẾU MÃ)' && p !== '-' && p !== 'NULL' && p !== 'UNDEFINED') {
          extractedCodes.push(p)
        }
      }
    }

    const uniqueDeclaredCodes = [...new Set(extractedCodes)]
    let isBelongToFactory = 'FALSE'
    if (uniqueDeclaredCodes.length > 0 && factoryMachineCodes.size > 0) {
      const allDeclaredBelong = uniqueDeclaredCodes.every((code) => isCodeInFactory(code))
      isBelongToFactory = allDeclaredBelong ? 'TRUE' : 'FALSE'
    } else {
      isBelongToFactory = 'FALSE'
    }

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
