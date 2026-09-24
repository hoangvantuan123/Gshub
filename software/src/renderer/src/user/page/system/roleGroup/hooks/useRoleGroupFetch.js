import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { generateEmptyData } from '../../../../components/sheet/js/generateEmptyData'
import { useFetchGenericData } from '../../../../hooks/useFetchGenericData'
import { getQueryPagination } from '../../../../configs/audConfig'
import { PostQRoleGroup } from '../../../../../api/system'

export const EMPTY_TEMPLATE_COUNT = 50

export const extractRealRows = (rows) => {
  return (rows || []).filter((r) => {
    if (!r) return false
    const rawId = r.Id ?? r.IdSeq
    const numId = Number(rawId)
    if (
      rawId !== undefined &&
      rawId !== null &&
      String(rawId).trim() !== '' &&
      !isNaN(numId) &&
      numId > 0
    ) {
      return true
    }
    const tag = r.WorkingTag || r.Status
    if (tag === 'U' || tag === 'E' || tag === 'D') {
      return true
    }
    if (r.Name && String(r.Name).trim() !== '') {
      return true
    }
    return false
  })
}

export function useRoleGroupFetch({
  buildSearchParams,
  setGridData,
  setNumRows,
  resetTable,
  defaultCols,
  canCreate,
  canView,
  loadingBarRef,
  controllers,
  setPageData,
  setStatusMessage,
  customLimits
}) {
  const { t } = useTranslation()
  const initialPagination = getQueryPagination('ROLE_GROUP', { customLimits })

  const [pageInfo, setPageInfo] = useState({
    page: initialPagination.page || 1,
    pageSize: initialPagination.pageSize || 1500,
    total: 0,
    totalAll: 0,
    loadedCount: 0,
    hasMore: false,
    nextCursor: '',
    isLoading: false
  })

  const pageInfoRef = useRef(pageInfo)
  pageInfoRef.current = pageInfo

  const canCreateRef = useRef(canCreate)
  canCreateRef.current = canCreate

  const defaultColsRef = useRef(defaultCols)
  defaultColsRef.current = defaultCols

  const currentSearchParamsRef = useRef({})
  const isSearchingRef = useRef(false)
  const isLoadingNextPageRef = useRef(false)
  const loadingChunksRef = useRef(new Set())
  const hasInitialFetchedRef = useRef(false)

  const { fetchGenericData } = useFetchGenericData(loadingBarRef, controllers, setStatusMessage)

  const executeSearch = useCallback(
    ({ isManual = true } = {}) => {
      isSearchingRef.current = true
      isLoadingNextPageRef.current = true
      loadingChunksRef.current.clear()
      const searchParams = buildSearchParams ? buildSearchParams() : {}
      currentSearchParamsRef.current = searchParams

      const scrollers = document.querySelectorAll('.dvn-scroller, [data-testid="data-grid-canvas"]')
      scrollers.forEach((el) => {
        el.scrollTop = 0
        el.scrollLeft = 0
      })

      if (isManual && setStatusMessage) {
        setStatusMessage({ type: 'info', text: t('Đang tải dữ liệu...') })
      }

      fetchGenericData({
        controllerKey: 'PostQRoleGroup',
        postFunction: PostQRoleGroup,
        searchParams: [searchParams],
        useEmptyData: false,
        defaultCols: defaultColsRef.current,
        setStatusMessage,
        afterFetch: (data, rawResponse) => {
          if (!rawResponse || !rawResponse.success) {
            if (setStatusMessage) {
              setStatusMessage({
                type: 'error',
                text: rawResponse?.message || t('Lỗi khi tải dữ liệu!')
              })
            }
            if (canCreateRef.current) {
              const emptyRows = generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultColsRef.current)
              updateIndexNo(emptyRows)
              setGridData(emptyRows)
              setNumRows(emptyRows.length)
            } else {
              setGridData([])
              setNumRows(0)
            }
            isSearchingRef.current = false
            isLoadingNextPageRef.current = false
            return
          }

          let list = []
          if (Array.isArray(data)) {
            list = data
          } else if (data?.data && Array.isArray(data.data)) {
            list = data.data
          }

          const rawTotal =
            rawResponse?.total ??
            rawResponse?.Total ??
            rawResponse?.totalAll ??
            rawResponse?.TotalAll ??
            list.length
          const totalRecords = Number(rawTotal) || list.length
          const nextCursor = rawResponse?.nextCursor ?? rawResponse?.NextCursor ?? ''
          const pageSize = pageInfoRef.current.pageSize || 1500
          const hasMore = list.length >= pageSize || Boolean(nextCursor)

          setPageInfo({
            page: 1,
            pageSize,
            total: totalRecords,
            totalAll: totalRecords,
            loadedCount: list.length,
            hasMore,
            nextCursor,
            isLoading: false
          })

          if (setPageData) {
            setPageData((prev) => ({
              ...prev,
              totalRecords,
              total: totalRecords,
              totalAll: totalRecords,
              page: 1,
              pageSize,
              hasMore,
              nextCursor,
              loadedCount: list.length
            }))
          }

          let finalRows = list
          if (canCreateRef.current) {
            const emptyRows = generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultColsRef.current)
            finalRows = [...list, ...emptyRows]
          }

          updateIndexNo(finalRows)
          setGridData(finalRows)
          setNumRows(finalRows.length)

          if (isManual && setStatusMessage) {
            setStatusMessage({
              type: 'success',
              text: t('Tải thành công {{count}} bản ghi', { count: list.length.toLocaleString() })
            })
          }

          isSearchingRef.current = false
          isLoadingNextPageRef.current = false
        }
      })
    },
    [buildSearchParams, fetchGenericData, setGridData, setNumRows, setPageData, setStatusMessage, t]
  )

  const fetchNextPage = useCallback(
    (pageToFetch) => {
      if (isLoadingNextPageRef.current || isSearchingRef.current) return
      if (!pageInfoRef.current.hasMore && pageToFetch !== 1) return

      isLoadingNextPageRef.current = true
      const searchParams = {
        ...currentSearchParamsRef.current,
        page: pageToFetch,
        pageSize: pageInfoRef.current.pageSize,
        cursor: pageInfoRef.current.nextCursor
      }

      fetchGenericData({
        controllerKey: 'PostQRoleGroup_NextPage',
        postFunction: PostQRoleGroup,
        searchParams: [searchParams],
        useEmptyData: false,
        defaultCols: defaultColsRef.current,
        afterFetch: (data, rawResponse) => {
          let list = []
          if (Array.isArray(data)) {
            list = data
          } else if (data?.data && Array.isArray(data.data)) {
            list = data.data
          }

          const nextCursor = rawResponse?.nextCursor ?? rawResponse?.NextCursor ?? ''
          const pageSize = pageInfoRef.current.pageSize || 1500
          const hasMore = list.length >= pageSize || Boolean(nextCursor)

          setGridData((prevRows) => {
            const realExisting = extractRealRows(prevRows)
            const combined = [...realExisting, ...list]
            let finalRows = combined
            if (canCreateRef.current) {
              const emptyRows = generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultColsRef.current)
              finalRows = [...combined, ...emptyRows]
            }
            updateIndexNo(finalRows)
            setNumRows(finalRows.length)
            return finalRows
          })

          setPageInfo((prev) => ({
            ...prev,
            page: pageToFetch,
            loadedCount: prev.loadedCount + list.length,
            hasMore,
            nextCursor,
            isLoading: false
          }))

          isLoadingNextPageRef.current = false
        }
      })
    },
    [fetchGenericData, setGridData, setNumRows]
  )

  const onVisibleRegionChanged = useCallback(
    (range) => {
      if (!pageInfoRef.current.hasMore || isLoadingNextPageRef.current) return
      const loaded = pageInfoRef.current.loadedCount || 0
      if (loaded === 0) return

      const bufferThreshold = 300
      if (range.y + range.height >= loaded - bufferThreshold) {
        const nextPage = (pageInfoRef.current.page || 1) + 1
        fetchNextPage(nextPage)
      }
    },
    [fetchNextPage]
  )

  // Initial load
  useEffect(() => {
    if (!hasInitialFetchedRef.current && canView) {
      hasInitialFetchedRef.current = true
      executeSearch({ isManual: false })
    }
  }, [canView, executeSearch])

  return {
    pageInfo,
    executeSearch,
    fetchNextPage,
    onVisibleRegionChanged
  }
}
