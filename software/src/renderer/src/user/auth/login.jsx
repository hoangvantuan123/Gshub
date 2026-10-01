// --- React & Routing Core ---
import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Cookies from 'js-cookie'

// --- Ant Design UI & Icons ---
import { Form, Input, Modal, Select } from 'antd'
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons'

// --- Lucide Icons ---
import {
  Minus,
  X,
  Eye,
  EyeOff,
  Settings,
  Languages,
  Server,
  Users,
  Info,
  Trash2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'

// --- Business API & Authentication ---
import { LoginAuth } from '../../api/auth/login'
import { ChangePassword } from '../../api/auth/changePassword'
import decodeJWT from '../../utils/decode-JWT'
import { HandleSuccess } from '../page/default/handleSuccess'

// --- Storage & Config ---
import { getLanguageData } from '../../IndexedDB/loadLanguageData'
import { clearMenuData } from '../../IndexedDB/loadMenuData'
import { configApp } from '../../utils/config'
import { getDefaultDataHubUrl, getEnvConfig, SERVER_ENVIRONMENTS } from '../../config/serverConfig'
import { getApiServerEndpoint } from '../../services'
import { languages } from '../../i18n/langs'

// --- Assets ---
import ErpSoftBg from '../../assets/erpsoft.png'
import Logo from '../../assets/gold-sun-logo.svg'

const ErrorAlert = memo(({ message: errMsg, t }) => {
  const displayMsg = typeof t === 'function' ? t(errMsg) : t?.[errMsg] || errMsg

  return (
    <div className="min-h-[22px] flex items-center mb-1">
      {displayMsg ? (
        <div className="w-full text-xs text-rose-600 font-medium flex items-center gap-1.5 text-left leading-snug">
          <span className="flex-1 leading-tight">{displayMsg}</span>
        </div>
      ) : null}
    </div>
  )
})
ErrorAlert.displayName = 'ErrorAlert'

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
  const [webActiveTab, setWebActiveTab] = useState('server')
  const [clearingCache, setClearingCache] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'vi')
  const [webLoggedUsers, setWebLoggedUsers] = useState([])
  const [envSelection, setEnvSelection] = useState(
    () => localStorage.getItem('envSelection') || 'dev'
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
        const savedEnv = localStorage.getItem('envSelection') || 'dev'
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
    localStorage.setItem('datahub_env_selection', value)
    import('../../services')
      .then((m) => {
        if (typeof m.updateApiServers === 'function') {
          m.updateApiServers(value)
        }
      })
      .catch((err) => console.warn('Could not update API server environment:', err))
    window.dispatchEvent(new CustomEvent('env-changed', { detail: value }))
    window.dispatchEvent(new CustomEvent('datahub_env_changed', { detail: value }))
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

          const userObj = payload.user ||
            response.user || {
              UserName: loginVal,
              UserId: loginVal,
              EmpID: loginVal,
              ConfigKey: activeConfigKey
            }
          const tokenVal =
            payload.access_token ||
            payload.token ||
            payload.session?.access_token ||
            response.token ||
            response.accessToken ||
            null
          const refreshTokenVal =
            payload.refresh_token ||
            payload.refreshToken ||
            payload.session?.refresh_token ||
            response.refresh_token ||
            response.refreshToken ||
            null
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
          const finalToken = tokenVal || ''
          const finalRefreshToken = refreshTokenVal || tokenVal || ''

          if (finalToken) {
            Cookies.set('a_a', finalToken, { expires: 7, path: '/' })
            Cookies.set('access_token', finalToken, { expires: 7, path: '/' })
            localStorage.setItem('access_token', finalToken)
            localStorage.setItem('token', finalToken)
            localStorage.setItem('a_a', finalToken)
          }
          if (finalRefreshToken) {
            Cookies.set('r_t', finalRefreshToken, { expires: 30, path: '/' })
            Cookies.set('refresh_token', finalRefreshToken, { expires: 30, path: '/' })
            localStorage.setItem('refresh_token', finalRefreshToken)
            localStorage.setItem('r_t', finalRefreshToken)
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

  const handleDeleteUserLog = useCallback(async (userSeq) => {
    setWebLoggedUsers((prev) => {
      const updated = prev.filter((u) => u.UserSeq !== userSeq)
      try {
        localStorage.setItem('save_users_log', JSON.stringify(updated))
        if (window.electron?.writeDataToFile) {
          window.electron.writeDataToFile('save_users_log.json', updated)
        }
      } catch (err) {
        console.warn('Failed to delete saved user log:', err)
      }
      return updated
    })
  }, [])

  const handleClearAllUserLogs = useCallback(async () => {
    setWebLoggedUsers([])
    try {
      localStorage.setItem('save_users_log', JSON.stringify([]))
      if (window.electron?.writeDataToFile) {
        await window.electron.writeDataToFile('save_users_log.json', [])
      }
    } catch (err) {
      console.warn('Failed to clear saved users log:', err)
    }
  }, [])

  const handleClearCache = useCallback(async () => {
    try {
      setClearingCache(true)
      const currentLang = localStorage.getItem('lang') || 'vi'
      const currentEnv = localStorage.getItem('envSelection') || 'official'

      sessionStorage.clear()
      localStorage.clear()

      localStorage.setItem('lang', currentLang)
      localStorage.setItem('envSelection', currentEnv)

      try {
        if (typeof indexedDB !== 'undefined') {
          indexedDB.deleteDatabase('GS_DATABASE')
          indexedDB.deleteDatabase('gshub_cache')
        }
      } catch (e) {
        console.warn('IndexedDB clear warning:', e)
      }

      await new Promise((r) => setTimeout(r, 600))
      window.location.reload()
    } catch (err) {
      console.warn('Error clearing cache:', err)
      setClearingCache(false)
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
    setError((prev) => (prev ? null : prev))
  }, [])

  const loginCardContent = (
    <div className="flex-1 flex overflow-hidden relative z-10 w-full h-full antialiased font-sans bg-white">
      <div
        className="w-80 bg-slate-100 flex flex-col justify-between items-center text-center shrink-0 relative overflow-hidden select-none"
        style={{ WebkitAppRegion: isElectron ? 'drag' : 'no-drag' }}
      >
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={ErpSoftBg}
            alt="ERP Soft"
            className="w-full h-full object-cover object-center scale-105 pointer-events-none transform transition-transform duration-300"
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
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {t.accountLogin || 'Đăng nhập tài khoản'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-normal">
                    {t.loginSubtitle || 'Đăng nhập tài khoản doanh nghiệp của bạn'}
                  </p>
                </div>

                {/* Quick direct environment switcher (DEV vs PROD) */}
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
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        passwordInputRef.current?.focus()
                      }
                    }}
                    autoComplete="username"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
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
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        form.submit()
                      }
                    }}
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
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Form.Item
                  name="newPassword"
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
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmNewPassword"
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

      {/* Web Settings Modal - Wide, Centered, Square Framed matching Settings view */}
      <Modal
        open={showWebSettingsModal}
        onCancel={() => setShowWebSettingsModal(false)}
        footer={null}
        closable={false}
        centered
        width={760}
        styles={{
          content: {
            padding: 0,
            borderRadius: '2px',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          },
          body: { padding: 0, height: 420, overflow: 'hidden' }
        }}
      >
        <div className="w-full h-full flex flex-col bg-white text-slate-800 font-sans select-none antialiased">
          {/* Top Header Bar */}
          <div className="h-10 px-4 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              {lang === 'zh' ? '系统设置' : lang === 'en' ? 'System Settings' : 'Cài đặt'}
            </span>
            <button
              type="button"
              onClick={() => setShowWebSettingsModal(false)}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Navigation */}
            <div className="w-44 bg-[#F8F9FA] border-r border-slate-200 py-2.5 flex flex-col justify-between shrink-0">
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setWebActiveTab('display')}
                  className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                    webActiveTab === 'display'
                      ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                      : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                  }`}
                >
                  <Languages className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {lang === 'zh' ? '语言' : lang === 'en' ? 'Language' : 'Ngôn ngữ'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setWebActiveTab('server')}
                  className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                    webActiveTab === 'server'
                      ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                      : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                  }`}
                >
                  <Server className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {lang === 'zh'
                      ? '服务器与数据库'
                      : lang === 'en'
                        ? 'Server & DB'
                        : 'Máy chủ & CSDL'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setWebActiveTab('accounts')}
                  className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                    webActiveTab === 'accounts'
                      ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                      : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {lang === 'zh' ? '账户' : lang === 'en' ? 'Accounts' : 'Tài khoản'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setWebActiveTab('about')}
                  className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                    webActiveTab === 'about'
                      ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                      : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {lang === 'zh' ? '关于' : lang === 'en' ? 'About' : 'Giới thiệu'}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto bg-white min-w-0 flex flex-col justify-between select-text">
              <div className="space-y-3.5">
                {webActiveTab === 'display' && (
                  <div className="space-y-3">
                    <div className="pb-2 border-b border-slate-200">
                      <h2 className="text-xs font-bold text-slate-900">
                        {lang === 'zh' ? '语言' : lang === 'en' ? 'Language' : 'Ngôn ngữ'}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'zh'
                          ? '设置界面的显示语言'
                          : lang === 'en'
                            ? 'Display language preferences across all menus'
                            : 'Tùy chọn ngôn ngữ hiển thị trên giao diện'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        {lang === 'zh'
                          ? '应用语言'
                          : lang === 'en'
                            ? 'Application Language'
                            : 'Ngôn ngữ ứng dụng'}
                      </label>
                      <Select
                        value={lang}
                        onChange={handleChange}
                        className="w-full !rounded-none"
                        options={[
                          { value: 'vi', label: '🇻🇳 Tiếng Việt' },
                          { value: 'en', label: '🇬🇧 English' },
                          { value: 'zh', label: '🇨🇳 中文' }
                        ]}
                      />
                      <p className="text-[10px] text-slate-400 font-normal pt-0.5">
                        {lang === 'zh'
                          ? '语言设置立即生效。'
                          : lang === 'en'
                            ? 'Language settings take effect immediately.'
                            : 'Tùy chọn ngôn ngữ có hiệu lực ngay lập tức trên toàn hệ thống.'}
                      </p>
                    </div>
                  </div>
                )}

                {webActiveTab === 'server' && (
                  <div className="space-y-3">
                    <div className="pb-2 border-b border-slate-200">
                      <h2 className="text-xs font-bold text-slate-900">
                        {lang === 'zh'
                          ? '服务器与连接'
                          : lang === 'en'
                            ? 'Server Connection'
                            : 'Máy chủ kết nối'}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'zh'
                          ? '选择 Goldsun Hub ERP MES 系统的运行环境'
                          : lang === 'en'
                            ? 'Select Goldsun Hub ERP MES system environment'
                            : 'Lựa chọn môi trường kết nối hệ thống Goldsun Hub ERP MES'}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          {lang === 'zh'
                            ? '服务器环境 (Environment)'
                            : lang === 'en'
                              ? 'Server Environment'
                              : 'Môi trường kết nối (Environment)'}
                        </label>
                        <Select
                          value={envSelection}
                          onChange={handleEnvChange}
                          className="w-full !rounded-none"
                          options={[
                            {
                              value: 'dev',
                              label: (
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                  <span>
                                    {lang === 'zh'
                                      ? 'Goldsun DEV (测试环境 / UAT)'
                                      : lang === 'en'
                                        ? 'Goldsun DEV (Testing / UAT)'
                                        : 'Goldsun DEV (Môi trường Thử nghiệm)'}
                                  </span>
                                </div>
                              )
                            },
                            {
                              value: 'official',
                              label: (
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                  <span>
                                    {lang === 'zh'
                                      ? 'Goldsun PROD (正式环境 / Production)'
                                      : lang === 'en'
                                        ? 'Goldsun PROD (Production)'
                                        : 'Goldsun PROD (Môi trường Chính thức)'}
                                  </span>
                                </div>
                              )
                            }
                          ]}
                        />
                      </div>

                      <div className="pt-1">
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {lang === 'zh'
                              ? 'API 网关地址'
                              : lang === 'en'
                                ? 'API Gateway Endpoint'
                                : 'Cổng kết nối API Gateway'}
                            :
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-none break-all mt-0.5 flex items-center justify-between">
                            <span>
                              {getEnvConfig(envSelection).gatewayUrl ||
                                getEnvConfig(envSelection).backendUrl}
                            </span>
                            <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {envSelection === 'dev' ? 'DEV Gateway' : 'PROD Gateway'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {webActiveTab === 'accounts' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h2 className="text-xs font-bold text-slate-900">
                          {lang === 'zh' ? '账户' : lang === 'en' ? 'Accounts' : 'Tài khoản'}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {lang === 'zh'
                            ? '此应用程序上以往登录过的账户历史记录'
                            : lang === 'en'
                              ? 'History of accounts previously logged into this application'
                              : 'Danh sách nhật ký tài khoản đã từng đăng nhập'}
                        </p>
                      </div>
                      {webLoggedUsers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllUserLogs}
                          className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>
                            {lang === 'zh'
                              ? '全部清除'
                              : lang === 'en'
                                ? 'Clear All'
                                : 'Xóa tất cả'}
                          </span>
                        </button>
                      )}
                    </div>

                    {webLoggedUsers.length > 0 ? (
                      <div className="max-h-52 overflow-y-auto space-y-1.5 p-1 bg-slate-50 border border-slate-200">
                        {webLoggedUsers.map((user, idx) => (
                          <div
                            key={user.UserSeq || idx}
                            className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">
                                {user.UserId || user.UserName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {user.LastLoginTime
                                  ? `${lang === 'zh' ? '最近登录' : lang === 'en' ? 'Last Login' : 'Đăng nhập gần nhất'}: ${new Date(
                                      user.LastLoginTime
                                    ).toLocaleString(
                                      lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'vi-VN'
                                    )}`
                                  : ''}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserLog(user.UserSeq)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title={lang === 'zh' ? '删除' : lang === 'en' ? 'Delete' : 'Xóa'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic p-6 text-center border border-dashed border-slate-200">
                        {lang === 'zh'
                          ? '暂无账户日志记录。'
                          : lang === 'en'
                            ? 'No account log history recorded.'
                            : 'Chưa có lịch sử tài khoản nào được lưu.'}
                      </div>
                    )}
                  </div>
                )}

                {webActiveTab === 'about' && (
                  <div className="space-y-3">
                    <div className="pb-2 border-b border-slate-200">
                      <h2 className="text-xs font-bold text-slate-900">
                        {lang === 'zh'
                          ? '系统信息'
                          : lang === 'en'
                            ? 'System Information'
                            : 'Thông tin hệ thống'}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Goldsun Hub ERP MES • Goldsun Packaging
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">Hệ thống ứng dụng:</span>
                        <span className="font-bold text-slate-900">Goldsun Hub ERP MES</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">Mục đích sử dụng:</span>
                        <span className="font-medium text-slate-900">
                          Báo cáo & Phân tích thông số sản xuất
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">Phiên bản giao diện:</span>
                        <span className="font-mono font-bold text-slate-900">v1.0.0</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={clearingCache}
                        onClick={handleClearCache}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${clearingCache ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {clearingCache ? 'Đang dọn dẹp...' : 'Xóa bộ nhớ đệm (Clear Cache)'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Footer Button */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWebSettingsModal(false)}
                  className="px-5 h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {lang === 'zh' ? '关闭' : lang === 'en' ? 'Close' : 'Đóng'}
                </button>
              </div>
            </div>
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

      {/* Web version: Desktop landscape card with compact dimensions */}
      <div className="w-screen h-screen m-0 p-0 overflow-hidden text-slate-900 flex items-center justify-center select-none font-sans bg-slate-100">
        <div className="w-[760px] h-[420px] overflow-hidden relative z-10 bg-white flex flex-row border border-slate-300 shadow-md">
          {loginCardContent}
        </div>
      </div>
    </>
  )
}
