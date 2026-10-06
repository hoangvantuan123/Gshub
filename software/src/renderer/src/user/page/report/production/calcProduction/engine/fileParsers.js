/**
 * Module phân tích & chuẩn hóa file Excel/CSV/JSON cho toàn bộ 4 loại file kiến trúc:
 * 1. Thống Kê Sản Xuất (stat_report)
 * 2. Lệnh Thao Tác Chưa Hoàn Thành (unfinished_op)
 * 3. Tổng Hợp Lệnh Thao Tác (summary_op)
 * 4. Duyệt Sản Lượng MES (mes_approval)
 *
 * Xử lý chính xác:
 * - Tự động nhận diện Header 1 tầng hoặc 2 tầng (Merged Header)
 * - Đọc TOÀN BỘ dữ liệu không sót bất kỳ dòng nào (không lọc nhầm dữ liệu có chữ "Thao tác")
 * - Khớp 1-1 từng ô dữ liệu với đúng cột
 * - Định dạng số serial ngày tháng Excel (VD: 46261 -> 27/08/2026)
 */
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import {
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  ARCHITECTURE_FILE_TYPES,
  TAB_DEFINITIONS
} from '../constants/calcConstants'

// Cấu hình từ khóa đặc trưng nhận diện riêng biệt cho từng loại file trong 4 tab
export const TAB_SIGNATURES = {
  [ARCHITECTURE_FILE_TYPES.STAT_REPORT]: {
    id: ARCHITECTURE_FILE_TYPES.STAT_REPORT,
    title: '1. Thống Kê Sản Xuất',
    specificKeywords: [
      'thợ chính',
      'thợ phụ 1',
      'thợ phụ 2',
      'số phiếu thống kê',
      'nhân viên thống kê',
      'thời gian lãng phí',
      'hỏng máy/mất điện',
      'chờ nvl',
      'chuẩn bị',
      'kẽm uv',
      'sl lên khuôn',
      'số mét thực tế',
      'số mét định mức',
      'check khsx',
      'độ trễ thời gian đồng bộ',
      'trọng lượng sp/lề ng',
      'trọng lượng lề kỹ thuật',
      'mã loại kết cầu',
      'tên loại kết cầu'
    ]
  },
  [ARCHITECTURE_FILE_TYPES.UNFINISHED_OP]: {
    id: ARCHITECTURE_FILE_TYPES.UNFINISHED_OP,
    title: '2. Lệnh TT Chưa Hoàn Thành',
    specificKeywords: [
      'số so',
      'số lượng cần đạt',
      'số lượng cần sản xuất',
      'số lượng đã thống kê',
      'số lượng còn lại',
      'thời gian sản xuất (phút)',
      'thông tin tình trạng sản xuất',
      'thông tin nvl',
      'thông tin màng',
      'ngày cần giao trên đơn',
      'ngày giao hàng thống nhất',
      'số part khuôn',
      'đã out kẽm',
      'sl kẽm thường',
      'sl kẽm pha',
      'đơn hàng bán chi tiết',
      'phân loại tt (nhóm mẹ)',
      'mức độ kiểm soát'
    ]
  },
  [ARCHITECTURE_FILE_TYPES.SUMMARY_OP]: {
    id: ARCHITECTURE_FILE_TYPES.SUMMARY_OP,
    title: '3. Tổng Hợp Lệnh Thao Tác',
    specificKeywords: [
      'định mức capa',
      'capa thực tế',
      'hiệu suất oee',
      'oee',
      'thời gian chạy',
      'thời gian dừng',
      'sl kế hoạch',
      'sl thực hiện'
    ]
  },
  [ARCHITECTURE_FILE_TYPES.MES_APPROVAL]: {
    id: ARCHITECTURE_FILE_TYPES.MES_APPROVAL,
    title: '4. Duyệt Sản Lượng MES',
    specificKeywords: ['số phiếu duyệt', 'phiếu duyệt', 'người duyệt', 'thời gian duyệt']
  }
}

// Danh sách từ khóa nhận diện dòng Header
const HEADER_KEYWORDS = [
  'khách hàng',
  'số so',
  'người thống kê',
  'số lệnh',
  'lệnh thao tác',
  'lệnh công đoạn',
  'ngày tạo',
  'ngày thực hiện',
  'mã hàng',
  'tên hàng',
  'thao tác',
  'nhóm công đoạn',
  'phân loại',
  'quy cách',
  'máy sản xuất',
  'đvt',
  'số lượng',
  'thời gian',
  'qtcn',
  'tình trạng',
  'thông tin',
  'đơn hàng',
  'thợ chính',
  'thợ phụ',
  'mã vật tư',
  'tên vật tư',
  'phiếu duyệt',
  'sản lượng',
  'người duyệt',
  'oee',
  'capa',
  'chi tiết'
]

// Từ khóa kiểm tra dòng Sub-Header con
const SUB_HEADER_KEYWORDS = [
  'họ tên',
  'bắt đầu',
  'kết thúc',
  'số lượng',
  'mã vật tư',
  'tên vật tư',
  'số lượng đạt',
  'số lượng lỗi',
  'số lượng cần',
  'đvt',
  'thực tế',
  'kế hoạch'
]

/**
 * Trích xuất toàn bộ chuỗi tiêu đề từ các dòng đầu của file
 */
const extractHeaderTokens = (rawRows) => {
  const tokens = []
  for (let r = 0; r < Math.min(6, rawRows.length); r++) {
    const row = rawRows[r]
    if (Array.isArray(row)) {
      row.forEach((cell) => {
        if (cell !== null && cell !== undefined && cell !== '') {
          tokens.push(String(cell).toLowerCase().trim())
        }
      })
    }
  }
  return tokens
}

/**
 * Kiểm tra và xác thực file tải lên có đúng với Tab hiện tại hay không
 */
export const validateFileTypeMatch = (rawRows, expectedFileType) => {
  const tokens = extractHeaderTokens(rawRows)
  const combinedText = tokens.join(' ')

  const scores = {}
  let maxScore = 0
  let bestTabId = null

  Object.entries(TAB_SIGNATURES).forEach(([tabId, tabSig]) => {
    let score = 0
    tabSig.specificKeywords.forEach((kw) => {
      if (combinedText.includes(kw)) {
        score++
      }
    })
    scores[tabId] = score
    if (score > maxScore) {
      maxScore = score
      bestTabId = tabId
    }
  })

  const expectedScore = scores[expectedFileType] || 0
  const expectedTitle = TAB_SIGNATURES[expectedFileType]?.title || expectedFileType

  // Trường hợp file khớp với Tab hiện tại
  const threshold =
    expectedFileType === ARCHITECTURE_FILE_TYPES.MES_APPROVAL ||
    expectedFileType === ARCHITECTURE_FILE_TYPES.SUMMARY_OP
      ? 1
      : 2
  if (expectedScore >= threshold) {
    return { valid: true, detectedType: expectedFileType }
  }

  // Trường hợp file rõ ràng là của 1 Tab khác trong 4 tab
  if (maxScore >= threshold && bestTabId && bestTabId !== expectedFileType) {
    const detectedTitle = TAB_SIGNATURES[bestTabId]?.title || bestTabId
    throw new Error(
      `File tải lên không đúng định dạng của Tab "${expectedTitle}"! Hệ thống nhận diện cấu trúc file này thuộc về "${detectedTitle}". Vui lòng chọn đúng Tab "${detectedTitle}" để tải file này.`
    )
  }

  // Trường hợp file hoàn toàn không phải bất kỳ báo cáo nào trong hệ thống
  if (maxScore === 0) {
    throw new Error(
      `File không hợp lệ! Các cột tiêu đề trong file không khớp với định dạng báo cáo của "${expectedTitle}". Vui lòng kiểm tra lại file Excel.`
    )
  }

  return { valid: true, detectedType: expectedFileType }
}

/**
 * Kiểm tra xem 1 dòng trong Excel có phải là dòng tiêu đề (Header) hay không
 */
const isHeaderLikeRow = (row) => {
  if (!Array.isArray(row)) return false
  const textCells = row.filter((c) => typeof c === 'string' && c.trim().length > 0)
  if (textCells.length === 0) return false

  let matchCount = 0
  textCells.forEach((text) => {
    const lower = text.toLowerCase()
    if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) {
      matchCount++
    }
  })

  return matchCount >= 2 || (textCells.length <= 4 && matchCount >= 1)
}

/**
 * Kiểm tra xem 1 dòng có phải là dòng Dữ Liệu thực tế (Data Row) hay không
 */
const isActualDataRow = (row) => {
  if (!Array.isArray(row) || row.length === 0) return false
  const nonEmpty = row.filter((c) => c !== '' && c !== null && c !== undefined)
  if (nonEmpty.length === 0) return false

  let dataPatternCount = 0
  nonEmpty.forEach((c) => {
    const str = String(c).trim()
    // Nhận diện mã lệnh TT/CD/SO/PO
    if (
      /^(TT|CD|SO|PO|REG|SA)\d+/i.test(str) ||
      str.includes('(170)') ||
      str.includes('(964)') ||
      str.includes('(165)') ||
      str.includes('(163)') ||
      str.includes('(161)') ||
      str.includes('(159)') ||
      str.includes('(157)') ||
      str.includes('CD05-')
    ) {
      dataPatternCount += 2
    }
    // Nhận diện mã sản phẩm / mã vật tư
    if (
      /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-\d+/i.test(str) ||
      /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}/i.test(str)
    ) {
      dataPatternCount += 2
    }
    // Số lượng lớn
    const num = typeof c === 'number' ? c : parseFloat(str.replace(/,/g, ''))
    if (!isNaN(num) && num > 10) {
      dataPatternCount += 1
    }
    // Excel date float
    if (!isNaN(num) && num > 40000 && num < 60000) {
      dataPatternCount += 2
    }
  })

  return dataPatternCount >= 2
}

/**
 * Chuyển đổi số serial ngày của Excel (VD: 46261) sang chuỗi DD/MM/YYYY
 */
const formatExcelDate = (serial) => {
  if (typeof serial !== 'number' || isNaN(serial) || serial < 30000 || serial > 70000) {
    return serial
  }
  try {
    const date = new Date((serial - 25569) * 86400 * 1000)
    return dayjs(date).format('DD/MM/YYYY')
  } catch {
    return serial
  }
}

export const parseUploadedFile = async (file, fileType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })

        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Đọc ma trận dữ liệu 2 chiều
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

        if (!rawRows || rawRows.length === 0) {
          throw new Error('File không có dữ liệu')
        }

        // Kiểm tra tính hợp lệ và xác thực định dạng file so với Tab hiện tại
        validateFileTypeMatch(rawRows, fileType)

        const tabDef = TAB_DEFINITIONS.find((t) => t.id === fileType)
        const schemaList =
          tabDef?.columnsSchema ||
          (fileType === 'unfinished_op'
            ? UNFINISHED_OP_COLUMN_SCHEMA
            : fileType === 'summary_op'
              ? SUMMARY_OP_COLUMN_SCHEMA
              : fileType === 'mes_approval'
                ? MES_APPROVAL_COLUMN_SCHEMA
                : STAT_REPORT_COLUMN_SCHEMA)

        // Lấy thông tin merged cells từ worksheet
        const merges = worksheet['!merges'] || []

        // ── 1. XÁC ĐỊNH VỊ TRÍ DÒNG HEADER VÀ BẮT ĐẦU DATA ──
        let headerRow0Idx = 0
        let isTwoTier = false
        let dataStartRow = 1

        for (let r = 0; r < Math.min(6, rawRows.length); r++) {
          if (isHeaderLikeRow(rawRows[r])) {
            headerRow0Idx = r
            break
          }
        }

        const nextRowIdx = headerRow0Idx + 1
        if (nextRowIdx < rawRows.length) {
          const nextRow = rawRows[nextRowIdx]
          const isNextData = isActualDataRow(nextRow)

          const hasSubWords = (nextRow || []).some((c) => {
            const str = String(c || '')
              .toLowerCase()
              .trim()
            return SUB_HEADER_KEYWORDS.some((kw) => str.includes(kw))
          })

          const nextRowNonEmptyCount = (nextRow || []).filter(
            (c) => c !== '' && c !== null && c !== undefined
          ).length
          const row0NonEmptyCount = (rawRows[headerRow0Idx] || []).filter(
            (c) => c !== '' && c !== null && c !== undefined
          ).length

          // Nếu dòng kế tiếp KHÔNG phải là data thực tế VÀ (có từ khóa sub-header HOẶC phần lớn ô bị trống do gộp cột)
          if (
            !isNextData &&
            (hasSubWords ||
              (nextRowNonEmptyCount > 0 && nextRowNonEmptyCount <= row0NonEmptyCount * 0.8))
          ) {
            isTwoTier = true
            dataStartRow = headerRow0Idx + 2
          } else {
            isTwoTier = false
            dataStartRow = headerRow0Idx + 1
          }
        }

        // Tính số lượng cột tối đa trong sheet
        let maxCols = 0
        rawRows.forEach((r) => {
          if (Array.isArray(r)) {
            maxCols = Math.max(maxCols, r.length)
          }
        })

        // Tạo bản đồ tra cứu Merged Cells cho các dòng Header
        const mergeMap = {}
        merges.forEach((m) => {
          if (m.s.r <= headerRow0Idx + (isTwoTier ? 1 : 0)) {
            const topVal = String(rawRows[m.s.r]?.[m.s.c] || '').trim()
            for (let r = m.s.r; r <= m.e.r; r++) {
              for (let c = m.s.c; c <= m.e.c; c++) {
                mergeMap[`${r}_${c}`] = topVal
              }
            }
          }
        })

        const row0 = (rawRows[headerRow0Idx] || []).map((c, cIdx) => {
          const val = String(c || '').trim()
          return val || mergeMap[`${headerRow0Idx}_${cIdx}`] || ''
        })

        const row1 = isTwoTier
          ? (rawRows[headerRow0Idx + 1] || []).map((c, cIdx) => {
              const val = String(c || '').trim()
              return val || mergeMap[`${headerRow0Idx + 1}_${cIdx}`] || ''
            })
          : []

        // ── 2. XÂY DỰNG CỘT VÀ LOẠI BỎ CỘT ĐỆM RỖNG KHÔNG CÓ DỮ LIỆU ──
        const headerDefs = []
        const seenKeys = {}

        for (let c = 0; c < maxCols; c++) {
          const val0 = row0[c] || ''
          const val1 = isTwoTier ? row1[c] || '' : ''

          // Kiểm tra xem cột c có bất kỳ dữ liệu nào trong toàn bộ bảng không
          let hasColumnData = false
          for (let r = dataStartRow; r < rawRows.length; r++) {
            const cellVal = rawRows[r]?.[c]
            if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
              hasColumnData = true
              break
            }
          }

          // Nếu cột không có tiêu đề và cũng không có bất kỳ dòng data nào -> Bỏ qua cột đệm rỗng
          if (!val0 && !val1 && !hasColumnData) {
            continue
          }

          let colTitle = ''
          let colGroup = ''

          if (isTwoTier) {
            if (val0 && val1) {
              if (val0 === val1) {
                colTitle = val0
                colGroup = ''
              } else {
                colTitle = val1
                colGroup = val0
              }
            } else if (val0 && !val1) {
              colTitle = val0
              colGroup = ''
            } else if (!val0 && val1) {
              colTitle = val1
              colGroup = ''
            } else {
              colTitle = `Cột_${c + 1}`
            }
          } else {
            colTitle = val0 || `Cột_${c + 1}`
          }

          const titleLower = colTitle.toLowerCase()
          const groupLower = colGroup.toLowerCase()

          let resolvedKey = ''
          let resolvedTitle = colTitle

          // Phân giải cột Thợ chính, Thợ phụ 1, Thợ phụ 2 (Tránh trùng key Họ tên)
          if (titleLower.includes('họ tên') || titleLower === 'họ tên') {
            if (groupLower.includes('chính')) {
              resolvedKey = 'LeadTechnicianName'
              resolvedTitle = 'Họ tên'
            } else if (groupLower.includes('phụ 1')) {
              resolvedKey = 'AssistantWorker1Name'
              resolvedTitle = 'Họ tên'
            } else if (groupLower.includes('phụ 2')) {
              resolvedKey = 'AssistantWorker2Name'
              resolvedTitle = 'Họ tên'
            } else {
              resolvedKey = `TechnicianName_${c}`
            }
          }
          // Phân giải Đơn hàng bán chi tiết > Số lượng
          else if (
            groupLower.includes('đơn hàng') &&
            (titleLower.includes('số lượng') || titleLower === 'số lượng')
          ) {
            resolvedKey = 'DetailQty'
            resolvedTitle = 'Số lượng'
          }
          // Tìm khớp trong Schema
          else {
            const matched = schemaList.find((s) => {
              const sLower = s.title.toLowerCase()
              return (
                sLower === titleLower ||
                (sLower.includes(titleLower) && titleLower.length > 3) ||
                (titleLower.includes(sLower) && sLower.length > 3)
              )
            })

            if (matched) {
              resolvedKey = matched.key
              resolvedTitle = matched.title || colTitle
            } else {
              resolvedKey = colTitle.replace(/[\s/\\()+-]+/g, '_')
            }
          }

          if (seenKeys[resolvedKey]) {
            resolvedKey = `${resolvedKey}_${c}`
          }
          seenKeys[resolvedKey] = true

          headerDefs.push({
            origIndex: c,
            key: resolvedKey,
            title: resolvedTitle,
            group: colGroup
          })
        }

        const finalColumns = headerDefs.map((h) => ({
          id: h.key,
          key: h.key,
          title: h.title,
          group: h.group || ''
        }))

        // ── 3. ĐẨY TOÀN BỘ DỮ LIỆU TỪNG DÒNG VÀO DATA OBJECT NGUYÊN BẢN ──
        const parsedRows = []

        for (let r = dataStartRow; r < rawRows.length; r++) {
          const row = rawRows[r]
          if (!row || !Array.isArray(row)) continue

          // Chỉ bỏ qua nếu dòng hoàn toàn trống (tất cả các ô đều rỗng)
          const hasAnyCell = row.some((c) => c !== '' && c !== null && c !== undefined)
          if (!hasAnyCell) continue

          const rowObj = {}

          headerDefs.forEach(({ origIndex, key, title }) => {
            let val = row[origIndex] !== undefined && row[origIndex] !== null ? row[origIndex] : ''

            if (typeof val === 'string') {
              val = val.trim()
            }

            // Tự động định dạng số serial ngày Excel (VD: 46261 -> 27/08/2026) nếu cột là Ngày
            if (
              (title.toLowerCase().includes('ngày') || key.toLowerCase().includes('date')) &&
              typeof val === 'number'
            ) {
              val = formatExcelDate(val)
            }

            // Gán dữ liệu chính xác theo English Key và Tiếng Việt hiển thị
            rowObj[key] = val
            rowObj[title] = val

            // Aliases tương thích
            if (key === 'LeadTechnicianName') {
              rowObj['Thợ chính'] = val
              rowObj['Họ tên thợ chính'] = val
            } else if (key === 'AssistantWorker1Name') {
              rowObj['Thợ phụ 1'] = val
              rowObj['Họ tên thợ phụ 1'] = val
            } else if (key === 'AssistantWorker2Name') {
              rowObj['Thợ phụ 2'] = val
              rowObj['Họ tên thợ phụ 2'] = val
            }
          })

          parsedRows.push(rowObj)
        }

        resolve({
          fileName: file.name,
          fileSize: file.size,
          rowCount: parsedRows.length,
          columns: finalColumns,
          data: parsedRows,
          uploadedAt: new Date().toISOString()
        })
      } catch (err) {
        console.error('Lỗi đọc file Excel:', err)
        reject(new Error(`Không thể đọc file: ${err.message}`))
      }
    }

    reader.onerror = () => reject(new Error('Đọc file thất bại'))
    reader.readAsArrayBuffer(file)
  })
}
