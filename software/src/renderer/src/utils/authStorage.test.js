import test from 'node:test'
import assert from 'node:assert/strict'
import { stripPermissionData, clearLegacyPermissionStorage } from './authStorage.js'
const permissionToken = `header.${Buffer.from(JSON.stringify({ token_use: 'permissions', data: [{ menu: [] }] })).toString('base64url')}.signature`

test('session serialization strips nested permission fields and permission JWTs', () => {
  const value = stripPermissionData({
    user: { UserId: 'admin', permissions: [{ View: true }] },
    data: {
      token: 'access-token',
      tokenRolesUserMenu: permissionToken,
      actions: { BTN_EDIT: true },
      roles_menu: 'cached'
    },
    unexpectedToken: permissionToken,
    permissionsTree: []
  })
  assert.deepEqual(value, { user: { UserId: 'admin' }, data: { token: 'access-token' } })
})

test('legacy localStorage permissions are removed without deleting UI state or identity', () => {
  const values = new Map([
    ['roles_menu', permissionToken],
    ['menuData', JSON.stringify({ menu: [{ View: true }] })],
    ['permissions', '[{"View":true}]'],
    ['userInfo', JSON.stringify({ UserId: 'admin', permissions: [] })],
    [
      'datahub_auth_session',
      JSON.stringify({ data: { token: 'access-token', tokenRolesUserMenu: permissionToken } })
    ],
    ['menu', 'true'],
    ['erp_role_group_col_width', '140'],
    ['token', permissionToken]
  ])
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  clearLegacyPermissionStorage(storage)
  assert.equal(values.has('roles_menu'), false)
  assert.equal(values.has('menuData'), false)
  assert.equal(values.has('permissions'), false)
  assert.equal(values.has('token'), false)
  assert.deepEqual(JSON.parse(values.get('userInfo')), { UserId: 'admin' })
  assert.deepEqual(JSON.parse(values.get('datahub_auth_session')), {
    data: { token: 'access-token' }
  })
  assert.equal(values.get('menu'), 'true')
  assert.equal(values.get('erp_role_group_col_width'), '140')
})
