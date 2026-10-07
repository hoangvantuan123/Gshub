/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  X,
  Maximize2,
  Minimize2,
  Search,
  Check,
  RotateCcw,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { useTranslation } from 'react-i18next'
import { DEFAULT_GRID_THEME } from '../../hooks/sheet/useTableCellTheme'
import { useTableClipboard } from '../../../hooks/useTableClipboard'
import {
  loadFromLocalStorageSheet,
  saveToLocalStorageSheet
} from '@renderer/localStorage/sheet/sheet'

// Static theme & cell objects allocated once outside React render cycle (Zero GC overhead)
const SELECTED_ROW_THEME = { bgCell: '#eef6ff', bgCellMedium: '#e0effe' }
const BLANK_TEXT_CELL = Object.freeze({
  kind: GridCellKind.Text,
  data: '',
  displayData: '',
  readonly: true,
  allowOverlay: false
})
const CHECKED_BOOL_CELL = Object.freeze({
  kind: GridCellKind.Boolean,
  data: true,
  allowOverlay: false,
  readonly: false,
  contentAlign: 'center'
})
const UNCHECKED_BOOL_CELL = Object.freeze({
  kind: GridCellKind.Boolean,
  data: false,
  allowOverlay: false,
  readonly: false,
  contentAlign: 'center'
})

if (typeof window !== 'undefined' && !window.__pointerTrackerInitialized) {
  window.__pointerTrackerInitialized = true
  window.__lastPointerPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.clientX || e.clientY) {
        window.__lastPointerPos = { x: e.clientX, y: e.clientY }
      }
    },
    true
  )
}

const PAGE_SIZE = 50

/**
 * GenericCodeHelpModal - Modal Tra cứu CodeHelp ERP dạng Sheet chuẩn
 * Hỗ trợ chọn ô & copy dữ liệu (Ctrl+C, Ctrl+Shift+C copy kèm Header, Ctrl+A),
 * chọn checkbox hoặc click đúp 2 lần để chọn dòng, Footer chỉ giữ lại 2 nút thao tác.
 */
export default function GenericCodeHelpModal({
  isOpen = false,
  onClose,
  title = 'Tra cứu danh mục',
  helpData = [],
  fetchHelpData = null,
  columns = [],
  onSelect,
  isMultiSelect = false,
  searchPlaceholder = '',
  initialSearchText = '',
  storageKey = ''
}) {
  const { t } = useTranslation()

  // Tạo Storage Key đặc thù cho từng bảng CodeHelp để ghi nhớ cache độ rộng cột
  const effectiveStorageKey = useMemo(() => {
    if (storageKey) return `codehelp_col_widths_${storageKey}`
    if (columns && columns.length > 0) {
      const colSignature = columns
        .map((c) => c.id || c.title)
        .filter(Boolean)
        .join('_')
      return `codehelp_col_widths_${colSignature}`
    }
    return `codehelp_col_widths_${String(title || 'default').replace(/\s+/g, '_')}`
  }, [storageKey, columns, title])

  // Search States
  const [searchColumn, setSearchColumn] = useState('ALL')
  const [searchText, setSearchText] = useState(initialSearchText || '')
  const [appliedKeyword, setAppliedKeyword] = useState(initialSearchText || '')

  // Server Data & Pagination States
  const [serverList, setServerList] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Custom Dropdown State
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false)
  const colDropdownRef = useRef(null)

  // Selection States (Checkbox chọn dòng + Sheet cell selection hỗ trợ copy)
  const [selectedRowIndices, setSelectedRowIndices] = useState(new Set())
  const [gridSelection, setGridSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // UI States
  const [isMaximized, setIsMaximized] = useState(false)
  const [customWidths, setCustomWidths] = useState(() => {
    return loadFromLocalStorageSheet(effectiveStorageKey, {})
  })
  const [containerWidth, setContainerWidth] = useState(0)
  const gridContainerRef = useRef(null)
  const lastClickRef = useRef({ time: 0, cell: null })
  const inputRef = useRef(null)

  // Theo dõi kích thước container thực tế để tự động dãn các cột lấp đầy bảng (Auto Stretch / Fit)
  useEffect(() => {
    const el = gridContainerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width))
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Khi mở modal, tải lại cấu hình độ rộng đã lưu từ localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = loadFromLocalStorageSheet(effectiveStorageKey, null)
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        setCustomWidths(saved)
      }
    }
  }, [isOpen, effectiveStorageKey])

  // Tính toán Origin đồng bộ ngay khi render (Zero lag, không gây re-render)
  const clickOrigin = useMemo(() => {
    if (!isOpen) return '50% 50%'
    const clickPos = (typeof window !== 'undefined' && window.__lastPointerPos) || {
      x: (typeof window !== 'undefined' ? window.innerWidth : 1200) / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 800) / 2
    }
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800
    const modalWidth = Math.min(winW * 0.92, 1000)
    const modalHeight = Math.min(winH * 0.78, 640)
    const left = (winW - modalWidth) / 2
    const top = (winH - modalHeight) / 2
    const ox = Math.round(clickPos.x - left)
    const oy = Math.round(clickPos.y - top)
    return `${ox}px ${oy}px`
  }, [isOpen])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!isColumnDropdownOpen) return

    const handleClickOutside = (e) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) {
        setIsColumnDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isColumnDropdownOpen])

  // Cấu hình danh sách cột thuần useMemo (Cột 0 là Checkbox "Chọn", tự động giãn cách độ rộng cột lấp đầy khung)
  const cols = useMemo(() => {
    const selectColWidth = customWidths.__selection__ || 48
    const selectCol = {
      title: t('Chọn'),
      id: '__selection__',
      width: selectColWidth,
      kind: 'Boolean',
      readonly: false,
      hasMenu: false
    }

    let rawDataCols = []
    if (columns && columns.length > 0) {
      rawDataCols = columns.map((col) => ({
        title: t(col.title || col.id),
        id: col.id,
        kind: 'Text',
        readonly: true,
        baseWidth: col.width || 180,
        hasMenu: true,
        ...col
      }))
    } else {
      rawDataCols = [
        {
          title: t('Mã / ID'),
          id: 'Code',
          kind: 'Text',
          readonly: true,
          baseWidth: 160,
          hasMenu: true
        },
        {
          title: t('Tên / Mô tả'),
          id: 'Name',
          kind: 'Text',
          readonly: true,
          baseWidth: 350,
          hasMenu: true
        }
      ]
    }

    // Row markers in Glide Data Grid take ~40px
    const rowMarkerWidth = 40
    const availableDataWidth =
      containerWidth > 0 ? containerWidth - selectColWidth - rowMarkerWidth - 4 : 0

    // Kiểm tra xem người dùng có tự kéo thả điều chỉnh kích thước cột thủ công không
    const hasManualWidths = rawDataCols.some((col) => customWidths[col.id] !== undefined)

    if (hasManualWidths || availableDataWidth <= 0) {
      const finalDataCols = rawDataCols.map((col) => ({
        ...col,
        width: customWidths[col.id] || col.baseWidth || col.width || 180
      }))
      return [selectCol, ...finalDataCols]
    }

    // Tự động phân bổ dãn đều độ rộng các cột để phủ kín 100% khung modal
    const totalBaseWidth = rawDataCols.reduce(
      (sum, col) => sum + (col.baseWidth || col.width || 180),
      0
    )

    if (availableDataWidth > totalBaseWidth && totalBaseWidth > 0) {
      const ratio = availableDataWidth / totalBaseWidth
      let allocatedWidth = 0
      const finalDataCols = rawDataCols.map((col, idx) => {
        if (idx === rawDataCols.length - 1) {
          const lastWidth = Math.max(col.baseWidth || 100, availableDataWidth - allocatedWidth)
          return { ...col, width: lastWidth }
        }
        const w = Math.max(
          col.baseWidth || 100,
          Math.floor((col.baseWidth || col.width || 180) * ratio)
        )
        allocatedWidth += w
        return { ...col, width: w }
      })
      return [selectCol, ...finalDataCols]
    } else {
      const finalDataCols = rawDataCols.map((col) => ({
        ...col,
        width: col.baseWidth || col.width || 180
      }))
      return [selectCol, ...finalDataCols]
    }
  }, [columns, customWidths, containerWidth, t])

  const fetchHelpDataRef = useRef(fetchHelpData)
  fetchHelpDataRef.current = fetchHelpData

  const helpDataRef = useRef(helpData)
  helpDataRef.current = helpData

  const searchColumnRef = useRef(searchColumn)
  searchColumnRef.current = searchColumn

  const appliedKeywordRef = useRef(appliedKeyword)
  appliedKeywordRef.current = appliedKeyword

  // Hàm tải dữ liệu trang đầu tiên (Page 1)
  const loadFirstPage = useCallback(async (keyword = '', col = 'ALL') => {
    const fetchFn = fetchHelpDataRef.current
    if (!fetchFn) return
    setIsLoading(true)
    try {
      const data = await fetchFn(keyword, 1, PAGE_SIZE, col)
      const list = Array.isArray(data) ? data : []
      setServerList(list)
      setPage(1)
      setHasMore(list.length >= PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load first page help data:', err)
      setServerList([])
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Hàm tải trang tiếp theo khi cuộn xuống đáy (Infinite Scroll)
  const loadNextPage = useCallback(async () => {
    const fetchFn = fetchHelpDataRef.current
    if (!fetchFn || !hasMore || isLoadingMore || isLoading) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const data = await fetchFn(
        appliedKeywordRef.current,
        nextPage,
        PAGE_SIZE,
        searchColumnRef.current
      )
      const list = Array.isArray(data) ? data : []
      if (list.length > 0) {
        setServerList((prev) => [...prev, ...list])
        setPage(nextPage)
        setHasMore(list.length >= PAGE_SIZE)
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load next page help data:', err)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, isLoading, page])

  const lastSearchedRef = useRef({ text: '', col: 'ALL' })
  const lastSearchTimeRef = useRef(0)

  // Reset & Auto-focus khi mở Modal
  useEffect(() => {
    if (isOpen) {
      const initText = String(initialSearchText || '').trim()
      setSearchText(initialSearchText || '')
      setAppliedKeyword(initText)
      setSearchColumn('ALL')
      lastSearchedRef.current = { text: initText, col: 'ALL' }
      setSelectedRowIndices(new Set())
      setIsMaximized(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })

      if (fetchHelpDataRef.current) {
        loadFirstPage(initText, 'ALL')
      } else {
        setServerList(Array.isArray(helpDataRef.current) ? helpDataRef.current : [])
      }
    } else {
      // Giải phóng bộ nhớ RAM ngay khi đóng modal
      setServerList([])
      setSelectedRowIndices(new Set())
    }
  }, [isOpen])

  // Phím tắt Escape toàn cục để đóng Modal
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose && onClose()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [isOpen, onClose])

  // Kích hoạt tìm kiếm chuẩn ERP đồng bộ (Enter và Nút Tìm kiếm dùng chung 1 logic duy nhất)
  const handleTriggerSearch = useCallback(
    ({ isForce = false } = {}) => {
      if (isLoading || isLoadingMore) return

      const now = Date.now()
      // Chống spam click liên hồi (< 350ms)
      if (now - lastSearchTimeRef.current < 350) {
        return
      }

      const cleanText = String(searchText || '').trim()
      const isChanged =
        cleanText !== lastSearchedRef.current.text || searchColumn !== lastSearchedRef.current.col

      // Nếu điều kiện không đổi và đã có data hiển thị -> không gọi lại tìm kiếm thừa thãi
      if (!isChanged && !isForce && (serverList.length > 0 || !fetchHelpDataRef.current)) {
        return
      }

      lastSearchTimeRef.current = now
      lastSearchedRef.current = { text: cleanText, col: searchColumn }
      setAppliedKeyword(cleanText)
      if (fetchHelpDataRef.current) {
        loadFirstPage(cleanText, searchColumn)
      }
    },
    [searchText, searchColumn, isLoading, isLoadingMore, serverList.length, loadFirstPage]
  )

  const handleSelectColumn = useCallback((colId) => {
    setSearchColumn(colId)
    setIsColumnDropdownOpen(false)
  }, [])

  // Dữ liệu hiển thị (kết hợp Client Filter nếu dùng static data, hoặc Server Data)
  const filteredData = useMemo(() => {
    const rawList = fetchHelpData ? serverList : Array.isArray(helpData) ? helpData : []
    const keyword = String(appliedKeyword || '')
      .trim()
      .toLowerCase()
      .replace(/%/g, '')

    if (fetchHelpData) return rawList
    if (!keyword) return rawList

    const targetColIds =
      searchColumn === 'ALL'
        ? cols.filter((c) => c.id !== '__selection__').map((c) => c.id)
        : [searchColumn]

    return rawList.filter((item) => {
      if (!item) return false
      return targetColIds.some((colId) => {
        const val = item[colId]
        if (val === null || val === undefined) return false
        return String(val).toLowerCase().includes(keyword)
      })
    })
  }, [fetchHelpData, serverList, helpData, appliedKeyword, searchColumn, cols])

  // Hook quản lý Copy dữ liệu Sheet (Hỗ trợ Ctrl+Shift+C copy kèm Header)
  const { copySelection } = useTableClipboard({
    gridData: filteredData,
    cols,
    selection: gridSelection
  })

  // Xử lý sự kiện cuộn Glide Data Grid (Infinite Scroll)
  const onVisibleRegionChanged = useCallback(
    (range) => {
      if (!fetchHelpData || !hasMore || isLoadingMore) return
      const currentCount = filteredData.length
      if (range.y + range.height >= currentCount - 3) {
        loadNextPage()
      }
    },
    [fetchHelpData, hasMore, isLoadingMore, filteredData.length, loadNextPage]
  )

  // Nhãn cột đang chọn
  const selectedColLabel = useMemo(() => {
    if (searchColumn === 'ALL') return t('Tất cả cột')
    const found = cols.find((c) => c.id === searchColumn)
    return found?.title || t('Tất cả cột')
  }, [searchColumn, cols, t])

  // Đổi trạng thái chọn dòng qua checkbox
  const toggleRowSelection = useCallback(
    (rowIndex) => {
      setSelectedRowIndices((prev) => {
        const next = new Set(isMultiSelect ? prev : [])
        if (next.has(rowIndex)) {
          next.delete(rowIndex)
        } else {
          next.add(rowIndex)
        }
        return next
      })
    },
    [isMultiSelect]
  )

  // Xác nhận chọn và đóng Modal
  const handleConfirmSelect = useCallback(
    (singleItem = null) => {
      if (singleItem) {
        onSelect && onSelect(singleItem)
        onClose && onClose()
        return
      }

      const selectedItems = Array.from(selectedRowIndices)
        .map((idx) => filteredData[idx])
        .filter(Boolean)

      if (selectedItems.length > 0) {
        if (isMultiSelect) {
          onSelect && onSelect(selectedItems)
        } else {
          onSelect && onSelect(selectedItems[0])
        }
        onClose && onClose()
      } else if (gridSelection?.current?.cell) {
        // Nếu người dùng đang focus vào 1 ô cụ thể và bấm Áp dụng
        const activeRow = gridSelection.current.cell[1]
        if (activeRow >= 0 && activeRow < filteredData.length) {
          onSelect && onSelect(filteredData[activeRow])
          onClose && onClose()
        }
      } else if (filteredData.length > 0) {
        onSelect && onSelect(filteredData[0])
        onClose && onClose()
      }
    },
    [selectedRowIndices, filteredData, isMultiSelect, onSelect, onClose, gridSelection]
  )

  // Cung cấp dữ liệu từng ô cho Glide Data Grid
  const getCellContent = useCallback(
    ([col, row]) => {
      const column = cols[col]
      if (!column) return BLANK_TEXT_CELL

      const rowItem = filteredData[row]
      if (!rowItem) return BLANK_TEXT_CELL

      if (column.id === '__selection__') {
        const isChecked = selectedRowIndices.has(row)
        return isChecked ? CHECKED_BOOL_CELL : UNCHECKED_BOOL_CELL
      }

      const rawVal = rowItem[column.id]
      const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : ''

      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        readonly: true,
        allowOverlay: false
      }
    },
    [cols, filteredData, selectedRowIndices]
  )

  // Theme override cho dòng được chọn (Zero overhead)
  const getRowThemeOverride = useCallback(
    (rowIndex) => {
      if (selectedRowIndices.has(rowIndex)) {
        return SELECTED_ROW_THEME
      }
      return undefined
    },
    [selectedRowIndices]
  )

  // Xử lý Click & Click đúp
  const handleCellClick = useCallback(
    ([col, row], event) => {
      if (row < 0 || row >= filteredData.length) return
      const rowItem = filteredData[row]
      const column = cols[col]

      const now = Date.now()
      const isDouble =
        (event && event.detail === 2) ||
        (now - lastClickRef.current.time < 300 &&
          lastClickRef.current.cell &&
          lastClickRef.current.cell[0] === col &&
          lastClickRef.current.cell[1] === row)

      lastClickRef.current = { time: now, cell: [col, row] }

      // 1. Click đúp 2 lần -> Chọn ngay dòng đó và đóng modal
      if (isDouble) {
        handleConfirmSelect(rowItem)
        return
      }

      // 2. Click đơn trên cột Checkbox (__selection__)
      if (column?.id === '__selection__') {
        toggleRowSelection(row)
      }
    },
    [filteredData, cols, handleConfirmSelect, toggleRowSelection]
  )

  // Toggle checkbox khi edit ô boolean trong Glide Data Grid
  const handleCellEdited = useCallback(
    ([col, row], cell) => {
      const column = cols[col]
      if (column?.id === '__selection__' && row >= 0 && row < filteredData.length) {
        if (cell && typeof cell.data === 'boolean') {
          setSelectedRowIndices((prev) => {
            const next = new Set(isMultiSelect ? prev : [])
            if (cell.data) {
              next.add(row)
            } else {
              next.delete(row)
            }
            return next
          })
        }
      }
    },
    [cols, filteredData.length, isMultiSelect]
  )

  const onColumnResize = useCallback(
    (column, newSize) => {
      if (column?.id) {
        setCustomWidths((prev) => {
          const next = { ...prev, [column.id]: newSize }
          saveToLocalStorageSheet(effectiveStorageKey, next)
          return next
        })
      }
    },
    [effectiveStorageKey]
  )

  // Phím tắt bàn phím trên Sheet (Ctrl+Shift+C copy Header, Ctrl+C copy dữ liệu, Enter chọn)
  const onKeyDown = useCallback(
    (event) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey
      const key = event.key ? event.key.toLowerCase() : ''

      // 1. Enter: Nếu đang focus trên ô của dòng nào thì chọn luôn dòng đó và đóng
      if (event.key === 'Enter' && !isCtrlOrMeta) {
        if (gridSelection?.current?.cell) {
          const row = gridSelection.current.cell[1]
          if (row >= 0 && row < filteredData.length) {
            event.preventDefault()
            event.stopPropagation()
            handleConfirmSelect(filteredData[row])
            return
          }
        }
      }

      // 2. Ctrl + Shift + C: Sao chép kèm tiêu đề cột (Header)
      if (isCtrlOrMeta && event.shiftKey && key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        copySelection({ includeHeaders: true })
        return
      }

      // 3. Ctrl + C: Sao chép dữ liệu ô/vùng chọn (không kèm Header)
      if (isCtrlOrMeta && !event.shiftKey && key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        copySelection({ includeHeaders: false })
        return
      }

      // 4. Ctrl + A: Chọn toàn bộ dòng dữ liệu
      if (isCtrlOrMeta && key === 'a' && !event.shiftKey && !event.altKey) {
        if (filteredData.length > 0) {
          event.preventDefault()
          event.stopPropagation()
          setGridSelection({
            columns: CompactSelection.empty().add([0, cols.length]),
            rows: CompactSelection.empty().add([0, filteredData.length])
          })
          return
        }
      }
    },
    [gridSelection, filteredData, handleConfirmSelect, copySelection, cols.length]
  )

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[99999] transition-[padding] duration-200 ease-out ${
        isMaximized ? 'p-0' : 'p-3 sm:p-5'
      }`}
      style={{
        animation: 'macBackdropFade 0.15s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose && onClose()
        }
      }}
    >
      <style>{`
        @keyframes macBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes macOriginIn {
          0% {
            opacity: 0;
            transform: scale(0.88);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      <div
        className={`bg-[#f8fafc] flex flex-col shadow-2xl border font-sans rounded-none select-none transition-[width,height,max-width,max-height,transform] duration-200 ease-out transform-gpu will-change-[width,height,transform] ${
          isMaximized
            ? 'w-full h-full max-w-full max-h-full border-0'
            : 'w-[92vw] max-w-[1000px] h-[78vh] max-h-[640px] min-h-[380px] border-slate-500'
        }`}
        style={{
          transformOrigin: isMaximized ? '50% 50%' : clickOrigin,
          animation: 'macOriginIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER DIALOG VUÔNG LIỀN MẠCH */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#f1f5f9] border-b border-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase truncate">
              {t(title)}
            </span>
            {isLoading && <Loader2 size={13} className="animate-spin text-blue-600 ml-1" />}
          </div>

          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? t('Thu nhỏ') : t('Phóng to')}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors rounded-none cursor-pointer"
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title={t('Đóng (Esc)')}
              className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-100 transition-colors rounded-none cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 2. TOOLBAR TÌM KIẾM GỌN GÀNG (FULL WIDTH) */}
        <div className="bg-white border-b border-slate-300 flex items-stretch relative z-30 h-8">
          <div className="flex-1 flex items-stretch border-0 rounded-none bg-white h-full relative">
            {/* Dropdown chọn cột */}
            <div
              ref={colDropdownRef}
              className="relative flex items-center h-full shrink-0 w-[140px]"
            >
              <button
                type="button"
                onClick={() => setIsColumnDropdownOpen((prev) => !prev)}
                className="h-full w-full px-2.5 bg-slate-50 hover:bg-slate-100 border-r border-slate-300 text-xs font-semibold text-slate-700 outline-none cursor-pointer rounded-none flex items-center justify-between select-none transition-colors"
              >
                <span className="truncate max-w-[105px]">{selectedColLabel}</span>
                <ChevronDown
                  size={12}
                  className={`text-slate-500 shrink-0 transition-transform duration-150 stroke-[2.2] ${
                    isColumnDropdownOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {/* Menu xổ xuống */}
              {isColumnDropdownOpen && (
                <div className="absolute left-0 top-full mt-[1px] w-full min-w-[140px] bg-white border border-slate-300 shadow-2xl z-[99999] rounded-none py-0.5 max-h-60 overflow-y-auto">
                  <div
                    onClick={() => handleSelectColumn('ALL')}
                    className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      searchColumn === 'ALL'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t('Tất cả cột')}</span>
                    {searchColumn === 'ALL' && <Check size={12} />}
                  </div>
                  {cols
                    .filter((c) => c.id !== '__selection__')
                    .map((col) => (
                      <div
                        key={col.id}
                        onClick={() => handleSelectColumn(col.id)}
                        className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          searchColumn === col.id
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{col.title}</span>
                        {searchColumn === col.id && <Check size={12} />}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Ký tự % mở đầu */}
            <span className="px-2.5 text-blue-600 font-bold text-xs bg-slate-50 border-r border-slate-200 flex items-center justify-center select-none h-full">
              %
            </span>

            {/* Input tìm kiếm */}
            <input
              ref={inputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTriggerSearch({ isForce: true })
                } else if (e.key === 'Escape') {
                  onClose && onClose()
                }
              }}
              placeholder={searchPlaceholder || t('Nhập từ khóa tìm kiếm...')}
              className="flex-1 px-3 text-xs text-slate-800 outline-none border-none bg-transparent rounded-none h-full"
              autoFocus
            />

            {/* Ký tự % kết thúc */}
            <span className="px-2.5 text-blue-600 font-bold text-xs bg-slate-50 border-l border-slate-200 flex items-center justify-center select-none h-full">
              %
            </span>

            {/* Nút Xóa / Đặt lại */}
            {searchText && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('')
                  if (lastSearchedRef.current.text !== '') {
                    lastSearchedRef.current = { text: '', col: searchColumn }
                    setAppliedKeyword('')
                    if (fetchHelpDataRef.current) loadFirstPage('', searchColumn)
                  }
                }}
                title={t('Xóa tìm kiếm')}
                className="px-2.5 text-slate-400 hover:text-slate-700 bg-white flex items-center justify-center border-l border-slate-200 h-full cursor-pointer"
              >
                <X size={14} />
              </button>
            )}

            {/* Nút Tìm kiếm 🔍 */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleTriggerSearch({ isForce: true })}
              title={t('Tìm kiếm (Enter)')}
              className="bg-[#1677ff] hover:bg-[#0958d9] disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed text-white px-3.5 flex items-center justify-center transition-colors cursor-pointer border-l border-blue-600 rounded-none h-full"
            >
              <Search size={15} className="stroke-[2.5]" />
            </button>

            {/* Nút Đặt lại bộ lọc */}
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setSearchText('')
                setSearchColumn('ALL')
                lastSearchedRef.current = { text: '', col: 'ALL' }
                setAppliedKeyword('')
                if (fetchHelpDataRef.current) loadFirstPage('', 'ALL')
              }}
              title={t('Đặt lại bộ lọc')}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 px-3 flex items-center justify-center transition-colors cursor-pointer border-l border-slate-300 rounded-none h-full"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* 3. GLIDE DATA GRID SHEET VUÔNG LIỀN MẠCH HỖ TRỢ COPY & PHÍM TẮT */}
        <div
          ref={gridContainerRef}
          className="flex-1 w-full relative bg-white overflow-hidden border-b border-slate-300"
        >
          <DataEditor
            width="100%"
            height="100%"
            rows={filteredData.length}
            columns={cols}
            getCellContent={getCellContent}
            headerHeight={26}
            rowHeight={24}
            rowMarkers="number"
            gridSelection={gridSelection}
            onGridSelectionChange={setGridSelection}
            getCellsForSelection={true}
            onPaste={true}
            fillHandle={false}
            isDraggable={false}
            smoothScrollX={true}
            smoothScrollY={true}
            overscrollX={0}
            overscrollY={0}
            onVisibleRegionChanged={onVisibleRegionChanged}
            onColumnResize={onColumnResize}
            onCellClicked={handleCellClick}
            onCellEdited={handleCellEdited}
            onKeyDown={onKeyDown}
            getRowThemeOverride={getRowThemeOverride}
            theme={DEFAULT_GRID_THEME}
          />
        </div>

        {/* 4. FOOTER CONTROLS VUÔNG LIỀN MẠCH - CHỈ CÒN 2 NÚT THAO TÁC CĂN PHẢI */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-[#f8fafc] border-t border-slate-300">
          <button
            type="button"
            onClick={() => handleConfirmSelect()}
            disabled={filteredData.length === 0}
            className="px-4 py-1.5 bg-[#1677ff] hover:bg-[#0958d9] disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 text-white font-semibold text-xs rounded-none shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed border border-[#1677ff]"
          >
            <Check size={13} className="stroke-[2.5]" />
            {t('Áp dụng')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-none border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            {t('Đóng')}
          </button>
        </div>
      </div>
    </div>
  )
}
