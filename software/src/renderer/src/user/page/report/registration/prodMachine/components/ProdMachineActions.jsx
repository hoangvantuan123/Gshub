/* eslint-disable react/prop-types */
import { Database, FileSpreadsheet, ListChecks, Search, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export default function ProdMachineActions({
  onSearch,
  onOpenRegistration,
  onLoadStatistics,
  onRegister,
  onDelete,
  permissions = {},
  selectedCount = 0,
  isSourceData = false
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none flex-wrap">
      {permissions.canSearch && (
        <Button variant="ghost" size="sm" onClick={onSearch} className="h-7 px-2 text-[11px] font-bold uppercase text-blue-700">
          <Search size={13} /> <span>Truy vấn đã đăng ký</span>
        </Button>
      )}
      {permissions.canCreate && permissions.canSave && (
        <Button variant="ghost" size="sm" onClick={onOpenRegistration} className="h-7 px-2 text-[11px] font-bold uppercase text-emerald-700">
          <FileSpreadsheet size={13} /> <span>Đăng ký máy (nạp file Tab 7)</span>
        </Button>
      )}
      {permissions.canCreate && (
        <Button variant="ghost" size="sm" onClick={onLoadStatistics} className="h-7 px-2 text-[11px] font-bold uppercase text-indigo-700">
          <ListChecks size={13} /> <span>Nạp phiếu TKSX</span>
        </Button>
      )}
      {permissions.canSave && isSourceData && (
        <Button variant="ghost" size="sm" onClick={onRegister} disabled={!selectedCount} className="h-7 px-2 text-[11px] font-bold uppercase text-emerald-700">
          <Database size={13} /> <span>Đăng ký máy ({selectedCount})</span>
        </Button>
      )}
      {permissions.canDelete && !isSourceData && selectedCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 px-2 text-[11px] font-bold uppercase text-rose-700">
          <Trash2 size={13} /> <span>Xóa dòng ({selectedCount})</span>
        </Button>
      )}
      {isSourceData && <span className="ml-2 text-[11px] text-slate-500">Chọn các dòng phiếu thống kê cần đăng ký.</span>}
    </div>
  )
}
