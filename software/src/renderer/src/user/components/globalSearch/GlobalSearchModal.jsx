/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  X,
  Maximize2,
  Minimize2,
  Search,
  Check,
  RotateCcw,
  ChevronDown,
  FolderSearch,
  CornerDownLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearchData } from './useGlobalSearchData'
import { getMenuIcon } from '../sildebar/dataMenu'

const PAGE_CHUNK_SIZE = 50 // Giới hạn số lượng dòng render trên DOM để siêu mượt

/**
 * GlobalSearchModal - Modal Tra cứu Menu & Chức năng Hệ thống (Ctrl + K)
 * - Chuẩn giao diện CodeHelp ERP phẳng vuông vức (rounded-none)
 * - Giữ thanh Dropdown chọn bộ lọc (mặc định "Tất cả phân hệ", sẵn sàng mở rộng thêm)
 * - Icon hiển thị trực tiếp thuần túy (không viền, không background)
 * - Tìm kiếm theo lệnh Enter hoặc Click kính lúp
 * - Tối ưu phân trang chống tràn DOM (tải từng đợt 50 dòng)
 */
export default function GlobalSearchModal({
  isOpen = false,
  onClose,
  permissions = [],
  rootMenu = []
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { menuItems } = useGlobalSearchData({
    permissions,
    rootMenu
  })

  // Search & Filter States
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [searchText, setSearchText] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [displayLimit, setDisplayLimit] = useState(PAGE_CHUNK_SIZE)

  // UI States
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Tính toán Origin đồng bộ ngay khi render (Zero lag, không gây re-render)
  const clickOrigin = useMemo(() => {
    if (!isOpen) return '50% 50%'
    const clickPos = (typeof window !== 'undefined' && window.__lastPointerPos) || {
      x: (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 800) / 2
    }
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800
    const modalWidth = Math.min(winW * 0.94, 1100)
    const modalHeight = Math.min(winH * 0.78, 700)
    const left = (winW - modalWidth) / 2
    const top = (winH - modalHeight) / 2
    const ox = Math.round(clickPos.x - left)
    const oy = Math.round(clickPos.y - top)
    return `${ox}px ${oy}px`
  }, [isOpen])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  // Lọc toàn bộ tập dữ liệu Menu theo appliedKeyword (Chỉ chạy khi đã kích hoạt Tìm kiếm)
  const allFilteredData = useMemo(() => {
    const keyword = appliedKeyword.trim().toLowerCase()
    if (!keyword) return menuItems

    const terms = keyword.split(/\s+/).filter(Boolean)
    return menuItems.filter((item) => {
      return terms.every((t) => item.keywords.includes(t))
    })
  }, [menuItems, appliedKeyword])

  // Dữ liệu cắt lát hiển thị trên DOM (Chỉ hiển thị tối đa displayLimit dòng)
  const visibleData = useMemo(() => {
    return allFilteredData.slice(0, displayLimit)
  }, [allFilteredData, displayLimit])

  const lastSearchTimeRef = useRef(0)

  // Thực thi tìm kiếm (Chỉ khi nhấn Enter hoặc bấm nút Tìm kiếm 🔍)
  const handleTriggerSearch = useCallback(() => {
    const now = Date.now()
    if (now - lastSearchTimeRef.current < 350) {
      return
    }
    const clean = searchText.trim()
    if (clean === appliedKeyword.trim()) {
      return
    }
    lastSearchTimeRef.current = now
    setAppliedKeyword(clean)
    setDisplayLimit(PAGE_CHUNK_SIZE)
    setActiveIndex(0)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [searchText, appliedKeyword])

  // Xóa và đặt lại tìm kiếm
  const handleResetSearch = useCallback(() => {
    setSearchText('')
    setAppliedKeyword('')
    setDisplayLimit(PAGE_CHUNK_SIZE)
    setActiveIndex(0)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
    inputRef.current?.focus()
  }, [])

  // Đặt lại toàn bộ bộ lọc
  const handleResetAll = useCallback(() => {
    setSearchText('')
    setAppliedKeyword('')
    setSelectedCategory('ALL')
    setDisplayLimit(PAGE_CHUNK_SIZE)
    setActiveIndex(0)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
    inputRef.current?.focus()
  }, [])

  // Reset state & auto-focus khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setSearchText('')
      setAppliedKeyword('')
      setSelectedCategory('ALL')
      setDisplayLimit(PAGE_CHUNK_SIZE)
      setActiveIndex(0)
      setIsMaximized(false)
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Tự động tải thêm khi cuộn xuống đáy danh sách (Infinite Scroll)
  const handleScroll = useCallback(
    (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollTop + clientHeight >= scrollHeight - 80) {
        if (displayLimit < allFilteredData.length) {
          setDisplayLimit((prev) => Math.min(prev + PAGE_CHUNK_SIZE, allFilteredData.length))
        }
      }
    },
    [displayLimit, allFilteredData.length]
  )

  // Tự động cuộn phần tử active vào tầm nhìn
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // Điều hướng mở màn hình Menu
  const handleConfirmAction = useCallback(
    (item) => {
      const target = item || visibleData[activeIndex] || visibleData[0]
      if (!target || !target.path) return

      onClose && onClose()
      navigate(target.path)
    },
    [visibleData, activeIndex, onClose, navigate]
  )

  // Xử lý sự kiện bàn phím
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose && onClose()
      return
    }

    // Nhấn Enter
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchText.trim() !== appliedKeyword.trim()) {
        handleTriggerSearch()
      } else {
        handleConfirmAction()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => {
        const next = prev < allFilteredData.length - 1 ? prev + 1 : prev
        if (next >= displayLimit - 3 && displayLimit < allFilteredData.length) {
          setDisplayLimit((l) => Math.min(l + PAGE_CHUNK_SIZE, allFilteredData.length))
        }
        return next
      })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[99999] select-none transition-[padding] duration-200 ease-out ${
        isMaximized ? 'p-0' : 'p-3 sm:p-5'
      }`}
      style={{
        animation: 'macBackdropFade 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes macBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes macOriginIn {
          0% {
            opacity: 0;
            transform: scale(0.88);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div
        className={`bg-[#f8fafc] flex flex-col shadow-2xl border font-sans rounded-none select-none transition-[width,height,max-width,max-height,transform] duration-200 ease-out transform-gpu will-change-[width,height,transform] ${
          isMaximized
            ? 'w-full h-full max-w-full max-h-full border-0'
            : 'w-[94vw] max-w-[1100px] h-[78vh] max-h-[700px] min-h-[400px] border-slate-500'
        }`}
        style={{
          transformOrigin: isMaximized ? '50% 50%' : clickOrigin,
          animation: 'macOriginIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 1. HEADER DIALOG VUÔNG LIỀN MẠCH CHUẨN CODEHELP */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#f1f5f9] border-b border-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate">
              {t('Tra cứu Menu & Chức năng hệ thống')}
            </span>
          </div>

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? t('Thu nhỏ') : t('Phóng to')}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors rounded-none cursor-pointer"
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title={t('Đóng (Esc)')}
              className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-100 transition-colors rounded-none cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 2. TOOLBAR TÌM KIẾM GỌN GÀNG, VUÔNG LIỀN MẠCH CHUẨN CODEHELP (KÈM BỘ LỌC) */}
        <div className="bg-white border-b border-slate-300 flex items-stretch relative z-30 h-8">
          <div className="flex-1 flex items-stretch border-0 rounded-none bg-white h-full relative">
            {/* Dropdown chọn Phân hệ vuông vức */}
            <div ref={dropdownRef} className="relative flex items-center h-full shrink-0 w-[150px]">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="h-full w-full px-2.5 bg-slate-50 hover:bg-slate-100 border-r border-slate-300 text-xs font-semibold text-slate-700 outline-none cursor-pointer rounded-none flex items-center justify-between select-none transition-colors"
              >
                <span className="truncate max-w-[115px]">{t('Tất cả phân hệ')}</span>
                <ChevronDown
                  size={12}
                  className={`text-slate-500 shrink-0 transition-transform duration-150 stroke-[2.2] ${
                    isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {/* Menu xổ xuống */}
              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-[1px] w-full min-w-[150px] bg-white border border-slate-300 shadow-2xl z-[99999] rounded-none py-0.5 max-h-60 overflow-y-auto">
                  <div
                    onClick={() => {
                      setSelectedCategory('ALL')
                      setIsDropdownOpen(false)
                    }}
                    className="px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition-colors bg-blue-600 text-white font-semibold"
                  >
                    <span>{t('Tất cả phân hệ')}</span>
                    <Check size={12} />
                  </div>
                </div>
              )}
            </div>

            {/* Ký tự % mở đầu */}
            <span className="px-2.5 text-blue-600 font-bold text-xs bg-slate-50 border-r border-slate-200 flex items-center justify-center select-none h-full">
              %
            </span>

            {/* Input tìm kiếm */}
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t('Nhập tên menu, mã chức năng và nhấn Enter để tìm kiếm...')}
              className="flex-1 px-3 text-xs text-slate-800 outline-none border-none bg-transparent rounded-none h-full font-medium"
              autoFocus
            />

            {/* Ký tự % kết thúc */}
            <span className="px-2.5 text-blue-600 font-bold text-xs bg-slate-50 border-l border-slate-200 flex items-center justify-center select-none h-full">
              %
            </span>

            {/* Nút Xóa tìm kiếm */}
            {searchText && (
              <button
                type="button"
                onClick={handleResetSearch}
                title={t('Xóa tìm kiếm')}
                className="px-2.5 text-slate-400 hover:text-slate-700 bg-white flex items-center justify-center border-l border-slate-200 h-full cursor-pointer"
              >
                <X size={14} />
              </button>
            )}

            {/* Nút Tìm kiếm */}
            <button
              type="button"
              onClick={handleTriggerSearch}
              title={t('Tìm kiếm (Enter)')}
              className="bg-[#1677ff] hover:bg-[#0958d9] text-white px-3.5 flex items-center justify-center transition-colors cursor-pointer border-l border-blue-600 rounded-none h-full"
            >
              <Search size={15} className="stroke-[2.5]" />
            </button>

            {/* Nút Đặt lại bộ lọc */}
            <button
              type="button"
              onClick={handleResetAll}
              title={t('Đặt lại bộ lọc')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 flex items-center justify-center transition-colors cursor-pointer border-l border-slate-300 rounded-none h-full"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* 3. VÙNG DANH SÁCH DÒNG KẾT QUẢ VUÔNG VỨC, ICON THUẦN (KHÔNG BORDER/BG) */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 w-full bg-white overflow-y-auto divide-y divide-slate-100"
        >
          {visibleData.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <FolderSearch size={36} className="text-slate-300 stroke-[1.5]" />
              <span className="font-semibold text-slate-600 text-xs">
                {appliedKeyword
                  ? `${t('Không tìm thấy chức năng phù hợp với từ khóa')} "${appliedKeyword}"`
                  : t('Nhập tên menu hoặc mã chức năng và nhấn Enter để tìm kiếm')}
              </span>
              <span className="text-[11px] text-slate-400">
                {t('Nhấn phím Enter hoặc nút kính lúp 🔍 để thực hiện tìm kiếm')}
              </span>
            </div>
          ) : (
            visibleData.map((item, idx) => {
              const isSelected = idx === activeIndex

              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => handleConfirmAction(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-[#eef6ff] text-blue-900 border-l-[4px] border-l-[#1677ff] pl-[10px]'
                      : 'hover:bg-[#f8fafc] text-slate-700'
                  }`}
                >
                  {/* Icon trực tiếp - Không border, không background bao quanh */}
                  <div className="shrink-0 flex items-center justify-center w-5">
                    {getMenuIcon(item.icon, isSelected ? 'text-[#1677ff]' : 'text-slate-500', 18)}
                  </div>

                  {/* Nội Dung Dòng: Tên + Breadcrumb (Nhóm > Màn hình) + Mã chức năng */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-blue-700' : 'text-slate-800'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.menuKey && (
                        <span className="text-[10px] font-mono text-slate-400 font-medium">
                          [{item.menuKey}]
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1 font-normal">
                        <span>{item.description}</span>
                        {item.path && item.path !== item.description && (
                          <span className="text-slate-400 font-mono text-[10px] ml-1.5">
                            ({item.path})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cột Trạng thái / Hành Động bên phải */}
                  <div className="shrink-0 text-xs flex items-center gap-2">
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-[#1677ff] font-semibold text-xs bg-white border border-blue-300 px-2 py-0.5 rounded-none shadow-2xs">
                        <span>{t('Mở màn hình')}</span>
                        <CornerDownLeft size={12} className="stroke-[2.5]" />
                      </div>
                    ) : (
                      <ChevronRight size={14} className="text-slate-300" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 4. FOOTER CONTROLS VUÔNG LIỀN MẠCH CHUẨN CODEHELP */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#f8fafc] border-t border-slate-300 text-xs">
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span className="text-[11px] text-slate-500 flex items-center gap-2 select-none">
              <span>
                <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded-none text-[10px]">
                  ↑
                </kbd>{' '}
                <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded-none text-[10px]">
                  ↓
                </kbd>{' '}
                {t('Di chuyển')}
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded-none text-[10px]">
                  Enter
                </kbd>{' '}
                {t('Tìm / Mở màn hình')}
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded-none text-[10px]">
                  Esc
                </kbd>{' '}
                {t('Đóng')}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleConfirmAction()}
              disabled={visibleData.length === 0}
              className="px-4 py-1.5 bg-[#1677ff] hover:bg-[#0958d9] disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 text-white font-semibold text-xs rounded-none shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed border border-[#1677ff]"
            >
              <ExternalLink size={13} className="stroke-[2.5]" />
              {t('Mở màn hình')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-none border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              {t('Đóng')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
