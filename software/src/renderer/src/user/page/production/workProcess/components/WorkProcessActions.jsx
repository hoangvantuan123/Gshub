/* eslint-disable react/prop-types */
import { Button } from 'antd'
import { Search, RotateCcw, FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function WorkProcessActions({
  handleSearch,
  handleReload,
  handleExportExcel,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true

  return (
    <div className="flex items-center gap-2.5 py-0.5 overflow-x-auto max-w-full">
      {canSearch && (
        <Button
          key="Search"
          icon={<Search className="text-blue-500 w-3.5 h-3.5" />}
          size="small"
          onClick={() => handleSearch?.()}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Tra cứu (Ctrl+Q / F2 / F8)"
        >
          {t('TÌM KIẾM (F2)')}
        </Button>
      )}

      {handleExportExcel && (
        <Button
          key="ExportExcel"
          icon={<FileSpreadsheet className="text-emerald-500 w-3.5 h-3.5" />}
          size="small"
          onClick={handleExportExcel}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Xuất dữ liệu Lệnh công đoạn ra Excel"
        >
          {t('XUẤT EXCEL')}
        </Button>
      )}

      {handleReload && (
        <Button
          key="Reload"
          icon={<RotateCcw className="text-amber-500 w-3.5 h-3.5" />}
          size="small"
          onClick={handleReload}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Tải lại dữ liệu"
        >
          {t('LÀM MỚI')}
        </Button>
      )}
    </div>
  )
}
