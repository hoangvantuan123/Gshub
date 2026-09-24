import { apiPost, apiGet, request } from '../../services/apiClient'

export const DeleteGroups = (result, options = {}) =>
  request({
    method: 'DELETE',
    url: '/mssql/system-users/delete/groups',
    data: { result },
    ...options
  })

export const GetAllResGroups = (options = {}) =>
  apiGet('/mssql/system-users/metasys-groups-all', {}, options)

export const PostResGroups = (name, comment, options = {}) =>
  apiPost('/mssql/system-users/metasys-groups', { name, comment }, options)
