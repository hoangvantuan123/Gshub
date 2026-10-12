import test from 'node:test'
import assert from 'node:assert/strict'
import { buildActionRows, reconcilePermissionRows } from './backendPermissions.js'
import { buildPermissionBatch, markEdited } from './permissionRows.js'

test('empty BE data stays empty; catalog defaults never grant permissions', () => {
  assert.deepEqual(buildActionRows([], [], '2', '1'), [])
  const rows = buildActionRows(
    [{ Id: 10, ActionCode: 'CUSTOM_SEARCH', ActionName: 'Tên từ BE', IsDefaultAllow: true }],
    [],
    '2',
    '1'
  )
  assert.equal(rows[0].Allow, false)
  assert.equal(rows[0].RoleRecordId, '')
  assert.equal(rows[0].ActionName, 'Tên từ BE')
})

test('actions from BE are not restricted to a hardcoded template or BTN prefix', () => {
  const rows = buildActionRows(
    [],
    [{ Id: '9', Name: 'CUSTOM_ACTION', View: true, RowVersion: 7 }],
    '2',
    '1'
  )
  assert.equal(rows[0].Allow, true)
  assert.equal(rows[0].RoleRecordId, '9')
  assert.equal(rows[0].RowVersion, 7)
})

test('insert response sets submenu View, role ID and row version without rebuilding the tree', () => {
  const row = markEdited(
    {
      RawId: '2',
      MenuId: '2',
      RootMenuId: '1',
      MenuType: 'Submenu',
      MenuLabel: '    ▾ Tên từ BE',
      Level: 1
    },
    { View: true }
  )
  const batch = buildPermissionBatch([row], 'menu', '5')
  const response = {
    success: true,
    data: {
      result: {
        insert: {
          count: 1,
          data: JSON.stringify([
            [
              {
                Id: '91',
                Type: 'submenu',
                GroupId: '5',
                MenuId: '2',
                RootMenuId: '1',
                View: true,
                RowVersion: 3
              }
            ]
          ])
        }
      }
    }
  }
  const result = reconcilePermissionRows([row], 'menu', batch, response)
  assert.equal(result[0].View, true)
  assert.equal(result[0].CanView, true)
  assert.equal(result[0].RoleRecordId, '91')
  assert.equal(result[0].RowVersion, 3)
  assert.equal(result[0].MenuType, 'Submenu')
  assert.equal(result[0].MenuLabel, row.MenuLabel)
  assert.equal(result[0].WorkingTag, '')
  assert.deepEqual(buildPermissionBatch(result, 'menu', '5'), {
    insert: [],
    update: [],
    delete: []
  })
})

test('updates use authoritative BE values and leave unrelated pending rows intact', () => {
  const input = [
    {
      RawId: '2',
      MenuId: '2',
      RootMenuId: '1',
      MenuType: 'Submenu',
      RoleRecordId: '91',
      WorkingTag: 'U',
      View: true
    },
    { RawId: '3', MenuId: '3', RootMenuId: '1', MenuType: 'Menu', WorkingTag: 'A', View: true }
  ]
  const batch = buildPermissionBatch(input, 'menu', '5')
  const response = {
    success: false,
    data: {
      failedStep: 'update',
      result: { insert: { count: 1, data: [[{ Id: '92', View: true, RowVersion: 1 }]] } }
    }
  }
  const result = reconcilePermissionRows(input, 'menu', batch, response)
  assert.equal(result[0].WorkingTag, 'U')
  assert.equal(result[1].RoleRecordId, '92')
  assert.equal(result[1].WorkingTag, '')
  const updated = reconcilePermissionRows(
    [input[0]],
    'menu',
    { insert: [], delete: [], update: batch.update },
    {
      success: true,
      data: { result: { update: { data: [[{ Id: '91', View: false, RowVersion: 4 }]] } } }
    }
  )
  assert.equal(updated[0].View, false)
  assert.equal(updated[0].RowVersion, 4)
})

test('delete response removes member rows and resets permission rows to unassigned', () => {
  const batch = { insert: [], update: [], delete: [{ Id: 91 }] }
  const response = {
    success: true,
    data: { result: { delete: { data: [{ DeletedCount: 1, DeletedIds: ['91'] }] } } }
  }
  assert.deepEqual(
    reconcilePermissionRows([{ Id: '91', WorkingTag: 'D' }], 'users', batch, response),
    []
  )
  const menu = reconcilePermissionRows(
    [{ RoleRecordId: '91', View: false, WorkingTag: 'D' }],
    'menu',
    batch,
    response
  )
  assert.equal(menu[0].RoleRecordId, null)
  assert.equal(menu[0].WorkingTag, '')
})

test('new members receive BE-resolved user identity; new actions receive the grant ID', () => {
  const member = { UserId: 'user1', WorkingTag: 'A' }
  const batch = buildPermissionBatch([member], 'users', '5')
  const response = {
    success: true,
    data: {
      result: {
        insert: { data: [[{ Id: '11', UserId: 'USER1', UserSeq: 'seq1', RowVersion: 1 }]] }
      }
    }
  }
  const result = reconcilePermissionRows([member], 'users', batch, response)
  assert.equal(result[0].Id, '11')
  assert.equal(result[0].UserId, 'USER1')
  const action = { MenuId: '2', ActionKey: 'BTN_SAVE', WorkingTag: 'A', Allow: true }
  const actions = reconcilePermissionRows(
    [action],
    'actions',
    buildPermissionBatch([action], 'actions', '5'),
    response
  )
  assert.equal(actions[0].RoleRecordId, '11')
  assert.equal(actions[0].Allow, false)
})

test('a save response without IDs cannot clear pending changes', () => {
  assert.throws(
    () =>
      reconcilePermissionRows(
        [],
        'menu',
        { insert: [{}], update: [], delete: [] },
        { success: true, data: {} }
      ),
    /BE/
  )
})
