import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateKHSX, computeKhsxChecks } from './planCalculator.js'
import { DEFAULT_CALC_RULES } from './calcRuleConfig.js'

const applyDate = '2026-10-12'
const validLabel = DEFAULT_CALC_RULES.khsxStatus.validLabel
const invalidLabel = DEFAULT_CALC_RULES.khsxStatus.invalidLabel

function planRow(code) {
  return {
    OperationOrderNo: code,
    PlannedStartTime: '12/10/2026 07:00:00',
    TargetQty: 100,
    PlannedQty: 110
  }
}

test('qualified quantity sums only Tab 1 slips with the complete operation code', () => {
  const result = calculateKHSX(
    {
      summary_op: { data: [planRow('TT2610-0926(302)'), planRow('TT2610-0926(303)')] },
      unfinished_op: { data: [{ OperationOrderNo: 'TT2610-0926(303)', StatQty: 11385 }] },
      stat_report: {
        data: [
          { OperationOrderNo: 'TT2610-0926(302)', QualifiedQty: 40, ActualRunTime: 10 },
          { OperationOrderNo: ' tt2610-0926(302) ', QualifiedQty: 60, ActualRunTime: 20 }
        ]
      }
    },
    { applyDate }
  )
  const byCode = new Map(result.calculatedRows.map((row) => [row.OperationOrderNo, row]))
  const matched = byCode.get('TT2610-0926(302)')
  const missing = byCode.get('TT2610-0926(303)')
  assert.equal(matched.ActualQualifiedQty, 100)
  assert.equal(matched.ActualRunMinutes, 30)
  assert.equal(missing.ActualQualifiedQty, 0)
  assert.equal(missing.CoordinatorStatus, DEFAULT_CALC_RULES.coordinatorStatus.missedPlan)
  assert.equal(result.totalQualifiedQty, 100)
})

test('zero or missing qualified quantity cannot inherit unfinished or produced quantity', () => {
  for (const quantity of [{ QualifiedQty: 0 }, {}]) {
    const result = calculateKHSX(
      {
        summary_op: { data: [planRow('TT2610-0925(301)')] },
        unfinished_op: { data: [{ OperationOrderNo: 'TT2610-0925(301)', StatQty: 11385 }] },
        stat_report: {
          data: [{ OperationOrderNo: 'TT2610-0925(301)', ProducedQty: 11385, ...quantity }]
        }
      },
      { applyDate }
    )
    assert.equal(result.calculatedRows[0].ActualQualifiedQty, 0)
    assert.equal(result.totalQualifiedQty, 0)
  }
})

test('a suffixed Tab 1 operation stays separate from a planned unsuffixed code', () => {
  const result = calculateKHSX(
    {
      summary_op: { data: [planRow('TT2610-0926')] },
      stat_report: {
        data: [
          { OperationOrderNo: 'TT2610-0926(303)', QualifiedQty: 30 },
          { OperationOrderNo: 'TT2610-0926(303)', QualifiedQty: 40 }
        ]
      }
    },
    { applyDate }
  )
  const byCode = new Map(result.calculatedRows.map((row) => [row.OperationOrderNo, row]))
  assert.equal(byCode.get('TT2610-0926').ActualQualifiedQty, 0)
  assert.equal(byCode.get('TT2610-0926(303)').ActualQualifiedQty, 70)
  assert.equal(result.totalQualifiedQty, 70)
})

test('KHSX checks only the start against the master shift boundaries', () => {
  for (const end of ['14/10/2026 23:59:00', '11/10/2026 07:00:00', '', 'invalid']) {
    for (const start of ['12/10/2026 07:00:00', '12/10/2026 23:59:00', '13/10/2026 06:59:59']) {
      const checks = computeKhsxChecks(start, end, applyDate)
      assert.equal(checks.checkKhsxStart, validLabel)
      assert.equal(checks.checkKhsxFull, validLabel)
    }
  }
  for (const start of ['12/10/2026 06:59:59', '13/10/2026 07:00:00', '']) {
    const checks = computeKhsxChecks(start, '14/10/2026 23:59:00', applyDate)
    assert.equal(checks.checkKhsxStart, invalidLabel)
    assert.equal(checks.checkKhsxFull, invalidLabel)
  }
})

test('KHSX generates the end from master and recalculates planned minutes and capa', () => {
  for (const fileKey of ['summary_op', 'unfinished_op']) {
    for (const end of ['14/10/2026 23:59:00', 'invalid', '']) {
      const result = calculateKHSX(
        {
          [fileKey]: {
            data: [
              {
                OperationOrderNo: 'TT2610-0925(301)',
                PlannedStartTime: '12/10/2026 07:00:00',
                PlannedEndTime: end,
                TargetQty: 1600,
                PlannedQty: 1605
              },
              {
                OperationOrderNo: 'TT2610-0926(303)',
                PlannedStartTime: '12/10/2026 23:59:00',
                PlannedEndTime: end,
                TargetQty: 1165,
                PlannedQty: 1217
              }
            ]
          }
        },
        { applyDate }
      )
      assert.equal(result.calculatedRows.length, 2)
      const [morning, night] = result.calculatedRows
      for (const row of result.calculatedRows) {
        assert.equal(row.EndTime, '13/10/2026 07:00:00')
        assert.equal(row.KhsxStatus, validLabel)
        assert.equal(row.CoordinatorStatus, DEFAULT_CALC_RULES.coordinatorStatus.missedPlan)
      }
      assert.equal(morning.StandardRunMinutes, 1440)
      assert.equal(morning.StandardCapa, 66.67)
      assert.equal(night.StandardRunMinutes, 421)
      assert.equal(night.StandardCapa, 166.03)
    }
  }
})
