import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSidebarNavigation, getSidebarModuleItems } from './sidebarNavigation.js'
const root = (id, order, View = true) => ({
  RootMenuId: id,
  RootMenuKey: `module${id}`,
  OrderSeq: order,
  View,
  RootMenuUtilities: true
})
const menu = (id, rootId, order) => ({
  Id: id,
  MenuId: id,
  MenuRootId: rootId,
  MenuKey: `page${id}`,
  MenuLink: `/page/${id}`,
  OrderSeq: order,
  View: true
})

test('modules and menus follow server order, not numeric IDs', () => {
  const rows = [menu(21, 2, 7), menu(10, 1, 3), menu(22, 2, 1)]
  const result = buildSidebarNavigation([root(1, 8), root(2, 1)], rows, rows)
  assert.deepEqual(
    result.roots.map((row) => row.RootMenuId),
    [2, 1]
  )
  assert.deepEqual(
    getSidebarModuleItems(result, 'module2').map((row) => row.Id),
    [22, 21]
  )
  assert.deepEqual(getSidebarModuleItems(result, null), [])
})

test('stale visible tree nodes cannot override denied or missing account grants', () => {
  const rows = [menu(10, 1, 1), menu(11, 1, 2), menu(20, 2, 1)]
  const result = buildSidebarNavigation([root(1, 1), root(2, 2, false)], rows, [
    { ...rows[0], View: 'false' },
    rows[2]
  ])
  assert.deepEqual(result, { roots: [], menus: [] })
  assert.deepEqual(buildSidebarNavigation([root(1, 1)], rows, []), { roots: [], menus: [] })
})

test('folders are pruned when they contain no permitted functions', () => {
  const child = menu(11, 1, 1)
  const folder = {
    Id: 10,
    MenuId: 10,
    MenuKey: 'folder',
    MenuType: 'submenu',
    MenuRootId: 1,
    View: true,
    subMenu: [child]
  }
  assert.deepEqual(
    buildSidebarNavigation([root(1, 1)], [folder], [folder, { ...child, View: false }]),
    { roots: [], menus: [] }
  )
  const result = buildSidebarNavigation([root(1, 1)], [folder], [folder, child])
  assert.equal(result.menus[0].subMenu[0].Id, 11)
})

test('denied nested actions/pages are hidden, including numeric-string catalogue IDs', () => {
  const parent = menu('10', 1, 1)
  const child = menu('11', 1, 1)
  const result = buildSidebarNavigation(
    [root(1, 1)],
    [{ ...parent, menuItems: [child] }],
    [parent, { ...child, View: false }]
  )
  assert.equal(result.menus[0].menuItems.length, 0)
})
