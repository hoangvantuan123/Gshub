import { hasPendingChanges } from './permissionRows.js'

export function createActionDraftStore() {
  const drafts = new Map()
  const stage = (groupId, rows = []) => {
    const byMenu = new Map()
    for (const row of rows) {
      if (!row.MenuId) continue
      const menuId = String(row.MenuId)
      if (!byMenu.has(menuId)) byMenu.set(menuId, [])
      byMenu.get(menuId).push(row)
    }
    for (const [menuId, menuRows] of byMenu) {
      const key = `${groupId}:${menuId}`
      if (hasPendingChanges(menuRows)) drafts.set(key, { groupId: String(groupId), rows: menuRows })
      else drafts.delete(key)
    }
  }
  const collect = (groupId, currentRows = []) => {
    stage(groupId, currentRows)
    return [...drafts.values()]
      .filter((draft) => draft.groupId === String(groupId))
      .flatMap((draft) => draft.rows)
  }
  return {
    stage,
    collect,
    get: (groupId, menuId) => drafts.get(`${groupId}:${menuId}`)?.rows,
    has: (groupId, currentRows) => hasPendingChanges(collect(groupId, currentRows))
  }
}
