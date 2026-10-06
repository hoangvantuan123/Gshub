/**
 * SQLite Database Manager for Production Calculation Module (Desktop App)
 * Sử dụng better-sqlite3 / sqlite3 lưu trữ cục bộ tại UserData
 */
import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

let db = null

/**
 * Khởi tạo cơ sở dữ liệu SQLite
 */
export function initSqliteDatabase() {
  try {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'databases')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    const dbPath = path.join(dbDir, 'gshub_production_calc.db')

    let DatabaseClass = null
    try {
      const module = require('better-sqlite3')
      DatabaseClass = module.default || module
    } catch {
      try {
        const module = require('sqlite3')
        console.log('[SQLite] Sử dụng sqlite3 fallback')
      } catch (err) {
        console.warn('[SQLite] Không nạp được native module better-sqlite3/sqlite3:', err?.message)
      }
    }

    if (DatabaseClass) {
      db = new DatabaseClass(dbPath)
      db.pragma('journal_mode = WAL')

      // 1. Bảng lưu 4 file kiến trúc
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_architecture_files (
          file_type TEXT PRIMARY KEY,
          file_name TEXT,
          file_size INTEGER,
          row_count INTEGER,
          columns TEXT,
          data TEXT,
          uploaded_at TEXT
        );
      `)

      // 3. Bảng lưu đăng ký Master KHSX & TKSX
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_master_registrations (
          reg_code TEXT PRIMARY KEY,
          factory_name TEXT,
          apply_date TEXT,
          remark TEXT,
          status TEXT,
          stat_report_rows INTEGER DEFAULT 0,
          unfinished_op_rows INTEGER DEFAULT 0,
          summary_op_rows INTEGER DEFAULT 0,
          mes_approval_rows INTEGER DEFAULT 0,
          total_rows INTEGER DEFAULT 0,
          file_summaries TEXT,
          registered_at TEXT
        );
      `)

      console.log('✅ [SQLite] Đã khởi tạo thành công CSDL SQLite tại:', dbPath)
    }
  } catch (error) {
    console.error('❌ [SQLite] Lỗi khởi tạo cơ sở dữ liệu SQLite:', error)
  }
}

/**
 * Cấu hình IPC Handlers cho Renderer Process giao tiếp với SQLite
 */
export function setupSqliteIpc() {
  initSqliteDatabase()

  // Lưu 1 file kiến trúc
  ipcMain.handle('sqlite:save-calc-file', async (_, payload) => {
    if (!db) {
      return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    }
    try {
      const stmt = db.prepare(`
        INSERT INTO calc_architecture_files (file_type, file_name, file_size, row_count, columns, data, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_type) DO UPDATE SET
          file_name = excluded.file_name,
          file_size = excluded.file_size,
          row_count = excluded.row_count,
          columns = excluded.columns,
          data = excluded.data,
          uploaded_at = excluded.uploaded_at
      `)

      stmt.run(
        payload.fileType,
        payload.fileName || '',
        payload.fileSize || 0,
        payload.rowCount || 0,
        typeof payload.columns === 'string' ? payload.columns : JSON.stringify(payload.columns || []),
        typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data || []),
        payload.uploadedAt || new Date().toISOString()
      )

      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu file:', err)
      return { success: false, error: err.message }
    }
  })

  // Lấy Metadata tóm tắt của tất cả các file (KHÔNG đọc cột data dung lượng lớn -> Cực nhanh < 1ms)
  ipcMain.handle('sqlite:get-all-file-summaries', async () => {
    if (!db) return []
    try {
      const stmt = db.prepare(
        'SELECT file_type, file_name, file_size, row_count, columns, uploaded_at FROM calc_architecture_files'
      )
      const rows = stmt.all()
      return rows.map((row) => ({
        fileType: row.file_type,
        fileName: row.file_name,
        fileSize: row.file_size,
        rowCount: row.row_count,
        columns: JSON.parse(row.columns || '[]'),
        uploadedAt: row.uploaded_at
      }))
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy tóm tắt files:', err)
      return []
    }
  })

  // Lấy chi tiết 1 file (bao gồm data) khi thực sự cần hiển thị Tab đó
  ipcMain.handle('sqlite:get-calc-file', async (_, fileType) => {
    if (!db) return null
    try {
      const stmt = db.prepare('SELECT * FROM calc_architecture_files WHERE file_type = ?')
      const row = stmt.get(fileType)
      if (!row) return null
      return {
        fileType: row.file_type,
        fileName: row.file_name,
        fileSize: row.file_size,
        rowCount: row.row_count,
        columns: JSON.parse(row.columns || '[]'),
        data: JSON.parse(row.data || '[]'),
        uploadedAt: row.uploaded_at
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy file:', err)
      return null
    }
  })

  // Lấy toàn bộ các file (chỉ dùng khi tính toán KHSX & TKSX)
  ipcMain.handle('sqlite:get-all-calc-files', async () => {
    if (!db) return []
    try {
      const stmt = db.prepare('SELECT * FROM calc_architecture_files')
      const rows = stmt.all()
      return rows.map((row) => ({
        fileType: row.file_type,
        fileName: row.file_name,
        fileSize: row.file_size,
        rowCount: row.row_count,
        columns: JSON.parse(row.columns || '[]'),
        data: JSON.parse(row.data || '[]'),
        uploadedAt: row.uploaded_at
      }))
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy toàn bộ files:', err)
      return []
    }
  })

  // Xóa 1 file hoặc xóa toàn bộ
  ipcMain.handle('sqlite:delete-calc-file', async (_, fileType) => {
    if (!db) return { success: false }
    try {
      if (fileType) {
        const stmt = db.prepare('DELETE FROM calc_architecture_files WHERE file_type = ?')
        stmt.run(fileType)
      } else {
        db.exec('DELETE FROM calc_architecture_files')
      }
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa file:', err)
      return { success: false, error: err.message }
    }
  })

  // Lưu kết quả tính toán
  ipcMain.handle('sqlite:save-calc-results', async (_, payload) => {
    if (!db) return { success: false }
    try {
      const stmt = db.prepare(`
        INSERT INTO calc_results (id, completion_rate, summary, plan_data, stat_data, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          completion_rate = excluded.completion_rate,
          summary = excluded.summary,
          plan_data = excluded.plan_data,
          stat_data = excluded.stat_data,
          calculated_at = excluded.calculated_at
      `)

      stmt.run(
        payload.id || 'latest',
        payload.summary?.completionRate || 0,
        JSON.stringify(payload.summary || {}),
        JSON.stringify(payload.plan || {}),
        JSON.stringify(payload.stat || {}),
        payload.calculatedAt || new Date().toISOString()
      )
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu kết quả tính:', err)
      return { success: false, error: err.message }
    }
  })

  // Lưu đăng ký Master
  ipcMain.handle('sqlite:save-master-reg', async (_, payload) => {
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      const stmt = db.prepare(`
        INSERT INTO calc_master_registrations (
          reg_code, factory_name, apply_date, remark, status,
          stat_report_rows, unfinished_op_rows, summary_op_rows, mes_approval_rows, total_rows,
          file_summaries, registered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(reg_code) DO UPDATE SET
          factory_name = excluded.factory_name,
          apply_date = excluded.apply_date,
          remark = excluded.remark,
          status = excluded.status,
          stat_report_rows = excluded.stat_report_rows,
          unfinished_op_rows = excluded.unfinished_op_rows,
          summary_op_rows = excluded.summary_op_rows,
          mes_approval_rows = excluded.mes_approval_rows,
          total_rows = excluded.total_rows,
          file_summaries = excluded.file_summaries,
          registered_at = excluded.registered_at
      `)

      stmt.run(
        payload.regCode,
        payload.factoryName || 'GS1 Hà Nội',
        payload.applyDate || '',
        payload.remark || '',
        payload.status || 'REGISTERED',
        payload.statReportRows || 0,
        payload.unfinishedOpRows || 0,
        payload.summaryOpRows || 0,
        payload.mesApprovalRows || 0,
        payload.totalRows || 0,
        typeof payload.fileSummaries === 'string' ? payload.fileSummaries : JSON.stringify(payload.fileSummaries || {}),
        payload.registeredAt || new Date().toISOString()
      )
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu master reg:', err)
      return { success: false, error: err.message }
    }
  })

  // Lấy tất cả đăng ký Master
  ipcMain.handle('sqlite:get-all-master-regs', async () => {
    if (!db) return []
    try {
      const stmt = db.prepare('SELECT * FROM calc_master_registrations ORDER BY registered_at DESC')
      const rows = stmt.all()
      return rows.map((r) => ({
        regCode: r.reg_code,
        factoryName: r.factory_name,
        applyDate: r.apply_date,
        remark: r.remark,
        status: r.status,
        statReportRows: r.stat_report_rows,
        unfinishedOpRows: r.unfinished_op_rows,
        summaryOpRows: r.summary_op_rows,
        mesApprovalRows: r.mes_approval_rows,
        totalRows: r.total_rows,
        fileSummaries: JSON.parse(r.file_summaries || '{}'),
        registeredAt: r.registered_at
      }))
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy danh sách master reg:', err)
      return []
    }
  })

  // Lấy 1 đăng ký Master theo regCode
  ipcMain.handle('sqlite:get-master-reg', async (_, regCode) => {
    if (!db || !regCode) return null
    try {
      const stmt = db.prepare('SELECT * FROM calc_master_registrations WHERE reg_code = ?')
      const r = stmt.get(regCode)
      if (!r) return null
      return {
        regCode: r.reg_code,
        factoryName: r.factory_name,
        applyDate: r.apply_date,
        remark: r.remark,
        status: r.status,
        statReportRows: r.stat_report_rows,
        unfinishedOpRows: r.unfinished_op_rows,
        summaryOpRows: r.summary_op_rows,
        mesApprovalRows: r.mes_approval_rows,
        totalRows: r.total_rows,
        fileSummaries: JSON.parse(r.file_summaries || '{}'),
        registeredAt: r.registered_at
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy master reg:', err)
      return null
    }
  })

  // Xóa đăng ký Master
  ipcMain.handle('sqlite:delete-master-reg', async (_, regCode) => {
    if (!db) return { success: false }
    try {
      const stmt = db.prepare('DELETE FROM calc_master_registrations WHERE reg_code = ?')
      stmt.run(regCode)
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa master reg:', err)
      return { success: false, error: err.message }
    }
  })
}

export default {
  initSqliteDatabase,
  setupSqliteIpc
}
