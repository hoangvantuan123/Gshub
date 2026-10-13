import test from 'node:test'
import assert from 'node:assert/strict'
import { saveRegistrationBatches } from './registrationSaveWorkflow.js'

const saved = { success: true, data: { IdSeq: 'master-1', RegCode: 'REG-1' } }
const rows = Array.from({ length: 5 }, (_, index) => ({ ItemCode: `ITEM-${index}` }))

test('API success:false rejects a small save and never reports completion', async () => {
  const progress = []
  await assert.rejects(
    saveRegistrationBatches({
      request: async () => ({ success: false, message: 'Lỗi xử lý hệ thống nội bộ' }),
      payload: {},
      rows: rows.slice(0, 1),
      onProgress: (p) => progress.push(p)
    }),
    /Lỗi xử lý hệ thống nội bộ/
  )
  assert.deepEqual(
    progress.map((p) => p.percent),
    [0]
  )
})

test('master failure stops the batch before any detail request', async () => {
  let calls = 0
  await assert.rejects(
    saveRegistrationBatches({
      request: async () => {
        calls++
        return { success: false, message: 'Không thể kết nối' }
      },
      payload: {},
      rows,
      chunkSize: 2
    }),
    /Không thể kết nối/
  )
  assert.equal(calls, 1)
})

test('a success response without persisted master identity is not completion', async () => {
  await assert.rejects(
    saveRegistrationBatches({
      request: async () => ({ success: true, data: null }),
      payload: { regCode: 'client-code' },
      rows
    }),
    /ID bản ghi/
  )
})

test('detail failure stops remaining requests and records partial progress', async () => {
  const progress = []
  let calls = 0
  await assert.rejects(
    saveRegistrationBatches({
      request: async () =>
        ++calls === 1 ? saved : { success: false, message: 'Không có quyền thêm' },
      payload: {},
      rows,
      chunkSize: 2,
      onProgress: (p) => progress.push(p)
    }),
    (error) => {
      assert.equal(error.savedRows, 2)
      assert.equal(error.regCode, 'REG-1')
      assert.match(error.message, /Không có quyền thêm/)
      return true
    }
  )
  assert.equal(calls, 2)
  assert.deepEqual(
    progress.map((p) => p.current),
    [0, 2]
  )
})

test('completion follows all successful batches and uses server master identity', async () => {
  const calls = []
  const progress = []
  const result = await saveRegistrationBatches({
    request: async (options) => {
      calls.push(options)
      return calls.length === 1 ? saved : { success: true }
    },
    payload: { regCode: 'client-code' },
    rows,
    isStat: true,
    chunkSize: 2,
    onProgress: (p) => progress.push(p)
  })
  assert.equal(result, saved)
  assert.equal(calls.length, 3)
  assert.equal(calls[1].url, '/report/plan/ProdStatsDetailA')
  assert.equal(calls[1].data[0].MasterSeq, 'master-1')
  assert.equal(calls[1].data[0].RegCode, 'REG-1')
  assert.equal(calls[1].data[0].RowSeq, 3)
  assert.deepEqual(
    progress.map((p) => p.current),
    [0, 2, 4, 5]
  )
  assert.equal(progress.at(-1).percent, 100)
})

test('canceled save does not issue requests or report completion', async () => {
  const controller = new AbortController()
  controller.abort()
  let calls = 0
  await assert.rejects(
    saveRegistrationBatches({
      request: async () => {
        calls++
      },
      payload: {},
      rows,
      signal: controller.signal
    }),
    /hủy/
  )
  assert.equal(calls, 0)
})

test('progress cannot round to 100 before the last batch is confirmed', async () => {
  const progress = []
  let calls = 0
  await assert.rejects(saveRegistrationBatches({
    request: async () => ++calls === 1 ? saved : { success: false, message: 'Batch cuối thất bại' },
    payload: {}, rows: Array.from({ length: 1001 }, () => ({ ItemCode: 'ITEM' })),
    onProgress: (p) => progress.push(p)
  }), /Batch cuối thất bại/)
  assert.equal(progress.at(-1).percent, 99)
})
