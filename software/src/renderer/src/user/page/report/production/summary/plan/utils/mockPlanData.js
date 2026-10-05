/**
 * Dữ liệu mẫu cố định 31 ngày Tháng 10/2026 cho Nhà máy GS Hà Nội
 * Ghi rõ "Dữ liệu mẫu", số liệu cố định (deterministic) không đổi ngẫu nhiên mỗi lần render.
 * 5 ngày đầu tuân thủ chính xác yêu cầu:
 * 01/10/2026: 240, 120, 80, 25, 15
 * 02/10/2026: 270, 118, 82, 45, 25
 * 03/10/2026: 300, 115, 83, 65, 37
 * 04/10/2026: 330, 107, 80, 90, 53
 * 05/10/2026: 350, 100, 77, 103, 70
 * (Thứ tự: tổng LSX, sai ngày KH, trượt KH, khớp số lượng, khớp job)
 */

export const MOCK_OCTOBER_PLAN_DATA = [
  // 5 ngày đầu chuẩn chỉ định
  {
    date: '2026-10-01',
    totalOrders: 240,
    wrongPlanDate: 120,
    slippedPlan: 80,
    matchedQuantity: 25,
    matchedJob: 15
  },
  {
    date: '2026-10-02',
    totalOrders: 270,
    wrongPlanDate: 118,
    slippedPlan: 82,
    matchedQuantity: 45,
    matchedJob: 25
  },
  {
    date: '2026-10-03',
    totalOrders: 300,
    wrongPlanDate: 115,
    slippedPlan: 83,
    matchedQuantity: 65,
    matchedJob: 37
  },
  {
    date: '2026-10-04',
    totalOrders: 330,
    wrongPlanDate: 107,
    slippedPlan: 80,
    matchedQuantity: 90,
    matchedJob: 53
  },
  {
    date: '2026-10-05',
    totalOrders: 350,
    wrongPlanDate: 100,
    slippedPlan: 77,
    matchedQuantity: 103,
    matchedJob: 70
  },
  // Ngày 06 đến 31/10/2026 cố định, phản ánh nhịp sản xuất tăng dần và chất lượng cải thiện
  {
    date: '2026-10-06',
    totalOrders: 360,
    wrongPlanDate: 96,
    slippedPlan: 74,
    matchedQuantity: 115,
    matchedJob: 82
  },
  {
    date: '2026-10-07',
    totalOrders: 375,
    wrongPlanDate: 92,
    slippedPlan: 70,
    matchedQuantity: 128,
    matchedJob: 94
  },
  {
    date: '2026-10-08',
    totalOrders: 380,
    wrongPlanDate: 88,
    slippedPlan: 68,
    matchedQuantity: 140,
    matchedJob: 105
  },
  {
    date: '2026-10-09',
    totalOrders: 390,
    wrongPlanDate: 85,
    slippedPlan: 65,
    matchedQuantity: 152,
    matchedJob: 118
  },
  {
    date: '2026-10-10',
    totalOrders: 410,
    wrongPlanDate: 82,
    slippedPlan: 62,
    matchedQuantity: 168,
    matchedJob: 130
  },
  {
    date: '2026-10-11',
    totalOrders: 340,
    wrongPlanDate: 72,
    slippedPlan: 52,
    matchedQuantity: 145,
    matchedJob: 112
  }, // Chủ nhật tải nhẹ
  {
    date: '2026-10-12',
    totalOrders: 420,
    wrongPlanDate: 80,
    slippedPlan: 58,
    matchedQuantity: 180,
    matchedJob: 142
  },
  {
    date: '2026-10-13',
    totalOrders: 435,
    wrongPlanDate: 78,
    slippedPlan: 55,
    matchedQuantity: 195,
    matchedJob: 154
  },
  {
    date: '2026-10-14',
    totalOrders: 440,
    wrongPlanDate: 75,
    slippedPlan: 54,
    matchedQuantity: 205,
    matchedJob: 162
  },
  {
    date: '2026-10-15',
    totalOrders: 450,
    wrongPlanDate: 70,
    slippedPlan: 50,
    matchedQuantity: 220,
    matchedJob: 175
  },
  {
    date: '2026-10-16',
    totalOrders: 460,
    wrongPlanDate: 68,
    slippedPlan: 48,
    matchedQuantity: 232,
    matchedJob: 185
  },
  {
    date: '2026-10-17',
    totalOrders: 465,
    wrongPlanDate: 65,
    slippedPlan: 46,
    matchedQuantity: 240,
    matchedJob: 194
  },
  {
    date: '2026-10-18',
    totalOrders: 350,
    wrongPlanDate: 55,
    slippedPlan: 38,
    matchedQuantity: 185,
    matchedJob: 150
  }, // Cuối tuần
  {
    date: '2026-10-19',
    totalOrders: 470,
    wrongPlanDate: 62,
    slippedPlan: 44,
    matchedQuantity: 252,
    matchedJob: 205
  },
  {
    date: '2026-10-20',
    totalOrders: 480,
    wrongPlanDate: 60,
    slippedPlan: 42,
    matchedQuantity: 265,
    matchedJob: 216
  },
  {
    date: '2026-10-21',
    totalOrders: 490,
    wrongPlanDate: 58,
    slippedPlan: 40,
    matchedQuantity: 278,
    matchedJob: 228
  },
  {
    date: '2026-10-22',
    totalOrders: 495,
    wrongPlanDate: 55,
    slippedPlan: 39,
    matchedQuantity: 286,
    matchedJob: 235
  },
  {
    date: '2026-10-23',
    totalOrders: 505,
    wrongPlanDate: 52,
    slippedPlan: 38,
    matchedQuantity: 298,
    matchedJob: 246
  },
  {
    date: '2026-10-24',
    totalOrders: 510,
    wrongPlanDate: 50,
    slippedPlan: 36,
    matchedQuantity: 308,
    matchedJob: 255
  },
  {
    date: '2026-10-25',
    totalOrders: 360,
    wrongPlanDate: 42,
    slippedPlan: 28,
    matchedQuantity: 220,
    matchedJob: 182
  }, // Cuối tuần
  {
    date: '2026-10-26',
    totalOrders: 515,
    wrongPlanDate: 48,
    slippedPlan: 35,
    matchedQuantity: 318,
    matchedJob: 264
  },
  {
    date: '2026-10-27',
    totalOrders: 520,
    wrongPlanDate: 46,
    slippedPlan: 34,
    matchedQuantity: 326,
    matchedJob: 272
  },
  {
    date: '2026-10-28',
    totalOrders: 530,
    wrongPlanDate: 44,
    slippedPlan: 32,
    matchedQuantity: 338,
    matchedJob: 284
  },
  {
    date: '2026-10-29',
    totalOrders: 540,
    wrongPlanDate: 42,
    slippedPlan: 30,
    matchedQuantity: 350,
    matchedJob: 295
  },
  {
    date: '2026-10-30',
    totalOrders: 550,
    wrongPlanDate: 40,
    slippedPlan: 28,
    matchedQuantity: 362,
    matchedJob: 308
  },
  // Ngày 31/10 giả định đang diễn ra (chưa đủ ngày)
  {
    date: '2026-10-31',
    totalOrders: 280,
    wrongPlanDate: 22,
    slippedPlan: 16,
    matchedQuantity: 190,
    matchedJob: 160,
    isIncomplete: true
  }
]

/**
 * Adapter chuyển đổi dữ liệu từ Server API /api/v2/report/production/summary/plan sang cấu trúc chuẩn biểu đồ
 * Hỗ trợ fallback mượt mà giữa Server Live và Mock Data
 */
export function mapServerDataToPlanChartData(serverDailyTrend = [], forceMock = false) {
  if (forceMock || !Array.isArray(serverDailyTrend) || serverDailyTrend.length === 0) {
    return {
      isMock: true,
      dataSourceLabel: 'Dữ liệu mẫu Tháng 10/2026',
      data: MOCK_OCTOBER_PLAN_DATA
    }
  }

  // Chuyển đổi linh hoạt từ các trường của Backend sang chuẩn chart
  const mapped = serverDailyTrend.map((row) => {
    const totalOrders = Number(row.totalOrders ?? row.orderCount ?? row.totalTickets ?? 0)
    const wrongPlanDate = Number(row.wrongPlanDate ?? row.sxSaiNgayCount ?? 0)
    const slippedPlan = Number(row.slippedPlan ?? row.truotKhCount ?? 0)
    const matchedQuantity = Number(row.matchedQuantity ?? row.khopSlCount ?? 0)
    const matchedJob = Number(row.matchedJob ?? row.khopJobCount ?? 0)
    const isIncomplete = Boolean(row.isIncomplete)

    return {
      date: row.date,
      totalOrders,
      wrongPlanDate,
      slippedPlan,
      matchedQuantity,
      matchedJob,
      isIncomplete
    }
  })

  return {
    isMock: false,
    dataSourceLabel: 'Dữ liệu thực từ Server API',
    data: mapped
  }
}
