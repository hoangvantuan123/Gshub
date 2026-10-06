import { useState, useMemo, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import storageAdapter from '../storageAdapterProxy'

export function useCalcMasterQueryLogic({ setStatusMessage } = {}) {
  const [filters, setFilters] = useState({
    fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    factory: 'Tất cả',
    regCode: '',
    status: 'Tất cả',
    keyword: ''
  })

  const [rawMasters, setRawMasters] = useState([])
  const [queriedRows, setQueriedRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRegCode, setSelectedRegCode] = useState(null)

  const notify = useCallback(
    (type, text) => {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({ type, text })
      }
    },
    [setStatusMessage]
  )

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilters({
      fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      toDate: dayjs().format('YYYY-MM-DD'),
      factory: 'Tất cả',
      regCode: '',
      status: 'Tất cả',
      keyword: ''
    })
    notify('info', 'Đã đặt lại bộ lọc tìm kiếm')
  }, [notify])

  // Lấy dữ liệu Master từ CSDL
  const fetchMasterList = useCallback(async () => {
    setIsLoading(true)
    notify('info', 'Đang truy vấn danh sách phiếu đăng ký Master...')
    try {
      let list = await storageAdapter.getAllMasterRegistrations()
      if (!Array.isArray(list) || list.length === 0) {
        // Fallback kiểm tra localStorage nếu chưa có
        const localList = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('S_MASTER_REG_')) {
            try {
              const item = JSON.parse(localStorage.getItem(k))
              if (item?.regCode) {
                localList.push(item)
              }
            } catch (e) {
              // ignore
            }
          }
        }
        if (localList.length > 0) {
          list = localList
        }
      }

      setRawMasters(list || [])

      // Áp dụng bộ lọc
      const filtered = (list || []).filter((item) => {
        if (filters.factory && filters.factory !== 'Tất cả' && item.factoryName !== filters.factory) {
          return false
        }
        if (filters.regCode && !String(item.regCode || '').toLowerCase().includes(filters.regCode.toLowerCase())) {
          return false
        }
        if (filters.status && filters.status !== 'Tất cả' && item.status !== filters.status) {
          return false
        }
        if (item.applyDate && filters.fromDate && filters.toDate) {
          if (item.applyDate < filters.fromDate || item.applyDate > filters.toDate) {
            return false
          }
        }
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase()
          const match =
            String(item.regCode || '').toLowerCase().includes(kw) ||
            String(item.remark || '').toLowerCase().includes(kw) ||
            String(item.factoryName || '').toLowerCase().includes(kw)
          if (!match) return false
        }
        return true
      })

      setQueriedRows(filtered)
      notify('success', `Đã tìm thấy ${filtered.length.toLocaleString('vi-VN')} phiếu đăng ký Master`)
    } catch (err) {
      console.error('Lỗi lấy danh sách master:', err)
      notify('error', `Lỗi truy vấn Master: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [filters, notify])

  // Chạy truy vấn ban đầu khi mount
  useEffect(() => {
    fetchMasterList()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mở cửa sổ mới xem chi tiết 4 bảng (Hỗ trợ cả Electron Desktop và Web Browser)
  const handleNavigateToDetail = useCallback(
    (regCode) => {
      const code = regCode || selectedRegCode
      if (!code) {
        notify('warning', 'Vui lòng chọn 1 phiếu đăng ký để xem chi tiết 4 bảng dữ liệu')
        return
      }
      notify('info', `Đang mở cửa sổ chi tiết 4 bảng cho phiếu [${code}]...`)

      openChildWindow({
        path: `/sub/report/calc-production-query/detail/${encodeURIComponent(code)}`,
        title: `Chi tiết 4 bảng KHSX & TKSX - [${code}]`,
        width: 1400,
        height: 850,
        id: `calc_detail_${code}`
      })
    },
    [selectedRegCode, notify]
  )

  // Xóa 1 phiếu đăng ký
  const handleDeleteMaster = useCallback(
    async (regCode) => {
      const code = regCode || selectedRegCode
      if (!code) {
        notify('warning', 'Vui lòng chọn 1 phiếu đăng ký để xóa')
        return
      }
      try {
        await storageAdapter.deleteMasterRegistration(code)
        localStorage.removeItem(`S_MASTER_REG_${code}`)
        notify('info', `Đã xóa phiếu đăng ký [${code}]`)
        fetchMasterList()
      } catch (err) {
        notify('error', `Không thể xóa phiếu: ${err.message}`)
      }
    },
    [selectedRegCode, fetchMasterList, notify]
  )

  return {
    filters,
    handleFilterChange,
    handleResetFilters,
    fetchMasterList,
    handleNavigateToDetail,
    handleDeleteMaster,
    queriedRows,
    selectedRegCode,
    setSelectedRegCode,
    isLoading
  }
}
