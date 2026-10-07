/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { CompactSelection } from '@glideapps/glide-data-grid'
import { usePageData } from '../../../../../context/PageDataContext'
import { loadFromLocalStorageSheet } from '../../../../../localStorage/sheet/sheet'

import { useRoleRootMenuColumns } from '../columns/roleRootMenuColumns'
import { useRoleMenuColumns } from '../columns/roleMenuColumns'
import { useRoleActionPermColumns } from '../columns/roleActionPermColumns'
import { useRoleColumnSetupColumns } from '../columns/roleColumnSetupColumns'
import { useRoleDataScopeColumns } from '../columns/roleDataScopeColumns'
import { useRoleGroupUsersColumns } from '../columns/roleGroupUsersColumns'

import { useRoleManagementFetch } from './useRoleManagementFetch'
import { useRoleManagementMutation } from './useRoleManagementMutation'

export function useRoleManagement({
  canCreate,
  canEdit,
  canDelete,
  canView,
  loadingBarRef,
  controllers,
  customLimits
}) {
  const { setStatusMessage } = usePageData() || {}
  const userFrom = JSON.parse(localStorage.getItem('userInfo') || '{}')

  // Form Thông Tin Nhóm Quyền Hệ Thống (Hiển thị trên Query Bar Layout)
  const [roleGroups, setRoleGroups] = useState([])
  const [groupId, setGroupId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [comment, setComment] = useState('')
  const [createdByName, setCreatedByName] = useState('')

  // Cấu hình dynamic query fields (hỗ trợ Ctrl+F nhảy lên query bar)
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  const handleAddQueryField = useCallback(
    (columnKey, colTitle, col, tableType = '', tableLabel = '') => {
      if (!columnKey || columnKey === 'Status' || columnKey === 'IndexNo' || columnKey === 'Id')
        return

      const fieldKey = tableType ? `${tableType}_${columnKey}` : columnKey
      const normalizedKey = fieldKey.toLowerCase()
      const isDateField =
        col?.type === 'date-range' ||
        col?.type === 'date' ||
        /Date|CreatedAt|UpdatedAt|Time/i.test(columnKey)

      const colName = colTitle || columnKey
      const prefix = tableLabel ? `[${tableLabel}] ` : ''
      const displayLabel = `${prefix}${colName}`

      setDynamicQueryFields((prev) => {
        if (prev.some((f) => f.key.toLowerCase() === normalizedKey)) return prev
        return [
          ...prev,
          {
            key: fieldKey,
            dataQueryKey: columnKey.toLowerCase(),
            tableType,
            tableLabel: tableLabel || '',
            rawLabel: colName,
            label: displayLabel,
            labelWidth: 'w-auto px-2.5 whitespace-nowrap',
            type:
              col?.type ||
              (isDateField ? 'date-range' : col?.kind === 'Boolean' ? 'select' : 'text'),
            colSpan: col?.colSpan || (isDateField ? 2 : 1),
            placeholder: `Tìm ${colName}...`,
            options:
              col?.options ||
              (col?.kind === 'Boolean'
                ? [
                    { value: '', label: 'Tất cả' },
                    { value: '1', label: 'Có' },
                    { value: '0', label: 'Không' }
                  ]
                : undefined),
            removable: true
          }
        ]
      })
    },
    []
  )

  const handleRemoveQueryField = useCallback((key) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== key))
  }, [])

  const handleResetQuery = useCallback(() => {
    setDynamicQueryFields([])
  }, [])

  // 1. Cấu hình Cột mặc định
  const defaultColsA = useRoleRootMenuColumns()
  const defaultColsB = useRoleMenuColumns()
  const defaultColsAction = useRoleActionPermColumns()
  const defaultColsCol = useRoleColumnSetupColumns()
  const defaultColsScope = useRoleDataScopeColumns()
  const defaultColsUsers = useRoleGroupUsersColumns()

  // Helper đồng bộ cột từ localStorage với cấu hình mới
  const getSanitizedCols = (storageKey, defaults) => {
    const cached = loadFromLocalStorageSheet(storageKey, null)
    if (!Array.isArray(cached) || cached.length === 0) {
      return defaults.filter((c) => c.visible)
    }
    const defaultIds = new Set(defaults.filter((d) => d.visible).map((d) => d.id))
    const valid = cached.filter((c) => defaultIds.has(c.id))
    if (valid.length === 0) {
      return defaults.filter((c) => c.visible)
    }
    return valid.map((c) => {
      const def = defaults.find((d) => d.id === c.id) || {}
      return {
        ...def,
        ...c,
        title: def.title || c.title,
        kind: def.kind || c.kind,
        readonly: def.readonly
      }
    })
  }

  // 2. State Cột lưu cache local storage
  const [colsA, setColsA] = useState(() => getSanitizedCols('role_hub_root_menu', defaultColsA))
  const [colsB, setColsB] = useState(() => getSanitizedCols('role_hub_menu_list', defaultColsB))
  const [colsAction, setColsAction] = useState(() =>
    getSanitizedCols('role_hub_view_actions', defaultColsAction)
  )
  const [colsCol, setColsCol] = useState(() =>
    getSanitizedCols('role_hub_view_cols', defaultColsCol)
  )
  const [colsScope, setColsScope] = useState(() =>
    getSanitizedCols('role_hub_view_scope', defaultColsScope)
  )
  const [colsUsers, setColsUsers] = useState(() =>
    getSanitizedCols('role_hub_group_users', defaultColsUsers)
  )

  // 3. State Dữ liệu các bảng
  const [gridDataA, setGridDataA] = useState([])
  const [gridDataB, setGridDataB] = useState([])
  const [gridDataAction, setGridDataAction] = useState([])
  const [gridDataCol, setGridDataCol] = useState([])
  const [gridDataScope, setGridDataScope] = useState([])
  const [gridDataUsers, setGridDataUsers] = useState([])

  const [numRowsA, setNumRowsA] = useState(0)
  const [numRowsB, setNumRowsB] = useState(0)
  const [numRowsAction, setNumRowsAction] = useState(0)
  const [numRowsCol, setNumRowsCol] = useState(0)
  const [numRowsScope, setNumRowsScope] = useState(0)
  const [numRowsUsers, setNumRowsUsers] = useState(0)

  const [showSearchA, setShowSearchA] = useState(false)
  const [showSearchB, setShowSearchB] = useState(false)
  const [showSearchAction, setShowSearchAction] = useState(false)
  const [showSearchCol, setShowSearchCol] = useState(false)
  const [showSearchScope, setShowSearchScope] = useState(false)
  const [showSearchUsers, setShowSearchUsers] = useState(false)

  // 4. State Selections
  const [selectionA, setSelectionA] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [selectionB, setSelectionB] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [selectionAction, setSelectionAction] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [selectionCol, setSelectionCol] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [selectionScope, setSelectionScope] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [selectionUsers, setSelectionUsers] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // 5. Reset Tables
  const resetTableA = useCallback(() => {
    setSelectionA({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })
  }, [])
  const resetTableB = useCallback(() => {
    setSelectionB({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })
  }, [])
  const resetTableAction = useCallback(() => {
    setSelectionAction({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })
  }, [])
  const resetTableCol = useCallback(() => {
    setSelectionCol({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })
  }, [])
  const resetTableScope = useCallback(() => {
    setSelectionScope({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })
  }, [])

  // RootMenu đang được chọn ở Cột 1 (Bảng Sheet RootMenu)
  const selectedRootMenuInGrid = useMemo(() => {
    // 1. Kiểm tra row selection
    const selectedRows = selectionA.rows?.items || []
    const selected = selectedRows.flatMap(([start, end]) =>
      Array.from({ length: end - start }, (_, i) => gridDataA[start + i]).filter(Boolean)
    )
    if (selected[0]) return selected[0]

    // 2. Kiểm tra cell selection (khi click vào cell bất kỳ của dòng)
    if (selectionA.current?.cell) {
      const rowIndex = selectionA.current.cell[1]
      if (gridDataA[rowIndex]) return gridDataA[rowIndex]
    }

    return (gridDataA || []).find((r) => r && (r.RootMenuId || r.Id || r.RootMenuLabel)) || null
  }, [selectionA, gridDataA])

  const selectedRootMenuName =
    selectedRootMenuInGrid?.RootMenuLabel ||
    selectedRootMenuInGrid?.RootMenuName ||
    selectedRootMenuInGrid?.RootMenuKey ||
    selectedRootMenuInGrid?.Label ||
    ''

  const selectedRootMenuKey =
    selectedRootMenuInGrid?.RootMenuKey || selectedRootMenuInGrid?.Key || ''

  // Menu đang được chọn ở Cột 2 (Bảng Sheet Menu)

  const selectedMenuInGrid = useMemo(() => {
    const selectedRows = selectionB.rows?.items || []
    const selected = selectedRows.flatMap(([start, end]) =>
      Array.from({ length: end - start }, (_, i) => gridDataB[start + i]).filter(Boolean)
    )
    if (selected[0]) return selected[0]

    if (selectionB.current?.cell) {
      const rowIndex = selectionB.current.cell[1]
      if (gridDataB[rowIndex]) return gridDataB[rowIndex]
    }

    return (gridDataB || []).find((r) => r && (r.MenuId || r.Id || r.MenuLabel)) || null
  }, [selectionB, gridDataB])

  // 6. Get Selected Rows helpers
  const getSelectedRowsA = useCallback(() => {
    return selectionA.rows.items
      .flatMap(([start, end]) => gridDataA.slice(start, end))
      .filter(Boolean)
  }, [selectionA.rows.items, gridDataA])

  const getSelectedRowsB = useCallback(() => {
    return selectionB.rows.items
      .flatMap(([start, end]) => gridDataB.slice(start, end))
      .filter(Boolean)
  }, [selectionB.rows.items, gridDataB])

  const getSelectedRowsAction = useCallback(() => {
    return selectionAction.rows.items
      .flatMap(([start, end]) => gridDataAction.slice(start, end))
      .filter(Boolean)
  }, [selectionAction.rows.items, gridDataAction])

  const getSelectedRowsCol = useCallback(() => {
    return selectionCol.rows.items
      .flatMap(([start, end]) => gridDataCol.slice(start, end))
      .filter(Boolean)
  }, [selectionCol.rows.items, gridDataCol])

  const getSelectedRowsScope = useCallback(() => {
    return selectionScope.rows.items
      .flatMap(([start, end]) => gridDataScope.slice(start, end))
      .filter(Boolean)
  }, [selectionScope.rows.items, gridDataScope])

  const getSelectedRowsUsers = useCallback(() => {
    return selectionUsers.rows.items
      .flatMap(([start, end]) => gridDataUsers.slice(start, end))
      .filter(Boolean)
  }, [selectionUsers.rows.items, gridDataUsers])

  // 7. Fetch Hook
  const { fetchRoleGroups, fetchGroupRoles, fetchMenuViewDetails } = useRoleManagementFetch({
    setGroupId,
    setGroupName,
    setComment,
    setCreatedByName,
    setRoleGroups,
    setGridDataA,
    setGridDataB,
    setGridDataCol,
    setGridDataAction,
    setGridDataScope,
    setGridDataUsers,
    setNumRowsA,
    setNumRowsB,
    setNumRowsCol,
    setNumRowsAction,
    setNumRowsScope,
    setNumRowsUsers,
    resetTableA,
    resetTableB,
    resetTableCol,
    resetTableAction,
    resetTableScope,
    canView,
    loadingBarRef,
    controllers,
    setStatusMessage
  })

  // 9. Mutation Hook
  const { handleSave, handleDelete, limitModalProps } = useRoleManagementMutation({
    gridDataA,
    setGridDataA,
    gridDataB,
    setGridDataB,
    gridDataCol,
    setGridDataCol,
    gridDataAction,
    setGridDataAction,
    gridDataScope,
    setGridDataScope,
    gridDataUsers,
    setGridDataUsers,
    selectionUsers,
    selectionB,
    selectionA,
    selectionAction,
    getSelectedRowsA,
    getSelectedRowsB,
    getSelectedRowsCol,
    getSelectedRowsAction,
    getSelectedRowsScope,
    getSelectedRowsUsers,
    canCreate,
    canEdit,
    canDelete,
    loadingBarRef,
    userFrom,
    setStatusMessage,
    selectedGroupId: groupId,
    selectedMenuInGrid,
    fetchGroupRoles: () => {
      if (groupId) {
        fetchGroupRoles(groupId)
      }
    },
    customLimits
  })

  // Tự động tải nhóm quyền khi mở trang
  const initialFetchedRef = useRef(false)
  useEffect(() => {
    if (canView !== false && !initialFetchedRef.current) {
      initialFetchedRef.current = true
      fetchRoleGroups()
    }
  }, [canView, fetchRoleGroups])

  const [selectedRootMenuId, setSelectedRootMenuId] = useState('')

  // Tự động nạp phân quyền khi chọn/đổi nhóm quyền (tải toàn bộ cây phân quyền đầy đủ)
  useEffect(() => {
    if (groupId) {
      fetchGroupRoles(groupId, '')
    }
  }, [groupId, fetchGroupRoles])


  // Tự động nạp Action & Setup Cột & Scope của riêng Menu khi chọn dòng menu trong Bảng B
  useEffect(() => {
    if (selectedMenuInGrid && (selectedMenuInGrid.MenuId || selectedMenuInGrid.Id)) {
      const mId = selectedMenuInGrid.MenuId || selectedMenuInGrid.Id
      const mName = selectedMenuInGrid.RawLabel || selectedMenuInGrid.MenuLabel || ''
      const mKey = selectedMenuInGrid.MenuKey || selectedMenuInGrid.Key || ''
      fetchMenuViewDetails(mId, groupId, mName, mKey)
    }
  }, [selectedMenuInGrid, groupId, fetchMenuViewDetails])

  // Lọc tìm kiếm nhóm theo ô query
  const handleSearch = useCallback(() => {
    if (groupName && groupName.trim()) {
      const match = roleGroups.find((g) =>
        String(g.Name || g.Id || '')
          .toLowerCase()
          .includes(groupName.toLowerCase().trim())
      )
      if (match) {
        setGroupId(String(match.Id || ''))
        setGroupName(match.Name || '')
        setComment(match.Comment || '')
        setCreatedByName(match.CreatedByName || '')
        return
      }
    }
    if (groupId) {
      fetchGroupRoles(groupId, selectedRootMenuId)
    } else {
      fetchRoleGroups()
    }
  }, [fetchGroupRoles, fetchRoleGroups, groupId, groupName, roleGroups, selectedRootMenuId])

  return {
    // Form Query & Groups List
    roleGroups,
    setRoleGroups,
    groupId,
    setGroupId,
    groupName,
    setGroupName,
    comment,
    setComment,
    createdByName,
    setCreatedByName,
    handleSearch,
    selectedRootMenuName,
    selectedRootMenuKey,
    selectedRootMenuId,
    setSelectedRootMenuId,
    selectedMenuInGrid,

    // Cột 1: Sheet Root Menu
    gridDataA,
    setGridDataA,
    selectionA,
    setSelectionA,
    numRowsA,
    setNumRowsA,
    colsA,
    setColsA,
    defaultColsA,
    showSearchA,
    setShowSearchA,
    // Cột 2: Sheet Menu
    gridDataB,
    setGridDataB,
    selectionB,
    setSelectionB,
    numRowsB,
    setNumRowsB,
    colsB,
    setColsB,
    defaultColsB,
    showSearchB,
    setShowSearchB,
    // Tab Thành Viên Trong Nhóm (Users Sheet)
    gridDataUsers,
    setGridDataUsers,
    selectionUsers,
    setSelectionUsers,
    numRowsUsers,
    setNumRowsUsers,
    colsUsers,
    setColsUsers,
    defaultColsUsers,
    showSearchUsers,
    setShowSearchUsers,
    // Cột 2 -> Sub-tab 1: Action Perms
    gridDataAction,
    setGridDataAction,
    selectionAction,
    setSelectionAction,
    numRowsAction,
    setNumRowsAction,
    colsAction,
    setColsAction,
    defaultColsAction,
    showSearchAction,
    setShowSearchAction,
    // Cột 2 -> Sub-tab 2: Setup Cột
    gridDataCol,
    setGridDataCol,
    selectionCol,
    setSelectionCol,
    numRowsCol,
    setNumRowsCol,
    colsCol,
    setColsCol,
    defaultColsCol,
    showSearchCol,
    setShowSearchCol,
    // Cột 2 -> Sub-tab 3: Phạm vi dữ liệu & Quy tắc sửa phiếu
    gridDataScope,
    setGridDataScope,
    selectionScope,
    setSelectionScope,
    numRowsScope,
    setNumRowsScope,
    colsScope,
    setColsScope,
    defaultColsScope,
    showSearchScope,
    setShowSearchScope,
    // Actions
    fetchRoleGroups,
    fetchGroupRoles,
    handleSave,
    handleDelete,
    limitModalProps,
    // Dynamic Query
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery
  }
}
