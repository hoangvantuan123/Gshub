/**
 * SQLite Database Connection & Helper Functions
 * Quản lý khởi tạo Database SQLite (better-sqlite3 / sqlite3) và các tiện ích Matrix/Chunks
 */
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db = null

/**
 * Lấy đối tượng Database SQLite hiện tại
 */
export function getDb() {
  return db
}

/**
 * Chuyển đổi mảng đối tượng thành Columnar Matrix
 */
export function objectsToMatrix(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { cols: [], rows: [] }
  }
  const colSet = new Set()
  const sampleLimit = Math.min(rows.length, 100)
  for (let i = 0; i < sampleLimit; i++) {
    const row = rows[i]
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => colSet.add(k))
    }
  }
  if (rows.length > 100) {
    for (let i = 100; i < rows.length; i += 25) {
      const row = rows[i]
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => colSet.add(k))
      }
    }
  }
  const cols = Array.from(colSet)
  const colCount = cols.length
  const rowCount = rows.length
  const matrixRows = new Array(rowCount)
  for (let i = 0; i < rowCount; i++) {
    const row = rows[i] || {}
    const r = new Array(colCount)
    for (let c = 0; c < colCount; c++) {
      const val = row[cols[c]]
      r[c] = val === undefined ? null : val
    }
    matrixRows[i] = r
  }
  return { cols, rows: matrixRows }
}

/**
 * Phục hồi ma trận thành mảng đối tượng
 */
export function matrixToObjects(matrix) {
  if (!matrix || !Array.isArray(matrix.cols) || !Array.isArray(matrix.rows)) {
    return []
  }
  const { cols, rows } = matrix
  const rowCount = rows.length
  const colCount = cols.length
  const result = new Array(rowCount)
  for (let i = 0; i < rowCount; i++) {
    const r = rows[i]
    const obj = {}
    if (Array.isArray(r)) {
      for (let c = 0; c < colCount; c++) {
        const val = r[c]
        if (val !== null && val !== undefined) {
          obj[cols[c]] = val
        }
      }
    }
    result[i] = obj
  }
  return result
}

/**
 * Hàm tiện ích lấy toàn bộ dữ liệu của 1 fileType từ SQLite (ghép các Chunks lại)
 */
export function getFullDataForFileType(fileType) {
  if (!db || !fileType) return []
  try {
    const chunkStmt = db.prepare(
      'SELECT chunk_index, data FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) ORDER BY chunk_index ASC'
    )
    const chunks = chunkStmt.all(fileType)
    if (chunks && chunks.length > 0) {
      const combined = []
      for (const ch of chunks) {
        if (ch.data) {
          try {
            const arr = typeof ch.data === 'string' ? JSON.parse(ch.data) : ch.data
            if (Array.isArray(arr)) {
              combined.push(...arr)
            }
          } catch {}
        }
      }
      return combined
    }

    // Fallback sang dữ liệu cũ lưu trong cột data
    const fileRow = db
      .prepare('SELECT data FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?)')
      .get(fileType)
    if (fileRow?.data) {
      try {
        const parsed = typeof fileRow.data === 'string' ? JSON.parse(fileRow.data) : fileRow.data
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
  } catch (err) {
    console.error('[SQLite] Lỗi getFullDataForFileType:', err)
  }
  return []
}

/**
 * Khởi tạo cơ sở dữ liệu SQLite
 */
export function initSqliteDatabase() {
  try {
    if (db) return db

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

      // 1. Bảng lưu 4 file kiến trúc (Metadata)
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

      // 2. Bảng lưu các khúc (Chunks) dữ liệu để nạp/lưu theo batch không bao giờ tràn RAM
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_architecture_chunks (
          file_type TEXT,
          chunk_index INTEGER,
          row_count INTEGER,
          data TEXT,
          PRIMARY KEY (file_type, chunk_index)
        );
      `)

      // 3. Bảng lưu đăng ký Master KHSX & TKSX
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_master_registrations (
          reg_code TEXT PRIMARY KEY,
          factory_name TEXT,
          apply_date TEXT,
          production_team TEXT,
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
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN production_team TEXT;`)
      } catch {}
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN version TEXT DEFAULT '1.0';`)
      } catch {}
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN published_at TEXT;`)
      } catch {}
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN registered_by TEXT;`)
      } catch {}
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN raw_size_mb REAL DEFAULT 0;`)
      } catch {}
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN compressed_size_mb REAL DEFAULT 0;`)
      } catch {}
      try {
        db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN compression_ratio TEXT;`)
      } catch {}

      // 4. Bảng lưu kết quả tính toán KHSX & TKSX
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_results (
          id TEXT PRIMARY KEY,
          summary TEXT,
          plan_data TEXT,
          stat_data TEXT,
          calculated_at TEXT
        );
      `)

      console.log('✅ [SQLite] Đã khởi tạo thành công CSDL SQLite tại:', dbPath)
    }
    return db
  } catch (error) {
    console.error('❌ [SQLite] Lỗi khởi tạo cơ sở dữ liệu SQLite:', error)
    return null
  }
}
