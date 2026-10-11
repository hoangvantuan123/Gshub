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
/**
 * Chuẩn hóa cặp Thời gian Bắt đầu và Kết thúc về hệ 24 giờ chuẩn:
 * Tự động sửa lỗi khi file xuất từ ERP/MES bị định dạng 12 giờ thiếu nhãn PM
 * (VD: 04:59:55 và 19:41:35 -> 16:59:55 và 19:41:35; hoặc 05:00 và 05:32 ca chiều -> 17:00 và 17:32)
 */
export function normalizeRowOperationalTimePair(rowObj) {
  if (!rowObj || typeof rowObj !== 'object') return rowObj

  const startKeys = [
    'PlannedStartTime',
    'StartTime',
    'Thời gian bắt đầu (5)',
    'Thời gian bắt đầu\r\n(5)',
    'Thời gian bắt đầu\n(5)',
    'Thời gian bắt đầu',
    'Bắt đầu'
  ]
  const endKeys = [
    'PlannedEndTime',
    'EndTime',
    'Thời gian kết thúc (6)',
    'Thời gian kết thúc\r\n(6)',
    'Thời gian kết thúc\n(6)',
    'Thời gian kết thúc',
    'Kết thúc'
  ]

  const foundStartKey = startKeys.find(
    (k) => rowObj[k] !== undefined && rowObj[k] !== null && String(rowObj[k]).trim() !== ''
  )
  const foundEndKey = endKeys.find(
    (k) => rowObj[k] !== undefined && rowObj[k] !== null && String(rowObj[k]).trim() !== ''
  )

  if (!foundStartKey && !foundEndKey) return rowObj

  const startVal = foundStartKey ? String(rowObj[foundStartKey]).trim() : ''
  const endVal = foundEndKey ? String(rowObj[foundEndKey]).trim() : ''

  const sMatch = startVal.match(
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|SA|CH))?/i
  )
  const eMatch = endVal.match(
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|SA|CH))?/i
  )

  const pad = (n) => String(n).padStart(2, '0')

  const shift = String(rowObj.PlannedShift || rowObj['Ca SX'] || rowObj['Ca'] || '').trim()
  const isNightOrShift2 = /c2|ca\s*2|chiều|chieu|tối|toi|đêm|dem/i.test(shift)

  if (sMatch && eMatch) {
    const sDate = sMatch[1]
    let sH = parseInt(sMatch[2], 10)
    const sM = sMatch[3]
    const sS = sMatch[4] || '00'
    const sAmpm = sMatch[5] ? sMatch[5].toUpperCase() : ''

    let eDate = eMatch[1]
    let eH = parseInt(eMatch[2], 10)
    const eM = eMatch[3]
    const eS = eMatch[4] || '00'
    const eAmpm = eMatch[5] ? eMatch[5].toUpperCase() : ''

    let changed = false

    // AM/PM conversion
    if ((sAmpm === 'PM' || sAmpm === 'CH') && sH < 12) {
      sH += 12
      changed = true
    }
    if ((sAmpm === 'AM' || sAmpm === 'SA') && sH === 12) {
      sH = 0
      changed = true
    }
    if ((eAmpm === 'PM' || eAmpm === 'CH') && eH < 12) {
      eH += 12
      changed = true
    }
    if ((eAmpm === 'AM' || eAmpm === 'SA') && eH === 12) {
      eH = 0
      changed = true
    }

    // Nếu thuộc Ca 2 / ca tối / ca đêm mà giờ đang là [1..11] (do ERP xuất 12h thiếu nhãn PM)
    if (isNightOrShift2) {
      if (sH >= 1 && sH <= 11) {
        sH += 12
        changed = true
      }
      if (eH >= 1 && eH <= 11) {
        if (sH > eH && eH + 12 <= 23) {
          eH += 12
          changed = true
        }
      }
    } else {
      // TH1: Cùng ngày, StartTime có giờ [1..6] và EndTime có giờ >= 12 (VD: 04:59:55 và 19:41:35)
      if (sDate === eDate && sH >= 1 && sH <= 6 && eH >= 12) {
        if (sH + 12 <= eH) {
          sH += 12
          changed = true
        }
      }
      // TH2: Cùng ngày, cả StartTime và EndTime đều có giờ [1..6] (VD: 05:00 và 05:32)
      else if (sDate === eDate && sH >= 1 && sH <= 6 && eH >= 1 && eH <= 6 && sH <= eH) {
        sH += 12
        eH += 12
        changed = true
      }
    }

    if (changed || sAmpm || eAmpm) {
      const newStartVal = `${sDate} ${pad(sH)}:${sM}:${sS}`
      const newEndVal = `${eDate} ${pad(eH)}:${eM}:${eS}`

      startKeys.forEach((k) => {
        if (rowObj[k] !== undefined) rowObj[k] = newStartVal
      })
      endKeys.forEach((k) => {
        if (rowObj[k] !== undefined) rowObj[k] = newEndVal
      })
    }
  } else if (sMatch && !eMatch) {
    const sDate = sMatch[1]
    let sH = parseInt(sMatch[2], 10)
    const sM = sMatch[3]
    const sS = sMatch[4] || '00'
    const sAmpm = sMatch[5] ? sMatch[5].toUpperCase() : ''

    if ((sAmpm === 'PM' || sAmpm === 'CH') && sH < 12) sH += 12
    if ((sAmpm === 'AM' || sAmpm === 'SA') && sH === 12) sH = 0

    if (isNightOrShift2 && sH >= 1 && sH <= 11) {
      sH += 12
    } else if (sH >= 1 && sH <= 6) {
      sH += 12
    }
    const newStartVal = `${sDate} ${pad(sH)}:${sM}:${sS}`
    startKeys.forEach((k) => {
      if (rowObj[k] !== undefined) rowObj[k] = newStartVal
    })
  }

  return rowObj
}

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
    colStr.includes('ticketcreateddate') ||
    colStr.includes('slipcreateddate') ||
    colStr.includes('createddate') ||
    colStr.includes('docdate') ||
    colStr.includes('tạo phiếu') ||
    colStr.includes('ngày tạo') ||
    colStr.includes('thời gian tạo') ||
    colStr.includes('lập phiếu') ||
    colStr.includes('ngày lập') ||
    colStr.includes('thời gian lập') ||
    colStr.includes('thời gian duyệt') ||
    colStr.includes('(5)') ||
    colStr.includes('(6)') ||
    colStr.includes('(8)') ||
    colStr.includes('(9)') ||
    colStr.includes('(90)') ||
    colStr.includes('(94)') ||
    colStr.includes('(95)')

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
    // Trường hợp là số thập phân chỉ giờ (ví dụ 0.65625 -> 15:45:00)
    if (numVal > 0 && numVal < 1) {
      const totalSeconds = Math.round(numVal * 86400)
      const hours = pad(Math.floor(totalSeconds / 3600) % 24)
      const minutes = pad(Math.floor((totalSeconds % 3600) / 60))
      const seconds = pad(totalSeconds % 60)
      return seconds !== '00' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
    }

    // Trường hợp là số Serial ngày/giờ Excel (VD: 46290 -> 25/09/26 hoặc 46278.70833 -> 13/09/26 17:00:00)
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
      const seconds = pad(totalSecs % 60)
      const timeStr = seconds !== '00' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:00`

      if (isDateTimeCol) {
        return `${day}/${month}/${yearShort} ${timeStr}`
      }
      if (isOnlyTimeCol) {
        return seconds !== '00' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
      }
      if (isOnlyDateCol) {
        return `${day}/${month}/${yearShort}`
      }
      const hasTime = frac > 0.00001
      return hasTime ? `${day}/${month}/${yearShort} ${timeStr}` : `${day}/${month}/${yearShort}`
    }
  }

  // 2. Xử lý Date Object (Dùng local getters để giữ đúng giờ người dùng nhập, triệt tiêu hoàn toàn lệch 7 tiếng múi giờ)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return ''
    const year = val.getFullYear()
    const month = pad(val.getMonth() + 1)
    const day = pad(val.getDate())
    const hours = pad(val.getHours())
    const minutes = pad(val.getMinutes())
    const seconds = pad(val.getSeconds())
    const yearShort = String(year).slice(-2)
    const timeStr = seconds !== '00' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}:00`

    if (isDateTimeCol) {
      return `${day}/${month}/${yearShort} ${timeStr}`
    }
    if (year < 1910 || isOnlyTimeCol) {
      return seconds !== '00' ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`
    }
    if (isOnlyDateCol) {
      return `${day}/${month}/${yearShort}`
    }
    const hasTime = hours !== '00' || minutes !== '00' || seconds !== '00'
    return hasTime ? `${day}/${month}/${yearShort} ${timeStr}` : `${day}/${month}/${yearShort}`
  }

  // 3. Xử lý chuỗi văn bản
  if (typeof val === 'string') {
    const str = val.trim()
    if (!str) return ''

    // Nếu chuỗi chỉ là giờ dạng HH:mm hoặc HH:mm:ss (kèm AM/PM/SA/CH)
    const pureTimeMatch = str.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|SA|CH))?$/i
    )
    if (pureTimeMatch) {
      let h = parseInt(pureTimeMatch[1], 10)
      const m = pad(pureTimeMatch[2])
      const s = pureTimeMatch[3] ? pad(pureTimeMatch[3]) : ''
      const ampm = pureTimeMatch[4] ? pureTimeMatch[4].toUpperCase() : ''
      if ((ampm === 'PM' || ampm === 'CH') && h < 12) h += 12
      if ((ampm === 'AM' || ampm === 'SA') && h === 12) h = 0
      const hStr = pad(h)
      return s ? `${hStr}:${m}:${s}` : `${hStr}:${m}`
    }

    // Nếu là chuỗi ISO hoặc YYYY-MM-DD (kèm giờ phút giây và AM/PM/SA/CH)
    const isoMatch = str.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|SA|CH))?)?/i
    )
    if (isoMatch) {
      const year = isoMatch[1]
      const month = pad(isoMatch[2])
      const day = pad(isoMatch[3])
      const yearShort = String(year).slice(-2)

      let timeFormatted = ''
      if (isoMatch[4] !== undefined) {
        let h = parseInt(isoMatch[4], 10)
        const m = pad(isoMatch[5] || '00')
        const s = pad(isoMatch[6] || '00')
        const ampm = isoMatch[7] ? isoMatch[7].toUpperCase() : ''
        if ((ampm === 'PM' || ampm === 'CH') && h < 12) h += 12
        if ((ampm === 'AM' || ampm === 'SA') && h === 12) h = 0
        timeFormatted = `${pad(h)}:${m}:${s}`
      }

      if (isDateTimeCol) {
        return timeFormatted
          ? `${day}/${month}/${yearShort} ${timeFormatted}`
          : `${day}/${month}/${yearShort} 00:00:00`
      }
      if (isOnlyDateCol) {
        return `${day}/${month}/${yearShort}`
      }
      if (isOnlyTimeCol && timeFormatted) {
        return timeFormatted
      }
      if (timeFormatted) {
        return `${day}/${month}/${yearShort} ${timeFormatted}`
      }
      return `${day}/${month}/${yearShort}`
    }

    // Nếu là chuỗi DD/MM/YYYY hoặc DD-MM-YYYY hoặc DD/MM/YY (kèm giờ phút giây và AM/PM/SA/CH)
    const dmyMatch = str.match(
      /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|SA|CH))?)?/i
    )
    if (dmyMatch) {
      const day = pad(dmyMatch[1])
      const month = pad(dmyMatch[2])
      let year = dmyMatch[3]
      if (year.length === 4) {
        year = year.slice(-2)
      } else {
        year = pad(year)
      }

      let timeFormatted = ''
      if (dmyMatch[4] !== undefined) {
        let h = parseInt(dmyMatch[4], 10)
        const m = pad(dmyMatch[5] || '00')
        const s = pad(dmyMatch[6] || '00')
        const ampm = dmyMatch[7] ? dmyMatch[7].toUpperCase() : ''
        if ((ampm === 'PM' || ampm === 'CH') && h < 12) h += 12
        if ((ampm === 'AM' || ampm === 'SA') && h === 12) h = 0
        timeFormatted = `${pad(h)}:${m}:${s}`
      }

      if (isDateTimeCol) {
        return timeFormatted
          ? `${day}/${month}/${year} ${timeFormatted}`
          : `${day}/${month}/${year} 00:00:00`
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
        let technicianCounter = 0

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
              colGroup = ''
            }
          } else {
            colTitle = val0 || `Cột_${c + 1}`
            colGroup = ''
          }

          const clean = (s) =>
            String(s || '')
              .replace(/[\r\n\t]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase()

          const cleanTitle = clean(colTitle)
          const cleanGroup = clean(colGroup)

          let resolvedKey = ''
          let resolvedTitle = colTitle

          // 1. Kiểm tra cấu hình ánh xạ thủ công từ Modal
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
              colGroup = colGroup || matchedInSchema.group || ''
            } else {
              resolvedKey = colTitle.replace(/[\s/\\()+-]+/g, '_')
            }
          }

          // 2. Tự động nhận diện theo Ngữ cảnh Nhóm & Tiêu đề cột
          if (!resolvedKey) {
            const titleLower = cleanTitle
            const groupLower = cleanGroup

            // A. Khớp chính xác cả Group lẫn Title
            let matched = schemaList.find((s) => {
              const sGroup = clean(s.group)
              const sTitle = clean(s.title)
              return sGroup && cleanGroup && sGroup === cleanGroup && sTitle === cleanTitle
            })

            // B. Khớp đặc biệt cho nhóm: THÔNG TIN LỆNH CÔNG ĐOẠN
            if (
              !matched &&
              (groupLower.includes('công đoạn') ||
                groupLower.includes('cd') ||
                titleLower.includes('công đoạn') ||
                titleLower.includes('(cđ)') ||
                titleLower.includes('(cd)'))
            ) {
              if (
                titleLower.includes('người') ||
                titleLower.includes('nguoi') ||
                titleLower.includes('pic')
              ) {
                matched = schemaList.find((s) => s.key === 'OrderIssuer') || {
                  key: 'OrderIssuer',
                  title: 'Người phát hành lệnh thao tác',
                  group: 'THÔNG TIN PHÁT HÀNH LỆNH THAO TÁC'
                }
              } else if (
                titleLower.includes('phát hành') ||
                titleLower.includes('phat hanh') ||
                titleLower.includes('ngày') ||
                titleLower.includes('ngay')
              ) {
                matched = schemaList.find((s) => s.key === 'StageOrderReleaseDate') || {
                  key: 'StageOrderReleaseDate',
                  title: 'Ngày phát hành lệnh CĐ',
                  group: 'Thông tin lệnh công đoạn'
                }
              } else if (titleLower.includes('cần đạt') || titleLower.includes('can dat')) {
                matched = schemaList.find((s) => s.key === 'StageTargetQty') || {
                  key: 'StageTargetQty',
                  title: 'SL cần đạt (CĐ)',
                  group: 'Thông tin lệnh công đoạn'
                }
              } else if (
                titleLower.includes('cần sản xuất') ||
                titleLower.includes('cần sx') ||
                titleLower.includes('can san xuat')
              ) {
                matched = schemaList.find((s) => s.key === 'StagePlannedQty') || {
                  key: 'StagePlannedQty',
                  title: 'SL cần sản xuất (CĐ)',
                  group: 'Thông tin lệnh công đoạn'
                }
              } else if (
                titleLower.includes('số lệnh') ||
                titleLower.includes('so lenh') ||
                titleLower.includes('mã lệnh')
              ) {
                matched = schemaList.find((s) => s.key === 'StageOrderNo') || {
                  key: 'StageOrderNo',
                  title: 'Số lệnh công đoạn',
                  group: 'Thông tin lệnh công đoạn'
                }
              } else if (titleLower.includes('ngày lệnh') || titleLower.includes('ngay lenh')) {
                matched = schemaList.find((s) => s.key === 'StageOrderDate') || {
                  key: 'StageOrderDate',
                  title: 'Ngày lệnh công đoạn',
                  group: 'Thông tin lệnh công đoạn'
                }
              }
            }

            // C. Khớp đặc biệt cho nhóm: THÔNG TIN LỆNH THAO TÁC
            if (
              !matched &&
              (groupLower.includes('thao tác') ||
                groupLower.includes('tt') ||
                titleLower.includes('thao tác') ||
                titleLower.includes('(tt)'))
            ) {
              if (
                titleLower.includes('người') ||
                titleLower.includes('nguoi') ||
                titleLower.includes('pic')
              ) {
                matched = schemaList.find((s) => s.key === 'OrderIssuer') || {
                  key: 'OrderIssuer',
                  title: 'Người phát hành lệnh thao tác',
                  group: 'THÔNG TIN PHÁT HÀNH LỆNH THAO TÁC'
                }
              } else if (
                titleLower.includes('phát hành') ||
                titleLower.includes('phat hanh') ||
                titleLower.includes('ngày') ||
                titleLower.includes('ngay')
              ) {
                matched = schemaList.find((s) => s.key === 'OpOrderReleaseDate') || {
                  key: 'OpOrderReleaseDate',
                  title: 'Ngày phát hành lệnh TT',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (titleLower.includes('cần đạt') || titleLower.includes('can dat')) {
                matched = schemaList.find((s) => s.key === 'OpTargetQty') || {
                  key: 'OpTargetQty',
                  title: 'SL cần đạt (TT)',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (
                titleLower.includes('cần sản xuất') ||
                titleLower.includes('cần sx') ||
                titleLower.includes('can san xuat')
              ) {
                matched = schemaList.find((s) => s.key === 'OpPlannedQty') || {
                  key: 'OpPlannedQty',
                  title: 'SL cần sản xuất (TT)',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (
                titleLower === 'đvt' ||
                titleLower === 'dvt' ||
                titleLower.includes('đơn vị')
              ) {
                matched = schemaList.find((s) => s.key === 'OpUnit') || {
                  key: 'OpUnit',
                  title: 'Đvt',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (titleLower.includes('mã vật tư') || titleLower.includes('ma vat tu')) {
                matched = schemaList.find((s) => s.key === 'MaterialCode') || {
                  key: 'MaterialCode',
                  title: 'Mã vật tư',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (titleLower.includes('tên vật tư') || titleLower.includes('ten vat tu')) {
                matched = schemaList.find((s) => s.key === 'MaterialName') || {
                  key: 'MaterialName',
                  title: 'Tên vật tư',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (titleLower.includes('version')) {
                matched = schemaList.find((s) => s.key === 'Version') || {
                  key: 'Version',
                  title: 'Version',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (titleLower.includes('model')) {
                matched = schemaList.find((s) => s.key === 'Model') || {
                  key: 'Model',
                  title: 'Model',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (
                titleLower.includes('sp/lề ng') ||
                titleLower.includes('lề ng') ||
                titleLower.includes('sp ng')
              ) {
                matched = schemaList.find((s) => s.key === 'ProductNgWeight') || {
                  key: 'ProductNgWeight',
                  title: 'Trọng lượng Sp/lề NG',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (
                titleLower.includes('lề kỹ thuật') ||
                titleLower.includes('le ky thuat') ||
                titleLower.includes('lề kt')
              ) {
                matched = schemaList.find((s) => s.key === 'TechnicalMarginWeight') || {
                  key: 'TechnicalMarginWeight',
                  title: 'Trọng lượng lề kỹ thuật',
                  group: 'Thông tin lệnh thao tác'
                }
              } else if (
                titleLower.includes('số lệnh') ||
                titleLower.includes('so lenh') ||
                titleLower.includes('lệnh thao tác')
              ) {
                matched = schemaList.find((s) => s.key === 'OperationOrderNo') || {
                  key: 'OperationOrderNo',
                  title: 'Số lệnh thao tác',
                  group: 'Thông tin lệnh thao tác'
                }
              }
            }

            // D. Khớp đặc biệt cho nhóm: THỜI GIAN LÃNG PHÍ / HAO PHÍ
            if (
              !matched &&
              (groupLower.includes('lãng phí') ||
                groupLower.includes('hao phí') ||
                groupLower.includes('lang phi') ||
                groupLower.includes('hao phi'))
            ) {
              if (
                titleLower.includes('01') ||
                titleLower.includes('hỏng máy') ||
                titleLower.includes('mất điện') ||
                titleLower.includes('hong may')
              ) {
                matched = schemaList.find((s) => s.key === 'DowntimeBreakdownMinutes') || {
                  key: 'DowntimeBreakdownMinutes',
                  title: 'TG hỏng máy/mất điện (phút) (01)',
                  group: 'Thời gian lãng phí'
                }
              } else if (
                titleLower.includes('02') ||
                titleLower.includes('chờ nvl') ||
                titleLower.includes('cho nvl')
              ) {
                matched = schemaList.find((s) => s.key === 'DowntimeWaitingMaterialMinutes') || {
                  key: 'DowntimeWaitingMaterialMinutes',
                  title: 'Tg chờ NVL (phút) (02)',
                  group: 'Thời gian lãng phí'
                }
              } else if (
                titleLower.includes('03') ||
                titleLower.includes('chuẩn bị') ||
                titleLower.includes('chuan bi')
              ) {
                matched = schemaList.find((s) => s.key === 'DowntimeSetupMinutes') || {
                  key: 'DowntimeSetupMinutes',
                  title: 'Tg chuẩn bị (phút) (03)',
                  group: 'Thời gian lãng phí'
                }
              } else if (
                titleLower.includes('04') ||
                titleLower.includes('sửa file') ||
                titleLower.includes('sua file') ||
                titleLower.includes('khuôn') ||
                titleLower.includes('bản')
              ) {
                matched = schemaList.find((s) => s.key === 'DowntimeFixingMinutes') || {
                  key: 'DowntimeFixingMinutes',
                  title: 'TG sửa file/khuôn/bản (phút) (04)',
                  group: 'Thời gian lãng phí'
                }
              } else if (
                titleLower.includes('tổng') ||
                titleLower.includes('tong') ||
                titleLower.includes('1+2+3+4') ||
                titleLower.includes('(5)')
              ) {
                matched = schemaList.find((s) => s.key === 'TotalDowntimeMinutes') || {
                  key: 'TotalDowntimeMinutes',
                  title: 'Tổng tg hao phí (5)=1+2+3+4',
                  group: 'Thời gian lãng phí'
                }
              }
            }

            // E. Xử lý các cột duplicate theo thứ tự xuất hiện nếu không có group phân biệt
            if (!matched) {
              if (
                titleLower === 'ngày phát hành lệnh' ||
                titleLower === 'ngay phat hanh lenh' ||
                titleLower === 'ngày phát hành'
              ) {
                if (!seenKeys['StageOrderReleaseDate']) {
                  matched = {
                    key: 'StageOrderReleaseDate',
                    title: 'Ngày phát hành lệnh CĐ',
                    group: 'Thông tin lệnh công đoạn'
                  }
                } else if (!seenKeys['OpOrderReleaseDate']) {
                  matched = {
                    key: 'OpOrderReleaseDate',
                    title: 'Ngày phát hành lệnh TT',
                    group: 'Thông tin lệnh thao tác'
                  }
                }
              } else if (
                titleLower === 'số lượng cần đạt' ||
                titleLower === 'sl cần đạt' ||
                titleLower === 'cần đạt'
              ) {
                if (!seenKeys['StageTargetQty']) {
                  matched = {
                    key: 'StageTargetQty',
                    title: 'SL cần đạt (CĐ)',
                    group: 'Thông tin lệnh công đoạn'
                  }
                } else if (!seenKeys['OpTargetQty']) {
                  matched = {
                    key: 'OpTargetQty',
                    title: 'SL cần đạt (TT)',
                    group: 'Thông tin lệnh thao tác'
                  }
                }
              } else if (
                titleLower === 'số lượng cần sản xuất' ||
                titleLower === 'sl cần sản xuất' ||
                titleLower === 'cần sản xuất' ||
                titleLower === 'cần sx' ||
                titleLower === 'sl cần sx'
              ) {
                if (!seenKeys['StagePlannedQty']) {
                  matched = {
                    key: 'StagePlannedQty',
                    title: 'SL cần sản xuất (CĐ)',
                    group: 'Thông tin lệnh công đoạn'
                  }
                } else if (!seenKeys['OpPlannedQty']) {
                  matched = {
                    key: 'OpPlannedQty',
                    title: 'SL cần sản xuất (TT)',
                    group: 'Thông tin lệnh thao tác'
                  }
                }
              } else if (
                titleLower === 'họ tên' ||
                titleLower === 'ho ten' ||
                titleLower.includes('họ tên') ||
                titleLower.includes('technician') ||
                titleLower === 'thợ' ||
                titleLower.includes('người vận hành')
              ) {
                // Nhận diện thợ máy (Thợ chính, Thợ phụ 1, Thợ phụ 2)
                technicianCounter++
                if (groupLower.includes('phụ 2') || titleLower.includes('phụ 2')) {
                  matched = schemaList.find((s) => s.key === 'AssistantWorker2Name') || {
                    key: 'AssistantWorker2Name',
                    title: 'Họ tên',
                    group: 'Thợ phụ 2'
                  }
                } else if (groupLower.includes('phụ 1') || titleLower.includes('phụ 1')) {
                  matched = schemaList.find((s) => s.key === 'AssistantWorker1Name') || {
                    key: 'AssistantWorker1Name',
                    title: 'Họ tên',
                    group: 'Thợ phụ 1'
                  }
                } else if (groupLower.includes('chính') || titleLower.includes('chính')) {
                  matched = schemaList.find((s) => s.key === 'LeadTechnicianName') || {
                    key: 'LeadTechnicianName',
                    title: 'Họ tên',
                    group: 'Thợ chính'
                  }
                } else {
                  // Phân bổ tuần tự nếu không có group chỉ định
                  if (!seenKeys['LeadTechnicianName']) {
                    matched = schemaList.find((s) => s.key === 'LeadTechnicianName') || {
                      key: 'LeadTechnicianName',
                      title: 'Họ tên',
                      group: 'Thợ chính'
                    }
                  } else if (!seenKeys['AssistantWorker1Name']) {
                    matched = schemaList.find((s) => s.key === 'AssistantWorker1Name') || {
                      key: 'AssistantWorker1Name',
                      title: 'Họ tên',
                      group: 'Thợ phụ 1'
                    }
                  } else if (!seenKeys['AssistantWorker2Name']) {
                    matched = schemaList.find((s) => s.key === 'AssistantWorker2Name') || {
                      key: 'AssistantWorker2Name',
                      title: 'Họ tên',
                      group: 'Thợ phụ 2'
                    }
                  } else {
                    matched = {
                      key: `AssistantWorker${technicianCounter}Name`,
                      title: 'Họ tên',
                      group: `Thợ phụ ${technicianCounter}`
                    }
                  }
                }
              }
            }

            // F. Khớp theo Group và Title linh hoạt (bỏ qua ký hiệu số thứ tự như (1), (5), (6),...)
            if (!matched && cleanGroup) {
              // F1. Ưu tiên khớp chính xác Title trong cùng Group
              matched = schemaList.find((s) => {
                const sGroup = clean(s.group)
                const sTitle = clean(s.title)
                if (
                  sGroup !== cleanGroup &&
                  !sGroup.includes(cleanGroup) &&
                  !cleanGroup.includes(sGroup)
                ) {
                  return false
                }
                const cleanSTitleNoParen = sTitle.replace(/\s*\(.*?\)/g, '').trim()
                const cleanColTitleNoParen = cleanTitle.replace(/\s*\(.*?\)/g, '').trim()
                return (
                  sTitle === cleanTitle ||
                  cleanSTitleNoParen === cleanColTitleNoParen
                )
              })

              // F2. Khớp tương đối Title trong cùng Group (loại trừ nhầm lẫn Ngày vs Giờ)
              if (!matched) {
                matched = schemaList.find((s) => {
                  const sGroup = clean(s.group)
                  const sTitle = clean(s.title)
                  if (
                    sGroup !== cleanGroup &&
                    !sGroup.includes(cleanGroup) &&
                    !cleanGroup.includes(sGroup)
                  ) {
                    return false
                  }
                  const isSDate = sTitle.includes('ngày') || sTitle.includes('date')
                  const isColDate = cleanTitle.includes('ngày') || cleanTitle.includes('date')
                  if (isSDate !== isColDate) return false

                  return (
                    sTitle.length > 3 &&
                    cleanTitle.length > 3 &&
                    (sTitle.includes(cleanTitle) || cleanTitle.includes(sTitle))
                  )
                })
              }
            }

            // G. Khớp Title trên toàn bộ Schema (loại trừ các cột trùng tên cần phân định thứ tự như 'Họ tên')
            if (!matched) {
              // G1. Ưu tiên TUYỆT ĐỐI khớp chính xác Title 100% trên toàn bộ Schema
              matched = schemaList.find((s) => {
                const sTitle = clean(s.title)
                if (sTitle === 'họ tên' || sTitle === 'ho ten') return false
                const cleanSTitleNoParen = sTitle.replace(/\s*\(.*?\)/g, '').trim()
                const cleanColTitleNoParen = cleanTitle.replace(/\s*\(.*?\)/g, '').trim()
                return (
                  sTitle === cleanTitle ||
                  (cleanSTitleNoParen.length > 2 && cleanSTitleNoParen === cleanColTitleNoParen)
                )
              })

              // G2. Chỉ khi không có cột nào khớp chính xác thì mới xét khớp tương đối (và chặn nhầm lẫn Ngày vs Giờ)
              if (!matched) {
                matched = schemaList.find((s) => {
                  const sTitle = clean(s.title)
                  if (sTitle === 'họ tên' || sTitle === 'ho ten') return false
                  const isSDate = sTitle.includes('ngày') || sTitle.includes('date')
                  const isColDate = cleanTitle.includes('ngày') || cleanTitle.includes('date')
                  if (isSDate !== isColDate) return false

                  return (
                    sTitle.length > 3 &&
                    cleanTitle.length > 3 &&
                    (sTitle.includes(cleanTitle) || cleanTitle.includes(sTitle))
                  )
                })
              }
            }

            if (matched) {
              resolvedKey = matched.key
              resolvedTitle = matched.title || colTitle
              if (!colGroup && matched.group) {
                colGroup = matched.group
              }
            }
          }

          // 3. Quy tắc nhận diện bổ sung cho các cột đặc biệt (Phiếu duyệt, Tự động hóa)
          if (!resolvedKey) {
            const titleLower = cleanTitle
            const groupLower = cleanGroup

            if (titleLower.includes('họ tên') || titleLower.includes('technician')) {
              technicianCounter++
              if (
                groupLower.includes('chính') ||
                titleLower.includes('chính') ||
                technicianCounter === 1
              ) {
                resolvedKey = 'LeadTechnicianName'
                resolvedTitle = 'Họ tên'
                colGroup = colGroup || 'Thợ chính'
              } else if (
                groupLower.includes('phụ 1') ||
                titleLower.includes('phụ 1') ||
                technicianCounter === 2
              ) {
                resolvedKey = 'AssistantWorker1Name'
                resolvedTitle = 'Họ tên'
                colGroup = colGroup || 'Thợ phụ 1'
              } else if (
                groupLower.includes('phụ 2') ||
                titleLower.includes('phụ 2') ||
                technicianCounter === 3
              ) {
                resolvedKey = 'AssistantWorker2Name'
                resolvedTitle = 'Họ tên'
                colGroup = colGroup || 'Thợ phụ 2'
              } else {
                resolvedKey = `AssistantWorker${technicianCounter - 1}Name`
                resolvedTitle = 'Họ tên'
                colGroup = colGroup || `Thợ phụ ${technicianCounter - 1}`
              }
            } else if (
              titleLower.includes('mã phiếu') ||
              titleLower.includes('số phiếu tk') ||
              titleLower.includes('phiếu thống kê') ||
              titleLower === 'số phiếu'
            ) {
              resolvedKey =
                fileType === ARCHITECTURE_FILE_TYPES.MES_APPROVAL ? 'SlipNo' : 'StatSlipNo'
              resolvedTitle =
                fileType === ARCHITECTURE_FILE_TYPES.MES_APPROVAL ? 'Mã phiếu' : 'Số phiếu thống kê'
            } else if (
              titleLower.includes('mã lệnh thống kê bravo') ||
              titleLower.includes('thống kê bravo')
            ) {
              resolvedKey = 'BravoStatCode'
              resolvedTitle = 'Mã lệnh thống kê Bravo'
            } else if (
              titleLower.includes('thời gian duyệt phiếu ở mes') ||
              titleLower.includes('thời gian duyệt ở mes')
            ) {
              resolvedKey =
                fileType === ARCHITECTURE_FILE_TYPES.MES_APPROVAL
                  ? 'ApprovedTime'
                  : 'MesApprovedTime'
              resolvedTitle =
                fileType === ARCHITECTURE_FILE_TYPES.MES_APPROVAL
                  ? 'Thời gian duyệt'
                  : 'Thời gian duyệt phiếu ở MES'
            } else if (
              titleLower.includes('người phát hành') ||
              titleLower.includes('người tạo lệnh') ||
              titleLower.includes('người lập lệnh') ||
              titleLower.includes('pic điều phối') ||
              titleLower.includes('pic đp') ||
              titleLower.includes('pic dp')
            ) {
              resolvedKey = 'OrderIssuer'
              resolvedTitle = 'Người phát hành lệnh thao tác'
              colGroup = colGroup || 'THÔNG TIN PHÁT HÀNH LỆNH THAO TÁC'
            } else if (
              titleLower.includes('ngày phát hành') ||
              titleLower.includes('ngày tạo lệnh')
            ) {
              resolvedKey = 'OpOrderReleaseDate'
              resolvedTitle = 'Ngày phát hành lệnh thao tác'
              colGroup = colGroup || 'THÔNG TIN PHÁT HÀNH LỆNH THAO TÁC'
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
            const { origIndex, key, title, group } = headerDefs[i]
            const addr = XLSX.utils.encode_cell({ r, c: origIndex })
            const cell = worksheet[addr]
            let val = ''

            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
              hasRowData = true
              const rawVal = cell.v
              val = cell.w !== undefined ? cell.w : cell.v
              if (typeof val === 'string') {
                val = val.trim()
              }

              const titleLower = title.toLowerCase()
              const keyLower = key.toLowerCase()

              const isNumericOrQtyCol =
                titleLower.includes('số lượng') ||
                titleLower.includes('sl ') ||
                titleLower.startsWith('sl') ||
                titleLower.includes('mét') ||
                titleLower.includes('trọng lượng') ||
                titleLower.includes('đơn giá') ||
                titleLower.includes('thành tiền') ||
                titleLower.includes('tỷ lệ') ||
                titleLower.includes('số dao') ||
                titleLower.includes('số part') ||
                titleLower.includes('số lỗ') ||
                titleLower.includes('rộng') ||
                titleLower.includes('dài') ||
                titleLower.includes('cao') ||
                titleLower.includes('tổng tg hao phí') ||
                titleLower.includes('hao phí') ||
                titleLower.includes('chờ nvl') ||
                titleLower.includes('chuẩn bị') ||
                titleLower.includes('sửa file') ||
                titleLower.includes('tổng thời gian') ||
                titleLower.includes('thời gian sx đm') ||
                titleLower.includes('thời gian thay bài') ||
                titleLower.includes('thời gian chỉnh bài') ||
                titleLower.includes('năng suất') ||
                titleLower.includes('capa') ||
                titleLower.includes('downtime') ||
                titleLower.includes('định mức') ||
                titleLower.includes('phút') ||
                titleLower.includes('(phút)') ||
                keyLower.includes('qty') ||
                keyLower.includes('count') ||
                keyLower.includes('weight') ||
                keyLower.includes('meters') ||
                keyLower.includes('rate') ||
                keyLower.includes('width') ||
                keyLower.includes('length') ||
                keyLower.includes('height') ||
                keyLower.includes('minutes') ||
                keyLower.includes('hours') ||
                keyLower.includes('capa')

              const isDateOrTimeCol =
                !isNumericOrQtyCol &&
                (titleLower.includes('ngày') ||
                  titleLower.includes('thời gian') ||
                  titleLower.includes('bắt đầu') ||
                  titleLower.includes('kết thúc') ||
                  titleLower.includes('giờ') ||
                  keyLower.includes('date') ||
                  keyLower.includes('time') ||
                  keyLower.includes('created') ||
                  keyLower.includes('approval') ||
                  keyLower.includes('approved') ||
                  keyLower.includes('perform'))

              if (!isNumericOrQtyCol && (isDateOrTimeCol || cell.t === 'd')) {
                // Ưu tiên rawVal (cell.v) nếu là number hoặc Date để lấy đủ giờ:phút:giây
                const valToFormat =
                  typeof rawVal === 'number' || rawVal instanceof Date ? rawVal : val
                val = formatVietnamDateTimeValue(valToFormat, `${key}_${title}`)
              }
            }

            rowObj[key] = val

            const nonUniqueTitles = ['Họ tên', 'Mã thợ']
            if (title && title !== key && !nonUniqueTitles.includes(title)) {
              if (rowObj[title] === undefined) {
                rowObj[title] = val
              }
            }
            if (group && title) {
              rowObj[`${group} - ${title}`] = val
              if (title === 'Họ tên' || title === 'Mã thợ') {
                rowObj[group] = val
              }
            }
          }

          if (hasRowData) {
            normalizeRowOperationalTimePair(rowObj)

            // Đồng bộ 2 chiều Key tiếng Anh <-> Tiêu đề tiếng Việt cho các cột Lệnh công đoạn & Lệnh thao tác
            if (rowObj.StageTargetQty !== undefined) {
              rowObj['SL cần đạt (CĐ)'] = rowObj.StageTargetQty
              rowObj['Số lượng cần đạt (CĐ)'] = rowObj.StageTargetQty
              rowObj['Số lượng cần đạt'] = rowObj['Số lượng cần đạt'] ?? rowObj.StageTargetQty
            }
            if (rowObj.StagePlannedQty !== undefined) {
              rowObj['SL cần sản xuất (CĐ)'] = rowObj.StagePlannedQty
              rowObj['Số lượng cần sản xuất (CĐ)'] = rowObj.StagePlannedQty
              rowObj['Số lượng cần sản xuất'] = rowObj['Số lượng cần sản xuất'] ?? rowObj.StagePlannedQty
            }
            if (rowObj.StageOrderReleaseDate !== undefined) {
              rowObj['Ngày phát hành lệnh CĐ'] = rowObj.StageOrderReleaseDate
              rowObj['Ngày phát hành lệnh (CĐ)'] = rowObj.StageOrderReleaseDate
            }
            if (rowObj.StageOrderNo !== undefined) {
              rowObj['Số lệnh công đoạn'] = rowObj.StageOrderNo
            }
            if (rowObj.StageOrderDate !== undefined) {
              rowObj['Ngày lệnh công đoạn'] = rowObj.StageOrderDate
            }
            if (rowObj.OpTargetQty !== undefined) {
              rowObj['SL cần đạt (TT)'] = rowObj.OpTargetQty
              rowObj['Số lượng cần đạt (TT)'] = rowObj.OpTargetQty
            }
            if (rowObj.OpPlannedQty !== undefined) {
              rowObj['SL cần sản xuất (TT)'] = rowObj.OpPlannedQty
              rowObj['Số lượng cần sản xuất (TT)'] = rowObj.OpPlannedQty
            }
            if (rowObj.OpOrderReleaseDate !== undefined) {
              rowObj['Ngày phát hành lệnh TT'] = rowObj.OpOrderReleaseDate
              rowObj['Ngày phát hành lệnh (TT)'] = rowObj.OpOrderReleaseDate
            }
            if (rowObj.OpUnit !== undefined) {
              rowObj['Đvt'] = rowObj.OpUnit
            }

            if (!rowObj.IdSeq) {
              rowObj.IdSeq =
                typeof crypto !== 'undefined' && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `ROW-${Date.now()}-${r}`
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
