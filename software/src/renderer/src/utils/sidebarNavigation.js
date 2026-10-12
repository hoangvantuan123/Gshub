import { resolveMenuOperation } from '../permissions.js'

const key = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^root_/, '')
const order = (row) => {
  const value = [row.OrderSeq, row.IdxNo].find(
    (value) => value !== undefined && value !== null && value !== ''
  )
  const number = Number(value)
  return Number.isFinite(number) ? number : Infinity
}
const sorted = (rows) =>
  rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => order(a.row) - order(b.row) || a.index - b.index)
    .map(({ row }) => row)

// Sidebar visibility and order come from the account snapshot, not cached labels.
export function buildSidebarNavigation(rootRows = [], menuTree = [], permissions = []) {
  const byId = new Map(),
    byKey = new Map()
  for (const grant of Array.isArray(permissions) ? permissions : []) {
    if (!grant) continue
    if (grant.MenuId != null || grant.Id != null) byId.set(String(grant.MenuId ?? grant.Id), grant)
    if (grant.MenuKey) byKey.set(String(grant.MenuKey).toLowerCase(), grant)
  }
  const filter = (rows) =>
    sorted(
      (Array.isArray(rows) ? rows : []).flatMap((node) => {
        if (!node) return []
        const grant =
          byId.get(String(node.Id)) || byKey.get(String(node.MenuKey || '').toLowerCase())
        if (!grant || !resolveMenuOperation(grant, 'View')) return []
        const subMenu = filter(node.subMenu),
          menuItems = filter(node.menuItems)
        const link = grant.NavigationOnly ? '' : grant.MenuLink || node.MenuLink || ''
        if (!link && !subMenu.length && !menuItems.length) return []
        return [
          {
            ...node,
            View: true,
            MenuLink: link,
            OrderSeq: grant.OrderSeq ?? node.OrderSeq,
            NavigationOnly: Boolean(grant.NavigationOnly),
            subMenu,
            menuItems
          }
        ]
      })
    )
  const roots = sorted(
    (Array.isArray(rootRows) ? rootRows : []).filter(
      (root) => root && resolveMenuOperation(root, 'View')
    )
  )
  const references = new Map(),
    groups = new Map()
  for (const root of roots) {
    for (const value of [root.RootMenuId, root.Id, root.RootMenuKey, root.Key]) {
      if (value !== undefined && value !== null && value !== '') references.set(key(value), root)
    }
    groups.set(root, [])
  }
  for (const node of filter(menuTree)) {
    const root =
      references.get(key(node.MenuRootId)) ||
      references.get(key(node.RootMenuKey)) ||
      references.get(key(node.MenuKey))
    if (root) groups.get(root).push(node)
  }
  const visibleRoots = roots.filter((root) => groups.get(root).length)
  return { roots: visibleRoots, menus: visibleRoots.flatMap((root) => sorted(groups.get(root))) }
}

export function getSidebarModuleItems(navigation, selectedRoot) {
  if (selectedRoot === undefined || selectedRoot === null || selectedRoot === '') return []
  const root = navigation.roots.find((root) =>
    [root.RootMenuKey, root.RootMenuId, root.Id].some(
      (value) =>
        value !== undefined && value !== null && value !== '' && key(value) === key(selectedRoot)
    )
  )
  if (!root) return []
  const references = new Set(
    [root.RootMenuKey, root.RootMenuId, root.Id]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map(key)
  )
  return navigation.menus.filter((node) =>
    [node.RootMenuKey, node.MenuRootId, node.MenuKey].some((value) => references.has(key(value)))
  )
}
