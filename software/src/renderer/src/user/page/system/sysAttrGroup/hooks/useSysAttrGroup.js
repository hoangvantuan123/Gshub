import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { useSysAttrGroupFilter } from './useSysAttrGroupFilter'
import { useSysAttrGroupFetch } from './useSysAttrGroupFetch'
import { useSysAttrGroupMutation } from './useSysAttrGroupMutation'

export function useSysAttrGroup({
  gridData,
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  defaultCols,
  canCreate,
  canEdit,
  canView,
  canSearch,
  canDelete,
  loadingBarRef,
  controllers,
  customLimits
}) {
  const { t } = useTranslation()
  const { setPageData, setStatusMessage } = usePageData() || {}
  const userFrom = JSON.parse(localStorage.getItem('userInfo') || '{}')

  const {
    groupCode,
    setGroupCode,
    groupName,
    setGroupName,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  } = useSysAttrGroupFilter(setStatusMessage)

  const { pageInfo, executeSearch, onVisibleRegionChanged } = useSysAttrGroupFetch({
    buildSearchParams,
    setGridData,
    setNumRows,
    resetTable,
    defaultCols,
    canCreate,
    loadingBarRef,
    controllers,
    setPageData,
    setStatusMessage,
    customLimits
  })

  const {
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    limitModalProps
  } = useSysAttrGroupMutation({
    gridData,
    setGridData,
    setNumRows,
    getSelectedRows,
    resetTable,
    canCreate,
    canEdit,
    canView,
    canSearch,
    canDelete,
    loadingBarRef,
    executeSearch,
    userFrom,
    setStatusMessage,
    customLimits
  })

  useRealtimeTableSync({
    eventTypes: [
      'SYS_ATTR_GROUPS_A',
      'SYS_ATTR_GROUPS_U',
      'SYS_ATTR_GROUPS_D',
      'SYS_ATTR_GROUP_CREATED',
      'SYS_ATTR_GROUP_UPDATED',
      'SYS_ATTR_GROUP_DELETED'
    ],
    setStatusMessage,
    tableName: t('Nhóm Thuộc Tính')
  })

  return {
    groupCode,
    setGroupCode,
    groupName,
    setGroupName,
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
    pageInfo,
    limitModalProps
  }
}
