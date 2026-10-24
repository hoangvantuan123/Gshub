/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Download, Copy, Search, Save, ArrowLeft, Check, X } from 'lucide-react'
import {
  DataEditor,
  GridCellKind,
  CompactSelection,
  GridColumnIcon
} from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { Button } from '@renderer/components/ui/button'
import { DEFAULT_GRID_THEME } from '@renderer/user/components/hooks/sheet/useTableCellTheme'
import {
  queryPlanReconciliation,
  updatePlanReconciliation
} from '@renderer/user/page/report/registration/services/planRegistrationService'
import { queryProdStatsRemarkTypes } from '@renderer/user/page/report/registration/remarkType/remarkTypeService'
import useTableManager from '@renderer/user/components/hooks/sheet/useTableManager'
import LayoutMenuSheet from '@renderer/user/components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '@renderer/user/components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '@renderer/user/components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox, message } from 'antd'
import SystemConfirmModal from '@renderer/user/components/modal/SystemConfirmModal'
import GenericCodeHelpModal from '@renderer/user/components/query/core/GenericCodeHelpModal'
import { reorderColumns } from '@renderer/user/components/sheet/js/reorderColumns'

const PLAN_AUDIT_COLUMNS = [
  {
    id: 'remarkType',
    title: 'Phân loại',
    width: 160,
    hasMenu: true,
    kind: 'Text',
    icon: GridColumnIcon.HeaderString
  },
  {
    id: 'remarkDescription',
    title: 'Diễn giải',
    width: 240,
    hasMenu: true,
    kind: 'Text',
    icon: GridColumnIcon.HeaderString
  },
  { id: 'docNo', title: 'Số LSX', width: 135, hasMenu: true },
  { id: 'orderNo', title: 'Lệnh công đoạn', width: 120, hasMenu: true },
  { id: 'dpStatus', title: 'Trạng thái ĐP-SX', width: 155, hasMenu: true },
  { id: 'timeStatus', title: 'Trạng thái Thời gian', width: 145, hasMenu: true },
  { id: 'capaStatus', title: 'Trạng thái Capa', width: 135, hasMenu: true },
  { id: 'pic', title: 'PIC Điều phối', width: 130, hasMenu: true },
  { id: 'planDate', title: 'Ngày KH', width: 95, hasMenu: true },
  { id: 'actualDate', title: 'Ngày thực tế', width: 95, hasMenu: true },
  { id: 'planQty', title: 'SL Kế hoạch', width: 105, hasMenu: true },
  { id: 'actualQty', title: 'SL Thực tế', width: 105, hasMenu: true },
  { id: 'completionRate', title: 'Tỷ lệ HT', width: 80, hasMenu: true },
  { id: 'machineCode', title: 'Mã máy', width: 100, hasMenu: true },
  { id: 'machineName', title: 'Tên máy', width: 160, hasMenu: true },
  { id: 'itemCode', title: 'Mã sản phẩm', width: 130, hasMenu: true },
  { id: 'itemName', title: 'Tên sản phẩm', width: 230, hasMenu: true },
  { id: 'customer', title: 'Khách hàng', width: 180, hasMenu: true },
  { id: 'note', title: 'Ghi chú điều phối', width: 200, hasMenu: true }
]

const WORKING_TAG_COLUMN = {
  id: 'WorkingTag',
  title: '',
  width: 50,
  hasMenu: true,
  readonly: true,
  themeOverride: { textDark: '#0f172a', baseFontStyle: '12px' }
}

const formatDateVN = (dateVal) => {
  if (!dateVal) return ''
  const s = String(dateVal).trim()
  if (!s) return ''
  const matchIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (matchIso) {
    const [, y, m, d] = matchIso
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  const matchVn = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (matchVn) {
    const [, d, m, y] = matchVn
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, '0')
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const y = dt.getFullYear()
    return `${d}/${m}/${y}`
  }
  return s
}

const READ_ONLY_CELL_THEME = {
  bgCell: '#f8fafc',
  bgCellMedium: '#f1f5f9',
  textDark: '#0f172a',
  baseFontStyle: '12px',
  borderColor: '#cbd5e1'
}

// Màu nền ô CodeHelp chuẩn ERP (xanh lam nhạt dịu #eaf1f8)
const CODE_HELP_CELL_THEME = {
  bgCell: '#eaf1f8',
  bgCellMedium: '#e0ecf7',
  textDark: '#0f172a',
  baseFontStyle: '12px',
  borderColor: '#cbd5e1'
}

const isElectron = typeof window !== 'undefined' && Boolean(window.electron)

let cachedPlanRemarkTypes = null
let planRemarkTypesPromise = null

const fetchPlanRemarkTypesCached = async () => {
  if (cachedPlanRemarkTypes && cachedPlanRemarkTypes.length > 0) return cachedPlanRemarkTypes
  if (planRemarkTypesPromise) return planRemarkTypesPromise

  planRemarkTypesPromise = queryProdStatsRemarkTypes({
    page: 1,
    pageSize: 200,
    IsActive: true
  })
    .then((result) => {
      const records = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.items)
          ? result.data.items
          : []
      cachedPlanRemarkTypes = records
        .filter((item) => item.IsActive !== false && item.IsActive !== 0 && item.IsActive !== '0')
        .map((item) => ({
          IdSeq: item.IdSeq || item.Id || item.idSeq || '',
          TypeCode: String(item.TypeCode || ''),
          TypeName: String(item.TypeName || ''),
          Description: String(item.Description || '')
        }))
      return cachedPlanRemarkTypes
    })
    .catch((err) => {
      console.error('Không thể tải danh mục phân loại KHSX:', err)
      return []
    })
    .finally(() => {
      planRemarkTypesPromise = null
    })

  return planRemarkTypesPromise
}

const REMARK_TYPE_CODEHELP_COLUMNS = [
  { id: 'TypeCode', title: 'Mã phân loại', width: 130 },
  { id: 'TypeName', title: 'Tên phân loại', width: 220 },
  { id: 'Description', title: 'Diễn giải / Ghi chú', width: 340 }
]

// Modal Đối Soát & Chi Tiết Lệnh Kế Hoạch Điều Phối Sản Xuất
export const PlanAuditDetailModal = ({
  isOpen,
  onClose,
  initialCategory = 'ALL',
  data = [],
  plantName = 'Kế hoạch sản xuất',
  plantKey = 'hanoi_gs1',
  masterSeq = '',
  regCode = '',
  localOnly = true,
  showWorkingTag = true,
  maskText = (t) => t
}) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPic, setSelectedPic] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const rowHeight = 23
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [columnWidths, setColumnWidths] = useState({})
  const [columnOrder, setColumnOrder] = useState(() => [
    ...(showWorkingTag ? [WORKING_TAG_COLUMN.id] : []),
    ...PLAN_AUDIT_COLUMNS.map((c) => c.id)
  ])
  const [hiddenColumns, setHiddenColumns] = useState([])
  const [annotations, setAnnotations] = useState({})
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false)
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
  const [dirtyAnnotations, setDirtyAnnotations] = useState({})
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [errorModalConfig, setErrorModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger'
  })
  const [remarkTypesList, setRemarkTypesList] = useState(() => cachedPlanRemarkTypes || [])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const gridRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    try {
      localStorage.removeItem(`prod-plan-audit:${plantKey}`)
    } catch {
      // Ignore unavailable local storage.
    }
    setAnnotations({})
    setActiveCategory(initialCategory || 'ALL')
    setSearchQuery('')
    setSelectedPic('ALL')
    setSelectedMachine('ALL')
    setHasUnsavedEdits(false)
    setDirtyAnnotations({})
    setSaveStatus('')
    setShowSearch(false)
    setSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty()
    })

    if (cachedPlanRemarkTypes && cachedPlanRemarkTypes.length > 0) {
      setRemarkTypesList(cachedPlanRemarkTypes)
    } else {
      fetchPlanRemarkTypesCached().then((records) => setRemarkTypesList(records))
    }

    const controller = new AbortController()
    if (!masterSeq && !regCode) {
      setIsLoadingAnnotations(false)
      setSaveStatus('Không xác định được đợt đăng ký để tải nhật trình đã lưu.')
      return () => controller.abort()
    }

    setIsLoadingAnnotations(true)
    queryPlanReconciliation({ masterSeq, regCode }, controller.signal)
      .then((response) => {
        if (response?.isCanceled) return
        if (response?.success === false) throw new Error(response.message || 'Không tải được nhật trình')
        const rows = Array.isArray(response?.data) ? response.data : []
        const loaded = {}
        rows.forEach((row) => {
          const key = String(row.IdSeq || row.DetailIdSeq || '')
          if (!key) return
          loaded[key] = {
            idSeq: key,
            remarkType: '',
            remarkTypeCode: '',
            remarkTypeSeq: row.RemarkTypeSeq || '',
            remarkDescription: row.RemarkContent || '',
            rowVersion: Number(row.RowVersion) || 0
          }
        })
        setAnnotations((previous) => {
          const merged = { ...loaded }
          Object.keys(previous).forEach((key) => {
            merged[key] = { ...(loaded[key] || {}), ...previous[key] }
          })
          return merged
        })
      })
      .catch((error) => {
        if (error?.isCanceled || error?.name === 'CanceledError') return
        setErrorModalConfig({
          isOpen: true,
          title: 'Không tải được nhật trình',
          message: String(error?.message || error),
          type: 'danger'
        })
      })
      .finally(() => setIsLoadingAnnotations(false))

    return () => controller.abort()
  }, [isOpen, initialCategory, plantKey, masterSeq, regCode])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || showCloseConfirm) return
      event.preventDefault()
      event.stopPropagation()
      handleCloseRequest()
    }
    window.addEventListener('keydown', handleEscape, true)
    return () => window.removeEventListener('keydown', handleEscape, true)
  }, [isOpen, showCloseConfirm, hasUnsavedEdits, onClose])

  const remarkTypesForModal = useMemo(() => {
    return [
      {
        IdSeq: '',
        TypeCode: '(Trống)',
        TypeName: '-- Hủy gán phân loại --',
        Description: 'Xóa phân loại cho lệnh này'
      },
      ...remarkTypesList
    ]
  }, [remarkTypesList])

  const getRowKey = useCallback(
    (item) =>
      String(
        item.IdSeq ||
          item.idSeq ||
          item.id ||
          item.docNo ||
          item.orderNo ||
          item.planNo ||
          item.OperationNo ||
          item.RoutingDocNo ||
          ''
      ),
    []
  )

  // Chỉ hiển thị 2 cột Phân loại & Diễn giải trên các tab cần đối soát giải trình (SX_SAI_NGAY, TRUOT_KH).
  // Hai cột ghi chú này không phụ thuộc quyền Edit cấp báo cáo.
  const isAnnotationTab = activeCategory === 'SX_SAI_NGAY' || activeCategory === 'TRUOT_KH'

  const availableAuditColumns = useMemo(() => {
    const baseCols = showWorkingTag
      ? [WORKING_TAG_COLUMN, ...PLAN_AUDIT_COLUMNS]
      : PLAN_AUDIT_COLUMNS
    const mapped = baseCols.map((col) => {
      if (col.id === 'remarkType') {
        return {
          ...col,
          title: 'Phân loại *',
          icon: GridColumnIcon.HeaderString,
          themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
        }
      }
      if (col.id === 'remarkDescription') {
        return {
          ...col,
          title: 'Diễn giải',
          icon: GridColumnIcon.HeaderString,
          readonly: false,
          trailingRowOptions: { disabled: true }
        }
      }
      return col
    })
    if (isAnnotationTab) return mapped
    return mapped.filter((col) => col.id !== 'remarkType' && col.id !== 'remarkDescription')
  }, [isAnnotationTab, showWorkingTag])

  const columns = useMemo(() => {
    let effectiveOrder = [...columnOrder]
    if (isAnnotationTab) {
      // Đẩy 2 cột Phân loại & Diễn giải lên đầu bảng (ngay sau WorkingTag & STT)
      const leadKeys = [
        ...(showWorkingTag ? [WORKING_TAG_COLUMN.id] : []),
        'stt',
        'remarkType',
        'remarkDescription'
      ]
      const remainingKeys = effectiveOrder.filter((id) => !leadKeys.includes(id))
      effectiveOrder = [...leadKeys, ...remainingKeys]
    } else {
      effectiveOrder = effectiveOrder.filter(
        (id) => id !== 'remarkType' && id !== 'remarkDescription'
      )
    }

    return effectiveOrder
      .filter((id) => !hiddenColumns.includes(id))
      .map((id) => {
        const column = availableAuditColumns.find((item) => item.id === id)
        return column ? { ...column, width: columnWidths[id] ?? column.width } : null
      })
      .filter(Boolean)
  }, [
    columnOrder,
    hiddenColumns,
    columnWidths,
    isAnnotationTab,
    availableAuditColumns,
    showWorkingTag
  ])

  const onColumnResize = useCallback(
    (column, width, colIndex) => {
      const colId = column?.id || columns[colIndex]?.id
      if (!colId) return
      setColumnWidths((previous) => ({ ...previous, [colId]: width }))
    },
    [columns]
  )

  const onColumnMoved = useCallback(
    (startIndex, endIndex) => {
      const sourceId = columns[startIndex]?.id
      const targetId = columns[endIndex]?.id
      if (!sourceId || !targetId || sourceId === targetId) return
      setColumnOrder((previous) => {
        const next = [...previous]
        const sourceIndex = next.indexOf(sourceId)
        const targetIndex = next.indexOf(targetId)
        next.splice(sourceIndex, 1)
        next.splice(targetIndex, 0, sourceId)
        return next
      })
    },
    [columns]
  )

  const toggleColumn = (id) => {
    setHiddenColumns((previous) => {
      if (previous.includes(id)) return previous.filter((columnId) => columnId !== id)
      if (previous.length === availableAuditColumns.length - 1) return previous
      return [...previous, id]
    })
  }

  // Kết hợp data với annotations đã lưu và draft dirty edits
  const editableData = useMemo(() => {
    return data.map((item, idx) => {
      const rowKey = getRowKey(item) || `ROW-${idx + 1}`
      const isDirty = Boolean(dirtyAnnotations[rowKey])
      const annotation = annotations[rowKey] || {}
      const workingTag = isDirty ? 'U' : ''

      let remarkType =
        annotation.remarkType !== undefined
          ? annotation.remarkType
          : item.remarkType || item.RemarkTypeName || item.RemarkType || ''
      let remarkTypeCode =
        annotation.remarkTypeCode !== undefined
          ? annotation.remarkTypeCode
          : item.remarkTypeCode || item.RemarkTypeCode || ''
      let remarkTypeSeq =
        annotation.remarkTypeSeq !== undefined
          ? annotation.remarkTypeSeq
          : item.remarkTypeSeq || item.RemarkTypeSeq || ''

      // Đồng bộ hai chiều giữa remarkType (TypeName) và remarkTypeSeq (UUIDv7)
      if (remarkTypeSeq && (!remarkType || remarkType === remarkTypeSeq)) {
        const found = remarkTypesList.find(
          (t) => String(t.IdSeq).trim().toLowerCase() === String(remarkTypeSeq).trim().toLowerCase()
        )
        if (found) {
          remarkType = found.TypeName || ''
          remarkTypeCode = found.TypeCode || ''
        }
      } else if (remarkType && !remarkTypeSeq) {
        const norm = String(remarkType).trim().toLowerCase()
        const found = remarkTypesList.find(
          (t) =>
            String(t.TypeName || '')
              .trim()
              .toLowerCase() === norm ||
            String(t.TypeCode || '')
              .trim()
              .toLowerCase() === norm
        )
        if (found) {
          remarkTypeSeq = found.IdSeq || ''
          remarkTypeCode = found.TypeCode || ''
        }
      }

      const remarkDescription =
        annotation.remarkDescription !== undefined
          ? annotation.remarkDescription
          : item.RemarkContent || item.remarkContent || ''

      return {
        ...item,
        rowKey,
        WorkingTag: workingTag,
        workingTag,
        remarkType,
        remarkTypeCode,
        remarkTypeSeq,
        remarkDescription
      }
    })
  }, [data, annotations, dirtyAnnotations, getRowKey, remarkTypesList])

  // Đếm số lượng từng loại trạng thái ĐP - SX
  const categoryCounts = useMemo(() => {
    let all = data.length
    let sxSaiNgay = 0
    let truotKh = 0
    let khopSl = 0
    let khopJob = 0

    editableData.forEach((d) => {
      const st = d.dpStatusCode || d.dpStatus || d.StatusDpSx
      if (st === 'SX_SAI_NGAY' || String(d.dpStatusText || d.dpStatus || '').includes('sai ngày')) {
        sxSaiNgay++
      } else if (
        st === 'TRUOT_KH' ||
        String(d.dpStatusText || d.dpStatus || '').includes('Trượt')
      ) {
        truotKh++
      } else if (
        st === 'KHOP_SL' ||
        String(d.dpStatusText || d.dpStatus || '').includes('Khớp số lượng')
      ) {
        khopSl++
      } else if (
        st === 'KHOP_JOB' ||
        String(d.dpStatusText || d.dpStatus || '').includes('Khớp job')
      ) {
        khopJob++
      }
    })

    return { all, sxSaiNgay, truotKh, khopSl, khopJob }
  }, [editableData, data.length])

  // Lọc dữ liệu theo Category + Search Query + PIC + Machine
  const filteredData = useMemo(() => {
    return editableData.filter((item) => {
      const st = item.dpStatusCode || item.dpStatus || item.StatusDpSx
      if (activeCategory !== 'ALL') {
        if (
          activeCategory === 'SX_SAI_NGAY' &&
          st !== 'SX_SAI_NGAY' &&
          !String(item.dpStatusText || item.dpStatus || '').includes('sai ngày')
        )
          return false
        if (
          activeCategory === 'TRUOT_KH' &&
          st !== 'TRUOT_KH' &&
          !String(item.dpStatusText || item.dpStatus || '').includes('Trượt')
        )
          return false
        if (
          activeCategory === 'KHOP_SL' &&
          st !== 'KHOP_SL' &&
          !String(item.dpStatusText || item.dpStatus || '').includes('Khớp số lượng')
        )
          return false
        if (
          activeCategory === 'KHOP_JOB' &&
          st !== 'KHOP_JOB' &&
          !String(item.dpStatusText || item.dpStatus || '').includes('Khớp job')
        )
          return false
      }

      if (selectedPic !== 'ALL' && item.pic !== selectedPic && item.PicDp !== selectedPic) {
        return false
      }
      if (
        selectedMachine !== 'ALL' &&
        item.machineCode !== selectedMachine &&
        item.machineName !== selectedMachine &&
        item.MachineName !== selectedMachine
      ) {
        return false
      }

      if (searchQuery.trim()) {
        const queries = searchQuery
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)

        if (queries.length > 0) {
          const match = queries.some((q) => {
            return (
              (item.docNo && item.docNo.toLowerCase().includes(q)) ||
              (item.orderNo && item.orderNo.toLowerCase().includes(q)) ||
              (item.planNo && item.planNo.toLowerCase().includes(q)) ||
              (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
              (item.itemName && item.itemName.toLowerCase().includes(q)) ||
              (item.customer && item.customer.toLowerCase().includes(q)) ||
              (item.machineCode && item.machineCode.toLowerCase().includes(q)) ||
              (item.machineName && item.machineName.toLowerCase().includes(q)) ||
              (item.pic && item.pic.toLowerCase().includes(q)) ||
              (item.remarkType && item.remarkType.toLowerCase().includes(q)) ||
              (item.remarkDescription && item.remarkDescription.toLowerCase().includes(q))
            )
          })
          if (!match) return false
        }
      }

      return true
    })
  }, [editableData, activeCategory, selectedPic, selectedMachine, searchQuery])

  const codeHelpConfig = useMemo(
    () => ({
      remarkType: {
        title: 'Tra cứu danh mục phân loại',
        columns: REMARK_TYPE_CODEHELP_COLUMNS,
        helpData: remarkTypesForModal,
        onSelect: (selected, rowIndex) => {
          const item = filteredData[rowIndex]
          if (!item) return {}

          const rowKey = item.rowKey || getRowKey(item)
          const isClear = !selected || selected.TypeCode === '(Trống)' || !selected.IdSeq
          const typeName = isClear ? '' : selected.TypeName || ''
          const typeCode = isClear ? '' : selected.TypeCode || ''
          const typeSeq = isClear ? '' : selected.IdSeq || ''

          if (
            String(item.remarkType ?? '') === typeName &&
            String(item.remarkTypeCode ?? '') === typeCode &&
            String(item.remarkTypeSeq ?? '') === typeSeq
          ) {
            return {
              remarkType: typeName,
              remarkTypeCode: typeCode,
              remarkTypeSeq: typeSeq
            }
          }

          setAnnotations((prev) => ({
            ...prev,
            [rowKey]: {
              ...(prev[rowKey] || {}),
              idSeq: item.IdSeq || item.idSeq || item.id || '',
              rowKey,
              remarkType: typeName,
              remarkTypeCode: typeCode,
              remarkTypeSeq: typeSeq
            }
          }))
          setDirtyAnnotations((prev) => ({
            ...prev,
            [rowKey]: { ...(prev[rowKey] || {}), remarkTypeSeq: true }
          }))
          setHasUnsavedEdits(true)

          return {
            remarkType: typeName,
            remarkTypeCode: typeCode,
            remarkTypeSeq: typeSeq
          }
        }
      }
    }),
    [remarkTypesForModal, filteredData, getRowKey]
  )

  const tableManager = useTableManager({
    tableId: 'production_plan_audit_detail',
    defaultCols: showWorkingTag ? [WORKING_TAG_COLUMN, ...PLAN_AUDIT_COLUMNS] : PLAN_AUDIT_COLUMNS,
    cols: columns,
    gridData: filteredData,
    selection,
    setSelection,
    canEdit: isAnnotationTab,
    setShowSearch,
    codeHelpColumns: ['remarkType'],
    codeHelpConfig
  })

  const gridTheme = useMemo(
    () => ({
      ...DEFAULT_GRID_THEME,
      ...tableManager.gridTheme,
      bgCell: '#ffffff',
      bgHeader: '#f8fafc',
      headerFontStyle: '600 12px',
      baseFontStyle: '12px',
      textDark: '#0f172a'
    }),
    [tableManager.gridTheme]
  )

  // Cell Content Callback cho Glide Data Grid
  const getCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      if (!item) return { kind: GridCellKind.Loading, allowOverlay: false }

      const colId = columns[col]?.id

      if (colId === 'WorkingTag') {
        const tag = item.WorkingTag || item.workingTag || ''
        return {
          kind: GridCellKind.Text,
          data: tag,
          displayData: tag,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'remarkType') {
        const typeText = String(item.remarkType || '')
        const isEditable = isAnnotationTab
        return {
          kind: GridCellKind.Text,
          data: typeText,
          displayData: typeText || (isEditable ? '' : '-'),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'left',
          themeOverride: isEditable ? CODE_HELP_CELL_THEME : READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'remarkDescription') {
        const descText = String(item.remarkDescription || '')
        const isEditable = isAnnotationTab
        return {
          kind: GridCellKind.Text,
          data: descText,
          displayData: descText,
          readonly: !isEditable,
          allowOverlay: isEditable,
          hasMenu: true,
          contentAlign: 'left',
          themeOverride: isEditable ? undefined : READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'note') {
        const txt = String(item.note || item.UserMemo || '')
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'left',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'stt') {
        return {
          kind: GridCellKind.Number,
          data: row + 1,
          displayData: String(row + 1),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'docNo') {
        const txt = item.docNo || item.orderNo || item.planNo || item.RoutingDocNo || ''
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'orderNo') {
        const txt = item.orderNo || item.RoutingDocNo || ''
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'dpStatus') {
        const txt = String(item.StatusDpSx ?? item.dpStatusText ?? item.dpStatus ?? 'Khớp số lượng')
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'timeStatus') {
        const txt = item.timeStatusText || item.timeStatus || item.TimeStatus || 'Đúng ĐM'
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'capaStatus') {
        const txt = item.capaStatusText || item.capaStatus || item.CapaStatus || 'Đúng capa'
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'pic') {
        const txt = item.pic || item.PicDp || 'Chưa phân công'
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'planDate') {
        const raw = item.planDate || item.RoutingDocDate || ''
        const display = formatDateVN(raw)
        return {
          kind: GridCellKind.Text,
          data: display,
          displayData: display,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'actualDate') {
        const raw = item.actualDate || item.prodDate || item.OpDate || ''
        const display = formatDateVN(raw)
        return {
          kind: GridCellKind.Text,
          data: display,
          displayData: display,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'planQty') {
        const num = Number(item.planQty ?? item.TargetProdQty ?? 0) || 0
        return {
          kind: GridCellKind.Number,
          data: num,
          displayData: num.toLocaleString('vi-VN'),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'right',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'actualQty') {
        const num = Number(item.actualQty ?? item.StatPassQty ?? 0) || 0
        return {
          kind: GridCellKind.Number,
          data: num,
          displayData: num.toLocaleString('vi-VN'),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'right',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'completionRate') {
        const p = Number(item.planQty ?? item.TargetProdQty ?? 0) || 0
        const a = Number(item.actualQty ?? item.StatPassQty ?? 0) || 0
        const rate = p > 0 ? ((a / p) * 100).toFixed(1) : '100.0'
        return {
          kind: GridCellKind.Text,
          data: `${rate}%`,
          displayData: `${rate}%`,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'right',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'machineCode') {
        const txt = item.machineCode || ''
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'machineName') {
        const txt = item.machineName || item.MachineName || ''
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'itemCode') {
        const txt = item.itemCode || item.ItemCode || ''
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'itemName') {
        const txt = maskText(item.itemName || item.ItemName || '')
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'customer') {
        const txt = maskText(item.customer || '')
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      return {
        kind: GridCellKind.Text,
        data: '',
        displayData: '',
        readonly: true,
        allowOverlay: false,
        themeOverride: READ_ONLY_CELL_THEME
      }
    },
    [filteredData, columns, maskText, isAnnotationTab]
  )

  // Xử lý chỉnh sửa ô diễn giải (remarkDescription)
  const onCellEdited = useCallback(
    async (cell, newValue) => {
      if (!isAnnotationTab) return
      if (
        newValue.kind !== GridCellKind.Text &&
        newValue.kind !== GridCellKind.Custom &&
        newValue.kind !== GridCellKind.Number
      ) {
        return
      }

      const indexes = reorderColumns(columns)
      const [col, row] = cell
      const key = indexes[col]

      if (key !== 'remarkDescription') {
        return
      }

      const item = filteredData[row]
      if (!item) return

      const valToSet =
        newValue.kind === GridCellKind.Number
          ? String(newValue.data)
          : typeof newValue.data === 'string'
            ? newValue.data
            : String(newValue.data ?? '')

      const rowKey = item.rowKey || getRowKey(item)

      setAnnotations((prev) => ({
        ...prev,
        [rowKey]: {
          ...(prev[rowKey] || {}),
          idSeq: item.IdSeq || item.idSeq || item.id || '',
          rowKey,
          remarkDescription: valToSet
        }
      }))
      setDirtyAnnotations((prev) => ({
        ...prev,
        [rowKey]: { ...(prev[rowKey] || {}), remarkDescription: true }
      }))
      setHasUnsavedEdits(true)
    },
    [columns, filteredData, isAnnotationTab, getRowKey]
  )

  // Hỗ trợ Paste từ Excel
  const onPaste = useCallback(
    async (target, values) => {
      if (!values || values.length === 0 || !isAnnotationTab) return false
      const [startCol, startRow] = target
      const indexes = reorderColumns(columns)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

      const lookupMap = new Map()
      remarkTypesList.forEach((item) => {
        if (item.TypeCode) lookupMap.set(String(item.TypeCode).trim().toLowerCase(), item)
        if (item.TypeName) lookupMap.set(String(item.TypeName).trim().toLowerCase(), item)
        if (item.IdSeq) lookupMap.set(String(item.IdSeq).trim().toLowerCase(), item)
      })

      for (let r = 0; r < numPastedRows; r++) {
        const targetRow = startRow + r
        if (targetRow >= filteredData.length) break
        const item = filteredData[targetRow]
        if (!item) continue
        const rowValues = values[r] || []
        const rowKey = item.rowKey || getRowKey(item)

        for (let c = 0; c < numPastedCols; c++) {
          const targetCol = startCol + c
          if (targetCol >= columns.length) break
          const columnKey = indexes[targetCol]

          if (columnKey === 'remarkDescription') {
            const cellVal = String(rowValues[c] ?? '')
            setAnnotations((prev) => ({
              ...prev,
              [rowKey]: {
                ...(prev[rowKey] || {}),
                idSeq: item.IdSeq || item.idSeq || item.id || '',
                rowKey,
                remarkDescription: cellVal
              }
            }))
            setDirtyAnnotations((prev) => ({
              ...prev,
              [rowKey]: { ...(prev[rowKey] || {}), remarkDescription: true }
            }))
            setHasUnsavedEdits(true)
          } else if (columnKey === 'remarkType') {
            const cellVal = String(rowValues[c] ?? '').trim()
            const resolved = lookupMap.get(cellVal.toLowerCase())
            const updatedType = resolved ? resolved.TypeName : cellVal
            const updatedCode = resolved ? resolved.TypeCode : ''
            const updatedSeq = resolved
              ? resolved.IdSeq
              : cellVal.includes('-') && cellVal.length === 36
                ? cellVal
                : ''

            if (
              String(item.remarkType ?? '') === updatedType &&
              String(item.remarkTypeCode ?? '') === updatedCode &&
              String(item.remarkTypeSeq ?? '') === updatedSeq
            ) {
              continue
            }

            setAnnotations((prev) => ({
              ...prev,
              [rowKey]: {
                ...(prev[rowKey] || {}),
                idSeq: item.IdSeq || item.idSeq || item.id || '',
                rowKey,
                remarkType: updatedType,
                remarkTypeCode: updatedCode,
                remarkTypeSeq: updatedSeq
              }
            }))
            setDirtyAnnotations((prev) => ({
              ...prev,
              [rowKey]: { ...(prev[rowKey] || {}), remarkTypeSeq: true }
            }))
            setHasUnsavedEdits(true)
          }
        }
      }
      return false
    },
    [columns, filteredData, isAnnotationTab, remarkTypesList, getRowKey]
  )

  const onFillPattern = useCallback(
    ({ patternSource, fillDestination, preventDefault }) => {
      preventDefault?.()
      if (!isAnnotationTab || !patternSource || !fillDestination) return

      const normalize = (value) =>
        String(value ?? '')
          .trim()
          .toLowerCase()
      const remarkTypeLookup = new Map()
      remarkTypesList.forEach((type) => {
        if (type.TypeCode) remarkTypeLookup.set(normalize(type.TypeCode), type)
        if (type.TypeName) remarkTypeLookup.set(normalize(type.TypeName), type)
        if (type.IdSeq) remarkTypeLookup.set(normalize(type.IdSeq), type)
      })

      const annotationUpdates = new Map()
      const dirtyUpdates = new Map()

      for (let y = 0; y < fillDestination.height; y++) {
        for (let x = 0; x < fillDestination.width; x++) {
          const targetCol = fillDestination.x + x
          const targetRow = fillDestination.y + y
          const sourceCol = patternSource.x + (x % patternSource.width)
          const sourceRow = patternSource.y + (y % patternSource.height)
          const targetColumnId = columns[targetCol]?.id
          const sourceColumnId = columns[sourceCol]?.id

          if (
            targetColumnId !== sourceColumnId ||
            (targetColumnId !== 'remarkType' && targetColumnId !== 'remarkDescription') ||
            (targetCol >= patternSource.x &&
              targetCol < patternSource.x + patternSource.width &&
              targetRow >= patternSource.y &&
              targetRow < patternSource.y + patternSource.height)
          ) {
            continue
          }

          const sourceItem = filteredData[sourceRow]
          const targetItem = filteredData[targetRow]
          if (!targetItem) continue

          const rowKey = targetItem.rowKey || getRowKey(targetItem)
          const rowUpdate = annotationUpdates.get(rowKey) || {
            idSeq: targetItem.IdSeq || targetItem.idSeq || targetItem.id || '',
            rowKey
          }
          const dirtyRow = dirtyUpdates.get(rowKey) || {}

          if (targetColumnId === 'remarkType') {
            const sourceType = sourceItem
              ? remarkTypeLookup.get(normalize(sourceItem.remarkTypeSeq)) ||
                remarkTypeLookup.get(normalize(sourceItem.remarkTypeCode)) ||
                remarkTypeLookup.get(normalize(sourceItem.remarkType))
              : null
            const typeName = sourceType?.TypeName || sourceItem?.remarkType || ''
            const typeCode = sourceType?.TypeCode || sourceItem?.remarkTypeCode || ''
            const typeSeq = sourceType?.IdSeq || sourceItem?.remarkTypeSeq || ''

            if (
              String(targetItem.remarkType ?? '') === typeName &&
              String(targetItem.remarkTypeCode ?? '') === typeCode &&
              String(targetItem.remarkTypeSeq ?? '') === typeSeq
            ) {
              continue
            }

            Object.assign(rowUpdate, {
              remarkType: typeName,
              remarkTypeCode: typeCode,
              remarkTypeSeq: typeSeq
            })
            dirtyRow.remarkTypeSeq = true
          } else {
            const description = String(sourceItem?.remarkDescription ?? '')
            if (String(targetItem.remarkDescription ?? '') === description) continue
            Object.assign(rowUpdate, {
              remarkDescription: description,
              note: description,
              UserMemo: description
            })
            dirtyRow.remarkDescription = true
          }

          annotationUpdates.set(rowKey, rowUpdate)
          dirtyUpdates.set(rowKey, dirtyRow)
        }
      }

      if (annotationUpdates.size === 0) return

      setAnnotations((previous) => {
        const next = { ...previous }
        annotationUpdates.forEach((updates, rowKey) => {
          next[rowKey] = { ...(previous[rowKey] || {}), ...updates }
        })
        return next
      })
      setDirtyAnnotations((previous) => {
        const next = { ...previous }
        dirtyUpdates.forEach((updates, rowKey) => {
          next[rowKey] = { ...(previous[rowKey] || {}), ...updates }
        })
        return next
      })
      setHasUnsavedEdits(true)
    },
    [isAnnotationTab, columns, filteredData, getRowKey, remarkTypesList]
  )

  // Lưu chỉnh sửa nhật trình (Local Storage + DB nếu cần)
  const handleSave = async () => {
    const editedRowKeys = Object.keys(dirtyAnnotations)
    if (editedRowKeys.length === 0) {
      setSaveStatus('Không có thay đổi cần lưu.')
      setTimeout(() => setSaveStatus(''), 2500)
      return
    }

    setIsSaving(true)
    setSaveStatus('')
    try {
      const payload = []
      const incompleteRows = []

      for (const rowKey of editedRowKeys) {
        const anno = annotations[rowKey]
        if (!anno) {
          incompleteRows.push(rowKey)
          continue
        }
        const matchedRow = editableData.find(
          (d) =>
            String(d.rowKey) === String(rowKey) || String(d.IdSeq || d.idSeq) === String(anno.idSeq)
        )
        const idSeq = anno.idSeq || matchedRow?.IdSeq || matchedRow?.idSeq || ''
        const docNo = matchedRow?.docNo || matchedRow?.orderNo || rowKey

        let finalSeq = String(
          anno.remarkTypeSeq !== undefined
            ? anno.remarkTypeSeq
            : (matchedRow?.remarkTypeSeq ?? matchedRow?.RemarkTypeSeq ?? '')
        ).trim()

        const typeFromSeq = remarkTypesList.find(
          (t) => String(t.IdSeq || '').trim().toLowerCase() === finalSeq.toLowerCase()
        )
        const annotationType = String(anno.remarkType ?? '').trim()
        const rowType = String(matchedRow?.remarkType ?? '').trim()
        const remarkType =
          annotationType ||
          String(typeFromSeq?.TypeName || '').trim() ||
          (finalSeq ? rowType : '') ||
          (anno.remarkType === undefined ? rowType : '')

        if (!finalSeq && remarkType) {
          const norm = String(remarkType).trim().toLowerCase()
          const matched = remarkTypesList.find(
            (t) =>
              String(t.TypeName || '')
                .trim()
                .toLowerCase() === norm ||
              String(t.TypeCode || '')
                .trim()
                .toLowerCase() === norm ||
              String(t.IdSeq || '')
                .trim()
                .toLowerCase() === norm
          )
          if (matched?.IdSeq) finalSeq = String(matched.IdSeq).trim()
        }

        const remarkDescription =
          anno.remarkDescription !== undefined
            ? anno.remarkDescription
            : (matchedRow?.RemarkContent ?? matchedRow?.remarkContent ?? '')

        if (
          !String(remarkType ?? '').trim() ||
          !finalSeq ||
          !String(remarkDescription ?? '').trim()
        ) {
          incompleteRows.push(docNo)
          continue
        }

        if (matchedRow) {
          payload.push({
            IdSeq: idSeq,
            RemarkTypeSeq: finalSeq,
            RemarkContent: String(remarkDescription),
            RowVersion: Number(anno.rowVersion ?? 0),
            ReconciliationOnly: 'true'
          })
        }
      }

      if (incompleteRows.length > 0) {
        const rowList = incompleteRows.slice(0, 10).join(', ')
        const remainder =
          incompleteRows.length > 10 ? ` và ${incompleteRows.length - 10} lệnh khác` : ''
        const msg = `Mỗi dòng cần có Phân loại hợp lệ và Diễn giải trước khi lưu. Vui lòng kiểm tra: ${rowList}${remainder}.`
        setSaveStatus(msg)
        setErrorModalConfig({
          isOpen: true,
          title: 'Thiếu thông tin bắt buộc',
          message: msg,
          type: 'warning'
        })
        return
      }

      let savedRows = []
      if (payload.length > 0) {
        const rowsWithoutId = payload.filter((item) => !item.IdSeq)
        if (rowsWithoutId.length) {
          setErrorModalConfig({
            isOpen: true,
            title: 'Chưa có IdSeq',
            message: `${rowsWithoutId.length} dòng chưa có IdSeq trong CSDL nên chưa thể lưu đồng bộ vào DB. Giá trị vẫn được lưu trên thiết bị.`,
            type: 'warning'
          })
          return
        }
        const res = await updatePlanReconciliation(payload)
        if (res?.success === false) {
          throw new Error(res.message || 'Lưu vào cơ sở dữ liệu thất bại')
        }
        savedRows = Array.isArray(res?.data) ? res.data : []
        if (savedRows.length !== payload.length) {
          throw new Error(
            `Máy chủ chỉ xác nhận ${savedRows.length}/${payload.length} dòng nhật trình đã lưu. Vui lòng tải lại trước khi tiếp tục.`
          )
        }
      }

      try {
        localStorage.removeItem(`prod-plan-audit:${plantKey}`)
      } catch (e) {
        // ignore
      }

      const savedById = new Map(savedRows.map((row) => [String(row.IdSeq), row]))
      setAnnotations((previous) => {
        const next = { ...previous }
        for (const item of payload) {
          const saved = savedById.get(String(item.IdSeq))
          const rowKey = String(item.IdSeq)
          next[rowKey] = {
            ...(previous[rowKey] || {}),
            idSeq: rowKey,
            remarkTypeSeq: item.RemarkTypeSeq,
            remarkDescription: item.RemarkContent,
            rowVersion: Number(saved?.RowVersion) || Number(item.RowVersion) + 1
          }
        }
        return next
      })
      setHasUnsavedEdits(false)
      setDirtyAnnotations({})
      setShowCloseConfirm(false)
      setSaveStatus('Đã lưu thành công vào cơ sở dữ liệu!')
      setTimeout(() => setSaveStatus(''), 4000)
    } catch (error) {
      console.error('Không thể lưu phân loại và diễn giải nhật trình KHSX:', error)
      const errorMessage = String(error?.message || error)
      if (/đã được người khác cập nhật|concurrent update|version conflict/i.test(errorMessage)) {
        setIsLoadingAnnotations(true)
        try {
          const response = await queryPlanReconciliation({ masterSeq, regCode })
          if (response?.success === false) {
            throw new Error(response.message || 'Không tải được nhật trình mới nhất')
          }
          const rows = Array.isArray(response?.data) ? response.data : []
          const latest = {}
          rows.forEach((row) => {
            const key = String(row.IdSeq || row.DetailIdSeq || '')
            if (!key) return
            latest[key] = {
              idSeq: key,
              remarkType: '',
              remarkTypeCode: '',
              remarkTypeSeq: row.RemarkTypeSeq || '',
              remarkDescription: row.RemarkContent || '',
              rowVersion: Number(row.RowVersion) || 0
            }
          })
          // Discard the stale draft and show the current database snapshot.
          setAnnotations(latest)
          setDirtyAnnotations({})
          setHasUnsavedEdits(false)
          setShowCloseConfirm(false)
          setSaveStatus('Đã tải nhật trình mới nhất từ máy chủ.')
          setErrorModalConfig({
            isOpen: true,
            title: 'Dữ liệu đã được cập nhật',
            message:
              'Một người khác đã lưu trước bạn. Nhật trình mới nhất đã được tải lại; các chỉnh sửa chưa lưu của bạn đã được bỏ. Vui lòng kiểm tra và nhập lại nếu cần.',
            type: 'warning'
          })
        } catch (refreshError) {
          setErrorModalConfig({
            isOpen: true,
            title: 'Không tải được dữ liệu mới nhất',
            message: `${errorMessage} Không thể tải lại nhật trình: ${String(refreshError?.message || refreshError)}`,
            type: 'danger'
          })
        } finally {
          setIsLoadingAnnotations(false)
        }
      } else {
        setErrorModalConfig({
          isOpen: true,
          title: 'Không thể lưu thay đổi',
          message: errorMessage,
          type: 'danger'
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloseRequest = () => {
    if (hasUnsavedEdits) {
      setShowCloseConfirm(true)
      return
    }
    onClose()
  }

  const handleDiscardAndClose = () => {
    setShowCloseConfirm(false)
    setHasUnsavedEdits(false)
    setDirtyAnnotations({})
    onClose()
  }

  // Xuất file Excel dữ liệu đang lọc
  const handleExportExcel = () => {
    if (!filteredData.length) return

    const exportRows = filteredData.map((item, idx) => ({
      STT: idx + 1,
      'Số LSX': item.docNo || item.planNo || '',
      'Số Đơn Hàng (SO)': item.orderNo || '',
      'Phân loại': item.remarkType || '',
      'Diễn giải': item.remarkDescription || item.note || '',
      'Trạng thái ĐP - SX': item.dpStatusText || item.dpStatus || item.StatusDpSx || '',
      'Trạng thái Thời gian': item.timeStatusText || item.timeStatus || item.TimeStatus || '',
      'Trạng thái Capa': item.capaStatusText || item.capaStatus || item.CapaStatus || '',
      'PIC Điều phối': item.pic || item.PicDp || '',
      'Ngày kế hoạch': item.planDate || item.RoutingDocDate || '',
      'Ngày thực tế': item.actualDate || item.prodDate || item.OpDate || '',
      'SL Kế hoạch': Number(item.planQty ?? item.TargetProdQty ?? 0) || 0,
      'SL Thực tế': Number(item.actualQty ?? item.StatPassQty ?? 0) || 0,
      'Tỷ lệ hoàn thành (%)':
        Number(item.planQty) > 0 ? Number(((item.actualQty / item.planQty) * 100).toFixed(1)) : 100,
      'Mã máy': item.machineCode || '',
      'Tên máy': item.machineName || item.MachineName || '',
      'Mã sản phẩm': item.itemCode || item.ItemCode || '',
      'Tên sản phẩm': item.itemName || item.ItemName || '',
      'Khách hàng': item.customer || '',
      'Ghi chú': item.note || item.remark || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ChiTiet_DieuPhoi_KHSX')
    XLSX.writeFile(
      wb,
      `ChiTiet_DieuPhoi_KHSX_${plantName || plantKey}_${activeCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  // Copy toàn bộ bảng ra Clipboard
  const handleCopyTable = () => {
    if (!filteredData.length) return
    try {
      const headers = columns.map((c) => c.title)
      const rows = filteredData.map((item, idx) =>
        columns.map((col) => {
          if (col.id === 'stt') return idx + 1
          if (col.id === 'planDate' || col.id === 'actualDate') {
            return formatDateVN(item[col.id])
          }
          return item[col.id] ?? ''
        })
      )
      const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
      navigator.clipboard.writeText(tsvContent)
      message.success(`Đã sao chép ${filteredData.length} dòng vào clipboard`)
    } catch (err) {
      console.error('Copy TSV error:', err)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: isElectron ? 28 : 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99990,
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
        onClick={handleCloseRequest}
      >
        <div
          style={{
            background: '#ffffff',
            width: '100vw',
            height: isElectron ? 'calc(100dvh - 28px)' : '100dvh',
            maxHeight: isElectron ? 'calc(100dvh - 28px)' : '100dvh',
            maxWidth: '100%',
            border: 'none',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Thanh thao tác gọn: Quay lại, Lưu & Đóng */}
          <div
            role="toolbar"
            aria-label="Thao tác nhật trình đối soát KHSX"
            className="flex items-center justify-between bg-white px-3 py-1 border-b border-slate-200 shrink-0 select-none"
            style={{ minHeight: 34 }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseRequest}
                disabled={isSaving || isLoadingAnnotations}
                className="uppercase text-[11px] font-bold text-slate-700 hover:text-slate-900 h-7 px-2 shrink-0 border border-slate-200"
                title="Quay lại / Đóng nhật trình"
              >
                <ArrowLeft size={13} />
                <span>Quay lại</span>
              </Button>
              {isAnnotationTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-label="Lưu nhật trình đối soát"
                  title="Lưu thay đổi phân loại và diễn giải"
                  className="uppercase text-[11px] font-bold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0 border border-indigo-200 bg-indigo-50/50"
                >
                  <Save size={13} />
                  <span>
                    {isSaving ? 'Đang lưu...' : isLoadingAnnotations ? 'Đang tải nhật trình...' : 'Lưu đồng bộ'}
                  </span>
                </Button>
              )}
              {saveStatus && (
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <Check size={13} /> {saveStatus}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseRequest}
              aria-label="Đóng nhật trình đối soát"
              title="Đóng nhật trình"
              className="h-7 w-7 p-0 shrink-0 text-slate-500 hover:text-slate-800"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Hàng 1: Tabs điều hướng trạng thái đối soát */}
          <div
            role="tablist"
            aria-label="Lọc nhật trình theo trạng thái đối soát"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: localOnly ? 12 : 6,
              flexWrap: 'wrap',
              minHeight: localOnly ? 32 : undefined,
              padding: localOnly ? '0 12px' : '0 18px',
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0
            }}
          >
            {[
              { id: 'ALL', label: 'Tất cả', count: categoryCounts.all },
              { id: 'SX_SAI_NGAY', label: '1. SX sai ngày KH', count: categoryCounts.sxSaiNgay },
              { id: 'TRUOT_KH', label: '2. Trượt KH', count: categoryCounts.truotKh },
              { id: 'KHOP_SL', label: '3. Khớp số lượng', count: categoryCounts.khopSl },
              { id: 'KHOP_JOB', label: '4. Khớp job', count: categoryCounts.khopJob }
            ].map((tab) => {
              const isActive = activeCategory === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveCategory(tab.id)
                  }}
                  style={{
                    position: 'relative',
                    alignSelf: 'stretch',
                    padding: localOnly ? '0 6px' : '6px 10px',
                    fontSize: localOnly ? 11 : 12,
                    fontWeight: localOnly ? (isActive ? 700 : 500) : isActive ? 600 : 400,
                    cursor: 'pointer',
                    border: localOnly ? 'none' : '1px solid',
                    borderColor: localOnly ? undefined : isActive ? '#0f172a' : '#e2e8f0',
                    borderBottom: localOnly
                      ? isActive
                        ? '2px solid #4f46e5'
                        : '2px solid transparent'
                      : undefined,
                    background: localOnly ? 'transparent' : isActive ? '#f8fafc' : '#ffffff',
                    color: localOnly
                      ? isActive
                        ? '#4338ca'
                        : '#64748b'
                      : isActive
                        ? '#0f172a'
                        : '#64748b',
                    marginBottom: localOnly ? -1 : undefined
                  }}
                >
                  {tab.label}{' '}
                  <span
                    style={{
                      color: localOnly ? (isActive ? '#4338ca' : '#94a3b8') : undefined
                    }}
                  >
                    {localOnly ? (
                      <span
                        style={{
                          display: 'inline-block',
                          marginLeft: 3,
                          padding: '1px 5px',
                          borderRadius: 999,
                          background: isActive ? '#e0e7ff' : '#f1f5f9',
                          color: isActive ? '#4338ca' : '#64748b',
                          fontSize: 9,
                          lineHeight: 1.3,
                          fontWeight: 700
                        }}
                      >
                        {tab.count.toLocaleString('vi-VN')}
                      </span>
                    ) : (
                      `(${tab.count})`
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Hàng 2: Bộ lọc dropdown, Tìm kiếm & Các nút xuất/chép */}
          <div
            style={{
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              flexShrink: 0
            }}
          >
            <details style={{ position: 'relative', fontSize: 12, color: '#334155' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '4px 10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  borderRadius: 2
                }}
              >
                Ẩn / hiện cột ({columns.length}/{availableAuditColumns.length})
              </summary>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 20,
                  width: 220,
                  maxHeight: '45vh',
                  overflowY: 'auto',
                  padding: 10,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
                }}
              >
                {columnOrder
                  .filter((id) => availableAuditColumns.some((col) => col.id === id))
                  .map((id) => {
                    const column = availableAuditColumns.find((item) => item.id === id)
                    if (!column) return null
                    const isChecked = !hiddenColumns.includes(id)
                    return (
                      <label
                        key={id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 4,
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColumn(id)}
                        />
                        <span>
                          {column.title ||
                            (column.id === 'WorkingTag' ? 'Trạng thái sửa (U)' : column.id)}
                        </span>
                      </label>
                    )
                  })}
              </div>
            </details>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 8, color: '#94a3b8', pointerEvents: 'none' }}
              />
              <input
                type="text"
                placeholder="Tìm mã lệnh, SO, PIC, máy (cách nhau bởi dấu ,)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '4px 8px 4px 28px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 2,
                  outline: 'none',
                  width: 270,
                  background: '#ffffff'
                }}
              />
            </div>

            <button
              onClick={handleCopyTable}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 12,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 2,
                cursor: 'pointer',
                color: '#334155'
              }}
            >
              <Copy size={13} />
              <span>Sao chép</span>
            </button>

            <button
              onClick={handleExportExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 2,
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              <Download size={13} />
              <span>Xuất Excel</span>
            </button>
          </div>

          {/* Hàng 3: Glide Data Grid Sheet (Bảng dữ liệu bên dưới) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              overflow: 'hidden',
              pointerEvents: isLoadingAnnotations ? 'none' : 'auto'
            }}
          >
            <DataEditor
              ref={gridRef}
              columns={columns}
              rows={filteredData.length}
              getCellContent={getCellContent}
              rowMarkers="both"
              rowSelect="multi"
              columnSelect="single"
              fillHandle={isAnnotationTab}
              onFillPattern={onFillPattern}
              getCellsForSelection={true}
              onCellEdited={onCellEdited}
              onCellClicked={tableManager.onCellClicked}
              onCellActivated={tableManager.onCellActivated}
              onKeyDown={tableManager.onKeyDown}
              onHeaderMenuClick={tableManager.onHeaderMenuClick}
              onCellContextMenu={tableManager.onCellContextMenu}
              onPaste={onPaste}
              onColumnResize={onColumnResize}
              onColumnMoved={onColumnMoved}
              rowHeight={rowHeight}
              headerHeight={23}
              gridSelection={selection}
              onGridSelectionChange={setSelection}
              showSearch={showSearch}
              onSearchClose={() => setShowSearch(false)}
              keybindings={{ search: true, downFill: true, rightFill: true }}
              theme={gridTheme}
              width="100%"
              height="100%"
            />
            {tableManager.showMenu !== null &&
              tableManager.renderLayer(
                <div
                  {...tableManager.layerProps}
                  className="border w-72 rounded-lg bg-white shadow-lg cursor-pointer z-[9999]"
                >
                  {tableManager.showMenu.menuType === 'statusMenu' ? (
                    <LayoutStatusMenuSheet
                      showMenu={tableManager.showMenu}
                      handleSort={tableManager.handleSort}
                      cols={columns}
                      renderLayer={tableManager.renderLayer}
                      setShowSearch={setShowSearch}
                      setShowMenu={tableManager.setShowMenu}
                      layerProps={tableManager.layerProps}
                      handleReset={tableManager.handleReset}
                      showDrawer={tableManager.showDrawer}
                      data={filteredData}
                    />
                  ) : tableManager.showMenu.menuType === 'contextMenu' ? (
                    <LayoutContextMenuSheet
                      showMenu={tableManager.showMenu}
                      cols={columns}
                      setShowSearch={setShowSearch}
                      setShowMenu={tableManager.setShowMenu}
                      data={filteredData}
                      selection={selection}
                      canCreate={false}
                    />
                  ) : (
                    <LayoutMenuSheet
                      showMenu={tableManager.showMenu}
                      handleSort={tableManager.handleSort}
                      handleHideColumn={tableManager.handleHideColumn}
                      cols={columns}
                      renderLayer={tableManager.renderLayer}
                      setShowSearch={setShowSearch}
                      setShowMenu={tableManager.setShowMenu}
                      layerProps={tableManager.layerProps}
                      handleFreezeColumn={tableManager.handleFreezeColumn}
                    />
                  )}
                </div>
              )}
            <Drawer
              title={
                <span className="text-xs flex items-center justify-end font-bold">
                  CÀI ĐẶT SHEET
                </span>
              }
              styles={{ body: { padding: 15 } }}
              onClose={() => tableManager.setOpenDrawer(false)}
              open={tableManager.openDrawer}
            >
              {(tableManager.configurableCols || []).map((col) => (
                <div key={col.id} style={{ marginBottom: '10px' }}>
                  <Checkbox
                    checked={!tableManager.hiddenColumns?.includes(col.id)}
                    onChange={(e) => tableManager.handleCheckboxChange(col.id, e.target.checked)}
                  >
                    {col.title || col.id}
                  </Checkbox>
                </div>
              ))}
            </Drawer>
            {tableManager.codeHelpModal?.isOpen && (
              <GenericCodeHelpModal
                isOpen={tableManager.codeHelpModal.isOpen}
                onClose={tableManager.closeCodeHelpModal}
                title={tableManager.codeHelpModal.title}
                helpData={tableManager.codeHelpModal.helpData}
                fetchHelpData={tableManager.codeHelpModal.fetchHelpData}
                columns={tableManager.codeHelpModal.columns}
                initialSearchText={tableManager.codeHelpModal.initialSearchText}
                storageKey="prod_plan_remark_type_codehelp"
                onSelect={tableManager.handleSelectCodeHelp}
              />
            )}
          </div>

          {/* Footer thông tin & trạng thái */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 12px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              color: hasUnsavedEdits ? '#9a6700' : '#64748b',
              fontSize: 11
            }}
          >
            <span>
              {isSaving
                ? localOnly
                  ? 'Đang lưu phân loại và diễn giải trên thiết bị này...'
                  : 'Đang lưu vào cơ sở dữ liệu...'
                : saveStatus
                  ? `✓ ${saveStatus}`
                  : hasUnsavedEdits
                    ? localOnly
                      ? 'Có thay đổi chưa lưu. Bấm “Lưu” để lưu trên thiết bị này.'
                      : 'Có thay đổi chưa lưu. Hãy bấm “Lưu” để lưu vào cơ sở dữ liệu.'
                    : 'Sẵn sàng'}
            </span>
            <span>{filteredData.length} lệnh</span>
          </div>
        </div>
      </div>

      {/* CodeHelp Modal chọn Phân loại KHSX */}
      {tableManager.codeHelpModal?.isOpen && (
        <GenericCodeHelpModal
          isOpen={tableManager.codeHelpModal.isOpen}
          onClose={tableManager.closeCodeHelpModal}
          title={tableManager.codeHelpModal.title}
          columns={tableManager.codeHelpModal.columns}
          helpData={tableManager.codeHelpModal.helpData}
          initialSearchText={tableManager.codeHelpModal.initialSearchText}
          searchPlaceholder="Dán mã phân loại hoặc nhập tên để tìm..."
          storageKey="prod_plan_remark_type_codehelp"
          onSelect={tableManager.handleSelectCodeHelp}
        />
      )}

      {/* Xác nhận thoát khi có thay đổi chưa lưu */}
      <SystemConfirmModal
        isOpen={showCloseConfirm}
        type="unsaved"
        title="Xác nhận dữ liệu chưa lưu"
        message="Bạn đang có thay đổi chưa được lưu."
        subMessage="Lưu thay đổi trước khi đóng nhật trình, hoặc thoát mà không lưu."
        confirmText="Thoát không lưu"
        cancelText="Quay lại"
        extraActionText="Lưu thay đổi"
        onExtraAction={handleSave}
        onConfirm={handleDiscardAndClose}
        onCancel={() => setShowCloseConfirm(false)}
      />

      {/* Modal thông báo lỗi hoặc cảnh báo chuẩn hệ thống */}
      <SystemConfirmModal
        isOpen={errorModalConfig.isOpen}
        type={errorModalConfig.type || 'danger'}
        title={errorModalConfig.title || 'Thông báo'}
        message={errorModalConfig.message}
        confirmText="Đã hiểu"
        onConfirm={() =>
          setErrorModalConfig({ isOpen: false, title: '', message: '', type: 'danger' })
        }
        onClose={() =>
          setErrorModalConfig({ isOpen: false, title: '', message: '', type: 'danger' })
        }
      />
    </>
  )
}
