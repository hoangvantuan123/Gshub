import { request } from '../../../../../../services/apiClient'

/**
 * Service kết nối Backend API cho Module Đăng ký & Báo cáo Sản xuất (KHSX & TKSX)
 */

// 1. Lưu đợt đăng ký mới (Master + Chi tiết KHSX hoặc TKSX)
export const savePlanRegistration = async (payload, signal = null, onProgress = null) => {
  const isStat = payload.reportType === 'statistics' || payload.reportType === 'tksx'

  const factoryCode =
    payload.factoryCode ||
    (String(payload.factoryName || '').includes('GS5') ||
    String(payload.factoryName || '').includes('Quế Võ')
      ? 'GS5'
      : 'GS1')

  const rawData = payload.data || (isStat ? payload.statsData : payload.planData) || []
  const totalRows = rawData.length

  // Với số lượng dòng nhỏ (<= 2000 dòng), gửi 1 lần duy nhất
  const CHUNK_SIZE = 2000
  if (totalRows <= CHUNK_SIZE) {
    const formattedPayload = {
      reportType: payload.reportType || 'plan',
      factoryCode,
      factoryName: payload.factoryName || (factoryCode === 'GS5' ? 'GS5 Quế Võ 1B' : 'GS1 Hà Nội'),
      applyDate: payload.applyDate,
      regCode: payload.regCode,
      remark: payload.remark || '',
      status: payload.status || (payload.isDraft ? 'draft' : 'published'),
      isDraft: Boolean(payload.isDraft),
      totalRows,
      planData: isStat ? [] : rawData,
      statsData: isStat ? rawData : []
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

  // Với số lượng dòng lớn (> 2000 dòng, ví dụ 10.000 dòng):
  // Bước 1: Lưu Master kèm Chunk 1 (2.000 dòng đầu tiên)
  const firstChunk = rawData.slice(0, CHUNK_SIZE)
  const firstPayload = {
    reportType: payload.reportType || 'plan',
    factoryCode,
    factoryName: payload.factoryName || (factoryCode === 'GS5' ? 'GS5 Quế Võ 1B' : 'GS1 Hà Nội'),
    applyDate: payload.applyDate,
    regCode: payload.regCode,
    remark: payload.remark || '',
    status: payload.status || (payload.isDraft ? 'draft' : 'published'),
    isDraft: Boolean(payload.isDraft),
    totalRows,
    planData: isStat ? [] : firstChunk,
    statsData: isStat ? firstChunk : []
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

  // Bước 2: Lưu các Chunk tiếp theo tuần tự (kèm delay nhỏ 80ms để tránh nghẽn socket và không bị WAF/AntiSpam đánh giá spam)
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

    // Delay 80ms giữa các batch
    await new Promise((resolve) => setTimeout(resolve, 80))

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

export default {
  savePlanRegistration,
  queryPlanMaster,
  queryPlanDetail,
  queryProdStatsDetail,
  deletePlanMaster
}
