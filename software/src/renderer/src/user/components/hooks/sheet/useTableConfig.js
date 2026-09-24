import { useState, useCallback, useEffect } from 'react'
import {
  loadFromLocalStorageSheet,
  saveToLocalStorageSheet
} from '../../../../localStorage/sheet/sheet'

const DEFAULT_ROW_HEIGHT = 23
const DEFAULT_HEADER_HEIGHT = 23
const DEFAULT_OVERSCROLL_X = 50
const DEFAULT_OVERSCROLL_Y = 20

// Event listener for cross-table / global setting sync
const GLOBAL_DIMENSION_EVENT = 'ERP_GLOBAL_TABLE_DIMENSION_CHANGE'

export function setGlobalTableDimensions(
  newHeaderHeight,
  newRowHeight,
  newOverscrollX,
  newOverscrollY
) {
  if (typeof newHeaderHeight === 'number') {
    saveToLocalStorageSheet('GLOBAL_HEADER_HEIGHT', newHeaderHeight)
  }
  if (typeof newRowHeight === 'number') {
    saveToLocalStorageSheet('GLOBAL_ROW_HEIGHT', newRowHeight)
  }
  if (typeof newOverscrollX === 'number') {
    saveToLocalStorageSheet('GLOBAL_OVERSCROLL_X', newOverscrollX)
  }
  if (typeof newOverscrollY === 'number') {
    saveToLocalStorageSheet('GLOBAL_OVERSCROLL_Y', newOverscrollY)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(GLOBAL_DIMENSION_EVENT, {
        detail: {
          headerHeight: newHeaderHeight,
          rowHeight: newRowHeight,
          overscrollX: newOverscrollX,
          overscrollY: newOverscrollY
        }
      })
    )
  }
}

export default function useTableConfig(tableKey) {
  const freezeKey = `FREEZE_COLS_${tableKey}`
  const configKey = `CONFIG_COLS_${tableKey}`
  const rowHeightKey = `ROW_HEIGHT_${tableKey}`
  const headerHeightKey = `HEADER_HEIGHT_${tableKey}`
  const overscrollXKey = `OVERSCROLL_X_${tableKey}`
  const overscrollYKey = `OVERSCROLL_Y_${tableKey}`

  const [freezeColumnsCount, setFreezeColumnsCount] = useState(() => {
    return loadFromLocalStorageSheet(freezeKey, 1) // mặc định ghim 1 cột (Status)
  })

  const [columnSettings, setColumnSettings] = useState(() => {
    return loadFromLocalStorageSheet(configKey, {})
  })

  const [rowHeight, setRowHeightState] = useState(() => {
    const globalRowHeight = loadFromLocalStorageSheet('GLOBAL_ROW_HEIGHT', DEFAULT_ROW_HEIGHT)
    return loadFromLocalStorageSheet(rowHeightKey, globalRowHeight)
  })

  const [headerHeight, setHeaderHeightState] = useState(() => {
    const globalHeaderHeight = loadFromLocalStorageSheet(
      'GLOBAL_HEADER_HEIGHT',
      DEFAULT_HEADER_HEIGHT
    )
    return loadFromLocalStorageSheet(headerHeightKey, globalHeaderHeight)
  })

  const [overscrollX, setOverscrollXState] = useState(() => {
    const globalOverscrollX = loadFromLocalStorageSheet('GLOBAL_OVERSCROLL_X', DEFAULT_OVERSCROLL_X)
    return loadFromLocalStorageSheet(overscrollXKey, globalOverscrollX)
  })

  const [overscrollY, setOverscrollYState] = useState(() => {
    const globalOverscrollY = loadFromLocalStorageSheet('GLOBAL_OVERSCROLL_Y', DEFAULT_OVERSCROLL_Y)
    return loadFromLocalStorageSheet(overscrollYKey, globalOverscrollY)
  })

  // Đồng bộ thay đổi kích thước từ cài đặt tổng (Settings Modal / Global Change)
  useEffect(() => {
    const handleGlobalChange = (e) => {
      const {
        headerHeight: newHeaderHeight,
        rowHeight: newRowHeight,
        overscrollX: newOverscrollX,
        overscrollY: newOverscrollY
      } = e.detail || {}
      if (typeof newRowHeight === 'number') {
        setRowHeightState(newRowHeight)
      }
      if (typeof newHeaderHeight === 'number') {
        setHeaderHeightState(newHeaderHeight)
      }
      if (typeof newOverscrollX === 'number') {
        setOverscrollXState(newOverscrollX)
      }
      if (typeof newOverscrollY === 'number') {
        setOverscrollYState(newOverscrollY)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(GLOBAL_DIMENSION_EVENT, handleGlobalChange)
      return () => {
        window.removeEventListener(GLOBAL_DIMENSION_EVENT, handleGlobalChange)
      }
    }
  }, [])

  const handleFreezeColumn = useCallback(
    (colIndex) => {
      const newCount = freezeColumnsCount === colIndex + 1 ? 1 : colIndex + 1
      setFreezeColumnsCount(newCount)
      saveToLocalStorageSheet(freezeKey, newCount)
    },
    [freezeColumnsCount, freezeKey]
  )

  const updateColumnSetting = useCallback(
    (columnId, settingKey, value) => {
      setColumnSettings((prev) => {
        const prevColSettings = prev[columnId] || {}
        const newValue = prevColSettings[settingKey] === value ? null : value
        const newSettings = {
          ...prev,
          [columnId]: {
            ...prevColSettings,
            [settingKey]: newValue
          }
        }
        saveToLocalStorageSheet(configKey, newSettings)
        return newSettings
      })
    },
    [configKey]
  )

  const setRowHeight = useCallback(
    (newHeight, isGlobal = false) => {
      setRowHeightState(newHeight)
      if (isGlobal) {
        setGlobalTableDimensions(undefined, newHeight)
      } else {
        saveToLocalStorageSheet(rowHeightKey, newHeight)
      }
    },
    [rowHeightKey]
  )

  const setHeaderHeight = useCallback(
    (newHeight, isGlobal = false) => {
      setHeaderHeightState(newHeight)
      if (isGlobal) {
        setGlobalTableDimensions(newHeight, undefined)
      } else {
        saveToLocalStorageSheet(headerHeightKey, newHeight)
      }
    },
    [headerHeightKey]
  )

  const setOverscrollX = useCallback(
    (newOverscrollX, isGlobal = false) => {
      setOverscrollXState(newOverscrollX)
      if (isGlobal) {
        setGlobalTableDimensions(undefined, undefined, newOverscrollX, undefined)
      } else {
        saveToLocalStorageSheet(overscrollXKey, newOverscrollX)
      }
    },
    [overscrollXKey]
  )

  const setOverscrollY = useCallback(
    (newOverscrollY, isGlobal = false) => {
      setOverscrollYState(newOverscrollY)
      if (isGlobal) {
        setGlobalTableDimensions(undefined, undefined, undefined, newOverscrollY)
      } else {
        saveToLocalStorageSheet(overscrollYKey, newOverscrollY)
      }
    },
    [overscrollYKey]
  )

  return {
    freezeColumnsCount,
    handleFreezeColumn,
    columnSettings,
    updateColumnSetting,
    rowHeight,
    headerHeight,
    overscrollX,
    overscrollY,
    setRowHeight,
    setHeaderHeight,
    setOverscrollX,
    setOverscrollY
  }
}
