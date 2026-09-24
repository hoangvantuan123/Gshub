/* eslint-disable react/prop-types */
import { useMemo, memo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const BreadcrumbRouter = ({ menuTransForm, rootMenu }) => {
  const location = useLocation()
  const currentPath = location.pathname
  const { t } = useTranslation()

  const currentMenuName = useMemo(() => {
    const findRoute = (path, menus = []) => {
      if (!Array.isArray(menus)) return null
      for (const menu of menus) {
        if (menu?.MenuLink === path) {
          return menu
        }
        if (menu?.subMenu && Array.isArray(menu.subMenu)) {
          const subRoute = findRoute(path, menu.subMenu)
          if (subRoute) {
            return subRoute
          }
        }
        if (menu?.menuItems && Array.isArray(menu.menuItems)) {
          const itemRoute = findRoute(path, menu.menuItems)
          if (itemRoute) {
            return itemRoute
          }
        }
      }
      return null
    }

    // Khớp chính xác route
    const matched = findRoute(currentPath, rootMenu) || findRoute(currentPath, menuTransForm)
    if (matched) {
      return matched.MenuLabel || matched.RootMenuLabel || null
    }

    // Tìm kiếm phân đoạn route gần nhất nếu có param
    const parts = currentPath.split('/').filter(Boolean)
    for (let i = parts.length; i > 0; i--) {
      const subPath = '/' + parts.slice(0, i).join('/')
      const fallbackMatch = findRoute(subPath, rootMenu) || findRoute(subPath, menuTransForm)
      if (fallbackMatch) {
        return fallbackMatch.MenuLabel || fallbackMatch.RootMenuLabel || parts[i - 1]
      }
    }

    return null
  }, [currentPath, rootMenu, menuTransForm])

  const hideBreadcrumb =
    currentPath === '/' ||
    currentPath === '/erp/u/home' ||
    currentPath.startsWith('/erp/u/setting')

  if (hideBreadcrumb || !currentMenuName) {
    return null
  }

  return (
    <div className="flex items-center text-[10.5px] font-semibold text-slate-700 h-full select-none shrink-0">
      <span className="truncate">{t(currentMenuName)}</span>
    </div>
  )
}

export default memo(BreadcrumbRouter)
