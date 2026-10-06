/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import DataPageContainer from '@renderer/user/components/layout/DataPageContainer'
import { usePageData } from '@renderer/context/PageDataContext'
import { calculateSelectionStats } from '@renderer/user/hooks/useDataGridSheet'
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
    handleDeleteMaster,
    queriedRows,
    selectedRegCode,
    setSelectedRegCode,
    isLoading
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
        'Mã đăng ký': r.regCode,
        'Nhà máy': r.factoryName,
        'Ngày đăng ký': r.applyDate,
        'Trạng thái': r.status,
        'Tổng số dòng': r.totalRows,
        'Thống kê SX (Dòng)': r.statReportRows,
        'Lệnh TT chưa xong (Dòng)': r.unfinishedOpRows,
        'Tổng hợp lệnh TT (Dòng)': r.summaryOpRows,
        'Duyệt SL MES (Dòng)': r.mesApprovalRows,
        'Thời gian tạo': r.registeredAt,
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
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <CalcMasterQueryActions
          onQuery={fetchMasterList}
          onViewDetail={() => handleNavigateToDetail()}
          onDeleteSelected={() => handleDeleteMaster()}
          onResetFilters={handleResetFilters}
          onExportExcel={handleExportExcel}
          onOpenSearch={() => setShowSearch(true)}
          isLoading={isLoading}
          hasSelection={Boolean(selectedRegCode)}
          totalRows={gridData.length}
        />
      }
      query={
        <CalcMasterQueryFilters
          filters={filters}
          onChangeFilter={handleFilterChange}
          onEnterQuery={fetchMasterList}
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
  )
}
