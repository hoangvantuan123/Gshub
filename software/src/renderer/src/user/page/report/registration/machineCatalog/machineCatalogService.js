import { request } from '../../../../../services/apiClient'

const BASE_URL = '/report/prod-machine-catalog'

const callMachineCatalog = async (operation, data, signal = null) =>
  request({
    url: `${BASE_URL}/ProdMachineCatalog${operation}`,
    method: 'POST',
    data,
    signal
  })

export const queryProdMachineCatalogs = (filters, signal) =>
  callMachineCatalog('Q', filters, signal)

export const createProdMachineCatalogs = (items, signal) =>
  callMachineCatalog('A', { items }, signal)

export const updateProdMachineCatalogs = (items, signal) =>
  callMachineCatalog('U', { items }, signal)

export const deleteProdMachineCatalogs = (items, signal) =>
  callMachineCatalog('D', { items }, signal)
