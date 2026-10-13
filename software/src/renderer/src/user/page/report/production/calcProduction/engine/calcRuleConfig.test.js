import test from 'node:test'
import assert from 'node:assert/strict'
import { createShiftWindowEvaluator, evaluateCoordinatorStatus } from './calcRuleConfig.js'
import { parseDateTimeFlexible } from './planCalculator.js'

test('coordinator status matches the Excel formula for master date 12 October', () => {
  const shift = createShiftWindowEvaluator('2026-10-12')
  const cases = [
    ['12/10/2026 06:59:59', 0, 100, 110, 'SX sai ngày KH'],
    ['13/10/2026 07:00:00', 100, 100, 110, 'SX sai ngày KH'],
    ['12/10/2026 07:00:00', 0, 100, 110, 'Trượt KH'],
    ['13/10/2026 06:59:59', 100, 100, 110, 'Khớp số lượng'],
    ['12/10/2026 23:59:00', 1050, 1018, 1044, 'Khớp số lượng'],
    ['12/10/2026 07:00:00', 100, 105, 106, 'Khớp số lượng'],
    ['12/10/2026 07:00:00', 100, 105.01, 106, 'Khớp job'],
    ['12/10/2026 07:00:00', 1504, 1600, 1605, 'Khớp job'],
    ['12/10/2026 07:00:00', 1270, 1217, 1353, 'Khớp số lượng'],
    ['12/10/2026 23:59:00', 1270, 1165, 1217, 'Khớp job']
  ]
  for (const [start, actual, target, planned, expected] of cases) {
    const isInside = shift.isInsideShift(parseDateTimeFlexible(start).valueOf())
    assert.equal(evaluateCoordinatorStatus(actual, target, planned, isInside), expected)
  }
})
