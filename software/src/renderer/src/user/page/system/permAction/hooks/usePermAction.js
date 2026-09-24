import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { usePermActionFilter } from './usePermActionFilter'
import { usePermActionFetch } from './usePermActionFetch'
import { usePermActionMutation } from './usePermActionMutation'

export function usePermAction({
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
    buildSearchParams
  } = usePermActionFilter(setStatusMessage)

  const { pageInfo, executeSearch, onVisibleRegionChanged } = usePermActionFetch({
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
  } = usePermActionMutation({
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
      'PERM_ACTIONS_A',
      'PERM_ACTIONS_U',
      'PERM_ACTIONS_D',
      'PERM_ACTION_CREATED',
      'PERM_ACTION_UPDATED',
      'PERM_ACTION_DELETED'
    ],
    setStatusMessage,
    tableName: t('Hành Động Quyền Hạn')
  })

  return {
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
