/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message, notification } from 'antd'

import { useDataGridSheet } from '../../../../hooks/useDataGridSheet'
import { usePageHotkeys } from '../../../../hooks/usePageHotkeys'
import { usePagePermissions } from '../../../../hooks/usePagePermissions'
import { usePageData } from '../../../../../context/PageDataContext'
import DataPageContainer from '../../../../components/layout/DataPageContainer'
import WindowsConfirmModal from '../../../../components/modal/WindowsConfirmModal'
import RoleGroupTable from '../../../system/roleGroup/components/RoleGroupTable'
import {
  queryProdStatsDetail,
  queryPlanDetail,
  queryPlanMaster
} from '../services/planRegistrationService'
import { queryProdMachineCatalogs } from '../machineCatalog/machineCatalogService'
import {
  buildMachineComparison,
  mapMasterFactoryToCatalogKey
} from '../../production/calcProduction/engine/machineComparison'
import { MACHINE_COMPARISON_COLUMN_SCHEMA } from '../../production/calcProduction/constants/calcConstants'
import { PROD_MACHINE_COLUMNS } from './columns/prodMachineColumns'
import ProdMachineActions from './components/ProdMachineActions'
import ProdMachineQuery from './components/ProdMachineQuery'
import AddProdMachineModal from './components/AddProdMachineModal'
import {
  deleteProdMachineRegistrations,
  queryProdMachineRegistrations,
  saveProdMachineRegistrations
} from './prodMachineService'

const rowsFrom = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  return []
}

const pageInfoFrom = (response) => {
  const raw = response?.pageInfo || response?.page || response?.raw?.pageInfo || {}
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const normalize = (value) => String(value ?? '').trim().toLocaleUpperCase('vi-VN')

const toTab7StatRow = (row, index) => ({
  ...row,
  SourceRow: Number(row.RowSeq || index + 1),
  StatSlipNo: row.StatSlipNo || row.StatTicketNo || '',
  StatDate: row.StatDate || '',
  OperationOrderNo: row.OperationOrderNo || row.OperationNo || '',
  StageOrderNo: row.StageOrderNo || '',
  OperationName: row.OperationName || row.OperationTypeName || row.OpTypeName || '',
  MaterialCode: row.MaterialCode || row.ItemCode || '',
  MaterialName: row.MaterialName || row.ItemName || '',
  ActualMachineCode: row.ActualMachineCode || row.MachineCode || '',
  ActualMachineName: row.ActualMachineName || row.MachineName || '',
  ProducedQty: row.ProducedQty || row.ProdQty || '',
  QualifiedQty: row.QualifiedQty || row.PassQty || ''
})

export default function ProdMachineRegistrationPage({
  permissions,
  canCreate,
  canDelete,
  canView,
  cancelAllRequests,
  ...restProps
}) {
  const { t } = useTranslation()
  const { setStatusMessage, setPageData } = usePageData() || {}
  const loadingBarRef = useRef(null)
  const [filters, setFilters] = useState({ TKSXRegCode: '', StatSlipNo: '' })
  const [isSourceData, setIsSourceData] = useState(false)
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [rowsToDelete, setRowsToDelete] = useState([])
  const hasMachineRegistrationPermission =
    Array.isArray(permissions) &&
    permissions.some((item) => {
      const menuKey = String(item?.MenuKey || item?.menuKey || item?.Key || '').trim().toLowerCase()
      return menuKey === 'report_prod_machine_registration'
    })
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: hasMachineRegistrationPermission
      ? 'report_prod_machine_registration'
      : 'report_registration',
    canCreate,
    canDelete,
    canView,
    ...restProps
  })
  const defaultCols = useMemo(() => PROD_MACHINE_COLUMNS, [])
  const { setGridData, setNumRows, resetTable, getSelectedRows, tableProps } =
    useDataGridSheet({
      storageKey: 'report_prod_machine_registration_tab7',
      defaultCols,
      canCreate: false,
      canView: pagePerms.canView,
      includeStatusColumn: false
    })
  const selectedRows = getSelectedRows()

  const setRows = useCallback(
    (rows) => {
      setGridData(rows)
      setNumRows(rows.length)
      resetTable?.()
      setPageData?.((previous) => ({
        ...previous,
        loadedCount: rows.length,
        total: rows.length,
        totalAll: rows.length,
        totalColumns: PROD_MACHINE_COLUMNS.length
      }))
    },
    [setGridData, setNumRows, resetTable, setPageData]
  )

  const handleOpenRegistration = useCallback(() => {
    if (!pagePerms.canCreate || !pagePerms.canSave) return
    setIsRegistrationModalOpen(true)
  }, [pagePerms.canCreate, pagePerms.canSave])

  const handleSearchData = useCallback(async (searchFilters = filters) => {
    if (!pagePerms.canSearch || !pagePerms.canView) return false
    loadingBarRef.current?.continuousStart?.()
    try {
      const effectiveFilters = searchFilters?.TKSXRegCode !== undefined ? searchFilters : filters
      const filtersForQuery = {
        pageSize: 1000,
        TKSXRegCode: String(effectiveFilters.TKSXRegCode || '').trim(),
        StatSlipNo: String(effectiveFilters.StatSlipNo || '').trim()
      }
      const firstPage = await queryProdMachineRegistrations({ ...filtersForQuery, page: 1 })
      const rows = rowsFrom(firstPage)
      const total = Number(pageInfoFrom(firstPage)?.total ?? rows.length)
      const totalPages = Math.ceil(total / filtersForQuery.pageSize)
      for (let page = 2; page <= totalPages; page++) {
        const nextPage = await queryProdMachineRegistrations({ ...filtersForQuery, page })
        rows.push(...rowsFrom(nextPage))
      }
      const displayRows = rows.map((row) => ({ ...row, WorkingTag: '' }))
      setRows(displayRows)
      setIsSourceData(false)
      setStatusMessage?.({
        type: 'success',
        text: `Đã truy vấn ${displayRows.length.toLocaleString('vi-VN')} dòng đăng ký máy.`
      })
      return true
    } catch (error) {
      setRows([])
      setIsSourceData(false)
      setStatusMessage?.({ type: 'error', text: error?.message || 'Không thể truy vấn đăng ký máy.' })
      return false
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [pagePerms.canSearch, pagePerms.canView, filters, setRows, setStatusMessage])

  const handleRegisterUploadedRows = useCallback(async ({ report, rows }) => {
    if (!pagePerms.canCreate || !pagePerms.canSave) {
      throw new Error('Bạn chưa có quyền đăng ký báo cáo máy.')
    }
    const reportCode = String(report?.RegCode || '').trim()
    const masterSeq = String(report?.IdSeq || '').trim()
    if (!reportCode || !masterSeq) throw new Error('Báo cáo TKSX thiếu mã hoặc khóa master.')
    const items = rows.map((row, index) => ({
      ...row,
      SourceRow: Number(row.SourceRow || index + 1),
      RowSeq: Number(row.RowSeq || row.SourceRow || index + 1),
      StatSlipNo: String(row.StatSlipNo || row.StatTicketNo || '').trim(),
      MasterSeq: masterSeq,
      TKSXMasterSeq: masterSeq,
      RegCode: reportCode,
      TKSXRegCode: reportCode
    }))
    if (!items.length) throw new Error('Không có dòng Tab 7 nào thuộc các phiếu đã chọn.')
    if (items.some((row) => !row.StatSlipNo || !Number(row.SourceRow))) {
      throw new Error('Dữ liệu Tab 7 có dòng thiếu số phiếu thống kê hoặc dòng nguồn.')
    }
    loadingBarRef.current?.continuousStart?.()
    try {
      for (let offset = 0; offset < items.length; offset += 1000) {
        const result = await saveProdMachineRegistrations({
          TKSXRegCode: reportCode,
          TKSXMasterSeq: masterSeq,
          items: items.slice(offset, offset + 1000)
        })
        if (result?.success === false) {
          throw new Error(result?.message || 'Lưu đăng ký máy không thành công.')
        }
      }
      setFilters((previous) => ({ ...previous, TKSXRegCode: reportCode, StatSlipNo: '' }))
      const refreshed = await handleSearchData({ TKSXRegCode: reportCode, StatSlipNo: '' })
      setStatusMessage?.({
        type: refreshed ? 'success' : 'warning',
        text: refreshed
          ? `Đã đăng ký ${items.length.toLocaleString('vi-VN')} dòng Tab 7 cho báo cáo TKSX ${reportCode}.`
          : `Đã lưu ${items.length.toLocaleString('vi-VN')} dòng vào ${reportCode}, nhưng không thể làm mới danh sách.`
      })
    } catch (error) {
      setStatusMessage?.({ type: 'error', text: error?.message || 'Không thể đăng ký báo cáo máy.' })
      throw error
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [pagePerms.canCreate, pagePerms.canSave, handleSearchData, setStatusMessage])

  const handleLoadStatistics = useCallback(async () => {
    const reportCode = String(filters.TKSXRegCode || '').trim()
    if (!pagePerms.canCreate || !reportCode) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Nhập mã báo cáo TKSX trước khi nạp danh sách phiếu thống kê.'
      })
      return
    }
    loadingBarRef.current?.continuousStart?.()
    try {
      const [masterResponse, firstStatsResponse] = await Promise.all([
        queryPlanMaster({ RegCode: reportCode, page: 1, pageSize: 100 }),
        queryProdStatsDetail({ RegCode: reportCode, page: 1, pageSize: 10000 })
      ])
      const matchingMasters = rowsFrom(masterResponse).filter(
        (item) => normalize(item.RegCode) === normalize(reportCode)
      )
      const master = matchingMasters.find((item) =>
        ['STATISTICS', 'TKSX'].includes(normalize(item.ReportType))
      )
      const stats = rowsFrom(firstStatsResponse).filter(
        (item) => normalize(item.RegCode) === normalize(reportCode)
      )
      const statsTotal = Number(pageInfoFrom(firstStatsResponse)?.total ?? stats.length)
      const statsPages = Math.ceil(statsTotal / 10000)
      for (let page = 2; page <= statsPages; page++) {
        const nextPage = await queryProdStatsDetail({ RegCode: reportCode, page, pageSize: 10000 })
        stats.push(
          ...rowsFrom(nextPage).filter((item) => normalize(item.RegCode) === normalize(reportCode))
        )
      }
      if (!master) throw new Error(`Không tìm thấy báo cáo TKSX ${reportCode}.`)
      const slipFilter = normalize(filters.StatSlipNo)
      const filteredStats = slipFilter
        ? stats.filter((row) => normalize(row.StatTicketNo || row.StatSlipNo).includes(slipFilter))
        : stats
      if (!filteredStats.length) throw new Error(`Không tìm thấy phiếu thống kê phù hợp trong ${reportCode}.`)

      let plans = []
      let khsxRegCode = ''
      let khsxMasterSeq = ''
      const factoryCode = master.FactoryCode || ''
      const factoryName = master.FactoryName || factoryCode
      if (factoryCode && master.ApplyDate) {
        const planMasterResponse = await queryPlanMaster({
          FactoryCodeExact: factoryCode,
          ApplyDate: master.ApplyDate || '',
          ReportType: 'plan',
          page: 1,
          pageSize: 100
        })
        const planMaster = rowsFrom(planMasterResponse)[0]
        if (planMaster?.RegCode) {
          khsxRegCode = planMaster.RegCode
          khsxMasterSeq = planMaster.IdSeq || ''
          const planDetailResponse = await queryPlanDetail({
            RegCode: planMaster.RegCode,
            page: 1,
            pageSize: 10000
          })
          plans = rowsFrom(planDetailResponse)
        }
      }

      const catalogResponse = await queryProdMachineCatalogs({
        IsActive: 'true',
        page: 1,
        pageSize: 1000
      })
      if (catalogResponse?.success === false) {
        throw new Error(catalogResponse?.message || 'Không thể truy vấn danh mục máy theo nhà máy.')
      }
      const targetFactoryKey = normalize(mapMasterFactoryToCatalogKey(factoryName))
      const allCatalogMachines = rowsFrom(catalogResponse)
      const catalogMachines = allCatalogMachines.filter((machine) => {
        const rawFactory = String(machine.Factory || machine.FactoryName || '').trim()
        if (!rawFactory) return true
        if (!targetFactoryKey) return false
        const factoryKey = normalize(mapMasterFactoryToCatalogKey(rawFactory))
        if (
          factoryKey === targetFactoryKey ||
          factoryKey === normalize(factoryName) ||
          factoryKey.includes(targetFactoryKey) ||
          targetFactoryKey.includes(factoryKey)
        ) {
          return true
        }
        if (targetFactoryKey.startsWith('GS5')) {
          return factoryKey.includes('GS5') || factoryKey.includes('QUẾ VÕ')
        }
        if (targetFactoryKey === 'GS1') {
          return factoryKey.includes('GS1') || factoryKey.includes('HÀ NỘI') || factoryKey.includes('HN')
        }
        return false
      })
      if (!catalogMachines.length) {
        throw new Error(`Nhà máy ${factoryName || factoryCode} chưa có danh mục máy đang sử dụng.`)
      }

      const catalogByName = new Map(
        catalogMachines.map((machine) => [normalize(machine.MachineName), machine])
      )
      const planRows = plans.map((plan) => {
        const machineName = plan.MachineName || ''
        const catalogMachine = catalogByName.get(normalize(machineName))
        return {
          ...plan,
          OperationOrderNo: plan.OperationNo || '',
          OperationName: plan.OperationName || plan.OpTypeName || '',
          PlannedMachineCode: catalogMachine?.MachineCode || '',
          PlannedMachineName: machineName,
          DeclaredMachines: machineName
            ? [{ code: catalogMachine?.MachineCode || '', name: machineName }]
            : []
        }
      })
      const tab7Rows = buildMachineComparison(
        filteredStats.map(toTab7StatRow),
        planRows,
        [],
        { factoryName, catalogMachines }
      ).map((row, index) => ({
        ...row,
        SourceRow: Number(filteredStats[index]?.RowSeq || row.SourceRow || index + 1),
        MasterSeq: khsxMasterSeq || master.IdSeq,
        TKSXMasterSeq: master.IdSeq,
        RegCode: khsxRegCode || master.RegCode || reportCode,
        TKSXRegCode: reportCode,
        RowSeq: Number(filteredStats[index]?.RowSeq || index + 1),
        WorkingTag: ''
      }))

      setRows(tab7Rows)
      setIsSourceData(true)
      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp ${tab7Rows.length.toLocaleString('vi-VN')} dòng từ báo cáo TKSX ${reportCode}. Chọn phiếu cần đăng ký rồi lưu.`
      })
    } catch (error) {
      setRows([])
      setIsSourceData(false)
      setStatusMessage?.({
        type: 'error',
        text: error?.message || 'Không thể nạp danh sách phiếu thống kê.'
      })
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [pagePerms.canCreate, filters.TKSXRegCode, filters.StatSlipNo, setRows, setStatusMessage])

  const handleRegister = useCallback(async () => {
    if (!pagePerms.canCreate || !pagePerms.canSave) return
    if (!selectedRows.length) {
      setStatusMessage?.({
        type: 'warning',
        text: 'Chọn ít nhất một dòng phiếu thống kê cần đăng ký.'
      })
      return
    }
    const missingSlipRows = selectedRows.filter((row) => !String(row.StatSlipNo || '').trim())
    if (missingSlipRows.length) {
      setStatusMessage?.({
        type: 'warning',
        text: `Có ${missingSlipRows.length} dòng chưa có số phiếu thống kê. Bỏ chọn các dòng đó rồi lưu lại.`
      })
      return
    }
    const reportCode = String(filters.TKSXRegCode || '').trim()
    const items = selectedRows.map(({ WorkingTag, ...row }) => ({
      ...row,
      TKSXRegCode: reportCode,
      RegCode: row.RegCode || reportCode
    }))
    const tksxMasterSeq = selectedRows[0]?.TKSXMasterSeq || ''
    loadingBarRef.current?.continuousStart?.()
    try {
      for (let offset = 0; offset < items.length; offset += 1000) {
        const result = await saveProdMachineRegistrations({
          TKSXRegCode: reportCode,
          TKSXMasterSeq: tksxMasterSeq,
          items: items.slice(offset, offset + 1000)
        })
        if (result?.success === false) {
          throw new Error(result?.message || 'Lưu đăng ký không thành công.')
        }
      }
      setStatusMessage?.({
        type: 'success',
        text: `Đã lưu ${items.length.toLocaleString('vi-VN')} dòng phiếu vào đăng ký máy ${reportCode}.`
      })
      await handleSearchData()
    } catch (error) {
      setStatusMessage?.({ type: 'error', text: error?.message || 'Không thể lưu đăng ký máy.' })
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [
    pagePerms.canCreate,
    pagePerms.canSave,
    selectedRows,
    filters.TKSXRegCode,
    setStatusMessage,
    handleSearchData
  ])

  const handleDelete = useCallback(() => {
    if (!pagePerms.canDelete || isSourceData) return
    const deletableRows = selectedRows.filter((row) => row.IdSeq)
    if (!deletableRows.length) {
      setStatusMessage?.({ type: 'warning', text: 'Chọn các dòng đã đăng ký cần xóa.' })
      return
    }
    setRowsToDelete(deletableRows)
    setConfirmDeleteOpen(true)
  }, [pagePerms.canDelete, isSourceData, selectedRows, setStatusMessage])

  const confirmDelete = useCallback(async () => {
    setConfirmDeleteOpen(false)
    loadingBarRef.current?.continuousStart?.()
    try {
      const result = await deleteProdMachineRegistrations(rowsToDelete.map((row) => row.IdSeq))
      if (result?.success === false) {
        throw new Error(result?.message || 'Xóa dữ liệu không thành công.')
      }
      setStatusMessage?.({ type: 'success', text: `Đã xóa ${rowsToDelete.length} dòng đăng ký máy.` })
      setRowsToDelete([])
      await handleSearchData()
    } catch (error) {
      setStatusMessage?.({ type: 'error', text: error?.message || 'Không thể xóa dòng đăng ký máy.' })
    } finally {
      loadingBarRef.current?.complete?.()
    }
  }, [rowsToDelete, setStatusMessage, handleSearchData])

  usePageHotkeys({ onSearch: handleSearchData, onSave: handleRegister, onDelete: handleDelete })

  const cancelAllRequestsRef = useRef(cancelAllRequests)
  cancelAllRequestsRef.current = cancelAllRequests
  // Initial query only; filters are applied when the user presses Search.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    message.destroy()
    notification.destroy()
    handleSearchData()
    return () => cancelAllRequestsRef.current?.()
  }, [])

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        actions={
          <ProdMachineActions
            onSearch={handleSearchData}
            onOpenRegistration={handleOpenRegistration}
            onLoadStatistics={handleLoadStatistics}
            onRegister={handleRegister}
            onDelete={handleDelete}
            permissions={pagePerms}
            selectedCount={selectedRows.length}
            isSourceData={isSourceData}
          />
        }
        query={
          <ProdMachineQuery
            filters={filters}
            setFilters={setFilters}
            handleSearchData={handleSearchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <RoleGroupTable
            {...tableProps}
            tableId="report_prod_machine_registration_tab7"
            readOnlyBg="#ffffff"
            gridTheme={{ bgCell: '#ffffff', bgHeader: '#f8fafc', headerFontStyle: '600 12px', baseFontStyle: '12px' }}
        tableTitle={
          isSourceData
            ? `Phiếu thống kê TKSX — ${filters.TKSXRegCode}`
            : 'Đăng ký báo cáo máy — Tab 7'
        }
            canEdit={false}
            canCreate={false}
            canDelete={false}
            defaultCols={defaultCols}
          />
        }
      />
      <AddProdMachineModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        onRegister={handleRegisterUploadedRows}
        permissions={pagePerms}
      />
      <WindowsConfirmModal
        isOpen={confirmDeleteOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
        title={t('Xác nhận xóa đăng ký máy')}
        message={t('Bạn có chắc chắn muốn xóa {{count}} dòng đã chọn không?', { count: rowsToDelete.length })}
        subMessage={t('Các dòng đã xóa sẽ không còn xuất hiện khi truy vấn mã báo cáo TKSX này.')}
        confirmText={t('Xóa dữ liệu')}
        cancelText={t('Quay lại')}
        type="danger"
        confirmVariant="danger"
      />
    </>
  )
}
