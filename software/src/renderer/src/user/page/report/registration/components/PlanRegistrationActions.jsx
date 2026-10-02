import { Button } from 'antd'
import {
  SaveOutlined,
  SearchOutlined,
  DeleteRowOutlined,
  PlusOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Layers, SquareArrowOutUpRight } from 'lucide-react'

export default function PlanRegistrationActions({
  handleSearchData,
  handleSaveData,
  handleDeleteDataSheet,
  handleOpenAddModal,
  handleOpenDetailWindow,
  handleExportExcel,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canCreate = Boolean(permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)

  return (
    <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
      {/* Nút tác vụ chuẩn */}
      <div className="flex items-center gap-1">
        {canSearch && (
          <Button
            key="Search"
            icon={<SearchOutlined className="text-blue-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={handleSearchData}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
            color="default"
            variant="link"
            title="Tìm kiếm đợt đăng ký (Ctrl+Q)"
          >
            {t('TÌM KIẾM')}
          </Button>
        )}

        {canCreate && (
          <Button
            key="AddPlan"
            icon={<PlusOutlined className="text-emerald-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={handleOpenAddModal}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-800"
            style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
            color="default"
            variant="link"
            title="Mở form nạp file Excel & Đăng ký báo cáo mới"
          >
            {t('ĐĂNG KÝ BÁO CÁO (NẠP MỚI)')}
          </Button>
        )}

        {handleOpenDetailWindow && (
          <Button
            key="ViewDetail"
            icon={
              <SquareArrowOutUpRight
                className="text-blue-600"
                style={{ width: '13px', height: '13px', verticalAlign: 'middle' }}
              />
            }
            size="small"
            onClick={handleOpenDetailWindow}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-blue-700 hover:text-blue-800"
            style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
            color="default"
            variant="link"
            title="Mở xem chi tiết đợt đăng ký trong cửa sổ mới (Ctrl+Shift+N)"
          >
            {t('XEM CHI TIẾT')}
          </Button>
        )}

        {canSave && (
          <Button
            key="Save"
            icon={<SaveOutlined className="text-green-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={handleSaveData}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
            color="default"
            variant="link"
            title="Lưu dữ liệu (Ctrl+S)"
          >
            {t('LƯU')}
          </Button>
        )}

        {handleDeleteDataSheet && canDelete && (
          <Button
            key="Delete"
            icon={<DeleteRowOutlined className="text-red-500" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={handleDeleteDataSheet}
            className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600 hover:text-rose-700"
            style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
            color="default"
            variant="link"
            title="Xóa đợt đăng ký đã chọn (Ctrl+Shift+D)"
          >
            {t('XÓA ĐĂNG KÝ')}
          </Button>
        )}

        {handleExportExcel && (
          <Button
            key="ExportExcel"
            icon={<FileExcelOutlined className="text-emerald-600" style={{ fontSize: '12px' }} />}
            size="small"
            onClick={handleExportExcel}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
            color="default"
            variant="link"
            title="Xuất file Excel"
          >
            {t('XUẤT EXCEL')}
          </Button>
        )}
      </div>

    </div>
  )
}
