/**
 * Default Menu & Submenu Configuration
 * Configured in code for GsHub:
 * 1. Submenu: Thông tin hệ thống (Root: ROOT_SYSTEM)
 * 2. Submenu: Quản lý sản xuất (Root: ROOT_PRODUCTION)
 *    - Menu: Quyết toán lệnh sản xuất (/erp/u/production/order-settlement)
 */

import { transformDataMenu } from '../utils/transformDataMenu'

export const DEFAULT_ROOT_MENUS = [
  {
    Id: 'ROOT_SYSTEM',
    RootMenuId: 'ROOT_SYSTEM',
    RootMenuKey: 'system',
    RootMenuName: 'Hệ Thống',
    RootMenuLabel: 'Hệ Thống',
    Icon: 'Server',
    MenuIcon: 'Server',
    RootMenuIcon: 'Server',
    RootMenuUtilities: true,
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'ROOT_PRODUCTION',
    RootMenuId: 'ROOT_PRODUCTION',
    RootMenuKey: 'production',
    RootMenuName: 'Sản Xuất',
    RootMenuLabel: 'Sản Xuất',
    Icon: 'Factory',
    MenuIcon: 'Factory',
    RootMenuIcon: 'Factory',
    RootMenuUtilities: true,
    View: true,
    OrderSeq: 2
  }
]

export const DEFAULT_SETTING_ITEMS = [
  // ── SUBMENU 1: Thông tin hệ thống ──────────────────────────
  {
    Id: 'sub_sys_info',
    MenuKey: 'sys_info',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Thông tin hệ thống',
    MenuType: 'submenu',
    Icon: 'InfoCircleOutlined',
    MenuIcon: 'InfoCircleOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_sys_users',
    MenuKey: 'user_management',
    MenuSubRootId: 'sub_sys_info',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Quản lý người dùng',
    MenuLink: '/erp/u/system/users',
    MenuType: 'menu',
    Icon: 'UserOutlined',
    MenuIcon: 'UserOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_sys_roles',
    MenuKey: 'role_management',
    MenuSubRootId: 'sub_sys_info',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Phân quyền & Nhóm vai trò',
    MenuLink: '/erp/u/system-settings/roles/role-management',
    MenuType: 'menu',
    Icon: 'SafetyCertificateOutlined',
    MenuIcon: 'SafetyCertificateOutlined',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_sys_structure',
    MenuKey: 'structure_modules',
    MenuSubRootId: 'sub_sys_info',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Cấu trúc hệ thống & Danh mục',
    MenuLink: '/erp/u/system-settings/structure/modules',
    MenuType: 'menu',
    Icon: 'AppstoreAddOutlined',
    MenuIcon: 'AppstoreAddOutlined',
    View: true,
    OrderSeq: 3
  },
  {
    Id: 'menu_sys_settings',
    MenuKey: 'system_settings',
    MenuSubRootId: 'sub_sys_info',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Cài đặt hệ thống',
    MenuLink: '/erp/u/setting',
    MenuType: 'menu',
    Icon: 'SettingOutlined',
    MenuIcon: 'SettingOutlined',
    View: true,
    OrderSeq: 4
  },

  // ── SUBMENU 2: Quản lý sản xuất ───────────────────────────
  {
    Id: 'sub_production_mgmt',
    MenuKey: 'production_management',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Quản lý sản xuất',
    MenuType: 'submenu',
    Icon: 'FactoryOutlined',
    MenuIcon: 'FactoryOutlined',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_production_work_process',
    MenuKey: 'production_work_process',
    MenuSubRootId: 'sub_production_mgmt',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Lệnh công đoạn',
    MenuLink: '/erp/u/production/work-process',
    MenuType: 'menu',
    Icon: 'Workflow',
    MenuIcon: 'Workflow',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_production_settlement',
    MenuKey: 'production_order_settlement',
    MenuSubRootId: 'sub_production_mgmt',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Quyết toán lệnh sản xuất',
    MenuLink: '/erp/u/production/order-settlement',
    MenuType: 'menu',
    Icon: 'ReconciliationOutlined',
    MenuIcon: 'ReconciliationOutlined',
    View: true,
    OrderSeq: 2
  }
]

export const DEFAULT_MENU_ITEMS = [
  {
    Id: 'item_production_work_process_all',
    MenuKey: 'work_process_overview',
    MenuId: 'menu_production_work_process',
    MenuSubRootId: 'menu_production_work_process',
    MenuLabel: 'Tra cứu lệnh công đoạn',
    MenuLink: '/erp/u/production/work-process',
    MenuType: 'menuitem',
    Icon: 'ApartmentOutlined',
    MenuIcon: 'ApartmentOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'item_production_settlement_all',
    MenuKey: 'settlement_overview',
    MenuId: 'menu_production_settlement',
    MenuSubRootId: 'menu_production_settlement',
    MenuLabel: 'Bảng quyết toán lệnh sản xuất',
    MenuLink: '/erp/u/production/order-settlement',
    MenuType: 'menuitem',
    Icon: 'TableOutlined',
    MenuIcon: 'TableOutlined',
    View: true,
    OrderSeq: 2
  }
]

/**
 * Merge server roles menu with default code config
 */
export function mergeWithDefaultMenuConfig(
  serverSettingItems = [],
  serverRootMenus = [],
  serverMenuItems = []
) {
  const rootMenuMap = new Map()
  ;[...DEFAULT_ROOT_MENUS, ...(Array.isArray(serverRootMenus) ? serverRootMenus : [])].forEach(
    (r) => {
      if (!r) return
      const key = r.RootMenuKey || r.Id || r.RootMenuId
      if (key) rootMenuMap.set(key, { ...r, View: r.View !== false })
    }
  )
  const mergedRoots = Array.from(rootMenuMap.values())

  const itemMap = new Map()
  ;[...DEFAULT_SETTING_ITEMS, ...(Array.isArray(serverSettingItems) ? serverSettingItems : [])].forEach(
    (item) => {
      if (!item) return
      const key = item.MenuKey || item.Id
      if (key) itemMap.set(key, { ...item, View: item.View !== false })
    }
  )
  const mergedItems = Array.from(itemMap.values())

  const subItemMap = new Map()
  ;[...DEFAULT_MENU_ITEMS, ...(Array.isArray(serverMenuItems) ? serverMenuItems : [])].forEach(
    (sub) => {
      if (!sub) return
      const key = sub.MenuKey || sub.Id
      if (key) subItemMap.set(key, { ...sub, View: sub.View !== false })
    }
  )
  const mergedSubItems = Array.from(subItemMap.values())

  const transformedMenu = transformDataMenu(mergedItems, mergedRoots, mergedSubItems)

  return {
    rootMenuItems: mergedRoots,
    settingItems: mergedItems,
    menuItemList: mergedSubItems,
    transformedMenu
  }
}

export default {
  DEFAULT_ROOT_MENUS,
  DEFAULT_SETTING_ITEMS,
  DEFAULT_MENU_ITEMS,
  mergeWithDefaultMenuConfig
}
