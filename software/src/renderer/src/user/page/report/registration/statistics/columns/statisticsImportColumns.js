import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useStatisticsImportColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      // ── Cột trạng thái hệ thống
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 12px' }
      },

      // ── 1. THÔNG TIN VẬT TƯ & LỆNH THAO TÁC
      {
        title: t('report.itemCode', 'Mã vật tư'),
        id: 'ItemCode',
        group: 'Thông tin vật tư',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('report.itemName', 'Tên vật tư'),
        id: 'ItemName',
        group: 'Thông tin vật tư',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.version', 'Version'),
        id: 'Version',
        group: 'Thông tin vật tư',
        kind: 'Text',
        readonly: false,
        width: 80,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.model', 'Model'),
        id: 'Model',
        group: 'Thông tin vật tư',
        kind: 'Text',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.defectMarginWeight', 'Trọng lượng Sp/lề NG'),
        id: 'DefectMarginWeight',
        group: 'Thông tin vật tư',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.techMarginWeight', 'Trọng lượng lề kỹ thuật'),
        id: 'TechMarginWeight',
        group: 'Thông tin vật tư',
        kind: 'Number',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.operationNo', 'Số lệnh thao tác'),
        id: 'OperationNo',
        group: 'Thông tin lệnh thao tác',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },

      // ── 2. NHÂN SỰ THỰC HIỆN
      {
        title: t('report.mainWorker', 'Thợ chính'),
        id: 'MainWorker',
        group: 'Nhân sự thực hiện',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.subWorker1', 'Thợ phụ 1'),
        id: 'SubWorker1',
        group: 'Nhân sự thực hiện',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.subWorker2', 'Thợ phụ 2'),
        id: 'SubWorker2',
        group: 'Nhân sự thực hiện',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },

      // ── 3. THIẾT BỊ & CÔNG NGHỆ
      {
        title: t('report.breakdownReason', 'Nguyên nhân hỏng máy'),
        id: 'BreakdownReason',
        group: 'Thiết bị & Công nghệ',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.machineCode', 'Mã máy sản xuất'),
        id: 'MachineCode',
        group: 'Thiết bị & Công nghệ',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.machineName', 'Tên máy sản xuất'),
        id: 'MachineName',
        group: 'Thiết bị & Công nghệ',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.opTypeCode', 'Mã phân loại thao tác'),
        id: 'OpTypeCode',
        group: 'Thiết bị & Công nghệ',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.opTypeName', 'Phân loại thao tác'),
        id: 'OpTypeName',
        group: 'Thiết bị & Công nghệ',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.uvPlate', 'Kẽm UV'),
        id: 'UvPlate',
        group: 'Thiết bị & Công nghệ',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.moldSetQty1', 'SL lên khuôn 1'),
        id: 'MoldSetQty1',
        group: 'Thiết bị & Công nghệ',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.moldSetQty2', 'SL lên khuôn 2'),
        id: 'MoldSetQty2',
        group: 'Thiết bị & Công nghệ',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.moldSetQty3', 'SL lên khuôn 3'),
        id: 'MoldSetQty3',
        group: 'Thiết bị & Công nghệ',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },

      // ── 4. SỐ LƯỢNG THỰC HIỆN
      {
        title: t('report.prodQty', 'Số lượng sản xuất'),
        id: 'ProdQty',
        group: 'Số lượng thực hiện',
        kind: 'Number',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.passQty', 'Số lượng đạt'),
        id: 'PassQty',
        group: 'Số lượng thực hiện',
        kind: 'Number',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.actualMeters', 'Số mét thực tế'),
        id: 'ActualMeters',
        group: 'Số lượng thực hiện',
        kind: 'Number',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.standardMeters', 'Số mét định mức'),
        id: 'StandardMeters',
        group: 'Số lượng thực hiện',
        kind: 'Number',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },

      // ── 5. TỔ & CA SẢN XUẤT
      {
        title: t('report.teamName', 'Tổ sản xuất'),
        id: 'TeamName',
        group: 'Tổ & Ca sản xuất',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.shift', 'Ca sản xuất'),
        id: 'Shift',
        group: 'Tổ & Ca sản xuất',
        kind: 'Text',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },

      // ── 6. THỜI GIAN THỰC HIỆN
      {
        title: t('report.startDate', 'Ngày bắt đầu'),
        id: 'StartDate',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.startTime', 'Bắt đầu'),
        id: 'StartTime',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.endDate', 'Ngày kết thúc'),
        id: 'EndDate',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.endTime', 'Kết thúc'),
        id: 'EndTime',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.statDate', 'Ngày thống kê'),
        id: 'StatDate',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.statTicketNo', 'Số phiếu thống kê'),
        id: 'StatTicketNo',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.statStaff', 'Nhân viên thống kê'),
        id: 'StatStaff',
        group: 'Thời gian thực hiện',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },

      // ── 7. THÔNG TIN CHUNG
      {
        title: t('report.customer', 'Khách hàng'),
        id: 'Customer',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.salesStaff', 'Nhân viên kinh doanh'),
        id: 'SalesStaff',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.orderNo', 'Số đơn hàng'),
        id: 'OrderNo',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.processName', 'Công đoạn'),
        id: 'ProcessName',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.unit', 'Đvt'),
        id: 'Unit',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 70,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.convUnit', 'Đơn vị quy đổi'),
        id: 'ConvUnit',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.processSpec', 'QTCN'),
        id: 'ProcessSpec',
        group: 'Thông tin chung',
        kind: 'Text',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },

      // ── 8. THÔNG TIN SẢN PHẨM
      {
        title: t('report.partNo', 'Số part'),
        id: 'PartNo',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.corrugatedPartNo', 'Số part sóng'),
        id: 'CorrugatedPartNo',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.trimPartNo', 'Số part xén'),
        id: 'TrimPartNo',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.colorQty', 'Số lượng màu in'),
        id: 'ColorQty',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.outPlateType', 'Loại Out bản'),
        id: 'OutPlateType',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.frontColors', 'Số lượng màu in mặt 1'),
        id: 'FrontColors',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.backColors', 'Số lượng màu in mặt 2'),
        id: 'BackColors',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.jobNumber', 'Số Job'),
        id: 'JobNumber',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.width', 'Rộng/ khổ cuộn'),
        id: 'Width',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.length', 'Dài/ chiều chặt'),
        id: 'Length',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.height', 'Cao'),
        id: 'Height',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 80,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.productLine', 'Dòng hàng'),
        id: 'ProductLine',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.rawWidth', 'Rộng/ khổ cuộn NVL'),
        id: 'RawWidth',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.rawLength', 'Dài/ chiều chặt NVL'),
        id: 'RawLength',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.rawLineCode', 'Mã dòng hàng NVL'),
        id: 'RawLineCode',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.rawLineName', 'Dòng hàng NVL'),
        id: 'RawLineName',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.flipType', 'Kiểu trở'),
        id: 'FlipType',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.bomPlates', 'Số lượng kẽm theo BOM'),
        id: 'BomPlates',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.coating', 'Phủ'),
        id: 'Coating',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.slitterBlades', 'Số dao chia'),
        id: 'SlitterBlades',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.codePositions', 'Số vị trí bắn code'),
        id: 'CodePositions',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.punchHoles', 'Số lỗ đột'),
        id: 'PunchHoles',
        group: 'Thông tin sản phẩm',
        kind: 'Number',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.structureCode', 'Mã loại kết cấu'),
        id: 'StructureCode',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.structureName', 'Tên loại kết cấu'),
        id: 'StructureName',
        group: 'Thông tin sản phẩm',
        kind: 'Text',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },

      // ── 9. THÔNG TIN LỆNH CÔNG ĐOẠN
      {
        title: t('report.routingDocNo', 'Số lệnh công đoạn'),
        id: 'RoutingDocNo',
        group: 'Thông tin lệnh công đoạn',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.routingDate', 'Ngày lệnh công đoạn'),
        id: 'RoutingDate',
        group: 'Thông tin lệnh công đoạn',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.releaseDate', 'Ngày phát hành lệnh'),
        id: 'ReleaseDate',
        group: 'Thông tin lệnh công đoạn',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.targetPassQty', 'Số lượng cần đạt'),
        id: 'TargetPassQty',
        group: 'Thông tin lệnh công đoạn',
        kind: 'Number',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.targetProdQty', 'Số lượng cần sản xuất'),
        id: 'TargetProdQty',
        group: 'Thông tin lệnh công đoạn',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.routingUnit', 'Đvt'),
        id: 'RoutingUnit',
        group: 'Thông tin lệnh công đoạn',
        kind: 'Text',
        readonly: false,
        width: 70,
        hasMenu: true,
        visible: true
      },

      // ── 10. THỜI GIAN LÃNG PHÍ / HAO PHÍ
      {
        title: 'TG hỏng máy/mất điện (phút) (01)',
        id: 'BreakdownMinutes',
        group: 'Thời gian lãng phí',
        kind: 'Number',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true
      },
      {
        title: 'Tg chờ NVL (phút) (02)',
        id: 'WaitingMaterialMinutes',
        group: 'Thời gian lãng phí',
        kind: 'Number',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: 'Tg chuẩn bị (phút) (03)',
        id: 'SetupMinutes',
        group: 'Thời gian lãng phí',
        kind: 'Number',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: 'TG sửa file/khuôn/bản (phút) (04)',
        id: 'RepairMinutes',
        group: 'Thời gian lãng phí',
        kind: 'Number',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true
      },
      {
        title: 'Tổng tg hao phí (5)=1+2+3+4',
        id: 'TotalWasteMinutes',
        group: 'Thời gian lãng phí',
        kind: 'Number',
        readonly: true,
        width: 180,
        hasMenu: true,
        visible: true
      },

      // ── 11. BỒI CHIA HỘP CỨNG & GIA CÔNG
      {
        title: t('report.rigidBoxGlue', 'Bồi chia hộp cứng'),
        id: 'RigidBoxGlue',
        group: 'Bồi chia & Gia công',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.outsourcing', 'Gia công'),
        id: 'Outsourcing',
        group: 'Bồi chia & Gia công',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },

      // ── 12. CHẤT LƯỢNG & TRẠNG THÁI
      {
        title: t('report.defectQty', 'Số lượng lỗi'),
        id: 'DefectQty',
        group: 'Chất lượng & Trạng thái',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.defectRate', 'Tỷ lệ NG'),
        id: 'DefectRate',
        group: 'Chất lượng & Trạng thái',
        kind: 'Text',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.defectUnit', 'Đvt'),
        id: 'DefectUnit',
        group: 'Chất lượng & Trạng thái',
        kind: 'Text',
        readonly: false,
        width: 70,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.status', 'Trạng thái'),
        id: 'Status',
        group: 'Chất lượng & Trạng thái',
        kind: 'Text',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },

      // ── 13. TỰ ĐỘNG HÓA & ĐỒNG BỘ HỆ THỐNG
      {
        title: t('report.autoExport', 'Xuất tự động'),
        id: 'AutoExport',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Boolean',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.autoImport', 'Nhập tự động'),
        id: 'AutoImport',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Boolean',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.exportDocNo', 'Số phiếu xuất'),
        id: 'ExportDocNo',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.importDocNo', 'Số phiếu nhập'),
        id: 'ImportDocNo',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.wrongOpCode', 'Sai mã thao tác'),
        id: 'WrongOpCode',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Boolean',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.isAdditionalStat', 'Thống kê bổ sung'),
        id: 'IsAdditionalStat',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Boolean',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.ticketCreatedDate', 'Ngày tạo phiếu'),
        id: 'TicketCreatedDate',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.actualRunTime', 'Thời gian chạy thực tế'),
        id: 'ActualRunTime',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Number',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.actualCapa', 'capa thực tế'),
        id: 'ActualCapa',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Number',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.checkPlanStatus', 'CHECK KHSX'),
        id: 'CheckPlanStatus',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.mesApprovalTime', 'Thời gian duyệt phiếu ở MES'),
        id: 'MesApprovalTime',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.syncDelayMinutes', 'Độ trễ thời gian đồng bộ 2 hệ thống'),
        id: 'SyncDelayMinutes',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Number',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.isDuplicateTicket', 'Phiếu sinh trùng'),
        id: 'IsDuplicateTicket',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Boolean',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.ticketCreationLocation', 'Vị trí tạo phiếu tk'),
        id: 'TicketCreationLocation',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('report.autoIoStatus', 'Sinh phiếu xuất/nhập tự động'),
        id: 'AutoIoStatus',
        group: 'Tự động hóa & Hệ thống',
        kind: 'Text',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true
      }
    ]

    return cols
      .filter((col) => !isFieldVisible || isFieldVisible(col.id))
      .map((col) => ({
        ...col,
        readonly: isFieldReadOnly ? isFieldReadOnly(col.id) || col.readonly : col.readonly
      }))
  }, [t, isFieldVisible, isFieldReadOnly])
}
