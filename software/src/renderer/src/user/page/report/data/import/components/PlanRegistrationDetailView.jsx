/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Button } from 'antd'
import { SearchOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import { Layers } from 'lucide-react'

import { usePageHotkeys } from '../../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../../hooks/usePagePermissions'
import { usePageData } from '../../../../../../context/PageDataContext'
import DataPageContainer from '../../../../../components/layout/DataPageContainer'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

import { usePlanImportColumns } from '../plan/columns/planImportColumns'
import { useStatisticsImportColumns } from '../statistics/columns/statisticsImportColumns'
import PlanImportTable from '../plan/components/PlanImportTable'
import StatisticsImportTable from '../statistics/components/StatisticsImportTable'
import {
  queryPlanMaster,
  queryPlanDetail,
  queryProdStatsDetail
} from '../services/planRegistrationService'

export default function PlanRegistrationDetailView({ permissions, ...restProps }) {
  const { regCode } = useParams()
  const { t } = useTranslation()
  const { setStatusMessage, setPageData } = usePageData() || {}
  const loadingBarRef = useRef(null)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_data_import',
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canView: true,
    ...restProps
  })

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

  const [gridData, setGridData] = useState([])
  const [numRows, setNumRows] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  const isStat = masterInfo?.ReportType === 'statistics' || masterInfo?.ReportType === 'tksx'

  // Columns definition (All READ-ONLY)
  const rawPlanCols = usePlanImportColumns()
  const rawStatCols = useStatisticsImportColumns()

  const readOnlyPlanCols = useMemo(() => {
    return rawPlanCols.map((c) => ({ ...c, readonly: true, isReadOnly: true }))
  }, [rawPlanCols])

  const readOnlyStatCols = useMemo(() => {
    return rawStatCols.map((c) => ({ ...c, readonly: true, isReadOnly: true }))
  }, [rawStatCols])

  const defaultCols = isStat ? readOnlyStatCols : readOnlyPlanCols
  const [cols, setCols] = useState(defaultCols)

  useEffect(() => {
    setCols(isStat ? readOnlyStatCols : readOnlyPlanCols)
  }, [isStat, readOnlyPlanCols, readOnlyStatCols])

  // Search Filter State (Dynamic Query Bar)
  const [searchValues, setSearchValues] = useState(() => {
    let initialMaster = null
    try {
      const cached =
        sessionStorage.getItem(`master_info_${regCode}`) ||
        localStorage.getItem(`master_info_${regCode}`)
      if (cached) initialMaster = JSON.parse(cached)
    } catch {}

    return {
      FactoryName: initialMaster?.FactoryName || 'GS1 Hà Nội',
      ReportType:
        initialMaster?.ReportType ||
        (regCode?.toLowerCase()?.includes('tksx') ? 'statistics' : 'plan'),
      RegCode: initialMaster?.RegCode || regCode || '',
      ApplyDate: initialMaster?.ApplyDate || '',
      Status: initialMaster?.Status || 'published',
      ItemCode: '',
      MachineName: '',
      OperationNo: '',
      OpDate: '',
      Shift: '',
      TeamName: '',
      RoutingDocNo: ''
    }
  })

  const [dynamicQueryFields, setDynamicQueryFields] = useState([])
  const originalDataRef = useRef([])

  // ── 1. Tải thông tin Master và Danh sách Chi tiết từ Database ──
  const fetchDetailData = useCallback(async () => {
    if (!regCode) return
    loadingBarRef.current?.continuousStart?.()
    try {
      // 1. Lấy thông tin Master từ Database
      const masterRes = await queryPlanMaster({ RegCode: regCode })
      const masterList = masterRes?.data || []
      const currentMaster =
        masterList.find((m) => m.RegCode === regCode) || masterList[0] || masterInfo || null

      if (currentMaster) {
        setMasterInfo(currentMaster)
        try {
          sessionStorage.setItem(`master_info_${regCode}`, JSON.stringify(currentMaster))
        } catch {}

        setSearchValues((prev) => ({
          ...prev,
          FactoryName: currentMaster.FactoryName || prev.FactoryName || 'GS1 Hà Nội',
          ReportType: currentMaster.ReportType || prev.ReportType || 'plan',
          RegCode: currentMaster.RegCode || prev.RegCode || regCode || '',
          ApplyDate: currentMaster.ApplyDate || prev.ApplyDate || '',
          Status: currentMaster.Status || prev.Status || 'published'
        }))
      }

      const isCurrentStat =
        currentMaster?.ReportType === 'statistics' ||
        currentMaster?.ReportType === 'tksx' ||
        regCode.toLowerCase().includes('tksx')

      // 2. Lấy dữ liệu chi tiết tương ứng
      let detailList = []
      if (isCurrentStat) {
        const statRes = await queryProdStatsDetail({ RegCode: regCode })
        detailList = statRes?.data || []
      } else {
        const planRes = await queryPlanDetail({ RegCode: regCode })
        detailList = planRes?.data || []
      }

      // Xóa WorkingTag 'A' -> chuyển thành '' vì dữ liệu đã lưu trong DB chỉ xem
      const cleanList = detailList.map((row) => ({
        ...row,
        WorkingTag: ''
      }))

      originalDataRef.current = cleanList
      setGridData(cleanList)
      setNumRows(cleanList.length)

      setPageData?.((prev) => ({
        ...prev,
        total: cleanList.length,
        totalAll: cleanList.length,
        loadedCount: cleanList.length,
        totalColumns: isCurrentStat ? readOnlyStatCols.length : readOnlyPlanCols.length
      }))

      if (setStatusMessage) {
        setStatusMessage({
          type: 'success',
          text: `Đã nạp ${cleanList.length.toLocaleString('vi-VN')} dòng chi tiết cho đợt đăng ký ${regCode}`
        })
      }
    } catch (err) {
      console.error('Fetch detail error:', err)
      if (setStatusMessage) {
        setStatusMessage({
          type: 'error',
          text: 'Không thể tải dữ liệu chi tiết: ' + (err.message || err)
        })
      }
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [regCode, setPageData, setStatusMessage, readOnlyPlanCols.length, readOnlyStatCols.length])

  useEffect(() => {
    fetchDetailData()
  }, [fetchDetailData])

  // ── 2. Xử lý tìm kiếm trong bảng chi tiết ──
  const handleSearchData = useCallback(() => {
    const raw = originalDataRef.current || []
    let filtered = raw

    const ignoreKeys = new Set(['FactoryName', 'ReportType', 'RegCode', 'ApplyDate', 'Status'])

    Object.entries(searchValues).forEach(([key, val]) => {
      if (val && typeof val === 'string' && val.trim() !== '' && !ignoreKeys.has(key)) {
        const searchLower = val.trim().toLowerCase()
        filtered = filtered.filter((row) => {
          const rowVal = String(
            row[key] || row[key.charAt(0).toLowerCase() + key.slice(1)] || ''
          ).toLowerCase()
          return rowVal.includes(searchLower)
        })
      }
    })

    setGridData(filtered)
    setNumRows(filtered.length)
    setPageData?.((prev) => ({
      ...prev,
      total: filtered.length,
      loadedCount: filtered.length
    }))

    setStatusMessage?.({
      type: 'info',
      text: `Tìm thấy ${filtered.length.toLocaleString('vi-VN')} dòng dữ liệu phù hợp`
    })
  }, [searchValues, setPageData, setStatusMessage])

  // ── 3. Reset điều kiện tìm kiếm ──
  const onResetQuery = useCallback(() => {
    const emptyFilters = {
      FactoryName: masterInfo?.FactoryName || 'GS1 Hà Nội',
      ReportType: masterInfo?.ReportType || 'plan',
      RegCode: masterInfo?.RegCode || regCode || '',
      ApplyDate: masterInfo?.ApplyDate || '',
      Status: masterInfo?.Status || 'published',
      ItemCode: '',
      MachineName: '',
      OperationNo: '',
      OpDate: '',
      Shift: '',
      TeamName: '',
      RoutingDocNo: ''
    }
    setSearchValues(emptyFilters)
    const raw = originalDataRef.current || []
    setGridData(raw)
    setNumRows(raw.length)
    setStatusMessage?.({
      type: 'info',
      text: `Đã đặt lại bộ lọc. Hiển thị ${raw.length.toLocaleString('vi-VN')} dòng dữ liệu`
    })
  }, [masterInfo, regCode, setStatusMessage])

  // Dynamic Query Field Management
  const onAddQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => (prev.includes(fieldKey) ? prev : [...prev, fieldKey]))
  }, [])

  const onRemoveQueryField = useCallback((fieldKey) => {
    setDynamicQueryFields((prev) => prev.filter((k) => k !== fieldKey))
    setSearchValues((prev) => ({ ...prev, [fieldKey]: '' }))
  }, [])

  // ── 4. Xuất file Excel ──
  const handleExportExcel = useCallback(() => {
    if (!gridData || gridData.length === 0) {
      setStatusMessage?.({ type: 'warning', text: 'Không có dữ liệu để xuất file Excel' })
      return
    }

    const exportRows = gridData.map((row, idx) => {
      const cleanRow = { STT: idx + 1 }
      cols.forEach((c) => {
        if (c.id && c.title && c.id !== 'WorkingTag') {
          cleanRow[c.title] = row[c.id] || ''
        }
      })
      return cleanRow
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ChiTiet_DangKy')

    const filePrefix = isStat ? 'TKSX_ChiTiet' : 'KHSX_ChiTiet'
    const fileName = `${filePrefix}_${regCode || 'export'}_${Date.now()}.xlsx`
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' })
    saveAs(dataBlob, fileName)

    setStatusMessage?.({
      type: 'success',
      text: `Đã xuất ${gridData.length.toLocaleString('vi-VN')} dòng ra tệp ${fileName}`
    })
  }, [cols, gridData, isStat, regCode, setStatusMessage])

  usePageHotkeys({
    onSearch: handleSearchData
  })

  // Định nghĩa các trường QueryBar: Tích hợp đầy đủ thông tin Master và bộ lọc chi tiết
  const queryFieldDefinitions = useMemo(() => {
    const fields = [
      {
        key: 'FactoryName',
        label: t('report.factoryName', 'Nhà máy'),
        type: 'select',
        options: [
          { value: 'GS1 Hà Nội', label: 'GS1 Hà Nội' },
          { value: 'GS5 Quế Võ 1B', label: 'GS5 Quế Võ 1B' }
        ],
        disabled: true
      },
      {
        key: 'ReportType',
        label: t('report.reportType', 'Loại báo cáo'),
        type: 'select',
        options: [
          { value: 'plan', label: 'Kế hoạch sản xuất (KHSX)' },
          { value: 'statistics', label: 'Thống kê sản xuất (TKSX)' }
        ],
        disabled: true
      },
      {
        key: 'RegCode',
        label: t('report.regCode', 'Mã đợt đăng ký'),
        type: 'input',
        placeholder: 'Mã đăng ký...',
        disabled: true
      },
      {
        key: 'ApplyDate',
        label: t('report.applyDate', 'Ngày áp dụng'),
        type: 'date',
        disabled: true
      },
      {
        key: 'ItemCode',
        label: t('Mã sản phẩm / Mã hàng'),
        type: 'input',
        placeholder: 'Lọc mã sản phẩm...',
        defaultValue: ''
      },
      {
        key: 'MachineName',
        label: t('Máy sản xuất'),
        type: 'input',
        placeholder: 'Lọc tên / mã máy...',
        defaultValue: ''
      },
      {
        key: 'OperationNo',
        label: t('Số lệnh / Số CT'),
        type: 'input',
        placeholder: 'Lọc số lệnh...',
        defaultValue: ''
      }
    ]

    if (isStat) {
      fields.push(
        {
          key: 'Shift',
          label: t('Ca sản xuất'),
          type: 'input',
          placeholder: 'Nhập ca...',
          defaultValue: ''
        },
        {
          key: 'TeamName',
          label: t('Tổ sản xuất'),
          type: 'input',
          placeholder: 'Nhập tổ...',
          defaultValue: ''
        }
      )
    } else {
      fields.push(
        {
          key: 'OpDate',
          label: t('Ngày công đoạn'),
          type: 'input',
          placeholder: 'YYYY-MM-DD...',
          defaultValue: ''
        },
        {
          key: 'RoutingDocNo',
          label: t('Số chỉ thị (Routing)'),
          type: 'input',
          placeholder: 'Nhập số chỉ thị...',
          defaultValue: ''
        }
      )
    }

    return fields
  }, [isStat, t])

  const reportTitle = isStat
    ? `Chi tiết Thống kê Sản xuất (TKSX) - ${masterInfo?.RegCode || regCode}`
    : `Chi tiết Kế hoạch Sản xuất (KHSX) - ${masterInfo?.RegCode || regCode}`

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <div className="flex items-center justify-between w-full py-0.5 overflow-x-auto max-w-full">
          {/* Nút tác vụ chuẩn ERP */}
          <div className="flex items-center gap-1">
            <Button
              key="Search"
              icon={<SearchOutlined className="text-blue-500" style={{ fontSize: '12px' }} />}
              size="small"
              onClick={handleSearchData}
              className="uppercase text-[10px] whitespace-nowrap font-medium"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Tìm kiếm dữ liệu (Ctrl+Q)"
            >
              {t('TÌM KIẾM')}
            </Button>

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
              className="uppercase text-[10px] whitespace-nowrap font-medium"
              style={{ fontSize: '10px', padding: '2px 6px', height: '24px' }}
              color="default"
              variant="link"
              title="Xuất file Excel"
            >
              {t('XUẤT EXCEL')}
            </Button>
          </div>

          {/* Master Info Header Bar */}
          <div className="flex items-center gap-2 pr-2">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
              {masterInfo?.RegCode || regCode} • {masterInfo?.FactoryName || 'GS1 Hà Nội'} •{' '}
              {masterInfo?.ApplyDate || 'Ngày —'} •{' '}
              <span className="text-blue-600 font-semibold">
                {numRows.toLocaleString('vi-VN')} dòng (Chỉ xem)
              </span>
            </span>
          </div>
        </div>
      }
      query={
        <DynamicQueryBar
          fields={queryFieldDefinitions}
          values={searchValues}
          onChange={(newValues) => setSearchValues(newValues)}
          onSearch={handleSearchData}
          onReset={onResetQuery}
          dynamicFields={dynamicQueryFields}
          onAddField={onAddQueryField}
          onRemoveField={onRemoveQueryField}
        />
      }
      table={
        isStat ? (
          <StatisticsImportTable
            tableTitle={t(reportTitle)}
            cols={cols}
            setCols={setCols}
            defaultCols={readOnlyStatCols}
            gridData={gridData}
            setGridData={setGridData}
            numRows={numRows}
            setNumRows={setNumRows}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            onAddQueryField={onAddQueryField}
            canEdit={false}
            canCreate={false}
          />
        ) : (
          <PlanImportTable
            tableTitle={t(reportTitle)}
            cols={cols}
            setCols={setCols}
            defaultCols={readOnlyPlanCols}
            gridData={gridData}
            setGridData={setGridData}
            numRows={numRows}
            setNumRows={setNumRows}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            onAddQueryField={onAddQueryField}
            canEdit={false}
            canCreate={false}
          />
        )
      }
    />
  )
}
