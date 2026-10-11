/* eslint-disable react/prop-types, no-unused-vars */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
import ExportExcelModal from '@renderer/user/components/modal/ExportExcelModal'
import SystemConfirmModal from '@renderer/user/components/modal/SystemConfirmModal'
import CalculationProgressOverlay from '../calcProduction/components/CalculationProgressOverlay'
import { FileSpreadsheet } from 'lucide-react'
import { CALC_MASTER_COLUMNS } from './columns/calcMasterColumns'
import CalcMasterQueryActions from './components/CalcMasterQueryActions'
import CalcMasterQueryFilters from './components/CalcMasterQueryFilters'
import CalcMasterQueryTable from './components/CalcMasterQueryTable'
import { useCalcMasterQueryLogic } from './hooks/useCalcMasterQueryLogic'

export default function CalcProductionQueryPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  ...restProps
}) {
  const { t } = useTranslation()
  const { setStatusMessage, setPageData, setSelectionStats } = usePageData() || {}
  const loadingBarRef = useRef(null)

  const {
    filters,
    handleFilterChange,
    handleResetFilters,
    fetchMasterList,
    handleNavigateToDetail,
    handleOpenCalcProduction,
    handleDeleteMaster,
    handleExportDataKhsx,
    executeExportDataKhsx,
    isExportModalOpen,
    setIsExportModalOpen,
    targetExportRegCode,
    isExportProgressOpen,
    setIsExportProgressOpen,
    exportProgressInfo,
    setExportProgressInfo,
    queriedRows,
    selectedRegCode,
    setSelectedRegCode,
    isLoading,
    isSyncing,
    deleteModalState,
    setDeleteModalState,
    handleConfirmDelete,
    isMySelectedRecord
  } = useCalcMasterQueryLogic({ setStatusMessage })

  // ── Grid State ──
  const [gridData, setGridData] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [cols, setCols] = useState(CALC_MASTER_COLUMNS)

  // Cập nhật khi kết quả danh sách Master thay đổi
  useEffect(() => {
    setGridData(queriedRows)
    setCols(CALC_MASTER_COLUMNS)
    setSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty()
    })

    setPageData?.((prev) => ({
      ...prev,
      total: queriedRows.length,
      totalAll: queriedRows.length,
      loadedCount: queriedRows.length,
      totalColumns: CALC_MASTER_COLUMNS.length,
      page: 1,
      pageSize: queriedRows.length,
      totalPages: 1,
      rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
    }))
  }, [queriedRows, setPageData])

  // Lắng nghe khi chọn dòng trên bảng
  useEffect(() => {
    if (selection?.current?.cell) {
      const rowIndex = selection.current.cell[1]
      const rowItem = gridData[rowIndex]
      if (rowItem?.regCode) {
        setSelectedRegCode(rowItem.regCode)
      }
    } else if (selection?.rows && selection.rows.toArray().length > 0) {
      const rowIndex = selection.rows.toArray()[0]
      const rowItem = gridData[rowIndex]
      if (rowItem?.regCode) {
        setSelectedRegCode(rowItem.regCode)
      }
    }
  }, [selection, gridData, setSelectedRegCode])

  // Cleanup selection stats khi unmount
  useEffect(() => {
    return () => {
      setSelectionStats?.(null)
    }
  }, [setSelectionStats])

  // Thống kê vùng chọn bôi đen (SUM / AVG / COUNT)
  const lastSelectionJsonRef = useRef('')
  useEffect(() => {
    if (!setSelectionStats) return

    const hasRows = selection?.rows && selection.rows.toArray().length > 0
    const hasRange = Boolean(selection?.current?.range)
    const hasCell = Boolean(selection?.current?.cell)

    if (!hasRows && !hasRange && !hasCell) {
      if (lastSelectionJsonRef.current !== 'empty') {
        lastSelectionJsonRef.current = 'empty'
        setSelectionStats(null)
      }
      return
    }

    const selKey = JSON.stringify({
      rows: selection?.rows?.toArray() || [],
      range: selection?.current?.range || null,
      cell: selection?.current?.cell || null
    })

    if (lastSelectionJsonRef.current === selKey) return
    lastSelectionJsonRef.current = selKey

    const frameId = requestAnimationFrame(() => {
      const stats = calculateSelectionStats(selection, gridData, cols)
      setSelectionStats(stats)
    })

    return () => cancelAnimationFrame(frameId)
  }, [selection, gridData, cols, setSelectionStats])

  // Xuất file Excel danh sách Master
  const handleExportExcel = useCallback(() => {
    if (gridData.length === 0) {
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({ type: 'warning', text: t('Không có dữ liệu để xuất Excel') })
      }
      return
    }

    try {
      const exportData = gridData.map((r) => ({
        'Trạng thái': r.status,
        'Mã đăng ký': r.regCode,
        'Nhà máy': r.factoryName,
        'Ngày đăng ký': r.applyDate,
        'Phiên bản': r.version || '1.0',
        'Tổng số dòng': r.totalRows,
        'Dung lượng gốc (MB)': r.rawSizeMB || 0,
        'Dung lượng nén (MB)': r.compressedSizeMB || 0,
        'Tỷ lệ nén (%)': r.compressionRatio || '',
        'Thống kê SX (Dòng)': r.statReportRows,
        'Lệnh TT chưa xong (Dòng)': r.unfinishedOpRows,
        'Tổng hợp lệnh TT (Dòng)': r.summaryOpRows,
        'Duyệt SL MES (Dòng)': r.mesApprovalRows,
        'Kết quả TKSX (Dòng)': r.resultTksxRows || r.fileSummaries?.result_tksx?.rowCount || 0,
        'Kết quả KHSX (Dòng)': r.resultKhsxRows || r.fileSummaries?.result_khsx?.rowCount || 0,
        'Thời gian tạo': r.registeredAt,
        'Người tạo': r.registeredBy || 'Admin',
        'Ghi chú': r.remark
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'DanhSachMaster')
      const fileName = `Master_KHSX_TKSX_${new Date().getTime()}.xlsx`
      XLSX.writeFile(wb, fileName)

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'success',
          text: t('Đã xuất thành công file: {{name}}', { name: fileName })
        })
      }
    } catch (err) {
      console.error('Lỗi xuất Excel:', err)
      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'error',
          text: t('Lỗi xuất Excel: {{msg}}', { msg: err.message })
        })
      }
    }
  }, [gridData, setStatusMessage, t])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <CalcMasterQueryActions
            onQuery={fetchMasterList}
            onOpenCalcProduction={handleOpenCalcProduction}
            onViewDetail={() => handleNavigateToDetail()}
            onExportDataKhsx={() => handleExportDataKhsx()}
            onDeleteSelected={() => handleDeleteMaster()}
            isLoading={isLoading}
            isSyncing={isSyncing}
            hasSelection={Boolean(selectedRegCode)}
            isMyRecord={isMySelectedRecord}
          />
        }
        query={
          <CalcMasterQueryFilters
            filters={filters}
            onChangeFilter={handleFilterChange}
            onEnterQuery={fetchMasterList}
            onResetFilters={handleResetFilters}
          />
        }
        queryTitle={t('Bộ Lọc & Tiêu Chí Truy Vấn Phiếu Đăng Ký Master')}
        defaultOpenQuery={true}
        table={
          <CalcMasterQueryTable
            tableTitle={`${t('Danh sách phiếu đăng ký')} (${(gridData.length || 0).toLocaleString('vi-VN')} phiếu)`}
            cols={cols}
            setCols={setCols}
            defaultCols={CALC_MASTER_COLUMNS}
            gridData={gridData}
            setGridData={setGridData}
            numRows={gridData.length}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            onRowDoubleClick={(row) => handleNavigateToDetail(row.regCode)}
          />
        }
      />

      {/* Modal Cấu hình & Chọn đường dẫn xuất Excel chuẩn ERP */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`Xuất Toàn Bộ Dữ Liệu KHSX (${targetExportRegCode || selectedRegCode})`}
        reportName={`DATA_KHSX_${targetExportRegCode || selectedRegCode || 'EXPORT'}`}
        totalRows={6}
        loadedCount={6}
        selectedCount={1}
        defaultFileName={`DATA_KHSX_${targetExportRegCode || selectedRegCode || 'ALL'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
        onConfirmExport={executeExportDataKhsx}
      />

      {/* Modal Hiển thị Tiến trình Xuất 6 Bảng & Đồng Hồ Đếm Thời Gian Chạy Thực Tế */}
      <CalculationProgressOverlay
        isCalculating={isExportProgressOpen}
        progressInfo={exportProgressInfo}
        title="TIẾN TRÌNH XUẤT DỮ LIỆU EXCEL KHSX (6 BẢNG)"
        icon={FileSpreadsheet}
        steps={[
          '1. Nạp gói dữ liệu',
          '2. Tổng hợp 6 Bảng',
          '3. Định dạng Header',
          '4. Xuất file hoàn tất'
        ]}
        subMessage="Đang tổng hợp trọn bộ 6 bảng dữ liệu KHSX với tiêu đề tiếng Việt chuẩn ERP."
        onClose={() => setIsExportProgressOpen(false)}
      />

      {/* Modal Xác nhận Xóa Phiếu (Của mình) / Xóa Cache (Người khác) */}
      <SystemConfirmModal
        isOpen={deleteModalState.isOpen}
        title={
          deleteModalState.isMyRecord
            ? t('Xác nhận xóa dữ liệu cục bộ của phiếu')
            : t('Xác nhận xóa bộ nhớ đệm (Cache) trên máy')
        }
        type={deleteModalState.isMyRecord ? 'delete' : 'warning'}
        confirmVariant={deleteModalState.isMyRecord ? 'danger' : 'primary'}
        confirmText={
          deleteModalState.isMyRecord ? t('Xác nhận xóa dữ liệu') : t('Xóa cache trên máy')
        }
        cancelText={t('Hủy bỏ')}
        message={
          deleteModalState.isMyRecord
            ? t(
                'Bạn có chắc chắn muốn xóa dữ liệu làm việc của phiếu [{{code}}] trên máy tính này không?',
                {
                  code: deleteModalState.regCode
                }
              )
            : t(
                'Phiếu [{{code}}] do [{{creator}}] tạo. Bạn không thể xóa phiếu của người khác trên hệ thống.',
                {
                  code: deleteModalState.regCode,
                  creator: deleteModalState.creatorName
                }
              )
        }
        subMessage={
          deleteModalState.isMyRecord
            ? t(
                'Lưu ý: Toàn bộ dữ liệu 6 bảng và kết quả tính toán cục bộ sẽ được dọn dẹp sạch sẽ. Bản nén (.gsprod) đã công bố trên Server DataHub vẫn được giữ lại an toàn.'
              )
            : t(
                'Bạn có muốn xóa dữ liệu bộ nhớ đệm (cache) đã tải về trên máy tính này để giải phóng dung lượng bộ nhớ không? (Bản ghi của người tạo trên Server sẽ KHÔNG bị ảnh hưởng).'
              )
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
