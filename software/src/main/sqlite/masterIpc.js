/**
 * SQLite IPC Handlers for Master Registrations
 * Quản lý các phiếu đăng ký báo cáo sản xuất (Master)
 */
import { ipcMain } from 'electron'
import { getDb } from './db.js'
function ensureMasterColumns(db) {
  if (!db) return
  try {
    db.exec(`ALTER TABLE calc_master_registrations ADD COLUMN is_published INTEGER DEFAULT 0;`)
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
}

export function setupMasterIpc() {
  const dbInit = getDb()
  if (dbInit) ensureMasterColumns(dbInit)

  // 1. Lưu đăng ký Master (hỗ trợ version, is_published, published_at)
  ipcMain.handle('sqlite:save-master-reg', async (_, payload) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    ensureMasterColumns(db)
    try {
      const stmt = db.prepare(`
        INSERT INTO calc_master_registrations (
          reg_code, factory_name, apply_date, production_team, remark, status,
          stat_report_rows, unfinished_op_rows, summary_op_rows, mes_approval_rows, total_rows,
          file_summaries, registered_at, version, is_published, published_at, registered_by,
          raw_size_mb, compressed_size_mb, compression_ratio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(reg_code) DO UPDATE SET
          factory_name = excluded.factory_name,
          apply_date = excluded.apply_date,
          production_team = excluded.production_team,
          remark = excluded.remark,
          status = excluded.status,
          stat_report_rows = excluded.stat_report_rows,
          unfinished_op_rows = excluded.unfinished_op_rows,
          summary_op_rows = excluded.summary_op_rows,
          mes_approval_rows = excluded.mes_approval_rows,
          total_rows = excluded.total_rows,
          file_summaries = excluded.file_summaries,
          registered_at = excluded.registered_at,
          version = excluded.version,
          is_published = excluded.is_published,
          published_at = excluded.published_at,
          registered_by = excluded.registered_by,
          raw_size_mb = excluded.raw_size_mb,
          compressed_size_mb = excluded.compressed_size_mb,
          compression_ratio = excluded.compression_ratio
      `)

      const status = payload.status || 'DRAFT'
      const version = payload.version || '1.0'
      const isPublished = payload.isPublished ? 1 : 0
      const publishedAt = payload.publishedAt || (isPublished ? new Date().toISOString() : null)
      const registeredBy = payload.registeredBy || payload.createdBy || ''
      const rawSizeMB = payload.rawSizeMB || payload.raw_size_mb || 0
      const compressedSizeMB = payload.compressedSizeMB || payload.compressed_size_mb || 0
      const compressionRatio = payload.compressionRatio || payload.compression_ratio || ''

      stmt.run(
        payload.regCode,
        payload.factoryName || 'GS1 Hà Nội',
        payload.applyDate || '',
        payload.productionTeam || 'Tất cả các tổ',
        payload.remark || '',
        status,
        payload.statReportRows || 0,
        payload.unfinishedOpRows || 0,
        payload.summaryOpRows || 0,
        payload.mesApprovalRows || 0,
        payload.totalRows || 0,
        typeof payload.fileSummaries === 'string'
          ? payload.fileSummaries
          : JSON.stringify(payload.fileSummaries || {}),
        payload.registeredAt || new Date().toISOString(),
        version,
        isPublished,
        publishedAt,
        registeredBy,
        rawSizeMB,
        compressedSizeMB,
        compressionRatio
      )
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu master reg:', err)
      return { success: false, error: err.message }
    }
  })

  // 2. Công bố báo cáo (Publish Version)
  ipcMain.handle('sqlite:publish-master-reg', async (_, payload) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    ensureMasterColumns(db)
    try {
      const regCode = typeof payload === 'string' ? payload : payload?.regCode
      const version = payload?.version || '1.0'
      const publishedAt = new Date().toISOString()

      const stmt = db.prepare(`
        UPDATE calc_master_registrations
        SET status = 'PUBLISHED',
            version = ?,
            is_published = 1,
            published_at = ?
        WHERE reg_code = ?
      `)
      stmt.run(version, publishedAt, regCode)
      return { success: true, version, publishedAt, status: 'PUBLISHED' }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi công bố báo cáo:', err)
      return { success: false, error: err.message }
    }
  })

  // 3. Lấy tất cả đăng ký Master
  ipcMain.handle('sqlite:get-all-master-regs', async () => {
    const db = getDb()
    if (!db) return []
    try {
      const stmt = db.prepare('SELECT * FROM calc_master_registrations ORDER BY registered_at DESC')
      const rows = stmt.all()
      return rows.map((r) => ({
        regCode: r.reg_code,
        factoryName: r.factory_name,
        applyDate: r.apply_date,
        productionTeam: r.production_team || 'Tất cả các tổ',
        remark: r.remark,
        status: r.status || 'DRAFT',
        version: r.version || '1.0',
        isPublished: Boolean(r.is_published),
        publishedAt: r.published_at,
        statReportRows: r.stat_report_rows,
        unfinishedOpRows: r.unfinished_op_rows,
        summaryOpRows: r.summary_op_rows,
        mesApprovalRows: r.mes_approval_rows,
        totalRows: r.total_rows,
        rawSizeMB: r.raw_size_mb || 0,
        compressedSizeMB: r.compressed_size_mb || 0,
        compressionRatio: r.compression_ratio || '',
        fileSummaries: JSON.parse(r.file_summaries || '{}'),
        registeredAt: r.registered_at,
        registeredBy: r.registered_by || 'Admin'
      }))
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy danh sách master reg:', err)
      return []
    }
  })

  // 4. Lấy 1 đăng ký Master theo regCode
  ipcMain.handle('sqlite:get-master-reg', async (_, regCode) => {
    const db = getDb()
    if (!db || !regCode) return null
    try {
      const stmt = db.prepare('SELECT * FROM calc_master_registrations WHERE reg_code = ?')
      const r = stmt.get(regCode)
      if (!r) return null
      return {
        regCode: r.reg_code,
        factoryName: r.factory_name,
        applyDate: r.apply_date,
        productionTeam: r.production_team || 'Tất cả các tổ',
        remark: r.remark,
        status: r.status || 'DRAFT',
        version: r.version || '1.0',
        isPublished: Boolean(r.is_published),
        publishedAt: r.published_at,
        statReportRows: r.stat_report_rows,
        unfinishedOpRows: r.unfinished_op_rows,
        summaryOpRows: r.summary_op_rows,
        mesApprovalRows: r.mes_approval_rows,
        totalRows: r.total_rows,
        rawSizeMB: r.raw_size_mb || 0,
        compressedSizeMB: r.compressed_size_mb || 0,
        compressionRatio: r.compression_ratio || '',
        fileSummaries: JSON.parse(r.file_summaries || '{}'),
        registeredAt: r.registered_at,
        registeredBy: r.registered_by || 'Admin'
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy master reg:', err)
      return null
    }
  })

  // 5. Xóa đăng ký Master (xóa sạch toàn bộ files, chunks, kết quả tính toán và bundle liên quan)
  ipcMain.handle('sqlite:delete-master-reg', async (_, regCode) => {
    const db = getDb()
    if (!db || !regCode) return { success: false }
    try {
      db.prepare('DELETE FROM calc_master_registrations WHERE reg_code = ?').run(regCode)
      db.prepare('DELETE FROM calc_architecture_files WHERE reg_code = ?').run(regCode)
      db.prepare('DELETE FROM calc_architecture_chunks WHERE reg_code = ?').run(regCode)
      db.prepare('DELETE FROM calc_results WHERE id = ?').run(regCode)
      db.prepare('DELETE FROM calc_versioned_bundles WHERE reg_code = ?').run(regCode)
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa master reg:', err)
      return { success: false, error: err.message }
    }
  })

  // 6. Cập nhật trạng thái Master (ví dụ: chuyển sang CANCELLED)
  ipcMain.handle('sqlite:update-master-status', async (_, payload) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      const regCode = typeof payload === 'string' ? payload : payload?.regCode
      const status = payload?.status || 'CANCELLED'
      const remark = payload?.remark
      if (!regCode) return { success: false, error: 'Thiếu regCode' }

      if (remark !== undefined && remark !== null) {
        db.prepare(
          'UPDATE calc_master_registrations SET status = ?, remark = ? WHERE reg_code = ?'
        ).run(status, remark, regCode)
      } else {
        db.prepare('UPDATE calc_master_registrations SET status = ? WHERE reg_code = ?').run(
          status,
          regCode
        )
      }
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi cập nhật trạng thái master reg:', err)
      return { success: false, error: err.message }
    }
  })

  // 6. Lưu danh mục máy móc theo nhà máy (xóa danh mục máy cũ để chỉ lưu nhà máy đang chọn)
  ipcMain.handle('sqlite:save-factory-machines', async (_, payload) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_factory_machines (
          factory_key TEXT PRIMARY KEY,
          machines TEXT,
          updated_at TEXT
        );
      `)
      const { factoryKey, machines } = payload || {}
      if (factoryKey && Array.isArray(machines) && machines.length > 0) {
        db.prepare(`
          INSERT INTO calc_factory_machines (factory_key, machines, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(factory_key) DO UPDATE SET
            machines = excluded.machines,
            updated_at = excluded.updated_at
        `).run(factoryKey, JSON.stringify(machines), new Date().toISOString())
      }
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu danh mục máy móc theo nhà máy:', err)
      return { success: false, error: err?.message }
    }
  })

  // 7. Lấy danh mục máy móc theo nhà máy
  ipcMain.handle('sqlite:get-factory-machines', async (_, factoryKey) => {
    const db = getDb()
    if (!db) return []
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS calc_factory_machines (
          factory_key TEXT PRIMARY KEY,
          machines TEXT,
          updated_at TEXT
        );
      `)
      let row = null
      if (factoryKey) {
        row = db
          .prepare('SELECT machines FROM calc_factory_machines WHERE factory_key = ?')
          .get(factoryKey)
      } else {
        row = db.prepare('SELECT machines FROM calc_factory_machines LIMIT 1').get()
      }
      if (row && row.machines) {
        try {
          return JSON.parse(row.machines)
        } catch {
          return []
        }
      }
      return []
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy danh mục máy móc theo nhà máy:', err)
      return []
    }
  })

  // 8. Xóa toàn bộ danh mục máy móc trong SQLite
  ipcMain.handle('sqlite:clear-factory-machines', async () => {
    const db = getDb()
    if (!db) return { success: false }
    try {
      db.exec('DELETE FROM calc_factory_machines;')
      return { success: true }
    } catch {
      return { success: false }
    }
  })
}
