/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { usePermFieldColumns } from './columns/permFieldColumns'
import { usePermField } from './hooks/usePermField'
import PermFieldActions from './components/action/PermFieldActions'
import PermFieldQuery from './components/query/PermFieldQuery'
import PermFieldTable from './components/table/PermFieldTable'

export default function PermFieldPage({
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
    menuKey: 'perm_field',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = usePermFieldColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'cols_perm_field',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView
    })

  const {
    resourceCode,
    setResourceCode,
    fieldCode,
    setFieldCode,
    fieldName,
    setFieldName,
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
  } = usePermField({
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
          <PermFieldActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <PermFieldQuery
            resourceCode={resourceCode}
            setResourceCode={setResourceCode}
            fieldCode={fieldCode}
            setFieldCode={setFieldCode}
            fieldName={fieldName}
            setFieldName={setFieldName}
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
          <PermFieldTable
            {...tableProps}
            tableTitle={t('Danh sách Đăng ký Trường Dữ Liệu Phân Quyền')}
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
