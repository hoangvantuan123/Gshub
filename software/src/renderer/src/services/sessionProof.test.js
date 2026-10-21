import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionProof } from './sessionProof.js'
test('session proof signs exact request and token with nonexportable private key', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
    'verify'
  ])
  await assert.rejects(crypto.subtle.exportKey('jwk', keys.privateKey))
  const raw = await createSessionProof('post', 'http://localhost/api/test?x=1', 'token-A', keys)
  const [h, b, s] = raw.split('.')
  const header = JSON.parse(Buffer.from(h, 'base64url'))
  const body = JSON.parse(Buffer.from(b, 'base64url'))
  assert.equal(header.jwk.d, undefined)
  assert.equal(body.htm, 'POST')
  assert.equal(body.htu, 'http://localhost/api/test')
  const expected = Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode('token-A'))
  ).toString('base64url')
  assert.equal(body.ath, expected)
  assert.equal(
    await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      keys.publicKey,
      Buffer.from(s, 'base64url'),
      new TextEncoder().encode(h + '.' + b)
    ),
    true
  )
  const second = await createSessionProof('POST', 'http://localhost/api/test', 'token-A', keys)
  assert.notEqual(JSON.parse(Buffer.from(second.split('.')[1], 'base64url')).jti, body.jti)
})
