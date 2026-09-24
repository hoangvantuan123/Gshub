/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { usePermScopeColumns } from './columns/permScopeColumns'
import { usePermScope } from './hooks/usePermScope'
import PermScopeActions from './components/actions/PermScopeActions'
import PermScopeQuery from './components/query/PermScopeQuery'
import PermScopeTable from './components/table/PermScopeTable'

export default function PermScopePage({
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
    menuKey: 'perm_scope',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = usePermScopeColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'cols_perm_scope',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView
    })

  const {
    scopeCode,
    setScopeCode,
    scopeName,
    setScopeName,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    onVisibleRegionChanged,
    limitModalProps
  } = usePermScope({
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
          <PermScopeActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <PermScopeQuery
            scopeCode={scopeCode}
            setScopeCode={setScopeCode}
            scopeName={scopeName}
            setScopeName={setScopeName}
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
          <PermScopeTable
            {...tableProps}
            tableTitle={t('Danh sách Đăng ký Phạm Vi Quyền Hạn')}
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
