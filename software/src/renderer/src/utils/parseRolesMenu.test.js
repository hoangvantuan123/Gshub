import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRolesMenu } from './parseRolesMenu.js'

const token = (claims) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
const now = 1000000
const user = { UserId: 'alice', UserSeq: 'user-a' }
const claims = {
  sub: 'user-a',
  token_use: 'permissions',
  exp: 2000,
  data: [
    { menu: [{ MenuId: 302, actions: { BTN_PRINT: true, CUSTOM_APPROVE: true } }] },
    { rootMenu: [] },
    { menuItem: [] },
    { roleTable: [] },
    { action: [{ MenuId: 302, ActionKey: 'BTN_PRINT', Allow: true }] }
  ]
}

test('login snapshot preserves menu actions and complete sections', () => {
  const snapshot = parseRolesMenu(token(claims), user, now)
  assert.equal(snapshot.settingItems[0].actions.CUSTOM_APPROVE, true)
  assert.equal(snapshot.actions[0].ActionKey, 'BTN_PRINT')
  assert.equal(snapshot.expiresAt, 2000000)
})

test('missing, expired, malformed and other-account snapshots are rejected', () => {
  assert.throws(() => parseRolesMenu('', user, now))
  assert.throws(() => parseRolesMenu(token({ ...claims, exp: 1 }), user, now))
  assert.throws(() => parseRolesMenu(token({ ...claims, data: [{ menu: {} }] }), user, now))
  assert.throws(() => parseRolesMenu(token({ ...claims, sub: 'user-b' }), user, now))
})
