/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Globe, Palette, Clock, RefreshCw } from 'lucide-react'

export default function PreferencesTab() {
  const [theme, setTheme] = useState('light')
  const [timeFormat, setTimeFormat] = useState('24h')
  const [languageUser, setLanguageUser] = useState(
    localStorage.getItem('lang') || localStorage.getItem('language_user') || 'vi'
  )
  const langOptions = [
    { value: 'vi', label: 'Tiếng Việt (Mặc định)' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文 (Tiếng Trung)' }
  ]
  const [isModalVisible, setIsModalVisible] = useState(false)

  const handleLanguageChange = (val) => {
    setLanguageUser(val)
    localStorage.setItem('lang', val)
    localStorage.setItem('language_user', JSON.stringify(val))
    window.dispatchEvent(new Event('language-changed'))
    window.dispatchEvent(new Event('storage'))
    setIsModalVisible(true)
  }

  const reloadPage = () => {
    window.location.reload()
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 font-sans pb-20 pt-2 text-[#37352F] dark:text-[#E6E6E5]">
      {/* 1. NOTION PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E6E5]">
          Tùy chỉnh Hiển thị
        </h1>
        <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">
          Điều chỉnh ngôn ngữ giao diện, định dạng thời gian và chủ đề màu sắc theo sở thích cá
          nhân.
        </p>
      </div>

      <hr className="border-t border-[#EDEDEB] dark:border-[#2F2F2F]" />

      {/* 2. CÁC THIẾT LẬP HIỂN THỊ */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
          Cài đặt giao diện người dùng
        </h3>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F] bg-white dark:bg-[#191919]">
          {/* Ngôn ngữ */}
          <div className="flex items-center justify-between p-3.5 hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#787774] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                  Ngôn ngữ hiển thị
                </div>
                <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
                  Lựa chọn ngôn ngữ sử dụng cho các biểu mẫu và báo cáo
                </div>
              </div>
            </div>
            <select
              value={languageUser}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-48 h-8 px-2.5 text-xs rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#E6E6E5] focus:outline-none"
            >
              {langOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chủ đề */}
          <div className="flex items-center justify-between p-3.5 hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3">
              <Palette className="w-4 h-4 text-[#787774] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                  Chủ đề giao diện
                </div>
                <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
                  Độ tương phản và tông màu sắc hiển thị
                </div>
              </div>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-48 h-8 px-2.5 text-xs rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#E6E6E5] focus:outline-none"
            >
              <option value="light">Giao diện sáng</option>
              <option value="dark" disabled>
                Giao diện tối (Sắp ra mắt)
              </option>
            </select>
          </div>

          {/* Định dạng thời gian */}
          <div className="flex items-center justify-between p-3.5 hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#787774] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                  Định dạng thời gian
                </div>
                <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
                  Chuẩn hiển thị giờ trên nhật ký và lịch sản xuất
                </div>
              </div>
            </div>
            <select
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value)}
              className="w-48 h-8 px-2.5 text-xs rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#202020] text-[#37352F] dark:text-[#E6E6E5] focus:outline-none"
            >
              <option value="24h">24 giờ (14:30)</option>
              <option value="12h">12 giờ (02:30 CH)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modal Tải lại khi đổi ngôn ngữ (Zero antd) */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#E8F3FF] text-[#0B6BCB] flex items-center justify-center mb-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-[#37352F] dark:text-white mb-1">
              Đã thay đổi ngôn ngữ hiển thị
            </h3>
            <p className="text-xs text-[#787774] dark:text-zinc-400 mb-5">
              Ứng dụng cần tải lại dữ liệu để áp dụng ngôn ngữ mới trên toàn bộ giao diện.
            </p>
            <button
              type="button"
              onClick={reloadPage}
              className="w-full h-9 rounded-md bg-[#37352F] hover:bg-[#2B2B2B] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tải lại ngay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
