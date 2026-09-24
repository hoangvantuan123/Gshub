/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { useLangSysColumns } from './columns/langSysColumns'
import { useLangSys } from './hooks/useLangSys'
import LangSysActions from './components/LangSysActions'
import LangSysQuery from './components/LangSysQuery'
import LangSysTable from './components/LangSysTable'

export default function LangSysPage({
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
    menuKey: 'system_language',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = useLangSysColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'S_ERP_COLS_PAGE_LANG_SYS',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView
    })

  const {
    languageName,
    setLanguageName,
    languageCode,
    setLanguageCode,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    handleResetQuery,
    onVisibleRegionChanged,
    limitModalProps
  } = useLangSys({
    gridData,
    setGridData,
    setNumRows,
    getSelectedRows,
    resetTable,
    defaultCols,
    canCreate: pagePerms.canCreate,
    canEdit: pagePerms.canEdit,
    canView: pagePerms.canView,
    canSearch: pagePerms.canSearch,
    canDelete: pagePerms.canDelete,
    loadingBarRef,
    controllers,
    customLimits: customLimits || restProps?.audLimits
  })

  usePageHotkeys({
    onSearch: handleSearchData,
    onSave: handleSaveData,
    onDelete: handleDeleteDataSheet
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

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <LangSysActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <LangSysQuery
            setLanguageName={setLanguageName}
            languageName={languageName}
            setLanguageCode={setLanguageCode}
            languageCode={languageCode}
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
          <LangSysTable
            {...tableProps}
            tableTitle={t('Danh sách Ngôn ngữ')}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            defaultCols={defaultCols}
            onAddQueryField={handleAddQueryField}
            onVisibleRegionChanged={onVisibleRegionChanged}
          />
        }
      />

      <WindowsConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmSearch}
        onCancel={handleCancelSearch}
        title={t('Xác nhận dữ liệu chưa lưu')}
        message={t('Dữ liệu trên bảng đã được chỉnh sửa nhưng chưa được lưu!')}
        subMessage={t(
          'Nếu tiếp tục truy vấn, tất cả các thay đổi chưa lưu trên bảng sẽ bị hủy bỏ và tải lại từ máy chủ. Bạn có muốn tiếp tục?'
        )}
        confirmText={t('Tiếp tục truy vấn')}
        cancelText={t('Quay lại')}
        type="warning"
      />

      <WindowsConfirmModal {...limitModalProps} />
    </>
  )
}
