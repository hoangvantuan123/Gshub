import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { useUserColumns } from './columns/userColumns'
import { useUserManagement } from './hooks/useUserManagement'
import UserActions from './components/UserActions'
import UserQuery from './components/UserQuery'
import UserTable from './components/UserTable'

export default function UserManagementPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  controllers,
  cancelAllRequests,
  ...restProps
}) {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)

  // 1. Phân quyền đầy đủ cho màn hình
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'user_management',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // 2. Cấu hình cột hiển thị theo quyền trường dữ liệu (field permissions)
  const defaultCols = useUserColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  // 3. Quản lý trạng thái Grid Data Sheet chung
  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'cols_users_manage',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView
    })

  // 4. Hook nghiệp vụ riêng của màn hình (Business Logic)
  const {
    userId,
    setUserId,
    userName,
    setUserName,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    dataHelp01,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    handleUpdateStatusAcc,
    handleUpdatePassUsers,
    handleOpenDetailForm,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    handleResetQuery
  } = useUserManagement({
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
    loadingBarRef,
    controllers
  })

  // 5. Quản lý phím tắt chuẩn toàn cục (Siêu nhẹ, không lag, không memory leak)
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
          <UserActions
            handleSearchData={handleSearchData}
            handleUpdatePassUsers={handleUpdatePassUsers}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            handleUpdateStatusAcc={handleUpdateStatusAcc}
            handleOpenDetailForm={handleOpenDetailForm}
            permissions={pagePerms}
          />
        }

        query={
          <UserQuery
            setUserId={setUserId}
            userId={userId}
            setUserName={setUserName}
            userName={userName}
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
          <UserTable
            {...tableProps}
            tableTitle={t('Danh sách người dùng')}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            defaultCols={defaultCols}
            dataHelp01={dataHelp01}
            onAddQueryField={handleAddQueryField}
          />
        }
      />

      <WindowsConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmSearch}
        onCancel={handleCancelSearch}
        title="Xác nhận dữ liệu chưa lưu"
        message="Dữ liệu trên bảng đã được chỉnh sửa nhưng chưa được lưu!"
        subMessage="Nếu tiếp tục truy vấn, tất cả các thay đổi chưa lưu trên bảng sẽ bị hủy bỏ và tải lại từ máy chủ. Bạn có muốn tiếp tục?"
        confirmText="Tiếp tục truy vấn"
        cancelText="Quay lại"
        type="warning"
      />
    </>
  )
}
