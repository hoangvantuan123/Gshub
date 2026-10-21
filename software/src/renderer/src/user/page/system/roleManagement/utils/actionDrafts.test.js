import test from 'node:test'
import assert from 'node:assert/strict'
import { createActionDraftStore } from './actionDrafts.js'
import { buildPermissionBatch } from './permissionRows.js'
import { reconcilePermissionRows } from './backendPermissions.js'

const draft = (menuId, allow = true) => ({
  MenuId: menuId,
  ActionKey: 'BTN_SEARCH',
  Allow: allow,
  WorkingTag: 'A',
  Status: 'A',
  isEdited: true
})

test('switching between menus preserves action edits for each menu', () => {
  const store = createActionDraftStore()
  const first = [draft(401)]
  const second = [draft(402, false)]
  store.stage(1, first)
  store.stage(1, second)
  assert.deepEqual(store.get(1, 401), first)
  assert.deepEqual(store.get(1, 402), second)
  store.stage(1, [])
  assert.equal(store.has(1, []), true)
})

test('save collects edits from every menu in the same group without duplicates', () => {
  const store = createActionDraftStore()
  store.stage(1, [draft(401)])
  store.stage(1, [draft(402)])
  const batch = buildPermissionBatch(store.collect(1, [draft(402, false)]), 'actions', 1)
  assert.deepEqual(
    batch.insert.map((row) => [row.MenuId, row.View]),
    [
      [401, true],
      [402, false]
    ]
  )
})

test('group drafts cannot leak into another group', () => {
  const store = createActionDraftStore()
  store.stage(1, [draft(401)])
  assert.equal(store.get(2, 401), undefined)
  assert.deepEqual(store.collect(2), [])
  assert.equal(store.has(1), true)
})

test('confirmed save clears pending edits while failed save retains them', () => {
  const store = createActionDraftStore()
  const rows = [draft(401), draft(402)]
  store.stage(1, rows)
  const batch = buildPermissionBatch(store.collect(1), 'actions', 1)
  store.stage(1, reconcilePermissionRows(rows, 'actions', batch, { success: false }))
  assert.equal(store.has(1), true)
  const result = {
    success: true,
    data: {
      result: {
        insert: {
          data: batch.insert.map((row, index) => ({ ...row, Id: 100 + index, RowVersion: 1 }))
        }
      }
    }
  }
  store.stage(1, reconcilePermissionRows(rows, 'actions', batch, result))
  assert.equal(store.has(1), false)
})

test('saving only one menu keeps other pending menu edits', () => {
  const store = createActionDraftStore()
  store.stage(1, [draft(401), draft(402)])
  store.stage(1, [
    { ...draft(401), WorkingTag: '', Status: '', isEdited: false, RoleRecordId: '100' }
  ])
  assert.equal(store.get(1, 401), undefined)
  assert.equal(store.get(1, 402)[0].Allow, true)
})
