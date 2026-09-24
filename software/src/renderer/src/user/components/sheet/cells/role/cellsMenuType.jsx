import CustomRenderer, {
  getMiddleCenterBias,
  GridCellKind,
  TextCellEntry,
  useTheme,
  DataEditor
} from '@glideapps/glide-data-grid'
import { useMemo } from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  SearchOutlined,
  TableOutlined,
  LoadingOutlined,
  ControlOutlined,
  RollbackOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Rnd } from 'react-rnd'
import { Button } from 'antd'
import { useWindowSize } from '../../../hooks/sheet/useWindowSize'

import { X } from 'lucide-react'
const Editor = (p) => {
  const { t } = useTranslation()
  const { value: cell, onFinishedEditing } = p
  const { allowedValues = [], value: valueIn } = cell.data
  const [searchText, setSearchText] = useState(valueIn)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [hoverRow, setHoverRow] = useState(undefined)
  const defaultCols = useMemo(
    () => [
      {
        title: 'IdSeq',
        id: 'id',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true
      },
      {
        title: 'Type',
        id: 'type',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true
      },
      {
        title: 'Description',
        id: 'description',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true
      }
    ],
    []
  )
  const [cols, setCols] = useState(defaultCols)

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
  const filteredData = Array.isArray(allowedValues)
    ? allowedValues.filter((item) => {
        if (!searchText) return true

        const normalizeText = (text) =>
          typeof text === 'string' || typeof text === 'number'
            ? text.toString().toLowerCase().trim()
            : ''

        const search = normalizeText(searchText)
        const propertiesToSearch = ['id', 'type', 'description']

        return propertiesToSearch.some((attr) => {
          const value = item[attr]
          return value && normalizeText(value).includes(search)
        })
      })
    : []

  const handleRowClick = (record) => {
    onFinishedEditing({
      ...cell,
      data: [record]
    })
  }

  const handleOnChange = (val) => {
    setSearchText(val.target.value)
    setIsOpen(true)
  }

  const handleCellClick = (cell) => {
    const rowIndex = cell[1]
    if (rowIndex >= 0 && rowIndex < filteredData.length) {
      handleRowClick(filteredData[rowIndex])
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

  if (cell.readonly) {
    return (
      <div className="p-2">
        <TextCellEntry highlight={true} autoFocus={false} disabled={true} />
      </div>
    )
  }

  const getData = useCallback(
    ([col, row]) => {
      const person = filteredData[row] || {}
      const column = cols[col]
      const columnKey = column?.id || ''
      const value = person[columnKey] || ''

      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: String(value),
        readonly: column?.readonly || false,
        allowOverlay: true,
        hasMenu: column?.hasMenu || false
      }
    },
    [filteredData, cols]
  )
  const onColumnResize = useCallback(
    (column, newSize) => {
      const index = cols.findIndex((col) => col.title === column.title)
      if (index !== -1) {
        const newCol = {
          ...column,
          width: newSize
        }
        const newCols = [...cols]
        newCols.splice(index, 1, newCol)
        setCols(newCols)
      }
    },
    [cols]
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
          <span> </span>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-red-500 hover:bg-slate-200 p-1 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </h2>
        <div className="p-2 border-b border-t">
          <div className="w-full flex gap-2  items-center">
            <button className="rounded-lg hover:bg-slate-50 flex items-center justify-center ">
              <SearchOutlined className="opacity-80 text-sm" />
            </button>

            <input
              className="h-full w-full border-none focus:outline-none bg-inherit"
              value={searchText}
              autoFocus={true}
              onChange={handleOnChange}
              maxLength={500}
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
        <div className="flex-1">
          <DataEditor
            width="100%"
            height="100%"
            className="cursor-pointer"
            rows={filteredData.length}
            columns={cols}
            getCellContent={getData}
            headerHeight={27}
            getRowThemeOverride={(rowIndex) => {
              if (rowIndex === hoverRow) {
                return {
                  bgCell: '#f7f7f7',
                  bgCellMedium: '#f0f0f0'
                }
              }
              return undefined
            }}
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
        <div className="w-full p-2 flex gap-2 items-center border-t rounded-b-lg bg-slate-100">
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

export const CellsMenuType = {
  kind: GridCellKind.Custom,
  isMatch: (c) => c.data.kind === 'menu-type-cell',
  draw: (args, cell) => {
    const { ctx, theme, rect } = args
    const { value } = cell.data
    if (value) {
      ctx.fillStyle = theme.textDark
      ctx.fillText(
        value,
        rect.x + theme.cellHorizontalPadding,
        rect.y + rect.height / 2 + getMiddleCenterBias(ctx, theme)
      )
    }
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

  onPaste: (v, d) => {
    const normalizeText = (text) =>
      typeof text === 'string' || typeof text === 'number'
        ? text.toString().trim().toLowerCase().normalize('NFC')
        : ''

    const pastedValue = normalizeText(v)

    if (!Array.isArray(d.allowedValues)) {
      console.error('allowedValues is not an array or is undefined:', d.allowedValues)
      return []
    }

    const matchedValues = d.allowedValues.filter((item) =>
      ['id', 'type', 'description'].some((attr) => {
        const value = item[attr]
        return value && normalizeText(value) === pastedValue
      })
    )

    return matchedValues
  }
}
