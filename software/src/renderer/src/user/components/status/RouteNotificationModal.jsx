/* eslint-disable react/prop-types */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  X,
  Trash2,
  Copy,
  Check,
  Bell,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckCheck,
  Mail,
  MailOpen
} from 'lucide-react'
import {
  getApiLogs,
  deleteApiLogsByIds,
  deleteApiLogsByRoute,
  cleanRoutePath,
  resolveMenuFromRoute,
  updateApiLogReadStatus,
  markAllApiLogsRead,
  translateErrorCodeOrMessage
} from '../../../IndexedDB/loadApiLogData'
import SystemConfirmModal from '../modal/SystemConfirmModal'

export default function RouteNotificationModal({ isOpen = false, onClose, currentRoute = '' }) {
  const [copiedKey, setCopiedKey] = useState(null)
  const [inputText, setInputText] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Data States
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [menuInfo, setMenuInfo] = useState({ menuName: '', parentMenu: '' })

  const searchInputRef = useRef(null)

  // Custom Toast State
  const [toast, setToast] = useState({ visible: false, text: '', type: 'success' })
  const showToast = useCallback((text, type = 'success') => {
    setToast({ visible: true, text, type })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 2000)
  }, [])

  // System Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    subMessage: '',
    confirmText: 'Xóa',
    onConfirm: null
  })

  const openConfirm = useCallback(
    ({ title, message, subMessage, confirmText = 'Xóa', onConfirm }) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        subMessage,
        confirmText,
        onConfirm
      })
    },
    []
  )

  const closeConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const panelRef = useRef(null)

  // Focus ô tìm kiếm khi mở
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isSearchOpen])

  // Đóng khi click ra ngoài panel (nếu modal confirm không mở và không phải click vào nút chuông)
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e) => {
      if (confirmDialog.isOpen) return
      if (e.target.closest('#status-bar-notification-button')) return
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick)
    }, 50)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, confirmDialog.isOpen, onClose])

  // Phân giải tên menu của route
  useEffect(() => {
    let isMounted = true
    if (currentRoute) {
      resolveMenuFromRoute(currentRoute).then((info) => {
        if (isMounted && info) {
          setMenuInfo({
            menuName: info.menuName || 'Trang hiện tại',
            parentMenu: info.parentMenu || 'Hệ thống'
          })
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [currentRoute])

  // Nạp danh sách log của riêng route hiện tại
  const fetchLogs = useCallback(async () => {
    if (!currentRoute) return
    setIsLoading(true)
    try {
      const res = await getApiLogs({
        limit: 1000,
        page: 1,
        route: currentRoute
      })

      const dataList = res.data || []
      setLogs(dataList)

      // Tự động chọn và hiển thị chi tiết thông báo đầu tiên khi vừa mở danh sách
      if (dataList.length > 0) {
        const firstItem = { ...dataList[0], isRead: true }
        setSelectedItem(firstItem)
        if (!dataList[0].isRead) {
          updateApiLogReadStatus(dataList[0].id, true)
          setLogs((prev) => prev.map((l, idx) => (idx === 0 ? { ...l, isRead: true } : l)))
        }
      } else {
        setSelectedItem(null)
      }
    } catch (err) {
      console.warn('Lỗi đọc logs của route:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentRoute])

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    } else {
      setIsSearchOpen(false)
      setInputText('')
      setAppliedKeyword('')
    }
  }, [isOpen, fetchLogs])

  // Lắng nghe realtime sự kiện log mới cho router hiện tại
  useEffect(() => {
    if (!isOpen) return

    const handleLogSaved = (e) => {
      const newRecord = e?.detail
      if (!newRecord || typeof newRecord !== 'object') return

      const targetClean = cleanRoutePath(currentRoute)
      const logClean = cleanRoutePath(newRecord.route)
      const isMatchRoute =
        logClean === targetClean || logClean.endsWith(targetClean) || targetClean.endsWith(logClean)

      if (!isMatchRoute) return

      setLogs((prev) => [
        newRecord,
        ...prev.filter((item) => String(item.id) !== String(newRecord.id))
      ])
    }

    window.addEventListener('API_LOG_SAVED', handleLogSaved)

    const handleReadChanged = (e) => {
      const detail = e?.detail
      if (detail?.all) {
        setLogs((prev) => prev.map((l) => ({ ...l, isRead: true })))
        setSelectedItem((prev) => (prev ? { ...prev, isRead: true } : null))
      } else if (detail?.id !== undefined) {
        setLogs((prev) =>
          prev.map((l) =>
            String(l.id) === String(detail.id) ? { ...l, isRead: detail.isRead } : l
          )
        )
        setSelectedItem((prev) =>
          prev && String(prev.id) === String(detail.id) ? { ...prev, isRead: detail.isRead } : prev
        )
      }
    }

    const handleDeleted = () => {
      fetchLogs()
    }

    window.addEventListener('API_LOG_READ_CHANGED', handleReadChanged)
    window.addEventListener('API_LOG_DELETED', handleDeleted)

    return () => {
      window.removeEventListener('API_LOG_SAVED', handleLogSaved)
      window.removeEventListener('API_LOG_READ_CHANGED', handleReadChanged)
      window.removeEventListener('API_LOG_DELETED', handleDeleted)
    }
  }, [isOpen, currentRoute, fetchLogs])

  // Giới hạn số lượng bản ghi hiển thị trên DOM (Chunk loading chống giật lag khi tải nhiều)
  const [displayLimit, setDisplayLimit] = useState(40)

  // Reset limit khi đổi từ khóa tìm kiếm hoặc khi mở modal
  useEffect(() => {
    setDisplayLimit(40)
  }, [appliedKeyword, isOpen])

  // Lọc theo từ khóa tìm kiếm đã xác nhận (appliedKeyword)
  const displayedLogs = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase()
    if (!kw) return logs
    return logs.filter((item) => {
      const msg = String(item.message || '').toLowerCase()
      const act = String(item.action || '').toLowerCase()
      const menu = String(item.menuName || '').toLowerCase()
      const ep = String(item.endpoint || '').toLowerCase()
      const idStr = String(item.id || '')
      return (
        msg.includes(kw) ||
        act.includes(kw) ||
        menu.includes(kw) ||
        ep.includes(kw) ||
        idStr.includes(kw)
      )
    })
  }, [logs, appliedKeyword])

  // Dữ liệu cắt lát hiển thị trên DOM
  const visibleLogs = useMemo(() => {
    return displayedLogs.slice(0, displayLimit)
  }, [displayedLogs, displayLimit])

  // Xử lý cuộn tải thêm dòng
  const handleListScroll = useCallback(
    (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 150) {
        if (displayLimit < displayedLogs.length) {
          setDisplayLimit((prev) => Math.min(prev + 40, displayedLogs.length))
        }
      }
    },
    [displayLimit, displayedLogs.length]
  )

  // Khi tìm kiếm thay đổi từ khóa, tự động chọn thông báo đầu tiên của kết quả tìm kiếm nếu có
  useEffect(() => {
    if (!isOpen) return
    if (displayedLogs.length > 0) {
      const isCurrentInList =
        selectedItem &&
        displayedLogs.some(
          (l) =>
            l.id !== undefined &&
            l.id !== null &&
            (l.id === selectedItem.id || String(l.id) === String(selectedItem.id))
        )
      if (!isCurrentInList) {
        const firstItem = { ...displayedLogs[0], isRead: true }
        setSelectedItem(firstItem)
        if (!displayedLogs[0].isRead) {
          updateApiLogReadStatus(displayedLogs[0].id, true)
          setLogs((prev) =>
            prev.map((l) =>
              String(l.id) === String(displayedLogs[0].id) ? { ...l, isRead: true } : l
            )
          )
        }
      }
    } else {
      setSelectedItem(null)
    }
  }, [appliedKeyword, isOpen])

  // Số lượng chưa đọc
  const unreadCount = useMemo(() => {
    return logs.filter((item) => !item.isRead).length
  }, [logs])

  // Khi click vào 1 dòng thông báo: toggle bật/tắt chi tiết và tự động đánh dấu đã đọc
  const handleSelectLog = (item) => {
    if (!item) return
    const isOpening = !(
      selectedItem &&
      item.id !== undefined &&
      item.id !== null &&
      (selectedItem.id === item.id || String(selectedItem.id) === String(item.id))
    )

    if (isOpening) {
      const updatedItem = { ...item, isRead: true }
      setSelectedItem(updatedItem)
      if (!item.isRead) {
        setLogs((prev) =>
          prev.map((l) => (String(l.id) === String(item.id) ? { ...l, isRead: true } : l))
        )
        updateApiLogReadStatus(item.id, true)
      }
    } else {
      setSelectedItem(null)
    }
  }

  // Toggle trạng thái Đã đọc / Chưa đọc của một dòng
  const handleToggleReadStatus = (id, e) => {
    e?.stopPropagation()
    if (id === undefined || id === null) return
    const target = logs.find((l) => String(l.id) === String(id))
    if (!target) return
    const nextRead = !target.isRead
    setLogs((prev) =>
      prev.map((l) => (String(l.id) === String(id) ? { ...l, isRead: nextRead } : l))
    )
    if (selectedItem && String(selectedItem.id) === String(id)) {
      setSelectedItem((prev) => (prev ? { ...prev, isRead: nextRead } : null))
    }
    updateApiLogReadStatus(id, nextRead)
    showToast(nextRead ? 'Đã đánh dấu đã đọc' : 'Đã đánh dấu chưa đọc')
  }

  // Đánh dấu tất cả thông báo của route là đã đọc
  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return
    setLogs((prev) => prev.map((l) => ({ ...l, isRead: true })))
    if (selectedItem) {
      setSelectedItem((prev) => (prev ? { ...prev, isRead: true } : null))
    }
    markAllApiLogsRead(currentRoute)
    showToast('Đã đánh dấu tất cả là đã đọc')
  }

  // Thực hiện tìm kiếm khi bấm Enter hoặc click kính lúp
  const handleTriggerSearch = () => {
    setAppliedKeyword(inputText.trim())
  }

  const handleResetSearch = () => {
    setInputText('')
    setAppliedKeyword('')
  }

  // Xóa 1 log đơn lẻ
  const handleDeleteSingle = (id, e) => {
    e?.stopPropagation()
    if (!id) return
    openConfirm({
      title: 'Xác nhận xóa thông báo',
      message: 'Bạn có chắc chắn muốn xóa thông báo này không?',
      subMessage: 'Thông báo sẽ bị xóa khỏi lịch sử nhật ký của trang hiện tại.',
      confirmText: 'Xóa thông báo',
      onConfirm: async () => {
        await deleteApiLogsByIds([id])
        if (selectedItem && (selectedItem.id === id || String(selectedItem.id) === String(id))) {
          setSelectedItem(null)
        }
        setLogs((prev) => prev.filter((item) => String(item.id) !== String(id)))
        showToast('Đã xóa thông báo')
      }
    })
  }

  // Xóa toàn bộ thông báo trên trang hiện tại
  const handleClearAll = () => {
    if (logs.length === 0) return
    openConfirm({
      title: 'Xác nhận dọn sạch thông báo',
      message: `Bạn có chắc chắn muốn dọn sạch toàn bộ ${logs.length} thông báo thuộc trang "${menuInfo.menuName || currentRoute}" không?`,
      subMessage: 'Thao tác này sẽ xóa toàn bộ lịch sử thông báo đã ghi nhận của trang hiện tại.',
      confirmText: 'Dọn sạch tất cả',
      onConfirm: async () => {
        await deleteApiLogsByRoute(currentRoute)
        setSelectedItem(null)
        setLogs([])
        showToast('Đã dọn sạch thông báo của trang')
      }
    })
  }

  // Copy Clipboard
  const handleCopyText = (text, key) => {
    if (!text) return
    navigator.clipboard
      .writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text))
      .then(() => {
        setCopiedKey(key)
        showToast('Đã sao chép vào bộ nhớ tạm')
        setTimeout(() => {
          setCopiedKey((prev) => (prev === key ? null : prev))
        }, 2000)
      })
      .catch(() => {
        showToast('Không thể sao chép', 'error')
      })
  }

  // Phân tách các dòng lỗi của selectedItem
  const parsedErrorLines = useMemo(() => {
    if (!selectedItem?.message) return []
    const raw = String(selectedItem.message).trim()
    let lines = []
    if (raw.includes('|')) {
      lines = raw
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (raw.includes('\n')) {
      lines = raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      lines = [raw]
    }
    const translatedLines = lines.map((line) =>
      translateErrorCodeOrMessage(line, selectedItem.errorCode)
    )
    return Array.from(new Set(translatedLines))
  }, [selectedItem?.message, selectedItem?.errorCode])

  // Phím tắt bàn phím: Esc, Ctrl+Q, Ctrl+F, F3, /
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (confirmDialog.isOpen) return

      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      const key = e.key ? e.key.toLowerCase() : ''
      const code = e.code || ''

      // Phím tắt mở/focus ô tìm kiếm
      if (
        (isCtrlOrMeta && (key === 'q' || key === 'f' || code === 'KeyQ' || code === 'KeyF')) ||
        e.key === 'F3' ||
        (e.key === '/' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault()
        e.stopPropagation()
        setIsSearchOpen(true)
        setTimeout(() => {
          searchInputRef.current?.focus()
          searchInputRef.current?.select()
        }, 60)
        return
      }

      if (e.key === 'Escape') {
        if (isSearchOpen && (inputText || appliedKeyword)) {
          handleResetSearch()
        } else if (isSearchOpen) {
          setIsSearchOpen(false)
        } else if (selectedItem) {
          setSelectedItem(null)
        } else {
          onClose?.()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, confirmDialog.isOpen, selectedItem, isSearchOpen, inputText, appliedKeyword, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className={`fixed bottom-6 right-0 z-[9999] flex select-none ${
        selectedItem ? 'w-[920px] max-w-[100vw]' : 'w-[420px] max-w-[100vw]'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* KHUNG POPUP SÁT PHÍA BÊN PHẢI, CAO RÁO, GIAO DIỆN PHẲNG */}
      <div className="w-full h-[calc(100vh-24px)] max-h-[720px] min-h-[500px] bg-white border-l border-t border-slate-300 shadow-2xl flex overflow-hidden text-slate-800">
        {/* ========================================================= */}
        {/* CỘT BÊN TRÁI: CHI TIẾT THÔNG BÁO (KHI BẤM CHỌN DÒNG)      */}
        {/* ========================================================= */}
        {selectedItem && (
          <div className="flex-1 bg-white flex flex-col min-w-0 h-full border-r border-slate-200 overflow-hidden">
            {/* 1. THANH TIÊU ĐỀ CHI TIẾT */}
            <div className="h-10 px-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 select-none bg-white">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="font-bold text-[12px] text-slate-800  tracking-wide shrink-0">
                  Chi tiết
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {/* Nút Chuyển đổi trạng thái Đã đọc / Chưa đọc */}
                <button
                  type="button"
                  onClick={(e) => handleToggleReadStatus(selectedItem.id, e)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
                  title={
                    selectedItem.isRead ? 'Chuyển sang trạng thái Chưa đọc' : 'Đánh dấu là Đã đọc'
                  }
                >
                  {selectedItem.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
                </button>

                {/* Nút Xóa thông báo */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteSingle(selectedItem.id, e)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-[3px] transition-colors cursor-pointer"
                  title="Xóa thông báo này"
                >
                  <Trash2 size={14} />
                </button>

                {/* Nút Đóng chi tiết */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedItem(null)
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Đóng bảng chi tiết"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* 2. THÂN CUỘN: CUỘN ĐỘC LẬP MƯỢT MÀ */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4 text-xs">
              {/* PHẦN 1: THÔNG TIN CHUNG */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Thông tin chung
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[11px]">Đường dẫn trang</span>
                    <span className="font-mono text-slate-800 font-medium break-all text-[11.5px]">
                      {selectedItem.route || currentRoute}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[11px]">Chức năng / Tác vụ</span>
                    <span className="font-semibold text-slate-800 text-[11.5px]">
                      {selectedItem.action || selectedItem.menuName || 'Sự kiện hệ thống'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[11px]">Dịch vụ liên kết</span>
                    <span className="font-mono text-slate-800 font-medium break-all text-[11.5px]">
                      {selectedItem.endpoint || 'Thao tác trực tiếp'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[11px]">Thời gian ghi nhận</span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      {selectedItem.formattedTime}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[11px]">Thời gian phản hồi</span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      {selectedItem.durationMs !== undefined
                        ? `${selectedItem.durationMs}ms`
                        : 'Tức thì'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[11px]">Người thực hiện</span>
                    <span className="text-slate-700 font-medium text-[11.5px]">
                      {selectedItem.userName || 'Chưa đăng nhập'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* PHẦN 2: NỘI DUNG THÔNG BÁO CHI TIẾT */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Nội dung thông báo</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedItem.message, 'msg')}
                    className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] font-medium lowercase cursor-pointer"
                    title="Sao chép nội dung"
                  >
                    {copiedKey === 'msg' ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>Sao chép</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 select-text">
                  {parsedErrorLines.length > 0 ? (
                    parsedErrorLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="border-l-2 border-rose-500 pl-2.5 py-0.5 text-xs text-slate-800 leading-relaxed font-normal break-words"
                      >
                        {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic text-xs py-1">
                      Không có nội dung thông báo cụ thể
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CỘT BÊN PHẢI: DANH SÁCH THÔNG BÁO (CỐ ĐỊNH 420px)         */}
        {/* ========================================================= */}
        <div className="w-[420px] shrink-0 flex flex-col h-full bg-white">
          {/* HEADER DANH SÁCH THÔNG BÁO */}
          <div className="h-10 px-3.5 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
            {/* Tiêu đề góc trái */}
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-slate-700 shrink-0 stroke-[2]" />
              <span className="font-bold text-[13px] text-slate-800 tracking-tight whitespace-nowrap">
                Thông báo
              </span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-[3px]">
                {displayedLogs.length}
                {appliedKeyword && ` / ${logs.length}`}
              </span>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-[3px] whitespace-nowrap"
                  title={`${unreadCount} thông báo chưa đọc`}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {/* Các nút góc phải: Đánh dấu tất cả đã đọc / Bật tìm kiếm / Dọn sạch / Đóng */}
            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck size={14} className="stroke-[2]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen((prev) => !prev)
                  if (isSearchOpen) handleResetSearch()
                }}
                className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                  isSearchOpen || appliedKeyword
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title="Tìm kiếm thông báo (Enter để tìm)"
              >
                <Search size={14} className="stroke-[2.2]" />
              </button>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
                  title="Dọn sạch toàn bộ thông báo trang này"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* THANH TÌM KIẾM: CHỈ TÌM KHI BẤM ENTER HOẶC CLICK NÚT TÌM KIẾM */}
          {isSearchOpen && (
            <div className="h-8 px-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 shrink-0 animate-in fade-in duration-100">
              <input
                ref={searchInputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTriggerSearch()
                  }
                }}
                placeholder="Nhập từ khóa rồi bấm Enter hoặc Tìm..."
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none border-none h-full font-medium"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={handleTriggerSearch}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium rounded-[2px] transition-colors cursor-pointer flex items-center gap-1"
                title="Bấm để tìm kiếm"
              >
                <Search size={11} />
                <span>Tìm</span>
              </button>
            </div>
          )}

          {/* DANH SÁCH CÁC DÒNG THÔNG BÁO (CHUNK LAZY SCROLLING) */}
          <div onScroll={handleListScroll} className="flex-1 overflow-y-auto overflow-x-hidden">
            {isLoading && logs.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                <span>Đang tải danh sách thông báo...</span>
              </div>
            ) : displayedLogs.length === 0 ? (
              <div className="py-20 px-4 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={30} className="text-emerald-500 stroke-[1.5]" />
                <span className="font-semibold text-slate-700 text-xs">
                  {appliedKeyword
                    ? `Không tìm thấy thông báo khớp "${appliedKeyword}"`
                    : 'Không có thông báo lỗi hay cảnh báo'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {appliedKeyword
                    ? 'Thử tìm kiếm với từ khóa khác'
                    : 'Mọi hoạt động trên trang đang ổn định'}
                </span>
              </div>
            ) : (
              visibleLogs.map((item, index) => {
                const isSelected =
                  Boolean(selectedItem) &&
                  item.id !== undefined &&
                  item.id !== null &&
                  (selectedItem.id === item.id || String(selectedItem.id) === String(item.id))
                const primaryTitle =
                  item.action ||
                  item.menuName ||
                  (item.logTypeName
                    ? item.logTypeName
                        .replace(/Backend/g, '')
                        .replace(/API/g, 'máy chủ')
                        .replace(/Lỗi nghiệp vụ/g, 'Lỗi xử lý dữ liệu')
                        .trim()
                    : 'Thông báo hệ thống')
                const isRead = Boolean(item.isRead)

                return (
                  <div
                    key={item.id || index}
                    onClick={() => handleSelectLog(item)}
                    className={`group flex items-start gap-2.5 px-3.5 py-2.5 min-h-[52px] cursor-pointer select-none border-b border-slate-100 border-l-[3px] transition-colors duration-75 ${
                      isSelected
                        ? 'bg-blue-50/90 !border-l-blue-600'
                        : isRead
                          ? 'bg-white hover:bg-slate-50/90 border-l-transparent'
                          : 'bg-blue-50/20 hover:bg-slate-50 border-l-transparent'
                    }`}
                  >
                    {/* Icon đầu dòng + Chấm xanh chưa đọc */}
                    <div className="shrink-0 pt-0.5 flex items-center justify-center relative">
                      <AlertCircle
                        className={`w-4 h-4 stroke-[1.8] ${
                          isSelected ? 'text-blue-600' : isRead ? 'text-slate-400' : 'text-rose-500'
                        }`}
                      />
                      {!isRead && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-white"
                          title="Chưa đọc"
                        />
                      )}
                    </div>

                    {/* Khối thông tin */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      {/* HÀNG 1: TÊN CHỨC NĂNG / TÁC VỤ + THỜI GIAN */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs truncate ${
                            isSelected
                              ? 'text-blue-900 font-bold'
                              : isRead
                                ? 'text-slate-700 font-normal'
                                : 'text-slate-900 font-semibold'
                          }`}
                          title={primaryTitle}
                        >
                          {primaryTitle}
                        </span>

                        {/* Thời gian & Nút toggle trạng thái đọc khi hover */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleReadStatus(item.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 rounded transition-opacity cursor-pointer"
                            title={isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                          >
                            {isRead ? <Mail size={11} /> : <MailOpen size={11} />}
                          </button>
                          <span
                            className={`font-mono text-[10.5px] shrink-0 whitespace-nowrap ${
                              isSelected
                                ? 'text-blue-600 font-medium'
                                : 'text-slate-400 font-normal'
                            }`}
                          >
                            {item.formattedTime || item.createdAt?.split('T')?.[0]}
                          </span>
                        </div>
                      </div>

                      {/* HÀNG 2: NỘI DUNG THÔNG BÁO RÚT GỌN */}
                      <p
                        className={`text-[11.5px] truncate leading-snug ${
                          isSelected
                            ? 'text-blue-800/90'
                            : isRead
                              ? 'text-slate-400'
                              : 'text-slate-600'
                        }`}
                        title={translateErrorCodeOrMessage(item.message, item.errorCode)}
                      >
                        {translateErrorCodeOrMessage(item.message, item.errorCode)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* MODAL XÁC NHẬN CHUẨN HỆ THỐNG RA GIỮA MÀN HÌNH */}
        <SystemConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          subMessage={confirmDialog.subMessage}
          confirmText={confirmDialog.confirmText}
          cancelText="Hủy bỏ"
          type="delete"
          confirmVariant="danger"
          onConfirm={async () => {
            closeConfirm()
            if (typeof confirmDialog.onConfirm === 'function') {
              await confirmDialog.onConfirm()
            }
          }}
          onCancel={closeConfirm}
        />

        {/* CUSTOM TOAST NOTIFICATION */}
        {toast.visible && (
          <div className="absolute top-2 right-3 z-50 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-[3px] shadow-lg flex items-center gap-1.5 animate-in fade-in duration-100">
            {toast.type === 'error' ? (
              <AlertCircle size={12} className="text-rose-400" />
            ) : (
              <Check size={12} className="text-emerald-400" />
            )}
            <span>{toast.text}</span>
          </div>
        )}
      </div>
    </div>
  )
}
