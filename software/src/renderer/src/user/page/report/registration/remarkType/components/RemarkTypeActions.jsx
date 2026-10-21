/* eslint-disable react/prop-types */
import { Search, Save, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'

export default function RemarkTypeActions({
  handleSearchData,
  handleSaveData,
  handleDeleteDataSheet,
  permissions = {}
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none flex-wrap">
      {permissions.canSearch && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSearchData}
          className="uppercase text-[11px] font-bold text-blue-700 hover:text-blue-800 h-7 px-2 shrink-0"
          title={t('Truy vấn danh sách phân loại')}
        >
          <Search size={13} className="text-blue-600" />
          <span>{t('TRUY VẤN')}</span>
        </Button>
      )}
      {permissions.canSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveData}
          className="uppercase text-[11px] font-bold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0"
          title={t('Lưu thông tin phân loại lỗi vào cơ sở dữ liệu')}
        >
          <Save size={13} className="text-indigo-600" />
          <span>{t('LƯU ĐĂNG KÝ')}</span>
        </Button>
      )}
      {permissions.canDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteDataSheet}
          className="uppercase text-[11px] font-semibold text-rose-600 hover:text-rose-700 h-7 px-2 shrink-0 flex items-center gap-1"
          title={t('Đánh dấu xóa các dòng đang chọn')}
        >
          <Trash2 size={13} className="text-rose-500" />
          <span>{t('XÓA DÒNG')}</span>
        </Button>
      )}
    </div>
  )
}
