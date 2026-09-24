import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getDateSettings,
  updateDateSettings,
  parseUniversalDate,
  formatDate,
  formatDateTime,
  formatMonth,
  formatTime,
  toApiDate,
  toApiDateTime,
  toApiDateRange,
  DATE_FORMAT_CHANGE_EVENT,
  STORAGE_KEY_DATE_SETTINGS,
  dayjs
} from '../../utils/dateFormatter'

/**
 * Custom Hook useDateFormat
 * Quản lý cấu hình định dạng ngày tháng hiển thị & xử lý dữ liệu cho toàn bộ giao diện ERP.
 * Tự động cập nhật tức thời (reactive) khi cấu hình Setting thay đổi.
 *
 * @returns {Object} Các hàm tiện ích format và cấu hình hiện tại
 */
export function useDateFormat() {
  const [settings, setSettings] = useState(() => getDateSettings())

  useEffect(() => {
    const handleSettingsChange = (e) => {
      if (e?.detail) {
        setSettings(e.detail)
      } else {
        setSettings(getDateSettings())
      }
    }

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_DATE_SETTINGS) {
        setSettings(getDateSettings())
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(DATE_FORMAT_CHANGE_EVENT, handleSettingsChange)
      window.addEventListener('storage', handleStorageChange)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(DATE_FORMAT_CHANGE_EVENT, handleSettingsChange)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  // Cập nhật cấu hình mới
  const setDateSettings = useCallback((newSettings) => {
    const updated = updateDateSettings(newSettings)
    setSettings(updated)
  }, [])

  // Định dạng ngày hiển thị (Date)
  const formatD = useCallback(
    (val, customFormat, fallback = '') => {
      return formatDate(val, customFormat || settings.dateFormat, fallback)
    },
    [settings.dateFormat]
  )

  // Định dạng ngày giờ hiển thị (DateTime)
  const formatDT = useCallback(
    (val, customFormat, fallback = '') => {
      return formatDateTime(val, customFormat || settings.dateTimeFormat, fallback)
    },
    [settings.dateTimeFormat]
  )

  // Định dạng tháng hiển thị (Month)
  const formatM = useCallback(
    (val, customFormat, fallback = '') => {
      return formatMonth(val, customFormat || settings.monthFormat, fallback)
    },
    [settings.monthFormat]
  )

  // Định dạng giờ hiển thị (Time)
  const formatT = useCallback(
    (val, customFormat, fallback = '') => {
      return formatTime(val, customFormat || settings.timeFormat, fallback)
    },
    [settings.timeFormat]
  )

  return useMemo(
    () => ({
      settings,
      setDateSettings,
      parseDate: parseUniversalDate,
      formatDate: formatD,
      formatDateTime: formatDT,
      formatMonth: formatM,
      formatTime: formatT,
      toApiDate,
      toApiDateTime,
      toApiDateRange,
      dayjs
    }),
    [settings, setDateSettings, formatD, formatDT, formatM, formatT]
  )
}

export default useDateFormat
