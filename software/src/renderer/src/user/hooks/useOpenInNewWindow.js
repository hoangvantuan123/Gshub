import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'

export function useOpenInNewWindow() {
  const location = useLocation()

  const openInNewWindow = useCallback(
    (customPath, options = {}) => {
      const pathname = customPath || location.pathname || ''
      let subPath = pathname

      if (pathname.startsWith('/erp/u/')) {
        subPath = '/sub/' + pathname.replace(/^\/erp\/u\//, '')
      } else if (!pathname.startsWith('/sub/')) {
        subPath = '/sub/' + pathname.replace(/^\//, '')
      }

      const { title = 'GsHub ERP', width = 1200, height = 800 } = options

      if (window.electron && typeof window.electron.openChildWindow === 'function') {
        window.electron.openChildWindow({
          routePath: subPath,
          title,
          width,
          height
        })
      } else if (typeof window !== 'undefined') {
        const url = window.location.origin + subPath
        window.open(url, '_blank', `width=${width},height=${height}`)
      }
    },
    [location.pathname]
  )

  return { openInNewWindow }
}

export default useOpenInNewWindow
