import { useState, useCallback, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import storageAdapter from '../storageAdapterProxy'
import {
  queryProductionBundlesOnline,
  deleteProductionBundleOnline,
  downloadProductionBundleOnline
} from '@renderer/api/production/calcBundleApi'
import { unpackProductionBundle } from '../../calcProduction/engine/bundlePacker'
import { clearReportCache } from '../../../common/reportDataCache'

export function useCalcMasterQueryLogic({ setStatusMessage } = {}) {
  const [filters, setFilters] = useState({
    FactoryName: '',
    RegCode: '',
    ApplyDate: '',
    FromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    ToDate: dayjs().format('YYYY-MM-DD'),
    Status: '',
    Version: '',
    ProductionTeam: '',
    RegisteredBy: '',
    Remark: '',
    Keyword: ''
  })

  const [rawMasters, setRawMasters] = useState([])
  const [queriedRows, setQueriedRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedRegCode, setSelectedRegCode] = useState(null)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

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

  // Lấy dữ liệu Master đồng thời từ Server DataHub Database và CSDL Local Cache
  const fetchMasterList = useCallback(async (customFilters = null) => {
    const currentFilters = customFilters || filtersRef.current
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
          from_date: currentFilters.FromDate || currentFilters.fromDate || '',
          to_date: currentFilters.ToDate || currentFilters.toDate || '',
          factory_name:
            (currentFilters.FactoryName || currentFilters.factory) === 'Tất cả'
              ? ''
              : currentFilters.FactoryName || currentFilters.factory || '',
          production_team:
            (currentFilters.ProductionTeam || currentFilters.team) === 'Tất cả'
              ? ''
              : currentFilters.ProductionTeam || currentFilters.team || '',
          reg_code: currentFilters.RegCode || currentFilters.regCode || '',
          status:
            (currentFilters.Status || currentFilters.status) === 'Tất cả'
              ? ''
              : currentFilters.Status || currentFilters.status || ''
        })

        const rawBundles =
          serverRes?.bundles || serverRes?.data || serverRes?.items || []
        if (Array.isArray(rawBundles)) {
          serverList = rawBundles.map((b) => {
            let fSummaries = {}
            try {
              if (typeof b.file_summaries === 'string' && b.file_summaries.startsWith('{')) {
                fSummaries = JSON.parse(b.file_summaries)
              } else if (
                typeof b.fileSummaries === 'string' &&
                b.fileSummaries.startsWith('{')
              ) {
                fSummaries = JSON.parse(b.fileSummaries)
              } else if (typeof b.file_summaries === 'object') {
                fSummaries = b.file_summaries || {}
              } else if (typeof b.fileSummaries === 'object') {
                fSummaries = b.fileSummaries || {}
              }
            } catch (_e) {
              // ignore json parse error
            }

            const statRows =
              b.stat_report_rows ||
              b.statReportRows ||
              fSummaries.stat_report?.rowCount ||
              0
            const unfinRows =
              b.unfinished_op_rows ||
              b.unfinishedOpRows ||
              fSummaries.unfinished_op?.rowCount ||
              0
            const sumRows =
              b.summary_op_rows ||
              b.summaryOpRows ||
              fSummaries.summary_op?.rowCount ||
              0
            const mesRows =
              b.mes_approval_rows ||
              b.mesApprovalRows ||
              fSummaries.mes_approval?.rowCount ||
              0

            const total =
              b.total_rows ||
              b.totalRows ||
              statRows + unfinRows + sumRows + mesRows

            const formatRegisteredAt = (val) => {
              if (!val) return ''
              const d = dayjs(val)
              return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(val)
            }

            const rawMb = Number(b.raw_size_mb || b.rawSizeMb || b.rawSizeMB || b.RawSizeMB || 0)
            const compMb = Number(b.compressed_size_mb || b.compressedSizeMb || b.compressedSizeMB || b.CompressedSizeMB || 0)
            const ratio = b.compression_ratio || b.compressionRatio || b.CompressionRatio || ''

            return {
              regCode: b.reg_code || b.regCode,
              factoryName: b.factory_name || b.factoryName,
              applyDate: b.apply_date || b.applyDate,
              productionTeam: b.production_team || b.productionTeam,
              status: b.status || 'PUBLISHED',
              version: b.version || '1.0',
              totalRows: total,
              rawSizeMB: rawMb,
              compressedSizeMB: compMb,
              compressionRatio: ratio,
              statReportRows: statRows,
              unfinishedOpRows: unfinRows,
              summaryOpRows: sumRows,
              mesApprovalRows: mesRows,
              fileSummaries: fSummaries,
              registeredAt: formatRegisteredAt(
                b.created_at ||
                b.createdAt ||
                b.registered_at ||
                b.registeredAt
              ),
              registeredBy:
                b.created_by ||
                b.createdBy ||
                b.registeredBy ||
                b.registered_by ||
                'Admin',
              remark: b.remark || '',
              isServerRecord: true
            }
          })
        }
      } catch (serverErr) {
        console.warn('Không thể kết nối Server DataHub:', serverErr.message)
      }

      // 3. Hợp nhất danh sách (Server DB + Local DB)
      const mergedMap = new Map()

      const formatRegisteredAt = (val) => {
        if (!val) return ''
        const d = dayjs(val)
        return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(val)
      }

      const isUuidStr = (str) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ''))

      const resolveUserDisplayName = (val, existingVal) => {
        if (existingVal && !isUuidStr(existingVal)) {
          return existingVal
        }
        if (val && !isUuidStr(val)) {
          return val
        }
        try {
          const curUser = JSON.parse(localStorage.getItem('userInfo') || '{}')
          const curSeq = curUser.UserSeq || curUser.UserId || ''
          if (curSeq && (curSeq === val || curSeq === existingVal)) {
            return curUser.UserName || curUser.EmpName || curUser.UserId || 'Admin'
          }
        } catch {}
        return (existingVal && !isUuidStr(existingVal))
          ? existingVal
          : (val && !isUuidStr(val))
          ? val
          : 'Admin'
      }

      const compareVersions = (v1, v2) => {
        if (!v1 && !v2) return 0
        if (!v1) return -1
        if (!v2) return 1
        const clean1 = String(v1).replace(/^[^\d]*/, '').trim()
        const clean2 = String(v2).replace(/^[^\d]*/, '').trim()
        const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0)
        const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0)
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const num1 = parts1[i] || 0
          const num2 = parts2[i] || 0
          if (num1 > num2) return 1
          if (num1 < num2) return -1
        }
        return 0
      }

      const resolveLatestVersion = (v1, v2) => {
        return compareVersions(v1, v2) >= 0 ? (v1 || '1.0') : (v2 || '1.0')
      }

      // Đưa danh sách Server DB vào trước (giữ bản ghi có version cao nhất và đầy đủ số liệu nhất)
      serverList.forEach((s) => {
        if (!s.regCode) return
        const existing = mergedMap.get(s.regCode)
        if (!existing) {
          mergedMap.set(s.regCode, s)
        } else {
          // So sánh version để ưu tiên bản ghi có version cao hơn
          const isSNewer = compareVersions(s.version, existing.version) > 0
          const chosen = isSNewer ? s : existing
          const older = isSNewer ? existing : s
          const isPublished = s.status === 'PUBLISHED' || existing.status === 'PUBLISHED'

          mergedMap.set(s.regCode, {
            ...older,
            ...chosen,
            status: isPublished ? 'PUBLISHED' : chosen.status,
            version: chosen.version || '1.0',
            totalRows: (chosen.totalRows && chosen.totalRows > 0) ? chosen.totalRows : older.totalRows,
            statReportRows: (chosen.statReportRows && chosen.statReportRows > 0) ? chosen.statReportRows : older.statReportRows,
            unfinishedOpRows: (chosen.unfinishedOpRows && chosen.unfinishedOpRows > 0) ? chosen.unfinishedOpRows : older.unfinishedOpRows,
            summaryOpRows: (chosen.summaryOpRows && chosen.summaryOpRows > 0) ? chosen.summaryOpRows : older.summaryOpRows,
            mesApprovalRows: (chosen.mesApprovalRows && chosen.mesApprovalRows > 0) ? chosen.mesApprovalRows : older.mesApprovalRows,
            rawSizeMB: chosen.rawSizeMB || older.rawSizeMB || 0,
            compressedSizeMB: chosen.compressedSizeMB || older.compressedSizeMB || 0,
            compressionRatio: chosen.compressionRatio || older.compressionRatio || '',
            registeredAt: chosen.registeredAt || older.registeredAt,
            registeredBy: resolveUserDisplayName(chosen.registeredBy, older.registeredBy)
          })
        }
      })

      // Đưa danh sách Local DB vào (đồng bộ trạng thái nhưng TUYỆT ĐỐI không ghi đè số dòng = 0 lên dữ liệu server)
      localList.forEach((l) => {
        if (!l.regCode) return
        const existing = mergedMap.get(l.regCode)
        if (!existing) {
          mergedMap.set(l.regCode, {
            ...l,
            rawSizeMB: Number(l.rawSizeMB || l.raw_size_mb || l.rawSizeMb || 0),
            compressedSizeMB: Number(l.compressedSizeMB || l.compressed_size_mb || l.compressedSizeMb || 0),
            compressionRatio: l.compressionRatio || l.compression_ratio || '',
            registeredAt: formatRegisteredAt(l.registeredAt || new Date()),
            registeredBy: resolveUserDisplayName(l.registeredBy || l.registered_by || l.createdBy),
            isLocalCached: true
          })
        } else {
          const isLocalNewer = compareVersions(l.version, existing.version) > 0
          const isPublished = (existing.status === 'PUBLISHED' || l.status === 'PUBLISHED')
          const hasLocalRows = Number(l.totalRows || 0) > 0

          mergedMap.set(l.regCode, {
            ...existing,
            version: (isLocalNewer && hasLocalRows) ? l.version : existing.version,
            status: isPublished ? 'PUBLISHED' : (existing.status || l.status || 'DRAFT'),
            totalRows: (existing.totalRows && existing.totalRows > 0) ? existing.totalRows : (l.totalRows || 0),
            statReportRows: (existing.statReportRows && existing.statReportRows > 0) ? existing.statReportRows : (l.statReportRows || 0),
            unfinishedOpRows: (existing.unfinishedOpRows && existing.unfinishedOpRows > 0) ? existing.unfinishedOpRows : (l.unfinishedOpRows || 0),
            summaryOpRows: (existing.summaryOpRows && existing.summaryOpRows > 0) ? existing.summaryOpRows : (l.summaryOpRows || 0),
            mesApprovalRows: (existing.mesApprovalRows && existing.mesApprovalRows > 0) ? existing.mesApprovalRows : (l.mesApprovalRows || 0),
            rawSizeMB: Number(existing.rawSizeMB || l.rawSizeMB || l.raw_size_mb || l.rawSizeMb || 0),
            compressedSizeMB: Number(existing.compressedSizeMB || l.compressedSizeMB || l.compressed_size_mb || l.compressedSizeMb || 0),
            compressionRatio: existing.compressionRatio || l.compressionRatio || l.compression_ratio || '',
            registeredAt: existing.registeredAt || formatRegisteredAt(l.registeredAt),
            registeredBy: resolveUserDisplayName(existing.registeredBy, l.registeredBy || l.registered_by || l.createdBy),
            remark: existing.remark || l.remark || '',
            isLocalCached: true
          })
        }
      })

      const combined = Array.from(mergedMap.values())
      setRawMasters(combined)

      // Áp dụng bộ lọc tìm kiếm
      const filtered = combined.filter((item) => {
        const factoryFilter = currentFilters.FactoryName || currentFilters.factory
        if (
          factoryFilter &&
          factoryFilter !== 'Tất cả' &&
          factoryFilter !== '' &&
          item.factoryName !== factoryFilter
        ) {
          return false
        }
        const teamFilter = currentFilters.ProductionTeam || currentFilters.team
        if (
          teamFilter &&
          teamFilter !== 'Tất cả' &&
          teamFilter !== '' &&
          item.productionTeam &&
          item.productionTeam !== teamFilter
        ) {
          return false
        }
        const regCodeFilter = currentFilters.RegCode || currentFilters.regCode
        if (
          regCodeFilter &&
          regCodeFilter.trim() &&
          !String(item.regCode || '')
            .toLowerCase()
            .includes(regCodeFilter.trim().toLowerCase())
        ) {
          return false
        }
        const statusFilter = currentFilters.Status || currentFilters.status
        if (
          statusFilter &&
          statusFilter !== 'Tất cả' &&
          statusFilter !== '' &&
          item.status !== statusFilter
        ) {
          return false
        }
        const versionFilter = currentFilters.Version || currentFilters.version
        if (
          versionFilter &&
          versionFilter.trim() &&
          !String(item.version || '')
            .toLowerCase()
            .includes(versionFilter.trim().toLowerCase())
        ) {
          return false
        }
        const applyDateFilter = currentFilters.ApplyDate || currentFilters.applyDate
        if (applyDateFilter && item.applyDate && item.applyDate !== applyDateFilter) {
          return false
        }
        const fromDate = currentFilters.FromDate || currentFilters.fromDate
        const toDate = currentFilters.ToDate || currentFilters.toDate
        if (item.applyDate && fromDate && toDate) {
          if (item.applyDate < fromDate || item.applyDate > toDate) {
            return false
          }
        }
        const userFilter = currentFilters.RegisteredBy || currentFilters.registeredBy || currentFilters.createdBy
        if (
          userFilter &&
          userFilter.trim() &&
          !String(item.registeredBy || '')
            .toLowerCase()
            .includes(userFilter.trim().toLowerCase())
        ) {
          return false
        }
        const remarkFilter = currentFilters.Remark || currentFilters.remark
        if (
          remarkFilter &&
          remarkFilter.trim() &&
          !String(item.remark || '')
            .toLowerCase()
            .includes(remarkFilter.trim().toLowerCase())
        ) {
          return false
        }
        const keyword = currentFilters.Keyword || currentFilters.keyword
        if (keyword && keyword.trim()) {
          const kw = keyword.trim().toLowerCase()
          const match =
            String(item.regCode || '').toLowerCase().includes(kw) ||
            String(item.remark || '').toLowerCase().includes(kw) ||
            String(item.factoryName || '').toLowerCase().includes(kw) ||
            String(item.productionTeam || '').toLowerCase().includes(kw) ||
            String(item.registeredBy || '').toLowerCase().includes(kw) ||
            String(item.version || '').toLowerCase().includes(kw) ||
            String(item.status || '').toLowerCase().includes(kw)
          if (!match) return false
        }
        return true
      })

      setQueriedRows(filtered)
      notify('success', `Đã nạp ${filtered.length.toLocaleString('vi-VN')} phiếu kế hoạch`)
    } catch (err) {
      console.error('Lỗi truy vấn master:', err)
      notify('error', `Lỗi truy vấn dữ liệu: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [notify])

  const handleResetFilters = useCallback(() => {
    const emptyFilters = {
      FactoryName: '',
      RegCode: '',
      ApplyDate: '',
      FromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      ToDate: dayjs().format('YYYY-MM-DD'),
      Status: '',
      Version: '',
      ProductionTeam: '',
      RegisteredBy: '',
      Remark: '',
      Keyword: ''
    }
    setFilters(emptyFilters)
    setRawMasters([])
    setQueriedRows([])
    setSelectedRegCode(null)
    notify('info', 'Đã đặt lại bộ lọc tìm kiếm')
  }, [notify])

  // Mở cửa sổ xem chi tiết (Tự động đồng bộ và giải nén có modal tại cửa sổ chi tiết)
  const handleNavigateToDetail = useCallback(
    (regCode) => {
      const code = regCode || selectedRegCode
      if (!code) {
        notify('warning', 'Vui lòng chọn 1 phiếu đăng ký để xem chi tiết')
        return
      }

      notify('info', `Đang mở cửa sổ chi tiết cho phiếu [${code}]...`)
      openChildWindow({
        path: `/sub/report/calc-production-query/detail/${encodeURIComponent(code)}`,
        title: `Chi tiết KHSX & TKSX - [${code}]`,
        width: 1400,
        height: 850,
        id: `calc_detail_${code}`
      })
    },
    [selectedRegCode, notify]
  )

  // Xóa 1 phiếu đăng ký trên toàn bộ hệ thống (Local DB, Cache & Server DataHub)
  const handleDeleteMaster = useCallback(
    async (regCode) => {
      const code = regCode || selectedRegCode
      if (!code) {
        notify('warning', 'Vui lòng chọn 1 phiếu đăng ký để xóa')
        return
      }

      setIsLoading(true)
      notify('info', `Đang tiến hành xóa phiếu [${code}] trên toàn bộ hệ thống...`)

      try {
        // 1. Xóa toàn bộ tầng Local (IndexedDB, SQLite, localStorage)
        try {
          await storageAdapter.deleteMasterRegistration(code)
        } catch (_storageErr) {
          console.warn('Lỗi xóa local storage adapter:', _storageErr)
        }

        try {
          localStorage.removeItem(`S_MASTER_REG_${code}`)
          localStorage.removeItem(`S_CALC_RESULTS_${code}`)
          sessionStorage.removeItem(`S_MASTER_REG_${code}`)
          sessionStorage.removeItem(`S_CALC_RESULTS_${code}`)
          if (localStorage.getItem('GS_ACTIVE_DETAIL_REG_CODE') === code) {
            localStorage.removeItem('GS_ACTIVE_DETAIL_REG_CODE')
          }
        } catch (_lsErr) {}

        // 2. Xóa in-memory SWR cache
        try {
          clearReportCache(code)
          clearReportCache()
        } catch (_cErr) {}

        // 3. Xóa trên Server DataHub
        try {
          await deleteProductionBundleOnline(code)
        } catch (serverErr) {
          console.warn('Lỗi xóa trên server DataHub:', serverErr)
        }

        // 4. Lập tức loại bỏ khỏi danh sách đang hiển thị trên giao diện (optimistic update)
        setRawMasters((prev) =>
          prev.filter((m) => String(m.regCode || m.RegCode || '').toUpperCase() !== String(code).toUpperCase())
        )
        setQueriedRows((prev) =>
          prev.filter((m) => String(m.regCode || m.RegCode || '').toUpperCase() !== String(code).toUpperCase())
        )
        setSelectedRegCode(null)

        notify('success', `Đã xóa thành công phiếu [${code}] trên Server DataHub và Cache nội bộ.`)

        // 5. Tải lại danh sách mới nhất để đồng bộ hoàn toàn
        await fetchMasterList()
      } catch (err) {
        notify('error', `Không thể xóa phiếu: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    },
    [selectedRegCode, fetchMasterList, notify]
  )

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [targetExportRegCode, setTargetExportRegCode] = useState('')
  const [isExportProgressOpen, setIsExportProgressOpen] = useState(false)
  const [exportProgressInfo, setExportProgressInfo] = useState({
    percent: 10,
    step: 'INIT',
    message: 'Đang chuẩn bị xuất dữ liệu...',
    detail: '',
    statusTag: 'Xuất dữ liệu Excel'
  })

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

  // Mở hộp thoại xuất Excel chuẩn ERP
  const handleExportDataKhsx = useCallback(
    (targetCode = null) => {
      const regCodeToExport = targetCode || selectedRegCode
      if (!regCodeToExport) {
        notify('warning', 'Vui lòng chọn 1 dòng phiếu đăng ký trên bảng để xuất Data KHSX.')
        return
      }
      setTargetExportRegCode(regCodeToExport)
      setIsExportModalOpen(true)
    },
    [selectedRegCode, notify]
  )

  // Thực thi xuất toàn bộ dữ liệu KHSX (6 bảng) của phiếu được chọn ra 1 file Excel siêu nhẹ
  const executeExportDataKhsx = useCallback(
    async ({ fileName, saveDirectory } = {}) => {
      const regCodeToExport = targetExportRegCode || selectedRegCode
      if (!regCodeToExport) return

      setIsExportModalOpen(false)
      setIsExportProgressOpen(true)
      setExportProgressInfo({
        percent: 10,
        step: 'DOWNLOAD',
        message: `Đang nạp gói dữ liệu KHSX [${regCodeToExport}]...`,
        detail: 'Đang truy vấn CSDL Server DataHub & Local Cache',
        statusTag: 'Đang nạp dữ liệu'
      })

      try {
        // 1. Lấy bundle binary từ hệ thống online hoặc đọc local
        let binaryBuffer = null
        try {
          binaryBuffer = await downloadProductionBundleOnline(regCodeToExport)
        } catch (err) {
          console.warn('Tải online thất bại, thử đọc local:', err)
        }

        let unpacked = null
        if (binaryBuffer && binaryBuffer.length > 0) {
          unpacked = unpackProductionBundle(binaryBuffer)
        }

        // 2. Nếu chưa có unpacked từ online, đọc từ local storage adapter
        let calcResults = unpacked?.calcResults || null
        if (!calcResults) {
          try {
            calcResults = await storageAdapter.getCalcResults(regCodeToExport)
          } catch (e) {}
        }

        const allFiles = unpacked?.filesData || (await storageAdapter.getAllFiles()) || {}

        // Import động bộ xuất Excel chuẩn 6 bảng tiếng Việt
        const { exportFull6TabsProductionExcel } = await import(
          '../../calcProduction/engine/calcExcelExporter'
        )

        const finalFileName =
          fileName ||
          `DATA_KHSX_${regCodeToExport}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`

        await exportFull6TabsProductionExcel({
          calcResults,
          allFiles,
          regCode: regCodeToExport,
          fileName: finalFileName,
          saveDirectory,
          onProgress: (prog) => {
            setExportProgressInfo((prev) => ({
              ...prev,
              ...prog
            }))
          }
        })

        notify('success', `Đã xuất thành công file: ${finalFileName}`)
      } catch (err) {
        console.error('Lỗi xuất Data KHSX:', err)
        notify('error', `Không thể xuất Data KHSX: ${err.message}`)
        setExportProgressInfo({
          percent: 100,
          isComplete: true,
          message: `Lỗi xuất dữ liệu: ${err.message}`,
          detail: 'Vui lòng kiểm tra lại đường truyền hoặc dữ liệu nguồn.',
          statusTag: 'Xuất lỗi'
        })
      }
    },
    [targetExportRegCode, selectedRegCode, notify]
  )

  return {
    filters,
    handleFilterChange,
    handleResetFilters,
    fetchMasterList,
    handleNavigateToDetail,
    handleOpenCalcProduction,
    handleDeleteMaster,
    handleExportDataKhsx,
    executeExportDataKhsx,
    isExportModalOpen,
    setIsExportModalOpen,
    targetExportRegCode,
    isExportProgressOpen,
    setIsExportProgressOpen,
    exportProgressInfo,
    setExportProgressInfo,
    queriedRows,
    selectedRegCode,
    setSelectedRegCode,
    isLoading,
    isSyncing
  }
}
