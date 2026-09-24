import Cookies from 'js-cookie'
import { LogoutAuth } from '../api/auth/login'
import { clearMenuData } from '../IndexedDB/loadMenuData'

export const performLogout = async (navigate) => {
  try {
    // 0. Xóa cache cấu trúc menu trong IndexedDB
    clearMenuData().catch((e) => console.warn('Lỗi xóa menu IndexedDB:', e))

    // 1. Gửi request thông báo huỷ/thu hồi Token lên Server (Backend Blacklist)
    try {
      await LogoutAuth()
    } catch (apiErr) {
      console.warn('Backend Logout call error (ignoring for local clean-up):', apiErr)
    }

    // 2. Xóa sạch toàn bộ Authentication Cookies
    const cookieKeys = ['a_a', 'token', 'accessToken', 'device_token', 'device_id', 'refreshToken']
    cookieKeys.forEach((key) => {
      Cookies.remove(key, { path: '/' })
      Cookies.remove(key)
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`
      }
    })

    // Quét sạch tất cả cookie còn lại trong document.cookie
    if (typeof document !== 'undefined' && document.cookie) {
      const allCookies = document.cookie.split(';')
      allCookies.forEach((c) => {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
        if (name) {
          Cookies.remove(name, { path: '/' })
          Cookies.remove(name)
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`
        }
      })
    }

    // 3. Xóa sạch mọi thông tin tài khoản, token và trạng thái điều hướng trong LocalStorage
    const authKeys = [
      'userInfo',
      'token',
      'access_token',
      'accessToken',
      'a_a',
      'datahub_auth_session',
      'gshub_auth_session',
      'roles_menu',
      'rolesMenu',
      'language_user',
      'device_token',
      'device_id',
      'isMenu',
      'labelMenu',
      'current_action',
      'current_action_phone',
      'current_user',
      'menu',
      'COLLAPSED_STATE',
      'selectedMenuItems',
      'recentSearches',
      'save_users_log'
    ]
    authKeys.forEach((k) => {
      try {
        localStorage.removeItem(k)
      } catch {}
    })

    // 4. Xóa sạch toàn bộ SessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear()
      } catch {}
    }

    // 5. Ngắt kết nối Realtime Stream WebSocket / gRPC ngay lập tức
    if (window?.electron?.realtimeDisconnect) {
      window.electron.realtimeDisconnect()
    }

    // 6. Đóng sạch toàn bộ các cửa sổ con (Child Windows) và chuyển mainWindow về Login size
    if (window?.electron?.logout) {
      window.electron.logout()
    } else if (window?.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('app:logout')
    } else {
      if (window?.electron?.setLoginSize) {
        window.electron.setLoginSize()
      } else if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:set-login-size')
      }
      if (window?.electron?.closeSettingsWindow) {
        window.electron.closeSettingsWindow()
      } else if (window?.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:close-settings-window')
      }
    }

    // 7. Phát các sự kiện hệ thống để cập nhật lại toàn bộ giao diện
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-state-changed'))
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new Event('TITLE_UPDATE'))
    }

    // 8. Điều hướng về màn hình đăng nhập
    if (typeof navigate === 'function') {
      navigate('/erp/u/login', { replace: true })
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/erp/u/login'
    }
  } catch (err) {
    console.error('Logout error:', err)
    if (typeof window !== 'undefined') {
      window.location.hash = '#/erp/u/login'
    }
  }
}
