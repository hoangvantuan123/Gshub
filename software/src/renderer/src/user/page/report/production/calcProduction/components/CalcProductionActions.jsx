/* eslint-disable react/prop-types */
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'antd'
import {
  UploadOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  ControlOutlined,
  ExportOutlined,
  ClearOutlined
} from '@ant-design/icons'

export default function CalcProductionActions({
  activeTabDef,
  activeFileData,
  isParsing,
  isCalculating,
  isRegistering,
  storageMode,
  fileStatusSummary,
  onUploadFile,
  onOpenCustomMapping,
  onDeleteTabFile,
  onClearAll,
  onRunCalculation,
  onRegisterMaster,
  onExportExcel,
  onRefresh,
  onOpenSearch,
  onOpenInNewWindow
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const customMappingInputRef = useRef(null)

  const uploadedCount = Object.values(fileStatusSummary || {}).filter((s) => s.isUploaded).length
  const hasActiveFileData = Boolean(activeFileData && activeFileData.rowCount > 0)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadFile(activeTabDef.id, file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCustomMappingFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && typeof onOpenCustomMapping === 'function') {
      onOpenCustomMapping(activeTabDef.id, file)
      if (customMappingInputRef.current) {
        customMappingInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center justify-between w-full h-6 min-h-[24px] max-h-[24px] py-0 overflow-x-auto max-w-full select-none">
      {/* Ẩn input file thường */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Ẩn input file tùy chỉnh ánh xạ */}
      <input
        ref={customMappingInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleCustomMappingFileChange}
      />

      {/* Cụm nút tác vụ chuẩn GsHub với Ant Design Button, chiều cao tiêu chuẩn 24px */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
        {/* 1. Nạp file Excel */}
        <Button
          key="Upload"
          icon={<UploadOutlined className="text-emerald-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Chọn file Excel/CSV để nạp dữ liệu vào tab hiện tại"
        >
          {hasActiveFileData ? t('TẢI LẠI FILE') : t('NẠP FILE EXCEL')}
        </Button>

        {/* 2. Ánh xạ cột */}
        <Button
          key="Mapping"
          icon={<ControlOutlined className="text-indigo-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={() => customMappingInputRef.current?.click()}
          disabled={isParsing}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Tùy chỉnh chọn dòng tiêu đề và cấu hình ánh xạ cột cho file Excel"
        >
          {t('ÁNH XẠ CỘT')}
        </Button>

        {/* 3. Tính KHSX & TKSX */}
        <Button
          key="Calculate"
          icon={<PlayCircleOutlined className="text-blue-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onRunCalculation}
          disabled={isCalculating || uploadedCount === 0}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Chạy tính toán Kế hoạch & Thống kê sản xuất từ các file đã nạp"
        >
          {isCalculating ? t('ĐANG TÍNH...') : t('TÍNH KHSX & TKSX')}
        </Button>

        {/* 4. Đăng ký báo cáo */}
        <Button
          key="Register"
          icon={<SaveOutlined className="text-indigo-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onRegisterMaster}
          disabled={isRegistering || uploadedCount === 0}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Đăng ký và lưu thông tin báo cáo master vào CSDL"
        >
          {isRegistering ? t('ĐANG ĐĂNG KÝ...') : t('ĐĂNG KÝ BÁO CÁO')}
        </Button>

        {/* 4.1. Xuất Excel Kết Quả TKSX */}
        {typeof onExportExcel === 'function' && (
          <Button
            key="ExportExcel"
            icon={<ExportOutlined className="text-emerald-700" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={onExportExcel}
            disabled={!hasActiveFileData}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-800"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
            title="Xuất bảng dữ liệu hiện tại ra tệp Excel chuẩn"
          >
            {activeTabDef.id === 'result_tksx' ? t('XUẤT EXCEL TKSX') : t('XUẤT EXCEL')}
          </Button>
        )}

        {/* 5. Cửa sổ mới */}
        {typeof onOpenInNewWindow === 'function' && (
          <Button
            key="NewWindow"
            icon={<ExportOutlined className="text-indigo-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={onOpenInNewWindow}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
            title="Mở toàn bộ các bảng trong cửa sổ mới độc lập"
          >
            {t('CỬA SỔ MỚI')}
          </Button>
        )}

        {/* 6. Làm mới */}
        <Button
          key="Refresh"
          icon={<ReloadOutlined className="text-slate-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onRefresh}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Nạp lại dữ liệu từ CSDL SQLite/IndexedDB"
        >
          {t('LÀM MỚI')}
        </Button>

        {/* 7. Tìm kiếm */}
        <Button
          key="Search"
          icon={<SearchOutlined className="text-blue-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onOpenSearch}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Tìm kiếm trên bảng (Ctrl+F)"
        >
          {t('TÌM KIẾM')}
        </Button>

        {/* 8. Xóa tab hiện tại */}
        {hasActiveFileData && (
          <Button
            key="DeleteTab"
            icon={<DeleteOutlined className="text-rose-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={() => onDeleteTabFile(activeTabDef.id)}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
            title="Xóa dữ liệu file trong tab hiện tại khỏi hệ thống"
          >
            {t('XÓA TAB')}
          </Button>
        )}

        {/* 9. Xóa tất cả */}
        {uploadedCount > 0 && (
          <Button
            key="ClearAll"
            icon={<ClearOutlined className="text-slate-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={onClearAll}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
            title="Xóa toàn bộ file khỏi phiên làm việc"
          >
            {t('XÓA TẤT CẢ')}
          </Button>
        )}
      </div>

      {/* Cụm thông tin & trạng thái bên phải */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 uppercase leading-none">
          <span>TIẾN ĐỘ:</span>
          <b className={uploadedCount === 4 ? 'text-emerald-700' : 'text-amber-600'}>
            {uploadedCount}/4 FILE
          </b>
        </div>
      </div>
    </div>
  )
}
