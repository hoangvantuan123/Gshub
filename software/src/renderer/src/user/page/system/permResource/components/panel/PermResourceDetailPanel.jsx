/* eslint-disable react/prop-types */
import { useTranslation } from 'react-i18next'
import { FolderOpenOutlined } from '@ant-design/icons'

import PermResourceFieldTable from '../table/PermResourceFieldTable'
import PermResourceActionTable from '../table/PermResourceActionTable'
import PermResourceScopeTable from '../table/PermResourceScopeTable'

export default function PermResourceDetailPanel({
  activeSubTab = '1',
  setActiveSubTab,
  selectedResource = {},
  // Tab 1: Fields
  gridDataField = [],
  setGridDataField,
  selectionField,
  setSelectionField,
  numRowsField = 0,
  setNumRowsField,
  colsField = [],
  setColsField,
  defaultColsField = [],
  showSearchField,
  setShowSearchField,
  // Tab 2: Actions
  gridDataAction = [],
  setGridDataAction,
  selectionAction,
  setSelectionAction,
  numRowsAction = 0,
  setNumRowsAction,
  colsAction = [],
  setColsAction,
  defaultColsAction = [],
  showSearchAction,
  setShowSearchAction,
  // Tab 3: Scopes
  gridDataScope = [],
  setGridDataScope,
  selectionScope,
  setSelectionScope,
  numRowsScope = 0,
  setNumRowsScope,
  colsScope = [],
  setColsScope,
  defaultColsScope = [],
  showSearchScope,
  setShowSearchScope,
  // Permissions
  canEdit = true,
  canCreate = true,
  onAddQueryField
}) {
  const { t } = useTranslation()

  const currentResourceCode = selectedResource?.ResourceCode || selectedResource?.Key || ''
  const currentResourceName = selectedResource?.ResourceName || selectedResource?.Label || ''
  const currentRootName = selectedResource?.RootMenuName || selectedResource?.MenuRootName || ''
  const currentSubmenuName =
    selectedResource?.SubmenuName || selectedResource?.MenuSubRootName || ''

  // Nếu chưa chọn menu chức năng nào
  if (!currentResourceCode) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8 border border-slate-300 rounded select-none">
        <FolderOpenOutlined className="text-5xl text-slate-300 mb-3" />
        <div className="text-sm font-bold text-slate-600 mb-1">
          {t('system.selectMenuPrompt', 'Chưa chọn Menu Chức Năng')}
        </div>
        <div className="text-xs text-slate-400 text-center max-w-md leading-relaxed">
          {t(
            'system.selectMenuDesc',
            'Vui lòng nhấp chọn một Menu hoặc MenuItem từ cây bên trái để xem và thiết lập cấu hình phân quyền (Trường dữ liệu, Hành động, Phạm vi).'
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden select-none border border-slate-300">
      {/* 1. TIÊU ĐỀ KHỐI THÔNG TIN MENU ĐANG CHỌN */}
      <div className="h-8 flex items-center px-3 bg-slate-100 border-b border-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs inline-block shrink-0" />
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
            {t('system.selectedMenuInfo', 'Thông Tin Menu Chức Năng Đang Chọn')}
          </span>
        </div>
      </div>

      {/* 2. THANH THÔNG TIN CHI TIẾT (CHUẨN QUERY BAR 2 HÀNG SO LE, KHÔNG PADDING BAO NGOÀI) */}
      <div className="w-full border-b border-slate-300 bg-slate-200 gap-[1px] grid grid-cols-1 md:grid-cols-2 shrink-0">
        {/* Hàng 1 - Cột 1: Phân Hệ Nghiệp Vụ */}
        <div className="flex items-center min-h-[30px] bg-white min-w-0">
          <div className="bg-slate-100 border-r border-slate-200 h-full flex items-center shrink-0 font-bold text-[11px] text-slate-700 select-none px-3.5 whitespace-nowrap min-w-[150px]">
            {t('system.moduleFull', 'Phân Hệ Nghiệp Vụ')}
          </div>
          <div
            className="flex-1 h-full flex items-center px-3 text-xs font-semibold text-slate-800 truncate"
            title={currentRootName}
          >
            {currentRootName || '---'}
          </div>
        </div>

        {/* Hàng 1 - Cột 2: Nhóm Menu Phân Cấp */}
        <div className="flex items-center min-h-[30px] bg-white min-w-0">
          <div className="bg-slate-100 border-r border-slate-200 h-full flex items-center shrink-0 font-bold text-[11px] text-slate-700 select-none px-3.5 whitespace-nowrap min-w-[160px]">
            {t('system.submenuFull', 'Nhóm Menu Phân Cấp')}
          </div>
          <div
            className="flex-1 h-full flex items-center px-3 text-xs font-semibold text-slate-800 truncate"
            title={currentSubmenuName}
          >
            {currentSubmenuName || '---'}
          </div>
        </div>

        {/* Hàng 2 - Cột 1: Tên Menu Chức Năng */}
        <div className="flex items-center min-h-[30px] bg-white min-w-0">
          <div className="bg-slate-100 border-r border-slate-200 h-full flex items-center shrink-0 font-bold text-[11px] text-slate-700 select-none px-3.5 whitespace-nowrap min-w-[150px]">
            {t('system.menuNameFull', 'Tên Menu Chức Năng')}
          </div>
          <div
            className="flex-1 h-full flex items-center px-3 text-xs font-bold text-blue-700 truncate"
            title={currentResourceName}
          >
            {currentResourceName || '---'}
          </div>
        </div>

        {/* Hàng 2 - Cột 2: Mã Định Danh Chức Năng */}
        <div className="flex items-center min-h-[30px] bg-white min-w-0">
          <div className="bg-slate-100 border-r border-slate-200 h-full flex items-center shrink-0 font-bold text-[11px] text-slate-700 select-none px-3.5 whitespace-nowrap min-w-[160px]">
            {t('system.resourceCodeFull', 'Mã Định Danh Chức Năng')}
          </div>
          <div
            className="flex-1 h-full flex items-center px-3 text-xs font-mono font-bold text-slate-800 truncate"
            title={currentResourceCode}
          >
            {currentResourceCode || '---'}
          </div>
        </div>
      </div>

      {/* 3. CỤM 3 TABS ĐĂNG KÝ HẠNG MỤC CHO MENU */}
      <div className="flex-1 min-h-0 w-full flex flex-col bg-white overflow-hidden">
        <div className="flex items-stretch justify-between border-b border-slate-300 bg-slate-100 h-[30px] shrink-0 select-none overflow-hidden">
          <div className="flex items-stretch h-full overflow-x-auto overflow-y-hidden">
            {/* Tab 1: Đăng ký Trường Dữ Liệu */}
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
                {t('system.fieldsRegistrationTab', 'Đăng Ký Trường Dữ Liệu')}
              </span>
            </button>

            {/* Tab 2: Đăng ký Hành Động / Nút Bấm */}
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
                {t('system.actionsRegistrationTab', 'Đăng Ký Hành Động / Nút')}
              </span>
            </button>

            {/* Tab 3: Đăng ký Phạm Vi Dữ Liệu */}
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
                {t('system.scopesRegistrationTab', 'Đăng Ký Phạm Vi Dữ Liệu')}
              </span>
            </button>
          </div>
        </div>

        {/* NỘI DUNG TỪNG TAB */}
        <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-white">
          {/* Tab 1 Pane: Fields */}
          <div
            style={{ display: activeSubTab === '1' ? 'flex' : 'none' }}
            className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
          >
            <PermResourceFieldTable
              gridData={gridDataField}
              setGridData={setGridDataField}
              selection={selectionField}
              setSelection={setSelectionField}
              numRows={numRowsField}
              setNumRows={setNumRowsField}
              cols={colsField}
              setCols={setColsField}
              defaultCols={defaultColsField}
              showSearch={showSearchField}
              setShowSearch={setShowSearchField}
              canEdit={canEdit}
              canCreate={canCreate}
              selectedResource={selectedResource}
              onAddQueryField={onAddQueryField}
            />
          </div>

          {/* Tab 2 Pane: Actions */}
          <div
            style={{ display: activeSubTab === '2' ? 'flex' : 'none' }}
            className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
          >
            <PermResourceActionTable
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
              selectedResource={selectedResource}
              onAddQueryField={onAddQueryField}
            />
          </div>

          {/* Tab 3 Pane: Scopes */}
          <div
            style={{ display: activeSubTab === '3' ? 'flex' : 'none' }}
            className="absolute inset-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
          >
            <PermResourceScopeTable
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
              selectedResource={selectedResource}
              onAddQueryField={onAddQueryField}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
