import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Modal, Select } from 'antd'
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons'
import { LoginAuth } from '../../api/auth/login'
import decodeJWT from '../../utils/decode-JWT'
import Cookies from 'js-cookie'
import { ChangePassword } from '../../api/auth/changePassword'
import { HandleSuccess } from '../page/default/handleSuccess'
import ErpSoftBg from '../../assets/erpsoft.png'
import Logo from '../../assets/logo3.png'
import { saveLanguageData } from '../../IndexedDB/saveLanguageData'
import { getLanguageData } from '../../IndexedDB/loadLanguageData'
import { clearMenuData } from '../../IndexedDB/loadMenuData'

import { configApp } from '../../utils/config'
import { languages } from '../../i18n/langs'
import { Minus, X, Eye, EyeOff, KeyRound, Settings } from 'lucide-react'

const ErrorAlert = memo(({ message: errMsg, t }) => {
  const displayMsg = typeof t === 'function' ? t(errMsg) : t?.[errMsg] || errMsg

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-out transform ${
        displayMsg
          ? 'max-h-24 opacity-100 mb-2 scale-100'
          : 'max-h-0 opacity-0 mb-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="w-full py-1 text-xs text-rose-600 font-medium flex items-center gap-1.5 text-left leading-snug">
        <span className="flex-1 leading-tight">{displayMsg}</span>
      </div>
    </div>
  )
})
ErrorAlert.displayName = 'ErrorAlert'

const removeSpaces = (val) => (typeof val === 'string' ? val.replace(/\s+/g, '') : val)

const handlePreventSpace = (e) => {
  if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
    e.preventDefault()
  }
}

const handlePasteNoSpace = (formInstance, fieldName) => (e) => {
  e.preventDefault()
  const pasteData = (e.clipboardData || window.clipboardData)?.getData('text') || ''
  const cleanVal = pasteData.replace(/\s+/g, '')
  formInstance?.setFieldsValue({ [fieldName]: cleanVal })
}

export default function Login({ processRolesMenu, setKeyLanguage }) {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const location = useLocation()
  const mountedRef = useRef(true)
  const loginInputRef = useRef(null)
  const passwordInputRef = useRef(null)

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState(false)
  const [isCheck, setIsCheck] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showWebSettingsModal, setShowWebSettingsModal] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'vi')
  const [webLoggedUsers, setWebLoggedUsers] = useState([])
  const [envSelection, setEnvSelection] = useState(
    () => localStorage.getItem('envSelection') || 'official'
  )
  const [dbTranslations, setDbTranslations] = useState({})

  // Tự động tải từ điển từ IndexedDB để dịch thông báo và mã lỗi (như 1004, 1001,...)
  useEffect(() => {
    let isMounted = true
    const loadTranslations = async () => {
      try {
        const langData = await getLanguageData(lang)
        if (isMounted && Array.isArray(langData) && langData.length > 0) {
          const map = langData.reduce((acc, item) => {
            if (item?.WordSeq && item?.Word) {
              acc[item.WordSeq] = item.Word
              acc[String(item.WordSeq)] = item.Word
            }
            if (item?.Word) {
              acc[item.Word] = item.Word
            }
            return acc
          }, {})
          setDbTranslations(map)
        }
      } catch (err) {
        console.warn('Failed to load translations for login from IndexedDB:', err)
      }
    }

    loadTranslations()

    const handleLangSync = () => {
      loadTranslations()
    }
    window.addEventListener('language-changed', handleLangSync)
    window.addEventListener('storage', handleLangSync)
    return () => {
      isMounted = false
      window.removeEventListener('language-changed', handleLangSync)
      window.removeEventListener('storage', handleLangSync)
    }
  }, [lang])

  const t = useMemo(() => {
    const staticDict = languages[lang] || languages['vn'] || languages['vi'] || {}
    const combinedDict = { ...staticDict, ...dbTranslations }

    const translateFn = (key, fallback = '') => {
      if (key === null || key === undefined) return ''
      const k = String(key).trim()
      return combinedDict[k] || fallback || key
    }

    return new Proxy(translateFn, {
      get(target, prop) {
        if (typeof prop === 'string') {
          if (prop in combinedDict) return combinedDict[prop]
          if (prop in target) return target[prop]
        }
        return target[prop]
      }
    })
  }, [lang, dbTranslations])

  // Tự động nhớ mã người dùng vừa đăng nhập và xóa mật khẩu cũ
  useEffect(() => {
    let lastUser = localStorage.getItem('last_login_username') || ''
    if (!lastUser) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
        lastUser = userInfo?.UserId || userInfo?.UserSeq || userInfo?.EmpSeq || ''
      } catch {}
    }

    if (lastUser) {
      form.setFieldsValue({ login: lastUser, password: '' })
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          passwordInputRef.current?.focus({ cursor: 'all' })
        }
      }, 120)
      return () => clearTimeout(timer)
    } else {
      form.setFieldsValue({ login: '', password: '' })
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          loginInputRef.current?.focus({ cursor: 'all' })
        }
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [form])

  const isElectron = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      (window.userAgent?.toLowerCase().includes('electron') ||
        !!window?.process?.type ||
        !!window?.electron)
    )
  }, [])

  const isMac = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      (window.electron?.platform === 'darwin' ||
        navigator?.platform?.toUpperCase().includes('MAC') ||
        navigator?.userAgent?.toUpperCase().includes('MAC'))
    )
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const updateLang = () => {
      if (mountedRef.current) {
        const savedLang = localStorage.getItem('lang') || 'vi'
        setLang(savedLang)
      }
    }
    const updateEnv = () => {
      if (mountedRef.current) {
        const savedEnv = localStorage.getItem('envSelection') || 'official'
        setEnvSelection(savedEnv)
        import('../../services').then((m) => {
          if (typeof m.updateApiServers === 'function') {
            m.updateApiServers(savedEnv)
          }
        })
      }
    }
    window.addEventListener('language-changed', updateLang)
    window.addEventListener('storage', updateLang)
    window.addEventListener('env-changed', updateEnv)
    window.addEventListener('storage', updateEnv)
    return () => {
      mountedRef.current = false
      window.removeEventListener('language-changed', updateLang)
      window.removeEventListener('storage', updateLang)
      window.removeEventListener('env-changed', updateEnv)
      window.removeEventListener('storage', updateEnv)
    }
  }, [])

  useEffect(() => {
    if (isTransitioning) {
      document.title = `${configApp.appName} System`
    } else {
      document.title = `Login - ${configApp.appName} System`
    }
  }, [isTransitioning])

  const handleChange = useCallback((value) => {
    setLang(value)
    localStorage.setItem('lang', value)
    window.dispatchEvent(new Event('language-changed'))
    window.dispatchEvent(new Event('storage'))
  }, [])

  const handleEnvChange = useCallback((value) => {
    setEnvSelection(value)
    localStorage.setItem('envSelection', value)
    import('../../services')
      .then((m) => {
        if (typeof m.updateApiServers === 'function') {
          m.updateApiServers(value)
        }
      })
      .catch((err) => console.warn('Could not update API server environment:', err))
    window.dispatchEvent(new CustomEvent('env-changed', { detail: value }))
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('TITLE_UPDATE'))
    if (window.electron?.notifyEnvChange) {
      window.electron.notifyEnvChange(value)
    }
  }, [])

  const handleOpenSettings = useCallback(() => {
    if (isElectron && window.electron?.openSettingsWindow) {
      try {
        window.electron.openSettingsWindow()
      } catch {
        setShowWebSettingsModal(true)
      }
    } else {
      setShowWebSettingsModal(true)
    }
  }, [isElectron])

  const handleMinimizeApp = useCallback(() => {
    try {
      if (window.electron?.minimize) {
        window.electron.minimize()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:minimize')
      }
    } catch (e) {
      console.warn('Could not minimize window:', e)
    }
  }, [])

  const handleCloseApp = useCallback(() => {
    try {
      if (window.electron?.close) {
        window.electron.close()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:close')
      }
    } catch (e) {
      console.warn('Could not close window:', e)
    }
  }, [])

  const getErrorMessage = useCallback(
    (res) => {
      if (!res) return t('unexpectedError', 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.')

      // Ưu tiên lấy mã thông báo số trong message (vd: "1002", "1004", "1001"...)
      const messageCode = typeof res.message === 'string' ? res.message.trim() : ''
      const errMessageCode =
        res.error && typeof res.error.message === 'string' ? res.error.message.trim() : ''
      const resCode = res.code ? String(res.code).trim() : ''
      const errCode = res.error && typeof res.error.code === 'string' ? res.error.code.trim() : ''

      const candidates = [messageCode, errMessageCode, resCode, errCode].filter(Boolean)

      for (const code of candidates) {
        const translated = t(code)
        if (translated && translated !== code) {
          return translated
        }
      }

      // Nếu mã đã là chuỗi mô tả từ trước (không có trong từ điển)
      if (messageCode) return messageCode
      if (errMessageCode) return errMessageCode
      if (typeof res.error === 'string' && res.error.trim()) return res.error
      if (errCode) return errCode
      return t('unexpectedError', 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.')
    },
    [t]
  )

  const onFinish = async (values) => {
    if (!isCheck || loading) return
    const loginVal = (values.login || '').trim()
    const passwordVal = values.password || ''

    if (!loginVal) {
      setError(t.pleaseEnterEmployeeId || 'Vui lòng nhập Mã nhân viên!')
      return
    }
    if (!passwordVal) {
      setError(t.pleaseEnterPassword || 'Vui lòng nhập mật khẩu!')
      return
    }

    setIsCheck(false)
    setEmployeeId(loginVal)
    const platformStatus = isElectron ? 'desktop' : 'web'
    const activeConfigKey = envSelection === 'official' ? 'Bravo_PROD' : 'BravoDefault'

    try {
      setLoading(true)
      setError(null)

      const response = await LoginAuth({
        login: loginVal,
        username: loginVal,
        password: passwordVal,
        config_key: activeConfigKey,
        envSelection,
        platformStatus
      })

      if (response && response.success) {
        setIsTransitioning(true)
        setLoading(false)

        try {
          let payload = response.data
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload)
            } catch (e) {
              payload = {}
            }
          }
          if (!payload || typeof payload !== 'object') {
            payload = response
          }

          const userObj =
            payload.user ||
            response.user || {
              UserName: loginVal,
              UserId: loginVal,
              EmpID: loginVal,
              ConfigKey: activeConfigKey
            }
          const tokenVal = payload.access_token || payload.token || response.token || null
          const rolesMenuVal =
            payload.tokenRolesUserMenu ||
            response.tokenRolesUserMenu ||
            payload.roles_menu ||
            response.roles_menu ||
            ''
          const langVal =
            payload.typeLanguage !== undefined
              ? payload.typeLanguage
              : response.typeLanguage !== undefined
                ? response.typeLanguage
                : undefined

          if (userObj) {
            localStorage.setItem('userInfo', JSON.stringify(userObj))
          }
          localStorage.setItem('last_login_username', loginVal)
          localStorage.setItem('datahub_remember_username', loginVal)
          localStorage.setItem('datahub_last_config_key', activeConfigKey)
          localStorage.setItem('datahub_auth_session', JSON.stringify(payload))
          localStorage.setItem('gshub_auth_session', JSON.stringify(payload))

          // Xóa menu cũ của phiên trước trong IndexedDB để nạp quyền mới hoàn toàn
          clearMenuData().catch((e) => console.warn('Lỗi clear menu IndexedDB:', e))

          if (rolesMenuVal) {
            localStorage.setItem('roles_menu', rolesMenuVal)
          }
          if (langVal !== undefined) {
            localStorage.setItem('language_user', JSON.stringify(langVal))
            if (typeof setKeyLanguage === 'function') {
              setKeyLanguage(langVal)
            }
          }
          if (tokenVal) {
            Cookies.set('a_a', tokenVal, { expires: 7, path: '/' })
            localStorage.setItem('token', tokenVal)
            localStorage.setItem('access_token', tokenVal)
            localStorage.setItem('a_a', tokenVal)
          }

          const currentUser = {
            ...(userObj || {}),
            LastLoginTime: new Date().toISOString(),
            envSelection: envSelection,
            lang: lang
          }

          if (window?.electron?.saveDataToFile && window?.electron?.readDataFromFile) {
            const filePath = 'save_users_log.json'
            let fileData = []
            try {
              fileData = await window.electron.readDataFromFile(filePath)
              if (!Array.isArray(fileData)) fileData = []
            } catch {
              fileData = []
            }

            const idx = fileData.findIndex((u) => u.UserSeq === currentUser.UserSeq)
            if (idx >= 0) {
              fileData[idx].LastLoginTime = currentUser.LastLoginTime
            } else {
              fileData.push(currentUser)
            }
            await window.electron.saveDataToFile(filePath, fileData).catch(() => {})
          }

          let savedUsers = []
          try {
            const raw = localStorage.getItem('save_users_log')
            savedUsers = raw ? JSON.parse(raw) : []
            if (!Array.isArray(savedUsers)) savedUsers = []
          } catch {
            savedUsers = []
          }
          const idx2 = savedUsers.findIndex((u) => u.UserSeq === currentUser.UserSeq)
          if (idx2 >= 0) {
            savedUsers[idx2].LastLoginTime = currentUser.LastLoginTime
          } else {
            savedUsers.push(currentUser)
          }
          localStorage.setItem('save_users_log', JSON.stringify(savedUsers))
        } catch (storageErr) {
          console.warn('Storage sync error:', storageErr)
        }

        // Xóa sạch trạng thái rác của menu cũ để không bao giờ bị đè/vỡ layout 2 menu cùng lúc
        localStorage.removeItem('isMenu')
        localStorage.removeItem('labelMenu')
        localStorage.setItem('menu', JSON.stringify(true))
        localStorage.setItem('COLLAPSED_STATE', JSON.stringify(true))

        if (typeof processRolesMenu === 'function') {
          processRolesMenu()
        }
        window.dispatchEvent(new Event('auth-state-changed'))
        window.dispatchEvent(new Event('TITLE_UPDATE'))

        // Đóng màn hình settings nếu đang mở (cả Web & Electron)
        setShowWebSettingsModal(false)
        if (window.electron?.closeSettingsWindow) {
          window.electron.closeSettingsWindow()
        } else if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('window:close-settings-window')
        }

        // Tự động kiểm tra và tải ngầm phiên bản UI mới nhất khi đăng nhập
        if (window.electron?.updater?.checkUi) {
          window.electron.updater.checkUi().catch(() => {})
        }

        // Mở rộng kích thước cửa sổ sang chế độ Main
        if (window.electron?.setMainSize) {
          window.electron.setMainSize()
        } else if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('window:set-main-size')
        }

        // Chuyển trang mượt mà sang giao diện chính
        setTimeout(() => {
          if (mountedRef.current) {
            navigate('/erp/u/home', { replace: true })
          }
        }, 150)
      } else {
        const errCode =
          response?.error?.code ||
          response?.raw?.error?.code ||
          response?.code ||
          response?.raw?.code ||
          response?.message ||
          response?.raw?.message
        if (
          errCode === 'ACCOUNT_NOT_ACTIVATED' ||
          errCode === 'REQUIRE_CHANGE_PASSWORD' ||
          errCode === '1004' ||
          errCode === 1004
        ) {
          setStatus(true)
          form.resetFields(['oldPassword', 'newPassword', 'confirmNewPassword'])
        }
        setError(getErrorMessage(response))
      }
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err?.message || t.generalError || 'Có lỗi xảy ra. Vui lòng thử lại sau.'
      )
    } finally {
      if (mountedRef.current) {
        setIsCheck(true)
        setLoading(false)
      }
    }
  }

  const handleChangePassword = async () => {
    const values = form.getFieldsValue()
    const op = (values.oldPassword || '').replace(/\s+/g, '')
    const np = (values.newPassword || '').replace(/\s+/g, '')
    const cnp = (values.confirmNewPassword || '').replace(/\s+/g, '')

    if (!op || !np || !cnp) {
      setError(t.pleaseFillAllFields || 'Vui lòng điền vào tất cả các trường bắt buộc!')
      return
    }

    if (np.length < 6) {
      setError(t.passwordMinLength || 'Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }

    if (np !== cnp) {
      setError(t.passwordNotMatch || 'Mật khẩu mới không khớp!')
      return
    }

    if (np === op) {
      setError(
        t.passwordSameAsOld ||
          'Mật khẩu mới không được giống với mật khẩu cũ. Vui lòng chọn mật khẩu khác!'
      )
      return
    }

    try {
      setLoading(true)
      setError(null)
      const encodedOldPassword = btoa(unescape(encodeURIComponent(op)))
      const encodedNewPassword = btoa(unescape(encodeURIComponent(np)))

      const response = await ChangePassword(employeeId, encodedOldPassword, encodedNewPassword)
      if (response && response.success) {
        HandleSuccess([
          {
            success: true,
            message: response.message || t.passwordChangedSuccess || 'Đổi mật khẩu thành công!'
          }
        ])
        setStatus(false)
        form.resetFields()
        setError(null)
      } else {
        setError(getErrorMessage(response))
      }
    } catch (err) {
      setError(
        t.changePasswordError || 'Đã xảy ra lỗi khi thay đổi mật khẩu. Vui lòng thử lại sau.'
      )
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const token = queryParams.get('token')
    const decoded = decodeJWT(token)
    if (token && decoded) {
      localStorage.setItem('token', token)
      localStorage.setItem('userInfo', JSON.stringify(decoded))
      localStorage.setItem('COLLAPSED_STATE', JSON.stringify(true))
      window.location.href = '/erp/u/home'
    }
  }, [location])

  const readSavedUserLogs = useCallback(async () => {
    const filePath = 'save_users_log.json'
    if (window?.electron?.readDataFromFile) {
      try {
        const data = await window.electron.readDataFromFile(filePath)
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    }

    try {
      const data = localStorage.getItem('save_users_log')
      const parsed = data ? JSON.parse(data) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (showWebSettingsModal) {
      readSavedUserLogs().then((users) => {
        if (mountedRef.current && Array.isArray(users)) {
          setWebLoggedUsers(users)
        }
      })
    }
  }, [showWebSettingsModal, readSavedUserLogs])

  const handleClearError = useCallback(() => {
    setError(null)
  }, [])

  const loginCardContent = (
    <div className="flex-1 flex overflow-hidden relative z-10 w-full h-full antialiased font-sans bg-white">
      <div
        className="w-72 bg-slate-100 flex flex-col justify-between items-center text-center shrink-0 relative overflow-hidden select-none"
        style={{ WebkitAppRegion: isElectron ? 'drag' : 'no-drag' }}
      >
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={ErpSoftBg}
            alt="ERP Soft"
            className="w-full h-full object-cover pointer-events-none"
            loading="eager"
            decoding="async"
          />
        </div>

        {isElectron && isMac && (
          <div
            className="group absolute top-3 left-3 z-20 flex items-center gap-2 p-1.5 opacity-0 hover:opacity-100 transition-opacity duration-200"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <button
              type="button"
              onClick={handleCloseApp}
              className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
              title={t.closeTooltip || 'Tắt ứng dụng'}
            >
              <X className="w-2.5 h-2.5 text-rose-950 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              type="button"
              onClick={handleMinimizeApp}
              className="w-3.5 h-3.5 rounded-full bg-amber-400 hover:bg-amber-500 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
              title={t.minimizeTooltip || 'Thu nhỏ ứng dụng'}
            >
              <Minus className="w-2.5 h-2.5 text-amber-950 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 px-8 py-5 flex flex-col justify-between bg-white text-slate-900 relative">
        <div
          className="h-9 -mx-8 -mt-5 px-8 flex items-center justify-between shrink-0 select-none"
          style={{ WebkitAppRegion: isElectron ? 'drag' : 'no-drag' }}
        >
          <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}></div>

          {isElectron && !isMac ? (
            <div
              className="absolute top-0 right-0 z-30 flex items-center h-8 select-none"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-9 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title={t.settingsTooltip || 'Cài đặt (Settings)'}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleMinimizeApp}
                className="w-11 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#E5E5E5] active:bg-[#CCCCCC] transition-colors cursor-pointer"
                title={t.minimizeTooltip || 'Thu nhỏ ứng dụng'}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCloseApp}
                className="w-11 h-8 flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#E81123] active:bg-[#F1707A] transition-colors cursor-pointer"
                title={t.closeTooltip || 'Tắt ứng dụng'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-auto" style={{ WebkitAppRegion: 'no-drag' }}>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-7.5 h-7.5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title={t.settingsTooltip || 'Cài đặt (Settings)'}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Body Content */}
        <div className="my-auto py-1">
          {!status ? (
            /* Login Form View */
            <>
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  {t.accountLogin || 'Đăng nhập tài khoản'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      envSelection === 'official' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    Môi trường:{' '}
                    <span className="font-bold text-slate-700">
                      {envSelection === 'official'
                        ? 'Goldsun PROD (Chính Thức)'
                        : 'Goldsun DEV (Testing / UAT)'}
                    </span>
                  </p>
                </div>
              </div>

              <Form
                form={form}
                onFinish={onFinish}
                layout="vertical"
                className="space-y-2.5"
                requiredMark={false}
              >
                <Form.Item
                  name="login"
                  normalize={removeSpaces}
                  label={
                    <span className="text-xs font-semibold text-slate-700">
                      {t.employeeIdOrAccount || 'Mã nhân viên / Tài khoản'}
                    </span>
                  }
                  className="!mb-2.5"
                >
                  <Input
                    ref={loginInputRef}
                    disabled={loading}
                    className="!h-9 !rounded-md !border-slate-300 text-xs font-medium text-slate-900 focus:!border-[#2B3A42] focus:!ring-1 focus:!ring-[#2B3A42] hover:!border-slate-400 transition-colors"
                    prefix={<UserOutlined className="text-slate-400 text-sm mr-1.5" />}
                    placeholder={t.enterEmployeeId || 'Nhập mã nhân viên...'}
                    onChange={handleClearError}
                    onKeyDown={(e) => {
                      handlePreventSpace(e)
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        passwordInputRef.current?.focus({ cursor: 'all' })
                      }
                    }}
                    onPaste={handlePasteNoSpace(form, 'login')}
                    autoComplete="username"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  normalize={removeSpaces}
                  label={
                    <span className="text-xs font-semibold text-slate-700">
                      {t.password || 'Mật khẩu'}
                    </span>
                  }
                  className="!mb-2"
                >
                  <Input
                    ref={passwordInputRef}
                    disabled={loading}
                    type={showPassword ? 'text' : 'password'}
                    className="!h-9 !rounded-md !border-slate-300 text-xs font-medium text-slate-900 focus:!border-[#2B3A42] focus:!ring-1 focus:!ring-[#2B3A42] hover:!border-slate-400 transition-colors"
                    prefix={<LockOutlined className="text-slate-400 text-sm mr-1.5" />}
                    suffix={
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    }
                    placeholder={t.enterPassword || 'Nhập mật khẩu...'}
                    onChange={handleClearError}
                    onKeyDown={(e) => {
                      handlePreventSpace(e)
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        form.submit()
                      }
                    }}
                    onPaste={handlePasteNoSpace(form, 'password')}
                    autoComplete="current-password"
                  />
                </Form.Item>

                <ErrorAlert message={error} t={t} />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 mt-1 rounded-md bg-[#2B3A42] hover:bg-[#1F2B32] active:scale-[0.99] text-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75 shadow-xs"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <LoadingOutlined className="text-sm" />
                      <span>{t.authenticating || 'ĐANG XÁC THỰC...'}</span>
                    </div>
                  ) : (
                    <span>{t.loginButton || 'ĐĂNG NHẬP'}</span>
                  )}
                </button>
              </Form>
            </>
          ) : (
            /* Change Password View */
            <>
              <div className="mb-2.5">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  {t.changePasswordTitle || 'Thay đổi mật khẩu'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {t.changePasswordDescription || 'Vui lòng nhập mật khẩu mới và xác nhận.'}
                </p>
              </div>

              <Form
                form={form}
                onFinish={handleChangePassword}
                layout="vertical"
                className="space-y-2"
                requiredMark={false}
              >
                <Form.Item
                  name="oldPassword"
                  normalize={removeSpaces}
                  label={
                    <span className="text-xs font-semibold text-slate-700">
                      {t.oldPassword || 'Mật khẩu cũ'}
                    </span>
                  }
                  className="!mb-2"
                >
                  <Input
                    disabled={loading}
                    type={showOldPassword ? 'text' : 'password'}
                    className="!h-9 !rounded-md !border-slate-300 text-xs font-medium text-slate-900 focus:!border-[#2B3A42] focus:!ring-1 focus:!ring-[#2B3A42] transition-colors"
                    prefix={<LockOutlined className="text-slate-400 text-sm mr-1.5" />}
                    suffix={
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowOldPassword((prev) => !prev)}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showOldPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    }
                    placeholder={t.enterOldPassword || 'Nhập mật khẩu cũ...'}
                    onChange={handleClearError}
                    onKeyDown={handlePreventSpace}
                    onPaste={handlePasteNoSpace(form, 'oldPassword')}
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
                  normalize={removeSpaces}
                  label={
                    <span className="text-xs font-semibold text-slate-700">
                      {t.newPassword || 'Mật khẩu mới'}
                    </span>
                  }
                  className="!mb-2"
                >
                  <Input
                    disabled={loading}
                    type={showNewPassword ? 'text' : 'password'}
                    className="!h-9 !rounded-md !border-slate-300 text-xs font-medium text-slate-900 focus:!border-[#2B3A42] focus:!ring-1 focus:!ring-[#2B3A42] transition-colors"
                    prefix={<LockOutlined className="text-slate-400 text-sm mr-1.5" />}
                    suffix={
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    }
                    placeholder={t.enterNewPassword || 'Nhập mật khẩu mới...'}
                    onChange={handleClearError}
                    onKeyDown={handlePreventSpace}
                    onPaste={handlePasteNoSpace(form, 'newPassword')}
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmNewPassword"
                  normalize={removeSpaces}
                  label={
                    <span className="text-xs font-semibold text-slate-700">
                      {t.confirmNewPassword || 'Xác nhận mật khẩu mới'}
                    </span>
                  }
                  className="!mb-2"
                >
                  <Input
                    disabled={loading}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="!h-9 !rounded-md !border-slate-300 text-xs font-medium text-slate-900 focus:!border-[#2B3A42] focus:!ring-1 focus:!ring-[#2B3A42] transition-colors"
                    prefix={<LockOutlined className="text-slate-400 text-sm mr-1.5" />}
                    suffix={
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    }
                    placeholder={t.enterConfirmNewPassword || 'Nhập lại mật khẩu mới...'}
                    onChange={handleClearError}
                    onKeyDown={handlePreventSpace}
                    onPaste={handlePasteNoSpace(form, 'confirmNewPassword')}
                    autoComplete="new-password"
                  />
                </Form.Item>

                <ErrorAlert message={error} t={t} />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 mt-1 rounded-md bg-[#2B3A42] hover:bg-[#1F2B32] active:scale-[0.99] text-white font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75 shadow-xs"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <LoadingOutlined className="text-sm" />
                      <span>{t.processing || 'ĐANG XỬ LÝ...'}</span>
                    </div>
                  ) : (
                    <span>{t.changePasswordButton || 'ĐỔI MẬT KHẨU'}</span>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-medium cursor-pointer transition-colors inline-flex items-center justify-center py-0.5"
                    onClick={() => {
                      setStatus(false)
                      setError(null)
                      form.resetFields()
                    }}
                  >
                    {t.backToLogin || 'Trở về đăng nhập'}
                  </button>
                </div>
              </Form>
            </>
          )}
        </div>
      </div>

      {/* Web fallback Modal */}
      <Modal
        title={
          <span className="text-sm font-bold text-slate-900">
            {t.systemSettings || 'Cài đặt hệ thống'}
          </span>
        }
        open={showWebSettingsModal}
        onCancel={() => setShowWebSettingsModal(false)}
        footer={
          <button
            type="button"
            onClick={() => setShowWebSettingsModal(false)}
            className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {t.closeOrDone || 'ĐÓNG / HOÀN TẤT'}
          </button>
        }
        centered
        width={500}
      >
        <div className="py-2 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              {t.serverEnv || 'Môi trường máy chủ (Database)'}
            </label>
            <Select
              value={envSelection}
              onChange={handleEnvChange}
              className="w-full"
              options={[
                { value: 'dev', label: 'Goldsun DEV (Testing / UAT) - BravoDefault' },
                { value: 'official', label: 'Goldsun PROD (Chính Thức) - Bravo_PROD' }
              ]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              {t.displayLang || 'Ngôn ngữ hiển thị'}
            </label>
            <Select
              value={lang}
              onChange={handleChange}
              className="w-full"
              options={[
                { value: 'vi', label: '🇻🇳 Tiếng Việt' },
                { value: 'en', label: '🇬🇧 English' },
                { value: 'zh', label: '🇨🇳 中文' }
              ]}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              {t.loggedAccounts || 'Tài khoản đã đăng nhập'} ({webLoggedUsers.length})
            </label>
            {webLoggedUsers.length > 0 ? (
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                {webLoggedUsers.map((user, idx) => (
                  <div
                    key={user.UserSeq || idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{user.UserId || user.UserName}</div>
                      <div className="text-[10px] text-slate-500">
                        {user.LastLoginTime
                          ? new Date(user.LastLoginTime).toLocaleString(
                              lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'vi-VN'
                            )
                          : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic p-3 text-center border border-dashed border-slate-200 rounded-lg">
                {t.noAccountHistory || 'Chưa có lịch sử tài khoản.'}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )

  if (isTransitioning) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 select-none font-sans text-slate-700">
        <div className="flex flex-col items-center gap-4">
          <img src={Logo} alt="Logo" className="w-14 h-auto opacity-85" />
          <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
            <LoadingOutlined className="text-sm text-blue-600" spin />
          </div>
        </div>
      </div>
    )
  }

  if (isElectron) {
    return (
      <>
        {loading && (
          <div className="fixed inset-0 z-[9999] cursor-wait pointer-events-auto select-none" />
        )}
        <div className="w-screen h-screen m-0 p-0 overflow-hidden text-slate-900 flex flex-row select-none font-sans bg-white">
          {loginCardContent}
        </div>
      </>
    )
  }

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-[9999] cursor-wait pointer-events-auto select-none" />
      )}

      {/* Web version: Desktop landscape card with clean rounded-lg borders */}
      <div className="w-screen h-screen m-0 p-0 overflow-hidden text-slate-900 flex items-center justify-center select-none font-sans bg-slate-100">
        <div className="w-[850px] h-[480px] overflow-hidden relative z-10 bg-white flex flex-row border border-slate-300 ">
          {loginCardContent}
        </div>
      </div>
    </>
  )
}
