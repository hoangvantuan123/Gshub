/* eslint-disable react/prop-types */
import {
  Bell,
  CheckCheck,
  CheckSquare,
  Square,
  RefreshCw,
  Trash2,
  ChevronDown,
  Check,
  X,
  Search
} from 'lucide-react'

export default function NotificationListHeader({
  logsCount = 0,
  unreadCount = 0,
  onMarkAllAsRead,
  isAllSelected = false,
  onToggleSelectAll,
  onRefresh,
  isLoading = false,
  selectedCheckCount = 0,
  onDeleteSelected,
  selectedTab = 'ALL',
  onSelectTab,
  tabs = [],
  isFilterDropdownOpen = false,
  setIsFilterDropdownOpen,
  filterDropdownRef,
  searchText = '',
  onSearchTextChange,
  onTriggerSearch,
  onResetSearch,
  inputRef
}) {
  return (
    <>
      {/* HEADER DÒNG 1: TIÊU ĐỀ & CÔNG CỤ THAO TÁC DANH SÁCH */}
      <div className="bg-[#f1f5f9] border-b border-slate-300 px-3 h-9 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <Bell size={15} className="text-blue-600 shrink-0 stroke-[2]" />
          <span className="text-xs font-bold text-slate-800 truncate">Thông báo hệ thống</span>
          <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-[3px] shrink-0 border border-slate-200">
            {logsCount}
          </span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-[3px] whitespace-nowrap"
              title={`${unreadCount} thông báo chưa đọc`}
            >
              {unreadCount} mới
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Đánh dấu tất cả đã đọc */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              title="Đánh dấu tất cả là đã đọc"
              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-[3px] transition-colors cursor-pointer"
            >
              <CheckCheck size={14} className="stroke-[2]" />
            </button>
          )}

          {/* Chọn tất cả */}
          <button
            type="button"
            onClick={onToggleSelectAll}
            title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả bản ghi hiển thị'}
            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-200 rounded-[3px] transition-colors cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare size={14} className="text-blue-600" />
            ) : (
              <Square size={14} />
            )}
          </button>

          {/* Làm mới */}
          <button
            type="button"
            onClick={onRefresh}
            title="Làm mới danh sách"
            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-200 rounded-[3px] transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-blue-600' : ''} />
          </button>

          {/* Xóa đã chọn */}
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={selectedCheckCount === 0}
            title={
              selectedCheckCount > 0 ? `Xóa ${selectedCheckCount} mục đã chọn` : 'Chưa chọn mục nào'
            }
            className={`px-1.5 py-0.5 text-[11px] font-bold flex items-center gap-1 rounded-[3px] transition-colors ${
              selectedCheckCount > 0
                ? 'text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer bg-white'
                : 'text-slate-300 cursor-not-allowed border border-transparent'
            }`}
          >
            <Trash2 size={12} />
            {selectedCheckCount > 0 && <span>({selectedCheckCount})</span>}
          </button>
        </div>
      </div>

      {/* HEADER DÒNG 2: THANH TÌM KIẾM & BỘ LỌC CHUẨN */}
      <div className="bg-white border-b border-slate-300 flex items-stretch h-8 relative z-20 shrink-0">
        {/* Dropdown chọn nhóm lọc chuẩn CodeHelp */}
        <div
          ref={filterDropdownRef}
          className="relative flex items-center h-full shrink-0 w-[120px]"
        >
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="h-full w-full px-2.5 bg-slate-50 hover:bg-slate-100 border-r border-slate-300 text-[11px] font-semibold text-slate-700 outline-none cursor-pointer flex items-center justify-between select-none transition-colors"
          >
            <span className="truncate max-w-[85px]">
              {tabs.find((t) => t.id === selectedTab)?.label || 'Tất cả'}
            </span>
            <ChevronDown
              size={11}
              className={`text-slate-500 shrink-0 transition-transform duration-150 stroke-[2.2] ${
                isFilterDropdownOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Menu xổ xuống chuẩn CodeHelp */}
          {isFilterDropdownOpen && (
            <div className="absolute left-0 top-full mt-[1px] w-[165px] bg-white border border-slate-300 shadow-xl z-[99999] py-0.5 rounded-[3px]">
              {tabs.map((tab) => {
                const isTabActive = selectedTab === tab.id
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      onSelectTab(tab.id)
                      setIsFilterDropdownOpen(false)
                    }}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isTabActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{tab.label}</span>
                      <span
                        className={`font-mono text-[10px] px-1 rounded-[2px] ${
                          isTabActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.count || 0}
                      </span>
                    </div>
                    {isTabActive && <Check size={12} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Ký tự % mở đầu */}
        <span className="px-1.5 text-blue-600 font-bold text-xs bg-slate-50 border-r border-slate-200 flex items-center justify-center select-none h-full">
          %
        </span>

        {/* Input tìm kiếm */}
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onTriggerSearch()
            }
          }}
          placeholder="Tìm Menu, URL, nội dung... (Ctrl+Q)"
          title="Tìm kiếm thông báo (Phím tắt: Ctrl+Q hoặc Ctrl+F)"
          className="flex-1 px-2 text-xs text-slate-800 outline-none border-none bg-transparent h-full font-medium min-w-0"
        />

        {/* Ký tự % kết thúc */}
        <span className="px-1.5 text-blue-600 font-bold text-xs bg-slate-50 border-l border-slate-200 flex items-center justify-center select-none h-full">
          %
        </span>

        {/* Nút Xóa từ khóa */}
        {searchText && (
          <button
            type="button"
            onClick={onResetSearch}
            className="px-2 text-slate-400 hover:text-slate-700 bg-white border-r border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Xóa tìm kiếm"
          >
            <X size={13} />
          </button>
        )}

        {/* Nút Tìm kiếm */}
        <button
          type="button"
          onClick={onTriggerSearch}
          className="px-3 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Thực hiện tìm kiếm (Enter)"
        >
          <Search size={12} className="stroke-[2.5]" />
        </button>
      </div>
    </>
  )
}
