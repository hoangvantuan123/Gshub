/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { toApiDate } from '../../../../../utils/dateFormatter'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { togglePageInteraction } from '../../../../../utils/togglePageInteraction'
import { HandleError } from '../../../default/handleError'
import { HandleSuccess } from '../../../default/handleSuccess'
import { openChildWindow } from '../../../../../utils/openChildWindow'
import { useFetchGenericData } from '../../../../hooks/useFetchGenericData'
import { useSaveGenericData } from '../../../../hooks/useSaveGenericData'
import { filterValidRows } from '../../../../../utils/filterUorA'
import { usePageData } from '../../../../../context/PageDataContext'
import {
  PostUUserAuth,
  PostAUserAuth,
  PostQUserAuth,
  PostUUserAuthStatusAcc,
  PostUPass
} from '../../../../../api/system'

export function useUserManagement({
  gridData,
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  defaultCols,
  canCreate,
  canEdit,
  canView,
  canSearch,
  loadingBarRef,
  controllers
}) {
  const { t } = useTranslation()
  const { setPageData, setStatusMessage } = usePageData() || {}
  const userFrom = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const STORAGE_KEY_VALS = 'q_vals_users_manage'
  const STORAGE_KEY_FIELDS = 'q_fields_users_manage'

  // Search state with LocalStorage cache restoration
  const [userId, setUserId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.userId || saved.UserId || ''
    } catch {
      return ''
    }
  })
  const [userName, setUserName] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      return saved.userName || saved.UserName || ''
    } catch {
      return ''
    }
  })
  const [userStatus, setUserStatus] = useState('')
  const [searchValues, setSearchValues] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_VALS) || '{}')
      const clean = { ...saved }
      delete clean.userName
      delete clean.UserName
      delete clean.userId
      delete clean.UserId
      delete clean.KeyItem1
      delete clean.KeyItem2
      delete clean.KeyItem3
      return clean
    } catch {
      return {}
    }
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_FIELDS) || '[]')
      return Array.isArray(stored)
        ? stored.filter(
            (f) =>
              f &&
              f.key !== 'Status' &&
              f.key !== 'StatusAcc' &&
              f.key !== 'userStatus' &&
              f.key !== 'IndexNo' &&
              f.key !== 'IdSeq'
          )
        : []
    } catch {
      return []
    }
  })
  const [dataHelp01] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const { fetchGenericData } = useFetchGenericData(loadingBarRef, controllers)
  const { handleSave } = useSaveGenericData(loadingBarRef)

  // Lưu cache giá trị tìm kiếm vào LocalStorage có debounce tránh lag khi gõ phím
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const cleanVals = {}
        Object.entries(searchValues || {}).forEach(([k, v]) => {
          if (
            k !== 'userName' &&
            k !== 'UserName' &&
            k !== 'userId' &&
            k !== 'UserId' &&
            k !== 'KeyItem1' &&
            k !== 'KeyItem2' &&
            k !== 'KeyItem3' &&
            v !== undefined &&
            v !== null &&
            v !== ''
          ) {
            cleanVals[k] = v
          }
        })
        if (userName && userName.trim()) cleanVals.userName = userName.trim()
        if (userId && userId.trim()) cleanVals.userId = userId.trim()
        localStorage.setItem(STORAGE_KEY_VALS, JSON.stringify(cleanVals))
      } catch (e) {
        console.warn('Lỗi lưu cache query values:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValues, userName, userId])

  // Lưu cache danh sách trường tìm kiếm động vào LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_FIELDS, JSON.stringify(dynamicQueryFields))
      } catch (e) {
        console.warn('Lỗi lưu cache query fields:', e)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [dynamicQueryFields])

  // Thêm động cột lên thanh điều kiện truy vấn khi ấn Ctrl+F trên sheet
  const handleAddQueryField = useCallback((columnKey, colTitle, col) => {
    if (
      !columnKey ||
      columnKey === 'Status' ||
      columnKey === 'StatusAcc' ||
      columnKey === 'userStatus' ||
      columnKey === 'IndexNo' ||
      columnKey === 'IdSeq'
    )
      return
    const normalizedKey = columnKey.toLowerCase()
    if (normalizedKey === 'username' || normalizedKey === 'userid') return

    const isDateField =
      col?.type === 'date-range' ||
      col?.type === 'date' ||
      /Date|CreatedAt|UpdatedAt|Time/i.test(columnKey)

    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key.toLowerCase() === normalizedKey)) return prev
      return [
        ...prev,
        {
          key: columnKey,
          label: colTitle || columnKey,
          type:
            col?.type || (isDateField ? 'date-range' : col?.kind === 'Boolean' ? 'select' : 'text'),
          colSpan: col?.colSpan || (isDateField ? 2 : 1),
          placeholder: `Tìm theo ${colTitle || columnKey}...`,
          options:
            col?.options ||
            (col?.kind === 'Boolean'
              ? [
                  { value: '', label: 'Tất cả' },
                  { value: '1', label: 'Có' },
                  { value: '0', label: 'Không' }
                ]
              : undefined),
          removable: true
        }
      ]
    })
  }, [])

  // Xóa bớt cột điều kiện truy vấn động
  const handleRemoveQueryField = useCallback((key) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== key))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Đặt lại mặc định điều kiện truy vấn và xóa cache
  const handleResetQuery = useCallback(() => {
    setUserName('')
    setUserId('')
    setUserStatus('')
    setSearchValues({})
    setDynamicQueryFields([])
    try {
      localStorage.removeItem(STORAGE_KEY_VALS)
      localStorage.removeItem(STORAGE_KEY_FIELDS)
    } catch {}
    if (setStatusMessage) {
      setStatusMessage({ type: 'info', text: t('Đã đặt lại điều kiện tìm kiếm về mặc định.') })
    }
  }, [t, setStatusMessage])

  // Hàm thực thi truy vấn dữ liệu từ server
  const executeSearch = useCallback(
    ({ isManual = true } = {}) => {
      const searchParams = {}
      if (userName && userName.trim()) searchParams.UserName = userName.trim()
      if (userId && userId.trim()) searchParams.UserId = userId.trim()

      // Gộp tất cả các giá trị tìm kiếm động (bỏ qua các key default của userName/userId)
      Object.entries(searchValues || {}).forEach(([k, v]) => {
        if (
          k === 'userName' ||
          k === 'UserName' ||
          k === 'userId' ||
          k === 'UserId' ||
          k === 'KeyItem1' ||
          k === 'KeyItem2' ||
          k === 'KeyItem3'
        ) {
          return
        }

        if (v !== undefined && v !== null && v !== '') {
          if (k === 'userStatus' || k === 'statusAcc' || k === 'StatusAcc') {
            searchParams.StatusAcc = v
          } else if (k === 'checkPass1' || k === 'CheckPass1') {
            searchParams.CheckPass1 = v
          } else if (k === 'active' || k === 'Active') {
            searchParams.Active = v
          } else if (Array.isArray(v)) {
            // Xử lý Date Range: Tách thành From và To chuẩn YYYY-MM-DD gửi lên backend
            const start = v[0] ? toApiDate(v[0]) : ''
            const end = v[1] ? toApiDate(v[1]) : ''
            if (start) searchParams[`${k}From`] = start
            if (end) searchParams[`${k}To`] = end
          } else if (dayjs.isDayjs(v) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(String(v))) {
            searchParams[k] = toApiDate(v)
          } else if (String(v).trim() !== '') {
            searchParams[k] = String(v).trim()
          }
        }
      })

      if (isManual && setStatusMessage) {
        setStatusMessage({ type: 'info', text: t('Đang tải dữ liệu người dùng...') })
      }

      fetchGenericData({
        controllerKey: 'PostQUserAuth',
        postFunction: PostQUserAuth,
        searchParams,
        defaultCols,
        useEmptyData: true,
        afterFetch: (data, response) => {
          setGridData(data)
          setNumRows(data.length)
          if (resetTable) {
            resetTable()
          }
          const pageInfo = response?.page || {}
          const realCount = (data || []).filter(
            (item) => item && (item.UserSeq || item.UserId)
          ).length
          const total = pageInfo.total !== undefined ? pageInfo.total : realCount
          const totalAll = pageInfo.totalAll !== undefined ? pageInfo.totalAll : total

          if (setPageData) {
            setPageData((prev) => ({
              ...prev,
              total,
              totalAll,
              loadedCount: pageInfo.loadedCount ?? realCount,
              page: pageInfo.page || 1,
              pageSize: pageInfo.pageSize || 1500,
              totalPages: pageInfo.totalPages || 1,
              hasMore: pageInfo.hasMore || false,
              nextCursor: pageInfo.nextCursor || ''
            }))
          }

          if (isManual && setStatusMessage) {
            setStatusMessage({
              type: 'success',
              text:
                total !== totalAll && totalAll > 0
                  ? t(`Tìm thấy {{total}} / {{totalAll}} tài khoản`, { total, totalAll })
                  : t(`Truy vấn hoàn tất: {{count}} tài khoản`, { count: total })
            })
          }
        }
      })
    },
    [
      userName,
      userId,
      searchValues,
      fetchGenericData,
      defaultCols,
      setGridData,
      setNumRows,
      setPageData,
      setStatusMessage,
      t
    ]
  )

  // Tự động tải dữ liệu khi mở menu
  const hasInitialFetchedRef = useRef(false)
  useEffect(() => {
    if (canView && !hasInitialFetchedRef.current && defaultCols && defaultCols.length > 0) {
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

  // Xác nhận hủy thay đổi và tiếp tục truy vấn
  const handleConfirmSearch = useCallback(() => {
    setShowConfirmModal(false)
    resetTable && resetTable()
    executeSearch({ isManual: true })
  }, [resetTable, executeSearch])

  // Đóng modal quay lại bảng dữ liệu
  const handleCancelSearch = useCallback(() => {
    setShowConfirmModal(false)
  }, [])

  // 1. Truy vấn danh sách (Kiểm tra dữ liệu chưa lưu và quyền truy cập)
  const handleSearchData = useCallback(async () => {
    if (!canView || canSearch === false) {
      if (setStatusMessage) {
        setStatusMessage({
          type: 'warning',
          text: t('Bạn không có quyền tìm kiếm hoặc xem dữ liệu màn hình này!')
        })
      }
      return
    }

    // Kiểm tra các dòng có thay đổi chưa lưu (thêm mới A có data thực tế, hoặc đã sửa U / lỗi E / xóa D)
    const rowsA = filterValidRows(gridData || [], 'A')
    const hasEditedRows = (gridData || []).some((row) => {
      const tag = row?.WorkingTag || row?.Status
      return tag === 'U' || tag === 'E' || tag === 'D'
    })

    if (rowsA.length > 0 || hasEditedRows) {
      setShowConfirmModal(true)
      return
    }

    executeSearch({ isManual: true })
  }, [canView, canSearch, gridData, t, executeSearch, setStatusMessage])

  // 2. Lưu dữ liệu thêm / sửa
  const handleSaveData = useCallback(async () => {
    setStatusMessage &&
      setStatusMessage({ type: 'info', text: t('Đang lưu dữ liệu người dùng...') })
    const result = await handleSave({
      canCreate,
      gridData,
      setGridData,
      addFunction: PostAUserAuth,
      updateFunction: PostUUserAuth,
      userFrom,
      matchKey: 'IdxNo',
      mapReturnedFields: (found) => ({
        WorkingTag: '',
        Status: '',
        IdxNo: found.IdxNo,
        UserSeq: found.UserSeq,
        CheckPass1: found.CheckPass1
      })
    })
    if (result?.success) {
      setStatusMessage &&
        setStatusMessage({
          type: 'success',
          text: t('Lưu danh sách người dùng thành công!')
        })
    }
  }, [canCreate, gridData, setGridData, userFrom, handleSave, setStatusMessage, t])

  // 3. Cập nhật trạng thái tài khoản (Lưu trữ / Bỏ lưu trữ)
  const handleUpdateStatusAcc = useCallback(
    (newStatusAcc) => {
      if (!canEdit) return

      const selectedRows = getSelectedRows()
      const rowsToUpdate = selectedRows
        .filter((row) => {
          const tag = row.WorkingTag || row.Status
          return !tag || tag === 'U' || tag === 'E'
        })
        .map((row) => ({
          UserSeq: row.UserSeq,
          IdxNo: row.IdxNo,
          StatusAcc: newStatusAcc,
          UpdatedBy: userFrom?.UserSeq
        }))

      if (rowsToUpdate.length === 0) return

      togglePageInteraction(true)
      loadingBarRef.current?.continuousStart()
      setStatusMessage &&
        setStatusMessage({ type: 'info', text: t('Đang cập nhật trạng thái tài khoản...') })

      PostUUserAuthStatusAcc(rowsToUpdate)
        .then((response) => {
          if (response.success) {
            setGridData((prev) => {
              const dataArray = Array.isArray(response.data)
                ? response.data
                : response.data
                  ? [response.data]
                  : []
              const updated = prev.map((item) => {
                const found = dataArray.find((x) => x?.IdxNo === item?.IdxNo)
                return found
                  ? {
                      ...item,
                      WorkingTag: '',
                      Status: '',
                      IdxNo: found.IdxNo,
                      UserSeq: found.UserSeq,
                      StatusAcc: found.StatusAcc
                    }
                  : item
              })
              return updateIndexNo(updated)
            })

            HandleSuccess([
              {
                success: true,
                message: 'Cập nhật trạng thái tài khoản thành công!'
              }
            ])
            setStatusMessage &&
              setStatusMessage({
                type: 'success',
                text: t('Cập nhật trạng thái tài khoản thành công!')
              })
            resetTable()
          } else {
            HandleError([
              {
                success: false,
                message: response.message || 'Đã xảy ra lỗi khi cập nhật!'
              }
            ])
            setStatusMessage &&
              setStatusMessage({
                type: 'error',
                text: response.message || t('Lỗi khi cập nhật trạng thái tài khoản!')
              })
            setGridData((prev) => {
              const updated = prev.map((item) => {
                const isSelected = rowsToUpdate.some((row) => row.IdxNo === item.IdxNo)
                return isSelected ? { ...item, WorkingTag: 'E', Status: 'E' } : item
              })
              return updated
            })
          }
        })
        .catch((error) => {
          HandleError([
            {
              success: false,
              message: error.message || 'Đã xảy ra lỗi!'
            }
          ])
          setStatusMessage &&
            setStatusMessage({
              type: 'error',
              text: error.message || t('Có lỗi xảy ra!')
            })
        })
        .finally(() => {
          loadingBarRef.current?.complete()
          togglePageInteraction(false)
        })
    },
    [
      canEdit,
      getSelectedRows,
      userFrom,
      resetTable,
      setGridData,
      loadingBarRef,
      setStatusMessage,
      t
    ]
  )

  // 4. Đặt lại mật khẩu người dùng
  const handleUpdatePassUsers = useCallback(() => {
    if (!canEdit) return

    const selectedRows = getSelectedRows()
    const rowsToUpdate = selectedRows
      .filter((row) => {
        const tag = row.WorkingTag || row.Status
        return !tag || tag === 'U' || tag === 'E'
      })
      .map((row) => ({
        UserSeq: row.UserSeq,
        UserId: row.UserId,
        IdxNo: row.IdxNo,
        UpdatedBy: userFrom?.UserSeq,
        CheckPass1: false
      }))

    if (rowsToUpdate.length === 0) return

    togglePageInteraction(true)
    loadingBarRef.current?.continuousStart()
    setStatusMessage && setStatusMessage({ type: 'info', text: t('Đang cập nhật mật khẩu...') })

    PostUPass(rowsToUpdate)
      .then((response) => {
        if (response.success) {
          setGridData((prev) => {
            const dataArray = Array.isArray(response.data)
              ? response.data
              : response.data
                ? [response.data]
                : []
            const updated = prev.map((item) => {
              const found = dataArray.find((x) => x?.IdxNo === item?.IdxNo)
              return found
                ? {
                    ...item,
                    WorkingTag: '',
                    Status: '',
                    IdxNo: found.IdxNo,
                    CheckPass1: found.CheckPass1
                  }
                : item
            })
            return updateIndexNo(updated)
          })
          resetTable()
          HandleSuccess([
            {
              success: true,
              message: 'Cập nhật mật khẩu thành công!'
            }
          ])
          setStatusMessage &&
            setStatusMessage({
              type: 'success',
              text: t('Cập nhật mật khẩu người dùng thành công!')
            })
        } else {
          setGridData((prev) => {
            const updated = prev.map((item) => {
              const isSelected = rowsToUpdate.some((row) => row.IdxNo === item.IdxNo)
              return isSelected ? { ...item, WorkingTag: 'E', Status: 'E' } : item
            })
            return updated
          })
          setStatusMessage &&
            setStatusMessage({
              type: 'error',
              text: response.message || t('Lỗi khi cập nhật mật khẩu!')
            })
        }
      })
      .catch(() => {
        HandleError([
          {
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật!'
          }
        ])
        setStatusMessage &&
          setStatusMessage({
            type: 'error',
            text: t('Có lỗi xảy ra!')
          })
      })
      .finally(() => {
        loadingBarRef.current?.complete()
        togglePageInteraction(false)
      })
  }, [
    canEdit,
    getSelectedRows,
    userFrom,
    resetTable,
    setGridData,
    loadingBarRef,
    setStatusMessage,
    t
  ])

  // 5. Xem chi tiết thông tin người dùng
  const handleOpenDetailForm = useCallback(
    (row) => {
      const targetRow =
        row || (getSelectedRows && getSelectedRows().length > 0 ? getSelectedRows()[0] : null)
      if (!targetRow) {
        setStatusMessage &&
          setStatusMessage({
            type: 'warning',
            text: t('Vui lòng chọn người dùng cần xem chi tiết!')
          })
        return
      }
      openChildWindow({
        path: `/erp/u/system/user-detail?userId=${encodeURIComponent(targetRow.UserId || targetRow.IdSeq || '')}`,
        title: t('Chi tiết người dùng'),
        width: 1000,
        height: 750
      })
    },
    [getSelectedRows, setStatusMessage, t]
  )

  // 6. Xóa dòng chưa lưu (Status A) hoặc dòng được chọn
  const handleDeleteDataSheet = useCallback(() => {
    const selectedRows = getSelectedRows()
    if (selectedRows.length === 0) {
      setStatusMessage &&
        setStatusMessage({
          type: 'warning',
          text: t('Vui lòng chọn dòng cần xóa!')
        })
      return
    }
    const rowsWithStatusA = selectedRows.filter((r) => {
      const tag = r.WorkingTag || r.Status
      return tag === 'A'
    })
    if (rowsWithStatusA.length > 0) {
      const idsA = rowsWithStatusA.map((r) => r.IdxNo)
      setGridData((prev) => updateIndexNo(prev.filter((x) => !idsA.includes(x.IdxNo))))
      resetTable()
      setStatusMessage &&
        setStatusMessage({
          type: 'success',
          text: t('Đã xóa {{count}} dòng mới thêm!', { count: rowsWithStatusA.length })
        })
    } else {
      setStatusMessage &&
        setStatusMessage({
          type: 'info',
          text: t('Người dùng đã lưu trong hệ thống, hãy dùng chức năng Lưu trữ tài khoản.')
        })
    }
  }, [getSelectedRows, resetTable, setGridData, setStatusMessage, t])

  return {
    userId,
    setUserId,
    userName,
    setUserName,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    dataHelp01,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    handleUpdateStatusAcc,
    handleUpdatePassUsers,
    handleOpenDetailForm,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    handleResetQuery
  }
}
