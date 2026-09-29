/**
 * Default Menu & Submenu Configuration
 * Configured in code for GsHub:
 * 1. RootMenu: Hệ thống (ROOT_SYSTEM)
 * 2. RootMenu: Quản lý sản xuất (ROOT_PRODUCTION)
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
  },
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
    OrderSeq: 3
  }
]

export const DEFAULT_SETTING_ITEMS = [
  // =========================================================================
  // ── ROOT_SYSTEM: Hệ thống ────────────────────────────────────────────────
  // =========================================================================
  {
    Id: 'sub_sys_info',
    MenuKey: 'sys_info',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Thông tin hệ thống',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
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
    View: true,
    OrderSeq: 4
  },

  // =========================================================================
  // ── ROOT_PRODUCTION: Quản lý sản xuất ────────────────────────────────────
  // =========================================================================

  // ── Nhóm 1: Quản lý Lệnh sản xuất ────────────────────────────────────────
  {
    Id: 'sub_prod_orders',
    MenuKey: 'production_orders_group',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Lệnh sản xuất & Công đoạn',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_production_work_process',
    MenuKey: 'production_work_process',
    MenuSubRootId: 'sub_prod_orders',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Lệnh công đoạn',
    MenuLink: '/erp/u/production/work-process',
    MenuType: 'menu',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_production_operation_detail',
    MenuKey: 'production_operation_detail',
    MenuSubRootId: 'sub_prod_orders',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Chi tiết thao tác sản xuất',
    MenuLink: '/erp/u/production/operation-detail',
    MenuType: 'menu',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_production_settlement',
    MenuKey: 'production_order_settlement',
    MenuSubRootId: 'sub_prod_orders',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Quyết toán lệnh sản xuất',
    MenuLink: '/erp/u/production/order-settlement',
    MenuType: 'menu',
    View: true,
    OrderSeq: 3
  },

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
  ;[
    ...DEFAULT_SETTING_ITEMS,
    ...(Array.isArray(serverSettingItems) ? serverSettingItems : [])
  ].forEach((item) => {
    if (!item) return
    const key = item.MenuKey || item.Id
    if (key) itemMap.set(key, { ...item, View: item.View !== false })
  })
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
