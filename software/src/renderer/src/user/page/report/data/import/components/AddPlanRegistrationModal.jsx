/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useRef } from 'react'
import { Modal, Select, Button, Upload, Input } from 'antd'
import {
  UploadOutlined,
  SaveOutlined,
  CloseOutlined,
  FileExcelOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import {
  Layers,
  Database,
  Columns3,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'
import WindowsConfirmModal from '../../../../../components/modal/WindowsConfirmModal'
import { useStatisticsImportColumns } from '../statistics/columns/statisticsImportColumns'
import { usePlanImportColumns } from '../plan/columns/planImportColumns'
import { parseStatisticsExcelFast } from '../statistics/utils/statisticsExcelParser'
import { parsePlanExcelFast } from '../plan/utils/planExcelParser'

export default function AddPlanRegistrationModal({ isOpen, onClose, onSaveRegistration }) {
  // ── Form Header State ──
  const [reportType, setReportType] = useState('statistics') // 'statistics' | 'plan'
  const [factoryCode, setFactoryCode] = useState('GS1') // 'GS1' | 'GS5'
  const [factoryName, setFactoryName] = useState('GS1 Hà Nội')
  const [applyDate, setApplyDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [regCode] = useState('') // Sinh tự động khi lưu hệ thống
  const [remark, setRemark] = useState('')

  const handleFactoryChange = (val) => {
    if (val === 'GS5' || val === 'GS5 Quế Võ 1B') {
      setFactoryCode('GS5')
      setFactoryName('GS5 Quế Võ 1B')
    } else {
      setFactoryCode('GS1')
      setFactoryName('GS1 Hà Nội')
    }
  }

  // ── Confirm Modal State (Chuẩn WindowsConfirmModal / SystemConfirmModal như Logout) ──
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    subMessage: '',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy bỏ',
    confirmVariant: 'primary',
    onConfirm: () => {}
  })

  // ── Sheet Data State ──
  const [sheetData, setSheetData] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
    current: undefined
  })
  const [columnWidths, setColumnWidths] = useState({})
  const gridRef = useRef(null)

  // ── Thống kê trạng thái A, U, E và số dòng đang chọn ──
  const { aCount, uCount, eCount } = useMemo(() => {
    let a = 0
    let u = 0
    let e = 0
    for (const row of sheetData) {
      const tag = row.WorkingTag || 'A'
      if (tag === 'A') a++
      else if (tag === 'U') u++
      else if (tag === 'E') e++
    }
    return { aCount: a, uCount: u, eCount: e }
  }, [sheetData])

  const selectedRowCount = useMemo(() => {
    if (!selection?.rows) return 0
    return selection.rows.length
  }, [selection?.rows])

  // ── Columns hook dynamically based on reportType ──
  const statColumns = useStatisticsImportColumns()
  const planColumns = usePlanImportColumns()

  const currentColumns = useMemo(() => {
    const baseCols = reportType === 'statistics' ? statColumns : planColumns
    return baseCols.map((col) => ({
      ...col,
      width: columnWidths[col.id] || col.width || 135
    }))
  }, [reportType, statColumns, planColumns, columnWidths])

  const onColumnResize = useCallback((column, newSize) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  // Đổi loại báo cáo có cảnh báo xác nhận qua WindowsConfirmModal
  const handleChangeReportType = useCallback(
    (newType) => {
      if (newType === reportType) return
      if (sheetData.length > 0) {
        setConfirmModal({
          isOpen: true,
          type: 'warning',
          title: 'Xác nhận chuyển đổi loại báo cáo',
          message: 'Chuyển đổi loại báo cáo sẽ xóa toàn bộ dữ liệu đang nạp trên bảng hiện tại.',
          subMessage: 'Bạn có chắc chắn muốn chuyển đổi sang loại báo cáo mới không?',
          confirmText: 'Đồng ý chuyển',
          cancelText: 'Hủy bỏ',
          confirmVariant: 'primary',
          onConfirm: () => {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
            setReportType(newType)
            setSheetData([])
            setSelection({
              columns: CompactSelection.empty(),
              rows: CompactSelection.empty(),
              current: undefined
            })
          }
        })
      } else {
        setReportType(newType)
        setSelection({
          columns: CompactSelection.empty(),
          rows: CompactSelection.empty(),
          current: undefined
        })
      }
    },
    [reportType, sheetData.length]
  )

  // ── Modal Status Message (Hiển thị trực tiếp trên StatusBar dưới đáy Modal) ──
  const [modalStatus, setModalStatus] = useState(null) // { type: 'info' | 'success' | 'warning' | 'error', text: '' }

  // ── NẠP TỪ FILE EXCEL VÀO SHEET SIÊU TỐC QUA MODULE PARSER RIÊNG BIỆT (NẠP MỚI TOÀN BỘ) ──
  const handleUploadExcel = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const isStat = reportType === 'statistics'

        // Gọi đúng parser chuyên biệt cho từng cấu trúc bảng
        const result = isStat
          ? parseStatisticsExcelFast(buffer, { applyDate, factoryName, factoryCode })
          : parsePlanExcelFast(buffer, { applyDate, factoryName, factoryCode })

        if (!result.data || result.data.length === 0) {
          setModalStatus({
            type: 'warning',
            text: 'Không tìm thấy dữ liệu hợp lệ trong file Excel!'
          })
          return
        }

        // Nạp mới hoàn toàn danh sách dòng từ file Excel
        setSheetData(result.data)
        setModalStatus({
          type: 'success',
          text: `Đã nạp mới ${result.totalRows} dòng từ Excel (${result.elapsedMs}ms, ${isStat ? 'TKSX' : 'KHSX'})`
        })
      } catch (err) {
        setModalStatus({
          type: 'error',
          text: 'Lỗi khi đọc file Excel: ' + (err?.message || err)
        })
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // ── XỬ LÝ GET CELL DỮ LIỆU CHỈ XEM (READ-ONLY) TRÊN GLIDE SHEET, TOÀN BỘ LÀ TEXT NGUYÊN BẢN ──
  const getCellContent = useCallback(
    ([colIndex, rowIndex]) => {
      const col = currentColumns[colIndex]
      const row = sheetData[rowIndex]
      if (!col || !row) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const val = row[col.id] ?? row[col.id.charAt(0).toLowerCase() + col.id.slice(1)]

      if (col.id === 'WorkingTag') {
        const tag = val ? String(val).trim() : 'A'
        return {
          kind: GridCellKind.Text,
          data: tag,
          displayData: tag,
          readonly: true,
          allowOverlay: false,
          contentAlign: 'center',
          themeOverride: col.themeOverride
        }
      }

      const strVal = val === null || val === undefined ? '' : String(val).trim()
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        readonly: true,
        allowOverlay: false
      }
    },
    [currentColumns, sheetData]
  )

  const [isSaving, setIsSaving] = useState(false)

  // Đóng an toàn kèm hộp thoại xác nhận WindowsConfirmModal nếu còn dữ liệu chưa lưu
  const handleRequestClose = useCallback(() => {
    if (isSaving) return
    if (sheetData.length > 0) {
      setConfirmModal({
        isOpen: true,
        type: 'unsaved',
        title: 'Xác nhận đóng cửa sổ',
        message: 'Dữ liệu vừa nạp từ Excel sẽ bị mất nếu bạn đóng cửa sổ này.',
        subMessage: 'Bạn có chắc chắn muốn đóng và hủy bỏ đợt nạp dữ liệu này không?',
        confirmText: 'Đồng ý đóng',
        cancelText: 'Tiếp tục xem',
        confirmVariant: 'danger',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          setSheetData([])
          onClose()
        }
      })
    } else {
      onClose()
    }
  }, [sheetData.length, isSaving, onClose])

  // Lưu toàn bộ đăng ký vào hệ thống (Gửi cả Master + Chi tiết)
  const handleConfirmSave = async () => {
    if (sheetData.length === 0) {
      setModalStatus({
        type: 'warning',
        text: 'Vui lòng nạp dữ liệu từ file Excel trước khi lưu!'
      })
      return
    }

    const finalRegCode =
      regCode || `DK-BC-${applyDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`

    try {
      setIsSaving(true)
      setModalStatus({
        type: 'info',
        text: `Đang lưu đăng ký ${sheetData.length} dòng lên hệ thống...`
      })
      if (onSaveRegistration) {
        await onSaveRegistration({
          reportType,
          factoryCode,
          factoryName,
          applyDate,
          regCode: finalRegCode,
          remark,
          status: 'published',
          isDraft: false,
          data: sheetData
        })
      }
      setSheetData([])
      onClose()
    } catch (err) {
      setModalStatus({
        type: 'error',
        text: 'Lỗi khi lưu đăng ký báo cáo: ' + (err?.message || err)
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={isOpen}
        onCancel={handleRequestClose}
        footer={null}
        closable={false}
        centered
        width={1380}
        styles={{
          content: {
            padding: 0,
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            height: '88vh',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column'
          },
          body: { padding: 0, height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }
        }}
      >
        <div className="flex flex-col h-full bg-white text-slate-800 font-sans select-none antialiased overflow-hidden">
          {/* Top Header Window Bar */}
          <div className="h-8 px-3 flex items-center justify-between border-b border-slate-200 bg-[#F8F9FA] shrink-0">
            <div className="flex items-center gap-2">
              <FileExcelOutlined className="text-emerald-600 text-xs" />
              <span className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                Đăng ký & Nạp dữ liệu báo cáo sản xuất (KHSX & TKSX)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <CloseOutlined className="text-xs" />
            </button>
          </div>

          {/* 1. TOP ACTION TOOLBAR: Giống hệt thiết kế khung ngoài chính */}
          <div className="flex items-center justify-between bg-white px-2 py-0.5 border-b border-slate-200 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1">
              <Button
                key="SaveData"
                icon={<SaveOutlined className="text-green-500" style={{ fontSize: '12px' }} />}
                size="small"
                loading={isSaving}
                onClick={handleConfirmSave}
                className="uppercase text-[10px] whitespace-nowrap font-medium"
                style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
                color="default"
                variant="link"
                disabled={sheetData.length === 0 || isSaving}
                title="Lưu toàn bộ dữ liệu đăng ký vào hệ thống (Ctrl+S)"
              >
                LƯU
              </Button>

              <Upload beforeUpload={handleUploadExcel} showUploadList={false}>
                <Button
                  key="UploadExcel"
                  icon={<UploadOutlined className="text-blue-500" style={{ fontSize: '12px' }} />}
                  size="small"
                  className="uppercase text-[10px] whitespace-nowrap font-medium"
                  style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
                  color="default"
                  variant="link"
                  title="Nạp file Excel vào bảng (Ghi đè mới toàn bộ)"
                >
                  NẠP EXCEL
                </Button>
              </Upload>

              <Button
                key="ResetAll"
                icon={<ReloadOutlined className="text-amber-500" style={{ fontSize: '12px' }} />}
                size="small"
                onClick={() => {
                  if (sheetData.length > 0) {
                    setConfirmModal({
                      isOpen: true,
                      type: 'danger',
                      title: 'Xác nhận làm mới dữ liệu',
                      message: 'Hành động này sẽ xóa sạch toàn bộ dữ liệu vừa nạp trên bảng.',
                      subMessage: 'Bạn có chắc chắn muốn làm mới không?',
                      confirmText: 'Xóa làm mới',
                      cancelText: 'Hủy bỏ',
                      confirmVariant: 'danger',
                      onConfirm: () => {
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                        setSheetData([])
                        setSelection({
                          columns: CompactSelection.empty(),
                          rows: CompactSelection.empty(),
                          current: undefined
                        })
                      }
                    })
                  }
                }}
                className="uppercase text-[10px] whitespace-nowrap font-medium"
                style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
                color="default"
                variant="link"
                disabled={sheetData.length === 0}
                title="Làm mới / Xóa toàn bộ dữ liệu trên Sheet"
              >
                LÀM MỚI
              </Button>

              <Button
                key="Close"
                icon={<CloseOutlined className="text-rose-500" style={{ fontSize: '12px' }} />}
                size="small"
                onClick={handleRequestClose}
                className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600 hover:text-rose-700"
                style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
                color="default"
                variant="link"
                title="Đóng cửa sổ"
              >
                ĐÓNG
              </Button>
            </div>

            <div className="flex items-center gap-2 pr-1">
              <span className="text-[11px] text-slate-500 font-medium">
                Bảng:{' '}
                <b className={reportType === 'statistics' ? 'text-emerald-600' : 'text-blue-600'}>
                  {reportType === 'statistics'
                    ? 'Thống kê sản xuất (TKSX)'
                    : 'Kế hoạch sản xuất (KHSX)'}
                </b>{' '}
                | Số dòng: <b className="text-slate-800">{sheetData.length}</b>
              </span>
            </div>
          </div>

          {/* 2. THÔNG TIN MASTER ĐĂNG KÝ: Khung điều kiện truy vấn chuẩn ERP */}
          <div className="w-full shrink-0 bg-white">
            <div className="flex cursor-pointer items-center justify-between px-2 py-0.5 border-b border-slate-200 text-gray-900 select-none relative bg-white">
              <h2 className="text-[10px] italic text-indigo-600 font-bold uppercase flex items-center gap-1.5 py-0.5">
                <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
                <span>Thông tin đăng ký báo cáo</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 w-full border-b border-slate-200 bg-white">
              {/* Ô 1: Mã đăng ký báo cáo (Sinh tự động khi lưu hệ thống) */}
              <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
                  <span>Mã đăng ký</span>
                </div>
                <div className="flex-1 h-full flex items-center px-2 bg-slate-50/40">
                  <span className="text-xs font-mono font-medium text-slate-400 italic truncate">
                    {regCode || '[Hệ thống tự sinh khi lưu]'}
                  </span>
                </div>
              </div>

              {/* Ô 2: Loại báo cáo */}
              <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[100px] select-none">
                  <span>Loại báo cáo</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="flex-1 h-full flex items-center px-1">
                  <Select
                    size="small"
                    variant="borderless"
                    value={reportType}
                    onChange={handleChangeReportType}
                    className="w-full text-xs font-medium"
                    options={[
                      { value: 'statistics', label: 'Thống kê sản xuất (TKSX)' },
                      { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' }
                    ]}
                  />
                </div>
              </div>

              {/* Ô 3: Nhà máy sản xuất */}
              <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
                  <span>Nhà máy SX</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="flex-1 h-full flex items-center px-1">
                  <Select
                    size="small"
                    variant="borderless"
                    value={factoryCode}
                    onChange={handleFactoryChange}
                    className="w-full text-xs font-medium"
                    options={[
                      { value: 'GS1', label: 'GS1 - GS1 Hà Nội' },
                      { value: 'GS5', label: 'GS5 - GS5 Quế Võ 1B' }
                    ]}
                  />
                </div>
              </div>

              {/* Ô 4: Ngày áp dụng / Ngày báo cáo */}
              <div className="flex items-center h-[28px] bg-white min-w-0">
                <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
                  <span>Ngày báo cáo</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="flex-1 h-full flex items-center px-1">
                  <Input
                    type="date"
                    size="small"
                    variant="borderless"
                    value={applyDate}
                    onChange={(e) => setApplyDate(e.target.value)}
                    className="text-xs font-mono font-medium !p-0"
                  />
                </div>
              </div>
            </div>

            {/* Hàng 2: Ghi chú mô tả (Toàn bộ chiều rộng) */}
            <div className="flex items-center h-[28px] border-b border-slate-200 bg-white min-w-0 w-full">
              <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
                <span>Ghi chú</span>
              </div>
              <div className="flex-1 h-full flex items-center px-1.5">
                <Input
                  size="small"
                  variant="borderless"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Nhập ghi chú chi tiết cho đợt đăng ký dữ liệu báo cáo..."
                  className="text-xs !p-0"
                />
              </div>
            </div>
          </div>

          {/* 3. BẢNG GLIDE DATA GRID: Tiêu đề và bảng dữ liệu (Chỉ xem, Hỗ trợ Copy Ctrl+C) */}
          <div className="flex-1 w-full min-h-0 bg-white flex flex-col overflow-hidden relative">
            <div className="flex cursor-pointer items-center justify-between px-2 py-0.5 border-b border-slate-200 text-gray-900 select-none relative bg-white shrink-0">
              <h2 className="text-[10px] italic text-indigo-600 font-bold uppercase flex items-center gap-1.5 py-0.5">
                <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
                <span>
                  Bảng dữ liệu chi tiết{' '}
                  {reportType === 'statistics'
                    ? '(Thống kê sản xuất TKSX - 13 nhóm cột)'
                    : '(Kế hoạch sản xuất KHSX - 24 cột)'}
                </span>
              </h2>
            </div>

            <div className="flex-1 w-full h-full min-h-0 relative">
              <DataEditor
                ref={gridRef}
                columns={currentColumns}
                rows={sheetData.length}
                getCellContent={getCellContent}
                gridSelection={selection}
                onGridSelectionChange={setSelection}
                onColumnResize={onColumnResize}
                getCellsForSelection={true}
                keybindings={{ copy: true }}
                rowMarkers="both"
                rowSelect="multi"
                columnSelect="single"
                headerHeight={23}
                rowHeight={23}
                smoothScrollX
                smoothScrollY
                width="100%"
                height="100%"
              />
            </div>
          </div>

          {/* 4. THANH TRẠNG THÁI STATUS BAR DƯỚI ĐÁY MODAL (Chuẩn thiết kế hệ thống ERP) */}
          <div className="h-6 min-h-[24px] bg-white border-t border-slate-200 flex items-center justify-between px-2 text-[9.5px] select-none shrink-0 font-medium">
            {/* Khối bên trái: Thông báo trạng thái hoặc Thông tin phiên đăng ký */}
            <div className="flex items-center gap-3 text-slate-600 truncate min-w-0">
              {modalStatus?.text ? (
                <div
                  className={`flex items-center gap-1.5 font-semibold text-[10px] truncate ${
                    modalStatus.type === 'error'
                      ? 'text-rose-600'
                      : modalStatus.type === 'warning'
                        ? 'text-amber-600'
                        : modalStatus.type === 'success'
                          ? 'text-emerald-600'
                          : 'text-blue-600'
                  }`}
                  title={modalStatus.text}
                >
                  {modalStatus.type === 'error' || modalStatus.type === 'warning' ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : modalStatus.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Info className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{modalStatus.text}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      {reportType === 'statistics'
                        ? 'Báo cáo: Thống kê sản xuất (TKSX)'
                        : 'Báo cáo: Kế hoạch sản xuất & Điều phối (KHSX)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 font-mono">
                    <span className="text-slate-400 font-sans">Mã:</span>
                    <span className="font-semibold text-slate-700">
                      {regCode || '[Tự động sinh]'}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-slate-500">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>[{factoryCode}] {factoryName}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-mono">{applyDate}</span>
                  </div>
                </>
              )}
            </div>

            {/* Khối bên phải: Thống kê trạng thái dòng A/U/E, Tổng dòng, Tổng cột, Số dòng chọn */}
            <div className="flex items-center text-[9px] font-medium uppercase h-full shrink-0 ml-2">
              {/* Thống kê trạng thái A, U, E */}
              <div className="flex items-center gap-2 px-2.5 h-full border-l border-slate-200 select-none text-[9.5px]">
                <span
                  className={`flex items-center gap-0.5 ${aCount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`}
                  title="A (Thêm mới): Số dòng mới sẵn sàng đăng ký"
                >
                  <span>A:</span>
                  <span>{aCount}</span>
                </span>
                <span className="text-slate-300">/</span>
                <span
                  className={`flex items-center gap-0.5 ${uCount > 0 ? 'text-blue-600 font-bold' : 'text-slate-400 font-medium'}`}
                  title="U (Cập nhật): Số dòng đã chỉnh sửa"
                >
                  <span>U:</span>
                  <span>{uCount}</span>
                </span>
                <span className="text-slate-300">/</span>
                <span
                  className={`flex items-center gap-0.5 ${eCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400 font-medium'}`}
                  title="E (Lỗi): Số dòng dữ liệu lỗi"
                >
                  <span>E:</span>
                  <span>{eCount}</span>
                </span>
              </div>

              {/* Tổng số dòng dữ liệu */}
              <div
                className="flex items-center gap-1 px-2.5 h-full border-l border-slate-200 text-slate-700"
                title={`Tổng số dòng: ${sheetData.length} dòng${selectedRowCount > 0 ? ` (Đang chọn: ${selectedRowCount} dòng)` : ''}`}
              >
                <Database className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="font-semibold">{sheetData.length.toLocaleString('en-US')}</span>
                <span className="text-slate-400 font-normal">Dòng</span>
                {selectedRowCount > 0 && (
                  <span className="text-indigo-600 font-bold ml-1">(Chọn: {selectedRowCount})</span>
                )}
              </div>

              {/* Tổng số cột */}
              <div
                className="flex items-center gap-1 px-2.5 h-full border-l border-slate-200 text-slate-700"
                title={`Tổng số cột hiển thị: ${currentColumns.length} cột`}
              >
                <Columns3 className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="font-semibold">{currentColumns.length}</span>
                <span className="text-slate-400 font-normal">Cột</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* WindowsConfirmModal chuẩn hệ thống ERP (giống khi logout / xóa / cảnh báo) */}
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
