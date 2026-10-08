/* eslint-disable react/prop-types */
import { useTranslation } from 'react-i18next'
import { Button } from 'antd'
import {
  SearchOutlined,
  CalculatorOutlined,
  ExportOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons'

export default function CalcMasterQueryActions({
  onQuery,
  onOpenCalcProduction,
  onViewDetail,
  onDeleteSelected,
  onResetFilters,
  onExportExcel,
  onOpenSearch,
  isLoading,
  hasSelection,
  totalRows
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between w-full h-6 min-h-[24px] max-h-[24px] py-0 overflow-x-auto max-w-full select-none">
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
        {/* 1. Truy vấn */}
        <Button
          key="Query"
          icon={<SearchOutlined className="text-emerald-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onQuery}
          disabled={isLoading}
          className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Truy vấn danh sách phiếu đăng ký (F8)"
        >
          {isLoading ? t('ĐANG TRUY VẤN...') : t('TRUY VẤN (F8)')}
        </Button>

        {/* 2. Tính KHSX & TKSX */}
        <Button
          key="OpenCalc"
          icon={<CalculatorOutlined className="text-indigo-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onOpenCalcProduction}
          className="uppercase text-[10px] whitespace-nowrap font-semibold text-indigo-700"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Mở màn hình tính toán KHSX & TKSX trong cửa sổ / tab mới"
        >
          {t('TÍNH KHSX & TKSX')}
        </Button>

        {/* 3. Xem chi tiết 4 bảng */}
        <Button
          key="ViewDetail"
          icon={<ExportOutlined className="text-blue-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onViewDetail}
          disabled={!hasSelection}
          className="uppercase text-[10px] whitespace-nowrap font-medium text-blue-700"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Mở chi tiết 4 bảng dữ liệu cho phiếu đang chọn"
        >
          {t('XEM CHI TIẾT 4 BẢNG')}
        </Button>

        {/* 4. Xóa phiếu */}
        {hasSelection && (
          <Button
            key="DeleteSelected"
            icon={<DeleteOutlined className="text-rose-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={onDeleteSelected}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600"
            style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
            color="default"
            variant="link"
            title="Xóa phiếu đăng ký đang chọn"
          >
            {t('XÓA PHIẾU')}
          </Button>
        )}

        {/* 5. Xuất Excel */}
        <Button
          key="Export"
          icon={<DownloadOutlined className="text-emerald-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onExportExcel}
          disabled={totalRows === 0}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Xuất danh sách ra file Excel"
        >
          {t('XUẤT EXCEL')}
        </Button>

        {/* 6. Làm mới bộ lọc */}
        <Button
          key="ResetFilters"
          icon={<ReloadOutlined className="text-slate-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onResetFilters}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Đặt lại bộ lọc tìm kiếm"
        >
          {t('LÀM MỚI BỘ LỌC')}
        </Button>

        {/* 7. Tìm kiếm bảng */}
        <Button
          key="SearchTable"
          icon={<SearchOutlined className="text-blue-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={onOpenSearch}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Tìm kiếm trên bảng (Ctrl+F)"
        >
          {t('TÌM KIẾM BẢNG')}
        </Button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 uppercase leading-none">
          <span>KẾT QUẢ:</span>
          <b className="text-indigo-700">{(totalRows || 0).toLocaleString('vi-VN')} PHIẾU MASTER</b>
        </div>
      </div>
    </div>
  )
}
