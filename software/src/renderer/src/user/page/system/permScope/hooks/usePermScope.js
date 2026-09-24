import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { usePermScopeFilter } from './usePermScopeFilter'
import { usePermScopeFetch } from './usePermScopeFetch'
import { usePermScopeMutation } from './usePermScopeMutation'

export function usePermScope({
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
    buildSearchParams
  } = usePermScopeFilter(setStatusMessage)

  const { pageInfo, executeSearch, onVisibleRegionChanged } = usePermScopeFetch({
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
  } = usePermScopeMutation({
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
      'PERM_SCOPES_A',
      'PERM_SCOPES_U',
      'PERM_SCOPES_D',
      'PERM_SCOPES_CREATED',
      'PERM_SCOPES_UPDATED',
      'PERM_SCOPES_DELETED'
    ],
    setStatusMessage,
    tableName: t('Phạm Vi Quyền Hạn')
  })

  return {
    scopeCode,
    setScopeCode,
    scopeName,
    setScopeName,
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
