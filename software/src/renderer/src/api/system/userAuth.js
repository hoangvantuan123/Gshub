import { apiPost } from '../../services/apiClient'

// ─── USER AUTHENTICATION & ACCOUNT APIS ───
export const PostAUserAuth = (result, options = {}) =>
  apiPost('/acc/UsersAuthA', { result }, options)

export const PostQUserAuth = (result, options = {}) => {
  return apiPost('/acc/UsersAuthQ', { result }, options)
}

export const PostUUserAuth = (result, options = {}) =>
  apiPost('/acc/UsersAuthU', { result }, options)

export const PostDUserAuth = (result, options = {}) =>
  apiPost('/acc/UsersAuthD', { result }, options)

export const PostUPass = (result, options = {}) =>
  apiPost('/acc/UPass2', { result }, options)

export const PostUUserAuthStatusAcc = (result, options = {}) =>
  apiPost('/acc/UsersAuthUStatusAcc', { result }, options)
