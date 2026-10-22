/* eslint-disable no-empty */
/**
 * SQLite Database Connection & Helper Functions
 * Quản lý khởi tạo Database SQLite (better-sqlite3 / sqlite3) và các tiện ích Matrix/Chunks
 */
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

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
export function getFullDataForFileType(fileType, regCode = '') {
  if (!db || !fileType) return []
  try {
    let chunks = []
    if (regCode) {
      const chunkStmt = db.prepare(
        'SELECT chunk_index, data FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) AND reg_code = ? ORDER BY chunk_index ASC'
      )
      chunks = chunkStmt.all(fileType, regCode)
    } else {
      const chunkStmt = db.prepare(
        "SELECT chunk_index, data FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) AND (reg_code IS NULL OR reg_code = '') ORDER BY chunk_index ASC"
      )
      chunks = chunkStmt.all(fileType)
    }

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

    // Fallback sang dữ liệu cũ lưu trong cột data (nếu có)
    let fileRow = null
    if (regCode) {
      fileRow = db
        .prepare(
          'SELECT data FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?) AND reg_code = ?'
        )
        .get(fileType, regCode)
    } else {
      fileRow = db
        .prepare(
          "SELECT data FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?) AND (reg_code IS NULL OR reg_code = '')"
        )
        .get(fileType)
    }
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
    } catch (e1) {
      try {
        if (app.isPackaged && process.resourcesPath) {
          const unpackedPath = path.join(
            process.resourcesPath,
            'app.asar.unpacked',
            'node_modules',
            'better-sqlite3'
          )
          if (fs.existsSync(unpackedPath)) {
            const module = require(unpackedPath)
            DatabaseClass = module.default || module
          }
        }
      } catch (e2) {
        console.warn('[SQLite] Lỗi nạp better-sqlite3 từ unpacked:', e2?.message)
      }

      if (!DatabaseClass) {
        try {
          const module = require('sqlite3')
          DatabaseClass = module.default || module
          console.log('[SQLite] Sử dụng sqlite3 fallback')
        } catch (err) {
          console.warn(
            '[SQLite] Không nạp được native module better-sqlite3/sqlite3:',
            err?.message || e1?.message
          )
        }
      }
    }

    if (DatabaseClass) {
      const totalRamMB = Math.round(os.totalmem() / (1024 * 1024))
      const isLowEnd = totalRamMB <= 6144
      const cacheSize = isLowEnd ? -16000 : -64000 // Máy yếu: 16MB cache; máy mạnh: 64MB cache
      const mmapSize = isLowEnd ? 67108864 : 268435456 // Máy yếu: 64MB mmap; máy mạnh: 256MB mmap

      db = new DatabaseClass(dbPath)
      db.pragma('journal_mode = WAL')
      db.pragma('synchronous = NORMAL')
      db.pragma('temp_store = MEMORY')
      db.pragma(`cache_size = ${cacheSize}`)
      try {
        db.pragma(`mmap_size = ${mmapSize}`)
      } catch {}

      // Tự động kiểm tra và đồng bộ cấu trúc cơ sở dữ liệu trên mọi máy
      verifyAndMigrateDatabaseSchema(db)

      console.log('✅ [SQLite] Đã khởi tạo thành công CSDL SQLite tại:', dbPath)
    }
    return db
  } catch (error) {
    console.error('❌ [SQLite] Lỗi khởi tạo cơ sở dữ liệu SQLite:', error)
    return null
  }
}

/**
 * Tự động kiểm tra và nâng cấp cấu trúc Database SQLite (Auto Migration)
 * Đảm bảo mọi máy tính khi cập nhật phần mềm đều tự động có đầy đủ các bảng và cột mới nhất
 */
export function verifyAndMigrateDatabaseSchema(db) {
  if (!db) return

  try {
    // 1. Bảng lưu file kiến trúc (calc_architecture_files)
    db.exec(`
      CREATE TABLE IF NOT EXISTS calc_architecture_files (
        reg_code TEXT DEFAULT '',
        file_type TEXT,
        file_name TEXT,
        file_size INTEGER,
        row_count INTEGER,
        columns TEXT,
        data TEXT,
        uploaded_at TEXT,
        PRIMARY KEY (reg_code, file_type)
      );
    `)

    // Nâng cấp nếu bản cũ thiếu reg_code
    try {
      const fileCols = db.prepare('PRAGMA table_info(calc_architecture_files)').all()
      if (!fileCols.some((c) => c.name === 'reg_code')) {
        console.log(
          '[SQLite Auto-Migrate] Nâng cấp cấu trúc bảng calc_architecture_files (thêm reg_code)...'
        )
        db.exec(`
          CREATE TABLE IF NOT EXISTS calc_architecture_files_new (
            reg_code TEXT DEFAULT '',
            file_type TEXT,
            file_name TEXT,
            file_size INTEGER,
            row_count INTEGER,
            columns TEXT,
            data TEXT,
            uploaded_at TEXT,
            PRIMARY KEY (reg_code, file_type)
          );
          INSERT OR IGNORE INTO calc_architecture_files_new (reg_code, file_type, file_name, file_size, row_count, columns, data, uploaded_at)
          SELECT '', file_type, file_name, file_size, row_count, columns, data, uploaded_at FROM calc_architecture_files;
          DROP TABLE calc_architecture_files;
          ALTER TABLE calc_architecture_files_new RENAME TO calc_architecture_files;
        `)
      }
    } catch (migErr) {
      console.warn('[SQLite Migration] files table:', migErr)
    }

    // 2. Bảng lưu các khúc (calc_architecture_chunks)
    db.exec(`
      CREATE TABLE IF NOT EXISTS calc_architecture_chunks (
        reg_code TEXT DEFAULT '',
        file_type TEXT,
        chunk_index INTEGER,
        row_count INTEGER,
        data TEXT,
        PRIMARY KEY (reg_code, file_type, chunk_index)
      );
    `)

    // Nâng cấp nếu bản cũ thiếu reg_code
    try {
      const chunkCols = db.prepare('PRAGMA table_info(calc_architecture_chunks)').all()
      if (!chunkCols.some((c) => c.name === 'reg_code')) {
        console.log(
          '[SQLite Auto-Migrate] Nâng cấp cấu trúc bảng calc_architecture_chunks (thêm reg_code)...'
        )
        db.exec(`
          CREATE TABLE IF NOT EXISTS calc_architecture_chunks_new (
            reg_code TEXT DEFAULT '',
            file_type TEXT,
            chunk_index INTEGER,
            row_count INTEGER,
            data TEXT,
            PRIMARY KEY (reg_code, file_type, chunk_index)
          );
          INSERT OR IGNORE INTO calc_architecture_chunks_new (reg_code, file_type, chunk_index, row_count, data)
          SELECT '', file_type, chunk_index, row_count, data FROM calc_architecture_chunks;
          DROP TABLE calc_architecture_chunks;
          ALTER TABLE calc_architecture_chunks_new RENAME TO calc_architecture_chunks;
        `)
      }
    } catch (migErr) {
      console.warn('[SQLite Migration] chunks table:', migErr)
    }

    // 3. Bảng đăng ký Master KHSX & TKSX (calc_master_registrations)
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
        registered_at TEXT,
        version TEXT DEFAULT '1.0',
        is_published INTEGER DEFAULT 0,
        published_at TEXT,
        registered_by TEXT,
        raw_size_mb REAL DEFAULT 0,
        compressed_size_mb REAL DEFAULT 0,
        compression_ratio TEXT
      );
    `)

    // Tự động kiểm tra và bổ sung MỌI cột thiếu trong calc_master_registrations
    const masterCols = db.prepare('PRAGMA table_info(calc_master_registrations)').all()
    const existingMasterColNames = new Set(masterCols.map((c) => c.name))

    const requiredMasterColumns = [
      { name: 'factory_name', def: 'TEXT' },
      { name: 'apply_date', def: 'TEXT' },
      { name: 'production_team', def: 'TEXT' },
      { name: 'remark', def: 'TEXT' },
      { name: 'status', def: 'TEXT' },
      { name: 'stat_report_rows', def: 'INTEGER DEFAULT 0' },
      { name: 'unfinished_op_rows', def: 'INTEGER DEFAULT 0' },
      { name: 'summary_op_rows', def: 'INTEGER DEFAULT 0' },
      { name: 'mes_approval_rows', def: 'INTEGER DEFAULT 0' },
      { name: 'total_rows', def: 'INTEGER DEFAULT 0' },
      { name: 'file_summaries', def: 'TEXT' },
      { name: 'registered_at', def: 'TEXT' },
      { name: 'version', def: "TEXT DEFAULT '1.0'" },
      { name: 'is_published', def: 'INTEGER DEFAULT 0' },
      { name: 'published_at', def: 'TEXT' },
      { name: 'registered_by', def: 'TEXT' },
      { name: 'raw_size_mb', def: 'REAL DEFAULT 0' },
      { name: 'compressed_size_mb', def: 'REAL DEFAULT 0' },
      { name: 'compression_ratio', def: 'TEXT' }
    ]

    for (const col of requiredMasterColumns) {
      if (!existingMasterColNames.has(col.name)) {
        try {
          db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN ${col.name} ${col.def};`)
          console.log(
            `✅ [SQLite Auto-Migrate] Bảng calc_master_registrations: Đã tự động bổ sung cột "${col.name}"`
          )
        } catch (colErr) {
          console.warn(`[SQLite Auto-Migrate] Không thể thêm cột ${col.name}:`, colErr?.message)
        }
      }
    }

    // 4. Bảng lưu kết quả tính toán KHSX & TKSX (calc_results)
    db.exec(`
      CREATE TABLE IF NOT EXISTS calc_results (
        id TEXT PRIMARY KEY,
        summary TEXT,
        plan_data TEXT,
        stat_data TEXT,
        machine_comparison_data TEXT,
        calculated_at TEXT
      );
    `)
    try {
      db.exec(`ALTER TABLE calc_results ADD COLUMN machine_comparison_data TEXT;`)
    } catch {}

    // 5. Bảng lưu trữ cục bộ các phiên bản đã tải/công bố (calc_versioned_bundles)
    db.exec(`
      CREATE TABLE IF NOT EXISTS calc_versioned_bundles (
        bundle_code TEXT PRIMARY KEY,
        reg_code TEXT,
        version TEXT,
        bundle_data TEXT,
        created_at TEXT
      );
    `)

    // 6. Các chỉ mục tối ưu truy vấn (Indices)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_master_reg_at ON calc_master_registrations(registered_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bundles_reg_code ON calc_versioned_bundles(reg_code);
      CREATE INDEX IF NOT EXISTS idx_arch_chunks_reg_type ON calc_architecture_chunks(reg_code, file_type);
      CREATE INDEX IF NOT EXISTS idx_arch_files_reg_type ON calc_architecture_files(reg_code, file_type);
    `)

    // 7. Dọn dẹp cache mồ côi (không có reg_code)
    try {
      db.exec(`
        DELETE FROM calc_architecture_files WHERE reg_code IS NULL OR reg_code = '';
        DELETE FROM calc_architecture_chunks WHERE reg_code IS NULL OR reg_code = '';
        DELETE FROM calc_results WHERE id IN ('latest_calculation', 'CURRENT_CALC') OR id IS NULL OR id = '';
      `)
    } catch {}

    console.log('✅ [SQLite Auto-Migrate] Kiểm tra cấu trúc CSDL hoàn tất. CSDL sẵn sàng.')
  } catch (err) {
    console.error('❌ [SQLite Auto-Migrate] Lỗi kiểm tra cấu trúc CSDL:', err)
  }
}
