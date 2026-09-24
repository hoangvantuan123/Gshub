import { useTranslation } from 'react-i18next'
import { usePageData } from '../../../../../context/PageDataContext'
import { useRealtimeTableSync } from '../../../../hooks/useRealtimeTableSync'

import { useSysAttrValueFilter } from './useSysAttrValueFilter'
import { useSysAttrValueFetch } from './useSysAttrValueFetch'
import { useSysAttrValueMutation } from './useSysAttrValueMutation'

export function useSysAttrValue({
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
    buildSearchParams
  } = useSysAttrValueFilter(setStatusMessage)

  const { groupHelpColumns, pageInfo, executeSearch, onVisibleRegionChanged } =
    useSysAttrValueFetch({
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
  } = useSysAttrValueMutation({
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
      'SYS_ATTR_ITEMS_A',
      'SYS_ATTR_ITEMS_U',
      'SYS_ATTR_ITEMS_D',
      'SYS_ATTR_ITEM_CREATED',
      'SYS_ATTR_ITEM_UPDATED',
      'SYS_ATTR_ITEM_DELETED'
    ],
    setStatusMessage,
    tableName: t('Giá Trị Thuộc Tính')
  })

  return {
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
    pageInfo,
    limitModalProps
  }
}
