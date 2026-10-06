/**
 * Module tính toán TKSX (Thống kê sản xuất) và đối soát với Duyệt sản lượng MES
 * Hỗ trợ cả English Keys và Vietnamese Keys
 */

export const calculateTKSX = (files = {}) => {
  const statReportData = files.stat_report?.data || []
  const mesApprovalData = files.mes_approval?.data || []

  let totalProducedQty = 0
  let totalQualifiedQty = 0
  let totalDefectQty = 0
  let totalDowntimeMinutes = 0
  let totalSyncDelaySec = 0
  let syncCount = 0

  const statByMachine = {}
  const statByTeam = {}
  const statByTechnician = {}

  statReportData.forEach((row) => {
    const produced = parseFloat(
      String(row.ProducedQty ?? row['Số lượng sản xuất'] ?? row['Số lượng thực hiện'] ?? 0).replace(/,/g, '')
    ) || 0
    const qualified = parseFloat(
      String(row.QualifiedQty ?? row['Số lượng đạt'] ?? 0).replace(/,/g, '')
    ) || 0
    const defect = parseFloat(
      String(row.DefectQty ?? row['Số lượng lỗi'] ?? 0).replace(/,/g, '')
    ) || 0
    const downtime = parseFloat(
      String(row.TotalDowntimeMinutes ?? row['Tổng tg hao phí (5)=1+2+3+4'] ?? row['Tổng tg hao phí'] ?? 0).replace(/,/g, '')
    ) || 0
    const syncDelay = parseFloat(
      String(row.SyncLatencySeconds ?? row['Độ trễ thời gian đồng bộ 2 hệ thống'] ?? 0).replace(/,/g, '')
    ) || 0

    const machine = String(row.MachineName ?? row['Tên máy sản xuất'] ?? row.MachineCode ?? row['Mã máy sản xuất'] ?? 'Khác').trim()
    const team = String(row.ProductionTeam ?? row['Tổ sản xuất'] ?? 'Khác').trim()
    const leadTech = String(row.LeadTechnicianName ?? row['Thợ chính'] ?? row['Họ tên thợ chính'] ?? 'Khác').trim()
    const asst1 = String(row.AssistantWorker1Name ?? row['Thợ phụ 1'] ?? '').trim()
    const asst2 = String(row.AssistantWorker2Name ?? row['Thợ phụ 2'] ?? '').trim()

    totalProducedQty += produced
    totalQualifiedQty += qualified
    totalDefectQty += defect
    totalDowntimeMinutes += downtime

    if (syncDelay > 0) {
      totalSyncDelaySec += syncDelay
      syncCount++
    }

    // Thống kê theo máy
    if (!statByMachine[machine]) {
      statByMachine[machine] = { machine, producedQty: 0, qualifiedQty: 0, defectQty: 0, ticketCount: 0 }
    }
    statByMachine[machine].producedQty += produced
    statByMachine[machine].qualifiedQty += qualified
    statByMachine[machine].defectQty += defect
    statByMachine[machine].ticketCount += 1

    // Thống kê theo tổ
    if (!statByTeam[team]) {
      statByTeam[team] = { team, producedQty: 0, qualifiedQty: 0, defectQty: 0 }
    }
    statByTeam[team].producedQty += produced
    statByTeam[team].qualifiedQty += qualified
    statByTeam[team].defectQty += defect

    // Thống kê theo thợ chính
    if (leadTech && leadTech !== 'Khác') {
      if (!statByTechnician[leadTech]) {
        statByTechnician[leadTech] = { technician: leadTech, producedQty: 0, qualifiedQty: 0, defectQty: 0 }
      }
      statByTechnician[leadTech].producedQty += produced
      statByTechnician[leadTech].qualifiedQty += qualified
      statByTechnician[leadTech].defectQty += defect
    }
  })

  // Đối soát với MES
  let mesApprovedProducedQty = 0
  let mesApprovedQualifiedQty = 0
  let mesApprovedDefectQty = 0

  mesApprovalData.forEach((row) => {
    const p = parseFloat(String(row['SL sản xuất'] ?? row.ProducedQty ?? 0).replace(/,/g, '')) || 0
    const q = parseFloat(String(row['SL đạt'] ?? row.QualifiedQty ?? 0).replace(/,/g, '')) || 0
    const d = parseFloat(String(row['SL lỗi'] ?? row.DefectQty ?? 0).replace(/,/g, '')) || 0
    mesApprovedProducedQty += p
    mesApprovedQualifiedQty += q
    mesApprovedDefectQty += d
  })

  const defectRate = totalProducedQty > 0 ? Number(((totalDefectQty / totalProducedQty) * 100).toFixed(2)) : 0
  const avgSyncDelay = syncCount > 0 ? Number((totalSyncDelaySec / syncCount).toFixed(1)) : 0

  return {
    totalProducedQty,
    totalQualifiedQty,
    totalDefectQty,
    defectRate,
    totalTickets: statReportData.length,
    totalDowntimeMinutes,
    avgSyncDelaySeconds: avgSyncDelay,
    mesApproval: {
      totalApprovedTickets: mesApprovalData.length,
      approvedProducedQty: mesApprovedProducedQty,
      approvedQualifiedQty: mesApprovedQualifiedQty,
      approvedDefectQty: mesApprovedDefectQty,
      discrepancyProducedQty: totalProducedQty - mesApprovedProducedQty,
      discrepancyQualifiedQty: totalQualifiedQty - mesApprovedQualifiedQty
    },
    machineBreakdown: Object.values(statByMachine).sort((a, b) => b.producedQty - a.producedQty),
    teamBreakdown: Object.values(statByTeam).sort((a, b) => b.producedQty - a.producedQty),
    technicianBreakdown: Object.values(statByTechnician).sort((a, b) => b.producedQty - a.producedQty)
  }
}
