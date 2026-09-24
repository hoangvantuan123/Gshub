/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { useSysAttrValueColumns } from './columns/sysAttrValueColumns'
import { useSysAttrValue } from './hooks/useSysAttrValue'
import SysAttrValueActions from './components/actions/SysAttrValueActions'
import SysAttrValueQuery from './components/query/SysAttrValueQuery'
import SysAttrValueTable from './components/table/SysAttrValueTable'

export default function SysAttrValuePage({
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
    menuKey: 'sys_attr_value',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = useSysAttrValueColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'cols_sys_attr_val',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView,
      initialRowCount: 150
    })

  const {
    groupCode,
    setGroupCode,
    attrValueCode,
    setAttrValueCode,
    attrValueName,
    setAttrValueName,
    isActive,
    setIsActive,
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
    groupHelpColumns,
    limitModalProps
  } = useSysAttrValue({
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
          <SysAttrValueActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <SysAttrValueQuery
            groupCode={groupCode}
            setGroupCode={setGroupCode}
            attrValueCode={attrValueCode}
            setAttrValueCode={setAttrValueCode}
            attrValueName={attrValueName}
            setAttrValueName={setAttrValueName}
            isActive={isActive}
            setIsActive={setIsActive}
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            dynamicQueryFields={dynamicQueryFields}
            onAddQueryField={handleAddQueryField}
            onRemoveQueryField={handleRemoveQueryField}
            onResetQuery={handleResetQuery}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
            groupHelpColumns={groupHelpColumns}
          />
        }
        table={
          <SysAttrValueTable
            {...tableProps}
            tableTitle={t(
              'system.sysAttrValueListTitle',
              'Danh sách Đăng ký Chi Tiết Giá Trị Thuộc Tính Hệ Thống'
            )}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            defaultCols={defaultCols}
            onAddQueryField={handleAddQueryField}
            onVisibleRegionChanged={onVisibleRegionChanged}
            groupHelpColumns={groupHelpColumns}
          />
        }
      />

      <WindowsConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmSearch}
        onCancel={handleCancelSearch}
        title={t('system.confirmUnsavedTitle', 'Xác nhận dữ liệu chưa lưu')}
        message={t(
          'system.confirmUnsavedMsg',
          'Dữ liệu trên bảng đã được chỉnh sửa nhưng chưa được lưu!'
        )}
        subMessage={t(
          'system.confirmUnsavedSub',
          'Nếu tiếp tục truy vấn, tất cả các thay đổi chưa lưu trên bảng sẽ bị hủy bỏ và tải lại từ máy chủ. Bạn có muốn tiếp tục?'
        )}
        confirmText={t('system.continueSearch', 'Tiếp tục truy vấn')}
        cancelText={t('system.goBack', 'Quay lại')}
        type="warning"
      />

      <WindowsConfirmModal {...limitModalProps} />
    </>
  )
}
