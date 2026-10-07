/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuOutlined, CheckCircleFilled } from '@ant-design/icons'

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
  // Context
  selectedGroupId,
  selectedRootMenuId,
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
      {/* 1. THANH HEADER THÔNG TIN ĐIỀU HƯỚNG MENU */}
      <div className="bg-gradient-to-r from-slate-100 via-slate-50 to-white px-3 py-1.5 border-b border-slate-300 shrink-0 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-700 text-white shadow-2xs">
              <MenuOutlined className="text-[10px]" />
            </span>
            <span className="text-slate-500 font-semibold">{t('Phân Hệ')}:</span>
            <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {currentRootName || t('Quản trị hệ thống')}
            </span>
          </div>

          {currentSubRootName && (
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <span className="text-slate-300">/</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium">
                {currentSubRootName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-semibold">{t('Menu Đang Chọn')}:</span>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-bold shadow-2xs">
              <CheckCircleFilled className="text-amber-600 text-xs" />
              <span>{currentMenuName}</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 ml-2">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-mono">
              Key: {currentMenuId || '---'}
            </span>
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
              {currentMenuType}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-2">
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {t('Số dòng menu')}: <strong className="text-blue-700 font-bold">{numRowsB}</strong>
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

      {/* 3. NỬA DƯỚI: CỤM 3 TABS PHÂN QUYỀN ERP */}
      <div className="flex-1 min-h-0 w-full flex flex-col mt-1 bg-white overflow-hidden">
        {/* THANH TAB HEADER PHẲNG CHUẨN ERP, CỐ ĐỊNH KÍCH THƯỚC KHÔNG NHẢY LAYOUT */}
        <div className="flex items-stretch justify-between border-b border-slate-300 bg-slate-100 h-[30px] shrink-0 select-none overflow-hidden">
          <div className="flex items-stretch h-full overflow-x-auto overflow-y-hidden">
            {/* Tab 1: Quyền Action & Nút Lệnh */}
            <button
              type="button"
              onClick={() => setActiveSubTab('1')}
              className={`relative h-full flex items-center justify-center px-5 text-xs cursor-pointer select-none whitespace-nowrap border-r border-slate-300 transition-colors ${
                activeSubTab === '1'
                  ? 'bg-white text-blue-700 font-medium'
                  : 'bg-transparent text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-medium'
              }`}
            >
              {activeSubTab === '1' && (
                <span className="absolute top-0 left-0 right-0 h-[2.5px] bg-blue-600" />
              )}
              <span className="text-center">
                {t('system.actionInViewTab', 'Quyền Action & Nút Lệnh')}
              </span>
            </button>

            {/* Tab 2: Cấu Hình Cột & Khóa Ẩn */}
            <button
              type="button"
              onClick={() => setActiveSubTab('2')}
              className={`relative h-full flex items-center justify-center px-5 text-xs cursor-pointer select-none whitespace-nowrap border-r border-slate-300 transition-colors ${
                activeSubTab === '2'
                  ? 'bg-white text-blue-700 font-medium'
                  : 'bg-transparent text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-medium'
              }`}
            >
              {activeSubTab === '2' && (
                <span className="absolute top-0 left-0 right-0 h-[2.5px] bg-blue-600" />
              )}
              <span className="text-center">
                {t('system.colSetupInViewTab', 'Cấu Hình Cột & Khóa Ẩn')}
              </span>
            </button>

            {/* Tab 3: Phạm Vi Dữ Liệu & Quy Tắc Sửa Phiếu */}
            <button
              type="button"
              onClick={() => setActiveSubTab('3')}
              className={`relative h-full flex items-center justify-center px-5 text-xs cursor-pointer select-none whitespace-nowrap border-r border-slate-300 transition-colors ${
                activeSubTab === '3'
                  ? 'bg-white text-blue-700 font-medium'
                  : 'bg-transparent text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 font-medium'
              }`}
            >
              {activeSubTab === '3' && (
                <span className="absolute top-0 left-0 right-0 h-[2.5px] bg-blue-600" />
              )}
              <span className="text-center">
                {t('system.dataScopeTab', 'Phạm Vi Dữ Liệu & Sửa Phiếu')}
              </span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG TỪNG TAB */}
        <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-white">
          {/* Tab 1 Pane: Quyền Action & Nút Lệnh */}
          <div
            style={{ display: activeSubTab === '1' ? 'flex' : 'none' }}
            className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
          >
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

          {/* Tab 2 Pane: Cấu Hình Cột & Khóa Ẩn */}
          <div
            style={{ display: activeSubTab === '2' ? 'flex' : 'none' }}
            className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
          >
            <RoleColumnSetupTable
              gridData={gridDataCol}
              setGridData={setGridDataCol}
              selection={selectionCol}
              setSelection={setSelectionCol}
              numRows={numRowsCol}
              setNumRows={setNumRowsCol}
              cols={colsCol}
              setCols={setColsCol}
              defaultCols={defaultColsCol}
              showSearch={showSearchCol}
              setShowSearch={setShowSearchCol}
              canEdit={canEdit}
              canCreate={canCreate}
              selectedMenuId={currentMenuId}
              selectedMenuName={currentMenuName}
              onAddQueryField={onAddQueryField}
            />
          </div>

          {/* Tab 3 Pane: Phạm Vi Dữ Liệu & Quy Tắc Sửa Phiếu */}
          <div
            style={{ display: activeSubTab === '3' ? 'flex' : 'none' }}
            className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
          >
            <RoleDataScopeTable
              gridData={gridDataScope}
              setGridData={setGridDataScope}
              selection={selectionScope}
              setSelection={setSelectionScope}
              numRows={numRowsScope}
              setNumRows={setNumRowsScope}
              cols={colsScope}
              setCols={setColsScope}
              defaultCols={defaultColsScope}
              showSearch={showSearchScope}
              setShowSearch={setShowSearchScope}
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
