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

  // ── Nhóm 2: Thực thi & Giám sát xưởng ─────────────────────────────────────
  {
    Id: 'sub_prod_execution',
    MenuKey: 'production_execution_group',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Thực thi & Giám sát xưởng',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_production_monitoring',
    MenuKey: 'production_monitoring',
    MenuSubRootId: 'sub_prod_execution',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Bảng giám sát sản xuất Realtime',
    MenuLink: '/erp/u/production/monitoring',
    MenuType: 'menu',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_production_shift_log',
    MenuKey: 'production_shift_log',
    MenuSubRootId: 'sub_prod_execution',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Nhật ký sản xuất ca kíp',
    MenuLink: '/erp/u/production/shift-log',
    MenuType: 'menu',
    View: true,
    OrderSeq: 2
  },
  {
    Id: 'menu_production_material_issue',
    MenuKey: 'production_material_issue',
    MenuSubRootId: 'sub_prod_execution',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Cấp phát vật tư sản xuất',
    MenuLink: '/erp/u/production/material-issue',
    MenuType: 'menu',
    View: true,
    OrderSeq: 3
  },
  {
    Id: 'menu_production_receipt',
    MenuKey: 'production_receipt',
    MenuSubRootId: 'sub_prod_execution',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Nhập kho BTP & Thành phẩm',
    MenuLink: '/erp/u/production/receipt',
    MenuType: 'menu',
    View: true,
    OrderSeq: 4
  },
  {
    Id: 'menu_production_progress',
    MenuKey: 'production_progress',
    MenuSubRootId: 'sub_prod_execution',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Theo dõi tiến độ đơn hàng',
    MenuLink: '/erp/u/production/progress',
    MenuType: 'menu',
    View: true,
    OrderSeq: 5
  },

  // ── Nhóm 3: Quản lý chất lượng (QC) ───────────────────────────────────────
  {
    Id: 'sub_prod_qc',
    MenuKey: 'production_qc_group',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Kiểm soát chất lượng (QC)',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 3
  },
  {
    Id: 'menu_production_sample_check',
    MenuKey: 'production_sample_check',
    MenuSubRootId: 'sub_prod_qc',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Kiểm tra mẫu & Nghiệm thu',
    MenuLink: '/erp/u/production/sample-check',
    MenuType: 'menu',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_production_defect_report',
    MenuKey: 'production_defect_report',
    MenuSubRootId: 'sub_prod_qc',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Báo cáo sự cố & Phế phẩm',
    MenuLink: '/erp/u/production/defect-report',
    MenuType: 'menu',
    View: true,
    OrderSeq: 2
  },

  // ── Nhóm 4: Định mức & Quy trình công nghệ (BOM) ──────────────────────────
  {
    Id: 'sub_prod_bom',
    MenuKey: 'production_bom_group',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Định mức & Quy trình (BOM)',
    MenuType: 'submenu',
    Icon: 'FolderOutlined',
    MenuIcon: 'FolderOutlined',
    View: true,
    OrderSeq: 4
  },
  {
    Id: 'menu_production_bom',
    MenuKey: 'production_bom',
    MenuSubRootId: 'sub_prod_bom',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Định mức kỹ thuật sản phẩm (BOM)',
    MenuLink: '/erp/u/production/bom',
    MenuType: 'menu',
    View: true,
    OrderSeq: 1
  },
  {
    Id: 'menu_production_routing',
    MenuKey: 'production_routing',
    MenuSubRootId: 'sub_prod_bom',
    MenuRootId: 'ROOT_PRODUCTION',
    MenuLabel: 'Quy trình công nghệ & Thiết bị máy',
    MenuLink: '/erp/u/production/routing',
    MenuType: 'menu',
    View: true,
    OrderSeq: 2
  }
]

// Chỉ khai báo menuitem cấp 4 khi thực sự có phân nhánh con (để trống khi menu cấp 3 là trực tiếp)
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
