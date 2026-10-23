import { ipcMain } from 'electron'

const COOKIE_URL = 'https://gshub-auth.invalid/'
const TOKEN_NAMES = new Set(['a_a', 'r_t'])

// file:// cannot use document.cookie. Keep desktop tokens in Chromium's cookie
// store, shared by all app windows and retained across renderer/OTA reloads.
export function setupAuthCookieIpc(getRendererUrl) {
  ipcMain.on('auth:cookie', async (event, request) => {
    try {
      const frame = event.senderFrame
      const expected = new URL(getRendererUrl())
      const actual = new URL(frame?.url || 'about:blank')
      expected.hash = ''
      actual.hash = ''
      if (
        frame !== event.sender.mainFrame ||
        actual.protocol !== 'file:' ||
        actual.href !== expected.href ||
        !TOKEN_NAMES.has(request?.name)
      ) {
        throw new Error('Invalid auth cookie request')
      }

      const cookies = event.sender.session.cookies
      const { action, name } = request
      if (action === 'get') {
        const values = await cookies.get({ url: COOKIE_URL, name })
        event.returnValue = { ok: true, value: values[0]?.value ?? null }
        return
      }
      if (action === 'remove') {
        await cookies.remove(COOKIE_URL, name)
      } else if (action === 'set') {
        if (typeof request.value !== 'string' || request.value.length > 16384) {
          throw new Error('Invalid auth cookie value')
        }
        const expirationDate = Number(request.expirationDate)
        if (!Number.isFinite(expirationDate) || expirationDate <= Date.now() / 1000) {
          await cookies.remove(COOKIE_URL, name)
        } else {
          await cookies.set({
            url: COOKIE_URL,
            name,
            value: request.value,
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'strict',
            expirationDate: Math.min(expirationDate, Date.now() / 1000 + 30 * 86400)
          })
        }
      } else {
        throw new Error('Invalid auth cookie action')
      }
      await cookies.flushStore()
      event.returnValue = { ok: true }
    } catch (error) {
      console.error('[Auth Cookies]', error.message)
      event.returnValue = { ok: false, error: 'Cannot access desktop auth cookies' }
    }
  })
}
