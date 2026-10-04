import { lazy } from 'react'

export const pageLoaders = {
  SettingPrivate: () => import('../../page/private/setting'),
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
  FormulaHandbookPage: () => import('../../page/report/production/handbook/FormulaHandbookPage')
}

const SettingPrivate = lazy(pageLoaders.SettingPrivate)
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

export const routeToLoaderMap = {
  '/erp/u/setting': pageLoaders.SettingPrivate,
  '/erp/u/report/production/hanoi-gs1/statistics': pageLoaders.HanoiGs1StatPage,
  '/erp/u/report/production/hanoi-gs1/plan': pageLoaders.HanoiGs1PlanPage,
  '/erp/u/report/production/quevo-gs5/statistics': pageLoaders.QuevoGs5StatPage,
  '/erp/u/report/production/quevo-gs5/plan': pageLoaders.QuevoGs5PlanPage,
  '/erp/u/report/production/summary/statistics': pageLoaders.SummaryStatisticsReportPage,
  '/erp/u/report/production/summary/plan': pageLoaders.SummaryPlanReportPage,
  '/erp/u/report/production/timeline-summary': pageLoaders.TimelineSummaryReportPage,
  '/erp/u/report/production/timeline-summary/stat': pageLoaders.TimelineSummaryReportPage,
  '/erp/u/report/production/timeline-summary/plan': pageLoaders.SummaryPlanReportPage,
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
  // 2. MODULE BÁO CÁO (ROOT_REPORT)
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
