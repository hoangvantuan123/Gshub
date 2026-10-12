export const asBoolean = (value) =>
  value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'

export const permissionType = (row) => {
  const type = String(row.MenuType || row.Type || '').toLowerCase()
  return type === 'phân hệ' || type === 'rootmenu'
    ? 'rootmenu'
    : type === 'submenu'
      ? 'submenu'
      : 'menu'
}

export const recordId = (row, sheet) => (sheet === 'users' ? row.Id : row.RoleRecordId)

export const markEdited = (row, changes, sheet = 'menu') => {
  if ((row.WorkingTag || row.Status) === 'D') return row
  const tag = recordId(row, sheet) ? 'U' : 'A'
  return { ...row, ...changes, WorkingTag: tag, Status: tag, isEdited: true }
}

export function setTreeView(rows, index, value) {
  const next = [...rows]
  const row = rows[index]
  if (!row || row.WorkingTag === 'D') return rows
  const level = Number(row.Level || 0)
  next[index] = markEdited(row, { View: value, CanView: value })
  if (row.IsGroup || permissionType(row) !== 'menu') {
    for (let i = index + 1; i < next.length && Number(next[i].Level) > level; i++) {
      if (asBoolean(next[i].View) !== value) {
        next[i] = markEdited(next[i], { View: value, CanView: value })
      }
    }
  }
  // A visible child requires every ancestor to be accessible.
  if (value) {
    let parentLevel = level
    for (let i = index - 1; i >= 0; i--) {
      if (Number(next[i].Level) < parentLevel) {
        if (!asBoolean(next[i].View)) {
          next[i] = markEdited(next[i], { View: true, CanView: true })
        }
        parentLevel = Number(next[i].Level)
        if (parentLevel === 0) break
      }
    }
  }
  return next
}

export function buildPermissionBatch(rows, sheet, groupId) {
  const batch = { insert: [], update: [], delete: [] }
  rows.forEach((row, index) => {
    const tag = row.WorkingTag || row.Status
    if (!['A', 'U', 'D'].includes(tag)) return
    const id = recordId(row, sheet)
    const type = sheet === 'users' ? 'user' : sheet === 'actions' ? 'action' : permissionType(row)
    const apiSheet = type === 'submenu' ? 'menu' : type
    if (tag === 'D') {
      if (id)
        batch.delete.push({
          Id: Number(id),
          Sheet: apiSheet,
          Type: type,
          RowVersion: Number(row.RowVersion || 1)
        })
      return
    }
    const item = {
      Sheet: apiSheet,
      Type: type,
      GroupId: Number(groupId),
      IdxNo: index + 1,
      RowVersion: Number(row.RowVersion || 1)
    }
    if (type === 'user') {
      if (!row.UserId && !row.UserSeq) throw new Error('Vui lòng chọn tài khoản cho dòng mới.')
      Object.assign(item, { UserId: String(row.UserId || ''), UserSeq: String(row.UserSeq || '') })
    } else if (type === 'action') {
      Object.assign(item, {
        MenuId: Number(row.MenuId),
        Name: String(row.ActionKey || row.Key || row.ActionCode || ''),
        View: asBoolean(row.Allow)
      })
      if (!item.MenuId || !item.Name)
        throw new Error('Quyền thao tác chưa có menu hoặc mã thao tác hợp lệ.')
    } else {
      const resourceId = Number(row.RawId || (type === 'rootmenu' ? row.RootMenuId : row.MenuId))
      if (!Number.isSafeInteger(resourceId) || resourceId <= 0)
        throw new Error('Menu chưa có mã hợp lệ từ hệ thống.')
      Object.assign(item, { View: asBoolean(row.View ?? row.CanView) })
      if (type === 'rootmenu') item.RootMenuId = resourceId
      else
        Object.assign(item, {
          MenuId: resourceId,
          RootMenuId: Number(row.RootMenuId || 0),
          Create: asBoolean(row.Create),
          Edit: asBoolean(row.Edit),
          Delete: asBoolean(row.Delete)
        })
    }
    if (id) batch.update.push({ ...item, Id: Number(id) })
    else batch.insert.push(item)
  })
  return batch
}

export const normalizeSearch = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

export function filterMenuRows(rows, query = '', view = '') {
  const text = normalizeSearch(query)
  if (!text && view === '') return rows.map((_, index) => index)
  const included = new Set()
  rows.forEach((row, index) => {
    const matchesText =
      !text ||
      normalizeSearch(`${row.RawLabel || row.MenuLabel} ${row.MenuKey} ${row.MenuType}`).includes(
        text
      )
    if (!matchesText || (view !== '' && asBoolean(row.View) !== (view === '1'))) return
    included.add(index)
    let level = Number(row.Level)
    for (let i = index - 1; i >= 0 && level > 0; i--) {
      if (Number(rows[i].Level) < level) {
        included.add(i)
        level = Number(rows[i].Level)
      }
    }
  })
  return [...included].sort((a, b) => a - b)
}
