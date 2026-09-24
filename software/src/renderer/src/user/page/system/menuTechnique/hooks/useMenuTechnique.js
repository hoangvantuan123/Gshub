import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { useMenuTechniqueFilter } from './useMenuTechniqueFilter'
import { useMenuTechniqueFetch } from './useMenuTechniqueFetch'
import { useMenuTechniqueMutation } from './useMenuTechniqueMutation'

export function useMenuTechnique({
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
    label,
    setLabel,
    keyMenu,
    setKeyMenu,
    type,
    setType,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  } = useMenuTechniqueFilter(setStatusMessage)

  const { pageInfo, executeSearch, onVisibleRegionChanged } = useMenuTechniqueFetch({
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
  } = useMenuTechniqueMutation({
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
    eventTypes: ['MENU_CREATED', 'MENU_UPDATED', 'MENU_DELETED'],
    setStatusMessage,
    tableName: t('Menu Hệ thống')
  })

  return {
    label,
    setLabel,
    keyMenu,
    setKeyMenu,
    type,
    setType,
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
