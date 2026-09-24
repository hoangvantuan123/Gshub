/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react'
import { AppstoreOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import {
  usePermFieldColumns,
  usePermActionColumns,
  usePermScopeColumns
} from './columns/permResourceColumns'
import { usePermResource } from './hooks/usePermResource'
import PermResourceActions from './components/action/PermResourceActions'
import PermResourceQuery from './components/query/PermResourceQuery'
import PermResourceMenuTree from './components/tree/PermResourceMenuTree'
import PermResourceDetailPanel from './components/panel/PermResourceDetailPanel'

export default function PermResourcePage({
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
    menuKey: restProps?.menuKey || 'perm_resource',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // Định nghĩa các bộ cột
  const defaultColsField = usePermFieldColumns()
  const defaultColsAction = usePermActionColumns()
  const defaultColsScope = usePermScopeColumns()

  const [colsField, setColsField] = useState(defaultColsField)
  const [colsAction, setColsAction] = useState(defaultColsAction)
  const [colsScope, setColsScope] = useState(defaultColsScope)

  useEffect(() => {
    setColsField(defaultColsField)
  }, [defaultColsField])

  useEffect(() => {
    setColsAction(defaultColsAction)
  }, [defaultColsAction])

  useEffect(() => {
    setColsScope(defaultColsScope)
  }, [defaultColsScope])

  const {
    // Query Filters
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
    handleSelectResource,
    // Active Sub-tab
    activeSubTab,
    setActiveSubTab,
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
  } = usePermResource({
    canCreate: pagePerms.canCreate,
    canEdit: pagePerms.canEdit,
    canView: pagePerms.canView,
    canSearch: pagePerms.canSearch,
    canDelete: pagePerms.canDelete,
    loadingBarRef,
    customLimits: customLimits || restProps?.audLimits
  })

  // Phím tắt chuẩn ERP
  usePageHotkeys({
    onSearch: handleSearchData,
    onSave: handleSaveData,
    onDelete: handleDeleteDataSheet
  })

  // Quản lý kéo thả Splitter ngang thay đổi độ rộng 2 layout
  const containerRef = useRef(null)
  const [leftWidth, setLeftWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_perm_resource_left_width')
      return saved ? Math.max(260, Math.min(650, parseInt(saved, 10))) : 360
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
      const maxAllowed = Math.max(300, rect.width - 380)
      const clampedWidth = Math.max(260, Math.min(maxAllowed, newWidth))
      setLeftWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDraggingX(false)
      try {
        localStorage.setItem('erp_perm_resource_left_width', String(leftWidth))
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
          <PermResourceActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            handleAddRow={handleAddRow}
            handleExportExcel={handleExportExcel}
            permissions={pagePerms}
          />
        }
        query={
          <PermResourceQuery
            keyword={keyword}
            setKeyword={setKeyword}
            resourceCodeFilter={resourceCodeFilter}
            setResourceCodeFilter={setResourceCodeFilter}
            rootMenuFilter={rootMenuFilter}
            setRootMenuFilter={setRootMenuFilter}
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            dynamicQueryFields={dynamicQueryFields}
            onAddQueryField={handleAddQueryField}
            onRemoveQueryField={handleRemoveQueryField}
            onResetQuery={handleResetQuery}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <div
            ref={containerRef}
            className={`flex h-full w-full overflow-hidden bg-white ${
              isDraggingX ? 'select-none' : ''
            }`}
          >
            {/* CỘT 1: CÂY CẤU TRÚC PHÂN HỆ & MENU */}
            <div
              style={{ width: `${leftWidth}px` }}
              className="h-full flex flex-col shrink-0 border-r border-slate-300 overflow-hidden"
            >
              <div className="flex-1 min-h-0 w-full relative">
                <PermResourceMenuTree
                  onSelectResource={handleSelectResource}
                  selectedResource={selectedResource}
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

            {/* CỘT 2: PANEL ĐĂNG KÝ HẠNG MỤC CHI TIẾT (RIGHT DETAIL) */}
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-slate-50">
              <PermResourceDetailPanel
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                selectedResource={selectedResource}
                // Tab 1: Fields
                gridDataField={gridDataField}
                setGridDataField={setGridDataField}
                selectionField={selectionField}
                setSelectionField={setSelectionField}
                numRowsField={numRowsField}
                setNumRowsField={setNumRowsField}
                colsField={colsField}
                setColsField={setColsField}
                defaultColsField={defaultColsField}
                showSearchField={showSearchField}
                setShowSearchField={setShowSearchField}
                // Tab 2: Actions
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
                // Tab 3: Scopes
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
                // Permissions
                canEdit={pagePerms.canEdit}
                canCreate={pagePerms.canCreate}
                onAddQueryField={handleAddQueryField}
              />
            </div>
          </div>
        }
      />

      <WindowsConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title={t('system.confirmDelete', 'Xác nhận xóa')}
        message={t(
          'system.confirmDeleteMsg',
          'Bạn có chắc chắn muốn xóa các dòng dữ liệu đã chọn không?'
        )}
      />
    </>
  )
}
