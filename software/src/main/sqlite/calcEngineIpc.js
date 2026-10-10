/**
 * SQLite IPC Handlers for Production Calculation Engine
 * Xử lý động cơ tính toán ma trận TKSX (98 cột) và KHSX (18 chỉ tiêu) trực tiếp trong SQLite
 */
import { ipcMain } from 'electron'
import { getDb, getFullDataForFileType } from './db.js'

export function setupCalcEngineIpc() {
  // 1. Tính toán trực tiếp KHSX & TKSX từ CSDL SQLite
  ipcMain.handle('sqlite:calculate-production', async () => {
    const db = getDb()
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

      const calculatedRows = statReportData.map((row, idx) => {
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

        // Col 95: Độ trễ đồng bộ 2 hệ thống
        const slipCreatedDate = String(row.SlipCreatedDate ?? row['Ngày tạo phiếu'] ?? '').trim()
        let syncLatencySeconds = ''
        if (slipCreatedDate && mesApprovedTime) {
          const parseTs = (dtStr) => {
            const m = dtStr.match(
              /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i
            )
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

        // Col 98: Sinh phiếu xuất/nhập tự động
        const autoExport =
          parseInt(row.IsAutoExport ?? row.AutoExport ?? row['Xuất tự động'] ?? 0, 10) || 0
        const autoImport =
          parseInt(row.IsAutoImport ?? row.AutoImport ?? row['Nhập tự động'] ?? 0, 10) || 0
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
          row.MachineName ??
            row['Tên máy sản xuất'] ??
            row.MachineCode ??
            row['Mã máy sản xuất'] ??
            'Khác'
        ).trim()
        const team = String(row.ProductionTeam ?? row['Tổ sản xuất'] ?? 'Khác').trim()
        const leadTech = String(
          row.LeadTechnicianName ?? row['Thợ chính'] ?? row['Họ tên thợ chính'] ?? 'Khác'
        ).trim()

        if (!statByMachine[machine]) {
          statByMachine[machine] = {
            machine,
            producedQty: 0,
            qualifiedQty: 0,
            defectQty: 0,
            ticketCount: 0
          }
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
            statByTechnician[leadTech] = {
              technician: leadTech,
              producedQty: 0,
              qualifiedQty: 0,
              defectQty: 0
            }
          }
          statByTechnician[leadTech].producedQty += produced
          statByTechnician[leadTech].qualifiedQty += qualified
          statByTechnician[leadTech].defectQty += defect
        }

        if (!rowObj.IdSeq) {
          rowObj.IdSeq = `TKSX-${Date.now()}-${idx + 1}`
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
        mesApprovedProducedQty +=
          parseFloat(String(row['SL sản xuất'] ?? row.ProducedQty ?? 0).replace(/,/g, '')) || 0
        mesApprovedQualifiedQty +=
          parseFloat(String(row['SL đạt'] ?? row.QualifiedQty ?? 0).replace(/,/g, '')) || 0
        mesApprovedDefectQty +=
          parseFloat(String(row['SL lỗi'] ?? row.DefectQty ?? 0).replace(/,/g, '')) || 0
      })

      const defectRate =
        totalProducedQty > 0 ? Number(((totalDefectQty / totalProducedQty) * 100).toFixed(2)) : 0
      const avgSyncDelay = syncCount > 0 ? Number((totalSyncDelaySec / syncCount).toFixed(1)) : 0

      const statFile = db
        .prepare('SELECT columns FROM calc_architecture_files WHERE file_type = ?')
        .get('stat_report')
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
        machineBreakdown: Object.values(statByMachine).sort(
          (a, b) => b.producedQty - a.producedQty
        ),
        teamBreakdown: Object.values(statByTeam).sort((a, b) => b.producedQty - a.producedQty),
        technicianBreakdown: Object.values(statByTechnician).sort(
          (a, b) => b.producedQty - a.producedQty
        ),
        columns: statCols,
        calculatedRows
      }

      // 1. Tổng hợp thực tế sản xuất theo lệnh
      const actualByOp = new Map()
      statReportData.forEach((row) => {
        const op = normalize(
          row.OperationOrderNo ?? row['Số lệnh thao tác'] ?? row['Lệnh thao tác'] ?? ''
        )
        if (!op) return
        const p =
          parseFloat(String(row.ProducedQty ?? row['Số lượng sản xuất'] ?? 0).replace(/,/g, '')) ||
          0
        const q =
          parseFloat(String(row.QualifiedQty ?? row['Số lượng đạt'] ?? 0).replace(/,/g, '')) || 0
        const d =
          parseFloat(String(row.DefectQty ?? row['Số lượng lỗi'] ?? 0).replace(/,/g, '')) || 0
        const rt =
          parseFloat(
            String(row.ActualRunTime ?? row['Thời gian chạy thực tế'] ?? 0).replace(/,/g, '')
          ) || 0
        if (!actualByOp.has(op)) {
          actualByOp.set(op, { p: 0, q: 0, d: 0, rt: 0 })
        }
        const cur = actualByOp.get(op)
        cur.p += p
        cur.q += q
        cur.d += d
        cur.rt += rt
      })

      // 2. Lọc danh sách duy nhất theo Số lệnh thao tác (Deduplication)
      const uniquePlanMap = new Map()
      summaryOpData.forEach((row, idx) => {
        const op = normalize(
          row.OperationOrderNo ??
            row.PlannedOperationOrderNo ??
            row['Lệnh thao tác'] ??
            row['Số lệnh thao tác'] ??
            row['Số lệnh TT'] ??
            `KHSX-${idx + 1}`
        )
        if (!op) return
        if (!uniquePlanMap.has(op)) {
          uniquePlanMap.set(op, row)
        }
      })

      const planCalculatedRows = []
      let totalPlannedQty = 0

      uniquePlanMap.forEach((row, op) => {
        const pic = String(
          row.OrderIssuer ??
            row.PicCoordinator ??
            row['Người phát hành lệnh thao tác'] ??
            row['PIC ĐP'] ??
            ''
        ).trim()
        const opDate = String(
          row.OperationDate ??
            row.KhsxOpDate ??
            row['Ngày KHSX thao tác'] ??
            row['Ngày thực hiện thao tác'] ??
            ''
        ).trim()
        const stageOrderNo = String(
          row.StageOrderNo ?? row['Lệnh công đoạn'] ?? row['Số lệnh công đoạn'] ?? ''
        ).trim()
        const stageCreatedDate = String(
          row.OpOrderReleaseDate ??
            row.StageOrderCreatedDate ??
            row['Ngày phát hành lệnh thao tác'] ??
            ''
        ).trim()
        const matCode = String(row.MaterialCode ?? row['Mã vật tư'] ?? row['Mã hàng'] ?? '').trim()
        const matName = String(
          row.MaterialName ?? row['Tên vật tư'] ?? row['Tên hàng'] ?? ''
        ).trim()
        const opName = String(
          row.PlannedOperationTypeName ?? row.OperationName ?? row['Tên phân loại thao tác'] ?? ''
        ).trim()
        const machine = String(
          row.PlannedMachineName ?? row.MachineName ?? row['Tên máy'] ?? ''
        ).trim()
        const unit = String(row.Unit ?? row['ĐVT'] ?? row['Đvt'] ?? 'Pcs').trim()

        const rawPlanned =
          parseFloat(
            String(
              row['Số lượng cần sx (1)'] ??
                row['Số lượng \ncần sx \n(1)'] ??
                row['Số lượng cần sản xuất'] ??
                row.PlannedQty ??
                0
            ).replace(/,/g, '')
          ) || 0
        const rawTarget =
          parseFloat(
            String(
              row['Số lượng cần đạt (2)'] ??
                row['Số lượng \ncần đạt \n(2)'] ??
                row['Số lượng cần đạt'] ??
                row.TargetQty ??
                0
            ).replace(/,/g, '')
          ) || 0
        const startTime = String(
          row.PlannedStartTime ??
            row.StartTime ??
            row['Thời gian bắt đầu (5)'] ??
            row['Thời gian bắt đầu'] ??
            ''
        ).trim()
        const endTime = String(
          row.PlannedEndTime ??
            row.EndTime ??
            row['Thời gian kết thúc (6)'] ??
            row['Thời gian kết thúc'] ??
            ''
        ).trim()

        let rawDuration =
          parseFloat(
            String(
              row.PlannedTotalHours ?? row['Tổng thời gian kế hoạch (7)=(6)-(5)'] ?? 0
            ).replace(/,/g, '')
          ) || 0
        let standardRunMin = rawDuration > 0 ? Math.round(rawDuration * 60) : 0

        const act = actualByOp.get(op) || { p: 0, q: 0, d: 0, rt: 0 }
        let standardCapa =
          standardRunMin > 0 && rawTarget > 0
            ? Number(((rawTarget / standardRunMin) * 60).toFixed(4))
            : 0
        let actualCapa = act.rt > 0 && act.q > 0 ? Number(((act.q / act.rt) * 60).toFixed(4)) : 0

        let coordinatorStatus = 'Trượt KH'
        if (act.q >= rawTarget && rawTarget > 0) {
          coordinatorStatus = act.q > rawTarget * 1.05 ? 'Vượt KH' : 'Đạt KH'
        } else if (act.q > 0) {
          coordinatorStatus = 'Đang chạy'
        }

        totalPlannedQty += rawPlanned

        planCalculatedRows.push({
          PicCoordinator: pic,
          OperationOrderNo: op,
          OperationDate: opDate,
          StageOrderNo: stageOrderNo,
          StageOrderCreatedDate: stageCreatedDate,
          MaterialCode: matCode,
          MaterialName: matName,
          OperationName: opName,
          OperationTypeName: opName,
          MachineName: machine,
          Unit: unit,
          OpTargetQty: rawTarget,
          OpPlannedQty: rawPlanned,
          ActualQualifiedQty: act.q,
          StartTime: startTime,
          EndTime: endTime,
          StandardRunMinutes: standardRunMin,
          ActualRunMinutes: act.rt,
          StandardCapa: standardCapa,
          ActualCapa: actualCapa,
          CoordinatorStatus: coordinatorStatus,
          TimeStatus:
            act.rt > 0 && standardRunMin > 0
              ? act.rt <= standardRunMin
                ? 'Đạt thời gian'
                : 'Vượt giờ ĐM'
              : '',
          CapaStatus:
            actualCapa > 0 && standardCapa > 0
              ? actualCapa >= standardCapa
                ? 'Đạt Capa'
                : 'Chưa đạt Capa'
              : '',
          KhsxStatus: 'KHSX'
        })
      })

      let totalUnfinishedQty = 0
      unfinishedOpData.forEach((row) => {
        totalUnfinishedQty +=
          parseFloat(String(row['Số lượng còn lại'] ?? row.RemainingQty ?? 0).replace(/,/g, '')) ||
          0
      })

      const planResult = {
        totalPlannedQty,
        totalUnfinishedQty,
        totalPlannedOrders: planCalculatedRows.length,
        totalUnfinishedOrders: unfinishedOpData.length,
        calculatedRows: planCalculatedRows
      }

      const completionRate =
        totalPlannedQty > 0 ? Number(((totalProducedQty / totalPlannedQty) * 100).toFixed(2)) : 0

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

  // 2. Lưu kết quả tính toán (hỗ trợ cả payload {id, data}, (id, data) và payload trực tiếp)
  ipcMain.handle('sqlite:save-calc-results', async (_, payload, maybeData) => {
    const db = getDb()
    if (!db) return { success: false, error: 'Database SQLite chưa sẵn sàng' }
    try {
      let targetId = 'latest_calculation'
      let dataObj = {}

      if (typeof payload === 'string') {
        targetId = payload
        dataObj = maybeData || {}
      } else if (payload && typeof payload === 'object') {
        targetId = payload.id || payload.regCode || 'latest_calculation'
        dataObj = payload.data !== undefined ? payload.data : payload
      }

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

      const sumJson = typeof summary === 'string' ? summary : JSON.stringify(summary)
      const planJson = typeof plan === 'string' ? plan : JSON.stringify(plan)
      const statJson = typeof stat === 'string' ? stat : JSON.stringify(stat)

      stmt.run(targetId, sumJson, planJson, statJson, calculatedAt)

      // Luôn ghi đè bản sao latest_calculation để làm điểm tựa phục hồi
      if (targetId !== 'latest_calculation') {
        stmt.run('latest_calculation', sumJson, planJson, statJson, calculatedAt)
      }

      return { success: true }
    } catch (err) {
      console.error('[SQLite IPC] Lỗi lưu kết quả tính:', err)
      return { success: false, error: err.message }
    }
  })

  // 3. Lấy kết quả tính toán theo id (có fallback nếu id chưa có)
  ipcMain.handle('sqlite:get-calc-results', async (_, id) => {
    const db = getDb()
    if (!db) return null
    try {
      const stmt = db.prepare('SELECT * FROM calc_results WHERE id = ?')
      let r = id ? stmt.get(id) : null
      if (!r && id !== 'latest_calculation') {
        r = stmt.get('latest_calculation') || stmt.get('CURRENT_CALC')
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
}
