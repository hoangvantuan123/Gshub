/* eslint-disable no-unused-vars */
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
  ARCHITECTURE_FILE_TYPES,
  getNextVersion
} from '../constants/calcConstants'
import { RESULT_CALC_COLUMNS_SCHEMA } from '../columns/calcGridColumns'
import { parseUploadedFile, inspectUploadedFile } from '../engine/fileParsers'
import { runProductionCalculations } from '../engine'
import storageAdapter from '../storage'
import {
  publishMasterRegistrationSQLite,
  exportBundlePackageSQLite
} from '../storage/sqliteStorage'
import { publishProductionBundleOnline } from '@renderer/api/production/calcBundleApi'
import { packProductionBundle, uint8ArrayToBase64 } from '../engine/bundlePacker'
import { getEmployeeCode, getUserSeq, getUserDisplayName } from '@renderer/services/tokenService'
import { savePlanRegistration } from '@renderer/user/page/report/registration/services/planRegistrationService'
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
        filesDataMap['stat_report']?.columns ||
        fileSummaries['stat_report']?.columns ||
        calcResults?.stat?.columns ||
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
        setCalcResults(null)
        notify(
          'success',
          `Đã nạp thành công ${parsed.rowCount.toLocaleString('vi-VN')} dòng theo cấu hình tùy chỉnh cho ${tabTitle}. Vui lòng bấm [TÍNH KHSX & TKSX] lại.`
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
        setCalcResults(null)
        notify(
          'success',
          `Đã nạp thành công ${parsed.rowCount.toLocaleString('vi-VN')} dòng cho ${tabTitle}. Vui lòng bấm [TÍNH KHSX & TKSX] lại.`
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
        setCalcResults(null)
        notify('info', 'Đã xóa dữ liệu file khỏi kho lưu trữ. Vui lòng tính toán lại.')
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

  // Lưu đăng ký Master vào DB khi người dùng bấm ĐĂNG KÝ BÁO CÁO (LƯU ĐĂNG KÝ)
  const handleRegisterMaster = useCallback(async () => {
    const uploadedCount = Object.values(fileSummaries || {}).filter((s) => s.rowCount > 0).length
    const hasActiveData = Boolean(
      activeTabFileData &&
        (activeTabFileData.rowCount > 0 || (activeTabFileData.data && activeTabFileData.data.length > 0))
    )
    const hasCalc = Boolean(
      calcResults &&
        ((calcResults.stat?.calculatedRows && calcResults.stat.calculatedRows.length > 0) ||
          (calcResults.plan?.calculatedRows && calcResults.plan.calculatedRows.length > 0))
    )

    if (uploadedCount === 0 && !hasActiveData && !hasCalc) {
      notify('error', 'Vui lòng nạp ít nhất 1 file hoặc tính toán KHSX & TKSX để thực hiện lưu đăng ký')
      return
    }

    setIsRegistering(true)
    notify('info', `Đang lưu đăng ký báo cáo [${masterInfo.regCode}]...`)
    try {
      const statRows = fileSummaries?.stat_report?.rowCount || 0
      const unfinRows = fileSummaries?.unfinished_op?.rowCount || 0
      const sumRows = fileSummaries?.summary_op?.rowCount || 0
      const mesRows = fileSummaries?.mes_approval?.rowCount || 0
      const resultTksxRows = calcResults?.stat?.calculatedRows?.length || 0
      const resultKhsxRows = calcResults?.plan?.calculatedRows?.length || 0
      const total = statRows + unfinRows + sumRows + mesRows

      const mergedSummaries = {
        ...(fileSummaries || {})
      }
      if (resultTksxRows > 0) {
        mergedSummaries.result_tksx = {
          isUploaded: true,
          rowCount: resultTksxRows,
          fileName: 'TKSX_KetQua_98Cot.xlsx',
          uploadedAt: calcResults?.calculatedAt || new Date().toISOString(),
          isResult: true
        }
      }
      if (resultKhsxRows > 0) {
        mergedSummaries.result_khsx = {
          isUploaded: true,
          rowCount: resultKhsxRows,
          fileName: 'KHSX_KetQua_DoiSoat.xlsx',
          uploadedAt: calcResults?.calculatedAt || new Date().toISOString(),
          isResult: true
        }
      }

      // Lưu thông tin đăng ký Master
      const masterRecord = {
        regCode: masterInfo.regCode,
        factoryName: masterInfo.factoryName || 'GS1 Hà Nội',
        applyDate: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
        productionTeam: masterInfo.productionTeam || 'Tất cả các tổ',
        remark: masterInfo.remark || '',
        status: masterInfo.status || 'REGISTERED',
        version: masterInfo.version || '1.0',
        statReportRows: statRows,
        unfinishedOpRows: unfinRows,
        summaryOpRows: sumRows,
        mesApprovalRows: mesRows,
        resultTksxRows,
        resultKhsxRows,
        hasCalcResults: hasCalc,
        totalRows: total,
        registeredAt: new Date().toISOString(),
        registeredBy: getUserDisplayName() || 'Admin',
        createdBy: getUserSeq() || 'Admin',
        userSeq: getUserSeq() || '',
        fileSummaries: mergedSummaries
      }

      await storageAdapter.saveMasterRegistration(masterRecord)

      // Lưu toàn bộ bảng kết quả tính toán nếu đã có
      if (calcResults) {
        await storageAdapter.saveCalcResults(masterInfo.regCode, calcResults)
        await storageAdapter.saveCalcResults('CURRENT_CALC', calcResults)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`S_CALC_RESULTS_${masterInfo.regCode}`, JSON.stringify(calcResults))
          } catch (e) {
            console.warn('[LocalStorage] Payload lớn, đã lưu vào SQLite/IndexedDB:', e)
          }
        }
      }

      // Fallback lưu localStorage & đồng bộ
      if (typeof window !== 'undefined') {
        localStorage.setItem(`S_MASTER_REG_${masterInfo.regCode}`, JSON.stringify(masterRecord))
        window.dispatchEvent(new Event('storage'))
      }

      setIsRegistered(true)
      notify(
        'success',
        hasCalc
          ? `Đã lưu đăng ký báo cáo [Mã: ${masterInfo.regCode}] kèm bảng kết quả KHSX & TKSX thành công!`
          : `Đã lưu đăng ký báo cáo nội bộ [Mã: ${masterInfo.regCode}]!`
      )
    } catch (err) {
      console.error('Lỗi đăng ký:', err)
      notify('error', `Lỗi khi lưu đăng ký báo cáo: ${err.message}`)
    } finally {
      setIsRegistering(false)
    }
  }, [fileSummaries, activeTabFileData, masterInfo, calcResults, notify])

  const [publishProgress, setPublishProgress] = useState({
    percent: 25,
    step: 'PREPARING',
    message: 'Đang kiểm tra và chuẩn bị dữ liệu báo cáo...',
    detail: 'Tổng hợp thông tin các tổ sản xuất và chỉ tiêu kế hoạch',
    statusTag: 'Chuẩn bị dữ liệu',
    isComplete: false
  })

  // 1. Công bố báo cáo (Publish Version)
  const handlePublishReport = useCallback(async () => {
    if (!masterInfo.regCode) {
      notify('error', 'Chưa có mã đăng ký báo cáo')
      return
    }

    // RÀNG BUỘC: Phải hoàn tất tính toán KHSX & TKSX trước khi được phép công bố
    const hasTksx = Boolean(calcResults?.stat?.calculatedRows && calcResults.stat.calculatedRows.length > 0)
    const hasKhsx = Boolean(calcResults?.plan?.calculatedRows && calcResults.plan.calculatedRows.length > 0)
    if (!hasTksx || !hasKhsx) {
      notify(
        'warning',
        'Báo cáo chưa được tính toán kết quả Thống kê SX (TKSX) và Kế hoạch SX (KHSX). Vui lòng bấm [Tính KHSX & TKSX] trước khi công bố!'
      )
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
      const res = await publishMasterRegistrationSQLite(
        masterInfo.regCode,
        masterInfo.version || '1.0'
      )
      if (res?.success) {
        setMasterInfo((prev) => ({
          ...prev,
          status: 'PUBLISHED',
          version: res.version || prev.version || '1.0',
          isPublished: true,
          publishedAt: res.publishedAt || new Date().toISOString()
        }))
        setIsRegistered(true)

        setPublishProgress({
          percent: 55,
          step: 'AGGREGATING',
          message: 'Đang tổng hợp kết quả thống kê và kế hoạch sản xuất...',
          detail: 'Đối soát số liệu thực tế và hoàn thiện chỉ tiêu',
          statusTag: 'Tổng hợp kết quả',
          isComplete: false
        })
        await new Promise((r) => setTimeout(r, 250))

        try {
          let freshCalc = calcResults
          if (!freshCalc && masterInfo.regCode) {
            freshCalc = await storageAdapter.getCalcResults(masterInfo.regCode)
          }
          const filesData = await loadAllFilesForCalculation()
          const bundlePack = packProductionBundle(
            {
              ...masterInfo,
              status: 'PUBLISHED',
              isPublished: true,
              version: res.version || masterInfo.version || '1.0'
            },
            filesData,
            freshCalc,
            {
              version: res.version || masterInfo.version || '1.0'
            }
          )
          const base64Str = uint8ArrayToBase64(bundlePack.buffer)
          const statRows =
            filesData?.STAT_REPORT?.length ||
            filesData?.stat_report?.length ||
            fileSummaries?.stat_report?.rowCount ||
            0
          const unfinRows =
            filesData?.UNFINISHED_OP?.length ||
            filesData?.unfinished_op?.length ||
            fileSummaries?.unfinished_op?.rowCount ||
            0
          const sumRows =
            filesData?.SUMMARY_OP?.length ||
            filesData?.summary_op?.length ||
            fileSummaries?.summary_op?.rowCount ||
            0
          const mesRows =
            filesData?.MES_APPROVAL?.length ||
            filesData?.mes_approval?.length ||
            fileSummaries?.mes_approval?.rowCount ||
            0
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

          const pubVersion = res?.version || masterInfo.version || '1.0'
          const userSeq = getUserSeq() || getUserDisplayName() || 'Admin'
          await publishProductionBundleOnline({
            reg_code: masterInfo.regCode,
            factory_name: masterInfo.factoryName || 'GS1 Hà Nội',
            apply_date: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
            production_team: masterInfo.productionTeam || 'Tất cả các tổ',
            status: 'PUBLISHED',
            version: pubVersion,
            total_rows: totalRows,
            raw_size_mb: rawMB,
            compressed_size_mb: compMB,
            compression_ratio: bundlePack.ratio || '',
            bundle_base64: base64Str,
            file_summaries: JSON.stringify(fileSummaries || {}),
            calc_summary: JSON.stringify(calcResults?.summary || {}),
            remark: masterInfo.remark || '',
            created_by: userSeq
          })

          const displayName = getUserDisplayName() || 'Admin'
          const updatedLocalMaster = {
            ...masterInfo,
            status: 'PUBLISHED',
            version: pubVersion,
            rawSizeMB: rawMB,
            compressedSizeMB: compMB,
            compressionRatio: bundlePack.ratio || '',
            totalRows: totalRows,
            statReportRows: statRows,
            unfinishedOpRows: unfinRows,
            summaryOpRows: sumRows,
            mesApprovalRows: mesRows,
            registeredAt: new Date().toISOString(),
            registeredBy: displayName,
            createdBy: userSeq,
            userSeq: userSeq,
            isPublished: true
          }
          await storageAdapter.saveMasterRegistration(updatedLocalMaster)
          if (typeof window !== 'undefined') {
            localStorage.setItem(`S_MASTER_REG_${masterInfo.regCode}`, JSON.stringify(updatedLocalMaster))
            window.dispatchEvent(new Event('storage'))
          }

          if (freshCalc) {
            const publishedCalcResults = {
              ...freshCalc,
              status: 'PUBLISHED',
              version: pubVersion,
              calcVersion: pubVersion
            }
            setCalcResults(publishedCalcResults)
            await storageAdapter.saveCalcResults(masterInfo.regCode, publishedCalcResults)
            if (typeof window !== 'undefined') {
              localStorage.setItem(`S_CALC_RESULTS_${masterInfo.regCode}`, JSON.stringify(publishedCalcResults))
            }
          }

          // Bước 4: Hoàn tất 100%
          setPublishProgress({
            percent: 100,
            step: 'COMPLETED',
            message: 'Đã công bố báo cáo thành công!',
            detail: `Báo cáo phiên bản v${pubVersion} đã sẵn sàng cho các bộ phận xem và đối soát.`,
            statusTag: 'Hoàn tất thành công',
            isComplete: true
          })

          notify(
            'success',
            `Đã công bố thành công báo cáo phiên bản v${pubVersion}!`
          )
        } catch (serverErr) {
          console.warn('[DataHub Online] Không thể đẩy lên server:', serverErr)
          setPublishProgress({
            percent: 100,
            step: 'COMPLETED',
            message: 'Đã công bố báo cáo thành công!',
            detail: `Báo cáo phiên bản v${res.version || '1.0'} đã được ghi nhận thành công.`,
            statusTag: 'Hoàn tất thành công',
            isComplete: true
          })
          notify(
            'success',
            `Đã công bố thành công báo cáo phiên bản v${res.version || '1.0'}!`
          )
        }
      } else {
        notify('error', res?.error || 'Không thể công bố báo cáo')
        setIsPublishing(false)
      }
    } catch (err) {
      notify('error', `Lỗi công bố: ${err.message}`)
      setIsPublishing(false)
    }
  }, [masterInfo, calcResults, fileSummaries, loadAllFilesForCalculation, notify])

  // Chuyển sang chế độ Chỉnh sửa / Tạo bản nháp mới từ bản đã công bố (tự động tăng version)
  const handleUnlockForEdit = useCallback(async () => {
    try {
      const currentVer = masterInfo.version || masterInfo.calcVersion || '1.0'
      const nextVer = getNextVersion(currentVer)
      const updatedMaster = {
        ...masterInfo,
        version: nextVer,
        calcVersion: nextVer,
        Version: nextVer,
        status: 'DRAFT',
        isPublished: false,
        updatedAt: new Date().toISOString()
      }
      setMasterInfo(updatedMaster)
      await storageAdapter.saveMasterRegistration(updatedMaster)

      if (calcResults) {
        setCalcResults((prev) => (prev ? { ...prev, version: nextVer, calcVersion: nextVer } : prev))
      }

      notify(
        'info',
        `Đã mở khóa và nâng lên phiên bản ${nextVer}. Bạn có thể nạp thêm file, xóa/sửa dữ liệu và tính toán lại trước khi công bố bản mới.`
      )
    } catch (err) {
      console.error('Lỗi mở khóa chỉnh sửa:', err)
      notify('error', `Lỗi mở khóa chỉnh sửa: ${err.message}`)
    }
  }, [masterInfo, calcResults, notify])

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

    // Giữ nguyên mã đăng ký hiện tại (không sinh mã mới khi cập nhật/tính lại bản nháp)
    const calcRegCode = masterInfo.regCode || generateDefaultRegCode()
    if (!masterInfo.regCode) {
      setMasterInfo((prev) => ({
        ...prev,
        regCode: calcRegCode
      }))
    }

    setIsCalculating(true)
    setCalculationProgress({
      percent: 15,
      step: 'LOAD_DATA',
      message: `Đang khởi tạo đợt tính toán [${calcRegCode}]...`,
      detail: 'Chuẩn bị thông tin phiếu đăng ký',
      statusTag: 'Khởi tạo'
    })
    notify('info', `Đang thực hiện tính toán KHSX và TKSX [Mã: ${calcRegCode}]...`)

    // Nhường luồng cho UI
    await new Promise((resolve) => setTimeout(resolve, 60))

    try {
      // 1. Tự động kiểm tra phiên bản: Nếu đã PUBLISHED trước đó, tính lại sẽ tạo version mới (1.0 -> 1.1)
      let nextVersion = masterInfo.version || '1.0'
      if (masterInfo.status === 'PUBLISHED') {
        const parts = String(nextVersion).split('.')
        if (parts.length === 2) {
          const major = parseInt(parts[0], 10) || 1
          const minor = parseInt(parts[1], 10) || 0
          nextVersion = `${major}.${minor + 1}`
        } else {
          nextVersion = `${parseInt(nextVersion, 10) || 1}.1`
        }
      }

      const statRows = fileSummaries?.stat_report?.rowCount || 0
      const unfinRows = fileSummaries?.unfinished_op?.rowCount || 0
      const sumRows = fileSummaries?.summary_op?.rowCount || 0
      const mesRows = fileSummaries?.mes_approval?.rowCount || 0
      const total = statRows + unfinRows + sumRows + mesRows
      const userSeq = getUserSeq() || 'Admin'
      const displayName = getUserDisplayName() || 'Admin'

      const masterRecord = {
        regCode: calcRegCode,
        factoryName: masterInfo.factoryName || 'GS1 Hà Nội',
        applyDate: masterInfo.applyDate || dayjs().format('YYYY-MM-DD'),
        productionTeam: masterInfo.productionTeam || 'Tất cả các tổ',
        remark: masterInfo.remark || '',
        status: 'REGISTERED',
        version: nextVersion,
        statReportRows: statRows,
        unfinishedOpRows: unfinRows,
        summaryOpRows: sumRows,
        mesApprovalRows: mesRows,
        totalRows: total,
        registeredAt: new Date().toISOString(),
        registeredBy: displayName,
        createdBy: userSeq,
        userSeq: userSeq,
        fileSummaries: fileSummaries || {}
      }

      setMasterInfo((prev) => ({
        ...prev,
        version: nextVersion,
        status: 'REGISTERED',
        isPublished: false
      }))

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
        message: 'Đang tập hợp ma trận dữ liệu đầu vào...',
        detail: `Đã nạp ${total.toLocaleString('vi-VN')} dòng dữ liệu`,
        statusTag: 'Chuẩn bị dữ liệu'
      })

      // Nhường luồng cho UI
      await new Promise((resolve) => setTimeout(resolve, 60))

      const allFiles = await loadAllFilesForCalculation()

      // 3. Thực hiện tính toán TKSX & KHSX
      setCalculationProgress({
        percent: 55,
        step: 'CALC_TKSX',
        message: 'Đang tổng hợp và tính toán ma trận TKSX (98 chỉ tiêu)...',
        detail: 'Ghép Báo cáo thống kê, Dở dang, Tổng hợp và Phê duyệt MES',
        statusTag: 'Tổng hợp TKSX'
      })

      // Nhường luồng cho UI
      await new Promise((resolve) => setTimeout(resolve, 60))

      const results = await runProductionCalculations(allFiles, {
        ...masterInfo,
        regCode: calcRegCode,
        version: nextVersion
      })

      setCalculationProgress({
        percent: 85,
        step: 'CALC_KHSX',
        message: 'Đang đối soát và tính toán Kế hoạch KHSX (18 chỉ tiêu)...',
        detail: 'Tính số lượng hoàn thành, tỷ lệ đạt và trạng thái điều phối',
        statusTag: 'Đối soát KHSX'
      })

      // Nhường luồng cho UI
      await new Promise((resolve) => setTimeout(resolve, 60))

      setCalcResults(results)

      // 4. Lưu kết quả tính toán
      setCalculationProgress({
        percent: 95,
        step: 'SAVE_RESULTS',
        message: 'Đang lưu kết quả tính toán...',
        detail: 'Lưu trữ kết quả tính toán cho đợt báo cáo',
        statusTag: 'Lưu kết quả'
      })

      try {
        await storageAdapter.saveCalcResults(calcRegCode, results)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`S_CALC_RESULTS_${calcRegCode}`, JSON.stringify(results))
        }
      } catch (saveErr) {
        console.warn('Lỗi lưu kết quả tính toán:', saveErr)
      }

      const missingList = results?.plan?.missingOpInfoList || []
      const missingCount = missingList.length
      const missingNote =
        missingCount > 0
          ? ` ⚠️ Lưu ý: Phát hiện ${missingCount} lệnh chưa có thông tin/họ tên cần điền tay tại Tab 6.`
          : ''

      setCalculationProgress({
        percent: 100,
        step: 'COMPLETED',
        message: 'Đã hoàn tất tính toán thành công!',
        detail: `Đã tính toán xong phiên bản [v${nextVersion}]: Xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng TKSX và ${(results?.plan?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng KHSX.${missingNote}`,
        statusTag: missingCount > 0 ? 'Cần bổ sung TT' : 'Hoàn tất'
      })

      // Tự động chuyển ngay sang Tab Kết Quả TKSX và tự động đóng modal
      setActiveTab('result_tksx')
      setTimeout(() => {
        setIsCalculating(false)
      }, 400)
      notify(
        'success',
        `Đã hoàn thành tính toán v${nextVersion}! Đã xuất ${(results?.stat?.calculatedRows?.length || 0).toLocaleString('vi-VN')} dòng kết quả TKSX [Mã: ${calcRegCode}].`
      )

      if (missingCount > 0) {
        const sampleCodes = missingList
          .slice(0, 3)
          .map((m) => m.orderNo)
          .join(', ')
        const moreSuffix = missingCount > 3 ? ` và ${missingCount - 3} lệnh khác` : ''
        setTimeout(() => {
          notify(
            'warning',
            `⚠️ CẢNH BÁO KHSX: Phát hiện ${missingCount} lệnh thao tác chưa có thông tin / họ tên (VD: ${sampleCodes}${moreSuffix}). Vui lòng kiểm tra cột "Trạng thái LTT" tại Tab 6 [Kết quả KHSX] để điền bổ sung bằng tay!`,
            12000
          )
        }, 500)
      }
    } catch (err) {
      console.error('Lỗi tính toán:', err)
      notify('error', `Tính toán thất bại: ${err.message}`)
      setIsCalculating(false)
    }
  }, [
    fileSummaries,
    activeTabFileData,
    storageMode,
    masterInfo,
    loadAllFilesForCalculation,
    notify
  ])

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

  // Đẩy 2 file kết quả KHSX & TKSX lên module Đăng ký báo cáo (/erp/u/report/registration)
  const handleRegisterReportsToSystem = useCallback(async () => {
    let freshCalc = calcResults
    if (!freshCalc && masterInfo.regCode) {
      try {
        freshCalc = await storageAdapter.getCalcResults(masterInfo.regCode)
      } catch {}
    }

    const khsxRows = freshCalc?.plan?.calculatedRows || []
    const statRows = freshCalc?.stat?.calculatedRows || []

    if (khsxRows.length === 0 && statRows.length === 0) {
      notify(
        'warning',
        'Chưa có dữ liệu kết quả KHSX và TKSX. Vui lòng bấm [TÍNH KHSX & TKSX] trước khi đăng ký báo cáo!'
      )
      return
    }

    setIsPushingRegistration(true)
    setPushRegistrationProgress({
      isOpen: true,
      percent: 10,
      step: 'INIT',
      message: 'Đang chuẩn bị dữ liệu 2 báo cáo KHSX và TKSX...',
      detail: `Mã đăng ký: ${masterInfo.regCode} | Nhà máy: ${masterInfo.factoryName || 'GS1 Hà Nội'}`,
      statusTag: 'Khởi tạo',
      khsxRows: khsxRows.length,
      statRows: statRows.length,
      regCode: masterInfo.regCode,
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
      const applyDate = masterInfo.applyDate || dayjs().format('YYYY-MM-DD')
      const regCode = masterInfo.regCode || generateDefaultRegCode()
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

      notify(
        'success',
        `Đã nạp thành công 2 báo cáo KHSX (${khsxRows.length.toLocaleString('vi-VN')} dòng) và TKSX (${statRows.length.toLocaleString('vi-VN')} dòng)!`
      )
    } catch (err) {
      console.error('[PushRegistration Error]', err)
      setPushRegistrationProgress((prev) => ({
        ...prev,
        isError: true,
        message: `Lỗi khi nạp báo cáo: ${err?.message || err}`,
        detail: 'Vui lòng kiểm tra kết nối mạng hoặc thử lại.',
        statusTag: 'Lỗi nạp dữ liệu'
      }))
      notify('error', `Lỗi đăng ký báo cáo: ${err?.message || err}`)
    }
  }, [calcResults, masterInfo, notify])

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
    setIsPublishing,
    publishProgress,
    isExporting,
    isPushingRegistration,
    pushRegistrationProgress,
    handleRegisterReportsToSystem,
    closePushRegistrationModal: () =>
      setPushRegistrationProgress((prev) => ({ ...prev, isOpen: false })),
    calcResults,
    setCalcResults,
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
    handleUnlockForEdit,
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

