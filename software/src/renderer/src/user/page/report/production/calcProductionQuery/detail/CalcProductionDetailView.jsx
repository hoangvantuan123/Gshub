/* eslint-disable react/prop-types, no-unused-vars */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
import {
  TAB_DEFINITIONS,
  STAT_REPORT_COLUMN_SCHEMA,
  UNFINISHED_OP_COLUMN_SCHEMA,
  SUMMARY_OP_COLUMN_SCHEMA,
  MES_APPROVAL_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA,
  getNextVersion
} from '../../calcProduction/constants/calcConstants'
import {
  getGridColumnsForTab,
  RESULT_CALC_COLUMNS_SCHEMA
} from '../../calcProduction/columns/calcGridColumns'
import { runProductionCalculations } from '../../calcProduction/engine'
import { DEFAULT_CALC_RULES } from '../../calcProduction/engine/calcRuleConfig'
import CalcDataGridTable from '../../calcProduction/components/CalcDataGridTable'
import CalcProductionActions from '../../calcProduction/components/CalcProductionActions'
import CalcProductionQuery from '../../calcProduction/components/CalcProductionQuery'
import CalculationProgressOverlay from '../../calcProduction/components/CalculationProgressOverlay'
import CalcRuleConfigModal from '../../calcProduction/components/CalcRuleConfigModal'
import ImportLoadingOverlay from '../../calcProduction/components/ImportLoadingOverlay'
import ExcelMappingModal from '../../calcProduction/components/ExcelMappingModal'
import { parseUploadedFile, inspectUploadedFile } from '../../calcProduction/engine/fileParsers'
import { unpackProductionBundle, packProductionBundle } from '../../calcProduction/engine/bundlePacker'
import {
  downloadProductionBundleOnline,
  publishProductionBundleOnline,
  queryProductionBundlesOnline
} from '@renderer/api/production/calcBundleApi'
import { getEmployeeCode } from '@renderer/services/tokenService'
import ExportExcelModal from '@renderer/user/components/modal/ExportExcelModal'
import { exportFull6TabsProductionExcel } from '../../calcProduction/engine/calcExcelExporter'
import PlanRegistrationPushModal from '../../calcProduction/components/PlanRegistrationPushModal'
import { savePlanRegistration } from '@renderer/user/page/report/registration/services/planRegistrationService'
import { CloudDownload, Send, FileSpreadsheet } from 'lucide-react'
import { usePageHotkeys } from '@renderer/user/hooks/usePageHotkeys'
import storageAdapter from '../storageAdapterProxy'

const PAGE_SIZE = 1500

export default function CalcProductionDetailView() {
  const { t } = useTranslation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    setStatusMessage,
    setPageData,
    setSelectionStats,
    safeNavigate,
    requestWindowClose,
    registerDirtyChecker
  } = usePageData() || {}
  const loadingBarRef = useRef(null)

  // Lấy mã đăng ký từ params (:seq, :regCode, :*), query (?regCode=) hoặc window.location
  const targetRegCode = useMemo(() => {
    if (params?.seq) return params.seq
    if (params?.regCode) return params.regCode
    if (params?.['*']) {
      const clean = params['*'].replace(/^detail\//, '').split('/')[0]
      if (clean) return decodeURIComponent(clean)
    }
    const q = searchParams.get('regCode') || searchParams.get('seq')
    if (q) return q

    const fullPath = window.location.hash || window.location.pathname
    const match = fullPath.match(/detail\/([^?#/]+)/)
    if (match && match[1]) {
      return decodeURIComponent(match[1])
    }
    return ''
  }, [params, searchParams])

  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id)
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  const [masterRecord, setMasterRecord] = useState(null)
  const [availableVersions, setAvailableVersions] = useState([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState({
    percent: 25,
    step: 'PREPARING',
    message: 'Đang kiểm tra và chuẩn bị dữ liệu báo cáo...',
    detail: 'Tổng hợp thông tin các tổ sản xuất và chỉ tiêu kế hoạch',
    statusTag: 'Chuẩn bị dữ liệu',
    isComplete: false
  })

  // State Modal Theo Dõi Tiến Trình Đăng Ký 2 Báo Cáo KHSX & TKSX lên /erp/u/report/registration
  const [isPushingRegistration, setIsPushingRegistration] = useState(false)
  const [pushRegistrationProgress, setPushRegistrationProgress] = useState({
    isOpen: false,
    percent: 0,
    step: 'INIT',
    message: '',
    detail: '',
    statusTag: '',
    khsxRows: 0,
    statRows: 0,
    regCode: '',
    isComplete: false,
    isError: false
  })

  const masterInfo = useMemo(() => {
    return {
      regCode: masterRecord?.regCode || targetRegCode,
      version: masterRecord?.version || '1.0',
      factoryName: masterRecord?.factoryName || 'GS1 Hà Nội',
      applyDate: masterRecord?.applyDate || '',
      productionTeam: masterRecord?.productionTeam || 'Tất cả các tổ',
      status: masterRecord?.status || 'DRAFT',
      remark: masterRecord?.remark || ''
    }
  }, [masterRecord, targetRegCode])

  const handleChangeMasterInfo = useCallback(
    async (key, value) => {
      const normalizedKey =
        key === 'FactoryName'
          ? 'factoryName'
          : key === 'ApplyDate'
          ? 'applyDate'
          : key === 'Remark'
          ? 'remark'
          : key === 'ProductionTeam'
          ? 'productionTeam'
          : key

      setMasterRecord((prev) => {
        const updated = {
          ...prev,
          regCode: prev?.regCode || targetRegCode,
          [normalizedKey]: value,
          [key]: value
        }

        if (targetRegCode || prev?.regCode) {
          storageAdapter.saveMasterRegistration(updated).catch((err) => {
            console.warn('Lỗi cập nhật master info:', err)
          })
          try {
            const regKey = targetRegCode || prev?.regCode
            localStorage.setItem(`S_MASTER_REG_${regKey}`, JSON.stringify(updated))
          } catch {}
        }

        return updated
      })

      setStatusMessage?.({
        type: 'info',
        text: `Đã cập nhật [${key}]. Thông tin mới đã được lưu vào hệ thống.`
      })
    },
    [targetRegCode, setStatusMessage]
  )

  const [fileSummaries, setFileSummaries] = useState({})
  const [calcResults, setCalcResults] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [importProgress, setImportProgress] = useState({
    fileName: '',
    fileSize: 0,
    tabTitle: '',
    detectedColumns: 0,
    totalRows: 0,
    percent: 0,
    step: 'INIT',
    message: ''
  })
  const [mappingModalState, setMappingModalState] = useState({
    isOpen: false,
    rawFile: null,
    fileType: null,
    inspectData: null
  })
  const [isSyncingVersion, setIsSyncingVersion] = useState(false)
  const [syncVersionProgress, setSyncVersionProgress] = useState({
    percent: 15,
    step: 'DOWNLOAD',
    message: 'Đang tải gói dữ liệu từ Server DataHub...',
    detail: '',
    statusTag: 'Đồng bộ phiên bản'
  })

  // ── Cache dữ liệu toàn bộ 6 Tabs (Tải trước ngầm & Chuyển tab 0ms mượt mà) ──
  const tabsCacheRef = useRef({})

  // ── Grid Data & Selection State ──
  const [gridData, setGridData] = useState([])
  const gridDataRef = useRef([])
  gridDataRef.current = gridData

  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // ── Bộ lọc tìm kiếm động tự động sinh khi bấm Ctrl + F trên cột ──
  const [dynamicFilterFields, setDynamicFilterFields] = useState([])
  const [filterValues, setFilterValues] = useState({})
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [calcRules, setCalcRules] = useState(() => {
    try {
      const saved = localStorage.getItem('GSHUB_CALC_RULES')
      if (saved) return JSON.parse(saved)
    } catch (_e) {
      // Ignore JSON parse error
    }
    return DEFAULT_CALC_RULES
  })

  const handleSaveCalcRules = (newRules) => {
    setCalcRules(newRules)
    try {
      localStorage.setItem('GSHUB_CALC_RULES', JSON.stringify(newRules))
    } catch (_e) {
      // Ignore localStorage error
    }
  }

  // ── Paging & Infinite Scroll Refs (Ngăn chặn vòng lặp vô tận) ──
  const pageInfoRef = useRef({
    total: 0,
    loadedCount: 0,
    pageSize: PAGE_SIZE,
    page: 1,
    totalPages: 1,
    hasMore: false
  })
  const isLoadingNextPageRef = useRef(false)
  const loadingChunksRef = useRef(new Set())
  const hasInitialFetchedRef = useRef(false)

  const currentTabDef = useMemo(() => {
    return TAB_DEFINITIONS.find((t) => t.id === activeTab) || TAB_DEFINITIONS[0]
  }, [activeTab])

  // Cột mặc định cho từng tab
  const defaultCols = useMemo(() => {
    if (activeTab === 'result_tksx') {
      const statCols = calcResults?.stat?.columns || fileSummaries['stat_report']?.columns || []
      let merged = []
      if (statCols && statCols.length > 0) {
        const existingKeys = new Set(statCols.map((c) => c.key || c.id || c.title))
        merged = [...statCols]
        RESULT_CALC_COLUMNS_SCHEMA.forEach((cc) => {
          if (!existingKeys.has(cc.key) && !existingKeys.has(cc.title)) {
            merged.push(cc)
          }
        })
      } else {
        merged = [...STAT_REPORT_COLUMN_SCHEMA, ...RESULT_CALC_COLUMNS_SCHEMA]
      }
      return getGridColumnsForTab(activeTab, merged)
    }

    if (activeTab === 'result_khsx') {
      return getGridColumnsForTab(activeTab, RESULT_KHSX_COLUMN_SCHEMA)
    }

    let tabCols = fileSummaries[activeTab]?.columns || []
    if (!tabCols || tabCols.length === 0) {
      if (activeTab === 'stat_report') tabCols = STAT_REPORT_COLUMN_SCHEMA
      else if (activeTab === 'unfinished_op') tabCols = UNFINISHED_OP_COLUMN_SCHEMA
      else if (activeTab === 'summary_op') tabCols = SUMMARY_OP_COLUMN_SCHEMA
      else if (activeTab === 'mes_approval') tabCols = MES_APPROVAL_COLUMN_SCHEMA
    }
    return getGridColumnsForTab(activeTab, tabCols)
  }, [activeTab, fileSummaries, calcResults])

  const [cols, setCols] = useState(defaultCols)

  useEffect(() => {
    setCols(defaultCols)
  }, [defaultCols])

  // ── Hàm nạp dữ liệu cho 1 Tab cụ thể theo Page ──
  const loadTabData = useCallback(
    async (tabId, pageNumber = 1, currentSummaries = null, currentCalcRes = null) => {
      const summaries = currentSummaries || fileSummaries
      const results = currentCalcRes || calcResults

      if (tabId === 'result_tksx') {
        const rows = results?.stat?.calculatedRows || []
        const total = rows.length
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const offset = (pageNumber - 1) * PAGE_SIZE
        const pagedRows = rows.slice(offset, offset + PAGE_SIZE)

        return {
          rows: pagedRows,
          total,
          page: pageNumber,
          totalPages,
          hasMore: offset + pagedRows.length < total && pagedRows.length > 0
        }
      }

      if (tabId === 'result_khsx') {
        const rows = results?.plan?.calculatedRows || []
        const total = rows.length
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const offset = (pageNumber - 1) * PAGE_SIZE
        const pagedRows = rows.slice(offset, offset + PAGE_SIZE)

        return {
          rows: pagedRows,
          total,
          page: pageNumber,
          totalPages,
          hasMore: offset + pagedRows.length < total && pagedRows.length > 0
        }
      }

      // 4 Bảng kiến trúc: Đọc từ SQLite / IndexedDB qua phân trang 1.500 dòng
      try {
        const res = await storageAdapter.getFilePage(tabId, pageNumber, PAGE_SIZE)
        const pagedRows = res?.rows || []
        const total = res?.total || summaries[tabId]?.rowCount || pagedRows.length
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
        const offset = (pageNumber - 1) * PAGE_SIZE

        return {
          rows: pagedRows,
          total,
          page: pageNumber,
          totalPages,
          hasMore: offset + pagedRows.length < total && pagedRows.length > 0
        }
      } catch (err) {
        console.warn(`[DetailView] Lỗi loadTabData tab ${tabId} page ${pageNumber}:`, err)
        return { rows: [], total: 0, page: 1, totalPages: 1, hasMore: false }
      }
    },
    [fileSummaries, calcResults]
  )

  // ── Hàm nạp trước dữ liệu toàn bộ 6 tabs ở chế độ ngầm (Background Preload) ──
  const preloadAllTabsInBackground = useCallback(
    async (summaries, results) => {
      const remainingTabs = TAB_DEFINITIONS.filter((t) => t.id !== activeTabRef.current)

      await Promise.allSettled(
        remainingTabs.map(async (tab) => {
          try {
            if (tabsCacheRef.current[tab.id]) return
            const res = await loadTabData(tab.id, 1, summaries, results)
            tabsCacheRef.current[tab.id] = {
              rows: res.rows,
              total: res.total,
              page: res.page,
              totalPages: res.totalPages,
              hasMore: res.hasMore
            }
          } catch (e) {
            console.debug(`Preload tab ${tab.id}:`, e)
          }
        })
      )
    },
    [loadTabData]
  )

  // ── Khởi tạo trang: Chạy 1 lần duy nhất khi Mount (Tải ngay Tab 1 + Preload 5 Tab còn lại) ──
  useEffect(() => {
    if (hasInitialFetchedRef.current) return
    hasInitialFetchedRef.current = true

    const initLoad = async () => {
      loadingBarRef.current?.continuousStart?.()
      try {
        // 1. Lấy thông tin Master nếu có mã
        let master = null
        if (targetRegCode) {
          master = await storageAdapter.getMasterRegistration(targetRegCode)
          if (!master) {
            const local = localStorage.getItem(`S_MASTER_REG_${targetRegCode}`)
            if (local) {
              try {
                master = JSON.parse(local)
              } catch (_e) {
                master = null
              }
            }
          }
        }

        // 1b. Xác định trường hợp cần tải & đồng bộ từ Server DataHub:
        // - CHỈ tải từ Server khi trên máy này CHƯA có bản ghi master và CHƯA có dữ liệu file
        // - Khi đã có dữ liệu trên máy (hasLocalMaster = true), KHÔNG BAO GIỜ tự động tải đè từ server để bảo toàn 100% các dòng đã xóa/sửa cục bộ
        const hasLocalMaster = Boolean(
          master && (master.regCode === targetRegCode || master.RegCode === targetRegCode)
        )
        const hasLocalFiles = Boolean(
          master?.fileSummaries &&
            Object.values(master.fileSummaries).some((s) => (s?.rowCount || 0) > 0)
        )

        const needsRemoteDownload = Boolean(
          targetRegCode && !hasLocalMaster && !hasLocalFiles
        )

        if (needsRemoteDownload) {
          setIsSyncingVersion(true)
          setSyncVersionProgress({
            percent: 25,
            step: 'DOWNLOAD',
            message: `Đang kết nối và tải dữ liệu báo cáo [${targetRegCode}]...`,
            detail: 'Tải dữ liệu báo cáo từ hệ thống...',
            statusTag: 'Tải dữ liệu'
          })
          try {
            const binaryBuffer = await downloadProductionBundleOnline(targetRegCode)
            if (binaryBuffer && binaryBuffer.length > 0) {
              setSyncVersionProgress({
                percent: 60,
                step: 'UNPACK',
                message: `Đang giải nén và xử lý dữ liệu cho phiếu [${targetRegCode}]...`,
                detail: 'Xử lý và phân bổ dữ liệu các bảng...',
                statusTag: 'Xử lý dữ liệu'
              })

              const unpacked = unpackProductionBundle(binaryBuffer)

              setSyncVersionProgress({
                percent: 85,
                step: 'INSTALL',
                message: `Đang thiết lập dữ liệu các bảng vào hệ thống...`,
                detail: 'Lưu trữ và hoàn thiện cấu trúc dữ liệu...',
                statusTag: 'Thiết lập dữ liệu'
              })

              const tabKeys = ['stat_report', 'unfinished_op', 'summary_op', 'mes_approval']
              for (const fType of tabKeys) {
                const fData = unpacked?.filesData?.[fType]
                if (fData && fData.data && fData.data.length > 0) {
                  await storageAdapter.saveFile(fType, fData)
                } else {
                  await storageAdapter.saveFile(fType, {
                    fileName: '',
                    fileSize: 0,
                    rowCount: 0,
                    data: [],
                    columns: []
                  })
                }
              }

              if (unpacked?.masterInfo) {
                master = unpacked.masterInfo
                await storageAdapter.saveMasterRegistration(master)
                setMasterRecord(master)
              }
              if (unpacked?.calcResults) {
                await storageAdapter.saveCalcResults(targetRegCode, unpacked.calcResults)
                results = unpacked.calcResults
                setCalcResults(results)
              }
              localStorage.setItem('GS_ACTIVE_DETAIL_REG_CODE', targetRegCode)

              setSyncVersionProgress({
                percent: 100,
                step: 'COMPLETED',
                isComplete: true,
                message: `Đã đồng bộ thành công dữ liệu phiếu [${targetRegCode}]!`,
                detail: 'Dữ liệu các bảng và kết quả tính toán đã sẵn sàng. Bấm [Đồng ý] để bắt đầu làm việc.',
                statusTag: 'Hoàn tất'
              })
            } else {
              setIsSyncingVersion(false)
            }
          } catch (syncErr) {
            console.warn('[DetailView] Tải dữ liệu từ hệ thống:', syncErr.message)
            setIsSyncingVersion(false)
          }
        }

        // Lấy lại summaries chính xác sau khi đồng bộ
        let summaries = await storageAdapter.getAllSummaries()

        setMasterRecord(master || { regCode: targetRegCode || '' })

        // 1c. Lấy danh sách các phiên bản (Versions) từ Server DataHub để hỗ trợ chuyển đổi version xem trực tiếp
        if (targetRegCode) {
          try {
            const serverQuery = await queryProductionBundlesOnline({
              keyword: targetRegCode,
              pageSize: 50
            })
            const list = serverQuery?.data || []
            const matched = list.filter(
              (it) => it.reg_code === targetRegCode || it.regCode === targetRegCode
            )
            if (matched && matched.length > 0) {
              const vers = matched.map((m) => ({
                version: m.version || '1.0',
                status: m.status || 'PUBLISHED',
                applyDate: m.apply_date || m.applyDate,
                createdAt: m.created_at || m.createdAt
              }))
              setAvailableVersions(vers)
            } else {
              setAvailableVersions([
                { version: master?.version || '1.0', status: master?.status || 'DRAFT' }
              ])
            }
          } catch (_err) {
            setAvailableVersions([
              { version: master?.version || '1.0', status: master?.status || 'DRAFT' }
            ])
          }
        }

        // 2. Lấy Metadata tóm tắt của 4 bảng (< 1ms)
        const mergedSummaries = {
          ...(master?.fileSummaries || {}),
          ...(summaries || {})
        }
        setFileSummaries(mergedSummaries)

        // 3. Lấy kết quả tính toán nếu có
        let results = null
        if (targetRegCode) {
          try {
            results = await storageAdapter.getCalcResults(targetRegCode)
            if (!results && typeof window !== 'undefined') {
              const local = localStorage.getItem(`S_CALC_RESULTS_${targetRegCode}`)
              if (local) {
                results = JSON.parse(local)
              }
            }
            if (results) {
              setCalcResults(results)
              mergedSummaries.result_tksx = {
                isUploaded: true,
                rowCount: results?.stat?.calculatedRows?.length || 0,
                fileName: 'Kết quả TKSX',
                columns: results?.stat?.columns || []
              }
              mergedSummaries.result_khsx = {
                isUploaded: true,
                rowCount: results?.plan?.calculatedRows?.length || 0,
                fileName: 'Kết quả KHSX',
                columns: results?.plan?.columns || []
              }
            }
          } catch (rErr) {
            console.warn('Lấy kết quả tính toán:', rErr)
          }
        }

        // 4. Nạp Trang 1 của Tab đầu tiên ngay lập tức
        const initialTab = activeTabRef.current || TAB_DEFINITIONS[0].id
        const dataRes = await loadTabData(initialTab, 1, mergedSummaries, results)

        setGridData(dataRes.rows)
        gridDataRef.current = dataRes.rows

        tabsCacheRef.current[initialTab] = {
          rows: dataRes.rows,
          total: dataRes.total,
          page: dataRes.page,
          totalPages: dataRes.totalPages,
          hasMore: dataRes.hasMore
        }

        const info = {
          total: dataRes.total,
          loadedCount: dataRes.rows.length,
          pageSize: PAGE_SIZE,
          page: 1,
          totalPages: dataRes.totalPages,
          hasMore: dataRes.hasMore
        }
        pageInfoRef.current = info

        setPageData?.((prev) => ({
          ...prev,
          total: dataRes.total,
          totalAll: dataRes.total,
          loadedCount: dataRes.rows.length,
          totalColumns: defaultCols.length,
          page: 1,
          pageSize: PAGE_SIZE,
          totalPages: dataRes.totalPages,
          calcSummary: results?.summary || null,
          rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
        }))

        setStatusMessage?.({
          type: 'success',
          text: `Đã nạp ${dataRes.rows.length.toLocaleString('vi-VN')} / ${dataRes.total.toLocaleString('vi-VN')} dòng${targetRegCode ? ` cho phiếu [${targetRegCode}]` : ''}`
        })

        // 5. Tải trước toàn bộ 5 tab còn lại ở chế độ ngầm (0ms khi chuyển tab sau đó)
        preloadAllTabsInBackground(mergedSummaries, results)
      } catch (err) {
        console.error('Lỗi khi nạp dữ liệu ban đầu:', err)
        setStatusMessage?.({ type: 'error', text: `Lỗi nạp dữ liệu: ${err.message}` })
      } finally {
        loadingBarRef.current?.complete?.()
      }
    }

    initLoad()
  }, [
    targetRegCode,
    loadTabData,
    preloadAllTabsInBackground,
    defaultCols.length,
    setPageData,
    setStatusMessage
  ])

  // ── Thêm trường tìm kiếm động khi người dùng bấm Ctrl + F trên bất kỳ cột nào ──
  const handleAddQueryField = useCallback(
    (columnKey, colTitle) => {
      if (!columnKey) return
      const title = colTitle || columnKey

      setDynamicFilterFields((prev) => {
        if (prev.some((f) => f.key === columnKey)) return prev
        return [...prev, { key: columnKey, label: title, type: 'text' }]
      })

      setStatusMessage?.({
        type: 'info',
        text: `Đã thêm bộ lọc tìm kiếm cho cột "${title}". Bạn có thể nhập giá trị để tìm kiếm ngay.`
      })

      setTimeout(() => {
        const input =
          document.getElementById(`query-input-${columnKey}`) ||
          document.querySelector(`[data-query-key="${String(columnKey).toLowerCase()}"]`)
        if (input) {
          input.focus()
          input.select?.()
        }
      }, 50)
    },
    [setStatusMessage]
  )

  const handleRemoveDynamicField = useCallback((fieldKey) => {
    setDynamicFilterFields((prev) => prev.filter((f) => f.key !== fieldKey))
    setFilterValues((prev) => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }, [])

  const handleDynamicFilterChange = useCallback((fieldKey, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [fieldKey]: value
    }))
  }, [])

  // ── Xử lý khi người dùng chọn Tab khác (Tức thì 0ms, lưu/khôi phục bộ lọc từ IndexedDB) ──
  const handleSelectTab = useCallback(
    async (tabId) => {
      if (tabId === activeTabRef.current) return
      const prevTab = activeTabRef.current

      // 1. Lưu lại trạng thái tìm kiếm của tab cũ vào IndexedDB để giải phóng RAM
      if (prevTab) {
        storageAdapter
          .saveTabSearchState(prevTab, {
            searchText,
            statusFilter,
            dynamicFilterFields,
            filterValues
          })
          .catch(() => {})
      }

      setActiveTab(tabId)
      activeTabRef.current = tabId

      // 2. Phục hồi lại trạng thái tìm kiếm của tab mới từ IndexedDB (nếu có)
      try {
        const savedState = await storageAdapter.getTabSearchState(tabId)
        if (savedState) {
          setDynamicFilterFields(savedState.dynamicFilterFields || [])
          setFilterValues(savedState.filterValues || {})
          setSearchText(savedState.searchText || '')
          setStatusFilter(savedState.statusFilter || 'ALL')
        } else {
          setDynamicFilterFields([])
          setFilterValues({})
          setSearchText('')
          setStatusFilter('ALL')
        }
      } catch {
        setDynamicFilterFields([])
        setFilterValues({})
        setSearchText('')
        setStatusFilter('ALL')
      }

      setSelection({
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty()
      })

      loadingChunksRef.current.clear()
      isLoadingNextPageRef.current = false

      // 3. Nếu tab đã được nạp sẵn trong Cache: Chuyển tức thì 0ms không chờ đợi
      const cached = tabsCacheRef.current[tabId]
      if (cached && cached.rows) {
        setGridData(cached.rows)
        gridDataRef.current = cached.rows

        const info = {
          total: cached.total,
          loadedCount: cached.rows.length,
          pageSize: PAGE_SIZE,
          page: cached.page || 1,
          totalPages: cached.totalPages || 1,
          hasMore: cached.hasMore
        }
        pageInfoRef.current = info

        setPageData?.((prev) => ({
          ...prev,
          total: cached.total,
          totalAll: cached.total,
          loadedCount: cached.rows.length,
          totalColumns: defaultCols.length,
          page: cached.page || 1,
          pageSize: PAGE_SIZE,
          totalPages: cached.totalPages || 1,
          rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
        }))
        return
      }

      // 4. Nếu chưa có trong Cache: Tải dữ liệu từ IndexedDB/SQLite và lưu vào Cache
      loadingBarRef.current?.continuousStart?.()
      try {
        const dataRes = await loadTabData(tabId, 1)
        setGridData(dataRes.rows)
        gridDataRef.current = dataRes.rows

        tabsCacheRef.current[tabId] = {
          rows: dataRes.rows,
          total: dataRes.total,
          page: dataRes.page,
          totalPages: dataRes.totalPages,
          hasMore: dataRes.hasMore
        }

        const info = {
          total: dataRes.total,
          loadedCount: dataRes.rows.length,
          pageSize: PAGE_SIZE,
          page: 1,
          totalPages: dataRes.totalPages,
          hasMore: dataRes.hasMore
        }
        pageInfoRef.current = info

        setPageData?.((prev) => ({
          ...prev,
          total: dataRes.total,
          totalAll: dataRes.total,
          loadedCount: dataRes.rows.length,
          totalColumns: defaultCols.length,
          page: 1,
          pageSize: PAGE_SIZE,
          totalPages: dataRes.totalPages,
          rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
        }))
      } catch (err) {
        console.warn('Lỗi đổi tab:', err)
      } finally {
        loadingBarRef.current?.complete?.()
      }
    },
    [
      loadTabData,
      defaultCols.length,
      setPageData,
      searchText,
      statusFilter,
      dynamicFilterFields,
      filterValues
    ]
  )

  // ── Lọc dữ liệu hiển thị theo các trường tìm kiếm động hoặc ô tìm chung (Hỗ trợ tìm nhiều mã / nhiều bản ghi cùng lúc) ──
  const filteredGridData = useMemo(() => {
    let rows = gridData || []

    // 1. Lọc theo ô tìm kiếm chung SearchText (Phân tách nhiều bản ghi bằng dấu phẩy, chấm phẩy, xuống dòng, tab, pipe)
    if (searchText && searchText.trim()) {
      const tokens = String(searchText)
        .split(/[,;\n\r\t|]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      if (tokens.length > 0) {
        rows = rows.filter((row) => {
          if (!row) return false
          return Object.values(row).some((val) => {
            if (val === null || val === undefined) return false
            const strVal = String(val).toLowerCase()
            return tokens.some((token) => strVal.includes(token))
          })
        })
      }
    }

    // 2. Lọc theo trạng thái statusFilter (hỗ trợ Trạng thái ĐP-SX, KHSX, Check KHSX)
    if (statusFilter && statusFilter !== 'ALL') {
      const sf = statusFilter.toLowerCase()
      rows = rows.filter((row) => {
        if (!row) return false
        const tag = String(
          row.CoordinatorStatus ||
            row['Trạng thái ĐP - SX'] ||
            row.StatusDpSx ||
            row.CheckKhsx ||
            row['CHECK KHSX'] ||
            row['Check KHSX'] ||
            row.KhsxStatus ||
            row.KHSX ||
            row.StatusSX ||
            row.StatusKHSX ||
            row.Status ||
            row.WorkingTag ||
            ''
        ).toLowerCase()
        return tag === sf || tag.includes(sf) || sf.includes(tag)
      })
    }

    // 3. Lọc theo các trường tìm kiếm động sinh ra từ Ctrl + F (Phân tách nhiều mã bằng dấu phẩy, chấm phẩy, xuống dòng, tab, pipe)
    const activeFilters = Object.entries(filterValues).filter(
      ([, val]) => val !== undefined && val !== null && String(val).trim() !== ''
    )

    if (activeFilters.length > 0) {
      rows = rows.filter((row) => {
        if (!row) return false
        return activeFilters.every(([key, filterVal]) => {
          const tokens = String(filterVal)
            .split(/[,;\n\r\t|]+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)

          if (tokens.length === 0) return true

          const rowVal =
            row[key] !== undefined
              ? row[key]
              : row[key.toLowerCase()] !== undefined
              ? row[key.toLowerCase()]
              : Object.entries(row).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]

          if (rowVal === null || rowVal === undefined) return false
          const rowValStr = String(rowVal).toLowerCase()
          return tokens.some((token) => rowValStr.includes(token))
        })
      })
    }

    return rows
  }, [gridData, searchText, statusFilter, filterValues])

  // ── Xử lý Cuộn vô tận (Infinite Scroll): ban đầu nạp 1.500 dòng, cuộn đến nửa thì nạp tiếp ──
  const handleVisibleRegionChanged = useCallback(
    (range) => {
      if (isLoadingNextPageRef.current) return

      const currentInfo = pageInfoRef.current
      const total = currentInfo.total || 0
      const loadedCount = currentInfo.loadedCount || 0
      const pageSize = currentInfo.pageSize || PAGE_SIZE

      if (total === 0 || !currentInfo.hasMore || loadedCount >= total) return

      // Cuộn đến nửa số dòng đã nạp (ví dụ 1.500 dòng -> từ hàng 750 trở đi) thì tải tiếp 1.500 dòng
      const halfwayThreshold = loadedCount - Math.floor(pageSize * 0.5)
      const viewportBottom = (range.y || 0) + (range.height || 0)

      if (viewportBottom >= halfwayThreshold) {
        const nextPage = Math.floor(loadedCount / pageSize) + 1
        if (loadingChunksRef.current.has(nextPage)) return

        isLoadingNextPageRef.current = true
        loadingChunksRef.current.add(nextPage)

        const currentTab = activeTabRef.current

        loadTabData(currentTab, nextPage)
          .then((res) => {
            const newRows = res?.rows || []
            if (newRows.length > 0 && currentTab === activeTabRef.current) {
              const updatedRows = [...gridDataRef.current, ...newRows]
              gridDataRef.current = updatedRows
              setGridData(updatedRows)

              const nextLoadedTotal = loadedCount + newRows.length
              const stillHasMore = nextLoadedTotal < total && newRows.length >= pageSize

              const nextInfo = {
                ...currentInfo,
                loadedCount: nextLoadedTotal,
                hasMore: stillHasMore,
                page: nextPage
              }
              pageInfoRef.current = nextInfo

              // Cập nhật Cache cho tab hiện tại
              tabsCacheRef.current[currentTab] = {
                rows: updatedRows,
                total,
                page: nextPage,
                totalPages: res.totalPages,
                hasMore: stillHasMore
              }

              setPageData?.((prev) => ({
                ...prev,
                loadedCount: nextLoadedTotal,
                total,
                totalAll: total,
                page: nextPage,
                pageSize,
                totalPages: res.totalPages
              }))

              setStatusMessage?.({
                type: 'info',
                text: `Đã nạp ${nextLoadedTotal.toLocaleString('vi-VN')} / ${total.toLocaleString('vi-VN')} dòng (Trang ${nextPage}/${res.totalPages})`
              })
            } else {
              pageInfoRef.current = {
                ...currentInfo,
                hasMore: false
              }
            }
          })
          .catch((err) => {
            console.warn('[DetailView] Lỗi tải thêm trang khi cuộn:', err)
            loadingChunksRef.current.delete(nextPage)
          })
          .finally(() => {
            isLoadingNextPageRef.current = false
          })
      }
    },
    [loadTabData, setPageData, setStatusMessage]
  )

  // Trạng thái tóm tắt các file cho thanh Toolbar Tab
  const fileStatusSummary = useMemo(() => {
    const summary = {}
    TAB_DEFINITIONS.forEach((tab) => {
      if (tab.id === 'result_tksx') {
        const rows = calcResults?.stat?.calculatedRows || []
        summary[tab.id] = {
          isUploaded: rows.length > 0,
          fileName: 'TKSX_KetQua_98Cot.xlsx',
          rowCount: rows.length,
          uploadedAt: calcResults?.calculatedAt || null,
          isResult: true
        }
      } else if (tab.id === 'result_khsx') {
        const rows = calcResults?.plan?.calculatedRows || []
        summary[tab.id] = {
          isUploaded: rows.length > 0,
          fileName: 'KHSX_KetQua_DoiSoat.xlsx',
          rowCount: rows.length,
          uploadedAt: calcResults?.calculatedAt || null,
          isResult: true
        }
      } else {
        const fileObj = fileSummaries[tab.id]
        const count = fileObj?.rowCount || 0
        summary[tab.id] = {
          isUploaded: Boolean(count > 0),
          fileName: fileObj?.fileName || '',
          rowCount: count,
          uploadedAt: fileObj?.uploadedAt || null
        }
      }
    })
    return summary
  }, [fileSummaries, calcResults])

  const activeTabFileData = useMemo(() => {
    const summary = fileStatusSummary[activeTab]
    return {
      columns: defaultCols,
      data: filteredGridData,
      rowCount: summary?.rowCount || filteredGridData.length,
      fileName: summary?.fileName || '',
      uploadedAt: summary?.uploadedAt || null
    }
  }, [fileStatusSummary, activeTab, defaultCols, filteredGridData])

  // Thống kê vùng bôi đen ô kiểu Excel và đẩy xuống StatusBar
  const lastSelectionJsonRef = useRef('')
  useEffect(() => {
    if (!setSelectionStats) return
    const hasRows = selection?.rows && selection.rows.toArray().length > 0
    const hasRange = Boolean(selection?.current?.range)
    const hasCell = Boolean(selection?.current?.cell)

    if (!hasRows && !hasRange && !hasCell) {
      if (lastSelectionJsonRef.current !== 'empty') {
        lastSelectionJsonRef.current = 'empty'
        setSelectionStats(null)
      }
      return
    }

    const selKey = JSON.stringify({
      rows: selection?.rows?.toArray() || [],
      range: selection?.current?.range || null,
      cell: selection?.current?.cell || null
    })

    if (lastSelectionJsonRef.current === selKey) return
    lastSelectionJsonRef.current = selKey

    const frameId = requestAnimationFrame(() => {
      const stats = calculateSelectionStats(selection, filteredGridData, cols)
      setSelectionStats(stats)
    })

    return () => cancelAnimationFrame(frameId)
  }, [selection, filteredGridData, cols, setSelectionStats])

  const [calculationProgress, setCalculationProgress] = useState({
    percent: 0,
    step: 'INIT',
    message: '',
    detail: '',
    statusTag: 'Hệ thống tính toán'
  })

  // Chạy tính toán KHSX & TKSX
  const handleRunCalculation = useCallback(async () => {
    const uploaded = Object.values(fileStatusSummary || {}).filter((s) => s.isUploaded).length
    if (uploaded === 0) {
      setStatusMessage?.({ type: 'error', text: 'Chưa có đủ dữ liệu để thực hiện tính toán' })
      return
    }

    setIsCalculating(true)
    setCalculationProgress({
      percent: 20,
      step: 'LOAD_DATA',
      message: 'Đang chuẩn bị dữ liệu 4 bảng đầu vào...',
      detail: `Kiểm tra dữ liệu cho phiếu [${targetRegCode || 'Master'}]`,
      statusTag: 'Chuẩn bị dữ liệu'
    })
    setStatusMessage?.({ type: 'info', text: 'Đang thực hiện tính toán KHSX và TKSX...' })

    // Nhường luồng cho UI render progress bar mượt mà
    await new Promise((resolve) => setTimeout(resolve, 60))

    try {
      const allFiles = await storageAdapter.getAllFiles()

      setCalculationProgress({
        percent: 50,
        step: 'CALC_TKSX',
        message: 'Đang tổng hợp và tính toán kết quả Thống kê sản xuất (TKSX)...',
        detail: 'Ghép nối số lượng đạt, thời gian chạy thực tế và đối soát chu kỳ KHSX',
        statusTag: 'Tổng hợp TKSX'
      })

      // Nhường luồng cho UI
      await new Promise((resolve) => setTimeout(resolve, 60))

      setCalculationProgress({
        percent: 80,
        step: 'CALC_KHSX',
        message: 'Đang đối soát và tính toán Kế hoạch sản xuất (KHSX)...',
        detail: 'Tính toán định mức thời gian, Capa, trạng thái điều phối và phân loại kế hoạch',
        statusTag: 'Đối soát KHSX'
      })

      // Nhường luồng cho UI trước khi chạy tính toán
      await new Promise((resolve) => setTimeout(resolve, 60))

      // Nếu phiếu đã PUBLISHED trước đó, việc tính toán lại sẽ tạo ra một master version mới (ví dụ 1.0 -> 1.1)
      let nextVersion = masterRecord?.version || '1.0'
      if (masterRecord?.status === 'PUBLISHED') {
        const parts = String(nextVersion).split('.')
        if (parts.length === 2) {
          const major = parseInt(parts[0], 10) || 1
          const minor = parseInt(parts[1], 10) || 0
          nextVersion = `${major}.${minor + 1}`
        } else {
          nextVersion = `${parseInt(nextVersion, 10) || 1}.1`
        }
      }

      const results = await runProductionCalculations(
        allFiles,
        {
          ...masterInfo,
          regCode: targetRegCode,
          version: nextVersion
        },
        calcRules
      )

      setCalcResults(results)

      // Cập nhật Cache kết quả tính toán cho cả 2 tab
      const tksxAllRows = results?.stat?.calculatedRows || []
      const khsxAllRows = results?.plan?.calculatedRows || []

      tabsCacheRef.current['result_tksx'] = {
        rows: tksxAllRows.slice(0, PAGE_SIZE),
        total: tksxAllRows.length,
        page: 1,
        totalPages: Math.max(1, Math.ceil(tksxAllRows.length / PAGE_SIZE)),
        hasMore: tksxAllRows.length > PAGE_SIZE
      }

      tabsCacheRef.current['result_khsx'] = {
        rows: khsxAllRows.slice(0, PAGE_SIZE),
        total: khsxAllRows.length,
        page: 1,
        totalPages: Math.max(1, Math.ceil(khsxAllRows.length / PAGE_SIZE)),
        hasMore: khsxAllRows.length > PAGE_SIZE
      }

      // Cập nhật Summaries cho 2 Tab kết quả để hiện số dòng trên badge
      const updatedSummaries = {
        ...fileSummaries,
        result_tksx: {
          isUploaded: true,
          rowCount: tksxAllRows.length,
          fileName: 'Kết quả TKSX',
          columns: results?.stat?.columns || []
        },
        result_khsx: {
          isUploaded: true,
          rowCount: khsxAllRows.length,
          fileName: 'Kết quả KHSX',
          columns: results?.plan?.columns || []
        }
      }
      setFileSummaries(updatedSummaries)

      if (targetRegCode) {
        const updatedMaster = {
          ...masterRecord,
          version: nextVersion,
          status: 'REGISTERED',
          isPublished: false
        }
        setMasterRecord(updatedMaster)
        try {
          await storageAdapter.saveMasterRegistration(updatedMaster)
          if (results) {
            await storageAdapter.saveCalcResults(targetRegCode, results)
            if (typeof window !== 'undefined') {
              localStorage.setItem(`S_CALC_RESULTS_${targetRegCode}`, JSON.stringify(results))
            }
          }
        } catch (e) {
          console.warn('Lưu kết quả tính toán:', e)
        }
      }

      setCalculationProgress({
        percent: 100,
        step: 'COMPLETED',
        message: 'Đã hoàn tất tính toán thành công!',
        detail: `Đã tính toán xong phiên bản [v${nextVersion}]: Xuất ${tksxAllRows.length.toLocaleString('vi-VN')} dòng TKSX và ${khsxAllRows.length.toLocaleString('vi-VN')} dòng KHSX.`,
        statusTag: 'Hoàn tất'
      })

      // Chuyển sang Tab Kết Quả TKSX và nạp ngay lên DataGrid
      const initialPageRows = tksxAllRows.slice(0, PAGE_SIZE)
      setGridData(initialPageRows)
      gridDataRef.current = initialPageRows

      setActiveTab('result_tksx')
      activeTabRef.current = 'result_tksx'

      const info = {
        total: tksxAllRows.length,
        loadedCount: initialPageRows.length,
        pageSize: PAGE_SIZE,
        page: 1,
        totalPages: Math.max(1, Math.ceil(tksxAllRows.length / PAGE_SIZE)),
        hasMore: tksxAllRows.length > PAGE_SIZE
      }
      pageInfoRef.current = info

      setPageData?.((prev) => ({
        ...prev,
        total: tksxAllRows.length,
        totalAll: tksxAllRows.length,
        loadedCount: initialPageRows.length,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: info.totalPages,
        calcSummary: results?.summary || null,
        rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
      }))

      setSelection({
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty()
      })

      // Tự động đóng modal tiến trình tính toán
      setTimeout(() => {
        setIsCalculating(false)
      }, 400)

      setStatusMessage?.({
        type: 'success',
        text: `Đã hoàn thành tính toán v${nextVersion}! Đã xuất ${tksxAllRows.length.toLocaleString('vi-VN')} dòng TKSX và ${khsxAllRows.length.toLocaleString('vi-VN')} dòng KHSX.`
      })
    } catch (err) {
      console.error('Lỗi tính toán:', err)
      setStatusMessage?.({ type: 'error', text: `Tính toán thất bại: ${err.message}` })
      setIsCalculating(false)
    }
  }, [fileSummaries, targetRegCode, masterInfo, masterRecord, calcRules, setPageData, setStatusMessage])

  // Chuyển đổi xem phiên bản khác nhau của cùng phiếu đăng ký
  const handleSelectVersion = useCallback(
    async (newVersion) => {
      if (!newVersion || newVersion === masterRecord?.version) return
      loadingBarRef.current?.continuousStart?.()
      setIsSyncingVersion(true)
      setSyncVersionProgress({
        percent: 20,
        step: 'DOWNLOAD',
        message: `Đang kết nối và tải dữ liệu phiên bản v${newVersion}...`,
        detail: `Tải dữ liệu phiên bản v${newVersion} cho phiếu [${targetRegCode}]...`,
        statusTag: 'Tải phiên bản',
        isComplete: false
      })

      try {
        const bundleCode = `${targetRegCode}@v${newVersion}`
        const binaryBuffer = await downloadProductionBundleOnline(bundleCode)
        if (binaryBuffer && binaryBuffer.length > 0) {
          setSyncVersionProgress({
            percent: 60,
            step: 'UNPACK',
            message: `Đang giải nén và xử lý dữ liệu phiên bản v${newVersion}...`,
            detail: 'Xử lý và phân bổ dữ liệu các bảng...',
            statusTag: 'Xử lý dữ liệu',
            isComplete: false
          })

          const unpacked = unpackProductionBundle(binaryBuffer)

          setSyncVersionProgress({
            percent: 85,
            step: 'INSTALL',
            message: `Đang thiết lập dữ liệu phiên bản v${newVersion} vào hệ thống...`,
            detail: 'Lưu trữ và hoàn thiện cấu trúc dữ liệu...',
            statusTag: 'Thiết lập dữ liệu',
            isComplete: false
          })

          const tabKeys = ['stat_report', 'unfinished_op', 'summary_op', 'mes_approval']
          for (const fType of tabKeys) {
            const fData = unpacked?.filesData?.[fType]
            if (fData && fData.data && fData.data.length > 0) {
              await storageAdapter.saveFile(fType, fData)
            } else {
              await storageAdapter.saveFile(fType, {
                fileName: '',
                fileSize: 0,
                rowCount: 0,
                data: [],
                columns: []
              })
            }
          }

          if (unpacked?.masterInfo) {
            setMasterRecord(unpacked.masterInfo)
            await storageAdapter.saveMasterRegistration(unpacked.masterInfo)
          } else {
            setMasterRecord((prev) => ({ ...prev, version: newVersion }))
          }
          if (unpacked?.calcResults) {
            setCalcResults(unpacked.calcResults)
            await storageAdapter.saveCalcResults(targetRegCode, unpacked.calcResults)
          }

          // Xóa cache và nạp lại tab hiện tại
          tabsCacheRef.current = {}
          const summaries = await storageAdapter.getAllSummaries()
          setFileSummaries(summaries)

          const curTab = activeTabRef.current || TAB_DEFINITIONS[0].id
          const res = await loadTabData(curTab, 1, summaries, unpacked?.calcResults)
          setGridData(res.rows)
          gridDataRef.current = res.rows
          tabsCacheRef.current[curTab] = res

          setSyncVersionProgress({
            percent: 100,
            step: 'COMPLETED',
            isComplete: true,
            message: `Đã đồng bộ thành công phiên bản v${newVersion}!`,
            detail: `Dữ liệu phiên bản v${newVersion} đã sẵn sàng. Bấm [Đồng ý] để tiếp tục.`,
            statusTag: 'Hoàn tất'
          })

          setStatusMessage?.({
            type: 'success',
            text: `Đã chuyển sang xem phiên bản v${newVersion} thành công!`
          })
        }
      } catch (err) {
        console.error('Lỗi chuyển version:', err)
        setStatusMessage?.({
          type: 'error',
          text: `Không thể tải phiên bản v${newVersion}: ${err.message}`
        })
        setIsSyncingVersion(false)
      } finally {
        loadingBarRef.current?.complete?.()
      }
    },
    [masterRecord?.version, targetRegCode, loadTabData, setStatusMessage]
  )

  // Đồng bộ lại dữ liệu báo cáo chuẩn từ hệ thống
  const handleSyncFromServer = useCallback(async () => {
    if (!targetRegCode) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Không tìm thấy mã đăng ký để đồng bộ dữ liệu.'
      })
      return
    }

    loadingBarRef.current?.continuousStart?.()
    setIsSyncingVersion(true)
    setSyncVersionProgress({
      percent: 20,
      step: 'DOWNLOAD',
      message: `Đang kết nối và tải dữ liệu báo cáo [${targetRegCode}]...`,
      detail: `Tải dữ liệu báo cáo chuẩn từ hệ thống...`,
      statusTag: 'Tải dữ liệu',
      isComplete: false
    })

    try {
      const binaryBuffer = await downloadProductionBundleOnline(targetRegCode)
      if (binaryBuffer && binaryBuffer.length > 0) {
        setSyncVersionProgress({
          percent: 60,
          step: 'UNPACK',
          message: `Đang giải nén và xử lý dữ liệu...`,
          detail: 'Xử lý và phân bổ dữ liệu các bảng...',
          statusTag: 'Xử lý dữ liệu',
          isComplete: false
        })

        const unpacked = unpackProductionBundle(binaryBuffer)

        setSyncVersionProgress({
          percent: 85,
          step: 'INSTALL',
          message: `Đang thiết lập dữ liệu các bảng vào hệ thống...`,
          detail: 'Lưu trữ và hoàn thiện cấu trúc dữ liệu...',
          statusTag: 'Thiết lập dữ liệu',
          isComplete: false
        })

        const tabKeys = ['stat_report', 'unfinished_op', 'summary_op', 'mes_approval']
        for (const fType of tabKeys) {
          const fData = unpacked?.filesData?.[fType]
          if (fData && fData.data && fData.data.length > 0) {
            await storageAdapter.saveFile(fType, fData)
          } else {
            await storageAdapter.saveFile(fType, {
              fileName: '',
              fileSize: 0,
              rowCount: 0,
              data: [],
              columns: []
            })
          }
        }

        if (unpacked?.masterInfo) {
          setMasterRecord(unpacked.masterInfo)
          await storageAdapter.saveMasterRegistration(unpacked.masterInfo)
        }
        if (unpacked?.calcResults) {
          setCalcResults(unpacked.calcResults)
          await storageAdapter.saveCalcResults(targetRegCode, unpacked.calcResults)
          try {
            localStorage.setItem(`S_CALC_RESULTS_${targetRegCode}`, JSON.stringify(unpacked.calcResults))
          } catch {}
        }

        // Xóa cache và nạp lại tab hiện tại
        tabsCacheRef.current = {}
        const summaries = await storageAdapter.getAllSummaries()
        setFileSummaries(summaries)

        const curTab = activeTabRef.current || TAB_DEFINITIONS[0].id
        const res = await loadTabData(curTab, 1, summaries, unpacked?.calcResults)
        setGridData(res.rows)
        gridDataRef.current = res.rows
        tabsCacheRef.current[curTab] = res

        setSyncVersionProgress({
          percent: 100,
          step: 'COMPLETED',
          isComplete: true,
          message: `Đã đồng bộ thành công dữ liệu báo cáo!`,
          detail: `Toàn bộ dữ liệu gốc đã được khôi phục nguyên vẹn. Bấm [Đồng ý] để tiếp tục.`,
          statusTag: 'Hoàn tất'
        })

        setStatusMessage?.({
          type: 'success',
          text: `Đã đồng bộ và khôi phục thành công dữ liệu báo cáo!`
        })
      } else {
        throw new Error('Dữ liệu trên hệ thống rỗng hoặc không phản hồi.')
      }
    } catch (err) {
      console.error('Lỗi đồng bộ dữ liệu:', err)
      setStatusMessage?.({
        type: 'error',
        text: `Không thể đồng bộ dữ liệu: ${err.message}`
      })
      setIsSyncingVersion(false)
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [targetRegCode, loadTabData, setStatusMessage])

  // Chuyển sang chế độ Chỉnh sửa / Tạo bản nháp mới từ bản đã công bố (tự động tăng version)
  const handleUnlockForEdit = useCallback(async () => {
    try {
      const currentVer = masterRecord?.calcVersion || masterRecord?.version || masterRecord?.Version || '1.0'
      const nextVer = getNextVersion(currentVer)

      const updatedMaster = {
        ...(masterRecord || {}),
        calcVersion: nextVer,
        version: nextVer,
        Version: nextVer,
        status: 'DRAFT',
        isPublished: false,
        updatedAt: new Date().toISOString()
      }
      setMasterRecord(updatedMaster)
      await storageAdapter.saveMasterRegistration(updatedMaster)

      if (calcResults) {
        setCalcResults((prev) => (prev ? { ...prev, version: nextVer, calcVersion: nextVer } : prev))
      }

      setStatusMessage?.({
        type: 'info',
        text: `Đã mở khóa và nâng lên phiên bản ${nextVer}. Bạn có thể nạp thêm file, xóa/sửa dữ liệu và tính toán lại trước khi công bố bản mới.`
      })
    } catch (err) {
      console.error('Lỗi mở khóa chỉnh sửa:', err)
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi mở khóa chỉnh sửa: ${err.message}`
      })
    }
  }, [masterRecord, calcResults, setStatusMessage])

  // Công bố báo cáo trực tiếp từ màn hình chi tiết lên Server DataHub
  const handlePublishReport = useCallback(async () => {
    // RÀNG BUỘC CHẶT CHẼ: Bắt buộc phải tính toán KHSX & TKSX trước khi công bố
    const hasTksx = Boolean(calcResults?.stat?.calculatedRows && calcResults.stat.calculatedRows.length > 0)
    const hasKhsx = Boolean(calcResults?.plan?.calculatedRows && calcResults.plan.calculatedRows.length > 0)
    if (!hasTksx || !hasKhsx) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Phiếu chưa được tính toán kết quả Thống kê SX (TKSX) và Kế hoạch SX (KHSX). Vui lòng bấm [Tính KHSX & TKSX] trước khi công bố!'
      })
      return
    }

    setIsPublishing(true)
    setPublishProgress({
      percent: 25,
      step: 'PREPARING',
      message: 'Đang kiểm tra và chuẩn bị dữ liệu báo cáo...',
      detail: 'Tổng hợp thông tin các tổ sản xuất và chỉ tiêu kế hoạch',
      statusTag: 'Chuẩn bị dữ liệu',
      isComplete: false
    })

    try {
      await new Promise((r) => setTimeout(r, 200))

      // 1. Kiểm tra và nạp lại kết quả tính toán mới nhất từ bộ nhớ / CSDL
      let freshCalc = calcResults
      if (!freshCalc && targetRegCode) {
        freshCalc = await storageAdapter.getCalcResults(targetRegCode)
      }
      if (!freshCalc?.stat?.calculatedRows?.length && !freshCalc?.plan?.calculatedRows?.length) {
        setStatusMessage?.({
          type: 'warning',
          text: 'Chưa có kết quả tính toán KHSX & TKSX mới nhất. Vui lòng bấm [Tính KHSX & TKSX] trước khi công bố!'
        })
        setIsPublishing(false)
        return
      }

      setPublishProgress({
        percent: 55,
        step: 'AGGREGATING',
        message: 'Đang tổng hợp kết quả thống kê và kế hoạch sản xuất...',
        detail: 'Đối soát số liệu thực tế và hoàn thiện chỉ tiêu',
        statusTag: 'Tổng hợp kết quả',
        isComplete: false
      })
      await new Promise((r) => setTimeout(r, 250))

      // 2. Nạp dữ liệu 4 bảng thô mới nhất từ CSDL
      const allFiles = await storageAdapter.getAllFiles()
      const filesData = {
        stat_report: allFiles?.stat_report?.data || allFiles?.stat_report || [],
        unfinished_op: allFiles?.unfinished_op?.data || allFiles?.unfinished_op || [],
        summary_op: allFiles?.summary_op?.data || allFiles?.summary_op || [],
        mes_approval: allFiles?.mes_approval?.data || allFiles?.mes_approval || []
      }

      const bundlePack = packProductionBundle(
        {
          ...masterInfo,
          status: 'PUBLISHED',
          isPublished: true
        },
        filesData,
        freshCalc,
        { version: masterInfo.version || '1.0' }
      )

      const base64Str = bundlePack.base64

      const statRows = filesData?.stat_report?.length || 0
      const unfinRows = filesData?.unfinished_op?.length || 0
      const sumRows = filesData?.summary_op?.length || 0
      const mesRows = filesData?.mes_approval?.length || 0
      const totalRows = statRows + unfinRows + sumRows + mesRows

      const rawMB = parseFloat((bundlePack.rawSize / 1024 / 1024).toFixed(3)) || 0.01
      const compMB = parseFloat((bundlePack.compressedSize / 1024 / 1024).toFixed(3)) || 0.01

      setPublishProgress({
        percent: 85,
        step: 'SAVING',
        message: 'Đang cập nhật và công bố báo cáo lên hệ thống...',
        detail: 'Ghi nhận phiên bản công bố chính thức',
        statusTag: 'Công bố báo cáo',
        isComplete: false
      })

      const emp = getEmployeeCode() || 'Admin'
      await publishProductionBundleOnline({
        reg_code: masterInfo.regCode,
        factory_name: masterInfo.factoryName || 'GS1 Hà Nội',
        apply_date: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
        production_team: masterInfo.productionTeam || 'Tất cả các tổ',
        status: 'PUBLISHED',
        version: masterInfo.version || '1.0',
        total_rows: totalRows,
        raw_size_mb: rawMB,
        compressed_size_mb: compMB,
        compression_ratio: bundlePack.ratio || '',
        bundle_base64: base64Str,
        file_summaries: JSON.stringify(fileSummaries || {}),
        calc_summary: JSON.stringify(calcResults?.summary || {}),
        remark: masterInfo.remark || '',
        created_by: emp
      })

      const updatedMaster = {
        ...masterRecord,
        ...masterInfo,
        status: 'PUBLISHED',
        isPublished: true
      }
      setMasterRecord(updatedMaster)
      await storageAdapter.saveMasterRegistration(updatedMaster)

      if (freshCalc) {
        const publishedCalc = {
          ...freshCalc,
          status: 'PUBLISHED',
          version: masterInfo.version || '1.0',
          calcVersion: masterInfo.version || '1.0'
        }
        setCalcResults(publishedCalc)
        await storageAdapter.saveCalcResults(targetRegCode, publishedCalc)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`S_CALC_RESULTS_${targetRegCode}`, JSON.stringify(publishedCalc))
        }
      }

      setAvailableVersions((prev) => {
        const curVer = masterInfo.version || '1.0'
        const exists = prev.some((p) => (typeof p === 'string' ? p : p.version) === curVer)
        if (exists) {
          return prev.map((p) =>
            (typeof p === 'string' ? p : p.version) === curVer ? { ...p, status: 'PUBLISHED' } : p
          )
        }
        return [...prev, { version: curVer, status: 'PUBLISHED' }]
      })

      // Bước 4: Hoàn tất 100%
      setPublishProgress({
        percent: 100,
        step: 'COMPLETED',
        message: 'Đã công bố báo cáo thành công!',
        detail: `Báo cáo phiên bản v${masterInfo.version || '1.0'} đã sẵn sàng cho các bộ phận xem và đối soát.`,
        statusTag: 'Hoàn tất thành công',
        isComplete: true
      })

      setStatusMessage?.({
        type: 'success',
        text: `Đã công bố thành công báo cáo phiên bản v${masterInfo.version || '1.0'}!`
      })
    } catch (err) {
      console.error('Lỗi công bố báo cáo:', err)
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi công bố báo cáo: ${err.message}`
      })
      setIsPublishing(false)
    }
  }, [masterInfo, masterRecord, calcResults, fileSummaries, setStatusMessage, targetRegCode])

  // ── Xử lý Upload file Excel cho 1 Tab ──
  const handleUploadFileForTab = useCallback(
    async (fileType, rawFile) => {
      if (!rawFile) return
      const targetTab = fileType || activeTabRef.current
      const tabDef = TAB_DEFINITIONS.find((t) => t.id === targetTab) || TAB_DEFINITIONS[0]
      setIsParsing(true)
      setImportProgress({
        fileName: rawFile.name,
        fileSize: rawFile.size,
        tabTitle: tabDef.title,
        detectedColumns: 0,
        totalRows: 0,
        percent: 15,
        step: 'READING',
        message: `Đang đọc file Excel cho tab ${tabDef.title}...`
      })

      try {
        const parsed = await parseUploadedFile(rawFile, targetTab, {}, (prog) => {
          setImportProgress((prev) => ({
            ...prev,
            ...prog
          }))
        })

        await storageAdapter.saveFile(targetTab, parsed)
        tabsCacheRef.current[targetTab] = null

        // Cập nhật summaries
        const summaries = await storageAdapter.getAllSummaries()
        setFileSummaries(summaries)

        // Cập nhật Master
        if (masterRecord) {
          const updatedMaster = {
            ...masterRecord,
            status: 'DRAFT',
            isPublished: false,
            fileSummaries: summaries
          }
          setMasterRecord(updatedMaster)
          await storageAdapter.saveMasterRegistration(updatedMaster)
        }

        // Nếu tab đang active -> nạp lại grid
        if (targetTab === activeTabRef.current) {
          const dataRes = await loadTabData(targetTab, 1, summaries, calcResults)
          setGridData(dataRes.rows)
          gridDataRef.current = dataRes.rows
          tabsCacheRef.current[targetTab] = dataRes
          setPageData?.((prev) => ({
            ...prev,
            total: dataRes.total,
            totalAll: dataRes.total,
            loadedCount: dataRes.rows.length,
            page: 1,
            pageSize: PAGE_SIZE,
            totalPages: dataRes.totalPages
          }))
        }

        setStatusMessage?.({
          type: 'success',
          text: `Đã nạp thành công ${parsed.rowCount.toLocaleString('vi-VN')} dòng cho tab ${tabDef.title}.`
        })
      } catch (err) {
        console.warn('Lỗi nạp tự động, mở modal ánh xạ cột:', err)
        try {
          const inspectData = await inspectUploadedFile(rawFile, targetTab)
          setMappingModalState({
            isOpen: true,
            rawFile,
            fileType: targetTab,
            inspectData
          })
        } catch (inspectErr) {
          setStatusMessage?.({
            type: 'error',
            text: `Không thể đọc file: ${err.message}`
          })
        }
      } finally {
        setIsParsing(false)
      }
    },
    [masterRecord, loadTabData, calcResults, setPageData, setStatusMessage]
  )

  const openMappingModalForCurrentTab = useCallback(
    async (fileType, rawFile) => {
      const targetTab = fileType || activeTabRef.current
      if (!rawFile) return
      try {
        const inspectData = await inspectUploadedFile(rawFile, targetTab)
        setMappingModalState({
          isOpen: true,
          rawFile,
          fileType: targetTab,
          inspectData
        })
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: `Lỗi đọc cấu trúc file: ${err.message}`
        })
      }
    },
    [setStatusMessage]
  )

  const handleConfirmMapping = useCallback(
    async (config) => {
      const { fileType, rawFile } = mappingModalState
      if (!rawFile || !fileType) return
      const tabDef = TAB_DEFINITIONS.find((t) => t.id === fileType) || TAB_DEFINITIONS[0]
      setMappingModalState((prev) => ({ ...prev, isOpen: false }))
      setIsParsing(true)
      setImportProgress({
        fileName: rawFile.name,
        fileSize: rawFile.size,
        tabTitle: tabDef.title,
        detectedColumns: 0,
        totalRows: 0,
        percent: 20,
        step: 'PARSING',
        message: 'Đang xử lý ánh xạ tùy chỉnh...'
      })

      try {
        const parsed = await parseUploadedFile(rawFile, fileType, config, (prog) => {
          setImportProgress((prev) => ({ ...prev, ...prog }))
        })

        await storageAdapter.saveFile(fileType, parsed)
        tabsCacheRef.current[fileType] = null

        const summaries = await storageAdapter.getAllSummaries()
        setFileSummaries(summaries)

        if (masterRecord) {
          const updatedMaster = {
            ...masterRecord,
            status: 'DRAFT',
            isPublished: false,
            fileSummaries: summaries
          }
          setMasterRecord(updatedMaster)
          await storageAdapter.saveMasterRegistration(updatedMaster)
        }

        if (fileType === activeTabRef.current) {
          const dataRes = await loadTabData(fileType, 1, summaries, calcResults)
          setGridData(dataRes.rows)
          gridDataRef.current = dataRes.rows
          tabsCacheRef.current[fileType] = dataRes
        }

        setStatusMessage?.({
          type: 'success',
          text: `Đã nạp ${parsed.rowCount.toLocaleString('vi-VN')} dòng theo ánh xạ tùy chỉnh cho tab ${tabDef.title}.`
        })
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: `Lỗi nạp file theo ánh xạ: ${err.message}`
        })
      } finally {
        setIsParsing(false)
      }
    },
    [mappingModalState, masterRecord, loadTabData, calcResults, setStatusMessage]
  )

  // ── Lưu đăng ký / Cập nhật báo cáo ──
  const handleRegisterMaster = useCallback(async () => {
    setIsRegistering(true)
    setStatusMessage?.({
      type: 'info',
      text: `Đang lưu thông tin đăng ký cho phiếu [${masterInfo.regCode}]...`
    })
    try {
      const summaries = await storageAdapter.getAllSummaries()
      const statRows = summaries?.stat_report?.rowCount || 0
      const unfinRows = summaries?.unfinished_op?.rowCount || 0
      const sumRows = summaries?.summary_op?.rowCount || 0
      const mesRows = summaries?.mes_approval?.rowCount || 0
      const total = statRows + unfinRows + sumRows + mesRows

      const mergedSummaries = {
        ...(summaries || {})
      }
      if (calcResults?.stat?.calculatedRows?.length > 0) {
        mergedSummaries.result_tksx = {
          isUploaded: true,
          rowCount: calcResults.stat.calculatedRows.length,
          fileName: 'TKSX_KetQua_98Cot.xlsx',
          uploadedAt: calcResults.calculatedAt || new Date().toISOString(),
          isResult: true
        }
      }
      if (calcResults?.plan?.calculatedRows?.length > 0) {
        mergedSummaries.result_khsx = {
          isUploaded: true,
          rowCount: calcResults.plan.calculatedRows.length,
          fileName: 'KHSX_KetQua_DoiSoat.xlsx',
          uploadedAt: calcResults.calculatedAt || new Date().toISOString(),
          isResult: true
        }
      }

      const updatedMaster = {
        ...masterRecord,
        ...masterInfo,
        status: masterRecord?.status === 'PUBLISHED' ? 'PUBLISHED' : 'REGISTERED',
        statReportRows: statRows,
        unfinishedOpRows: unfinRows,
        summaryOpRows: sumRows,
        mesApprovalRows: mesRows,
        resultTksxRows: calcResults?.stat?.calculatedRows?.length || 0,
        resultKhsxRows: calcResults?.plan?.calculatedRows?.length || 0,
        totalRows: total,
        fileSummaries: mergedSummaries,
        updatedAt: new Date().toISOString()
      }

      await storageAdapter.saveMasterRegistration(updatedMaster)
      setMasterRecord(updatedMaster)
      try {
        localStorage.setItem(`S_MASTER_REG_${masterInfo.regCode}`, JSON.stringify(updatedMaster))
      } catch {}

      if (calcResults) {
        await storageAdapter.saveCalcResults(masterInfo.regCode, calcResults)
        await storageAdapter.saveCalcResults('CURRENT_CALC', calcResults)
        try {
          localStorage.setItem(`S_CALC_RESULTS_${masterInfo.regCode}`, JSON.stringify(calcResults))
        } catch {}
      }

      setStatusMessage?.({
        type: 'success',
        text: `Đã lưu cập nhật thông tin phiếu đăng ký [${masterInfo.regCode}] và kết quả tính toán thành công!`
      })
    } catch (err) {
      console.error('Lỗi lưu đăng ký:', err)
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi lưu đăng ký: ${err.message}`
      })
    } finally {
      setIsRegistering(false)
    }
  }, [masterInfo, masterRecord, calcResults, setStatusMessage])

  // ── Xóa tab file ──
  const handleDeleteTabFile = useCallback(
    async (fileType) => {
      const targetTab = fileType || activeTabRef.current
      try {
        await storageAdapter.saveFile(targetTab, {
          fileName: '',
          fileSize: 0,
          rowCount: 0,
          data: [],
          columns: []
        })
        tabsCacheRef.current[targetTab] = {
          rows: [],
          total: 0,
          page: 1,
          totalPages: 1,
          hasMore: false
        }
        const summaries = await storageAdapter.getAllSummaries()
        setFileSummaries(summaries)

        if (targetTab === activeTabRef.current) {
          setGridData([])
          gridDataRef.current = []
          pageInfoRef.current = {
            total: 0,
            loadedCount: 0,
            pageSize: PAGE_SIZE,
            page: 1,
            totalPages: 1,
            hasMore: false
          }
          setPageData?.((prev) => ({
            ...prev,
            total: 0,
            totalAll: 0,
            loadedCount: 0,
            page: 1,
            totalPages: 1
          }))
          setSelection?.({
            columns: CompactSelection.empty(),
            rows: CompactSelection.empty(),
            current: undefined
          })
        }

        if (masterRecord) {
          const updatedMaster = {
            ...masterRecord,
            status: 'DRAFT',
            isPublished: false,
            fileSummaries: summaries
          }
          setMasterRecord(updatedMaster)
          await storageAdapter.saveMasterRegistration(updatedMaster)
          if (targetRegCode) {
            try {
              localStorage.setItem(`S_MASTER_REG_${targetRegCode}`, JSON.stringify(updatedMaster))
              localStorage.setItem('GS_ACTIVE_DETAIL_REG_CODE', targetRegCode)
            } catch {}
          }
        }

        setStatusMessage?.({
          type: 'info',
          text: `Đã xóa dữ liệu tab khỏi hệ thống.`
        })
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: `Lỗi xóa tab: ${err.message}`
        })
      }
    },
    [masterRecord, setPageData, setSelection, setStatusMessage, targetRegCode]
  )

  // ── Xóa tất cả dữ liệu ──
  const handleClearAll = useCallback(async () => {
    try {
      const tabKeys = ['stat_report', 'unfinished_op', 'summary_op', 'mes_approval']
      for (const fType of tabKeys) {
        await storageAdapter.saveFile(fType, {
          fileName: '',
          fileSize: 0,
          rowCount: 0,
          data: [],
          columns: []
        })
      }
      tabsCacheRef.current = {}
      setGridData([])
      gridDataRef.current = []
      setFileSummaries({})
      setCalcResults(null)

      if (targetRegCode) {
        await storageAdapter.saveCalcResults?.(targetRegCode, null)
        try {
          localStorage.removeItem(`S_CALC_RESULTS_${targetRegCode}`)
        } catch {}
      }

      if (masterRecord) {
        const updatedMaster = {
          ...masterRecord,
          status: 'DRAFT',
          isPublished: false,
          fileSummaries: {}
        }
        setMasterRecord(updatedMaster)
        await storageAdapter.saveMasterRegistration(updatedMaster)
        if (targetRegCode) {
          try {
            localStorage.setItem(`S_MASTER_REG_${targetRegCode}`, JSON.stringify(updatedMaster))
            localStorage.setItem('GS_ACTIVE_DETAIL_REG_CODE', targetRegCode)
          } catch {}
        }
      }

      pageInfoRef.current = {
        total: 0,
        loadedCount: 0,
        pageSize: PAGE_SIZE,
        page: 1,
        totalPages: 1,
        hasMore: false
      }
      setPageData?.((prev) => ({
        ...prev,
        total: 0,
        totalAll: 0,
        loadedCount: 0,
        page: 1,
        totalPages: 1,
        calcSummary: null
      }))
      setSelection?.({
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty(),
        current: undefined
      })
      setStatusMessage?.({
        type: 'info',
        text: 'Đã xóa toàn bộ file khỏi phiếu làm việc.'
      })
    } catch (err) {
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi xóa tất cả: ${err.message}`
      })
    }
  }, [masterRecord, setPageData, setSelection, setStatusMessage, targetRegCode])

  const selectedRowsIndices = useMemo(() => {
    const indices = []
    if (selection?.rows) {
      selection.rows.toArray().forEach((idx) => {
        if (!indices.includes(idx)) indices.push(idx)
      })
    }
    if (selection?.current?.range) {
      const { y, height } = selection.current.range
      for (let i = y; i < y + height; i++) {
        if (!indices.includes(i)) indices.push(i)
      }
    }
    if (selection?.current?.cell && indices.length === 0) {
      indices.push(selection.current.cell[1])
    }
    return indices
  }, [selection])

  // ── Xóa dòng đã chọn ──
  const handleDeleteSelectedRows = useCallback(
    async (selectedIndices) => {
      const indicesToDel =
        Array.isArray(selectedIndices) && selectedIndices.length > 0
          ? selectedIndices
          : selectedRowsIndices

      if (!indicesToDel || indicesToDel.length === 0) {
        setStatusMessage?.({
          type: 'warning',
          text: 'Vui lòng chọn ít nhất 1 dòng để xóa'
        })
        return
      }

      const indicesSet = new Set(indicesToDel)
      const count = indicesSet.size

      if (activeTab === 'result_tksx') {
        const oldRows = calcResults?.stat?.calculatedRows || []
        const rowsToDelete = indicesToDel.map((i) => filteredGridData[i]).filter(Boolean)
        const idsToDelete = new Set(
          rowsToDelete.map((r) => r.IdSeq || r._rowId || r.id).filter(Boolean)
        )

        let filtered = []
        if (idsToDelete.size > 0) {
          filtered = oldRows.filter((r) => !idsToDelete.has(r.IdSeq || r._rowId || r.id))
        } else {
          filtered = oldRows.filter((_, idx) => !indicesSet.has(idx))
        }

        const updatedCalc = {
          ...calcResults,
          stat: {
            ...calcResults?.stat,
            calculatedRows: filtered,
            totalTickets: filtered.length
          }
        }
        setCalcResults(updatedCalc)
        setGridData(filtered.slice(0, PAGE_SIZE))
        gridDataRef.current = filtered.slice(0, PAGE_SIZE)
        tabsCacheRef.current['result_tksx'] = {
          rows: filtered.slice(0, PAGE_SIZE),
          total: filtered.length,
          page: 1,
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
          hasMore: filtered.length > PAGE_SIZE
        }

        pageInfoRef.current = {
          total: filtered.length,
          loadedCount: Math.min(filtered.length, PAGE_SIZE),
          pageSize: PAGE_SIZE,
          page: 1,
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
          hasMore: filtered.length > PAGE_SIZE
        }

        setPageData?.((prev) => ({
          ...prev,
          total: filtered.length,
          totalAll: filtered.length,
          loadedCount: Math.min(filtered.length, PAGE_SIZE),
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1
        }))

        if (targetRegCode) {
          await storageAdapter.saveCalcResults(targetRegCode, updatedCalc)
          try {
            localStorage.setItem(`S_CALC_RESULTS_${targetRegCode}`, JSON.stringify(updatedCalc))
          } catch {}
        }

        setSelection?.({
          columns: CompactSelection.empty(),
          rows: CompactSelection.empty(),
          current: undefined
        })
        setStatusMessage?.({
          type: 'info',
          text: `Đã xóa ${count} dòng khỏi Kết Quả TKSX.`
        })
        return
      }

      if (activeTab === 'result_khsx') {
        const oldRows = calcResults?.plan?.calculatedRows || []
        const rowsToDelete = indicesToDel.map((i) => filteredGridData[i]).filter(Boolean)
        const idsToDelete = new Set(
          rowsToDelete.map((r) => r.IdSeq || r._rowId || r.id).filter(Boolean)
        )

        let filtered = []
        if (idsToDelete.size > 0) {
          filtered = oldRows.filter((r) => !idsToDelete.has(r.IdSeq || r._rowId || r.id))
        } else {
          filtered = oldRows.filter((_, idx) => !indicesSet.has(idx))
        }

        const updatedCalc = {
          ...calcResults,
          plan: {
            ...calcResults?.plan,
            calculatedRows: filtered
          }
        }
        setCalcResults(updatedCalc)
        setGridData(filtered.slice(0, PAGE_SIZE))
        gridDataRef.current = filtered.slice(0, PAGE_SIZE)
        tabsCacheRef.current['result_khsx'] = {
          rows: filtered.slice(0, PAGE_SIZE),
          total: filtered.length,
          page: 1,
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
          hasMore: filtered.length > PAGE_SIZE
        }

        pageInfoRef.current = {
          total: filtered.length,
          loadedCount: Math.min(filtered.length, PAGE_SIZE),
          pageSize: PAGE_SIZE,
          page: 1,
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
          hasMore: filtered.length > PAGE_SIZE
        }

        setPageData?.((prev) => ({
          ...prev,
          total: filtered.length,
          totalAll: filtered.length,
          loadedCount: Math.min(filtered.length, PAGE_SIZE),
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1
        }))

        if (targetRegCode) {
          await storageAdapter.saveCalcResults(targetRegCode, updatedCalc)
          try {
            localStorage.setItem(`S_CALC_RESULTS_${targetRegCode}`, JSON.stringify(updatedCalc))
          } catch {}
        }

        setSelection?.({
          columns: CompactSelection.empty(),
          rows: CompactSelection.empty(),
          current: undefined
        })
        setStatusMessage?.({
          type: 'info',
          text: `Đã xóa ${count} dòng khỏi Kết Quả KHSX.`
        })
        return
      }

      try {
        let curFile = await storageAdapter.getFile(activeTab)
        if (!curFile || !curFile.data || curFile.data.length === 0) {
          const allFiles = await storageAdapter.getAllFiles()
          curFile = allFiles[activeTab] || {}
        }
        const rawData = curFile?.data || []
        if (Array.isArray(rawData)) {
          const rowsToDelete = indicesToDel.map((i) => filteredGridData[i]).filter(Boolean)
          const idsToDelete = new Set(
            rowsToDelete.map((r) => r.IdSeq || r._rowId || r.id).filter(Boolean)
          )

          let filtered = []
          if (idsToDelete.size > 0) {
            filtered = rawData.filter((r) => !idsToDelete.has(r.IdSeq || r._rowId || r.id))
          } else {
            filtered = rawData.filter((_, idx) => !indicesSet.has(idx))
          }

          const updated = {
            ...curFile,
            fileName: curFile.fileName || '',
            columns: curFile.columns || [],
            data: filtered,
            rowCount: filtered.length
          }
          await storageAdapter.saveFile(activeTab, updated)
          tabsCacheRef.current[activeTab] = {
            rows: filtered.slice(0, PAGE_SIZE),
            total: filtered.length,
            page: 1,
            totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
            hasMore: filtered.length > PAGE_SIZE
          }
          setGridData(filtered.slice(0, PAGE_SIZE))
          gridDataRef.current = filtered.slice(0, PAGE_SIZE)

          const summaries = await storageAdapter.getAllSummaries()
          setFileSummaries(summaries)

          if (masterRecord) {
            const updatedMaster = {
              ...masterRecord,
              status: 'DRAFT',
              isPublished: false,
              fileSummaries: summaries
            }
            setMasterRecord(updatedMaster)
            await storageAdapter.saveMasterRegistration(updatedMaster)
            if (targetRegCode) {
              try {
                localStorage.setItem(`S_MASTER_REG_${targetRegCode}`, JSON.stringify(updatedMaster))
              } catch {}
            }
          }

          pageInfoRef.current = {
            total: filtered.length,
            loadedCount: Math.min(filtered.length, PAGE_SIZE),
            pageSize: PAGE_SIZE,
            page: 1,
            totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
            hasMore: filtered.length > PAGE_SIZE
          }

          setPageData?.((prev) => ({
            ...prev,
            total: filtered.length,
            totalAll: filtered.length,
            loadedCount: Math.min(filtered.length, PAGE_SIZE),
            totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1
          }))

          setSelection?.({
            columns: CompactSelection.empty(),
            rows: CompactSelection.empty(),
            current: undefined
          })
          setStatusMessage?.({
            type: 'info',
            text: `Đã xóa ${count} dòng khỏi tab hiện tại.`
          })
        }
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: `Lỗi xóa dòng: ${err.message}`
        })
      }
    },
    [
      activeTab,
      calcResults,
      filteredGridData,
      masterRecord,
      selectedRowsIndices,
      setCalcResults,
      setGridData,
      setPageData,
      setSelection,
      setStatusMessage,
      targetRegCode
    ]
  )

  const handleDeleteRows = useCallback(() => {
    handleDeleteSelectedRows(selectedRowsIndices)
  }, [handleDeleteSelectedRows, selectedRowsIndices])

  // ── Xuất gói .gsprod ──
  const handleExportBundle = useCallback(async () => {
    setIsExporting(true)
    setStatusMessage?.({
      type: 'info',
      text: 'Đang nén dữ liệu 6 bảng và xuất gói .gsprod...'
    })
    try {
      let freshCalc = calcResults
      if (!freshCalc && targetRegCode) {
        freshCalc = await storageAdapter.getCalcResults(targetRegCode)
      }
      const allFiles = await storageAdapter.getAllFiles()
      const filesData = {
        stat_report: allFiles?.stat_report?.data || allFiles?.stat_report || [],
        unfinished_op: allFiles?.unfinished_op?.data || allFiles?.unfinished_op || [],
        summary_op: allFiles?.summary_op?.data || allFiles?.summary_op || [],
        mes_approval: allFiles?.mes_approval?.data || allFiles?.mes_approval || []
      }

      const bundlePack = packProductionBundle(
        masterInfo,
        filesData,
        freshCalc,
        { version: masterInfo.version || '1.0' }
      )

      const blob = new Blob([bundlePack.buffer], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `GSPROD_${masterInfo.regCode || 'BUNDLE'}_v${masterInfo.version || '1.0'}.gsprod`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatusMessage?.({
        type: 'success',
        text: `Xuất gói thành công! Nén: ${(bundlePack.compressedSize / 1024 / 1024).toFixed(2)}MB (${bundlePack.ratio})`
      })
    } catch (err) {
      console.error('Lỗi xuất gói:', err)
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi xuất gói: ${err.message}`
      })
    } finally {
      setIsExporting(false)
    }
  }, [masterInfo, calcResults, targetRegCode, setStatusMessage])

  // ── Modal & Trạng Thái Xuất 6 Bảng Excel Đầy Đủ ──
  const [isExportExcelModalOpen, setIsExportExcelModalOpen] = useState(false)
  const [isExportExcelProgressOpen, setIsExportExcelProgressOpen] = useState(false)
  const [exportExcelProgressInfo, setExportExcelProgressInfo] = useState({
    percent: 10,
    step: 'INIT',
    message: 'Đang chuẩn bị xuất dữ liệu...',
    detail: '',
    statusTag: 'Xuất dữ liệu Excel'
  })

  // Mở hộp thoại cấu hình xuất Excel chuẩn ERP
  const handleExportAllTabsExcel = useCallback(() => {
    setIsExportExcelModalOpen(true)
  }, [])

  // Thực thi xuất toàn bộ 6 bảng dữ liệu KHSX & TKSX
  const executeExportAllTabsExcel = useCallback(
    async ({ fileName, saveDirectory } = {}) => {
      setIsExportExcelModalOpen(false)
      setIsExportExcelProgressOpen(true)
      setExportExcelProgressInfo({
        percent: 10,
        step: 'INIT',
        message: 'Đang chuẩn bị dữ liệu 6 bảng KHSX & TKSX...',
        detail: `Mã đợt: ${targetRegCode || masterRecord?.regCode || 'EXPORT'}`,
        statusTag: 'Đang khởi tạo'
      })

      try {
        const allFiles = {}
        const fileTypes = ['stat_report', 'unfinished_op', 'summary_op', 'mes_approval']
        for (const ft of fileTypes) {
          if (tabsCacheRef.current[ft]?.data) {
            allFiles[ft] = {
              data: tabsCacheRef.current[ft].data,
              columns: tabsCacheRef.current[ft].columns
            }
          } else {
            try {
              const fileDoc = await storageAdapter.getFile(ft)
              if (fileDoc?.data) {
                allFiles[ft] = fileDoc
              }
            } catch (e) {}
          }
        }

        let activeCalc = calcResults
        if (!activeCalc?.plan?.calculatedRows || !activeCalc?.stat?.calculatedRows) {
          if (tabsCacheRef.current['result_khsx']?.data || tabsCacheRef.current['result_tksx']?.data) {
            activeCalc = {
              plan: {
                calculatedRows: tabsCacheRef.current['result_khsx']?.data || [],
                columns: RESULT_KHSX_COLUMN_SCHEMA
              },
              stat: {
                calculatedRows: tabsCacheRef.current['result_tksx']?.data || [],
                columns: STAT_REPORT_COLUMN_SCHEMA
              }
            }
          } else {
            try {
              activeCalc = await storageAdapter.getCalcResults(targetRegCode || masterRecord?.regCode)
            } catch (e) {}
          }
        }

        const finalFileName =
          fileName ||
          `DATA_KHSX_${targetRegCode || masterRecord?.regCode || 'ALL'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`

        await exportFull6TabsProductionExcel({
          calcResults: activeCalc,
          allFiles,
          regCode: targetRegCode || masterRecord?.regCode,
          fileName: finalFileName,
          saveDirectory,
          onProgress: (prog) => {
            setExportExcelProgressInfo((prev) => ({
              ...prev,
              ...prog
            }))
          }
        })

        setStatusMessage?.({
          type: 'success',
          text: `Đã xuất thành công trọn bộ 6 bảng dữ liệu ra file [${finalFileName}]!`
        })
      } catch (err) {
        console.error('Lỗi khi xuất 6 bảng Excel:', err)
        setExportExcelProgressInfo({
          percent: 100,
          isComplete: true,
          message: `Lỗi xuất dữ liệu: ${err.message}`,
          detail: 'Vui lòng kiểm tra lại dữ liệu và thử lại.',
          statusTag: 'Xuất lỗi'
        })
        setStatusMessage?.({
          type: 'error',
          text: `Xuất file Excel thất bại: ${err.message}`
        })
      }
    },
    [targetRegCode, masterRecord, calcResults, setStatusMessage]
  )

  // Xuất nhanh tab đang xem
  const handleExportTabExcel = useCallback(() => {
    if (gridData.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Tab hiện tại chưa có dữ liệu để xuất Excel!'
      })
      return
    }
    try {
      const ws = XLSX.utils.json_to_sheet(gridData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, currentTabDef.shortTitle.slice(0, 31))
      const fn = `${currentTabDef.shortTitle}_${targetRegCode || 'EXPORT'}_${new Date().getTime()}.xlsx`
      XLSX.writeFile(wb, fn)
      setStatusMessage?.({
        type: 'success',
        text: `Đã xuất thành công bảng [${currentTabDef.title}] ra file: ${fn}`
      })
    } catch (e) {
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi xuất file: ${e.message}`
      })
    }
  }, [gridData, currentTabDef, targetRegCode, setStatusMessage])

  // Đẩy 2 file kết quả KHSX & TKSX lên module Đăng ký báo cáo (/erp/u/report/registration)
  const handleRegisterReportsToSystem = useCallback(async () => {
    let freshCalc = calcResults
    if (!freshCalc?.plan?.calculatedRows || !freshCalc?.stat?.calculatedRows) {
      if (tabsCacheRef.current['result_khsx']?.data || tabsCacheRef.current['result_tksx']?.data) {
        freshCalc = {
          plan: {
            calculatedRows: tabsCacheRef.current['result_khsx']?.data || [],
            columns: RESULT_KHSX_COLUMN_SCHEMA
          },
          stat: {
            calculatedRows: tabsCacheRef.current['result_tksx']?.data || [],
            columns: STAT_REPORT_COLUMN_SCHEMA
          }
        }
      } else {
        try {
          freshCalc = await storageAdapter.getCalcResults(targetRegCode || masterRecord?.regCode)
        } catch (e) {}
      }
    }

    const khsxRows = freshCalc?.plan?.calculatedRows || []
    const statRows = freshCalc?.stat?.calculatedRows || []

    if (khsxRows.length === 0 && statRows.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Chưa có dữ liệu kết quả KHSX và TKSX để đăng ký báo cáo!'
      })
      return
    }

    setIsPushingRegistration(true)
    const currentRegCode = targetRegCode || masterRecord?.regCode || 'REG-CALC'
    setPushRegistrationProgress({
      isOpen: true,
      percent: 10,
      step: 'INIT',
      message: 'Đang chuẩn bị dữ liệu 2 báo cáo KHSX và TKSX...',
      detail: `Mã đăng ký: ${currentRegCode} | Nhà máy: ${masterInfo.factoryName || 'GS1 Hà Nội'}`,
      statusTag: 'Khởi tạo',
      khsxRows: khsxRows.length,
      statRows: statRows.length,
      regCode: currentRegCode,
      isComplete: false,
      isError: false
    })

    await new Promise((r) => setTimeout(r, 200))

    try {
      const factoryCode =
        String(masterInfo.factoryName || '').includes('GS5') ||
        String(masterInfo.factoryName || '').includes('Quế Võ')
          ? 'GS5'
          : 'GS1'
      const factoryName =
        masterInfo.factoryName || (factoryCode === 'GS5' ? 'GS5 Quế Võ 1B' : 'GS1 Hà Nội')
      const applyDate = masterInfo.applyDate || new Date().toISOString().slice(0, 10)
      const regCode = currentRegCode
      const remark = masterInfo.remark || 'Nạp tự động từ Động cơ tính KHSX & TKSX GsHub'

      const baseReg = String(regCode).replace(/-KHSX$|-TKSX$/i, '')
      const khsxRegCode = `${baseReg}-KHSX`
      const tksxRegCode = `${baseReg}-TKSX`

      // BƯỚC 1: Đẩy Báo cáo Kế hoạch sản xuất (KHSX)
      if (khsxRows.length > 0) {
        setPushRegistrationProgress((prev) => ({
          ...prev,
          percent: 25,
          step: 'KHSX',
          message: `Đang nạp ${khsxRows.length.toLocaleString('vi-VN')} dòng Kế hoạch SX (KHSX)...`,
          detail: '',
          statusTag: 'Đang nạp KHSX'
        }))

        await savePlanRegistration(
          {
            reportType: 'plan',
            factoryCode,
            factoryName,
            applyDate,
            regCode: khsxRegCode,
            remark,
            status: 'published',
            isDraft: false,
            SheetData: khsxRows,
            planData: khsxRows,
            data: khsxRows
          },
          null,
          (progress) => {
            const p = Math.round(25 + progress.percent * 0.35)
            setPushRegistrationProgress((prev) => ({
              ...prev,
              percent: Math.min(60, p),
              detail: ''
            }))
          }
        )
      }

      // BƯỚC 2: Đẩy Báo cáo Thống kê sản xuất (TKSX)
      if (statRows.length > 0) {
        setPushRegistrationProgress((prev) => ({
          ...prev,
          percent: 65,
          step: 'TKSX',
          message: `Đang nạp ${statRows.length.toLocaleString('vi-VN')} dòng Thống kê SX (TKSX)...`,
          detail: '',
          statusTag: 'Đang nạp TKSX'
        }))

        await savePlanRegistration(
          {
            reportType: 'statistics',
            factoryCode,
            factoryName,
            applyDate,
            regCode: tksxRegCode,
            remark,
            status: 'published',
            isDraft: false,
            SheetData: statRows,
            statsData: statRows,
            data: statRows
          },
          null,
          (progress) => {
            const p = Math.round(65 + progress.percent * 0.3)
            setPushRegistrationProgress((prev) => ({
              ...prev,
              percent: Math.min(95, p),
              detail: ''
            }))
          }
        )
      }

      // BƯỚC 3: Hoàn tất 100%
      setPushRegistrationProgress((prev) => ({
        ...prev,
        percent: 100,
        step: 'DONE',
        message: 'Đã nạp thành công 2 báo cáo KHSX & TKSX!',
        detail: '',
        statusTag: 'Hoàn tất',
        isComplete: true
      }))

      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp thành công 2 báo cáo KHSX (${khsxRows.length.toLocaleString('vi-VN')} dòng) và TKSX (${statRows.length.toLocaleString('vi-VN')} dòng)!`
      })
    } catch (err) {
      console.error('[PushRegistration Error in DetailView]', err)
      setPushRegistrationProgress((prev) => ({
        ...prev,
        isError: true,
        message: `Lỗi khi nạp báo cáo: ${err?.message || err}`,
        detail: 'Vui lòng kiểm tra kết nối mạng hoặc thử lại.',
        statusTag: 'Lỗi nạp dữ liệu'
      }))
      setStatusMessage?.({
        type: 'error',
        text: `Lỗi đăng ký báo cáo: ${err?.message || err}`
      })
    }
  }, [calcResults, masterInfo, masterRecord, setStatusMessage, targetRegCode])

  usePageHotkeys({
    onDelete: handleDeleteRows,
    onSave: handleRegisterMaster,
    onSearch: () => setShowSearch(true)
  })

  const handleBackOrClose = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/sub/') ||
        window.location.hash.includes('/sub/') ||
        window.history.length <= 1)
    ) {
      if (typeof requestWindowClose === 'function') {
        requestWindowClose()
        return
      }
      if (window.electron?.close) {
        window.electron.close()
      } else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('window:close')
      } else {
        window.close()
      }
    } else {
      if (typeof safeNavigate === 'function') {
        safeNavigate(-1)
      } else {
        navigate(-1)
      }
    }
  }, [navigate, requestWindowClose, safeNavigate])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <CalcProductionActions
            isDetailView={true}
            onBack={handleBackOrClose}
            activeTabDef={currentTabDef}
            activeFileData={activeTabFileData}
            isParsing={isParsing}
            isCalculating={isCalculating}
            isRegistering={isRegistering}
            isPublishing={isPublishing}
            isSyncingVersion={isSyncingVersion}
            isExporting={isExporting}
            isPushingRegistration={isPushingRegistration}
            onPushRegistration={handleRegisterReportsToSystem}
            fileStatusSummary={fileStatusSummary}
            masterRecord={masterRecord}
            masterInfo={masterInfo}
            selectedRowsCount={selectedRowsIndices.length}
            onUploadFile={handleUploadFileForTab}
            onOpenCustomMapping={openMappingModalForCurrentTab}
            onDeleteSelectedRows={handleDeleteRows}
            onDeleteTabFile={handleDeleteTabFile}
            onClearAll={handleClearAll}
            onRunCalculation={handleRunCalculation}
            onRegisterMaster={handleRegisterMaster}
            onPublishReport={handlePublishReport}
            onExportBundle={handleExportBundle}
            onSyncFromServer={handleSyncFromServer}
            onUnlockForEdit={handleUnlockForEdit}
            onOpenSearch={() => setShowSearch(true)}
            onExportTabExcel={handleExportTabExcel}
            onExportAllTabsExcel={handleExportAllTabsExcel}
          />
        }
        query={
          <CalcProductionQuery
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            masterInfo={masterInfo}
            onChangeMasterInfo={handleChangeMasterInfo}
            availableVersions={availableVersions}
            onSelectVersion={handleSelectVersion}
            fileStatusSummary={fileStatusSummary}
            searchText={searchText}
            setSearchText={setSearchText}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dynamicFilterFields={dynamicFilterFields}
            filterValues={filterValues}
            onDynamicFilterChange={handleDynamicFilterChange}
            totalRowsCount={gridData.length}
            filteredRowsCount={filteredGridData.length}
            disabled={isCalculating || isPublishing}
            onOpenRuleConfig={() => setIsConfigModalOpen(true)}
          />
        }
        queryTitle={t('Danh sách 4 Tab Kiến Trúc Dữ Liệu & Chỉ Số Tổng Hợp')}
        defaultOpenQuery={true}
        table={
          <CalcDataGridTable
            tableTitle={`${currentTabDef.title} (${(pageInfoRef.current.total || filteredGridData.length || 0).toLocaleString('vi-VN')} dòng)`}
            cols={cols}
            setCols={setCols}
            defaultCols={defaultCols}
            gridData={filteredGridData}
            setGridData={setGridData}
            numRows={filteredGridData.length}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            onVisibleRegionChanged={handleVisibleRegionChanged}
            onAddQueryField={handleAddQueryField}
          />
        }
      />
      <ImportLoadingOverlay
        isLoading={isParsing}
        progressInfo={importProgress}
        title={t('TIẾN TRÌNH NẠP DỮ LIỆU BÁO CÁO')}
        message={t('Đang đọc và phân tích cấu trúc file Excel...')}
        subMessage={t(
          'Thao tác chuột và bàn phím đang được tạm khóa để bảo vệ toàn vẹn dữ liệu. Vui lòng không tắt hoặc rời khỏi trang.'
        )}
      />
      <CalculationProgressOverlay
        isCalculating={isCalculating}
        progressInfo={calculationProgress}
        title={t('TIẾN TRÌNH TÍNH TOÁN KHSX & TKSX')}
        steps={[
          t('1. Chuẩn bị dữ liệu'),
          t('2. Tổng hợp TKSX'),
          t('3. Đối soát KHSX'),
          t('4. Hoàn tất báo cáo')
        ]}
        subMessage={t(
          'Hệ thống đang truy vấn CSDL và tính toán đối soát dữ liệu. Vui lòng không đóng trang.'
        )}
        onClose={() => setIsCalculating(false)}
      />
      <CalculationProgressOverlay
        isCalculating={isPublishing}
        progressInfo={publishProgress}
        title={t('TIẾN TRÌNH CÔNG BỐ BÁO CÁO')}
        icon={Send}
        steps={[
          t('1. Chuẩn bị dữ liệu'),
          t('2. Tổng hợp kết quả'),
          t('3. Lưu trữ hệ thống'),
          t('4. Hoàn tất công bố')
        ]}
        subMessage={t(
          'Thao tác chuột và bàn phím đang được tạm khóa để bảo đảm dữ liệu công bố chính xác và an toàn.'
        )}
        onClose={() => setIsPublishing(false)}
      />
      <CalculationProgressOverlay
        isCalculating={isSyncingVersion}
        progressInfo={syncVersionProgress}
        title={t('TIẾN TRÌNH ĐỒNG BỘ DỮ LIỆU BÁO CÁO')}
        icon={CloudDownload}
        steps={[
          t('1. Kết nối hệ thống'),
          t('2. Tải dữ liệu'),
          t('3. Xử lý dữ liệu'),
          t('4. Hoàn tất thiết lập')
        ]}
        subMessage={t(
          'Hệ thống đang tải và thiết lập dữ liệu báo cáo. Vui lòng chờ trong giây lát...'
        )}
        onClose={() => setIsSyncingVersion(false)}
      />
      <CalcRuleConfigModal
        open={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentRules={calcRules}
        onSaveRules={handleSaveCalcRules}
        masterInfo={masterInfo}
      />
      {mappingModalState.isOpen && (
        <ExcelMappingModal
          isOpen={mappingModalState.isOpen}
          onClose={() => setMappingModalState((prev) => ({ ...prev, isOpen: false }))}
          targetTabId={mappingModalState.fileType || mappingModalState.tabId}
          file={mappingModalState.rawFile || mappingModalState.file}
          tabTitle={mappingModalState.inspectData?.tabTitle || currentTabDef.title}
          matrixPreview={
            mappingModalState.inspectData?.rawMatrix || mappingModalState.matrixPreview || []
          }
          rawMatrix={mappingModalState.inspectData?.rawMatrix || mappingModalState.rawMatrix || []}
          detectedHeaderRow={
            mappingModalState.inspectData?.detectedHeaderRow ??
            mappingModalState.initialHeaderRow ??
            0
          }
          initialHeaderRow={
            mappingModalState.inspectData?.detectedHeaderRow ??
            mappingModalState.initialHeaderRow ??
            0
          }
          detectedDataStartRow={
            mappingModalState.inspectData?.detectedDataStartRow ??
            mappingModalState.initialDataStartRow ??
            1
          }
          initialDataStartRow={
            mappingModalState.inspectData?.detectedDataStartRow ??
            mappingModalState.initialDataStartRow ??
            1
          }
          availableSchema={
            mappingModalState.inspectData?.availableSchema ||
            mappingModalState.availableSchema ||
            currentTabDef?.columnsSchema ||
            []
          }
          initialMapping={mappingModalState.initialMapping || {}}
          onConfirm={handleConfirmMapping}
        />
      )}

      {/* Modal Cấu hình Tên File & Thư Mục Lưu Excel (Chuẩn ERP) */}
      <ExportExcelModal
        isOpen={isExportExcelModalOpen}
        onClose={() => setIsExportExcelModalOpen(false)}
        title={`Xuất Trọn Bộ 6 Bảng KHSX & TKSX (${targetRegCode || masterRecord?.regCode || 'ALL'})`}
        reportName={`DATA_KHSX_${targetRegCode || masterRecord?.regCode || 'EXPORT'}`}
        totalRows={6}
        loadedCount={6}
        selectedCount={1}
        defaultFileName={`DATA_KHSX_${targetRegCode || masterRecord?.regCode || 'ALL'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
        onConfirmExport={executeExportAllTabsExcel}
      />

      {/* Modal Tiến Trình Tổng Hợp & Xuất Excel Kèm Đồng Hồ Thời Gian Thực */}
      <CalculationProgressOverlay
        isCalculating={isExportExcelProgressOpen}
        progressInfo={exportExcelProgressInfo}
        title="TIẾN TRÌNH XUẤT EXCEL 6 BẢNG KHSX & TKSX"
        icon={FileSpreadsheet}
        steps={[
          '1. Chuẩn bị 6 Bảng',
          '2. Tổng hợp dữ liệu',
          '3. Định dạng Header',
          '4. Xuất file hoàn tất'
        ]}
        subMessage="Đang tổng hợp và đóng gói 6 bảng dữ liệu với tiêu đề tiếng Việt chuẩn ERP."
        onClose={() => setIsExportExcelProgressOpen(false)}
      />

      {/* Modal Theo Dõi Tiến Trình Đăng Ký 2 Báo Cáo KHSX & TKSX Lên Hệ Thống */}
      <PlanRegistrationPushModal
        isOpen={pushRegistrationProgress.isOpen}
        progressInfo={pushRegistrationProgress}
        onClose={() => setPushRegistrationProgress((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
