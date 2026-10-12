import { apiPost } from '../../services/apiClient'

export const ActionQ = async (data = {}, options = {}) => {
  const result = {
    ActionCode: data.ActionKey || data.ActionCode || data.keyword || '',
    ActionName: data.ActionName || '',
    KeyItem1: data.ActionKey || data.ActionCode || data.keyword || '',
    KeyItem2: data.ActionName || '',
    KeyItem3: data.Comment || data.Description || ''
  }
  const metadata = {
    ActionCode: data.ActionKey || data.ActionCode || '',
    ActionName: data.ActionName || '',
    keyword: data.keyword || '',
    PageSize: String(data.pageSize || data.PageSize || 1000),
    Page: String(data.page || data.Page || 1)
  }

  return apiPost(
    '/action/ActionQ',
    { result, metadata },
    options
  ).catch(() => apiPost('/role/PermActionsQ', { result, metadata }, options))
}

export const ActionA = async (data = {}, options = {}) => {
  const item = data.data || data
  const resultItem = {
    ActionCode: item.ActionKey || item.ActionCode || '',
    ActionName: item.ActionName || '',
    Comment: item.Description || item.Comment || '',
    IdxNo: Number(item.OrderSeq || item.IdxNo || 1),
    IsDefaultAllow: Boolean(item.Active ?? item.IsDefaultAllow ?? true),
    LangKey: item.LangKey || `action.${String(item.ActionKey || item.ActionCode || '').toLowerCase()}`
  }

  return apiPost(
    '/action/ActionA',
    { result: [resultItem] },
    options
  ).catch(() => apiPost('/role/PermActionsA', { result: [resultItem] }, options))
}

export const ActionU = async (data = {}, options = {}) => {
  const item = data.data || data
  const resultItem = {
    IdSeq: String(item.IdSeq || item.Id || ''),
    ActionCode: item.ActionKey || item.ActionCode || '',
    ActionName: item.ActionName || '',
    Comment: item.Description || item.Comment || '',
    IdxNo: Number(item.OrderSeq || item.IdxNo || 1),
    IsDefaultAllow: Boolean(item.Active ?? item.IsDefaultAllow ?? true),
    LangKey: item.LangKey || `action.${String(item.ActionKey || item.ActionCode || '').toLowerCase()}`,
    RowVersion: Number(item.RowVersion || 1)
  }

  return apiPost(
    '/action/ActionU',
    { result: [resultItem] },
    options
  ).catch(() => apiPost('/role/PermActionsU', { result: [resultItem] }, options))
}

export const ActionD = async (data = {}, options = {}) => {
  const idSeq = String(data.id || data.IdSeq || data.Id || '')
  return apiPost(
    '/action/ActionD',
    { result: [{ IdSeq: idSeq }] },
    options
  ).catch(() => apiPost('/role/PermActionsD', { result: [{ IdSeq: idSeq }] }, options))
}

