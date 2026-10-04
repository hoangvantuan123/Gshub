/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { notification, message } from 'antd'
import { useTranslation } from 'react-i18next'

import { useDataGridSheet } from '../../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../hooks/usePagePermissions'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../../components/modal/WindowsConfirmModal'
import ExportExcelModal from '../../../../components/modal/ExportExcelModal'

import { useProductionStatisticsColumns } from './columns/productionStatisticsColumns'
import { useProductionStatistics } from './hooks/useProductionStatistics'
import ProductionStatisticsActions from './components/ProductionStatisticsActions'
import ProductionStatisticsQuery from './components/ProductionStatisticsQuery'
import ProductionStatisticsTable from './components/ProductionStatisticsTable'

export default function ProductionStatisticsView({
  plantKey = 'hanoi_gs1',
  plantName = 'GS1 Hà Nội',
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
    menuKey: plantKey === 'quevo_gs5' ? 'report_quevo_gs5_stat' : 'report_hanoi_gs1_stat',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const defaultCols = useProductionStatisticsColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })

  const {
    gridData,
    setGridData,
    setNumRows,
    numRows,
    resetTable,
    getSelectedRows,
    tableProps,
    setCols,
    cols
  } = useDataGridSheet({
    storageKey: `cols_prod_stats_${plantKey}`,
    defaultCols,
    canCreate: pagePerms.canCreate,
    canView: pagePerms.canView
  })

  const {
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    handleExportExcel,
    isExportModalOpen,
    setIsExportModalOpen,
    executeExportStatExcel,
    handlePrint,
    handleOpenPublicLink,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch,
    metrics
  } = useProductionStatistics({
    plantKey,
    gridData,
    setGridData,
    setNumRows,
    getSelectedRows,
    resetTable,
    canCreate: pagePerms.canCreate,
    canEdit: pagePerms.canEdit,
    canView: pagePerms.canView,
    canSearch: pagePerms.canSearch,
    canDelete: pagePerms.canDelete,
    loadingBarRef,
    controllers
  })

  usePageHotkeys({
    onSearch: handleSearchData,
    onSave: handleSaveData,
    onDelete: handleDeleteDataSheet
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
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <ProductionStatisticsActions
            handleSearchData={handleSearchData}
            handleSaveData={handleSaveData}
            handleDeleteDataSheet={handleDeleteDataSheet}
            handleExportExcel={handleExportExcel}
            handlePrint={handlePrint}
            handleOpenPublicLink={handleOpenPublicLink}
            permissions={pagePerms}
          />
        }
        query={
          <ProductionStatisticsQuery
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            dynamicQueryFields={dynamicQueryFields}
            onAddQueryField={handleAddQueryField}
            onRemoveQueryField={handleRemoveQueryField}
            onResetQuery={handleResetQuery}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <ProductionStatisticsTable
            {...tableProps}
            tableTitle={t(`Báo cáo Thống kê sản xuất - ${plantName}`)}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            defaultCols={defaultCols}
            cols={cols}
            setCols={setCols}
            gridData={gridData}
            setGridData={setGridData}
            numRows={numRows}
            setNumRows={setNumRows}
            onAddQueryField={handleAddQueryField}
          />
        }
      />

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={executeExportStatExcel}
        defaultFileName={`BaoCao_ThongKe_SX_${plantKey}_${new Date().toISOString().slice(0, 10)}`}
        totalRows={gridData.length}
        selectedCount={getSelectedRows().length}
        columns={cols}
      />

      <WindowsConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmSearch}
        onCancel={handleCancelSearch}
        title={t('Xác nhận dữ liệu chưa lưu')}
        message={t('Dữ liệu trên bảng đã được chỉnh sửa nhưng chưa được lưu!')}
        subMessage={t(
          'Nếu tiếp tục truy vấn, tất cả các thay đổi chưa lưu trên bảng sẽ bị hủy bỏ và tải lại từ máy chủ. Bạn có muốn tiếp tục?'
        )}
        confirmText={t('Tiếp tục truy vấn')}
        cancelText={t('Quay lại')}
        type="warning"
      />
    </>
  )
}
