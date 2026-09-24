import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { updateIndexNo } from '../../../../components/sheet/js/updateIndexNo'
import { usePageData } from '../../../../../context/PageDataContext'
import {
  MOCK_PERM_RESOURCES,
  MOCK_PERM_FIELDS,
  MOCK_PERM_ACTIONS,
  MOCK_PERM_SCOPES
} from '../mock/mockPermResourceData'

export function usePermResource({
  canCreate = true,
  canEdit = true,
  canView = true,
  canSearch = true,
  canDelete = true,
  loadingBarRef,
  customLimits
}) {
  const { t } = useTranslation()
  const { setStatusMessage, setPageData } = usePageData() || {}

  // 1. Quản lý Lọc & Tìm kiếm
  const [keyword, setKeyword] = useState('')
  const [resourceCodeFilter, setResourceCodeFilter] = useState('')
  const [rootMenuFilter, setRootMenuFilter] = useState('')
  const [searchValues, setSearchValues] = useState({})
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const isInitialMount = useRef(true)

  // 2. Menu được chọn (Master)
  const [selectedResource, setSelectedResource] = useState(null)

  // 3. Sub-tab hiện tại ('1': Fields, '2': Actions, '3': Scopes)
  const [activeSubTab, setActiveSubTab] = useState('1')

  // 4. State Lưới Menu bên trái
  const [gridDataMenu, setGridDataMenu] = useState([])
  const [selectionMenu, setSelectionMenu] = useState(undefined)
  const [numRowsMenu, setNumRowsMenu] = useState(0)
  const [showSearchMenu, setShowSearchMenu] = useState(false)

  // 5. State Tab 1: Fields
  const [gridDataField, setGridDataField] = useState([])
  const [selectionField, setSelectionField] = useState(undefined)
  const [numRowsField, setNumRowsField] = useState(0)
  const [showSearchField, setShowSearchField] = useState(false)

  // 6. State Tab 2: Actions
  const [gridDataAction, setGridDataAction] = useState([])
  const [selectionAction, setSelectionAction] = useState(undefined)
  const [numRowsAction, setNumRowsAction] = useState(0)
  const [showSearchAction, setShowSearchAction] = useState(false)

  // 7. State Tab 3: Scopes
  const [gridDataScope, setGridDataScope] = useState([])
  const [selectionScope, setSelectionScope] = useState(undefined)
  const [numRowsScope, setNumRowsScope] = useState(0)
  const [showSearchScope, setShowSearchScope] = useState(false)

  // Tải chi tiết các sub-tabs khi selectedResource thay đổi
  const loadSubTabsForResource = useCallback((resource) => {
    if (!resource?.ResourceCode) {
      setGridDataField([])
      setNumRowsField(0)
      setGridDataAction([])
      setNumRowsAction(0)
      setGridDataScope([])
      setNumRowsScope(0)
      return
    }

    const code = resource.ResourceCode

    // Tab 1: Fields của resource này (hoặc fallback sang sales_orders nếu là resource mới)
    const rawFields = MOCK_PERM_FIELDS.filter((f) => f.ResourceCode === code)
    const fieldRows = updateIndexNo(
      (rawFields.length > 0 ? rawFields : MOCK_PERM_FIELDS).map((f) => ({
        ...f,
        ResourceCode: code,
        ResourceName: resource.ResourceName || f.ResourceName,
        Status: ''
      }))
    )
    setGridDataField(fieldRows)
    setNumRowsField(fieldRows.length)

    // Tab 2: Actions (các action có sẵn trong hệ thống)
    const rawActions = MOCK_PERM_ACTIONS
    const actionRows = updateIndexNo(
      rawActions.map((a) => ({
        ...a,
        ResourceCode: code,
        Status: ''
      }))
    )
    setGridDataAction(actionRows)
    setNumRowsAction(actionRows.length)

    // Tab 3: Scopes (các quy tắc phạm vi có sẵn trong hệ thống)
    const rawScopes = MOCK_PERM_SCOPES
    const scopeRows = updateIndexNo(
      rawScopes.map((s) => ({
        ...s,
        ResourceCode: code,
        Status: ''
      }))
    )
    setGridDataScope(scopeRows)
    setNumRowsScope(scopeRows.length)
  }, [])

  // Tìm kiếm & Tải danh sách Menu bên trái
  const handleSearchData = useCallback(() => {
    if (!canView && !canSearch) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'warning',
          text: t('system.noPermissionSearch', 'Bạn không có quyền truy vấn dữ liệu')
        })
      }
      return
    }

    if (loadingBarRef?.current) {
      loadingBarRef.current.continuousStart()
    }

    try {
      const raw = [...MOCK_PERM_RESOURCES]
      const kw = (keyword || searchValues.Keyword || '').toLowerCase().trim()
      const rc = (resourceCodeFilter || searchValues.ResourceCode || '').toLowerCase().trim()
      const rm = (rootMenuFilter || searchValues.RootMenuName || '').toLowerCase().trim()

      const filtered = raw.filter((item) => {
        if (
          rc &&
          !String(item.ResourceCode || '')
            .toLowerCase()
            .includes(rc)
        )
          return false
        if (
          rm &&
          !String(item.RootMenuName || item.RootMenuKey || '')
            .toLowerCase()
            .includes(rm)
        )
          return false
        if (kw) {
          const matchCode = String(item.ResourceCode || '')
            .toLowerCase()
            .includes(kw)
          const matchName = String(item.ResourceName || '')
            .toLowerCase()
            .includes(kw)
          const matchRoot = String(item.RootMenuName || '')
            .toLowerCase()
            .includes(kw)
          const matchComment = String(item.Comment || '')
            .toLowerCase()
            .includes(kw)
          if (!matchCode && !matchName && !matchRoot && !matchComment) return false
        }
        return true
      })

      const rowsWithStatus = updateIndexNo(
        filtered.map((r) => ({
          ...r,
          Status: ''
        }))
      )

      setGridDataMenu(rowsWithStatus)
      setNumRowsMenu(rowsWithStatus.length)

      // Kích hoạt chọn menu đầu tiên nếu chưa chọn hoặc nếu danh sách thay đổi
      const currentSelected =
        selectedResource &&
        rowsWithStatus.some((r) => r.ResourceCode === selectedResource.ResourceCode)
          ? selectedResource
          : rowsWithStatus[0] || null

      setSelectedResource(currentSelected)
      if (currentSelected) {
        loadSubTabsForResource(currentSelected)
      }

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t('system.loadedRowsSuccess', 'Đã tải {{count}} menu chức năng', {
            count: rowsWithStatus.length
          })
        })
      }
      if (typeof setPageData === 'function') {
        setPageData({
          totalRows: rowsWithStatus.length,
          page: 1,
          limit: customLimits || 50
        })
      }
    } catch (err) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'error',
          text: err?.message || t('system.error', 'Lỗi khi tải dữ liệu!')
        })
      }
    } finally {
      if (loadingBarRef?.current) {
        loadingBarRef.current.complete()
      }
    }
  }, [
    canView,
    canSearch,
    keyword,
    resourceCodeFilter,
    rootMenuFilter,
    searchValues,
    selectedResource,
    loadSubTabsForResource,
    loadingBarRef,
    setStatusMessage,
    setPageData,
    customLimits,
    t
  ])

  // Chọn menu khác từ bảng bên trái
  const handleSelectResource = useCallback(
    (resource) => {
      setSelectedResource(resource)
      loadSubTabsForResource(resource)
    },
    [loadSubTabsForResource]
  )

  // Khởi chạy tìm kiếm lần đầu
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      handleSearchData()
    }
  }, [handleSearchData])

  // 3. Thêm dòng mới (F2) cho Tab đang active
  const handleAddRow = useCallback(() => {
    if (!canCreate) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'warning',
          text: t('system.noPermissionCreate', 'Bạn không có quyền tạo mới')
        })
      }
      return
    }

    const resCode = selectedResource?.ResourceCode || ''
    const resName = selectedResource?.ResourceName || ''

    if (activeSubTab === '1') {
      // Tab 1: Fields
      const newField = {
        IdSeq: `01921345-0000-7abc-def0-${Date.now().toString().slice(-12)}`,
        ResourceCode: resCode,
        ResourceName: resName,
        FieldCode: '',
        FieldName: '',
        DictSeq: null,
        LangKey: resCode ? `${resCode}.` : '',
        IsMaskable: false,
        IsSensitive: false,
        OrderNo: (gridDataField.length || 0) + 1,
        Comment: '',
        RowVersion: 1,
        Status: 'A'
      }
      setGridDataField((prev) => updateIndexNo([newField, ...prev]))
      setNumRowsField((prev) => prev + 1)
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'info',
          text: t('system.rowAppendedField', 'Đã thêm 1 trường dữ liệu mới (Status: A)')
        })
      }
    } else if (activeSubTab === '2') {
      // Tab 2: Actions
      const newAction = {
        IdSeq: `01921345-0000-7abc-def0-${Date.now().toString().slice(-12)}`,
        ActionCode: 'BTN_',
        ActionName: '',
        LangKey: 'action.',
        OrderNo: (gridDataAction.length || 0) + 1,
        IsDefaultAllow: true,
        Comment: '',
        RowVersion: 1,
        Status: 'A'
      }
      setGridDataAction((prev) => updateIndexNo([newAction, ...prev]))
      setNumRowsAction((prev) => prev + 1)
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'info',
          text: t('system.rowAppendedAction', 'Đã thêm 1 hành động / nút mới (Status: A)')
        })
      }
    } else if (activeSubTab === '3') {
      // Tab 3: Scopes
      const newScope = {
        IdSeq: `01921345-0000-7abc-def0-${Date.now().toString().slice(-12)}`,
        ScopeCode: 'SCOPE_',
        ScopeName: '',
        OperationCode: 'BTN_SEARCH',
        OperationName: 'Truy vấn / Tìm kiếm dữ liệu (Search)',
        DefaultScopeLevel: 'DEPARTMENT',
        DefaultScopeLevelLabel: 'Phòng ban (DEPT)',
        RuleCondition: 'ALL_STATUS',
        RuleConditionLabel: 'Mọi trạng thái phiếu',
        LangKey: 'scope.',
        OrderNo: (gridDataScope.length || 0) + 1,
        Comment: '',
        RowVersion: 1,
        Status: 'A'
      }
      setGridDataScope((prev) => updateIndexNo([newScope, ...prev]))
      setNumRowsScope((prev) => prev + 1)
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'info',
          text: t('system.rowAppendedScope', 'Đã thêm 1 quy tắc phạm vi mới (Status: A)')
        })
      }
    }
  }, [
    canCreate,
    selectedResource,
    activeSubTab,
    gridDataField.length,
    gridDataAction.length,
    gridDataScope.length,
    setStatusMessage,
    t
  ])

  // 4. Xóa dòng (F8)
  const handleDeleteDataSheet = useCallback(() => {
    if (!canDelete) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'warning',
          text: t('system.noPermissionDelete', 'Bạn không có quyền xóa')
        })
      }
      return
    }

    let selection = null
    if (activeSubTab === '1') selection = selectionField
    else if (activeSubTab === '2') selection = selectionAction
    else if (activeSubTab === '3') selection = selectionScope

    const hasRows = selection?.rows && selection.rows.length > 0
    if (!hasRows) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'warning',
          text: t('system.noRowSelected', 'Vui lòng chọn ít nhất một dòng trên bảng để xóa')
        })
      }
      return
    }

    setShowConfirmModal(true)
  }, [
    canDelete,
    activeSubTab,
    selectionField,
    selectionAction,
    selectionScope,
    setStatusMessage,
    t
  ])

  const handleConfirmDelete = useCallback(() => {
    setShowConfirmModal(false)

    if (activeSubTab === '1') {
      const selectedIndices = new Set(selectionField?.rows?.toArray() || [])
      setGridDataField((prev) => {
        const next = prev.filter((_, idx) => !selectedIndices.has(idx))
        setNumRowsField(next.length)
        return updateIndexNo(next)
      })
    } else if (activeSubTab === '2') {
      const selectedIndices = new Set(selectionAction?.rows?.toArray() || [])
      setGridDataAction((prev) => {
        const next = prev.filter((_, idx) => !selectedIndices.has(idx))
        setNumRowsAction(next.length)
        return updateIndexNo(next)
      })
    } else if (activeSubTab === '3') {
      const selectedIndices = new Set(selectionScope?.rows?.toArray() || [])
      setGridDataScope((prev) => {
        const next = prev.filter((_, idx) => !selectedIndices.has(idx))
        setNumRowsScope(next.length)
        return updateIndexNo(next)
      })
    }

    if (typeof setStatusMessage === 'function') {
      setStatusMessage({
        type: 'success',
        text: t('system.deleteSuccess', 'Đã xóa các dòng đã chọn thành công')
      })
    }
  }, [activeSubTab, selectionField, selectionAction, selectionScope, setStatusMessage, t])

  // 5. Lưu thay đổi (F10)
  const handleSaveData = useCallback(() => {
    if (!canEdit && !canCreate) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'warning',
          text: t('system.noPermissionSave', 'Bạn không có quyền lưu dữ liệu')
        })
      }
      return
    }

    let modifiedCount = 0
    let tabName = ''

    if (activeSubTab === '1') {
      tabName = t('system.tabFields', 'Trường Dữ Liệu')
      const modified = gridDataField.filter((r) => {
        const tag = r?.WorkingTag || r?.Status
        return tag === 'A' || tag === 'I' || tag === 'U' || tag === 'D'
      })
      modifiedCount = modified.length
      setGridDataField((prev) =>
        prev.map((r) => ({
          ...r,
          WorkingTag: '',
          Status: ''
        }))
      )
    } else if (activeSubTab === '2') {
      tabName = t('system.tabActions', 'Hành Động / Nút')
      const modified = gridDataAction.filter((r) => {
        const tag = r?.WorkingTag || r?.Status
        return tag === 'A' || tag === 'I' || tag === 'U' || tag === 'D'
      })
      modifiedCount = modified.length
      setGridDataAction((prev) =>
        prev.map((r) => ({
          ...r,
          WorkingTag: '',
          Status: ''
        }))
      )
    } else if (activeSubTab === '3') {
      tabName = t('system.tabScopes', 'Phạm Vi Dữ Liệu')
      const modified = gridDataScope.filter((r) => {
        const tag = r?.WorkingTag || r?.Status
        return tag === 'A' || tag === 'I' || tag === 'U' || tag === 'D'
      })
      modifiedCount = modified.length
      setGridDataScope((prev) =>
        prev.map((r) => ({
          ...r,
          WorkingTag: '',
          Status: ''
        }))
      )
    }

    if (modifiedCount === 0) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'info',
          text: t('system.noChangesToSave', 'Không có thay đổi nào cần lưu')
        })
      }
      return
    }

    if (loadingBarRef?.current) {
      loadingBarRef.current.continuousStart()
    }

    setTimeout(() => {
      if (loadingBarRef?.current) {
        loadingBarRef.current.complete()
      }
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t(
            'system.saveSuccessDetail',
            'Đã lưu thành công {{count}} dòng thay đổi cho [{{tab}}]',
            {
              count: modifiedCount,
              tab: tabName
            }
          )
        })
      }
    }, 300)
  }, [
    canEdit,
    canCreate,
    activeSubTab,
    gridDataField,
    gridDataAction,
    gridDataScope,
    loadingBarRef,
    setStatusMessage,
    t
  ])

  // 6. Xuất Excel (F9)
  const handleExportExcel = useCallback(() => {
    let tabName = ''
    if (activeSubTab === '1') tabName = 'Truong_Du_Lieu'
    else if (activeSubTab === '2') tabName = 'Hanh_Dong_Nut'
    else if (activeSubTab === '3') tabName = 'Pham_Vi_Du_Lieu'

    if (typeof setStatusMessage === 'function') {
      setStatusMessage({
        type: 'success',
        text: t('system.exportSuccess', 'Đã xuất dữ liệu {{tab}} ra file Excel thành công', {
          tab: tabName
        })
      })
    }
  }, [activeSubTab, setStatusMessage, t])

  // 7. Dynamic Query Handlers
  const handleAddQueryField = useCallback((key, label, meta) => {
    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key === key)) return prev
      return [...prev, { key, label, ...meta }]
    })
  }, [])

  const handleRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== fieldKey))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }, [])

  const handleResetQuery = useCallback(() => {
    setKeyword('')
    setResourceCodeFilter('')
    setRootMenuFilter('')
    setSearchValues({})
    setDynamicQueryFields([])
  }, [])

  return {
    // Search states
    keyword,
    setKeyword,
    resourceCodeFilter,
    setResourceCodeFilter,
    rootMenuFilter,
    setRootMenuFilter,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    handleSearchData,
    // Master Selection
    selectedResource,
    setSelectedResource,
    handleSelectResource,
    // Active Sub-tab
    activeSubTab,
    setActiveSubTab,
    // Left Layout: Menu Table
    gridDataMenu,
    setGridDataMenu,
    selectionMenu,
    setSelectionMenu,
    numRowsMenu,
    setNumRowsMenu,
    showSearchMenu,
    setShowSearchMenu,
    // Right Layout -> Tab 1: Fields
    gridDataField,
    setGridDataField,
    selectionField,
    setSelectionField,
    numRowsField,
    setNumRowsField,
    showSearchField,
    setShowSearchField,
    // Right Layout -> Tab 2: Actions
    gridDataAction,
    setGridDataAction,
    selectionAction,
    setSelectionAction,
    numRowsAction,
    setNumRowsAction,
    showSearchAction,
    setShowSearchAction,
    // Right Layout -> Tab 3: Scopes
    gridDataScope,
    setGridDataScope,
    selectionScope,
    setSelectionScope,
    numRowsScope,
    setNumRowsScope,
    showSearchScope,
    setShowSearchScope,
    // Actions
    handleAddRow,
    handleSaveData,
    handleDeleteDataSheet,
    handleExportExcel,
    showConfirmModal,
    setShowConfirmModal,
    handleConfirmDelete
  }
}
