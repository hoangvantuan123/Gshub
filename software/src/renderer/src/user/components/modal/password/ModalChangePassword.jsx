/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, KeyRound, Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ChangePassword } from '../../../../api/auth/changePassword'
import { HandleSuccess } from '../../../page/default/handleSuccess'

const ModalChangePassword = ({ modalOpen, setModalOpen, userId }) => {
  const { t } = useTranslation()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // Current user info
  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || {}
    } catch {
      return {}
    }
  }, [modalOpen])

  const targetUserId =
    userId || userInfo?.UserId || userInfo?.EmpID || userInfo?.login || userInfo?.UserName || ''

  const userInitials = useMemo(() => {
    const name = userInfo?.UserName || targetUserId || 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [userInfo, targetUserId])

  // Security Criteria Evaluation
  const securityRules = useMemo(() => {
    const hasMinLen = newPassword.length >= 8
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
    const noSpace = !/\s/.test(newPassword) && newPassword.length > 0

    let score = 0
    if (newPassword.length >= 6) score++
    if (hasMinLen) score++
    if (hasUpper && hasLower) score++
    if (hasNumber && hasSpecial) score++

    let label = t('Yếu')
    let textColor = 'text-rose-600'
    let barColor = 'bg-rose-500'

    if (score === 2) {
      label = t('Trung bình')
      textColor = 'text-amber-600'
      barColor = 'bg-amber-500'
    } else if (score === 3) {
      label = t('Khá')
      textColor = 'text-blue-600'
      barColor = 'bg-blue-600'
    } else if (score >= 4) {
      label = t('Rất an toàn')
      textColor = 'text-emerald-600'
      barColor = 'bg-emerald-600'
    }

    return {
      hasMinLen,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      noSpace,
      score,
      label,
      textColor,
      barColor
    }
  }, [newPassword, t])

  // Chặn tuyệt đối phím Space (dấu cách) khi gõ mật khẩu
  const handlePreventSpace = (e) => {
    if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
      e.preventDefault()
    }
  }

  // Tự động loại bỏ khoảng trắng khi paste hoặc input
  const handleCleanInput = (setter) => (e) => {
    const cleanVal = (e.target.value || '').replace(/\s+/g, '')
    setter(cleanVal)
  }

  const handlePasteNoSpace = (setter) => (e) => {
    e.preventDefault()
    const pasteData = (e.clipboardData || window.clipboardData)?.getData('text') || ''
    const cleanVal = pasteData.replace(/\s+/g, '')
    setter(cleanVal)
  }

  useEffect(() => {
    if (modalOpen) {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowOld(false)
      setShowNew(false)
      setShowConfirm(false)
      setErrorMsg(null)
    }
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen, setModalOpen])

  if (!modalOpen) return null

  const handleClose = () => {
    if (loading) return
    setErrorMsg(null)
    setModalOpen(false)
  }

  const parseErrorMessage = (res) => {
    if (!res) return t('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại!')
    const msg = typeof res.message === 'string' ? res.message.trim() : ''
    const errCode =
      res.error && typeof res.error.message === 'string' ? res.error.message.trim() : ''
    const rawErr = typeof res.error === 'string' ? res.error.trim() : ''
    const code = String(res.code || '').trim()

    const candidates = [msg, errCode, rawErr, code].filter(Boolean)
    for (const c of candidates) {
      const translated = t(c)
      if (translated && translated !== c) return translated
      if (c === '1007' || c === 'OLD_PASSWORD_INCORRECT')
        return t('1007', 'Mật khẩu cũ không chính xác.')
      if (c === '1006' || c === 'PASSWORD_NOT_SET')
        return t('1006', 'Tài khoản chưa khởi tạo mật khẩu.')
      if (c === 'INVALID_CREDENTIALS') return t('1007', 'Mật khẩu cũ không chính xác.')
      if (c === 'USER_NOT_FOUND') return t('Không tìm thấy thông tin tài khoản người dùng.')
    }

    if (msg && isNaN(Number(msg))) return msg
    if (errCode && isNaN(Number(errCode))) return errCode
    if (rawErr && isNaN(Number(rawErr))) return rawErr

    return t('Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ!')
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (loading) return

    const cleanOld = oldPassword.replace(/\s+/g, '')
    const cleanNew = newPassword.replace(/\s+/g, '')
    const cleanConfirm = confirmPassword.replace(/\s+/g, '')

    if (!cleanOld) {
      setErrorMsg(t('Vui lòng nhập mật khẩu hiện tại!'))
      return
    }
    if (!cleanNew) {
      setErrorMsg(t('Vui lòng nhập mật khẩu mới!'))
      return
    }
    if (cleanNew.length < 6) {
      setErrorMsg(t('Mật khẩu mới phải có ít nhất 6 ký tự!'))
      return
    }
    if (cleanNew !== cleanConfirm) {
      setErrorMsg(t('Mật khẩu xác nhận không khớp với mật khẩu mới!'))
      return
    }
    if (cleanNew === cleanOld) {
      setErrorMsg(t('Mật khẩu mới không được trùng với mật khẩu hiện tại!'))
      return
    }

    if (!targetUserId) {
      setErrorMsg(t('Không tìm thấy thông tin tài khoản!'))
      return
    }

    try {
      setLoading(true)
      setErrorMsg(null)
      const encodedOld = btoa(unescape(encodeURIComponent(cleanOld)))
      const encodedNew = btoa(unescape(encodeURIComponent(cleanNew)))

      const res = await ChangePassword(targetUserId, encodedOld, encodedNew)
      if (
        res &&
        (res.success === true ||
          res.success === 'true' ||
          res.code === '2000' ||
          res.message === '2000')
      ) {
        HandleSuccess([
          {
            success: true,
            message: t('Đổi mật khẩu thành công!')
          }
        ])
        handleClose()
      } else {
        setErrorMsg(parseErrorMessage(res))
      }
    } catch {
      setErrorMsg(t('Đã xảy ra lỗi khi đổi mật khẩu. Vui lòng thử lại!'))
    } finally {
      setLoading(false)
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] select-none p-4"
      onClick={handleClose}
    >
      <div
        className="w-[580px] max-w-full flex flex-col rounded-[6px] bg-white border border-[#d1d5db] shadow-[0_16px_48px_rgba(0,0,0,0.35)] overflow-hidden text-slate-800 font-sans text-[12px] transition-transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="h-[34px] flex items-center justify-between px-3 border-b border-[#e5e7eb] bg-white select-none">
          <div className="flex items-center gap-2 overflow-hidden">
            <KeyRound className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[11.5px] font-semibold text-slate-700 tracking-wide truncate">
              {t('Thay đổi mật khẩu')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-[32px] h-[34px] -mr-3 flex items-center justify-center hover:bg-[#e81123] hover:text-white text-slate-500 transition-colors cursor-pointer"
            title={t('Đóng (Esc)')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Content - 2 Columns Side-by-Side */}
        <div className="flex flex-row divide-x divide-[#e5e7eb] bg-[#fcfcfc]">
          {/* Cột trái: Thông tin tài khoản & Yêu cầu bảo mật */}
          <div className="w-[210px] shrink-0 p-3.5 flex flex-col items-center select-none bg-slate-50/70">
            <div className="size-12 rounded-[4px] bg-white border border-slate-300/90 text-slate-700 font-bold text-sm flex items-center justify-center shadow-2xs mb-1.5">
              {userInitials}
            </div>
            <span
              className="text-[12px] font-bold text-slate-800 line-clamp-1 max-w-full text-center"
              title={userInfo?.UserName}
            >
              {userInfo?.UserName || targetUserId || 'Người dùng'}
            </span>
            {targetUserId && (
              <span className="mt-0.5 text-[10px] px-1.5 py-0.5 rounded-[3px] bg-slate-200/70 text-slate-600 font-mono">
                ID: {targetUserId}
              </span>
            )}

            {/* Checklist Tiêu chuẩn an toàn */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 w-full flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold text-slate-700 mb-0.5">
                {t('Yêu cầu bảo mật:')}
              </span>

              <div className="flex items-center gap-1.5 text-[10.5px]">
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    securityRules.hasMinLen ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                  strokeWidth={2.5}
                />
                <span
                  className={
                    securityRules.hasMinLen ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }
                >
                  {t('Tối thiểu 8 ký tự')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10.5px]">
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    securityRules.hasUpper && securityRules.hasLower
                      ? 'text-emerald-600'
                      : 'text-slate-300'
                  }`}
                  strokeWidth={2.5}
                />
                <span
                  className={
                    securityRules.hasUpper && securityRules.hasLower
                      ? 'text-emerald-700 font-medium'
                      : 'text-slate-500'
                  }
                >
                  {t('Chữ hoa & chữ thường')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10.5px]">
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    securityRules.hasNumber ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                  strokeWidth={2.5}
                />
                <span
                  className={
                    securityRules.hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }
                >
                  {t('Có ít nhất 1 chữ số')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10.5px]">
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    securityRules.hasSpecial ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                  strokeWidth={2.5}
                />
                <span
                  className={
                    securityRules.hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }
                >
                  {t('Ký tự đặc biệt (!@#...)')}
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải: Form nhập mật khẩu */}
          <form onSubmit={handleSubmit} className="flex-1 p-3.5 flex flex-col gap-2.5">
            {errorMsg && (
              <div className="p-2 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 text-[11px] leading-tight">
                {errorMsg}
              </div>
            )}

            {/* Mật khẩu cũ */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">
                {t('Mật khẩu hiện tại')} <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={handleCleanInput(setOldPassword)}
                  onKeyDown={handlePreventSpace}
                  onPaste={handlePasteNoSpace(setOldPassword)}
                  placeholder={t('Nhập mật khẩu hiện tại')}
                  className="w-full h-8 pl-8 pr-8 text-[11.5px] bg-white border border-slate-300 rounded-[4px] outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800 transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600">
                  {t('Mật khẩu mới')} <span className="text-red-500">*</span>
                </label>
                {newPassword && (
                  <span className={`text-[10px] font-semibold ${securityRules.textColor}`}>
                    {t('Độ mạnh')}: {securityRules.label}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={handleCleanInput(setNewPassword)}
                  onKeyDown={handlePreventSpace}
                  onPaste={handlePasteNoSpace(setNewPassword)}
                  placeholder={t('Tối thiểu 8 ký tự')}
                  className="w-full h-8 pl-8 pr-8 text-[11.5px] bg-white border border-slate-300 rounded-[4px] outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Thanh đo mức độ bảo mật */}
              {newPassword && (
                <div className="grid grid-cols-4 gap-1 mt-0.5">
                  <div
                    className={`h-1 rounded-[1px] ${securityRules.score >= 1 ? securityRules.barColor : 'bg-slate-200'}`}
                  />
                  <div
                    className={`h-1 rounded-[1px] ${securityRules.score >= 2 ? securityRules.barColor : 'bg-slate-200'}`}
                  />
                  <div
                    className={`h-1 rounded-[1px] ${securityRules.score >= 3 ? securityRules.barColor : 'bg-slate-200'}`}
                  />
                  <div
                    className={`h-1 rounded-[1px] ${securityRules.score >= 4 ? securityRules.barColor : 'bg-slate-200'}`}
                  />
                </div>
              )}
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600">
                  {t('Xác nhận mật khẩu mới')} <span className="text-red-500">*</span>
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[10px] font-medium ${
                      confirmPassword === newPassword ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {confirmPassword === newPassword ? t('Khớp mật khẩu') : t('Chưa khớp')}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleCleanInput(setConfirmPassword)}
                  onKeyDown={handlePreventSpace}
                  onPaste={handlePasteNoSpace(setConfirmPassword)}
                  placeholder={t('Nhập lại mật khẩu mới')}
                  className="w-full h-8 pl-8 pr-8 text-[11.5px] bg-white border border-slate-300 rounded-[4px] outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showConfirm ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-3 py-2 flex items-center justify-end gap-2 border-t border-[#e5e7eb] bg-[#f0f0f0]">
          <button
            type="button"
            onClick={handleClose}
            className="h-[28px] px-3 text-[11.5px] font-medium rounded-[4px] bg-white hover:bg-[#f0f0f0] text-slate-700 border border-[#d1d5db] transition-colors cursor-pointer"
          >
            {t('Hủy')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="h-[28px] px-3.5 min-w-[90px] text-[11.5px] font-medium rounded-[4px] bg-[#0067c0] hover:bg-[#005fb8] text-white border border-[#005fb8] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 shadow-xs"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{t('Cập nhật')}</span>
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

export default ModalChangePassword
