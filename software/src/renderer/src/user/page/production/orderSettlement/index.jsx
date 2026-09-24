/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'

import OrderSettlementActions from './components/OrderSettlementActions'
import OrderSettlementQuery from './components/OrderSettlementQuery'
import OrderSettlementTable from './components/OrderSettlementTable'
import { useOrderSettlement } from './hooks/useOrderSettlement'

export default function OrderSettlementPage({
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
    menuKey: 'production_order_settlement',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const {
    // Query Filters
    stageOrderNo,
    setStageOrderNo,
    itemCode,
    setItemCode,
    itemName,
    setItemName,
    operationCode,
    setOperationCode,
    status,
    setStatus,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    // Dynamic Grouping
    groupByColumn,
    setGroupByColumn,
    toggleGroup,
    handleExpandAll,
    handleCollapseAll,
    handleToggleGroupingMode,
    // Grid Table State
    gridData,
    setGridData,
    rawFlatData,
    setRawFlatData,
    selection,
    setSelection,
    numRows,
    setNumRows,
    cols,
    setCols,
    defaultCols,
    showSearch,
    setShowSearch,
    selectedRow,
    // Actions
    handleSearch,
    handleSave,
    handleApprove,
    handleCloseOrder,
    handleExportExcel,
    handlePrint,
    handleDelete,
    handleReload
  } = useOrderSettlement({
    canCreate: pagePerms.canCreate,
    canEdit: pagePerms.canEdit,
    canDelete: pagePerms.canDelete,
    canView: pagePerms.canView,
    canSearch: pagePerms.canSearch,
    loadingBarRef,
    controllers,
    customLimits: customLimits || restProps?.audLimits
  })

  // Phím tắt chuẩn ERP Desktop
  usePageHotkeys({
    onSearch: handleSearch,
    onSave: handleSave,
    onDelete: handleDelete
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
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <OrderSettlementActions
          handleSearch={handleSearch}
          handleSave={handleSave}
          handleApprove={handleApprove}
          handleExportExcel={handleExportExcel}
          handlePrint={handlePrint}
          handleDelete={handleDelete}
          handleReload={handleReload}
          permissions={pagePerms}
        />
      }
      query={
        <OrderSettlementQuery
          stageOrderNo={stageOrderNo}
          setStageOrderNo={setStageOrderNo}
          itemCode={itemCode}
          setItemCode={setItemCode}
          itemName={itemName}
          setItemName={setItemName}
          operationCode={operationCode}
          setOperationCode={setOperationCode}
          status={status}
          setStatus={setStatus}
          handleSearch={handleSearch}
          disabled={!pagePerms.canView}
          dynamicQueryFields={dynamicQueryFields}
          onAddQueryField={handleAddQueryField}
          onRemoveQueryField={handleRemoveQueryField}
          onResetQuery={handleResetQuery}
        />
      }
      table={
        <OrderSettlementTable
          gridData={gridData}
          setGridData={setGridData}
          rawFlatData={rawFlatData}
          setRawFlatData={setRawFlatData}
          selection={selection}
          setSelection={setSelection}
          numRows={numRows}
          setNumRows={setNumRows}
          cols={cols}
          setCols={setCols}
          defaultCols={defaultCols}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          canEdit={pagePerms.canEdit}
          canCreate={pagePerms.canCreate}
          groupByColumn={groupByColumn}
          setGroupByColumn={setGroupByColumn}
          toggleGroup={toggleGroup}
          handleExpandAll={handleExpandAll}
          handleCollapseAll={handleCollapseAll}
          handleApprove={handleApprove}
          onAddQueryField={handleAddQueryField}
        />
      }
    />
  )
}
