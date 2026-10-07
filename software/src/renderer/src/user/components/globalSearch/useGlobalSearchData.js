import { useState, useEffect } from 'react'
import decodeJWT from '../../../utils/decode-JWT'
import { getMenuData, saveMenuData } from '../../../IndexedDB/loadMenuData'

/**
 * useGlobalSearchData - Hook tổng hợp và chuẩn hóa danh mục Menu ERP
 * Tự động đồng bộ và nạp trực tiếp từ IndexedDB cho tốc độ truy vấn tối đa
 */
export function useGlobalSearchData({ permissions = [], rootMenu = [] } = {}) {
  const [menuItems, setMenuItems] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadAndProcessMenu = async () => {
      try {
        let rawSettingItems = permissions
        let rawRootMenu = rootMenu

        // 1. Đọc cấu trúc đã lưu trong IndexedDB trước
        const idbRecord = await getMenuData()
        if (idbRecord) {
          if (!rawSettingItems || rawSettingItems.length === 0) {
            rawSettingItems = idbRecord.settingItems || []
          }
          if (!rawRootMenu || rawRootMenu.length === 0) {
            rawRootMenu = idbRecord.rootMenuItems || []
          }
        }

        // 2. Nếu chưa có, sử dụng permissions và rootMenu từ props
        if (!rawSettingItems || rawSettingItems.length === 0) {
          rawSettingItems = permissions || []
          rawRootMenu = rootMenu || []
        }

        // Tạo Map tra cứu submenu cha
        const subMap = new Map(
          (rawSettingItems || [])
            .filter((m) => m && m.MenuType === 'submenu')
            .map((s) => [s.Id || s.MenuId, s.MenuLabel || ''])
        )

        const flatMenus = []
        const addedKeys = new Set()

        // 3. Phẳng hóa toàn bộ Menu items cấp thực thi của hệ thống
        ;(rawSettingItems || []).forEach((item) => {
          if (!item || !item.MenuLink) return
          const key = item.Id || item.MenuKey || item.MenuLink
          if (addedKeys.has(key)) return
          addedKeys.add(key)

          const parentName = subMap.get(item.MenuSubRootId) || ''
          const breadcrumbParts = [parentName, item.MenuLabel].filter(Boolean)
          const breadcrumb = breadcrumbParts.join(' > ')

          flatMenus.push({
            id: `menu_${key}`,
            title: item.MenuLabel || item.MenuKey,
            description: breadcrumb || item.MenuLink,
            path: item.MenuLink,
            icon: item.Icon || item.MenuIcon || 'Folder',
            menuKey: item.MenuKey,
            menuType: item.MenuType || 'menu',
            parentName: parentName,
            orderSeq: item.OrderSeq || 0,
            keywords:
              `${item.MenuLabel || ''} ${item.MenuKey || ''} ${breadcrumb} ${item.MenuLink}`.toLowerCase()
          })
        })

        flatMenus.sort((a, b) => a.orderSeq - b.orderSeq || a.title.localeCompare(b.title))

        if (isMounted) {
          setMenuItems(flatMenus)
        }
      } catch (err) {
        console.warn('Lỗi nạp cấu trúc Menu từ IndexedDB:', err)
      }
    }

    loadAndProcessMenu()

    return () => {
      isMounted = false
    }
  }, [permissions, rootMenu])

  return {
    menuItems
  }
}
