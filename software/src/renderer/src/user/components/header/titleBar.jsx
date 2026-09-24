import { useState, useEffect, useCallback, useMemo } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'

export default function TitleBar({ title }) {
  const [isMax, setIsMax] = useState(false)
  const [envSelection, setEnvSelection] = useState(
    () => localStorage.getItem('envSelection') || 'official'
  )
  const [userInfo, setUserInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}')
    } catch {
      return {}
    }
  })
  const isElectron = typeof window !== 'undefined' && !!window.electron

  const isMac = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      (window.electron?.platform === 'darwin' ||
        navigator?.platform?.toUpperCase().includes('MAC') ||
        navigator?.userAgent?.toUpperCase().includes('MAC'))
    )
  }, [])

  useEffect(() => {
    const updateState = () => {
      setEnvSelection(localStorage.getItem('envSelection') || 'official')
      try {
        setUserInfo(JSON.parse(localStorage.getItem('userInfo') || '{}'))
      } catch {
        setUserInfo({})
      }
    }
    window.addEventListener('storage', updateState)
    window.addEventListener('env-changed', updateState)
    window.addEventListener('TITLE_UPDATE', updateState)
    return () => {
      window.removeEventListener('storage', updateState)
      window.removeEventListener('env-changed', updateState)
      window.removeEventListener('TITLE_UPDATE', updateState)
    }
  }, [])

  useEffect(() => {
    if (!isElectron) return

    let isMounted = true

    if (window.electron.isMaximized) {
      window.electron
        .isMaximized()
        .then((max) => {
          if (isMounted) setIsMax(!!max)
        })
        .catch(() => {})
    }

    let removeListener = null
    if (window.electron.onMaximizedChange) {
      removeListener = window.electron.onMaximizedChange((max) => {
        if (isMounted) setIsMax(!!max)
      })
    }

    return () => {
      isMounted = false
      if (typeof removeListener === 'function') removeListener()
    }
  }, [isElectron])

  const handleMinimize = useCallback(() => {
    try {
      if (window.electron?.minimize) {
        window.electron.minimize()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:minimize')
      }
    } catch (e) {
      console.warn('Could not minimize window:', e)
    }
  }, [])

  const handleToggleMaximize = useCallback(() => {
    try {
      if (window.electron?.maximize) {
        window.electron.maximize()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:maximize')
      }
    } catch (e) {
      console.warn('Could not toggle maximize window:', e)
    }
  }, [])

  const handleClose = useCallback(() => {
    try {
      if (window.electron?.close) {
        window.electron.close()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:close')
      }
    } catch (e) {
      console.warn('Could not close window:', e)
    }
  }, [])

  if (!isElectron) return null

  const displayTitle =
    title || (userInfo.UserName ? `GsHub ERP - ${userInfo.UserName}` : 'GsHub ERP System')

  return (
    <div
      className="h-7 bg-white border-b border-slate-200 flex items-center justify-between select-none text-xs text-slate-700 shrink-0 z-50 overflow-hidden"
      style={{ WebkitAppRegion: 'drag' }}
      onDoubleClick={handleToggleMaximize}
    >
      {/* Left side: Mac traffic light controls OR Windows title branding */}
      <div className="flex items-center gap-2 pl-3 shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        {isMac ? (
          <div className="group flex items-center gap-2 pr-2">
            {/* macOS Close (Red) */}
            <button
              type="button"
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center cursor-pointer shadow-xs active:brightness-75 transition-all"
              title="Đóng (Close)"
            >
              <svg
                className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 10 10"
                stroke="#4c0000"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              >
                <path d="M2 2l6 6M8 2L2 8" />
              </svg>
            </button>
            {/* macOS Minimize (Yellow) */}
            <button
              type="button"
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center cursor-pointer shadow-xs active:brightness-75 transition-all"
              title="Thu nhỏ (Minimize)"
            >
              <svg
                className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 10 10"
                stroke="#5c3e00"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              >
                <path d="M1.5 5h7" />
              </svg>
            </button>
            {/* macOS Maximize / Full Screen (Green) */}
            <button
              type="button"
              onClick={handleToggleMaximize}
              className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center cursor-pointer shadow-xs active:brightness-75 transition-all"
              title={
                isMax ? 'Thoát toàn màn hình (Exit Full Screen)' : 'Toàn màn hình (Full Screen)'
              }
            >
              {isMax ? (
                <svg
                  className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  viewBox="0 0 10 10"
                  stroke="#004d11"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  <path d="M4.5 2.5v2h-2" />
                  <path d="M5.5 7.5v-2h2" />
                  <path d="M4.5 4.5L2 2" />
                  <path d="M5.5 5.5L8 8" />
                </svg>
              ) : (
                <svg
                  className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  viewBox="0 0 10 10"
                  stroke="#004d11"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  <path d="M2 4.2V2h2.2" />
                  <path d="M8 5.8V8H5.8" />
                  <path d="M2.5 2.5l5 5" />
                </svg>
              )}
            </button>
          </div>
        ) : null}
        <span className="font-semibold text-slate-800 text-[11px] tracking-tight">
          GoldSun Hub
        </span>
      
      </div>

      {/* Center Draggable Spacer */}
      <div className="flex-1 h-full" style={{ WebkitAppRegion: 'drag' }} />

      {/* Right side: Windows window controls (hidden on Mac) */}
      {!isMac && (
        <div className="flex items-center h-full shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            type="button"
            onClick={handleMinimize}
            className="w-11 h-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#E5E5E5] active:bg-[#CCCCCC] transition-colors cursor-pointer"
            title="Thu nhỏ (Minimize)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-11 h-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-[#E5E5E5] active:bg-[#CCCCCC] transition-colors cursor-pointer"
            title={isMax ? 'Khôi phục kích thước (Restore)' : 'Phóng to (Maximize)'}
          >
            {isMax ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-11 h-full flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#E81123] active:bg-[#F1707A] transition-colors cursor-pointer"
            title="Đóng (Close)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
