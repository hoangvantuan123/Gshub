import test from 'node:test'
import assert from 'node:assert/strict'
import { encryptMenuPayload, decryptMenuPayload } from './loadMenuData.js'

test('AES cache round trip preserves nested and explicit action grants', () => {
  const data = {
    userId: 'alice',
    userSeq: 'u1',
    expiresAt: 2000000,
    settingItems: [
      { MenuId: 302, actions: { BTN_PRINT: true, BTN_DELETE: false, CUSTOM_APPROVE: true } }
    ],
    actions: [{ MenuId: 302, ActionKey: 'CUSTOM_APPROVE', Allow: true }]
  }
  const encrypted = encryptMenuPayload(data)
  assert.ok(encrypted)
  assert.equal(encrypted.includes('CUSTOM_APPROVE'), false)
  assert.deepEqual(decryptMenuPayload(encrypted), data)
  assert.equal(decryptMenuPayload('not-an-encrypted-payload'), null)
})
