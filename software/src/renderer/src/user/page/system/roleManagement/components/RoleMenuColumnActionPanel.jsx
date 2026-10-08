/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuOutlined, CheckCircleFilled, AppstoreOutlined } from '@ant-design/icons'

import RoleMenuTable from './RoleMenuTable'
import RoleActionPermTable from './RoleActionPermTable'
import RoleColumnSetupTable from './RoleColumnSetupTable'
import RoleDataScopeTable from './RoleDataScopeTable'

export default function RoleMenuColumnActionPanel({
  // Bảng Menu nửa trên
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
  // Tab 1 nửa dưới: Action Perms
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
  // Tab 2 nửa dưới: Column Setup
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
  // Tab 3 nửa dưới: Phạm vi dữ liệu & Quy tắc sửa phiếu
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
  // Context & Modules
  rootMenus = [],
  selectedGroupId,
  selectedRootMenuId = 'ALL',
  setSelectedRootMenuId,
  selectedMenuInGrid,
  selectedRootMenuName,
  canEdit = true,
  canCreate = true,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const [activeSubTab, setActiveSubTab] = useState('1')
  const panelRef = useRef(null)

  // Cấu hình kéo thay đổi độ cao giữa Menu Sheet và Tabs
  const [topHeight, setTopHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_role_mgmt_top_height')
      return saved ? Math.max(120, Math.min(500, parseInt(saved, 10))) : 220
    } catch {
      return 220
    }
  })
  const [isDraggingY, setIsDraggingY] = useState(false)

  const handleMouseDownY = (e) => {
    e.preventDefault()
    setIsDraggingY(true)
  }

  useEffect(() => {
    if (!isDraggingY) return

    const handleMouseMove = (e) => {
      if (!panelRef.current) return
      const rect = panelRef.current.getBoundingClientRect()
      const offsetY = e.clientY - rect.top - 36
      const maxAllowed = Math.max(140, rect.height - 170)
      const clampedHeight = Math.max(110, Math.min(maxAllowed, offsetY))
      setTopHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsDraggingY(false)
      try {
        localStorage.setItem('erp_role_mgmt_top_height', String(topHeight))
      } catch {
        // ignore storage errors
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingY, topHeight])

  const currentMenuName =
    selectedMenuInGrid?.MenuLabel ||
    selectedMenuInGrid?.MenuKey ||
    selectedMenuInGrid?.Label ||
    selectedMenuInGrid?.Key ||
    'Chưa chọn'

  const currentMenuId =
    selectedMenuInGrid?.MenuId ||
    selectedMenuInGrid?.Id ||
    selectedMenuInGrid?.MenuKey ||
    selectedMenuInGrid?.Key ||
    ''

  const currentRootName =
    selectedRootMenuName ||
    selectedMenuInGrid?.RootMenuName ||
    selectedMenuInGrid?.MenuRootName ||
    ''

  const currentSubRootName =
    selectedMenuInGrid?.MenuSubRootName ||
    selectedMenuInGrid?.SubmenuName ||
    selectedMenuInGrid?.ParentName ||
    ''

  const currentMenuType = selectedMenuInGrid?.MenuType || selectedMenuInGrid?.Type || 'Menu'

  return (
    <div
      ref={panelRef}
      className="h-full w-full flex flex-col bg-white overflow-hidden select-none border border-slate-300 rounded shadow-2xs"
    >
      {/* 1. THANH HEADER THÔNG TIN CÂY PHÂN QUYỀN VÀ MENU ĐANG CHỌN */}
      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 shrink-0 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-4 bg-blue-700 rounded-xs" />
          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <AppstoreOutlined className="text-blue-700 text-sm" />
            <span>
              {t(
                'system.menuHierarchyTitle',
                'Cây Phân Quyền Chức Năng (Phân Hệ ➔ Submenu ➔ Chức Năng)'
              )}
            </span>
          </span>
          <span className="text-[11px] text-slate-500 font-normal">({numRowsB} mục)</span>
        </div>

        <div className="flex items-center gap-2 text-slate-600 shrink-0">
          <span className="font-medium text-slate-500">{t('Menu đang chọn')}:</span>
          <span className="font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
            {currentMenuName}
          </span>
        </div>
      </div>

      {/* 2. NỬA TRÊN: SHEET BẢNG DANH SÁCH MENU CHI TIẾT */}
      <div
        style={{ height: `${topHeight}px` }}
        className="w-full relative flex flex-col shrink-0 overflow-hidden bg-white"
      >
        <div className="flex-1 w-full relative">
          <RoleMenuTable
            gridData={gridDataB}
            setGridData={setGridDataB}
            selection={selectionB}
            setSelection={setSelectionB}
            numRows={numRowsB}
            setNumRows={setNumRowsB}
            cols={colsB}
            setCols={setColsB}
            defaultCols={defaultColsB}
            showSearch={showSearchB}
            setShowSearch={setShowSearchB}
            canEdit={canEdit}
            canCreate={canCreate}
            selectedGroupId={selectedGroupId}
            selectedRootMenuId={selectedRootMenuId}
            onAddQueryField={onAddQueryField}
          />
        </div>
      </div>

      {/* THANH KÉO RESIZE DỌC (SPLITTER GIỮA BẢNG MENU VÀ CÁC TAB PHÍA DƯỚI) */}
      <div
        onMouseDown={handleMouseDownY}
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        className={`h-2 -my-1 z-[2] cursor-row-resize select-none bg-slate-200 hover:bg-blue-500 active:bg-blue-600 transition-colors flex items-center justify-center relative group shrink-0 border-y border-slate-300/80 ${
          isDraggingY ? 'bg-blue-600' : ''
        }`}
        title={t('Kéo lên/xuống để điều chỉnh độ cao')}
      >
        <div className="w-12 h-1 flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100">
          <span className="w-1 h-0.5 rounded-full bg-slate-700 group-hover:bg-white" />
          <span className="w-1 h-0.5 rounded-full bg-slate-700 group-hover:bg-white" />
          <span className="w-1 h-0.5 rounded-full bg-slate-700 group-hover:bg-white" />
        </div>
      </div>

      {/* 3. NỬA DƯỚI: BẢNG QUYỀN ACTION & NÚT LỆNH CỦA MENU ĐANG CHỌN */}
      <div className="flex-1 min-h-0 w-full flex flex-col mt-1 bg-white overflow-hidden">
        {/* THANH HEADER ĐƠN GIẢN, RÕ RÀNG */}
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 h-[30px] px-3 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-blue-600 rounded-xs" />
            <span className="text-xs font-semibold text-slate-800">
              {t('system.actionInViewTab', 'Quyền Action & Nút Lệnh Chức Năng')}
            </span>
            {currentMenuName && (
              <span className="text-xs text-blue-600 font-medium">({currentMenuName})</span>
            )}
          </div>
        </div>

        {/* NỘI DUNG BẢNG ACTION PERMISSIONS */}
        <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-white">
          <div className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden">
            <RoleActionPermTable
              gridData={gridDataAction}
              setGridData={setGridDataAction}
              selection={selectionAction}
              setSelection={setSelectionAction}
              numRows={numRowsAction}
              setNumRows={setNumRowsAction}
              cols={colsAction}
              setCols={setColsAction}
              defaultCols={defaultColsAction}
              showSearch={showSearchAction}
              setShowSearch={setShowSearchAction}
              canEdit={canEdit}
              canCreate={canCreate}
              selectedMenuId={currentMenuId}
              selectedMenuName={currentMenuName}
              onAddQueryField={onAddQueryField}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
