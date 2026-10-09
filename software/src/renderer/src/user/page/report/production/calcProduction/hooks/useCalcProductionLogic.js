/**
 * Custom hook điều phối toàn bộ luồng trang Đăng ký & Tính KHSX & TKSX
 * Quản lý Master Registration Info, 4 Tab Files (không tự động truy vấn trên mount), và Động cơ tính toán
 * Đẩy toàn bộ thông báo xuống StatusBar (PageDataContext)
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  TAB_DEFINITIONS,
  STORAGE_KEYS,
  STAT_REPORT_COLUMN_SCHEMA,
  RESULT_KHSX_COLUMN_SCHEMA,
  ARCHITECTURE_FILE_TYPES
} from '../constants/calcConstants'
import { RESULT_CALC_COLUMNS_SCHEMA } from '../columns/calcGridColumns'
import { parseUploadedFile, inspectUploadedFile } from '../engine/fileParsers'
import { runProductionCalculations } from '../engine'
import storageAdapter from '../storage'
import { publishMasterRegistrationSQLite, exportBundlePackageSQLite } from '../storage/sqliteStorage'
import { publishProductionBundleOnline } from '@renderer/api/production/calcBundleApi'
import { packProductionBundle, uint8ArrayToBase64 } from '../engine/bundlePacker'
import { useArchitectureStorage } from './useArchitectureStorage'

const generateDefaultRegCode = () => {
  const dateStr = dayjs().format('YYYYMMDD')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `REG-CALC-${dateStr}-${rand}`
}

export function useCalcProductionLogic({ setStatusMessage } = {}) {
  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [calcResults, setCalcResults] = useState(null)

  // State Modal Cấu hình & Ánh xạ Cột Excel
  const [mappingModalState, setMappingModalState] = useState({
    isOpen: false,
    rawFile: null,
    fileType: null,
    inspectData: null
  })

  // Thông tin Master Đăng Ký Báo Cáo - Tự động tạo mã hệ thống duy nhất cho đợt đăng ký mới
  const [masterInfo, setMasterInfo] = useState({
    regCode: generateDefaultRegCode(),
    factoryName: 'GS1 Hà Nội',
    applyDate: dayjs().format('YYYY-MM-DD'),
    productionTeam: 'Tất cả các tổ',
    remark: '',
    status: 'DRAFT',
    version: '1.0',
    isPublished: false
  })

  const notify = useCallback(
    (type, text) => {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({ type, text })
      }
    },
    [setStatusMessage]
  )

  const handleChangeMasterInfo = useCallback((key, value) => {
    setMasterInfo((prev) => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const {
    fileSummaries,
    filesDataMap,
    isLoading: isStorageLoading,
    storageMode,
    refreshSummaries,
    loadTabDetail,
    saveFile,
    deleteFile,
    clearAllFiles,
    loadAllFilesForCalculation
  } = useArchitectureStorage({ autoLoad: false })

  const handleGenerateNewRegCode = useCallback(() => {
    const newCode = generateDefaultRegCode()
    setMasterInfo((prev) => ({
      ...prev,
      regCode: newCode
    }))
    clearAllFiles()
    setCalcResults(null)
    setIsRegistered(false)
    notify('info', `Đã tạo mã đăng ký mới: ${newCode}`)
  }, [clearAllFiles, notify])

  const activeTabFileData = useMemo(() => {
    if (activeTab === 'result_tksx') {
      const rows = calcResults?.stat?.calculatedRows || []
      const statCols =
        calcResults?.stat?.columns ||
        filesDataMap['stat_report']?.columns ||
        fileSummaries['stat_report']?.columns ||
        []

      let mergedColumns = []
      if (statCols && statCols.length > 0) {
        const existingKeys = new Set(statCols.map((c) => c.key || c.id || c.title))
        mergedColumns = [...statCols]
        RESULT_CALC_COLUMNS_SCHEMA.forEach((cc) => {
          if (!existingKeys.has(cc.key) && !existingKeys.has(cc.title)) {
            mergedColumns.push(cc)
          }
        })
      } else {
        mergedColumns = [...STAT_REPORT_COLUMN_SCHEMA, ...RESULT_CALC_COLUMNS_SCHEMA]
      }

      return {
        columns: mergedColumns,
        data: rows,
        rowCount: rows.length,
        fileName: 'TKSX_KetQua_98Cot.xlsx',
        uploadedAt: calcResults?.calculatedAt || new Date().toISOString(),
        isResult: true
      }
    }

    if (activeTab === 'result_khsx') {
      const rows = calcResults?.plan?.calculatedRows || []
      return {
        columns: RESULT_KHSX_COLUMN_SCHEMA,
        data: rows,
        rowCount: rows.length,
        fileName: 'KHSX_KetQua_DoiSoat.xlsx',
        uploadedAt: calcResults?.calculatedAt || new Date().toISOString(),
        isResult: true
      }
    }

    return filesDataMap[activeTab] || null
  }, [filesDataMap, fileSummaries, activeTab, calcResults])

  // Nạp chi tiết Tab khi người dùng chủ động chọn tab (nếu đã có tóm tắt file được nạp)
  useEffect(() => {
    if (
      activeTab &&
      activeTab !== 'result_tksx' &&
      activeTab !== 'result_khsx' &&
      fileSummaries[activeTab]?.rowCount > 0 &&
      !filesDataMap[activeTab]
    ) {
      loadTabDetail(activeTab)
    }
  }, [activeTab, fileSummaries, filesDataMap, loadTabDetail])

  const [importProgress, setImportProgress] = useState({
    fileName: '',
    fileSize: 0,
    tabTitle: '',
    detectedColumns: 0,
    totalRows: 0,
    percent: 0,
    step: '',
    message: '',
    startTime: null
  })

  // Mở modal kiểm tra & ánh xạ cột thủ công
  const openMappingModalForCurrentTab = useCallback(
    async (fileType, rawFile) => {
      const targetType = fileType || activeTab
      if (!rawFile) {
        notify('warning', 'Vui lòng chọn file Excel để cấu hình cột')
        return
      }
      const tabTitle = TAB_DEFINITIONS.find((t) => t.id === targetType)?.title || targetType
      setImportProgress({
        fileName: rawFile.name,
        fileSize: rawFile.size,
        tabTitle,
        detectedColumns: 0,
        totalRows: 0,
        percent: 20,
        step: 'INSPECT',
        message: 'Đang đọc ma trận xem trước file Excel...',
        startTime: Date.now()
      })
      setIsParsing(true)
      try {
        const inspectData = await inspectUploadedFile(rawFile, targetType)
        setMappingModalState({
          isOpen: true,
          rawFile,
          fileType: targetType,
          inspectData
        })
      } catch (err) {
        notify('error', `Không thể phân tích cấu trúc file: ${err.message}`)
      } finally {
        setIsParsing(false)
      }
    },
    [activeTab, notify]
  )

  // Xử lý xác nhận ánh xạ cột từ Modal
  const handleConfirmMapping = useCallback(
    async ({ headerRowIndex, dataStartRowIndex, columnMappings }) => {
      const { rawFile, fileType } = mappingModalState
      if (!rawFile || !fileType) return

      const tabTitle = TAB_DEFINITIONS.find((t) => t.id === fileType)?.title || fileType
      setMappingModalState((prev) => ({ ...prev, isOpen: false }))
      setImportProgress({
        fileName: rawFile.name,
        fileSize: rawFile.size,
        tabTitle,
        detectedColumns: 0,
        totalRows: 0,
        percent: 10,
        step: 'PARSE_CUSTOM',
        message: 'Đang xử lý nạp file theo cấu hình ánh xạ...',
        startTime: Date.now()
      })
      setIsParsing(true)
      try {
        const parsed = await parseUploadedFile(
          rawFile,
          fileType,
          {
            headerRowIndex,
            dataStartRowIndex,
            columnMappings,
            isManual: true
          },
          (p) => {
            setImportProgress((prev) => ({
              ...prev,
              ...p,
              detectedColumns: p.detectedColumns || prev.detectedColumns,
              totalRows: p.totalRows || prev.totalRows,
              percent: p.percent || prev.percent,
              message: p.message || prev.message
            }))
          }
        )

        setImportProgress((prev) => ({
          ...prev,
          percent: 92,
          message: `Đang lưu ${parsed.rowCount.toLocaleString('vi-VN')} dòng vào hệ thống...`
        }))

        await saveFile(fileType, parsed, (saveProg) => {
          setImportProgress((prev) => ({
            ...prev,
            percent: saveProg?.percent || prev.percent,
            message: saveProg?.message || prev.message
          }))
        })
        setIsRegistered(false)
        notify(
          'success',
          `Đã nạp thành công ${parsed.rowCount.toLocaleString('vi-VN')} dòng theo cấu hình tùy chỉnh cho ${tabTitle}`
        )
      } catch (err) {
        notify('error', `Lỗi nạp file theo cấu hình: ${err.message}`)
      } finally {
        setIsParsing(false)
      }
    },
    [mappingModalState, saveFile, notify]
  )

  // Xử lý upload file cho 1 Tab cụ thể
  const handleUploadFileForTab = useCallback(
    async (fileType, rawFile) => {
      if (!rawFile) return
      const tabTitle = TAB_DEFINITIONS.find((t) => t.id === fileType)?.title || fileType
      setImportProgress({
        fileName: rawFile.name,
        fileSize: rawFile.size,
        tabTitle,
        detectedColumns: 0,
        totalRows: 0,
        percent: 10,
        step: 'START',
        message: 'Đang bắt đầu đọc tệp Excel...',
        startTime: Date.now()
      })
      setIsParsing(true)
      try {
        const parsed = await parseUploadedFile(rawFile, fileType, {}, (p) => {
          setImportProgress((prev) => ({
            ...prev,
            ...p,
            detectedColumns: p.detectedColumns || prev.detectedColumns,
            totalRows: p.totalRows || prev.totalRows,
            percent: p.percent || prev.percent,
            message: p.message || prev.message
          }))
        })

        await saveFile(fileType, parsed, (saveProg) => {
          setImportProgress((prev) => ({
            ...prev,
            percent: saveProg?.percent || prev.percent,
            message: saveProg?.message || prev.message
          }))
        })
        setIsRegistered(false)
        notify(
          'success',
          `Đã nạp thành công ${parsed.rowCount.toLocaleString('vi-VN')} dòng cho ${tabTitle}`
        )
      } catch (err) {
        console.warn('Lỗi nạp tự động, tự động kích hoạt Modal ánh xạ cột:', err)
        try {
          const inspectData = await inspectUploadedFile(rawFile, fileType)
          setMappingModalState({
            isOpen: true,
            rawFile,
            fileType,
            inspectData
          })
          notify(
            'warning',
            `Phát hiện cột đặc biệt: Vui lòng xác nhận dòng tiêu đề và ánh xạ cột trong Modal.`
          )
        } catch (inspectErr) {
          notify('error', `Lỗi nạp file: ${err.message}`)
        }
      } finally {
        setIsParsing(false)
      }
    },
    [saveFile, notify]
  )

  // Xóa file của 1 Tab cụ thể
  const handleDeleteTabFile = useCallback(
    async (fileType) => {
      try {
        await deleteFile(fileType)
        setIsRegistered(false)
        notify('info', 'Đã xóa dữ liệu file khỏi kho lưu trữ')
      } catch (err) {
        notify('error', `Không thể xóa file: ${err.message}`)
      }
    },
    [deleteFile, notify]
  )

  // Xóa các dòng đang chọn trong Tab hiện tại
  const handleDeleteSelectedRows = useCallback(
    async (selectedRowsIndices) => {
      if (!selectedRowsIndices || selectedRowsIndices.length === 0) {
        notify('warning', 'Vui lòng chọn ít nhất 1 dòng để xóa')
        return
      }

      const indicesSet = new Set(selectedRowsIndices)
      const count = indicesSet.size

      if (activeTab === 'result_tksx') {
        const oldRows = calcResults?.stat?.calculatedRows || []
        const filtered = oldRows.filter((_, idx) => !indicesSet.has(idx))
        setCalcResults((prev) => ({
          ...prev,
          stat: {
            ...prev?.stat,
            calculatedRows: filtered,
            totalTickets: filtered.length
          }
        }))
        notify('info', `Đã xóa ${count} dòng khỏi Kết Quả TKSX`)
        return
      }

      if (activeTab === 'result_khsx') {
        const oldRows = calcResults?.plan?.calculatedRows || []
        const filtered = oldRows.filter((_, idx) => !indicesSet.has(idx))
        setCalcResults((prev) => ({
          ...prev,
          plan: {
            ...prev?.plan,
            calculatedRows: filtered
          }
        }))
        notify('info', `Đã xóa ${count} dòng khỏi Kết Quả KHSX`)
        return
      }

      const currentFile = filesDataMap[activeTab]
      if (currentFile && Array.isArray(currentFile.data)) {
        const filtered = currentFile.data.filter((_, idx) => !indicesSet.has(idx))
        const updatedFile = {
          ...currentFile,
          data: filtered,
          rowCount: filtered.length
        }
        await saveFile(activeTab, updatedFile)
        setIsRegistered(false)
        notify('info', `Đã xóa ${count} dòng khỏi tab hiện tại`)
      }
    },
    [activeTab, calcResults, filesDataMap, saveFile, notify]
  )

  // Lưu đăng ký Master vào DB khi người dùng bấm ĐĂNG KÝ BÁO CÁO
  const handleRegisterMaster = useCallback(async () => {
    const uploadedCount = Object.values(fileSummaries || {}).filter((s) => s.rowCount > 0).length
    if (uploadedCount === 0 && (!activeTabFileData || activeTabFileData.rowCount === 0)) {
      notify('error', 'Vui lòng nạp ít nhất 1 file để thực hiện đăng ký báo cáo')
      return
    }

    setIsRegistering(true)
    notify('info', `Đang đăng ký báo cáo [${masterInfo.regCode}]...`)
    try {
      const statRows = fileSummaries?.stat_report?.rowCount || 0
      const unfinRows = fileSummaries?.unfinished_op?.rowCount || 0
      const sumRows = fileSummaries?.summary_op?.rowCount || 0
      const mesRows = fileSummaries?.mes_approval?.rowCount || 0
      const total = statRows + unfinRows + sumRows + mesRows

      // Lưu thông tin đăng ký Master
      const masterRecord = {
        regCode: masterInfo.regCode,
        factoryName: masterInfo.factoryName || 'GS1 Hà Nội',
        applyDate: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
        productionTeam: masterInfo.productionTeam || 'Tất cả các tổ',
        remark: masterInfo.remark || '',
        status: 'REGISTERED',
        statReportRows: statRows,
        unfinishedOpRows: unfinRows,
        summaryOpRows: sumRows,
        mesApprovalRows: mesRows,
        totalRows: total,
        registeredAt: new Date().toISOString(),
        fileSummaries: fileSummaries || {}
      }

      await storageAdapter.saveMasterRegistration(masterRecord)

      // Fallback lưu localStorage & đồng bộ
      if (typeof window !== 'undefined') {
        localStorage.setItem(`S_MASTER_REG_${masterInfo.regCode}`, JSON.stringify(masterRecord))
        window.dispatchEvent(new Event('storage'))
      }

      setIsRegistered(true)
      notify('success', `Đã lưu đăng ký báo cáo nội bộ [Mã: ${masterInfo.regCode}]!`)
    } catch (err) {
      console.error('Lỗi đăng ký:', err)
      notify('error', `Lỗi khi đăng ký báo cáo: ${err.message}`)
    } finally {
      setIsRegistering(false)
    }
  }, [fileSummaries, activeTabFileData, masterInfo, notify])

  // 1. Công bố báo cáo (Publish Version)
  const handlePublishReport = useCallback(async () => {
    if (!masterInfo.regCode) {
      notify('error', 'Chưa có mã đăng ký báo cáo')
      return
    }
    setIsPublishing(true)
    notify('info', `Đang công bố báo cáo [${masterInfo.regCode}]...`)
    try {
      const res = await publishMasterRegistrationSQLite(masterInfo.regCode, masterInfo.version || '1.0')
      if (res?.success) {
        setMasterInfo((prev) => ({
          ...prev,
          status: 'PUBLISHED',
          version: res.version || prev.version || '1.0',
          isPublished: true,
          publishedAt: res.publishedAt || new Date().toISOString()
        }))
        setIsRegistered(true)

        // Tự động đẩy gói siêu nén lên Server DataHub Online (Zero-latency background stream)
        try {
          const filesData = await loadAllFilesForCalculation()
          const bundlePack = packProductionBundle(masterInfo, filesData, calcResults, {
            version: res.version || '1.0'
          })
          const base64Str = uint8ArrayToBase64(bundlePack.buffer)
          const statRows = filesData?.STAT_REPORT?.length || 0
          const unfinRows = filesData?.UNFINISHED_OP?.length || 0
          const sumRows = filesData?.SUMMARY_OP?.length || 0
          const mesRows = filesData?.MES_APPROVAL?.length || 0
          const totalRows = statRows + unfinRows + sumRows + mesRows

          await publishProductionBundleOnline({
            reg_code: masterInfo.regCode,
            factory_name: masterInfo.factoryName || 'GS1 Hà Nội',
            apply_date: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
            production_team: masterInfo.productionTeam || 'Tất cả các tổ',
            status: 'PUBLISHED',
            version: res.version || '1.0',
            total_rows: totalRows,
            raw_size_mb: parseFloat((bundlePack.rawSize / 1024 / 1024).toFixed(2)),
            compressed_size_mb: parseFloat((bundlePack.compressedSize / 1024 / 1024).toFixed(2)),
            compression_ratio: bundlePack.ratio,
            bundle_base64: base64Str,
            file_summaries: JSON.stringify(fileSummaries || {}),
            calc_summary: JSON.stringify(calcResults?.summary || {}),
            remark: masterInfo.remark || ''
          })
          notify(
            'success',
            `Đã công bố & lưu trữ bản Online lên Server DataHub! [v${res.version || '1.0'} • Nén: ${(bundlePack.compressedSize / 1024 / 1024).toFixed(2)}MB (${bundlePack.ratio})]`
          )
        } catch (serverErr) {
          console.warn('[DataHub Online] Không thể đẩy lên server:', serverErr)
          notify(
            'success',
            `Đã công bố thành công trên máy nội bộ [v${res.version || '1.0'}] (Server offline: ${serverErr.message})`
          )
        }
      } else {
        notify('error', res?.error || 'Không thể công bố báo cáo')
      }
    } catch (err) {
      notify('error', `Lỗi công bố: ${err.message}`)
    } finally {
      setIsPublishing(false)
    }
  }, [masterInfo, calcResults, fileSummaries, loadAllFilesForCalculation, notify])

  // 2. Xuất gói siêu nén .gsprod (Columnar Matrix + Gzip Level 9 - Giảm từ 50MB -> <1MB)
  const handleExportBundle = useCallback(async () => {
    setIsExporting(true)
    notify('info', 'Đang nén dữ liệu 6 bảng và chuẩn bị gói .gsprod...')
    try {
      const res = await exportBundlePackageSQLite({
        regCode: masterInfo.regCode,
        version: masterInfo.version || '1.0',
        master: masterInfo
      })
      if (res?.success) {
        notify(
          'success',
          `✅ Xuất gói thành công! Gốc: ${res.rawMB}MB ➔ Nén: ${res.compMB}MB (Tiết kiệm ${res.ratio})`
        )
      } else if (!res?.canceled) {
        notify('error', res?.error || 'Không thể xuất gói dữ liệu')
      }
    } catch (err) {
      notify('error', `Lỗi xuất gói: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }, [masterInfo, notify])

  const [calculationProgress, setCalculationProgress] = useState({
    percent: 0,
    step: 'INIT',
    message: '',
    detail: '',
    storageMode: ''
  })

  // Bắt đầu tính toán (Tự động sinh mã đăng ký duy nhất mới cho đợt tính này)
  const handleRunCalculation = useCallback(async () => {
    const uploadedCount = Object.values(fileSummaries || {}).filter((s) => s.rowCount > 0).length
    if (uploadedCount === 0 && (!activeTabFileData || activeTabFileData.rowCount === 0)) {
      notify('error', 'Vui lòng tải lên ít nhất 1 file kiến trúc để tính toán')
      return
    }

    // Tự động sinh mã đăng ký mới cho đợt tính toán
    const calcRegCode = generateDefaultRegCode()
    setMasterInfo((prev) => ({
      ...prev,
      regCode: calcRegCode
    }))

    const currentStorageMode =
      storageMode === 'sqlite' || storageMode === 'electron_sqlite'
        ? 'SQLite Native C++'
        : 'IndexedDB Engine'
    setIsCalculating(true)
    setCalculationProgress({
      percent: 15,
      step: 'READ_DB',
      message: `Đang khởi tạo đợt tính toán [${calcRegCode}]...`,
      detail: `Đọc dữ liệu từ ${currentStorageMode}`,
      storageMode: currentStorageMode
    })
    notify('info', `Đang thực hiện tính toán KHSX và TKSX [Mã: ${calcRegCode}]...`)

    try {
      // 1. Tự động lưu đợt đăng ký Master nếu có file tải lên
      const statRows = fileSummaries?.stat_report?.rowCount || 0
      const unfinRows = fileSummaries?.unfinished_op?.rowCount || 0
      const sumRows = fileSummaries?.summary_op?.rowCount || 0
      const mesRows = fileSummaries?.mes_approval?.rowCount || 0
      const total = statRows + unfinRows + sumRows + mesRows

      const masterRecord = {
        regCode: calcRegCode,
        factoryName: masterInfo.factoryName || 'GS1 Hà Nội',
        applyDate: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
        productionTeam: masterInfo.productionTeam || 'Tất cả các tổ',
        remark: masterInfo.remark || '',
        status: 'REGISTERED',
        statReportRows: statRows,
        unfinishedOpRows: unfinRows,
        summaryOpRows: sumRows,
        mesApprovalRows: mesRows,
        totalRows: total,
        registeredAt: new Date().toISOString(),
        fileSummaries: fileSummaries || {}
      }

      try {
        await storageAdapter.saveMasterRegistration(masterRecord)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`S_MASTER_REG_${calcRegCode}`, JSON.stringify(masterRecord))
          window.dispatchEvent(new Event('storage'))
        }
        setIsRegistered(true)
      } catch (saveMasterErr) {
        console.warn('Lưu master registration tự động:', saveMasterErr)
      }

      // 2. Nạp dữ liệu các file
      setCalculationProgress({
        percent: 30,
        step: 'READ_CHUNKS',
        message: 'Đang tập hợp ma trận dữ liệu từ CSDL...',
        detail: `Đã nạp ${total.toLocaleString('vi-VN')} dòng dữ liệu`,
        storageMode: currentStorageMode
      })
      const allFiles = await loadAllFilesForCalculation()

      // 3. Thực hiện tính toán TKSX & KHSX
      setCalculationProgress({
        percent: 55,
        step: 'CALC_TKSX',
        message: 'Đang liên kết & tính toán ma trận TKSX (98 cột)...',
        detail: 'Ghép Báo cáo thống kê, Dở dang, Tổng hợp và Phê duyệt MES',
        storageMode: currentStorageMode
      })

      const results = await runProductionCalculations(allFiles, masterInfo)

      setCalculationProgress({
        percent: 85,
        step: 'CALC_KHSX',
        message: 'Đang đối soát & tính toán Kế hoạch KHSX (18 chỉ tiêu)...',
        detail: 'Tính số lượng hoàn thành, tỷ lệ đạt và độ lệch giờ chạy máy',
        storageMode: currentStorageMode
      })

      setCalcResults(results)

      // 4. Lưu kết quả tính toán vào CSDL SQLite / IndexedDB
      setCalculationProgress({
        percent: 95,
        step: 'SAVE_RESULTS',
        message: 'Đang lưu kết quả tính toán vào CSDL...',
        detail: 'Ghi dữ liệu kết quả vào CSDL bảo toàn vĩnh viễn',
        storageMode: currentStorageMode
      })

      try {
        await storageAdapter.saveCalcResults({
          id: calcRegCode,
          summary: results?.summary || {},
          planData: results?.plan?.calculatedRows || [],
          statData: results?.stat?.calculatedRows || [],
          calculatedAt: results?.calculatedAt || new Date().toISOString()
        })
      } catch (saveErr) {
        console.warn('Lỗi lưu kết quả tính toán:', saveErr)
      }

      setCalculationProgress({
        percent: 100,
        step: 'COMPLETED',
        message: 'Đã hoàn tất tính toán thành công!',
        detail: `Xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng TKSX và ${(results?.plan?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng KHSX`,
        storageMode: currentStorageMode
      })

      // Chờ một chút để người dùng nhìn thấy 100% hoàn thành
      await new Promise((resolve) => setTimeout(resolve, 350))

      // Tự động chuyển ngay sang Tab Kết Quả TKSX
      setActiveTab('result_tksx')
      notify(
        'success',
        `Đã hoàn thành tính toán! Đã xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng kết quả TKSX [Mã: ${calcRegCode}].`
      )
    } catch (err) {
      console.error('Lỗi tính toán:', err)
      notify('error', `Tính toán thất bại: ${err.message}`)
    } finally {
      setIsCalculating(false)
    }
  }, [fileSummaries, activeTabFileData, storageMode, masterInfo, loadAllFilesForCalculation, notify])

  // Thống kê trạng thái các tab từ fileSummaries & calcResults
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
        const summaryItem = fileSummaries[tab.id]
        summary[tab.id] = {
          isUploaded: Boolean(summaryItem && summaryItem.rowCount > 0),
          fileName: summaryItem?.fileName || '',
          rowCount: summaryItem?.rowCount || 0,
          uploadedAt: summaryItem?.uploadedAt || null
        }
      }
    })
    return summary
  }, [fileSummaries, calcResults])

  return {
    activeTab,
    setActiveTab,
    masterInfo,
    handleChangeMasterInfo,
    handleGenerateNewRegCode,
    activeTabFileData,
    fileSummaries,
    isStorageLoading,
    isParsing,
    isCalculating,
    isRegistering,
    isRegistered,
    isPublishing,
    isExporting,
    calcResults,
    storageMode,
    fileStatusSummary,
    importProgress,
    calculationProgress,
    mappingModalState,
    setMappingModalState,
    openMappingModalForCurrentTab,
    handleConfirmMapping,
    handleUploadFileForTab,
    handleDeleteTabFile,
    handleDeleteSelectedRows,
    handleRunCalculation,
    handleRegisterMaster,
    handlePublishReport,
    handleExportBundle,
    clearAllFiles: () => {
      clearAllFiles()
      setIsRegistered(false)
      notify('info', 'Đã xóa toàn bộ file trong phiên làm việc')
    },
    refreshFiles: () => {
      refreshSummaries()
      loadTabDetail(activeTab, true)
      notify('info', 'Đã nạp lại dữ liệu từ CSDL')
    }
  }
}
