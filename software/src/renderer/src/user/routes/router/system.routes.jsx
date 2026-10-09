import { lazy } from 'react'

export const pageLoaders = {
  SettingPrivate: () => import('../../page/private/setting'),
  UserManagement: () => import('../../page/system/userManagement'),
  RoleManagement: () => import('../../page/system/roleManagement'),
  RoleGroupPage: () => import('../../page/system/roleGroup'),
  MenuTechnique: () => import('../../page/system/menuTechnique'),
  RootMenuTechnique: () => import('../../page/system/rootMenuTechnique'),
  ActionTechnique: () => import('../../page/system/actionTechnique'),
  UserDetailPage: () => import('../../page/system/userDetailForm'),
  HanoiGs1StatPage: () => import('../../page/report/production/hanoiGs1/stat'),
  HanoiGs1PlanPage: () => import('../../page/report/production/hanoiGs1/plan'),
  QuevoGs5StatPage: () => import('../../page/report/production/quevoGs5/stat'),
  QuevoGs5PlanPage: () => import('../../page/report/production/quevoGs5/plan'),
  SummaryStatisticsReportPage: () => import('../../page/report/production/summary/statistics'),
  SummaryPlanReportPage: () => import('../../page/report/production/summary/plan'),
  TimelineSummaryReportPage: () => import('../../page/report/production/timelineSummary'),
  RegistrationPage: () => import('../../page/report/registration'),
  PlanDetailQueryPage: () => import('../../page/report/registration/plan/PlanDetailQueryPage'),
  StatDetailQueryPage: () =>
    import('../../page/report/registration/statistics/StatDetailQueryPage'),
  PlanRegistrationDetailView: () =>
    import('../../page/report/registration/components/PlanRegistrationDetailView'),
  PlanRegistrationCreateView: () =>
    import('../../page/report/registration/components/PlanRegistrationCreateView'),
  FormulaHandbookPage: () => import('../../page/report/production/handbook/FormulaHandbookPage'),
  CalcProductionPage: () => import('../../page/report/production/calcProduction'),
  CalcProductionQueryPage: () => import('../../page/report/production/calcProductionQuery'),
  CalcProductionDetailPage: () =>
    import('../../page/report/production/calcProductionQuery/detail/CalcProductionDetailView')
}

const SettingPrivate = lazy(pageLoaders.SettingPrivate)
const UserManagement = lazy(pageLoaders.UserManagement)
const RoleManagement = lazy(pageLoaders.RoleManagement)
const RoleGroupPage = lazy(pageLoaders.RoleGroupPage)
const MenuTechnique = lazy(pageLoaders.MenuTechnique)
const RootMenuTechnique = lazy(pageLoaders.RootMenuTechnique)
const ActionTechnique = lazy(pageLoaders.ActionTechnique)
const UserDetailPage = lazy(pageLoaders.UserDetailPage)
const HanoiGs1StatPage = lazy(pageLoaders.HanoiGs1StatPage)
const HanoiGs1PlanPage = lazy(pageLoaders.HanoiGs1PlanPage)
const QuevoGs5StatPage = lazy(pageLoaders.QuevoGs5StatPage)
const QuevoGs5PlanPage = lazy(pageLoaders.QuevoGs5PlanPage)
const SummaryStatisticsReportPage = lazy(pageLoaders.SummaryStatisticsReportPage)
const SummaryPlanReportPage = lazy(pageLoaders.SummaryPlanReportPage)
const TimelineSummaryReportPage = lazy(pageLoaders.TimelineSummaryReportPage)
const RegistrationPage = lazy(pageLoaders.RegistrationPage)
const PlanDetailQueryPage = lazy(pageLoaders.PlanDetailQueryPage)
const StatDetailQueryPage = lazy(pageLoaders.StatDetailQueryPage)
const PlanRegistrationDetailView = lazy(pageLoaders.PlanRegistrationDetailView)
const PlanRegistrationCreateView = lazy(pageLoaders.PlanRegistrationCreateView)
const FormulaHandbookPage = lazy(pageLoaders.FormulaHandbookPage)
const CalcProductionPage = lazy(pageLoaders.CalcProductionPage)
const CalcProductionQueryPage = lazy(pageLoaders.CalcProductionQueryPage)
const CalcProductionDetailPage = lazy(pageLoaders.CalcProductionDetailPage)

export const routeToLoaderMap = {
  '/erp/u/setting': pageLoaders.SettingPrivate,
  '/erp/u/system/users': pageLoaders.UserManagement,
  '/erp/u/system-settings/users/user-management': pageLoaders.UserManagement,
  '/erp/u/system/user-detail': pageLoaders.UserDetailPage,
  '/erp/u/system/menus': pageLoaders.MenuTechnique,
  '/erp/u/system-settings/structure/menus': pageLoaders.MenuTechnique,
  '/erp/u/system/modules': pageLoaders.RootMenuTechnique,
  '/erp/u/system-settings/structure/modules': pageLoaders.RootMenuTechnique,
  '/erp/u/system/actions': pageLoaders.ActionTechnique,
  '/erp/u/system-settings/structure/actions': pageLoaders.ActionTechnique,
  '/erp/u/system/permissions': pageLoaders.RoleManagement,
  '/erp/u/system/role-management': pageLoaders.RoleManagement,
  '/erp/u/system-settings/roles/permission-assignment': pageLoaders.RoleManagement,
  '/erp/u/system/role-groups': pageLoaders.RoleGroupPage,
  '/erp/u/system-settings/roles/role-management': pageLoaders.RoleGroupPage,
  '/erp/u/report/production/hanoi-gs1/statistics': pageLoaders.HanoiGs1StatPage,
  '/erp/u/report/production/hanoi-gs1/plan': pageLoaders.HanoiGs1PlanPage,
  '/erp/u/report/production/quevo-gs5/statistics': pageLoaders.QuevoGs5StatPage,
  '/erp/u/report/production/quevo-gs5/plan': pageLoaders.QuevoGs5PlanPage,
  '/erp/u/report/production/summary/statistics': pageLoaders.SummaryStatisticsReportPage,
  '/erp/u/report/production/summary/plan': pageLoaders.SummaryPlanReportPage,
  '/erp/u/report/production/timeline-summary': pageLoaders.TimelineSummaryReportPage,
  '/erp/u/report/production/timeline-summary/stat': pageLoaders.TimelineSummaryReportPage,
  '/erp/u/report/production/timeline-summary/plan': pageLoaders.SummaryPlanReportPage,
  '/erp/u/report/calc-production': pageLoaders.CalcProductionPage,
  '/erp/u/report/calc-production-query': pageLoaders.CalcProductionQueryPage,
  '/erp/u/report/calc-production-query/detail': pageLoaders.CalcProductionDetailPage,
  '/erp/u/report/registration': pageLoaders.RegistrationPage,
  '/erp/u/report/plan-query': pageLoaders.PlanDetailQueryPage,
  '/erp/u/report/stat-query': pageLoaders.StatDetailQueryPage,
  '/erp/u/report/registration/plan-query': pageLoaders.PlanDetailQueryPage,
  '/erp/u/report/registration/stat-query': pageLoaders.StatDetailQueryPage,
  '/erp/u/report/registration/create': pageLoaders.PlanRegistrationCreateView,
  '/erp/u/report/registration/detail': pageLoaders.PlanRegistrationDetailView,
  '/erp/u/report/handbook/formula': pageLoaders.FormulaHandbookPage,
  '/erp/u/report/data/import': pageLoaders.RegistrationPage,
  '/erp/u/report/data/register': pageLoaders.RegistrationPage,
  '/erp/u/report/data/create': pageLoaders.PlanRegistrationCreateView,
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
  // 1. CẤU HÌNH CÁ NHÂN
  // =========================================================================
  {
    path: '/erp/u/setting',
    element: SettingPrivate,
    public: true
  },

  // =========================================================================
  // 2. MODULE QUẢN TRỊ HỆ THỐNG (ROOT_SYSTEM)
  // =========================================================================
  // 2.1 Quản trị người dùng (user_mgmt)
  {
    path: '/erp/u/system/users',
    element: UserManagement,
    permission: 'user_mgmt',
    public: true
  },
  {
    path: '/erp/u/system/users/*',
    element: UserManagement,
    permission: 'user_mgmt',
    public: true
  },
  {
    path: '/erp/u/system-settings/users/user-management',
    element: UserManagement,
    permission: 'user_mgmt',
    public: true
  },
  {
    path: '/erp/u/system/user-detail',
    element: UserDetailPage,
    permission: 'user_mgmt',
    public: true
  },

  // 2.2 Đăng ký menu hệ thống (system_menus / menuTechnique)
  {
    path: '/erp/u/system/menus',
    element: MenuTechnique,
    permission: 'system_menus',
    public: true
  },
  {
    path: '/erp/u/system/menus/*',
    element: MenuTechnique,
    permission: 'system_menus',
    public: true
  },
  {
    path: '/erp/u/system-settings/structure/menus',
    element: MenuTechnique,
    permission: 'system_menus',
    public: true
  },

  // 2.3 Đăng ký module gốc (rootMenuTechnique)
  {
    path: '/erp/u/system/modules',
    element: RootMenuTechnique,
    permission: 'system_modules',
    public: true
  },
  {
    path: '/erp/u/system-settings/structure/modules',
    element: RootMenuTechnique,
    permission: 'system_modules',
    public: true
  },

  // 2.4 Đăng ký danh mục hành động / quyền nút (actionTechnique)
  {
    path: '/erp/u/system/actions',
    element: ActionTechnique,
    permission: 'system_actions',
    public: true
  },
  {
    path: '/erp/u/system/actions/*',
    element: ActionTechnique,
    permission: 'system_actions',
    public: true
  },
  {
    path: '/erp/u/system-settings/structure/actions',
    element: ActionTechnique,
    permission: 'system_actions',
    public: true
  },

  // 2.4 Quản lý vai trò & Phân quyền (roleManagement & roleGroup)
  {
    path: '/erp/u/system/permissions',
    element: RoleManagement,
    permission: 'system_permissions',
    public: true
  },
  {
    path: '/erp/u/system/permissions/*',
    element: RoleManagement,
    permission: 'system_permissions',
    public: true
  },
  {
    path: '/erp/u/system/role-management',
    element: RoleManagement,
    permission: 'perm_assign',
    public: true
  },
  {
    path: '/erp/u/system-settings/roles/permission-assignment',
    element: RoleManagement,
    permission: 'perm_assign',
    public: true
  },
  {
    path: '/erp/u/system/role-groups',
    element: RoleGroupPage,
    permission: 'role_group',
    public: true
  },
  {
    path: '/erp/u/system-settings/roles/role-management',
    element: RoleGroupPage,
    permission: 'role_mgmt',
    public: true
  },

  // =========================================================================
  // 3. MODULE BÁO CÁO (ROOT_REPORT)
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

  // ── Tổng hợp Thống kê Sản xuất (TKSX) Toàn Thời Gian ───────────────────
  {
    path: '/erp/u/report/production/summary/statistics',
    element: SummaryStatisticsReportPage,
    permission: 'report_summary_stat',
    public: true
  },
  {
    path: '/erp/u/report/production/summary/statistics/*',
    element: SummaryStatisticsReportPage,
    permission: 'report_summary_stat',
    public: true
  },

  // ── Tổng hợp Kế hoạch Sản xuất (KHSX) Toàn Thời Gian ───────────────────
  {
    path: '/erp/u/report/production/summary/plan',
    element: SummaryPlanReportPage,
    permission: 'report_summary_plan',
    public: true
  },
  {
    path: '/erp/u/report/production/summary/plan/*',
    element: SummaryPlanReportPage,
    permission: 'report_summary_plan',
    public: true
  },

  // ── Alias tương thích ngược cho Timeline Summary ─────────────────────────
  {
    path: '/erp/u/report/production/timeline-summary',
    element: TimelineSummaryReportPage,
    permission: 'report_timeline_summary',
    public: true
  },
  {
    path: '/erp/u/report/production/timeline-summary/*',
    element: TimelineSummaryReportPage,
    permission: 'report_timeline_summary',
    public: true
  },
  {
    path: '/erp/u/report/production/timeline-summary/stat',
    element: TimelineSummaryReportPage,
    permission: 'report_timeline_summary',
    public: true
  },
  {
    path: '/erp/u/report/production/timeline-summary/plan',
    element: SummaryPlanReportPage,
    permission: 'report_timeline_summary',
    public: true
  },

  // ── Đăng ký báo cáo KHSX & TKSX ─────────────────────────────────────────
  {
    path: '/erp/u/report/registration',
    element: RegistrationPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/*',
    element: RegistrationPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/create',
    element: PlanRegistrationCreateView,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/detail/:regCode',
    element: PlanRegistrationDetailView,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/plan-query',
    element: PlanDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/plan-query/*',
    element: PlanDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/plan-query',
    element: PlanDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/plan-query/*',
    element: PlanDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/stat-query',
    element: StatDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/stat-query/*',
    element: StatDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/stat-query',
    element: StatDetailQueryPage,
    permission: 'report_registration',
    public: true
  },
  {
    path: '/erp/u/report/registration/stat-query/*',
    element: StatDetailQueryPage,
    permission: 'report_registration',
    public: true
  },

  // ── Tính KHSX và TKSX ──────────────────────────────────────────────────
  {
    path: '/erp/u/report/calc-production',
    element: CalcProductionPage,
    permission: 'report_calc_production',
    public: true
  },
  {
    path: '/erp/u/report/calc-production/*',
    element: CalcProductionPage,
    permission: 'report_calc_production',
    public: true
  },
  {
    path: '/erp/u/report/calc-production-query',
    element: CalcProductionQueryPage,
    permission: 'report_calc_production_query',
    public: true
  },
  {
    path: '/erp/u/report/calc-production-query/detail',
    element: CalcProductionDetailPage,
    permission: 'report_calc_production_query',
    public: true
  },
  {
    path: '/erp/u/report/calc-production-query/detail/:seq',
    element: CalcProductionDetailPage,
    permission: 'report_calc_production_query',
    public: true
  },
  {
    path: '/erp/u/report/calc-production-query/detail/*',
    element: CalcProductionDetailPage,
    permission: 'report_calc_production_query',
    public: true
  },
  {
    path: '/erp/u/report/calc-production-query/:seq',
    element: CalcProductionDetailPage,
    permission: 'report_calc_production_query',
    public: true
  },
  {
    path: '/erp/u/report/calc-production-query/*',
    element: CalcProductionQueryPage,
    permission: 'report_calc_production_query',
    public: true
  },

  // ── Cẩm nang công thức & Từ điển dữ liệu ────────────────────────────────
  {
    path: '/erp/u/report/handbook/formula',
    element: FormulaHandbookPage,
    permission: 'report_handbook',
    public: true
  },
  {
    path: '/erp/u/report/handbook/formula/*',
    element: FormulaHandbookPage,
    permission: 'report_handbook',
    public: true
  },

  // Alias tương thích ngược cho các route cũ
  {
    path: '/erp/u/report/data/register',
    element: RegistrationPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/register/*',
    element: RegistrationPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/import',
    element: RegistrationPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/import/*',
    element: RegistrationPage,
    permission: 'report_data_import',
    public: true
  },
  {
    path: '/erp/u/report/data/create',
    element: PlanRegistrationCreateView,
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
