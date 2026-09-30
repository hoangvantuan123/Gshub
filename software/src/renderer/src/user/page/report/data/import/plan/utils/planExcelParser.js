import {
  normalizeKey,
  createInvertedAliasMap,
  scanHeaderRow,
  formatExcelCellValue,
  readWorkbookToMatrix
} from '../../common/utils/excelCore'

// ── TỪ ĐIỂN ÁNH XẠ CỘT KHSX (Điều phối Kế hoạch sản xuất - 24 cột) ──
export const PLAN_FIELD_ALIASES = {
  PicDp: ['pic dp', 'pic dieu phoi', 'nguoi dieu phoi', 'ke hoach vien', 'picdp', 'pic'],
  OperationNo: [
    'so lenh thao tac',
    'lenh thao tac',
    'so ltt',
    'ltt',
    'operation no',
    'operationno'
  ],
  OpDate: ['ngay thuc hien thao tac', 'ngay thao tac', 'ngay thuc hien', 'op date', 'opdate'],
  RoutingDocNo: [
    'so lenh cong doan',
    'lenh cong doan',
    'so lcd',
    'lcd',
    'routing doc no',
    'routingdocno'
  ],
  RoutingDocDate: [
    'ngay tao lenh cong doan',
    'ngay lenh cong doan',
    'ngay lcd',
    'routing doc date',
    'routingdocdate'
  ],
  ItemCode: ['ma hang', 'ma vat tu', 'ma vt', 'ma sp', 'item code', 'itemcode', 'product code'],
  ItemName: ['ten hang', 'ten vat tu', 'ten vt', 'ten sp', 'item name', 'itemname', 'product name'],
  OperationName: ['thao tac', 'ten thao tac', 'operation name', 'operationname'],
  OpTypeName: ['phan loai thao tac', 'pl thao tac', 'loai thao tac', 'op type name', 'optypename'],
  MachineName: ['may san xuat', 'ten may', 'may sx', 'machine name', 'machinename'],
  Unit: ['dvt', 'don vi tinh', 'don vi', 'unit'],
  TargetPassQty: [
    'so luong can dat ltt',
    'sl can dat ltt',
    'so luong can dat',
    'sl can dat',
    'target pass qty',
    'targetpassqty'
  ],
  TargetProdQty: [
    'so luong can san xuat',
    'sl can san xuat',
    'sl can sx',
    'target prod qty',
    'targetprodqty'
  ],
  StatPassQty: [
    'so luong da thong ke dat',
    'sl da thong ke dat',
    'sl da tk dat',
    'sl thong ke dat',
    'stat pass qty',
    'statpassqty'
  ],
  StartTime: [
    'thoi gian bat dau',
    'gio bat dau',
    'tg bat dau',
    'bat dau',
    'start time',
    'starttime'
  ],
  EndTime: ['thoi gian ket thuc', 'gio ket thuc', 'tg ket thuc', 'ket thuc', 'end time', 'endtime'],
  StandardProdTime: [
    'thoi gian san xuat theo dm',
    'tg san xuat theo dm',
    'tg sx dinh muc',
    'tg sx dm',
    'standard prod time'
  ],
  ActualProdTime: [
    'thoi gian san xuat',
    'tg san xuat',
    'tg sx thuc te',
    'actual prod time',
    'actualprodtime'
  ],
  StandardCapa: ['capa dm', 'cong suat dinh muc', 'capa dinh muc', 'standard capa', 'standardcapa'],
  ActualCapa: ['capa thuc te', 'cong suat thuc te', 'actual capa', 'actualcapa'],
  StatusDpSx: [
    'trang thai dp sx',
    'trang thai dieu phoi sx',
    'trang thai dp',
    'status dp sx',
    'statusdpsx'
  ],
  TimeStatus: ['trang thai thoi gian', 'tien do thoi gian', 'time status', 'timestatus'],
  CapaStatus: ['trang thai capa khsx dieu phoi', 'trang thai capa', 'capa status', 'capastatus']
}

export const PLAN_HEADER_KEYWORDS = [
  'pic dp',
  'so lenh thao tac',
  'ngay thuc hien thao tac',
  'so lenh cong doan',
  'ma hang',
  'ten hang',
  'thao tac',
  'may san xuat',
  'so luong can dat ltt',
  'capa dm'
]

const INVERTED_PLAN_MAP = createInvertedAliasMap(PLAN_FIELD_ALIASES)

/**
 * Xử lý nạp file Excel riêng biệt cho Kế Hoạch Sản Xuất & Điều Phối (KHSX)
 */
export function parsePlanExcelFast(buffer, defaultContext = {}) {
  const startTime = performance.now()
  const todayStr = defaultContext.applyDate || new Date().toISOString().slice(0, 10)

  const rawMatrix = readWorkbookToMatrix(buffer)
  const { rowIndex: headerRowIndex } = scanHeaderRow(
    rawMatrix,
    INVERTED_PLAN_MAP,
    PLAN_HEADER_KEYWORDS,
    25
  )

  const headerRow1 = rawMatrix[headerRowIndex] || []
  const headerRow2 = rawMatrix[headerRowIndex + 1] || []
  const maxCols = Math.max(headerRow1.length, headerRow2.length)
  const colIndexToFieldName = []
  let isTwoLevelHeader = false

  for (let c = 0; c < maxCols; c++) {
    const val1 = headerRow1[c] || ''
    const val2 = headerRow2[c] || ''
    const norm1 = normalizeKey(val1)
    const norm2 = normalizeKey(val2)
    const normCombined = normalizeKey(`${val1} ${val2}`)

    let matchedField =
      INVERTED_PLAN_MAP.get(norm1) ||
      INVERTED_PLAN_MAP.get(norm2) ||
      INVERTED_PLAN_MAP.get(normCombined)

    if (matchedField) {
      colIndexToFieldName[c] = matchedField
      if (norm2 && INVERTED_PLAN_MAP.get(norm2)) {
        isTwoLevelHeader = true
      }
    } else {
      colIndexToFieldName[c] = null
    }
  }

  const dataStartRow = isTwoLevelHeader ? headerRowIndex + 2 : headerRowIndex + 1
  const parsedRows = []

  for (let r = dataStartRow; r < rawMatrix.length; r++) {
    const rowCells = rawMatrix[r]
    if (!rowCells || rowCells.length === 0) continue

    const hasData = rowCells.some((c) => c !== '' && c !== null && c !== undefined)
    if (!hasData) continue

    const rowObj = { WorkingTag: 'A' }

    for (let c = 0; c < rowCells.length; c++) {
      const fieldName = colIndexToFieldName[c]
      if (fieldName) {
        rowObj[fieldName] = rowCells[c]
      }
    }

    parsedRows.push(normalizePlanRow(rowObj, parsedRows.length, todayStr))
  }

  const elapsedMs = Math.round(performance.now() - startTime)

  return {
    success: true,
    reportType: 'plan',
    headerRowIndex,
    totalRows: parsedRows.length,
    elapsedMs,
    data: parsedRows
  }
}

/**
 * Chuẩn hóa 1 dòng dữ liệu Kế Hoạch Sản Xuất & Điều Phối (KHSX) - Toàn bộ là Text nguyên bản từ Excel
 */
export function normalizePlanRow(raw, index, todayStr) {
  return {
    WorkingTag: 'A',
    PicDp: String(raw.PicDp ?? '').trim(),
    OperationNo: String(raw.OperationNo ?? '').trim(),
    OpDate: formatExcelCellValue(raw.OpDate),
    RoutingDocNo: String(raw.RoutingDocNo ?? '').trim(),
    RoutingDocDate: formatExcelCellValue(raw.RoutingDocDate),
    ItemCode: String(raw.ItemCode ?? '').trim(),
    ItemName: String(raw.ItemName ?? '').trim(),
    OperationName: String(raw.OperationName ?? '').trim(),
    OpTypeName: String(raw.OpTypeName ?? '').trim(),
    MachineName: String(raw.MachineName ?? '').trim(),
    Unit: String(raw.Unit ?? '').trim(),
    TargetPassQty: String(raw.TargetPassQty ?? '').trim(),
    TargetProdQty: String(raw.TargetProdQty ?? '').trim(),
    StatPassQty: String(raw.StatPassQty ?? '').trim(),
    StartTime: formatExcelCellValue(raw.StartTime),
    EndTime: formatExcelCellValue(raw.EndTime),
    StandardProdTime: String(raw.StandardProdTime ?? '').trim(),
    ActualProdTime: String(raw.ActualProdTime ?? '').trim(),
    StandardCapa: String(raw.StandardCapa ?? '').trim(),
    ActualCapa: String(raw.ActualCapa ?? '').trim(),
    StatusDpSx: String(raw.StatusDpSx ?? '').trim(),
    TimeStatus: String(raw.TimeStatus ?? '').trim(),
    CapaStatus: String(raw.CapaStatus ?? '').trim()
  }
}

export default {
  parsePlanExcelFast,
  normalizePlanRow,
  PLAN_FIELD_ALIASES,
  PLAN_HEADER_KEYWORDS
}
