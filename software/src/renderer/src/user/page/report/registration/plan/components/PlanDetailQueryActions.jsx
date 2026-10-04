/* eslint-disable react/prop-types */
import { Button } from '../../../../../../components/ui/button'
import { Search, FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PlanDetailQueryActions({
  handleSearchData,
  handleExportExcel,
  isLoading = false,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canExport = permissions.canExport !== undefined ? Boolean(permissions.canExport) : true

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {canSearch && (
        <Button
          key="Search"
          variant="ghost"
          size="sm"
          onClick={handleSearchData}
          disabled={isLoading}
          className="uppercase text-[11px] font-semibold text-slate-700 hover:text-slate-900 h-7 px-2"
          title="Truy vấn dữ liệu chi tiết KHSX (Ctrl+Q)"
        >
          <Search size={13} className="text-blue-500" />
          {t('TÌM KIẾM')}
        </Button>
      )}

      {canExport && (
        <Button
          key="ExportExcel"
          variant="ghost"
          size="sm"
          onClick={handleExportExcel}
          className="uppercase text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 h-7 px-2"
          title="Xuất dữ liệu chi tiết ra file Excel định dạng chuẩn"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          {t('XUẤT EXCEL')}
        </Button>
      )}
    </div>
  )
}
