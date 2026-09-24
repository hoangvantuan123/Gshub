import { apiPost } from '../../services/apiClient'

export const CheckUser = (options = {}) => apiPost('/acc/check-user', {}, options)
