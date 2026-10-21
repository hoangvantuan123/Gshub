import { request } from '../../../../../services/apiClient'

const BASE_URL = '/report/prod-stats-remark-type'

const callRemarkType = async (operation, data, signal = null) =>
  request({
    url: `${BASE_URL}/ProdStatsRemarkType${operation}`,
    method: 'POST',
    data,
    signal
  })

export const queryProdStatsRemarkTypes = (filters, signal) => callRemarkType('Q', filters, signal)

export const createProdStatsRemarkTypes = (items, signal) => callRemarkType('A', { items }, signal)

export const updateProdStatsRemarkTypes = (items, signal) => callRemarkType('U', { items }, signal)

export const deleteProdStatsRemarkTypes = (items, signal) => callRemarkType('D', { items }, signal)
