/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { usePermActionColumns } from './columns/permActionColumns'
import { usePermAction } from './hooks/usePermAction'
import PermActionActions from './components/actions/PermActionActions'
import PermActionQuery from './components/query/PermActionQuery'
import PermActionTable from './components/table/PermActionTable'

export default function PermActionPage({
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
    menuKey: 'perm_action',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = usePermActionColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'cols_perm_action',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView
    })

  const {
    actionCode,
    setActionCode,
    actionName,
    setActionName,
    isDefaultAllow,
    setIsDefaultAllow,
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
  } = usePermAction({
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
          <PermActionActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <PermActionQuery
            actionCode={actionCode}
            setActionCode={setActionCode}
            actionName={actionName}
            setActionName={setActionName}
            isDefaultAllow={isDefaultAllow}
            setIsDefaultAllow={setIsDefaultAllow}
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
          <PermActionTable
            {...tableProps}
            tableTitle={t('Danh sách Đăng ký Hành Động Quyền Hạn')}
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
