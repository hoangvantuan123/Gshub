/* eslint-disable react/prop-types */
import { Button } from 'antd'
import {
  Search,
  Save,
  CheckCheck,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Trash2,
  ListTree,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function OrderSettlementActions({
  handleSearch,
  handleSave,
  handleApprove,
  handleExportExcel,
  handlePrint,
  handleDelete,
  handleReload,
  handleExpandAll,
  handleCollapseAll,
  handleToggleGroupingMode,
  groupByColumn,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)

  return (
    <div className="flex items-center gap-2.5 py-0.5 overflow-x-auto max-w-full">
      {canSearch && (
        <Button
          key="Search"
          icon={<Search className="text-blue-500 w-3.5 h-3.5" />}
          size="small"
          onClick={handleSearch}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Tra cứu (Ctrl+Q / F2)"
        >
          {t('TÌM KIẾM (F2)')}
        </Button>
      )}

      {handleToggleGroupingMode && (
        <Button
          key="ToggleGrouping"
          icon={<ListTree className="text-indigo-600 w-3.5 h-3.5" />}
          size="small"
          onClick={handleToggleGroupingMode}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Chuyển đổi giữa Xem phẳng và Phân cấp Cây Thao tác"
        >
          {groupByColumn ? t('BẢNG PHẲNG') : t('GOM NHÓM LỆNH')}
        </Button>
      )}

      {groupByColumn && handleExpandAll && (
        <Button
          key="ExpandAll"
          icon={<ChevronDown className="text-sky-600 w-3.5 h-3.5" />}
          size="small"
          onClick={handleExpandAll}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Mở rộng tất cả chi tiết thao tác"
        >
          {t('MỞ RỘNG TT')}
        </Button>
      )}

      {groupByColumn && handleCollapseAll && (
        <Button
          key="CollapseAll"
          icon={<ChevronUp className="text-slate-600 w-3.5 h-3.5" />}
          size="small"
          onClick={handleCollapseAll}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Thu gọn tất cả chi tiết thao tác"
        >
          {t('THU GỌN')}
        </Button>
      )}

      {canSave && (
        <Button
          key="Save"
          icon={<Save className="text-emerald-600 w-3.5 h-3.5" />}
          size="small"
          onClick={handleSave}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Lưu dữ liệu quyết toán (Ctrl+S / F10)"
        >
          {t('LƯU (F10)')}
        </Button>
      )}

      {handleApprove && (
        <Button
          key="Approve"
          icon={<CheckCheck className="text-emerald-600 w-3.5 h-3.5" />}
          size="small"
          onClick={handleApprove}
          className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Duyệt quyết toán lệnh sản xuất"
        >
          {t('DUYỆT QUYẾT TOÁN')}
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
          title="Xuất bảng quyết toán ra Excel"
        >
          {t('XUẤT EXCEL')}
        </Button>
      )}

      {handlePrint && (
        <Button
          key="Print"
          icon={<Printer className="text-indigo-500 w-3.5 h-3.5" />}
          size="small"
          onClick={handlePrint}
          className="uppercase text-[10px] whitespace-nowrap font-medium flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="In biên bản quyết toán"
        >
          {t('IN BIÊN BẢN')}
        </Button>
      )}

      {handleReload && (
        <Button
          key="Reload"
          icon={<RotateCcw className="text-slate-500 w-3.5 h-3.5" />}
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

      {handleDelete && canDelete && (
        <Button
          key="Delete"
          icon={<Trash2 className="text-rose-500 w-3.5 h-3.5" />}
          size="small"
          onClick={handleDelete}
          className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600 flex items-center gap-1"
          style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
          color="default"
          variant="link"
          title="Xóa lệnh quyết toán đang chọn (Ctrl+Shift+D)"
        >
          {t('XÓA')}
        </Button>
      )}
    </div>
  )
}
