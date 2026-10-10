/**
 * SQLite IPC Handlers for Export/Import Bundle Package (.gsprod)
 * Quản lý xuất/nhập gói dữ liệu siêu nén Columnar Matrix + Gzip Level 9
 */
import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { getDb, objectsToMatrix, matrixToObjects, getFullDataForFileType } from './db.js'

export function setupBundlePackageIpc() {
  // 1. Xuất gói siêu nén .gsprod (Columnar Matrix + Gzip Level 9 - Giảm từ 50MB -> <1MB)
  ipcMain.handle('sqlite:export-bundle-package', async (event, payload = {}) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      const regCode = payload.regCode
      let masterRecord = null
      if (regCode) {
        const mRow = db
          .prepare('SELECT * FROM calc_master_registrations WHERE reg_code = ?')
          .get(regCode)
        if (mRow) {
          masterRecord = {
            regCode: mRow.reg_code,
            factoryName: mRow.factory_name,
            applyDate: mRow.apply_date,
            productionTeam: mRow.production_team,
            remark: mRow.remark,
            status: 'PUBLISHED',
            version: mRow.version || payload.version || '1.0',
            isPublished: 1,
            publishedAt: mRow.published_at || new Date().toISOString(),
            statReportRows: mRow.stat_report_rows,
            unfinishedOpRows: mRow.unfinished_op_rows,
            summaryOpRows: mRow.summary_op_rows,
            mesApprovalRows: mRow.mes_approval_rows,
            totalRows: mRow.total_rows,
            fileSummaries: JSON.parse(mRow.file_summaries || '{}'),
            registeredAt: mRow.registered_at
          }
        }
      }

      if (!masterRecord) {
        masterRecord = payload.master || {
          regCode: regCode || `REG_${Date.now()}`,
          factoryName: 'GS1 Hà Nội',
          applyDate: new Date().toISOString().slice(0, 10),
          productionTeam: 'Tất cả các tổ',
          status: 'PUBLISHED',
          version: payload.version || '1.0',
          isPublished: 1,
          publishedAt: new Date().toISOString()
        }
      }

      // Lấy toàn bộ 4 file kiến trúc
      const statRows = getFullDataForFileType('STAT_REPORT')
      const unfinRows = getFullDataForFileType('UNFINISHED_OP')
      const sumRows = getFullDataForFileType('SUMMARY_OP')
      const mesRows = getFullDataForFileType('MES_APPROVAL')

      // Lấy kết quả tính toán
      let calcRes = null
      if (regCode) {
        const resRow = db.prepare('SELECT * FROM calc_results WHERE id = ?').get(regCode)
        if (resRow) {
          calcRes = {
            summary: JSON.parse(resRow.summary || '{}'),
            plan: JSON.parse(resRow.plan_data || '{}'),
            stat: JSON.parse(resRow.stat_data || '{}')
          }
        }
      }

      // Chuẩn bị bundle với Columnar Matrix
      const bundleData = {
        format: 'GSHUB_PROD_BUNDLE',
        specVersion: '1.0',
        version: masterRecord.version || '1.0',
        exportedAt: new Date().toISOString(),
        master: masterRecord,
        architecture: {
          STAT_REPORT: objectsToMatrix(statRows),
          UNFINISHED_OP: objectsToMatrix(unfinRows),
          SUMMARY_OP: objectsToMatrix(sumRows),
          MES_APPROVAL: objectsToMatrix(mesRows)
        },
        calcResults: {
          summary: calcRes?.summary || {},
          plan: objectsToMatrix(calcRes?.plan?.calculatedRows || calcRes?.plan || []),
          stat: objectsToMatrix(calcRes?.stat?.calculatedRows || calcRes?.stat || [])
        }
      }

      const jsonStr = JSON.stringify(bundleData)
      const rawSizeBytes = Buffer.byteLength(jsonStr, 'utf8')
      const compressedBuffer = zlib.gzipSync(jsonStr, { level: 9 })
      const compressedSizeBytes = compressedBuffer.length

      let savePath = payload.targetPath
      if (!savePath) {
        const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow()
        const defaultName = `${masterRecord.regCode || 'KHSX'}_v${masterRecord.version || '1.0'}.gsprod`
        const saveDialogRes = await dialog.showSaveDialog(win, {
          title: 'Xuất gói dữ liệu sản xuất (.gsprod)',
          defaultPath: path.join(app.getPath('downloads'), defaultName),
          filters: [
            { name: 'GSHUB Production Package (*.gsprod)', extensions: ['gsprod'] },
            { name: 'All Files (*.*)', extensions: ['*'] }
          ]
        })
        if (saveDialogRes.canceled || !saveDialogRes.filePath) {
          return { success: false, canceled: true }
        }
        savePath = saveDialogRes.filePath
      }

      fs.writeFileSync(savePath, compressedBuffer)

      const rawMB = (rawSizeBytes / 1024 / 1024).toFixed(2)
      const compMB = (compressedSizeBytes / 1024 / 1024).toFixed(2)
      const ratio = ((1 - compressedSizeBytes / Math.max(1, rawSizeBytes)) * 100).toFixed(1) + '%'

      return {
        success: true,
        filePath: savePath,
        rawSizeBytes,
        compressedSizeBytes,
        rawMB,
        compMB,
        ratio,
        regCode: masterRecord.regCode,
        version: masterRecord.version
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi xuất gói .gsprod:', err)
      return { success: false, error: err.message }
    }
  })

  // 2. Nhập và đồng bộ ngay lập tức gói siêu nén .gsprod vào CSDL SQLite của User
  ipcMain.handle('sqlite:import-bundle-package', async (event, payload = {}) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      let buffer = null
      let filePath = payload.filePath

      if (payload.buffer) {
        buffer = Buffer.from(payload.buffer)
      } else if (filePath && fs.existsSync(filePath)) {
        buffer = fs.readFileSync(filePath)
      } else {
        const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow()
        const openDialogRes = await dialog.showOpenDialog(win, {
          title: 'Chọn gói dữ liệu sản xuất (.gsprod) để đồng bộ',
          properties: ['openFile'],
          filters: [
            { name: 'GSHUB Production Package (*.gsprod)', extensions: ['gsprod'] },
            { name: 'All Files (*.*)', extensions: ['*'] }
          ]
        })
        if (openDialogRes.canceled || !openDialogRes.filePaths?.length) {
          return { success: false, canceled: true }
        }
        filePath = openDialogRes.filePaths[0]
        buffer = fs.readFileSync(filePath)
      }

      if (!buffer) {
        return { success: false, error: 'Không đọc được dữ liệu gói file' }
      }

      // Giải nén Gzip
      const decompressedString = zlib.gunzipSync(buffer).toString('utf8')
      const bundleObj = JSON.parse(decompressedString)

      if (bundleObj.format !== 'GSHUB_PROD_BUNDLE') {
        return {
          success: false,
          error: 'Định dạng file không phải là GSHUB Production Package (.gsprod)'
        }
      }

      const master = bundleObj.master || {}
      const arch = bundleObj.architecture || {}
      const res = bundleObj.calcResults || bundleObj.results || {}

      // Bung dữ liệu từ Matrix
      const statRows = matrixToObjects(arch.STAT_REPORT)
      const unfinRows = matrixToObjects(arch.UNFINISHED_OP)
      const sumRows = matrixToObjects(arch.SUMMARY_OP)
      const mesRows = matrixToObjects(arch.MES_APPROVAL)
      const planRows = matrixToObjects(res.plan)
      const statCalcRows = matrixToObjects(res.stat)

      const CHUNK_SIZE = 5000

      // Dùng Transaction ghi tốc độ cao vào SQLite
      const syncTransaction = db.transaction(() => {
        // 1. Lưu Master Registration
        const masterStmt = db.prepare(`
          INSERT INTO calc_master_registrations (
            reg_code, factory_name, apply_date, production_team, remark, status,
            stat_report_rows, unfinished_op_rows, summary_op_rows, mes_approval_rows, total_rows,
            file_summaries, registered_at, version, is_published, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            published_at = excluded.published_at
        `)

        masterStmt.run(
          master.regCode,
          master.factoryName || 'GS1 Hà Nội',
          master.applyDate || '',
          master.productionTeam || 'Tất cả các tổ',
          master.remark || 'Đồng bộ từ gói .gsprod',
          'PUBLISHED',
          statRows.length,
          unfinRows.length,
          sumRows.length,
          mesRows.length,
          statRows.length + unfinRows.length + sumRows.length + mesRows.length,
          JSON.stringify(master.fileSummaries || {}),
          master.registeredAt || new Date().toISOString(),
          master.version || '1.0',
          1,
          master.publishedAt || new Date().toISOString()
        )

        // 2. Lưu 4 file kiến trúc (chuẩn hóa key chữ thường đồng bộ với TAB_DEFINITIONS)
        const filesMap = {
          stat_report: statRows,
          unfinished_op: unfinRows,
          summary_op: sumRows,
          mes_approval: mesRows
        }

        const insertFileStmt = db.prepare(`
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

        const deleteFilesStmt = db.prepare(
          'DELETE FROM calc_architecture_files WHERE LOWER(file_type) = LOWER(?)'
        )
        const deleteChunksStmt = db.prepare(
          'DELETE FROM calc_architecture_chunks WHERE LOWER(file_type) = LOWER(?)'
        )
        const insertChunkStmt = db.prepare(`
          INSERT INTO calc_architecture_chunks (file_type, chunk_index, row_count, data)
          VALUES (?, ?, ?, ?)
        `)

        for (const [fType, rows] of Object.entries(filesMap)) {
          const lowerType = fType.toLowerCase()
          deleteFilesStmt.run(lowerType)
          deleteChunksStmt.run(lowerType)
          const cols = rows.length > 0 ? Object.keys(rows[0]) : []
          insertFileStmt.run(
            lowerType,
            `${lowerType}_synced.xlsx`,
            rows.length * 200,
            rows.length,
            JSON.stringify(cols),
            JSON.stringify(rows.slice(0, 100)),
            new Date().toISOString()
          )

          const totalChunks = Math.ceil(rows.length / CHUNK_SIZE) || 1
          for (let i = 0; i < totalChunks; i++) {
            const chunkRows = rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
            insertChunkStmt.run(lowerType, i, chunkRows.length, JSON.stringify(chunkRows))
          }
        }

        // 3. Lưu kết quả tính
        const calcStmt = db.prepare(`
          INSERT INTO calc_results (id, summary, plan_data, stat_data, calculated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            summary = excluded.summary,
            plan_data = excluded.plan_data,
            stat_data = excluded.stat_data,
            calculated_at = excluded.calculated_at
        `)

        calcStmt.run(
          master.regCode,
          JSON.stringify(res.summary || {}),
          JSON.stringify({ calculatedRows: planRows }),
          JSON.stringify({ calculatedRows: statCalcRows }),
          new Date().toISOString()
        )
      })

      syncTransaction()

      return {
        success: true,
        regCode: master.regCode,
        version: master.version || '1.0',
        master,
        statReportRows: statRows.length,
        unfinishedOpRows: unfinRows.length,
        summaryOpRows: sumRows.length,
        mesApprovalRows: mesRows.length,
        planRows: planRows.length,
        statCalcRows: statCalcRows.length,
        totalRows: statRows.length + unfinRows.length + sumRows.length + mesRows.length
      }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi đồng bộ gói .gsprod:', err)
      return { success: false, error: err.message }
    }
  })
}
