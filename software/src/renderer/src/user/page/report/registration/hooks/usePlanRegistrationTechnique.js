import { useState, useCallback, useEffect, useRef } from 'react'
import { message, notification } from 'antd'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'

const INITIAL_SAMPLE_TEMPLATES = [
  {
    Id: 1,
    WorkingTag: '',
    ReportKey: 'RP-KH-HN-GS1',
    ReportName: 'Khung mẫu Báo cáo Kế hoạch sản xuất GS1 Hà Nội',
    ReportType: 'Kế hoạch sản xuất',
    FactoryName: 'Nhà máy GS1 Hà Nội',
    Frequency: 'Hàng ngày',
    FormVersion: 'v1.0',
    TemplateFileName: 'Template_KHSX_GS1_Hanoi.xlsx',
    OrderSeq: 1,
    Active: true,
    IsPublic: true,
    PublicUrl: '#/public/report/hanoi-gs1?type=plan',
    Remark: 'Khung mẫu chuẩn KHSX áp dụng cho các xưởng In, Bế, Dán tại GS1 Hà Nội',
    CreatedAt: '2026-09-29 08:00:00',
    CreatedByName: 'Admin',
    UpdatedAt: '2026-09-29 08:00:00',
    UpdatedByName: 'Admin'
  },
  {
    Id: 2,
    WorkingTag: '',
    ReportKey: 'RP-TK-HN-GS1',
    ReportName: 'Khung mẫu Báo cáo Thống kê sản xuất GS1 Hà Nội',
    ReportType: 'Thống kê sản xuất',
    FactoryName: 'Nhà máy GS1 Hà Nội',
    Frequency: 'Hàng ca',
    FormVersion: 'v1.0',
    TemplateFileName: 'Template_TKSX_GS1_Hanoi.xlsx',
    OrderSeq: 2,
    Active: true,
    IsPublic: true,
    PublicUrl: '#/public/report/hanoi-gs1?type=stat',
    Remark: 'Khung mẫu ghi nhận sản lượng thực tế, phế phẩm và tỷ lệ đạt',
    CreatedAt: '2026-09-29 08:00:00',
    CreatedByName: 'Admin',
    UpdatedAt: '2026-09-29 08:00:00',
    UpdatedByName: 'Admin'
  },
  {
    Id: 3,
    WorkingTag: '',
    ReportKey: 'RP-KH-QV-GS5',
    ReportName: 'Khung mẫu Báo cáo Kế hoạch sản xuất GS5 Quế Võ 1B',
    ReportType: 'Kế hoạch sản xuất',
    FactoryName: 'Nhà máy GS5 Quế Võ 1B',
    Frequency: 'Hàng ngày',
    FormVersion: 'v1.0',
    TemplateFileName: 'Template_KHSX_GS5_QueVo.xlsx',
    OrderSeq: 3,
    Active: true,
    IsPublic: true,
    PublicUrl: '#/public/report/quevo-gs5?type=plan',
    Remark: 'Khung mẫu áp dụng cho dây chuyền sóng và bao bì carton Quế Võ',
    CreatedAt: '2026-09-29 08:30:00',
    CreatedByName: 'Admin',
    UpdatedAt: '2026-09-29 08:30:00',
    UpdatedByName: 'Admin'
  },
  {
    Id: 4,
    WorkingTag: '',
    ReportKey: 'RP-TK-QV-GS5',
    ReportName: 'Khung mẫu Báo cáo Thống kê sản xuất GS5 Quế Võ 1B',
    ReportType: 'Thống kê sản xuất',
    FactoryName: 'Nhà máy GS5 Quế Võ 1B',
    Frequency: 'Hàng ca',
    FormVersion: 'v1.0',
    TemplateFileName: 'Template_TKSX_GS5_QueVo.xlsx',
    OrderSeq: 4,
    Active: true,
    IsPublic: true,
    PublicUrl: '#/public/report/quevo-gs5?type=stat',
    Remark: 'Khung mẫu thống kê sản lượng định kỳ theo ca tại GS5',
    CreatedAt: '2026-09-29 08:30:00',
    CreatedByName: 'Admin',
    UpdatedAt: '2026-09-29 08:30:00',
    UpdatedByName: 'Admin'
  }
]

export function usePlanRegistrationTechnique({
  gridData = [],
  setGridData,
  setNumRows,
  getSelectedRows,
  resetTable,
  canCreate,
  canEdit,
  canDelete,
  loadingBarRef,
  controllers
}) {
  const { t } = useTranslation()
  const [searchValues, setSearchValues] = useState({
    FactoryName: '',
    ReportType: '',
    ReportKey: '',
    ReportName: '',
    Frequency: '',
    Active: ''
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const originalDataRef = useRef([])

  // Nạp dữ liệu ban đầu
  useEffect(() => {
    setGridData(INITIAL_SAMPLE_TEMPLATES)
    setNumRows(INITIAL_SAMPLE_TEMPLATES.length)
    originalDataRef.current = JSON.parse(JSON.stringify(INITIAL_SAMPLE_TEMPLATES))
  }, [setGridData, setNumRows])

  // Thêm điều kiện truy vấn động
  const handleAddQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key === fieldKey)) return prev
      return [...prev, { key: fieldKey }]
    })
  }, [])

  const handleRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== fieldKey))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }, [])

  const handleResetQuery = useCallback(() => {
    setSearchValues({
      FactoryName: '',
      ReportType: '',
      ReportKey: '',
      ReportName: '',
      Frequency: '',
      Active: ''
    })
    setDynamicQueryFields([])
  }, [])

  // Kiểm tra có dữ liệu chưa lưu
  const hasUnsavedChanges = useCallback(() => {
    return gridData.some((r) => r.WorkingTag && r.WorkingTag !== '')
  }, [gridData])

  // Thực hiện tìm kiếm / lọc dữ liệu
  const executeSearch = useCallback(() => {
    loadingBarRef?.current?.continuousStart?.()

    setTimeout(() => {
      let filtered = [...originalDataRef.current]

      if (searchValues.FactoryName) {
        filtered = filtered.filter((r) => r.FactoryName === searchValues.FactoryName)
      }
      if (searchValues.ReportType) {
        filtered = filtered.filter((r) => r.ReportType === searchValues.ReportType)
      }
      if (searchValues.ReportKey) {
        const query = searchValues.ReportKey.toLowerCase().trim()
        filtered = filtered.filter((r) =>
          String(r.ReportKey || '')
            .toLowerCase()
            .includes(query)
        )
      }
      if (searchValues.ReportName) {
        const query = searchValues.ReportName.toLowerCase().trim()
        filtered = filtered.filter((r) =>
          String(r.ReportName || '')
            .toLowerCase()
            .includes(query)
        )
      }
      if (searchValues.Frequency) {
        filtered = filtered.filter((r) => r.Frequency === searchValues.Frequency)
      }
      if (searchValues.Active !== '' && searchValues.Active !== undefined) {
        const isActive = searchValues.Active === 'true' || searchValues.Active === true
        filtered = filtered.filter((r) => Boolean(r.Active) === isActive)
      }

      setGridData(filtered)
      setNumRows(filtered.length)
      loadingBarRef?.current?.complete?.()
      message.success(`Tìm thấy ${filtered.length} khung mẫu báo cáo`)
    }, 150)
  }, [searchValues, setGridData, setNumRows, loadingBarRef])

  const handleSearchData = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowConfirmModal(true)
      setPendingAction(() => executeSearch)
    } else {
      executeSearch()
    }
  }, [hasUnsavedChanges, executeSearch])

  const handleConfirmSearch = useCallback(() => {
    setShowConfirmModal(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }, [pendingAction])

  const handleCancelSearch = useCallback(() => {
    setShowConfirmModal(false)
    setPendingAction(null)
  }, [])

  // Nhận dữ liệu từ Modal đăng ký khung mẫu và ghi vào bảng
  const handleSaveRegistrationFromModal = useCallback(
    (newRegisteredRows) => {
      if (!Array.isArray(newRegisteredRows) || newRegisteredRows.length === 0) return

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19)
      const formatted = newRegisteredRows.map((r, i) => ({
        Id: Date.now() + i,
        WorkingTag: 'A',
        ReportKey: r.ReportKey || `RP-${Date.now().toString().slice(-4)}`,
        ReportName: r.ReportName,
        ReportType: r.ReportType,
        FactoryName: r.FactoryName,
        Frequency: r.Frequency || 'Hàng ngày',
        FormVersion: r.FormVersion || 'v1.0',
        TemplateFileName: r.TemplateFileName || 'Template_Report.xlsx',
        OrderSeq: r.OrderSeq || 1,
        Active: r.Active !== undefined ? r.Active : true,
        IsPublic: r.IsPublic !== undefined ? r.IsPublic : true,
        PublicUrl:
          r.PublicUrl ||
          `#/public/report/${r.FactoryName?.includes('GS5') ? 'quevo-gs5' : 'hanoi-gs1'}?type=${r.ReportType === 'Kế hoạch sản xuất' ? 'plan' : 'stat'}`,
        Remark: r.Remark || '',
        CreatedAt: nowStr,
        CreatedByName: 'Người đăng ký',
        UpdatedAt: nowStr,
        UpdatedByName: 'Người đăng ký'
      }))

      setGridData((prev) => [...formatted, ...prev])
      setNumRows((prev) => prev + formatted.length)
      notification.success({
        message: 'Đăng ký thành công',
        description: `Đã thêm ${formatted.length} khung mẫu báo cáo vào bảng. Nhấn "LƯU" để chốt dữ liệu vào hệ thống.`
      })
    },
    [setGridData, setNumRows]
  )

  // Lưu toàn bộ thay đổi
  const handleSaveData = useCallback(async () => {
    if (!canEdit && !canCreate) {
      message.warning('Bạn không có quyền chỉnh sửa hoặc lưu dữ liệu!')
      return
    }

    const modifiedRows = gridData.filter((r) => r.WorkingTag && r.WorkingTag !== '')
    if (modifiedRows.length === 0) {
      message.info('Không có thay đổi nào cần lưu.')
      return
    }

    loadingBarRef?.current?.continuousStart?.()

    try {
      // Validate
      for (const row of modifiedRows) {
        if (!row.ReportKey || !row.ReportName || !row.ReportType || !row.FactoryName) {
          message.error(
            'Vui lòng điền đủ: Mã khung mẫu, Tên khung mẫu, Loại báo cáo và Nhà máy áp dụng!'
          )
          loadingBarRef?.current?.complete?.()
          return
        }
      }

      // Commit
      const committed = gridData
        .filter((r) => r.WorkingTag !== 'D')
        .map((r) => ({
          ...r,
          WorkingTag: ''
        }))

      setGridData(committed)
      setNumRows(committed.length)
      originalDataRef.current = JSON.parse(JSON.stringify(committed))

      loadingBarRef?.current?.complete?.()
      notification.success({
        message: 'Lưu thành công',
        description: `Đã lưu thành công ${modifiedRows.length} khung mẫu báo cáo!`
      })
    } catch (err) {
      loadingBarRef?.current?.complete?.()
      message.error('Lưu dữ liệu thất bại: ' + (err.message || 'Lỗi server'))
    }
  }, [canEdit, canCreate, gridData, setGridData, setNumRows, loadingBarRef])

  // Xóa dòng
  const handleDeleteDataSheet = useCallback(() => {
    if (!canDelete) {
      message.warning('Bạn không có quyền xóa dữ liệu!')
      return
    }

    const selected = typeof getSelectedRows === 'function' ? getSelectedRows() : []
    if (!selected || selected.length === 0) {
      message.warning('Vui lòng chọn ít nhất một dòng để xóa!')
      return
    }

    setGridData((prev) => {
      const next = [...prev]
      selected.forEach((idx) => {
        if (next[idx]) {
          if (next[idx].WorkingTag === 'A') {
            next.splice(idx, 1)
          } else {
            next[idx] = { ...next[idx], WorkingTag: 'D' }
          }
        }
      })
      return next
    })
    setNumRows((prev) => Math.max(0, prev - (selected.length || 0)))
    message.warning(`Đã đánh dấu xóa ${selected.length} dòng. Nhấn "LƯU" để hoàn tất.`)
  }, [canDelete, getSelectedRows, setGridData, setNumRows])

  // Xuất file Excel
  const handleExportExcel = useCallback(() => {
    try {
      const exportData = gridData.map((r, index) => ({
        STT: r.OrderSeq || index + 1,
        'Mã khung mẫu': r.ReportKey,
        'Tên khung mẫu báo cáo': r.ReportName,
        'Loại báo cáo': r.ReportType,
        'Nhà máy áp dụng': r.FactoryName,
        'Tần suất báo cáo': r.Frequency,
        'Phiên bản mẫu': r.FormVersion,
        'File mẫu Excel': r.TemplateFileName,
        'Kích hoạt': r.Active ? 'Có' : 'Không',
        'Mô tả / Ghi chú': r.Remark,
        'Người tạo': r.CreatedByName,
        'Thời gian tạo': r.CreatedAt
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'KhungMau_BaoCao')
      XLSX.writeFile(wb, `DanhSach_KhungMau_BaoCao_${new Date().toISOString().split('T')[0]}.xlsx`)
      message.success('Đã xuất file Excel thành công!')
    } catch (err) {
      message.error('Xuất Excel thất bại: ' + err.message)
    }
  }, [gridData])

  return {
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    handleSearchData,
    handleSaveData,
    handleDeleteDataSheet,
    handleSaveRegistrationFromModal,
    handleExportExcel,
    showConfirmModal,
    handleConfirmSearch,
    handleCancelSearch
  }
}
