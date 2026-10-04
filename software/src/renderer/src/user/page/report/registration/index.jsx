/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import { usePageHotkeys } from '../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { usePageData } from '../../../../context/PageDataContext'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../components/modal/WindowsConfirmModal'
import ExportExcelModal from '../../../components/modal/ExportExcelModal'
import {
  generateExcelWorkbook,
  saveWorkbookToFile,
  formatFilterSummary
} from '../../../../utils/exportExcelUtils'
import { openChildWindow } from '../../../../utils/openChildWindow'

import { useProductionPlanColumns } from './columns/productionPlanColumns'
import PlanRegistrationTable from './components/PlanRegistrationTable'
import PlanRegistrationActions from './components/PlanRegistrationActions'
import PlanRegistrationQuery from './components/PlanRegistrationQuery'
import AddPlanRegistrationModal from './components/AddPlanRegistrationModal'
import { calculateSelectionStats } from '../../../hooks/useDataGridSheet'
import {
  queryPlanMaster,
  savePlanRegistration,
  deletePlanMaster
} from './services/planRegistrationService'

export default function DailyPlanRegistrationPage({
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
  const { formatDate, formatDateTime } = useDateFormat()
  const { setStatusMessage, setPageData, setSelectionStats } = usePageData() || {}
  const loadingBarRef = useRef(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_data_import',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // ── Master Registration Grid State ──
  const [masterGridData, setMasterGridData] = useState([])
  const [masterNumRows, setMasterNumRows] = useState(0)
  const [masterShowSearch, setMasterShowSearch] = useState(false)
  const [masterSelection, setMasterSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  // Helper lấy danh sách index dòng đang chọn (hỗ trợ cả click đầu dòng, click ô hoặc quét vùng)
  const getSelectedRows = useCallback(() => {
    if (masterSelection?.rows && masterSelection.rows.toArray().length > 0) {
      return masterSelection.rows.toArray()
    }
    if (masterSelection?.current?.cell) {
      return [masterSelection.current.cell[1]]
    }
    if (masterSelection?.current?.range) {
      const { y, height } = masterSelection.current.range
      const rows = []
      for (let i = 0; i < height; i++) {
        rows.push(y + i)
      }
      return rows
    }
    return []
  }, [masterSelection])

  const masterDefaultCols = useProductionPlanColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })
  const [masterCols, setMasterCols] = useState(masterDefaultCols)

  // Search Filter State
  const [searchValues, setSearchValues] = useState({
    FactoryName: '',
    ReportType: '',
    RegCode: '',
    ApplyDate: '',
    Status: ''
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const originalDataRef = useRef([])

  // Modal xác nhận xóa
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    subMessage: '',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy bỏ',
    confirmVariant: 'danger',
    onConfirm: () => {}
  })

  // ── 1. Tải danh sách Master đăng ký báo cáo từ Database ──
  const fetchMasterData = useCallback(
    async (filters = {}) => {
      loadingBarRef?.current?.continuousStart?.()
      try {
        const res = await queryPlanMaster(filters)
        const dataList = res?.data || []
        const pageInfo = res?.pageInfo || res?.raw?.pageInfo || {}
        const total = Number(pageInfo?.total ?? pageInfo?.totalRows ?? dataList.length)
        const totalAll = Number(pageInfo?.totalAll || total)

        setMasterGridData(dataList)
        setMasterNumRows(dataList.length)
        originalDataRef.current = dataList

        const aCount = dataList.filter((r) => r.WorkingTag === 'A').length
        const uCount = dataList.filter((r) => r.WorkingTag === 'U').length
        const dCount = dataList.filter((r) => r.WorkingTag === 'D').length

        setPageData?.((prev) => ({
          ...prev,
          total,
          totalAll,
          loadedCount: dataList.length,
          totalColumns: masterCols.length,
          page: pageInfo?.page || 1,
          pageSize: pageInfo?.pageSize || dataList.length,
          totalPages: pageInfo?.totalPages || 1,
          rowStatusCounts: { aCount, uCount, dCount, eCount: 0 }
        }))

        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'success',
            text: t('Đã tải thành công {{loaded}} / {{total}} đợt đăng ký báo cáo', {
              loaded: dataList.length.toLocaleString('vi-VN'),
              total: total.toLocaleString('vi-VN')
            })
          })
        }

        return dataList
      } catch (err) {
        setMasterGridData([])
        setMasterNumRows(0)
        originalDataRef.current = []
        setPageData?.((prev) => ({
          ...prev,
          total: 0,
          totalAll: 0,
          loadedCount: 0,
          rowStatusCounts: { aCount: 0, uCount: 0, dCount: 0, eCount: 0 }
        }))
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'error',
            text: t('Lỗi nạp danh sách đăng ký báo cáo từ máy chủ!')
          })
        }
        return []
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [loadingBarRef, masterCols.length, setPageData, setStatusMessage, t]
  )

  // Tự động tính toán chỉ số thống kê kiểu Excel khi bôi đen / chọn ô trên bảng Master
  const statsRafRef = useRef(null)
  useEffect(() => {
    if (!setSelectionStats) return

    if (statsRafRef.current) {
      cancelAnimationFrame(statsRafRef.current)
    }

    statsRafRef.current = requestAnimationFrame(() => {
      const stats = calculateSelectionStats(masterSelection, masterGridData, masterCols)
      setSelectionStats(stats)
    })

    return () => {
      if (statsRafRef.current) {
        cancelAnimationFrame(statsRafRef.current)
      }
    }
  }, [masterSelection, masterGridData, masterCols, setSelectionStats])

  // Cập nhật thông tin Người tạo / Ngày tạo / Người sửa / Ngày sửa của dòng đang chọn xuống StatusBar
  useEffect(() => {
    const selectedRows = getSelectedRows()
    if (selectedRows.length > 0 && masterGridData.length > 0) {
      const firstRowIdx = selectedRows[0]
      const rowItem = masterGridData[firstRowIdx]
      if (rowItem) {
        setPageData?.((prev) => ({
          ...prev,
          createdBy: rowItem.CreatedByName || rowItem.CreatedBy || '',
          createdAt: rowItem.CreatedAt ? formatDateTime(rowItem.CreatedAt) : '',
          updatedBy: rowItem.UpdatedByName || rowItem.UpdatedBy || '',
          updatedAt: rowItem.UpdatedAt ? formatDateTime(rowItem.UpdatedAt) : ''
        }))
      }
    }
  }, [masterSelection, masterGridData, getSelectedRows, formatDateTime, setPageData])

  // Dọn dẹp thống kê khi unmount
  useEffect(() => {
    return () => {
      setSelectionStats && setSelectionStats(null)
    }
  }, [setSelectionStats])

  // Đồng bộ số lượng cột và số dòng hiển thị vào PageData
  useEffect(() => {
    setPageData?.((prev) => ({
      ...prev,
      totalColumns: masterCols.length,
      loadedCount: masterGridData.length
    }))
  }, [masterCols.length, masterGridData.length, setPageData])

  // Khởi tạo truy vấn danh sách Master khi load trang (chỉ 1 lần khi mount)
  useEffect(() => {
    fetchMasterData({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Xử lý Tìm kiếm Master ──
  const handleSearchData = useCallback(async () => {
    const dataList = await fetchMasterData(searchValues)
    if (dataList.length > 0) {
      setStatusMessage?.({
        type: 'success',
        text: `Tìm thấy ${dataList.length.toLocaleString('vi-VN')} đợt đăng ký báo cáo từ hệ thống`
      })
    } else {
      setStatusMessage?.({
        type: 'info',
        text: 'Không tìm thấy đợt đăng ký báo cáo phù hợp'
      })
    }
  }, [fetchMasterData, searchValues, setStatusMessage])

  // ── 3. Reset điều kiện tìm kiếm ──
  const onResetQuery = useCallback(() => {
    const emptyFilters = {
      FactoryName: '',
      ReportType: '',
      RegCode: '',
      ApplyDate: '',
      Status: ''
    }
    setSearchValues(emptyFilters)
    fetchMasterData({})
    setStatusMessage?.({
      type: 'info',
      text: 'Đã đặt lại điều kiện và tải lại danh sách đăng ký'
    })
  }, [fetchMasterData, setStatusMessage])

  const onAddQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => {
      if (prev.includes(fieldKey)) return prev
      return [...prev, fieldKey]
    })
  }, [])

  const onRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((k) => k !== fieldKey))
  }, [])

  // ── 4. Xử lý Lưu đăng ký mới từ Modal (Master + Chi tiết) ──
  const handleSaveRegistration = async (regData, onProgress = null) => {
    try {
      loadingBarRef?.current?.continuousStart?.()
      const res = await savePlanRegistration(regData, null, onProgress)
      loadingBarRef?.current?.complete?.()

      const savedMaster = res?.data || {}
      const finalCode = savedMaster?.RegCode || regData.regCode

      setStatusMessage?.({
        type: 'success',
        text: `Đã lưu thành công đăng ký báo cáo (${finalCode}) gồm ${regData.data?.length || 0} dòng chi tiết lên cơ sở dữ liệu!`
      })

      // Tự động load lại danh sách Master để hiển thị đợt đăng ký mới vừa tạo
      await fetchMasterData(searchValues)

      setIsAddModalOpen(false)
      return res
    } catch (err) {
      loadingBarRef?.current?.complete?.()
      setStatusMessage?.({
        type: 'error',
        text: `Lưu đăng ký thất bại: ${err?.message || 'Không thể kết nối đến máy chủ DataHub'}`
      })
      throw err
    }
  }

  // ── 5. Xóa đợt đăng ký Master đã chọn ──
  const handleDeleteData = useCallback(() => {
    if (!pagePerms.canDelete) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Bạn không có quyền xóa đợt đăng ký'
      })
      return
    }

    const selectedRows = getSelectedRows()
    if (selectedRows.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Vui lòng chọn ít nhất một đợt đăng ký trên bảng để xóa'
      })
      return
    }

    const selectedMasters = selectedRows.map((idx) => masterGridData[idx]).filter(Boolean)
    const masterSeqs = selectedMasters
      .map((m) => m.IdSeq || m.MasterSeq || m.RegCode)
      .filter(Boolean)

    if (masterSeqs.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Không tìm thấy ID hợp lệ của các đợt đăng ký đã chọn'
      })
      return
    }

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Xác nhận xóa đợt đăng ký',
      message: `Bạn có chắc chắn muốn xóa ${masterSeqs.length} đợt đăng ký đã chọn?`,
      subMessage:
        'Hành động này sẽ xóa vĩnh viễn đợt đăng ký cùng toàn bộ dữ liệu chi tiết đã nạp tương ứng trong cơ sở dữ liệu.',
      confirmText: 'Đồng ý xóa',
      cancelText: 'Hủy bỏ',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        loadingBarRef?.current?.continuousStart?.()
        try {
          await deletePlanMaster(masterSeqs)
          setStatusMessage?.({
            type: 'success',
            text: `Đã xóa thành công ${masterSeqs.length} đợt đăng ký và dữ liệu chi tiết tương ứng!`
          })
          await fetchMasterData(searchValues)
        } catch (err) {
          setStatusMessage?.({
            type: 'error',
            text: 'Xóa đợt đăng ký thất bại: ' + (err?.message || err)
          })
        } finally {
          loadingBarRef?.current?.complete?.()
        }
      }
    })
  }, [
    pagePerms.canDelete,
    masterSelection,
    masterGridData,
    setStatusMessage,
    fetchMasterData,
    searchValues
  ])

  // ── 6. Mở Modal Xuất danh sách Master ra Excel ──
  const handleOpenExportModal = useCallback(() => {
    if (!masterGridData || masterGridData.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Không có dữ liệu đợt đăng ký để xuất'
      })
      return
    }
    setIsExportModalOpen(true)
  }, [masterGridData, setStatusMessage])

  const executeExportMasterExcel = useCallback(
    async ({
      scope,
      fileName,
      saveDirectory,
      overwriteExisting,
      includeHeaders,
      exportableCols
    }) => {
      try {
        let dataToExport = masterGridData
        if (scope === 'selected') {
          const selectedRows = masterSelection?.rows?.items || []
          if (selectedRows.length > 0) {
            const indices = []
            selectedRows.forEach(([start, end]) => {
              for (let i = start; i < Math.min(masterGridData.length, end); i++) {
                indices.push(i)
              }
            })
            dataToExport = indices.map((idx) => masterGridData[idx]).filter(Boolean)
          } else if (masterSelection?.current?.range) {
            const { y, height } = masterSelection.current.range
            dataToExport = masterGridData.slice(y, Math.min(masterGridData.length, y + height))
          }
        }

        if (dataToExport.length === 0) {
          throw new Error('Không có dòng dữ liệu nào để xuất Excel!')
        }

        const filterSummary = formatFilterSummary(searchValues, formatDate)

        const wb = generateExcelWorkbook({
          data: dataToExport,
          columns: exportableCols || masterCols,
          sheetName: 'DanhSach_DangKy_BaoCao',
          reportTitle: t('DANH SÁCH ĐỢT ĐĂNG KÝ BÁO CÁO SẢN XUẤT (MASTER)'),
          filterInfo: filterSummary,
          includeHeaders: includeHeaders !== false,
          formatDateFn: formatDate
        })

        const saveResult = await saveWorkbookToFile(wb, fileName, saveDirectory, {
          overwriteExisting
        })

        setStatusMessage?.({
          type: 'success',
          text: `Đã xuất thành công ${dataToExport.length.toLocaleString('vi-VN')} dòng dữ liệu ra file [${saveResult?.filePath || fileName}]!`
        })
      } catch (err) {
        console.error('Lỗi khi xuất file Excel:', err)
        setStatusMessage?.({
          type: 'error',
          text: 'Xuất Excel thất bại: ' + (err?.message || err)
        })
        throw err
      }
    },
    [masterGridData, masterSelection, searchValues, formatDate, masterCols, t, setStatusMessage]
  )

  // ── Mở Form Đăng ký / Nạp mới: Electron -> Cửa sổ Windows con độc lập, Web -> Modal / Tab ──
  const handleOpenCreate = useCallback(() => {
    if (window.electron?.openChildWindow || window.electron?.ipcRenderer) {
      openChildWindow({
        path: '/sub/report/registration/create',
        title: 'Đăng ký & Nạp dữ liệu báo cáo sản xuất mới',
        width: 1380,
        height: 880,
        id: 'report-create-new'
      })
    } else {
      // Trên Web browser: mở modal nạp dữ liệu
      setIsAddModalOpen(true)
    }
  }, [])

  // ── Mở cửa sổ Windows mới xem dữ liệu chi tiết của đợt đăng ký đã chọn ──
  const handleOpenDetailWindow = useCallback(
    (targetRow = null) => {
      let selectedItem = targetRow
      if (!selectedItem) {
        const selectedIndices = getSelectedRows()
        if (selectedIndices && selectedIndices.length > 0 && masterGridData[selectedIndices[0]]) {
          selectedItem = masterGridData[selectedIndices[0]]
        } else if (masterGridData.length > 0) {
          selectedItem = masterGridData[0]
        }
      }

      if (!selectedItem || !selectedItem.RegCode) {
        setStatusMessage?.({
          type: 'warning',
          text: 'Vui lòng chọn 1 đợt đăng ký từ bảng để xem chi tiết dữ liệu!'
        })
        return
      }

      // Lưu cache để sub-window mở lên nhận ngay lập tức 0ms
      try {
        sessionStorage.setItem(`master_info_${selectedItem.RegCode}`, JSON.stringify(selectedItem))
        localStorage.setItem(`master_info_${selectedItem.RegCode}`, JSON.stringify(selectedItem))
      } catch {}

      const reportLabel = selectedItem.ReportType === 'statistics' ? 'TKSX' : 'KHSX'
      openChildWindow({
        path: `/sub/report/data/detail/${selectedItem.RegCode}`,
        title: `Chi tiết Đăng ký: ${selectedItem.RegCode} (${reportLabel})`,
        width: 1300,
        height: 850,
        id: `report-detail-${selectedItem.RegCode}`
      })
    },
    [getSelectedRows, masterGridData, setStatusMessage]
  )

  usePageHotkeys({
    onSearch: handleSearchData,
    onDelete: handleDeleteData,
    onOpenNewWindow: handleOpenDetailWindow
  })

  const cancelAllRequestsRef = useRef(cancelAllRequests)
  cancelAllRequestsRef.current = cancelAllRequests

  useEffect(() => {
    return () => {
      cancelAllRequestsRef.current?.()
    }
  }, [])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <PlanRegistrationActions
            handleSearchData={handleSearchData}
            handleDeleteDataSheet={handleDeleteData}
            handleOpenAddModal={handleOpenCreate}
            handleOpenDetailWindow={() => handleOpenDetailWindow()}
            handleExportExcel={handleOpenExportModal}
            permissions={pagePerms}
          />
        }
        query={
          <PlanRegistrationQuery
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            dynamicQueryFields={dynamicQueryFields}
            onAddQueryField={onAddQueryField}
            onRemoveQueryField={onRemoveQueryField}
            onResetQuery={onResetQuery}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <PlanRegistrationTable
            tableTitle={t('Danh sách đợt đăng ký báo cáo sản xuất (Master)')}
            canEdit={pagePerms.canEdit}
            canCreate={pagePerms.canCreate}
            defaultCols={masterDefaultCols}
            cols={masterCols}
            setCols={setMasterCols}
            gridData={masterGridData}
            setGridData={setMasterGridData}
            numRows={masterNumRows}
            setNumRows={setMasterNumRows}
            selection={masterSelection}
            setSelection={setMasterSelection}
            showSearch={masterShowSearch}
            setShowSearch={setMasterShowSearch}
            onAddQueryField={onAddQueryField}
            onOpenDetail={handleOpenDetailWindow}
          />
        }
      />

      {/* Modal nạp file Excel & Đăng ký báo cáo (KHSX / TKSX) */}
      <AddPlanRegistrationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveSuccess={async () => {
          setIsAddModalOpen(false)
          await fetchMasterData(searchValues)
        }}
        onSaveRegistration={handleSaveRegistration}
      />

      {/* Modal xác nhận xuất Excel */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={t('XÁC NHẬN XUẤT EXCEL - DANH SÁCH ĐỢT ĐĂNG KÝ')}
        reportName={t('Danh sách đợt đăng ký báo cáo sản xuất (Master)')}
        totalRows={masterGridData.length}
        loadedCount={masterGridData.length}
        selectedCount={
          masterSelection?.rows?.items?.reduce((acc, [s, e]) => acc + (e - s), 0) ||
          (masterSelection?.current?.range?.height ? masterSelection.current.range.height : 0)
        }
        columns={masterCols}
        activeFilters={searchValues}
        defaultFileName={`DanhSach_DangKy_BaoCao_${new Date().toISOString().slice(0, 10)}.xlsx`}
        onConfirmExport={executeExportMasterExcel}
      />

      {/* WindowsConfirmModal chuẩn hệ thống khi xóa */}
      <WindowsConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        subMessage={confirmModal.subMessage}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
