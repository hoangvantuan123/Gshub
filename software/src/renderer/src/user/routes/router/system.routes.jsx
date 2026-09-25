import { lazy } from 'react'
import DefaultPage from '../../page/default/default'

export const pageLoaders = {
  UserManagement: () => import('../../page/system/userManagement'),
  RoleManagement: () => import('../../page/system/roleManagement'),
  RoleGroupPage: () => import('../../page/system/roleGroup'),
  MenuTechnique: () => import('../../page/system/menuTechnique'),
  RootMenuTechnique: () => import('../../page/system/rootMenuTechnique'),
  PermResource: () => import('../../page/system/permResource'),
  PermScopePage: () => import('../../page/system/permScope'),
  PermFieldPage: () => import('../../page/system/permField'),
  PermActionPage: () => import('../../page/system/permAction'),
  SysAttrGroupPage: () => import('../../page/system/sysAttrGroup'),
  SysAttrValuePage: () => import('../../page/system/sysAttrValue'),
  DictSys: () => import('../../page/dict/dictSys'),
  LangSys: () => import('../../page/dict/langSys'),
  SettingPrivate: () => import('../../page/private/setting'),
  OrderSettlement: () => import('../../page/production/orderSettlement'),
  WorkProcess: () => import('../../page/production/workProcess')
}

const UserManagement = lazy(pageLoaders.UserManagement)
const RoleManagement = lazy(pageLoaders.RoleManagement)
const RoleGroupPage = lazy(pageLoaders.RoleGroupPage)
const MenuTechnique = lazy(pageLoaders.MenuTechnique)
const RootMenuTechnique = lazy(pageLoaders.RootMenuTechnique)
const PermResource = lazy(pageLoaders.PermResource)
const PermScopePage = lazy(pageLoaders.PermScopePage)
const PermFieldPage = lazy(pageLoaders.PermFieldPage)
const PermActionPage = lazy(pageLoaders.PermActionPage)
const SysAttrGroupPage = lazy(pageLoaders.SysAttrGroupPage)
const SysAttrValuePage = lazy(pageLoaders.SysAttrValuePage)
const DictSys = lazy(pageLoaders.DictSys)
const LangSys = lazy(pageLoaders.LangSys)
const SettingPrivate = lazy(pageLoaders.SettingPrivate)
const OrderSettlement = lazy(pageLoaders.OrderSettlement)
const WorkProcess = lazy(pageLoaders.WorkProcess)

const PermResourcePage = (props) => <PermResource {...props} defaultTab="perm_resource" />

export const routeToLoaderMap = {
  '/erp/u/system-settings/structure/modules': pageLoaders.RootMenuTechnique,
  '/erp/u/system/modules': pageLoaders.RootMenuTechnique,
  '/erp/u/system-settings/structure/menus': pageLoaders.MenuTechnique,
  '/erp/u/system/menus': pageLoaders.MenuTechnique,
  '/erp/u/system-settings/structure/permissions': pageLoaders.PermResource,
  '/erp/u/system-settings/perm-resource': pageLoaders.PermResource,
  '/erp/u/system-settings/perm-catalog': pageLoaders.PermResource,
  '/erp/u/system-settings/structure/permissions/resources': pageLoaders.PermResource,
  '/erp/u/system/perm-resource': pageLoaders.PermResource,
  '/erp/u/system-settings/structure/permissions/fields': pageLoaders.PermFieldPage,
  '/erp/u/system-settings/perm-field': pageLoaders.PermFieldPage,
  '/erp/u/system/perm-field': pageLoaders.PermFieldPage,
  '/erp/u/system-settings/structure/permissions/actions': pageLoaders.PermActionPage,
  '/erp/u/system-settings/perm-action': pageLoaders.PermActionPage,
  '/erp/u/system/perm-action': pageLoaders.PermActionPage,
  '/erp/u/system-settings/structure/permissions/scopes': pageLoaders.PermScopePage,
  '/erp/u/system-settings/perm-scope': pageLoaders.PermScopePage,
  '/erp/u/system/perm-scope': pageLoaders.PermScopePage,
  '/erp/u/system-settings/structure/attribute-groups': pageLoaders.SysAttrGroupPage,
  '/erp/u/system-settings/sys-attr-group': pageLoaders.SysAttrGroupPage,
  '/erp/u/system/attribute-groups': pageLoaders.SysAttrGroupPage,
  '/erp/u/system/sys-attr-group': pageLoaders.SysAttrGroupPage,
  '/erp/u/system-settings/structure/attribute-values': pageLoaders.SysAttrValuePage,
  '/erp/u/system-settings/sys-attr-value': pageLoaders.SysAttrValuePage,
  '/erp/u/system/attribute-values': pageLoaders.SysAttrValuePage,
  '/erp/u/system/sys-attr-value': pageLoaders.SysAttrValuePage,
  '/erp/u/system-settings/users/user-management': pageLoaders.UserManagement,
  '/erp/u/system/users': pageLoaders.UserManagement,
  '/erp/u/system-settings/roles/role-management': pageLoaders.RoleGroupPage,
  '/erp/u/system-settings/roles/permission-assignment': pageLoaders.RoleManagement,
  '/erp/u/system-settings/role-groups': pageLoaders.RoleGroupPage,
  '/erp/u/system/role-management': pageLoaders.RoleManagement,
  '/erp/u/system-settings/dictionaries/languages': pageLoaders.LangSys,
  '/erp/u/system/languages': pageLoaders.LangSys,
  '/erp/u/system-settings/dictionaries/entries': pageLoaders.DictSys,
  '/erp/u/system/dictionary': pageLoaders.DictSys,
  '/erp/u/setting': pageLoaders.SettingPrivate,
  '/erp/u/production/order-settlement': pageLoaders.OrderSettlement,
  '/erp/u/production/work-process': pageLoaders.WorkProcess
}

export const preloadRoute = (path) => {
  if (!path || typeof path !== 'string') return
  const cleanPath = path.split('?')[0].split('#')[0]
  const loader = routeToLoaderMap[cleanPath]
  if (typeof loader === 'function') {
    loader().catch(() => {})
  }
}

let hasPreloadedAll = false
export const preloadAllSystemRoutes = () => {
  if (hasPreloadedAll || typeof window === 'undefined') return
  hasPreloadedAll = true

  const loaders = Object.values(pageLoaders)
  let currentIndex = 0

  const preloadNext = () => {
    if (currentIndex >= loaders.length) return
    const loader = loaders[currentIndex]
    currentIndex++

    try {
      loader()
        .catch(() => {})
        .finally(() => {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(preloadNext, { timeout: 1000 })
          } else {
            setTimeout(preloadNext, 200)
          }
        })
    } catch {
      setTimeout(preloadNext, 200)
    }
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadNext, { timeout: 2000 })
  } else {
    setTimeout(preloadNext, 1000)
  }
}

export const systemsRoutes = [
  {
    path: '/erp/u/system-settings/structure/modules',
    element: RootMenuTechnique,
    permission: 'sys_module',
    fallback: RootMenuTechnique
  },
  {
    path: '/erp/u/system/modules',
    element: RootMenuTechnique,
    permission: 'sys_module',
    fallback: RootMenuTechnique
  },
  {
    path: '/erp/u/system-settings/structure/menus',
    element: MenuTechnique,
    permission: 'sys_menu',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system/menus',
    element: MenuTechnique,
    permission: 'sys_menu',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/structure/permissions',
    element: PermResource,
    permission: 'perm_resource',
    fallback: PermResource
  },
  {
    path: '/erp/u/system-settings/perm-resource',
    element: PermResource,
    permission: 'perm_resource',
    fallback: PermResource
  },
  {
    path: '/erp/u/system-settings/perm-catalog',
    element: PermResource,
    permission: 'perm_catalog',
    fallback: PermResource
  },

  // 1.1 Đăng ký chức năng nhóm quyền (perm_resource)
  {
    path: '/erp/u/system-settings/structure/permissions/resources',
    element: PermResourcePage,
    permission: 'perm_resource',
    fallback: PermResourcePage
  },
  {
    path: '/erp/u/system-settings/perm-resource',
    element: PermResourcePage,
    permission: 'perm_resource',
    fallback: PermResourcePage
  },
  {
    path: '/erp/u/system/perm-resource',
    element: PermResourcePage,
    permission: 'perm_resource',
    fallback: PermResourcePage
  },

  // 1.2 Đăng ký trường dữ liệu phân quyền (perm_field)
  {
    path: '/erp/u/system-settings/structure/permissions/fields',
    element: PermFieldPage,
    permission: 'perm_field',
    fallback: PermFieldPage
  },
  {
    path: '/erp/u/system-settings/perm-field',
    element: PermFieldPage,
    permission: 'perm_field',
    fallback: PermFieldPage
  },
  {
    path: '/erp/u/system/perm-field',
    element: PermFieldPage,
    permission: 'perm_field',
    fallback: PermFieldPage
  },

  // 1.3 Đăng ký hành động quyền hạn (perm_action)
  {
    path: '/erp/u/system-settings/structure/permissions/actions',
    element: PermActionPage,
    permission: 'perm_action',
    fallback: PermActionPage
  },
  {
    path: '/erp/u/system-settings/perm-action',
    element: PermActionPage,
    permission: 'perm_action',
    fallback: PermActionPage
  },
  {
    path: '/erp/u/system/perm-action',
    element: PermActionPage,
    permission: 'perm_action',
    fallback: PermActionPage
  },

  // 1.4 Đăng ký phạm vi dữ liệu (perm_scope)
  {
    path: '/erp/u/system-settings/structure/permissions/scopes',
    element: PermScopePage,
    permission: 'perm_scope',
    fallback: PermScopePage
  },
  {
    path: '/erp/u/system-settings/perm-scope',
    element: PermScopePage,
    permission: 'perm_scope',
    fallback: PermScopePage
  },
  {
    path: '/erp/u/system/perm-scope',
    element: PermScopePage,
    permission: 'perm_scope',
    fallback: PermScopePage
  },

  // 1.5 Đăng ký nhóm thuộc tính (sys_attr_group)
  {
    path: '/erp/u/system-settings/structure/attribute-groups',
    element: SysAttrGroupPage,
    permission: 'sys_attr_group',
    fallback: SysAttrGroupPage
  },
  {
    path: '/erp/u/system-settings/sys-attr-group',
    element: SysAttrGroupPage,
    permission: 'sys_attr_group',
    fallback: SysAttrGroupPage
  },
  {
    path: '/erp/u/system/attribute-groups',
    element: SysAttrGroupPage,
    permission: 'sys_attr_group',
    fallback: SysAttrGroupPage
  },
  {
    path: '/erp/u/system/sys-attr-group',
    element: SysAttrGroupPage,
    permission: 'sys_attr_group',
    fallback: SysAttrGroupPage
  },

  // 1.6 Đăng ký giá trị thuộc tính (sys_attr_value)
  {
    path: '/erp/u/system-settings/structure/attribute-values',
    element: SysAttrValuePage,
    permission: 'sys_attr_value',
    fallback: SysAttrValuePage
  },
  {
    path: '/erp/u/system-settings/sys-attr-value',
    element: SysAttrValuePage,
    permission: 'sys_attr_value',
    fallback: SysAttrValuePage
  },
  {
    path: '/erp/u/system/attribute-values',
    element: SysAttrValuePage,
    permission: 'sys_attr_value',
    fallback: SysAttrValuePage
  },
  {
    path: '/erp/u/system/sys-attr-value',
    element: SysAttrValuePage,
    permission: 'sys_attr_value',
    fallback: SysAttrValuePage
  },

  // =========================================================================
  // 2. NGƯỜI DÙNG & TRUY CẬP (user_access & user_mgmt)
  // =========================================================================
  {
    path: '/erp/u/system-settings/users/user-management',
    element: UserManagement,
    permission: 'user_mgmt',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system/users',
    element: UserManagement,
    permission: 'user_mgmt',
    fallback: DefaultPage
  },

  // =========================================================================
  // 3. VAI TRÒ HỆ THỐNG (role_perm, role_mgmt, perm_assign, role_group)
  // =========================================================================
  {
    path: '/erp/u/system-settings/roles/role-management',
    element: RoleGroupPage,
    permission: 'role_mgmt',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/roles/permission-assignment',
    element: RoleManagement,
    permission: 'perm_assign',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/role-groups',
    element: RoleGroupPage,
    permission: 'role_group',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system/role-management',
    element: RoleManagement,
    permission: 'perm_assign',
    fallback: DefaultPage
  },

  // =========================================================================
  // 4. QUẢN LÝ TỪ ĐIỂN (dict_mgmt, sys_lang, sys_dict)
  // =========================================================================
  {
    path: '/erp/u/system-settings/dictionaries/languages',
    element: LangSys,
    permission: 'sys_lang',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system/languages',
    element: LangSys,
    permission: 'sys_lang',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/dictionaries/entries',
    element: DictSys,
    permission: 'sys_dict',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system/dictionary',
    element: DictSys,
    permission: 'sys_dict',
    fallback: DefaultPage
  },

  // =========================================================================
  // 5. QUY TRÌNH & PHÊ DUYỆT (wf_approval, wf_config, wf_delegate, wf_catalog...)
  // =========================================================================
  {
    path: '/erp/u/system-settings/workflows/configuration',
    element: DefaultPage,
    permission: 'wf_config',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/workflows/delegations',
    element: DefaultPage,
    permission: 'wf_delegate',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/workflows/catalog/statuses',
    element: DefaultPage,
    permission: 'wf_status',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/workflows/catalog/actions',
    element: DefaultPage,
    permission: 'wf_action',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/workflows/catalog/assignees',
    element: DefaultPage,
    permission: 'wf_assignee',
    fallback: DefaultPage
  },

  // =========================================================================
  // 6. KIỂM SOÁT & NHẬT KÝ (audit_control, perm_check, sys_audit...)
  // =========================================================================
  {
    path: '/erp/u/system-settings/audit-control/access/permission-simulation',
    element: DefaultPage,
    permission: 'perm_sim',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/audit-control/access/permission-lookup',
    element: DefaultPage,
    permission: 'perm_lookup',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/audit-control/logs/authorizations',
    element: DefaultPage,
    permission: 'perm_log',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/audit-control/logs/access',
    element: DefaultPage,
    permission: 'access_log',
    fallback: DefaultPage
  },
  {
    path: '/erp/u/system-settings/audit-control/logs/data-changes',
    element: DefaultPage,
    permission: 'change_log',
    fallback: DefaultPage
  },

  // =========================================================================
  // 7. CẤU HÌNH CÁ NHÂN (public)
  // =========================================================================
  {
    path: '/erp/u/setting',
    element: SettingPrivate,
    public: true,
    fallback: DefaultPage
  },

  // =========================================================================
  // 8. QUẢN LÝ SẢN XUẤT (production_mgmt, order_settlement, work_process)
  // =========================================================================
  {
    path: '/erp/u/production/work-process',
    element: WorkProcess,
    permission: 'production_work_process',
    public: true,
    fallback: DefaultPage
  },
  {
    path: '/erp/u/production/work-process/*',
    element: WorkProcess,
    permission: 'production_work_process',
    public: true,
    fallback: DefaultPage
  },
  {
    path: '/erp/u/production/order-settlement',
    element: OrderSettlement,
    permission: 'production_order_settlement',
    public: true,
    fallback: DefaultPage
  },
  {
    path: '/erp/u/production/order-settlement/*',
    element: OrderSettlement,
    permission: 'production_order_settlement',
    public: true,
    fallback: DefaultPage
  }
]
