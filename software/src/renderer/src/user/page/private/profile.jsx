import { User, Mail, Phone, Building, ShieldCheck, CheckCircle2, Info } from 'lucide-react'

export default function Profile() {
  const userFromLocalStorage = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const userInitial = (
    userFromLocalStorage.UserName?.charAt(0) ||
    userFromLocalStorage.UserId?.charAt(0) ||
    'U'
  ).toUpperCase()

  const properties = [
    {
      label: 'Họ và tên',
      value: userFromLocalStorage.UserName || 'Chưa cập nhật',
      icon: User
    },
    {
      label: 'Mã định danh (User ID)',
      value: userFromLocalStorage.UserId || '---',
      icon: ShieldCheck,
      isMono: true
    },
    {
      label: 'Bộ phận / Đơn vị',
      value: userFromLocalStorage.DeptName || userFromLocalStorage.Dept || 'Văn phòng / Phân xưởng',
      icon: Building
    },
    {
      label: 'Trạng thái tài khoản',
      value: 'Đang hoạt động',
      icon: CheckCircle2,
      isBadge: true
    },
    {
      label: 'Email liên hệ',
      value: userFromLocalStorage.Email || 'Liên hệ quản trị viên',
      icon: Mail
    },
    {
      label: 'Số điện thoại',
      value: userFromLocalStorage.Phone || userFromLocalStorage.Tel || 'Liên hệ quản trị viên',
      icon: Phone
    }
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner & Avatar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-950 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
          {userInitial}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {userFromLocalStorage.UserName || 'Người dùng'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Tài khoản nội bộ hệ thống ERP GsHub</p>
        </div>
      </div>

      {/* Notion-style Properties Block */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Chi tiết hồ sơ
        </h3>
        <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
          {properties.map((prop, idx) => {
            const Icon = prop.icon
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 hover:bg-slate-50/60 transition-colors gap-1 sm:gap-4"
              >
                <div className="flex items-center gap-2.5 text-xs text-slate-500 min-w-[180px]">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{prop.label}</span>
                </div>
                <div className="text-xs text-slate-800 font-medium sm:text-right">
                  {prop.isBadge ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {prop.value}
                    </span>
                  ) : (
                    <span className={prop.isMono ? 'font-mono text-slate-700' : ''}>
                      {prop.value}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notion Note Callout */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/80 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div className="leading-relaxed text-[11px]">
          Thông tin cá nhân và đơn vị công tác được đồng bộ trực tiếp từ hệ thống quản trị nhân sự.
          Để thay đổi họ tên, bộ phận hoặc quyền hạn, vui lòng gửi yêu cầu đến quản trị viên hệ
          thống.
        </div>
      </div>
    </div>
  )
}
