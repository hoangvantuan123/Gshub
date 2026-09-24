import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { useLangSysFilter } from './useLangSysFilter'
import { useLangSysFetch } from './useLangSysFetch'
import { useLangSysMutation } from './useLangSysMutation'

export function useLangSys({
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
    languageName,
    setLanguageName,
    languageCode,
    setLanguageCode,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  } = useLangSysFilter(setStatusMessage)

  const { pageInfo, executeSearch, onVisibleRegionChanged } = useLangSysFetch({
    buildSearchParams,
    setGridData,
    setNumRows,
    resetTable,
    defaultCols,
    canCreate,
    canView,
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
  } = useLangSysMutation({
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
    eventTypes: ['LANG_CREATED', 'LANG_UPDATED', 'LANG_DELETED'],
    setStatusMessage,
    tableName: t('Ngôn ngữ')
  })

  return {
    languageName,
    setLanguageName,
    languageCode,
    setLanguageCode,
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
