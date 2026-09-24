import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { usePermFieldFilter } from './usePermFieldFilter'
import { usePermFieldFetch } from './usePermFieldFetch'
import { usePermFieldMutation } from './usePermFieldMutation'

export function usePermField({
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
    buildSearchParams
  } = usePermFieldFilter(setStatusMessage)

  const { pageInfo, executeSearch, onVisibleRegionChanged } = usePermFieldFetch({
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
  } = usePermFieldMutation({
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
      'PERM_FIELDS_A',
      'PERM_FIELDS_U',
      'PERM_FIELDS_D',
      'PERM_FIELDS_CREATED',
      'PERM_FIELDS_UPDATED',
      'PERM_FIELDS_DELETED'
    ],
    setStatusMessage,
    tableName: t('Trường Phân Quyền')
  })

  return {
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
