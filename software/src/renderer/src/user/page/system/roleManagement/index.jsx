/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { AppstoreOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import RoleManagementActions from './components/RoleManagementActions'
import RoleManagementQuery from './components/RoleManagementQuery'
import RoleRootMenuTable from './components/RoleRootMenuTable'
import RoleMenuColumnActionPanel from './components/RoleMenuColumnActionPanel'
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
    // Form Thông Tin Nhóm Quyền (Query Layout)
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

  const containerRef = useRef(null)
  const [leftWidth, setLeftWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_role_mgmt_left_width')
      return saved ? Math.max(240, Math.min(650, parseInt(saved, 10))) : 360
    } catch {
      return 360
    }
  })
  const [isDraggingX, setIsDraggingX] = useState(false)

  const handleMouseDownX = (e) => {
    e.preventDefault()
    setIsDraggingX(true)
  }

  useEffect(() => {
    if (!isDraggingX) return

    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const maxAllowed = Math.max(300, rect.width - 360)
      const clampedWidth = Math.max(240, Math.min(maxAllowed, newWidth))
      setLeftWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDraggingX(false)
      try {
        localStorage.setItem('erp_role_mgmt_left_width', String(leftWidth))
      } catch {
        // ignore storage errors
      }
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
  }, [isDraggingX, leftWidth])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <RoleManagementActions
            handleSearch={handleSearch}
            handleSave={handleSave}
            handleDelete={handleDelete}
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
            className={`flex h-full w-full overflow-hidden bg-white ${
              isDraggingX ? 'select-none' : ''
            }`}
          >
            {/* CỘT 1: PHÂN HỆ MENU CHÍNH (ROOT MENUS) */}
            <div
              style={{ width: `${leftWidth}px` }}
              className="h-full flex flex-col shrink-0 border-r border-slate-300 overflow-hidden"
            >
              <div className="h-7 min-h-[28px] bg-slate-200/90 px-2.5 flex items-center justify-between border-b border-slate-300 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <AppstoreOutlined className="text-blue-600" />
                  <span>{t('system.rootModules', 'Phân Hệ Giao Diện')}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-normal">
                  {t('system.totalRecords', 'Tổng số: {{count}} dòng', { count: numRowsA })}
                </div>
              </div>
              <div className="flex-1 min-h-0 w-full relative">
                <RoleRootMenuTable
                  gridData={gridDataA}
                  setGridData={setGridDataA}
                  selection={selectionA}
                  setSelection={setSelectionA}
                  numRows={numRowsA}
                  setNumRows={setNumRowsA}
                  cols={colsA}
                  setCols={setColsA}
                  defaultCols={defaultColsA}
                  showSearch={showSearchA}
                  setShowSearch={setShowSearchA}
                  canEdit={pagePerms.canEdit}
                  canCreate={pagePerms.canCreate}
                  selectedGroupId={groupId}
                  onAddQueryField={handleAddQueryField}
                />
              </div>
            </div>

            {/* THANH KÉO SPLITTER NGANG */}
            <div
              onMouseDown={handleMouseDownX}
              className={`w-1.5 h-full bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-colors duration-150 flex items-center justify-center select-none ${
                isDraggingX ? 'bg-blue-600' : ''
              }`}
              title={t('common.resize', 'Kéo để thay đổi độ rộng')}
            >
              <div className="w-0.5 h-8 bg-slate-400 rounded-full" />
            </div>

            {/* CỘT 2: BẢNG MENU & PANEL TABS CHI TIẾT */}
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-slate-50">
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
                // Action Perms Tab
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
                // Column Setup Tab
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
                // Data Scope Tab
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
                // Context
                selectedGroupId={groupId}
                selectedRootMenuId={selectedRootMenuId}
                selectedMenuInGrid={selectedMenuInGrid}
                selectedRootMenuName={selectedRootMenuName}
                selectedRootMenuKey={selectedRootMenuKey}
                canEdit={pagePerms.canEdit}
                canCreate={pagePerms.canCreate}
                onAddQueryField={handleAddQueryField}
              />
            </div>
          </div>
        }
      />

      <WindowsConfirmModal {...limitModalProps} />
    </>
  )
}
