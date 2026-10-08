/**
 * Dispatcher điều phối toàn bộ động cơ tính toán KHSX & TKSX
 */

import { calculateKHSX } from './planCalculator'
import { calculateTKSX } from './statCalculator'
import { calculateProductionSQLite, isElectronSqliteAvailable } from '../storage/sqliteStorage'

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

  // 2. Chạy trên Web hoặc Fallback: Sử dụng động cơ tính toán Map Streaming tối ưu siêu nhẹ cho IndexedDB
  const planResult = calculateKHSX(files)
  const statResult = calculateTKSX(files)

  // Tính tỷ lệ hoàn thành kế hoạch (Thực tế / Kế hoạch)
  const completionRate =
    planResult.totalPlannedQty > 0
      ? Number(((statResult.totalProducedQty / planResult.totalPlannedQty) * 100).toFixed(2))
      : 0

  return {
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
}

export default {
  runProductionCalculations,
  calculateKHSX,
  calculateTKSX
}
