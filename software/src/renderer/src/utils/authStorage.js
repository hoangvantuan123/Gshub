import Cookies from 'js-cookie'
import decodeJWT from './decode-JWT.js'

const permissionKeys = new Set([
  'rolesmenu',
  'tokenrolesusermenu',
  'rawrolesmenu',
  'userpermissions',
  'permissions',
  'permissionstree',
  'settingitems',
  'rootmenuitems',
  'menuitemlist',
  'transformedmenu',
  'roletable',
  'menu',
  'rootmenu',
  'menuitem',
  'action',
  'menudata',
  'actions',
  'actiongrants',
  'roles'
])
const normalizedKey = (value) => value.toLowerCase().replace(/[_-]/g, '')
const authTokenKeys = new Set(['token', 'accesstoken', 'refreshtoken', 'aa', 'rt'])

// Tokens are held in the canonical auth cookies, never in local/session storage
// or in duplicated serialized session snapshots.
export function stripAuthTokenData(value) {
  if (Array.isArray(value)) return value.map(stripAuthTokenData)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !authTokenKeys.has(normalizedKey(key)))
      .map(([key, item]) => [key, stripAuthTokenData(item)])
  )
}

export function clearLegacyAuthTokenStorage(storage = globalThis.localStorage) {
  const tokenKeys = [
    'access_token',
    'accessToken',
    '_token',
    'token',
    'a_a',
    'refresh_token',
    'refreshToken',
    'r_t'
  ]
  const cleanStorage = (target) => {
    if (!target) return
    for (const key of tokenKeys) target.removeItem(key)
    for (const key of ['datahub_auth_session', 'gshub_auth_session', 'userInfo']) {
      const raw = target.getItem(key)
      if (!raw) continue
      try {
        const metadata = stripAuthTokenData(JSON.parse(raw))
        target.setItem(key, JSON.stringify(metadata))
      } catch {
        target.removeItem(key)
      }
    }
  }
  cleanStorage(storage)
  if (!storage || storage === globalThis.localStorage) cleanStorage(globalThis.sessionStorage)
}

// Auth-session caches must not carry menu/action snapshots or permission JWTs.
export function stripPermissionData(value) {
  if (Array.isArray(value))
    return value.map(stripPermissionData).filter((item) => item !== undefined)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !permissionKeys.has(normalizedKey(key)))
        .map(([key, item]) => [key, stripPermissionData(item)])
        .filter(([, item]) => item !== undefined)
    )
  if (typeof value === 'string') {
    if (value.split('.').length === 3) {
      try {
        const claims = decodeJWT(value)
        if (
          claims?.token_use === 'permissions' ||
          (Array.isArray(claims?.data) &&
            claims.data.some(
              (section) =>
                section &&
                ['menu', 'rootMenu', 'menuItem', 'roleTable'].some((key) =>
                  Object.hasOwn(section, key)
                )
            ))
        )
          return undefined
      } catch {
        /* Not a JWT; preserve ordinary strings. */
      }
    }
    if (/^[\[{]/.test(value.trim())) {
      try {
        return JSON.stringify(stripPermissionData(JSON.parse(value)))
      } catch {
        /* Preserve non-JSON strings. */
      }
    }
  }
  return value
}

export function clearLegacyPermissionStorage(storage = globalThis.localStorage) {
  if (!storage) return
  clearLegacyAuthTokenStorage(storage)
  for (const key of [
    'access_token',
    '_token',
    'token',
    'accessToken',
    'refresh_token',
    'refreshToken'
  ]) {
    Cookies.remove(key, { path: '/' })
  }
  for (const key of [
    'roles_menu',
    'rolesMenu',
    'tokenRolesUserMenu',
    'rawRolesMenu',
    'userPermissions',
    'permissions',
    'permissionsTree',
    'settingItems',
    'rootMenuItems',
    'menuItemList',
    'transformedMenu',
    'roleTable',
    'menuData'
  ]) {
    storage.removeItem(key)
  }
  for (const key of ['userInfo', 'datahub_auth_session', 'gshub_auth_session', 'save_users_log']) {
    const raw = storage.getItem(key)
    if (!raw) continue
    try {
      const cleaned = JSON.stringify(stripPermissionData(JSON.parse(raw)))
      if (cleaned === undefined) storage.removeItem(key)
      else if (cleaned !== raw) storage.setItem(key, cleaned)
    } catch {
      storage.removeItem(key)
    }
  }
  // 'menu' normally stores only the open/closed UI state; discard old snapshots.
  const menu = storage.getItem('menu')
  if (menu && /^[\[{]/.test(menu.trim())) storage.removeItem('menu')
}
