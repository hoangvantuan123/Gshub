import Cookies from 'js-cookie'

const tokenNames = new Set(['a_a', 'r_t'])
const useDesktopStore = (name) =>
  globalThis.location?.protocol === 'file:' &&
  typeof globalThis.window?.electron?.authCookie === 'function' &&
  tokenNames.has(name)

export default {
  get(name) {
    return useDesktopStore(name)
      ? window.electron.authCookie({ action: 'get', name })
      : Cookies.get(name)
  },
  set(name, value, options = {}) {
    if (!useDesktopStore(name)) return Cookies.set(name, value, options)
    const expires =
      options.expires instanceof Date
        ? options.expires.getTime()
        : Date.now() + (options.expires || 7) * 86400000
    window.electron.authCookie({
      action: 'set',
      name,
      value: String(value),
      expirationDate: expires / 1000
    })
    return value
  },
  remove(name, options) {
    if (useDesktopStore(name)) return window.electron.authCookie({ action: 'remove', name })
    return Cookies.remove(name, options)
  }
}
