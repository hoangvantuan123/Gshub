import { apiPost } from '../../services/apiClient'

export const ChangePassword = (employeeId, oldPassword, newPassword, options = {}) => {
  const result =
    typeof employeeId === 'object' && employeeId !== null
      ? employeeId
      : { employeeId, oldPassword, newPassword }
  return apiPost('/acc/p2/change-password', { result }, options)
}
