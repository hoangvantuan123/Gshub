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
  for (const key of ['access_token', 'token', 'a_a', 'refresh_token']) {
    const value = storage.getItem(key)
    if (value && stripPermissionData(value) === undefined) storage.removeItem(key)
  }
  // 'menu' normally stores only the open/closed UI state; discard old snapshots.
  const menu = storage.getItem('menu')
  if (menu && /^[\[{]/.test(menu.trim())) storage.removeItem('menu')
}
