/**
 * Default Menu & Submenu Configuration
 * Configured in code for GsHub:
 * RootMenu: Module Báo cáo (ROOT_REPORT)
 */

import { transformDataMenu } from '../utils/transformDataMenu'

export const DEFAULT_ROOT_MENUS = [
  {
    Id: 'ROOT_REPORT',
    RootMenuId: 'ROOT_REPORT',
    RootMenuKey: 'report',
    RootMenuName: 'Báo Cáo',
    RootMenuLabel: 'Báo Cáo',
    Icon: 'BarChart3',
    MenuIcon: 'BarChart3',
    RootMenuIcon: 'BarChart3',
    RootMenuUtilities: true,
    View: true,
    OrderSeq: 1
  }
]

export const DEFAULT_SETTING_ITEMS = [
  // =========================================================================
  // ── ROOT_REPORT: Module Báo cáo ──────────────────────────────────────────
  // =========================================================================

  // ── Nhóm 1: Báo cáo sản xuất GS Hà Nội ───────────────────────────────────
  {
    Id: 'sub_report_prod_hanoi_gs1',
    MenuKey: 'report_prod_hanoi_gs1',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Báo cáo sản xuất GS Hà Nội',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_report_hanoi_gs1_stat',
    MenuKey: 'report_hanoi_gs1_stat',
    MenuSubRootId: 'sub_report_prod_hanoi_gs1',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Thống kê sản xuất',
    MenuLink: '/erp/u/report/production/hanoi-gs1/statistics',
    MenuType: 'menu',
    Icon: 'BarChart3',
    MenuIcon: 'BarChart3',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_report_hanoi_gs1_plan',
    MenuKey: 'report_hanoi_gs1_plan',
    MenuSubRootId: 'sub_report_prod_hanoi_gs1',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Kế hoạch sản xuất',
    MenuLink: '/erp/u/report/production/hanoi-gs1/plan',
    MenuType: 'menu',
    Icon: 'Calendar',
    MenuIcon: 'Calendar',
    View: true,
    OrderSeq: 2
  },

  // ── Nhóm 2: Báo cáo sản xuất GS Quế Võ 1B ────────────────────────────────
  {
    Id: 'sub_report_prod_quevo_gs5',
    MenuKey: 'report_prod_quevo_gs5',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Báo cáo sản xuất GS Quế Võ 1B',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_report_quevo_gs5_stat',
    MenuKey: 'report_quevo_gs5_stat',
    MenuSubRootId: 'sub_report_prod_quevo_gs5',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Thống kê sản xuất',
    MenuLink: '/erp/u/report/production/quevo-gs5/statistics',
    MenuType: 'menu',
    Icon: 'BarChart3',
    MenuIcon: 'BarChart3',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_report_quevo_gs5_plan',
    MenuKey: 'report_quevo_gs5_plan',
    MenuSubRootId: 'sub_report_prod_quevo_gs5',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Kế hoạch sản xuất',
    MenuLink: '/erp/u/report/production/quevo-gs5/plan',
    MenuType: 'menu',
    Icon: 'Calendar',
    MenuIcon: 'Calendar',
    View: true,
    OrderSeq: 2
  },

  // ── Nhóm 3: Đăng ký báo cáo KHSX & TKSX ──────────────────────────────────
  {
    Id: 'sub_report_data_manage',
    MenuKey: 'report_data_group',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Đăng ký báo cáo KHSX & TKSX',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 3
  },
  {
    Id: 'menu_report_data_import',
    MenuKey: 'report_data_import',
    MenuSubRootId: 'sub_report_data_manage',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Đăng ký báo cáo KHSX & TKSX',
    MenuLink: '/erp/u/report/data/import',
    MenuType: 'menu',
    Icon: 'FileSpreadsheet',
    MenuIcon: 'FileSpreadsheet',
    View: true,
    OrderSeq: 1
  }
]

// Menu Items Cấp 4 (nếu có các mục con sâu hơn)
export const DEFAULT_MENU_ITEMS = []

const EXCLUDED_ROOT_IDENTIFIERS = new Set([
  'ROOT_SYSTEM',
  'ROOT_PRODUCTION',
  'system',
  'production'
])

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
      const id = r.Id || r.RootMenuId
      if (
        (key && EXCLUDED_ROOT_IDENTIFIERS.has(key)) ||
        (id && EXCLUDED_ROOT_IDENTIFIERS.has(id)) ||
        (r.RootMenuKey && EXCLUDED_ROOT_IDENTIFIERS.has(r.RootMenuKey))
      ) {
        return
      }
      if (key) rootMenuMap.set(key, { ...r, View: r.View !== false })
    }
  )
  const mergedRoots = Array.from(rootMenuMap.values())

  const itemMap = new Map()
  ;[
    ...DEFAULT_SETTING_ITEMS,
    ...(Array.isArray(serverSettingItems) ? serverSettingItems : [])
  ].forEach((item) => {
    if (!item) return
    const rootId = item.MenuRootId
    if (rootId && EXCLUDED_ROOT_IDENTIFIERS.has(rootId)) {
      return
    }
    const key = item.MenuKey || item.Id
    if (key) itemMap.set(key, { ...item, View: item.View !== false })
  })
  const mergedItems = Array.from(itemMap.values())

  const subItemMap = new Map()
  ;[...DEFAULT_MENU_ITEMS, ...(Array.isArray(serverMenuItems) ? serverMenuItems : [])].forEach(
    (sub) => {
      if (!sub) return
      const rootId = sub.MenuRootId
      if (rootId && EXCLUDED_ROOT_IDENTIFIERS.has(rootId)) {
        return
      }
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
