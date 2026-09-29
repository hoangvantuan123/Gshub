import * as XLSX from 'xlsx'

/**
 * Normalizes text for robust header matching:
 * - Converts to lowercase
 * - Removes Vietnamese accents / diacritics
 * - Removes special characters / punctuation
 * - Trims multiple whitespace
 */
export function normalizeKey(str) {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Creates an inverted alias Map from { FieldName: ['alias1', 'alias2', ...] }
 */
export function createInvertedAliasMap(aliasDict) {
  const map = new Map()
  for (const [fieldName, aliases] of Object.entries(aliasDict)) {
    map.set(normalizeKey(fieldName), fieldName)
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        map.set(normalizeKey(alias), fieldName)
      }
    }
  }
  return map
}

/**
 * Automatically scans 2D matrix rows to locate the header row with the highest match score
 */
export function scanHeaderRow(rows = [], invertedMap, headerKeywords = [], maxScan = 25) {
  if (!rows || rows.length === 0) return { rowIndex: 0, score: 0 }

  const scanLimit = Math.min(rows.length, maxScan)
  let bestRowIndex = 0
  let bestScore = -1

  for (let r = 0; r < scanLimit; r++) {
    const row = rows[r]
    if (!Array.isArray(row) || row.length === 0) continue

    const normalizedCells = row.map((c) => normalizeKey(c))
    let currentScore = 0

    normalizedCells.forEach((cell) => {
      if (!cell) return
      if (invertedMap.has(cell)) currentScore++
      if (headerKeywords.some((kw) => cell.includes(kw))) currentScore += 2
    })

    if (currentScore > bestScore && currentScore >= 2) {
      bestScore = currentScore
      bestRowIndex = r
    }
  }

  return { rowIndex: bestRowIndex, score: bestScore }
}

/**
 * Safely parses any cell value to Number
 */
export function parseExcelNumber(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val

  const str = String(val).trim().replace(/\s+/g, '')
  if (!str) return defaultVal

  if (str.endsWith('%')) {
    const num = parseFloat(str.replace('%', ''))
    return isNaN(num) ? defaultVal : num
  }

  let cleanStr = str
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleanStr)) {
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleanStr)) {
    cleanStr = cleanStr.replace(/,/g, '')
  } else {
    cleanStr = cleanStr.replace(/,/g, '.')
  }

  const result = parseFloat(cleanStr)
  return isNaN(result) ? defaultVal : result
}

/**
 * Safely parses any cell value to Boolean
 */
export function parseExcelBoolean(val, defaultVal = false) {
  if (val === null || val === undefined) return defaultVal
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val === 1

  const str = normalizeKey(val)
  if (['co', 'dung', 'true', '1', 'yes', 'y', 'x', 'dat', 'hoan thanh'].includes(str)) return true
  if (['khong', 'sai', 'false', '0', 'no', 'n', 'chua'].includes(str)) return false
  return defaultVal
}

/**
 * Format any cell value to exact string as expected from Excel
 */
export function formatExcelCellValue(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val.trim()

  if (val instanceof Date && !isNaN(val)) {
    const hours = val.getUTCHours()
    const minutes = val.getUTCMinutes()
    const seconds = val.getUTCSeconds()
    const year = val.getUTCFullYear()
    const month = String(val.getUTCMonth() + 1).padStart(2, '0')
    const day = String(val.getUTCDate()).padStart(2, '0')

    // If date is base epoch (1899/1900), it's purely a time value
    if (year === 1899 || year === 1900) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    if (hours === 0 && minutes === 0 && seconds === 0) {
      return `${year}-${month}-${day}`
    }
    return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Handle fractional day numbers representing time in Excel (e.g., 0.3125 -> 07:30)
  if (typeof val === 'number' && val >= 0 && val < 1 && val !== 0) {
    const totalMinutes = Math.round(val * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Handle Excel Serial Dates (e.g., 45000 -> 2023-03-15)
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const excelEpoch = new Date(1899, 11, 30)
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000)
    return jsDate.toISOString().slice(0, 10)
  }

  return String(val).trim()
}

/**
 * Backward-compatible export alias for parseExcelDateOrTime
 */
export const parseExcelDateOrTime = formatExcelCellValue


/**
 * Reads binary buffer to 2D matrix with unmerged cells and formatted text
 */
export function readWorkbookToMatrix(buffer) {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,
    cellText: true
  })

  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error('Không tìm thấy Sheet nào trong file Excel!')
  }

  // Tự động lan tỏa dữ liệu ô gộp (Merged Cells) cho toàn bộ vùng gộp (đặc biệt là Header)
  if (worksheet['!merges'] && Array.isArray(worksheet['!merges'])) {
    worksheet['!merges'].forEach((merge) => {
      const startCellRef = XLSX.utils.encode_cell(merge.s)
      const masterCell = worksheet[startCellRef]
      if (masterCell) {
        for (let R = merge.s.r; R <= merge.e.r; ++R) {
          for (let C = merge.s.c; C <= merge.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
            if (!worksheet[cellRef]) {
              worksheet[cellRef] = { ...masterCell }
            }
          }
        }
      }
    })
  }

  // Lấy dữ liệu dưới dạng ma trận 2D giữ nguyên chuỗi định dạng Excel (raw: false)
  const rawMatrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false
  })

  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('File Excel rỗng hoặc không có dữ liệu hợp lệ!')
  }

  return rawMatrix
}

