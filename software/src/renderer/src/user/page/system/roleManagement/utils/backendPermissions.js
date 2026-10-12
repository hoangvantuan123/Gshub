import { asBoolean, recordId } from './permissionRows.js'

export function buildActionRows(catalog, granted, menuId, groupId, menuName = '') {
  const definitions = new Map()
  const grantsByKey = new Map()
  for (const action of catalog) {
    const key = String(action.ActionCode || action.ActionKey || action.Key || '')
      .trim()
      .toUpperCase()
    if (key) definitions.set(key, action)
  }
  for (const permission of granted) {
    const key = String(permission.ActionKey || permission.Name || permission.ActionCode || '')
      .trim()
      .toUpperCase()
    if (key && !definitions.has(key)) definitions.set(key, permission)
    if (key && !grantsByKey.has(key)) grantsByKey.set(key, permission)
  }
  return [...definitions]
    .sort(([, a], [, b]) => Number(a.IdxNo || 0) - Number(b.IdxNo || 0))
    .map(([key, definition], index) => {
      const permission = grantsByKey.get(key)
      return {
        ...definition,
        Id: permission?.Id ? String(permission.Id) : '',
        RoleRecordId: permission?.Id ? String(permission.Id) : '',
        ActionKey: key,
        Key: key,
        ActionName: definition.ActionName || permission?.ActionName || key,
        Description: definition.Comment || definition.Description || '',
        Allow: asBoolean(permission?.Allow ?? permission?.View),
        MenuId: String(menuId),
        MenuName: menuName,
        GroupId: String(groupId),
        RowVersion: Number(permission?.RowVersion || 1),
        IdxNo: index + 1,
        WorkingTag: '',
        Status: '',
        isEdited: false
      }
    })
}

function parse(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function records(value) {
  const data = parse(value)
  if (Array.isArray(data)) return data.flatMap(records)
  if (!data || typeof data !== 'object') return []
  if (data.data !== undefined) return records(data.data)
  return [data]
}

function identity(row) {
  const type = String(row.Type || row.Sheet || '').toLowerCase()
  const group = String(row.GroupId)
  if (type === 'root' || type === 'rootmenu') return `${group}:root:${row.RootMenuId}`
  if (type === 'action') return `${group}:action:${row.MenuId}:${String(row.Name).toUpperCase()}`
  if (type === 'user') return `${group}:user:${row.UserId || row.UserSeq}`
  return `${group}:menu:${row.MenuId}`
}

// RoleSaveBatch returns each A/U/D result; RoleA and RoleU contain nested arrays.
// Only acknowledged rows are reconciled, including when a later batch step fails.
export function reconcilePermissionRows(rows, sheet, batch, response) {
  const payload = parse(response?.data)
  const steps = payload?.result || {}
  const inserted = new Map()
  const updated = new Map()
  const removed = new Set()
  for (const key of ['insert', 'update']) {
    const step = steps[key]
    if (!step?.data) {
      if (response.success && batch[key].length)
        throw new Error('BE chưa trả đầy đủ các dòng đã lưu.')
      continue
    }
    const savedRows = records(step.data)
    if (savedRows.length !== batch[key].length || savedRows.some((row) => !row.Id)) {
      throw new Error('BE chưa trả đầy đủ ID của các dòng đã lưu.')
    }
    savedRows.forEach((saved, index) => {
      const request = batch[key][index]
      if (key === 'insert') inserted.set(identity(request), saved)
      else updated.set(String(request.Id), saved)
    })
  }
  for (const result of records(steps.delete?.data)) {
    for (const id of result.DeletedIds || []) removed.add(String(id))
  }
  if (response.success && batch.delete.some((row) => !removed.has(String(row.Id)))) {
    throw new Error('BE chưa xác nhận các ID đã xóa.')
  }
  return rows.flatMap((row) => {
    const id = recordId(row, sheet)
    if (id && removed.has(String(id))) {
      if (sheet === 'users') return []
      return [
        {
          ...row,
          RoleRecordId: null,
          View: false,
          CanView: false,
          Allow: false,
          WorkingTag: '',
          Status: '',
          isEdited: false
        }
      ]
    }
    const submitted =
      !id && ['A', 'U'].includes(row.WorkingTag || row.Status)
        ? batch.insert.find((item) => {
            if (sheet === 'users')
              return String(item.UserId || item.UserSeq) === String(row.UserId || row.UserSeq)
            if (sheet === 'actions')
              return (
                String(item.MenuId) === String(row.MenuId) &&
                item.Name === String(row.ActionKey || row.Key || row.ActionCode)
              )
            return (
              String(item.Type === 'rootmenu' ? item.RootMenuId : item.MenuId) ===
                String(row.RawId || row.MenuId) &&
              (item.Type === 'rootmenu') === (row.MenuType === 'Phân hệ')
            )
          })
        : null
    const saved =
      (id && updated.get(String(id))) || (submitted && inserted.get(identity(submitted)))
    if (!saved) return [row]
    const next = {
      ...row,
      RoleRecordId: String(saved.Id),
      RowVersion: Number(saved.RowVersion ?? row.RowVersion ?? 1),
      WorkingTag: '',
      Status: '',
      isEdited: false
    }
    for (const key of ['GroupId', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt']) {
      if (saved[key] !== undefined && saved[key] !== null) next[key] = saved[key]
    }
    if (sheet === 'users') {
      next.Id = String(saved.Id)
      next.UserId = saved.UserId ?? row.UserId
      next.UserSeq = saved.UserSeq ?? row.UserSeq
    } else if (sheet === 'actions') next.Allow = asBoolean(saved.View ?? saved.Allow)
    else {
      next.View = asBoolean(saved.View)
      next.CanView = next.View
      for (const key of ['Create', 'Edit', 'Delete'])
        if (saved[key] !== undefined) next[key] = asBoolean(saved[key])
    }
    return [next]
  })
}
