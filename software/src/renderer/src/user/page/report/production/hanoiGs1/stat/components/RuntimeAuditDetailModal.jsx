/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Download, Copy, Search, Check, Save, ArrowLeft, X } from 'lucide-react'
import {
  DataEditor,
  GridCellKind,
  CompactSelection,
  GridColumnIcon
} from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { Button } from '@renderer/components/ui/button'
import { PureButton, PureSelect } from './reportUIComponents'
import { DEFAULT_GRID_THEME } from '@renderer/user/components/hooks/sheet/useTableCellTheme'
import { queryProdStatsRemarkTypes } from '@renderer/user/page/report/registration/remarkType/remarkTypeService'
import { updateProdStatsDetail } from '@renderer/user/page/report/registration/services/planRegistrationService'
import useTableManager from '@renderer/user/components/hooks/sheet/useTableManager'
import LayoutMenuSheet from '@renderer/user/components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '@renderer/user/components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '@renderer/user/components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox, message } from 'antd'
import SystemConfirmModal from '@renderer/user/components/modal/SystemConfirmModal'
import GenericCodeHelpModal from '@renderer/user/components/query/core/GenericCodeHelpModal'
import { reorderColumns } from '@renderer/user/components/sheet/js/reorderColumns'

const AUDIT_COLUMNS = [
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
  { id: 'ticketNo', title: 'Mã phiếu', width: 140, hasMenu: true },
  { id: 'orderNo', title: 'Lệnh SX', width: 130, hasMenu: true },
  { id: 'machineCode', title: 'Mã máy', width: 100, hasMenu: true },
  { id: 'machineName', title: 'Tên máy', width: 180, hasMenu: true },
  { id: 'teamName', title: 'Tổ SX', width: 120, hasMenu: true },
  { id: 'startDate', title: 'Ngày BĐ', width: 110, hasMenu: true },
  { id: 'startTime', title: 'Giờ BĐ', width: 100, hasMenu: true },
  { id: 'endDate', title: 'Ngày KT', width: 110, hasMenu: true },
  { id: 'endTime', title: 'Giờ KT', width: 100, hasMenu: true },
  { id: 'runtimeH', title: 'Giờ chạy', width: 100, hasMenu: true },
  { id: 'actual', title: 'SL SX', width: 110, hasMenu: true },
  { id: 'pass', title: 'SL Đạt', width: 110, hasMenu: true },
  { id: 'passRate', title: 'Tỷ lệ', width: 80, hasMenu: true },
  { id: 'auditText', title: 'Cảnh báo', width: 220, hasMenu: true },
  { id: 'operator', title: 'Người làm', width: 160, hasMenu: true }
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

const isElectron = typeof window !== 'undefined' && Boolean(window.electron)

// Cache danh mục phân loại trong bộ nhớ RAM để đảm bảo CodeHelp mở tức thì 0ms, không lag
let cachedRemarkTypes = null
let remarkTypesPromise = null

const fetchRemarkTypesCached = async () => {
  if (cachedRemarkTypes && cachedRemarkTypes.length > 0) return cachedRemarkTypes
  if (remarkTypesPromise) return remarkTypesPromise

  remarkTypesPromise = queryProdStatsRemarkTypes({
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
      cachedRemarkTypes = records
        .filter((item) => item.IsActive !== false && item.IsActive !== 0 && item.IsActive !== '0')
        .map((item) => ({
          IdSeq: item.IdSeq || item.Id || item.idSeq || '',
          TypeCode: String(item.TypeCode || ''),
          TypeName: String(item.TypeName || ''),
          Description: String(item.Description || '')
        }))
      return cachedRemarkTypes
    })
    .catch((err) => {
      console.error('Không thể tải danh mục phân loại:', err)
      return []
    })
    .finally(() => {
      remarkTypesPromise = null
    })

  return remarkTypesPromise
}

const REMARK_TYPE_CODEHELP_COLUMNS = [
  { id: 'TypeCode', title: 'Mã phân loại', width: 130 },
  { id: 'TypeName', title: 'Tên phân loại', width: 220 },
  { id: 'Description', title: 'Diễn giải / Ghi chú', width: 340 }
]

const getMinutesOfDay = (value) => {
  const match = String(value || '')
    .trim()
    .match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i)
  if (!match) return null

  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[4]?.toUpperCase()
  if (hour > 23 || minute > 59) return null
  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (meridiem === 'PM' ? 12 : 0)
  }
  return hour * 60 + minute + (Number(match[3]) || 0) / 60
}

// Modal đối soát thời gian và nhật trình chi tiết phiếu sản xuất.
export const RuntimeAuditDetailModal = ({
  isOpen,
  onClose,
  initialCategory = 'ALL',
  data = [],
  plantName = '',
  plantKey = 'production',
  canEdit = true,
  localOnly = true,
  showWorkingTag = true,
  maskText = (t) => t
}) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [draftCategory, setDraftCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('ALL')
  const [draftTeam, setDraftTeam] = useState('ALL')
  const [selectedMachine, setSelectedMachine] = useState('ALL')
  const [draftMachine, setDraftMachine] = useState('ALL')
  const [columnWidths, setColumnWidths] = useState({})
  const [columnOrder, setColumnOrder] = useState(() => [
    ...(showWorkingTag ? [WORKING_TAG_COLUMN.id] : []),
    ...AUDIT_COLUMNS.map((column) => column.id)
  ])
  const [hiddenColumns, setHiddenColumns] = useState([])
  const [annotations, setAnnotations] = useState({})
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false)
  const [dirtyAnnotations, setDirtyAnnotations] = useState({})
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [errorModalConfig, setErrorModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger'
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [remarkTypesList, setRemarkTypesList] = useState(() => cachedRemarkTypes || [])
  const gridRef = useRef(null)
  const [keybindings] = useState({ downFill: true, rightFill: true, selectColumn: true })
  const [gridSelection, setGridSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    try {
      localStorage.removeItem(`prod-ticket-audit:${plantKey}`)
    } catch { }
    setAnnotations({})
    setHasUnsavedEdits(false)
    setDirtyAnnotations({})
    setSaveStatus('')

    // Nạp sẵn danh mục phân loại vào RAM để CodeHelp mở tức thì
    if (cachedRemarkTypes && cachedRemarkTypes.length > 0) {
      setRemarkTypesList(cachedRemarkTypes)
    } else {
      fetchRemarkTypesCached().then((records) => setRemarkTypesList(records))
    }
  }, [isOpen, plantKey])

  const remarkTypesForModal = useMemo(() => {
    return [
      {
        IdSeq: '',
        TypeCode: '(Trống)',
        TypeName: '-- Hủy gán phân loại --',
        Description: 'Xóa phân loại cho phiếu này'
      },
      ...remarkTypesList
    ]
  }, [remarkTypesList])

  const isAnnotationTab = activeCategory === 'OVER_12H' || activeCategory === 'UNDER_5MIN'

  const availableAuditColumns = useMemo(() => {
    const baseColumns = showWorkingTag ? [WORKING_TAG_COLUMN, ...AUDIT_COLUMNS] : AUDIT_COLUMNS
    const mapped = baseColumns.map((col) => {
      if (canEdit && col.id === 'remarkType') {
        return {
          ...col,
          title: 'Phân loại *',
          icon: GridColumnIcon.HeaderString,
          themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
        }
      }
      if (canEdit && col.id === 'remarkDescription') {
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
  }, [isAnnotationTab, showWorkingTag, canEdit])

  const columns = useMemo(
    () =>
      columnOrder
        .filter((id) => {
          if (!isAnnotationTab && (id === 'remarkType' || id === 'remarkDescription')) {
            return false
          }
          return !hiddenColumns.includes(id)
        })
        .map((id) => {
          const column = availableAuditColumns.find((item) => item.id === id)
          return column ? { ...column, width: columnWidths[id] ?? column.width } : null
        })
        .filter(Boolean),
    [columnOrder, hiddenColumns, columnWidths, isAnnotationTab, availableAuditColumns]
  )

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

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory || 'ALL')
      setDraftCategory(initialCategory || 'ALL')
      setSearchQuery('')
      setDraftSearchQuery('')
      setSelectedTeam('ALL')
      setDraftTeam('ALL')
      setSelectedMachine('ALL')
      setDraftMachine('ALL')
    }
  }, [isOpen, initialCategory])

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

  // Lấy danh sách tổ & máy duy nhất
  const teamOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      const t = item.TeamName || item.teamName || item.OpTypeName || item.opTypeName
      if (t) set.add(String(t).trim())
    })
    return Array.from(set).sort()
  }, [data])

  const machineOptions = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      const m = item.MachineCode || item.machineCode
      if (m) set.add(String(m).trim())
    })
    return Array.from(set).sort()
  }, [data])

  // Chuẩn hóa dữ liệu từng dòng
  const classifiedData = useMemo(() => {
    return data.map((item, idx) => {
      const ticketNo =
        item.StatTicketNo ||
        item.statTicketNo ||
        item.ticketCode ||
        item.ticketNo ||
        item.RegCode ||
        `P-${idx + 1}`
      const orderNo =
        item.OperationNo ||
        item.operationNo ||
        item.RoutingDocNo ||
        item.routingDocNo ||
        item.docNo ||
        item.orderCode ||
        ''
      const machineCode = item.MachineCode || item.machineCode || item.MachineId || ''
      const machineName =
        item.MachineName || item.machineName || item.WorkCenter || item.workCenter || machineCode
      const teamName =
        item.TeamName ||
        item.teamName ||
        item.OpTypeName ||
        item.opTypeName ||
        item.SectionName ||
        ''

      const startDate =
        item.StartDate ||
        item.startDate ||
        item.StatDate ||
        item.statDate ||
        item.prodDate ||
        item.date ||
        ''
      const startTime = item.StartTime || item.startTime || item.createdTime || ''
      const endDate =
        item.EndDate ||
        item.endDate ||
        item.StatDate ||
        item.statDate ||
        item.prodDate ||
        item.date ||
        startDate ||
        ''
      const endTime = item.EndTime || item.endTime || item.syncTime || ''

      const durMin = Number(item.durationMinutes || (Number(item.runtimeHours) || 0) * 60) || 0
      const runtimeH = Number(item.runtimeHours || durMin / 60 || 0)
      const actual = Number(item.ProdQty || item.prodQty || item.actualQty || item.output || 0)
      const pass = Number(item.PassQty || item.passQty || item.passQuantity || actual)
      const passRate = actual > 0 ? Number(((pass / actual) * 100).toFixed(1)) : 100
      const operator =
        item.MainWorker ||
        item.mainWorker ||
        item.operator ||
        item.StatStaff ||
        item.statStaff ||
        ''

      const isReversed = Boolean(
        item.isTimeReversed ||
        item.auditCategory === 'INVALID_TIME' ||
        item.timeError === 'REVERSED_TIME' ||
        (startDate &&
          endDate &&
          String(startDate).slice(0, 10) === String(endDate).slice(0, 10) &&
          getMinutesOfDay(startTime) !== null &&
          getMinutesOfDay(endTime) !== null &&
          getMinutesOfDay(endTime) < getMinutesOfDay(startTime))
      )
      const runtimeAuditExcluded =
        item.runtimeAuditExcluded ||
        [
          item.machineCode,
          item.MachineCode,
          item.machineName,
          item.MachineName,
          item.RawLineCode,
          item.RawLineName
        ].some((value) =>
          String(value || '')
            .trim()
            .toUpperCase()
            .startsWith('HN-SON-NO-CHECK')
        )

      let category = 'NORMAL'
      let auditText = 'Bình thường'

      if (isReversed) {
        category = 'INVALID_TIME'
        auditText = `Sai mốc giờ (${startTime} > ${endTime})`
      } else if (runtimeAuditExcluded) {
        category = 'EXCLUDED_MACHINE'
        auditText = 'Không kiểm tra thời gian với máy HN-SON-NO-CHECK'
      } else if (durMin < 5) {
        category = 'UNDER_5MIN'
        auditText = '< 5 phút'
      } else if (durMin > 720) {
        category = 'OVER_12H'
        auditText = '> 12 giờ'
      }

      const workingKey = String(ticketNo)
      const isDirty = Boolean(dirtyAnnotations[workingKey])
      const workingTag = isDirty ? 'U' : ''
      const annotation = isDirty ? annotations[workingKey] || {} : {}

      let remarkType =
        isDirty && annotation.remarkType !== undefined
          ? annotation.remarkType
          : item.remarkType || item.RemarkTypeName || item.RemarkType || ''
      let remarkTypeCode =
        isDirty && annotation.remarkTypeCode !== undefined
          ? annotation.remarkTypeCode
          : item.remarkTypeCode || item.RemarkTypeCode || ''
      let remarkTypeSeq =
        isDirty && annotation.remarkTypeSeq !== undefined
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
        isDirty && annotation.remarkDescription !== undefined
          ? annotation.remarkDescription
          : item.RemarkContent || item.remarkContent || ''

      return {
        ...item,
        idSeq: item.IdSeq || item.idSeq || item.Id || item.id || '',
        WorkingTag: workingTag,
        ticketNo,
        orderNo,
        machineCode,
        machineName,
        teamName,
        startDate: String(startDate).slice(0, 10),
        startTime: String(startTime).trim(),
        endDate: String(endDate).slice(0, 10),
        endTime: String(endTime).trim(),
        runtimeH,
        durMin,
        actual,
        pass,
        passRate,
        operator,
        remarkType,
        remarkTypeCode,
        remarkTypeSeq,
        remarkDescription,
        isTimeReversed: isReversed,
        runtimeAuditExcluded,
        auditCategory: category,
        auditText
      }
    })
  }, [data, annotations, dirtyAnnotations, remarkTypesList])

  // Đếm số lượng từng loại
  const categoryCounts = useMemo(() => {
    let all = classifiedData.length
    let invalidTime = 0
    let normal = 0
    let over12 = 0
    let under5 = 0

    classifiedData.forEach((d) => {
      if (d.auditCategory === 'INVALID_TIME') invalidTime++
      else if (d.auditCategory === 'NORMAL') normal++
      else if (d.auditCategory === 'OVER_12H') over12++
      else if (d.auditCategory === 'UNDER_5MIN') under5++
    })

    return { all, invalidTime, normal, over12, under5 }
  }, [classifiedData])

  // Lọc dữ liệu
  const filteredData = useMemo(() => {
    return classifiedData.filter((item) => {
      if (activeCategory !== 'ALL' && item.auditCategory !== activeCategory) return false
      if (selectedTeam !== 'ALL' && item.teamName !== selectedTeam) return false
      if (selectedMachine !== 'ALL' && item.machineCode !== selectedMachine) return false

      if (searchQuery.trim()) {
        const queries = searchQuery
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)

        if (queries.length > 0) {
          const match = queries.some((q) => {
            return (
              item.ticketNo.toLowerCase().includes(q) ||
              item.orderNo.toLowerCase().includes(q) ||
              item.machineCode.toLowerCase().includes(q) ||
              item.machineName.toLowerCase().includes(q) ||
              item.teamName.toLowerCase().includes(q) ||
              item.operator.toLowerCase().includes(q) ||
              String(item.remarkType || '')
                .toLowerCase()
                .includes(q) ||
              String(item.remarkDescription || '')
                .toLowerCase()
                .includes(q)
            )
          })
          if (!match) return false
        }
      }

      return true
    })
  }, [classifiedData, activeCategory, selectedTeam, selectedMachine, searchQuery])

  // Danh sách các cột bị khóa hoàn toàn (chỉ cho phép sửa 2 cột: remarkType và remarkDescription)
  const readOnlyColumns = useMemo(
    () =>
      columns
        .map((col) => col.id)
        .filter((id) => (canEdit ? id !== 'remarkDescription' && id !== 'remarkType' : true)),
    [columns, canEdit]
  )

  // Cấu hình CodeHelp chuẩn ERP đồng bộ với useTableManager & GenericCodeHelpModal
  const codeHelpConfig = useMemo(() => {
    return {
      remarkType: {
        title: 'Tra cứu danh mục phân loại',
        columns: REMARK_TYPE_CODEHELP_COLUMNS,
        helpData: remarkTypesForModal,
        onSelect: (selected, rowIndex) => {
          const item = filteredData[rowIndex]
          if (!item) return {}
          const isClear = !selected || selected.TypeCode === '(Trống)' || !selected.IdSeq
          const ticketKey = String(item.ticketNo)
          const updatedType = isClear ? '' : selected?.TypeName || ''
          const updatedCode = isClear ? '' : selected?.TypeCode || ''
          const updatedSeq = isClear ? '' : selected?.IdSeq || ''

          if (
            String(item.remarkType ?? '') === updatedType &&
            String(item.remarkTypeCode ?? '') === updatedCode &&
            String(item.remarkTypeSeq ?? '') === updatedSeq
          ) {
            return {
              remarkType: updatedType,
              remarkTypeCode: updatedCode,
              remarkTypeSeq: updatedSeq
            }
          }

          setAnnotations((prev) => ({
            ...prev,
            [ticketKey]: {
              ...(prev[ticketKey] || {}),
              idSeq: item.IdSeq || item.idSeq || item.id || '',
              ticketNo: item.ticketNo,
              remarkType: updatedType,
              remarkTypeCode: updatedCode,
              remarkTypeSeq: updatedSeq
            }
          }))
          setDirtyAnnotations((prev) => ({
            ...prev,
            [ticketKey]: { ...(prev[ticketKey] || {}), remarkTypeSeq: true }
          }))
          setHasUnsavedEdits(true)

          return {
            remarkType: updatedType,
            remarkTypeCode: updatedCode,
            remarkTypeSeq: updatedSeq
          }
        }
      }
    }
  }, [remarkTypesForModal, filteredData])

  // Dùng cùng bộ quản lý bảng chuẩn ERP (bàn phím, CodeHelp, theme màu và context menu)
  const tableManager = useTableManager({
    tableId: 'production_statistics_audit_detail',
    defaultCols: availableAuditColumns,
    cols: columns,
    gridData: filteredData,
    selection: gridSelection,
    setSelection: setGridSelection,
    canEdit,
    setShowSearch,
    codeHelpColumns: ['remarkType'],
    readOnlyColumns,
    codeHelpConfig,
    gridTheme: {
      bgCell: '#ffffff',
      bgHeader: '#f8fafc',
      headerFontStyle: '600 12px',
      baseFontStyle: '12px'
    }
  })

  // Cung cấp nội dung ô: Khóa cứng toàn bộ các cột ngoại trừ ô Diễn giải & Phân loại
  const getCellContent = useCallback(
    ([col, row]) => {
      const item = filteredData[row]
      const columnId = columns[col]?.id
      if (!item || !columnId) return { kind: GridCellKind.Loading, allowOverlay: false }

      const numericValue = columnId === 'stt' ? row + 1 : item[columnId]

      if (columnId === 'WorkingTag') {
        const status = String(item.WorkingTag || '')
        return {
          kind: GridCellKind.Text,
          data: status,
          displayData: status,
          readonly: true,
          allowOverlay: false,
          hasMenu: columns[col]?.hasMenu || false,
          contentAlign: 'center',
          themeOverride: tableManager.getCellTheme(columnId)
        }
      }

      // 1. Cột Phân loại: CodeHelp cell (Nền xanh nhạt, khóa gõ tay, mở tra cứu bằng Double click/Enter/F2)
      if (columnId === 'remarkType') {
        const text = String(item.remarkType || '')
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text || (canEdit ? '' : ''),
          readonly: true,
          allowOverlay: false,
          contentAlign: 'left',
          themeOverride: tableManager.getCellTheme('remarkType')
        }
      }

      // 2. Cột Diễn giải: CỘT DUY NHẤT cho phép chỉnh sửa văn bản trực tiếp
      if (columnId === 'remarkDescription') {
        const text = String(item.remarkDescription || '')
        const isEditable = Boolean(canEdit && isAnnotationTab)
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text,
          readonly: !isEditable,
          allowOverlay: isEditable,
          hasMenu: true,
          contentAlign: 'left',
          themeOverride: isEditable ? undefined : tableManager.getCellTheme('remarkDescription')
        }
      }

      // 3. Toàn bộ các cột dữ liệu còn lại: KHÓA HOÀN TOÀN (Read-only 100%, áp nền xám chuẩn ERP)
      if (['stt', 'runtimeH', 'actual', 'pass', 'passRate'].includes(columnId)) {
        let displayData = String(numericValue)
        if (columnId === 'runtimeH') displayData = `${numericValue.toFixed(2)}h`
        if (columnId === 'actual' || columnId === 'pass') {
          displayData = numericValue.toLocaleString('vi-VN')
        }
        if (columnId === 'passRate') displayData = `${numericValue}%`
        return {
          kind: GridCellKind.Number,
          data: numericValue,
          displayData,
          readonly: true,
          allowOverlay: false,
          contentAlign: columnId === 'stt' ? 'center' : 'right',
          themeOverride: tableManager.getCellTheme(columnId)
        }
      }

      let value = item[columnId]
      if (['startDate', 'endDate'].includes(columnId) && value) {
        value = formatDateVN(value)
      }
      if (columnId === 'machineName') value = maskText(value, 5)
      if (columnId === 'operator' && value) value = maskText(value, 3)
      const text = String(value || '-')
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        readonly: true,
        allowOverlay: false,
        contentAlign: ['startDate', 'startTime', 'endDate', 'endTime'].includes(columnId)
          ? 'center'
          : 'left',
        themeOverride: tableManager.getCellTheme(columnId)
      }
    },
    [filteredData, columns, maskText, canEdit, tableManager]
  )

  // Chỉ cho phép chỉnh sửa ô trực tiếp ở cột Diễn giải (remarkDescription)
  const onCellEdited = useCallback(
    async (cell, newValue) => {
      if (
        !canEdit ||
        (newValue.kind !== GridCellKind.Text &&
          newValue.kind !== GridCellKind.Custom &&
          newValue.kind !== GridCellKind.Boolean &&
          newValue.kind !== GridCellKind.Number)
      ) {
        return
      }
      const indexes = reorderColumns(columns)
      const [col, row] = cell
      const key = indexes[col]

      // Khóa tất cả các cột khác, chỉ duy nhất remarkDescription được edit
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

      const ticketKey = String(item.ticketNo)

      setAnnotations((prev) => ({
        ...prev,
        [ticketKey]: {
          ...(prev[ticketKey] || {}),
          idSeq: item.IdSeq || item.idSeq || item.id || '',
          ticketNo: item.ticketNo,
          remarkDescription: valToSet
        }
      }))
      setDirtyAnnotations((prev) => ({
        ...prev,
        [ticketKey]: { ...(prev[ticketKey] || {}), remarkDescription: true }
      }))
      setHasUnsavedEdits(true)
    },
    [columns, filteredData, canEdit]
  )

  // Hỗ trợ copy dán nhiều dòng từ Excel:
  // - Cột Diễn giải: ghi nhận văn bản
  // - Cột Phân loại: TỰ ĐỘNG TÌM KIẾM ĐỐI SOÁT (Batch Resolve) theo Mã hoặc Tên phân loại
  const onPaste = useCallback(
    async (target, values) => {
      if (!values || values.length === 0 || !canEdit) return false
      const [startCol, startRow] = target
      const indexes = reorderColumns(columns)
      const numPastedRows = values.length
      const numPastedCols = values[0]?.length || 0

      // Chuẩn bị từ điển tra cứu cho danh mục Phân loại
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
        const ticketKey = String(item.ticketNo)

        for (let c = 0; c < numPastedCols; c++) {
          const targetCol = startCol + c
          if (targetCol >= columns.length) break
          const columnKey = indexes[targetCol]

          if (columnKey === 'remarkDescription') {
            const cellVal = String(rowValues[c] ?? '')
            setAnnotations((prev) => ({
              ...prev,
              [ticketKey]: {
                ...(prev[ticketKey] || {}),
                idSeq: item.IdSeq || item.idSeq || item.id || '',
                ticketNo: item.ticketNo,
                remarkDescription: cellVal
              }
            }))
            setDirtyAnnotations((prev) => ({
              ...prev,
              [ticketKey]: { ...(prev[ticketKey] || {}), remarkDescription: true }
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
              [ticketKey]: {
                ...(prev[ticketKey] || {}),
                idSeq: item.IdSeq || item.idSeq || item.id || '',
                ticketNo: item.ticketNo,
                remarkType: updatedType,
                remarkTypeCode: updatedCode,
                remarkTypeSeq: updatedSeq
              }
            }))
            setDirtyAnnotations((prev) => ({
              ...prev,
              [ticketKey]: { ...(prev[ticketKey] || {}), remarkTypeSeq: true }
            }))
            setHasUnsavedEdits(true)
          }
        }
      }
      return false
    },
    [columns, filteredData, canEdit, remarkTypesList]
  )

  const onFillPattern = useCallback(
    ({ patternSource, fillDestination, preventDefault }) => {
      preventDefault?.()
      if (!canEdit || !isAnnotationTab || !patternSource || !fillDestination) return

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

          const ticketKey = String(targetItem.ticketNo)
          const rowUpdate = annotationUpdates.get(ticketKey) || {
            idSeq: targetItem.IdSeq || targetItem.idSeq || targetItem.id || '',
            ticketNo: targetItem.ticketNo
          }
          const dirtyRow = dirtyUpdates.get(ticketKey) || {}

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
            rowUpdate.remarkDescription = description
            dirtyRow.remarkDescription = true
          }

          annotationUpdates.set(ticketKey, rowUpdate)
          dirtyUpdates.set(ticketKey, dirtyRow)
        }
      }

      if (annotationUpdates.size === 0) return

      setAnnotations((previous) => {
        const next = { ...previous }
        annotationUpdates.forEach((updates, ticketKey) => {
          next[ticketKey] = { ...(previous[ticketKey] || {}), ...updates }
        })
        return next
      })
      setDirtyAnnotations((previous) => {
        const next = { ...previous }
        dirtyUpdates.forEach((updates, ticketKey) => {
          next[ticketKey] = { ...(previous[ticketKey] || {}), ...updates }
        })
        return next
      })
      setHasUnsavedEdits(true)
    },
    [canEdit, isAnnotationTab, columns, filteredData, remarkTypesList]
  )

  const handleQuery = () => {
    setActiveCategory(draftCategory)
    setSearchQuery(draftSearchQuery)
    setSelectedTeam(draftTeam)
    setSelectedMachine(draftMachine)
  }

  // Lưu chỉnh sửa nhật trình trên máy người dùng hoặc đồng bộ lên CSDL theo cấu hình.
  const handleSave = async () => {
    if (!hasUnsavedEdits) return
    setIsSaving(true)
    setSaveStatus('')
    try {
      // Mọi dòng đang sửa bắt buộc có Phân loại hợp lệ và Diễn giải trước khi lưu.
      const editedTicketKeys = Object.keys(dirtyAnnotations)
      const payload = []
      const incompleteTickets = []

      for (const ticketKey of editedTicketKeys) {
        const anno = annotations[ticketKey]
        if (!anno) {
          incompleteTickets.push(ticketKey)
          continue
        }
        const matchedRow = classifiedData.find(
          (d) => String(d.ticketNo) === String(ticketKey) || String(d.idSeq) === String(anno.idSeq)
        )
        const idSeq = anno.idSeq || matchedRow?.idSeq || matchedRow?.IdSeq || ''
        const statTicketNo = matchedRow?.ticketNo || ticketKey
        const remarkType =
          anno.remarkType !== undefined ? anno.remarkType : (matchedRow?.remarkType ?? '')

        let finalSeq = String(
          anno.remarkTypeSeq !== undefined
            ? anno.remarkTypeSeq
            : (matchedRow?.remarkTypeSeq ?? matchedRow?.RemarkTypeSeq ?? '')
        ).trim()

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
          incompleteTickets.push(statTicketNo)
          continue
        }

        payload.push({
          IdSeq: idSeq,
          RemarkTypeSeq: finalSeq,
          RemarkContent: String(remarkDescription),
          RowVersion: Number(matchedRow?.RowVersion || matchedRow?.rowVersion || 1)
        })
      }

      if (incompleteTickets.length > 0) {
        const ticketList = incompleteTickets.slice(0, 10).join(', ')
        const remainder =
          incompleteTickets.length > 10 ? ` và ${incompleteTickets.length - 10} phiếu khác` : ''
        const msg = `Mỗi dòng cần có Phân loại hợp lệ và Diễn giải trước khi lưu. Vui lòng kiểm tra: ${ticketList}${remainder}.`
        setSaveStatus(msg)
        setErrorModalConfig({
          isOpen: true,
          title: 'Thiếu thông tin bắt buộc',
          message: msg,
          type: 'warning'
        })
        return
      }

      if (payload.length > 0) {
        const rowsWithoutId = payload.filter((item) => !item.IdSeq)
        if (rowsWithoutId.length) {
          setErrorModalConfig({
            isOpen: true,
            title: 'Chưa có IdSeq',
            message: `${rowsWithoutId.length} phiếu chưa có IdSeq trong CSDL nên chưa thể lưu đồng bộ vào DB. Giá trị vẫn được lưu trên thiết bị.`,
            type: 'warning'
          })
          return
        }
        const res = await updateProdStatsDetail(payload, { plantKey })
        if (res && res.success === false) {
          throw new Error(res.message || 'Lưu vào cơ sở dữ liệu thất bại')
        }
      }

      try {
        localStorage.removeItem(`prod-ticket-audit:${plantKey}`)
      } catch (e) {
        // ignore
      }

      // Cập nhật dữ liệu báo cáo cha để đồng bộ giao diện
      for (const p of payload) {
        const row = data.find(
          (d) =>
            String(d.StatTicketNo || d.ticketNo || d.statTicketNo || d.RegCode) ===
            String(p.StatTicketNo) ||
            String(d.IdSeq || d.idSeq || d.Id || d.id) === String(p.IdSeq)
        )
        if (row) {
          const anno = annotations[p.StatTicketNo] || {}
          if (p.RemarkTypeSeq !== undefined) {
            row.RemarkTypeSeq = p.RemarkTypeSeq
            row.remarkTypeSeq = p.RemarkTypeSeq
          }
          if (p.RemarkContent !== undefined) {
            row.RemarkContent = p.RemarkContent
            row.remarkDescription = p.RemarkContent
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

      setHasUnsavedEdits(false)
      setDirtyAnnotations({})
      setAnnotations({})
      setShowCloseConfirm(false)
      setSaveStatus('Đã lưu thành công vào cơ sở dữ liệu!')
      setTimeout(() => setSaveStatus(''), 4000)
    } catch (error) {
      console.error('Không thể lưu phân loại và diễn giải nhật trình:', error)
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

  // Xuất Excel
  const handleExportExcel = () => {
    try {
      const wsData = filteredData.map((item, idx) => ({
        STT: idx + 1,
        'Mã phiếu': item.ticketNo,
        'Lệnh SX / CT': item.orderNo,
        'Mã máy': item.machineCode,
        'Tên máy sản xuất': item.machineName,
        'Tổ sản xuất': item.teamName,
        'Ngày bắt đầu': formatDateVN(item.startDate),
        'Giờ bắt đầu': item.startTime,
        'Ngày kết thúc': formatDateVN(item.endDate),
        'Giờ kết thúc': item.endTime,
        'Giờ chạy (h)': Number(item.runtimeH.toFixed(2)),
        'SL Sản xuất': item.actual,
        'SL Đạt': item.pass,
        'Tỷ lệ đạt (%)': `${item.passRate}%`,
        'Cảnh báo / Đối soát': item.auditText,
        'Type phân loại': item.remarkType,
        'Diễn giải': item.remarkDescription,
        'Người thực hiện': item.operator
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'DoiSoatThoiGian')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `DoiSoat_ThoiGian_${plantName || 'GS'}_${dateStr}.xlsx`)
    } catch (err) {
      console.error('Export excel error:', err)
    }
  }

  // Sao chép TSV
  const handleCopyTSV = () => {
    try {
      const headers = [
        'STT',
        'Mã phiếu',
        'Lệnh SX',
        'Mã máy',
        'Tên máy',
        'Tổ SX',
        'Ngày BĐ',
        'Giờ BĐ',
        'Ngày KT',
        'Giờ KT',
        'Giờ chạy (h)',
        'SL SX',
        'SL Đạt',
        'Tỷ lệ (%)',
        'Cảnh báo',
        'Type phân loại',
        'Diễn giải',
        'Người làm'
      ]
      const rows = filteredData.map((item, idx) => [
        idx + 1,
        item.ticketNo,
        item.orderNo,
        item.machineCode,
        item.machineName,
        item.teamName,
        formatDateVN(item.startDate),
        item.startTime,
        formatDateVN(item.endDate),
        item.endTime,
        item.runtimeH.toFixed(2),
        item.actual,
        item.pass,
        `${item.passRate}%`,
        item.auditText,
        item.remarkType,
        item.remarkDescription,
        item.operator
      ])
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
            aria-label="Thao tác nhật trình đối soát"
            className="flex items-center justify-between bg-white px-3 py-1 border-b border-slate-200 shrink-0 select-none"
            style={{ minHeight: 34 }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseRequest}
                disabled={isSaving}
                className="uppercase text-[11px] font-bold text-slate-700 hover:text-slate-900 h-7 px-2 shrink-0 border border-slate-200"
                title="Quay lại / Đóng nhật trình"
              >
                <ArrowLeft size={13} />
                <span>Quay lại</span>
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedEdits || isSaving}
                  aria-label="Lưu nhật trình đối soát"
                  title="Lưu thay đổi phân loại và diễn giải"
                  className="uppercase text-[11px] font-bold text-indigo-700 hover:text-indigo-800 h-7 px-2 shrink-0 border border-indigo-200 bg-indigo-50/50"
                >
                  <Save size={13} />
                  <span>{isSaving ? 'Đang lưu...' : localOnly ? 'Lưu' : 'Lưu vào DB'}</span>
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

          {/* Tabs phân loại và bộ lọc nhật trình */}
          <div
            style={{
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: localOnly ? '4px 8px 0' : '8px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              gap: 8,
              flexShrink: 0
            }}
          >
            {/* Các trạng thái được trình bày như tab điều hướng */}
            <div
              role="tablist"
              aria-label="Lọc nhật trình theo trạng thái đối soát"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: localOnly ? 12 : 6,
                flexWrap: 'wrap',
                minHeight: localOnly ? 32 : undefined,
                padding: localOnly ? '0 8px' : undefined,
                background: localOnly ? '#ffffff' : undefined,
                borderBottom: localOnly ? '1px solid #e2e8f0' : undefined
              }}
            >
              {[
                { id: 'ALL', label: 'Tất cả', count: categoryCounts.all },
                ...(categoryCounts.invalidTime > 0
                  ? [
                    {
                      id: 'INVALID_TIME',
                      label: 'Sai mốc giờ',
                      count: categoryCounts.invalidTime
                    }
                  ]
                  : []),
                { id: 'NORMAL', label: 'Chuẩn (5p–12h)', count: categoryCounts.normal },
                { id: 'OVER_12H', label: '> 12 giờ', count: categoryCounts.over12 },
                { id: 'UNDER_5MIN', label: '< 5 phút', count: categoryCounts.under5 }
              ].map((tab) => {
                const isActive = activeCategory === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setDraftCategory(tab.id)
                      setActiveCategory(tab.id)
                    }}
                    style={{
                      position: localOnly ? 'relative' : undefined,
                      alignSelf: localOnly ? 'stretch' : undefined,
                      padding: localOnly ? '0 6px' : '4px 10px',
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

            {/* Lọc dropdown & Tìm kiếm */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <details style={{ position: 'relative', fontSize: 12, color: '#334155' }}>
                <summary
                  style={{ cursor: 'pointer', padding: '4px 10px', border: '1px solid #e2e8f0' }}
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
                      const visible = !hiddenColumns.includes(id)
                      return (
                        <label key={id} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={visible}
                            disabled={visible && columns.length === 1}
                            onChange={() => toggleColumn(id)}
                          />
                          {column.title}
                        </label>
                      )
                    })}
                  <PureButton
                    onClick={() => {
                      setHiddenColumns([])
                      setColumnOrder(availableAuditColumns.map((column) => column.id))
                      setColumnWidths({})
                    }}
                  >
                    Khôi phục cột mặc định
                  </PureButton>
                </div>
              </details>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '3px 8px',
                  width: 250
                }}
              >
                <Search size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                <input
                  type="text"
                  placeholder="Tìm phiếu, máy, tổ (dấu ,)..."
                  value={draftSearchQuery}
                  onChange={(e) => {
                    setDraftSearchQuery(e.target.value)
                    setSearchQuery(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuery()
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    width: '100%',
                    color: '#0f172a'
                  }}
                />
              </div>

              <PureSelect
                value={draftTeam}
                onChange={(val) => {
                  setDraftTeam(val)
                  setSelectedTeam(val)
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả tổ' },
                  ...teamOptions.map((t) => ({ value: t, label: t }))
                ]}
                style={{ width: 140 }}
              />

              <PureSelect
                value={draftMachine}
                onChange={(val) => {
                  setDraftMachine(val)
                  setSelectedMachine(val)
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả máy' },
                  ...machineOptions.map((m) => ({ value: m, label: m }))
                ]}
                style={{ width: 140 }}
              />

              {!localOnly && (
                <>
                  <button
                    onClick={handleCopyTSV}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      fontSize: 12,
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
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
                      cursor: 'pointer',
                      color: '#0f172a'
                    }}
                  >
                    <Download size={13} />
                    <span>Xuất Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {!localOnly && (
            <div
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '6px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexShrink: 0,
                order: 2
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleQuery}
                  style={{
                    padding: '5px 14px',
                    border: '1px solid #0f172a',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Truy vấn
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedEdits || isSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 14px',
                    border: '1px solid #047857',
                    background: hasUnsavedEdits ? '#047857' : '#f1f5f9',
                    color: hasUnsavedEdits ? '#ffffff' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: hasUnsavedEdits && !isSaving ? 'pointer' : 'default',
                    borderRadius: 3
                  }}
                >
                  <span>{isSaving ? 'Đang lưu...' : localOnly ? 'Lưu' : 'Lưu vào DB'}</span>
                </button>
                {saveStatus && (
                  <span
                    style={{
                      fontSize: 11,
                      color: '#047857',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Check size={13} /> {saveStatus}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Dùng cùng Data Grid với bảng chi tiết của báo cáo. */}
          {/* Dùng cùng Data Grid với bảng chi tiết của báo cáo theo chuẩn ERP MenuTechnique */}
          <div
            className="runtime-audit-modal-grid w-full h-full flex flex-col bg-white overflow-hidden"
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              background: '#ffffff',
              order: 4
            }}
          >
            <style>{`
              #portal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 0 !important;
                height: 0 !important;
                z-index: 999999 !important;
                pointer-events: none !important;
              }
              #portal > * {
                pointer-events: auto !important;
              }
              textarea.gdg-input,
              input.gdg-input {
                color: #0f172a !important;
                -webkit-text-fill-color: #0f172a !important;
                background-color: transparent !important;
                font-size: 12px !important;
                line-height: 18px !important;
                padding: 2px 4px !important;
                white-space: pre-wrap !important;
                opacity: 1 !important;
                visibility: visible !important;
              }
            `}</style>
            <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-3 py-1 uppercase bg-white flex-shrink-0">
              <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
              <span>Danh sách phiếu đối soát nhật trình ({filteredData.length} phiếu)</span>
            </h2>
            <DataEditor
              ref={gridRef}
              columns={columns}
              rows={filteredData.length}
              getCellContent={getCellContent}
              rowMarkers="both"
              rowSelect="multi"
              columnSelect="single"
              freezeColumns={2}
              gridSelection={gridSelection}
              onGridSelectionChange={setGridSelection}
              getCellsForSelection={true}
              showSearch={showSearch}
              onSearchClose={() => setShowSearch(false)}
              headerHeight={23}
              rowHeight={23}
              getRowThemeOverride={(rowIndex) => {
                if (rowIndex === tableManager.hoverRow) {
                  return {
                    bgCell: '#f7f7f7',
                    bgCellMedium: '#f0f0f0'
                  }
                }
                return undefined
              }}
              onItemHovered={tableManager.onItemHovered}
              overscrollY={20}
              overscrollX={50}
              smoothScrollY={true}
              smoothScrollX={true}
              trailingRowOptions={{
                hint: ' ',
                sticky: true,
                tint: true
              }}
              freezeTrailingRows={0}
              fillHandle={Boolean(isAnnotationTab && canEdit)}
              onFillPattern={onFillPattern}
              isDraggable={false}
              keybindings={tableManager.keybindings || keybindings}
              onPaste={onPaste}
              onCellEdited={onCellEdited}
              onCellClicked={tableManager.onCellClicked}
              onCellActivated={tableManager.onCellActivated}
              onKeyDown={tableManager.onKeyDown}
              onHeaderMenuClick={tableManager.onHeaderMenuClick}
              onCellContextMenu={tableManager.onCellContextMenu}
              onColumnResize={onColumnResize}
              onColumnMoved={onColumnMoved}
              theme={tableManager.gridTheme || DEFAULT_GRID_THEME}
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
                      selection={gridSelection}
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
                storageKey="prod_stats_remark_type_codehelp"
                onSelect={tableManager.handleSelectCodeHelp}
              />
            )}
            {filteredData.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 64,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  color: '#94a3b8',
                  pointerEvents: 'none'
                }}
              >
                Không có phiếu nào phù hợp.
              </div>
            )}
          </div>
          <div
            role="status"
            style={{
              order: 5,
              flexShrink: 0,
              minHeight: 25,
              padding: '4px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#f8fafc',
              borderTop: '1px solid #cbd5e1',
              color: hasUnsavedEdits ? '#9a6700' : '#64748b',
              fontSize: 11
            }}
          >
            <span>
              {isSaving
                ? localOnly
                  ? 'Đang lưu phân loại và diễn giải trên thiết bị này...'
                  : 'Đang lưu phân loại & diễn giải vào cơ sở dữ liệu...'
                : saveStatus
                  ? `✓ ${saveStatus}`
                  : hasUnsavedEdits
                    ? localOnly
                      ? 'Có thay đổi chưa lưu. Bấm “Lưu” để lưu trên thiết bị này.'
                      : 'Có thay đổi chưa lưu. Hãy bấm “Lưu vào DB” để lưu vào cơ sở dữ liệu.'
                    : 'Sẵn sàng'}
            </span>
            <span>{filteredData.length} phiếu</span>
          </div>
        </div>
      </div>
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
      <SystemConfirmModal
        isOpen={errorModalConfig.isOpen}
        type={errorModalConfig.type || 'danger'}
        title={errorModalConfig.title || 'Thông báo lỗi'}
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
