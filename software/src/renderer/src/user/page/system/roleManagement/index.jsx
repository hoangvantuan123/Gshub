/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useEffect, useRef } from 'react'
import { notification, message, Tabs, Badge } from 'antd'
import {
  AppstoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import RoleManagementActions from './components/RoleManagementActions'
import RoleManagementQuery from './components/RoleManagementQuery'
import RoleGroupListTable from './components/RoleGroupListTable'
import RoleRootMenuTable from './components/RoleRootMenuTable'
import RoleMenuTable from './components/RoleMenuTable'
import RoleMenuColumnActionPanel from './components/RoleMenuColumnActionPanel'
import RoleGroupUsersTable from './components/RoleGroupUsersTable'
import RoleGroupMembersModal from './components/RoleGroupMembersModal'
import { useRoleManagement } from './hooks/useRoleManagement'


export default function RoleManagementPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  controllers,
  cancelAllRequests,
  customLimits,
  ...restProps
}) {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)
  const [activeTab, setActiveTab] = useState('permissions')
  const [openMembersModal, setOpenMembersModal] = useState(false)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'role_mgmt',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const {
    // Form Thông Tin Nhóm Quyền
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
    // Cột 2 -> Sub-tab 3: Scope
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
    // Dynamic Query
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    // Actions & Modals
    handleSave,
    handleDelete,
    limitModalProps

  } = useRoleManagement({
    canCreate: pagePerms.canCreate,
    canEdit: pagePerms.canEdit,
    canDelete: pagePerms.canDelete,
    canView: pagePerms.canView,
    canSearch: pagePerms.canSearch,
    loadingBarRef,
    controllers,
    customLimits: customLimits || restProps?.audLimits
  })

  // Phím tắt chuẩn ERP
  usePageHotkeys({
    onSearch: handleSearch,
    onSave: handleSave,
    onDelete: handleDelete
  })

  const cancelAllRequestsRef = useRef(cancelAllRequests)
  cancelAllRequestsRef.current = cancelAllRequests

  useEffect(() => {
    notification.destroy()
    message.destroy()
    return () => {
      cancelAllRequestsRef.current?.()
    }
  }, [])

  // 1. Kéo giãn Splitter Cột 1 (Nhóm Quyền)
  const containerRef = useRef(null)
  const [groupColWidth, setGroupColWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_role_group_col_width')
      return saved ? Math.max(200, Math.min(450, parseInt(saved, 10))) : 280
    } catch {
      return 280
    }
  })
  const [isDraggingGroup, setIsDraggingGroup] = useState(false)

  const handleMouseDownGroup = (e) => {
    e.preventDefault()
    setIsDraggingGroup(true)
  }

  useEffect(() => {
    if (!isDraggingGroup) return

    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const maxAllowed = Math.max(200, rect.width - 400)
      const clampedWidth = Math.max(180, Math.min(maxAllowed, newWidth))
      setGroupColWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDraggingGroup(false)
      try {
        localStorage.setItem('erp_role_group_col_width', String(groupColWidth))
      } catch { }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDraggingGroup, groupColWidth])

  // 2. Kéo giãn Splitter Dọc (Trên / Dưới) trong Tab Phân Quyền
  const [rootTopHeight, setRootTopHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_role_root_top_height')
      return saved ? Math.max(140, Math.min(500, parseInt(saved, 10))) : 220
    } catch {
      return 220
    }
  })
  const [isDraggingRootY, setIsDraggingRootY] = useState(false)
  const tabContentRef = useRef(null)

  const handleMouseDownRootY = (e) => {
    e.preventDefault()
    setIsDraggingRootY(true)
  }

  useEffect(() => {
    if (!isDraggingRootY) return

    const handleMouseMove = (e) => {
      if (!tabContentRef.current) return
      const rect = tabContentRef.current.getBoundingClientRect()
      const newHeight = e.clientY - rect.top
      const maxAllowed = Math.max(140, rect.height - 180)
      const clampedHeight = Math.max(120, Math.min(maxAllowed, newHeight))
      setRootTopHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsDraggingRootY(false)
      try {
        localStorage.setItem('erp_role_root_top_height', String(rootTopHeight))
      } catch { }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDraggingRootY, rootTopHeight])

  const handleSelectGroup = (g) => {
    if (!g) return
    setGroupId(String(g.Id || ''))
    setGroupName(g.Name || '')
    setComment(g.Comment || '')
    setCreatedByName(g.CreatedByName || '')
  }

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <RoleManagementActions
            handleSearch={handleSearch}
            handleSave={handleSave}
            handleDelete={handleDelete}
            onOpenMembersModal={() => setActiveTab('members')}
            permissions={pagePerms}
          />
        }
        query={
          <RoleManagementQuery
            groupId={groupId}
            setGroupId={setGroupId}
            groupName={groupName}
            setGroupName={setGroupName}
            comment={comment}
            setComment={setComment}
            createdByName={createdByName}
            setCreatedByName={setCreatedByName}
            handleSearch={handleSearch}
            disabled={!pagePerms.canView}
            dynamicQueryFields={dynamicQueryFields}
            onAddQueryField={handleAddQueryField}
            onRemoveQueryField={handleRemoveQueryField}
            onResetQuery={handleResetQuery}
          />
        }
        table={
          <div
            ref={containerRef}
            className={`flex h-full w-full overflow-hidden bg-white ${isDraggingGroup || isDraggingRootY ? 'select-none' : ''
              }`}
          >
            {/* CỘT 1: BẢNG TẬP TRUNG TẤT CẢ NHÓM QUYỀN HỆ THỐNG */}
            <div
              style={{ width: `${groupColWidth}px` }}
              className="h-full flex flex-col shrink-0 border-r border-slate-300 overflow-hidden bg-slate-50/50"
            >
              <div className="h-7 min-h-[28px] bg-slate-200/90 px-2.5 flex items-center justify-between border-b border-slate-300 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <SafetyCertificateOutlined className="text-emerald-700" />
                  <span>{t('system.roleGroups', 'Nhóm Quyền')}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-normal">
                  {roleGroups.length} nhóm
                </div>
              </div>
              <div className="flex-1 min-h-0 w-full relative">
                <RoleGroupListTable
                  groups={roleGroups}
                  selectedGroupId={groupId}
                  onSelectGroup={handleSelectGroup}
                  canEdit={pagePerms.canEdit}
                />
              </div>
            </div>

            {/* THANH KÉO SPLITTER 1 (DỌC TRÁI/PHẢI) */}
            <div
              onMouseDown={handleMouseDownGroup}
              className={`w-1.5 h-full bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 flex items-center justify-center select-none ${isDraggingGroup ? 'bg-blue-600' : ''
                }`}
              title={t('common.resize', 'Kéo để thay đổi độ rộng')}
            >
              <div className="w-0.5 h-8 bg-slate-400 rounded-full" />
            </div>

            {/* KHU VỰC LÀM VIỆC CHÍNH (TABS: PHÂN QUYỀN MENU & THÀNH VIÊN TRONG NHÓM) */}
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-white">
              {/* THANH TAB HEADER PHẲNG CHUẨN ERP (KHÔNG BO GÓC) */}
              <div className="h-8 min-h-[32px] bg-slate-100 border-b border-slate-300 flex items-center justify-between px-2">
                <div className="flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('permissions')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-none border-t-2 border-r border-l border-b transition-colors ${
                      activeTab === 'permissions'
                        ? 'bg-white border-t-blue-700 border-r-slate-300 border-l-slate-300 border-b-white text-blue-700 font-bold'
                        : 'bg-transparent border-t-transparent border-r-transparent border-l-transparent border-b-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <UnorderedListOutlined />
                    <span>{t('Phân Quyền Chức Năng & Menu')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-none border-t-2 border-r border-l border-b transition-colors ${
                      activeTab === 'members'
                        ? 'bg-white border-t-blue-700 border-r-slate-300 border-l-slate-300 border-b-white text-blue-700 font-bold'
                        : 'bg-transparent border-t-transparent border-r-transparent border-l-transparent border-b-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <TeamOutlined className="text-indigo-600" />
                    <span>{t('Thành Viên Thuộc Nhóm')}</span>
                  </button>
                </div>
              </div>


              {/* NỘI DUNG TAB 1: PHÂN QUYỀN CHỨC NĂNG & MENU + ACTION PERMS ĐỘNG */}
              {activeTab === 'permissions' && (
                <div
                  ref={tabContentRef}
                  className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-white"
                >
                  <RoleMenuColumnActionPanel
                    gridDataB={gridDataB}
                    setGridDataB={setGridDataB}
                    selectionB={selectionB}
                    setSelectionB={setSelectionB}
                    numRowsB={numRowsB}
                    setNumRowsB={setNumRowsB}
                    colsB={colsB}
                    setColsB={setColsB}
                    defaultColsB={defaultColsB}
                    showSearchB={showSearchB}
                    setShowSearchB={setShowSearchB}
                    // Tab 1 nửa dưới: Action Perms
                    gridDataAction={gridDataAction}
                    setGridDataAction={setGridDataAction}
                    selectionAction={selectionAction}
                    setSelectionAction={setSelectionAction}
                    numRowsAction={numRowsAction}
                    setNumRowsAction={setNumRowsAction}
                    colsAction={colsAction}
                    setColsAction={setColsAction}
                    defaultColsAction={defaultColsAction}
                    showSearchAction={showSearchAction}
                    setShowSearchAction={setShowSearchAction}
                    // Tab 2 nửa dưới: Column Setup
                    gridDataCol={gridDataCol}
                    setGridDataCol={setGridDataCol}
                    selectionCol={selectionCol}
                    setSelectionCol={setSelectionCol}
                    numRowsCol={numRowsCol}
                    setNumRowsCol={setNumRowsCol}
                    colsCol={colsCol}
                    setColsCol={setColsCol}
                    defaultColsCol={defaultColsCol}
                    showSearchCol={showSearchCol}
                    setShowSearchCol={setShowSearchCol}
                    // Tab 3 nửa dưới: Scope
                    gridDataScope={gridDataScope}
                    setGridDataScope={setGridDataScope}
                    selectionScope={selectionScope}
                    setSelectionScope={setSelectionScope}
                    numRowsScope={numRowsScope}
                    setNumRowsScope={setNumRowsScope}
                    colsScope={colsScope}
                    setColsScope={setColsScope}
                    defaultColsScope={defaultColsScope}
                    showSearchScope={showSearchScope}
                    setShowSearchScope={setShowSearchScope}
                    // Modules & Context
                    rootMenus={gridDataA}
                    selectedGroupId={groupId}
                    selectedRootMenuId={selectedRootMenuId}
                    setSelectedRootMenuId={setSelectedRootMenuId}
                    selectedMenuInGrid={selectedMenuInGrid}
                    selectedRootMenuName={selectedRootMenuName}
                    canEdit={pagePerms.canEdit}
                    canCreate={pagePerms.canCreate}
                    onAddQueryField={handleAddQueryField}
                  />
                </div>
              )}


              {/* NỘI DUNG TAB 2: THÀNH VIÊN TRONG NHÓM (FULL SHEET VỚI CODE HELP F2) */}
              {activeTab === 'members' && (
                <div className="flex-1 min-h-0 w-full overflow-hidden">
                  <RoleGroupUsersTable
                    gridData={gridDataUsers}
                    setGridData={setGridDataUsers}
                    selection={selectionUsers}
                    setSelection={setSelectionUsers}
                    numRows={numRowsUsers}
                    setNumRows={setNumRowsUsers}
                    cols={colsUsers}
                    setCols={setColsUsers}
                    defaultCols={defaultColsUsers}
                    showSearch={showSearchUsers}
                    setShowSearch={setShowSearchUsers}
                    groupId={groupId}
                    groupName={groupName}
                    canEdit={pagePerms.canEdit}
                    canCreate={pagePerms.canCreate}
                    onAddQueryField={handleAddQueryField}
                  />
                </div>
              )}
            </div>
          </div>
        }
      />

      <WindowsConfirmModal {...limitModalProps} />
    </>
  )
}
