import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePagePermissions } from './usePagePermissions.js'
import { mergeWithDefaultMenuConfig } from '../../config/menuConfig.js'

function pageRights(rows, menuKey) {
  const { settingItems } = mergeWithDefaultMenuConfig(rows)
  let rights
  function Page() {
    rights = usePagePermissions({ permissions: settingItems, menuKey, canView: true })
    return null
  }
  renderToStaticMarkup(createElement(Page))
  return rights
}

for (const [catalogueKey, pageKey] of [
  ['system_root_modules', 'system_modules'],
  ['system_menus', 'menu_registry'],
  ['system_actions', 'system_actions']
]) {
  test(`${catalogueKey}: search and existing write actions survive login normalization`, () => {
    const rights = pageRights(
      [
        {
          MenuKey: catalogueKey,
          View: true,
          Create: true,
          Edit: true,
          Delete: true,
          actions: { BTN_VIEW: true, BTN_CREATE: true, BTN_EDIT: true, BTN_DELETE: true }
        }
      ],
      pageKey
    )
    assert.equal(rights.canSearch, true)
    assert.equal(rights.canSave, true)
    assert.equal(rights.canCreate, true)
    assert.equal(rights.canEdit, true)
    assert.equal(rights.canDelete, true)
  })
}

test('explicit Search denies remain denied after login normalization', () => {
  for (const declaration of [
    { Search: false },
    { Search: 'false' },
    { actions: { BTN_SEARCH: false } }
  ]) {
    const rights = pageRights(
      [{ MenuKey: 'system_menus', View: true, ...declaration }],
      'menu_registry'
    )
    assert.equal(rights.canView, true)
    assert.equal(rights.canSearch, false)
  }
})

test('View deny or missing menu cannot gain search through route props', () => {
  assert.equal(
    pageRights([{ MenuKey: 'system_menus', View: false }], 'menu_registry').canSearch,
    false
  )
  assert.equal(pageRights([{ MenuKey: 'other', View: true }], 'menu_registry').canSearch, false)
})

test('registration and detail query screens use independent menu grants', () => {
  const rows = [
    {
      MenuKey: 'report_registration',
      View: true,
      Create: true,
      actions: { BTN_SAVE: false, BTN_SEARCH: false },
      Export: false
    }
  ]
  const rights = pageRights(rows, 'report_registration')
  assert.equal(rights.canCreate, true)
  assert.equal(rights.canSave, false)
  assert.equal(rights.canSearch, false)
  assert.equal(rights.canExport, false)
  assert.equal(pageRights(rows, 'report_plan_query').canView, false)
  assert.equal(pageRights(rows, 'report_stat_query').canView, false)
  assert.equal(
    pageRights([{ MenuKey: 'report_plan_query', View: true }], 'report_plan_query').canSearch,
    true
  )
})
