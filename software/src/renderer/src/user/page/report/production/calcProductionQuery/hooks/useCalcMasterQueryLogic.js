import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import storageAdapter from '../storageAdapterProxy'
import {
  queryProductionBundlesOnline,
  deleteProductionBundleOnline,
  downloadProductionBundleOnline
} from '@renderer/api/production/calcBundleApi'
import {
  unpackProductionBundle
} from '../../calcProduction/engine/bundlePacker'

export function useCalcMasterQueryLogic({ setStatusMessage } = {}) {
  const [filters, setFilters] = useState({
    fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    factory: 'Tất cả',
    team: 'Tất cả',
    regCode: '',
    status: 'Tất cả',
    keyword: ''
  })

  const [rawMasters, setRawMasters] = useState([])
  const [queriedRows, setQueriedRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
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
      team: 'Tất cả',
      regCode: '',
      status: 'Tất cả',
      keyword: ''
    })
    notify('info', 'Đã đặt lại bộ lọc tìm kiếm')
  }, [notify])

  // Lấy dữ liệu Master đồng thời từ Server DataHub Database và CSDL Local Cache
  const fetchMasterList = useCallback(async () => {
    setIsLoading(true)
    notify('info', 'Đang truy vấn CSDL Server DataHub & Local Cache...')
    try {
      // 1. Lấy từ Local Storage / SQLite
      let localList = []
      try {
        localList = (await storageAdapter.getAllMasterRegistrations()) || []
      } catch (e) {
        console.warn('Lỗi lấy local master registrations:', e)
      }

      if (!Array.isArray(localList) || localList.length === 0) {
        const fallbackList = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('S_MASTER_REG_')) {
            try {
              const item = JSON.parse(localStorage.getItem(k))
              if (item?.regCode) {
                fallbackList.push(item)
              }
            } catch (err) {
              // ignore
            }
          }
        }
        if (fallbackList.length > 0) {
          localList = fallbackList
        }
      }

      // 2. Lấy trực tiếp từ Server DataHub DB qua gRPC Gateway
      let serverList = []
      try {
        const serverRes = await queryProductionBundlesOnline({
          from_date: filters.fromDate || '',
          to_date: filters.toDate || '',
          factory_name: filters.factory === 'Tất cả' ? '' : filters.factory,
          production_team: filters.team === 'Tất cả' ? '' : filters.team,
          reg_code: filters.regCode || '',
          status: filters.status === 'Tất cả' ? '' : filters.status
        })

        const rawBundles = serverRes?.bundles || serverRes?.data || serverRes?.items || []
        if (Array.isArray(rawBundles)) {
          serverList = rawBundles.map((b) => ({
            regCode: b.reg_code || b.regCode,
            factoryName: b.factory_name || b.factoryName,
            applyDate: b.apply_date || b.applyDate,
            productionTeam: b.production_team || b.productionTeam,
            status: b.status || 'PUBLISHED',
            version: b.version || '1.0',
            totalRows: b.total_rows || b.totalRows || 0,
            statReportRows: b.stat_report_rows || b.statReportRows || 0,
            unfinishedOpRows: b.unfinished_op_rows || b.unfinishedOpRows || 0,
            summaryOpRows: b.summary_op_rows || b.summaryOpRows || 0,
            mesApprovalRows: b.mes_approval_rows || b.mesApprovalRows || 0,
            registeredAt: b.created_at || b.registered_at || b.registeredAt || new Date().toISOString(),
            registeredBy: b.created_by || b.registeredBy || 'Hệ thống DataHub',
            remark: b.remark || (b.compressed_size_mb ? `Online [${b.compressed_size_mb}MB]` : ''),
            isServerRecord: true
          }))
        }
      } catch (serverErr) {
        console.warn('Không thể kết nối Server DataHub:', serverErr.message)
      }

      // 3. Hợp nhất danh sách (Server DB + Local DB)
      const mergedMap = new Map()

      // Đưa danh sách Server DB vào trước
      serverList.forEach((s) => {
        if (s.regCode) mergedMap.set(s.regCode, s)
      })

      // Đưa danh sách Local DB vào (nếu có bản local mới hơn thì update)
      localList.forEach((l) => {
        if (l.regCode) {
          const existing = mergedMap.get(l.regCode)
          mergedMap.set(l.regCode, {
            ...existing,
            ...l,
            isLocalCached: true
          })
        }
      })

      const combined = Array.from(mergedMap.values())
      setRawMasters(combined)

      // Áp dụng bộ lọc tìm kiếm
      const filtered = combined.filter((item) => {
        if (
          filters.factory &&
          filters.factory !== 'Tất cả' &&
          item.factoryName !== filters.factory
        ) {
          return false
        }
        if (
          filters.team &&
          filters.team !== 'Tất cả' &&
          item.productionTeam &&
          item.productionTeam !== filters.team
        ) {
          return false
        }
        if (
          filters.regCode &&
          !String(item.regCode || '')
            .toLowerCase()
            .includes(filters.regCode.toLowerCase())
        ) {
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
            String(item.factoryName || '').toLowerCase().includes(kw) ||
            String(item.productionTeam || '').toLowerCase().includes(kw)
          if (!match) return false
        }
        return true
      })

      setQueriedRows(filtered)
      notify(
        'success',
        `Đã nạp ${filtered.length.toLocaleString('vi-VN')} phiếu (Server DataHub + Local CSDL)`
      )
    } catch (err) {
      console.error('Lỗi truy vấn master:', err)
      notify('error', `Lỗi truy vấn CSDL: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [filters, notify])

  // Tự động nạp khi mount hoặc khi cửa sổ active
  useEffect(() => {
    fetchMasterList()

    const handleWindowFocus = () => {
      fetchMasterList()
    }
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('storage', handleWindowFocus)
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('storage', handleWindowFocus)
    }
  }, [fetchMasterList])

  // Mở cửa sổ xem chi tiết 4 bảng (tự động đồng bộ từ Server DataHub nếu chưa có trong Local Cache)
  const handleNavigateToDetail = useCallback(
    async (regCode) => {
      const code = regCode || selectedRegCode
      if (!code) {
        notify('warning', 'Vui lòng chọn 1 phiếu đăng ký để xem chi tiết 4 bảng dữ liệu')
        return
      }

      // Kiểm tra nếu phiếu này chỉ có trên Server mà chưa cache local thì tự động tải về
      const targetRecord = rawMasters.find((m) => m.regCode === code)
      if (targetRecord && !targetRecord.isLocalCached) {
        setIsSyncing(true)
        notify('info', `Đang tự động đồng bộ dữ liệu [${code}] từ Server DataHub về máy...`)
        try {
          const binaryBuffer = await downloadProductionBundleOnline(code)
          if (binaryBuffer && binaryBuffer.length > 0) {
            const unpacked = unpackProductionBundle(binaryBuffer)
            if (unpacked?.filesData) {
              await storageAdapter.saveAllFilesData(code, unpacked.filesData)
              await storageAdapter.saveMasterRegistration(unpacked.masterInfo || targetRecord)
              notify('success', `Đã đồng bộ xong dữ liệu [${code}] về DB Cache!`)
            }
          }
        } catch (syncErr) {
          console.warn('Lỗi đồng bộ ngầm gói online:', syncErr)
        } finally {
          setIsSyncing(false)
        }
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
    [selectedRegCode, rawMasters, notify]
  )

  // Xóa 1 phiếu đăng ký (Xóa cả Local DB và Server DataHub)
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

        // Xóa trên Server DataHub
        try {
          await deleteProductionBundleOnline(code)
        } catch (serverErr) {
          console.warn('Lỗi xóa trên server DataHub:', serverErr)
        }

        notify('info', `Đã xóa phiếu đăng ký [${code}]`)
        fetchMasterList()
      } catch (err) {
        notify('error', `Không thể xóa phiếu: ${err.message}`)
      }
    },
    [selectedRegCode, fetchMasterList, notify]
  )

  // Mở cửa sổ tính toán mới
  const handleOpenCalcProduction = useCallback(() => {
    notify('info', 'Đang mở màn hình Tính KHSX và TKSX...')
    openChildWindow({
      path: '/sub/report/calc-production',
      title: 'Tính KHSX và TKSX',
      width: 1400,
      height: 850,
      id: 'calc_production_window'
    })
  }, [notify])

  return {
    filters,
    handleFilterChange,
    handleResetFilters,
    fetchMasterList,
    handleNavigateToDetail,
    handleOpenCalcProduction,
    handleDeleteMaster,
    queriedRows,
    selectedRegCode,
    setSelectedRegCode,
    isLoading,
    isSyncing
  }
}
