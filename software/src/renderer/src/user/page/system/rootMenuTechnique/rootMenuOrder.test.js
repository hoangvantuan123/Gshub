import test from 'node:test'
import assert from 'node:assert/strict'
import { fromRootMenuApi, toRootMenuOrder } from './rootMenuOrder.js'
import { updateIndexNo } from '../../../components/sheet/js/updateIndexNo.js'
test('order survives row numbering, edit, save and reload', () => {
  const rows = updateIndexNo(
    [
      { Id: 10, IdxNo: 20 },
      { Id: 11, IdxNo: 10 }
    ].map(fromRootMenuApi)
  )
  assert.deepEqual(rows.map(toRootMenuOrder), [20, 10])
  rows[0].OrderSeq = 5
  const saved = { Id: rows[0].Id, IdxNo: toRootMenuOrder(rows[0]) }
  const reloaded = updateIndexNo([fromRootMenuApi(saved)])[0]
  assert.equal(reloaded.IdxNo, 1)
  assert.equal(reloaded.OrderSeq, 5)
})
test('new rows use explicit order or initial row number', () => {
  assert.equal(toRootMenuOrder({ IdxNo: 2, OrderSeq: 8 }), 8)
  assert.equal(toRootMenuOrder({ IdxNo: 2 }), 2)
})
