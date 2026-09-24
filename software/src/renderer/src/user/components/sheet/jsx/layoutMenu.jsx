import { Search, ArrowUpAZ, ArrowDownZA, EyeOff, Pin, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const LayoutMenuSheet = ({
  showMenu,
  handleSort,
  handleHideColumn,
  cols = [],
  setShowSearch,
  setShowMenu,
  handleFreezeColumn,
  showDrawer
}) => {
  const { t } = useTranslation()
  if (!showMenu) return null

  const colId = cols[showMenu.col]?.id
  const colTitle = cols[showMenu.col]?.title || colId || ''

  return (
    <div className="w-[210px] bg-white rounded-none shadow-lg border border-slate-300 py-1 px-1 text-xs select-none font-sans text-slate-700">
      {/* 1. Header label */}
      <div className="px-2.5 py-1 mb-1 font-bold text-[11px] text-slate-600 bg-slate-50 border-b border-slate-200 uppercase truncate">
        {colTitle}
      </div>

      {/* 2. Tìm kiếm */}
      <div
        onClick={() => {
          if (setShowSearch) setShowSearch(true)
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
      >
        <Search size={14} className="text-slate-500 shrink-0" />
        <span className="text-xs">{t('Tìm kiếm trong cột này')}</span>
      </div>

      {/* 3. Sắp xếp tăng dần */}
      <div
        onClick={() => {
          if (handleSort && colId) handleSort(colId, 'asc')
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
      >
        <ArrowUpAZ size={14} className="text-indigo-600 shrink-0" />
        <span className="text-xs">{t('Sắp xếp tăng dần (A → Z)')}</span>
      </div>

      {/* 4. Sắp xếp giảm dần */}
      <div
        onClick={() => {
          if (handleSort && colId) handleSort(colId, 'desc')
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
      >
        <ArrowDownZA size={14} className="text-indigo-600 shrink-0" />
        <span className="text-xs">{t('Sắp xếp giảm dần (Z → A)')}</span>
      </div>

      {/* Đường kẻ phân cách */}
      <div className="my-1 border-t border-slate-200" />

      {/* 5. Ẩn cột */}
      <div
        onClick={() => {
          if (handleHideColumn) handleHideColumn(showMenu.col)
          setShowMenu(null)
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-amber-50 hover:text-amber-800 rounded-none cursor-pointer transition-colors"
      >
        <EyeOff size={14} className="text-amber-600 shrink-0" />
        <span className="text-xs">{t('Ẩn cột này')}</span>
      </div>

      {/* 6. Ghim cột */}
      {handleFreezeColumn && (
        <div
          onClick={() => {
            handleFreezeColumn(showMenu.col)
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
        >
          <Pin size={14} className="text-slate-600 shrink-0" />
          <span className="text-xs">{t('Ghim cố định cột này')}</span>
        </div>
      )}

      {/* 7. Cài đặt hiển thị cột */}
      {showDrawer && (
        <div
          onClick={() => {
            showDrawer()
            setShowMenu(null)
          }}
          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-none cursor-pointer transition-colors"
        >
          <Settings size={14} className="text-slate-600 shrink-0" />
          <span className="text-xs">{t('Cài đặt hiển thị cột')}</span>
        </div>
      )}
    </div>
  )
}

export default LayoutMenuSheet
