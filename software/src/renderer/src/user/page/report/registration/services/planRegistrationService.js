import { request } from '../../../../../services/apiClient'
import {
  normalizeProdStatsDetailRows,
  normalizePlanDetailRows
} from './reportColumnNormalizer'

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
  } catch {}

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

  // Với số lượng dòng nhỏ (<= 1.000 dòng), gửi 1 lần duy nhất cùng Master
  if (totalRows <= CHUNK_SIZE) {
    const formattedPayload = {
      reportType,
      factoryCode,
      factoryName,
      applyDate,
      regCode: regCodeInput,
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

    onProgress?.({ current: totalRows, total: totalRows, percent: 100 })

    return request({
      url: '/report/plan/PlanRegistrationA',
      method: 'POST',
      data: formattedPayload,
      timeout: 180000,
      signal
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

  onProgress?.({
    current: firstChunk.length,
    total: totalRows,
    percent: Math.round((firstChunk.length / totalRows) * 100)
  })

  const masterRes = await request({
    url: '/report/plan/PlanRegistrationA',
    method: 'POST',
    data: firstPayload,
    timeout: 180000,
    signal
  })

  const savedMaster = masterRes?.data || {}
  const masterSeq = savedMaster?.IdSeq
  const regCode = savedMaster?.RegCode || payload.regCode

  // Bước 2: Lưu các Chunk tiếp theo tuần tự (kèm delay nhỏ 50ms giữa các chunk để giải phóng event loop)
  const detailUrl = isStat ? '/report/plan/ProdStatsDetailA' : '/report/plan/PlanDetailA'

  for (let start = CHUNK_SIZE; start < totalRows; start += CHUNK_SIZE) {
    if (signal?.aborted) {
      throw new Error('Thao tác lưu đã bị hủy bởi người dùng')
    }

    const chunk = rawData.slice(start, start + CHUNK_SIZE).map((item, idx) => ({
      ...item,
      MasterSeq: masterSeq,
      RegCode: regCode,
      RowSeq: start + idx + 1
    }))

    // Delay 50ms giữa các batch
    await new Promise((resolve) => setTimeout(resolve, 50))

    await request({
      url: detailUrl,
      method: 'POST',
      data: chunk,
      timeout: 180000,
      signal
    })

    const currentCount = Math.min(start + CHUNK_SIZE, totalRows)
    onProgress?.({
      current: currentCount,
      total: totalRows,
      percent: Math.round((currentCount / totalRows) * 100)
    })
  }

  return masterRes
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

// 6. Truy vấn Báo Cáo KHSX riêng cho GS1 Hà Nội
export const queryHanoiGs1PlanReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/hanoi-gs1/plan',
    method: 'POST',
    data: { includeItems: 'true', pageSize: '10000', ...filters },
    signal
  })
}

// 7. Truy vấn Báo Cáo TKSX riêng cho GS1 Hà Nội
export const queryHanoiGs1StatReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/hanoi-gs1/statistics',
    method: 'POST',
    data: { includeItems: 'true', pageSize: '10000', ...filters },
    signal
  })
}

// 8. Truy vấn Báo Cáo KHSX riêng cho GS5 Quế Võ
export const queryQuevoGs5PlanReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/quevo-gs5/plan',
    method: 'POST',
    data: { includeItems: 'true', pageSize: '10000', ...filters },
    signal
  })
}

// 9. Truy vấn Báo Cáo TKSX riêng cho GS5 Quế Võ
export const queryQuevoGs5StatReport = async (filters = {}, signal = null) => {
  return request({
    url: '/report/production/quevo-gs5/statistics',
    method: 'POST',
    data: { includeItems: 'true', pageSize: '10000', ...filters },
    signal
  })
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
  queryProdStatsDetail,
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
