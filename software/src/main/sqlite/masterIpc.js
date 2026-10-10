/**
 * SQLite IPC Handlers for Master Registrations
 * Quản lý các phiếu đăng ký báo cáo sản xuất (Master)
 */
import { ipcMain } from 'electron'
import { getDb } from './db.js'

export function setupMasterIpc() {
  // 1. Lưu đăng ký Master (hỗ trợ version, is_published, published_at)
  ipcMain.handle('sqlite:save-master-reg', async (_, payload) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
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

  // 5. Xóa đăng ký Master
  ipcMain.handle('sqlite:delete-master-reg', async (_, regCode) => {
    const db = getDb()
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
