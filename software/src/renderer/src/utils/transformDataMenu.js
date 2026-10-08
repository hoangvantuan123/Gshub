function matchRootMenu(rootList, rootIdOrKey) {
  if (!Array.isArray(rootList) || rootIdOrKey === undefined || rootIdOrKey === null) return null
  const target = String(rootIdOrKey).trim().toLowerCase()
  return (
    rootList.find((r) => {
      if (!r) return false
      const rId = String(r.Id !== undefined ? r.Id : '')
        .trim()
        .toLowerCase()
      const rRootId = String(r.RootMenuId !== undefined ? r.RootMenuId : '')
        .trim()
        .toLowerCase()
      const rKey = String(r.RootMenuKey || r.Key || '')
        .trim()
        .toLowerCase()

      if (rId === target || rRootId === target || rKey === target) return true

      // Mapping tương đương giữa 1 <-> report <-> root_report
      if (
        (target === '1' || target === 'report' || target === 'root_report') &&
        (rId === '1' || rRootId === '1' || rKey === 'report' || rKey === 'root_report')
      ) {
        return true
      }

      // Mapping tương đương giữa 2 <-> system <-> root_system
      if (
        (target === '2' || target === 'system' || target === 'root_system') &&
        (rId === '2' || rRootId === '2' || rKey === 'system' || rKey === 'root_system')
      ) {
        return true
      }

      return false
    }) || null
  )
}

export function transformDataMenu(data = [], rootMenu = [], menuItemList = []) {
  if (!Array.isArray(data)) data = []
  if (!Array.isArray(rootMenu)) rootMenu = []
  if (!Array.isArray(menuItemList)) menuItemList = []

  const menuMap = new Map()
  const menuChildMap = new Map()
  const result = []

  // 1. Phân loại submenu (Cấp 2 - Nhóm cha trực tiếp dưới RootMenu)
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (item && item.MenuType === 'submenu') {
      const rootItem =
        matchRootMenu(rootMenu, item.MenuRootId) || matchRootMenu(rootMenu, item.MenuKey)
      const rootMenuKey = rootItem ? rootItem.RootMenuKey : item.MenuKey

      const subMenuObj = {
        Id: item.Id,
        MenuKey: item.MenuKey,
        RootMenuKey: rootMenuKey,
        MenuRootId: item.MenuRootId,
        MenuLabel: item.MenuLabel,
        MenuId: null,
        Icon: item.Icon || item.MenuIcon || '',
        MenuIcon: item.MenuIcon || item.Icon || '',
        MenuLink: item.MenuLink,
        MenuType: item.MenuType,
        View: item.View !== false,
        subMenu: [],
        OrderSeq: item.OrderSeq || 0
      }
      if (item.Id) menuMap.set(item.Id, subMenuObj)
      if (item.MenuId) menuMap.set(item.MenuId, subMenuObj)
      result.push(subMenuObj)
    }
  }

  // 2. Phân loại menu (Cấp 3) thuộc submenu hoặc trực tiếp dưới rootMenu
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (!item) continue

    if (item.MenuType === 'menu' && item.MenuSubRootId) {
      const parent = menuMap.get(item.MenuSubRootId)
      const menuObj = {
        Id: item.Id,
        MenuKey: item.MenuKey,
        MenuLabel: item.MenuLabel,
        MenuId: item.MenuSubRootId,
        Icon: item.Icon || item.MenuIcon || '',
        MenuIcon: item.MenuIcon || item.Icon || '',
        MenuLink: item.MenuLink,
        MenuType: item.MenuType,
        View: item.View,
        OrderSeq: item.OrderSeq || 0,
        menuItems: []
      }

      if (item.Id) menuChildMap.set(item.Id, menuObj)
      if (item.MenuId) menuChildMap.set(item.MenuId, menuObj)

      if (parent) {
        parent.subMenu.push(menuObj)
      }
    } else if (item.MenuType === 'menu' && item.MenuRootId && !item.MenuSubRootId) {
      const rootMenuItem = matchRootMenu(rootMenu, item.MenuRootId)
      if (rootMenuItem) {
        const menuObj = {
          Id: item.Id,
          MenuKey: item.MenuKey,
          MenuLabel: item.MenuLabel,
          MenuId: null,
          Icon: item.Icon || item.MenuIcon || '',
          MenuIcon: item.MenuIcon || item.Icon || '',
          MenuLink: item.MenuLink,
          MenuType: item.MenuType,
          View: item.View !== false,
          RootMenuKey: rootMenuItem.RootMenuKey,
          OrderSeq: item.OrderSeq || 0,
          menuItems: []
        }
        if (item.Id) menuChildMap.set(item.Id, menuObj)
        if (item.MenuId) menuChildMap.set(item.MenuId, menuObj)
        result.push(menuObj)
      }
    }
  }

  // 3. Ghép các menuItem (Cấp 4) vào menu cấp 3 tương ứng
  const allMenuItems = [
    ...data.filter((item) => item && item.MenuType === 'menuitem'),
    ...menuItemList.filter(Boolean)
  ]

  const addedKeys = new Map()

  for (let i = 0; i < allMenuItems.length; i++) {
    const item = allMenuItems[i]
    const parentId = item.MenuSubRootId || item.MenuId
    if (!parentId) continue

    const parentMenu = menuChildMap.get(parentId)
    if (parentMenu) {
      const key = item.Id ? `id_${item.Id}` : `key_${item.MenuKey}`
      if (!addedKeys.has(key)) {
        addedKeys.set(key, true)
        parentMenu.menuItems.push({
          Id: item.Id,
          MenuKey: item.MenuKey,
          MenuLabel: item.MenuLabel,
          MenuId: parentId,
          Icon: item.Icon || item.MenuIcon || '',
          MenuIcon: item.MenuIcon || item.Icon || '',
          MenuLink: item.MenuLink,
          MenuType: item.MenuType,
          View: item.View,
          OrderSeq: item.OrderSeq || 0
        })
      }
    }
  }

  // 4. Sắp xếp theo thứ tự OrderSeq
  result.sort((a, b) => a.OrderSeq - b.OrderSeq)

  for (let i = 0; i < result.length; i++) {
    const sub = result[i].subMenu
    if (Array.isArray(sub)) {
      sub.sort((a, b) => a.OrderSeq - b.OrderSeq)
      for (let j = 0; j < sub.length; j++) {
        if (Array.isArray(sub[j].menuItems)) {
          sub[j].menuItems.sort((a, b) => a.OrderSeq - b.OrderSeq)
        }
      }
    }
    if (Array.isArray(result[i].menuItems)) {
      result[i].menuItems.sort((a, b) => a.OrderSeq - b.OrderSeq)
    }
  }

  return result
}
