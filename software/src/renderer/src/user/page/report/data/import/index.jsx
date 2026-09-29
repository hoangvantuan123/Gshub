/* eslint-disable react/prop-types */
import { useState, useRef } from 'react'
import {
  Table,
  Button,
  Select,
  Upload,
  Tag,
  Tabs,
  Alert,
  message,
  Modal,
  Badge,
  Steps,
  Progress
} from 'antd'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Database,
  History,
  RotateCcw,
  FileText,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTranslation } from 'react-i18next'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import { initialImportLogs, exportToExcel } from '../../common/reportUtils'

const { Dragger } = Upload

const TARGET_MODULES = [
  {
    value: 'hanoi_gs1_stat',
    label: 'Báo cáo thống kê sản xuất - GS1 Hà Nội',
    templateColumns: [
      {
        docNo: 'LSX-HN-2026-0001',
        itemCode: 'BOX-IP16',
        itemName: 'Hộp IP16',
        unit: 'Chiếc',
        line: 'Offset 01',
        shift: 'Ca 1',
        planQty: 20000,
        actualQty: 20100,
        passQty: 19800,
        defectQty: 300,
        prodDate: '2026-09-29',
        supervisor: 'Nguyễn Văn A'
      }
    ]
  },
  {
    value: 'hanoi_gs1_plan',
    label: 'Báo cáo kế hoạch sản xuất - GS1 Hà Nội',
    templateColumns: [
      {
        planNo: 'KH-HN-2026-W39',
        orderNo: 'SO-2026-001',
        customer: 'Samsung VN',
        itemCode: 'BOX-IP16',
        itemName: 'Hộp IP16',
        unit: 'Chiếc',
        requiredQty: 50000,
        startDate: '2026-09-29',
        dueDate: '2026-10-05',
        materialStatus: 'Đã sẵn sàng',
        priority: 'Cao'
      }
    ]
  },
  {
    value: 'quevo_gs5_stat',
    label: 'Báo cáo thống kê sản xuất - GS5 Quế Võ 1B',
    templateColumns: [
      {
        docNo: 'LSX-GS5-2026-0001',
        itemCode: 'CTN-CANON',
        itemName: 'Thùng Canon',
        waveType: 'Sóng BC',
        unit: 'Thùng',
        line: 'Máy sóng 2.5m',
        shift: 'Ca 1',
        planQty: 30000,
        actualQty: 30500,
        passQty: 30000,
        defectM2: 500,
        prodDate: '2026-09-29',
        supervisor: 'Trần Văn B'
      }
    ]
  },
  {
    value: 'quevo_gs5_plan',
    label: 'Báo cáo kế hoạch sản xuất - GS5 Quế Võ 1B',
    templateColumns: [
      {
        planNo: 'KH-GS5-2026-W39',
        orderNo: 'SO-GS5-001',
        customer: 'Canon Quế Võ',
        itemCode: 'CTN-CANON',
        itemName: 'Thùng Canon',
        waveType: 'Sóng BC',
        unit: 'Thùng',
        requiredQty: 100000,
        startDate: '2026-09-29',
        dueDate: '2026-10-10',
        paperRollStatus: 'Đã sẵn sàng cuộn giấy',
        priority: 'Khẩn cấp'
      }
    ]
  }
]

export default function DataImportPage() {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)

  const [activeTab, setActiveTab] = useState('import')
  const [selectedTarget, setSelectedTarget] = useState('hanoi_gs1_stat')
  const [fileList, setFileList] = useState([])
  const [previewData, setPreviewData] = useState([])
  const [previewCols, setPreviewCols] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importLogs, setImportLogs] = useState(initialImportLogs)

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const targetObj = TARGET_MODULES.find((m) => m.value === selectedTarget)
    if (!targetObj) return

    exportToExcel(targetObj.templateColumns, `Mau_Import_${targetObj.value}`)
    message.success(`Đã tải file mẫu: ${targetObj.label}`)
  }

  // Handle file reading with xlsx
  const handleFileUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const workbook = XLSX.read(buffer, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

        if (jsonData.length === 0) {
          message.warning('File Excel không có dữ liệu')
          return
        }

        // Generate preview columns
        const keys = Object.keys(jsonData[0])
        const columns = keys.map((key) => ({
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
          render: (val) => <span className="text-xs">{String(val)}</span>
        }))

        setPreviewCols(columns)
        setPreviewData(jsonData.slice(0, 100)) // Preview up to 100 rows
        setFileList([file])
        message.success(`Đã đọc thành công ${jsonData.length} dòng dữ liệu từ file!`)
      } catch (err) {
        console.error('Lỗi khi đọc file Excel:', err)
        message.error('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!')
      }
    }
    reader.readAsBinaryString(file)
    return false // prevent default upload
  }

  // Execute Import
  const handleExecuteImport = () => {
    if (previewData.length === 0) {
      message.warning('Vui lòng tải file Excel lên trước khi thực hiện import!')
      return
    }

    setIsProcessing(true)
    loadingBarRef.current?.continuousStart()

    setTimeout(() => {
      setIsProcessing(false)
      loadingBarRef.current?.complete()

      const targetObj = TARGET_MODULES.find((m) => m.value === selectedTarget)
      const newLog = {
        id: `IMP-LOG-2026-${String(importLogs.length + 1).padStart(3, '0')}`,
        fileName: fileList[0]?.name || 'Import_Data.xlsx',
        targetModule: targetObj?.label || 'Dữ liệu sản xuất',
        targetKey: selectedTarget,
        totalRows: previewData.length,
        successRows: previewData.length,
        errorRows: 0,
        uploadedBy: 'Người dùng hiện tại',
        uploadTime: new Date().toLocaleString('vi-VN'),
        status: 'Thành công'
      }

      setImportLogs([newLog, ...importLogs])
      message.success(`Đã import thành công ${previewData.length} bản ghi vào hệ thống!`)
      setFileList([])
      setPreviewData([])
      setPreviewCols([])
    }, 1200)
  }

  const handleClearPreview = () => {
    setFileList([])
    setPreviewData([])
    setPreviewCols([])
  }

  const actionsNode = (
    <div className="flex items-center justify-between w-full py-0.5">
      <div className="flex items-center gap-2">
        <Button
          icon={<Download size={14} className="text-blue-500" />}
          size="small"
          onClick={handleDownloadTemplate}
          className="uppercase text-[11px] font-medium flex items-center gap-1.5"
          color="default"
          variant="link"
        >
          {t('TẢI FILE MẪU EXCEL')}
        </Button>
        {previewData.length > 0 && (
          <Button
            icon={<CheckCircle2 size={14} className="text-emerald-500" />}
            size="small"
            onClick={handleExecuteImport}
            loading={isProcessing}
            className="uppercase text-[11px] font-bold text-emerald-700 flex items-center gap-1.5"
            color="default"
            variant="link"
          >
            {t('XÁC NHẬN IMPORT LÊN HỆ THỐNG')}
          </Button>
        )}
        {previewData.length > 0 && (
          <Button
            icon={<Trash2 size={14} className="text-rose-500" />}
            size="small"
            onClick={handleClearPreview}
            className="uppercase text-[11px] font-medium flex items-center gap-1.5"
            color="default"
            variant="link"
          >
            {t('XÓA XEM TRƯỚC')}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 pr-2">
        <Badge status="processing" text="Trung tâm quản lý & Import dữ liệu" />
      </div>
    </div>
  )

  const historyColumns = [
    {
      title: 'Mã Lô Import',
      dataIndex: 'id',
      key: 'id',
      width: 155,
      render: (text) => (
        <span className="font-mono font-semibold text-blue-600 text-xs">{text}</span>
      )
    },
    {
      title: 'Tên File Đã Tải Lên',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (text) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-medium">
          <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" />
          {text}
        </span>
      )
    },
    {
      title: 'Phân Hệ / Đích Nhập Liệu',
      dataIndex: 'targetModule',
      key: 'targetModule',
      render: (text) => <span className="text-xs text-slate-700">{text}</span>
    },
    {
      title: 'Tổng Số Dòng',
      dataIndex: 'totalRows',
      key: 'totalRows',
      width: 110,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs text-slate-800 font-bold">
          {val?.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      title: 'Dòng Hợp Lệ',
      dataIndex: 'successRows',
      key: 'successRows',
      width: 110,
      align: 'right',
      render: (val) => (
        <span className="font-mono text-xs text-emerald-600 font-bold">
          {val?.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      title: 'Lỗi',
      dataIndex: 'errorRows',
      key: 'errorRows',
      width: 80,
      align: 'right',
      render: (val) => (
        <span
          className={`font-mono text-xs ${val > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}
        >
          {val}
        </span>
      )
    },
    {
      title: 'Người Tải Lên',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 170,
      render: (text) => <span className="text-xs text-slate-600">{text}</span>
    },
    {
      title: 'Thời Gian',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 140,
      align: 'center',
      render: (text) => <span className="text-xs text-slate-500">{text}</span>
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'Thành công' ? 'success' : 'warning'}>{status}</Tag>
      )
    }
  ]

  const queryNode = (
    <div className="p-3 bg-white flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            1. Chọn đích phân hệ dữ liệu cần Import lên hệ thống:
          </label>
          <Select
            size="middle"
            className="w-full"
            value={selectedTarget}
            onChange={(val) => {
              setSelectedTarget(val)
              handleClearPreview()
            }}
            options={TARGET_MODULES}
          />
        </div>

        <div>
          <Button
            icon={<Download size={14} />}
            type="dashed"
            className="w-full flex items-center justify-center gap-1 text-xs"
            onClick={handleDownloadTemplate}
          >
            Tải mẫu Excel chuẩn
          </Button>
        </div>
      </div>
    </div>
  )

  const tableNode = (
    <div className="h-full flex flex-col p-2 bg-slate-50 overflow-hidden">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="small"
        className="erp-report-tabs h-full flex flex-col"
        items={[
          {
            key: 'import',
            label: (
              <span className="flex items-center gap-1.5 text-xs">
                <UploadCloud size={14} />
                <span>Nạp Dữ Liệu Excel</span>
              </span>
            ),
            children: (
              <div className="h-full flex flex-col gap-3 bg-white p-3 rounded border border-slate-200 overflow-y-auto">
                {/* Drag and Drop Box */}
                <Dragger
                  beforeUpload={handleFileUpload}
                  fileList={fileList}
                  onRemove={handleClearPreview}
                  maxCount={1}
                  accept=".xlsx, .xls, .csv"
                  className="bg-slate-50/60 p-4 border-dashed border-2 border-slate-300 rounded hover:border-blue-500 transition-colors"
                >
                  <p className="ant-upload-drag-icon flex justify-center mb-1">
                    <UploadCloud size={36} className="text-blue-500" />
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    Kéo thả file Excel vào đây hoặc nhấp chuột để chọn file từ máy tính
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ định dạng: .xlsx, .xls, .csv (Hệ thống tự động đọc và kiểm tra tính hợp
                    lệ dữ liệu)
                  </p>
                </Dragger>

                {/* Preview Table */}
                {previewData.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          Bảng xem trước dữ liệu nạp:
                        </span>
                        <Tag color="blue">{previewData.length} dòng</Tag>
                      </div>
                      <Button
                        type="primary"
                        icon={<CheckCircle2 size={14} />}
                        onClick={handleExecuteImport}
                        loading={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                      >
                        Nạp Dữ Liệu Ngay
                      </Button>
                    </div>

                    <div className="border border-slate-200 rounded overflow-hidden">
                      <Table
                        dataSource={previewData}
                        columns={previewCols}
                        rowKey={(rec, idx) => idx}
                        size="small"
                        pagination={{ pageSize: 10, size: 'small' }}
                        scroll={{ x: 1000, y: 280 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'history',
            label: (
              <span className="flex items-center gap-1.5 text-xs">
                <History size={14} />
                <span>Lịch Sử Import Dữ Liệu</span>
              </span>
            ),
            children: (
              <div className="h-full bg-white p-2 rounded border border-slate-200 overflow-hidden">
                <Table
                  dataSource={importLogs}
                  columns={historyColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, size: 'small' }}
                  scroll={{ x: 1100, y: 'calc(100vh - 360px)' }}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  )

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      queryTitle="Quản Lý Dữ Liệu & Nạp (Import) Dữ Liệu Báo Cáo"
      actions={actionsNode}
      query={queryNode}
      table={tableNode}
    />
  )
}
