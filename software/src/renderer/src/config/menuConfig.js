import { transformDataMenu } from '../utils/transformDataMenu.js'
import { resolveMenuOperation } from '../permissions.js'

// Navigation comes exclusively from the authenticated server response.
export const DEFAULT_ROOT_MENUS = []
export const DEFAULT_SETTING_ITEMS = []
export const DEFAULT_MENU_ITEMS = []

export function mergeWithDefaultMenuConfig(
  serverSettingItems = [],
  serverRootMenus = [],
  serverMenuItems = []
) {
  const normalize = (rows, isRoot = false) =>
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row && typeof row === 'object')
      .map((row) => {
        const item = { ...row }
        for (const operation of [
          'View',
          'Create',
          'Edit',
          'Delete',
          'Import',
          'Export',
          'Copy',
          'Search'
        ]) {
          // Undeclared Search uses View, matching the backend query policy.
          // Explicit Search/BTN_SEARCH denies still take precedence.
          const fallback = operation === 'Search' && resolveMenuOperation(row, 'View')
          item[operation] = resolveMenuOperation(row, operation, fallback)
        }
        if (isRoot) {
          item.Id = row.RootMenuId ?? row.Id
          item.RootMenuId = item.Id
          item.RootMenuKey = String(row.RootMenuKey || row.Key || '')
            .replace(/^ROOT_/i, '')
            .toLowerCase()
          item.RootMenuUtilities = resolveMenuOperation(
            { View: row.RootMenuUtilities ?? row.Utilities },
            'View'
          )
          item.RootMenuLabel = row.RootMenuLabel || row.Label
          item.RootMenuName = row.RootMenuName || item.RootMenuLabel
          item.RootMenuIcon = row.RootMenuIcon || row.Icon || 'AppWindow'
        } else {
          // Role record Id is not the menu catalogue Id.
          item.Id = row.MenuId ?? row.Id
          item.MenuId = item.Id
          item.MenuKey = row.MenuKey || row.Key
          item.MenuLabel = row.MenuLabel || row.Label
          item.MenuLink = row.MenuLink || row.Link || ''
          item.MenuType = String(row.MenuType || row.Type || 'menu').toLowerCase()
        }
        return item
      })
      .sort((a, b) => Number(a.OrderSeq || 0) - Number(b.OrderSeq || 0))
  const settingItems = normalize(serverSettingItems)
  const rootMenuItems = normalize(serverRootMenus, true)
  const menuItemList = normalize(serverMenuItems)
  return {
    settingItems,
    rootMenuItems,
    menuItemList,
    transformedMenu: transformDataMenu(settingItems, rootMenuItems, menuItemList)
  }
}

export default {
  DEFAULT_ROOT_MENUS,
  DEFAULT_SETTING_ITEMS,
  DEFAULT_MENU_ITEMS,
  mergeWithDefaultMenuConfig
}
