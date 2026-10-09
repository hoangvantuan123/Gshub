import { RESULT_KHSX_COLUMN_SCHEMA } from '../constants/calcConstants'

function normalizeCode(val) {
  if (val === undefined || val === null) return ''
  return String(val).trim().toUpperCase()
}

export const calculateKHSX = (files = {}) => {
  const summaryOpData = files.summary_op?.data || []
  const unfinishedOpData = files.unfinished_op?.data || []
  const statReportData = files.stat_report?.data || []

  // 1. TỔNG HỢP THỰC TẾ SẢN XUẤT TỪ TAB 1 THEO LỆNH THAO TÁC
  const actualStatsMap = new Map()
  statReportData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row['Số lệnh thao tác'] ??
        row['Lệnh thao tác'] ??
        row.OperationOrder ??
        ''
    )
    if (!code) return

    const produced =
      parseFloat(
        String(
          row.ProducedQty ?? row['Số lượng sản xuất'] ?? row['Số lượng thực hiện'] ?? 0
        ).replace(/,/g, '')
      ) || 0
    const qualified =
      parseFloat(String(row.QualifiedQty ?? row['Số lượng đạt'] ?? 0).replace(/,/g, '')) || 0
    const defect =
      parseFloat(String(row.DefectQty ?? row['Số lượng lỗi'] ?? 0).replace(/,/g, '')) || 0
    const runTimeMin =
      parseFloat(
        String(row.ActualRunTime ?? row['Thời gian chạy thực tế'] ?? 0).replace(/,/g, '')
      ) || 0

    if (!actualStatsMap.has(code)) {
      actualStatsMap.set(code, {
        produced: 0,
        qualified: 0,
        defect: 0,
        runTimeMin: 0,
        ticketCount: 0
      })
    }

    const current = actualStatsMap.get(code)
    current.produced += produced
    current.qualified += qualified
    current.defect += defect
    current.runTimeMin += runTimeMin
    current.ticketCount += 1
  })

  // 2. TỔNG HỢP LỆNH DỞ DANG TỪ TAB 2 THEO LỆNH THAO TÁC
  const unfinishedMap = new Map()
  unfinishedOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
    )
    if (!code) return
    const rawRemain =
      parseFloat(
        String(
          row.RemainingQty ??
            row['Số lượng còn lại'] ??
            row['Số lượng cần sản xuất'] ??
            0
        ).replace(/,/g, '')
      ) || 0
    unfinishedMap.set(code, (unfinishedMap.get(code) || 0) + rawRemain)
  })

  let totalPlannedQty = 0
  let totalTargetQty = 0
  let totalAllowedDefectQty = 0
  let totalUnfinishedQty = 0
  let totalPlannedMinutes = 0

  const planByMachine = {}
  const planByProduct = {}
  const processedCodes = new Set()

  // 3. TÍNH TOÁN CHI TIẾT TỪNG DÒNG KẾ HOẠCH SẢN XUẤT (KHSX)
  const calculatedRows = []

  summaryOpData.forEach((row, idx) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row['Lệnh thao tác'] ??
        row['Số lệnh thao tác'] ??
        row.OperationOrder ??
        `KHSX-${idx + 1}`
    )
    processedCodes.add(code)

    const matCode = String(row.MaterialCode ?? row['Mã vật tư'] ?? row['Mã hàng'] ?? '').trim()
    const matName = String(
      row.MaterialName ?? row['Tên vật tư'] ?? row['Tên hàng'] ?? row['Tên sản phẩm'] ?? ''
    ).trim()
    const unit = String(row.Unit ?? row['ĐVT'] ?? row['Đơn vị tính'] ?? 'Cái').trim()
    const machine = String(
      row.MachineName ?? row['Tên máy'] ?? row.MachineCode ?? row['Mã máy'] ?? 'Chưa gán máy'
    ).trim()
    const opName = String(
      row.OperationName ??
        row['Tên thao tác'] ??
        row['Công đoạn'] ??
        row['Thao tác'] ??
        ''
    ).trim()

    const rawPlanned =
      parseFloat(
        String(
          row.PlannedQty ??
            row['Số lượng cần sx (1)'] ??
            row['Số lượng \ncần sx \n(1)'] ??
            row['Số lượng cần sản xuất'] ??
            0
        ).replace(/,/g, '')
      ) || 0
    const rawTarget =
      parseFloat(
        String(
          row.TargetQty ??
            row['Số lượng cần đạt (2)'] ??
            row['Số lượng \ncần đạt \n(2)'] ??
            row['Số lượng cần đạt'] ??
            0
        ).replace(/,/g, '')
      ) || 0
    const rawAllowedDefect =
      parseFloat(
        String(
          row.AllowedDefectQty ??
            row['Số lượng sai hỏng cho phép (3)'] ??
            row['Số lượng \nsai hỏng \ncho phép \n(3)'] ??
            0
        ).replace(/,/g, '')
      ) || 0
    const rawDurationHours =
      parseFloat(
        String(
          row.PlannedHours ??
            row['Tổng thời gian kế hoạch (7)'] ??
            row['Thời gian KH'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // Khớp số liệu thực tế từ Tab 1
    const actual = actualStatsMap.get(code) || {
      produced: 0,
      qualified: 0,
      defect: 0,
      runTimeMin: 0
    }
    const actualProduced = actual.produced
    const actualQualified = actual.qualified
    const actualDefect = actual.defect
    const actualRunHours = Number((actual.runTimeMin / 60).toFixed(2))

    // Khớp dở dang từ Tab 2
    const remainingQty =
      unfinishedMap.get(code) !== undefined
        ? unfinishedMap.get(code)
        : Math.max(0, rawPlanned - actualProduced)

    // Tỷ lệ hoàn thành %
    let completionRate = 0
    if (rawPlanned > 0) {
      completionRate = Number(((actualProduced / rawPlanned) * 100).toFixed(2))
    }

    let completionStatus = 'Chưa hoàn thành'
    if (rawPlanned > 0) {
      if (completionRate >= 100) {
        completionStatus = completionRate > 100 ? 'Vượt KHSX' : 'Đạt KHSX'
      } else if (completionRate > 0) {
        completionStatus = `Đang thực hiện (${completionRate}%)`
      }
    } else if (actualProduced > 0) {
      completionStatus = 'Ngoài KHSX'
    }

    const timeDiffHours = Number((actualRunHours - rawDurationHours).toFixed(2))

    totalPlannedQty += rawPlanned
    totalTargetQty += rawTarget
    totalAllowedDefectQty += rawAllowedDefect
    totalPlannedMinutes += rawDurationHours * 60
    totalUnfinishedQty += remainingQty

    if (!planByMachine[machine]) {
      planByMachine[machine] = { machine, plannedQty: 0, targetQty: 0, actualProducedQty: 0, orderCount: 0 }
    }
    planByMachine[machine].plannedQty += rawPlanned
    planByMachine[machine].targetQty += rawTarget
    planByMachine[machine].actualProducedQty += actualProduced
    planByMachine[machine].orderCount += 1

    if (!planByProduct[matName || matCode]) {
      planByProduct[matName || matCode] = { product: matName || matCode, plannedQty: 0, targetQty: 0 }
    }
    planByProduct[matName || matCode].plannedQty += rawPlanned
    planByProduct[matName || matCode].targetQty += rawTarget

    calculatedRows.push({
      IdSeq: `KHSX-${idx + 1}`,
      OperationOrderNo: code,
      MaterialCode: matCode,
      MaterialName: matName,
      Unit: unit,
      MachineName: machine,
      OperationName: opName,
      PlannedQty: rawPlanned,
      TargetQty: rawTarget,
      AllowedDefectQty: rawAllowedDefect,
      ActualProducedQty: actualProduced,
      ActualQualifiedQty: actualQualified,
      ActualDefectQty: actualDefect,
      RemainingQty: remainingQty,
      CompletionRate: completionRate,
      CompletionStatus: completionStatus,
      PlannedHours: rawDurationHours,
      ActualRunHours: actualRunHours,
      TimeDiffHours: timeDiffHours
    })
  })

  // 4. BỔ SUNG CÁC LỆNH DỞ DANG CHƯA CÓ TRONG BÁO CÁO TỔNG HỢP
  unfinishedOpData.forEach((row, idx) => {
    const code = normalizeCode(
      row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
    )
    if (!code || processedCodes.has(code)) return
    processedCodes.add(code)

    const matCode = String(row.MaterialCode ?? row['Mã vật tư'] ?? row['Mã hàng'] ?? '').trim()
    const matName = String(row.MaterialName ?? row['Tên vật tư'] ?? row['Tên hàng'] ?? '').trim()
    const rawRemain =
      parseFloat(
        String(
          row.RemainingQty ??
            row['Số lượng còn lại'] ??
            row['Số lượng cần sản xuất'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    const actual = actualStatsMap.get(code) || { produced: 0, qualified: 0, defect: 0, runTimeMin: 0 }
    totalUnfinishedQty += rawRemain

    calculatedRows.push({
      IdSeq: `KHSX-UNF-${idx + 1}`,
      OperationOrderNo: code,
      MaterialCode: matCode,
      MaterialName: matName,
      Unit: 'Cái',
      MachineName: 'Chưa gán',
      OperationName: 'Lệnh dở dang',
      PlannedQty: rawRemain + actual.produced,
      TargetQty: rawRemain,
      AllowedDefectQty: 0,
      ActualProducedQty: actual.produced,
      ActualQualifiedQty: actual.qualified,
      ActualDefectQty: actual.defect,
      RemainingQty: rawRemain,
      CompletionRate: rawRemain + actual.produced > 0 ? Number(((actual.produced / (rawRemain + actual.produced)) * 100).toFixed(2)) : 0,
      CompletionStatus: 'Lệnh dở dang',
      PlannedHours: 0,
      ActualRunHours: Number((actual.runTimeMin / 60).toFixed(2)),
      TimeDiffHours: 0
    })
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
    productBreakdown: productList.slice(0, 20),
    columns: RESULT_KHSX_COLUMN_SCHEMA,
    calculatedRows
  }
}
