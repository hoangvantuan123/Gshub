/* eslint-disable no-empty, no-unused-vars */
/**
 * Dispatcher điều phối toàn bộ động cơ tính toán KHSX & TKSX
 */

import { calculateKHSX } from './planCalculator'
import { calculateTKSX } from './statCalculator'
import * as calcRules from './calcRuleConfig'
import storageAdapter from '../storage'

export * from './calcRuleConfig'

export const runProductionCalculations = async (
  files = {},
  masterInfo = {},
  customRules = null
) => {
  let allFiles = files
  if (!allFiles || Object.keys(allFiles).length === 0 || !allFiles.stat_report?.data?.length) {
    try {
      allFiles = await storageAdapter.getAllFiles()
    } catch (e) {
      console.warn('[Calc Engine] Đọc files từ storage adapter:', e)
    }
  }

  const effectiveRules = customRules || masterInfo.calcRules || null
  const calcVersion = masterInfo.calcVersion || masterInfo.version || masterInfo.Version || 'V1'
  const regCode = masterInfo.regCode || masterInfo.RegCode || 'CURRENT_CALC'

  const planResult = calculateKHSX(allFiles || {}, masterInfo || {}, effectiveRules)
  const statResult = calculateTKSX(allFiles || {}, masterInfo || {}, planResult, effectiveRules)

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
    stat: statResult
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
