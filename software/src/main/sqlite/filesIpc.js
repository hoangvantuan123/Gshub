/* eslint-disable no-empty */
/**
 * SQLite IPC Handlers for Architecture Files (4 Files)
 * Quản lý lưu trữ/truy vấn 4 file kiến trúc theo Chunking và Phân trang (1.500 dòng/trang)
 */
import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { getDb, getFullDataForFileType } from './db.js'

export function setupFilesIpc() {
  // 1. Lưu từng khúc (Chunk) của 1 file kiến trúc (Batch Insert siêu tốc)
  ipcMain.handle('sqlite:save-calc-file-chunk', async (_, payload) => {
    const db = getDb()
    if (!db) {
      return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    }
    try {
      const {
        regCode = '',
        fileType,
        fileName,
        fileSize,
        rowCount,
        columns,
        chunk,
        chunkIndex,
        isFirstChunk,
        uploadedAt
      } = payload

      const activeRegCode = regCode || payload.reg_code || ''

      const tx = db.transaction(() => {
        if (isFirstChunk) {
          const metaStmt = db.prepare(`
            INSERT INTO calc_architecture_files (reg_code, file_type, file_name, file_size, row_count, columns, data, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, '', ?)
            ON CONFLICT(reg_code, file_type) DO UPDATE SET
              file_name = excluded.file_name,
              file_size = excluded.file_size,
              row_count = excluded.row_count,
              columns = excluded.columns,
              data = '',
              uploaded_at = excluded.uploaded_at
          `)
          metaStmt.run(
            activeRegCode,
            fileType,
            fileName || '',
            fileSize || 0,
            rowCount || 0,
            typeof columns === 'string' ? columns : JSON.stringify(columns || []),
            uploadedAt || new Date().toISOString()
          )

          db.prepare(
            'DELETE FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) AND reg_code = ?'
          ).run(fileType, activeRegCode)
        }

        if (chunk && chunk.length > 0) {
          const chunkStmt = db.prepare(`
            INSERT OR REPLACE INTO calc_architecture_chunks (reg_code, file_type, chunk_index, row_count, data)
            VALUES (?, ?, ?, ?, ?)
          `)
          chunkStmt.run(
            activeRegCode,
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

  // 2. Lưu 1 file kiến trúc (nguyên khối fallback)
  ipcMain.handle('sqlite:save-calc-file', async (_, payload) => {
    const db = getDb()
    if (!db) {
      return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    }
    try {
      const activeRegCode = payload.regCode || payload.reg_code || ''
      const stmt = db.prepare(`
        INSERT INTO calc_architecture_files (reg_code, file_type, file_name, file_size, row_count, columns, data, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(reg_code, file_type) DO UPDATE SET
          file_name = excluded.file_name,
          file_size = excluded.file_size,
          row_count = excluded.row_count,
          columns = excluded.columns,
          data = excluded.data,
          uploaded_at = excluded.uploaded_at
      `)

      stmt.run(
        activeRegCode,
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

  // 3. Lấy Metadata tóm tắt của tất cả các file (KHÔNG đọc cột data dung lượng lớn -> Cực nhanh < 1ms)
  ipcMain.handle('sqlite:get-all-file-summaries', async (_, payload) => {
    const db = getDb()
    if (!db) return []
    try {
      const regCode =
        typeof payload === 'string'
          ? payload.trim()
          : (payload?.regCode || payload?.reg_code || '').trim()
      let rows = []
      if (regCode) {
        const stmt = db.prepare(
          'SELECT file_type, file_name, file_size, row_count, columns, uploaded_at FROM calc_architecture_files WHERE reg_code = ?'
        )
        rows = stmt.all(regCode)
      } else {
        // Nếu không có regCode, không tự động lấy dữ liệu tàn dư của các phiếu khác
        rows = []
      }
      return rows.map((row) => ({
        regCode: row.reg_code || regCode,
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

  // 4. Lấy chi tiết 1 file (bao gồm data được ghép từ chunks)
  ipcMain.handle('sqlite:get-calc-file', async (_, payload) => {
    const db = getDb()
    const fileType = typeof payload === 'string' ? payload : payload?.fileType
    const regCode = (
      typeof payload === 'object' ? payload?.regCode || payload?.reg_code || '' : ''
    ).trim()
    if (!db || !fileType) return null
    try {
      let row = null
      if (regCode) {
        row = db
          .prepare(
            'SELECT * FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?) AND reg_code = ?'
          )
          .get(fileType, regCode)
      } else {
        row = null
      }
      if (!row) return null
      const fullData = getFullDataForFileType(fileType, regCode)
      return {
        regCode: row.reg_code || regCode,
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

  // 5. Lấy dữ liệu phân trang (mặc định 1.500 dòng/trang) cho 1 fileType để cuộn mượt mà không nghẽn RAM (kèm lọc tìm kiếm trực tiếp trong DB SQLite)
  ipcMain.handle(
    'sqlite:get-calc-file-page',
    async (
      _,
      {
        regCode = '',
        fileType,
        page = 1,
        pageSize = 1500,
        searchText = '',
        filterValues = {},
        statusFilter = 'ALL'
      } = {}
    ) => {
      const db = getDb()
      if (!db || !fileType) return { rows: [], total: 0, page: 1, pageSize: 1500, totalPages: 0 }
      try {
        let meta = null
        if (regCode) {
          meta = db
            .prepare(
              'SELECT file_type, file_name, file_size, row_count, columns, uploaded_at FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?) AND reg_code = ?'
            )
            .get(fileType, regCode)
        } else {
          return { rows: [], total: 0, page: 1, pageSize: 1500, totalPages: 0 }
        }
        if (!meta) {
          return {
            fileType,
            fileName: '',
            fileSize: 0,
            columns: [],
            rows: [],
            total: 0,
            page: 1,
            pageSize,
            totalPages: 0,
            uploadedAt: null
          }
        }

        const hasSearchText = Boolean(searchText && String(searchText).trim())
        const hasStatusFilter = Boolean(statusFilter && statusFilter !== 'ALL')
        const hasFilterValues = Boolean(
          filterValues &&
          typeof filterValues === 'object' &&
          Object.values(filterValues).some(
            (v) => v !== undefined && v !== null && String(v).trim() !== ''
          )
        )
        const hasFilter = hasSearchText || hasStatusFilter || hasFilterValues

        const totalRows = meta.row_count || 0
        const totalPagesCount = Math.max(1, Math.ceil(totalRows / pageSize))
        const offset = (Math.max(1, page) - 1) * pageSize

        // TỐI ƯU SIÊU TỐC: Khi không có bộ lọc tìm kiếm, CHỈ nạp đúng 1-2 Chunks liên quan đến trang hiện tại (< 2ms)
        if (!hasFilter && totalRows > 0) {
          const CHUNK_SIZE = 2500
          const startChunkIdx = Math.floor(offset / CHUNK_SIZE)
          const endChunkIdx = Math.floor((offset + pageSize - 1) / CHUNK_SIZE)

          let targetedChunks = []
          if (regCode) {
            targetedChunks = db
              .prepare(
                'SELECT chunk_index, data FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) AND reg_code = ? AND chunk_index >= ? AND chunk_index <= ? ORDER BY chunk_index ASC'
              )
              .all(fileType, regCode, startChunkIdx, endChunkIdx)
          } else {
            targetedChunks = db
              .prepare(
                "SELECT chunk_index, data FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) AND (reg_code IS NULL OR reg_code = '') AND chunk_index >= ? AND chunk_index <= ? ORDER BY chunk_index ASC"
              )
              .all(fileType, startChunkIdx, endChunkIdx)
          }

          if (targetedChunks && targetedChunks.length > 0) {
            const windowRows = []
            for (const ch of targetedChunks) {
              if (ch.data) {
                try {
                  const arr = typeof ch.data === 'string' ? JSON.parse(ch.data) : ch.data
                  if (Array.isArray(arr)) windowRows.push(...arr)
                } catch {}
              }
            }
            const localStart = offset - startChunkIdx * CHUNK_SIZE
            const pageRows = windowRows.slice(localStart, localStart + pageSize)

            return {
              fileType,
              fileName: meta?.file_name || '',
              fileSize: meta?.file_size || 0,
              columns: meta?.columns ? JSON.parse(meta.columns) : [],
              rows: pageRows,
              total: totalRows,
              page: Math.max(1, page),
              pageSize,
              totalPages: totalPagesCount,
              uploadedAt: meta?.uploaded_at || null
            }
          }
        }

        const fullData = getFullDataForFileType(fileType, regCode)

        let filteredData = fullData

        // 1. Lọc theo ô tìm kiếm chung SearchText (hỗ trợ nhiều từ khóa phân tách bằng dấu phẩy, chấm phẩy, xuống dòng, tab, pipe)
        if (searchText && String(searchText).trim()) {
          const tokens = String(searchText)
            .split(/[,;\n\r\t|]+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)

          if (tokens.length > 0) {
            filteredData = filteredData.filter((row) => {
              if (!row) return false
              return Object.values(row).some((val) => {
                if (val === null || val === undefined) return false
                const strVal = String(val).toLowerCase()
                return tokens.some((token) => strVal.includes(token))
              })
            })
          }
        }

        // 2. Lọc theo trạng thái statusFilter
        if (statusFilter && statusFilter !== 'ALL') {
          const sf = String(statusFilter).toLowerCase()
          filteredData = filteredData.filter((row) => {
            if (!row) return false
            const tag = String(
              row.CoordinatorStatus ||
                row['Trạng thái ĐP - SX'] ||
                row.StatusDpSx ||
                row.CheckKhsx ||
                row['CHECK KHSX'] ||
                row.KhsxStatus ||
                row.Status ||
                row.OpInfoStatus ||
                row['Trạng thái LTT'] ||
                ''
            ).toLowerCase()
            return tag === sf || tag.includes(sf) || sf.includes(tag)
          })
        }

        // 3. Lọc theo các trường lọc động filterValues
        if (filterValues && typeof filterValues === 'object') {
          const activeFilters = Object.entries(filterValues).filter(
            ([, val]) => val !== undefined && val !== null && String(val).trim() !== ''
          )
          if (activeFilters.length > 0) {
            filteredData = filteredData.filter((row) => {
              if (!row) return false
              return activeFilters.every(([key, filterVal]) => {
                const tokens = String(filterVal)
                  .split(/[,;\n\r\t|]+/)
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean)
                if (tokens.length === 0) return true
                const rowVal =
                  row[key] !== undefined
                    ? row[key]
                    : row[key.toLowerCase()] !== undefined
                      ? row[key.toLowerCase()]
                      : Object.entries(row).find(
                          ([k]) => k.toLowerCase() === key.toLowerCase()
                        )?.[1]
                if (rowVal === null || rowVal === undefined) return false
                const rowValStr = String(rowVal).toLowerCase()
                return tokens.some((token) => rowValStr.includes(token))
              })
            })
          }
        }

        const total = filteredData.length
        const totalPages = Math.max(1, Math.ceil(total / pageSize))

        if (page > totalPages || total === 0) {
          return {
            fileType,
            fileName: meta?.file_name || '',
            fileSize: meta?.file_size || 0,
            columns: meta?.columns ? JSON.parse(meta.columns) : [],
            rows: [],
            total,
            page,
            pageSize,
            totalPages,
            uploadedAt: meta?.uploaded_at || null
          }
        }

        const finalOffset = (Math.max(1, page) - 1) * pageSize
        const pageRows = filteredData.slice(finalOffset, finalOffset + pageSize)

        return {
          fileType,
          fileName: meta?.file_name || '',
          fileSize: meta?.file_size || 0,
          columns: meta?.columns ? JSON.parse(meta.columns) : [],
          rows: pageRows,
          total,
          page: Math.max(1, page),
          pageSize,
          totalPages,
          uploadedAt: meta?.uploaded_at || null
        }
      } catch (err) {
        console.error('[SQLite IPC] Lỗi lấy phân trang file:', err)
        return { rows: [], total: 0, page: 1, pageSize: 1500, totalPages: 0, error: err.message }
      }
    }
  )

  // 6. Lấy toàn bộ các file (chỉ dùng khi tính toán KHSX & TKSX)
  ipcMain.handle('sqlite:get-all-calc-files', async (_, payload) => {
    const db = getDb()
    if (!db) return []
    try {
      const regCode =
        typeof payload === 'string' ? payload : payload?.regCode || payload?.reg_code || ''
      let rows = []
      if (regCode) {
        const stmt = db.prepare('SELECT * FROM calc_architecture_files WHERE reg_code = ?')
        rows = stmt.all(regCode)
      } else {
        const stmt = db.prepare(
          "SELECT * FROM calc_architecture_files WHERE reg_code IS NULL OR reg_code = ''"
        )
        rows = stmt.all()
      }
      return rows.map((row) => {
        const fullData = getFullDataForFileType(row.file_type, row.reg_code || regCode)
        return {
          regCode: row.reg_code,
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

  // 7. Xóa 1 file hoặc xóa toàn bộ (kèm xóa chunks)
  ipcMain.handle('sqlite:delete-calc-file', async (_, payload) => {
    const db = getDb()
    if (!db) return { success: false }
    try {
      const fileType = typeof payload === 'string' ? payload : payload?.fileType
      const regCode = typeof payload === 'object' ? payload?.regCode || payload?.reg_code || '' : ''
      if (fileType) {
        if (regCode) {
          db.prepare(
            'DELETE FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?) AND reg_code = ?'
          ).run(fileType, regCode)
          db.prepare(
            'DELETE FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?) AND reg_code = ?'
          ).run(fileType, regCode)
        } else {
          db.prepare('DELETE FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?)').run(
            fileType
          )
          db.prepare('DELETE FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?)').run(
            fileType
          )
        }
      } else {
        if (regCode) {
          db.prepare('DELETE FROM calc_architecture_files WHERE reg_code = ?').run(regCode)
          db.prepare('DELETE FROM calc_architecture_chunks WHERE reg_code = ?').run(regCode)
        } else {
          db.exec('DELETE FROM calc_architecture_files; DELETE FROM calc_architecture_chunks;')
        }
      }
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa file:', err)
      return { success: false, error: err.message }
    }
  })

  // 8. Dọn dẹp toàn bộ cache mồ côi / dữ liệu tạm trong SQLite
  ipcMain.handle('sqlite:clean-cache', async () => {
    const db = getDb()
    if (!db) return { success: false }
    try {
      const delFiles = db
        .prepare("DELETE FROM calc_architecture_files WHERE reg_code IS NULL OR reg_code = ''")
        .run()
      const delChunks = db
        .prepare("DELETE FROM calc_architecture_chunks WHERE reg_code IS NULL OR reg_code = ''")
        .run()
      const delResults = db
        .prepare(
          "DELETE FROM calc_results WHERE id IN ('latest_calculation', 'CURRENT_CALC') OR id IS NULL OR id = ''"
        )
        .run()
      try {
        db.exec('VACUUM;')
      } catch {}
      return {
        success: true,
        deletedFiles: delFiles.changes,
        deletedChunks: delChunks.changes,
        deletedResults: delResults.changes
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi dọn dẹp cache:', err)
      return { success: false, error: err.message }
    }
  })

  // 9. Lấy thông tin thống kê dung lượng lưu trữ CSDL SQLite
  ipcMain.handle('sqlite:get-storage-stats', async () => {
    const db = getDb()
    try {
      const userDataPath = app.getPath('userData')
      const dbPath = path.join(userDataPath, 'databases', 'gshub_production_calc.db')
      const walPath = `${dbPath}-wal`
      let fileSizeBytes = 0
      let walSizeBytes = 0
      if (fs.existsSync(dbPath)) {
        try {
          fileSizeBytes = fs.statSync(dbPath).size
        } catch {}
      }
      if (fs.existsSync(walPath)) {
        try {
          walSizeBytes = fs.statSync(walPath).size
        } catch {}
      }

      let masterCount = 0
      let fileCount = 0
      let chunkCount = 0
      let calcResultsCount = 0
      let bundleCount = 0

      if (db) {
        try {
          masterCount =
            db.prepare('SELECT COUNT(*) as cnt FROM calc_master_registrations').get()?.cnt || 0
        } catch {}
        try {
          fileCount =
            db.prepare('SELECT COUNT(*) as cnt FROM calc_architecture_files').get()?.cnt || 0
        } catch {}
        try {
          chunkCount =
            db.prepare('SELECT COUNT(*) as cnt FROM calc_architecture_chunks').get()?.cnt || 0
        } catch {}
        try {
          calcResultsCount = db.prepare('SELECT COUNT(*) as cnt FROM calc_results').get()?.cnt || 0
        } catch {}
        try {
          bundleCount =
            db.prepare('SELECT COUNT(*) as cnt FROM calc_versioned_bundles').get()?.cnt || 0
        } catch {}
      }

      return {
        success: true,
        dbPath,
        fileSizeBytes,
        walSizeBytes,
        totalSizeBytes: fileSizeBytes + walSizeBytes,
        masterCount,
        fileCount,
        chunkCount,
        calcResultsCount,
        bundleCount
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lấy thông tin lưu trữ:', err)
      return { success: false, error: err.message }
    }
  })

  // 10. Xóa toàn bộ cache dữ liệu tính toán trong SQLite
  ipcMain.handle('sqlite:clear-all-calc-cache', async (_, options = {}) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa khởi tạo' }
    try {
      const { preserveMasters = false } = options || {}

      const delFiles = db.prepare('DELETE FROM calc_architecture_files').run()
      const delChunks = db.prepare('DELETE FROM calc_architecture_chunks').run()
      const delResults = db.prepare('DELETE FROM calc_results').run()
      const delBundles = db.prepare('DELETE FROM calc_versioned_bundles').run()
      let delMasters = { changes: 0 }
      if (!preserveMasters) {
        delMasters = db.prepare('DELETE FROM calc_master_registrations').run()
      }

      try {
        db.exec('VACUUM;')
      } catch {}

      return {
        success: true,
        deletedFiles: delFiles.changes,
        deletedChunks: delChunks.changes,
        deletedResults: delResults.changes,
        deletedBundles: delBundles.changes,
        deletedMasters: delMasters.changes
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa toàn bộ cache:', err)
      return { success: false, error: err.message }
    }
  })

  // 11. Tối ưu hóa dung lượng (VACUUM)
  ipcMain.handle('sqlite:vacuum-db', async () => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa khởi tạo' }
    try {
      db.exec('VACUUM;')
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi VACUUM:', err)
      return { success: false, error: err.message }
    }
  })
}
