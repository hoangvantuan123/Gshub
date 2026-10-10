import Cookies from 'js-cookie'

export const accessToken = () => {
  const directToken =
    Cookies.get('a_a') ||
    Cookies.get('access_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('a_a') ||
    null

  if (directToken) return directToken

  try {
    const session = JSON.parse(
      localStorage.getItem('datahub_auth_session') ||
        localStorage.getItem('gshub_auth_session') ||
        '{}'
    )
    return (
      session.access_token ||
      session.token ||
      session.session?.access_token ||
      session.data?.access_token ||
      null
    )
  } catch {
    return null
  }
}

export const refreshToken = () => {
  const directRefresh =
    Cookies.get('r_t') ||
    Cookies.get('refresh_token') ||
    localStorage.getItem('refresh_token') ||
    localStorage.getItem('refreshToken') ||
    localStorage.getItem('r_t') ||
    null

  if (directRefresh) return directRefresh

  try {
    const session = JSON.parse(
      localStorage.getItem('datahub_auth_session') ||
        localStorage.getItem('gshub_auth_session') ||
        '{}'
    )
    return (
      session.refresh_token ||
      session.refreshToken ||
      session.session?.refresh_token ||
      session.data?.refresh_token ||
      null
    )
  } catch {
    return null
  }
}

export const getEmployeeCode = () => {
  const lastUser =
    localStorage.getItem('last_login_username') ||
    localStorage.getItem('datahub_remember_username') ||
    ''
  if (lastUser) return lastUser

  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return (
      userInfo.employee_code ||
      userInfo.UserName ||
      userInfo.UserId ||
      userInfo.EmpID ||
      userInfo.UserSeq ||
      null
    )
  } catch {
    return null
  }
}

export const getUserSeq = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.UserSeq || userInfo.UserId || userInfo.id || userInfo.EmpID || null
  } catch {
    return null
  }
}

export const getUserDisplayName = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.UserName || userInfo.EmpName || userInfo.UserId || 'Admin'
  } catch {
    return 'Admin'
  }
}

export const getId = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return userInfo.id || userInfo.UserSeq || userInfo.UserId || null
  } catch {
    return null
  }
}

export const getBravoUserId = () => {
  try {
    const token = accessToken()
    if (token && typeof token === 'string' && token.includes('.')) {
      const parts = token.split('.')
      if (parts[1]) {
        let payloadStr = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        while (payloadStr.length % 4) {
          payloadStr += '='
        }
        const decoded = JSON.parse(atob(payloadStr))
        if (decoded?.sub) {
          const subParts = String(decoded.sub).split('|')
          if (subParts[0] && !isNaN(Number(subParts[0]))) {
            return Number(subParts[0])
          }
        }
      }
    }
  } catch {}
  return getId() || 1688
}
