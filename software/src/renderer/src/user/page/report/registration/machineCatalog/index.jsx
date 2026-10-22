/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useEffect, useRef } from 'react'
import { message, notification } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../hooks/usePagePermissions'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../../components/modal/WindowsConfirmModal'

import { useMachineCatalogColumns } from './columns/machineCatalogColumns'
import { useMachineCatalog } from './hooks/useMachineCatalog'
import MachineCatalogActions from './components/MachineCatalogActions'
import MachineCatalogQuery from './components/MachineCatalogQuery'
import RoleGroupTable from '../../../system/roleGroup/components/RoleGroupTable'

export default function ProdMachineCatalogPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  cancelAllRequests,
  ...restProps
}) {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_prod_machine_catalog',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })
  const defaultCols = useMachineCatalogColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: (fieldId) =>
      (!pagePerms.canEdit && !pagePerms.canCreate) ||
      (pagePerms.raw?.ReadOnlyFields || restProps.readOnlyFields || []).includes(fieldId)
  })
  const {
    gridData,
    setGridData,
    setNumRows,
    resetTable,
    getSelectedRows,
    tableProps
  } = useDataGridSheet({
    storageKey: 'cols_report_prod_machine_catalog',
    defaultCols,
    canCreate: pagePerms.canCreate,
    canView: pagePerms.canView
  })
  const {
    filters,
    setFilters,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    showDeleteModal,
    rowsToDelete,
    handleConfirmDelete,
    handleCancelDelete
  } = useMachineCatalog({
    gridData,
    setGridData,
    setNumRows,
    getSelectedRows,
    selection: tableProps.selection,
    resetTable,
    defaultCols,
    canCreate: pagePerms.canCreate,
    canEdit: pagePerms.canEdit,
    canSave: pagePerms.canSave,
    canView: pagePerms.canView,
    canSearch: pagePerms.canSearch,
    canDelete: pagePerms.canDelete,
    loadingBarRef
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
    handleSearchData()
    return () => cancelAllRequestsRef.current?.()
    // Run initial query once when the page mounts.
  }, [])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <MachineCatalogActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <MachineCatalogQuery
            filters={filters}
            setFilters={setFilters}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <RoleGroupTable
            {...tableProps}
            tableId="report_prod_machine_catalog"
            readOnlyBg="#ffffff"
            gridTheme={{
              bgCell: '#ffffff',
              bgHeader: '#f8fafc',
              headerFontStyle: '600 12px',
              baseFontStyle: '12px'
            }}
            tableTitle={t('Đăng ký danh mục máy móc')}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            canDelete={pagePerms.canDelete}
            onDeleteRow={handleDeleteDataSheet}
            defaultCols={defaultCols}
          />
        }
      />
      <WindowsConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmSearch}
        onCancel={handleCancelSearch}
        title={t('Xác nhận dữ liệu chưa lưu')}
        message={t('Dữ liệu trên Sheet đã được chỉnh sửa nhưng chưa được lưu!')}
        subMessage={t(
          'Nếu tiếp tục truy vấn, các thay đổi chưa lưu sẽ bị hủy và dữ liệu được tải lại từ máy chủ. Bạn có muốn tiếp tục?'
        )}
        confirmText={t('Tiếp tục truy vấn')}
        cancelText={t('Quay lại')}
        type="warning"
      />
      <WindowsConfirmModal
        isOpen={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title={t('Xác nhận xóa máy móc')}
        message={t('Bạn có chắc chắn muốn xóa {{count}} dòng đã chọn không?', {
          count: rowsToDelete?.length || 0
        })}
        subMessage={t(
          'Dữ liệu sẽ được xóa trực tiếp khỏi hệ thống và không thể hoàn tác. Bạn có muốn tiếp tục?'
        )}
        confirmText={t('Xóa dữ liệu')}
        cancelText={t('Quay lại')}
        type="danger"
        confirmVariant="danger"
      />
    </>
  )
}
