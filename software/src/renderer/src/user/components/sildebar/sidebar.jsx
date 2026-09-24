/* eslint-disable react/prop-types, no-unused-vars */
import {
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Inbox,
  Home,
  LayoutGrid,
  User as UserIcon,
  Settings,
  Key,
  LogOut
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback, useMemo, useRef, memo, startTransition } from 'react'
import SidebarContent from './styled/toggleSidebar'
import { useTranslation } from 'react-i18next'
import { getMenuIcon, iconMapping } from './dataMenu'
import './static/css/scroll_container.css'
import ModalLogout from '../modal/logout/modalLogout'
import ModalChangePassword from '../modal/password/ModalChangePassword'
import { performLogout } from '../../../utils/logout'
import { usePageData } from '../../../context/PageDataContext'
import { isPageBusy } from '../../../utils/togglePageInteraction'
import { preloadRoute } from '../../routes/router/system.routes'

// Custom Tooltip component in GsHub Desktop style
const Tooltip = ({ title, children, side = 'right', className = '' }) => {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef(null)

  const show = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, 120)
  }

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && title && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-slate-100 bg-slate-900/95 backdrop-blur-xs rounded-[3px] shadow-lg whitespace-nowrap pointer-events-none select-none animate-in fade-in-0 zoom-in-95 duration-100 ${
            side === 'right'
              ? 'left-full ml-2.5 top-1/2 -translate-y-1/2'
              : 'bottom-full mb-2.5 left-1/2 -translate-x-1/2'
          }`}
        >
          {title}
        </div>
      )}
    </div>
  )
}

const Sidebar = ({ permissions = [], rootMenu = [], menuTransForm = [] }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { safeNavigate, setStatusMessage, loadingInfo } = usePageData() || {}
  const isPageLoading = Boolean(loadingInfo?.isLoading)
  const { t } = useTranslation()

  // 1. User Info from LocalStorage
  const userFromLocalStorage = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo')) || {}
    } catch {
      return {}
    }
  }, [])

  // Helper to check if current route is a standalone / non-module route
  const isHomeOrStandalonePath = useCallback((path) => {
    return !path || path === '/' || path === '/erp/u/home' || path === '/erp/u/setting'
  }, [])

  // 2. Sidebar States
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const savedState = localStorage.getItem('COLLAPSED_STATE')
      return savedState ? JSON.parse(savedState) : false
    } catch {
      return false
    }
  })

  const [isMobile, setIsMobile] = useState(false)
  const [menu, setMenu] = useState(() => {
    try {
      if (typeof window !== 'undefined' && isHomeOrStandalonePath(window.location.pathname)) {
        return false
      }
      const savedMenuState = localStorage.getItem('menu')
      return savedMenuState ? JSON.parse(savedMenuState) : false
    } catch {
      return false
    }
  })

  const [isMenu, setIsMenu] = useState(() => {
    if (typeof window !== 'undefined' && isHomeOrStandalonePath(window.location.pathname)) {
      return null
    }
    return localStorage.getItem('isMenu') || null
  })
  const [labelMenu, setLabelMenu] = useState(() => {
    if (typeof window !== 'undefined' && isHomeOrStandalonePath(window.location.pathname)) {
      return null
    }
    return localStorage.getItem('labelMenu') || null
  })
  const [logoutDrawerVisible, setLogoutDrawerVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [openSubMenus, setOpenSubMenus] = useState({})

  const [currentAction, setCurrentAction] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path === '/erp/u/home' || path === '/') return 'home'
      if (path === '/erp/u/setting') return 'settings'
    }
    return sessionStorage.getItem('current_action') || ''
  })

  const DEFAULT_SIDEBAR_WIDTH = 240
  const MIN_SIDEBAR_WIDTH = 180
  const MAX_SIDEBAR_WIDTH = 550

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('SIDEBAR_WIDTH')
      const parsed = saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH
      return isNaN(parsed)
        ? DEFAULT_SIDEBAR_WIDTH
        : Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, parsed))
    } catch {
      return DEFAULT_SIDEBAR_WIDTH
    }
  })

  const [isResizing, setIsResizing] = useState(false)
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(sidebarWidth)

  const handleMouseDownResize = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      isResizingRef.current = true
      setIsResizing(true)
      startXRef.current = e.clientX
      startWidthRef.current = sidebarWidth

      const handleMouseMove = (moveEvent) => {
        if (!isResizingRef.current) return
        const deltaX = moveEvent.clientX - startXRef.current
        const newWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, startWidthRef.current + deltaX)
        )
        setSidebarWidth(newWidth)
        localStorage.setItem('SIDEBAR_WIDTH', String(newWidth))
      }

      const handleMouseUp = () => {
        isResizingRef.current = false
        setIsResizing(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [sidebarWidth]
  )

  const lastNavTimestampRef = useRef(0)
  const lastSyncedPathRef = useRef('')
  const userDropdownRef = useRef(null)

  // Click outside to close user popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userDropdownOpen])

  // Responsive check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Pre-index toàn bộ Route -> Module mapping O(1) tránh lặp 4 vòng lồng nhau khi đổi trang
  const routePathMap = useMemo(() => {
    const map = new Map()
    const roots = Array.isArray(rootMenu) ? rootMenu : []
    const menus = Array.isArray(menuTransForm) ? menuTransForm : []

    for (const root of roots) {
      if (!root) continue
      for (const item of menus) {
        if (!item) continue
        if (item.MenuKey === root.RootMenuKey || item.RootMenuKey === root.RootMenuKey) {
          if (item.MenuType === 'menu' && item.MenuLink) {
            map.set(item.MenuLink, {
              rootKey: root.RootMenuKey,
              rootLabel: root.RootMenuLabel,
              itemKey: item.Id,
              subMenus: {}
            })
          }
          if (item.MenuType === 'submenu' && Array.isArray(item.subMenu)) {
            for (const sub of item.subMenu) {
              if (!sub) continue
              if (sub.MenuLink) {
                map.set(sub.MenuLink, {
                  rootKey: root.RootMenuKey,
                  rootLabel: root.RootMenuLabel,
                  itemKey: sub.MenuKey || sub.Id,
                  subMenus: { [item.Id]: true }
                })
              }
              if (Array.isArray(sub.menuItems)) {
                for (const nested of sub.menuItems) {
                  if (nested && nested.MenuLink) {
                    map.set(nested.MenuLink, {
                      rootKey: root.RootMenuKey,
                      rootLabel: root.RootMenuLabel,
                      itemKey: nested.MenuKey || nested.Id,
                      subMenus: {
                        [item.Id]: true,
                        [`sub-menu-${sub.Id || sub.MenuKey}`]: true
                      }
                    })
                  }
                }
              }
            }
          }
        }
      }
    }
    return map
  }, [rootMenu, menuTransForm])

  // 3. Auto sync Route URL with Menu Tree (Auto-expand & Highlight on route change only)
  useEffect(() => {
    const pathname = location.pathname
    if (lastSyncedPathRef.current === pathname) {
      return
    }
    lastSyncedPathRef.current = pathname

    // If on Home page
    if (!pathname || pathname === '/' || pathname === '/erp/u/home') {
      if (currentAction !== 'home') setCurrentAction('home')
      return
    }

    // If on Settings
    if (pathname === '/erp/u/setting') {
      if (currentAction !== 'settings') setCurrentAction('settings')
      return
    }

    const matched = routePathMap.get(pathname)
    if (matched) {
      if (matched.itemKey && currentAction !== matched.itemKey) {
        setCurrentAction(matched.itemKey)
        sessionStorage.setItem('current_action', matched.itemKey)
      }
      if (matched.rootKey) {
        setIsMenu(matched.rootKey)
        setLabelMenu(matched.rootLabel)
        localStorage.setItem('isMenu', matched.rootKey)
        localStorage.setItem('labelMenu', matched.rootLabel)
        setMenu(false)
      }
      if (matched.subMenus && Object.keys(matched.subMenus).length > 0) {
        setOpenSubMenus((prev) => ({ ...prev, ...matched.subMenus }))
      }
    }
  }, [location.pathname, routePathMap, currentAction])

  // 4. Click navigation with snappy desktop software response
  const handleSafeClick = useCallback(
    (e, path, itemKey) => {
      if (e) {
        if (e.ctrlKey || e.metaKey || e.button === 1) return
        e.preventDefault?.()
        e.stopPropagation?.()
      }

      // Check if system is busy with heavy pasting / dirty state
      if (typeof isPageBusy === 'function' && isPageBusy()) {
        setStatusMessage?.({
          type: 'warning',
          text: t('Hệ thống đang bận xử lý dữ liệu. Vui lòng đợi hoàn tất!')
        })
        return
      }

      // If clicked current path, trigger refresh event
      if (path === location.pathname) {
        if (itemKey) {
          sessionStorage.setItem('current_action', itemKey)
          setCurrentAction(itemKey)
        }
        window.dispatchEvent(new CustomEvent('page-menu-refresh', { detail: { path } }))
        return
      }

      // Clear module submenu state if navigating to standalone routes
      if (path === '/erp/u/home' || path === '/erp/u/setting') {
        setIsMenu(null)
        setLabelMenu(null)
        localStorage.removeItem('isMenu')
        localStorage.removeItem('labelMenu')
        setMenu(false)
        localStorage.setItem('menu', 'false')
      }

      // Navigate
      if (
        typeof path === 'string' &&
        path.trim() !== '' &&
        path !== '#' &&
        path !== '[object Window]'
      ) {
        preloadRoute(path)
        if (itemKey) {
          sessionStorage.setItem('current_action', itemKey)
          setCurrentAction(itemKey)
        }
        if (safeNavigate) {
          safeNavigate(path)
        } else {
          navigate(path)
        }
      }
    },
    [navigate, safeNavigate, location.pathname, setStatusMessage, t]
  )

  // Toggle collapse sidebar
  const toggleSidebar = useCallback(() => {
    setCollapsed((prevState) => {
      const newState = !prevState
      localStorage.setItem('COLLAPSED_STATE', JSON.stringify(newState))
      return newState
    })
  }, [])

  // Toggle SubMenu accordion
  const toggleSubMenuKey = useCallback((key, event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    setOpenSubMenus((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }))
  }, [])

  // Select Root Menu item
  const handleOnClickRootMenuItem = useCallback((item, event) => {
    if (event) {
      event.preventDefault?.()
      event.stopPropagation?.()
    }
    const rootKey = item.RootMenuKey || item.Id || item.RootMenuId || item.Key
    const rootLabel = item.RootMenuLabel || item.Label || item.Name || rootKey
    setIsMenu(rootKey)
    setLabelMenu(rootLabel)
    localStorage.setItem('isMenu', rootKey)
    localStorage.setItem('labelMenu', rootLabel)
    localStorage.setItem('menu', 'false')
    setCollapsed(false)
    setMenu(false)
  }, [])

  // Toggle overview of all root menus
  const handleToggleMenuRootList = useCallback(
    (event) => {
      if (event) {
        event.preventDefault?.()
        event.stopPropagation?.()
      }
      const nextMenuState = !menu
      setMenu(nextMenuState)
      localStorage.setItem('menu', JSON.stringify(nextMenuState))
      if (nextMenuState) {
        setIsMenu(null)
        localStorage.removeItem('isMenu')
        setCollapsed(false)
      }
    },
    [menu]
  )

  // User dropdown actions
  const openModalShowLogout = useCallback(() => {
    setUserDropdownOpen(false)
    setLogoutDrawerVisible(true)
  }, [])

  const confirmLogout = useCallback(async () => {
    setLogoutDrawerVisible(false)
    await performLogout(navigate)
  }, [navigate])

  const openModalChangePassword = useCallback(() => {
    setUserDropdownOpen(false)
    setPasswordModalVisible(true)
  }, [])

  const handleClickSetting = useCallback(
    (e) => {
      setUserDropdownOpen(false)
      handleSafeClick(e, '/erp/u/setting', 'settings')
    },
    [handleSafeClick]
  )

  // Filtered menu items for active module
  const currentModuleItems = useMemo(() => {
    return (Array.isArray(menuTransForm) ? menuTransForm : []).filter(
      (item) =>
        (item?.RootMenuKey === isMenu ||
          item?.MenuKey === isMenu ||
          item?.MenuRootId === isMenu ||
          (item?.MenuRootId &&
            rootMenu.some(
              (r) =>
                r &&
                (r.RootMenuKey === isMenu || r.Id === isMenu || r.RootMenuId === isMenu) &&
                (r.Id === item.MenuRootId ||
                  r.RootMenuId === item.MenuRootId ||
                  r.RootMenuKey === item.MenuRootId)
            ))) &&
        item?.View !== false
    )
  }, [menuTransForm, isMenu, rootMenu])

  // Root menu list for overview
  const rootMenuOverviewList = useMemo(() => {
    return (Array.isArray(rootMenu) ? rootMenu : []).filter((item) => item?.View !== false)
  }, [rootMenu])

  const userInitials = useMemo(() => {
    const name = userFromLocalStorage?.UserName || 'User'
    return name.slice(0, 2).toUpperCase()
  }, [userFromLocalStorage])

  return (
    <>
      <ModalLogout
        setModalOpen={setLogoutDrawerVisible}
        modalOpen={logoutDrawerVisible}
        confirmLogout={confirmLogout}
      />
      <ModalChangePassword
        modalOpen={passwordModalVisible}
        setModalOpen={setPasswordModalVisible}
        userId={
          userFromLocalStorage?.UserId ||
          userFromLocalStorage?.EmpID ||
          userFromLocalStorage?.login ||
          userFromLocalStorage?.UserName
        }
      />

      {!isMobile ? (
        <aside
          aria-label="Main Sidebar"
          className={`flex h-full select-none shrink-0 bg-slate-50 relative ${
            isResizing ? 'cursor-col-resize select-none' : ''
          }`}
        >
          <div className="flex h-full w-10 min-w-10 max-w-10 shrink-0 flex-col justify-between border-r border-slate-200/90 bg-slate-50 z-30 relative">
            <div className="flex flex-col h-full w-full">
              {/* Shortcut Icons & Utilities */}
              <div className="flex-1 w-full overflow-y-auto overflow-x-hidden scroll-container flex flex-col items-center">
                {/* Home Shortcut */}
                {(() => {
                  const isHomeActive =
                    !menu &&
                    isMenu === null &&
                    (location.pathname === '/erp/u/home' || location.pathname === '/')

                  return (
                    <Tooltip title={t('Trang chủ')} className="w-full">
                      <button
                        type="button"
                        onMouseEnter={() => preloadRoute('/erp/u/home')}
                        onClick={(e) => handleSafeClick(e, '/erp/u/home', 'home')}
                        className={`w-full h-10 flex items-center justify-center border-b border-slate-200 transition-colors cursor-pointer ${
                          isHomeActive
                            ? 'bg-slate-200 text-slate-900 font-semibold'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Home size={15} strokeWidth={1.75} />
                      </button>
                    </Tooltip>
                  )
                })()}

                {/* All Modules / Overview Toggle */}
                {(() => {
                  const isAllModulesActive = Boolean(menu)

                  return (
                    <Tooltip title={t('Tất cả chức năng')} className="w-full">
                      <button
                        type="button"
                        onClick={handleToggleMenuRootList}
                        className={`w-full h-10 flex items-center justify-center border-b border-slate-200 transition-colors cursor-pointer ${
                          isAllModulesActive
                            ? 'bg-slate-200 text-slate-900 font-semibold'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <LayoutGrid size={15} strokeWidth={1.75} />
                      </button>
                    </Tooltip>
                  )
                })()}

                {/* Root Modules Quick Icons */}
                {(Array.isArray(rootMenu) ? rootMenu : []).map((item) => {
                  if (item?.View === true && item.RootMenuUtilities) {
                    const isUtilityActive = !menu && isMenu === item.RootMenuKey

                    return (
                      <Tooltip
                        key={item.RootMenuKey}
                        title={t(item.RootMenuLabel)}
                        className="w-full"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleOnClickRootMenuItem(item, e)}
                          className={`w-full h-10 flex items-center justify-center border-b border-slate-200 transition-colors cursor-pointer ${
                            isUtilityActive
                              ? 'bg-slate-200 text-slate-900 font-semibold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {getMenuIcon(item.RootMenuIcon, '', 15)}
                        </button>
                      </Tooltip>
                    )
                  }
                  return null
                })}
              </div>

              {/* User Account / Dropdown at Bottom */}
              <div
                className="relative w-full h-10 flex items-center justify-center border-t border-slate-200 shrink-0"
                ref={userDropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="size-[28px] w-[28px] h-[28px] rounded-[3px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer select-none"
                  title={userFromLocalStorage?.UserName || 'Tài khoản'}
                >
                  {userInitials}
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute left-full ml-2 bottom-0 z-50 w-64 rounded-[4px] border border-slate-200 bg-white p-1 text-slate-950 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
                    role="menu"
                  >
                    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 mb-1 bg-slate-50/50">
                      <div className="size-[32px] w-[32px] h-[32px] rounded-[3px] bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-300/80">
                        {userInitials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {userFromLocalStorage?.UserName || 'User'}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          ID: {userFromLocalStorage?.UserId || 'user'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onMouseEnter={() => preloadRoute('/erp/u/setting')}
                      onClick={handleClickSetting}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-700 rounded-[3px] hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                    >
                      <Settings size={15} className="text-slate-500 shrink-0" strokeWidth={1.75} />
                      <span>{t('Cài đặt cá nhân')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={openModalChangePassword}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-700 rounded-[3px] hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-left font-medium"
                    >
                      <Key size={15} className="text-slate-500 shrink-0" strokeWidth={1.75} />
                      <span>{t('Đổi mật khẩu')}</span>
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={openModalShowLogout}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-rose-600 rounded-[3px] hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left font-semibold"
                    >
                      <LogOut size={15} className="text-rose-500 shrink-0" strokeWidth={1.75} />
                      <span>{t('Đăng xuất')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLUMN 2A: ALL MODULES OVERVIEW PANEL (RESIZABLE)                         */}
          {/* ========================================================================= */}
          {!isMenu && menu && (
            <div
              style={{
                width: `${sidebarWidth}px`,
                minWidth: `${sidebarWidth}px`,
                maxWidth: `${sidebarWidth}px`
              }}
              className="shrink-0 h-full flex flex-col bg-[#f8fafc] border-r border-slate-200/90 overflow-hidden relative select-none animate-in fade-in-0 duration-150"
            >
              {/* Header */}
              <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200/90 bg-slate-100/70 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-1.5 rounded-[1px] bg-slate-700 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate tracking-tight">
                    {t('Tất cả chức năng')}
                  </span>
                </div>
                <SidebarContent collapsed={collapsed} toggleSidebar={handleToggleMenuRootList} />
              </div>

              {/* Modules List */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-container p-2 flex flex-col gap-0.5">
                {rootMenuOverviewList.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    {t('Không có chức năng')}
                  </div>
                ) : (
                  rootMenuOverviewList.map((item) => (
                    <button
                      key={item.RootMenuKey}
                      type="button"
                      onClick={(e) => handleOnClickRootMenuItem(item, e)}
                      className="flex w-full items-center justify-between rounded-[3px] px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 transition-colors duration-150 cursor-pointer group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="text-slate-400 group-hover:text-slate-800 shrink-0 transition-colors flex items-center">
                          {getMenuIcon(item?.RootMenuIcon, '', 15)}
                        </span>
                        <span className="text-[12.5px] font-medium tracking-normal truncate leading-normal">
                          {t(item?.RootMenuLabel)}
                        </span>
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-slate-400 shrink-0 group-hover:text-slate-600"
                      />
                    </button>
                  ))
                )}
              </div>

              {/* Drag Resizer Handle on right border */}
              <div
                onMouseDown={handleMouseDownResize}
                className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize hover:bg-blue-500/30 active:bg-blue-600/50 transition-colors z-40 group select-none"
                title={t('Kéo để thay đổi độ rộng')}
              >
                <div className="w-[1px] h-full bg-slate-200 group-hover:bg-blue-500 ml-auto transition-colors" />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* COLUMN 2B: MODULE SUBMENU TREE (RESIZABLE)                                */}
          {/* ========================================================================= */}
          {isMenu !== null && (
            <div
              style={
                collapsed
                  ? { width: '0px', minWidth: '0px', maxWidth: '0px' }
                  : {
                      width: `${sidebarWidth}px`,
                      minWidth: `${sidebarWidth}px`,
                      maxWidth: `${sidebarWidth}px`
                    }
              }
              className={`h-full flex flex-col bg-[#f8fafc] border-r border-slate-200/90 overflow-hidden shrink-0 relative select-none ${
                isResizing ? '' : 'transition-[width] duration-150'
              } ${collapsed ? 'border-none' : ''}`}
            >
              {!collapsed && (
                <>
                  {/* Module Header */}
                  <div className="h-10 px-3 flex items-center justify-between border-b border-slate-200/90 bg-slate-100/70 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-1.5 rounded-[1px] bg-slate-700 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate tracking-tight">
                        {t(labelMenu)}
                      </span>
                    </div>
                    <SidebarContent collapsed={collapsed} toggleSidebar={toggleSidebar} />
                  </div>

                  {/* Navigation Tree */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-container p-2 flex flex-col gap-0.5">
                    {currentModuleItems.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        {t('Không có menu')}
                      </div>
                    ) : (
                      currentModuleItems.map((item) => {
                        // Level 2: Submenu Accordion Group
                        if (item?.MenuType === 'submenu') {
                          const isOpen = openSubMenus[item.Id] ?? true
                          return (
                            <div key={item.Id} className="flex flex-col w-full">
                              <button
                                type="button"
                                onClick={(e) => toggleSubMenuKey(item.Id, e)}
                                className="flex w-full items-center justify-between rounded-[3px] px-2 py-1.5 text-left text-[12.5px] font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 transition-colors duration-150 cursor-pointer group"
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-slate-400 group-hover:text-slate-800 shrink-0 transition-colors flex items-center">
                                    {getMenuIcon(
                                      item?.MenuIcon ||
                                        item?.Icon ||
                                        (isOpen ? 'FolderOpenOutlined' : 'FolderOutlined'),
                                      '',
                                      15
                                    )}
                                  </span>
                                  <span className="text-[12.5px] font-medium tracking-normal truncate leading-normal">
                                    {t(item?.MenuLabel)}
                                  </span>
                                </span>
                                <ChevronRight
                                  size={14}
                                  className={`text-slate-400 shrink-0 transition-transform duration-150 ${
                                    isOpen ? 'rotate-90 text-slate-600' : ''
                                  }`}
                                />
                              </button>

                              {/* Nested Sub Items */}
                              {isOpen && (
                                <div className="ml-3.5 flex flex-col gap-0.5 border-l-2 border-slate-200/90 pl-2 my-0.5">
                                  {(Array.isArray(item?.subMenu) ? item.subMenu : [])
                                    .filter((subItem) => subItem?.View === true)
                                    .map((subItem) => {
                                      const hasNested =
                                        Array.isArray(subItem?.menuItems) &&
                                        subItem.menuItems.length > 0

                                      // Level 3: Nested sub-folder
                                      if (hasNested) {
                                        const subKey = `sub-menu-${subItem.Id || subItem.MenuKey}`
                                        const isSubOpen = openSubMenus[subKey] ?? true

                                        return (
                                          <div key={subKey} className="flex flex-col w-full">
                                            <button
                                              type="button"
                                              onClick={(e) => toggleSubMenuKey(subKey, e)}
                                              className="flex w-full items-center justify-between rounded-[3px] px-2 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 transition-colors duration-150 cursor-pointer group"
                                            >
                                              <span className="flex items-center gap-2 min-w-0">
                                                <span className="text-slate-400 group-hover:text-slate-800 shrink-0 transition-colors flex items-center">
                                                  {getMenuIcon(
                                                    subItem?.MenuIcon ||
                                                      subItem?.Icon ||
                                                      (isSubOpen
                                                        ? 'FolderOpenOutlined'
                                                        : 'FolderOutlined'),
                                                    '',
                                                    14
                                                  )}
                                                </span>
                                                <span className="text-xs truncate leading-normal tracking-normal">
                                                  {t(subItem.MenuLabel)}
                                                </span>
                                              </span>
                                              <ChevronRight
                                                size={13}
                                                className={`text-slate-400 shrink-0 transition-transform duration-150 ${
                                                  isSubOpen ? 'rotate-90 text-slate-600' : ''
                                                }`}
                                              />
                                            </button>

                                            {/* Level 4 items */}
                                            {isSubOpen && (
                                              <div className="ml-2.5 flex flex-col gap-0.5 border-l-2 border-slate-200/80 pl-2 my-0.5">
                                                {subItem.menuItems
                                                  .filter((mItem) => mItem?.View === true)
                                                  .map((mItem) => {
                                                    const isItemActive =
                                                      currentAction ===
                                                        (mItem.MenuKey || mItem.Id) ||
                                                      (mItem.MenuLink &&
                                                        location.pathname === mItem.MenuLink)

                                                    const hasCustomIcon = Boolean(
                                                      mItem?.MenuIcon || mItem?.Icon
                                                    )

                                                    return (
                                                      <a
                                                        key={mItem.MenuKey || mItem.Id}
                                                        href={mItem.MenuLink || '#'}
                                                        onMouseEnter={() =>
                                                          preloadRoute(mItem.MenuLink)
                                                        }
                                                        onClick={(e) => {
                                                          handleSafeClick(
                                                            e,
                                                            mItem.MenuLink,
                                                            mItem.MenuKey || mItem.Id
                                                          )
                                                        }}
                                                        className={`flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-xs leading-normal transition-colors duration-150 cursor-pointer font-medium ${
                                                          isItemActive
                                                            ? 'bg-slate-200/90 text-slate-900 font-semibold'
                                                            : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                                                        }`}
                                                      >
                                                        {hasCustomIcon ? (
                                                          <span className="shrink-0 flex items-center">
                                                            {getMenuIcon(
                                                              mItem.MenuIcon || mItem.Icon,
                                                              isItemActive
                                                                ? 'text-slate-900'
                                                                : 'text-slate-400',
                                                              13
                                                            )}
                                                          </span>
                                                        ) : (
                                                          <span
                                                            className={`size-1.5 rounded-[1px] shrink-0 ${
                                                              isItemActive
                                                                ? 'bg-slate-800'
                                                                : 'bg-slate-300'
                                                            }`}
                                                          />
                                                        )}
                                                        <span className="text-xs truncate leading-normal tracking-normal min-w-0">
                                                          {t(mItem.MenuLabel)}
                                                        </span>
                                                      </a>
                                                    )
                                                  })}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      }

                                      // Level 3: Direct menu item in submenu (leaf item)
                                      const isSubActive =
                                        currentAction === (subItem.MenuKey || subItem.Id) ||
                                        (subItem.MenuLink && location.pathname === subItem.MenuLink)

                                      const hasCustomSubIcon = Boolean(
                                        subItem?.MenuIcon || subItem?.Icon
                                      )

                                      return (
                                        <a
                                          key={subItem.MenuKey || subItem.Id}
                                          href={subItem.MenuLink || '#'}
                                          onMouseEnter={() => preloadRoute(subItem.MenuLink)}
                                          onClick={(e) => {
                                            handleSafeClick(
                                              e,
                                              subItem.MenuLink,
                                              subItem.MenuKey || subItem.Id
                                            )
                                          }}
                                          className={`flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-xs leading-normal transition-colors duration-150 cursor-pointer font-medium ${
                                            isSubActive
                                              ? 'bg-slate-200/90 text-slate-900 font-semibold'
                                              : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                                          }`}
                                        >
                                          {hasCustomSubIcon ? (
                                            <span className="shrink-0 flex items-center">
                                              {getMenuIcon(
                                                subItem.MenuIcon || subItem.Icon,
                                                isSubActive ? 'text-slate-900' : 'text-slate-400',
                                                14
                                              )}
                                            </span>
                                          ) : (
                                            <span
                                              className={`size-1.5 rounded-[1px] shrink-0 ${
                                                isSubActive ? 'bg-slate-800' : 'bg-slate-300'
                                              }`}
                                            />
                                          )}
                                          <span className="text-xs truncate leading-normal tracking-normal min-w-0">
                                            {t(subItem.MenuLabel)}
                                          </span>
                                        </a>
                                      )
                                    })}
                                </div>
                              )}
                            </div>
                          )
                        }

                        // Level 2: Direct Menu Item
                        if (item?.MenuType === 'menu') {
                          const isMenuActive =
                            currentAction === item.Id ||
                            (item.MenuLink && location.pathname === item.MenuLink)

                          const hasCustomMenuIcon = Boolean(item?.MenuIcon || item?.Icon)

                          return (
                            <a
                              key={item.Id}
                              href={item.MenuLink || '#'}
                              onMouseEnter={() => preloadRoute(item.MenuLink)}
                              onClick={(e) => {
                                handleSafeClick(e, item.MenuLink, item.Id)
                              }}
                              className={`flex w-full items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-xs leading-normal transition-colors duration-150 cursor-pointer font-medium ${
                                isMenuActive
                                  ? 'bg-slate-200/90 text-slate-900 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                              }`}
                            >
                              {hasCustomMenuIcon ? (
                                <span className="shrink-0 flex items-center">
                                  {getMenuIcon(
                                    item.MenuIcon || item.Icon,
                                    isMenuActive ? 'text-slate-900' : 'text-slate-400',
                                    15
                                  )}
                                </span>
                              ) : (
                                <Folder size={15} className="text-slate-400 shrink-0" />
                              )}
                              <span className="font-medium tracking-normal text-xs truncate leading-normal min-w-0">
                                {t(item.MenuLabel)}
                              </span>
                            </a>
                          )
                        }

                        return null
                      })
                    )}
                  </div>

                  {/* Drag Resizer Handle on right border */}
                  <div
                    onMouseDown={handleMouseDownResize}
                    className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize hover:bg-blue-500/30 active:bg-blue-600/50 transition-colors z-40 group select-none"
                    title={t('Kéo để thay đổi độ rộng')}
                  >
                    <div className="w-[1px] h-full bg-slate-200 group-hover:bg-blue-500 ml-auto transition-colors" />
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      ) : (
        <footer className="fixed bottom-0 z-50 w-full bg-white border-t border-slate-200 pt-2 pb-6 px-4" />
      )}
    </>
  )
}

export default memo(Sidebar)
