import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPermissionBatch, filterMenuRows, markEdited, setTreeView } from './permissionRows.js'
import { buildComprehensiveMenuTree, flattenMenuTree, getAllGroupIds } from './menuTree.js'

const rows = () => [
  {
    RawId: '1',
    MenuId: '1',
    RootMenuId: '1',
    RoleRecordId: '10',
    Level: 0,
    MenuType: 'Phân hệ',
    IsGroup: true,
    MenuLabel: 'Báo cáo',
    View: true
  },
  {
    RawId: '2',
    MenuId: '2',
    RootMenuId: '1',
    RoleRecordId: '20',
    Level: 1,
    MenuType: 'Submenu',
    IsGroup: true,
    MenuLabel: 'Báo cáo tổng hợp',
    View: true
  },
  {
    RawId: '3',
    MenuId: '3',
    RootMenuId: '1',
    RoleRecordId: '30',
    Level: 2,
    MenuType: 'Menu',
    MenuLabel: 'Kế hoạch sản xuất',
    MenuKey: 'summary_plan',
    View: true,
    CanView: true
  },
  {
    RawId: '4',
    MenuId: '4',
    RootMenuId: '1',
    Level: 2,
    MenuType: 'Menu',
    MenuLabel: 'Thống kê',
    View: false
  }
]

test('unchecking a submenu clears descendant View and persists false, despite legacy CanView', () => {
  const next = setTreeView(rows(), 1, false)
  const batch = buildPermissionBatch(next, 'menu', '5')
  assert.equal(next[2].CanView, false)
  assert.equal(next[2].WorkingTag, 'U')
  assert.equal(batch.update.length, 2)
  assert.equal(batch.update[0].Type, 'submenu')
  assert.equal(batch.update[1].View, false)
  assert.equal(batch.insert.length, 0)
})

test('granting a parent assigns A to missing records and U to saved records', () => {
  const next = setTreeView(rows(), 0, true)
  assert.equal(next[3].WorkingTag, 'A')
  const batch = buildPermissionBatch(next, 'menu', '5')
  assert.equal(batch.insert[0].MenuId, 4)
  assert.equal(batch.update[0].Id, 10)
})

test('granting a child enables its ancestors without changing siblings', () => {
  const input = rows().map((row) => ({ ...row, View: false, CanView: false }))
  const next = setTreeView(input, 2, true)
  assert.deepEqual(
    next.map((row) => row.View),
    [true, true, true, false]
  )
})

test('deleting saved permissions emits only D; deleting unsaved permissions does not send a catalogue ID', () => {
  const input = rows().map((row) => ({ ...row, WorkingTag: 'D' }))
  const batch = buildPermissionBatch(input, 'menu', '5')
  assert.deepEqual(
    batch.delete.map((row) => row.Id),
    [10, 20, 30]
  )
  assert.equal(batch.insert.length + batch.update.length, 0)
})

test('unchanged queried rows are never inserted again', () => {
  assert.deepEqual(buildPermissionBatch(rows(), 'menu', '5'), {
    insert: [],
    update: [],
    delete: []
  })
})

test('false View takes precedence over legacy true CanView', () => {
  const row = { ...rows()[2], View: false, CanView: true, WorkingTag: 'U' }
  assert.equal(buildPermissionBatch([row], 'menu', '5').update[0].View, false)
})

test('menu search ignores accents and keeps ancestor context and original row indices', () => {
  assert.deepEqual(filterMenuRows(rows(), 'ke hoach'), [0, 1, 2])
  assert.deepEqual(filterMenuRows(rows(), 'summary_plan'), [0, 1, 2])
  assert.deepEqual(filterMenuRows(rows(), '', '0'), [0, 1, 3])
  assert.deepEqual(filterMenuRows(rows(), 'không tồn tại'), [])
})

test('action and member batches use their own record IDs and preserve false permissions', () => {
  const action = markEdited(
    { RoleRecordId: '9', MenuId: '3', ActionKey: 'BTN_SAVE' },
    { Allow: false },
    'actions'
  )
  assert.equal(buildPermissionBatch([action], 'actions', '5').update[0].View, false)
  const member = markEdited({ UserId: 'user1' }, {}, 'users')
  assert.equal(member.WorkingTag, 'A')
  assert.equal(buildPermissionBatch([member], 'users', '5').insert[0].Type, 'user')
  assert.equal(markEdited({ WorkingTag: 'D' }, { View: true }).WorkingTag, 'D')
})

test('tree rebuilding preserves permission identity and supports nested submenus', () => {
  const root = { RootMenuId: '1', RoleRecordId: '99', RowVersion: 4, View: false, CanView: true }
  const menus = [
    { MenuId: '2', RootMenuId: '1', Type: 'submenu', Label: 'A' },
    { MenuId: '3', RootMenuId: '1', ParentId: '2', Type: 'submenu', Label: 'B' },
    { MenuId: '4', RootMenuId: '1', ParentId: '3', Type: 'menu', Label: 'C' }
  ]
  const tree = buildComprehensiveMenuTree([root], menus)
  const flat = flattenMenuTree(tree, new Set(getAllGroupIds(tree)))
  assert.equal(flat[0].RoleRecordId, '99')
  assert.equal(flat[0].RowVersion, 4)
  assert.equal(flat[0].View, false)
  assert.deepEqual(
    flat.map((row) => row.Level),
    [0, 1, 2, 3]
  )
})
