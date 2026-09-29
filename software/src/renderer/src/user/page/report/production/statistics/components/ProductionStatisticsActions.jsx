import { Button } from 'antd'
import {
  SearchOutlined,
  SaveOutlined,
  DeleteRowOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  ShareAltOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export default function ProductionStatisticsActions({
  handleSearchData,
  handleSaveData,
  handleDeleteDataSheet,
  handleExportExcel,
  handlePrint,
  handleOpenPublicLink,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)

  return (
    <div className="flex items-center gap-2 py-0.5 overflow-x-auto max-w-full">
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
          title="Tìm kiếm (Ctrl+Q)"
        >
          {t('TÌM KIẾM')}
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
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Xóa dòng (Ctrl+Shift+D)"
        >
          {t('XÓA SHEET')}
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

      {handlePrint && (
        <Button
          key="Print"
          icon={<PrinterOutlined className="text-indigo-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handlePrint}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="In báo cáo thống kê"
        >
          {t('IN BÁO CÁO')}
        </Button>
      )}

      {handleOpenPublicLink && (
        <Button
          key="PublicLink"
          icon={<ShareAltOutlined className="text-sky-600" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handleOpenPublicLink}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Xem đường dẫn báo cáo công khai (Public)"
        >
          {t('LINK PUBLIC')}
        </Button>
      )}
    </div>
  )
}
