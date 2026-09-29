import { lazy } from 'react'

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
  WorkProcess: () => import('../../page/production/workProcess'),
  OperationDetail: () => import('../../page/production/operationDetail'),
  HanoiGs1StatPage: () => import('../../page/report/production/hanoiGs1/stat'),
  HanoiGs1PlanPage: () => import('../../page/report/production/hanoiGs1/plan'),
  QuevoGs5StatPage: () => import('../../page/report/production/quevoGs5/stat'),
  QuevoGs5PlanPage: () => import('../../page/report/production/quevoGs5/plan'),
  DataRegisterPage: () => import('../../page/report/data/import'),
  DataImportPage: () => import('../../page/report/data/import'),
  PlanRegistrationDetailView: () =>
    import('../../page/report/data/import/components/PlanRegistrationDetailView')
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
const OperationDetail = lazy(pageLoaders.OperationDetail)
const HanoiGs1StatPage = lazy(pageLoaders.HanoiGs1StatPage)
const HanoiGs1PlanPage = lazy(pageLoaders.HanoiGs1PlanPage)
const QuevoGs5StatPage = lazy(pageLoaders.QuevoGs5StatPage)
const QuevoGs5PlanPage = lazy(pageLoaders.QuevoGs5PlanPage)
const DataRegisterPage = lazy(pageLoaders.DataRegisterPage)
const DataImportPage = lazy(pageLoaders.DataImportPage)
const PlanRegistrationDetailView = lazy(pageLoaders.PlanRegistrationDetailView)

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
  '/erp/u/production/work-process': pageLoaders.WorkProcess,
  '/erp/u/production/operation-detail': pageLoaders.OperationDetail,
  '/erp/u/report/production/hanoi-gs1/statistics': pageLoaders.HanoiGs1StatPage,
  '/erp/u/report/production/hanoi-gs1/plan': pageLoaders.HanoiGs1PlanPage,
  '/erp/u/report/production/quevo-gs5/statistics': pageLoaders.QuevoGs5StatPage,
  '/erp/u/report/production/quevo-gs5/plan': pageLoaders.QuevoGs5PlanPage,
  '/erp/u/report/data/register': pageLoaders.DataRegisterPage,
  '/erp/u/report/data/import': pageLoaders.DataImportPage,
  '/erp/u/report/data/detail': pageLoaders.PlanRegistrationDetailView
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

  
  // =========================================================================
  // 2. NGƯỜI DÙNG & VAI TRÒ
  // =========================================================================
  {
    path: '/erp/u/system-settings/users/user-management',
    element: UserManagement,
    permission: 'user_mgmt'
  },
  {
    path: '/erp/u/system/users',
    element: UserManagement,
    permission: 'user_mgmt'
  },
  {
    path: '/erp/u/system-settings/roles/role-management',
    element: RoleGroupPage,
    permission: 'role_mgmt'
  },
  {
    path: '/erp/u/system-settings/roles/permission-assignment',
    element: RoleManagement,
    permission: 'perm_assign'
  },
  {
    path: '/erp/u/system-settings/role-groups',
    element: RoleGroupPage,
    permission: 'role_group'
  },
  {
    path: '/erp/u/system/role-management',
    element: RoleManagement,
    permission: 'perm_assign'
  },



  // =========================================================================
  // 4. CẤU HÌNH CÁ NHÂN
  // =========================================================================
  {
    path: '/erp/u/setting',
    element: SettingPrivate,
    public: true
  },

 
  // =========================================================================
  // 6. MODULE BÁO CÁO (ROOT_REPORT)
  // =========================================================================
  // ── GS1 Hà Nội ──────────────────────────────────────────────────────────
  {
    path: '/erp/u/report/production/hanoi-gs1/statistics',
    element: HanoiGs1StatPage,
    permission: 'report_hanoi_gs1_stat',
    public: true
  },
  {
    path: '/erp/u/report/production/hanoi-gs1/statistics/*',
    element: HanoiGs1StatPage,
    permission: 'report_hanoi_gs1_stat',
    public: true
  },
  {
    path: '/erp/u/report/production/hanoi-gs1/plan',
    element: HanoiGs1PlanPage,
    permission: 'report_hanoi_gs1_plan',
    public: true
  },
  {
    path: '/erp/u/report/production/hanoi-gs1/plan/*',
    element: HanoiGs1PlanPage,
    permission: 'report_hanoi_gs1_plan',
    public: true
  },

  // ── GS5 Quế Võ 1B ───────────────────────────────────────────────────────
  {
    path: '/erp/u/report/production/quevo-gs5/statistics',
    element: QuevoGs5StatPage,
    permission: 'report_quevo_gs5_stat',
    public: true
  },
  {
    path: '/erp/u/report/production/quevo-gs5/statistics/*',
    element: QuevoGs5StatPage,
    permission: 'report_quevo_gs5_stat',
    public: true
  },
  {
    path: '/erp/u/report/production/quevo-gs5/plan',
    element: QuevoGs5PlanPage,
    permission: 'report_quevo_gs5_plan',
    public: true
  },
  {
    path: '/erp/u/report/production/quevo-gs5/plan/*',
    element: QuevoGs5PlanPage,
    permission: 'report_quevo_gs5_plan',
    public: true
  },

  // ── Đăng ký báo cáo KHSX & TKSX ─────────────────────────────────────────
  {
    path: '/erp/u/report/data/register',
    element: DataRegisterPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/register/*',
    element: DataRegisterPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/import',
    element: DataImportPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/import/*',
    element: DataImportPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/detail/:regCode',
    element: PlanRegistrationDetailView,
    permission: 'report_data_import',
    public: true
  }
]
