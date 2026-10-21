/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useEffect, useRef } from 'react'
import { message, notification } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../hooks/usePagePermissions'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../../components/modal/WindowsConfirmModal'

import { useRemarkTypeColumns } from './columns/remarkTypeColumns'
import { useRemarkType } from './hooks/useRemarkType'
import RemarkTypeActions from './components/RemarkTypeActions'
import RemarkTypeQuery from './components/RemarkTypeQuery'
import RoleGroupTable from '../../../system/roleGroup/components/RoleGroupTable'

export default function ProdStatsRemarkTypePage({
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
    menuKey: 'report_prod_stats_remark_type',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })
  const defaultCols = useRemarkTypeColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: (fieldId) =>
      (!pagePerms.canEdit && !pagePerms.canCreate) ||
      (pagePerms.raw?.ReadOnlyFields || restProps.readOnlyFields || []).includes(fieldId)
  })
  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'cols_report_prod_stats_remark_type',
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
    handleCancelSearch
  } = useRemarkType({
    gridData,
    setGridData,
    setNumRows,
    getSelectedRows,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <RemarkTypeActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <RemarkTypeQuery
            filters={filters}
            setFilters={setFilters}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <RoleGroupTable
            {...tableProps}
            tableId="report_prod_stats_remark_type"
            readOnlyBg="#ffffff"
            gridTheme={{
              bgCell: '#ffffff',
              bgHeader: '#f8fafc',
              headerFontStyle: '600 12px',
              baseFontStyle: '12px'
            }}
            tableTitle={t('Đăng ký phân loại lỗi TKSX')}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
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
    </>
  )
}
