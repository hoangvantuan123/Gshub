/**
 * Module Chuẩn Hóa và Ánh Xạ Đa Chiều Cột Báo Cáo KHSX & TKSX
 * Quy chuẩn tự động 98 cột TKSX và 24 cột KHSX từ mọi định dạng (Tiếng Việt, CamelCase, PascalCase, SnakeCase, Schema Keys)
 */

const normalizeText = (str) => {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// ── BẢNG ÁNH XẠ 98 CỘT BÁO CÁO THỐNG KÊ SẢN XUẤT (TKSX) ──
export const TKSX_COLUMN_MAPPING = {
  ItemCode: [
    'ItemCode', 'itemCode', 'MaterialCode', 'materialCode', 'ProductCode', 'productCode',
    'Mã vật tư', 'Mã SP', 'Mã hàng', 'item_code', 'material_code', 'ma vat tu', 'ma vt', 'ma hang', 'ma sp'
  ],
  ItemName: [
    'ItemName', 'itemName', 'MaterialName', 'materialName', 'ProductName', 'productName',
    'Tên vật tư', 'Tên sản phẩm', 'Tên hàng', 'item_name', 'material_name', 'ten vat tu', 'ten vt', 'ten hang', 'ten sp'
  ],
  Version: [
    'Version', 'version', 'Phiên bản', 'Ver', 'ver', 'phien ban'
  ],
  Model: [
    'Model', 'model', 'Kiểu dáng', 'kieu dang'
  ],
  DefectMarginWeight: [
    'DefectMarginWeight', 'defectMarginWeight', 'ProductNgWeight', 'productNgWeight',
    'Trọng lượng Sp/lề NG', 'Trọng lượng SP NG', 'Trọng lượng lề NG', 'TL SP NG', 'TL NG',
    'Trọng lượng Sp lề NG', 'trong luong sp le ng', 'tl sp le ng', 'defect margin weight'
  ],
  TechMarginWeight: [
    'TechMarginWeight', 'techMarginWeight', 'TechnicalMarginWeight', 'technicalMarginWeight',
    'Trọng lượng lề kỹ thuật', 'TL lề KT', 'Trọng lượng lề KT', 'TL KT', 'Lề kỹ thuật',
    'trong luong le ky thuat', 'tl le ky thuat', 'tech margin weight'
  ],
  OperationNo: [
    'OperationNo', 'operationNo', 'OperationOrderNo', 'operationOrderNo',
    'Số lệnh thao tác', 'Số lệnh TT', 'Mã lệnh thao tác', 'Lệnh thao tác', 'Số LTT', 'LTT',
    'operation_no', 'so lenh thao tac', 'so lenh tt'
  ],
  MainWorker: [
    'MainWorker', 'mainWorker', 'LeadTechnicianName', 'leadTechnicianName',
    'Thợ chính', 'Họ tên thợ chính', 'Thợ chính - Họ tên', 'Họ tên', 'Họ và tên',
    'main_worker', 'lead_technician_name', 'tho chinh', 'ho ten tho chinh'
  ],
  SubWorker1: [
    'SubWorker1', 'subWorker1', 'AssistantWorker1Name', 'assistantWorker1Name',
    'Thợ phụ 1', 'Họ tên thợ phụ 1', 'Thợ phụ 1 - Họ tên', 'Họ tên_1', 'Họ tên 1', 'Họ tên.1',
    'sub_worker_1', 'assistant_worker_1_name', 'tho phu 1', 'ho ten tho phu 1'
  ],
  SubWorker2: [
    'SubWorker2', 'subWorker2', 'AssistantWorker2Name', 'assistantWorker2Name',
    'Thợ phụ 2', 'Họ tên thợ phụ 2', 'Thợ phụ 2 - Họ tên', 'Họ tên_2', 'Họ tên 2', 'Họ tên.2',
    'sub_worker_2', 'assistant_worker_2_name', 'tho phu 2', 'ho ten tho phu 2'
  ],
  BreakdownReason: [
    'BreakdownReason', 'breakdownReason', 'MachineBreakdownReason', 'machineBreakdownReason',
    'Nguyên nhân hỏng máy', 'Lý do hỏng máy', 'Nguyên nhân sự cố', 'Hỏng máy',
    'breakdown_reason', 'nguyen nhan hong may', 'ly do hong may'
  ],
  MachineCode: [
    'MachineCode', 'machineCode', 'Mã máy sản xuất', 'Mã máy', 'MachineID', 'machine_code',
    'ma may san xuat', 'ma may'
  ],
  MachineName: [
    'MachineName', 'machineName', 'Tên máy sản xuất', 'Tên máy', 'Máy sản xuất',
    'machine_name', 'ten may san xuat', 'ten may'
  ],
  OpTypeCode: [
    'OpTypeCode', 'opTypeCode', 'OperationTypeCode', 'operationTypeCode',
    'Mã phân loại thao tác', 'Mã loại thao tác', 'Mã PL thao tác', 'op_type_code',
    'ma phan loai thao tac'
  ],
  OpTypeName: [
    'OpTypeName', 'opTypeName', 'OperationTypeName', 'operationTypeName',
    'Phân loại thao tác', 'Tên phân loại thao tác', 'PL thao tác', 'Loại thao tác',
    'op_type_name', 'phan loai thao tac'
  ],
  UvPlate: [
    'UvPlate', 'uvPlate', 'Kẽm UV', 'Bản UV', 'Bản kẽm UV', 'uv_plate', 'kem uv'
  ],
  MoldSetQty1: [
    'MoldSetQty1', 'moldSetQty1', 'MoldSetupQty1', 'moldSetupQty1',
    'SL lên khuôn 1', 'Số lượng lên khuôn 1', 'Lên khuôn 1', 'mold_set_qty_1',
    'sl len khuon 1', 'so luong len khuon 1'
  ],
  MoldSetQty2: [
    'MoldSetQty2', 'moldSetQty2', 'MoldSetupQty2', 'moldSetupQty2',
    'SL lên khuôn 2', 'Số lượng lên khuôn 2', 'Lên khuôn 2', 'mold_set_qty_2',
    'sl len khuon 2', 'so luong len khuon 2'
  ],
  MoldSetQty3: [
    'MoldSetQty3', 'moldSetQty3', 'MoldSetupQty3', 'moldSetupQty3',
    'SL lên khuôn 3', 'Số lượng lên khuôn 3', 'Lên khuôn 3', 'mold_set_qty_3',
    'sl len khuon 3', 'so luong len khuon 3'
  ],
  ProdQty: [
    'ProdQty', 'prodQty', 'ProducedQty', 'producedQty',
    'Số lượng sản xuất', 'SL sản xuất', 'SL SX', 'SanLuongSX', 'Số lượng thực hiện', 'Tổng SL SX',
    'prod_qty', 'produced_qty', 'so luong san xuat', 'sl san xuat', 'sl sx'
  ],
  PassQty: [
    'PassQty', 'passQty', 'QualifiedQty', 'qualifiedQty',
    'Số lượng đạt', 'SL đạt', 'SanLuongDat', 'SL đạt yêu cầu', 'SL thành phẩm',
    'pass_qty', 'qualified_qty', 'so luong dat', 'sl dat'
  ],
  ActualMeters: [
    'ActualMeters', 'actualMeters', 'ActualPassMeters', 'actualPassMeters',
    'Số mét thực tế', 'Số mét TT', 'Mét thực tế', 'Số m thực tế',
    'actual_meters', 'so met thuc te', 'so met tt'
  ],
  StandardMeters: [
    'StandardMeters', 'standardMeters', 'StandardPlanMeters', 'standardPlanMeters',
    'Số mét định mức', 'Số mét ĐM', 'Mét định mức', 'Số m định mức',
    'standard_meters', 'so met dinh muc', 'so met dm'
  ],
  TeamName: [
    'TeamName', 'teamName', 'ProductionTeam', 'productionTeam',
    'Tổ sản xuất', 'Tổ SX', 'TenTo', 'team_name', 'to san xuat', 'to sx'
  ],
  Shift: [
    'Shift', 'shift', 'ProductionShift', 'productionShift',
    'Ca sản xuất', 'Ca SX', 'Ca', 'Ca làm việc', 'shift', 'ca san xuat', 'ca sx'
  ],
  StartTime: [
    'StartTime', 'startTime', 'StartProductionTime', 'startProductionTime',
    'Bắt đầu', 'Giờ bắt đầu', 'Thời gian bắt đầu', 'GioBD', 'TG bắt đầu',
    'start_time', 'bat dau', 'gio bat dau'
  ],
  EndTime: [
    'EndTime', 'endTime', 'EndProductionTime', 'endProductionTime',
    'Kết thúc', 'Giờ kết thúc', 'Thời gian kết thúc', 'GioKT', 'TG kết thúc',
    'end_time', 'ket thuc', 'gio ket thuc'
  ],
  StartDate: [
    'StartDate', 'startDate', 'StartProductionDate', 'startProductionDate',
    'Ngày bắt đầu', 'NgayBD', 'start_date', 'ngay bat dau', 'ngay bd'
  ],
  EndDate: [
    'EndDate', 'endDate', 'EndProductionDate', 'endProductionDate',
    'Ngày kết thúc', 'NgayKT', 'end_date', 'ngay ket thuc', 'ngay kt'
  ],
  StatDate: [
    'StatDate', 'statDate', 'StatisticsDate', 'statisticsDate',
    'Ngày thống kê', 'NgayTK', 'stat_date', 'ngay thong ke', 'ngay tk'
  ],
  StatTicketNo: [
    'StatTicketNo', 'statTicketNo', 'StatSlipNo', 'statSlipNo',
    'BravoStatTicketNo', 'bravoStatTicketNo', 'BravoStatCode', 'bravoStatCode',
    'Số phiếu thống kê', 'Mã lệnh thống kê Bravo', 'Số phiếu TK', 'Phiếu TK', 'Phiếu thống kê', 'Mã phiếu TK',
    'stat_ticket_no', 'so phieu thong ke', 'so phieu tk', 'phieu tk'
  ],
  StatStaff: [
    'StatStaff', 'statStaff', 'StatEmployee', 'statEmployee',
    'Nhân viên thống kê', 'NV thống kê', 'Người thống kê',
    'stat_staff', 'nhan vien thong ke', 'nv thong ke'
  ],
  Customer: [
    'Customer', 'customer', 'CustomerName', 'customerName',
    'Khách hàng', 'Tên khách hàng', 'KH', 'customer', 'khach hang', 'ten khach hang'
  ],
  SalesStaff: [
    'SalesStaff', 'salesStaff', 'SalesPerson', 'salesPerson',
    'Nhân viên kinh doanh', 'NV kinh doanh', 'NVKD', 'Sales',
    'sales_staff', 'nhan vien kinh doanh', 'nvkd'
  ],
  OrderNo: [
    'OrderNo', 'orderNo', 'OrderDocNo', 'orderDocNo', 'SoNo', 'soNo',
    'Số đơn hàng', 'Đơn hàng', 'Mã đơn hàng', 'Số SO', 'order_no', 'so don hang', 'don hang'
  ],
  ProcessName: [
    'ProcessName', 'processName', 'StageCode', 'stageCode', 'WorkProcessName', 'workProcessName',
    'Công đoạn', 'Tên công đoạn', 'Mã công đoạn', 'process_name', 'cong doan', 'ten cong doan'
  ],
  Unit: [
    'Unit', 'unit', 'UnitOfMeasure', 'unitOfMeasure',
    'Đvt', 'Đơn vị tính', 'ĐVT', 'Đơn vị', 'unit', 'dvt', 'don vi tinh'
  ],
  ConvUnit: [
    'ConvUnit', 'convUnit', 'ConvertUnit', 'convertUnit', 'ConversionUnit', 'conversionUnit',
    'Đơn vị quy đổi', 'ĐV quy đổi', 'ĐVT quy đổi', 'conv_unit', 'don vi quy doi'
  ],
  ProcessSpec: [
    'ProcessSpec', 'processSpec', 'ProcessFlow', 'processFlow', 'ProcessSpecDescription', 'processSpecDescription',
    'QTCN', 'Quy trình công nghệ', 'process_spec', 'qtcn', 'quy trinh cong nghe'
  ],
  PartNo: [
    'PartNo', 'partNo', 'PartCount', 'partCount',
    'Số part', 'Part', 'Số part sản phẩm', 'part_no', 'so part'
  ],
  CorrugatedPartNo: [
    'CorrugatedPartNo', 'corrugatedPartNo', 'CorrugatorPartCount', 'corrugatorPartCount', 'CorrugatedPartCount', 'corrugatedPartCount',
    'Số part sóng', 'Part sóng', 'corrugated_part_no', 'so part song'
  ],
  TrimPartNo: [
    'TrimPartNo', 'trimPartNo', 'CutPartCount', 'cutPartCount', 'TrimPartCount', 'trimPartCount',
    'Số part xén', 'Part xén', 'trim_part_no', 'so part xen'
  ],
  ColorQty: [
    'ColorQty', 'colorQty', 'PrintColorCount', 'printColorCount',
    'Số lượng màu in', 'Số màu in', 'SL màu in', 'Số màu', 'color_qty', 'so luong mau in', 'so mau in'
  ],
  OutPlateType: [
    'OutPlateType', 'outPlateType', 'PlateOutType', 'plateOutType',
    'Loại Out bản', 'Loại out bản', 'Out bản', 'out_plate_type', 'loai out ban'
  ],
  FrontColors: [
    'FrontColors', 'frontColors', 'FrontColorCount', 'frontColorCount', 'FrontPrintColorCount', 'frontPrintColorCount',
    'Số lượng màu in mặt 1', 'Màu mặt 1', 'In mặt 1', 'SL màu mặt 1', 'front_colors', 'so luong mau in mat 1'
  ],
  BackColors: [
    'BackColors', 'backColors', 'BackColorCount', 'backColorCount', 'BackPrintColorCount', 'backPrintColorCount',
    'Số lượng màu in mặt 2', 'Màu mặt 2', 'In mặt 2', 'SL màu mặt 2', 'back_colors', 'so luong mau in mat 2'
  ],
  JobNumber: [
    'JobNumber', 'jobNumber', 'JobNo', 'jobNo',
    'Số Job', 'Job', 'Số job', 'job_number', 'so job'
  ],
  Width: [
    'Width', 'width', 'RollWidth', 'rollWidth', 'ProductWidth', 'productWidth',
    'Rộng/ khổ cuộn', 'Khổ rộng', 'Rộng', 'Chiều rộng', 'Rộng khổ cuộn', 'width', 'rong kho cuon', 'rong'
  ],
  Length: [
    'Length', 'length', 'CutLength', 'cutLength', 'ProductLength', 'productLength',
    'Dài/ chiều chặt', 'Chiều dài', 'Dài', 'Dài chiều chặt', 'length', 'dai chieu chat', 'dai'
  ],
  Height: [
    'Height', 'height', 'ProductHeight', 'productHeight',
    'Cao', 'Chiều cao', 'height', 'cao', 'chieu cao'
  ],
  ProductLine: [
    'ProductLine', 'productLine', 'Dòng hàng', 'Dòng SP', 'Ngành hàng', 'product_line', 'dong hang'
  ],
  RawWidth: [
    'RawWidth', 'rawWidth', 'RawMaterialWidth', 'rawMaterialWidth',
    'Rộng/ khổ cuộn NVL', 'Khổ rộng NVL', 'Rộng NVL', 'Khổ NVL', 'raw_width', 'rong kho cuon nvl', 'rong nvl'
  ],
  RawLength: [
    'RawLength', 'rawLength', 'RawMaterialLength', 'rawMaterialLength',
    'Dài/ chiều chặt NVL', 'Chiều dài NVL', 'Dài NVL', 'raw_length', 'dai chieu chat nvl', 'dai nvl'
  ],
  RawLineCode: [
    'RawLineCode', 'rawLineCode', 'RawMaterialLineCode', 'rawMaterialLineCode',
    'Mã dòng hàng NVL', 'Mã dòng NVL', 'Mã NVL', 'raw_line_code', 'ma dong hang nvl', 'ma nvl'
  ],
  RawLineName: [
    'RawLineName', 'rawLineName', 'RawMaterialLineName', 'rawMaterialLineName',
    'Dòng hàng NVL', 'Dòng NVL', 'Tên NVL', 'raw_line_name', 'dong hang nvl', 'ten nvl'
  ],
  FlipType: [
    'FlipType', 'flipType', 'TurnType', 'turnType',
    'Kiểu trở', 'Kiểu lật', 'Trở đầu đuôi', 'flip_type', 'kieu tro'
  ],
  BomPlates: [
    'BomPlates', 'bomPlates', 'BomPlateQty', 'bomPlateQty', 'ZincPlateCount', 'zincPlateCount',
    'Số lượng kẽm theo BOM', 'Số lượng kẽm', 'SL kẽm', 'SL kẽm BOM', 'Kẽm theo BOM',
    'bom_plates', 'so luong kem theo bom', 'so luong kem'
  ],
  Coating: [
    'Coating', 'coating', 'CoatingType', 'coatingType',
    'Phủ', 'Phủ bóng/ mờ', 'Phủ màng', 'Phủ UV', 'coating', 'phu'
  ],
  SlitterBlades: [
    'SlitterBlades', 'slitterBlades', 'SlitterKnifeCount', 'slitterKnifeCount', 'BladeCount', 'bladeCount',
    'Số dao chia', 'Số lượng dao xén', 'Số dao xén', 'Dao xén', 'Dao chia',
    'slitter_blades', 'so dao chia', 'so dao xen'
  ],
  CodePositions: [
    'CodePositions', 'codePositions', 'CodeGunPositionCount', 'codeGunPositionCount', 'BarcodePosition', 'barcodePosition',
    'Số vị trí bắn code', 'Vị trí ghi mã', 'Vị trí mã', 'Bắn code',
    'code_positions', 'so vi tri ban code', 'ban code'
  ],
  PunchHoles: [
    'PunchHoles', 'punchHoles', 'PunchHoleCount', 'punchHoleCount', 'HolePunchCount', 'holePunchCount',
    'Số lỗ đột', 'Số lượng lỗ đột', 'Lỗ đột', 'punch_holes', 'so lo dot'
  ],
  StructureCode: [
    'StructureCode', 'structureCode', 'StructureTypeCode', 'structureTypeCode',
    'Mã loại kết cầu', 'Mã loại kết cấu', 'Mã kết cấu', 'Mã KC',
    'structure_code', 'ma loai ket cau', 'ma loai ket cu', 'ma ket cau'
  ],
  StructureName: [
    'StructureName', 'structureName', 'StructureTypeName', 'structureTypeName',
    'Tên loại kết cầu', 'Tên loại kết cấu', 'Tên kết cấu', 'Tên KC', 'Kết cấu',
    'structure_name', 'ten loai ket cau', 'ten loai ket cu', 'ten ket cau'
  ],
  RoutingDocNo: [
    'RoutingDocNo', 'routingDocNo', 'StageOrderNo', 'stageOrderNo',
    'Số lệnh công đoạn', 'Lệnh công đoạn', 'Số lệnh CĐ', 'Số LCD', 'LCD',
    'routing_doc_no', 'so lenh cong doan', 'lenh cong doan'
  ],
  RoutingDate: [
    'RoutingDate', 'routingDate', 'StageOrderDate', 'stageOrderDate', 'StageOrderReleaseDate', 'stageOrderReleaseDate', 'RoutingDocDate', 'routingDocDate',
    'Ngày lệnh công đoạn', 'Ngày phát hành lệnh CĐ', 'Ngày tạo lệnh công đoạn', 'Ngày lệnh CĐ', 'Ngày LCD',
    'routing_date', 'ngay lenh cong doan', 'ngay phat hanh lenh cd'
  ],
  ReleaseDate: [
    'ReleaseDate', 'releaseDate', 'OpOrderReleaseDate', 'opOrderReleaseDate', 'OperationReleaseDate', 'operationReleaseDate',
    'Ngày phát hành lệnh TT', 'Ngày phát hành lệnh thao tác', 'Ngày phát hành lệnh', 'Ngày PH lệnh TT', 'Người phát hành lệnh thao tác',
    'release_date', 'ngay phat hanh lenh tt', 'ngay phat hanh lenh'
  ],
  TargetPassQty: [
    'TargetPassQty', 'targetPassQty', 'StageTargetQty', 'stageTargetQty', 'OpTargetQty', 'opTargetQty', 'PlanQualifiedQty', 'planQualifiedQty',
    'SL cần đạt (TT)', 'SL cần đạt (CĐ)', 'Số lượng cần đạt', 'SL cần đạt', 'Số lượng đạt Kế hoạch', 'SL đạt KH', 'SL đạt kế hoạch',
    'target_pass_qty', 'sl can dat tt', 'sl can dat cd', 'so luong can dat', 'sl can dat'
  ],
  TargetProdQty: [
    'TargetProdQty', 'targetProdQty', 'StagePlannedQty', 'stagePlannedQty', 'OpPlannedQty', 'opPlannedQty', 'PlanProducedQty', 'planProducedQty',
    'SL cần sản xuất (TT)', 'SL cần sản xuất (CĐ)', 'Số lượng cần sản xuất', 'SL cần sản xuất', 'SL cần SX', 'Số lượng sản xuất Kế hoạch', 'SL SX KH',
    'target_prod_qty', 'sl can san xuat tt', 'sl can san xuat cd', 'so luong can san xuat', 'sl can san xuat'
  ],
  RoutingUnit: [
    'RoutingUnit', 'routingUnit', 'OpUnit', 'opUnit', 'RoutingUom', 'routingUom',
    'Đvt công đoạn', 'Đơn vị tính công đoạn', 'ĐVT công đoạn', 'Đvt', 'dvt cong doan', 'routing_unit'
  ],
  BreakdownMinutes: [
    'BreakdownMinutes', 'breakdownMinutes', 'DowntimeBreakdownMinutes', 'downtimeBreakdownMinutes', 'BreakdownLossTime', 'breakdownLossTime',
    'TG hỏng máy/mất điện (phút) (01)', 'TG hỏng máy/mất điện (01)', 'TG hỏng máy/mất điện', 'TG hỏng máy', 'Thời gian hỏng máy', 'Hỏng máy mất điện', '01',
    'breakdown_minutes', 'tg hong may mat dien phut 01', 'tg hong may mat dien', 'tg hong may'
  ],
  WaitingMaterialMinutes: [
    'WaitingMaterialMinutes', 'waitingMaterialMinutes', 'DowntimeWaitingMaterialMinutes', 'downtimeWaitingMaterialMinutes', 'WaitingMaterialLossTime', 'waitingMaterialLossTime',
    'Tg chờ NVL (phút) (02)', 'Tg chờ NVL (02)', 'Tg chờ NVL', 'TG chờ NVL', 'Thời gian chờ NVL', 'Chờ NVL', '02',
    'waiting_material_minutes', 'tg cho nvl phut 02', 'tg cho nvl', 'cho nvl'
  ],
  SetupMinutes: [
    'SetupMinutes', 'setupMinutes', 'DowntimeSetupMinutes', 'downtimeSetupMinutes', 'SetupLossTime', 'setupLossTime',
    'Tg chuẩn bị (phút) (03)', 'Tg chuẩn bị (03)', 'Tg chuẩn bị', 'TG chuẩn bị', 'Thời gian lên khuôn', 'TG lên khuôn', 'Chuẩn bị', '03',
    'setup_minutes', 'tg chuan bi phut 03', 'tg chuan bi', 'chuan bi'
  ],
  RepairMinutes: [
    'RepairMinutes', 'repairMinutes', 'DowntimeFixingMinutes', 'downtimeFixingMinutes', 'RepairLossTime', 'repairLossTime',
    'TG sửa file/khuôn/bản (phút) (04)', 'TG sửa file/khuôn/bản (04)', 'TG sửa file/khuôn/bản', 'TG sửa chữa', 'Thời gian sửa chữa', 'Sửa file/khuôn/bản', '04',
    'repair_minutes', 'tg sua file khuon ban phut 04', 'tg sua file khuon ban', 'tg sua file'
  ],
  TotalWasteMinutes: [
    'TotalWasteMinutes', 'totalWasteMinutes', 'TotalDowntimeMinutes', 'totalDowntimeMinutes', 'TotalLossTime', 'totalLossTime',
    'Tổng tg hao phí (5)=1+2+3+4', 'Tổng tg hao phí (5)', 'Tổng tg hao phí', 'Tổng thời gian hao phí', 'Tổng TG hao phí', 'Tổng hao phí', 'Tổng tg lãng phí', '05', '(5)=1+2+3+4',
    'total_waste_minutes', 'tong tg hao phi 5 1 2 3 4', 'tong tg hao phi', 'tong tg lang phi'
  ],
  RigidBoxGlue: [
    'RigidBoxGlue', 'rigidBoxGlue', 'LaminationBoxSplit', 'laminationBoxSplit', 'RigidBoxGlueType', 'rigidBoxGlueType',
    'Bồi chia hộp cứng', 'Bồi hộp cứng', 'Loại keo hộp cứng', 'Keo hộp cứng',
    'rigid_box_glue', 'boi chia hop cung', 'boi hop cung'
  ],
  Outsourcing: [
    'Outsourcing', 'outsourcing', 'OutsourceProcess', 'outsourceProcess',
    'Gia công', 'Gia công ngoài', 'GC ngoài', 'outsourcing', 'gia cong', 'gia cong ngoai'
  ],
  DefectQty: [
    'DefectQty', 'defectQty', 'DefectiveQty', 'defectiveQty',
    'Số lượng lỗi', 'SL lỗi', 'SL NG', 'Số lượng NG', 'defect_qty', 'so luong loi', 'sl loi', 'sl ng'
  ],
  DefectRate: [
    'DefectRate', 'defectRate', 'NgRate', 'ngRate', 'DefectiveRate', 'defectiveRate',
    'Tỷ lệ NG', 'Tỷ lệ lỗi', 'Tỉ lệ lỗi', 'Tỉ lệ NG', 'defect_rate', 'ty le ng', 'ty le loi'
  ],
  DefectUnit: [
    'DefectUnit', 'defectUnit', 'QualityUnit', 'qualityUnit', 'DefectUom', 'defectUom',
    'Đvt chất lượng', 'Đơn vị tính lỗi', 'ĐVT lỗi', 'ĐVT chất lượng', 'Đvt', 'defect_unit', 'dvt chat luong', 'dvt loi'
  ],
  Status: [
    'Status', 'status', 'OperationStatus', 'operationStatus',
    'Trạng thái', 'Trạng thái thao tác', 'Tình trạng', 'status', 'trang thai'
  ],
  AutoExport: [
    'AutoExport', 'autoExport', 'IsAutoExport', 'isAutoExport', 'AutoWarehouseExport', 'autoWarehouseExport',
    'Xuất tự động', 'Tự động xuất', 'Tự động xuất kho', 'auto_export', 'xuat tu dong', 'tu dong xuat'
  ],
  AutoImport: [
    'AutoImport', 'autoImport', 'IsAutoImport', 'isAutoImport', 'AutoWarehouseImport', 'autoWarehouseImport',
    'Nhập tự động', 'Tự động nhập', 'Tự động nhập kho', 'auto_import', 'nhap tu dong', 'tu dong nhap'
  ],
  ExportDocNo: [
    'ExportDocNo', 'exportDocNo', 'ExportSlipNo', 'exportSlipNo', 'ExportWarehouseSlipNo', 'exportWarehouseSlipNo',
    'Số phiếu xuất', 'Phiếu xuất', 'Phiếu xuất kho', 'Số phiếu xuất kho', 'export_doc_no', 'so phieu xuat', 'phieu xuat'
  ],
  ImportDocNo: [
    'ImportDocNo', 'importDocNo', 'ImportSlipNo', 'importSlipNo', 'ImportWarehouseSlipNo', 'importWarehouseSlipNo',
    'Số phiếu nhập', 'Phiếu nhập', 'Phiếu nhập kho', 'Số phiếu nhập kho', 'import_doc_no', 'so phieu nhap', 'phieu nhap'
  ],
  WrongOpCode: [
    'WrongOpCode', 'wrongOpCode', 'IsWrongOpCode', 'isWrongOpCode', 'MisroutedOpCode', 'misroutedOpCode',
    'Sai mã thao tác', 'Sai công đoạn', 'Lỗi sai CĐ', 'wrong_op_code', 'sai ma thao tac', 'sai cong doan'
  ],
  IsAdditionalStat: [
    'IsAdditionalStat', 'isAdditionalStat', 'IsSupplementaryStat', 'isSupplementaryStat', 'AdditionalStatNote', 'additionalStatNote',
    'Thống kê bổ sung', 'Thống kê bù', 'TK bù', 'TK bổ sung', 'is_additional_stat', 'thong ke bo sung', 'thong ke bu'
  ],
  TicketCreatedDate: [
    'TicketCreatedDate', 'ticketCreatedDate', 'SlipCreatedDate', 'slipCreatedDate', 'SlipCreationDate', 'slipCreationDate',
    'Ngày tạo phiếu', 'Ngày lập phiếu', 'Giờ tạo phiếu', 'ticket_created_date', 'ngay tao phieu', 'ngay lap phieu'
  ],
  ActualRunTime: [
    'ActualRunTime', 'actualRunTime', 'ActualRunHours', 'actualRunHours',
    'Thời gian chạy thực tế', 'Thời gian chạy máy thực tế', 'TG chạy máy TT', 'Thời gian chạy máy', 'TG chạy thực tế',
    'actual_run_time', 'thoi gian chay thuc te', 'tg chay thuc te'
  ],
  ActualCapa: [
    'ActualCapa', 'actualCapa', 'ActualCapacity', 'actualCapacity',
    'capa thực tế', 'Capa thực tế', 'Capa TT', 'Công suất thực tế',
    'actual_capa', 'capa thuc te', 'cong suat thuc te'
  ],
  CheckPlanStatus: [
    'CheckPlanStatus', 'checkPlanStatus', 'CheckKhsx', 'checkKhsx', 'PlanCheckStatus', 'planCheckStatus',
    'CHECK KHSX', 'Kiểm tra KHSX', 'Kiểm tra KH', 'KT KHSX', 'Đánh giá KHSX',
    'check_plan_status', 'check khsx', 'kiem tra khsx'
  ],
  MesApprovalTime: [
    'MesApprovalTime', 'mesApprovalTime', 'MesApprovedTime', 'mesApprovedTime',
    'Thời gian duyệt phiếu ở MES', 'Thời gian duyệt MES', 'TG duyệt MES', 'Duyệt MES', 'Thời gian duyệt ở MES', 'Thời gian duyệt',
    'mes_approval_time', 'thoi gian duyet phieu o mes', 'thoi gian duyet mes', 'tg duyet mes'
  ],
  SyncDelayMinutes: [
    'SyncDelayMinutes', 'syncDelayMinutes', 'SyncLatencySeconds', 'syncLatencySeconds', 'MesSyncDelayHours', 'mesSyncDelayHours',
    'Độ trễ thời gian đồng bộ 2 hệ thống', 'Độ trễ thời gian đồng bộ', 'Thời gian chậm đồng bộ', 'TG chậm đồng bộ', 'Độ trễ đồng bộ',
    'sync_delay_minutes', 'do tre thoi gian dong bo 2 he thong', 'do tre thoi gian dong bo', 'do tre dong bo', 'thoi gian cham dong bo', 'tg cham dong bo',
    'sync latency seconds', 'synclatencyseconds', 'syncdelayminutes'
  ],
  IsDuplicateTicket: [
    'IsDuplicateTicket', 'isDuplicateTicket', 'IsDuplicateSlip', 'isDuplicateSlip', 'DuplicateSlipCheck', 'duplicateSlipCheck',
    'Phiếu sinh trùng', 'Trùng phiếu', 'Kiểm tra trùng phiếu', 'Sinh trùng',
    'is_duplicate_ticket', 'phieu sinh trung', 'trung phieu'
  ],
  TicketCreationLocation: [
    'TicketCreationLocation', 'ticketCreationLocation', 'CreatedLocation', 'createdLocation', 'SlipOrigin', 'slipOrigin',
    'Vị trí tạo phiếu tk', 'Nơi lập phiếu', 'Nơi tạo phiếu', 'Vị trí tạo phiếu',
    'ticket_creation_location', 'vi tri tao phieu tk', 'noi tao phieu'
  ],
  AutoIoStatus: [
    'AutoIoStatus', 'autoIoStatus', 'AutoExportImportGenerated', 'autoExportImportGenerated',
    'Sinh phiếu xuất/nhập tự động', 'Trạng thái TĐ nhập xuất', 'Trạng thái tự động nhập xuất', 'Sinh phiếu xuất nhập tự động',
    'auto_io_status', 'sinh phieu xuat nhap tu dong', 'sinh phieu xuat/nhap tu dong'
  ],
  UserMemo: [
    'UserMemo', 'userMemo', 'CalcVersion', 'calcVersion',
    'Version tính toán', 'Phiên bản tính toán', 'Ghi chú', 'Ghi chú người dùng', 'Memo',
    'version tinh toan', 'ghi chu'
  ]
}

// ── BẢNG ÁNH XẠ 24 CỘT BÁO CÁO KẾ HOẠCH SẢN XUẤT (KHSX) ──
export const KHSX_COLUMN_MAPPING = {
  PicDp: ['PicDp', 'picDp', 'PIC_DP', 'PIC ĐP', 'Người điều phối', 'Điều phối', 'Người phát hành lệnh thao tác'],
  OperationNo: ['OperationNo', 'operationNo', 'Số lệnh thao tác', 'Số lệnh TT', 'Mã lệnh thao tác', 'Lệnh thao tác'],
  OpDate: ['OpDate', 'opDate', 'Ngày thực hiện thao tác', 'Ngày thực hiện', 'Ngày TT'],
  RoutingDocNo: ['RoutingDocNo', 'routingDocNo', 'Số lệnh công đoạn', 'Lệnh công đoạn', 'Số lệnh CĐ'],
  RoutingDocDate: ['RoutingDocDate', 'routingDocDate', 'Ngày tạo lệnh công đoạn', 'Ngày lệnh CĐ', 'Ngày tạo lệnh CĐ'],
  ItemCode: ['ItemCode', 'itemCode', 'MaterialCode', 'materialCode', 'Mã vật tư', 'Mã hàng', 'Mã SP'],
  ItemName: ['ItemName', 'itemName', 'MaterialName', 'materialName', 'Tên vật tư', 'Tên hàng', 'Tên SP'],
  OperationName: ['OperationName', 'operationName', 'Tên công đoạn', 'Công đoạn'],
  OpTypeName: ['OpTypeName', 'opTypeName', 'Phân loại thao tác', 'Tên phân loại thao tác'],
  MachineName: ['MachineName', 'machineName', 'Tên máy', 'Tên máy sản xuất', 'Máy sản xuất'],
  Unit: ['Unit', 'unit', 'Đvt', 'Đơn vị tính', 'ĐVT'],
  TargetPassQty: ['TargetPassQty', 'targetPassQty', 'Số lượng đạt', 'SL đạt', 'Số lượng đạt KH', 'SL đạt kế hoạch'],
  TargetProdQty: ['TargetProdQty', 'targetProdQty', 'Số lượng sản xuất', 'SL sản xuất', 'Số lượng SX KH'],
  StatPassQty: ['StatPassQty', 'statPassQty', 'Số lượng hoàn thành', 'SL hoàn thành', 'SL hoàn thành TT'],
  StartTime: ['StartTime', 'startTime', 'Bắt đầu', 'Giờ bắt đầu', 'Thời gian bắt đầu'],
  EndTime: ['EndTime', 'endTime', 'Kết thúc', 'Giờ kết thúc', 'Thời gian kết thúc'],
  StandardProdTime: ['StandardProdTime', 'standardProdTime', 'Thời gian sản xuất định mức', 'TG SX định mức', 'TG định mức'],
  ActualProdTime: ['ActualProdTime', 'actualProdTime', 'Thời gian sản xuất thực tế', 'TG SX thực tế', 'TG thực tế'],
  StandardCapa: ['StandardCapa', 'standardCapa', 'Capa định mức', 'Capa ĐM'],
  ActualCapa: ['ActualCapa', 'actualCapa', 'Capa thực tế', 'Capa TT'],
  StatusDpSx: ['StatusDpSx', 'statusDpSx', 'Trạng thái điều phối sx', 'Trạng thái ĐP SX', 'Trạng thái ĐPSX'],
  TimeStatus: ['TimeStatus', 'timeStatus', 'Đánh giá thời gian', 'Thời gian (Đạt/Không đạt)'],
  CapaStatus: ['CapaStatus', 'capaStatus', 'Đánh giá capa', 'Capa (Đạt/Không đạt)'],
  UserMemo: ['UserMemo', 'userMemo', 'Ghi chú', 'Ghi chú người dùng', 'Memo']
}

// Hàm trích xuất giá trị tốt nhất cho một field theo danh sách alias
function extractFieldValue(row, aliases) {
  if (!row || typeof row !== 'object') return ''

  // 1. Kiểm tra trực tiếp theo danh sách alias
  for (const key of aliases) {
    if (row[key] !== undefined && row[key] !== null) {
      const val = String(row[key]).trim()
      if (val !== '') return val
    }
  }

  // 2. Tìm kiếm theo normalized text của keys trong row
  const rowKeys = Object.keys(row)
  const normAliasSet = new Set(aliases.map(normalizeText))

  for (const rk of rowKeys) {
    const normKey = normalizeText(rk)
    if (normAliasSet.has(normKey)) {
      const val = row[rk]
      if (val !== undefined && val !== null) {
        const strVal = String(val).trim()
        if (strVal !== '') return strVal
      }
    }
  }

  return ''
}

/**
 * Chuẩn hóa mảng dữ liệu TKSX thành định dạng chuẩn ERP 98 cột (JSON tags khớp 100% với Go backend)
 */
export function normalizeProdStatsDetailRows(rows = []) {
  if (!Array.isArray(rows)) return []
  return rows.map((rawRow, idx) => {
    const cleanRow = {
      RowSeq: idx + 1,
      WorkingTag: 'A'
    }

    // Duyệt qua tất cả 98 cột chuẩn
    for (const [targetKey, aliases] of Object.entries(TKSX_COLUMN_MAPPING)) {
      cleanRow[targetKey] = extractFieldValue(rawRow, aliases)
    }

    // Giữ nguyên IdSeq nếu đã có
    if (rawRow.IdSeq) cleanRow.IdSeq = rawRow.IdSeq
    if (rawRow.id) cleanRow.id = rawRow.id

    return cleanRow
  })
}

/**
 * Chuẩn hóa mảng dữ liệu KHSX thành định dạng chuẩn ERP 24 cột (JSON tags khớp 100% với Go backend)
 */
export function normalizePlanDetailRows(rows = []) {
  if (!Array.isArray(rows)) return []
  return rows.map((rawRow, idx) => {
    const cleanRow = {
      RowSeq: idx + 1,
      WorkingTag: 'A'
    }

    // Duyệt qua tất cả 24 cột chuẩn
    for (const [targetKey, aliases] of Object.entries(KHSX_COLUMN_MAPPING)) {
      cleanRow[targetKey] = extractFieldValue(rawRow, aliases)
    }

    if (rawRow.IdSeq) cleanRow.IdSeq = rawRow.IdSeq
    if (rawRow.id) cleanRow.id = rawRow.id

    return cleanRow
  })
}
