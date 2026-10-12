import { openDB } from 'idb'
import { getDefaultDataHubUrl } from '../config/serverConfig.js'
const encode = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const json = (value) => encode(new TextEncoder().encode(JSON.stringify(value)))
let keyPromise
async function loadKeys() {
  const db = await openDB('gshub-session-proof', 1, {
    upgrade(db) {
      db.createObjectStore('keys')
    }
  })
  try {
    const tx = db.transaction('keys', 'readwrite')
    let keys = await tx.store.get('active')
    await tx.done
    if (keys?.privateKey && keys.privateKey.extractable === false) return keys
    const generated = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify']
    )
    // Resolve cross-tab creation races atomically after key generation.
    const save = db.transaction('keys', 'readwrite')
    keys = await save.store.get('active')
    if (!keys?.privateKey || keys.privateKey.extractable !== false) {
      keys = generated
      await save.store.put(keys, 'active')
    }
    await save.done
    return keys
  } finally {
    db.close()
  }
}
export async function createSessionProof(method, uri, token = '', keys = null) {
  if (!crypto?.subtle) throw new Error('Session security requires HTTPS or localhost')
  if (!keys) {
    keyPromise ||= loadKeys().catch((err) => {
      keyPromise = null
      throw err
    })
    keys = await keyPromise
  }
  const exported = await crypto.subtle.exportKey('jwk', keys.publicKey)
  const jwk = { kty: exported.kty, crv: exported.crv, x: exported.x, y: exported.y }
  const url = new URL(uri)
  url.search = ''
  url.hash = ''
  const claims = {
    htm: method.toUpperCase(),
    htu: url.href,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID()
  }
  if (token)
    claims.ath = encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
  const unsigned = json({ typ: 'dpop+jwt', alg: 'ES256', jwk }) + '.' + json(claims)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    new TextEncoder().encode(unsigned)
  )
  return unsigned + '.' + encode(signature)
}
export async function attachSessionProof(config) {
  // Preparation stage: existing HTTP deployments remain usable until server enforcement is enabled.
  if (!globalThis.crypto?.subtle) return config
  const raw = config.url || ''
  const combined = /^https?:\/\//i.test(raw)
    ? raw
    : config.baseURL
      ? config.baseURL.replace(/\/$/, '') + '/' + raw.replace(/^\//, '')
      : raw
  const url = new URL(combined, window.location.href)
  const apiOrigin = new URL(getDefaultDataHubUrl(), window.location.href).origin
  if (url.origin !== apiOrigin || !url.pathname.startsWith('/api/')) return config
  const headers = config.headers || {}
  const authorization =
    headers.get?.('Authorization') || headers.Authorization || headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const proof = await createSessionProof(config.method || 'GET', url.href, token)
  if (headers.set) headers.set('DPoP', proof)
  else headers.DPoP = proof
  config.headers = headers
  return config
}
