import {
  normalizeKey,
  createInvertedAliasMap,
  scanHeaderRow,
  formatExcelCellValue,
  readWorkbookToMatrix
} from '../../common/utils/excelCore'

// ── TỪ ĐIỂN ÁNH XẠ CỘT TKSX (Thống kê sản xuất - 13 nhóm cột) ──
export const STATISTICS_FIELD_ALIASES = {
  // Nhóm 1: Thông tin chung sản phẩm
  ItemCode: [
    'ma vat tu', 'ma vt', 'ma hang', 'ma sp', 'itemcode', 'item code', 'material code', 'product code', 'ma san pham'
  ],
  ItemName: [
    'ten vat tu', 'ten vt', 'ten hang', 'ten sp', 'itemname', 'item name', 'material name', 'ten san pham', 'san pham'
  ],
  Version: ['version', 'phien ban', 'ver', 'v'],
  Model: ['model', 'kieu dang', 'mau ma'],
  DefectMarginWeight: ['trong luong sp le ng', 'tl sp le ng', 'tl ng', 'defect margin weight', 'trong luong ng'],
  TechMarginWeight: ['trong luong le ky thuat', 'tl le ky thuat', 'tl kt', 'tech margin weight', 'le ky thuat'],

  // Nhóm 2: Thông tin lệnh thao tác
  OperationNo: [
    'so lenh thao tac', 'lenh thao tac', 'so ltt', 'ltt', 'operationno', 'operation no', 'ma lenh thao tac'
  ],
  MainWorker: ['tho chinh', 'nhan vien chinh', 'main worker', 'mainworker', 'tho 1'],
  SubWorker1: ['tho phu 1', 'phu 1', 'sub worker 1', 'subworker1', 'nhan vien phu 1'],
  SubWorker2: ['tho phu 2', 'phu 2', 'sub worker 2', 'subworker2', 'nhan vien phu 2'],
  BreakdownReason: ['nguyen nhan hong may', 'ly do hong may', 'nguyen nhan su co', 'breakdown reason', 'hong may'],
  MachineCode: ['ma may san xuat', 'ma may', 'machine code', 'machinecode', 'machine id'],
  MachineName: ['ten may san xuat', 'ten may', 'machine name', 'machinename', 'may san xuat'],
  OpTypeCode: ['ma phan loai thao tac', 'ma pl thao tac', 'op type code', 'optypecode'],
  OpTypeName: ['phan loai thao tac', 'pl thao tac', 'loai thao tac', 'op type name', 'optypename'],
  UvPlate: ['kem uv', 'ban kem uv', 'uv plate', 'uvplate'],
  MoldSetQty1: ['sl len khuon 1', 'so luong len khuon 1', 'len khuon 1', 'mold 1'],
  MoldSetQty2: ['sl len khuon 2', 'so luong len khuon 2', 'len khuon 2', 'mold 2'],
  MoldSetQty3: ['sl len khuon 3', 'so luong len khuon 3', 'len khuon 3', 'mold 3'],

  // Nhóm 3: Số lượng thực hiện
  ProdQty: ['so luong san xuat', 'sl san xuat', 'sl sx', 'so luong sx', 'prod qty', 'prodqty', 'tong sl sx'],
  PassQty: ['so luong dat', 'sl dat', 'sl dat yeu cau', 'pass qty', 'passqty', 'sl thanh pham'],
  ActualMeters: ['so met thuc te', 'met thuc te', 'so m thuc te', 'actual meters', 'actualmeters'],
  StandardMeters: ['so met dinh muc', 'met dinh muc', 'so m dinh muc', 'standard meters', 'standardmeters', 'dm met'],

  // Nhóm 4: Tổ & Ca sản xuất
  TeamName: ['to san xuat', 'to sx', 'to san xuat sx', 'team name', 'teamname', 'to'],
  Shift: ['ca san xuat', 'ca sx', 'ca lam viec', 'shift'],

  // Nhóm 5: Thời gian thực hiện
  StartDate: ['ngay bat dau', 'ngay bd', 'start date', 'startdate'],
  StartTime: ['bat dau', 'gio bat dau', 'thoi gian bat dau', 'tg bat dau', 'start time', 'starttime'],
  EndDate: ['ngay ket thuc', 'ngay kt', 'end date', 'enddate'],
  EndTime: ['ket thuc', 'gio ket thuc', 'thoi gian ket thuc', 'tg ket thuc', 'end time', 'endtime'],

  // Nhóm 6: Thông tin thống kê
  StatDate: ['ngay thong ke', 'ngay tk', 'stat date', 'statdate'],
  StatTicketNo: ['so phieu thong ke', 'so phieu tk', 'phieu thong ke', 'stat ticket no', 'statticketno', 'ma phieu tk'],
  StatStaff: ['nhan vien thong ke', 'nv thong ke', 'nguoi thong ke', 'stat staff', 'statstaff'],

  // Nhóm 7: Thông tin đơn hàng & Khách hàng
  Customer: ['khach hang', 'ten khach hang', 'kh', 'customer', 'customer name'],
  SalesStaff: ['nhan vien kinh doanh', 'nvkd', 'sales', 'sales staff', 'salesstaff', 'kd'],
  OrderNo: ['so don hang', 'ma don hang', 'don hang', 'order no', 'orderno', 'so'],
  ProcessName: ['cong doan', 'ten cong doan', 'process name', 'processname'],
  Unit: ['dvt', 'don vi tinh', 'don vi', 'unit'],
  ConvUnit: ['don vi quy doi', 'dvt quy doi', 'conv unit', 'convunit'],
  ProcessSpec: ['qtcn', 'quy trinh cong nghe', 'process spec'],
  PartNo: ['so part', 'part', 'part no', 'partno'],
  CorrugatedPartNo: ['so part song', 'part song', 'corrugated part no'],
  TrimPartNo: ['so part xen', 'part xen', 'trim part no'],
  ColorQty: ['so luong mau in', 'sl mau in', 'so mau in', 'color qty', 'so mau'],
  OutPlateType: ['loai out ban', 'out ban', 'out plate type'],
  FrontColors: ['so luong mau in mat 1', 'sl mau mat 1', 'mau mat 1', 'front colors'],
  BackColors: ['so luong mau in mat 2', 'sl mau mat 2', 'mau mat 2', 'back colors'],
  JobNumber: ['so job', 'job', 'job number', 'jobno'],
  Width: ['rong kho cuon', 'chieu rong', 'rong', 'width', 'w'],
  Length: ['dai chieu chat', 'chieu dai', 'dai', 'length', 'l'],
  Height: ['cao', 'chieu cao', 'height', 'h'],
  ProductLine: ['dong hang', 'nganh hang', 'product line', 'productline'],

  // Nhóm 8: Thông tin nguyên vật liệu
  RawWidth: ['rong kho cuon nvl', 'kho nvl', 'rong nvl', 'raw width'],
  RawLength: ['dai chieu chat nvl', 'dai nvl', 'raw length'],
  RawLineCode: ['ma dong hang nvl', 'ma nvl', 'raw line code'],
  RawLineName: ['dong hang nvl', 'ten nvl', 'raw line name'],
  FlipType: ['kieu tro', 'tro dau duoi', 'flip type'],
  BomPlates: ['so luong kem theo bom', 'sl kem bom', 'kem theo bom', 'bom plates'],
  Coating: ['phu', 'phu mang', 'phu uv', 'coating'],
  SlitterBlades: ['so dao chia', 'dao chia', 'slitter blades'],
  CodePositions: ['so vi tri ban code', 'ban code', 'code positions'],
  PunchHoles: ['so lo dot', 'lo dot', 'punch holes'],
  StructureCode: ['ma loai ket cau', 'ma ket cau', 'structure code'],
  StructureName: ['ten loai ket cau', 'ten ket cau', 'structure name'],

  // Nhóm 9: Lệnh công đoạn
  RoutingDocNo: ['so lenh cong doan', 'lenh cong doan', 'so lcd', 'lcd', 'routing doc no', 'routingdocno'],
  RoutingDate: ['ngay lenh cong doan', 'ngay lcd', 'routing date', 'routingdate'],
  ReleaseDate: ['ngay phat hanh lenh', 'ngay phat hanh', 'release date', 'releasedate'],
  TargetPassQty: ['so luong can dat', 'sl can dat', 'target pass qty', 'targetpassqty'],
  TargetProdQty: ['so luong can san xuat', 'sl can sx', 'sl can san xuat', 'target prod qty', 'targetprodqty'],
  RoutingUnit: ['dvt cong doan', 'dvt lcd', 'routing unit'],

  // Nhóm 10: Thời gian lãng phí
  BreakdownMinutes: ['tg hong may mat dien phut 01', 'tg hong may', 'tg mat dien', 'breakdown minutes'],
  WaitingMaterialMinutes: ['tg cho nvl phut 02', 'tg cho nvl', 'cho nvl', 'waiting material minutes'],
  SetupMinutes: ['tg chuan bi phut 03', 'tg chuan bi', 'chuan bi', 'setup minutes'],
  RepairMinutes: ['tg sua file khuon ban phut 04', 'tg sua file', 'sua khuon ban', 'repair minutes'],
  TotalWasteMinutes: ['tong tg hao phi', 'tong tg lang phi', 'tg hao phi', 'total waste minutes'],

  // Nhóm 11: Gia công & Lỗi NG
  RigidBoxGlue: ['boi chia hop cung', 'boi hop cung', 'rigid box glue'],
  Outsourcing: ['gia conc', 'gia cong', 'gia cong ngoai', 'outsourcing'],
  DefectQty: ['so luong loi', 'sl loi', 'sl ng', 'so luong ng', 'defect qty', 'defectqty'],
  DefectRate: ['ty le ng', 'ti le ng', 'ty le loi', 'ti le loi', 'defect rate', 'defectrate'],
  DefectUnit: ['dvt loi', 'dvt ng', 'defect unit'],
  Status: ['trang thai', 'tinh trang', 'status'],

  // Nhóm 12: Xuất nhập tự động
  AutoExport: ['xuat tu dong', 'tu dong xuat', 'auto export', 'autoexport'],
  AutoImport: ['nhap tu dong', 'tu dong nhap', 'auto import', 'autoimport'],
  ExportDocNo: ['so phieu xuat', 'phieu xuat', 'ma phieu xuat', 'export doc no', 'exportdocno'],
  ImportDocNo: ['so phieu nhap', 'phieu nhap', 'ma phieu nhap', 'import doc no', 'importdocno'],
  WrongOpCode: ['sai ma thao tac', 'sai ma', 'wrong op code', 'wrongopcode'],
  IsAdditionalStat: ['thong ke bo sung', 'tk bo sung', 'is additional stat'],
  TicketCreatedDate: ['ngay tao phieu', 'gio tao phieu', 'ticket created date'],

  // Nhóm 13: Đánh giá & Giám sát KHSX
  ActualRunTime: ['thoi gian chay thuc te', 'tg chay thuc te', 'actual run time', 'actualruntime'],
  ActualCapa: ['capa thuc te', 'cong suat thuc te', 'actual capa', 'actualcapa'],
  CheckPlanStatus: ['check khsx', 'danh gia khsx', 'check plan status'],
  MesApprovalTime: ['thoi gian duyet phieu o mes', 'tg duyet mes', 'mes approval time'],
  SyncDelayMinutes: ['do tre thoi gian dong bo 2 he thong', 'do tre dong bo', 'sync delay minutes'],
  IsDuplicateTicket: ['phieu sinh trung', 'sinh trung', 'is duplicate ticket'],
  TicketCreationLocation: ['vi tri tao phieu tk', 'noi tao phieu', 'ticket creation location'],
  AutoIoStatus: ['sinh phieu xuat nhap tu dong', 'trang thai xuat nhap', 'auto io status']
}

export const STAT_HEADER_KEYWORDS = [
  'so lenh thao tac', 'ma vat tu', 'ten vat tu', 'tho chinh', 'may san xuat',
  'so luong san xuat', 'so luong dat', 'ngay thong ke', 'to san xuat', 'so phieu thong ke'
]

const INVERTED_STAT_MAP = createInvertedAliasMap(STATISTICS_FIELD_ALIASES)

/**
 * Xử lý nạp file Excel riêng biệt cho Báo cáo Thống Kê Sản Xuất (TKSX)
 */
export function parseStatisticsExcelFast(buffer, defaultContext = {}) {
  const startTime = performance.now()
  const todayStr = defaultContext.applyDate || new Date().toISOString().slice(0, 10)

  const rawMatrix = readWorkbookToMatrix(buffer)
  const { rowIndex: headerRowIndex } = scanHeaderRow(rawMatrix, INVERTED_STAT_MAP, STAT_HEADER_KEYWORDS, 25)

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
      INVERTED_STAT_MAP.get(norm1) ||
      INVERTED_STAT_MAP.get(norm2) ||
      INVERTED_STAT_MAP.get(normCombined)

    if (matchedField) {
      colIndexToFieldName[c] = matchedField
      if (norm2 && INVERTED_STAT_MAP.get(norm2)) {
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

    parsedRows.push(normalizeStatRow(rowObj, parsedRows.length, todayStr))
  }

  const elapsedMs = Math.round(performance.now() - startTime)

  return {
    success: true,
    reportType: 'statistics',
    headerRowIndex,
    totalRows: parsedRows.length,
    elapsedMs,
    data: parsedRows
  }
}

/**
 * Chuẩn hóa 1 dòng dữ liệu Thống Kê Sản Xuất (TKSX) - Toàn bộ là Text nguyên bản từ Excel
 */
export function normalizeStatRow(raw, index, todayStr) {
  return {
    WorkingTag: 'A',
    ItemCode: String(raw.ItemCode ?? '').trim(),
    ItemName: String(raw.ItemName ?? '').trim(),
    Version: String(raw.Version ?? '').trim(),
    Model: String(raw.Model ?? '').trim(),
    DefectMarginWeight: String(raw.DefectMarginWeight ?? '').trim(),
    TechMarginWeight: String(raw.TechMarginWeight ?? '').trim(),
    OperationNo: String(raw.OperationNo ?? '').trim(),
    MainWorker: String(raw.MainWorker ?? '').trim(),
    SubWorker1: String(raw.SubWorker1 ?? '').trim(),
    SubWorker2: String(raw.SubWorker2 ?? '').trim(),
    BreakdownReason: String(raw.BreakdownReason ?? '').trim(),
    MachineCode: String(raw.MachineCode ?? '').trim(),
    MachineName: String(raw.MachineName ?? '').trim(),
    OpTypeCode: String(raw.OpTypeCode ?? '').trim(),
    OpTypeName: String(raw.OpTypeName ?? '').trim(),
    UvPlate: String(raw.UvPlate ?? '').trim(),
    MoldSetQty1: String(raw.MoldSetQty1 ?? '').trim(),
    MoldSetQty2: String(raw.MoldSetQty2 ?? '').trim(),
    MoldSetQty3: String(raw.MoldSetQty3 ?? '').trim(),
    ProdQty: String(raw.ProdQty ?? '').trim(),
    PassQty: String(raw.PassQty ?? '').trim(),
    ActualMeters: String(raw.ActualMeters ?? '').trim(),
    StandardMeters: String(raw.StandardMeters ?? '').trim(),
    TeamName: String(raw.TeamName ?? '').trim(),
    Shift: String(raw.Shift ?? '').trim(),
    StartDate: formatExcelCellValue(raw.StartDate),
    StartTime: formatExcelCellValue(raw.StartTime),
    EndDate: formatExcelCellValue(raw.EndDate),
    EndTime: formatExcelCellValue(raw.EndTime),
    StatDate: formatExcelCellValue(raw.StatDate),
    StatTicketNo: String(raw.StatTicketNo ?? '').trim(),
    StatStaff: String(raw.StatStaff ?? '').trim(),
    Customer: String(raw.Customer ?? '').trim(),
    SalesStaff: String(raw.SalesStaff ?? '').trim(),
    OrderNo: String(raw.OrderNo ?? '').trim(),
    ProcessName: String(raw.ProcessName ?? '').trim(),
    Unit: String(raw.Unit ?? '').trim(),
    ConvUnit: String(raw.ConvUnit ?? '').trim(),
    ProcessSpec: String(raw.ProcessSpec ?? '').trim(),
    PartNo: String(raw.PartNo ?? '').trim(),
    CorrugatedPartNo: String(raw.CorrugatedPartNo ?? '').trim(),
    TrimPartNo: String(raw.TrimPartNo ?? '').trim(),
    ColorQty: String(raw.ColorQty ?? '').trim(),
    OutPlateType: String(raw.OutPlateType ?? '').trim(),
    FrontColors: String(raw.FrontColors ?? '').trim(),
    BackColors: String(raw.BackColors ?? '').trim(),
    JobNumber: String(raw.JobNumber ?? '').trim(),
    Width: String(raw.Width ?? '').trim(),
    Length: String(raw.Length ?? '').trim(),
    Height: String(raw.Height ?? '').trim(),
    ProductLine: String(raw.ProductLine ?? '').trim(),
    RawWidth: String(raw.RawWidth ?? '').trim(),
    RawLength: String(raw.RawLength ?? '').trim(),
    RawLineCode: String(raw.RawLineCode ?? '').trim(),
    RawLineName: String(raw.RawLineName ?? '').trim(),
    FlipType: String(raw.FlipType ?? '').trim(),
    BomPlates: String(raw.BomPlates ?? '').trim(),
    Coating: String(raw.Coating ?? '').trim(),
    SlitterBlades: String(raw.SlitterBlades ?? '').trim(),
    CodePositions: String(raw.CodePositions ?? '').trim(),
    PunchHoles: String(raw.PunchHoles ?? '').trim(),
    StructureCode: String(raw.StructureCode ?? '').trim(),
    StructureName: String(raw.StructureName ?? '').trim(),
    RoutingDocNo: String(raw.RoutingDocNo ?? '').trim(),
    RoutingDate: formatExcelCellValue(raw.RoutingDate),
    ReleaseDate: formatExcelCellValue(raw.ReleaseDate),
    TargetPassQty: String(raw.TargetPassQty ?? '').trim(),
    TargetProdQty: String(raw.TargetProdQty ?? '').trim(),
    RoutingUnit: String(raw.RoutingUnit ?? '').trim(),
    BreakdownMinutes: String(raw.BreakdownMinutes ?? '').trim(),
    WaitingMaterialMinutes: String(raw.WaitingMaterialMinutes ?? '').trim(),
    SetupMinutes: String(raw.SetupMinutes ?? '').trim(),
    RepairMinutes: String(raw.RepairMinutes ?? '').trim(),
    TotalWasteMinutes: String(raw.TotalWasteMinutes ?? '').trim(),
    RigidBoxGlue: String(raw.RigidBoxGlue ?? '').trim(),
    Outsourcing: String(raw.Outsourcing ?? '').trim(),
    DefectQty: String(raw.DefectQty ?? '').trim(),
    DefectRate: String(raw.DefectRate ?? '').trim(),
    DefectUnit: String(raw.DefectUnit ?? '').trim(),
    Status: String(raw.Status ?? '').trim(),
    AutoExport: String(raw.AutoExport ?? '').trim(),
    AutoImport: String(raw.AutoImport ?? '').trim(),
    ExportDocNo: String(raw.ExportDocNo ?? '').trim(),
    ImportDocNo: String(raw.ImportDocNo ?? '').trim(),
    WrongOpCode: String(raw.WrongOpCode ?? '').trim(),
    IsAdditionalStat: String(raw.IsAdditionalStat ?? '').trim(),
    TicketCreatedDate: formatExcelCellValue(raw.TicketCreatedDate),
    ActualRunTime: String(raw.ActualRunTime ?? '').trim(),
    ActualCapa: String(raw.ActualCapa ?? '').trim(),
    CheckPlanStatus: String(raw.CheckPlanStatus ?? '').trim(),
    MesApprovalTime: String(raw.MesApprovalTime ?? '').trim(),
    SyncDelayMinutes: String(raw.SyncDelayMinutes ?? '').trim(),
    IsDuplicateTicket: String(raw.IsDuplicateTicket ?? '').trim(),
    TicketCreationLocation: String(raw.TicketCreationLocation ?? '').trim(),
    AutoIoStatus: String(raw.AutoIoStatus ?? '').trim()
  }
}

export default {
  parseStatisticsExcelFast,
  normalizeStatRow,
  STATISTICS_FIELD_ALIASES,
  STAT_HEADER_KEYWORDS
}
