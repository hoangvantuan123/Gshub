import test from 'node:test'
import assert from 'node:assert/strict'
import { checkMenuPermission, findMenuByKey, resolveMenuOperation } from './permissions.js'

test('BE BTN_EDIT grant enables editing when the legacy Edit flag is false', () => {
  const menu = { MenuKey: 'system_permissions', Edit: false, actions: { BTN_EDIT: true } }
  assert.equal(checkMenuPermission([menu], 'system_permissions', 'Edit'), true)
})

test('operation flags accept flat and nested BE action keys and boolean strings', () => {
  assert.equal(resolveMenuOperation({ BTN_CREATE: 'true' }, 'Create'), true)
  assert.equal(resolveMenuOperation({ Actions: { btn_delete: '1' } }, 'Delete'), true)
  assert.equal(resolveMenuOperation({ Edit: 'false', BTN_EDIT: 'false' }, 'Edit', true), false)
})

test('legacy grants are retained when another group has a denied action', () => {
  assert.equal(resolveMenuOperation({ Edit: true, actions: { BTN_EDIT: false } }, 'Edit'), true)
})

test('BE denies are not replaced by permissive route defaults or the target group name', () => {
  assert.equal(
    resolveMenuOperation({ Name: 'Super Administrators', Edit: false }, 'Edit', true),
    false
  )
  assert.equal(resolveMenuOperation(null, 'Edit', false), false)
})

test('all URLs of the permission assignment screen resolve the same BE menu', () => {
  const menu = { MenuKey: 'perm_assign', MenuLink: '/erp/u/system/permissions', Edit: true }
  assert.equal(findMenuByKey([menu], 'system_permissions'), menu)
  assert.equal(checkMenuPermission([menu], 'permission_assignment', 'Edit'), true)
  assert.equal(checkMenuPermission([menu], 'system/permissions', 'Edit'), true)
})
