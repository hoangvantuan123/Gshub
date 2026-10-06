/**
 * Custom hook điều phối toàn bộ luồng trang Đăng ký & Tính KHSX & TKSX
 * Quản lý Master Registration Info, 4 Tab Files (không tự động truy vấn trên mount), và Động cơ tính toán
 * Đẩy toàn bộ thông báo xuống StatusBar (PageDataContext)
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import { TAB_DEFINITIONS, STORAGE_KEYS } from '../constants/calcConstants'
import { parseUploadedFile } from '../engine/fileParsers'
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
  } = useArchitectureStorage({ autoLoad: false })

  const activeTabFileData = useMemo(() => {
    return filesDataMap[activeTab] || null
  }, [filesDataMap, activeTab])

  // Đảm bảo mỗi lần vào menu Đăng ký mới sẽ làm mới hoàn toàn dữ liệu
  useEffect(() => {
    clearAllFiles()
    setCalcResults(null)
    setMasterInfo({
      regCode: generateDefaultRegCode(),
      factoryName: 'GS1 Hà Nội',
      applyDate: dayjs().format('YYYY-MM-DD'),
      remark: ''
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [isRegistered, setIsRegistered] = useState(false)

  // Xử lý upload file cho 1 Tab cụ thể
  const handleUploadFileForTab = useCallback(
    async (fileType, rawFile) => {
      if (!rawFile) return
      setIsParsing(true)
      try {
        const parsed = await parseUploadedFile(rawFile, fileType)
        await saveFile(fileType, parsed)
        setIsRegistered(false)
        const tabTitle = TAB_DEFINITIONS.find((t) => t.id === fileType)?.title || fileType
        notify('success', `Đã nạp thành công ${parsed.rowCount.toLocaleString('vi-VN')} dòng cho ${tabTitle}`)
      } catch (err) {
        notify('error', `Lỗi nạp file: ${err.message}`)
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

      // Fallback lưu localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`S_MASTER_REG_${masterInfo.regCode}`, JSON.stringify(masterRecord))
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

  // Bắt đầu tính toán
  const handleRunCalculation = useCallback(async () => {
    const uploadedCount = Object.values(fileSummaries || {}).filter((s) => s.rowCount > 0).length
    if (uploadedCount === 0 && (!activeTabFileData || activeTabFileData.rowCount === 0)) {
      notify('error', 'Vui lòng tải lên ít nhất 1 file kiến trúc để tính toán')
      return
    }

    setIsCalculating(true)
    notify('info', 'Đang thực hiện tính toán KHSX và TKSX...')
    try {
      const allFiles = await loadAllFilesForCalculation()
      const results = await runProductionCalculations(allFiles)
      setCalcResults(results)
      notify('success', 'Đã hoàn thành tính toán KHSX và TKSX!')
    } catch (err) {
      console.error('Lỗi tính toán:', err)
      notify('error', `Tính toán thất bại: ${err.message}`)
    } finally {
      setIsCalculating(false)
    }
  }, [fileSummaries, activeTabFileData, loadAllFilesForCalculation, notify])

  // Thống kê trạng thái 4 file từ fileSummaries
  const fileStatusSummary = useMemo(() => {
    const summary = {}
    TAB_DEFINITIONS.forEach((tab) => {
      const summaryItem = fileSummaries[tab.id]
      summary[tab.id] = {
        isUploaded: Boolean(summaryItem && summaryItem.rowCount > 0),
        fileName: summaryItem?.fileName || '',
        rowCount: summaryItem?.rowCount || 0,
        uploadedAt: summaryItem?.uploadedAt || null
      }
    })
    return summary
  }, [fileSummaries])

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
