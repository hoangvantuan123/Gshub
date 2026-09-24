/* eslint-disable react/prop-types */
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  startTransition
} from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import apiService from '../services/apiService'
import SystemConfirmModal from '../user/components/modal/SystemConfirmModal'
import { isPageBusy } from '../utils/togglePageInteraction'
import { saveApiLog } from '../IndexedDB/loadApiLogData'
import { preloadRoute } from '../user/routes/router/system.routes'

const PageDataContext = createContext(null)

export const PageDataProvider = ({ children }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [pageData, setPageData] = useState({
    total: 0,
    createdBy: '',
    createdAt: '',
    updatedBy: '',
    updatedAt: '',
    statusMessage: null, // { type: 'info' | 'success' | 'warning' | 'error', text: '' }
    selectionStats: null, // { count: 0, sum: 0, average: 0, min: 0, max: 0, hasNumericStats: false }
    rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
  })

  // Tự động reset dữ liệu và thông báo cũ khi người dùng chuyển sang menu khác
  useEffect(() => {
    setPageData({
      total: 0,
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
      statusMessage: null,
      selectionStats: null,
      rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
    })
    dirtyCheckerRef.current = null
  }, [location.pathname])

  const setStatusMessage = useCallback(
    (msg) => {
      const messageObj = typeof msg === 'string' ? { type: 'info', text: msg } : msg
      setPageData((prev) => ({
        ...prev,
        statusMessage: messageObj
      }))

      // Ghi nhận cảnh báo / lỗi nghiệp vụ từ UI vào IndexedDB
      if (
        messageObj &&
        (messageObj.type === 'error' || messageObj.type === 'warning') &&
        messageObj.text
      ) {
        saveApiLog({
          message: messageObj.text,
          status: messageObj.type,
          isSuccess: false,
          route: location.pathname,
          logType: 'UI_VALIDATION_ERROR'
        }).catch(() => {})
      }
    },
    [location.pathname]
  )

  const setSelectionStats = useCallback((stats) => {
    setPageData((prev) => {
      if (!prev.selectionStats && !stats) return prev
      if (
        prev.selectionStats &&
        stats &&
        prev.selectionStats.count === stats.count &&
        prev.selectionStats.sum === stats.sum &&
        prev.selectionStats.average === stats.average &&
        prev.selectionStats.selectedColsCount === stats.selectedColsCount &&
        prev.selectionStats.selectedRowsCount === stats.selectedRowsCount
      ) {
        return prev
      }
      return { ...prev, selectionStats: stats }
    })
  }, [])

  const [loadingInfo, setLoadingInfo] = useState({
    isLoading: false,
    lastLoadTime: 0
  })

  // State xác nhận điều hướng khi có dữ liệu chưa lưu
  const [navConfirmState, setNavConfirmState] = useState({
    isOpen: false,
    targetPath: '',
    title: '',
    message: '',
    subMessage: ''
  })

  // Ref lưu hàm kiểm tra dirty của trang active hiện tại
  const dirtyCheckerRef = useRef(null)
  const requestCountRef = useRef(0)
  const requestTimesRef = useRef(new Map())

  // Đăng ký hàm kiểm tra dữ liệu chưa lưu cho trang hiện tại
  const registerDirtyChecker = useCallback((checkerFn) => {
    dirtyCheckerRef.current = checkerFn
    return () => {
      if (dirtyCheckerRef.current === checkerFn) {
        dirtyCheckerRef.current = null
      }
    }
  }, [])

  // Điều hướng an toàn (Kiểm tra dữ liệu chưa lưu trước khi đổi route)
  const safeNavigate = useCallback(
    (targetPath, options = {}) => {
      if (!targetPath) return

      // Preload route component ngay lập tức
      preloadRoute(targetPath)

      // 1. Chặn điều hướng khi trang đang tải dữ liệu API
      if (loadingInfo?.isLoading) {
        setStatusMessage?.({
          type: 'warning',
          text: t('Trang đang tải dữ liệu. Vui lòng đợi hoàn tất!')
        })
        return false
      }

      // 2. Nếu hệ thống đang bận (đang dán dữ liệu lớn hoặc đang khóa tương tác)
      if (typeof isPageBusy === 'function' && isPageBusy()) {
        setStatusMessage({
          type: 'warning',
          text: t('Hệ thống đang bận xử lý dữ liệu. Vui lòng đợi hoàn tất!')
        })
        return false
      }

      // 3. Kiểm tra dữ liệu chưa lưu
      const isDirty =
        typeof dirtyCheckerRef.current === 'function' ? dirtyCheckerRef.current() : false

      if (isDirty) {
        setNavConfirmState({
          isOpen: true,
          targetPath,
          title: options.title || t('Xác nhận thay đổi Menu'),
          message: options.message || t('Dữ liệu trên màn hình hiện tại chưa được lưu!'),
          subMessage:
            options.subMessage ||
            t(
              'Nếu bạn chuyển sang menu khác, các thay đổi chưa lưu sẽ bị hủy bỏ. Bạn có chắc chắn muốn tiếp tục?'
            )
        })
        return false
      }

      navigate(targetPath)
      return true
    },
    [navigate, t, setStatusMessage, loadingInfo?.isLoading]
  )

  // Xử lý khi người dùng đồng ý rời trang và hủy thay đổi
  const handleConfirmNav = useCallback(() => {
    const target = navConfirmState.targetPath
    setNavConfirmState((prev) => ({ ...prev, isOpen: false, targetPath: '' }))
    dirtyCheckerRef.current = null // Xóa checker để không chặn lần tới
    if (target) {
      preloadRoute(target)
      navigate(target)
    }
  }, [navConfirmState.targetPath, navigate])

  // Hủy chuyển trang, giữ nguyên ở trang hiện tại
  const handleCancelNav = useCallback(() => {
    setNavConfirmState((prev) => ({ ...prev, isOpen: false, targetPath: '' }))
  }, [])

  // Cảnh báo người dùng khi F5 reload hoặc đóng tab/window nếu có dữ liệu chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isDirty = dirtyCheckerRef.current ? dirtyCheckerRef.current() : false
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    const handleStart = (config) => {
      const reqId = Symbol()
      config.__reqId = reqId
      requestTimesRef.current.set(reqId, performance.now())
      requestCountRef.current += 1

      setLoadingInfo((prev) => {
        if (prev.isLoading) return prev
        return { ...prev, isLoading: true }
      })

      return config
    }

    const handleFinish = (config) => {
      const reqId = config?.__reqId
      if (reqId && requestTimesRef.current.has(reqId)) {
        const startTime = requestTimesRef.current.get(reqId)
        const duration = Math.round(performance.now() - startTime)
        requestTimesRef.current.delete(reqId)
        requestCountRef.current = Math.max(0, requestCountRef.current - 1)

        setLoadingInfo({
          isLoading: requestCountRef.current > 0,
          lastLoadTime: duration
        })
      }
    }

    const apiReqInterceptor = apiService.interceptors.request.use(handleStart, (error) =>
      Promise.reject(error)
    )
    const apiResInterceptor = apiService.interceptors.response.use(
      (response) => {
        handleFinish(response?.config)
        return response
      },
      (error) => {
        handleFinish(error?.config)
        return Promise.reject(error)
      }
    )

    const axiosReqInterceptor = axios.interceptors.request.use(handleStart, (error) =>
      Promise.reject(error)
    )
    const axiosResInterceptor = axios.interceptors.response.use(
      (response) => {
        handleFinish(response?.config)
        return response
      },
      (error) => {
        handleFinish(error?.config)
        return Promise.reject(error)
      }
    )

    return () => {
      apiService.interceptors.request.eject(apiReqInterceptor)
      apiService.interceptors.response.eject(apiResInterceptor)
      axios.interceptors.request.eject(axiosReqInterceptor)
      axios.interceptors.response.eject(axiosResInterceptor)
    }
  }, [])

  const value = useMemo(
    () => ({
      pageData,
      setPageData,
      setStatusMessage,
      setSelectionStats,
      loadingInfo,
      registerDirtyChecker,
      safeNavigate
    }),
    [pageData, loadingInfo, setStatusMessage, setSelectionStats, registerDirtyChecker, safeNavigate]
  )

  return (
    <PageDataContext.Provider value={value}>
      {children}

      {/* Modal xác nhận chuyển menu khi có dữ liệu chưa lưu */}
      <SystemConfirmModal
        isOpen={navConfirmState.isOpen}
        title={navConfirmState.title}
        message={navConfirmState.message}
        subMessage={navConfirmState.subMessage}
        confirmText={t('Hủy thay đổi & Chuyển trang')}
        cancelText={t('Ở lại trang')}
        type="warning"
        confirmVariant="danger"
        onConfirm={handleConfirmNav}
        onCancel={handleCancelNav}
      />
    </PageDataContext.Provider>
  )
}

export const usePageData = () => {
  const context = useContext(PageDataContext)
  return context || {}
}

export default PageDataContext
