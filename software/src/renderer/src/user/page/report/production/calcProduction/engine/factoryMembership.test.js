import test from 'node:test'
import assert from 'node:assert/strict'
import {
  attachFactoryMembership,
  buildMachineComparison,
  createFactoryMachineChecker,
  getMachineComparisonRows
} from './machineComparison.js'
import { packProductionBundle, unpackProductionBundle } from './bundlePacker.js'
import { normalizePlanDetailRows } from '../../../registration/services/reportColumnNormalizer.js'

const catalogMachines = [
  { Factory: 'GS1', MachineCode: 'HN01' },
  { Factory: 'GS1', MachineCode: 'HN02' },
  { Factory: 'GS1B', MachineCode: 'HN03' },
  { Factory: 'GS51B', MachineCode: 'QV01' }
]
const factoryName = 'GS1 Hà Nội'

test('membership checks all production codes and excludes other factories and missing codes', () => {
  const check = createFactoryMachineChecker(catalogMachines, factoryName)
  for (const value of ['hn01', ' HN 01 ', 'HN01 | HN02', 'HN01, HN02;HN01/HN02\nHN01']) {
    assert.equal(check(value), 'TRUE', value)
  }
  for (const value of ['', null, '-', '(Thiếu mã)', 'NULL', 'HN03', 'QV01', 'HN01 | QV01']) {
    assert.equal(check(value), 'FALSE', String(value))
  }
  assert.equal(createFactoryMachineChecker([], factoryName)('HN01'), 'FALSE')
})

test('tab 7 uses actual production machine even when declared machine belongs to another factory', () => {
  const plans = [{ OperationOrderNo: 'OP1', MachineCode: 'QV01' }]
  const stats = [{ OperationOrderNo: 'OP1', MachineCode: 'HN01' }]
  const rows = buildMachineComparison(stats, plans, [], { factoryName, catalogMachines })
  assert.equal(rows[0].IsBelongToFactory, 'TRUE')
  assert.equal(rows[0].PlannedMachineCode, 'QV01')
  const reverse = buildMachineComparison(
    [{ ...stats[0], MachineCode: 'QV01' }],
    [{ ...plans[0], MachineCode: 'HN01' }], [], { factoryName, catalogMachines }
  )
  assert.equal(reverse[0].IsBelongToFactory, 'FALSE')
})

test('saved tab 7 snapshots refresh old membership without recalculating other columns', () => {
  const results = { machineComparison: {
    matchVersion: 2, factoryName, catalogMachines,
    calculatedRows: [{ ActualMachineCode: 'HN01', PlannedMachineCode: 'QV01', IsBelongToFactory: 'FALSE' }]
  } }
  assert.equal(getMachineComparisonRows(results)[0].IsBelongToFactory, 'TRUE')
})

test('tab 6 membership survives local JSON storage but is absent from bundle and ERP payload', () => {
  const original = [{ MachineCode: 'HN01' }, { 'Mã máy sản xuất': 'QV01' }]
  const calculatedRows = attachFactoryMembership(original, catalogMachines, factoryName)
  assert.deepEqual(calculatedRows.map((row) => row.IsBelongToFactory), ['TRUE', 'FALSE'])
  assert.equal(original[0].IsBelongToFactory, undefined)
  const local = JSON.parse(JSON.stringify({ plan: { calculatedRows } }))
  assert.equal(local.plan.calculatedRows[0].IsBelongToFactory, 'TRUE')
  const packed = packProductionBundle({}, {}, local)
  const onlineRows = unpackProductionBundle(packed.buffer).calcResults.plan.calculatedRows
  assert.equal(onlineRows.length, 2)
  assert.equal(onlineRows[0].MachineCode, 'HN01')
  assert.equal(Object.hasOwn(onlineRows[0], 'IsBelongToFactory'), false)
  assert.equal(Object.hasOwn(normalizePlanDetailRows(calculatedRows)[0], 'IsBelongToFactory'), false)
  assert.equal(local.plan.calculatedRows[0].IsBelongToFactory, 'TRUE')
})
