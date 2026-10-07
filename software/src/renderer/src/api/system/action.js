import { apiPost } from '../../services/apiClient'

export const ActionQ = async (data = {}, options = {}) => {
  return apiPost('/action/ActionQ', data, options)
}

export const ActionA = async (data = {}, options = {}) => {
  return apiPost('/action/ActionA', data, options)
}

export const ActionU = async (data = {}, options = {}) => {
  return apiPost('/action/ActionU', data, options)
}

export const ActionD = async (data = {}, options = {}) => {
  return apiPost('/action/ActionD', data, options)
}
