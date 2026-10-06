/**
 * Module tính toán KHSX (Kế hoạch sản xuất) từ 4 file kiến trúc
 */

export const calculateKHSX = (files = {}) => {
  const summaryOpData = files.summary_op?.data || []
  const unfinishedOpData = files.unfinished_op?.data || []
  const statReportData = files.stat_report?.data || []

  let totalPlannedQty = 0
  let totalTargetQty = 0
  let totalAllowedDefectQty = 0
  let totalUnfinishedQty = 0
  let totalPlannedMinutes = 0

  const planByMachine = {}
  const planByProduct = {}

  // 1. Phân tích kế hoạch từ Báo cáo Tổng hợp Lệnh thao tác
  summaryOpData.forEach((row) => {
    const rawPlanned =
      parseFloat(
        String(row['Số lượng cần sx (1)'] || row['Số lượng cần sản xuất'] || 0).replace(/,/g, '')
      ) || 0
    const rawTarget =
      parseFloat(
        String(row['Số lượng cần đạt (2)'] || row['Số lượng cần đạt'] || 0).replace(/,/g, '')
      ) || 0
    const rawDefect =
      parseFloat(String(row['Số lượng sai hỏng cho phép (3)'] || 0).replace(/,/g, '')) || 0
    const rawDuration =
      parseFloat(String(row['Tổng thời gian kế hoạch (7)'] || 0).replace(/,/g, '')) || 0
    const machine = String(row['Tên máy'] || row['Mã máy'] || 'Chưa gán máy').trim()
    const product = String(row['Tên vật tư'] || row['Mã vật tư'] || 'Khác').trim()

    totalPlannedQty += rawPlanned
    totalTargetQty += rawTarget
    totalAllowedDefectQty += rawDefect
    totalPlannedMinutes += rawDuration * 60

    if (!planByMachine[machine]) {
      planByMachine[machine] = { machine, plannedQty: 0, targetQty: 0, orderCount: 0 }
    }
    planByMachine[machine].plannedQty += rawPlanned
    planByMachine[machine].targetQty += rawTarget
    planByMachine[machine].orderCount += 1

    if (!planByProduct[product]) {
      planByProduct[product] = { product, plannedQty: 0, targetQty: 0 }
    }
    planByProduct[product].plannedQty += rawPlanned
    planByProduct[product].targetQty += rawTarget
  })

  // 2. Phân tích lệnh dở dang từ Báo cáo Lệnh thao tác chưa hoàn thành
  unfinishedOpData.forEach((row) => {
    const rawRemain = parseFloat(String(row['Số lượng còn lại'] || 0).replace(/,/g, '')) || 0
    totalUnfinishedQty += rawRemain
  })

  const machineList = Object.values(planByMachine).sort((a, b) => b.plannedQty - a.plannedQty)
  const productList = Object.values(planByProduct).sort((a, b) => b.plannedQty - a.plannedQty)

  return {
    totalPlannedQty,
    totalTargetQty,
    totalAllowedDefectQty,
    totalUnfinishedQty,
    totalPlannedHours: Number((totalPlannedMinutes / 60).toFixed(2)),
    totalOrders: summaryOpData.length,
    unfinishedOrdersCount: unfinishedOpData.length,
    machineBreakdown: machineList,
    productBreakdown: productList.slice(0, 20)
  }
}
