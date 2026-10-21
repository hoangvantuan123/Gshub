import test from 'node:test'
import assert from 'node:assert/strict'
import {
  attachDeclaredMachines,
  buildMachineComparison,
  getMesMachineSources,
  getMachineComparisonRows,
  getMachineComparisonPage
} from './machineComparison.js'

test('report detail loads saved tab 7 without any architecture file for that tab', () => {
  const storedRows = Array.from({ length: 1502 }, (_, index) => ({
    StatSlipNo: `TK${index + 1}`,
    MachineComparisonStatus: index === 1501 ? 'Khác máy' : 'Khớp máy'
  }))
  const results = { machineComparison: { calculatedRows: storedRows } }
  const rows = getMachineComparisonRows(JSON.parse(JSON.stringify(results)))
  const firstPage = getMachineComparisonPage(rows)
  const nextPage = getMachineComparisonPage(rows, 2)
  assert.equal(firstPage.total, 1502)
  assert.equal(firstPage.rows.length, 1500)
  assert.equal(firstPage.hasMore, true)
  assert.deepEqual(
    nextPage.rows.map((row) => row.StatSlipNo),
    ['TK1501', 'TK1502']
  )
  assert.equal(nextPage.hasMore, false)
  const filtered = getMachineComparisonPage(rows, 1, 1500, (items) =>
    items.filter((row) => row.MachineComparisonStatus === 'Khác máy')
  )
  assert.equal(filtered.total, 1)
  assert.equal(filtered.rows[0].StatSlipNo, 'TK1502')
})

test('legacy detail reports reconstruct all tab 7 rows from calculated TK, KH and MES sources', () => {
  const rows = getMachineComparisonRows(
    {
      stat: {
        calculatedRows: [
          { OperationOrderNo: 'TT', StatSlipNo: 'TK1', MachineCode: 'M1', MachineName: 'Máy 1' },
          { OperationOrderNo: 'TT', StatSlipNo: 'TK2', MachineCode: 'M2', MachineName: 'Máy 2' }
        ]
      },
      plan: { calculatedRows: [{ OperationOrderNo: 'TT' }] }
    },
    [{ OperationOrderNo: 'TT', PlannedMachineCode: 'M1', PlannedMachineName: 'Máy 1' }],
    [{ BravoStatCode: 'TK2', SlipNo: 'MES2', OperationOrderNo: 'TT', MachineName: 'Máy 2' }]
  )
  assert.equal(rows.length, 2)
  assert.equal(rows[1].MachineComparisonStatus, 'Khác máy')
  assert.equal(rows[1].MesMachineName, 'Máy 2')
  assert.equal(rows[1].MesComparisonStatus, 'Khớp máy MES')
})

test('joins MES by each Bravo TK slip and the exact operation, retaining MES names', () => {
  const sources = getMesMachineSources([
    { BravoStatCode: 'TK1', SlipNo: 'MES1', OperationOrderNo: 'TT(01)', MachineName: 'Máy A' },
    { BravoStatCode: 'TK2', SlipNo: 'MES2', OperationOrderNo: 'TT(01)', MachineName: 'Máy B' },
    {
      BravoStatCode: 'TK1',
      SlipNo: 'MES3',
      OperationOrderNo: 'TT(02)',
      MachineName: 'Không được ghép'
    }
  ])
  const rows = buildMachineComparison(
    [
      { StatSlipNo: 'TK1', OperationOrderNo: 'TT(01)', MachineName: 'máy a' },
      { StatSlipNo: 'TK2', OperationOrderNo: 'TT(01)', MachineName: 'Máy A' },
      { StatSlipNo: 'TK3', OperationOrderNo: 'TT(01)', MachineName: 'Máy A' }
    ],
    [],
    JSON.parse(JSON.stringify(sources))
  )
  assert.equal(rows.length, 3)
  assert.deepEqual(
    rows.map((row) => row.MesMachineName),
    ['Máy A', 'Máy B', '']
  )
  assert.deepEqual(
    rows.map((row) => row.MesComparisonStatus),
    ['Khớp máy MES', 'Khác máy MES', 'Chưa có phiếu MES']
  )
  assert.equal(rows[0].MesSlipNo, 'MES1')
  assert.equal(rows[0].MesComparisonBasis, 'Tên máy')
})

test('MES prefers machine codes when available and never guesses a code from its name', () => {
  const rows = buildMachineComparison(
    [
      { StatSlipNo: 'TK1', OperationOrderNo: 'TT', MachineCode: '001', MachineName: 'Máy A' },
      { StatSlipNo: 'TK2', OperationOrderNo: 'TT', MachineCode: '001' }
    ],
    [],
    [
      {
        BravoStatCode: 'TK1',
        SlipNo: 'MES1',
        OperationOrderNo: 'TT',
        MachineCode: '002',
        MachineName: 'Máy A'
      },
      { BravoStatCode: 'TK2', SlipNo: 'MES2', OperationOrderNo: 'TT', MachineName: 'Máy A' }
    ]
  )
  assert.equal(rows[0].MesComparisonStatus, 'Khác máy MES')
  assert.equal(rows[0].MesComparisonBasis, 'Mã máy')
  assert.equal(rows[1].MesComparisonStatus, 'Thiếu máy đối chiếu MES')
  assert.equal(rows[1].MesMachineCode, '(Không có mã MES)')
})

test('MES matches only its TK code, never its own slip code or another TK of the same operation', () => {
  const rows = buildMachineComparison(
    [
      { StatSlipNo: 'TK1', OperationOrderNo: 'TT', MachineName: 'Máy đúng' },
      { StatSlipNo: 'TK2', OperationOrderNo: 'TT', MachineName: 'Máy đúng' }
    ],
    [],
    [
      { 'Mã TK': 'TK1', SlipNo: 'MES1', OperationOrderNo: 'TT', MachineName: 'Máy đúng' },
      { BravoStatCode: 'TK-khác', SlipNo: 'TK1', OperationOrderNo: 'TT', MachineName: 'Máy sai' },
      { SlipNo: 'TK2', OperationOrderNo: 'TT', MachineName: 'Không được ghép' }
    ]
  )
  assert.equal(rows[0].MesMachineName, 'Máy đúng')
  assert.equal(rows[0].MesSlipNo, 'MES1')
  assert.equal(rows[1].MesComparisonStatus, 'Chưa có phiếu MES')
})

test('saved results using the old MES slip fallback are rebuilt using only MES TK codes', () => {
  const rows = getMachineComparisonRows({
    stat: { calculatedRows: [{ StatSlipNo: 'TK1', OperationOrderNo: 'TT' }] },
    machineComparison: {
      calculatedRows: [{ MesMachineName: 'Ghép sai trước đây' }],
      mesMachines: [
        { BravoStatCode: 'TK-khác', SlipNo: 'TK1', OperationOrderNo: 'TT', MachineName: 'Sai' }
      ]
    }
  })
  assert.equal(rows[0].MesMachineName, '')
  assert.equal(rows[0].MesComparisonStatus, 'Chưa có phiếu MES')
})

test('ambiguous MES machines do not multiply a TK row or silently pick the last approval', () => {
  const rows = buildMachineComparison(
    [{ StatSlipNo: 'TK1', OperationOrderNo: 'TT', MachineName: 'Máy A', QualifiedQty: 10 }],
    [],
    [
      { BravoStatCode: 'TK1', SlipNo: 'MES1', OperationOrderNo: 'TT', MachineName: 'Máy A' },
      { BravoStatCode: 'TK1', SlipNo: 'MES2', OperationOrderNo: 'TT', MachineName: 'Máy B' }
    ]
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].QualifiedQty, 10)
  assert.equal(rows[0].MesComparisonStatus, 'Nhiều máy MES')
  assert.equal(rows[0].MesMachineName, 'Máy A | Máy B')
})

test('starts from every TK row and preserves multiple slips and machines per operation', () => {
  const plans = attachDeclaredMachines(
    [{ OperationOrderNo: 'TT(01)' }],
    [
      {
        OperationOrderNo: 'TT(01)',
        PlannedMachineCode: '001',
        PlannedMachineName: 'Máy 1'
      }
    ]
  )
  const rows = buildMachineComparison(
    [
      { OperationOrderNo: 'TT(01)', StatSlipNo: 'TK1', MachineCode: '001' },
      { OperationOrderNo: 'TT(01)', StatSlipNo: 'TK2', MachineCode: '002' },
      { OperationOrderNo: 'TT(01)', StatSlipNo: 'TK3', MachineCode: '001' },
      { OperationOrderNo: 'TT(02)', StatSlipNo: 'TK4', MachineCode: '001' }
    ],
    plans
  )
  assert.equal(rows.length, 4)
  assert.deepEqual(
    rows.map((row) => row.StatSlipNo),
    ['TK1', 'TK2', 'TK3', 'TK4']
  )
  assert.deepEqual(
    rows.map((row) => row.MachineComparisonStatus),
    ['Khớp máy', 'Khác máy', 'Khớp máy', 'Chưa có KHSX']
  )
  assert.equal(rows[1].PlannedMachineCode, '001')
  assert.equal(rows[1].MachineDifference, 'Khai báo 001 → Thực tế 002')
})

test('compares full machine codes, preserving leading zeroes and ignoring case/outer spaces', () => {
  const rows = buildMachineComparison(
    [
      { OperationOrderNo: ' tt ', MachineCode: ' m01 ' },
      { OperationOrderNo: 'TT', MachineCode: 'M1' }
    ],
    [{ OperationOrderNo: 'TT', DeclaredMachines: [{ code: 'M01', name: 'Máy' }] }]
  )
  assert.deepEqual(
    rows.map((row) => row.MachineComparisonStatus),
    ['Khớp máy', 'Khác máy']
  )
})

test('missing codes cannot match by name or inherit actual machines from a different operation', () => {
  const plans = attachDeclaredMachines(
    [{ OperationOrderNo: 'TT1', MachineName: 'Máy thực tế' }, { OperationOrderNo: 'TT2' }],
    [{ OperationOrderNo: 'TT2', PlannedMachineCode: 'M2', PlannedMachineName: 'Máy 2' }]
  )
  const rows = buildMachineComparison(
    [
      { OperationOrderNo: 'TT1', MachineCode: 'M2' },
      { OperationOrderNo: 'TT2' },
      { MachineCode: 'M2' }
    ],
    plans
  )
  assert.deepEqual(
    rows.map((row) => row.MachineComparisonStatus),
    ['Thiếu mã máy khai báo', 'Thiếu mã máy thực tế', 'Thiếu lệnh thao tác']
  )
  assert.equal(rows[0].PlannedMachineCode, '')
})

test('multiple declared machines stay paired and ambiguous without multiplying TK quantities', () => {
  const plans = attachDeclaredMachines(
    [{ OperationOrderNo: 'TT' }],
    [
      { OperationOrderNo: 'TT', PlannedMachineCode: 'M1', PlannedMachineName: 'Máy 1' },
      { OperationOrderNo: 'TT', PlannedMachineCode: 'M2', PlannedMachineName: 'Máy 2' },
      { OperationOrderNo: 'TT', PlannedMachineCode: 'M1', PlannedMachineName: 'Máy 1' }
    ]
  )
  const rows = buildMachineComparison(
    [{ OperationOrderNo: 'TT', MachineCode: 'M1', QualifiedQty: 100 }],
    plans
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].QualifiedQty, 100)
  assert.equal(rows[0].PlannedMachineCode, 'M1 | M2')
  assert.equal(rows[0].PlannedMachineName, 'Máy 1 | Máy 2')
  assert.equal(rows[0].MachineComparisonStatus, 'Nhiều máy khai báo')
  assert.deepEqual(buildMachineComparison([], plans), [])
})
