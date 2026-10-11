/**
 * Custom hook quản lý nạp/xóa/đọc 4 file kiến trúc từ tầng lưu trữ (IndexedDB / SQLite)
 * Lưu trữ độc lập dữ liệu từng Tab trong filesDataMap theo từng mã báo cáo regCode
 * Đảm bảo Tab nào chưa nạp thì không bị hiện đè dữ liệu của Tab khác hoặc của báo cáo trước
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import storageAdapter from '../storage'

export function useArchitectureStorage({ autoLoad = false, regCode = '' } = {}) {
  const [fileSummaries, setFileSummaries] = useState({})
  const [filesDataMap, setFilesDataMap] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [storageMode, setStorageMode] = useState(() => storageAdapter.getMode())

  // Cache dữ liệu chi tiết của các tab đã tải trong phiên làm việc
  const detailCacheRef = useRef({})
  const prevRegCodeRef = useRef(regCode)

  // Tải tóm tắt 4 file (cực nhanh, không chứa mảng data nặng) theo regCode
  const refreshSummaries = useCallback(
    async (targetReg = regCode) => {
      try {
        const mode = storageAdapter.getMode()
        setStorageMode(mode)
        const cleanTarget = String(targetReg || '').trim()
        const summaries = await storageAdapter.getAllSummaries(cleanTarget)
        // Quy tắc cách ly tuyệt đối: Chỉ lấy tóm tắt của đúng mã targetReg
        const strictlyFiltered = {}
        if (summaries && typeof summaries === 'object') {
          for (const [k, v] of Object.entries(summaries)) {
            if (v) {
              const fileReg = String(v.regCode || '').trim()
              if (!cleanTarget || fileReg === cleanTarget) {
                strictlyFiltered[k] = v
              }
            }
          }
        }
        setFileSummaries(strictlyFiltered)
        return strictlyFiltered
      } catch (err) {
        console.error('Lỗi khi nạp tóm tắt từ kho lưu trữ:', err)
        return {}
      }
    },
    [regCode]
  )

  // Khi regCode thay đổi -> Reset sạch toàn bộ cache/state của báo cáo trước, nạp lại đúng cho regCode mới
  useEffect(() => {
    if (prevRegCodeRef.current !== regCode) {
      prevRegCodeRef.current = regCode
      detailCacheRef.current = {}
      setFilesDataMap({})
      setFileSummaries({})
      if (regCode) {
        refreshSummaries(regCode)
      }
    }
  }, [regCode, refreshSummaries])

  useEffect(() => {
    if (autoLoad && regCode) {
      refreshSummaries(regCode)
    }
  }, [autoLoad, regCode, refreshSummaries])

  // Tải dữ liệu chi tiết của 1 Tab cụ thể (Lazy loading)
  const loadTabDetail = useCallback(
    async (fileType, force = false, targetReg = regCode) => {
      if (!fileType) return null
      const cleanTarget = String(targetReg || regCode || '').trim()
      const cacheKey = cleanTarget ? `${cleanTarget}__${fileType}` : fileType

      if (!force && detailCacheRef.current[cacheKey]) {
        setFilesDataMap((prev) => ({ ...prev, [fileType]: detailCacheRef.current[cacheKey] }))
        return detailCacheRef.current[cacheKey]
      }

      setIsLoading(true)
      try {
        const record = await storageAdapter.getFile(fileType, cleanTarget)
        const data = record || null
        if (data && data.data && data.data.length > 0) {
          detailCacheRef.current[cacheKey] = data
          setFilesDataMap((prev) => ({ ...prev, [fileType]: data }))
        } else {
          // Tab chưa có file cho regCode này -> Dứt khoát không có dữ liệu
          delete detailCacheRef.current[cacheKey]
          setFilesDataMap((prev) => {
            const next = { ...prev }
            delete next[fileType]
            return next
          })
        }
        return data
      } catch (err) {
        console.error(`Lỗi tải chi tiết tab ${fileType}:`, err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [regCode]
  )

  const saveFile = useCallback(
    async (fileType, fileData, onProgress = null, targetReg = regCode) => {
      const activeReg = String(targetReg || regCode || fileData?.regCode || '').trim()
      await storageAdapter.saveFile(fileType, fileData, onProgress, activeReg)
      const cacheKey = activeReg ? `${activeReg}__${fileType}` : fileType
      detailCacheRef.current[cacheKey] = fileData
      setFilesDataMap((prev) => ({ ...prev, [fileType]: fileData }))
      setFileSummaries((prev) => ({
        ...prev,
        [fileType]: {
          fileType,
          regCode: activeReg,
          fileName: fileData.fileName || '',
          fileSize: fileData.fileSize || 0,
          rowCount: fileData.rowCount || fileData.data?.length || 0,
          columns: fileData.columns || [],
          uploadedAt: fileData.uploadedAt || new Date().toISOString()
        }
      }))
    },
    [regCode]
  )

  const deleteFile = useCallback(
    async (fileType, targetReg = regCode) => {
      const activeReg = String(targetReg || regCode || '').trim()
      await storageAdapter.deleteFile(fileType, activeReg)
      const cacheKey = activeReg ? `${activeReg}__${fileType}` : fileType
      delete detailCacheRef.current[cacheKey]
      delete detailCacheRef.current[fileType]
      setFilesDataMap((prev) => {
        const next = { ...prev }
        delete next[fileType]
        return next
      })
      setFileSummaries((prev) => {
        const next = { ...prev }
        delete next[fileType]
        return next
      })
    },
    [regCode]
  )

  const clearAllFiles = useCallback(
    async (targetReg = regCode) => {
      const activeReg = targetReg || regCode || ''
      await storageAdapter.deleteFile(null, activeReg)
      detailCacheRef.current = {}
      setFilesDataMap({})
      setFileSummaries({})
    },
    [regCode]
  )

  // Tải toàn bộ các file thuộc đúng mã báo cáo này khi bấm Tính toán
  const loadAllFilesForCalculation = useCallback(
    async (targetReg = regCode) => {
      const activeReg = targetReg || regCode || ''
      const storedFiles = await storageAdapter.getAllFiles(activeReg)

      // Ưu tiên dữ liệu trong memory nếu vừa upload nhưng chưa kịp sync hoặc cache
      const combined = { ...(storedFiles || {}) }
      for (const [key, memData] of Object.entries(filesDataMap)) {
        if (memData && Array.isArray(memData.data) && memData.data.length > 0) {
          combined[key] = memData
        }
      }
      return combined
    },
    [regCode, filesDataMap]
  )

  return {
    fileSummaries,
    filesDataMap,
    isLoading,
    storageMode,
    refreshSummaries,
    loadTabDetail,
    saveFile,
    deleteFile,
    clearAllFiles,
    loadAllFilesForCalculation
  }
}
