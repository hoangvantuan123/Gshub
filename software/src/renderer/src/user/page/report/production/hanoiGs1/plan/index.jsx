/* eslint-disable react/prop-types */
import { useState, useMemo, useRef } from 'react'
import { Table, Button, Input, Select, Tag, Progress, Badge, message } from 'antd'
import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DataPageContainer from '../../../../../components/layout/DataPageContainer'
import { initialHanoiGs1Plans, exportToExcel } from '../../../common/reportUtils'

export default function HanoiGs1PlanPage() {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)

  const [dataSource, setDataSource] = useState(initialHanoiGs1Plans)
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Filter logic
  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      const matchSearch =
        !searchText ||
        item.planNo.toLowerCase().includes(searchText.toLowerCase()) ||
        item.orderNo.toLowerCase().includes(searchText.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchText.toLowerCase()) ||
        item.itemName.toLowerCase().includes(searchText.toLowerCase())

      const matchPriority = selectedPriority === 'ALL' || item.priority === selectedPriority
      const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus

      return matchSearch && matchPriority && matchStatus
    })
  }, [dataSource, searchText, selectedPriority, selectedStatus])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalRequired = filteredData.reduce((acc, curr) => acc + (curr.requiredQty || 0), 0)
    const totalCompleted = filteredData.reduce((acc, curr) => acc + (curr.completedQty || 0), 0)
    const totalOrders = filteredData.length
    const urgentOrders = filteredData.filter((i) => i.priority === 'Khẩn cấp').length
    const avgProgress = totalRequired > 0 ? ((totalCompleted / totalRequired) * 100).toFixed(1) : 0

    return {
      totalRequired,
      totalCompleted,
      totalOrders,
      urgentOrders,
      avgProgress
    }
  }, [filteredData])

  const handleSearch = () => {
    setLoading(true)
    loadingBarRef.current?.continuousStart()
    setTimeout(() => {
      setLoading(false)
      loadingBarRef.current?.complete()
      message.success('Đã tải kế hoạch sản xuất GS1 Hà Nội')
    }, 400)
  }

  const handleReload = () => {
    setSearchText('')
    setSelectedPriority('ALL')
    setSelectedStatus('ALL')
    setDataSource(initialHanoiGs1Plans)
    message.info('Đã làm mới dữ liệu')
  }

  const handleExport = () => {
    exportToExcel(filteredData, 'BaoCao_KeHoach_SanXuat_GS1_HaNoi')
    message.success('Xuất file Excel thành công')
  }

  const handlePrint = () => {
    window.print()
  }

  // Table Columns
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 55,
      align: 'center',
      render: (_, __, index) => <span className="text-slate-500 text-xs">{index + 1}</span>
    },
    {
      title: 'Mã Kế Hoạch',
      dataIndex: 'planNo',
      key: 'planNo',
      width: 155,
      render: (text) => (
        <span className="font-semibold text-blue-600 font-mono text-xs hover:underline cursor-pointer">
          {text}
        </span>
      )
    },
    {
      title: 'Số Đơn Hàng (SO)',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 130,
      render: (text) => <span className="font-mono text-slate-700 text-xs">{text}</span>
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customer',
      key: 'customer',
      width: 220,
      render: (text) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-800 font-medium truncate">
          <Building2 size={13} className="text-slate-400 shrink-0" />
          {text}
        </span>
      )
    },
    {
      title: 'Mặt Hàng / Sản Phẩm',
      dataIndex: 'itemName',
      key: 'itemName',
      render: (text, record) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800 text-xs">{text}</span>
          <span className="text-[11px] text-slate-400 font-mono">{record.itemCode}</span>
        </div>
      )
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 65,
      align: 'center',
      render: (text) => <span className="text-slate-600 text-xs">{text}</span>
    },
    {
      title: 'SL Kế Hoạch',
      dataIndex: 'requiredQty',
      key: 'requiredQty',
      width: 105,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-medium text-xs text-slate-800">
          {val?.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      title: 'Đã Sản Xuất',
      dataIndex: 'completedQty',
      key: 'completedQty',
      width: 105,
      align: 'right',
      render: (val) => (
        <span className="font-mono font-bold text-xs text-blue-600">
          {val?.toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      title: 'Tiến Độ SX',
      dataIndex: 'progressRate',
      key: 'progressRate',
      width: 140,
      render: (rate) => (
        <div className="flex items-center gap-2">
          <Progress
            percent={rate}
            size="small"
            status={rate >= 100 ? 'success' : 'active'}
            showInfo={false}
            strokeWidth={6}
            className="flex-1 m-0"
          />
          <span className="text-[11px] font-bold text-slate-700 font-mono">{rate}%</span>
        </div>
      )
    },
    {
      title: 'Ngày Bắt Đầu',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 95,
      align: 'center',
      render: (text) => <span className="text-slate-600 text-xs">{text}</span>
    },
    {
      title: 'Hạn Giao (Due Date)',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 105,
      align: 'center',
      render: (text) => (
        <span className="text-rose-600 font-medium text-xs flex items-center justify-center gap-1">
          <Clock size={12} />
          {text}
        </span>
      )
    },
    {
      title: 'Tình Trạng Vật Tư',
      dataIndex: 'materialStatus',
      key: 'materialStatus',
      width: 180,
      render: (text) => (
        <span
          className={`text-xs ${
            text.includes('Chờ') || text.includes('Thiếu')
              ? 'text-amber-600 font-medium'
              : 'text-emerald-700'
          }`}
        >
          {text}
        </span>
      )
    },
    {
      title: 'Ưu Tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 95,
      align: 'center',
      render: (priority) => (
        <Tag color={priority === 'Khẩn cấp' ? 'error' : priority === 'Cao' ? 'warning' : 'default'}>
          {priority}
        </Tag>
      )
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'Đang sản xuất' ? 'processing' : 'default'}>{status}</Tag>
      )
    }
  ]

  const actionsNode = (
    <div className="flex items-center justify-between w-full py-0.5">
      <div className="flex items-center gap-2">
        <Button
          icon={<Search size={14} className="text-blue-500" />}
          size="small"
          onClick={handleSearch}
          className="uppercase text-[11px] font-medium flex items-center gap-1.5"
          color="default"
          variant="link"
        >
          {t('TÌM KIẾM (F2)')}
        </Button>
        <Button
          icon={<FileSpreadsheet size={14} className="text-emerald-500" />}
          size="small"
          onClick={handleExport}
          className="uppercase text-[11px] font-medium flex items-center gap-1.5"
          color="default"
          variant="link"
        >
          {t('XUẤT EXCEL')}
        </Button>
        <Button
          icon={<Printer size={14} className="text-indigo-500" />}
          size="small"
          onClick={handlePrint}
          className="uppercase text-[11px] font-medium flex items-center gap-1.5"
          color="default"
          variant="link"
        >
          {t('IN KẾ HOẠCH')}
        </Button>
        <Button
          icon={<RotateCcw size={14} className="text-amber-500" />}
          size="small"
          onClick={handleReload}
          className="uppercase text-[11px] font-medium flex items-center gap-1.5"
          color="default"
          variant="link"
        >
          {t('LÀM MỚI')}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 pr-2">
        <Badge status="success" text="Kế hoạch sản xuất GS1 Hà Nội" />
      </div>
    </div>
  )

  const queryNode = (
    <div className="p-3 bg-white flex flex-col gap-3">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <div className="bg-slate-50 border border-slate-200/80 rounded p-2 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase font-semibold">
            Tổng Đơn Kế Hoạch
          </span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {metrics.totalOrders}{' '}
            <span className="text-xs font-normal text-slate-500">lệnh KH</span>
          </span>
        </div>
        <div className="bg-blue-50/60 border border-blue-200/80 rounded p-2 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-blue-600 uppercase font-semibold">Tổng SL Nhu Cầu</span>
          <span className="text-base font-bold text-blue-700 font-mono">
            {metrics.totalRequired.toLocaleString('vi-VN')}
          </span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded p-2 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-emerald-600 uppercase font-semibold">
            Đã Đáp Ứng / Sản Xuất
          </span>
          <span className="text-base font-bold text-emerald-700 font-mono">
            {metrics.totalCompleted.toLocaleString('vi-VN')}
          </span>
        </div>
        <div className="bg-rose-50/60 border border-rose-200/80 rounded p-2 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-rose-600 uppercase font-semibold">Đơn Khẩn Cấp</span>
          <span className="text-base font-bold text-rose-700 font-mono">
            {metrics.urgentOrders} <span className="text-xs font-normal text-rose-500">đơn</span>
          </span>
        </div>
        <div className="bg-purple-50/60 border border-purple-200/80 rounded p-2 flex flex-col justify-between shadow-xs">
          <span className="text-[11px] text-purple-700 uppercase font-semibold">
            Tiến Độ Kế Hoạch Tổng
          </span>
          <span className="text-base font-bold text-purple-700 font-mono">
            {metrics.avgProgress}%
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Tìm kiếm kế hoạch (Mã KH / Khách hàng / Tên sản phẩm)
          </label>
          <Input
            size="small"
            placeholder="Nhập thông tin tìm kiếm..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Mức độ ưu tiên
          </label>
          <Select
            size="small"
            className="w-full"
            value={selectedPriority}
            onChange={setSelectedPriority}
            options={[
              { label: '--- Tất cả mức ưu tiên ---', value: 'ALL' },
              { label: 'Khẩn cấp', value: 'Khẩn cấp' },
              { label: 'Cao', value: 'Cao' },
              { label: 'Bình thường', value: 'Bình thường' }
            ]}
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Trạng thái tiến độ
          </label>
          <Select
            size="small"
            className="w-full"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { label: '--- Tất cả trạng thái ---', value: 'ALL' },
              { label: 'Đang sản xuất', value: 'Đang sản xuất' },
              { label: 'Chưa bắt đầu', value: 'Chưa bắt đầu' },
              { label: 'Hoàn thành', value: 'Hoàn thành' }
            ]}
          />
        </div>
      </div>
    </div>
  )

  const tableNode = (
    <div className="h-full flex flex-col p-2 bg-slate-50">
      <div className="bg-white rounded border border-slate-200 flex-1 overflow-hidden flex flex-col shadow-2xs">
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50', '100'],
            size: 'small',
            showTotal: (total) => `Tổng cộng: ${total} dòng kế hoạch SX`
          }}
          scroll={{ x: 1450, y: 'calc(100vh - 350px)' }}
          className="erp-report-table"
        />
      </div>
    </div>
  )

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      queryTitle="Báo Cáo Kế Hoạch Sản Xuất - Nhà Máy GS1 Hà Nội"
      actions={actionsNode}
      query={queryNode}
      table={tableNode}
    />
  )
}
