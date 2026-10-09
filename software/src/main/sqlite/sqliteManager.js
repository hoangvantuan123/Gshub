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
  } catch (error) {
    console.error('❌ [SQLite] Lỗi khởi tạo cơ sở dữ liệu SQLite:', error)
  }
}

/**
 * Hàm tiện ích lấy toàn bộ dữ liệu của 1 fileType từ SQLite (ghép các Chunks lại)
 */
function getFullDataForFileType(fileType) {
  if (!db || !fileType) return []
  try {
    const chunkStmt = db.prepare(
      'SELECT chunk_index, data FROM calc_architecture_chunks WHERE file_type = ? ORDER BY chunk_index ASC'
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
    const fileRow = db.prepare('SELECT data FROM calc_architecture_files WHERE file_type = ?').get(fileType)
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
 * Cấu hình IPC Handlers cho Renderer Process giao tiếp với SQLite
 */
export function setupSqliteIpc() {
  initSqliteDatabase()

  // Lưu từng khúc (Chunk) của 1 file kiến trúc (Batch Insert siêu tốc)
  ipcMain.handle('sqlite:save-calc-file-chunk', async (_, payload) => {
    if (!db) {
      return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    }
    try {
      const {
        fileType,
        fileName,
        fileSize,
        rowCount,
        columns,
        chunk,
        chunkIndex,
        totalChunks,
        isFirstChunk,
        isLastChunk,
        uploadedAt
      } = payload

      const tx = db.transaction(() => {
        if (isFirstChunk) {
          const metaStmt = db.prepare(`
            INSERT INTO calc_architecture_files (file_type, file_name, file_size, row_count, columns, data, uploaded_at)
            VALUES (?, ?, ?, ?, ?, '', ?)
            ON CONFLICT(file_type) DO UPDATE SET
              file_name = excluded.file_name,
              file_size = excluded.file_size,
              row_count = excluded.row_count,
              columns = excluded.columns,
              data = '',
              uploaded_at = excluded.uploaded_at
          `)
          metaStmt.run(
            fileType,
            fileName || '',
            fileSize || 0,
            rowCount || 0,
            typeof columns === 'string' ? columns : JSON.stringify(columns || []),
            uploadedAt || new Date().toISOString()
          )

          db.prepare('DELETE FROM calc_architecture_chunks WHERE file_type = ?').run(fileType)
        }

        if (chunk && chunk.length > 0) {
          const chunkStmt = db.prepare(`
            INSERT OR REPLACE INTO calc_architecture_chunks (file_type, chunk_index, row_count, data)
            VALUES (?, ?, ?, ?)
          `)
          chunkStmt.run(
            fileType,
            chunkIndex,
            chunk.length,
            typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
          )
        }
      })

      tx()
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu file chunk:', err)
      return { success: false, error: err.message }
    }
  })

  // Lưu 1 file kiến trúc (nguyên khối fallback)
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
        typeof payload.columns === 'string'
          ? payload.columns
          : JSON.stringify(payload.columns || []),
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

  // Lấy chi tiết 1 file (bao gồm data được ghép từ chunks) khi thực sự cần hiển thị Tab đó
  ipcMain.handle('sqlite:get-calc-file', async (_, fileType) => {
    if (!db) return null
    try {
      const stmt = db.prepare('SELECT * FROM calc_architecture_files WHERE file_type = ?')
      const row = stmt.get(fileType)
      if (!row) return null
      const fullData = getFullDataForFileType(fileType)
      return {
        fileType: row.file_type,
        fileName: row.file_name,
        fileSize: row.file_size,
        rowCount: row.row_count || fullData.length,
        columns: JSON.parse(row.columns || '[]'),
        data: fullData,
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
      return rows.map((row) => {
        const fullData = getFullDataForFileType(row.file_type)
        return {
          fileType: row.file_type,
          fileName: row.file_name,
          fileSize: row.file_size,
          rowCount: row.row_count || fullData.length,
          columns: JSON.parse(row.columns || '[]'),
          data: fullData,
          uploadedAt: row.uploaded_at
        }
      })
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy toàn bộ files:', err)
      return []
    }
  })

  // Xóa 1 file hoặc xóa toàn bộ (kèm xóa chunks)
  ipcMain.handle('sqlite:delete-calc-file', async (_, fileType) => {
    if (!db) return { success: false }
    try {
      if (fileType) {
        db.prepare('DELETE FROM calc_architecture_files WHERE file_type = ?').run(fileType)
        db.prepare('DELETE FROM calc_architecture_chunks WHERE file_type = ?').run(fileType)
      } else {
        db.exec('DELETE FROM calc_architecture_files; DELETE FROM calc_architecture_chunks;')
      }
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa file:', err)
      return { success: false, error: err.message }
    }
  })

  // Tính toán trực tiếp KHSX & TKSX từ CSDL SQLite
  ipcMain.handle('sqlite:calculate-production', async () => {
    if (!db) {
      return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    }
    try {
      const stmt = db.prepare('SELECT file_type FROM calc_architecture_files')
      const rows = stmt.all()
      const files = {}
      for (const r of rows) {
        if (r.file_type) {
          files[r.file_type] = {
            data: getFullDataForFileType(r.file_type)
          }
        }
      }

      const statReportData = files.stat_report?.data || []
      const summaryOpData = files.summary_op?.data || []
      const unfinishedOpData = files.unfinished_op?.data || []
      const mesApprovalData = files.mes_approval?.data || []

      // Tạo từ điển tra cứu KHSX Lệnh thao tác
      const opOrderPlanMap = new Map()
      const normalize = (v) => (v ? String(v).trim().toUpperCase() : '')

      const extractTicketCode = (row) => {
        if (!row || typeof row !== 'object') return ''
        const direct = [
          row.BravoStatCode,
          row.BravoStatSlipNo,
          row['Mã lệnh thống kê Bravo'],
          row['Mã lệnh thống kê bravo'],
          row['Mã lệnh thống kê'],
          row['Mã thống kê Bravo'],
          row['Mã thống kê bravo'],
          row['Mã lệnh TK Bravo'],
          row['Mã TK Bravo'],
          row.StatSlipNo,
          row.ApprovalSlipNo,
          row.TicketNo,
          row.StatTicketNo,
          row.SlipNo,
          row.StatCode,
          row.RegCode,
          row['Phiếu TK'],
          row['Phiếu tk'],
          row['phiếu tk'],
          row['Phiếu Tk'],
          row['Mã TK'],
          row['Mã tk'],
          row['mã tk'],
          row['Mã Thống kê'],
          row['Mã Thống Kê'],
          row['Mã thống kê'],
          row['mã thống kê'],
          row['Số phiếu thống kê'],
          row['Số phiếu TK'],
          row['Số phiếu tk'],
          row['Số phiếu'],
          row['Số thống kê'],
          row['Số TK'],
          row['Số tk'],
          row['Mã phiếu'],
          row['Mã phiếu TK'],
          row['Mã phiếu tk'],
          row['Mã phiếu thống kê'],
          row['Số phiếu duyệt'],
          row['Mã phiếu duyệt'],
          row['Phiếu thống kê'],
          row['Phiếu duyệt'],
          row['Số TK']
        ]
        for (const c of direct) {
          if (c !== undefined && c !== null && String(c).trim() !== '') return normalize(c)
        }
        for (const [k, v] of Object.entries(row)) {
          if (v === undefined || v === null || String(v).trim() === '') continue
          const cleanKey = k.toLowerCase().replace(/[_\s\-\r\n]+/g, '')
          if (
            cleanKey.includes('statslipno') ||
            cleanKey.includes('approvalslipno') ||
            cleanKey.includes('mathongke') ||
            cleanKey.includes('sothongke') ||
            cleanKey.includes('sophieuthongke') ||
            cleanKey.includes('sophieutk') ||
            cleanKey.includes('sophieuduyet') ||
            cleanKey.includes('maphieutk') ||
            cleanKey.includes('maphieu') ||
            cleanKey.includes('matk') ||
            cleanKey.includes('sotk') ||
            (cleanKey.includes('sophieu') &&
              !cleanKey.includes('xuat') &&
              !cleanKey.includes('nhap'))
          ) {
            return normalize(v)
          }
        }
        return ''
      }

      const extractApprovedTime = (row) => {
        if (!row || typeof row !== 'object') return ''
        const direct = [
          row.ApprovedTime,
          row.ApprovalTime,
          row.MesApprovedTime,
          row.ApprovedDate,
          row.ApprovalDate,
          row.ApproveTime,
          row.TimeApproved,
          row['Thời gian duyệt'],
          row['Thời gian duyệt ở MES'],
          row['Thời gian duyệt phiếu ở MES'],
          row['Thời gian duyệt phiếu'],
          row['Thời gian phê duyệt'],
          row['Thời gian duyệt MES'],
          row['Ngày duyệt'],
          row['Ngày phê duyệt'],
          row['Ngày duyệt phiếu'],
          row['Ngày duyệt ở MES'],
          row['Giờ duyệt'],
          row['TG duyệt']
        ]
        for (const c of direct) {
          if (c !== undefined && c !== null && String(c).trim() !== '') return String(c).trim()
        }
        for (const [k, v] of Object.entries(row)) {
          if (v === undefined || v === null || String(v).trim() === '') continue
          const cleanKey = k.toLowerCase().replace(/[_\s\-\r\n]+/g, '')
          if (
            cleanKey.includes('approvedtime') ||
            cleanKey.includes('approvaltime') ||
            cleanKey.includes('mesapprovedtime') ||
            cleanKey.includes('thoigianduyet') ||
            cleanKey.includes('ngayduyet') ||
            cleanKey.includes('thoigianpheduyet') ||
            cleanKey.includes('ngaypheduyet') ||
            cleanKey.includes('tgduyet') ||
            cleanKey.includes('gioduyet') ||
            (cleanKey.includes('duyet') &&
              (cleanKey.includes('time') ||
                cleanKey.includes('date') ||
                cleanKey.includes('thoigian') ||
                cleanKey.includes('ngay')))
          ) {
            return String(v).trim()
          }
        }
        return ''
      }

      const getLookupKeys = (code) => {
        if (!code) return []
        const norm = normalize(code)
        const clean = norm.replace(/[^A-Z0-9]/g, '')
        const keys = new Set([norm])
        if (clean) {
          keys.add(clean)
          const noLeadingZero = clean.replace(/^0+/, '')
          if (noLeadingZero) keys.add(noLeadingZero)
        }
        return Array.from(keys)
      }

      summaryOpData.forEach((row) => {
        const code = normalize(
          row.OperationOrderNo ?? row['Lệnh thao tác'] ?? row['Số lệnh thao tác'] ?? ''
        )
        if (code) {
          const keys = getLookupKeys(code)
          keys.forEach((k) => opOrderPlanMap.set(k, 'KHSX'))
        }
      })

      unfinishedOpData.forEach((row) => {
        const code = normalize(
          row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
        )
        if (code) {
          const keys = getLookupKeys(code)
          keys.forEach((k) => {
            if (!opOrderPlanMap.has(k)) opOrderPlanMap.set(k, 'KHSX')
          })
        }
      })

      // Tạo từ điển tra cứu MES
      const mesApprovalMap = new Map()
      mesApprovalData.forEach((row) => {
        const approvedTime = extractApprovedTime(row)
        if (!approvedTime) return

        // 1. Khóa chính: Mã lệnh thống kê Bravo (VD: TK2609-453717, TK2609-031222)
        const bravoCode =
          row.BravoStatCode ??
          row.BravoStatSlipNo ??
          row['Mã lệnh thống kê Bravo'] ??
          row['Mã lệnh thống kê bravo'] ??
          row['Mã lệnh thống kê'] ??
          row['Lệnh thống kê Bravo'] ??
          row['lệnh thống kê Bravo'] ??
          row['Lệnh thống kê'] ??
          row['lệnh thống kê'] ??
          row['Mã thống kê Bravo'] ??
          row['Mã thống kê'] ??
          ''
        if (bravoCode) {
          const keys = getLookupKeys(bravoCode)
          keys.forEach((k) => mesApprovalMap.set(k, approvedTime))
        }

        // 2. Khóa phụ: Mã phiếu duyệt MES (VD: SLIP-TH-GS1-260929-049)
        const slipNo =
          row.SlipNo ??
          row.ApprovalSlipNo ??
          row['Mã phiếu'] ??
          row['Số phiếu duyệt'] ??
          extractTicketCode(row)
        if (slipNo) {
          const keys = getLookupKeys(slipNo)
          keys.forEach((k) => mesApprovalMap.set(k, approvedTime))
        }

        // 3. Khóa dự phòng: Mã lệnh thao tác (VD: CD03-0926-0364(234))
        const opOrderNo = normalize(row.OperationOrderNo ?? row['Mã lệnh thao tác'] ?? '')
        if (opOrderNo) {
          const keys = getLookupKeys(opOrderNo)
          keys.forEach((k) => {
            if (!mesApprovalMap.has(k)) mesApprovalMap.set(k, approvedTime)
          })
        }
      })

      // Đếm phiếu trùng
      const slipCountMap = new Map()
      statReportData.forEach((row) => {
        const slipNo = extractTicketCode(row)
        if (slipNo) {
          slipCountMap.set(slipNo, (slipCountMap.get(slipNo) || 0) + 1)
        }
      })

      // Tính toán 98 cột chuẩn TKSX
      let totalProducedQty = 0
      let totalQualifiedQty = 0
      let totalDefectQty = 0
      let totalDowntimeMinutes = 0
      let totalSyncDelaySec = 0
      let syncCount = 0
      let insidePlanCount = 0
      let outsidePlanCount = 0
      let mesUserCount = 0
      let bravoUserCount = 0
      let duplicateSlipCount = 0

      const statByMachine = {}
      const statByTeam = {}
      const statByTechnician = {}

      const calculatedRows = statReportData.map((row) => {
        const rowObj = { ...row }
        const produced =
          parseFloat(
            String(
              row.ProducedQty ?? row['Số lượng sản xuất'] ?? row['Số lượng thực hiện'] ?? 0
            ).replace(/,/g, '')
          ) || 0
        const qualified =
          parseFloat(String(row.QualifiedQty ?? row['Số lượng đạt'] ?? 0).replace(/,/g, '')) || 0
        const defect =
          parseFloat(String(row.DefectQty ?? row['Số lượng lỗi'] ?? 0).replace(/,/g, '')) || 0
        const downtime =
          parseFloat(
            String(
              row.TotalDowntimeMinutes ??
                row['Tổng tg hao phí\r\n(5)=1+2+3+4'] ??
                row['Tổng tg hao phí\n(5)=1+2+3+4'] ??
                row['Tổng tg hao phí (5)=1+2+3+4'] ??
                row['Tổng tg hao phí'] ??
                0
            ).replace(/,/g, '')
          ) || 0

        // Parse giờ phút
        const startVal = row.StartTime ?? row['Bắt đầu'] ?? row['Thời gian bắt đầu'] ?? ''
        const endVal = row.EndTime ?? row['Kết thúc'] ?? row['Thời gian kết thúc'] ?? ''

        const parseMinutes = (val) => {
          if (val === undefined || val === null || val === '') return null
          if (typeof val === 'number') {
            if (val >= 0 && val <= 1) return val * 1440
            if (val > 1) return (val - Math.floor(val)) * 1440
            return val
          }
          const str = String(val).trim()
          if (!str) return null
          if (/^\d+(\.\d+)?$/.test(str)) {
            const num = parseFloat(str)
            if (!isNaN(num)) {
              if (num >= 0 && num <= 1) return num * 1440
              if (num > 1) return (num - Math.floor(num)) * 1440
            }
          }
          const m = str.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/)
          if (m) {
            const h = parseInt(m[1], 10)
            const mi = parseInt(m[2], 10)
            const s = m[3] ? parseInt(m[3], 10) : 0
            return h * 60 + mi + s / 60
          }
          return null
        }

        const sMin = parseMinutes(startVal)
        const eMin = parseMinutes(endVal)
        let actualRunTime = ''
        if (sMin !== null && eMin !== null) {
          let diffMin = eMin - sMin
          if (diffMin < 0) diffMin += 1440
          const rawRunTime = diffMin - downtime
          actualRunTime = Math.max(0, Number(rawRunTime.toFixed(2)))
        } else if (row.ActualRunTime !== undefined && row.ActualRunTime !== '') {
          actualRunTime = parseFloat(String(row.ActualRunTime).replace(/,/g, '')) || 0
        }

        // Col 92: capa
        let actualCapa = ''
        if (typeof actualRunTime === 'number') {
          actualCapa = actualRunTime > 0 ? Number(((produced * 60) / actualRunTime).toFixed(2)) : 0
        } else if (row.ActualCapa !== undefined && row.ActualCapa !== '') {
          actualCapa = parseFloat(String(row.ActualCapa).replace(/,/g, '')) || 0
        }

        // Col 93: check khsx
        const opOrderNo = normalize(
          row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
        )
        let checkKhsx = 'Khác KHSX'
        if (opOrderNo) {
          const keys = getLookupKeys(opOrderNo)
          const isPlan = keys.some((k) => opOrderPlanMap.has(k))
          if (isPlan) {
            checkKhsx = 'KHSX'
            insidePlanCount++
          } else {
            outsidePlanCount++
          }
        } else {
          outsidePlanCount++
        }

        // Col 94: thời gian duyệt MES
        const statSlipNo = extractTicketCode(row)
        let mesApprovedTime = ''
        if (statSlipNo) {
          const keys = getLookupKeys(statSlipNo)
          for (const k of keys) {
            if (mesApprovalMap.has(k)) {
              mesApprovedTime = mesApprovalMap.get(k)
              break
            }
          }
        }
        if (!mesApprovedTime) {
          mesApprovedTime =
            extractApprovedTime(row) ||
            row.MesApprovedTime ||
            row['Thời gian duyệt phiếu ở MES'] ||
            row['Thời gian duyệt ở MES'] ||
            row['Thời gian duyệt'] ||
            ''
        }

        // Col 95: Độ trễ đồng bộ 2 hệ thống (=+IF(OR(CL3="",CP3=""),"",TEXT(ABS(CP3-CL3),"hh:mm:ss")))
        const slipCreatedDate = String(row.SlipCreatedDate ?? row['Ngày tạo phiếu'] ?? '').trim()
        let syncLatencySeconds = ''
        if (slipCreatedDate && mesApprovedTime) {
          const parseTs = (dtStr) => {
            const m = dtStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i)
            if (m) {
              const day = parseInt(m[1], 10)
              const month = parseInt(m[2], 10)
              let year = parseInt(m[3], 10)
              if (year < 100) year += 2000
              let hours = m[4] ? parseInt(m[4], 10) : 0
              const mins = m[5] ? parseInt(m[5], 10) : 0
              const secs = m[6] ? parseInt(m[6], 10) : 0
              const ampm = m[7] ? m[7].toUpperCase() : ''
              if (ampm === 'PM' && hours < 12) hours += 12
              if (ampm === 'AM' && hours === 12) hours = 0
              return new Date(year, month - 1, day, hours, mins, secs).getTime()
            }
            return null
          }
          const cTs = parseTs(slipCreatedDate)
          const aTs = parseTs(mesApprovedTime)
          if (cTs && aTs) {
            const diffSec = Math.abs(Math.round((aTs - cTs) / 1000))
            const pad = (n) => String(n).padStart(2, '0')
            const h = Math.floor(diffSec / 3600)
            const mi = Math.floor((diffSec % 3600) / 60)
            const s = diffSec % 60
            syncLatencySeconds = `${pad(h)}:${pad(mi)}:${pad(s)}`
            totalSyncDelaySec += diffSec
            syncCount++
          }
        }

        // Col 96: phiếu trùng
        let isDuplicateSlip = 0
        if (statSlipNo && (slipCountMap.get(statSlipNo) || 0) > 1) {
          isDuplicateSlip = 1
          duplicateSlipCount++
        }

        // Col 97: vị trí tạo phiếu tk
        const statEmp = String(row.StatEmployee ?? row['Nhân viên thống kê'] ?? '').trim()
        let createdLocation = statEmp.toUpperCase().includes('MES') ? 'MES' : 'Bravo'
        if (createdLocation === 'MES') mesUserCount++
        else bravoUserCount++

        // Col 98: Sinh phiếu xuất/nhập tự động (=IF(AND(CF3=0,CG3=0),"Không sử dụng NVL",IF(CF3=0,"",IF(CH3="","Không có XKTĐ","Có XKTĐ"))&IF(AND(CF3<>0,CG3<>0),", ","")&IF(CG3=0,"",IF(CI3="","Không NKTĐ","Có NKTĐ"))))
        const autoExport = parseInt(row.IsAutoExport ?? row.AutoExport ?? row['Xuất tự động'] ?? 0, 10) || 0
        const autoImport = parseInt(row.IsAutoImport ?? row.AutoImport ?? row['Nhập tự động'] ?? 0, 10) || 0
        const exportSlipNo = String(
          row.ExportSlipNo ??
            row['Số phiếu xuất'] ??
            row['Phiếu xuất'] ??
            row.ExportDocNo ??
            row.StatSlipNo_87 ??
            ''
        ).trim()
        const importSlipNo = String(
          row.ImportSlipNo ??
            row['Số phiếu nhập'] ??
            row['Phiếu nhập'] ??
            row.ImportDocNo ??
            row.StatSlipNo_88 ??
            ''
        ).trim()

        let autoExportImportGenerated = 'Không sử dụng NVL'
        if (autoExport === 0 && autoImport === 0) {
          autoExportImportGenerated = 'Không sử dụng NVL'
        } else {
          const parts = []
          if (autoExport !== 0) parts.push(exportSlipNo ? 'Có XKTĐ' : 'Không có XKTĐ')
          if (autoImport !== 0) parts.push(importSlipNo ? 'Có NKTĐ' : 'Không NKTĐ')
          autoExportImportGenerated = parts.join(', ') || 'Không sử dụng NVL'
        }

        rowObj.ActualRunTime = actualRunTime
        rowObj['Thời gian chạy thực tế'] = actualRunTime
        rowObj.ActualCapa = actualCapa
        rowObj['capa thực tế'] = actualCapa
        rowObj.CheckKhsx = checkKhsx
        rowObj['CHECK KHSX'] = checkKhsx
        rowObj['Cột 93'] = checkKhsx
        rowObj.MesApprovedTime = mesApprovedTime
        rowObj['Thời gian duyệt phiếu ở MES'] = mesApprovedTime
        rowObj['Thời gian duyệt ở MES'] = mesApprovedTime
        rowObj['Thời gian duyệt'] = mesApprovedTime
        rowObj.SyncLatencySeconds = syncLatencySeconds
        rowObj['Độ trễ thời gian đồng bộ 2 hệ thống'] = syncLatencySeconds
        rowObj.IsDuplicateSlip = isDuplicateSlip
        rowObj['Phiếu sinh trùng'] = isDuplicateSlip
        rowObj.CreatedLocation = createdLocation
        rowObj['Vị trí tạo phiếu tk'] = createdLocation
        rowObj.AutoExportImportGenerated = autoExportImportGenerated
        rowObj['Sinh phiếu xuất/nhập tự động'] = autoExportImportGenerated

        totalProducedQty += produced
        totalQualifiedQty += qualified
        totalDefectQty += defect
        totalDowntimeMinutes += downtime

        const machine = String(
          row.MachineName ?? row['Tên máy sản xuất'] ?? row.MachineCode ?? row['Mã máy sản xuất'] ?? 'Khác'
        ).trim()
        const team = String(row.ProductionTeam ?? row['Tổ sản xuất'] ?? 'Khác').trim()
        const leadTech = String(
          row.LeadTechnicianName ?? row['Thợ chính'] ?? row['Họ tên thợ chính'] ?? 'Khác'
        ).trim()

        if (!statByMachine[machine]) {
          statByMachine[machine] = { machine, producedQty: 0, qualifiedQty: 0, defectQty: 0, ticketCount: 0 }
        }
        statByMachine[machine].producedQty += produced
        statByMachine[machine].qualifiedQty += qualified
        statByMachine[machine].defectQty += defect
        statByMachine[machine].ticketCount += 1

        if (!statByTeam[team]) {
          statByTeam[team] = { team, producedQty: 0, qualifiedQty: 0, defectQty: 0 }
        }
        statByTeam[team].producedQty += produced
        statByTeam[team].qualifiedQty += qualified
        statByTeam[team].defectQty += defect

        if (leadTech && leadTech !== 'Khác') {
          if (!statByTechnician[leadTech]) {
            statByTechnician[leadTech] = { technician: leadTech, producedQty: 0, qualifiedQty: 0, defectQty: 0 }
          }
          statByTechnician[leadTech].producedQty += produced
          statByTechnician[leadTech].qualifiedQty += qualified
          statByTechnician[leadTech].defectQty += defect
        }

        if (!rowObj.IdSeq) {
          rowObj.IdSeq = `TKSX-${Date.now()}-${i + 1}`
        }
        if (rowObj.RowVersion === undefined) {
          rowObj.RowVersion = 1
        }
        if (!rowObj.CreatedAt) {
          rowObj.CreatedAt = new Date().toISOString()
        }
        if (!rowObj.WorkingTag && !rowObj.Status) {
          rowObj.WorkingTag = 'A'
        }

        return rowObj
      })

      // Đối soát MES
      let mesApprovedProducedQty = 0
      let mesApprovedQualifiedQty = 0
      let mesApprovedDefectQty = 0
      mesApprovalData.forEach((row) => {
        mesApprovedProducedQty += parseFloat(String(row['SL sản xuất'] ?? row.ProducedQty ?? 0).replace(/,/g, '')) || 0
        mesApprovedQualifiedQty += parseFloat(String(row['SL đạt'] ?? row.QualifiedQty ?? 0).replace(/,/g, '')) || 0
        mesApprovedDefectQty += parseFloat(String(row['SL lỗi'] ?? row.DefectQty ?? 0).replace(/,/g, '')) || 0
      })

      const defectRate = totalProducedQty > 0 ? Number(((totalDefectQty / totalProducedQty) * 100).toFixed(2)) : 0
      const avgSyncDelay = syncCount > 0 ? Number((totalSyncDelaySec / syncCount).toFixed(1)) : 0

      const statFile = db.prepare('SELECT columns FROM calc_architecture_files WHERE file_type = ?').get('stat_report')
      let statCols = []
      try {
        statCols = statFile?.columns ? JSON.parse(statFile.columns) : []
      } catch {}

      const statResult = {
        totalProducedQty,
        totalQualifiedQty,
        totalDefectQty,
        defectRate,
        totalTickets: statReportData.length,
        totalDowntimeMinutes,
        avgSyncDelaySeconds: avgSyncDelay,
        insidePlanCount,
        outsidePlanCount,
        mesUserCount,
        bravoUserCount,
        duplicateSlipCount,
        mesApproval: {
          totalApprovedTickets: mesApprovalData.length,
          approvedProducedQty: mesApprovedProducedQty,
          approvedQualifiedQty: mesApprovedQualifiedQty,
          approvedDefectQty: mesApprovedDefectQty,
          discrepancyProducedQty: totalProducedQty - mesApprovedProducedQty,
          discrepancyQualifiedQty: totalQualifiedQty - mesApprovedQualifiedQty
        },
        machineBreakdown: Object.values(statByMachine).sort((a, b) => b.producedQty - a.producedQty),
        teamBreakdown: Object.values(statByTeam).sort((a, b) => b.producedQty - a.producedQty),
        technicianBreakdown: Object.values(statByTechnician).sort((a, b) => b.producedQty - a.producedQty),
        columns: statCols,
        calculatedRows
      }

      // 1. Tổng hợp thực tế sản xuất theo lệnh
      const actualByOp = new Map()
      statReportData.forEach((row) => {
        const op = normalize(row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? '')
        if (!op) return
        const p = parseFloat(String(row.ProducedQty ?? row['Số lượng sản xuất'] ?? 0).replace(/,/g, '')) || 0
        const q = parseFloat(String(row.QualifiedQty ?? row['Số lượng đạt'] ?? 0).replace(/,/g, '')) || 0
        const d = parseFloat(String(row.DefectQty ?? row['Số lượng lỗi'] ?? 0).replace(/,/g, '')) || 0
        const rt = parseFloat(String(row.ActualRunTime ?? row['Thời gian chạy thực tế'] ?? 0).replace(/,/g, '')) || 0
        if (!actualByOp.has(op)) {
          actualByOp.set(op, { p: 0, q: 0, d: 0, rt: 0 })
        }
        const cur = actualByOp.get(op)
        cur.p += p
        cur.q += q
        cur.d += d
        cur.rt += rt
      })

      const planCalculatedRows = summaryOpData.map((row, idx) => {
        const op = normalize(row.OperationOrderNo ?? row['Lệnh thao tác'] ?? row['Số lệnh thao tác'] ?? `KHSX-${idx + 1}`)
        const matCode = String(row.MaterialCode ?? row['Mã vật tư'] ?? row['Mã hàng'] ?? '').trim()
        const matName = String(row.MaterialName ?? row['Tên vật tư'] ?? row['Tên hàng'] ?? '').trim()
        const machine = String(row.MachineName ?? row['Tên máy'] ?? row.MachineCode ?? 'Chưa gán').trim()
        const rawPlanned = parseFloat(String(row['Số lượng \ncần sx \n(1)'] ?? row['Số lượng cần sản xuất'] ?? row.PlannedQty ?? 0).replace(/,/g, '')) || 0
        const rawTarget = parseFloat(String(row['Số lượng \ncần đạt \n(2)'] ?? row['Số lượng cần đạt'] ?? row.TargetQty ?? 0).replace(/,/g, '')) || 0
        const rawDuration = parseFloat(String(row['Tổng thời gian kế hoạch (7)'] ?? row.PlannedHours ?? 0).replace(/,/g, '')) || 0

        const act = actualByOp.get(op) || { p: 0, q: 0, d: 0, rt: 0 }
        const rate = rawPlanned > 0 ? Number(((act.p / rawPlanned) * 100).toFixed(2)) : 0
        const actRunHours = Number((act.rt / 60).toFixed(2))

        return {
          IdSeq: `KHSX-${idx + 1}`,
          OperationOrderNo: op,
          MaterialCode: matCode,
          MaterialName: matName,
          Unit: String(row.Unit ?? row['ĐVT'] ?? 'Cái').trim(),
          MachineName: machine,
          OperationName: String(row.OperationName ?? row['Tên thao tác'] ?? '').trim(),
          PlannedQty: rawPlanned,
          TargetQty: rawTarget,
          AllowedDefectQty: parseFloat(String(row['Số lượng \nsai hỏng \ncho phép \n(3)'] ?? 0).replace(/,/g, '')) || 0,
          ActualProducedQty: act.p,
          ActualQualifiedQty: act.q,
          ActualDefectQty: act.d,
          RemainingQty: Math.max(0, rawPlanned - act.p),
          CompletionRate: rate,
          CompletionStatus: rate >= 100 ? (rate > 100 ? 'Vượt KHSX' : 'Đạt KHSX') : 'Chưa hoàn thành',
          PlannedHours: rawDuration,
          ActualRunHours: actRunHours,
          TimeDiffHours: Number((actRunHours - rawDuration).toFixed(2))
        }
      })

      // Tính toán KHSX
      let totalPlannedQty = 0
      let totalUnfinishedQty = 0
      summaryOpData.forEach((row) => {
        totalPlannedQty += parseFloat(String(row['Số lượng \ncần sx \n(1)'] ?? row['Số lượng cần sản xuất'] ?? row.PlannedQty ?? 0).replace(/,/g, '')) || 0
      })
      unfinishedOpData.forEach((row) => {
        totalUnfinishedQty += parseFloat(String(row['Số lượng còn lại'] ?? row.RemainingQty ?? 0).replace(/,/g, '')) || 0
      })

      const planResult = {
        totalPlannedQty,
        totalUnfinishedQty,
        totalPlannedOrders: summaryOpData.length,
        totalUnfinishedOrders: unfinishedOpData.length,
        calculatedRows: planCalculatedRows
      }

      const completionRate = totalPlannedQty > 0 ? Number(((totalProducedQty / totalPlannedQty) * 100).toFixed(2)) : 0

      const result = {
        success: true,
        calculatedAt: new Date().toISOString(),
        summary: {
          completionRate,
          plannedQty: totalPlannedQty,
          producedQty: totalProducedQty,
          qualifiedQty: totalQualifiedQty,
          defectQty: totalDefectQty,
          defectRate,
          unfinishedQty: totalUnfinishedQty
        },
        plan: planResult,
        stat: statResult
      }

      // Tự động lưu kết quả vào bảng calc_results trong SQLite
      try {
        const insStmt = db.prepare(`
          INSERT INTO calc_results (id, summary, plan_data, stat_data, calculated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            summary = excluded.summary,
            plan_data = excluded.plan_data,
            stat_data = excluded.stat_data,
            calculated_at = excluded.calculated_at
        `)
        insStmt.run(
          'CURRENT_CALC',
          JSON.stringify(result.summary || {}),
          JSON.stringify(result.plan || {}),
          JSON.stringify(result.stat || {}),
          result.calculatedAt
        )
      } catch (saveErr) {
        console.warn('[SQLite] Lưu kết quả calc_results:', saveErr)
      }

      return result
    } catch (err) {
      console.error('[SQLite IPC] Lỗi tính toán:', err)
      return { success: false, error: err.message }
    }
  })

  // Lưu kết quả tính toán (hỗ trợ cả payload {id, data} và payload trực tiếp)
  ipcMain.handle('sqlite:save-calc-results', async (_, payload) => {
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      const targetId = payload?.id || payload?.regCode || 'latest_calculation'
      const dataObj = payload?.data || payload
      const summary = dataObj?.summary || {}
      const plan = dataObj?.planData ? { calculatedRows: dataObj.planData } : dataObj?.plan || {}
      const stat = dataObj?.statData ? { calculatedRows: dataObj.statData } : dataObj?.stat || {}
      const calculatedAt = dataObj?.calculatedAt || new Date().toISOString()

      const stmt = db.prepare(`
        INSERT INTO calc_results (id, summary, plan_data, stat_data, calculated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          summary = excluded.summary,
          plan_data = excluded.plan_data,
          stat_data = excluded.stat_data,
          calculated_at = excluded.calculated_at
      `)

      stmt.run(
        targetId,
        typeof summary === 'string' ? summary : JSON.stringify(summary),
        typeof plan === 'string' ? plan : JSON.stringify(plan),
        typeof stat === 'string' ? stat : JSON.stringify(stat),
        calculatedAt
      )
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu kết quả tính:', err)
      return { success: false, error: err.message }
    }
  })

  // Lấy kết quả tính toán theo id hoặc bản ghi mới nhất
  ipcMain.handle('sqlite:get-calc-results', async (_, id) => {
    if (!db) return null
    try {
      let r = null
      if (id) {
        const stmt = db.prepare('SELECT * FROM calc_results WHERE id = ?')
        r = stmt.get(id)
      }
      if (!r) {
        const stmtLatest = db.prepare('SELECT * FROM calc_results ORDER BY calculated_at DESC LIMIT 1')
        r = stmtLatest.get()
      }
      if (!r) return null
      return {
        id: r.id,
        summary: JSON.parse(r.summary || '{}'),
        plan: JSON.parse(r.plan_data || '{}'),
        stat: JSON.parse(r.stat_data || '{}'),
        calculatedAt: r.calculated_at
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy calc results:', err)
      return null
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
        typeof payload.fileSummaries === 'string'
          ? payload.fileSummaries
          : JSON.stringify(payload.fileSummaries || {}),
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
