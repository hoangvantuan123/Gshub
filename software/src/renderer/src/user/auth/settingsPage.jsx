import { useState, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { Select, message } from 'antd'
import Cookies from 'js-cookie'
import {
  Globe,
  Database,
  X,
  Server,
  Languages,
  Info,
  CheckCircle2,
  Users,
  Trash2,
  RefreshCw
} from 'lucide-react'
import Logo from '../../assets/gold-sun-logo.svg'
import { getDefaultDataHubUrl, getEnvConfig, SERVER_ENVIRONMENTS } from '../../config/serverConfig'
import { getApiServerEndpoint } from '../../services'
import ApiConfigPanel from '../configs/ApiConfigPanel'

const settingsTranslations = {
  vi: {
    settingsTitle: 'Cài đặt',
    tabs: {
      display: 'Ngôn ngữ',
      server: 'Máy chủ kết nối',
      accounts: 'Tài khoản',
      about: 'Giới thiệu'
    },
    display: {
      title: 'Ngôn ngữ',
      subtitle: 'Tùy chọn ngôn ngữ hiển thị trên giao diện',
      langLabel: 'Ngôn ngữ ứng dụng',
      langHint: 'Tùy chọn ngôn ngữ có hiệu lực ngay lập tức trên toàn hệ thống.'
    },
    server: {
      title: 'Máy chủ kết nối',
      subtitle: 'Lựa chọn môi trường kết nối hệ thống',
      envLabel: 'Môi trường kết nối (Environment)',
      official: 'Goldsun PROD (Môi trường Chính thức)',
      dev: 'Goldsun DEV (Môi trường Thử nghiệm)',
      backendLabel: 'Cổng kết nối API Gateway',
      erpLabel: 'Máy chủ ERP Core (Bravo Endpoint)'
    },
    accounts: {
      title: 'Tài khoản',
      subtitle: 'Danh sách nhật ký tài khoản đã từng đăng nhập trên ứng dụng này',
      clearAll: 'Xóa tất cả',
      lastLogin: 'Đăng nhập gần nhất',
      empty: 'Chưa có lịch sử tài khoản nào được lưu.',
      unknown: 'Không xác định',
      deleteTitle: 'Xóa nhật ký tài khoản này'
    },
    about: {
      title: 'Thông tin hệ thống',
      latestVersion: 'Đây là phiên bản mới nhất.',
      privacyPolicy: 'Chính sách bảo mật',
      termsOfService: 'Điều khoản dịch vụ',
      openSource: 'Nguồn mở',
      cacheTitle: 'Bộ nhớ tạm',
      clearCacheBtn: 'Xóa bộ nhớ đệm',
      clearingCache: 'Đang dọn dẹp...',
      cacheCleared: 'Đã xóa bộ nhớ đệm thành công!'
    },
    footer: {
      clientTitle: 'Goldsun Hub ERP MES • Hệ thống báo cáo thông số sản xuất',
      close: 'Đóng'
    }
  },
  en: {
    settingsTitle: 'System Settings',
    tabs: {
      display: 'Language',
      server: 'Server Connection',
      accounts: 'Accounts',
      about: 'About'
    },
    display: {
      title: 'Language',
      subtitle: 'Display language preferences across all menus',
      langLabel: 'Application Language',
      langHint: 'Language settings take effect immediately across all menus.'
    },
    server: {
      title: 'Server Connection',
      subtitle: 'Select system environment',
      envLabel: 'Server Environment',
      official: 'Goldsun PROD (Production)',
      dev: 'Goldsun DEV (Testing / UAT)',
      backendLabel: 'API Gateway Endpoint',
      erpLabel: 'ERP Core Server (Bravo Endpoint)'
    },
    accounts: {
      title: 'Accounts',
      subtitle: 'History of accounts previously logged into this application',
      clearAll: 'Clear All',
      lastLogin: 'Last Login',
      empty: 'No account log history recorded.',
      unknown: 'Unknown',
      deleteTitle: 'Delete this account log'
    },
    about: {
      title: 'System Information',
      latestVersion: 'This is the latest version.',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      openSource: 'Open Source',
      cacheTitle: 'Temporary Cache',
      clearCacheBtn: 'Clear Cache',
      clearingCache: 'Clearing...',
      cacheCleared: 'Cache cleared successfully!'
    },
    footer: {
      clientTitle: 'Goldsun Hub ERP MES • Production Parameter Analytics System',
      close: 'Close'
    }
  },
  zh: {
    settingsTitle: '系统设置',
    tabs: {
      display: '语言',
      server: '服务器与连接',
      accounts: '账户',
      about: '关于'
    },
    display: {
      title: '语言',
      subtitle: '全界面语言显示选项',
      langLabel: '应用语言',
      langHint: '语言设置立即在所有菜单中生效。'
    },
    server: {
      title: '服务器与连接',
      subtitle: '选择系统的运行环境',
      envLabel: '服务器环境 (Environment)',
      official: 'Goldsun PROD (正式环境 / Production)',
      dev: 'Goldsun DEV (测试环境 / UAT)',
      backendLabel: 'API 网关地址',
      erpLabel: 'ERP Core 核心服务器 (Bravo)'
    },
    accounts: {
      title: '账户',
      subtitle: '此应用程序上以往登录过的账户历史记录',
      clearAll: '清除全部',
      lastLogin: '最近登录',
      empty: '暂无账户日志记录。',
      unknown: '未知',
      deleteTitle: '删除此账户日志'
    },
    about: {
      title: '系统信息',
      latestVersion: '这是最新版本。',
      privacyPolicy: '隐私政策',
      termsOfService: '服务条款',
      openSource: '开源声明',
      cacheTitle: '临时缓存',
      clearCacheBtn: '清除缓存',
      clearingCache: '正在清理...',
      cacheCleared: '缓存已成功清除！'
    },
    footer: {
      clientTitle: 'Goldsun Hub ERP MES • 生产报表与参数分析系统',
      close: '关闭'
    }
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('display')
  const [lang, setLang] = useState('vi')
  const [envSelection, setEnvSelection] = useState(
    () => localStorage.getItem('envSelection') || 'dev'
  )
  const [loggedUsers, setLoggedUsers] = useState([])
  const [clearingCache, setClearingCache] = useState(false)
  const [versionInfo, setVersionInfo] = useState({
    nativeVersion: '1.0.0',
    uiVersion: '1.0.0',
    isCustomBundle: false
  })
  const [systemInfo, setSystemInfo] = useState(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateState, setUpdateState] = useState(null)
  const [releasesList, setReleasesList] = useState([])
  const [langOptions, setLangOptions] = useState([
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' }
  ])

  const t = settingsTranslations[lang] || settingsTranslations['vi']

  const isElectron =
    typeof window !== 'undefined' &&
    (window.userAgent?.toLowerCase().includes('electron') ||
      !!window?.process?.type ||
      !!window?.electron)

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') || 'vi'
    setLang(savedLang)
    const savedEnv = localStorage.getItem('envSelection') || 'dev'
    setEnvSelection(savedEnv)

    const handleStorageChange = () => {
      const currentLang = localStorage.getItem('lang') || 'vi'
      setLang(currentLang)
      const currentEnv = localStorage.getItem('envSelection') || 'dev'
      setEnvSelection(currentEnv)
    }
    window.addEventListener('language-changed', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('env-changed', handleStorageChange)
    return () => {
      window.removeEventListener('language-changed', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('env-changed', handleStorageChange)
    }
  }, [])

  const loadLoggedUsers = async () => {
    let users = []
    if (window?.electron?.readDataFromFile) {
      try {
        const data = await window.electron.readDataFromFile('save_users_log.json')
        if (Array.isArray(data)) users = data
      } catch (err) {
        users = []
      }
    }
    if (!users || users.length === 0) {
      try {
        const data = localStorage.getItem('save_users_log')
        if (data) users = JSON.parse(data)
      } catch (err) {
        users = []
      }
    }
    setLoggedUsers(users || [])
  }

  useEffect(() => {
    if (activeTab === 'accounts') {
      loadLoggedUsers()
    }
    if (activeTab === 'about') {
      if (window.electron?.updater?.getVersions) {
        window.electron.updater
          .getVersions()
          .then((info) => {
            if (info) {
              setVersionInfo({
                nativeVersion: info.nativeVersion || '1.0.0',
                uiVersion: info.uiVersion || '1.0.0',
                isCustomBundle: !!info.isCustomBundle
              })
              if (info.currentState) {
                setUpdateState(info.currentState)
              }
            }
          })
          .catch(() => {})
      }
      if (window.electron?.getSystemInfo) {
        window.electron
          .getSystemInfo()
          .then((sys) => {
            if (sys) setSystemInfo(sys)
          })
          .catch(() => {})
      }
    }
  }, [activeTab])

  const handleCheckUpdate = async () => {
    if (!window.electron?.updater) return
    setIsCheckingUpdate(true)
    try {
      if (typeof window.electron.updater.checkAll === 'function') {
        await window.electron.updater.checkAll()
      }
      const info = await window.electron.updater.getVersions()
      if (info) {
        setVersionInfo({
          nativeVersion: info.nativeVersion || '1.0.0',
          uiVersion: info.uiVersion || '1.0.0',
          isCustomBundle: !!info.isCustomBundle
        })
        if (info.currentState) {
          setUpdateState(info.currentState)
        }
      }
      message.success('Đã hoàn tất kiểm tra phiên bản mới nhất!')
    } catch (err) {
      message.error('Không thể kiểm tra cập nhật: ' + (err.message || 'Lỗi mạng'))
    } finally {
      setIsCheckingUpdate(false)
    }
  }

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
  }

  const handleClearAllLogs = async () => {
    setLoggedUsers([])
    localStorage.setItem('save_users_log', JSON.stringify([]))
    if (window?.electron?.saveDataToFile) {
      try {
        await window.electron.saveDataToFile('save_users_log.json', [])
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleChange = (value) => {
    setLang(value)
    localStorage.setItem('lang', value)
    const langMap = { vi: 6, en: 2, zh: 1 }
    const langSeq = langMap[value] || 6
    localStorage.setItem('language_user', JSON.stringify(langSeq))
    window.dispatchEvent(new Event('language-changed'))
    window.dispatchEvent(new Event('storage'))
  }

  const handleEnvChange = (value) => {
    setEnvSelection(value)
    localStorage.setItem('envSelection', value)
    localStorage.setItem('datahub_env_selection', value)
    import('../../services').then((m) => {
      if (typeof m.updateApiServers === 'function') {
        m.updateApiServers(value)
      }
    })
    window.dispatchEvent(new CustomEvent('env-changed', { detail: value }))
    window.dispatchEvent(new CustomEvent('datahub_env_changed', { detail: value }))
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('TITLE_UPDATE'))
    if (window.electron?.notifyEnvChange) {
      window.electron.notifyEnvChange(value)
    }
    message.success(
      value === 'dev'
        ? 'Đã chuyển sang môi trường Goldsun DEV (Testing / UAT)'
        : 'Đã chuyển sang môi trường Goldsun PROD (Chính thức)'
    )
  }

  const handleCloseWindow = () => {
    try {
      if (window.electron?.closeSettingsWindow) {
        window.electron.closeSettingsWindow()
      } else if (window.electron?.close) {
        window.electron.close()
      } else {
        window.close()
      }
    } catch (e) {
      console.warn('Could not close settings window:', e)
    }
  }

  const currentEnvCfg = getEnvConfig(envSelection)
  const currentErpEndpoint = getApiServerEndpoint(envSelection)

  return (
    <>
      <Helmet>
        <title>{t.settingsTitle}</title>
      </Helmet>
      <div className="w-screen h-screen m-0 p-0 overflow-hidden bg-white text-slate-800 font-sans select-none flex flex-col antialiased">
        <div
          className="h-10 pl-4 pr-0 flex items-center justify-between border-b border-slate-200 bg-white shrink-0 select-none"
          style={{ WebkitAppRegion: isElectron ? 'drag' : 'no-drag' }}
        >
          <span className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
            {t.settingsTitle}
          </span>

          <button
            type="button"
            onClick={handleCloseWindow}
            className={
              isElectron
                ? 'w-11 h-10 flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#E81123] active:bg-[#F1707A] transition-colors cursor-pointer'
                : 'w-7.5 h-7.5 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-none transition-colors cursor-pointer mr-3'
            }
            style={{ WebkitAppRegion: 'no-drag' }}
            title={t.footer.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Navigation - Auto Responsive Width */}
          <div className="w-40 bg-[#F8F9FA] border-r border-slate-200 py-3 flex flex-col justify-between shrink-0">
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('display')}
                className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                  activeTab === 'display'
                    ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                }`}
              >
                <Languages className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">{t.tabs.display}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('server')}
                className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                  activeTab === 'server'
                    ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                }`}
              >
                <Server className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">{t.tabs.server}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                  activeTab === 'accounts'
                    ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">{t.tabs.accounts}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`w-full px-3.5 py-2.5 text-xs text-left transition-all flex items-center gap-2.5 cursor-pointer rounded-none ${
                  activeTab === 'about'
                    ? 'bg-[#ECEEEF] text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-[#F1F3F5] hover:text-slate-800 font-medium'
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">{t.tabs.about}</span>
              </button>
            </div>
          </div>

          {/* Right Main Content Area - Full-Height Scroll & Square Desktop Style & Selectable Text */}
          <div className="flex-1 p-3.5 overflow-y-auto bg-white min-w-0 flex flex-col justify-start select-text">
            {activeTab === 'display' && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-900">{t.display.title}</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t.display.subtitle}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {t.display.langLabel}
                  </label>
                  <Select
                    value={lang}
                    onChange={handleChange}
                    bordered={false}
                    size="middle"
                    className="w-full !bg-white hover:!bg-slate-50 !rounded-none border border-slate-300 text-xs font-semibold text-slate-800"
                    options={langOptions}
                  />

                  <p className="text-[10px] text-slate-400 font-normal pt-0.5">
                    {t.display.langHint}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'server' && (
              <div className="space-y-3">
                <ApiConfigPanel />
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs font-bold text-slate-900 truncate">
                      {t.accounts.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.accounts.subtitle}</p>
                  </div>
                  {loggedUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllLogs}
                      className="h-7 px-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-none text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.accounts.clearAll}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {loggedUsers.length > 0 ? (
                    loggedUsers.map((user, idx) => (
                      <div
                        key={user.UserSeq || user.UserId || idx}
                        className="py-2 px-1.5 border-b border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-none bg-[#163B2B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {user.UserName?.charAt(0)?.toUpperCase() ||
                              user.UserId?.charAt(0)?.toUpperCase() ||
                              'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {user.UserName ? `${user.UserName} (${user.UserId})` : user.UserId}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {t.accounts.lastLogin}:{' '}
                              {user.LastLoginTime
                                ? new Date(user.LastLoginTime).toLocaleString('vi-VN')
                                : t.accounts.unknown}
                              {user.envSelection
                                ? ` • ${user.envSelection === 'official' ? t.server.official : t.server.dev}`
                                : ''}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteUserLog(user.UserSeq, user.UserId)}
                          className="w-6 h-6 rounded-none bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                          title={t.accounts.deleteTitle}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-none">
                      {t.accounts.empty}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-16 h-11 p-0.5 flex items-center justify-center shrink-0">
                      <img src={Logo} alt="Goldsun Logo" className="h-full w-auto object-contain" />
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900">
                        ver. {versionInfo.uiVersion || versionInfo.nativeVersion || '2.0.1'}
                      </div>
                      <div className="text-[11px] font-medium text-slate-600">
                        {t.about.latestVersion}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 pt-0.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800 underline cursor-pointer">
                          {t.about.privacyPolicy}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-slate-800 underline cursor-pointer">
                          {t.about.termsOfService}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-slate-800 underline cursor-pointer">
                          {t.about.openSource}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isElectron && (
                    <button
                      type="button"
                      disabled={isCheckingUpdate}
                      onClick={handleCheckUpdate}
                      className="h-7 px-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 rounded-none text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      <span>{isCheckingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}</span>
                    </button>
                  )}
                </div>

                {/* Thông tin bản hiện tại của phần mềm */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">
                      ver. {versionInfo.uiVersion || versionInfo.nativeVersion || '2.0.1'}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                      • GsHub ERP Client is updated regularly in order to improve user experience
                      and security. This update includes enhanced app usability and minor bug fixes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
