import { useSummaryPlanLogic } from '../plan/hooks/useSummaryPlanLogic'
import { useSummaryStatisticsLogic } from '../statistics/hooks/useSummaryStatisticsLogic'

/**
 * useSummaryReportLogic - Unified Facade Hook
 * Tự động ủy quyền xử lý chuyên biệt cho Plan hoặc Statistics
 */
export function useSummaryReportLogic(initialReportType = 'stat') {
  const planLogic = useSummaryPlanLogic()
  const statLogic = useSummaryStatisticsLogic()

  return initialReportType === 'plan' ? planLogic : statLogic
}

export default useSummaryReportLogic
