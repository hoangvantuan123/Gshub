/* eslint-disable no-empty, no-unused-vars */
/**
 * Dispatcher điều phối toàn bộ động cơ tính toán KHSX & TKSX
 */

import { calculateKHSX } from './planCalculator'
import { calculateTKSX } from './statCalculator'
import * as calcRules from './calcRuleConfig'
import storageAdapter from '../storage'
import {
  attachDeclaredMachines,
  buildMachineComparison,
  getMesMachineSources
} from './machineComparison'

export * from './calcRuleConfig'

export const runProductionCalculations = async (
  files = {},
  masterInfo = {},
  customRules = null,
  onProgress = null
) => {
  const regCode = masterInfo.regCode || masterInfo.RegCode || 'CURRENT_CALC'
  let allFiles = files
  if (!allFiles || Object.keys(allFiles).length === 0 || !allFiles.stat_report?.data?.length) {
    try {
      allFiles = await storageAdapter.getAllFiles(regCode)
    } catch (e) {
      console.warn('[Calc Engine] Đọc files từ storage adapter:', e)
    }
  }

  const effectiveRules = customRules || masterInfo.calcRules || null
  const calcVersion = masterInfo.calcVersion || masterInfo.version || masterInfo.Version || 'V1'
  const reportProgress = async (percent, step, message, activeTab) => {
    await onProgress?.({ percent, step, message, activeTab, detail: message, statusTag: message })
  }

  // 1. Tính sơ bộ TKSX để tính Cột 91 'Thời gian chạy thực tế' chuẩn xác cho từng dòng Thống kê sản xuất (Tab 1b)
  await reportProgress(50, 'CALC_TKSX', 'Đang tính kết quả TKSX (tab 5)...', 'result_tksx')
  const preStatResult = calculateTKSX(allFiles || {}, masterInfo || {}, null, effectiveRules)

  const filesWithCalculatedStats = {
    ...allFiles,
    stat_report: {
      ...allFiles.stat_report,
      data: preStatResult.calculatedRows || allFiles.stat_report?.data || []
    }
  }

  // 2. Tính KHSX (Tab 6 Kết quả KHSX): Tổng 'Thời gian sản xuất' được lấy chính xác từ tổng 'Thời gian chạy thực tế' của Tab 1b
  await reportProgress(80, 'CALC_KHSX', 'Đang tính kết quả KHSX (tab 6)...', 'result_khsx')
  const planResult = calculateKHSX(filesWithCalculatedStats, masterInfo || {}, effectiveRules)
  planResult.calculatedRows = attachDeclaredMachines(
    planResult.calculatedRows,
    allFiles.summary_op?.data || []
  )

  // 3. Hoàn tất tính toán TKSX (Tab 5 Kết quả TKSX) với đối soát KHSX (Cột 93 CHECK KHSX)
  const statResult = calculateTKSX(allFiles || {}, masterInfo || {}, planResult, effectiveRules)

  // Tab 7 is calculated only after both final result sets exist, and is saved
  // with the report instead of being produced only when the user opens the tab.
  await reportProgress(
    90,
    'CALC_MACHINES',
    'Đang đối chiếu máy TKSX - KHSX - MES (tab 7)...',
    'machine_comparison'
  )
  const mesMachines = getMesMachineSources(allFiles.mes_approval?.data || [])
  const machineComparison = {
    matchVersion: 2,
    mesMachines,
    calculatedRows: buildMachineComparison(
      statResult.calculatedRows,
      planResult.calculatedRows,
      mesMachines
    )
  }

  // Tính tỷ lệ hoàn thành kế hoạch (Thực tế / Kế hoạch)
  const completionRate =
    planResult.totalPlannedQty > 0
      ? Number(((statResult.totalProducedQty / planResult.totalPlannedQty) * 100).toFixed(2))
      : 0

  const result = {
    success: true,
    version: calcVersion,
    calcVersion,
    regCode,
    calculatedAt: new Date().toISOString(),
    summary: {
      version: calcVersion,
      calcVersion,
      regCode,
      completionRate,
      plannedQty: planResult.totalPlannedQty,
      producedQty: statResult.totalProducedQty,
      qualifiedQty: statResult.totalQualifiedQty,
      defectQty: statResult.totalDefectQty,
      defectRate: statResult.defectRate,
      unfinishedQty: planResult.totalUnfinishedQty
    },
    plan: planResult,
    stat: statResult,
    machineComparison
  }

  // Tự động lưu kết quả vào CSDL
  try {
    await storageAdapter.saveCalcResults('CURRENT_CALC', result)
  } catch {}

  return result
}

export default {
  runProductionCalculations,
  calculateKHSX,
  calculateTKSX
}
