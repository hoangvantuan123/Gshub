import { request } from '../../../../../../services/apiClient'

/**
 * Service kết nối Backend API cho Module Đăng ký & Báo cáo Sản xuất (KHSX & TKSX)
 */

// 1. Lưu đợt đăng ký mới (Master + Chi tiết KHSX hoặc TKSX)
export const savePlanRegistration = async (payload, signal = null) => {
  const isStat = payload.reportType === 'statistics' || payload.reportType === 'tksx'

  const formattedPayload = {
    reportType: payload.reportType || 'plan',
    factoryName: payload.factoryName || 'GS1 Hà Nội',
    applyDate: payload.applyDate,
    regCode: payload.regCode,
    remark: payload.remark || '',
    status: payload.status || (payload.isDraft ? 'draft' : 'published'),
    isDraft: Boolean(payload.isDraft),
    planData: isStat ? [] : (payload.data || payload.planData || []),
    statsData: isStat ? (payload.data || payload.statsData || []) : []
  }

  return request({
    url: '/report/plan/PlanRegistrationA',
    method: 'POST',
    data: formattedPayload,
    signal
  })
}

// 2. Truy vấn danh sách Master đăng ký
export const queryPlanMaster = async (filters = {}, signal = null) => {
  return request({
    url: '/report/plan/PlanMasterQ',
    method: 'POST',
    data: filters,
    signal
  })
}

// 3. Truy vấn chi tiết Kế hoạch sản xuất điều phối (_ERPPlanDetail - 24 cột)
export const queryPlanDetail = async (filters = {}, signal = null) => {
  return request({
    url: '/report/plan/PlanDetailQ',
    method: 'POST',
    data: filters,
    signal
  })
}

// 4. Truy vấn chi tiết Thống kê sản xuất (_ERPProdStatsDetail)
export const queryProdStatsDetail = async (filters = {}, signal = null) => {
  return request({
    url: '/report/plan/ProdStatsDetailQ',
    method: 'POST',
    data: filters,
    signal
  })
}

// 5. Xóa đợt đăng ký Master (kèm cascade xóa sạch detail 2 bảng)
export const deletePlanMaster = async (masterSeqs = [], signal = null) => {
  return request({
    url: '/report/plan/PlanMasterD',
    method: 'POST',
    data: { masterSeqs },
    signal
  })
}

export default {
  savePlanRegistration,
  queryPlanMaster,
  queryPlanDetail,
  queryProdStatsDetail,
  deletePlanMaster
}
