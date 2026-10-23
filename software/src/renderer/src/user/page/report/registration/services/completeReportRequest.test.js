import test from 'node:test'
import assert from 'node:assert/strict'
import { completeReportRequest } from './completeReportRequest.js'

const rows = Array.from({ length: 20001 }, (_, i) => ({ IdSeq: String(i), TargetProdQty: i }))

test('factory report keeps all 20,001 rows without changing values or order', async () => {
  let calls = 0
  const result = await completeReportRequest(
    async (params) => {
      calls++
      assert.equal(params.includeItems, 'all')
      return { success: true, data: { items: rows, pagination: { total: rows.length } } }
    },
    { detailsOnly: 'true', pageSize: '10000' }
  )
  assert.equal(calls, 1)
  assert.deepEqual(result.data.items, rows)
  assert.equal(result.data.pagination.loadedCount, 20001)
})

test('older backend pagination is fully loaded before exposing data to KPI formulas', async () => {
  const pages = []
  const result = await completeReportRequest(async ({ page }) => {
    pages.push(page)
    return {
      success: true,
      data: {
        items: rows.slice((page - 1) * 10000, page * 10000),
        pagination: { total: rows.length }
      }
    }
  })
  assert.deepEqual(pages, [1, 2, 3])
  assert.deepEqual(result.data.items, rows)
  assert.equal(result.data.pagination.totalPages, 1)
})

test('nested response envelope is preserved', async () => {
  const result = await completeReportRequest(async () => ({
    success: true,
    data: { data: { items: [], pagination: { total: 0 } } }
  }))
  assert.equal(result.success, true)
  assert.deepEqual(result.data.data.items, [])
})

test('a failed or incomplete page never becomes a partial successful report', async () => {
  await assert.rejects(
    completeReportRequest(async () => ({ success: false, message: 'Backend unavailable' })),
    /Backend unavailable/
  )
  for (const next of [
    { items: [], pagination: { total: 2 } },
    { items: [{ IdSeq: '2' }], pagination: { total: 3 } },
    { items: [{ IdSeq: '1' }], pagination: { total: 2 } }
  ]) {
    await assert.rejects(
      completeReportRequest(async ({ page }) => ({
        data: page === 1 ? { items: [{ IdSeq: '1' }], pagination: { total: 2 } } : next
      }))
    )
  }
  await assert.rejects(
    completeReportRequest(async ({ page }) => {
      if (page === 2) throw new Error('connection interrupted')
      return { data: { items: [{ IdSeq: '1' }], pagination: { total: 2 } } }
    }),
    /connection interrupted/
  )
})
