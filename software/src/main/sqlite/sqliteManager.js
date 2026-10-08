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

  // Tính toán trực tiếp KHSX & TKSX từ CSDL SQLite
  ipcMain.handle('sqlite:calculate-production', async () => {
    if (!db) {
      return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    }
    try {
      const stmt = db.prepare('SELECT file_type, data FROM calc_architecture_files')
      const rows = stmt.all()
      const files = {}
      for (const r of rows) {
        if (r.file_type) {
          files[r.file_type] = {
            data: typeof r.data === 'string' ? JSON.parse(r.data || '[]') : r.data
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

      summaryOpData.forEach((row) => {
        const code = normalize(
          row.OperationOrderNo ?? row['Lệnh thao tác'] ?? row['Số lệnh thao tác'] ?? ''
        )
        if (code) {
          opOrderPlanMap.set(code, 'KHSX')
        }
      })

      unfinishedOpData.forEach((row) => {
        const code = normalize(
          row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
        )
        if (code && !opOrderPlanMap.has(code)) {
          opOrderPlanMap.set(code, 'KHSX')
        }
      })

      // Tạo từ điển tra cứu MES
      const mesApprovalMap = new Map()
      mesApprovalData.forEach((row) => {
        const slipNo = normalize(
          row.ApprovalSlipNo ??
            row['Số phiếu duyệt'] ??
            row['Số phiếu'] ??
            row['Số phiếu thống kê'] ??
            row.StatSlipNo ??
            ''
        )
        const approvedTime =
          row.ApprovedTime ??
          row['Thời gian duyệt'] ??
          row['Thời gian duyệt phiếu'] ??
          row['Thời gian duyệt phiếu ở MES'] ??
          row.ApprovalTime ??
          ''
        if (slipNo && approvedTime) {
          mesApprovalMap.set(slipNo, String(approvedTime).trim())
        }
      })

      // Đếm phiếu trùng
      const slipCountMap = new Map()
      statReportData.forEach((row) => {
        const slipNo = normalize(row.StatSlipNo ?? row['Số phiếu thống kê'] ?? '')
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
          actualRunTime = Math.max(0, Math.round(diffMin) - downtime)
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
        if (opOrderNo && opOrderPlanMap.has(opOrderNo)) {
          checkKhsx = 'KHSX'
          insidePlanCount++
        } else {
          outsidePlanCount++
        }

        // Col 94: thời gian duyệt MES
        const statSlipNo = normalize(row.StatSlipNo ?? row['Số phiếu thống kê'] ?? '')
        let mesApprovedTime = ''
        if (statSlipNo && mesApprovalMap.has(statSlipNo)) {
          mesApprovedTime = mesApprovalMap.get(statSlipNo)
        } else if (row.MesApprovedTime || row['Thời gian duyệt phiếu ở MES']) {
          mesApprovedTime = row.MesApprovedTime || row['Thời gian duyệt phiếu ở MES']
        }

        // Col 95: độ trễ đồng bộ
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
            const diffSec = Math.round((aTs - cTs) / 1000)
            const isNeg = diffSec < 0
            const absSec = Math.abs(diffSec)
            const pad = (n) => String(n).padStart(2, '0')
            const h = Math.floor(absSec / 3600)
            const mi = Math.floor((absSec % 3600) / 60)
            const s = absSec % 60
            syncLatencySeconds = `${isNeg ? '-' : ''}${pad(h)}:${pad(mi)}:${pad(s)}`
            if (diffSec >= 0) {
              totalSyncDelaySec += diffSec
              syncCount++
            }
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

        // Col 98: sinh phiếu xuất nhập
        const autoExport = parseInt(row.AutoExport ?? row['Xuất tự động'] ?? 0, 10) || 0
        const autoImport = parseInt(row.AutoImport ?? row['Nhập tự động'] ?? 0, 10) || 0
        const exportSlipNo = String(row.ExportSlipNo ?? row['Số phiếu xuất'] ?? '').trim()
        const importSlipNo = String(row.ImportSlipNo ?? row['Số phiếu nhập'] ?? '').trim()

        let autoExportImportGenerated = 'Không sử dụng NVL'
        if (autoExport !== 0 || autoImport !== 0) {
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
        calculatedRows
      }

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
        totalUnfinishedOrders: unfinishedOpData.length
      }

      const completionRate = totalPlannedQty > 0 ? Number(((totalProducedQty / totalPlannedQty) * 100).toFixed(2)) : 0

      return {
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
    } catch (err) {
      console.error('[SQLite IPC] Lỗi tính toán:', err)
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
