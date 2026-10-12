import { useState, useEffect } from 'react'
import { User, Trash2, Building, Mail, Phone, ShieldCheck } from 'lucide-react'
import { showToast } from './toast'

export default function AccountTab() {
  const userFromLocalStorage = JSON.parse(localStorage.getItem('userInfo') || '{}')
  const [loggedUsers, setLoggedUsers] = useState([])

  const loadLoggedUsers = async () => {
    let users = []
    if (window?.electron?.readDataFromFile) {
      try {
        const data = await window.electron.readDataFromFile('save_users_log.json')
        if (Array.isArray(data)) users = data
      } catch {
        users = []
      }
    }
    if (!users || users.length === 0) {
      try {
        const data = localStorage.getItem('save_users_log')
        if (data) users = JSON.parse(data)
      } catch {
        users = []
      }
    }
    setLoggedUsers(users || [])
  }

  useEffect(() => {
    loadLoggedUsers()
  }, [])

  const handleDeleteUserLog = async (userSeq, userId) => {
    const updated = loggedUsers.filter((u) => u.UserSeq !== userSeq && u.UserId !== userId)
    setLoggedUsers(updated)
    localStorage.setItem('save_users_log', JSON.stringify(updated))
    if (window?.electron?.saveDataToFile) {
      try {
        await window.electron.saveDataToFile('save_users_log.json', updated)
      } catch (e) {
        console.error(e)
      }
    }
    showToast('Đã xóa tài khoản khỏi lịch sử thiết bị')
  }

  const handleClearAllLogs = async () => {
    setLoggedUsers([])
    localStorage.removeItem('save_users_log')
    if (window?.electron?.saveDataToFile) {
      try {
        await window.electron.saveDataToFile('save_users_log.json', [])
      } catch (e) {
        console.error(e)
      }
    }
    showToast('Đã xóa toàn bộ lịch sử tài khoản trên máy')
  }

  const userInitial = (
    userFromLocalStorage.UserName?.charAt(0) ||
    userFromLocalStorage.UserId?.charAt(0) ||
    'U'
  ).toUpperCase()

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 font-sans pb-20 pt-2 text-[#37352F] dark:text-[#E6E6E5]">
      {/* 1. NOTION PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E6E5]">
          Tài khoản & Hồ sơ
        </h1>
        <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">
          Thông tin tài khoản đăng nhập, hồ sơ cá nhân và lịch sử thiết bị.
        </p>
      </div>

      <hr className="border-t border-[#EDEDEB] dark:border-[#2F2F2F]" />

      {/* 2. TÀI KHOẢN HIỆN TẠI (KHỐI THẺ CHÍNH NOTION) */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
          Tài khoản hiện tại
        </h3>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md bg-white dark:bg-[#191919] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-[#2B3A42] text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                {userInitial}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#37352F] dark:text-[#E6E6E5] truncate">
                    {userFromLocalStorage?.UserName || userFromLocalStorage?.UserId || 'Người dùng'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                    Đang hoạt động
                  </span>
                </div>
                <p className="text-xs text-[#787774] dark:text-[#9B9A97]">
                  Mã tài khoản:{' '}
                  <span className="font-mono text-[#37352F] dark:text-[#E6E6E5] font-medium">
                    {userFromLocalStorage?.UserId || '---'}
                  </span>
                  {userFromLocalStorage.DeptName && ` • Bộ phận: ${userFromLocalStorage.DeptName}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHI TIẾT HỒ SƠ */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
          Chi tiết hồ sơ nhân sự
        </h3>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F] bg-white dark:bg-[#191919]">
          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97] flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              <span>Họ và tên</span>
            </span>
            <span className="font-medium text-[#37352F] dark:text-[#E6E6E5]">
              {userFromLocalStorage.UserName || 'Chưa cập nhật'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97] flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mã định danh (User ID)</span>
            </span>
            <span className="font-mono text-[#37352F] dark:text-[#E6E6E5]">
              {userFromLocalStorage.UserId || '---'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97] flex items-center gap-2">
              <Building className="w-3.5 h-3.5" />
              <span>Bộ phận / Đơn vị</span>
            </span>
            <span className="text-[#37352F] dark:text-[#E6E6E5]">
              {userFromLocalStorage.DeptName ||
                userFromLocalStorage.Dept ||
                'Văn phòng / Phân xưởng'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97] flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              <span>Email liên hệ</span>
            </span>
            <span className="text-[#37352F] dark:text-[#E6E6E5]">
              {userFromLocalStorage.Email || 'Liên hệ quản trị viên'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97] flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" />
              <span>Số điện thoại</span>
            </span>
            <span className="text-[#37352F] dark:text-[#E6E6E5]">
              {userFromLocalStorage.Phone || userFromLocalStorage.Tel || 'Liên hệ quản trị viên'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. LỊCH SỬ TÀI KHOẢN ĐÃ DÙNG */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
            Lịch sử tài khoản đã dùng trên máy
          </h3>

          {loggedUsers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllLogs}
              className="h-6 px-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md bg-white dark:bg-[#191919] divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
          {loggedUsers.length > 0 ? (
            loggedUsers.map((user, idx) => {
              const initial = (
                user.UserName?.charAt(0) ||
                user.UserId?.charAt(0) ||
                'U'
              ).toUpperCase()
              return (
                <div
                  key={user.UserSeq || user.UserId || idx}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded bg-[#2B3A42] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#37352F] dark:text-[#E6E6E5] truncate">
                        {user.UserName ? `${user.UserName} (${user.UserId})` : user.UserId}
                      </div>
                      <div className="text-[10px] text-[#787774] dark:text-[#9B9A97] truncate">
                        Đăng nhập:{' '}
                        {user.LastLoginTime
                          ? new Date(user.LastLoginTime).toLocaleString('vi-VN')
                          : 'Gần đây'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteUserLog(user.UserSeq, user.UserId)}
                    className="w-6 h-6 rounded bg-white hover:bg-rose-50 text-[#787774] hover:text-rose-600 border border-[#EDEDEB] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    title="Xóa tài khoản này"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })
          ) : (
            <div className="p-4 text-center text-xs text-[#787774] dark:text-[#9B9A97]">
              Chưa có lịch sử tài khoản nào được lưu trên máy tính này.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
