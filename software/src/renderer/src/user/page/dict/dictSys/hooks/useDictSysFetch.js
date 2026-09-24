import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { generateEmptyData } from '../../../../components/sheet/js/generateEmptyData'
import { useFetchGenericData } from '../../../../hooks/useFetchGenericData'
import { getQueryPagination } from '../../../../configs/audConfig'
import { PostQDict, PostQLang } from '../../../../../api/dict'

export const EMPTY_TEMPLATE_COUNT = 50

export const extractRealRows = (rows) => {
  return (rows || []).filter((r) => {
    if (!r) return false
    const rawId = r.IdSeq ?? r.Id
    if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
      return true
    }
    const tag = r.WorkingTag || r.Status
    if (tag === 'U' || tag === 'E' || tag === 'D') {
      return true
    }
    if (
      (r.Word && String(r.Word).trim() !== '') ||
      (r.WordSeq && String(r.WordSeq).trim() !== '')
    ) {
      return true
    }
    return false
  })
}

export function useDictSysFetch({
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
  const initialPagination = getQueryPagination('DICTIONARY', { customLimits })

  const [languages, setLanguages] = useState([])

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

  const { fetchGenericData } = useFetchGenericData(loadingBarRef, controllers)

  // Fetch languages list
  useEffect(() => {
    PostQLang({ KeyItem1: '' })
      .then((res) => {
        if (res && res.success && Array.isArray(res.data)) {
          setLanguages(res.data)
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh mục ngôn ngữ:', err)
      })
  }, [])

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
        controllerKey: 'PostQDict',
        postFunction: PostQDict,
        searchParams,
        defaultCols: defaultColsRef.current,
        useEmptyData: false,
        afterFetch: (data, response) => {
          if (!response || !response.success) {
            if (isManual && setStatusMessage) {
              setStatusMessage({
                type: 'error',
                text: response?.message || t('Lỗi khi tải dữ liệu!')
              })
            }
            isSearchingRef.current = false
            isLoadingNextPageRef.current = false
            return
          }

          const resPage = response?.page || {}
          const rawItems = Array.isArray(data) ? data : []
          const realCount = rawItems.length
          const total = resPage.total !== undefined ? resPage.total : realCount
          const totalAll = resPage.totalAll !== undefined ? resPage.totalAll : total
          const hasMore = resPage.hasMore !== undefined ? resPage.hasMore : realCount < total
          const nextCursor = resPage.nextCursor || ''

          const emptyRows = canCreateRef.current
            ? generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultColsRef.current)
            : []
          const combinedData = updateIndexNo([...rawItems, ...emptyRows])
          setGridData(combinedData)
          setNumRows(combinedData.length)

          if (resetTable) {
            resetTable()
          }

          const currentScrollers = document.querySelectorAll(
            '.dvn-scroller, [data-testid="data-grid-canvas"]'
          )
          currentScrollers.forEach((el) => {
            el.scrollTop = 0
            el.scrollLeft = 0
          })

          const totalPages = Math.ceil(total / (resPage.pageSize || 1500)) || 1

          const updatedPageInfo = {
            page: 1,
            pageSize: resPage.pageSize || 1500,
            total,
            totalAll,
            totalPages,
            loadedCount: realCount,
            hasMore,
            nextCursor,
            isLoading: false
          }

          setPageInfo(updatedPageInfo)
          pageInfoRef.current = updatedPageInfo

          if (setPageData) {
            setPageData((prev) => ({
              ...prev,
              total,
              totalAll,
              loadedCount: realCount,
              page: 1,
              pageSize: resPage.pageSize || 1500,
              totalPages,
              hasMore,
              nextCursor
            }))
          }

          if (isManual && setStatusMessage) {
            setStatusMessage({
              type: 'success',
              text: t('Đã tải dữ liệu thành công!')
            })
          }

          setTimeout(() => {
            isSearchingRef.current = false
            isLoadingNextPageRef.current = false
          }, 300)
        }
      })
    },
    [
      buildSearchParams,
      fetchGenericData,
      setGridData,
      setNumRows,
      resetTable,
      setPageData,
      setStatusMessage,
      t
    ]
  )

  useEffect(() => {
    if (
      canView !== false &&
      !hasInitialFetchedRef.current &&
      defaultCols &&
      defaultCols.length > 0
    ) {
      hasInitialFetchedRef.current = true
      executeSearch({ isManual: false })
    }
  }, [canView, defaultCols, executeSearch])

  useEffect(() => {
    const handleMenuRefresh = () => {
      executeSearch({ isManual: false })
    }
    window.addEventListener('page-menu-refresh', handleMenuRefresh)
    return () => window.removeEventListener('page-menu-refresh', handleMenuRefresh)
  }, [executeSearch])

  const onVisibleRegionChanged = useCallback(
    (range) => {
      if (isSearchingRef.current || isLoadingNextPageRef.current) return

      const currentInfo = pageInfoRef.current
      const total = currentInfo.total || 0
      const loadedCount = currentInfo.loadedCount || 0
      const pageSize = currentInfo.pageSize || 1500

      if (total === 0) return

      if (currentInfo.hasMore && !isLoadingNextPageRef.current && loadedCount < total) {
        const bufferLookahead = Math.min(1000, Math.max(300, Math.floor(pageSize * 0.5)))
        const triggerThreshold = Math.max(0, loadedCount - bufferLookahead)
        const viewportBottom = (range.y || 0) + (range.height || 0)

        if (viewportBottom >= triggerThreshold) {
          const nextPage = Math.floor(loadedCount / pageSize) + 1
          if (loadingChunksRef.current.has(nextPage)) return

          isLoadingNextPageRef.current = true
          loadingChunksRef.current.add(nextPage)

          const offset = loadedCount
          const limit = Math.min(pageSize, total - offset)

          const params = {
            ...currentSearchParamsRef.current,
            Offset: offset,
            Limit: limit,
            Page: nextPage,
            PageSize: limit
          }

          PostQDict(params)
            .then((res) => {
              if (res && res.success && res.data) {
                const newItems = Array.isArray(res.data) ? res.data : [res.data]
                if (newItems.length > 0) {
                  setGridData((prev) => {
                    const realRows = extractRealRows(prev)
                    const existingDbIds = new Set(
                      realRows
                        .map((r) => String(r.IdSeq ?? r.Id))
                        .filter((id) => id && id.trim() !== '')
                    )
                    const deduplicatedNew = newItems.filter((item) => {
                      const id = String(item.IdSeq ?? item.Id)
                      return !id || !existingDbIds.has(id)
                    })

                    const updatedRealRows = [...realRows, ...deduplicatedNew]
                    const emptyRows = canCreateRef.current
                      ? generateEmptyData(EMPTY_TEMPLATE_COUNT, defaultColsRef.current)
                      : []
                    const nextData = updateIndexNo([...updatedRealRows, ...emptyRows])
                    if (setNumRows) {
                      setNumRows(nextData.length)
                    }
                    return nextData
                  })

                  const nextLoadedTotal = loadedCount + newItems.length
                  const stillHasMore = nextLoadedTotal < total

                  const nextInfo = {
                    ...currentInfo,
                    loadedCount: nextLoadedTotal,
                    hasMore: stillHasMore,
                    page: nextPage,
                    isLoading: false
                  }

                  setPageInfo(nextInfo)
                  pageInfoRef.current = nextInfo

                  if (setPageData) {
                    setPageData((prev) => ({
                      ...prev,
                      loadedCount: nextLoadedTotal,
                      hasMore: stillHasMore,
                      page: nextPage
                    }))
                  }
                }
              }
            })
            .catch((err) => {
              console.error('Lỗi khi tải ngầm dữ liệu từ điển:', err)
              loadingChunksRef.current.delete(nextPage)
            })
            .finally(() => {
              isLoadingNextPageRef.current = false
            })
        }
      }
    },
    [setGridData, setNumRows, setPageData]
  )

  return {
    languages,
    pageInfo,
    executeSearch,
    onVisibleRegionChanged
  }
}
