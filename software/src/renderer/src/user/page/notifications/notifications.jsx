import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import {
  getApiLogs,
  deleteApiLogsByIds,
  getApiLogStats,
  updateApiLogReadStatus,
  markAllApiLogsRead,
  translateErrorCodeOrMessage
} from '../../../IndexedDB/loadApiLogData'
import SystemConfirmModal from '../../components/modal/SystemConfirmModal'
import NotificationListHeader from './components/NotificationListHeader'
import NotificationList from './components/NotificationList'
import NotificationDetail from './components/NotificationDetail'

const PAGE_CHUNK_SIZE = 50

export default function NotificationsPage() {
  const [selectedTab, setSelectedTab] = useState('ALL')
  const [searchText, setSearchText] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [displayLimit, setDisplayLimit] = useState(PAGE_CHUNK_SIZE)
  const [copiedKey, setCopiedKey] = useState(null)

  // Selection & Checkbox States
  const [selectedCheckIds, setSelectedCheckIds] = useState(new Set())

  // Data States
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    serverApiErrorCount: 0,
    clientUiErrorCount: 0,
    warningCount: 0,
    unreadCount: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

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

  // Dropdown chọn bộ lọc chuẩn CodeHelp
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef(null)

  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!isFilterDropdownOpen) return

    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFilterDropdownOpen])

  const TABS = useMemo(
    () => [
      {
        id: 'ALL',
        label: 'Tất cả',
        count: stats.total,
        source: 'all',
        logType: 'all',
        dotColor: 'bg-[#1677ff]',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200'
      },
      {
        id: 'SERVER_API',
        label: 'Máy chủ',
        count: stats.serverApiErrorCount,
        source: 'SERVER_API',
        logType: 'all',
        dotColor: 'bg-rose-500',
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200'
      },
      {
        id: 'CLIENT_UI',
        label: 'Nhập liệu',
        count: stats.clientUiErrorCount,
        source: 'CLIENT_UI',
        logType: 'all',
        dotColor: 'bg-amber-500',
        badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200'
      },
      {
        id: 'WARNING',
        label: 'Cảnh báo',
        count: stats.warningCount,
        source: 'all',
        logType: 'all',
        status: 'warning',
        dotColor: 'bg-yellow-500',
        badgeStyle: 'bg-yellow-50 text-yellow-700 border-yellow-200'
      }
    ],
    [stats]
  )

  // Nạp toàn bộ dữ liệu từ IndexedDB
  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      let source = 'all'
      let logType = 'all'
      let status = null

      if (selectedTab === 'SERVER_API') source = 'SERVER_API'
      else if (selectedTab === 'CLIENT_UI') source = 'CLIENT_UI'
      else if (selectedTab === 'WARNING') status = 'warning'

      const [res, statsData] = await Promise.all([
        getApiLogs({
          limit: 1000,
          page: 1,
          source,
          logType,
          status,
          search: appliedKeyword
        }),
        getApiLogStats()
      ])

      const dataList = res.data || []
      setLogs(dataList)
      setStats(statsData)

      // Tự động chọn và hiển thị chi tiết thông báo đầu tiên hoặc giữ thông báo đang chọn
      if (dataList.length > 0) {
        setSelectedId((current) => {
          if (current === 'none') return 'none'
          if (current && dataList.some((item) => String(item.id) === String(current))) {
            return current
          }
          return dataList[0].id
        })
      } else {
        setSelectedId(null)
      }
    } catch (err) {
      console.warn('Lỗi đọc logs từ IndexedDB:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTab, appliedKeyword])

  useEffect(() => {
    fetchLogs()

    const handleLogSaved = (e) => {
      const newRecord = e?.detail
      if (!newRecord || typeof newRecord !== 'object') return

      setStats((prev) => {
        const next = {
          ...prev,
          total: (prev.total || 0) + 1,
          unreadCount: (prev.unreadCount || 0) + 1
        }
        if (
          newRecord.source === 'SERVER_API' ||
          newRecord.logType === 'API_ERROR' ||
          newRecord.logType === 'API_BUSINESS_ERROR'
        ) {
          next.serverApiErrorCount = (next.serverApiErrorCount || 0) + 1
        } else if (
          newRecord.source === 'CLIENT_UI' ||
          newRecord.logType === 'UI_VALIDATION_ERROR'
        ) {
          next.clientUiErrorCount = (next.clientUiErrorCount || 0) + 1
        }
        if (newRecord.status === 'warning' || newRecord.logType === 'WARNING') {
          next.warningCount = (next.warningCount || 0) + 1
        }
        return next
      })

      const matchTab =
        selectedTab === 'ALL' ||
        (selectedTab === 'SERVER_API' && newRecord.source === 'SERVER_API') ||
        (selectedTab === 'CLIENT_UI' &&
          (newRecord.source === 'CLIENT_UI' || newRecord.logType === 'UI_VALIDATION_ERROR')) ||
        (selectedTab === 'WARNING' &&
          (newRecord.status === 'warning' || newRecord.logType === 'WARNING'))

      const keywordLower = (appliedKeyword || '').toLowerCase().trim()
      const matchKeyword =
        !keywordLower ||
        String(newRecord.message || '')
          .toLowerCase()
          .includes(keywordLower) ||
        String(newRecord.menuName || '')
          .toLowerCase()
          .includes(keywordLower) ||
        String(newRecord.parentMenu || '')
          .toLowerCase()
          .includes(keywordLower) ||
        String(newRecord.endpoint || '')
          .toLowerCase()
          .includes(keywordLower) ||
        String(newRecord.route || '')
          .toLowerCase()
          .includes(keywordLower)

      if (matchTab && matchKeyword) {
        setLogs((prev) => [
          newRecord,
          ...prev.filter((item) => String(item.id) !== String(newRecord.id))
        ])
      }
    }

    const handleReadChanged = (e) => {
      const detail = e?.detail
      if (detail?.all) {
        setLogs((prev) => prev.map((l) => ({ ...l, isRead: true })))
        setStats((prev) => ({ ...prev, unreadCount: 0 }))
      } else if (detail?.id !== undefined) {
        setLogs((prev) =>
          prev.map((l) =>
            String(l.id) === String(detail.id) ? { ...l, isRead: detail.isRead } : l
          )
        )
      }
    }

    const handleDeleted = () => {
      fetchLogs()
    }

    window.addEventListener('API_LOG_SAVED', handleLogSaved)
    window.addEventListener('API_LOG_READ_CHANGED', handleReadChanged)
    window.addEventListener('API_LOG_DELETED', handleDeleted)

    return () => {
      window.removeEventListener('API_LOG_SAVED', handleLogSaved)
      window.removeEventListener('API_LOG_READ_CHANGED', handleReadChanged)
      window.removeEventListener('API_LOG_DELETED', handleDeleted)
    }
  }, [fetchLogs, selectedTab, appliedKeyword])

  // Dữ liệu cắt lát hiển thị trên DOM
  const visibleData = useMemo(() => {
    return logs.slice(0, displayLimit)
  }, [logs, displayLimit])

  // Bản ghi hiện đang được chọn xem chi tiết ở cột phải
  const selectedRecord = useMemo(() => {
    if (selectedId === 'none') return null
    if (!selectedId) return visibleData[0] || null
    return logs.find((item) => String(item.id) === String(selectedId)) || visibleData[0] || null
  }, [logs, selectedId, visibleData])

  // Phân tách và khử trùng lặp các dòng lỗi chi tiết
  const parsedErrorLines = useMemo(() => {
    if (!selectedRecord?.message) return []
    const raw = String(selectedRecord.message).trim()
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
      translateErrorCodeOrMessage(line, selectedRecord.errorCode)
    )
    return Array.from(new Set(translatedLines))
  }, [selectedRecord?.message, selectedRecord?.errorCode])

  // Tổng số lượng chưa đọc trong danh sách hiển thị
  const unreadCount = useMemo(() => {
    return logs.filter((item) => !item.isRead).length
  }, [logs])

  // Chọn 1 dòng thông báo & tự động đánh dấu là đã đọc
  const handleSelectRecord = useCallback(
    (item) => {
      if (!item) return
      const isOpening = !(
        selectedId &&
        item.id !== undefined &&
        item.id !== null &&
        String(selectedId) === String(item.id)
      )

      if (isOpening) {
        setSelectedId(item.id)
        if (!item.isRead) {
          setLogs((prev) =>
            prev.map((l) => (String(l.id) === String(item.id) ? { ...l, isRead: true } : l))
          )
          updateApiLogReadStatus(item.id, true)
        }
      } else {
        setSelectedId('none')
      }
    },
    [selectedId]
  )

  // Toggle trạng thái Đã đọc / Chưa đọc của một dòng
  const handleToggleReadStatus = useCallback(
    (id, e) => {
      e?.stopPropagation()
      if (id === undefined || id === null) return
      const target = logs.find((l) => String(l.id) === String(id))
      if (!target) return
      const nextRead = !target.isRead
      setLogs((prev) =>
        prev.map((l) => (String(l.id) === String(id) ? { ...l, isRead: nextRead } : l))
      )
      updateApiLogReadStatus(id, nextRead)
    },
    [logs]
  )

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0 && stats.unreadCount === 0) return
    setLogs((prev) => prev.map((l) => ({ ...l, isRead: true })))
    await markAllApiLogsRead(null)
    setStats((prev) => ({ ...prev, unreadCount: 0 }))
  }, [unreadCount, stats.unreadCount])

  // Kiểm tra trạng thái Chọn tất cả
  const isAllSelected = useMemo(() => {
    return visibleData.length > 0 && visibleData.every((item) => selectedCheckIds.has(item.id))
  }, [visibleData, selectedCheckIds])

  // Chuyển đổi chọn tất cả
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCheckIds(new Set())
    } else {
      setSelectedCheckIds(new Set(visibleData.map((item) => item.id)))
    }
  }

  // Chuyển đổi tích chọn 1 item
  const handleToggleCheck = (id, e) => {
    e.stopPropagation()
    setSelectedCheckIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Xóa các bản ghi đã tích chọn (không hiển thị toast góc)
  const handleDeleteSelected = () => {
    if (selectedCheckIds.size === 0) return
    const idsArray = Array.from(selectedCheckIds)

    openConfirm({
      title: 'Xác nhận xóa các thông báo đã chọn',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${idsArray.length} thông báo đã chọn không?`,
      subMessage: 'Dữ liệu thông báo sẽ bị xóa khỏi bộ nhớ hệ thống và không thể khôi phục.',
      confirmText: 'Xóa đã chọn',
      onConfirm: async () => {
        closeConfirm()
        await deleteApiLogsByIds(idsArray)
        setSelectedCheckIds(new Set())
        setLogs((prev) =>
          prev.filter((item) => !idsArray.some((id) => String(id) === String(item.id)))
        )
        if (selectedId && idsArray.some((id) => String(id) === String(selectedId))) {
          setSelectedId('none')
        }
        fetchLogs()
      }
    })
  }

  // Xóa 1 bản ghi đơn lẻ (không hiển thị toast góc)
  const handleDeleteSingle = (id, e) => {
    e?.stopPropagation()
    if (!id) return
    openConfirm({
      title: 'Xác nhận xóa thông báo',
      message: `Bạn có chắc chắn muốn xóa thông báo #${id} này không?`,
      subMessage: 'Thông báo sẽ bị xóa khỏi bộ nhớ hệ thống.',
      confirmText: 'Xóa thông báo',
      onConfirm: async () => {
        closeConfirm()
        await deleteApiLogsByIds([id])
        setSelectedCheckIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        setLogs((prev) => prev.filter((item) => String(item.id) !== String(id)))
        if (selectedId === id || String(selectedId) === String(id)) {
          setSelectedId('none')
        }
        fetchLogs()
      }
    })
  }

  // Sao chép văn bản vào Clipboard
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

  // Kích hoạt tìm kiếm
  const handleTriggerSearch = useCallback(() => {
    setAppliedKeyword(searchText.trim())
    setDisplayLimit(PAGE_CHUNK_SIZE)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [searchText])

  // Xóa input tìm kiếm
  const handleResetSearch = useCallback(() => {
    setSearchText('')
    setAppliedKeyword('')
    setDisplayLimit(PAGE_CHUNK_SIZE)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
    inputRef.current?.focus()
  }, [])

  // Cuộn tải thêm dòng
  const handleScroll = useCallback(
    (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 150) {
        if (displayLimit < logs.length) {
          setDisplayLimit((prev) => Math.min(prev + PAGE_CHUNK_SIZE, logs.length))
        }
      }
    },
    [displayLimit, logs.length]
  )

  // Điều hướng danh sách bằng phím mũi tên [↑/↓]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (visibleData.length === 0 || e.target === inputRef.current) return

      const currentIndex = visibleData.findIndex((n) => String(n.id) === String(selectedRecord?.id))

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = currentIndex < visibleData.length - 1 ? currentIndex + 1 : 0
        const nextItem = visibleData[nextIndex]
        if (nextItem) {
          handleSelectRecord(nextItem)
          const itemElem = listRef.current?.querySelector(`[data-id="${nextItem.id}"]`)
          if (itemElem) {
            itemElem.scrollIntoView({ block: 'nearest' })
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleData.length - 1
        const prevItem = visibleData[prevIndex]
        if (prevItem) {
          handleSelectRecord(prevItem)
          const itemElem = listRef.current?.querySelector(`[data-id="${prevItem.id}"]`)
          if (itemElem) {
            itemElem.scrollIntoView({ block: 'nearest' })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleData, selectedRecord, handleSelectRecord])

  // Phím tắt bàn phím: [Ctrl+Q], [Ctrl+F], [F3], [/] để chọn nhanh vào ô tìm kiếm
  useEffect(() => {
    const handleSearchHotkey = (e) => {
      if (confirmDialog.isOpen) return

      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      const key = e.key ? e.key.toLowerCase() : ''
      const code = e.code || ''

      // 1. Phím tắt Ctrl + Q hoặc Ctrl + F
      if (isCtrlOrMeta && (key === 'q' || key === 'f' || code === 'KeyQ' || code === 'KeyF')) {
        e.preventDefault()
        e.stopPropagation()
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }

      // 2. Phím F3
      if (e.key === 'F3') {
        e.preventDefault()
        e.stopPropagation()
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }

      // 3. Phím '/' khi không gõ trong bất kỳ input/textarea nào
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        e.stopPropagation()
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }

      // 4. Phím Escape: Nếu đang focus ô tìm kiếm, xóa từ khóa hoặc unfocus
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (searchText) {
          handleResetSearch()
        } else {
          inputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleSearchHotkey)
    return () => window.removeEventListener('keydown', handleSearchHotkey)
  }, [confirmDialog.isOpen, searchText, handleResetSearch])

  return (
    <div className="flex h-full w-full bg-[#f8fafc] font-sans select-none overflow-hidden text-slate-800 relative">
      {/* THÔNG BÁO TOAST NỘI BỘ (CHỈ DÙNG CHO SAO CHÉP) */}
      {toast.visible && (
        <div className="fixed top-4 right-4 z-[999999] px-3.5 py-2 rounded-[3px] text-xs font-semibold shadow-lg transition-all animate-in fade-in duration-200 flex items-center gap-2 bg-slate-900 text-white">
          <Check size={14} className="text-emerald-400" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* CỘT TRÁI: SIDEBAR DANH SÁCH MASTER & THANH TÌM KIẾM BỘ LỌC TÍCH HỢP - W: 400px */}
      <div className="w-[400px] border-r border-slate-300 bg-white flex flex-col shrink-0 select-none">
        {/* THANH CÔNG CỤ & TÌM KIẾM BỘ LỌC */}
        <NotificationListHeader
          logsCount={logs.length}
          unreadCount={unreadCount}
          onMarkAllAsRead={handleMarkAllAsRead}
          isAllSelected={isAllSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onRefresh={fetchLogs}
          isLoading={isLoading}
          selectedCheckCount={selectedCheckIds.size}
          onDeleteSelected={handleDeleteSelected}
          selectedTab={selectedTab}
          onSelectTab={setSelectedTab}
          tabs={TABS}
          isFilterDropdownOpen={isFilterDropdownOpen}
          setIsFilterDropdownOpen={setIsFilterDropdownOpen}
          filterDropdownRef={filterDropdownRef}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onTriggerSearch={handleTriggerSearch}
          onResetSearch={handleResetSearch}
          inputRef={inputRef}
        />

        {/* DANH SÁCH THÔNG BÁO */}
        <NotificationList
          listRef={listRef}
          visibleData={visibleData}
          selectedRecord={selectedRecord}
          selectedCheckIds={selectedCheckIds}
          onSelectRecord={handleSelectRecord}
          onToggleCheck={handleToggleCheck}
          isLoading={isLoading}
          appliedKeyword={appliedKeyword}
          onScroll={handleScroll}
        />
      </div>

      {/* CỘT PHẢI: VÙNG HIỂN THỊ CHI TIẾT THÔNG BÁO */}
      <NotificationDetail
        selectedRecord={selectedRecord}
        parsedErrorLines={parsedErrorLines}
        onToggleReadStatus={handleToggleReadStatus}
        onDeleteSingle={handleDeleteSingle}
        onClose={() => setSelectedId('none')}
        onCopyText={handleCopyText}
        copiedKey={copiedKey}
      />

      {/* MODAL HỆ THỐNG XÁC NHẬN XÓA TẬP TRUNG */}
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
        onClose={closeConfirm}
      />
    </div>
  )
}
