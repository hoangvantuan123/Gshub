import { request } from '../../../../../services/apiClient'

const BASE_URL = '/report/prod-machine-registration'

export const queryProdMachineRegistrations = (filters = {}, signal = null) =>
  request({
    url: `${BASE_URL}/ProdMachineRegistrationQ`,
    method: 'POST',
    data: filters,
    signal
  })

export const saveProdMachineRegistrations = (payload, signal = null) =>
  request({
    url: `${BASE_URL}/ProdMachineRegistrationA`,
    method: 'POST',
    data: payload,
    signal
  })

export const deleteProdMachineRegistrations = (idSeqs, signal = null) =>
  request({
    url: `${BASE_URL}/ProdMachineRegistrationD`,
    method: 'POST',
    data: { idSeqs },
    signal
  })
