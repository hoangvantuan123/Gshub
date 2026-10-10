/**
 * SQLite IPC Handlers for Architecture Files (4 Files)
 * Quản lý lưu trữ/truy vấn 4 file kiến trúc theo Chunking và Phân trang (1.500 dòng/trang)
 */
import { ipcMain } from 'electron'
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

  // 2. Lưu 1 file kiến trúc (nguyên khối fallback)
  ipcMain.handle('sqlite:save-calc-file', async (_, payload) => {
    const db = getDb()
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

  // 3. Lấy Metadata tóm tắt của tất cả các file (KHÔNG đọc cột data dung lượng lớn -> Cực nhanh < 1ms)
  ipcMain.handle('sqlite:get-all-file-summaries', async () => {
    const db = getDb()
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

  // 4. Lấy chi tiết 1 file (bao gồm data được ghép từ chunks)
  ipcMain.handle('sqlite:get-calc-file', async (_, fileType) => {
    const db = getDb()
    if (!db || !fileType) return null
    try {
      const stmt = db.prepare(
        'SELECT * FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?)'
      )
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

  // 5. Lấy dữ liệu phân trang (mặc định 1.500 dòng/trang) cho 1 fileType để cuộn mượt mà không nghẽn RAM
  ipcMain.handle(
    'sqlite:get-calc-file-page',
    async (_, { fileType, page = 1, pageSize = 1500 } = {}) => {
      const db = getDb()
      if (!db || !fileType) return { rows: [], total: 0, page: 1, pageSize: 1500, totalPages: 0 }
      try {
        const metaStmt = db.prepare(
          'SELECT file_type, file_name, file_size, row_count, columns, uploaded_at FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?)'
        )
        const meta = metaStmt.get(fileType)
        const fullData = getFullDataForFileType(fileType)
        const total = fullData.length || meta?.row_count || 0
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

        const offset = (Math.max(1, page) - 1) * pageSize
        const pageRows = fullData.slice(offset, offset + pageSize)

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
  ipcMain.handle('sqlite:get-all-calc-files', async () => {
    const db = getDb()
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

  // 7. Xóa 1 file hoặc xóa toàn bộ (kèm xóa chunks)
  ipcMain.handle('sqlite:delete-calc-file', async (_, fileType) => {
    const db = getDb()
    if (!db) return { success: false }
    try {
      if (fileType) {
        db.prepare('DELETE FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?)').run(
          fileType
        )
        db.prepare('DELETE FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?)').run(
          fileType
        )
      } else {
        db.exec('DELETE FROM calc_architecture_files; DELETE FROM calc_architecture_chunks;')
      }
      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xóa file:', err)
      return { success: false, error: err.message }
    }
  })
}
