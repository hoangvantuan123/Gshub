/* eslint-disable react/prop-types */
import { useState, useCallback, useMemo, useRef } from 'react'
import { Button, Upload, Input, Select } from 'antd'
import {
  SaveOutlined,
  ReloadOutlined,
  CloseOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import { Loader2, Lock } from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

import WindowsConfirmModal from '../../../../components/modal/WindowsConfirmModal'
import { useStatisticsImportColumns } from '../statistics/columns/statisticsImportColumns'
import { usePlanImportColumns } from '../plan/columns/planImportColumns'
import { parseStatisticsExcelFast } from '../statistics/utils/statisticsExcelParser'
import { parsePlanExcelFast } from '../plan/utils/planExcelParser'
import { savePlanRegistration } from '../services/planRegistrationService'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'

/**
 * PlanRegistrationFormCore - Component Lõi Đăng ký & Nạp báo cáo (KHSX & TKSX)
 * Dùng chung cho cả Full View (Cửa sổ độc lập/Tab) và Modal Popup
 */
export default function PlanRegistrationFormCore({
  onClose,
  onSaveSuccess,
  mode = 'full', // 'full' | 'modal'
  loadingBarRef = null,
  setStatusMessage = null
}) {
  // ── Form Header State ──
  const [regCode, setRegCode] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, percent: 0 })
  const [reportType, setReportType] = useState('statistics') // 'statistics' | 'plan'
  const [factoryCode, setFactoryCode] = useState('GS1') // 'GS1' | 'GS5'
  const [factoryName, setFactoryName] = useState('GS1 Hà Nội')
  const [applyDate, setApplyDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [remark, setRemark] = useState('')

  const handleFactoryChange = (val) => {
    if (isSaved) return
    if (val === 'GS5' || val === 'GS5 Quế Võ 1B') {
      setFactoryCode('GS5')
      setFactoryName('GS5 Quế Võ 1B')
    } else {
      setFactoryCode('GS1')
      setFactoryName('GS1 Hà Nội')
    }
  }

  // ── Confirm Modal State ──
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

  // ── Grid Sheet Data State ──
  const [sheetData, setSheetData] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [columnWidths, setColumnWidths] = useState({})
  const gridRef = useRef(null)

  // ── Hook Columns ──
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

  // Đổi loại báo cáo
  const handleReportTypeChange = (type) => {
    if (type === reportType) return
    if (sheetData.length > 0) {
      setConfirmModal({
        isOpen: true,
        type: 'warning',
        title: 'Chuyển loại báo cáo',
        message: 'Dữ liệu đã nạp trên bảng sẽ bị xóa khi bạn đổi loại báo cáo.',
        subMessage: 'Bạn có chắc chắn muốn tiếp tục không?',
        confirmText: 'Đồng ý đổi',
        cancelText: 'Hủy',
        confirmVariant: 'warning',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          setReportType(type)
          setSheetData([])
          setStatusMessage?.({
            type: 'info',
            text: `Đã chuyển sang ${type === 'statistics' ? 'Thống kê sản xuất (TKSX)' : 'Kế hoạch sản xuất (KHSX)'}`
          })
        }
      })
    } else {
      setReportType(type)
    }
  }

  // Nạp file Excel siêu tốc
  const handleUploadExcel = (file) => {
    loadingBarRef?.current?.continuousStart?.()
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const isStat = reportType === 'statistics'
        const result = isStat
          ? parseStatisticsExcelFast(buffer, { applyDate, factoryName, factoryCode })
          : parsePlanExcelFast(buffer, { applyDate, factoryName, factoryCode })

        if (!result.data || result.data.length === 0) {
          setStatusMessage?.({
            type: 'warning',
            text: 'Không tìm thấy dữ liệu hợp lệ trong file Excel!'
          })
          return
        }

        setSheetData(result.data)
        setStatusMessage?.({
          type: 'success',
          text: `Đã nạp ${result.totalRows.toLocaleString('vi-VN')} dòng từ Excel (${result.elapsedMs}ms, ${isStat ? 'TKSX' : 'KHSX'})`
        })
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: 'Lỗi khi đọc file Excel: ' + (err?.message || err)
        })
      } finally {
        loadingBarRef?.current?.complete?.()
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // Glide Data Grid cell getter
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
        const tag = isSaved ? '' : (val ? String(val).trim() : 'A')
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
    [currentColumns, sheetData, isSaved]
  )

  // Đóng an toàn
  const handleRequestClose = useCallback(() => {
    if (isSaving) return
    if (sheetData.length > 0 && !isSaved) {
      setConfirmModal({
        isOpen: true,
        type: 'unsaved',
        title: 'Xác nhận đóng cửa sổ',
        message: 'Dữ liệu vừa nạp từ Excel chưa được Lưu vào hệ thống.',
        subMessage: 'Nếu bạn đóng bây giờ, toàn bộ dữ liệu này sẽ bị mất. Bạn có chắc chắn muốn đóng không?',
        confirmText: 'Đồng ý đóng',
        cancelText: 'Tiếp tục xem',
        confirmVariant: 'danger',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          setSheetData([])
          if (onClose) onClose()
        }
      })
    } else {
      if (onClose) onClose()
    }
  }, [isSaving, sheetData.length, isSaved, onClose])

  // Xác nhận lưu
  const handleConfirmSave = () => {
    if (isSaved) {
      setStatusMessage?.({
        type: 'info',
        text: 'Bản ghi đăng ký này đã được lưu thành công trên hệ thống.'
      })
      return
    }

    if (sheetData.length === 0) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Vui lòng nạp file Excel dữ liệu trước khi bấm Lưu!'
      })
      return
    }

    setConfirmModal({
      isOpen: true,
      type: 'warning',
      title: 'Xác nhận đăng ký dữ liệu',
      message: `Hệ thống sẽ lưu ${sheetData.length.toLocaleString('vi-VN')} dòng dữ liệu ${reportType === 'statistics' ? 'TKSX' : 'KHSX'} vào cơ sở dữ liệu.`,
      subMessage: 'Sau khi lưu, thông tin đăng ký sẽ được khóa lại không cho chỉnh sửa. Bạn có chắc chắn muốn lưu không?',
      confirmText: 'Đồng ý lưu',
      cancelText: 'Hủy bỏ',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        await executeSave()
      }
    })
  }

  // Thực thi lưu theo Batch & Khóa chuột
  const executeSave = async () => {
    setIsSaving(true)
    setSaveProgress({ current: 0, total: sheetData.length, percent: 0 })
    loadingBarRef?.current?.continuousStart?.()
    setStatusMessage?.({
      type: 'info',
      text: 'Đang lưu đăng ký và đồng bộ dữ liệu vào hệ thống...'
    })

    try {
      const payload = {
        FactoryCode: factoryCode,
        FactoryName: factoryName,
        ReportType: reportType,
        ApplyDate: applyDate,
        TotalRows: sheetData.length,
        Remark: remark,
        SheetData: sheetData
      }

      const res = await savePlanRegistration(payload, null, (progress) => {
        setSaveProgress(progress)
        setStatusMessage?.({
          type: 'info',
          text: `Đang lưu dữ liệu: ${progress.current.toLocaleString('vi-VN')} / ${progress.total.toLocaleString('vi-VN')} dòng (${progress.percent}%)...`
        })
      })

      const masterData = res?.data || res
      const savedRegCode = masterData?.RegCode || masterData?.regCode || res?.RegCode || res?.regCode
      if (res && (res.success || savedRegCode)) {
        setRegCode(savedRegCode || 'Thành công')
        setIsSaved(true)
        setSheetData((prev) => prev.map((r) => ({ ...r, WorkingTag: '' })))

        setStatusMessage?.({
          type: 'success',
          text: `Đã lưu thành công đợt đăng ký: ${savedRegCode || ''} (${sheetData.length.toLocaleString('vi-VN')} dòng) - Đã khóa bản ghi.`
        })

        if (onSaveSuccess) {
          onSaveSuccess(res)
        }
      } else {
        throw new Error(res?.message || 'Không thể lưu đợt đăng ký!')
      }
    } catch (err) {
      setStatusMessage?.({
        type: 'error',
        text: 'Lỗi khi lưu đăng ký báo cáo: ' + (err?.message || err)
      })
    } finally {
      setIsSaving(false)
      loadingBarRef?.current?.complete?.()
    }
  }

  usePageHotkeys({
    onSave: () => {
      if (!isSaving && !isSaved) {
        handleConfirmSave()
      }
    }
  })

  return (
    <div className="flex flex-col h-full w-full bg-white text-slate-800 font-sans select-none antialiased overflow-hidden relative">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between px-2 h-7 min-h-[28px] border-b border-slate-200 bg-[#F8F9FA] shrink-0">
        <div className="flex items-center gap-1">
          <Button
            key="SaveData"
            icon={<SaveOutlined className={isSaved ? 'text-slate-400' : 'text-green-500'} style={{ fontSize: '12px' }} />}
            size="small"
            loading={isSaving}
            onClick={handleConfirmSave}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
            color="default"
            variant="link"
            disabled={sheetData.length === 0 || isSaving || isSaved}
            title={isSaved ? 'Đã lưu thành công và khóa dữ liệu' : 'Lưu toàn bộ dữ liệu đăng ký vào hệ thống (Ctrl+S)'}
          >
            {isSaved ? 'ĐÃ LƯU' : 'LƯU'}
          </Button>

          <Upload beforeUpload={handleUploadExcel} showUploadList={false} disabled={isSaved}>
            <Button
              key="UploadExcel"
              icon={<FileExcelOutlined className={isSaved ? 'text-slate-400' : 'text-emerald-600'} style={{ fontSize: '12px' }} />}
              size="small"
              className={`uppercase text-[10px] whitespace-nowrap font-medium ${isSaved ? 'text-slate-400' : 'text-emerald-700 hover:text-emerald-800'}`}
              style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
              color="default"
              variant="link"
              disabled={isSaved}
              title={isSaved ? 'Bản ghi đã lưu, không thể nạp đè' : 'Chọn file Excel để nạp mới dữ liệu'}
            >
              NẠP EXCEL
            </Button>
          </Upload>

          <Button
            key="ResetAll"
            icon={<ReloadOutlined className={isSaved ? 'text-slate-400' : 'text-amber-500'} style={{ fontSize: '12px' }} />}
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
                    setIsSaved(false)
                    setRegCode('')
                    setSelection({
                      columns: CompactSelection.empty(),
                      rows: CompactSelection.empty()
                    })
                    setStatusMessage?.({
                      type: 'info',
                      text: 'Đã xóa sạch dữ liệu trên bảng.'
                    })
                  }
                })
              }
            }}
            className="uppercase text-[10px] whitespace-nowrap font-medium"
            style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
            color="default"
            variant="link"
            disabled={sheetData.length === 0 || isSaved}
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
            style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
            color="default"
            variant="link"
            title="Đóng cửa sổ"
          >
            ĐÓNG
          </Button>
        </div>
      </div>

      {/* Query Header Form */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 w-full border-b border-slate-200 bg-white">
          {/* Ô 1: Mã đăng ký */}
          <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
            <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
              <span>Mã đăng ký</span>
            </div>
            <div className="flex-1 h-full flex items-center px-2 bg-slate-50/40">
              {regCode ? (
                <span className="text-xs font-mono font-bold text-indigo-700 truncate">
                  {regCode}
                </span>
              ) : (
                <span className="text-xs font-mono font-medium text-slate-400 italic truncate">
                  [Hệ thống tự sinh khi lưu]
                </span>
              )}
            </div>
          </div>

          {/* Ô 2: Loại báo cáo */}
          <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
            <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[100px] select-none">
              <span>Loại báo cáo</span>
              {!isSaved && <span className="text-red-500 ml-0.5">*</span>}
            </div>
            <div className="flex-1 h-full flex items-center px-1">
              <Select
                size="small"
                variant="borderless"
                value={reportType}
                disabled={isSaved}
                onChange={handleReportTypeChange}
                className="w-full text-xs font-medium"
                options={[
                  { value: 'statistics', label: 'Thống kê sản xuất (TKSX)' },
                  { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' }
                ]}
              />
            </div>
          </div>

          {/* Ô 3: Nhà máy SX */}
          <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
            <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
              <span>Nhà máy SX</span>
              {!isSaved && <span className="text-red-500 ml-0.5">*</span>}
            </div>
            <div className="flex-1 h-full flex items-center px-1">
              <Select
                size="small"
                variant="borderless"
                value={factoryCode}
                disabled={isSaved}
                onChange={handleFactoryChange}
                className="w-full text-xs font-medium"
                options={[
                  { value: 'GS1', label: 'GS1 - GS1 Hà Nội' },
                  { value: 'GS5', label: 'GS5 - GS5 Quế Võ 1B' }
                ]}
              />
            </div>
          </div>

          {/* Ô 4: Ngày báo cáo */}
          <div className="flex items-center h-[28px] bg-white min-w-0">
            <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[95px] select-none">
              <span>Ngày báo cáo</span>
              {!isSaved && <span className="text-red-500 ml-0.5">*</span>}
            </div>
            <div className="flex-1 h-full flex items-center px-1">
              <Input
                type="date"
                size="small"
                variant="borderless"
                value={applyDate}
                disabled={isSaved}
                onChange={(e) => setApplyDate(e.target.value)}
                className="text-xs font-mono font-medium !p-0"
              />
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="flex items-center h-[28px] bg-white min-w-0 w-full">
          <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
            <span>Ghi chú</span>
          </div>
          <div className="flex-1 h-full flex items-center px-1.5">
            <Input
              size="small"
              variant="borderless"
              value={remark}
              disabled={isSaved}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={isSaved ? '' : "Nhập ghi chú chi tiết cho đợt đăng ký dữ liệu báo cáo..."}
              className="text-xs !p-0"
            />
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="flex-1 w-full h-full min-h-0 bg-white flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between px-2 py-0.5 border-b border-slate-200 text-gray-900 select-none relative bg-white shrink-0">
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

      {/* WindowsConfirmModal */}
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

      {/* Lớp khóa chuột và màn hình toàn diện khi đang lưu dữ liệu */}
      {isSaving && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-wait select-none transition-all duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-inner relative">
              <Loader2 className="w-7 h-7 animate-spin" />
              <Lock className="w-3.5 h-3.5 absolute bottom-1 right-1 text-indigo-500" />
            </div>

            <h3 className="text-base font-bold text-slate-800 mb-1">
              Đang lưu và đồng bộ dữ liệu vào hệ thống...
            </h3>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Vui lòng giữ nguyên màn hình, không thao tác chuột hoặc đóng ứng dụng trong lúc hệ thống đang ghi dữ liệu.
            </p>

            {/* Thanh tiến trình Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${saveProgress.percent || 5}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-600">
              <span>
                {saveProgress.current.toLocaleString('vi-VN')} / {saveProgress.total.toLocaleString('vi-VN')} dòng
              </span>
              <span className="font-bold text-indigo-600">
                {saveProgress.percent}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
