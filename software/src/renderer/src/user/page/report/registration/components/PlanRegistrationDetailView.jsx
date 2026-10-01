/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input, Select } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  CloseOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import {
  Layers,
  Building2,
  Calendar,
  Database,
  Columns3,
  User,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

import { useStatisticsImportColumns } from '../statistics/columns/statisticsImportColumns'
import { usePlanImportColumns } from '../plan/columns/planImportColumns'
import {
  queryPlanMaster,
  queryPlanDetail,
  queryProdStatsDetail
} from '../services/planRegistrationService'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePageData } from '../../../../../context/PageDataContext'
import DataPageContainer from '../../../../components/layout/DataPageContainer'

export default function PlanRegistrationDetailView() {
  const { regCode } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setStatusMessage, setPageData } = usePageData() || {}
  const loadingBarRef = useRef(null)

  // ── Khởi tạo Master Data (ưu tiên lấy từ Cache storage cho tốc độ 0ms) ──
  const [masterInfo, setMasterInfo] = useState(() => {
    try {
      const cached =
        sessionStorage.getItem(`master_info_${regCode}`) ||
        localStorage.getItem(`master_info_${regCode}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  // ── Form Master Info States (giống 100% Form Đăng Ký) ──
  const [reportType, setReportType] = useState(() => {
    return (
      masterInfo?.ReportType ||
      (regCode?.toLowerCase()?.includes('tksx') ? 'statistics' : 'plan')
    )
  })
  const [factoryCode, setFactoryCode] = useState(() => masterInfo?.FactoryCode || 'GS1')
  const [factoryName, setFactoryName] = useState(() => masterInfo?.FactoryName || 'GS1 Hà Nội')
  const [applyDate, setApplyDate] = useState(() => masterInfo?.ApplyDate || '')
  const [remark, setRemark] = useState(() => masterInfo?.Remark || '')

  // ── Sheet Data State ──
  const [sheetData, setSheetData] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const gridRef = useRef(null)

  // ── Cột cấu hình (Toàn bộ là READ-ONLY, có thể chỉnh kích thước cột như Form đăng ký) ──
  const statColumns = useStatisticsImportColumns()
  const planColumns = usePlanImportColumns()
  const [columnWidths, setColumnWidths] = useState({})

  const currentColumns = useMemo(() => {
    const baseCols = reportType === 'statistics' ? statColumns : planColumns
    return baseCols.map((col) => ({
      ...col,
      readonly: true,
      isReadOnly: true,
      width: columnWidths[col.id] || col.width || 135
    }))
  }, [reportType, statColumns, planColumns, columnWidths])

  const onColumnResize = useCallback((column, newSize) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column.id]: newSize
    }))
  }, [])

  // ── Tải dữ liệu Master & Chi tiết từ Database ──
  const fetchDetailData = useCallback(async () => {
    if (!regCode) return
    loadingBarRef.current?.continuousStart?.()
    try {
      // 1. Tải Master
      const masterRes = await queryPlanMaster({ RegCode: regCode })
      const masterList = masterRes?.data || []
      const currentMaster =
        masterList.find((m) => m.RegCode === regCode) || masterList[0] || masterInfo || null

      if (currentMaster) {
        setMasterInfo(currentMaster)
        setReportType(currentMaster.ReportType || (regCode.includes('TKSX') ? 'statistics' : 'plan'))
        setFactoryCode(currentMaster.FactoryCode || 'GS1')
        setFactoryName(currentMaster.FactoryName || 'GS1 Hà Nội')
        setApplyDate(currentMaster.ApplyDate || '')
        setRemark(currentMaster.Remark || '')

        try {
          sessionStorage.setItem(`master_info_${regCode}`, JSON.stringify(currentMaster))
        } catch {}
      }

      const isStatType =
        currentMaster?.ReportType === 'statistics' ||
        currentMaster?.ReportType === 'tksx' ||
        regCode.toLowerCase().includes('tksx')

      // 2. Tải Detail
      let detailList = []
      if (isStatType) {
        const statRes = await queryProdStatsDetail({ RegCode: regCode })
        detailList = statRes?.data || []
      } else {
        const planRes = await queryPlanDetail({ RegCode: regCode })
        detailList = planRes?.data || []
      }

      // Xóa WorkingTag 'A' -> chuyển thành '' vì dữ liệu đã lưu trong DB
      const cleanList = detailList.map((row) => ({
        ...row,
        WorkingTag: ''
      }))

      setSheetData(cleanList)

      setPageData?.((prev) => ({
        ...prev,
        total: cleanList.length,
        totalAll: cleanList.length,
        loadedCount: cleanList.length,
        totalColumns: currentColumns.length,
        createdBy: currentMaster?.CreatedByName || currentMaster?.CreatedBy || '',
        createdAt: currentMaster?.CreatedAt ? new Date(currentMaster.CreatedAt).toLocaleDateString('vi-VN') : '',
        updatedBy: currentMaster?.UpdatedByName || currentMaster?.UpdatedBy || '',
        updatedAt: currentMaster?.UpdatedAt ? new Date(currentMaster.UpdatedAt).toLocaleDateString('vi-VN') : ''
      }))

      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp ${cleanList.length.toLocaleString('vi-VN')} dòng chi tiết cho đợt đăng ký ${regCode}`
      })
    } catch (err) {
      console.error('Fetch detail error:', err)
      setStatusMessage?.({
        type: 'error',
        text: 'Không thể tải dữ liệu chi tiết: ' + (err.message || err)
      })
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [regCode, setPageData, setStatusMessage, currentColumns.length])

  useEffect(() => {
    fetchDetailData()
  }, [fetchDetailData])

  // ── GLIDE GRID CELL GETTER (Giống 100% Form Đăng Ký) ──
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
        const tag = val ? String(val).trim() : ''
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

      if (col.kind === 'Number' || typeof val === 'number') {
        const numVal = Number(val) || 0
        return {
          kind: GridCellKind.Number,
          data: numVal,
          displayData: numVal.toLocaleString('vi-VN'),
          readonly: true,
          allowOverlay: false
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

  // ── Xuất file Excel ──
  const handleExportExcel = useCallback(() => {
    if (!sheetData || sheetData.length === 0) {
      setStatusMessage?.({ type: 'warning', text: 'Không có dữ liệu để xuất file Excel' })
      return
    }

    const exportRows = sheetData.map((row, idx) => {
      const cleanRow = { STT: idx + 1 }
      currentColumns.forEach((c) => {
        if (c.id && c.title && c.id !== 'WorkingTag') {
          cleanRow[c.title] = row[c.id] || ''
        }
      })
      return cleanRow
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ChiTiet_DangKy')

    const filePrefix = reportType === 'statistics' ? 'TKSX_ChiTiet' : 'KHSX_ChiTiet'
    const fileName = `${filePrefix}_${regCode || 'export'}_${Date.now()}.xlsx`
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' })
    saveAs(dataBlob, fileName)

    setStatusMessage?.({
      type: 'success',
      text: `Đã xuất ${sheetData.length.toLocaleString('vi-VN')} dòng ra tệp ${fileName}`
    })
  }, [currentColumns, sheetData, reportType, regCode, setStatusMessage])

  // Đóng cửa sổ
  const handleClose = useCallback(() => {
    if (window.electron?.closeChildWindow) {
      window.electron.closeChildWindow()
    } else if (window.opener) {
      window.close()
    } else {
      navigate('/erp/u/report/registration')
    }
  }, [navigate])

  usePageHotkeys({
    onSearch: fetchDetailData
  })

  const selectedRowCount = selection?.rows?.length || 0

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <div className="flex items-center justify-between w-full h-6 min-h-[24px] overflow-x-auto max-w-full">
          {/* Nút tác vụ chuẩn đồng bộ với Modal Đăng Ký */}
          <div className="flex items-center gap-1">
            <Button
              key="Reload"
              icon={<ReloadOutlined className="text-indigo-500" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={fetchDetailData}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-indigo-700 hover:text-indigo-800"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Tải lại dữ liệu từ hệ thống"
            >
              {t('TẢI LẠI')}
            </Button>

            <Button
              key="ExportExcel"
              icon={<FileExcelOutlined className="text-emerald-600" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={handleExportExcel}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-emerald-700 hover:text-emerald-800"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Xuất dữ liệu chi tiết ra Excel"
            >
              {t('XUẤT EXCEL')}
            </Button>

            <Button
              key="Close"
              icon={<CloseOutlined className="text-rose-500" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={handleClose}
              className="uppercase text-[10px] whitespace-nowrap font-medium text-rose-600 hover:text-rose-700"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Đóng cửa sổ"
            >
              {t('ĐÓNG')}
            </Button>
          </div>
        </div>
      }
      queryTitle="Thông tin đăng ký báo cáo"
      query={
        <div className="w-full bg-white">
          {/* 1. KHUNG THÔNG TIN MASTER ĐĂNG KÝ (GIỐNG 100% FORM ĐĂNG KÝ) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 w-full border-b border-slate-200 bg-white">
            {/* Ô 1: Mã đăng ký báo cáo */}
            <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
              <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[110px] select-none">
                <span>Mã đăng ký</span>
              </div>
              <div className="flex-1 h-full flex items-center px-2 bg-slate-50/40">
                <span className="text-xs font-mono font-bold text-indigo-700 truncate">
                  {masterInfo?.RegCode || regCode}
                </span>
              </div>
            </div>

            {/* Ô 2: Loại báo cáo */}
            <div className="flex items-center h-[28px] border-r border-slate-200 bg-white min-w-0">
              <div className="bg-slate-50 border-r border-slate-200 h-full flex items-center px-2.5 shrink-0 font-semibold text-[10px] text-slate-700 min-w-[100px] select-none">
                <span>Loại báo cáo</span>
              </div>
              <div className="flex-1 h-full flex items-center px-1">
                <Select
                  size="small"
                  variant="borderless"
                  value={reportType}
                  disabled={true}
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
              </div>
              <div className="flex-1 h-full flex items-center px-1">
                <Select
                  size="small"
                  variant="borderless"
                  value={factoryCode}
                  disabled={true}
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
              </div>
              <div className="flex-1 h-full flex items-center px-1">
                <Input
                  type="date"
                  size="small"
                  variant="borderless"
                  value={applyDate}
                  disabled={true}
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
                disabled={true}
                placeholder=""
                className="text-xs !p-0 text-slate-700"
              />
            </div>
          </div>
        </div>
      }
      table={
        <div className="flex-1 w-full h-full min-h-0 bg-white flex flex-col overflow-hidden relative">
          {/* Header bảng dữ liệu chi tiết (GIỐNG 100% FORM ĐĂNG KÝ) */}
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

          {/* Glide Data Grid Bảng dữ liệu */}
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
      }
    />
  )
}
