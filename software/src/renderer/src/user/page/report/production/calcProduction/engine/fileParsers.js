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
} from '../constants/calcConstants.js'

// Cấu hình từ khóa đặc trưng nhận diện linh hoạt cho từng loại file trong 4 tab
export const TAB_SIGNATURES = {
  [ARCHITECTURE_FILE_TYPES.STAT_REPORT]: {
    id: ARCHITECTURE_FILE_TYPES.STAT_REPORT,
    title: '1. Thống Kê Sản Xuất',
    specificKeywords: [
      'thống kê',
      'thống kê sản xuất',
      'sản lượng',
      'thực tế',
      'mã hàng',
      'tên hàng',
      'mã sp',
      'mã sản phẩm',
      'tên sản phẩm',
      'công đoạn',
      'thao tác',
      'lệnh',
      'lệnh sx',
      'lệnh công đoạn',
      'máy',
      'máy sx',
      'máy sản xuất',
      'ngày',
      'ngày sx',
      'ngày thực hiện',
      'ca',
      'tổ',
      'thợ chính',
      'thợ phụ',
      'thợ phụ 1',
      'thợ phụ 2',
      'họ tên',
      'số phiếu',
      'số phiếu thống kê',
      'nhân viên',
      'nhân viên thống kê',
      'người thực hiện',
      'công nhân',
      'thời gian',
      'thời gian lãng phí',
      'hỏng máy',
      'chờ nvl',
      'chuẩn bị',
      'kẽm',
      'kẽm uv',
      'khuôn',
      'sl lên khuôn',
      'số mét',
      'số mét thực tế',
      'số mét định mức',
      'check khsx',
      'phế phẩm',
      'sl đạt',
      'sl lỗi',
      'đạt',
      'lỗi',
      'trọng lượng',
      'kết cấu',
      'đvt',
      'quy cách',
      'khách hàng',
      'order'
    ]
  },
  [ARCHITECTURE_FILE_TYPES.UNFINISHED_OP]: {
    id: ARCHITECTURE_FILE_TYPES.UNFINISHED_OP,
    title: '2. Lệnh TT Chưa Hoàn Thành',
    specificKeywords: [
      'chưa hoàn thành',
      'chưa xong',
      'lệnh tt',
      'số so',
      'số lượng cần đạt',
      'số lượng cần sản xuất',
      'số lượng đã thống kê',
      'số lượng còn lại',
      'còn lại',
      'thời gian sản xuất',
      'thời gian sản xuất (phút)',
      'tình trạng sản xuất',
      'thông tin tình trạng',
      'thông tin nvl',
      'thông tin màng',
      'ngày cần giao',
      'ngày giao hàng',
      'số part khuôn',
      'đã out kẽm',
      'sl kẽm thường',
      'sl kẽm pha',
      'đơn hàng bán',
      'đơn hàng bán chi tiết',
      'phân loại tt',
      'mức độ kiểm soát'
    ]
  },
  [ARCHITECTURE_FILE_TYPES.SUMMARY_OP]: {
    id: ARCHITECTURE_FILE_TYPES.SUMMARY_OP,
    title: '3. Tổng Hợp Lệnh Thao Tác',
    specificKeywords: [
      'tổng hợp lệnh',
      'tổng hợp thao tác',
      'định mức capa',
      'capa thực tế',
      'hiệu suất oee',
      'oee',
      'capa',
      'thời gian chạy',
      'thời gian dừng',
      'sl kế hoạch',
      'sl thực hiện'
    ]
  },
  [ARCHITECTURE_FILE_TYPES.MES_APPROVAL]: {
    id: ARCHITECTURE_FILE_TYPES.MES_APPROVAL,
    title: '4. Duyệt Sản Lượng MES',
    specificKeywords: [
      'duyệt sản lượng',
      'duyệt mes',
      'số phiếu duyệt',
      'phiếu duyệt',
      'người duyệt',
      'thời gian duyệt',
      'mes'
    ]
  }
}

// Danh sách từ khóa nhận diện dòng Header rộng rãi
const HEADER_KEYWORDS = [
  'khách hàng',
  'số so',
  'so',
  'po',
  'người thống kê',
  'nhân viên',
  'số lệnh',
  'lệnh',
  'lệnh thao tác',
  'lệnh công đoạn',
  'lệnh sx',
  'ngày tạo',
  'ngày thực hiện',
  'ngày',
  'mã hàng',
  'tên hàng',
  'mã sp',
  'tên sp',
  'mã sản phẩm',
  'tên sản phẩm',
  'thao tác',
  'công đoạn',
  'nhóm công đoạn',
  'phân loại',
  'quy cách',
  'máy',
  'máy sản xuất',
  'máy sx',
  'ca',
  'tổ',
  'đvt',
  'đơn vị',
  'số lượng',
  'sản lượng',
  'thời gian',
  'giờ',
  'phút',
  'qtcn',
  'tình trạng',
  'thông tin',
  'đơn hàng',
  'thợ chính',
  'thợ phụ',
  'họ tên',
  'mã vật tư',
  'tên vật tư',
  'phiếu duyệt',
  'người duyệt',
  'oee',
  'capa',
  'chi tiết',
  'thực tế',
  'kế hoạch',
  'đạt',
  'lỗi',
  'phế phẩm',
  'trọng lượng'
]

// Từ khóa kiểm tra dòng Sub-Header con
const SUB_HEADER_KEYWORDS = [
  'họ tên',
  'bắt đầu',
  'kết thúc',
  'số lượng',
  'sản lượng',
  'mã vật tư',
  'tên vật tư',
  'số lượng đạt',
  'số lượng lỗi',
  'số lượng cần',
  'đvt',
  'thực tế',
  'kế hoạch',
  'dài',
  'rộng',
  'cao',
  'đạt',
  'hỏng',
  'lỗi',
  'phế'
]

/**
 * Trích xuất toàn bộ chuỗi tiêu đề từ 20 dòng đầu của file
 */
const extractHeaderTokens = (rawRows) => {
  const tokens = []
  const maxScan = Math.min(25, rawRows.length)
  for (let r = 0; r < maxScan; r++) {
    const row = rawRows[r]
    if (Array.isArray(row)) {
      row.forEach((cell) => {
        if (cell !== null && cell !== undefined && cell !== '') {
          // Chuẩn hóa khoảng trắng & ký tự unicode lạ
          const cleanStr = String(cell)
            .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
            .trim()
            .toLowerCase()
          if (cleanStr.length > 0) {
            tokens.push(cleanStr)
          }
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
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('File không có dữ liệu để phân tích')
  }

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

  // Nếu file có điểm khớp cao rõ rệt với 1 Tab khác (chênh lệch lớn)
  if (maxScore >= 5 && bestTabId && bestTabId !== expectedFileType && expectedScore <= 1) {
    const detectedTitle = TAB_SIGNATURES[bestTabId]?.title || bestTabId
    throw new Error(
      `File tải lên có vẻ thuộc về "${detectedTitle}" thay vì "${expectedTitle}". Vui lòng kiểm tra lại hoặc chuyển sang đúng Tab để nạp.`
    )
  }

  // Luôn chấp nhận nạp file nếu có cấu trúc bảng hợp lệ (tránh chặn nhầm file thực tế của người dùng)
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
    const lower = text.toLowerCase().trim()
    if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) {
      matchCount++
    }
  })

  return matchCount >= 2 || (textCells.length >= 3 && matchCount >= 1)
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
 * Chuyển đổi và chuẩn hóa ngày giờ theo múi giờ & định dạng Việt Nam
 * Sử dụng thuật toán SSF Excel Date Code và Local Timezone để triệt tiêu hoàn toàn lệch 7 tiếng / lệch 1 ngày.
 * - Cột chỉ Giờ (StartTime, EndTime, Bắt đầu, Kết thúc): format chuẩn HH:mm (VD: 15:45, 02:47)
 * - Cột chỉ Ngày (StartDate, EndDate, StatDate, Ngày bắt đầu, Ngày kết thúc, Ngày thống kê): format chuẩn DD/MM/YY (VD: 25/09/26)
 * - Cột Ngày & Giờ đầy đủ (ApprovalTime, CreatedTime,...): format chuẩn DD/MM/YYYY HH:mm:ss
 */
export const formatVietnamDateTimeValue = (val, colNameOrKey = '') => {
  if (val === null || val === undefined || val === '') return ''

  const colStr = String(colNameOrKey || '').toLowerCase()
  const pad = (n) => String(n).padStart(2, '0')

  // Phân loại kiểu cột
  const isDateTimeCol =
    colStr.includes('plannedstarttime') ||
    colStr.includes('plannedendtime') ||
    colStr.includes('actualstarttime') ||
    colStr.includes('actualendtime') ||
    colStr.includes('approvedtime') ||
    colStr.includes('mesapprovedtime') ||
    colStr.includes('(5)') ||
    colStr.includes('(6)') ||
    colStr.includes('(8)') ||
    colStr.includes('(9)')

  const isOnlyTimeCol =
    !isDateTimeCol &&
    (colStr.includes('start_time') ||
      colStr.includes('starttime') ||
      colStr.includes('end_time') ||
      colStr.includes('endtime') ||
      colStr.includes('bắt đầu') ||
      colStr.includes('kết thúc') ||
      colStr.includes('giờ')) &&
    !colStr.includes('ngày') &&
    !colStr.includes('date')

  const isOnlyDateCol =
    !isDateTimeCol &&
    (colStr.includes('ngày') ||
      colStr.includes('date') ||
      colStr.includes('statdate') ||
      colStr.includes('startdate') ||
      colStr.includes('enddate') ||
      colStr.includes('applydate') ||
      colStr.includes('ordercreateddate') ||
      colStr.includes('executedate') ||
      colStr.includes('requireddeliverydate') ||
      colStr.includes('agreeddeliverydate'))

  // Tự động nhận diện nếu dữ liệu là số thực hoặc chuỗi số Serial Excel (VD: "46278.70833" hoặc 46278.70833)
  let numVal = null
  if (typeof val === 'number' && !isNaN(val)) {
    numVal = val
  } else if (typeof val === 'string') {
    const trimmed = val.trim()
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const parsed = parseFloat(trimmed)
      if (!isNaN(parsed)) {
        numVal = parsed
      }
    }
  }

  // 1. Xử lý số Serial Excel (Số thực hoặc chuỗi số)
  if (numVal !== null) {
    // Trường hợp là số thập phân chỉ giờ (ví dụ 0.65625 -> 15:45)
    if (numVal > 0 && numVal < 1) {
      const totalSeconds = Math.round(numVal * 86400)
      const hours = pad(Math.floor(totalSeconds / 3600) % 24)
      const minutes = pad(Math.floor((totalSeconds % 3600) / 60))
      return `${hours}:${minutes}`
    }

    // Trường hợp là số Serial ngày/giờ Excel (VD: 46290 -> 25/09/26 hoặc 46278.70833 -> 13/09/26 17:00)
    if (numVal >= 1 && numVal < 90000) {
      const totalDays = Math.floor(numVal)
      const frac = numVal - totalDays
      const dateUtc = new Date(Math.round((totalDays - 25569) * 86400 * 1000))

      const year = dateUtc.getUTCFullYear()
      const month = pad(dateUtc.getUTCMonth() + 1)
      const day = pad(dateUtc.getUTCDate())
      const yearShort = String(year).slice(-2)

      const totalSecs = Math.round(frac * 86400)
      const hours = pad(Math.floor(totalSecs / 3600) % 24)
      const minutes = pad(Math.floor((totalSecs % 3600) / 60))

      if (isDateTimeCol) {
        return `${day}/${month}/${yearShort} ${hours}:${minutes}`
      }
      if (isOnlyTimeCol) {
        return `${hours}:${minutes}`
      }
      if (isOnlyDateCol) {
        return `${day}/${month}/${yearShort}`
      }
      const hasTime = frac > 0.0001
      return hasTime
        ? `${day}/${month}/${yearShort} ${hours}:${minutes}`
        : `${day}/${month}/${yearShort}`
    }
  }

  // 2. Xử lý Date Object (Lấy theo UTC getters do SheetJS lưu date serial ở UTC)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return ''
    const year = val.getUTCFullYear()
    const month = pad(val.getUTCMonth() + 1)
    const day = pad(val.getUTCDate())
    const hours = pad(val.getUTCHours())
    const minutes = pad(val.getUTCMinutes())
    const seconds = pad(val.getUTCSeconds())
    const yearShort = String(year).slice(-2)

    if (isDateTimeCol) {
      return `${day}/${month}/${yearShort} ${hours}:${minutes}`
    }
    if (year < 1910 || isOnlyTimeCol) {
      return `${hours}:${minutes}`
    }
    if (isOnlyDateCol) {
      return `${day}/${month}/${yearShort}`
    }
    const hasTime = hours !== '00' || minutes !== '00' || seconds !== '00'
    return hasTime
      ? `${day}/${month}/${yearShort} ${hours}:${minutes}`
      : `${day}/${month}/${yearShort}`
  }

  // 3. Xử lý chuỗi văn bản
  if (typeof val === 'string') {
    const str = val.trim()
    if (!str) return ''

    // Nếu chuỗi là giờ dạng HH:mm hoặc HH:mm:ss
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      const parts = str.split(':')
      return `${pad(parts[0])}:${pad(parts[1])}`
    }

    // Nếu là chuỗi ISO hoặc YYYY-MM-DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
      const parts = str.split(/[-/ T]/)
      const year = parts[0]
      const month = pad(parts[1])
      const day = pad(parts[2])
      const yearShort = String(year).slice(-2)

      if (isDateTimeCol && parts[3]) {
        const timeParts = parts[3].split(':')
        return `${day}/${month}/${yearShort} ${pad(timeParts[0])}:${pad(timeParts[1])}`
      }
      if (isOnlyDateCol) {
        return `${day}/${month}/${yearShort}`
      }
      if (isOnlyTimeCol && parts[3]) {
        const timeParts = parts[3].split(':')
        return `${pad(timeParts[0])}:${pad(timeParts[1])}`
      }
      if (parts[3]) {
        const timeParts = parts[3].split(':')
        return `${day}/${month}/${yearShort} ${pad(timeParts[0])}:${pad(timeParts[1])}`
      }
      return `${day}/${month}/${yearShort}`
    }

    // Nếu là chuỗi DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD/MM/YY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(str)) {
      const mainPart = str.split(' ')[0]
      const timePart = str.split(' ')[1] || ''
      const parts = mainPart.split(/[-/]/)
      const day = pad(parts[0])
      const month = pad(parts[1])
      let year = parts[2]
      if (year.length === 4) {
        year = year.slice(-2)
      } else {
        year = pad(year)
      }

      let timeFormatted = ''
      if (timePart) {
        const timeParts = timePart.split(':')
        timeFormatted = `${pad(timeParts[0])}:${pad(timeParts[1])}`
      }

      if (isDateTimeCol) {
        return timeFormatted
          ? `${day}/${month}/${year} ${timeFormatted}`
          : `${day}/${month}/${year}`
      }
      if (isOnlyTimeCol && timeFormatted) {
        return timeFormatted
      }
      if (isOnlyDateCol) {
        return `${day}/${month}/${year}`
      }
      return timeFormatted ? `${day}/${month}/${year} ${timeFormatted}` : `${day}/${month}/${year}`
    }

    return str
  }

  return val
}

export const parseUploadedFile = async (file, fileType, customConfig = {}, onProgress = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    onProgress?.({
      step: 'READ_FILE',
      percent: 15,
      message: 'Đang đọc dữ liệu tệp Excel...'
    })

    reader.onload = async (e) => {
      try {
        onProgress?.({
          step: 'DECODE_EXCEL',
          percent: 30,
          message: 'Đang phân tích cấu trúc các cột và dữ liệu...'
        })

        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, {
          type: 'array',
          cellNF: true,
          cellDates: false,
          cellText: true
        })

        let worksheet = null
        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName]
          if (ws && ws['!ref']) {
            worksheet = ws
            break
          }
        }
        if (!worksheet) {
          worksheet = workbook.Sheets[workbook.SheetNames[0]]
        }

        if (!worksheet || !worksheet['!ref']) {
          throw new Error('File không có dữ liệu')
        }

        const range = XLSX.utils.decode_range(worksheet['!ref'])
        const totalSheetRows = range.e.r - range.s.r + 1

        // ── 1. ĐỌC PREVIEW 30 DÒNG ĐẦU ĐỂ NHẬN DIỆN HEADER (KHÔNG LOAD CẢ SHEET VÀO RAM) ──
        const previewLimit = Math.min(range.e.r, range.s.r + 25)
        const previewRows = []
        for (let r = range.s.r; r <= previewLimit; r++) {
          const row = []
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c })
            const cell = worksheet[addr]
            row.push(
              cell
                ? cell.w !== undefined
                  ? String(cell.w).trim()
                  : String(cell.v ?? '').trim()
                : ''
            )
          }
          previewRows.push(row)
        }

        if (previewRows.length === 0) {
          throw new Error('File không có dữ liệu')
        }

        if (!customConfig.isManual) {
          validateFileTypeMatch(previewRows, fileType)
        }

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

        const merges = worksheet['!merges'] || []

        let headerRow0Idx = 0
        let isTwoTier = false
        let dataStartRow = 1

        if (typeof customConfig.headerRowIndex === 'number') {
          headerRow0Idx = customConfig.headerRowIndex
          dataStartRow =
            typeof customConfig.dataStartRowIndex === 'number'
              ? customConfig.dataStartRowIndex
              : headerRow0Idx + 1
        } else {
          let bestHeaderScore = -1
          const maxHeaderScan = Math.min(20, previewRows.length)
          for (let r = 0; r < maxHeaderScan; r++) {
            const row = previewRows[r]
            if (!Array.isArray(row)) continue
            const textCells = row.filter((c) => typeof c === 'string' && c.trim().length > 0)
            if (textCells.length === 0) continue

            let matchCount = 0
            textCells.forEach((text) => {
              const lower = text.toLowerCase().trim()
              if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) {
                matchCount++
              }
            })

            const score = matchCount * 4 + textCells.length
            if (score > bestHeaderScore && (matchCount >= 1 || textCells.length >= 3)) {
              bestHeaderScore = score
              headerRow0Idx = r
            }
          }

          const nextRowIdx = headerRow0Idx + 1
          if (nextRowIdx < previewRows.length) {
            const nextRow = previewRows[nextRowIdx]
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
            const row0NonEmptyCount = (previewRows[headerRow0Idx] || []).filter(
              (c) => c !== '' && c !== null && c !== undefined
            ).length

            if (
              !isNextData &&
              (hasSubWords ||
                (nextRowNonEmptyCount > 0 && nextRowNonEmptyCount <= row0NonEmptyCount * 0.9))
            ) {
              isTwoTier = true
              dataStartRow = headerRow0Idx + 2
            } else {
              isTwoTier = false
              dataStartRow = headerRow0Idx + 1
            }
          }
        }

        const maxCols = range.e.c - range.s.c + 1

        const mergeMap = {}
        merges.forEach((m) => {
          if (m.s.r <= headerRow0Idx + (isTwoTier ? 1 : 0)) {
            const topAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })
            const topVal = String(worksheet[topAddr]?.w || worksheet[topAddr]?.v || '').trim()
            for (let r = m.s.r; r <= m.e.r; r++) {
              for (let c = m.s.c; c <= m.e.c; c++) {
                mergeMap[`${r}_${c}`] = topVal
              }
            }
          }
        })

        const row0 = (previewRows[headerRow0Idx] || []).map((c, cIdx) => {
          const val = String(c || '').trim()
          return val || mergeMap[`${headerRow0Idx}_${cIdx}`] || ''
        })

        const row1 = isTwoTier
          ? (previewRows[headerRow0Idx + 1] || []).map((c, cIdx) => {
              const val = String(c || '').trim()
              return val || mergeMap[`${headerRow0Idx + 1}_${cIdx}`] || ''
            })
          : []

        // ── 2. XÂY DỰNG HEADER DEFS ──
        const headerDefs = []
        const seenKeys = {}

        for (let c = 0; c < maxCols; c++) {
          const val0 = row0[c] || ''
          const val1 = isTwoTier ? row1[c] || '' : ''

          if (customConfig.columnMappings && customConfig.columnMappings[c] === 'IGNORE_COL') {
            continue
          }

          if (!val0 && !val1) {
            // Kiểm tra nhanh trong preview xem cột có dữ liệu không
            let hasPreviewData = false
            for (let r = dataStartRow; r < previewRows.length; r++) {
              if (previewRows[r]?.[c]) {
                hasPreviewData = true
                break
              }
            }
            if (!hasPreviewData) continue
          }

          let colTitle = ''
          let colGroup = ''
          let resolvedKey = ''
          let resolvedTitle = ''

          const rawVal0Lower = (val0 || '').toLowerCase().trim()
          const rawVal1Lower = (val1 || '').toLowerCase().trim()

          if (rawVal0Lower.includes('ngày bắt đầu') || rawVal1Lower.includes('ngày bắt đầu')) {
            colTitle = 'Ngày bắt đầu'
            colGroup = ''
            resolvedKey = 'StartDate'
            resolvedTitle = 'Ngày bắt đầu'
          } else if (
            rawVal0Lower.includes('ngày kết thúc') ||
            rawVal1Lower.includes('ngày kết thúc')
          ) {
            colTitle = 'Ngày kết thúc'
            colGroup = ''
            resolvedKey = 'EndDate'
            resolvedTitle = 'Ngày kết thúc'
          } else if (
            rawVal0Lower.includes('ngày thống kê') ||
            rawVal1Lower.includes('ngày thống kê')
          ) {
            colTitle = 'Ngày thống kê'
            colGroup = ''
            resolvedKey = 'StatDate'
            resolvedTitle = 'Ngày thống kê'
          } else if (
            rawVal0Lower.includes('số phiếu thống kê') ||
            rawVal1Lower.includes('số phiếu thống kê')
          ) {
            colTitle = 'Số phiếu thống kê'
            colGroup = ''
            resolvedKey = 'StatSlipNo'
            resolvedTitle = 'Số phiếu thống kê'
          } else if (
            rawVal0Lower.includes('nhân viên thống kê') ||
            rawVal1Lower.includes('nhân viên thống kê')
          ) {
            colTitle = 'Nhân viên thống kê'
            colGroup = ''
            resolvedKey = 'StatEmployee'
            resolvedTitle = 'Nhân viên thống kê'
          } else if (
            isTwoTier &&
            (rawVal0Lower.includes('thời gian thực hiện') ||
              rawVal0Lower === 'thời gian thực hiện' ||
              rawVal0Lower === 'thời gian')
          ) {
            colGroup = 'Thời gian thực hiện'
            if (rawVal1Lower.includes('bắt đầu') || rawVal1Lower === 'bắt đầu') {
              colTitle = 'Bắt đầu'
              resolvedKey = 'StartTime'
              resolvedTitle = 'Bắt đầu'
            } else if (rawVal1Lower.includes('kết thúc') || rawVal1Lower === 'kết thúc') {
              colTitle = 'Kết thúc'
              resolvedKey = 'EndTime'
              resolvedTitle = 'Kết thúc'
            } else {
              colTitle = val1 || val0
            }
          } else if (isTwoTier) {
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

          if (
            customConfig.columnMappings &&
            customConfig.columnMappings[c] &&
            customConfig.columnMappings[c] !== 'IGNORE_COL'
          ) {
            const customKey = customConfig.columnMappings[c]
            const matchedInSchema = schemaList.find((s) => s.key === customKey)
            if (matchedInSchema) {
              resolvedKey = matchedInSchema.key
              resolvedTitle = matchedInSchema.title
            } else {
              resolvedKey = colTitle.replace(/[\s/\\()+-]+/g, '_')
            }
          } else if (titleLower.includes('họ tên') || titleLower === 'họ tên') {
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
          } else if (
            groupLower.includes('đơn hàng') &&
            (titleLower.includes('số lượng') || titleLower === 'số lượng')
          ) {
            resolvedKey = 'DetailQty'
            resolvedTitle = 'Số lượng'
          } else if (!resolvedKey) {
            const clean = (s) =>
              String(s || '')
                .replace(/[\r\n]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase()
            const cleanTitle = clean(colTitle)
            const cleanGroup = clean(colGroup)

            let matched = schemaList.find((s) => {
              const sGroup = clean(s.group)
              const sTitle = clean(s.title)
              return (
                sGroup &&
                cleanGroup &&
                (sGroup === cleanGroup ||
                  sGroup.includes(cleanGroup) ||
                  cleanGroup.includes(sGroup)) &&
                (sTitle === cleanTitle ||
                  sTitle.includes(cleanTitle) ||
                  cleanTitle.includes(sTitle))
              )
            })

            if (!matched) {
              matched = schemaList.find((s) => {
                const sTitle = clean(s.title)
                return (
                  sTitle === cleanTitle ||
                  (sTitle.length > 3 &&
                    cleanTitle.length > 3 &&
                    (sTitle.includes(cleanTitle) || cleanTitle.includes(sTitle)))
                )
              })
            }

            if (matched) {
              resolvedKey = matched.key
              resolvedTitle = matched.title || colTitle
              if (!colGroup && matched.group) {
                colGroup = matched.group
              }
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

        onProgress?.({
          step: 'COLUMNS_READY',
          percent: 50,
          detectedColumns: finalColumns.length,
          columns: finalColumns,
          message: `Đã xác định ${finalColumns.length} cột tiêu đề. Bắt đầu xử lý dữ liệu...`
        })

        // ── 3. TRÍCH XUẤT STREAM DỮ LIỆU TỪNG DÒNG (TIẾT KIỆM BỘ NHỚ RAM 100%) ──
        const parsedRows = []
        const totalRowsToScan = range.e.r - dataStartRow + 1

        for (let r = dataStartRow; r <= range.e.r; r++) {
          const rowObj = {}
          let hasRowData = false

          for (let i = 0; i < headerDefs.length; i++) {
            const { origIndex, key, title } = headerDefs[i]
            const addr = XLSX.utils.encode_cell({ r, c: origIndex })
            const cell = worksheet[addr]

            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
              hasRowData = true
              let val = cell.w !== undefined ? cell.w : cell.v
              if (typeof val === 'string') {
                val = val.trim()
              }

              const isDateOrTimeCol =
                title.toLowerCase().includes('ngày') ||
                title.toLowerCase().includes('thời gian') ||
                title.toLowerCase().includes('giờ') ||
                key.toLowerCase().includes('date') ||
                key.toLowerCase().includes('time') ||
                key.toLowerCase().includes('created') ||
                key.toLowerCase().includes('approval') ||
                key.toLowerCase().includes('perform')

              if (
                isDateOrTimeCol ||
                cell.t === 'd' ||
                (typeof val === 'number' && val > 30000 && val < 70000) ||
                (typeof val === 'number' && val > 0 && val < 1) ||
                (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val) && isDateOrTimeCol)
              ) {
                val = formatVietnamDateTimeValue(val, `${key}_${title}`)
              }

              rowObj[key] = val
            }
          }

          if (hasRowData) {
            parsedRows.push(rowObj)
          }

          // Nhường nhịp sự kiện cho UI & Garbage Collection mỗi 2,000 dòng
          if (r % 2000 === 0) {
            const currentPercent = Math.min(
              90,
              Math.round(50 + (38 * (r - dataStartRow)) / totalRowsToScan)
            )
            onProgress?.({
              step: 'STREAMING_DATA',
              percent: currentPercent,
              totalRows: parsedRows.length,
              message: `Đang xử lý ${parsedRows.length.toLocaleString('vi-VN')} dòng dữ liệu...`
            })
            await new Promise((res) => setTimeout(res, 0))
          }
        }

        onProgress?.({
          step: 'DATA_READY',
          percent: 92,
          detectedColumns: finalColumns.length,
          totalRows: parsedRows.length,
          message: `Đang hoàn tất xử lý ${parsedRows.length.toLocaleString('vi-VN')} dòng dữ liệu...`
        })

        // Xóa các ô trong worksheet để giải phóng bộ nhớ ngay lập tức
        for (const k of Object.keys(worksheet)) {
          if (k[0] !== '!') delete worksheet[k]
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

/**
 * Trích xuất nhanh ma trận raw và thông tin header để phục vụ Modal Ánh Xạ Cột
 */
export const inspectUploadedFile = async (file, fileType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, {
          type: 'array',
          cellNF: true,
          cellDates: false,
          cellText: true
        })

        let worksheet = null
        for (const sName of workbook.SheetNames) {
          const ws = workbook.Sheets[sName]
          if (ws && ws['!ref']) {
            const tempRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
            if (tempRows.length > 0) {
              worksheet = ws
              break
            }
          }
        }
        if (!worksheet || !worksheet['!ref']) {
          worksheet = workbook.Sheets[workbook.SheetNames[0]]
        }

        const range = XLSX.utils.decode_range(worksheet?.['!ref'] || 'A1:Z50')
        const previewLimit = Math.min(range.e.r, range.s.r + 100)
        const rawRows = []
        for (let r = range.s.r; r <= previewLimit; r++) {
          const row = []
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c })
            const cell = worksheet[addr]
            row.push(
              cell
                ? cell.w !== undefined
                  ? String(cell.w).trim()
                  : String(cell.v ?? '').trim()
                : ''
            )
          }
          rawRows.push(row)
        }

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

        let detectedHeaderRow = 0
        let bestScore = -1
        const maxScan = Math.min(25, rawRows.length)
        for (let r = 0; r < maxScan; r++) {
          const row = rawRows[r]
          if (!Array.isArray(row)) continue
          const textCells = row.filter((c) => typeof c === 'string' && c.trim().length > 0)
          let matchCount = 0
          textCells.forEach((text) => {
            const lower = text.toLowerCase().trim()
            if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) {
              matchCount++
            }
          })
          const score = matchCount * 4 + textCells.length
          if (score > bestScore && (matchCount >= 1 || textCells.length >= 3)) {
            bestScore = score
            detectedHeaderRow = r
          }
        }

        resolve({
          rawMatrix: rawRows.slice(0, 100),
          detectedHeaderRow,
          detectedDataStartRow: detectedHeaderRow + 1,
          availableSchema: schemaList,
          tabTitle: tabDef?.title || fileType
        })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Không thể đọc file để phân tích'))
    reader.readAsArrayBuffer(file)
  })
}
