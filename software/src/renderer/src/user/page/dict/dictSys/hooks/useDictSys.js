import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { useDictSysFilter } from './useDictSysFilter'
import { useDictSysFetch } from './useDictSysFetch'
import { useDictSysMutation } from './useDictSysMutation'

export function useDictSys({
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
    languageSeq,
    setLanguageSeq,
    word,
    setWord,
    wordSeq,
    setWordSeq,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  } = useDictSysFilter(setStatusMessage)

  const { languages, pageInfo, executeSearch, onVisibleRegionChanged } = useDictSysFetch({
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
  } = useDictSysMutation({
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
    customLimits,
    currentLanguageSeq: languageSeq
  })

  useRealtimeTableSync({
    eventTypes: ['DICT_CREATED', 'DICT_UPDATED', 'DICT_DELETED'],
    setStatusMessage,
    tableName: t('Từ điển')
  })

  return {
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
    pageInfo,
    limitModalProps
  }
}
