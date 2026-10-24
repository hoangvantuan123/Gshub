import { completeReportRequest } from './completeReportRequest.js'
import { request } from '../../../../../services/apiClient'
import { normalizeProdStatsDetailRows, normalizePlanDetailRows } from './reportColumnNormalizer'
import { saveRegistrationBatches } from './registrationSaveWorkflow.js'

/**
 * Service kết nối Backend API cho Module Đăng ký & Báo cáo Sản xuất (KHSX & TKSX)
 */

// 1. Lưu đợt đăng ký mới (Master + Chi tiết KHSX hoặc TKSX)
export const savePlanRegistration = async (payload, signal = null, onProgress = null) => {
  // Lấy thông tin tài khoản đăng nhập hiện tại từ Client
  let currentUser = {}
  try {
    const rawUser = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
    if (rawUser) {
      currentUser = JSON.parse(rawUser)
    }
  } catch {
    // Ignore JSON parse error
  }

  const createdBy =
    payload.createdBy ||
    currentUser.UserSeq ||
    currentUser.UserId ||
    currentUser.EmpID ||
    'SystemAdmin'
  const createdByName =
    payload.createdByName ||
    currentUser.UserName ||
    currentUser.Login ||
    currentUser.EmpName ||
    'Admin'

  const reportType = payload.ReportType || payload.reportType || 'plan'
  const isStat = reportType === 'statistics' || reportType === 'tksx'

  const rawInput =
    payload.SheetData ||
    payload.data ||
    (isStat ? payload.statsData || payload.StatsData : payload.planData || payload.PlanData) ||
    []

  // Chuẩn hóa và ánh xạ toàn diện tất cả 98 cột TKSX hoặc 24 cột KHSX
  const rawData = isStat
    ? normalizeProdStatsDetailRows(rawInput)
    : normalizePlanDetailRows(rawInput)
  const totalRows = rawData.length

  const factoryCode =
    payload.FactoryCode ||
    payload.factoryCode ||
    (String(payload.FactoryName || payload.factoryName || '').includes('GS5') ||
    String(payload.FactoryName || payload.factoryName || '').includes('Quế Võ')
      ? 'GS5'
      : 'GS1')

  const factoryName =
    payload.FactoryName ||
    payload.factoryName ||
    (factoryCode === 'GS5' ? 'GS5 Quế Võ 1B' : 'GS1 Hà Nội')

  const applyDate = payload.ApplyDate || payload.applyDate
  const regCodeInput = payload.RegCode || payload.regCode
  const remark = payload.Remark || payload.remark || ''

  // Kích thước mỗi chunk tối ưu: 1.000 dòng để đảm bảo payload nhẹ (~1MB), không bị timeout hay nghẽn socket
  const CHUNK_SIZE = 1000

  const version = payload.version || payload.calcVersion || payload.Version || '1.0'

  // Với số lượng dòng nhỏ (<= 1.000 dòng), gửi 1 lần duy nhất cùng Master
  if (totalRows <= CHUNK_SIZE) {
    const formattedPayload = {
      reportType,
      factoryCode,
      factoryName,
      applyDate,
      regCode: regCodeInput,
      version,
      calcVersion: version,
      remark,
      status: payload.status || (payload.isDraft ? 'draft' : 'published'),
      isDraft: Boolean(payload.isDraft),
      createdBy,
      createdByName,
      userSeq: currentUser.UserSeq || createdBy,
      userName: createdByName,
      totalRows,
      planData: isStat ? [] : rawData,
      statsData: isStat ? rawData : [],
      sheetData: rawData,
      data: rawData
    }

    return saveRegistrationBatches({
      request,
      payload: formattedPayload,
      rows: rawData,
      isStat,
      signal,
      onProgress
    })
  }

  // Với số lượng dòng lớn (> 1.000 dòng, ví dụ 5.000 - 50.000 dòng):
  // Bước 1: Lưu Master kèm Chunk 1 (1.000 dòng đầu tiên)
  const firstChunk = rawData.slice(0, CHUNK_SIZE)
  const firstPayload = {
    reportType,
    factoryCode,
    factoryName,
    applyDate,
    regCode: regCodeInput,
    version,
    calcVersion: version,
    remark,
    status: payload.status || (payload.isDraft ? 'draft' : 'published'),
    isDraft: Boolean(payload.isDraft),
    createdBy,
    createdByName,
    userSeq: currentUser.UserSeq || createdBy,
    userName: createdByName,
    totalRows,
    planData: isStat ? [] : firstChunk,
    statsData: isStat ? firstChunk : [],
    sheetData: firstChunk,
    data: firstChunk
  }

  return saveRegistrationBatches({
    request,
    payload: firstPayload,
    rows: rawData,
    isStat,
    signal,
    onProgress
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

// Cập nhật chi tiết KHSX (_ERPPlanDetail), dùng cho chỉnh sửa nhật trình đối soát.
export const updatePlanDetail = async (items = [], options = {}, signal = null) => {
  const plantKey = typeof options === 'string' ? options : options?.plantKey
  let url = '/report/plan/PlanDetailU'
  if (plantKey === 'quevo_gs5' || plantKey === 'GS5') {
    url = '/report/production/quevo-gs5/plan/update'
  } else if (plantKey === 'hanoi_gs1' || plantKey === 'GS1') {
    url = '/report/production/hanoi-gs1/plan/update'
  }
  return request({
    url,
    method: 'POST',
    data: items,
    signal: typeof options === 'object' && options?.signal ? options.signal : signal
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

// 4.1. Cập nhật chi tiết Thống kê sản xuất (_ERPProdStatsDetail - bao gồm RemarkTypeSeq, RemarkContent)
export const updateProdStatsDetail = async (items = [], options = {}, signal = null) => {
  const plantKey = typeof options === 'string' ? options : options?.plantKey
  let url = '/report/plan/ProdStatsDetailU'
  if (plantKey === 'quevo_gs5' || plantKey === 'GS5') {
    url = '/report/production/quevo-gs5/statistics/update'
  } else if (plantKey === 'hanoi_gs1' || plantKey === 'GS1') {
    url = '/report/production/hanoi-gs1/statistics/update'
  }
  return request({
    url,
    method: 'POST',
    data: items,
    signal: typeof options === 'object' && options?.signal ? options.signal : signal
  })
}

// Nhật trình đối soát dùng API và bảng riêng; chỉ được gọi khi người dùng mở
// cửa sổ đối soát hoặc bấm lưu trong cửa sổ đó.
export const queryPlanReconciliation = async (filters = {}, signal = null) => {
  return request({
    url: '/report/reconciliation/plan/query',
    method: 'POST',
    data: {
      masterSeq: filters.masterSeq || filters.MasterSeq || '',
      regCode: filters.regCode || filters.RegCode || '',
      reconciliationOnly: true
    },
    signal
  })
}

export const updatePlanReconciliation = async (items = [], signal = null) => {
  const markedItems = items.map((item) => ({ ...item, ReconciliationOnly: 'true' }))
  return request({
    url: '/report/reconciliation/plan/update',
    method: 'POST',
    data: { dataJson: JSON.stringify(markedItems) },
    signal
  })
}

export const queryStatsReconciliation = async (filters = {}, signal = null) => {
  return request({
    url: '/report/reconciliation/statistics/query',
    method: 'POST',
    data: {
      masterSeq: filters.masterSeq || filters.MasterSeq || '',
      regCode: filters.regCode || filters.RegCode || '',
      reconciliationOnly: true
    },
    signal
  })
}

export const updateStatsReconciliation = async (items = [], signal = null) => {
  const markedItems = items.map((item) => ({ ...item, ReconciliationOnly: 'true' }))
  return request({
    url: '/report/reconciliation/statistics/update',
    method: 'POST',
    data: { dataJson: JSON.stringify(markedItems) },
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

// 6. Truy vấn Báo Cáo KHSX riêng cho GS1 Hà Nội
export const queryHanoiGs1PlanReport = async (filters = {}, signal = null) => {
  const fetchPage = (pageFilters) =>
    request({
      url: '/report/production/hanoi-gs1/plan',
      method: 'POST',
      data: { includeItems: 'true', pageSize: '10000', ...pageFilters },
      signal
    })
  return filters.detailsOnly === 'true'
    ? completeReportRequest(fetchPage, filters)
    : fetchPage(filters)
}

// 7. Truy vấn Báo Cáo TKSX riêng cho GS1 Hà Nội
export const queryHanoiGs1StatReport = async (filters = {}, signal = null) => {
  const fetchPage = (pageFilters) =>
    request({
      url: '/report/production/hanoi-gs1/statistics',
      method: 'POST',
      data: { includeItems: 'true', pageSize: '10000', ...pageFilters },
      signal
    })
  return filters.detailsOnly === 'true'
    ? completeReportRequest(fetchPage, filters)
    : fetchPage(filters)
}

// 8. Truy vấn Báo Cáo KHSX riêng cho GS5 Quế Võ
export const queryQuevoGs5PlanReport = async (filters = {}, signal = null) => {
  const fetchPage = (pageFilters) =>
    request({
      url: '/report/production/quevo-gs5/plan',
      method: 'POST',
      data: { includeItems: 'true', pageSize: '10000', ...pageFilters },
      signal
    })
  return filters.detailsOnly === 'true'
    ? completeReportRequest(fetchPage, filters)
    : fetchPage(filters)
}

// 9. Truy vấn Báo Cáo TKSX riêng cho GS5 Quế Võ
export const queryQuevoGs5StatReport = async (filters = {}, signal = null) => {
  const fetchPage = (pageFilters) =>
    request({
      url: '/report/production/quevo-gs5/statistics',
      method: 'POST',
      data: { includeItems: 'true', pageSize: '10000', ...pageFilters },
      signal
    })
  return filters.detailsOnly === 'true'
    ? completeReportRequest(fetchPage, filters)
    : fetchPage(filters)
}

// 10. Truy vấn Báo Cáo KHSX Tổng Hợp Toàn Công Ty (Summary)
export const querySummaryPlanReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/summary/plan',
    method: 'POST',
    data: filters,
    signal
  })
}

// 11. Truy vấn Báo Cáo TKSX Tổng Hợp Toàn Công Ty (Summary)
export const querySummaryStatReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/summary/statistics',
    method: 'POST',
    data: filters,
    signal
  })
}

// Fallback methods (tương thích ngược)
export const queryProductionStatisticsReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/statistics',
    method: 'POST',
    data: filters,
    signal
  })
}

export const queryProductionPlanReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/plan',
    method: 'POST',
    data: filters,
    signal
  })
}

export default {
  savePlanRegistration,
  queryPlanMaster,
  queryPlanDetail,
  updatePlanDetail,
  queryProdStatsDetail,
  updateProdStatsDetail,
  queryPlanReconciliation,
  updatePlanReconciliation,
  queryStatsReconciliation,
  updateStatsReconciliation,
  queryHanoiGs1PlanReport,
  queryHanoiGs1StatReport,
  queryQuevoGs5PlanReport,
  queryQuevoGs5StatReport,
  querySummaryPlanReport,
  querySummaryStatReport,
  queryProductionStatisticsReport,
  queryProductionPlanReport,
  deletePlanMaster
}
