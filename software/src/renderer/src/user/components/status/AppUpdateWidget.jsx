import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Zap,
  Rocket,
  Laptop,
  Sparkles,
  Copy,
  Check,
  X,
  ArrowRight,
  FileText
} from 'lucide-react'

const AppUpdateWidget = () => {
  const [versionInfo, setVersionInfo] = useState({
    nativeVersion: '1.0.0',
    uiVersion: '1.0.0',
    isCustomBundle: false
  })

  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'checking' | 'ui-available' | 'native-available' | 'downloading' | 'ui-ready' | 'native-ready' | 'error' | 'up-to-date'
    message: '',
    progress: 0,
    newUiVersion: null,
    newNativeVersion: null,
    releaseNotes: '',
    nativeDownloadUrl: ''
  })

  const [isOpenPopover, setIsOpenPopover] = useState(false)
  const [showCornerToast, setShowCornerToast] = useState(false)
  const [dismissedVersion, setDismissedVersion] = useState(null)
  const [isCheckingNative, setIsCheckingNative] = useState(false)
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef(null)

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpenPopover(false)
      }
    }
    if (isOpenPopover) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpenPopover])

  // Lấy thông tin phiên bản ban đầu và lắng nghe sự kiện từ Electron
  useEffect(() => {
    if (window.electron?.updater) {
      window.electron.updater.getVersions().then((info) => {
        if (info) {
          setVersionInfo({
            nativeVersion: info.nativeVersion || '1.0.0',
            uiVersion: info.uiVersion || '1.0.0',
            isCustomBundle: !!info.isCustomBundle
          })
          if (info.currentState) {
            setState(info.currentState)
            if (
              info.currentState.status === 'native-available' ||
              info.currentState.status === 'native-ready'
            ) {
              setShowCornerToast(true)
            }
          }
        }
      })

      const unsubscribe = window.electron.updater.onStatusChanged((newState) => {
        setState((prev) => ({ ...prev, ...newState }))
        if (newState.uiVersion) {
          setVersionInfo((prev) => ({ ...prev, uiVersion: newState.uiVersion }))
        }
        if (newState.status === 'native-available' || newState.status === 'native-ready') {
          setShowCornerToast(true)
        }
      })

      // Tự động kiểm tra cập nhật giao diện và phần mềm ngầm khi mở ứng dụng / đăng nhập
      const autoCheckTimer = setTimeout(() => {
        window.electron.updater.checkAll().catch(() => {})
      }, 1500)

      return () => {
        clearTimeout(autoCheckTimer)
        if (typeof unsubscribe === 'function') unsubscribe()
      }
    }
  }, [])

  // Nút kiểm tra phiên bản phần mềm
  const handleCheckNative = useCallback(async () => {
    if (!window.electron) return
    setIsCheckingNative(true)
    setState((prev) => ({
      ...prev,
      status: 'checking',
      message: 'Đang kiểm tra bản phần mềm mới nhất...'
    }))
    try {
      if (typeof window.electron.updater?.checkNative === 'function') {
        await window.electron.updater.checkNative()
      } else if (typeof window.electron.updater?.checkAll === 'function') {
        await window.electron.updater.checkAll()
      } else if (window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('updater:check-native')
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: err?.message || 'Lỗi kiểm tra phần mềm'
      }))
    } finally {
      setIsCheckingNative(false)
    }
  }, [])

  // Sao chép thông báo lỗi vào clipboard
  const handleCopyError = (textToCopy) => {
    if (!textToCopy) return
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  // Tải bản Full Native Update
  const handleDownloadNative = async () => {
    if (!window.electron) return
    try {
      if (typeof window.electron.updater?.downloadNative === 'function') {
        await window.electron.updater.downloadNative()
      } else if (window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('updater:download-native')
      }
    } catch (e) {
      console.error('Download native update error:', e)
    }
  }

  // Khởi động lại để cài đặt Native Update
  const handleInstallNative = async () => {
    if (!window.electron) return
    setIsOpenPopover(false)
    try {
      if (typeof window.electron.updater?.installNative === 'function') {
        await window.electron.updater.installNative()
      } else if (window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('updater:install-native')
      }
    } catch (e) {
      console.error('Install native update error:', e)
    }
  }

  // Áp dụng Hot Update UI nếu cần
  const handleApplyUi = async () => {
    if (!window.electron) return
    setIsOpenPopover(false)
    try {
      if (typeof window.electron.updater?.applyUiReload === 'function') {
        await window.electron.updater.applyUiReload()
      } else if (window.electron.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('updater:apply-ui-reload')
      }
    } catch (e) {
      console.error('Apply UI reload error:', e)
    }
  }

  // Render icon & text trạng thái ở thanh Status Bar (Chỉ text phẳng, không giật layout khi % thay đổi)
  const renderStatusButton = () => {
    const isDownloading = state.status === 'downloading'
    const isNativeAvailable = state.status === 'native-available'
    const isNativeReady = state.status === 'native-ready'
    const isUiReady = state.status === 'ui-ready'

    if (isNativeReady) {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation()
            setShowCornerToast((prev) => !prev)
          }}
          className="flex items-center gap-1.5 px-2.5 h-full border-l border-gray-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 select-none normal-case font-semibold"
          title="Bản cài đặt phần mềm đã sẵn sàng! Bấm để xem và cập nhật."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="whitespace-nowrap">Khởi động lại (v{state.newNativeVersion})</span>
        </div>
      )
    }

    if (isNativeAvailable) {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation()
            setShowCornerToast((prev) => !prev)
          }}
          className="flex items-center gap-1.5 px-2.5 h-full border-l border-gray-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 select-none normal-case font-semibold"
          title={`Phần mềm có bản mới v${state.newNativeVersion}. Bấm để xem chi tiết bản vá.`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span className="whitespace-nowrap">Có bản v{state.newNativeVersion}</span>
        </div>
      )
    }

    if (isUiReady) {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation()
            handleApplyUi()
          }}
          className="flex items-center gap-1.5 px-2.5 h-full border-l border-gray-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 select-none normal-case font-semibold"
          title="Giao diện mới đã tải xong! Bấm để áp dụng ngay."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="whitespace-nowrap">Áp dụng UI</span>
        </div>
      )
    }

    if (isDownloading) {
      return (
        <div
          onClick={() => setShowCornerToast((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 h-full border-l border-gray-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 select-none normal-case font-semibold"
          title="Đang tải bản cập nhật..."
        >
          <RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
          <div className="flex items-center gap-0.5 whitespace-nowrap text-xs">
            <span>Đang tải:</span>
            <span className="tabular-nums font-mono font-bold w-[34px] text-right inline-block text-blue-600">
              {state.progress}%
            </span>
          </div>
        </div>
      )
    }

    // Trạng thái bình thường: Hiển thị phiên bản phần mềm
    return (
      <div
        onClick={() => setIsOpenPopover((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 h-full border-l border-gray-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-700 select-none normal-case"
        title="Bấm để kiểm tra bản cập nhật phần mềm"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="font-semibold text-slate-700 normal-case whitespace-nowrap">
          v{versionInfo.nativeVersion}
        </span>
      </div>
    )
  }

  // Helper format hiển thị chi tiết Release Notes / Mô tả bản vá
  const renderReleaseNotes = (notes) => {
    if (!notes || typeof notes !== 'string' || !notes.trim()) {
      return (
        <div className="text-slate-500 italic text-[11px]">
          Bản cập nhật tối ưu hiệu năng và sửa các lỗi vận hành hệ thống.
        </div>
      )
    }

    const lines = notes.split('\n')
    return (
      <div className="space-y-1 text-[11px]">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) return null
          const isHeading = trimmed.startsWith('#')
          const isBullet =
            trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')

          if (isHeading) {
            return (
              <div key={idx} className="font-bold text-slate-800 pt-1 text-[11.5px]">
                {trimmed.replace(/^#+\s*/, '')}
              </div>
            )
          }

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1 text-slate-700">
                <span className="text-blue-500 font-bold leading-tight shrink-0">•</span>
                <span className="flex-1">{trimmed.replace(/^[-*•]\s*/, '')}</span>
              </div>
            )
          }

          return (
            <div key={idx} className="text-slate-700">
              {trimmed}
            </div>
          )
        })}
      </div>
    )
  }

  const isChecking = isCheckingNative || state.status === 'checking'
  const isError = state.status === 'error'

  return (
    <div className="relative h-full flex items-center normal-case" ref={popoverRef}>
      {renderStatusButton()}

      {/* Popover nhỏ từ thanh status bar */}
      {isOpenPopover && (
        <div className="absolute bottom-7 right-0 z-50 w-[300px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-sans text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 p-3 space-y-2.5 normal-case">
          {/* Header & Nút kiểm tra phần mềm */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div>
                <span className="text-gray-400 text-[9.5px] block font-medium leading-none">
                  Phiên bản phần mềm
                </span>
                <span className="font-bold text-gray-800 text-[12px] leading-tight">
                  v{versionInfo.nativeVersion}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckNative}
              disabled={isChecking || state.status === 'downloading'}
              className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded font-semibold text-[10.5px] transition-colors disabled:opacity-50"
              title="Kiểm tra bản cập nhật phần mềm mới nhất"
            >
              <RefreshCw
                className={`w-3 h-3 ${isChecking ? 'animate-spin text-blue-600' : 'text-gray-500'}`}
              />
              <span>Kiểm tra</span>
            </button>
          </div>

          <div className="border-t border-gray-100" />

          {/* Dòng trạng thái thông báo phần mềm */}
          <div className="text-[10.5px] text-gray-600 leading-normal">
            <div className="flex items-start gap-1.5 font-medium">
              <div className="pt-0.5 shrink-0">
                {state.status === 'downloading' || isChecking ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                ) : state.status === 'native-available' ? (
                  <Rocket className="w-3.5 h-3.5 text-blue-600" />
                ) : state.status === 'native-ready' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : isError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 select-text break-words">
                <span className={isError ? 'text-rose-600' : 'text-slate-700'}>
                  {state.newNativeVersion
                    ? `Có bản phần mềm mới v${state.newNativeVersion}`
                    : state.message || 'Phần mềm đang ở phiên bản mới nhất.'}
                </span>

                {isError && (
                  <div className="pt-1 flex items-center gap-1">
                    <button
                      onClick={() => handleCopyError(state.message)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[9.5px] font-semibold transition-colors select-none"
                    >
                      {copied ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5 text-gray-500" />
                          <span>Sao chép lỗi</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {state.status === 'downloading' && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-gray-400">
                  <span>Đang tải...</span>
                  <span>{state.progress}%</span>
                </div>
              </div>
            )}
          </div>

          {state.status === 'native-available' && (
            <button
              onClick={handleDownloadNative}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] shadow-sm transition-colors flex items-center justify-center gap-1.5 select-none"
            >
              <Download className="w-3 h-3" />
              <span>Tải bản cài App v{state.newNativeVersion}</span>
            </button>
          )}

          {state.status === 'native-ready' && (
            <button
              onClick={handleInstallNative}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5 select-none"
            >
              <Rocket className="w-3 h-3 fill-white" />
              <span>Khởi động lại & Cài đặt</span>
            </button>
          )}

          <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-[9.5px] text-gray-400 select-none">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Giao diện: Tự động cập nhật khi đăng nhập</span>
            </span>
            <span className="font-medium text-gray-500">v{versionInfo.uiVersion}</span>
          </div>
        </div>
      )}

      {/* THÔNG BÁO NỔI Ở GÓC MÀN HÌNH KHI CÓ BẢN CẬP NHẬT MỚI (CORNER UPDATE TOAST) */}
      {showCornerToast &&
        (state.status === 'native-available' ||
          state.status === 'native-ready' ||
          state.status === 'downloading') &&
        createPortal(
          <div
            className="fixed bottom-8 right-5 z-[99999] w-[400px] max-w-[94vw] bg-white rounded-lg shadow-2xl border border-slate-300 overflow-hidden font-sans select-none animate-in fade-in slide-in-from-bottom-5 duration-300"
            style={{
              boxShadow: '0 20px 40px -6px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* 1. Header Toast */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider truncate flex items-center gap-1.5">
                  <Rocket size={14} className="text-blue-400 shrink-0" />
                  PHÁT HIỆN BẢN CẬP NHẬT MỚI
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-blue-600 text-white font-mono font-bold text-[10.5px] px-2 py-0.5 rounded shadow-sm">
                  v{state.newNativeVersion || state.newUiVersion}
                </span>
                <button
                  onClick={() => {
                    setShowCornerToast(false)
                    setDismissedVersion(state.newNativeVersion)
                  }}
                  className="text-slate-400 hover:text-white p-0.5 transition-colors"
                  title="Đóng thông báo"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* 2. Body Toast */}
            <div className="p-3.5 space-y-3 bg-white">
              {/* So sánh phiên bản */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">
                    Bản đang dùng
                  </span>
                  <span className="font-mono font-semibold text-slate-700">
                    v{versionInfo.nativeVersion}
                  </span>
                </div>
                <ArrowRight size={15} className="text-blue-500 shrink-0" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-blue-600 font-semibold uppercase">
                    Bản phát hành mới
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-[13px]">
                    v{state.newNativeVersion || state.newUiVersion}
                  </span>
                </div>
              </div>

              {/* Mô tả chi tiết bản vá & Nội dung cập nhật */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Sparkles size={13} className="text-amber-500 shrink-0" />
                  <span>Chi tiết bản vá & Nội dung cập nhật:</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 max-h-36 overflow-y-auto leading-relaxed select-text font-sans">
                  {renderReleaseNotes(state.releaseNotes)}
                </div>
              </div>

              {/* Thanh tiến trình khi đang tải */}
              {state.status === 'downloading' && (
                <div className="space-y-1.5 bg-blue-50/70 border border-blue-200 p-2.5 rounded">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-blue-800 flex items-center gap-1.5">
                      <RefreshCw size={12} className="animate-spin text-blue-600" />
                      Đang tải bản cài đặt ngầm...
                    </span>
                    <span className="font-mono font-bold text-blue-700">{state.progress}%</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Footer Toast */}
            <div className="px-3.5 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowCornerToast(false)
                  setDismissedVersion(state.newNativeVersion)
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded font-medium transition-colors"
              >
                Để sau
              </button>

              {state.status === 'native-available' && (
                <button
                  onClick={handleDownloadNative}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Tải & Cài đặt ngay</span>
                </button>
              )}

              {state.status === 'downloading' && (
                <button
                  disabled
                  className="px-3.5 py-1.5 bg-blue-400 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-80"
                >
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Đang tải ({state.progress}%)...</span>
                </button>
              )}

              {state.status === 'native-ready' && (
                <button
                  onClick={handleInstallNative}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Rocket size={13} className="fill-white" />
                  <span>Khởi động lại để cập nhật</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default AppUpdateWidget
