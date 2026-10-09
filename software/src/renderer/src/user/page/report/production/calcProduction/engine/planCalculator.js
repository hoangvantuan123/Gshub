import dayjs from 'dayjs'
import { RESULT_KHSX_COLUMN_SCHEMA } from '../constants/calcConstants'

function normalizeCode(val) {
  if (val === undefined || val === null) return ''
  return String(val).trim().toUpperCase()
}

/**
 * Phân tích linh hoạt chuỗi ngày giờ từ Excel (hỗ trợ dd/MM/yy, dd/MM/yyyy, 12h AM/PM, ISO, số serial Excel)
 */
export function parseDateTimeFlexible(val) {
  if (!val) return null
  if (val instanceof Date && !isNaN(val)) return dayjs(val)

  const str = String(val).trim()
  if (!str) return null

  // 1. Kiểm tra số serial Excel (VD: 45563.4965)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const millis = Math.round(num * 86400000)
    const date = new Date(excelEpoch.getTime() + millis)
    if (!isNaN(date)) return dayjs(date)
  }

  // 2. Format dd/MM/yy hoặc dd/MM/yyyy (kèm giờ phút giây và AM/PM tùy chọn)
  // VD: 28/09/26 11:55 AM, 28/09/2026 13:41:00, 28-09-2026 11:55
  const dmyMatch = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i
  )
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10)
    const m = parseInt(dmyMatch[2], 10) - 1
    let y = parseInt(dmyMatch[3], 10)
    if (y < 100) y += 2000 // 26 -> 2026
    let h = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
    const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : null

    if (ampm === 'PM' && h < 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0

    const date = new Date(y, m, d, h, min, sec)
    if (!isNaN(date)) return dayjs(date)
  }

  // 3. Fallback dayjs parse chuẩn
  const djs = dayjs(str)
  if (djs.isValid()) return djs

  return null
}

/**
 * Tính toán 3 cột điều kiện KHSX cho từng dòng của Tab 3 "Tổng hợp lệnh thao tác":
 * 1. Ngày KHSX thao tác (Date Part)
 * 2. Check KHSX theo Bắt đầu: [ApplyDate 07:00:00 -> ApplyDate+1 06:59:59]
 * 3. Check KHSX toàn diện: [StartTime trong 24h & EndTime trong 24h]
 */
export function computeKhsxChecks(startTimeStr, endTimeStr, applyDateStr) {
  const startDjs = parseDateTimeFlexible(startTimeStr)
  const endDjs = parseDateTimeFlexible(endTimeStr)
  const applyDjs = parseDateTimeFlexible(applyDateStr)

  let opDateKhsx = ''
  if (startDjs && startDjs.isValid()) {
    opDateKhsx = startDjs.format('DD/MM/YYYY')
  }

  if (!applyDjs || !applyDjs.isValid()) {
    return {
      opDateKhsx,
      checkKhsxStart: 'KHSX',
      checkKhsxFull: 'KHSX'
    }
  }

  // Khung chu kỳ 24h KHSX: từ ApplyDate 07:00:00 đến (ApplyDate + 1) 06:59:59 (hoặc 07:00:00)
  const windowStart = applyDjs.clone().startOf('day').hour(7).minute(0).second(0)
  const windowEndStart = applyDjs.clone().startOf('day').add(1, 'day').hour(6).minute(59).second(59)
  const windowEndFull = applyDjs.clone().startOf('day').add(1, 'day').hour(7).minute(0).second(0)

  let checkKhsxStart = 'Sai ngày KHSX'
  let checkKhsxFull = 'Sai ngày KHSX'

  if (startDjs && startDjs.isValid()) {
    const isStartValid =
      (startDjs.isAfter(windowStart) || startDjs.isSame(windowStart)) &&
      (startDjs.isBefore(windowEndStart) || startDjs.isSame(windowEndStart))

    if (isStartValid) {
      checkKhsxStart = 'KHSX'
    }

    if (endDjs && endDjs.isValid()) {
      const isEndValid =
        (endDjs.isAfter(startDjs) || endDjs.isSame(startDjs)) &&
        (endDjs.isBefore(windowEndFull) || endDjs.isSame(windowEndFull))

      if (isStartValid && isEndValid) {
        checkKhsxFull = 'KHSX'
      }
    } else if (isStartValid) {
      checkKhsxFull = 'KHSX'
    }
  }

  return {
    opDateKhsx,
    checkKhsxStart,
    checkKhsxFull
  }
}

/**
 * Tự động gán 3 cột tính toán KHSX vào từng dòng của Tab 3 (Tổng hợp lệnh thao tác) để view ngay trên bảng
 */
export function enrichSummaryOpDataWithKhsxChecks(summaryOpData = [], applyDateStr = '') {
  if (!Array.isArray(summaryOpData) || summaryOpData.length === 0) return []

  return summaryOpData.map((row) => {
    const startTime =
      row.PlannedStartTime ??
      row.StartTime ??
      row['Thời gian bắt đầu (5)'] ??
      row['Thời gian bắt đầu\r\n(5)'] ??
      row['Thời gian bắt đầu\n(5)'] ??
      row['Thời gian bắt đầu'] ??
      row['Bắt đầu'] ??
      ''
    const endTime =
      row.PlannedEndTime ??
      row.EndTime ??
      row['Thời gian kết thúc (6)'] ??
      row['Thời gian kết thúc\r\n(6)'] ??
      row['Thời gian kết thúc\n(6)'] ??
      row['Thời gian kết thúc'] ??
      row['Kết thúc'] ??
      ''

    const checks = computeKhsxChecks(startTime, endTime, applyDateStr)

    return {
      ...row,
      KhsxOpDate: checks.opDateKhsx,
      CheckKhsxStart: checks.checkKhsxStart,
      CheckKhsx: checks.checkKhsxFull
    }
  })
}

/**
 * Động cơ tính toán đối soát Kết quả KHSX (Tab 6):
 * - Lọc các dòng thỏa mãn KHSX trong Tab 3 (theo đúng Ngày báo cáo KHSX ở Master)
 * - Lấy danh sách DUY NHẤT theo Số lệnh thao tác (Deduplication)
 * - Đổ ra đúng 24 cột chuẩn mực
 */
export const calculateKHSX = (files = {}, masterInfo = {}) => {
  const applyDate = masterInfo.applyDate || files.masterInfo?.applyDate || dayjs().format('YYYY-MM-DD')
  const unfinishedOpData = files.unfinished_op?.data || []
  const summaryOpData = files.summary_op?.data || []
  const statReportData = files.stat_report?.data || []

  // 0. TRA CỨU TỪ TAB 2 (LỆNH THAO TÁC CHƯA HOÀN THÀNH) THEO SỐ LỆNH THAO TÁC
  const unfinishedMap = new Map()
  unfinishedOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row['Số lệnh thao tác'] ??
        row['Lệnh thao tác'] ??
        row.OperationOrder ??
        ''
    )
    if (code && !unfinishedMap.has(code)) {
      unfinishedMap.set(code, row)
    }
  })

  // 1. TỔNG HỢP THỰC TẾ SẢN XUẤT TỪ TAB 1 THEO LỆNH THAO TÁC (SUM SỐ LƯỢNG ĐẠT)
  const actualStatsMap = new Map()

  const getCleanCode = (row) => {
    const raw =
      row.OperationOrderNo ??
      row.OperationNo ??
      row.PlannedOperationOrderNo ??
      row['Số lệnh thao tác'] ??
      row['Số lệnh thao tác\r\n'] ??
      row['Số lệnh thao tác\n'] ??
      row['Lệnh thao tác'] ??
      row['Lệnh TT'] ??
      row['Số lệnh TT'] ??
      row['Mã lệnh thao tác'] ??
      row.OperationOrder ??
      row.OpOrderNo ??
      ''
    return normalizeCode(raw)
  }

  const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0
    const str = String(val).replace(/,/g, '').trim()
    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
  }

  statReportData.forEach((row) => {
    const code = getCleanCode(row)
    if (!code) return

    const produced = parseNum(
      row.ProducedQty ??
        row['Số lượng sản xuất'] ??
        row['Số lượng sản xuất\r\n'] ??
        row['Số lượng sản xuất\n'] ??
        row['SL sản xuất'] ??
        row['Số lượng thực hiện'] ??
        row['Số lượng TK sản xuất (11)'] ??
        0
    )

    const qualified = parseNum(
      row.QualifiedQty ??
        row['Số lượng đạt'] ??
        row['Số lượng đạt\r\n'] ??
        row['Số lượng đạt\n'] ??
        row['Số lượng đạt (12)'] ??
        row['SL đạt'] ??
        row['SL Đạt'] ??
        row['SL Đạt (12)'] ??
        row['Số lượng thống kê đạt (12)'] ??
        row['Số lượng thống kê đạt'] ??
        row.ActualQualifiedQty ??
        produced ??
        0
    )

    const defect = parseNum(
      row.DefectQty ??
        row['Số lượng lỗi'] ??
        row['Số lượng hỏng'] ??
        row['SL lỗi'] ??
        row['Số lượng thống kê lỗi (13)=(11)-(12)'] ??
        0
    )

    let runTimeMin = parseNum(
      row.ActualRunTime ??
        row['Thời gian chạy thực tế'] ??
        row['Thời gian chạy (phút)'] ??
        row['Thời gian sản xuất'] ??
        0
    )

    if (runTimeMin === 0) {
      const sVal = row.StartTime ?? row['Bắt đầu'] ?? row['Thời gian bắt đầu'] ?? ''
      const eVal = row.EndTime ?? row['Kết thúc'] ?? row['Thời gian kết thúc'] ?? ''
      const dt = parseNum(
        row.TotalDowntimeMinutes ??
          row['Tổng tg hao phí\r\n(5)=1+2+3+4'] ??
          row['Tổng tg hao phí\n(5)=1+2+3+4'] ??
          row['Tổng tg hao phí (5)=1+2+3+4'] ??
          row['Tổng tg hao phí'] ??
          0
      )
      const parseTimeToMinutes = (tVal) => {
        if (!tVal) return null
        const m = String(tVal).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i)
        if (m) {
          let h = parseInt(m[1], 10)
          const min = parseInt(m[2], 10)
          const ampm = m[4] ? m[4].toUpperCase() : ''
          if (ampm === 'PM' && h < 12) h += 12
          if (ampm === 'AM' && h === 12) h = 0
          return h * 60 + min
        }
        return null
      }
      const sMin = parseTimeToMinutes(sVal)
      const eMin = parseTimeToMinutes(eVal)
      if (sMin !== null && eMin !== null) {
        let diff = eMin - sMin
        if (diff < 0) diff += 1440
        runTimeMin = Math.max(0, Number((diff - dt).toFixed(2)))
      }
    }

    // Khóa chính xác
    if (!actualStatsMap.has(code)) {
      actualStatsMap.set(code, {
        produced: 0,
        qualified: 0,
        defect: 0,
        runTimeMin: 0,
        ticketCount: 0
      })
    }
    const current = actualStatsMap.get(code)
    current.produced += produced
    current.qualified += qualified
    current.defect += defect
    current.runTimeMin += runTimeMin
    current.ticketCount += 1

    // Khóa rút gọn (loại bỏ phần trong ngoặc đơn nếu có: TT2608-2117(711) -> TT2608-2117)
    const baseCode = code.replace(/\s*\(.*?\)/g, '').trim()
    if (baseCode && baseCode !== code) {
      if (!actualStatsMap.has(baseCode)) {
        actualStatsMap.set(baseCode, {
          produced: 0,
          qualified: 0,
          defect: 0,
          runTimeMin: 0,
          ticketCount: 0
        })
      }
      const baseCur = actualStatsMap.get(baseCode)
      baseCur.produced += produced
      baseCur.qualified += qualified
      baseCur.defect += defect
      baseCur.runTimeMin += runTimeMin
      baseCur.ticketCount += 1
    }
  })

  // 2. LỌC DANH SÁCH THỎA MÃN KHSX THEO NGÀY BÁO CÁO VÀ LẤY DANH SÁCH DUY NHẤT THEO SỐ LỆNH THAO TÁC
  const uniqueOpOrdersMap = new Map()

  summaryOpData.forEach((row) => {
    const code = normalizeCode(
      row.OperationOrderNo ??
        row.PlannedOperationOrderNo ??
        row['Lệnh thao tác'] ??
        row['Số lệnh thao tác'] ??
        row['Số lệnh TT'] ??
        row.OperationOrder ??
        row.OpOrderNo ??
        ''
    )
    if (!code) return

    const startTime =
      row.PlannedStartTime ??
      row.StartTime ??
      row['Thời gian bắt đầu (5)'] ??
      row['Thời gian bắt đầu\r\n(5)'] ??
      row['Thời gian bắt đầu\n(5)'] ??
      row['Thời gian bắt đầu'] ??
      row['Bắt đầu'] ??
      ''
    const endTime =
      row.PlannedEndTime ??
      row.EndTime ??
      row['Thời gian kết thúc (6)'] ??
      row['Thời gian kết thúc\r\n(6)'] ??
      row['Thời gian kết thúc\n(6)'] ??
      row['Thời gian kết thúc'] ??
      row['Kết thúc'] ??
      ''

    // 1. Kiểm tra điều kiện KHSX theo ngày bắt đầu thuộc ca 24h của ngày master đăng ký
    const checks = computeKhsxChecks(startTime, endTime, applyDate)
    const isKhsxDate = checks.checkKhsxStart === 'KHSX'

    // BẮT BUỘC LỌC: Chỉ lấy các dòng có Thời gian bắt đầu thuộc ngày KHSX đăng ký
    if (!isKhsxDate) {
      return
    }

    // 2. LỌC BỎ TRÙNG LẶP: Đảm bảo lấy duy nhất 1 bản ghi đại diện cho Số lệnh thao tác
    if (!uniqueOpOrdersMap.has(code)) {
      uniqueOpOrdersMap.set(code, {
        row,
        startTime,
        endTime,
        checks
      })
    }
  })

  let totalPlannedQty = 0
  let totalTargetQty = 0
  let totalQualifiedQty = 0
  let totalPlannedMinutes = 0
  let totalActualMinutes = 0

  const calculatedRows = []

  // 3. ĐỔ DỮ LIỆU ĐÚNG 24 CỘT CHUẨN MỰC
  uniqueOpOrdersMap.forEach(({ row, startTime, endTime, checks }, code) => {
    const unfinRow = unfinishedMap.get(code) || {}

    // 1. PIC ĐP (Người phát hành lệnh thao tác)
    const picCoordinator = String(
      row.OrderIssuer ??
        row.PicCoordinator ??
        row['Người phát hành lệnh thao tác'] ??
        row['Người phát hành'] ??
        row['PIC ĐP'] ??
        row['PIC Điều phối'] ??
        row['Điều phối'] ??
        row.PIC ??
        row.Coordinator ??
        unfinRow.StatPerson ??
        ''
    ).trim()

    // 2. Số lệnh thao tác: code
    // 3. Ngày thực hiện thao tác
    const opDate =
      checks.opDateKhsx ||
      String(
        row.OperationDate ??
          row.KhsxOpDate ??
          row['Ngày KHSX thao tác'] ??
          row['Ngày thực hiện thao tác'] ??
          row['Ngày thao tác'] ??
          unfinRow.ExecuteDate ??
          ''
      ).trim()

    // 4. Số lệnh công đoạn
    const stageOrderNo = String(
      row.StageOrderNo ??
        unfinRow.StageOrderNo ??
        row['Lệnh công đoạn'] ??
        row['Số lệnh công đoạn'] ??
        row['Số lệnh CĐ'] ??
        ''
    ).trim()

    // 5. Ngày tạo lệnh công đoạn
    const stageOrderCreatedDate = String(
      unfinRow.OrderCreatedDate ??
        row.OpOrderReleaseDate ??
        row.StageOrderCreatedDate ??
        row.StageOrderDate ??
        row['Ngày tạo lệnh'] ??
        row['Ngày phát hành lệnh thao tác'] ??
        row['Ngày tạo lệnh công đoạn'] ??
        row['Ngày lệnh công đoạn'] ??
        ''
    ).trim()

    // 6. Mã hàng
    const matCode = String(
      row.MaterialCode ??
        unfinRow.ProductCode ??
        row['Mã vật tư'] ??
        row['Mã hàng'] ??
        row['Mã SP'] ??
        ''
    ).trim()

    // 7. Tên hàng
    const matName = String(
      row.MaterialName ??
        unfinRow.ProductName ??
        row['Tên vật tư'] ??
        row['Tên hàng'] ??
        row['Tên sản phẩm'] ??
        ''
    ).trim()

    // 8. Thao tác (So sánh mã lệnh để lấy từ Tab 2 hoặc Tab 3)
    const opName = String(
      unfinRow.OperationName ??
        row.OperationName ??
        row.PlannedOperationTypeName ??
        row.PlannedOperationTypeCode ??
        row['Thao tác'] ??
        row['Tên thao tác'] ??
        ''
    ).trim()

    // 9. Phân loại thao tác
    const opTypeName = String(
      unfinRow.OperationType ??
        row.PlannedOperationTypeName ??
        row.OperationTypeName ??
        row['Tên phân loại thao tác'] ??
        row['Phân loại thao tác'] ??
        ''
    ).trim()

    // 10. Máy sản xuất (So sánh mã lệnh để lấy từ Tab 2 hoặc Tab 3)
    const machineName = String(
      unfinRow.MachineName ??
        row.PlannedMachineName ??
        row.MachineName ??
        row['Tên máy'] ??
        row['Máy sản xuất'] ??
        ''
    ).trim()

    // 11. Đvt
    const unit = String(row.Unit ?? unfinRow.Unit ?? row['ĐVT'] ?? row['Đvt'] ?? 'Pcs').trim()

    // 12. Số lượng cần đạt LTT
    const targetQty =
      parseFloat(
        String(
          row.TargetQty ??
            unfinRow.TargetQty ??
            row.OpTargetQty ??
            row['Số lượng cần đạt (2)'] ??
            row['Số lượng cần đạt\r\n(2)'] ??
            row['Số lượng cần đạt\n(2)'] ??
            row['Số lượng cần đạt LTT'] ??
            row['Số lượng cần đạt'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // 13. Số lượng cần sản xuất
    const plannedQty =
      parseFloat(
        String(
          row.PlannedQty ??
            unfinRow.PlannedQty ??
            row.OpPlannedQty ??
            row['Số lượng cần sx (1)'] ??
            row['Số lượng cần sx\r\n(1)'] ??
            row['Số lượng cần sx\n(1)'] ??
            row['Số lượng cần sản xuất'] ??
            0
        ).replace(/,/g, '')
      ) || 0

    // 14. Số lượng đã thống kê đạt (Khớp thực tế từ Tab 1 Thống kê sản xuất)
    const baseCode = code.replace(/\s*\(.*?\)/g, '').trim()
    const actual = actualStatsMap.get(code) || actualStatsMap.get(baseCode) || {
      produced: 0,
      qualified: 0,
      defect: 0,
      runTimeMin: 0
    }

    let actualQualified = actual.qualified
    if (actualQualified === 0 && unfinRow.StatQty !== undefined && unfinRow.StatQty !== null && unfinRow.StatQty !== '') {
      actualQualified = parseNum(unfinRow.StatQty ?? unfinRow['Số lượng đã thống kê'] ?? 0)
    }

    let actualRunMin = actual.runTimeMin
    if (actualRunMin === 0 && unfinRow.ProductionDurationMinutes !== undefined && unfinRow.ProductionDurationMinutes !== null) {
      actualRunMin = parseNum(unfinRow.ProductionDurationMinutes)
    }

    // 15. Thời gian bắt đầu: startTime
    // 16. Thời gian kết thúc: endTime

    // 17. Thời gian sản xuất theo ĐM (phút) =+IF(OR(O3="";P3="");"";ROUND((P3-O3)*1440;0))
    let standardRunMin = 0
    if (startTime && endTime) {
      const sDjs = parseDateTimeFlexible(startTime)
      const eDjs = parseDateTimeFlexible(endTime)
      if (sDjs && eDjs && eDjs.isValid() && sDjs.isValid()) {
        const diffMs = eDjs.diff(sDjs)
        if (diffMs > 0) {
          standardRunMin = Math.round(diffMs / 60000)
        }
      }
    }
    if (standardRunMin === 0) {
      if (row.StandardRunMinutes !== undefined && row.StandardRunMinutes !== null && row.StandardRunMinutes !== '') {
        standardRunMin = parseFloat(String(row.StandardRunMinutes).replace(/,/g, '')) || 0
      } else if (row.PlannedTotalHours !== undefined && row.PlannedTotalHours !== null && row.PlannedTotalHours !== '') {
        standardRunMin = Math.round((parseFloat(String(row.PlannedTotalHours).replace(/,/g, '')) || 0) * 60)
      } else if (unfinRow.ProductionDurationMinutes !== undefined && unfinRow.ProductionDurationMinutes !== null && unfinRow.ProductionDurationMinutes !== '') {
        standardRunMin = parseFloat(String(unfinRow.ProductionDurationMinutes).replace(/,/g, '')) || 0
      }
    }

    // 18. Thời gian sản xuất thực tế (phút) = Tổng thời gian chạy thực tế từ Tab 1
    // 19. Capa ĐM = (Số lượng cần đạt / Thời gian ĐM phút) * 60 phút
    let standardCapa = 0
    if (standardRunMin > 0 && targetQty > 0) {
      standardCapa = Number(((targetQty / standardRunMin) * 60).toFixed(2))
    } else if (row.StandardCapa !== undefined && row.StandardCapa !== null && row.StandardCapa !== '') {
      standardCapa = parseFloat(String(row.StandardCapa).replace(/,/g, '')) || 0
    }

    // 20. Capa thực tế = (Tổng số lượng đạt / Tổng thời gian chạy thực tế phút) * 60 phút
    let actualCapa = 0
    if (actualRunMin > 0 && actualQualified > 0) {
      actualCapa = Number(((actualQualified * 60) / actualRunMin).toFixed(2))
    }

    // 24. KHSX status
    const khsxStatus = checks.checkKhsxFull || 'KHSX'

    // 21. Trạng thái ĐP - SX
    // Công thức: =IF(OR(X3<>"KHSX";O3<INT($Y$2)+TIME(7;0;0);O3>=INT($Y$2)+1+TIME(7;0;0));"SX sai ngày KH";IF(N3=0;"Trượt KH";IF(OR(AND(N3>=L3;N3<=M3);ABS(L3-N3)<=N3*5%);"Khớp số lượng";"Khớp job")))
    let isTimeInsideShift = true
    if (startTime && applyDate) {
      const sDjs = parseDateTimeFlexible(startTime)
      const applyDjs = parseDateTimeFlexible(applyDate)
      if (sDjs && sDjs.isValid() && applyDjs && applyDjs.isValid()) {
        const wStart = applyDjs.clone().startOf('day').hour(7).minute(0).second(0)
        const wEnd = applyDjs.clone().startOf('day').add(1, 'day').hour(7).minute(0).second(0)
        isTimeInsideShift = (sDjs.isAfter(wStart) || sDjs.isSame(wStart)) && sDjs.isBefore(wEnd)
      }
    }

    let coordinatorStatus = 'SX sai ngày KH'
    if (khsxStatus !== 'KHSX' || !isTimeInsideShift) {
      coordinatorStatus = 'SX sai ngày KH'
    } else if (actualQualified === 0) {
      coordinatorStatus = 'Trượt KH'
    } else {
      const isQtyMatched =
        (actualQualified >= targetQty && actualQualified <= plannedQty) ||
        Math.abs(targetQty - actualQualified) <= actualQualified * 0.05

      coordinatorStatus = isQtyMatched ? 'Khớp số lượng' : 'Khớp job'
    }

    // 22. Trạng thái thời gian
    let timeStatus = 'Đạt TG'
    if (actualRunMin > 0 && standardRunMin > 0) {
      if (actualRunMin > standardRunMin) {
        timeStatus = 'Vượt TG'
      } else if (actualRunMin < standardRunMin * 0.9) {
        timeStatus = 'Tiết kiệm TG'
      }
    }

    // 23. Trạng thái capa
    let capaStatus = 'Đạt Capa'
    if (actualCapa > 0 && standardCapa > 0) {
      if (actualCapa < standardCapa * 0.95) {
        capaStatus = 'Không đạt Capa'
      } else if (actualCapa > standardCapa * 1.05) {
        capaStatus = 'Vượt Capa'
      }
    }

    totalPlannedQty += plannedQty
    totalTargetQty += targetQty
    totalQualifiedQty += actualQualified
    totalPlannedMinutes += standardRunMin
    totalActualMinutes += actualRunMin

    calculatedRows.push({
      // 1. Schema Keys chuẩn (RESULT_KHSX_COLUMN_SCHEMA)
      PicCoordinator: picCoordinator,
      OperationOrderNo: code,
      OperationDate: opDate,
      StageOrderNo: stageOrderNo,
      StageOrderCreatedDate: stageOrderCreatedDate,
      MaterialCode: matCode,
      MaterialName: matName,
      OperationName: opName,
      OperationTypeName: opTypeName,
      MachineName: machineName,
      Unit: unit,
      OpTargetQty: targetQty,
      OpPlannedQty: plannedQty,
      ActualQualifiedQty: actualQualified,
      StartTime: startTime,
      EndTime: endTime,
      StandardRunMinutes: standardRunMin > 0 ? standardRunMin : '',
      ActualRunMinutes: actualRunMin > 0 ? actualRunMin : '',
      StandardCapa: standardCapa > 0 ? standardCapa : '',
      ActualCapa: actualCapa > 0 ? actualCapa : '',
      CoordinatorStatus: coordinatorStatus,
      TimeStatus: timeStatus,
      CapaStatus: capaStatus,
      KhsxStatus: khsxStatus,

      // 2. Tiếng Việt trực tiếp (phòng ngừa grid binding theo title)
      'PIC ĐP': picCoordinator,
      'Số lệnh thao tác': code,
      'Ngày thực hiện thao tác': opDate,
      'Số lệnh công đoạn': stageOrderNo,
      'Ngày tạo lệnh công đoạn': stageOrderCreatedDate,
      'Mã hàng': matCode,
      'Tên hàng': matName,
      'Thao tác': opName,
      'Phân loại thao tác': opTypeName,
      'Máy sản xuất': machineName,
      'Đvt': unit,
      'Số lượng cần đạt LTT': targetQty,
      'Số lượng cần sản xuất': plannedQty,
      'Số lượng đã thống kê đạt': actualQualified,
      'Thời gian bắt đầu': startTime,
      'Thời gian kết thúc': endTime,
      'Thời gian sản xuất theo ĐM': standardRunMin > 0 ? standardRunMin : '',
      'Thời gian sản xuất': actualRunMin > 0 ? actualRunMin : '',
      'Capa ĐM': standardCapa > 0 ? standardCapa : '',
      'Capa thực tế': actualCapa > 0 ? actualCapa : '',
      'Trạng thái ĐP - SX': coordinatorStatus,
      'Trạng thái thời gian': timeStatus,
      'Trạng thái capa': capaStatus,
      'KHSX': khsxStatus,

      // 3. Aliases tương thích khác
      PicDp: picCoordinator,
      OperationNo: code,
      OpDate: opDate,
      RoutingDocNo: stageOrderNo,
      RoutingDocDate: stageOrderCreatedDate,
      ItemCode: matCode,
      ItemName: matName,
      OpTypeName: opTypeName,
      TargetPassQty: targetQty,
      TargetProdQty: plannedQty,
      StatPassQty: actualQualified,
      StandardProdTime: standardRunMin > 0 ? standardRunMin : '',
      ActualProdTime: actualRunMin > 0 ? actualRunMin : '',
      StatusDpSx: coordinatorStatus,
      KhsxCheck: khsxStatus
    })
  })

  return {
    totalPlannedQty,
    totalTargetQty,
    totalQualifiedQty,
    totalPlannedHours: Number((totalPlannedMinutes / 60).toFixed(2)),
    totalActualHours: Number((totalActualMinutes / 60).toFixed(2)),
    totalOrders: calculatedRows.length,
    columns: RESULT_KHSX_COLUMN_SCHEMA,
    calculatedRows
  }
}

export default {
  parseDateTimeFlexible,
  computeKhsxChecks,
  enrichSummaryOpDataWithKhsxChecks,
  calculateKHSX
}
