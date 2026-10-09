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
    remark: ''
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

  const handleGenerateNewRegCode = useCallback(() => {
    const newCode = generateDefaultRegCode()
    setMasterInfo((prev) => ({
      ...prev,
      regCode: newCode
    }))
    notify('info', `Đã tạo mã đăng ký mới: ${newCode}`)
  }, [notify])

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
  } = useArchitectureStorage({ autoLoad: true })

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

  // Tự động nạp chi tiết Tab khi chuyển tab hoặc khi vừa nạp xong
  useEffect(() => {
    if (activeTab && activeTab !== 'result_tksx' && activeTab !== 'result_khsx') {
      loadTabDetail(activeTab)
    }
  }, [activeTab, loadTabDetail])

  const [isRegistered, setIsRegistered] = useState(false)
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
        factoryName: masterInfo.factoryName,
        applyDate: masterInfo.applyDate,
        remark: masterInfo.remark,
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
      notify('success', `Đã đăng ký báo cáo thành công [Mã: ${masterInfo.regCode}]!`)
    } catch (err) {
      console.error('Lỗi đăng ký:', err)
      notify('error', `Lỗi khi đăng ký báo cáo: ${err.message}`)
    } finally {
      setIsRegistering(false)
    }
  }, [fileSummaries, activeTabFileData, masterInfo, notify])

  const [calculationProgress, setCalculationProgress] = useState({
    percent: 0,
    step: 'INIT',
    message: '',
    detail: '',
    storageMode: ''
  })

  // Bắt đầu tính toán
  const handleRunCalculation = useCallback(async () => {
    const uploadedCount = Object.values(fileSummaries || {}).filter((s) => s.rowCount > 0).length
    if (uploadedCount === 0 && (!activeTabFileData || activeTabFileData.rowCount === 0)) {
      notify('error', 'Vui lòng tải lên ít nhất 1 file kiến trúc để tính toán')
      return
    }

    const currentStorageMode =
      storageMode === 'sqlite' || storageMode === 'electron_sqlite'
        ? 'SQLite Native C++'
        : 'IndexedDB Engine'
    setIsCalculating(true)
    setCalculationProgress({
      percent: 15,
      step: 'READ_DB',
      message: 'Đang nạp 4 bảng dữ liệu kiến trúc từ CSDL...',
      detail: `Đọc dữ liệu từ ${currentStorageMode}`,
      storageMode: currentStorageMode
    })
    notify('info', 'Đang thực hiện tính toán KHSX và TKSX...')

    try {
      // 1. Tự động lưu đợt đăng ký Master nếu có file tải lên
      const statRows = fileSummaries?.stat_report?.rowCount || 0
      const unfinRows = fileSummaries?.unfinished_op?.rowCount || 0
      const sumRows = fileSummaries?.summary_op?.rowCount || 0
      const mesRows = fileSummaries?.mes_approval?.rowCount || 0
      const total = statRows + unfinRows + sumRows + mesRows

      const masterRecord = {
        regCode: masterInfo.regCode,
        factoryName: masterInfo.factoryName,
        applyDate: masterInfo.applyDate,
        remark: masterInfo.remark,
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
          localStorage.setItem(`S_MASTER_REG_${masterInfo.regCode}`, JSON.stringify(masterRecord))
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

      const results = await runProductionCalculations(allFiles)

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
          id: masterInfo?.regCode || 'latest_calculation',
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
        `Đã hoàn thành tính toán! Đã xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng kết quả TKSX.`
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
    handleRunCalculation,
    handleRegisterMaster,
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
