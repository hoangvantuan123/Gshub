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
      const rootItem = rootMenu.find(
        (r) =>
          r &&
          (r.Id === item.MenuRootId ||
            r.RootMenuId === item.MenuRootId ||
            r.RootMenuKey === item.MenuKey)
      )
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
        View: item.View,
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
      const rootMenuItem = rootMenu.find(
        (root) => root && (root.Id === item.MenuRootId || root.RootMenuId === item.MenuRootId)
      )
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
          View: item.View,
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
