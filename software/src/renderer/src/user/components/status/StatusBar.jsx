import { usePageData } from '../../../context/PageDataContext'
import BreadcrumbRouter from '../sildebar/breadcrumb'
import { useState, useEffect, memo, useCallback } from 'react'
import {
  Radio,
  Wifi,
  WifiOff,
  User,
  Database,
  Columns3,
  History,
  Loader2,
  Zap,
  PlusCircle,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  Bell
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useRealtimeContext } from '../../../api/realtime/context/RealtimeContext'
import AppUpdateWidget from './AppUpdateWidget'
import RouteNotificationModal from './RouteNotificationModal'
import { getApiLogStats, cleanRoutePath } from '../../../IndexedDB/loadApiLogData'

const StatusItem = ({
  id,
  icon: Icon,
  iconClass = 'w-3 h-3 text-slate-500',
  children,
  title,
  to,
  onClick,
  className = ''
}) => {
  const content = (
    <div
      id={id}
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 h-full border-l border-gray-200 select-none ${
        to || onClick ? 'hover:bg-gray-50 transition-colors cursor-pointer text-gray-700' : ''
      } ${className}`}
      title={title}
    >
      {Icon && <Icon className={`${iconClass} shrink-0`} />}
      {children}
    </div>
  )

  return to ? (
    <Link to={to} className="h-full flex items-center">
      {content}
    </Link>
  ) : (
    content
  )
}

// Config màu sắc và icon cho thông báo nghiệp vụ
const STATUS_CONFIGS = {
  success: { icon: CheckCircle2, textClass: 'text-emerald-600', iconClass: 'text-emerald-600' },
  error: { icon: AlertCircle, textClass: 'text-rose-600', iconClass: 'text-rose-600' },
  warning: { icon: AlertCircle, textClass: 'text-amber-600', iconClass: 'text-amber-600' },
  info: { icon: Info, textClass: 'text-blue-600', iconClass: 'text-blue-600' }
}

const StatusBar = ({ rootMenu, menuTransForm, userName }) => {
  const { pageData, loadingInfo } = usePageData()
  const realtimeContext = useRealtimeContext()
  const { isConnected, status: realtimeStatus, currentUser } = realtimeContext || {}
  const location = useLocation()

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const [routeLogStats, setRouteLogStats] = useState({
    total: 0,
    serverApiErrorCount: 0,
    clientUiErrorCount: 0,
    warningCount: 0
  })

  // Cập nhật số lượng thông báo theo route hiện tại
  const refreshRouteStats = useCallback(async () => {
    if (!location.pathname) return
    try {
      const stats = await getApiLogStats({ route: location.pathname })
      setRouteLogStats(stats)
    } catch (err) {
      console.debug('Lỗi lấy thống kê thông báo theo route:', err)
    }
  }, [location.pathname])

  useEffect(() => {
    refreshRouteStats()
  }, [refreshRouteStats])

  // Lắng nghe các sự kiện log realtime và cập nhật badge thông báo của route
  useEffect(() => {
    const handleEvents = () => {
      refreshRouteStats()
    }

    window.addEventListener('API_LOG_SAVED', handleEvents)
    window.addEventListener('API_LOG_READ_CHANGED', handleEvents)
    window.addEventListener('API_LOG_DELETED', handleEvents)
    return () => {
      window.removeEventListener('API_LOG_SAVED', handleEvents)
      window.removeEventListener('API_LOG_READ_CHANGED', handleEvents)
      window.removeEventListener('API_LOG_DELETED', handleEvents)
    }
  }, [refreshRouteStats])

  const {
    total = 0,
    totalAll = 0,
    loadedCount = undefined,
    page = 1,
    pageSize = 1500,
    totalPages = 1,
    hasMore = false,
    totalColumns = 0,
    createdBy = '',
    createdAt = '',
    updatedBy = '',
    updatedAt = '',
    statusMessage = null,
    rowStatusCounts = { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
  } = pageData || {}
  const { aCount = 0, uCount = 0, dCount = 0, eCount = 0 } = rowStatusCounts || {}
  const { isLoading, lastLoadTime } = loadingInfo || {}
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const activeStatus = statusMessage?.text
    ? STATUS_CONFIGS[statusMessage.type] || STATUS_CONFIGS.info
    : null
  const StatusIcon = activeStatus?.icon

  return (
    <div className="border-t bg-white flex items-center justify-between h-6 shrink-0 px-3 w-full z-20 select-none text-[10px] font-medium">
      {/* Khối bên trái: Điều hướng Menu, Thông báo thao tác, và Thông tin Tạo/Sửa */}
      <div className="flex items-center gap-2 h-full min-w-0 overflow-x-auto scroll-container whitespace-nowrap">
        <BreadcrumbRouter rootMenu={rootMenu} menuTransForm={menuTransForm} />

        {/* Thông báo trạng thái thao tác (Query / Save / Delete / Update / Conflict) */}
        {statusMessage?.text && activeStatus ? (
          <>
            <span className="text-gray-300 shrink-0">|</span>
            <div
              className={`flex items-center gap-1.5 shrink-0 text-[10px] font-semibold ${activeStatus.textClass}`}
              title={statusMessage.text}
            >
              <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${activeStatus.iconClass}`} />
              <span className="max-w-[800px] select-text">{statusMessage.text}</span>
            </div>
          </>
        ) : (
          <>
            {/* Thời gian tạo (Ẩn khi có thông báo trạng thái để dành không gian hiển thị) */}
            {(createdAt || createdBy) && (
              <>
                <span className="text-gray-300 shrink-0">|</span>
                <div className="flex items-center gap-1 shrink-0 text-slate-500">
                  <PlusCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>
                    {createdAt}
                    {createdBy ? ` (${createdBy})` : ''}
                  </span>
                </div>
              </>
            )}

            {/* Thời gian sửa (Ẩn khi có thông báo trạng thái để dành không gian hiển thị) */}
            {(updatedAt || updatedBy) && (
              <>
                <span className="text-gray-300 shrink-0">|</span>
                <div className="flex items-center gap-1 shrink-0 text-slate-500">
                  <Edit3 className="w-3 h-3 text-blue-500 shrink-0" />
                  <span>
                    {updatedAt}
                    {updatedBy ? ` (${updatedBy})` : ''}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Khối bên phải: Thống kê trạng thái A U E + Chỉ số dữ liệu & Hệ thống */}
      <div className="flex items-center text-[9px] font-medium uppercase h-full shrink-0 ml-2">
        {/* Thống kê trạng thái dòng dữ liệu trên bảng (A, U, E) */}
        <div className="flex items-center gap-2 px-2.5 h-full border-l border-gray-200 select-none text-[9.5px]">
          <span
            className={`flex items-center gap-0.5 ${aCount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}
            title="A (Thêm mới hợp lệ): Số dòng mới có dữ liệu sẵn sàng lưu"
          >
            <span>A:</span>
            <span>{aCount}</span>
          </span>
          <span className="text-slate-300">/</span>
          <span
            className={`flex items-center gap-0.5 ${uCount > 0 ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'}`}
            title="U (Cập nhật): Số dòng được chỉnh sửa"
          >
            <span>U:</span>
            <span>{uCount}</span>
          </span>
          <span className="text-slate-300">/</span>
          <span
            className={`flex items-center gap-0.5 ${eCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400 font-medium'}`}
            title="E (Lỗi): Số dòng đang gặp lỗi"
          >
            <span>E:</span>
            <span>{eCount}</span>
          </span>
        </div>

        {/* Số lượng dòng data: Đã tải / Khớp bộ lọc / Tổng toàn bảng */}
        <StatusItem
          icon={Database}
          title={
            totalAll > 0 && total !== totalAll
              ? `Đã tải: ${(loadedCount !== undefined ? loadedCount : total || 0).toLocaleString('en-US')} | Khớp bộ lọc: ${(total || 0).toLocaleString('en-US')} | Tổng toàn bộ bảng DB: ${totalAll.toLocaleString('en-US')} bản ghi`
              : `Đã tải: ${(loadedCount !== undefined ? loadedCount : total || 0).toLocaleString('en-US')} / Tổng: ${(totalAll || total || loadedCount || 0).toLocaleString('en-US')} bản ghi`
          }
        >
          <span className="font-semibold text-slate-700">
            {(loadedCount !== undefined ? loadedCount : total || 0).toLocaleString('en-US')}
            <span className="text-slate-400 font-normal">
              /
              {(totalAll > 0 && total === totalAll
                ? totalAll
                : total || loadedCount || 0
              ).toLocaleString('en-US')}
            </span>
            {totalAll > 0 && total !== totalAll && (
              <span
                className="text-slate-400 text-[8.5px] font-normal ml-1"
                title={`Tổng dữ liệu toàn hệ thống: ${totalAll.toLocaleString('en-US')} bản ghi`}
              >
                (T:{' '}
                {totalAll >= 10000
                  ? `${(totalAll / 1000).toFixed(0)}k`
                  : totalAll.toLocaleString('en-US')}
                )
              </span>
            )}
          </span>
        </StatusItem>

        {/* Đếm tổng số cột */}
        <StatusItem icon={Columns3} title={`Tổng số cột hiển thị: ${totalColumns || 0} cột`}>
          <span className="font-semibold text-slate-700">{totalColumns || 0}</span>
          <span className="text-slate-400 font-normal">Cột</span>
        </StatusItem>

        {/* Thời gian phản hồi API */}
        <div
          className="flex items-center justify-center w-[60px] h-full border-l border-gray-200 select-none"
          title="Thời gian phản hồi API"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          ) : (
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
              <span>{lastLoadTime ? `${lastLoadTime}ms` : '0ms'}</span>
            </span>
          )}
        </div>



        {/* Trạng thái mạng */}
        <StatusItem
          icon={isOnline ? Wifi : WifiOff}
          iconClass={isOnline ? 'w-3 h-3 text-green-500' : 'w-3 h-3 text-red-500'}
        >
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </StatusItem>

        {/* Người dùng đăng nhập */}
        <StatusItem icon={User} to="/erp/u/setting">
          <span>{userName || 'User'}</span>
        </StatusItem>

        {/* Nhật ký Logs */}
        <StatusItem icon={History} to="/erp/u/logs" title="Logs">
          <span>Logs</span>
        </StatusItem>

        {/* Thông báo theo Router hiện tại (Hiển thị số lượng CHƯA ĐỌC) */}
        <StatusItem
          id="status-bar-notification-button"
          icon={Bell}
          iconClass={
            (routeLogStats.unreadCount || 0) > 0
              ? 'w-3 h-3 text-rose-600'
              : (routeLogStats.total || 0) > 0
                ? 'w-3 h-3 text-slate-600'
                : 'w-3 h-3 text-slate-400'
          }
          onClick={() => setIsNotificationModalOpen((prev) => !prev)}
          title={`Thông báo trang: ${routeLogStats.unreadCount || 0} chưa đọc / Tổng ${routeLogStats.total || 0} thông báo (${routeLogStats.serverApiErrorCount || 0} lỗi máy chủ, ${routeLogStats.clientUiErrorCount || 0} lỗi giao diện, ${routeLogStats.warningCount || 0} cảnh báo)`}
          className="hover:text-blue-600 cursor-pointer"
        >
          {(routeLogStats.unreadCount || 0) > 0 ? (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
              {routeLogStats.unreadCount > 99 ? '99+' : routeLogStats.unreadCount}
            </span>
          ) : (
            <span className="text-[9px] text-slate-400 font-mono">0</span>
          )}
        </StatusItem>

        <AppUpdateWidget />
      </div>

      {/* Modal danh sách thông báo theo router hiện tại */}
      <RouteNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        currentRoute={location.pathname}
      />
    </div>
  )
}

export default memo(StatusBar)
