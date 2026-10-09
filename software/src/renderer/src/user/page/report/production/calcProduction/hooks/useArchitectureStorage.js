/**
 * Custom hook quản lý nạp/xóa/đọc 4 file kiến trúc từ tầng lưu trữ (IndexedDB / SQLite)
 * Lưu trữ độc lập dữ liệu từng Tab trong filesDataMap, đảm bảo Tab nào chưa nạp thì không bị hiện đè dữ liệu của Tab khác
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import storageAdapter from '../storage'

export function useArchitectureStorage({ autoLoad = false } = {}) {
  const [fileSummaries, setFileSummaries] = useState({})
  const [filesDataMap, setFilesDataMap] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [storageMode, setStorageMode] = useState(() => storageAdapter.getMode())

  // Cache dữ liệu chi tiết của các tab đã tải trong phiên làm việc
  const detailCacheRef = useRef({})

  // Tải tóm tắt 4 file (cực nhanh, không chứa mảng data nặng)
  const refreshSummaries = useCallback(async () => {
    try {
      const mode = storageAdapter.getMode()
      setStorageMode(mode)
      const summaries = await storageAdapter.getAllSummaries()
      setFileSummaries(summaries || {})
      return summaries
    } catch (err) {
      console.error('Lỗi khi nạp tóm tắt từ kho lưu trữ:', err)
      return {}
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      refreshSummaries()
    }
  }, [autoLoad, refreshSummaries])

  // Tải dữ liệu chi tiết của 1 Tab cụ thể (Lazy loading)
  const loadTabDetail = useCallback(async (fileType, force = false) => {
    if (!fileType) return null
    if (!force && detailCacheRef.current[fileType]) {
      setFilesDataMap((prev) => ({ ...prev, [fileType]: detailCacheRef.current[fileType] }))
      return detailCacheRef.current[fileType]
    }

    setIsLoading(true)
    try {
      const record = await storageAdapter.getFile(fileType)
      const data = record || null
      detailCacheRef.current[fileType] = data
      setFilesDataMap((prev) => ({ ...prev, [fileType]: data }))
      return data
    } catch (err) {
      console.error(`Lỗi tải chi tiết tab ${fileType}:`, err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveFile = async (fileType, fileData, onProgress = null) => {
    await storageAdapter.saveFile(fileType, fileData, onProgress)
    detailCacheRef.current[fileType] = fileData
    setFilesDataMap((prev) => ({ ...prev, [fileType]: fileData }))
    setFileSummaries((prev) => ({
      ...prev,
      [fileType]: {
        fileType,
        fileName: fileData.fileName || '',
        fileSize: fileData.fileSize || 0,
        rowCount: fileData.rowCount || fileData.data?.length || 0,
        columns: fileData.columns || [],
        uploadedAt: fileData.uploadedAt || new Date().toISOString()
      }
    }))
  }

  const deleteFile = async (fileType) => {
    await storageAdapter.deleteFile(fileType)
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
  }

  const clearAllFiles = async () => {
    await storageAdapter.deleteFile(null)
    detailCacheRef.current = {}
    setFilesDataMap({})
    setFileSummaries({})
  }

  // Tải toàn bộ 4 file khi người dùng bấm Tính toán
  const loadAllFilesForCalculation = async () => {
    return await storageAdapter.getAllFiles()
  }

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
