/**
 * Định nghĩa hằng số, schema cột 2 tầng (Group Header & Sub Header) và mapping Key tiếng Anh cho 4 loại file kiến trúc
 */

export const STORAGE_KEYS = {
  DB_NAME: 'calcProductionDB',
  DB_VERSION: 10,
  STORE_FILES: 'architecture_files',
  STORE_CALC_RESULTS: 'calc_results',
  STORE_METADATA: 'calc_metadata',
  STORE_MASTER: 'calc_master_registration'
}

export const ARCHITECTURE_FILE_TYPES = {
  STAT_REPORT: 'stat_report', // 1. Báo cáo Thống kê sản xuất
  UNFINISHED_OP: 'unfinished_op', // 2. Báo cáo Lệnh thao tác chưa hoàn thành
  SUMMARY_OP: 'summary_op', // 3. Báo cáo Tổng hợp lệnh thao tác
  MES_APPROVAL: 'mes_approval' // 4. Báo cáo Duyệt sản lượng ở MES
}

/**
 * 1. Cấu trúc cột Tab 1: Thống Kê Sản Xuất (TKSX)
 */
export const STAT_REPORT_COLUMN_SCHEMA = [
  // Nhóm 1: Thông tin lệnh thao tác
  { group: 'Thông tin lệnh thao tác', title: 'Mã vật tư', key: 'MaterialCode', kind: 'Text', width: 140 },
  { group: 'Thông tin lệnh thao tác', title: 'Tên vật tư', key: 'MaterialName', kind: 'Text', width: 260 },
  { group: 'Thông tin lệnh thao tác', title: 'Version', key: 'Version', kind: 'Text', width: 80 },
  { group: 'Thông tin lệnh thao tác', title: 'Model', key: 'Model', kind: 'Text', width: 100 },
  { group: 'Thông tin lệnh thao tác', title: 'Trọng lượng Sp/lề NG', key: 'ProductNgWeight', kind: 'Number', width: 140 },
  { group: 'Thông tin lệnh thao tác', title: 'Trọng lượng lề kỹ thuật', key: 'TechnicalMarginWeight', kind: 'Number', width: 150 },
  { group: 'Thông tin lệnh thao tác', title: 'Số lệnh thao tác', key: 'OperationOrderNo', kind: 'Text', width: 150 },

  // Nhóm 2: Thợ máy (Đã phân tách để tránh trùng lặp Họ tên)
  { group: 'Thợ chính', title: 'Họ tên', key: 'LeadTechnicianName', kind: 'Text', width: 150 },
  { group: 'Thợ phụ 1', title: 'Họ tên', key: 'AssistantWorker1Name', kind: 'Text', width: 150 },
  { group: 'Thợ phụ 2', title: 'Họ tên', key: 'AssistantWorker2Name', kind: 'Text', width: 150 },

  // Nhóm 3: Máy & Phân loại
  { group: 'Thiết bị & Thao tác', title: 'Nguyên nhân hỏng máy', key: 'MachineBreakdownReason', kind: 'Text', width: 160 },
  { group: 'Thiết bị & Thao tác', title: 'Mã máy sản xuất', key: 'MachineCode', kind: 'Text', width: 120 },
  { group: 'Thiết bị & Thao tác', title: 'Tên máy sản xuất', key: 'MachineName', kind: 'Text', width: 180 },
  { group: 'Thiết bị & Thao tác', title: 'Mã phân loại thao tác', key: 'OperationTypeCode', kind: 'Text', width: 140 },
  { group: 'Thiết bị & Thao tác', title: 'Phân loại thao tác', key: 'OperationTypeName', kind: 'Text', width: 160 },
  { group: 'Thiết bị & Thao tác', title: 'Kẽm UV', key: 'UvPlate', kind: 'Text', width: 90 },

  // Nhóm 4: Khuôn
  { group: 'Thông tin khuôn', title: 'SL lên khuôn 1', key: 'MoldSetupQty1', kind: 'Number', width: 110 },
  { group: 'Thông tin khuôn', title: 'SL lên khuôn 2', key: 'MoldSetupQty2', kind: 'Number', width: 110 },
  { group: 'Thông tin khuôn', title: 'SL lên khuôn 3', key: 'MoldSetupQty3', kind: 'Number', width: 110 },

  // Nhóm 5: Số lượng thực hiện
  { group: 'Số lượng thực hiện', title: 'Số lượng sản xuất', key: 'ProducedQty', kind: 'Number', width: 130 },
  { group: 'Số lượng thực hiện', title: 'Số lượng đạt', key: 'QualifiedQty', kind: 'Number', width: 120 },
  { group: 'Số lượng thực hiện', title: 'Số mét thực tế', key: 'ActualMeters', kind: 'Number', width: 120 },
  { group: 'Số lượng thực hiện', title: 'Số mét định mức', key: 'StandardMeters', kind: 'Number', width: 130 },

  // Nhóm 6: Tổ & Ca
  { group: 'Tổ & Ca', title: 'Tổ sản xuất', key: 'ProductionTeam', kind: 'Text', width: 180 },
  { group: 'Tổ & Ca', title: 'Ca sản xuất', key: 'ProductionShift', kind: 'Text', width: 110 },

  // Nhóm 7: Thời gian thực hiện
  { group: 'Thời gian thực hiện', title: 'Bắt đầu', key: 'StartTime', kind: 'Text', width: 90 },
  { group: 'Thời gian thực hiện', title: 'Kết thúc', key: 'EndTime', kind: 'Text', width: 90 },
  { group: 'Thời gian thực hiện', title: 'Ngày bắt đầu', key: 'StartDate', kind: 'Text', width: 100 },
  { group: 'Thời gian thực hiện', title: 'Ngày kết thúc', key: 'EndDate', kind: 'Text', width: 100 },
  { group: 'Thời gian thực hiện', title: 'Ngày thống kê', key: 'StatDate', kind: 'Text', width: 110 },
  { group: 'Thời gian thực hiện', title: 'Số phiếu thống kê', key: 'StatSlipNo', kind: 'Text', width: 140 },
  { group: 'Thời gian thực hiện', title: 'Nhân viên thống kê', key: 'StatEmployee', kind: 'Text', width: 130 },

  // Nhóm 8: Thông tin chung
  { group: 'Thông tin chung', title: 'Khách hàng', key: 'CustomerName', kind: 'Text', width: 180 },
  { group: 'Thông tin chung', title: 'Nhân viên kinh doanh', key: 'SalesPerson', kind: 'Text', width: 150 },
  { group: 'Thông tin chung', title: 'Số đơn hàng', key: 'OrderNo', kind: 'Text', width: 130 },
  { group: 'Thông tin chung', title: 'Công đoạn', key: 'StageCode', kind: 'Text', width: 100 },
  { group: 'Thông tin chung', title: 'Đvt', key: 'Unit', kind: 'Text', width: 80 },
  { group: 'Thông tin chung', title: 'Đơn vị quy đổi', key: 'ConvertUnit', kind: 'Text', width: 160 },
  { group: 'Thông tin chung', title: 'QTCN', key: 'ProcessFlow', kind: 'Text', width: 240 },

  // Nhóm 9: Thông tin sản phẩm
  { group: 'Thông tin sản phẩm', title: 'Số part', key: 'PartCount', kind: 'Number', width: 80 },
  { group: 'Thông tin sản phẩm', title: 'Số part sóng', key: 'CorrugatorPartCount', kind: 'Number', width: 100 },
  { group: 'Thông tin sản phẩm', title: 'Số part xén', key: 'CutPartCount', kind: 'Number', width: 90 },
  { group: 'Thông tin sản phẩm', title: 'Số lượng màu in', key: 'PrintColorCount', kind: 'Number', width: 110 },
  { group: 'Thông tin sản phẩm', title: 'Loại Out bản', key: 'PlateOutType', kind: 'Text', width: 110 },
  { group: 'Thông tin sản phẩm', title: 'Số lượng màu in mặt 1', key: 'FrontColorCount', kind: 'Number', width: 140 },
  { group: 'Thông tin sản phẩm', title: 'Số lượng màu in mặt 2', key: 'BackColorCount', kind: 'Number', width: 140 },
  { group: 'Thông tin sản phẩm', title: 'Số Job', key: 'JobNo', kind: 'Text', width: 80 },
  { group: 'Thông tin sản phẩm', title: 'Rộng/ khổ cuộn', key: 'RollWidth', kind: 'Number', width: 110 },
  { group: 'Thông tin sản phẩm', title: 'Dài/ chiều chặt', key: 'CutLength', kind: 'Number', width: 110 },
  { group: 'Thông tin sản phẩm', title: 'Cao', key: 'Height', kind: 'Number', width: 80 },
  { group: 'Thông tin sản phẩm', title: 'Dòng hàng', key: 'ProductLine', kind: 'Text', width: 160 },
  { group: 'Thông tin sản phẩm', title: 'Rộng/ khổ cuộn NVL', key: 'RawMaterialWidth', kind: 'Number', width: 130 },
  { group: 'Thông tin sản phẩm', title: 'Dài/ chiều chặt NVL', key: 'RawMaterialLength', kind: 'Number', width: 130 },
  { group: 'Thông tin sản phẩm', title: 'Mã dòng hàng NVL', key: 'RawMaterialLineCode', kind: 'Text', width: 130 },
  { group: 'Thông tin sản phẩm', title: 'Dòng hàng NVL', key: 'RawMaterialLineName', kind: 'Text', width: 150 },
  { group: 'Thông tin sản phẩm', title: 'Kiểu trở', key: 'TurnType', kind: 'Text', width: 90 },
  { group: 'Thông tin sản phẩm', title: 'Số lượng kẽm theo BOM', key: 'BomPlateQty', kind: 'Number', width: 140 },
  { group: 'Thông tin sản phẩm', title: 'Phủ', key: 'Coating', kind: 'Text', width: 80 },
  { group: 'Thông tin sản phẩm', title: 'Số dao chia', key: 'SlitterKnifeCount', kind: 'Number', width: 95 },
  { group: 'Thông tin sản phẩm', title: 'Số vị trí bắn code', key: 'CodeGunPositionCount', kind: 'Number', width: 130 },
  { group: 'Thông tin sản phẩm', title: 'Số lỗ đột', key: 'PunchHoleCount', kind: 'Number', width: 90 },
  { group: 'Thông tin sản phẩm', title: 'Mã loại kết cầu', key: 'StructureTypeCode', kind: 'Text', width: 120 },
  { group: 'Thông tin sản phẩm', title: 'Tên loại kết cầu', key: 'StructureTypeName', kind: 'Text', width: 160 },

  // Nhóm 10: Thông tin lệnh công đoạn
  { group: 'Thông tin lệnh công đoạn', title: 'Số lệnh công đoạn', key: 'StageOrderNo', kind: 'Text', width: 150 },
  { group: 'Thông tin lệnh công đoạn', title: 'Ngày lệnh công đoạn', key: 'StageOrderDate', kind: 'Text', width: 130 },
  { group: 'Thông tin lệnh công đoạn', title: 'Ngày phát hành lệnh CĐ', key: 'StageOrderReleaseDate', kind: 'Text', width: 150 },
  { group: 'Thông tin lệnh công đoạn', title: 'SL cần đạt (CĐ)', key: 'StageTargetQty', kind: 'Number', width: 120 },
  { group: 'Thông tin lệnh công đoạn', title: 'SL cần sản xuất (CĐ)', key: 'StagePlannedQty', kind: 'Number', width: 140 },

  // Nhóm 11: Thông tin lệnh thao tác
  { group: 'Lệnh thao tác chi tiết', title: 'Ngày phát hành lệnh TT', key: 'OpOrderReleaseDate', kind: 'Text', width: 150 },
  { group: 'Lệnh thao tác chi tiết', title: 'SL cần đạt (TT)', key: 'OpTargetQty', kind: 'Number', width: 120 },
  { group: 'Lệnh thao tác chi tiết', title: 'SL cần sản xuất (TT)', key: 'OpPlannedQty', kind: 'Number', width: 140 },
  { group: 'Lệnh thao tác chi tiết', title: 'Đvt', key: 'OpUnit', kind: 'Text', width: 80 },

  // Nhóm 12: Thời gian lãng phí
  { group: 'Thời gian lãng phí', title: 'TG hỏng máy/mất điện (phút) (01)', key: 'DowntimeBreakdownMinutes', kind: 'Number', width: 180 },
  { group: 'Thời gian lãng phí', title: 'Tg chờ NVL (phút) (02)', key: 'DowntimeWaitingMaterialMinutes', kind: 'Number', width: 160 },
  { group: 'Thời gian lãng phí', title: 'Tg chuẩn bị (phút) (03)', key: 'DowntimeSetupMinutes', kind: 'Number', width: 150 },
  { group: 'Thời gian lãng phí', title: 'TG sửa file/khuôn/bản (phút) (04)', key: 'DowntimeFixingMinutes', kind: 'Number', width: 180 },
  { group: 'Thời gian lãng phí', title: 'Tổng tg hao phí (5)=1+2+3+4', key: 'TotalDowntimeMinutes', kind: 'Number', width: 170 },

  // Nhóm 13: Trạng thái & Chất lượng
  { group: 'Trạng thái & Chất lượng', title: 'Bồi chia hộp cứng', key: 'LaminationBoxSplit', kind: 'Text', width: 130 },
  { group: 'Trạng thái & Chất lượng', title: 'Gia công', key: 'Outsourcing', kind: 'Text', width: 90 },
  { group: 'Trạng thái & Chất lượng', title: 'Trạng thái', key: 'Status', kind: 'Text', width: 110 },
  { group: 'Trạng thái & Chất lượng', title: 'Số lượng lỗi', key: 'DefectQty', kind: 'Number', width: 110 },
  { group: 'Trạng thái & Chất lượng', title: 'Tỷ lệ NG', key: 'NgRate', kind: 'Text', width: 90 },
  { group: 'Trạng thái & Chất lượng', title: 'Đvt chất lượng', key: 'QualityUnit', kind: 'Text', width: 95 },

  // Nhóm 14: Tự động hóa & Đồng bộ MES/Bravo
  { group: 'Tự động hóa & Đồng bộ', title: 'Xuất tự động', key: 'IsAutoExport', kind: 'Text', width: 100 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Nhập tự động', key: 'IsAutoImport', kind: 'Text', width: 100 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Số phiếu xuất', key: 'ExportSlipNo', kind: 'Text', width: 130 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Số phiếu nhập', key: 'ImportSlipNo', kind: 'Text', width: 130 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Sai mã thao tác', key: 'IsWrongOpCode', kind: 'Text', width: 110 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Thống kê bổ sung', key: 'IsSupplementaryStat', kind: 'Text', width: 130 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Ngày tạo phiếu', key: 'SlipCreatedDate', kind: 'Text', width: 140 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Thời gian chạy thực tế', key: 'ActualRunTime', kind: 'Number', width: 140 },
  { group: 'Tự động hóa & Đồng bộ', title: 'capa thực tế', key: 'ActualCapa', kind: 'Number', width: 120 },
  { group: 'Tự động hóa & Đồng bộ', title: 'CHECK KHSX', key: 'CheckKhsx', kind: 'Text', width: 110 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Thời gian duyệt phiếu ở MES', key: 'MesApprovedTime', kind: 'Text', width: 170 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Độ trễ thời gian đồng bộ 2 hệ thống', key: 'SyncLatencySeconds', kind: 'Text', width: 180 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Phiếu sinh trùng', key: 'IsDuplicateSlip', kind: 'Text', width: 110 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Vị trí tạo phiếu tk', key: 'CreatedLocation', kind: 'Text', width: 130 },
  { group: 'Tự động hóa & Đồng bộ', title: 'Sinh phiếu xuất/nhập tự động', key: 'AutoExportImportGenerated', kind: 'Text', width: 170 }
]

/**
 * 2. Cấu trúc cột Tab 2: Lệnh Thao Tác Chưa Hoàn Thành (49 cột chuẩn từ hệ thống)
 */
export const UNFINISHED_OP_COLUMN_SCHEMA = [
  { title: 'Khách hàng', key: 'CustomerName', kind: 'Text', width: 180 },
  { title: 'Số SO', key: 'SoNo', kind: 'Text', width: 120 },
  { title: 'Người thống kê', key: 'StatPerson', kind: 'Text', width: 130 },
  { title: 'Số lệnh thao tác', key: 'OperationOrderNo', kind: 'Text', width: 150 },
  { title: 'Số lệnh công đoạn', key: 'StageOrderNo', kind: 'Text', width: 150 },
  { title: 'Ngày tạo lệnh', key: 'OrderCreatedDate', kind: 'Text', width: 120 },
  { title: 'Ngày thực hiện', key: 'ExecuteDate', kind: 'Text', width: 120 },
  { title: 'Mã hàng', key: 'ProductCode', kind: 'Text', width: 140 },
  { title: 'Tên hàng', key: 'ProductName', kind: 'Text', width: 240 },
  { title: 'Thao tác', key: 'OperationName', kind: 'Text', width: 160 },
  { title: 'Nhóm công đoạn', key: 'StageGroup', kind: 'Text', width: 140 },
  { title: 'Phân loại thao tác', key: 'OperationType', kind: 'Text', width: 150 },
  { title: 'Quy cách đóng gói', key: 'PackagingSpec', kind: 'Text', width: 150 },
  { title: 'Máy sản xuất', key: 'MachineName', kind: 'Text', width: 160 },
  { title: 'Đvt', key: 'Unit', kind: 'Text', width: 80 },
  { title: 'Số lượng cần đạt', key: 'TargetQty', kind: 'Number', width: 120 },
  { title: 'Số lượng cần sản xuất', key: 'PlannedQty', kind: 'Number', width: 130 },
  { title: 'Số lượng đã thống kê', key: 'StatQty', kind: 'Number', width: 130 },
  { title: 'Số lượng còn lại', key: 'RemainingQty', kind: 'Number', width: 120 },
  { title: 'Thời gian bắt đầu', key: 'StartTime', kind: 'Text', width: 130 },
  { title: 'Thời gian kết thúc', key: 'EndTime', kind: 'Text', width: 130 },
  { title: 'Thời gian sản xuất (phút)', key: 'ProductionDurationMinutes', kind: 'Number', width: 150 },
  { title: 'QTCN', key: 'ProcessFlow', kind: 'Text', width: 220 },
  { title: 'Thông tin tình trạng sản xuất', key: 'ProductionStatusInfo', kind: 'Text', width: 180 },
  { title: 'Thông tin NVL', key: 'RawMaterialInfo', kind: 'Text', width: 200 },
  { title: 'Thông tin màng', key: 'FilmInfo', kind: 'Text', width: 150 },
  { title: 'Ghi chú', key: 'Remark', kind: 'Text', width: 160 },
  { title: 'Ngày cần giao trên đơn', key: 'RequiredDeliveryDate', kind: 'Text', width: 140 },
  { title: 'Ngày giao hàng thống nhất', key: 'AgreedDeliveryDate', kind: 'Text', width: 150 },
  { title: 'Số khuôn', key: 'MoldNo', kind: 'Text', width: 100 },
  { title: 'Số part', key: 'PartCount', kind: 'Number', width: 80 },
  { title: 'Số part khuôn', key: 'MoldPartCount', kind: 'Number', width: 90 },
  { title: 'Đơn hàng bán chi tiết', key: 'SalesOrderDetail', kind: 'Text', width: 150 },
  { title: 'Số lượng', key: 'DetailQty', kind: 'Number', width: 100 },
  { title: 'Tình trạng đơn hàng', key: 'OrderStatus', kind: 'Text', width: 130 },
  { title: 'Đã out kẽm', key: 'IsPlateOut', kind: 'Text', width: 100 },
  { title: 'Kiểu trở', key: 'TurnType', kind: 'Text', width: 90 },
  { title: 'SL màu in', key: 'PrintColorCount', kind: 'Number', width: 90 },
  { title: 'SL kẽm thường', key: 'NormalPlateQty', kind: 'Number', width: 100 },
  { title: 'SL kẽm pha', key: 'MixedPlateQty', kind: 'Number', width: 100 },
  { title: 'Loại kết cấu', key: 'StructureType', kind: 'Text', width: 120 },
  { title: 'Khổ giấy', key: 'PaperSize', kind: 'Text', width: 110 },
  { title: 'Kích thước', key: 'Dimension', kind: 'Text', width: 120 },
  { title: 'Loại sản phẩm', key: 'ProductType', kind: 'Text', width: 130 },
  { title: 'Mức độ kiểm soát', key: 'ControlLevel', kind: 'Text', width: 130 },
  { title: 'Nhân viên KD', key: 'SalesPerson', kind: 'Text', width: 130 },
  { title: 'Phân loại TT (Nhóm mẹ)', key: 'ParentOperationType', kind: 'Text', width: 160 },
  { title: 'Chế bản', key: 'Prepress', kind: 'Text', width: 100 },
  { title: 'Khuôn', key: 'Mold', kind: 'Text', width: 100 },
  { title: 'Vị trí', key: 'Location', kind: 'Text', width: 100 }
]

/**
 * 3. Cấu trúc cột Tab 3: Tổng Hợp Lệnh Thao Tác
 */
export const SUMMARY_OP_COLUMN_SCHEMA = [
  { title: 'Số lệnh thao tác', key: 'OperationOrderNo', kind: 'Text', width: 150 },
  { title: 'Mã vật tư', key: 'MaterialCode', kind: 'Text', width: 140 },
  { title: 'Tên vật tư', key: 'MaterialName', kind: 'Text', width: 240 },
  { title: 'Mã máy', key: 'MachineCode', kind: 'Text', width: 110 },
  { title: 'Tên máy', key: 'MachineName', kind: 'Text', width: 160 },
  { title: 'Tổ sản xuất', key: 'ProductionTeam', kind: 'Text', width: 160 },
  { title: 'Thợ chính', key: 'LeadTechnicianName', kind: 'Text', width: 150 },
  { title: 'SL kế hoạch', key: 'PlannedQty', kind: 'Number', width: 120 },
  { title: 'SL thực hiện', key: 'ActualQty', kind: 'Number', width: 120 },
  { title: 'SL đạt', key: 'QualifiedQty', kind: 'Number', width: 110 },
  { title: 'SL lỗi', key: 'DefectQty', kind: 'Number', width: 110 },
  { title: 'Thời gian chạy', key: 'RunningTime', kind: 'Number', width: 120 },
  { title: 'Thời gian dừng', key: 'Downtime', kind: 'Number', width: 120 },
  { title: 'Định mức Capa', key: 'StandardCapa', kind: 'Number', width: 120 },
  { title: 'Capa thực tế', key: 'ActualCapa', kind: 'Number', width: 120 },
  { title: 'Hiệu suất OEE', key: 'OeeRate', kind: 'Text', width: 110 }
]

/**
 * 4. Cấu trúc cột Tab 4: Duyệt Sản Lượng MES
 */
export const MES_APPROVAL_COLUMN_SCHEMA = [
  { title: 'Số phiếu duyệt', key: 'ApprovalSlipNo', kind: 'Text', width: 140 },
  { title: 'Số lệnh thao tác', key: 'OperationOrderNo', kind: 'Text', width: 150 },
  { title: 'Mã vật tư', key: 'MaterialCode', kind: 'Text', width: 140 },
  { title: 'Tên vật tư', key: 'MaterialName', kind: 'Text', width: 240 },
  { title: 'Công đoạn', key: 'StageCode', kind: 'Text', width: 100 },
  { title: 'Máy sản xuất', key: 'MachineName', kind: 'Text', width: 160 },
  { title: 'Tổ sản xuất', key: 'ProductionTeam', kind: 'Text', width: 160 },
  { title: 'SL sản xuất', key: 'ProducedQty', kind: 'Number', width: 120 },
  { title: 'SL đạt', key: 'QualifiedQty', kind: 'Number', width: 110 },
  { title: 'SL lỗi', key: 'DefectQty', kind: 'Number', width: 110 },
  { title: 'Người duyệt', key: 'Approver', kind: 'Text', width: 140 },
  { title: 'Thời gian duyệt', key: 'ApprovedTime', kind: 'Text', width: 150 },
  { title: 'Ghi chú', key: 'Remark', kind: 'Text', width: 180 }
]

export const TAB_DEFINITIONS = [
  {
    id: ARCHITECTURE_FILE_TYPES.STAT_REPORT,
    key: 'stat_report',
    title: '1. Thống Kê Sản Xuất',
    shortTitle: 'Thống kê SX',
    description: 'Báo cáo Thống kê sản xuất chi tiết từ MES / Bravo',
    columnsSchema: STAT_REPORT_COLUMN_SCHEMA
  },
  {
    id: ARCHITECTURE_FILE_TYPES.UNFINISHED_OP,
    key: 'unfinished_op',
    title: '2. Lệnh TT Chưa Hoàn Thành',
    shortTitle: 'Lệnh TT chưa xong',
    description: 'Báo cáo Lệnh thao tác chưa hoàn thành / dở dang',
    columnsSchema: UNFINISHED_OP_COLUMN_SCHEMA
  },
  {
    id: ARCHITECTURE_FILE_TYPES.SUMMARY_OP,
    key: 'summary_op',
    title: '3. Tổng Hợp Lệnh Thao Tác',
    shortTitle: 'Tổng hợp lệnh TT',
    description: 'Báo cáo Tổng hợp lệnh thao tác, định mức và chỉ số OEE',
    columnsSchema: SUMMARY_OP_COLUMN_SCHEMA
  },
  {
    id: ARCHITECTURE_FILE_TYPES.MES_APPROVAL,
    key: 'mes_approval',
    title: '4. Duyệt Sản Lượng MES',
    shortTitle: 'Duyệt SL MES',
    description: 'Báo cáo Duyệt sản lượng trên hệ thống MES',
    columnsSchema: MES_APPROVAL_COLUMN_SCHEMA
  }
]
