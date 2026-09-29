/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'

import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../hooks/usePagePermissions'
import { usePageData } from '../../../../../context/PageDataContext'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../../components/modal/WindowsConfirmModal'
import { openChildWindow } from '../../../../../utils/openChildWindow'

import { useProductionPlanColumns } from './columns/productionPlanColumns'
import PlanRegistrationTable from './components/PlanRegistrationTable'
import PlanRegistrationActions from './components/PlanRegistrationActions'
import PlanRegistrationQuery from './components/PlanRegistrationQuery'
import AddPlanRegistrationModal from './components/AddPlanRegistrationModal'
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
  const { setStatusMessage, setPageData } = usePageData()
  const loadingBarRef = useRef(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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
        setMasterGridData(dataList)
        setMasterNumRows(dataList.length)
        originalDataRef.current = dataList

        setPageData?.((prev) => ({
          ...prev,
          total: dataList.length,
          totalAll: res?.pageInfo?.totalAll || dataList.length,
          loadedCount: dataList.length,
          totalColumns: masterCols.length
        }))

        return dataList
      } catch (err) {
        setMasterGridData([])
        setMasterNumRows(0)
        originalDataRef.current = []
        setPageData?.((prev) => ({
          ...prev,
          total: 0,
          totalAll: 0,
          loadedCount: 0
        }))
        return []
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    },
    [loadingBarRef, masterCols.length, setPageData]
  )

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
  const handleSaveRegistration = async (regData) => {
    try {
      loadingBarRef?.current?.continuousStart?.()
      const res = await savePlanRegistration(regData)
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

    const selectedRows = masterSelection?.rows ? masterSelection.rows.toArray() : []
    if (selectedRows.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Vui lòng chọn ít nhất một đợt đăng ký trên bảng để xóa'
      })
      return
    }

    const selectedMasters = selectedRows.map((idx) => masterGridData[idx]).filter(Boolean)
    const masterSeqs = selectedMasters.map((m) => m.IdSeq).filter((id) => id > 0)

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
  }, [pagePerms.canDelete, masterSelection, masterGridData, setStatusMessage, fetchMasterData, searchValues])

  // ── 6. Xuất danh sách Master ra Excel ──
  const handleExportExcel = useCallback(() => {
    if (!masterGridData || masterGridData.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Không có dữ liệu đợt đăng ký để xuất'
      })
      return
    }
    try {
      const exportData = masterGridData.map((row) => {
        const copy = { ...row }
        delete copy.WorkingTag
        return copy
      })
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'DanhSach_DangKy_BaoCao')
      XLSX.writeFile(wb, `DanhSach_DangKy_BaoCao_${new Date().toISOString().slice(0, 10)}.xlsx`)
      setStatusMessage?.({
        type: 'success',
        text: 'Đã xuất danh sách đợt đăng ký ra Excel thành công'
      })
    } catch (err) {
      setStatusMessage?.({
        type: 'error',
        text: 'Xuất Excel thất bại: ' + (err?.message || err)
      })
    }
  }, [masterGridData, setStatusMessage])

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
            handleOpenAddModal={() => setIsAddModalOpen(true)}
            handleOpenDetailWindow={() => handleOpenDetailWindow()}
            handleExportExcel={handleExportExcel}
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
        onSaveRegistration={handleSaveRegistration}
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
