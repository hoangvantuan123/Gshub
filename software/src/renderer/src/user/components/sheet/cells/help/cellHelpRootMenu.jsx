import {
  getMiddleCenterBias,
  GridCellKind,
  TextCellEntry,
  useTheme,
  DataEditor
} from '@glideapps/glide-data-grid'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  SearchOutlined,
  TableOutlined,
  LoadingOutlined,
  DeleteOutlined,
  RollbackOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { debounce } from 'lodash'
import { Button } from 'antd'
import { getHelpRoleRootMenu } from '../../../../../api/help'
import { Rnd } from 'react-rnd'
import { useWindowSize } from '../../../hooks/sheet/useWindowSize'

import { X } from 'lucide-react'
export const Editor = (p) => {
  const { t } = useTranslation()
  const { value: cell, onFinishedEditing } = p
  const { allowedValues = [], setCacheData = [], value: valueIn } = cell.data

  const [searchText, setSearchText] = useState(valueIn)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef(null)
  const [hoverRow, setHoverRow] = useState(undefined)
  const onItemHovered = useCallback((args) => {
    const [_, row] = args.location
    setHoverRow(args.kind !== 'cell' ? undefined : row)
  }, [])
  const windowSize = useWindowSize()
  const modalWidth = Math.min(1200, windowSize.width * 0.95)
  const modalHeight = Math.min(800, windowSize.height * 0.8)

  const [size, setSize] = useState({ width: modalWidth, height: modalHeight })
  const [position, setPosition] = useState({
    x: (windowSize.width - modalWidth) / 2,
    y: (windowSize.height - modalHeight) / 2
  })

  useEffect(() => {
    setSize({ width: modalWidth, height: modalHeight })
    setPosition({
      x: (windowSize.width - modalWidth) / 2,
      y: (windowSize.height - modalHeight) / 2
    })
  }, [windowSize])
  const defaultCols = useMemo(
    () => [
      {
        title: 'Key',
        id: 'Key',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true
      },
      {
        title: 'Label',
        id: 'Label',
        kind: 'Text',
        readonly: true,
        width: 370,
        hasMenu: true,
        visible: true
      }
    ],
    []
  )

  const controllers = useRef({})
  const [cols, setCols] = useState(defaultCols)
  const [extraData, setExtraData] = useState([])

  const lastQueryKey = useRef('')

  const debounceCallGetCodeHelp = useMemo(
    () =>
      debounce(async (key) => {
        if (key === lastQueryKey.current) return
        lastQueryKey.current = key

        if (controllers.current.debounceCallGetCodeHelp) {
          controllers.current.debounceCallGetCodeHelp.abort()
          controllers.current.debounceCallGetCodeHelp = null
        }

        setIsLoading(true)
        const controller = new AbortController()
        controllers.current.debounceCallGetCodeHelp = controller

        try {
          const result = await getHelpRoleRootMenu(1, 1000, key, controller.signal)
          setExtraData(result?.data?.data || [])
        } catch (error) {
          if (error.name !== 'AbortError') setExtraData([])
        } finally {
          setIsLoading(false)
          controllers.current.debounceCallGetCodeHelp = null
        }
      }, 150),
    []
  )

  const normalizeText = (text) =>
    typeof text === 'string' || typeof text === 'number' ? text.toString().toLowerCase().trim() : ''

  const debounceCallApi = useMemo(
    () =>
      debounce((searchText) => {
        const search = normalizeText(searchText)
        const propertiesToSearch = ['Key', 'Label']

        const tempFilteredData = allowedValues.filter((item) =>
          propertiesToSearch.some((attr) => {
            const itemValue = item[attr]
            return itemValue && normalizeText(itemValue).includes(search)
          })
        )

        if (searchText && tempFilteredData.length === 0) {
          debounceCallGetCodeHelp(searchText)
        }
      }, 300),
    [allowedValues, debounceCallGetCodeHelp]
  )

  const handleOnChange = useCallback(
    (val) => {
      const value = val.target.value
      setSearchText(value)
      setIsOpen(true)

      debounceCallApi(value)
    },
    [debounceCallApi]
  )

  const filteredData = useMemo(() => {
    const search = normalizeText(searchText)
    if (!search) return allowedValues

    return allowedValues.filter((item) =>
      ['Key', 'Label'].some((attr) => {
        const value = item[attr]
        return value && normalizeText(value).includes(search)
      })
    )
  }, [searchText, allowedValues])

  const finalFilteredData = useMemo(() => {
    const existingItemSeqs = new Set(filteredData.map((item) => item.Id))
    const newData = extraData.filter((item) => !existingItemSeqs.has(item.Id))

    setCacheData((prev) => {
      const existingItemSeqs = new Set(prev.map((item) => item.Id))
      const newData = extraData.filter((item) => !existingItemSeqs.has(item.Id))
      return [...prev, ...newData]
    })

    return [...filteredData, ...newData]
  }, [filteredData, extraData])

  const handleRowClick = (record) => {
    onFinishedEditing({
      ...cell,
      data: [record]
    })
  }

  const handleCellClick = (cell) => {
    const rowIndex = cell[1]
    if (rowIndex >= 0 && rowIndex < finalFilteredData.length) {
      handleRowClick(finalFilteredData[rowIndex])
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const onColumnResize = useCallback(
    (column, newSize) => {
      const index = cols.findIndex((col) => col.title === column.title)
      if (index !== -1) {
        const newCols = [...cols]
        newCols[index] = { ...column, width: newSize }
        setCols(newCols)
      }
    },
    [cols]
  )

  const getData = useCallback(
    ([col, row]) => {
      const person = finalFilteredData[row] || {}
      const column = cols[col]
      const columnKey = column?.id || ''
      const value = person[columnKey] || ''

      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: String(value),
        readonly: column?.readonly || false,
        allowOverlay: true
      }
    },
    [finalFilteredData, cols]
  )
  const handleCancel = () => {
    onFinishedEditing(cell)
  }
  return (
    <Rnd
      size={size}
      position={position}
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, newPosition) => {
        setSize({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height)
        })
        setPosition(newPosition)
      }}
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true
      }}
      bounds="window"
      minWidth={800}
      minHeight={300}
      dragHandleClassName="drag-handle"
    >
      <div ref={dropdownRef} className="bg-white rounded-lg flex flex-col h-full">
        <h2 className="text-[10px] opacity-85 font-medium flex justify-between rounded-t-lg items-center p-1 bg-slate-100 uppercase drag-handle">
          <span></span>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-red-500 hover:bg-slate-200 p-1 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </h2>

        {/* Ô tìm kiếm */}
        <div className="p-2 border-b border-t">
          <div className="w-full flex gap-2  items-center">
            <button className="rounded-lg hover:bg-slate-50 flex items-center justify-center ">
              {isLoading ? (
                <LoadingOutlined className="opacity-80 text-sm animate-spin" />
              ) : (
                <SearchOutlined className="opacity-80 text-sm" />
              )}
            </button>

            <input
              className="h-full w-full border-none focus:outline-none bg-inherit"
              value={searchText}
              autoFocus={true}
              onChange={handleOnChange}
              placeholder="Nhập từ khóa để tìm kiếm..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredData.length > 0) {
                  handleRowClick(filteredData[0])
                }
                if (e.key === 'Escape') {
                  setIsOpen(false)
                }
              }}
            />
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="flex-1">
          <DataEditor
            width="100%"
            height="100%"
            className="cursor-pointer"
            rows={filteredData.length}
            columns={cols}
            getCellContent={getData}
            headerHeight={27}
            freezeColumns="0"
            rowHeight={25}
            getCellsForSelection={true}
            onItemHovered={onItemHovered}
            onColumnResize={onColumnResize}
            onCellClicked={handleCellClick}
            rowMarkers={('checkbox-visible', 'both')}
            rowSelect="single"
          />
        </div>

        <div className="w-full flex gap-2 items-center border-t p-2 rounded-b-lg bg-slate-100">
          {/*   <Button
                        type="text"
                        className="text-xs opacity-60 text-red-500 hover:opacity-85 flex items-center gap-1"
                        style={{
                            color: 'inherit',
                            textDecoration: 'none',
                            background: 'none'
                        }}
                        onClick={handleCancel}
                    >
                        <RollbackOutlined className="text-sm" />
                        Cancel
                    </Button> */}
        </div>
      </div>
    </Rnd>
  )
}

export const CellsHelpRootMenu = {
  kind: GridCellKind.Custom,
  isMatch: (c) => c.data.kind === 'cell-help-menu',
  draw: (args, cell) => {
    const { ctx, theme, rect } = args
    const { value } = cell.data

    if (!value) return true

    ctx.fillStyle = theme.textDark
    ctx.fillText(
      value,
      rect.x + theme.cellHorizontalPadding,
      rect.y + rect.height / 2 + getMiddleCenterBias(ctx, theme)
    )

    return true
  },
  provideEditor: () => ({
    editor: Editor,
    deletedValue: (v) => ({
      ...v,
      copyData: '',
      data: { ...v.data, value: '' }
    }),
    styleOverride: {
      position: 'fixed',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 'unset',
      maxHeight: 'unset',
      overflow: 'auto',
      background: 'rgba(0, 0, 0, 0.2)',
      zIndex: 99999
    },
    disablePadding: true
  }),
  onPaste: async (v, d) => {
    const normalizeText = (text) =>
      typeof text === 'string' || typeof text === 'number'
        ? text.toString().trim().toLowerCase().normalize('NFC')
        : ''

    const pastedValue = normalizeText(v)
    if (!Array.isArray(d.allowedValues)) return []

    const matchedValues = d.allowedValues.filter((item) =>
      ['Key', 'Label'].some((attr) => {
        const value = item[attr]
        return value && normalizeText(value) === pastedValue
      })
    )

    if (matchedValues.length > 0) {
      return matchedValues
    }

    const matchedValuesFromApi = await callGetCodeHelp(pastedValue, d)

    if (matchedValuesFromApi.length > 0 && typeof d.setCacheData === 'function') {
      d.setCacheData((prev) => {
        const existingItemSeqs = new Set(prev.map((item) => item.ItemSeq))
        const newData = matchedValuesFromApi.filter((item) => !existingItemSeqs.has(item.ItemSeq))
        return newData.length > 0 ? [...prev, ...newData] : prev
      })
    }

    return matchedValuesFromApi
  }
}

const lastFetchedData = new Map()
const fetchingKeys = new Set()

export const callGetCodeHelp = async (key, d) => {
  if (!key || key === 'N/A') return []

  if (lastFetchedData.has(key)) {
    return lastFetchedData.get(key)
  }

  while (fetchingKeys.has(key)) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  if (lastFetchedData.has(key)) {
    return lastFetchedData.get(key)
  }

  fetchingKeys.add(key)

  try {
    const controller = new AbortController()
    const result = await getHelpRoleRootMenu(1, 1000, key, controller.signal)

    const data = result?.data?.data || []

    if (data.length > 0) {
      lastFetchedData.set(key, data)

      if (typeof d.setCacheData === 'function') {
        d.setCacheData((prev) => {
          const existingItemSeqs = new Set(prev.map((item) => item.ItemSeq))
          const newData = data.filter((item) => !existingItemSeqs.has(item.ItemSeq))
          return newData.length > 0 ? [...prev, ...newData] : prev
        })
      }
    }

    return data
  } catch (error) {
    return []
  } finally {
    fetchingKeys.delete(key)
  }
}
