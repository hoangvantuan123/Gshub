import { apiPost } from '../../services/apiClient'

export const PostAUserAuth = (result, options = {}) =>
  apiPost('/acc/UsersAuthA', { result }, options)
export const PostQUserAuth = (result, options = {}) => {
  console.log('🚀 [FE Network -> API Gateway] POST /acc/UsersAuthQ với payload:', { result })
  return apiPost('/acc/UsersAuthQ', { result }, options)
}
export const PostUPass = (result, options = {}) => apiPost('/acc/UPass2', { result }, options)
export const PostUUserAuth = (result, options = {}) =>
  apiPost('/acc/UsersAuthU', { result }, options)
export const PostUUserAuthStatusAcc = (result, options = {}) =>
  apiPost('/acc/UsersAuthUStatusAcc', { result }, options)
