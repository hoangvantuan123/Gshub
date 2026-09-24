/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'

import { useDictSysColumns } from './columns/dictSysColumns'
import { useDictSys } from './hooks/useDictSys'
import DictSysActions from './components/DictSysActions'
import DictSysQuery from './components/DictSysQuery'
import DictSysTable from './components/DictSysTable'

export default function DictSysPage({
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
    menuKey: 'system_dictionary',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = useDictSysColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const { gridData, setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'S_ERP_COLS_PAGE_DICT_SYS',
      defaultCols,
      canCreate: pagePerms.canCreate,
      canView: pagePerms.canView
    })

  const {
    languageSeq,
    setLanguageSeq,
    languages,
    word,
    setWord,
    wordSeq,
    setWordSeq,
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
  } = useDictSys({
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
          <DictSysActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            permissions={pagePerms}
          />
        }
        query={
          <DictSysQuery
            languageSeq={languageSeq}
            setLanguageSeq={setLanguageSeq}
            languages={languages}
            word={word}
            setWord={setWord}
            wordSeq={wordSeq}
            setWordSeq={setWordSeq}
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
          <DictSysTable
            {...tableProps}
            tableTitle={t('Danh mục Từ điển')}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            defaultCols={defaultCols}
            languages={languages}
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
