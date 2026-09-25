/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'

import WorkProcessActions from './components/WorkProcessActions'
import WorkProcessQuery from './components/WorkProcessQuery'
import WorkProcessTable from './components/WorkProcessTable'
import { useWorkProcess } from './hooks/useWorkProcess'

export default function WorkProcessPage({
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
    menuKey: 'production_work_process',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const {
    // Query Filters & Search Values
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    // Master Table State
    masterList,
    setMasterList,
    masterCols,
    setMasterCols,
    defaultMasterCols,
    masterSelection,
    setMasterSelection,
    selectedMasterIndex,
    setSelectedMasterIndex,
    selectedMasterRow,
    // Step Table State
    currentStepData,
    stepCols,
    setStepCols,
    defaultStepCols,
    stepSelection,
    setStepSelection,
    loadingSteps,
    // Actions
    showSearch,
    setShowSearch,
    handleSearch,
    handleExportExcel,
    handleReload
  } = useWorkProcess({
    loadingBarRef
  })

  // Phím tắt chuẩn ERP Desktop (F2 / F8 tra cứu, F10 lưu)
  usePageHotkeys({
    onSearch: handleSearch,
    onSave: () => {},
    onDelete: () => {}
  })

  const cancelAllRequestsRef = useRef(cancelAllRequests)
  cancelAllRequestsRef.current = cancelAllRequests

  useEffect(() => {
    return () => {
      cancelAllRequestsRef.current?.()
    }
  }, [])

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <WorkProcessActions
          handleSearch={handleSearch}
          handleExportExcel={handleExportExcel}
          handleReload={handleReload}
          permissions={pagePerms}
        />
      }
      query={
        <WorkProcessQuery
          searchValues={searchValues}
          setSearchValues={setSearchValues}
          handleSearch={handleSearch}
          disabled={!pagePerms.canView}
          dynamicQueryFields={dynamicQueryFields}
          onAddQueryField={handleAddQueryField}
          onRemoveQueryField={handleRemoveQueryField}
          onResetQuery={handleResetQuery}
        />
      }
      table={
        <WorkProcessTable
          masterList={masterList}
          setMasterList={setMasterList}
          masterCols={masterCols}
          setMasterCols={setMasterCols}
          defaultMasterCols={defaultMasterCols}
          masterSelection={masterSelection}
          setMasterSelection={setMasterSelection}
          selectedMasterRow={selectedMasterRow}
          currentStepData={currentStepData}
          stepCols={stepCols}
          setStepCols={setStepCols}
          defaultStepCols={defaultStepCols}
          stepSelection={stepSelection}
          setStepSelection={setStepSelection}
          loadingSteps={loadingSteps}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          canEdit={pagePerms.canEdit}
          canCreate={pagePerms.canCreate}
          onAddQueryField={handleAddQueryField}
        />
      }
    />
  )
}
