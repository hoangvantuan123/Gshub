/**
 * Dispatcher điều phối toàn bộ động cơ tính toán KHSX & TKSX
 */

import { calculateKHSX } from './planCalculator'
import { calculateTKSX } from './statCalculator'
import { calculateProductionSQLite, isElectronSqliteAvailable } from '../storage/sqliteStorage'

import storageAdapter from '../storage'

export const runProductionCalculations = async (files = {}) => {
  // 1. Nếu chạy trên Electron Desktop: Ưu tiên tính toán trực tiếp từ CSDL SQLite qua IPC (Native C++)
  if (isElectronSqliteAvailable()) {
    try {
      const sqliteResult = await calculateProductionSQLite()
      if (sqliteResult && sqliteResult.success && sqliteResult.stat?.calculatedRows?.length > 0) {
        return sqliteResult
      }
    } catch (err) {
      console.warn('[Calc Engine] Chuyển sang động cơ tính toán tối ưu IndexedDB:', err)
    }
  }

  // 2. Chạy trên Web / Fallback: Đảm bảo chọc trực tiếp vào CSDL IndexedDB đọc toàn bộ 4 bảng thô
  let allFiles = files
  if (!allFiles || Object.keys(allFiles).length === 0 || !allFiles.stat_report?.data?.length) {
    try {
      allFiles = await storageAdapter.getAllFiles()
    } catch (e) {
      console.warn('[Calc Engine] Đọc files từ storage adapter:', e)
    }
  }

  const planResult = calculateKHSX(allFiles || {})
  const statResult = calculateTKSX(allFiles || {})

  // Tính tỷ lệ hoàn thành kế hoạch (Thực tế / Kế hoạch)
  const completionRate =
    planResult.totalPlannedQty > 0
      ? Number(((statResult.totalProducedQty / planResult.totalPlannedQty) * 100).toFixed(2))
      : 0

  const result = {
    success: true,
    calculatedAt: new Date().toISOString(),
    summary: {
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
