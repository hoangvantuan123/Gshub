export function buildComprehensiveMenuTree(rootList = [], menuList = []) {
  if (!Array.isArray(rootList) || rootList.length === 0) {
    return buildMenuTreeFromFlatRows(menuList)
  }

  const rootMap = new Map()
  const subMap = new Map()
  const tree = []

  // 1. Level 0: Phân Hệ Lớn (Root Modules)
  for (const rm of rootList) {
    const rmId = String(rm.RootMenuId || rm.Id || '')
    const label = rm.RootMenuLabel || rm.RootMenuName || rm.Label || rm.Name || `Phân hệ ${rmId}`
    const key = rm.RootMenuKey || rm.Key || `root_${rmId}`
    const rootNode = {
      ...rm,
      Id: `root_${rmId}`,
      RawId: rmId,
      RootMenuId: rmId,
      MenuId: `root_${rmId}`,
      Key: key,
      MenuKey: key,
      Label: label,
      RawLabel: label,
      Type: 'Phân hệ',
      MenuType: 'Phân hệ',
      Level: 0,
      IsGroup: true,
      View: Boolean(rm.View ?? rm.CanView),
      OrderSeq: rm.IdxNo || rm.OrderSeq || 1,
      Children: []
    }
    rootMap.set(rmId, rootNode)
    tree.push(rootNode)
  }

  // 2. Level 1: Submenus & Menu Groups
  for (const m of menuList) {
    const isSub = m.Type === 'submenu' || m.MenuType === 'submenu'
    if (isSub) {
      const id = String(m.MenuId || m.Id || '')
      const rootId = String(m.RootMenuId || m.MenuRootId || '')
      const label = m.MenuLabel || m.Label || m.Name || ''
      const key = m.MenuKey || m.Key || ''
      const subNode = {
        ...m,
        Id: id,
        RawId: id,
        MenuId: id,
        RootMenuId: rootId,
        Key: key,
        MenuKey: key,
        Label: label,
        RawLabel: label,
        Type: 'Submenu',
        MenuType: 'Submenu',
        Level: 1,
        IsGroup: true,
        View: Boolean(m.View ?? m.CanView),
        Children: []
      }
      subMap.set(id, subNode)
    }
  }

  for (const subNode of subMap.values()) {
    const parentId = String(subNode.MenuSubRootId || subNode.ParentId || '')
    const parent = subMap.get(parentId) || rootMap.get(subNode.RootMenuId)
    if (parent && parent !== subNode) parent.Children.push(subNode)
    else tree.push(subNode)
  }

  // 3. Level 2 (hoặc 1 nếu không có submenu): Menu Chi Tiết
  for (const m of menuList) {
    const isSub = m.Type === 'submenu' || m.MenuType === 'submenu'
    if (!isSub) {
      const id = String(m.MenuId || m.Id || '')
      const rootId = String(m.RootMenuId || m.MenuRootId || '')
      const subId = String(m.MenuSubRootId || m.ParentId || '0')
      const label = m.MenuLabel || m.Label || m.Name || ''
      const key = m.MenuKey || m.Key || ''
      const menuNode = {
        ...m,
        Id: id,
        RawId: id,
        MenuId: id,
        RootMenuId: rootId,
        MenuSubRootId: subId,
        Key: key,
        MenuKey: key,
        Label: label,
        RawLabel: label,
        Type: 'Menu',
        MenuType: 'Menu',
        Level: subId !== '0' && subId !== '' && subMap.has(subId) ? 2 : 1,
        IsGroup: false,
        View: Boolean(m.View ?? m.CanView),
        Children: []
      }

      if (subId !== '0' && subId !== '' && subMap.has(subId)) {
        subMap.get(subId).Children.push(menuNode)
      } else if (rootMap.has(rootId)) {
        rootMap.get(rootId).Children.push(menuNode)
      } else {
        tree.push(menuNode)
      }
    }
  }

  return tree
}

export function buildMenuTreeFromFlatRows(flatRows = []) {
  if (!Array.isArray(flatRows) || flatRows.length === 0) return []

  const tree = []
  const nodeMap = new Map()

  for (const row of flatRows) {
    const id = row.Id != null ? row.Id : row.Key
    const level =
      typeof row.Level === 'number'
        ? row.Level
        : row.Type === 'submenu'
          ? 0
          : row.Type === 'menu'
            ? 1
            : 2
    const isGroupType = level === 0 || row.Type === 'submenu'

    const node = {
      ...row,
      Id: id,
      Key: row.Key || String(id),
      Label: row.Label || row.SubmenuName || row.Key,
      RootMenuId: row.RootMenuId,
      Level: level,
      OrderNo: row.OrderNo || 0,
      Type: level === 0 ? 'Submenu' : level === 1 ? 'Menu' : 'MenuItem',
      Link: row.Link || '',
      IsGroup: isGroupType,
      View: Boolean(row.View ?? row.CanView),
      Children: []
    }
    nodeMap.set(String(id), node)
  }

  for (const row of flatRows) {
    const id = String(row.Id != null ? row.Id : row.Key)
    const node = nodeMap.get(id)
    if (!node) continue

    let parentNode = null
    if (row.ParentId != null && row.ParentId !== 0 && row.ParentId !== '') {
      parentNode = nodeMap.get(String(row.ParentId))
    } else if (row.ParentKey) {
      parentNode = nodeMap.get(String(row.ParentKey))
    }

    if (parentNode && parentNode.Id !== node.Id) {
      parentNode.Children.push(node)
      parentNode.IsGroup = true
    } else if (node.Level === 0 || row.Type === 'submenu' || (!row.ParentId && !row.ParentKey)) {
      tree.push(node)
    }
  }

  return tree
}

export function flattenMenuTree(tree = [], expandedIds = new Set(), rootMenuId = null) {
  const result = []

  function traverse(nodes, depth = 0) {
    for (const node of nodes) {
      if (
        rootMenuId &&
        rootMenuId !== 'ALL' &&
        node.RootMenuId &&
        String(node.RootMenuId) !== String(rootMenuId) &&
        String(node.RawId) !== String(rootMenuId)
      ) {
        continue
      }

      const hasChildren = Array.isArray(node.Children) && node.Children.length > 0
      const isExpanded = expandedIds.has(node.Id)
      const count = hasChildren ? node.Children.length : 0

      const displayPrefix = `${'    '.repeat(depth)}${hasChildren ? (isExpanded ? '▾ ' : '▸ ') : ''}`

      const countSuffix = ''
      const treeDisplay = `${displayPrefix}${node.RawLabel || node.Label}${countSuffix}`

      result.push({
        ...node,
        Level: depth,
        OrderSeq: node.OrderSeq ?? node.OrderNo ?? node.IdxNo ?? '',
        MenuId: node.RawId || node.Id,
        MenuKey: node.Key,
        MenuLabel: treeDisplay,
        RawLabel: node.RawLabel || node.Label,
        MenuType: node.MenuType || node.Type,
        _depth: depth,
        _hasChildren: hasChildren,
        _isExpanded: isExpanded,
        _childCount: count
      })

      if (hasChildren && isExpanded) {
        traverse(node.Children, depth + 1)
      }
    }
  }

  traverse(tree, 0)
  return result
}

export function getFlatMenuList(flatOrTree = [], rootMenuId = null) {
  if (Array.isArray(flatOrTree) && flatOrTree.length > 0 && flatOrTree[0].Type) {
    return flatOrTree
      .filter((r) => r.Type !== 'submenu')
      .filter((r) => !rootMenuId || r.RootMenuId === rootMenuId)
      .map((r) => ({
        ...r,
        MenuId: r.Id,
        MenuKey: r.Key,
        MenuSubRootName: r.SubmenuName || '',
        MenuLabel: r.Label,
        RawLabel: r.Label,
        MenuType: r.Type === 'menuitem' ? 'MenuItem' : 'Menu'
      }))
  }

  const result = []
  function traverse(nodes, currentSubmenu = '') {
    for (const node of nodes) {
      if (rootMenuId && node.RootMenuId && node.RootMenuId !== rootMenuId) {
        continue
      }
      const submenuName = node.Level === 0 ? node.Label : currentSubmenu
      if (!node.IsGroup && (!node.Children || node.Children.length === 0)) {
        result.push({
          ...node,
          MenuId: node.Id,
          MenuKey: node.Key,
          MenuSubRootName: submenuName,
          MenuLabel: node.Label,
          RawLabel: node.Label,
          MenuType: node.Type
        })
      }
      if (node.Children && node.Children.length > 0) {
        traverse(node.Children, submenuName)
      }
    }
  }
  traverse(flatOrTree, '')
  return result
}

export const getAllGroupIds = (nodes = []) => {
  const ids = []
  const walk = (items) => {
    for (const item of items) {
      if (item.IsGroup || (Array.isArray(item.Children) && item.Children.length > 0)) {
        ids.push(item.Id)
        if (item.Children) walk(item.Children)
      }
    }
  }
  walk(nodes)
  return ids
}
