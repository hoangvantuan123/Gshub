import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDetailQueryCell } from './detailQueryCell.js'
import { ensureWorkingTagFirstColumn } from '../../../../../utils/systemColumns.js'

const cell = (id, kind, value) => formatDetailQueryCell(value, { id, kind })

test('plan and statistics durations retain BE text, signs and precision', () => {
  for (const id of ['StandardProdTime', 'ActualProdTime', 'ActualRunTime']) {
    for (const value of ['1.5', '-1.50', '-01:30', '01:30', '−2,50', '(1.25)']) {
      assert.deepEqual(cell(id, 'Number', value), { kind: 'text', data: value, displayData: value })
    }
  }
})

test('dates, clock times, MES timestamps and time statuses keep their meanings', () => {
  assert.equal(cell('OpDate', 'Text', '2026-10-23').displayData, '2026-10-23')
  assert.equal(cell('StartTime', 'Text', '07:30').displayData, '07:30')
  assert.equal(cell('EndTime', 'Text', '19:45').displayData, '19:45')
  assert.equal(cell('TimeStatus', 'Text', 'Đúng giờ').displayData, 'Đúng giờ')
  assert.equal(
    cell('MesApprovalTime', 'Text', '2026-10-23T14:35:12').displayData,
    '2026-10-23T14:35:12'
  )
})

test('nullable numeric values stay blank, zero stays zero and invalid values stay visible', () => {
  for (const value of [null, undefined, '']) {
    assert.equal(cell('ProdQty', 'Number', value).displayData, '')
  }
  assert.equal(cell('ProdQty', 'Number', '0').data, '0')
  assert.equal(cell('ProdQty', 'Number', '-1234.500').data, '-1234.500')
  assert.equal(cell('ProdQty', 'Number', ' ').data, ' ')
  assert.equal(cell('ProdQty', 'Number', 'N/A').displayData, 'N/A')
  assert.equal(cell('SyncDelayMinutes', 'Text', '02:15').displayData, '02:15')
  assert.equal(cell('ItemCode', 'Text', '00123').data, '00123')
})

test('business Status survives persisted column settings and renders BE content', () => {
  const defaults = [{ id: 'WorkingTag' }, { id: 'ItemCode' }, { id: 'Status' }]
  assert.deepEqual(
    ensureWorkingTagFirstColumn(defaults, defaults).map((col) => col.id),
    ['WorkingTag', 'ItemCode', 'Status']
  )
  assert.deepEqual(
    ensureWorkingTagFirstColumn([{ id: 'Status' }, { id: 'ItemCode' }]).map((col) => col.id),
    ['Status', 'ItemCode']
  )
  assert.equal(cell('Status', 'Text', 'Đã duyệt').displayData, 'Đã duyệt')
  assert.equal(cell('WorkingTag', 'Text', 'A').displayData, '')
})
