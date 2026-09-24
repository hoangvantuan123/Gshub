import Cookies from 'js-cookie'

export const accessToken = () => {
  return (
    Cookies.get('a_a') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('a_a') ||
    null
  )
}

export const getEmployeeCode = () => {
  const userInfo = localStorage.getItem('userInfo')

  if (userInfo) {
    const parsedUserInfo = JSON.parse(userInfo)
    return parsedUserInfo.employee_code || null
  }

  return null
}
export const getId = () => {
  const userInfo = localStorage.getItem('userInfo')

  if (userInfo) {
    const parsedUserInfo = JSON.parse(userInfo)
    return parsedUserInfo.id || null
  }

  return null
}
