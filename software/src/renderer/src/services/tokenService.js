import Cookies from 'js-cookie'

export const accessToken = () => {
  return Cookies.get('a_a') || null
}

export const refreshToken = () => {
  return Cookies.get('r_t') || null
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
