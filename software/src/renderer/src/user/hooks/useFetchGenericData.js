import { useCallback, useRef } from 'react'
import { togglePageInteraction } from '../../utils/togglePageInteraction'
import { HandleError } from '../page/default/handleError'
import { updateIndexNo } from '../components/sheet/js/updateIndexNo'
import { generateEmptyData } from '../components/sheet/js/generateEmptyData'

export const useFetchGenericData = (loadingBarRef, controllers, setStatusMessage) => {
  const defaultControllersRef = useRef({})
  const activeControllers = controllers || defaultControllersRef
  const activeFetchCountRef = useRef(0)

  const increaseFetchCount = useCallback(() => {
    activeFetchCountRef.current += 1
  }, [])

  const decreaseFetchCount = useCallback(() => {
    activeFetchCountRef.current -= 1
    if (activeFetchCountRef.current === 0) {
      loadingBarRef.current?.complete()
      togglePageInteraction(false)
    }
  }, [loadingBarRef])

  const fetchGenericData = useCallback(
    async ({
      controllerKey,
      postFunction,
      searchParams,
      useEmptyData = true,
      defaultCols,
      setStatusMessage: callerSetStatusMessage,
      afterFetch = () => {}
    }) => {
      if (activeControllers.current?.[controllerKey]) {
        activeControllers.current[controllerKey].abort()
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      increaseFetchCount()

      const controller = new AbortController()
      if (activeControllers.current) {
        activeControllers.current[controllerKey] = controller
      }
      const { signal } = controller

      loadingBarRef.current?.continuousStart()

      try {
        const response = await postFunction(searchParams, signal)

        // Bỏ qua nếu request bị hủy / abort bởi thao tác tìm kiếm mới
        if (response?.isCanceled || response?.message === 'canceled') {
          return
        }

        const effectiveSetStatus = callerSetStatusMessage || setStatusMessage
        if (!response.success) {
          const errMsg = response.message || 'Đã xảy ra lỗi vui lòng thử lại!'
          if (typeof effectiveSetStatus === 'function') {
            effectiveSetStatus({
              type: 'error',
              text: errMsg
            })
          } else {
            HandleError([
              {
                success: false,
                message: errMsg
              }
            ])
          }
        }
        const rawData = response.success ? response.data : []
        const data = Array.isArray(rawData)
          ? rawData
          : rawData && typeof rawData === 'object'
            ? [rawData]
            : []

        let mergedData = updateIndexNo(data)

        if (useEmptyData) {
          const emptyData = updateIndexNo(generateEmptyData(100, defaultCols))
          mergedData = updateIndexNo([...data, ...emptyData])
        }

        await afterFetch(mergedData, response)
      } catch (error) {
        const isCanceled =
          error?.name === 'CanceledError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message === 'canceled'

        if (isCanceled) {
          return
        }

        let emptyData = []

        if (useEmptyData) {
          emptyData = updateIndexNo(generateEmptyData(100, defaultCols))
        }

        await afterFetch(emptyData, null)
      } finally {
        decreaseFetchCount()
        if (activeControllers.current && activeControllers.current[controllerKey] === controller) {
          activeControllers.current[controllerKey] = null
        }
      }
    },
    [increaseFetchCount, decreaseFetchCount, activeControllers, loadingBarRef]
  )

  const fetchNextPage = useCallback(
    async ({
      postFunction,
      searchParams,
      pageInfo,
      setPageInfo,
      setGridData,
      setNumRows,
      setStatusMessage,
      t = (s) => s
    }) => {
      if (!pageInfo || !pageInfo.hasMore || pageInfo.isLoading) return false

      setPageInfo((prev) => ({ ...prev, isLoading: true }))
      const nextPage = (pageInfo.page || 1) + 1
      const params = {
        ...searchParams,
        Page: nextPage,
        Cursor: pageInfo.nextCursor || '',
        LastId: pageInfo.nextCursor || '',
        Limit: pageInfo.pageSize || 1500
      }

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'info',
          text: t(`Đang tải thêm dữ liệu (Trang {{page}})...`, { page: nextPage })
        })
      }

      try {
        const response = await postFunction(params)
        if (!response || !response.success) {
          setPageInfo((prev) => ({ ...prev, isLoading: false }))
          return false
        }

        const newItems = Array.isArray(response.data)
          ? response.data
          : response.data
            ? [response.data]
            : []
        if (newItems.length === 0) {
          setPageInfo((prev) => ({ ...prev, hasMore: false, isLoading: false }))
          return false
        }

        setGridData((prev) => {
          const realItems = prev.filter(
            (item) => item && (item.Id || item.Key || item.Label || item.Status)
          )
          const nextCombined = updateIndexNo([...realItems, ...newItems])
          if (typeof setNumRows === 'function') {
            setNumRows(nextCombined.length)
          }
          return nextCombined
        })

        const resPage = response.page || {}
        const total = resPage.total !== undefined ? resPage.total : pageInfo.total
        const totalAll = resPage.totalAll !== undefined ? resPage.totalAll : pageInfo.totalAll
        const loadedCount = (pageInfo.loadedCount || 0) + newItems.length
        const hasMore = resPage.hasMore !== undefined ? resPage.hasMore : loadedCount < total
        const nextCursor = resPage.nextCursor || String(newItems[newItems.length - 1]?.Id || '')

        setPageInfo((prev) => ({
          ...prev,
          page: nextPage,
          loadedCount,
          total,
          totalAll,
          hasMore,
          nextCursor,
          isLoading: false
        }))

        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'success',
            text:
              total !== totalAll && totalAll > 0
                ? t(`Đã tải {{loaded}} / {{totalAll}} Root Menu`, { loaded: loadedCount, totalAll })
                : t(`Đã tải {{loaded}} / {{total}} Root Menu`, { loaded: loadedCount, total })
          })
        }

        return true
      } catch (err) {
        console.error('Lỗi khi tải trang tiếp theo:', err)
        setPageInfo((prev) => ({ ...prev, isLoading: false }))
        return false
      }
    },
    []
  )

  return { fetchGenericData, fetchNextPage }
}
