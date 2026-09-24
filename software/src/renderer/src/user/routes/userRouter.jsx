/* eslint-disable react/prop-types, no-unused-vars */
import { useEffect, useState, useMemo, lazy, Suspense, useCallback, useRef, memo } from 'react'
import {
  HashRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
  matchPath
} from 'react-router-dom'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      vi: { translation: {} },
      en: { translation: {} },
      zh: { translation: {} }
    },
    lng: localStorage.getItem('lang') || localStorage.getItem('language_user') || 'vi',
    fallbackLng: 'vi',
    interpolation: { escapeValue: false }
  })
}

import { Layout, message, notification } from 'antd'
import Sidebar from '../components/sildebar/sidebar'
import Cookies from 'js-cookie'
import { CheckUser } from '../../api/auth/checkUser'
import { checkActionPermission } from '../../permissions'
import { PageDataProvider } from '../../context/PageDataContext'
import StatusBar from '../components/status/StatusBar'
import Spinner from '../page/default/load'
import Home from '../page/home/home'
import Login from '../auth/login'
import SettingsPage from '../auth/settingsPage'
import decodeJWT from '../../utils/decode-JWT'
import { transformDataMenu } from '../../utils/transformDataMenu'
import ErrorPage from '../page/default/errorPage'
import { buildPermissionsTree } from '../../utils/buildPermissionsTree'
import { mergeWithDefaultMenuConfig } from '../../config/menuConfig'

const DefaultPage = lazy(() => import('../page/default/default'))

import { systemsRoutes, preloadAllSystemRoutes } from './router/system.routes'
import { subWindowRoutes } from './router/subWindow.routes'
import StandalonePageLayout from '../components/layout/standalonePageLayout'
import { openDB } from 'idb'
import { RealtimeProvider } from '../../api/realtime/context/RealtimeContext'
import TitleBar from '../components/header/titleBar'
import GlobalSearchModal from '../components/globalSearch/GlobalSearchModal'

const { Content } = Layout

import { getLanguageData, handleDbCorruptionOrLogout } from '../../IndexedDB/loadLanguageData'
import { getMenuData, saveMenuData } from '../../IndexedDB/loadMenuData'

const LanguageProvider = ({ children, keyLanguage }) => {
  const [isReady, setIsReady] = useState(true)
  const [languageUser, setLanguageUser] = useState(
    localStorage.getItem('lang') || localStorage.getItem('language_user') || 'vi'
  )

  useEffect(() => {
    if (keyLanguage && keyLanguage !== languageUser) {
      setLanguageUser(keyLanguage)
    }
  }, [keyLanguage, languageUser])

  useEffect(() => {
    const handleLanguageChanged = () => {
      const newLang = localStorage.getItem('lang') || localStorage.getItem('language_user') || 'vi'
      setLanguageUser(newLang)
    }

    window.addEventListener('language-changed', handleLanguageChanged)
    window.addEventListener('storage', handleLanguageChanged)

    return () => {
      window.removeEventListener('language-changed', handleLanguageChanged)
      window.removeEventListener('storage', handleLanguageChanged)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadFastAndSyncNgam = async () => {
      try {
        let activeLang = languageUser

        const buildBundle = async (langCode, currentData) => {
          const viData = String(langCode).toLowerCase() !== 'vi' ? await getLanguageData('vi') : []
          const viWordMap = (viData || []).reduce((acc, item) => {
            if (item?.WordSeq && item?.Word) acc[item.WordSeq] = item.Word
            return acc
          }, {})

          return (currentData || []).reduce((acc, item) => {
            if (item?.WordSeq && item?.Word) {
              acc[item.WordSeq] = item.Word
              acc[String(item.WordSeq)] = item.Word
              const viWord = viWordMap[item.WordSeq]
              if (viWord) {
                acc[viWord] = item.Word
              }
            }
            if (item?.Word) {
              acc[item.Word] = item.Word
            }
            return acc
          }, {})
        }

        const localData = await getLanguageData(activeLang)
        const translations = await buildBundle(activeLang, localData)

        i18n.addResourceBundle(activeLang.toString(), 'translation', translations, true, true)
        i18n.changeLanguage(activeLang.toString())

        if (isMounted) setIsReady(true)
      } catch (error) {
        console.warn('Language loading failed:', error)
        if (isMounted) setIsReady(true)
      }
    }

    loadFastAndSyncNgam()

    return () => {
      isMounted = false
    }
  }, [languageUser])

  if (!isReady) return null

  return children
}

const getAuthToken = () => {
  return Cookies.get('a_a') || localStorage.getItem('token') || localStorage.getItem('a_a')
}

const getInitialRolesMenu = () => {
  try {
    let settingItems = []
    let rootMenuItems = []
    let menuItemList = []
    let roleTable = []

    const rawRolesMenu = localStorage.getItem('roles_menu')
    if (rawRolesMenu) {
      const data = decodeJWT(rawRolesMenu)
      if (data) {
        settingItems = data?.data?.find((x) => x.menu)?.menu || data?.data[0]?.menu || []
        rootMenuItems =
          data?.data?.find((x) => x.rootMenu)?.rootMenu || data?.data[1]?.rootMenu || []
        menuItemList =
          data?.data?.find((x) => x.menuItem)?.menuItem || data?.data[2]?.menuItem || []
        roleTable =
          data?.data?.find((x) => x.roleTable)?.roleTable || data?.data[3]?.roleTable || []
      }
    }

    const merged = mergeWithDefaultMenuConfig(settingItems, rootMenuItems, menuItemList)
    const permissionsTree = buildPermissionsTree(roleTable)

    return {
      settingItems: merged.settingItems,
      rootMenuItems: merged.rootMenuItems,
      menuItemList: merged.menuItemList,
      roleTable,
      transformedMenu: merged.transformedMenu,
      permissionsTree
    }
  } catch {
    const merged = mergeWithDefaultMenuConfig([], [], [])
    return {
      settingItems: merged.settingItems,
      rootMenuItems: merged.rootMenuItems,
      menuItemList: merged.menuItemList,
      roleTable: [],
      transformedMenu: merged.transformedMenu,
      permissionsTree: []
    }
  }
}

const AuthorizedRouteElement = memo(
  ({
    element: Element,
    permission,
    public: isPublic,
    fallback: Fallback,
    userPermissions,
    roleTable,
    isMobile,
    cancelAllRequests,
    controllers,
    menuTransForm
  }) => {
    const canCreate = useMemo(
      () => (isPublic ? true : checkActionPermission(userPermissions, permission, 'Create')),
      [isPublic, userPermissions, permission]
    )
    const canEdit = useMemo(
      () => (isPublic ? true : checkActionPermission(userPermissions, permission, 'Edit')),
      [isPublic, userPermissions, permission]
    )
    const canDelete = useMemo(
      () => (isPublic ? true : checkActionPermission(userPermissions, permission, 'Delete')),
      [isPublic, userPermissions, permission]
    )
    const canView = useMemo(
      () => (isPublic ? true : checkActionPermission(userPermissions, permission, 'View')),
      [isPublic, userPermissions, permission]
    )

    if (isPublic) {
      return (
        <Element
          permissions={userPermissions}
          roleTable={roleTable}
          isMobile={isMobile}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          canView={canView ?? true}
          cancelAllRequests={cancelAllRequests}
          controllers={controllers}
          menuTransForm={menuTransForm}
        />
      )
    }

    if (canView) {
      return (
        <Element
          permissions={userPermissions}
          isMobile={isMobile}
          roleTable={roleTable}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          canView={canView}
          cancelAllRequests={cancelAllRequests}
          controllers={controllers}
        />
      )
    }

    if (Fallback) {
      return (
        <Fallback
          permissions={userPermissions}
          isMobile={isMobile}
          roleTable={roleTable}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          canView={canView ?? true}
          cancelAllRequests={cancelAllRequests}
          controllers={controllers}
        />
      )
    }

    return <ErrorPage />
  }
)
AuthorizedRouteElement.displayName = 'AuthorizedRouteElement'

const UserRouter = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname
  let controllers = useRef({})
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    let token = getAuthToken()
    let userInfo = localStorage.getItem('userInfo')
    return !!(token && userInfo)
  })

  const initialMenuData = useMemo(() => getInitialRolesMenu(), [])
  const [menuTransForm, setMenuTransForm] = useState(() => initialMenuData.transformedMenu)
  const [rootMenuItems, setRootMenuItems] = useState(() => initialMenuData.rootMenuItems)
  const [roleTable, setRoleTable] = useState(() => initialMenuData.permissionsTree)
  const [errorMenu, setErrorMenu] = useState(false)
  const [userPermissions, setUserPermissions] = useState(() => initialMenuData.settingItems)

  const [isMobile, setIsMobile] = useState(false)
  const [keyLanguage, setKeyLanguage] = useState(null)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const lastProcessedRolesMenuRef = useRef(null)

  // Nạp trực tiếp cấu trúc Menu & Phân quyền từ IndexedDB ngay khi khởi động
  useEffect(() => {
    let isMounted = true
    const initMenuFromIDB = async () => {
      try {
        const record = await getMenuData()
        if (record && isMounted) {
          if (record.settingItems && record.settingItems.length > 0) {
            setUserPermissions(record.settingItems)
          }
          if (record.rootMenuItems && record.rootMenuItems.length > 0) {
            setRootMenuItems(record.rootMenuItems)
          }
          if (record.transformedMenu && record.transformedMenu.length > 0) {
            setMenuTransForm(record.transformedMenu)
          }
          if (record.permissionsTree && record.permissionsTree.length > 0) {
            setRoleTable(record.permissionsTree)
          }
        }
      } catch (e) {
        console.warn('Lỗi load menu IndexedDB ban đầu:', e)
      }
    }
    initMenuFromIDB()
    return () => {
      isMounted = false
    }
  }, [])

  // Lắng nghe phím tắt Ctrl + K / Cmd + K toàn cục và Custom Event để mở QuickSearch CodeHelp Modal
  useEffect(() => {
    const handleGlobalSearchShortcut = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      if (!isCtrlOrMeta) return

      const key = e.key ? e.key.toLowerCase() : ''
      const code = e.code || ''
      const keyCode = e.keyCode || e.which

      if (key === 'k' || code === 'KeyK' || keyCode === 75) {
        e.preventDefault()
        e.stopPropagation()
        setIsGlobalSearchOpen((prev) => !prev)
      }
    }

    const handleCustomOpenSearch = () => {
      setIsGlobalSearchOpen(true)
    }

    window.addEventListener('keydown', handleGlobalSearchShortcut, true)
    window.addEventListener('open-global-search', handleCustomOpenSearch)
    return () => {
      window.removeEventListener('keydown', handleGlobalSearchShortcut, true)
      window.removeEventListener('open-global-search', handleCustomOpenSearch)
    }
  }, [])

  const processRolesMenu = useCallback((force = false) => {
    const rawRolesMenu = localStorage.getItem('roles_menu')
    if (!rawRolesMenu) {
      const merged = mergeWithDefaultMenuConfig([], [], [])
      setUserPermissions(merged.settingItems)
      setRootMenuItems(merged.rootMenuItems)
      setMenuTransForm(merged.transformedMenu)
      return
    }
    if (!force && lastProcessedRolesMenuRef.current === rawRolesMenu) {
      return
    }
    lastProcessedRolesMenuRef.current = rawRolesMenu
    try {
      const data = decodeJWT(rawRolesMenu)
      const settingItems = data?.data?.find((x) => x.menu)?.menu || data?.data[0]?.menu || []
      const rootMenuItems =
        data?.data?.find((x) => x.rootMenu)?.rootMenu || data?.data[1]?.rootMenu || []
      const menuItemList =
        data?.data?.find((x) => x.menuItem)?.menuItem || data?.data[2]?.menuItem || []
      const roleTable =
        data?.data?.find((x) => x.roleTable)?.roleTable || data?.data[3]?.roleTable || []

      const merged = mergeWithDefaultMenuConfig(settingItems, rootMenuItems, menuItemList)
      const permissionsTree = buildPermissionsTree(roleTable)

      setUserPermissions(merged.settingItems)
      setRootMenuItems(merged.rootMenuItems)
      setMenuTransForm(merged.transformedMenu)
      setRoleTable(permissionsTree)
      saveMenuData(
        {
          settingItems: merged.settingItems,
          rootMenuItems: merged.rootMenuItems,
          menuItemList: merged.menuItemList,
          transformedMenu: merged.transformedMenu,
          permissionsTree,
          userId: JSON.parse(localStorage.getItem('userInfo') || '{}')?.UserName || ''
        },
        rawRolesMenu
      ).catch((e) => console.warn('Lỗi lưu menu IndexedDB:', e))
    } catch (error) {
      console.warn('Could not parse roles menu:', error)
      const merged = mergeWithDefaultMenuConfig([], [], [])
      setUserPermissions(merged.settingItems)
      setRootMenuItems(merged.rootMenuItems)
      setMenuTransForm(merged.transformedMenu)
    }
  }, [])

  const checkLoginStatus = useCallback(() => {
    let token = getAuthToken()
    let userInfo = localStorage.getItem('userInfo')
    if (token && userInfo) {
      setIsLoggedIn(true)
      processRolesMenu()
    } else {
      setIsLoggedIn(false)
      lastProcessedRolesMenuRef.current = null
      Cookies.remove('a_a', { path: '/' })
      Cookies.remove('a_a')
      localStorage.removeItem('token')
      localStorage.removeItem('a_a')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('roles_menu')
      localStorage.removeItem('device_token')
      localStorage.removeItem('device_id')
      setUserPermissions([])
      setRootMenuItems([])
      setMenuTransForm([])
      setRoleTable([])
      window.dispatchEvent(new Event('auth-state-changed'))
      navigate('/erp/u/login', { replace: true })
    }
  }, [navigate, processRolesMenu])

  const skippedRoutes = useMemo(() => ['/erp/u/login', '/erp/u/settings', '/docx/print-logs'], [])
  const lastWindowModeRef = useRef(null)

  useEffect(() => {
    const isLogin = location.pathname === '/erp/u/login'
    const isSettings = location.pathname === '/erp/u/settings'
    const isSubWindow = location.pathname.startsWith('/sub/')

    if (isLogin) {
      if (lastWindowModeRef.current !== 'login') {
        lastWindowModeRef.current = 'login'
        if (window.electron?.setLoginSize) {
          window.electron.setLoginSize()
        } else if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('window:set-login-size')
        }
      }
    } else if (!isSettings && !isSubWindow) {
      if (lastWindowModeRef.current !== 'main') {
        lastWindowModeRef.current = 'main'
        if (window.electron?.setMainSize) {
          window.electron.setMainSize()
        } else if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('window:set-main-size')
        }
      }
    }

    if (
      !skippedRoutes.includes(location.pathname) &&
      !location.pathname.startsWith('/app/erp/p/asst-aems/maintain/mr-04/')
    ) {
      const token = getAuthToken()
      const userInfo = localStorage.getItem('userInfo')
      if (!token || !userInfo) {
        checkLoginStatus()
      }
    }
  }, [location.pathname, checkLoginStatus, skippedRoutes])

  useEffect(() => {
    const handleAuthChange = () => {
      let token = getAuthToken()
      let userInfo = localStorage.getItem('userInfo')
      if (token && userInfo) {
        setIsLoggedIn(true)
        lastProcessedRolesMenuRef.current = null
        processRolesMenu(true)
      } else {
        setIsLoggedIn(false)
        lastProcessedRolesMenuRef.current = null
        setUserPermissions([])
        setRootMenuItems([])
        setMenuTransForm([])
        setRoleTable([])
      }
    }

    const handleLogoutEvent = () => {
      checkLoginStatus()
    }

    window.addEventListener('auth-state-changed', handleAuthChange)

    let cleanupLogout = null
    if (typeof window?.electron?.onLogoutEvent === 'function') {
      cleanupLogout = window.electron.onLogoutEvent(handleLogoutEvent)
    } else if (typeof window?.electron?.ipcRenderer?.on === 'function') {
      cleanupLogout = window.electron.ipcRenderer.on('auth:logout-event', handleLogoutEvent)
    }

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange)
      if (typeof cleanupLogout === 'function') {
        cleanupLogout()
      } else if (typeof window?.electron?.ipcRenderer?.removeListener === 'function') {
        window.electron.ipcRenderer.removeListener('auth:logout-event', handleLogoutEvent)
      }
    }
  }, [processRolesMenu, checkLoginStatus])

  if (errorMenu) return <ErrorPage />

  const routes = useMemo(
    () => [
      ...systemsRoutes,
      {
        path: '',
        element: Home,
        public: true,
        fallback: DefaultPage
      },
      {
        path: '/erp/u/home',
        element: Home,
        public: true,
        fallback: DefaultPage
      }
    ],
    []
  )
  const routesNoSiidebar = []
  const cancelAllRequests = useCallback(() => {
    Object.values(controllers.current || {}).forEach((controller) => {
      if (controller && controller.abort) {
        controller.abort()
      }
    })
    controllers.current = {}
  }, [])

  const hasAuthTokens = () => {
    let token = getAuthToken()
    let userInfo = localStorage.getItem('userInfo')
    return !!(token && userInfo)
  }

  const activeRouteConfig = useMemo(() => {
    return routes.find((r) => {
      if (!r.path) return false
      return matchPath({ path: r.path, end: true }, location.pathname)
    })
  }, [routes, location.pathname])

  const hideSidebar = Boolean(activeRouteConfig?.noSidebar || activeRouteConfig?.hideSidebar)
  const hideStatusBar = Boolean(activeRouteConfig?.noStatusBar || activeRouteConfig?.hideStatusBar)

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/erp/u/login" replace />} />
        <Route
          path="/erp/u/login"
          element={<Login processRolesMenu={processRolesMenu} setKeyLanguage={setKeyLanguage} />}
        />
        <Route path="/erp/u/settings" element={<SettingsPage />} />
        <Route
          path="/app/erp/p/asst-aems/maintain/mr-04/:seq"
          element={
            <div className="h-full flex flex-col overflow-hidden">
              <TitleBar />
              <div className="flex-1 min-h-0 overflow-hidden">
                <DefaultPage cancelAllRequests={cancelAllRequests} controllers={controllers} />
              </div>
            </div>
          }
        />
        <Route
          path="/*"
          element={
            !hasAuthTokens() ? (
              <Navigate to="/erp/u/login" replace />
            ) : (
              <Suspense fallback={<Spinner />}>
                <LanguageProvider keyLanguage={keyLanguage}>
                  <PageDataProvider>
                    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
                      <TitleBar />
                      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
                        {!hideSidebar && (
                          <Sidebar
                            permissions={userPermissions}
                            rootMenu={rootMenuItems}
                            menuTransForm={menuTransForm}
                          />
                        )}
                        <Layout className="flex flex-col h-full overflow-hidden flex-1">
                          <Content className="bg-slate-50 flex-grow overflow-hidden h-0">
                            <Suspense fallback={<Spinner />}>
                              <Routes>
                                {routes.map((route) => (
                                  <Route
                                    key={route.path}
                                    path={route.path}
                                    element={
                                      <AuthorizedRouteElement
                                        element={route.element}
                                        permission={route.permission}
                                        public={route.public}
                                        fallback={route.fallback}
                                        userPermissions={userPermissions}
                                        roleTable={roleTable}
                                        isMobile={isMobile}
                                        cancelAllRequests={cancelAllRequests}
                                        controllers={controllers}
                                        menuTransForm={menuTransForm}
                                      />
                                    }
                                  />
                                ))}
                              </Routes>
                            </Suspense>
                          </Content>
                        </Layout>
                      </div>
                      {!hideStatusBar && (
                        <StatusBar
                          rootMenu={rootMenuItems}
                          menuTransForm={menuTransForm}
                          userName={JSON.parse(localStorage.getItem('userInfo') || '{}')?.UserName}
                        />
                      )}
                    </div>
                  </PageDataProvider>
                </LanguageProvider>
              </Suspense>
            )
          }
        />
        <Route
          path="/pos/*"
          element={
            <Suspense fallback={<Spinner />}>
              <LanguageProvider keyLanguage={keyLanguage}>
                <Layout className="h-full flex flex-col overflow-hidden">
                  <TitleBar />
                  <Layout className="border-t flex-1 min-h-0 overflow-hidden">
                    <Content className="bg-slate-50">
                      <Suspense fallback={<Spinner />}>
                        <Routes>
                          {routesNoSiidebar.map((route) => (
                            <Route
                              key={route.path}
                              path={route.path}
                              element={
                                <AuthorizedRouteElement
                                  element={route.element}
                                  permission={route.permission}
                                  public={route.public}
                                  fallback={route.fallback}
                                  userPermissions={userPermissions}
                                  roleTable={roleTable}
                                  isMobile={isMobile}
                                  cancelAllRequests={cancelAllRequests}
                                  controllers={controllers}
                                  menuTransForm={menuTransForm}
                                />
                              }
                            />
                          ))}
                        </Routes>
                      </Suspense>
                    </Content>
                  </Layout>
                </Layout>
              </LanguageProvider>
            </Suspense>
          }
        />

        {/* Standalone Sub-Window Forms without Sidebar */}
        <Route
          path="/sub/*"
          element={
            <Suspense fallback={<Spinner />}>
              <LanguageProvider keyLanguage={keyLanguage}>
                <PageDataProvider>
                  <StandalonePageLayout rootMenu={rootMenuItems} menuTransForm={menuTransForm}>
                    <Routes>
                      {subWindowRoutes.map((route) => (
                        <Route
                          key={route.path}
                          path={route.path}
                          element={
                            <AuthorizedRouteElement
                              element={route.element}
                              permission={route.permission}
                              public={route.public}
                              fallback={route.fallback}
                              userPermissions={userPermissions}
                              roleTable={roleTable}
                              isMobile={isMobile}
                              cancelAllRequests={cancelAllRequests}
                              controllers={controllers}
                              menuTransForm={menuTransForm}
                            />
                          }
                        />
                      ))}
                    </Routes>
                  </StandalonePageLayout>
                </PageDataProvider>
              </LanguageProvider>
            </Suspense>
          }
        />
      </Routes>

      {/* Global Search / Quick Navigation Modal (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        permissions={userPermissions}
        rootMenu={rootMenuItems}
        menuTransForm={menuTransForm}
      />
    </>
  )
}

const App = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <RealtimeProvider>
      <UserRouter />
    </RealtimeProvider>
  </Router>
)

export default App
