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
  },
  {
    Id: 'ROOT_SYSTEM',
    RootMenuId: 'ROOT_SYSTEM',
    RootMenuKey: 'system',
    RootMenuName: 'Quản Trị Hệ Thống',
    RootMenuLabel: 'Quản Trị Hệ Thống',
    Icon: 'Settings',
    MenuIcon: 'Settings',
    RootMenuIcon: 'Settings',
    RootMenuUtilities: true,
    View: true,
    OrderSeq: 2
  }
]

export const DEFAULT_SETTING_ITEMS = [
  // =========================================================================
  // ── ROOT_SYSTEM: Module Quản Trị Hệ Thống ───────────────────────────────
  // =========================================================================
  {
    Id: 'sub_system_users_roles',
    MenuKey: 'system_users_roles_group',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Người dùng & Phân quyền',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_system_users',
    MenuKey: 'system_users',
    MenuSubRootId: 'sub_system_users_roles',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Đăng ký Người dùng / Tài khoản',
    MenuLink: '/erp/u/system/users',
    MenuType: 'menu',
    Icon: 'Users',
    MenuIcon: 'Users',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_system_role_groups',
    MenuKey: 'system_role_groups',
    MenuSubRootId: 'sub_system_users_roles',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Đăng ký Nhóm phân quyền (Vai trò)',
    MenuLink: '/erp/u/system/role-groups',
    MenuType: 'menu',
    Icon: 'Shield',
    MenuIcon: 'Shield',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_system_permissions',
    MenuKey: 'system_permissions',
    MenuSubRootId: 'sub_system_users_roles',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Quản lý Phân quyền (Gắn User & Quyền)',
    MenuLink: '/erp/u/system/permissions',
    MenuType: 'menu',
    Icon: 'ShieldCheck',
    MenuIcon: 'ShieldCheck',
    View: true,
    OrderSeq: 3
  },
  {
    Id: 'sub_system_structure',
    MenuKey: 'system_structure_group',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Cấu trúc Hệ thống & Menu',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_system_root_modules',
    MenuKey: 'system_root_modules',
    MenuSubRootId: 'sub_system_structure',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Đăng ký Module gốc (Phân hệ)',
    MenuLink: '/erp/u/system/modules',
    MenuType: 'menu',
    Icon: 'FolderGit2',
    MenuIcon: 'FolderGit2',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_system_menus',
    MenuKey: 'system_menus',
    MenuSubRootId: 'sub_system_structure',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Đăng ký Cấu trúc Submenu & Menu',
    MenuLink: '/erp/u/system/menus',
    MenuType: 'menu',
    Icon: 'LayoutGrid',
    MenuIcon: 'LayoutGrid',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_system_actions',
    MenuKey: 'system_actions',
    MenuSubRootId: 'sub_system_structure',
    MenuRootId: 'ROOT_SYSTEM',
    MenuLabel: 'Đăng ký Danh mục Hành động (Action)',
    MenuLink: '/erp/u/system/actions',
    MenuType: 'menu',
    Icon: 'Zap',
    MenuIcon: 'Zap',
    View: true,
    OrderSeq: 3
  },

  // =========================================================================
  // ── ROOT_REPORT: Module Báo cáo ──────────────────────────────────────────
  // =========================================================================

  // ── Nhóm 1: Báo cáo tổng hợp toàn thời gian ──────────────────────────────
  {
    Id: 'sub_report_consolidated',
    MenuKey: 'report_consolidated_group',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Báo cáo tổng hợp',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_report_summary_plan',
    MenuKey: 'report_summary_plan',
    MenuSubRootId: 'sub_report_consolidated',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Tổng hợp kế hoạch sản xuất',
    MenuLink: '/erp/u/report/production/summary/plan',
    MenuType: 'menu',
    Icon: 'Calendar',
    MenuIcon: 'Calendar',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_report_summary_stat',
    MenuKey: 'report_summary_stat',
    MenuSubRootId: 'sub_report_consolidated',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Tổng hợp thống kê sản xuất',
    MenuLink: '/erp/u/report/production/summary/statistics',
    MenuType: 'menu',
    Icon: 'BarChart3',
    MenuIcon: 'BarChart3',
    View: true,
    OrderSeq: 2
  },

  // ── Nhóm 2: Báo cáo sản xuất GS Hà Nội ───────────────────────────────────
  {
    Id: 'sub_report_prod_hanoi_gs1',
    MenuKey: 'report_prod_hanoi_gs1',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Báo cáo sản xuất GS Hà Nội',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 2
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
    OrderSeq: 2
  },

  // ── Nhóm 3: Báo cáo sản xuất GS Quế Võ 1B ────────────────────────────────
  {
    Id: 'sub_report_prod_quevo_gs5',
    MenuKey: 'report_prod_quevo_gs5',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Báo cáo sản xuất GS Quế Võ 1B',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 3
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
    OrderSeq: 1
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
    OrderSeq: 2
  },

  // ── Nhóm 4: Đăng ký báo cáo ──────────────────────────────────────────────
  {
    Id: 'sub_report_registration',
    MenuKey: 'report_registration_group',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Đăng ký báo cáo',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 4
  },
  {
    Id: 'menu_report_registration',
    MenuKey: 'report_registration',
    MenuSubRootId: 'sub_report_registration',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Đăng ký báo cáo KHSX & TKSX',
    MenuLink: '/erp/u/report/registration',
    MenuType: 'menu',
    Icon: 'FileSpreadsheet',
    MenuIcon: 'FileSpreadsheet',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_report_plan_query',
    MenuKey: 'report_plan_query',
    MenuSubRootId: 'sub_report_registration',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Truy vấn chi tiết KHSX',
    MenuLink: '/erp/u/report/plan-query',
    MenuType: 'menu',
    Icon: 'Calendar',
    MenuIcon: 'Calendar',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_report_stat_query',
    MenuKey: 'report_stat_query',
    MenuSubRootId: 'sub_report_registration',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Truy vấn chi tiết Thống kê SX',
    MenuLink: '/erp/u/report/stat-query',
    MenuType: 'menu',
    Icon: 'BarChart3',
    MenuIcon: 'BarChart3',
    View: true,
    OrderSeq: 3
  },
  {
    Id: 'menu_report_calc_production_query',
    MenuKey: 'report_calc_production_query',
    MenuSubRootId: 'sub_report_registration',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Truy vấn tính KHSX & TKSX',
    MenuLink: '/erp/u/report/calc-production-query',
    MenuType: 'menu',
    Icon: 'Calculator',
    MenuIcon: 'Calculator',
    View: true,
    OrderSeq: 4
  },

  // ── Nhóm 5: Cẩm nang & Tra cứu ───────────────────────────────────────────
  {
    Id: 'sub_report_handbook',
    MenuKey: 'report_handbook_group',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Cẩm nang & Tra cứu',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 5
  },
  {
    Id: 'menu_report_handbook_formula',
    MenuKey: 'report_handbook_formula',
    MenuSubRootId: 'sub_report_handbook',
    MenuRootId: 'ROOT_REPORT',
    MenuLabel: 'Tra cứu công thức & Cột dữ liệu',
    MenuLink: '/erp/u/report/handbook/formula',
    MenuType: 'menu',
    Icon: 'BookOpen',
    MenuIcon: 'BookOpen',
    View: true,
    OrderSeq: 1
  }
]

// Menu Items Cấp 4 (nếu có các mục con sâu hơn)
export const DEFAULT_MENU_ITEMS = []

const EXCLUDED_ROOT_IDENTIFIERS = new Set(['ROOT_PRODUCTION', 'production'])

/**
 * Merge server roles menu with default code config
 * Prioritizes dynamic Database config and seamlessly supports custom modules & menus
 */
export function mergeWithDefaultMenuConfig(
  serverSettingItems = [],
  serverRootMenus = [],
  serverMenuItems = []
) {
  const rootMenuMap = new Map()

  // 1. Process Default Root Menus
  DEFAULT_ROOT_MENUS.forEach((r) => {
    if (!r) return
    const key = r.RootMenuKey || r.Key || r.Id || r.RootMenuId
    if (key && !EXCLUDED_ROOT_IDENTIFIERS.has(key)) {
      rootMenuMap.set(String(key).toLowerCase(), { ...r, View: r.View !== false })
    }
  })

  // 2. Overlay Dynamic Server Root Menus from DB (takes priority)
  if (Array.isArray(serverRootMenus) && serverRootMenus.length > 0) {
    serverRootMenus.forEach((r) => {
      if (!r) return
      const rawKey = r.RootMenuKey || r.Key || r.Id || r.RootMenuId
      if (!rawKey || EXCLUDED_ROOT_IDENTIFIERS.has(rawKey)) return

      const lowerKey = String(rawKey).toLowerCase()
      const canonicalKey =
        lowerKey === 'root_report' || lowerKey === 'report'
          ? 'report'
          : lowerKey === 'root_system' || lowerKey === 'system'
            ? 'system'
            : rawKey

      const normalizedRoot = {
        ...r,
        Id: r.Id || r.RootMenuId,
        RootMenuId: r.RootMenuId || r.Id,
        RootMenuKey:
          canonicalKey === 'report'
            ? 'report'
            : canonicalKey === 'system'
              ? 'system'
              : r.RootMenuKey || r.Key || rawKey,
        RootMenuName: r.RootMenuName || r.Label || r.RootMenuLabel || rawKey,
        RootMenuLabel: r.RootMenuLabel || r.Label || r.RootMenuName || rawKey,
        RootMenuIcon: r.RootMenuIcon || r.Icon || r.MenuIcon || 'AppWindow',
        Icon: r.Icon || r.RootMenuIcon || r.MenuIcon || 'AppWindow',
        MenuIcon: r.MenuIcon || r.Icon || r.RootMenuIcon || 'AppWindow',
        RootMenuUtilities:
          r.RootMenuUtilities !== undefined
            ? Boolean(r.RootMenuUtilities)
            : r.Utilities !== undefined
              ? Boolean(r.Utilities)
              : true,
        View: r.View !== false,
        Create: r.Create !== false,
        Edit: r.Edit !== false,
        Delete: r.Delete !== false,
        Import: r.Import !== false,
        Export: r.Export !== false,
        OrderSeq: r.OrderSeq !== undefined ? r.OrderSeq : r.IdxNo || 1
      }
      rootMenuMap.set(String(canonicalKey).toLowerCase(), normalizedRoot)
      if (r.Id) {
        rootMenuMap.set(`id_${r.Id}`, normalizedRoot)
      }
    })
  }

  // Deduplicate roots
  const seenRootKeys = new Set()
  const mergedRoots = []
  rootMenuMap.forEach((root) => {
    const uniqueKey = root.RootMenuKey || root.Id
    if (uniqueKey && !seenRootKeys.has(uniqueKey)) {
      seenRootKeys.add(uniqueKey)
      mergedRoots.push(root)
    }
  })
  mergedRoots.sort((a, b) => (a.OrderSeq || 0) - (b.OrderSeq || 0))

  // 3. Process Default Setting Items
  const itemMap = new Map()
  DEFAULT_SETTING_ITEMS.forEach((item) => {
    if (!item) return
    const key = item.MenuKey || item.Key || item.Id
    if (key && !EXCLUDED_ROOT_IDENTIFIERS.has(item.MenuRootId)) {
      itemMap.set(key, { ...item, View: item.View !== false })
    }
  })

  // 4. Overlay Dynamic Server Menus from DB (takes priority)
  if (Array.isArray(serverSettingItems) && serverSettingItems.length > 0) {
    serverSettingItems.forEach((item) => {
      if (!item) return
      const rootId = item.MenuRootId
      if (rootId && EXCLUDED_ROOT_IDENTIFIERS.has(rootId)) return

      const key = item.MenuKey || item.Key || item.Id
      if (!key) return

      // Map root identifier to canonical string if needed
      let resolvedRootId = item.MenuRootId
      if (resolvedRootId === 1 || String(resolvedRootId) === '1') {
        resolvedRootId = 'ROOT_REPORT'
      } else if (resolvedRootId === 2 || String(resolvedRootId) === '2') {
        resolvedRootId = 'ROOT_SYSTEM'
      }

      const normalizedItem = {
        ...item,
        Id: item.Id || item.MenuId,
        MenuId: item.MenuId || item.Id,
        MenuKey: item.MenuKey || item.Key || key,
        MenuLabel: item.MenuLabel || item.Label || item.Name || key,
        MenuLink: item.MenuLink || item.Link || '',
        MenuType: item.MenuType || item.Type || 'menu',
        MenuIcon: item.MenuIcon || item.Icon || 'FileText',
        Icon: item.Icon || item.MenuIcon || 'FileText',
        MenuRootId: resolvedRootId || item.MenuRootId,
        MenuSubRootId: item.MenuSubRootId || item.ParentId || null,
        View: item.View !== false,
        Create: item.Create !== false,
        Edit: item.Edit !== false,
        Delete: item.Delete !== false,
        Import: item.Import !== false,
        Export: item.Export !== false,
        OrderSeq: item.OrderSeq !== undefined ? item.OrderSeq : item.IdxNo || 0
      }
      itemMap.set(key, normalizedItem)
    })
  }

  const mergedItems = Array.from(itemMap.values())
  mergedItems.sort((a, b) => (a.OrderSeq || 0) - (b.OrderSeq || 0))

  // 5. Process SubMenuItems (Level 4+)
  const subItemMap = new Map()
  ;[...DEFAULT_MENU_ITEMS, ...(Array.isArray(serverMenuItems) ? serverMenuItems : [])].forEach(
    (sub) => {
      if (!sub) return
      const rootId = sub.MenuRootId
      if (rootId && EXCLUDED_ROOT_IDENTIFIERS.has(rootId)) return
      const key = sub.MenuKey || sub.Id
      if (key) subItemMap.set(key, { ...sub, View: sub.View !== false })
    }
  )
  const mergedSubItems = Array.from(subItemMap.values())

  // 6. Build dynamic tree
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
