/**
 * GSHUB Production Calculation Bundle Packer
 * Chuyển đổi và nén tối ưu 6 Tab dữ liệu (từ ~50MB JSON xuống < 1MB binary package .gsprod)
 * Sử dụng mô hình Columnar Matrix kết hợp thuật toán nén DEFLATE / Gzip Level 9
 */
import pako from 'pako'

/**
 * Chuyển đổi danh sách đối tượng (Array of Objects) thành dạng Columnar Matrix
 * Loại bỏ toàn bộ các key bị lặp lại hàng chục nghìn lần (giảm ngay 80-90% dung lượng raw)
 */
export function objectsToMatrix(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { cols: [], rows: [] }
  }

  // Thu thập toàn diện danh sách các key/cột
  const colSet = new Set()
  const sampleLimit = Math.min(rows.length, 100)
  for (let i = 0; i < sampleLimit; i++) {
    const row = rows[i]
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => colSet.add(k))
    }
  }

  // Quét thưa các dòng còn lại đề phòng có thuộc tính động
  if (rows.length > 100) {
    for (let i = 100; i < rows.length; i += 25) {
      const row = rows[i]
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => colSet.add(k))
      }
    }
  }

  const cols = Array.from(colSet)
  const colCount = cols.length
  const rowCount = rows.length
  const matrixRows = new Array(rowCount)

  for (let i = 0; i < rowCount; i++) {
    const row = rows[i] || {}
    const r = new Array(colCount)
    for (let c = 0; c < colCount; c++) {
      const val = row[cols[c]]
      r[c] = val === undefined ? null : val
    }
    matrixRows[i] = r
  }

  return { cols, rows: matrixRows }
}

/**
 * Phục hồi cấu trúc ma trận Columnar Matrix trở lại mảng đối tượng
 */
export function matrixToObjects(matrix) {
  if (!matrix || !Array.isArray(matrix.cols) || !Array.isArray(matrix.rows)) {
    return []
  }

  const { cols, rows } = matrix
  const rowCount = rows.length
  const colCount = cols.length
  const result = new Array(rowCount)

  for (let i = 0; i < rowCount; i++) {
    const r = rows[i]
    const obj = {}
    if (Array.isArray(r)) {
      for (let c = 0; c < colCount; c++) {
        const val = r[c]
        if (val !== null && val !== undefined) {
          obj[cols[c]] = val
        }
      }
    }
    result[i] = obj
  }

  return result
}

/**
 * Đóng gói toàn bộ 6 Tab dữ liệu + Master Registration + Kết quả tính toán thành gói nhị phân siêu nén .gsprod
 * @param {Object} masterRecord - Thông tin đăng ký master
 * @param {Object} architectureFiles - Dữ liệu 4 file kiến trúc { STAT_REPORT: [...], ... }
 * @param {Object} calcResults - Kết quả tính { summary, plan, stat }
 * @param {Object} options - { version: '1.0' }
 * @returns {Uint8Array} Compressed binary buffer
 */
export function packProductionBundle(masterRecord = {}, architectureFiles = {}, calcResults = {}, options = {}) {
  const version = options.version || masterRecord.version || '1.0'

  const bundleObj = {
    format: 'GSHUB_PROD_BUNDLE',
    specVersion: '1.0',
    version,
    exportedAt: new Date().toISOString(),
    master: {
      ...masterRecord,
      version,
      status: 'PUBLISHED',
      isPublished: 1,
      publishedAt: masterRecord.publishedAt || new Date().toISOString()
    },
    architecture: {
      STAT_REPORT: objectsToMatrix(architectureFiles?.STAT_REPORT || []),
      UNFINISHED_OP: objectsToMatrix(architectureFiles?.UNFINISHED_OP || []),
      SUMMARY_OP: objectsToMatrix(architectureFiles?.SUMMARY_OP || []),
      MES_APPROVAL: objectsToMatrix(architectureFiles?.MES_APPROVAL || [])
    },
    results: {
      summary: calcResults?.summary || {},
      plan: objectsToMatrix(calcResults?.plan?.calculatedRows || calcResults?.plan || []),
      stat: objectsToMatrix(calcResults?.stat?.calculatedRows || calcResults?.stat || [])
    }
  }

  const jsonString = JSON.stringify(bundleObj)
  // Nén Gzip / Deflate với mức nén tối đa (Level 9)
  const compressedUint8Array = pako.gzip(jsonString, { level: 9 })
  return {
    buffer: compressedUint8Array,
    rawSize: jsonString.length,
    compressedSize: compressedUint8Array.length,
    ratio: ((1 - compressedUint8Array.length / Math.max(1, jsonString.length)) * 100).toFixed(1) + '%'
  }
}

/**
 * Giải nén gói .gsprod nhị phân và bung toàn bộ dữ liệu 6 Tab + Master về nguyên bản
 * @param {Uint8Array|ArrayBuffer|Buffer} buffer
 * @returns {Object} { master, architectureFiles, calcResults, version }
 */
export function unpackProductionBundle(buffer) {
  if (!buffer) throw new Error('Buffer gói dữ liệu không hợp lệ')

  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const decompressedString = pako.ungzip(uint8, { to: 'string' })
  const bundleObj = JSON.parse(decompressedString)

  if (bundleObj.format !== 'GSHUB_PROD_BUNDLE') {
    throw new Error('Định dạng gói không phải là GSHUB Production Package (.gsprod)')
  }

  const master = bundleObj.master || {}
  const arch = bundleObj.architecture || {}
  const res = bundleObj.results || {}

  return {
    version: bundleObj.version || '1.0',
    exportedAt: bundleObj.exportedAt,
    master: {
      ...master,
      status: master.status || 'PUBLISHED',
      version: master.version || '1.0'
    },
    architectureFiles: {
      STAT_REPORT: matrixToObjects(arch.STAT_REPORT),
      UNFINISHED_OP: matrixToObjects(arch.UNFINISHED_OP),
      SUMMARY_OP: matrixToObjects(arch.SUMMARY_OP),
      MES_APPROVAL: matrixToObjects(arch.MES_APPROVAL)
    },
    calcResults: {
      summary: res.summary || {},
      plan: { calculatedRows: matrixToObjects(res.plan) },
      stat: { calculatedRows: matrixToObjects(res.stat) }
    }
  }
}

/**
 * Chuyển Uint8Array sang Base64 chuỗi an toàn
 */
export function uint8ArrayToBase64(bytes) {
  if (!bytes) return ''
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

