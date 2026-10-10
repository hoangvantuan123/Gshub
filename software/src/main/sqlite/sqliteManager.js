/**
 * SQLite Database Manager for Production Calculation Module (Desktop App)
 * Entry-point tổng hợp các module IPC:
 * - db.js: Kết nối CSDL và helper ma trận/chunks
 * - filesIpc.js: Quản lý 4 file kiến trúc (Chunks & Paging 1.500 dòng)
 * - calcEngineIpc.js: Động cơ tính toán ma trận TKSX 98 cột & KHSX 18 chỉ tiêu
 * - masterIpc.js: Quản lý đăng ký Master
 * - bundlePackageIpc.js: Xuất / Nhập gói siêu nén .gsprod
 */
import { initSqliteDatabase, getDb } from './db.js'
import { setupFilesIpc } from './filesIpc.js'
import { setupCalcEngineIpc } from './calcEngineIpc.js'
import { setupMasterIpc } from './masterIpc.js'
import { setupBundlePackageIpc } from './bundlePackageIpc.js'

/**
 * Cấu hình toàn bộ IPC Handlers cho Renderer Process giao tiếp với SQLite
 */
export function setupSqliteIpc() {
  initSqliteDatabase()
  setupFilesIpc()
  setupCalcEngineIpc()
  setupMasterIpc()
  setupBundlePackageIpc()
}

export { initSqliteDatabase, getDb }

export default {
  initSqliteDatabase,
  setupSqliteIpc,
  getDb
}
