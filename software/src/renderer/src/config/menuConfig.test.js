import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeWithDefaultMenuConfig } from './menuConfig.js'
import { checkMenuPermission } from '../permissions.js'

test('an account without server grants receives no sample menus', () => {
  assert.deepEqual(mergeWithDefaultMenuConfig(), {
    settingItems: [],
    rootMenuItems: [],
    menuItemList: [],
    transformedMenu: []
  })
})

test('missing and string false grants deny access; catalogue identity is retained', () => {
  const { settingItems, rootMenuItems } = mergeWithDefaultMenuConfig(
    [{ Id: 90, MenuId: 7, MenuKey: 'system_permissions', View: 'false' }],
    [{ Id: 91, RootMenuId: 2, RootMenuKey: 'system', View: true }]
  )
  assert.equal(settingItems[0].Id, 7)
  assert.equal(rootMenuItems[0].Id, 2)
  assert.equal(settingItems[0].View, false)
  assert.equal(settingItems[0].Edit, false)
  assert.equal(rootMenuItems[0].Create, false)
})

test('a URL substring cannot grant a different screen access', () => {
  const permissions = [{ MenuKey: 'other', MenuLink: '/erp/u/system/users-details', View: true }]
  assert.equal(checkMenuPermission(permissions, 'system/users'), false)
  assert.equal(checkMenuPermission(permissions, 'users'), false)
})

test('ROOT_* module keys and mixed catalogue IDs render assigned menus without samples', () => {
  const result = mergeWithDefaultMenuConfig(
    [
      {
        Id: 90,
        MenuId: 700,
        MenuType: 'submenu',
        MenuKey: 'system_users_roles_group',
        MenuRootId: 2,
        View: true,
        NavigationOnly: true
      },
      {
        Id: 91,
        MenuId: 703,
        MenuType: 'menu',
        MenuKey: 'system_permissions',
        MenuRootId: 2,
        MenuSubRootId: 700,
        View: true,
        actions: { BTN_PRINT: true }
      }
    ],
    [{ Id: 92, RootMenuId: 2, RootMenuKey: 'ROOT_SYSTEM', View: true, RootMenuUtilities: true }]
  )
  assert.equal(result.rootMenuItems[0].RootMenuKey, 'system')
  assert.equal(result.transformedMenu[0].RootMenuKey, 'system')
  assert.equal(result.transformedMenu[0].subMenu[0].MenuKey, 'system_permissions')
  assert.equal(checkMenuPermission(result.settingItems, 'system_users_roles_group'), false)
  assert.equal(checkMenuPermission(result.settingItems, 'system_permissions', 'Print'), true)
})

test('database system menu keys map to their actual screens without crossing role assignment and group management', () => {
  assert.equal(checkMenuPermission([{ MenuKey: 'system_users', View: true }], 'user_mgmt'), true)
  assert.equal(
    checkMenuPermission([{ MenuKey: 'system_root_modules', View: true }], 'system_modules'),
    true
  )
  assert.equal(
    checkMenuPermission(
      [{ MenuKey: 'system_role_groups', Edit: true }],
      'system_permissions',
      'Edit'
    ),
    false
  )
})
