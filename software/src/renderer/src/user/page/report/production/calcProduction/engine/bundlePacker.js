/**
 * GSHUB Production Calculation Bundle Packer
 * Chuyển đổi và nén tối ưu 6 Tab dữ liệu (từ ~50MB JSON xuống < 1MB binary package .gsprod)
 * Sử dụng mô hình Columnar Matrix kết hợp thuật toán nén DEFLATE / Gzip Level 9
 */
import pako from 'pako'
import {
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA
} from '../constants/calcConstants'

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
export function packProductionBundle(
  masterRecord = {},
  architectureFiles = {},
  calcResults = {},
  options = {}
) {
  let master = masterRecord || {}
  let arch = architectureFiles || {}
  let results = calcResults || {}
  let opt = options || {}

  // Hỗ trợ truyền 1 object duy nhất { masterInfo/masterRecord, filesData/architectureFiles, calcResults, options }
  if (masterRecord && typeof masterRecord === 'object' && !architectureFiles && !calcResults) {
    master = masterRecord.masterInfo || masterRecord.masterRecord || masterRecord.master || masterRecord
    arch = masterRecord.filesData || masterRecord.architectureFiles || masterRecord.architecture || {}
    results = masterRecord.calcResults || masterRecord.results || {}
    opt = masterRecord.options || {}
  } else if (
    masterRecord &&
    typeof masterRecord === 'object' &&
    (masterRecord.masterInfo || masterRecord.filesData || masterRecord.calcResults)
  ) {
    master = masterRecord.masterInfo || masterRecord.masterRecord || masterRecord.master || masterRecord
    arch = masterRecord.filesData || masterRecord.architectureFiles || architectureFiles || {}
    results = masterRecord.calcResults || calcResults || {}
    opt = masterRecord.options || options || {}
  }

  const getArrayFromArch = (...keys) => {
    for (const k of keys) {
      const item = arch[k]
      if (Array.isArray(item)) return item
      if (item && Array.isArray(item.data)) return item.data
    }
    return []
  }

  const getResultRows = (resItem) => {
    if (!resItem) return []
    if (Array.isArray(resItem)) return resItem
    if (Array.isArray(resItem.calculatedRows)) return resItem.calculatedRows
    if (Array.isArray(resItem.data)) return resItem.data
    return []
  }

  const version = opt.version || master.version || '1.0'

  const statData = getArrayFromArch('STAT_REPORT', 'stat_report', 'StatReport')
  const unfinData = getArrayFromArch('UNFINISHED_OP', 'unfinished_op', 'UnfinishedOp')
  const sumData = getArrayFromArch('SUMMARY_OP', 'summary_op', 'SummaryOp')
  const mesData = getArrayFromArch('MES_APPROVAL', 'mes_approval', 'MesApproval')

  const planResults = getResultRows(results?.plan)
  const statResults = getResultRows(results?.stat)

  const bundleObj = {
    format: 'GSHUB_PROD_BUNDLE',
    specVersion: '1.0',
    version,
    exportedAt: new Date().toISOString(),
    master: {
      ...master,
      version,
      status: 'PUBLISHED',
      isPublished: true,
      publishedAt: master.publishedAt || new Date().toISOString()
    },
    architecture: {
      STAT_REPORT: objectsToMatrix(statData),
      UNFINISHED_OP: objectsToMatrix(unfinData),
      SUMMARY_OP: objectsToMatrix(sumData),
      MES_APPROVAL: objectsToMatrix(mesData)
    },
    results: {
      summary: results?.summary || {},
      plan: objectsToMatrix(planResults),
      stat: objectsToMatrix(statResults)
    }
  }

  const jsonString = JSON.stringify(bundleObj)
  // Nén Gzip / Deflate với mức nén tối đa (Level 9)
  const compressedUint8Array = pako.gzip(jsonString, { level: 9 })
  const base64 = uint8ArrayToBase64(compressedUint8Array)
  return {
    buffer: compressedUint8Array,
    base64,
    rawSize: jsonString.length,
    compressedSize: compressedUint8Array.length,
    ratio:
      ((1 - compressedUint8Array.length / Math.max(1, jsonString.length)) * 100).toFixed(1) + '%'
  }
}

/**
 * Giải nén gói .gsprod nhị phân và bung toàn bộ dữ liệu 6 Tab + Master về nguyên bản
 * @param {Uint8Array|ArrayBuffer|Buffer} buffer
 * @returns {Object} { master, architectureFiles, filesData, calcResults, version }
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

  const statRows = matrixToObjects(arch.STAT_REPORT || arch.stat_report)
  const unfinRows = matrixToObjects(arch.UNFINISHED_OP || arch.unfinished_op)
  const sumRows = matrixToObjects(arch.SUMMARY_OP || arch.summary_op)
  const mesRows = matrixToObjects(arch.MES_APPROVAL || arch.mes_approval)

  const planCalculatedRows = matrixToObjects(res.plan?.calculatedRows || res.plan)
  const statCalculatedRows = matrixToObjects(res.stat?.calculatedRows || res.stat)

  const architectureFiles = {
    STAT_REPORT: statRows,
    UNFINISHED_OP: unfinRows,
    SUMMARY_OP: sumRows,
    MES_APPROVAL: mesRows
  }

  const filesData = {
    stat_report: {
      fileType: 'stat_report',
      fileName: '1. Thống kê sản xuất',
      data: statRows,
      rowCount: statRows.length,
      columns: STAT_REPORT_COLUMN_SCHEMA,
      isUploaded: statRows.length > 0
    },
    unfinished_op: {
      fileType: 'unfinished_op',
      fileName: '2. Lệnh thao tác chưa hoàn thành',
      data: unfinRows,
      rowCount: unfinRows.length,
      columns: UNFINISHED_OP_COLUMN_SCHEMA,
      isUploaded: unfinRows.length > 0
    },
    summary_op: {
      fileType: 'summary_op',
      fileName: '3. Tổng hợp lệnh thao tác',
      data: sumRows,
      rowCount: sumRows.length,
      columns: SUMMARY_OP_COLUMN_SCHEMA,
      isUploaded: sumRows.length > 0
    },
    mes_approval: {
      fileType: 'mes_approval',
      fileName: '4. Duyệt sản lượng ở MES',
      data: mesRows,
      rowCount: mesRows.length,
      columns: MES_APPROVAL_COLUMN_SCHEMA,
      isUploaded: mesRows.length > 0
    }
  }

  const masterInfo = {
    ...master,
    status: master.status || 'PUBLISHED',
    version: master.version || bundleObj.version || '1.0',
    isPublished: true
  }

  return {
    version: bundleObj.version || '1.0',
    exportedAt: bundleObj.exportedAt,
    master: masterInfo,
    masterInfo,
    architectureFiles,
    filesData,
    calcResults: {
      summary: res.summary || {},
      plan: { calculatedRows: planCalculatedRows },
      stat: { calculatedRows: statCalculatedRows },
      calculatedAt: bundleObj.exportedAt || new Date().toISOString()
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
