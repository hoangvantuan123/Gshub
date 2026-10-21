/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Download, Copy, Search, Save, X, ArrowLeft } from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { Button } from '@renderer/components/ui/button'
import { PureButton, PureSelect } from './reportUIComponents'
import { DEFAULT_GRID_THEME } from '@renderer/user/components/hooks/sheet/useTableCellTheme'
import { updatePlanDetail } from '@renderer/user/page/report/registration/services/planRegistrationService'
import { queryProdStatsRemarkTypes } from '@renderer/user/page/report/registration/remarkType/remarkTypeService'
import useTableManager from '@renderer/user/components/hooks/sheet/useTableManager'
import LayoutContextMenuSheet from '@renderer/user/components/sheet/jsx/layoutContextMenu'
import { message } from 'antd'
import SystemConfirmModal from '@renderer/user/components/modal/SystemConfirmModal'
import GenericCodeHelpModal from '@renderer/user/components/query/core/GenericCodeHelpModal'
import { reorderColumns } from '@renderer/user/components/sheet/js/reorderColumns'
import ProductionAuditModalHeader from '../../../components/ProductionAuditModalHeader'

const PLAN_AUDIT_COLUMNS = [
  { id: 'remarkType', title: 'Phân loại', width: 160 },
  { id: 'remarkDescription', title: 'Diễn giải', width: 240 },
  { id: 'docNo', title: 'Số LSX', width: 135 },
  { id: 'orderNo', title: 'Lệnh công đoạn', width: 120 },
  { id: 'dpStatus', title: 'Trạng thái ĐP-SX', width: 155 },
  { id: 'timeStatus', title: 'Trạng thái Thời gian', width: 145 },
  { id: 'capaStatus', title: 'Trạng thái Capa', width: 135 },
  { id: 'pic', title: 'PIC Điều phối', width: 130 },
  { id: 'planDate', title: 'Ngày KH', width: 95 },
  { id: 'actualDate', title: 'Ngày thực tế', width: 95 },
  { id: 'planQty', title: 'SL Kế hoạch', width: 105 },
  { id: 'actualQty', title: 'SL Thực tế', width: 105 },
  { id: 'completionRate', title: 'Tỷ lệ HT', width: 80 },
  { id: 'machineCode', title: 'Mã máy', width: 100 },
  { id: 'machineName', title: 'Tên máy', width: 160 },
  { id: 'itemCode', title: 'Mã sản phẩm', width: 130 },
  { id: 'itemName', title: 'Tên sản phẩm', width: 230 },
  { id: 'customer', title: 'Khách hàng', width: 180 },
  { id: 'note', title: 'Ghi chú điều phối', width: 200 }
]

const WORKING_TAG_COLUMN = {
  id: 'WorkingTag',
  title: '',
  width: 50,
  hasMenu: true,
  readonly: true,
  themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
}

const READ_ONLY_CELL_THEME = {
  bgCell: '#eeeeee',
  bgCellMedium: '#f5f5f5',
  textDark: '#64748b',
  borderColor: '#cbd5e1'
}

const EDITABLE_CELL_THEME = {
  bgCell: '#ffffff',
  bgCellMedium: '#f8fafc',
  textDark: '#1e293b',
  borderColor: '#cbd5e1'
}

// Màu nền ô CodeHelp chuẩn ERP (xanh lam nhạt dịu #eaf1f8)
const CODE_HELP_CELL_THEME = {
  bgCell: '#eaf1f8',
  bgCellMedium: '#e0ecf7',
  textDark: '#1e293b',
  borderColor: '#cbd5e1'
}

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
  canEdit = true,
  localOnly = true,
  showWorkingTag = true,
  onSaved,
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
  const [annotations, setAnnotations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`prod-plan-audit:${plantKey}`) || '{}')
    } catch {
      return {}
    }
  })
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
  const [activeCodeHelpRow, setActiveCodeHelpRow] = useState(null)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const gridRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    try {
      setAnnotations(JSON.parse(localStorage.getItem(`prod-plan-audit:${plantKey}`) || '{}'))
    } catch {
      setAnnotations({})
    }
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
  }, [isOpen, initialCategory, plantKey])

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

  // Chỉ hiển thị 2 cột Phân loại & Diễn giải trên các tab cần đối soát giải trình (SX_SAI_NGAY, TRUOT_KH)
  const isAnnotationTab = activeCategory === 'SX_SAI_NGAY' || activeCategory === 'TRUOT_KH'

  const availableAuditColumns = useMemo(() => {
    const baseCols = showWorkingTag
      ? [WORKING_TAG_COLUMN, ...PLAN_AUDIT_COLUMNS]
      : PLAN_AUDIT_COLUMNS
    const mapped = baseCols.map((col) => {
      if (canEdit && (col.id === 'remarkType' || col.id === 'remarkDescription')) {
        return {
          ...col,
          title: col.id === 'remarkType' ? 'Phân loại *' : 'Diễn giải *',
          themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
        }
      }
      return col
    })
    if (isAnnotationTab) return mapped
    return mapped.filter((col) => col.id !== 'remarkType' && col.id !== 'remarkDescription')
  }, [isAnnotationTab, showWorkingTag, canEdit])

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
  }, [columnOrder, hiddenColumns, columnWidths, isAnnotationTab, availableAuditColumns, showWorkingTag])

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
      const annotation = annotations[rowKey] || {}
      const isDirty = Boolean(dirtyAnnotations[rowKey])
      const workingTag = isDirty ? 'U' : ''

      const remarkType =
        annotation.remarkType !== undefined
          ? annotation.remarkType
          : (item.remarkType ?? item.RemarkTypeName ?? item.RemarkType ?? '')
      const remarkTypeCode =
        annotation.remarkTypeCode !== undefined
          ? annotation.remarkTypeCode
          : (item.remarkTypeCode ?? item.RemarkTypeCode ?? '')
      const remarkTypeSeq =
        annotation.remarkTypeSeq !== undefined
          ? annotation.remarkTypeSeq
          : (item.remarkTypeSeq ?? item.RemarkTypeSeq ?? '')
      const remarkDescription =
        annotation.remarkDescription !== undefined
          ? annotation.remarkDescription
          : (item.remarkDescription ??
            item.RemarkContent ??
            item.UserMemo ??
            item.note ??
            item.remark ??
            '')

      return {
        ...item,
        rowKey,
        WorkingTag: workingTag,
        remarkType,
        remarkTypeCode,
        remarkTypeSeq,
        remarkDescription,
        note: remarkDescription,
        UserMemo: remarkDescription
      }
    })
  }, [data, annotations, dirtyAnnotations, getRowKey])

  // Lấy danh sách PIC & Máy duy nhất để lọc dropdown
  const picOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      if (item.pic || item.PicDp) set.add(item.pic || item.PicDp)
    })
    return Array.from(set).sort()
  }, [data])

  const machineOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      const m = item.machineCode || item.machineName || item.MachineName
      if (m) set.add(m)
    })
    return Array.from(set).sort()
  }, [data])

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
        const q = searchQuery.toLowerCase().trim()
        const match =
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
        if (!match) return false
      }

      return true
    })
  }, [editableData, activeCategory, selectedPic, selectedMachine, searchQuery])

  const tableManager = useTableManager({
    tableId: 'production_plan_audit_detail',
    defaultCols: PLAN_AUDIT_COLUMNS,
    cols: columns,
    gridData: filteredData,
    selection,
    setSelection,
    canEdit,
    codeHelpColumns: []
  })

  // Cell Content Callback cho Glide Data Grid
  const getCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      if (!item) return { kind: GridCellKind.Loading, allowOverlay: false }

      const colId = columns[col]?.id

      if (colId === 'WorkingTag') {
        const tag = item.WorkingTag || ''
        return {
          kind: GridCellKind.Text,
          data: tag,
          displayData: tag,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: {
            textDark: tag === 'U' ? '#e11d48' : '#225588',
            baseFontStyle: '700 13px',
            bgCell: '#f8fafc'
          }
        }
      }

      if (colId === 'remarkType') {
        const typeText = String(item.remarkType || '')
        const isEditable = canEdit && isAnnotationTab
        return {
          kind: GridCellKind.Text,
          data: typeText,
          displayData: typeText || (isEditable ? '' : '-'),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'left',
          themeOverride: isEditable
            ? {
                ...CODE_HELP_CELL_THEME,
                textDark: typeText ? '#1e293b' : '#64748b',
                baseFontStyle: typeText ? '600 12px' : 'italic 12px'
              }
            : READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'remarkDescription' || colId === 'note') {
        const descText = String(item.remarkDescription || item.note || '')
        const isEditable = canEdit && isAnnotationTab
        return {
          kind: GridCellKind.Text,
          data: descText,
          displayData: descText,
          readonly: !isEditable,
          allowOverlay: isEditable,
          contentAlign: 'left',
          activationBehaviorOverride: isEditable ? 'single-click' : 'second-click',
          themeOverride: isEditable ? EDITABLE_CELL_THEME : READ_ONLY_CELL_THEME
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#0f172a', baseFontStyle: '600 12px' }
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#334155', baseFontStyle: '500 12px' }
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#334155', baseFontStyle: '500 12px' }
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#0f172a', baseFontStyle: '500 12px' }
        }
      }

      if (colId === 'planDate') {
        const txt = item.planDate || item.RoutingDocDate || ''
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: READ_ONLY_CELL_THEME
        }
      }

      if (colId === 'actualDate') {
        const txt = item.actualDate || item.prodDate || item.OpDate || ''
        const isDiff = item.planDate && txt && item.planDate !== txt
        return {
          kind: GridCellKind.Text,
          data: txt,
          displayData: txt,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: {
            ...READ_ONLY_CELL_THEME,
            textDark: isDiff ? '#d97706' : '#334155',
            baseFontStyle: isDiff ? '700 12px' : '400 12px'
          }
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#047857', baseFontStyle: '700 12px' }
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
          themeOverride: {
            ...READ_ONLY_CELL_THEME,
            textDark: Number(rate) >= 95 ? '#047857' : '#be123c',
            baseFontStyle: '700 12px'
          }
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#0284c7', baseFontStyle: '600 12px' }
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
          themeOverride: { ...READ_ONLY_CELL_THEME, textDark: '#0f172a', baseFontStyle: '500 12px' }
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
    [filteredData, columns, maskText, canEdit, isAnnotationTab]
  )

  // Xử lý chỉnh sửa ô diễn giải (remarkDescription)
  const onCellEdited = useCallback(
    async (cell, newValue) => {
      if (!canEdit || !isAnnotationTab) return
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

      if (key !== 'remarkDescription' && key !== 'note') {
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
          remarkDescription: valToSet,
          note: valToSet
        }
      }))
      setDirtyAnnotations((prev) => ({
        ...prev,
        [rowKey]: { ...(prev[rowKey] || {}), remarkDescription: true }
      }))
      setHasUnsavedEdits(true)
    },
    [columns, filteredData, canEdit, isAnnotationTab, getRowKey]
  )

  // Nhấn vào ô Phân loại mở CodeHelp Modal
  const onCellActivated = useCallback(
    (cell) => {
      if (!canEdit || !isAnnotationTab) return
      const [col, row] = cell
      const columnKey = columns[col]?.id
      if (columnKey === 'remarkType') {
        const item = filteredData[row]
        if (item) {
          setActiveCodeHelpRow(item)
        }
      }
    },
    [canEdit, isAnnotationTab, columns, filteredData]
  )

  // Hỗ trợ Paste từ Excel
  const onPaste = useCallback(
    async (target, values) => {
      if (!values || values.length === 0 || !canEdit || !isAnnotationTab) return false
      const [startCol, startRow] = target
      const indexes = reorderColumns(columns)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

      const lookupMap = new Map()
      remarkTypesList.forEach((item) => {
        if (item.TypeCode) lookupMap.set(String(item.TypeCode).trim().toLowerCase(), item)
        if (item.TypeName) lookupMap.set(String(item.TypeName).trim().toLowerCase(), item)
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

          if (columnKey === 'remarkDescription' || columnKey === 'note') {
            const cellVal = String(rowValues[c] ?? '')
            setAnnotations((prev) => ({
              ...prev,
              [rowKey]: {
                ...(prev[rowKey] || {}),
                idSeq: item.IdSeq || item.idSeq || item.id || '',
                rowKey,
                remarkDescription: cellVal,
                note: cellVal
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
            const updatedSeq = resolved ? resolved.IdSeq : ''

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
    [columns, filteredData, canEdit, isAnnotationTab, remarkTypesList, getRowKey]
  )

  // Lưu chỉnh sửa nhật trình (Local Storage + DB nếu cần)
  const handleSave = async () => {
    if (!hasUnsavedEdits) return
    setIsSaving(true)
    setSaveStatus('')
    try {
      const editedRowKeys = Object.keys(dirtyAnnotations)
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

        const remarkType =
          anno.remarkType !== undefined ? anno.remarkType : (matchedRow?.remarkType ?? '')
        const remarkTypeSeq =
          anno.remarkTypeSeq !== undefined ? anno.remarkTypeSeq : (matchedRow?.remarkTypeSeq ?? '')
        const remarkDescription =
          anno.remarkDescription !== undefined
            ? anno.remarkDescription
            : (matchedRow?.remarkDescription ?? matchedRow?.note ?? '')

        if (
          !String(remarkType ?? '').trim() ||
          !String(remarkTypeSeq ?? '').trim() ||
          !String(remarkDescription ?? '').trim()
        ) {
          incompleteRows.push(docNo)
          continue
        }

        if (matchedRow) {
          payload.push({
            IdSeq: idSeq,
            MasterSeq: matchedRow.MasterSeq || matchedRow.masterSeq || '',
            RegCode: matchedRow.RegCode || matchedRow.regCode || '',
            RowSeq: Number(matchedRow.RowSeq || matchedRow.rowSeq || 0),
            WorkingTag: 'U',
            PicDp: matchedRow.PicDp || matchedRow.pic || '',
            OperationNo:
              matchedRow.OperationNo || matchedRow.operationNo || matchedRow.planNo || '',
            OpDate: matchedRow.OpDate || matchedRow.opDate || matchedRow.actualDate || '',
            RoutingDocNo:
              matchedRow.RoutingDocNo || matchedRow.routingDocNo || matchedRow.orderNo || '',
            RoutingDocDate:
              matchedRow.RoutingDocDate || matchedRow.routingDocDate || matchedRow.planDate || '',
            ItemCode: matchedRow.ItemCode || matchedRow.itemCode || '',
            ItemName: matchedRow.ItemName || matchedRow.itemName || '',
            OperationName: matchedRow.OperationName || matchedRow.operationName || '',
            OpTypeName: matchedRow.OpTypeName || matchedRow.opTypeName || '',
            MachineName: matchedRow.MachineName || matchedRow.machineName || '',
            Unit: matchedRow.Unit || matchedRow.unit || '',
            TargetPassQty: String(
              matchedRow.TargetPassQty ?? matchedRow.targetPassQty ?? matchedRow.planQty ?? 0
            ),
            TargetProdQty: String(
              matchedRow.TargetProdQty ?? matchedRow.targetProdQty ?? matchedRow.planQty ?? 0
            ),
            StatPassQty: String(
              matchedRow.StatPassQty ?? matchedRow.statPassQty ?? matchedRow.actualQty ?? 0
            ),
            StartTime: matchedRow.StartTime || matchedRow.startTime || '',
            EndTime: matchedRow.EndTime || matchedRow.endTime || '',
            StandardProdTime: String(
              matchedRow.StandardProdTime ?? matchedRow.standardProdTime ?? 0
            ),
            ActualProdTime: String(matchedRow.ActualProdTime ?? matchedRow.actualProdTime ?? 0),
            StandardCapa: String(matchedRow.StandardCapa ?? matchedRow.standardCapa ?? 0),
            ActualCapa: String(matchedRow.ActualCapa ?? matchedRow.actualCapa ?? 0),
            StatusDpSx: matchedRow.StatusDpSx || matchedRow.dpStatus || '',
            TimeStatus: matchedRow.TimeStatus || matchedRow.timeStatus || '',
            CapaStatus: matchedRow.CapaStatus || matchedRow.capaStatus || '',
            UserMemo: String(remarkDescription),
            RemarkTypeSeq: String(remarkTypeSeq),
            RemarkContent: String(remarkDescription)
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

      if (!localOnly && payload.length > 0) {
        const rowsWithoutId = payload.filter((item) => !item.IdSeq)
        if (rowsWithoutId.length) {
          setErrorModalConfig({
            isOpen: true,
            title: 'Chưa có IdSeq',
            message: `${rowsWithoutId.length} dòng chưa có IdSeq trong CSDL nên chưa thể lưu đồng bộ vào DB. Giá trị vẫn được lưu trên thiết bị.`,
            type: 'warning'
          })
        } else {
          const res = await updatePlanDetail(payload)
          if (res?.success === false) {
            throw new Error(res.message || 'Lưu vào cơ sở dữ liệu thất bại')
          }
        }
      }

      try {
        localStorage.setItem(`prod-plan-audit:${plantKey}`, JSON.stringify(annotations))
      } catch (e) {
        console.warn('Lỗi lưu cache localStorage KHSX:', e)
      }

      // Cập nhật mảng data cha để đồng bộ giao diện tức thì
      for (const p of payload) {
        const row = data.find(
          (d) =>
            String(d.IdSeq || d.idSeq || d.id) === String(p.IdSeq) ||
            String(d.docNo || d.orderNo || d.planNo) === String(p.RoutingDocNo || p.OperationNo)
        )
        if (row) {
          const anno = annotations[row.rowKey || getRowKey(row)] || {}
          if (p.RemarkTypeSeq !== undefined) {
            row.RemarkTypeSeq = p.RemarkTypeSeq
            row.remarkTypeSeq = p.RemarkTypeSeq
          }
          if (p.RemarkContent !== undefined) {
            row.RemarkContent = p.RemarkContent
            row.remarkDescription = p.RemarkContent
            row.UserMemo = p.RemarkContent
            row.note = p.RemarkContent
          }
          if (anno.remarkType !== undefined) {
            row.RemarkType = anno.remarkType
            row.remarkType = anno.remarkType
            row.RemarkTypeName = anno.remarkType
          }
          if (anno.remarkTypeCode !== undefined) {
            row.RemarkTypeCode = anno.remarkTypeCode
            row.remarkTypeCode = anno.remarkTypeCode
          }
        }
      }

      await onSaved?.()
      setHasUnsavedEdits(false)
      setDirtyAnnotations({})
      setShowCloseConfirm(false)
      setSaveStatus(
        localOnly ? 'Đã lưu trên thiết bị này.' : 'Đã lưu thành công vào cơ sở dữ liệu!'
      )
      setTimeout(() => setSaveStatus(''), 4000)
    } catch (error) {
      console.error('Không thể lưu phân loại và diễn giải nhật trình KHSX:', error)
      setErrorModalConfig({
        isOpen: true,
        title: 'Không thể lưu thay đổi',
        message: String(error?.message || error),
        type: 'danger'
      })
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
      `ChiTiet_DieuPhoi_KHSX_${plantKey}_${activeCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`
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
          if (col.id === 'completionRate') {
            const p = Number(item.planQty ?? item.TargetProdQty ?? 0) || 0
            const a = Number(item.actualQty ?? item.StatPassQty ?? 0) || 0
            return p > 0 ? `${((a / p) * 100).toFixed(1)}%` : '100%'
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
          inset: 0,
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
            height: '100dvh',
            maxHeight: '100dvh',
            maxWidth: '100%',
            border: 'none',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {localOnly ? (
            <div
              role="toolbar"
              aria-label="Thao tác nhật trình đối soát KHSX"
              className="flex items-center justify-between bg-white px-2 py-0.5 border-b border-slate-200 shrink-0"
            >
              <div className="flex items-center gap-1.5 py-0.5 select-none flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseRequest}
                  disabled={isSaving}
                  className="uppercase text-[11px] font-bold text-slate-700 hover:text-slate-900 h-7 px-2 shrink-0"
                  title="Quay lại / Đóng nhật trình"
                >
                  <ArrowLeft size={13} />
                  <span>Quay lại</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedEdits || isSaving}
                  className="uppercase text-[11px] font-bold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0"
                >
                  <Save size={13} />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu'}</span>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseRequest}
                aria-label="Đóng nhật trình đối soát"
                title="Đóng nhật trình"
                className="h-7 px-2 shrink-0 text-slate-500"
              >
                <X size={16} />
              </Button>
            </div>
          ) : (
            <ProductionAuditModalHeader
              plantName={plantName}
              subtitle={
                isAnnotationTab
                  ? 'Kế hoạch sản xuất • Chỉnh sửa phân loại / diễn giải rồi lưu thay đổi.'
                  : 'Kế hoạch sản xuất • Đối soát tiến độ và trạng thái điều phối.'
              }
              onClose={handleCloseRequest}
            />
          )}

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
                placeholder="Tìm mã lệnh, SO, PIC, máy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '4px 8px 4px 28px',
                  fontSize: 12,
                  border: '1px solid #cbd5e1',
                  borderRadius: 2,
                  outline: 'none',
                  width: 220,
                  background: '#ffffff'
                }}
              />
            </div>

          </div>

          {/* Hàng 3: Glide Data Grid Sheet (Bảng dữ liệu bên dưới) */}
          <div
            className="gdg-style"
            style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}
          >
            <DataEditor
              ref={gridRef}
              columns={columns}
              rows={filteredData.length}
              getCellContent={getCellContent}
              getCellsForSelection={true}
              onCellEdited={onCellEdited}
              onCellClicked={onCellActivated}
              onCellActivated={onCellActivated}
              onPaste={onPaste}
              onColumnResize={onColumnResize}
              onColumnMoved={onColumnMoved}
              rowHeight={rowHeight}
              headerHeight={28}
              gridSelection={selection}
              onGridSelectionChange={setSelection}
              showSearch={showSearch}
              onSearchClose={() => setShowSearch(false)}
              keybindings={{ search: true, downFill: true, rightFill: true }}
              theme={DEFAULT_GRID_THEME}
              width="100%"
              height="100%"
            />
            {tableManager?.contextMenu && (
              <LayoutContextMenuSheet
                menuPosition={tableManager.contextMenu}
                onClose={() => tableManager.setContextMenu(null)}
                tableManager={tableManager}
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
      {activeCodeHelpRow && (
        <GenericCodeHelpModal
          isOpen={Boolean(activeCodeHelpRow)}
          onClose={() => setActiveCodeHelpRow(null)}
          title={`Chọn Phân loại cho Lệnh: ${activeCodeHelpRow.docNo || activeCodeHelpRow.orderNo || activeCodeHelpRow.rowKey}`}
          columns={REMARK_TYPE_CODEHELP_COLUMNS}
          helpData={remarkTypesForModal}
          data={remarkTypesForModal}
          initialSearchText=""
          onSelect={(selected) => {
            const rowKey = activeCodeHelpRow.rowKey || getRowKey(activeCodeHelpRow)
            const typeName = selected?.TypeCode === '(Trống)' ? '' : selected?.TypeName || ''
            const typeCode = selected?.TypeCode === '(Trống)' ? '' : selected?.TypeCode || ''
            const typeSeq = selected?.TypeCode === '(Trống)' ? '' : selected?.IdSeq || ''

            setAnnotations((prev) => ({
              ...prev,
              [rowKey]: {
                ...(prev[rowKey] || {}),
                idSeq:
                  activeCodeHelpRow.IdSeq || activeCodeHelpRow.idSeq || activeCodeHelpRow.id || '',
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
            setActiveCodeHelpRow(null)
          }}
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
