/* eslint-disable no-unused-vars */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { getNow_yyyymmdd_hhmmss } from '../../../../../utils/getToday_yyyymmdd_hhmmss'
import { useWorkProcessMasterColumns } from '../columns/workProcessColumns'
import { queryWorkProcess } from '../../../../../api/production/workProcessApi'
import { usePageData } from '../../../../../context/PageDataContext'
import { isSessionExpiredError, triggerSessionExpired } from '../../../../../utils/sessionExpiredHelper'

/**
 * Chuyển đổi dữ liệu từ API DataHub thành danh sách Lệnh Công Đoạn hiển thị lên bảng
 */
export function parseApiDataToMasterRows(apiData) {
  if (!apiData || !Array.isArray(apiData.data)) {
    return []
  }

  const resultRows = []
  let globalIndex = 0

  const branchNames = {
    A01: 'A01 - NM Hà Nội',
    A02: 'A02 - NM Bắc Ninh',
    B01: 'B01 - NM TP.HCM'
  }

  apiData.data.forEach((item, masterIdx) => {
    const master = item.master || item || {}
    const masterDocNo = master.DocNo || ''
    const masterDate = master.DocDate ? master.DocDate.split('T')[0] : ''
    const masterBranch = master.BranchCode || ''
    const masterFactory =
      master.FactoryName ||
      branchNames[masterBranch] ||
      (masterBranch ? `${masterBranch} - Chi nhánh ${masterBranch}` : '')
    const masterCreatedBy =
      master.CreatedBy_Name ||
      master.CreatedByName ||
      (master.CreatedBy && String(master.CreatedBy) !== '-1' && isNaN(Number(master.CreatedBy))
        ? String(master.CreatedBy)
        : master.CreatedBy === -1 || master.CreatedBy === '-1'
          ? 'Hệ thống'
          : '')
    const masterModifiedBy =
      master.ModifiedBy_Name ||
      master.ModifiedByName ||
      master.EditBy_Name ||
      (master.ModifiedBy && String(master.ModifiedBy) !== '-1' && isNaN(Number(master.ModifiedBy))
        ? String(master.ModifiedBy)
        : master.ModifiedBy === -1 || master.ModifiedBy === '-1'
          ? 'Hệ thống'
          : '')
    const masterModifiedDate = master.ModifiedAt || master.ModifiedDate || ''
    const masterDescription = master.Description || ''

    const details = Array.isArray(item.details) ? item.details : []

    if (details.length > 0) {
      details.forEach((dItem, detailIdx) => {
        globalIndex++
        const detail = dItem.detail || dItem || {}
        const rowId = detail.RowId || detail.Stt || master.Stt || master.Id || `row_${globalIndex}`
        const stageOrderNo = detail.DocNo_Detail || detail.DocNo || masterDocNo || master.Stt || ''
        const detailBranch = detail.BranchCode || masterBranch
        const resolvedFactory =
          detail.FactoryName ||
          masterFactory ||
          branchNames[detailBranch] ||
          (detailBranch ? `${detailBranch} - Chi nhánh ${detailBranch}` : 'A01 - NM Hà Nội')

        const qProduce =
          detail.QuantityProduce != null
            ? Number(detail.QuantityProduce)
            : detail.Quantity != null
              ? Number(detail.Quantity)
              : master.QuantityProduce != null
                ? Number(master.QuantityProduce)
                : master.Quantity != null
                  ? Number(master.Quantity)
                  : null
        const qPass = detail.QuantityPass != null ? Number(detail.QuantityPass) : null
        const qReceipt = detail.QuantityReceipt != null ? Number(detail.QuantityReceipt) : null
        const qOff = detail.QuantityOff != null ? Number(detail.QuantityOff) : null
        const qSO =
          detail.QuantitySO != null
            ? Number(detail.QuantitySO)
            : master.QuantitySO != null
              ? Number(master.QuantitySO)
              : null
        const qAdj = detail.QuantityAdj != null ? Number(detail.QuantityAdj) : null
        
        // Công thức chuẩn: SL đạt sau điều chỉnh (DO) = SL Đạt theo DO - SL Điều chỉnh
        let qAfterAdjPass = null
        if (qPass != null) {
          if (qAdj != null) {
            qAfterAdjPass = qAdj < 0 ? (qPass + qAdj) : (qPass - qAdj)
          } else {
            qAfterAdjPass = qPass
          }
        }

        // SL bù hao (WasteCompensationQty)
        const wasteCompQty =
          detail.WasteCompensationQty != null
            ? Number(detail.WasteCompensationQty)
            : detail.QuantityWaste != null
              ? Number(detail.QuantityWaste)
              : (qProduce != null && qAfterAdjPass != null && qProduce > qAfterAdjPass
                  ? Math.max(0, qProduce - qAfterAdjPass - (qOff || 0))
                  : (qProduce != null && qPass != null && qProduce > qPass
                      ? Math.max(0, qProduce - qPass - (qOff || 0))
                      : 0))

        // Tỷ lệ đạt (%) = (SL Đạt / SL Đơn hàng gốc) * 100
        const baseSO = qSO != null && qSO > 0 ? qSO : qProduce
        const ratePass =
          qPass != null && baseSO != null && baseSO > 0 ? (qPass / baseSO) * 100 : null

        // Tỷ lệ nhập kho (%) dựa chuẩn vào SL đạt sau ĐC (DO)
        const targetBaseReceipt =
          qAfterAdjPass != null && qAfterAdjPass > 0
            ? qAfterAdjPass
            : (qPass != null && qPass > 0
                ? qPass
                : (qSO != null && qSO > 0 ? qSO : qProduce))

        let rateReceipt =
          qReceipt != null && targetBaseReceipt != null && targetBaseReceipt > 0
            ? (qReceipt / targetBaseReceipt) * 100
            : (detail.RateReceipt != null ? Number(detail.RateReceipt) : null)
        if (rateReceipt != null && rateReceipt > 0 && rateReceipt <= 1) {
          rateReceipt = rateReceipt * 100
        }

        resultRows.push({
          ...master,
          ...detail,
          id: `row_${rowId}_${masterIdx + 1}_${detailIdx + 1}`,
          WorkingTag: '',
          DocNo: masterDocNo || detail.DocNoR || '',
          StageOrderNo: stageOrderNo,
          DocNo_Detail: detail.DocNo_Detail || stageOrderNo,
          DocNoR: masterDocNo || detail.DocNoR || '',
          RowId: String(rowId),
          RowId_SO: detail.RowId_SO || '',
          ItemCode: detail.ItemCode || master.ItemCode || '',
          ItemName: detail.ItemName || master.ItemName || '',
          Unit: detail.Unit || master.Unit || '',
          WorkProcessCode: master.WorkProcessCode || detail.WorkProcessCode || '',
          ProductTypeName: master.ProductTypeName || detail.ProductTypeName || '',
          StepCount:
            detail.StepCount ??
            (Array.isArray(dItem.steps) && dItem.steps.length > 0 ? dItem.steps.length : null),
          QuantitySO: qSO,
          QuantityCDIssue: detail.QuantityCDIssue != null ? Number(detail.QuantityCDIssue) : null,
          QuantityPass: qPass,
          RatePass: ratePass,
          QuantityAdj: qAdj,
          QuantityAfterAdj_Pass: qAfterAdjPass,
          QuantityOff: qOff,
          QuantityReceipt: qReceipt,
          RateReceipt: rateReceipt,
          QuantityProduce: qProduce,
          QuantityAfterAdj:
            detail.QuantityAfterAdj != null ? Number(detail.QuantityAfterAdj) : null,
          ApprovalStatus: (() => {
            const rawApp = master.ApprovalStatus ?? detail.ApprovalStatus
            if (rawApp != null && rawApp !== '') return Number(rawApp)
            const isCompleted =
              detail.IsComplete === true || detail.IsComplete === 1 || detail.IsComplete === '1' ||
              master.IsComplete === true || master.IsComplete === 1 || master.IsComplete === '1' ||
              detail.Closed === true || detail.Closed === 1 || detail.Closed === '1' ||
              master.Closed === true || master.Closed === 1 || master.Closed === '1'
            return isCompleted ? 4 : null
          })(),
          DocStatus:
            detail.DocStatus != null
              ? Number(detail.DocStatus)
              : master.DocStatus != null
                ? Number(master.DocStatus)
                : null,
          IsComplete:
            detail.IsComplete === true ||
            detail.IsComplete === 1 ||
            detail.IsComplete === '1' ||
            detail.IsComplete === 'true',
          IsStop:
            detail.IsStop === true ||
            detail.IsStop === 1 ||
            detail.IsStop === '1' ||
            detail.IsStop === 'true',
          Closed:
            detail.Closed === true ||
            detail.Closed === 1 ||
            detail.Closed === '1' ||
            detail.Closed === 'true',
          AllowAdj:
            detail.AllowAdj === true ||
            detail.AllowAdj === 1 ||
            detail.AllowAdj === '1' ||
            detail.AllowAdj === 'true',
          IsCheckSample:
            master.IsCheckSample === true ||
            master.IsCheckSample === 1 ||
            master.IsCheckSample === '1' ||
            detail.IsCheckSample === true ||
            detail.IsCheckSample === 1,
          PostSL:
            master.PostSL === true ||
            master.PostSL === 1 ||
            master.PostSL === '1' ||
            detail.PostSL === true ||
            detail.PostSL === 1,
          ClosedDate: detail.ClosedDate ? detail.ClosedDate.split('T')[0] : '',
          DeliveryDateDO: detail.DeliveryDateDO ? detail.DeliveryDateDO.split('T')[0] : '',
          DocDate: masterDate || (detail.DocDate ? detail.DocDate.split('T')[0] : ''),
          FactoryName: resolvedFactory || masterFactory || detail.FactoryName || 'A01 - NM Hà Nội',
          CustomerName: detail.CustomerName || master.CustomerName || '',
          CreatedBy_Name:
            masterCreatedBy ||
            detail.CreatedBy_Name ||
            detail.CreatedByName ||
            (detail.CreatedBy &&
            String(detail.CreatedBy) !== '-1' &&
            isNaN(Number(detail.CreatedBy))
              ? String(detail.CreatedBy)
              : ''),
          CreatedAt: master.CreatedAt
            ? master.CreatedAt.split('T')[0]
            : detail.CreatedAt
              ? detail.CreatedAt.split('T')[0]
              : '',
          ModifiedBy_Name:
            masterModifiedBy ||
            detail.ModifiedBy_Name ||
            detail.ModifiedByName ||
            detail.EditBy_Name ||
            (detail.ModifiedBy &&
            String(detail.ModifiedBy) !== '-1' &&
            isNaN(Number(detail.ModifiedBy))
              ? String(detail.ModifiedBy)
              : ''),
          ModifiedDate: masterModifiedDate || detail.ModifiedAt || '',
          Description: detail.Description || masterDescription || ''
        })
      })
    } else {
      globalIndex++
      const rowId = master.Stt || master.Id || `m_${globalIndex}`
      const qProduce =
        master.QuantityProduce != null
          ? Number(master.QuantityProduce)
          : master.Quantity != null
            ? Number(master.Quantity)
            : null
      const qPass = master.QuantityPass != null ? Number(master.QuantityPass) : null
      const qReceipt = master.QuantityReceipt != null ? Number(master.QuantityReceipt) : null
      const ratePass =
        qPass != null && qProduce != null && qProduce > 0 ? (qPass / qProduce) * 100 : null
      let rateReceipt =
        master.RateReceipt != null
          ? Number(master.RateReceipt)
          : qReceipt != null && qProduce != null && qProduce > 0
            ? (qReceipt / qProduce) * 100
            : null
      if (rateReceipt != null && rateReceipt > 0 && rateReceipt <= 1) {
        rateReceipt = rateReceipt * 100
      }

      resultRows.push({
        ...master,
        id: `m_${rowId}_${globalIndex}`,
        WorkingTag: '',
        DocNo: masterDocNo,
        StageOrderNo: masterDocNo || master.Stt || '',
        DocNo_Detail: masterDocNo || master.Stt || '',
        DocNoR: masterDocNo,
        RowId: String(rowId),
        RowId_SO: master.RowId_SO || '',
        ItemCode: master.ItemCode || '',
        ItemName: master.ItemName || '',
        Unit: master.Unit || '',
        WorkProcessCode: master.WorkProcessCode || '',
        ProductTypeName: master.ProductTypeName || '',
        StepCount: master.StepCount ?? null,
        QuantitySO: master.QuantitySO != null ? Number(master.QuantitySO) : (master.Quantity != null ? Number(master.Quantity) : null),
        QuantityCDIssue: master.QuantityCDIssue != null ? Number(master.QuantityCDIssue) : null,
        QuantityAdj: master.QuantityAdj != null ? Number(master.QuantityAdj) : null,
        QuantityAfterAdj_Pass:
          qPass != null
            ? (master.QuantityAdj != null ? (Number(master.QuantityAdj) < 0 ? qPass + Number(master.QuantityAdj) : qPass - Number(master.QuantityAdj)) : qPass)
            : null,
        QuantityOff: master.QuantityOff != null ? Number(master.QuantityOff) : null,
        QuantityReceipt: qReceipt,
        RateReceipt: rateReceipt,
        QuantityProduce: qProduce,
        QuantityAfterAdj: master.QuantityAfterAdj != null ? Number(master.QuantityAfterAdj) : null,
        ApprovalStatus: (() => {
          if (master.ApprovalStatus != null && master.ApprovalStatus !== '') return Number(master.ApprovalStatus)
          const isCompleted =
            master.IsComplete === true || master.IsComplete === 1 || master.IsComplete === '1' ||
            master.Closed === true || master.Closed === 1 || master.Closed === '1'
          return isCompleted ? 4 : null
        })(),
        DocStatus: master.DocStatus != null ? Number(master.DocStatus) : null,
        IsComplete:
          master.IsComplete === true ||
          master.IsComplete === 1 ||
          master.IsComplete === '1' ||
          master.IsComplete === 'true',
        IsStop:
          master.IsStop === true ||
          master.IsStop === 1 ||
          master.IsStop === '1' ||
          master.IsStop === 'true',
        Closed:
          master.Closed === true ||
          master.Closed === 1 ||
          master.Closed === '1' ||
          master.Closed === 'true',
        AllowAdj:
          master.AllowAdj === true ||
          master.AllowAdj === 1 ||
          master.AllowAdj === '1' ||
          master.AllowAdj === 'true',
        IsCheckSample:
          master.IsCheckSample === true ||
          master.IsCheckSample === 1 ||
          master.IsCheckSample === '1',
        PostSL: master.PostSL === true || master.PostSL === 1 || master.PostSL === '1',
        ClosedDate: master.ClosedDate ? master.ClosedDate.split('T')[0] : '',
        DeliveryDateDO: master.DeliveryDateDO ? master.DeliveryDateDO.split('T')[0] : '',
        DocDate: masterDate,
        FactoryName: masterFactory || 'A01 - NM Hà Nội',
        CustomerName: master.CustomerName || '',
        CreatedBy_Name: masterCreatedBy,
        CreatedAt: master.CreatedAt ? master.CreatedAt.split('T')[0] : '',
        ModifiedBy_Name: masterModifiedBy,
        ModifiedDate: masterModifiedDate,
        Description: masterDescription
      })
    }
  })

  return resultRows
}

export function useWorkProcess({ loadingBarRef }) {
  const { setStatusMessage, setPageData, setLoadingInfo } = usePageData() || {}

  // 1. Query Filters
  const [searchValues, setSearchValues] = useState({
    StageOrderNo: '',
    FactoryName: '',
    ItemCode: '',
    ItemName: ''
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  // 2. State Bảng Master Lệnh CĐ
  const [rawMasterList, setRawMasterList] = useState([])
  const [selectedMasterIndex, setSelectedMasterIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  // 2.1 State & Refs Phân trang cuộn (Infinite Scroll)
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    pageSize: 100,
    total: 0,
    totalAll: 0,
    loadedCount: 0,
    hasMore: false,
    isLoadingNextPage: false
  })
  const pageInfoRef = useRef(pageInfo)
  pageInfoRef.current = pageInfo

  const isLoadingNextPageRef = useRef(false)
  const isSearchingRef = useRef(false)
  const loadedPagesRef = useRef(new Set())
  const currentSearchParamsRef = useRef(null)
  const lastVisibleYRef = useRef(0)

  // 3. Columns configuration
  const defaultMasterCols = useWorkProcessMasterColumns()
  const [masterCols, setMasterCols] = useState(() =>
    defaultMasterCols.filter((c) => c.visible !== false)
  )

  // 4. Selection State
  const [masterSelection, setMasterSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  const [showSearch, setShowSearch] = useState(false)

  // Bảng Master hiển thị dữ liệu sau khi bấm Enter hoặc nút Tìm kiếm (không nhảy data khi đang chọn/nhập)
  const displayedMasterList = useMemo(() => {
    return rawMasterList || []
  }, [rawMasterList])

  // Selected Master Row
  const selectedMasterRow = useMemo(() => {
    if (displayedMasterList.length === 0) return null
    if (selectedMasterIndex >= 0 && selectedMasterIndex < displayedMasterList.length) {
      return displayedMasterList[selectedMasterIndex]
    }
    return displayedMasterList[0] || null
  }, [displayedMasterList, selectedMasterIndex])

  // Chọn dòng trên Master Table
  const handleMasterRowSelect = useCallback(
    (newSelection) => {
      setMasterSelection(newSelection)
      if (newSelection?.rows?.length > 0) {
        const firstIdx = newSelection.rows.first()
        if (firstIdx !== undefined && firstIdx >= 0 && firstIdx < displayedMasterList.length) {
          setSelectedMasterIndex(firstIdx)
        }
      }
    },
    [displayedMasterList]
  )

  // Đồng bộ số lượng dòng hiển thị và số lượng cột xuống StatusBar
  useEffect(() => {
    if (setPageData) {
      setPageData((prev) => ({
        ...prev,
        loadedCount: displayedMasterList.length,
        totalColumns: masterCols.length
      }))
    }
  }, [displayedMasterList.length, masterCols.length, setPageData])

  // 5. API Search Query (Trang 1: pnb = 0)
  const handleSearch = useCallback(
    async (overrideDocNo = null) => {
      const targetDocNo = overrideDocNo || searchValues.StageOrderNo

      // Thu thập tất cả các trường tìm kiếm bổ sung/động sang column_filters
      const extraColumnFilters = {}
      Object.entries(searchValues).forEach(([k, v]) => {
        if (
          k !== 'StageOrderNo' &&
          k !== 'DocNo' &&
          k !== 'WorkProcessCode' &&
          k !== 'ProductTypeName' &&
          k !== 'ItemCode' &&
          k !== 'ItemName' &&
          k !== 'Unit' &&
          k !== 'CustomerName' &&
          k !== 'FactoryName' &&
          k !== 'Description' &&
          k !== 'BranchCode' &&
          k !== 'FiscalYear' &&
          k !== 'OperationCode' &&
          v !== undefined &&
          v !== null &&
          String(v).trim() !== ''
        ) {
          extraColumnFilters[k] = String(v).trim()
        }
      })

      setLoading(true)
      setLoadingInfo?.({ isLoading: true })
      isSearchingRef.current = true
      loadedPagesRef.current = new Set([0])
      lastVisibleYRef.current = 0
      loadingBarRef?.current?.continuousStart?.()
      const searchSummary =
        targetDocNo?.trim() ||
        searchValues.DocNo?.trim() ||
        searchValues.ItemCode?.trim() ||
        searchValues.ItemName?.trim() ||
        searchValues.WorkProcessCode?.trim() ||
        (searchValues.FactoryName?.trim() && searchValues.FactoryName.trim() !== '-- Tất cả nhà máy --' ? searchValues.FactoryName.trim() : '') ||
        Object.values(extraColumnFilters)[0] ||
        'tất cả'
      setStatusMessage?.({
        type: 'info',
        text: `Đang tra cứu theo "${searchSummary}" từ Bravo ERP...`
      })

      const searchParams = {
        stage_order_no: targetDocNo?.trim() || undefined,
        doc_no: searchValues.DocNo?.trim() || undefined,
        work_process_code: searchValues.WorkProcessCode?.trim() || undefined,
        product_type_name: searchValues.ProductTypeName?.trim() || undefined,
        item_code: searchValues.ItemCode?.trim() || undefined,
        item_name: searchValues.ItemName?.trim() || undefined,
        unit: searchValues.Unit?.trim() || undefined,
        customer_name: searchValues.CustomerName?.trim() || undefined,
        factory_name: searchValues.FactoryName?.trim() || undefined,
        description: searchValues.Description?.trim() || undefined,
        column_filters: Object.keys(extraColumnFilters).length > 0 ? extraColumnFilters : undefined,
        branch_code: searchValues.BranchCode?.trim() || undefined,
        fiscal_year: searchValues.FiscalYear?.trim() || undefined
      }
      currentSearchParamsRef.current = searchParams

      try {
        const res = await queryWorkProcess({
          ...searchParams,
          page: 0,
          page_size: 100,
          fetch_steps: false,
          include_raw: false
        })

        if (res.success && res.data) {
          const mList = parseApiDataToMasterRows(res.data)
          const totalCount = res.data.total_count ?? mList.length
          const pageSize = res.data.page_size || (mList.length > 0 ? mList.length : 100)
          const hasMore = res.data.has_more ?? (mList.length > 0 && mList.length < totalCount)
          const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

          setRawMasterList(mList)
          setSelectedMasterIndex(0)
          setMasterSelection({
            columns: CompactSelection.empty(),
            rows: mList.length > 0 ? CompactSelection.empty().add(0) : CompactSelection.empty()
          })

          setPageInfo({
            page: 0,
            pageSize,
            total: totalCount,
            totalAll: totalCount,
            loadedCount: mList.length,
            hasMore,
            isLoadingNextPage: false
          })

          // Đưa thông số chuẩn xuống StatusBar dưới đáy
          setPageData?.((prev) => ({
            ...prev,
            total: totalCount,
            totalAll: totalCount,
            loadedCount: mList.length,
            page: 1,
            pageSize,
            totalPages,
            hasMore,
            totalColumns: masterCols.length
          }))

          setLoadingInfo?.({
            isLoading: false,
            lastLoadTime: res.latency
          })

          setStatusMessage?.({
            type: 'success',
            text: `Tìm thấy ${totalCount.toLocaleString('vi-VN')} lệnh công đoạn (Đã tải ${mList.length} dòng trang 1/${totalPages}, ${res.latency} ms)`
          })
        } else {
          setRawMasterList([])
          setSelectedMasterIndex(-1)
          setPageInfo({
            page: 0,
            pageSize: 100,
            total: 0,
            totalAll: 0,
            loadedCount: 0,
            hasMore: false,
            isLoadingNextPage: false
          })
          setPageData?.((prev) => ({
            ...prev,
            total: 0,
            totalAll: 0,
            loadedCount: 0,
            page: 1,
            totalPages: 1,
            hasMore: false,
            totalColumns: masterCols.length
          }))
          setLoadingInfo?.({
            isLoading: false,
            lastLoadTime: res.latency || 0
          })
          if (isSessionExpiredError(res.message || res.error)) {
            triggerSessionExpired(res.message || res.error)
          }
          setStatusMessage?.({
            type: 'warning',
            text: res.message || 'Không tìm thấy dữ liệu từ Bravo ERP'
          })
        }
      } catch (err) {
        if (isSessionExpiredError(err)) {
          triggerSessionExpired(err.message)
        }
        setLoadingInfo?.({ isLoading: false })
        setStatusMessage?.({
          type: 'error',
          text: err.message || 'Lỗi khi gọi API DataHub'
        })
      } finally {
        setLoading(false)
        isSearchingRef.current = false
        loadingBarRef?.current?.complete?.()
      }
    },
    [searchValues, loadingBarRef, masterCols.length, setStatusMessage, setPageData, setLoadingInfo]
  )

  // 5.1 Tải trang tiếp theo khi cuộn (Pagination / Infinite Scroll)
  const fetchNextPage = useCallback(async () => {
    if (isLoadingNextPageRef.current || isSearchingRef.current) return
    const curInfo = pageInfoRef.current
    if (!curInfo.hasMore) return

    const nextPage = (curInfo.page || 0) + 1
    if (loadedPagesRef.current.has(nextPage)) return

    isLoadingNextPageRef.current = true
    setPageInfo((prev) => ({ ...prev, isLoadingNextPage: true }))
    setLoadingInfo?.({ isLoading: true })

    const totalPages = Math.max(1, Math.ceil(curInfo.total / (curInfo.pageSize || 100)))
    setStatusMessage?.({
      type: 'info',
      text: `Đang tải trang ${nextPage + 1}/${totalPages} (${curInfo.loadedCount + 1} - ${Math.min(curInfo.loadedCount + (curInfo.pageSize || 100), curInfo.total)} / ${curInfo.total.toLocaleString('vi-VN')})...`
    })

    try {
      loadedPagesRef.current.add(nextPage)
      const params = currentSearchParamsRef.current || {
        doc_no: searchValues.StageOrderNo?.trim() || undefined,
        branch_code: searchValues.BranchCode || 'A01',
        fiscal_year: searchValues.FiscalYear || '2026'
      }

      const res = await queryWorkProcess({
        ...params,
        page: nextPage,
        page_size: curInfo.pageSize || 100,
        fetch_steps: false,
        include_raw: false
      })

      if (res.success && res.data) {
        const newMasterRows = parseApiDataToMasterRows(res.data)
        const totalCount = res.data.total_count ?? curInfo.total
        const newLoadedCount = curInfo.loadedCount + newMasterRows.length
        const hasMore =
          res.data.has_more ?? (newMasterRows.length > 0 && newLoadedCount < totalCount)

        if (newMasterRows.length > 0) {
          setRawMasterList((prev) => [...prev, ...newMasterRows])
          setPageInfo((prev) => ({
            ...prev,
            page: nextPage,
            total: totalCount,
            totalAll: totalCount,
            loadedCount: newLoadedCount,
            hasMore,
            isLoadingNextPage: false
          }))

          // Cập nhật số liệu chuẩn xuống StatusBar dưới đáy
          setPageData?.((prev) => ({
            ...prev,
            total: totalCount,
            totalAll: totalCount,
            loadedCount: newLoadedCount,
            page: nextPage + 1,
            pageSize: curInfo.pageSize || 100,
            totalPages: Math.max(1, Math.ceil(totalCount / (curInfo.pageSize || 100))),
            hasMore
          }))

          setLoadingInfo?.({
            isLoading: false,
            lastLoadTime: res.latency
          })

          setStatusMessage?.({
            type: 'success',
            text: `Đã tải thêm ${newMasterRows.length} lệnh (Đã nạp: ${newLoadedCount.toLocaleString('vi-VN')} / ${totalCount.toLocaleString('vi-VN')})`
          })
        } else {
          setPageInfo((prev) => ({ ...prev, hasMore: false, isLoadingNextPage: false }))
          setPageData?.((prev) => ({ ...prev, hasMore: false }))
          setLoadingInfo?.({ isLoading: false, lastLoadTime: res.latency })
          setStatusMessage?.({
            type: 'info',
            text: `Đã tải hết toàn bộ ${totalCount.toLocaleString('vi-VN')} lệnh công đoạn`
          })
        }
      } else {
        if (isSessionExpiredError(res?.message || res?.error)) {
          triggerSessionExpired(res?.message || res?.error)
        }
        setPageInfo((prev) => ({ ...prev, hasMore: false, isLoadingNextPage: false }))
        setPageData?.((prev) => ({ ...prev, hasMore: false }))
        setLoadingInfo?.({ isLoading: false, lastLoadTime: res?.latency || 0 })
      }
    } catch (err) {
      if (isSessionExpiredError(err)) {
        triggerSessionExpired(err.message)
      }
      loadedPagesRef.current.delete(nextPage)
      setLoadingInfo?.({ isLoading: false })
      setStatusMessage?.({
        type: 'error',
        text: 'Lỗi khi tải dữ liệu trang tiếp theo: ' + (err.message || err)
      })
    } finally {
      isLoadingNextPageRef.current = false
      setPageInfo((prev) => ({ ...prev, isLoadingNextPage: false }))
    }
  }, [searchValues, setStatusMessage, setPageData, setLoadingInfo])

  // 5.2 Sự kiện cuộn Glide Data Grid (Infinite Scroll trigger)
  const onVisibleRegionChanged = useCallback(
    (range) => {
      if (isSearchingRef.current || isLoadingNextPageRef.current) return
      const curInfo = pageInfoRef.current
      if (!curInfo.hasMore || curInfo.loadedCount === 0) return

      const currentY = range.y || 0
      const isScrollingDown = currentY > lastVisibleYRef.current
      lastVisibleYRef.current = currentY

      // Chỉ kích hoạt khi người dùng thực sự cuộn dọc xuống phía dưới
      if (!isScrollingDown) return

      // Khi cuộn tới gần đáy bảng Master (cách đáy ~15 dòng) -> tự động nạp trang tiếp
      const bufferLookahead = Math.min(20, Math.max(5, Math.floor((curInfo.pageSize || 100) * 0.15)))
      const triggerThreshold = Math.max(0, curInfo.loadedCount - bufferLookahead)
      const viewportBottom = currentY + (range.height || 0)

      if (viewportBottom >= triggerThreshold) {
        fetchNextPage()
      }
    },
    [fetchNextPage]
  )

  // 6. Excel Export
  const handleExportExcel = useCallback(() => {
    try {
      const exportMasterCols = masterCols.filter(
        (c) => c.id !== 'WorkingTag' && c.visible !== false
      )
      const masterDataToExport = displayedMasterList.map((row, index) => {
        const rowObj = { STT: index + 1 }
        exportMasterCols.forEach((c) => {
          rowObj[c.title || c.id] = row[c.id] ?? ''
        })
        return rowObj
      })

      const wb = XLSX.utils.book_new()
      const wsMaster = XLSX.utils.json_to_sheet(masterDataToExport)
      XLSX.utils.book_append_sheet(wb, wsMaster, 'LenhCongDoan')

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const dataBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(dataBlob, `LenhCongDoan_${getNow_yyyymmdd_hhmmss()}.xlsx`)
      setStatusMessage?.({
        type: 'success',
        text: 'Xuất file Excel thành công danh sách Lệnh Công Đoạn'
      })
    } catch (e) {
      setStatusMessage?.({
        type: 'error',
        text: 'Lỗi khi xuất file Excel: ' + (e.message || e)
      })
    }
  }, [masterCols, displayedMasterList, setStatusMessage])

  const handleReload = useCallback(() => {
    if (searchValues.StageOrderNo?.trim()) {
      handleSearch()
    } else {
      setRawMasterList([])
      setSelectedMasterIndex(-1)
      setPageInfo({
        page: 0,
        pageSize: 100,
        total: 0,
        totalAll: 0,
        loadedCount: 0,
        hasMore: false,
        isLoadingNextPage: false
      })
      setPageData?.((prev) => ({
        ...prev,
        total: 0,
        totalAll: 0,
        loadedCount: 0,
        page: 1,
        totalPages: 1,
        hasMore: false,
        totalColumns: masterCols.length
      }))
      setLoadingInfo?.({ isLoading: false, lastLoadTime: 0 })
      setStatusMessage?.({
        type: 'info',
        text: 'Đã làm mới dữ liệu'
      })
    }
  }, [
    handleSearch,
    searchValues.StageOrderNo,
    masterCols.length,
    setStatusMessage,
    setPageData,
    setLoadingInfo
  ])

  // Thêm trường tìm kiếm theo từng cột (Ctrl+F / ContextMenu / Header menu)
  const handleAddQueryField = useCallback((columnKey, colTitle, activeCol) => {
    if (!columnKey || columnKey === 'WorkingTag' || columnKey === 'Status') return

    const normalizedKey = columnKey.toLowerCase()
    if (normalizedKey === 'branchcode' || normalizedKey === 'fiscalyear') return

    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key.toLowerCase() === normalizedKey)) return prev
      return [
        ...prev,
        {
          key: columnKey,
          label: colTitle || columnKey,
          type: activeCol?.kind === 'Number' ? 'number' : /Date/i.test(columnKey) ? 'date' : 'text',
          placeholder: `Tìm theo ${colTitle || columnKey}...`
        }
      ]
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
      StageOrderNo: '',
      FactoryName: '',
      ItemCode: '',
      ItemName: ''
    })
    setDynamicQueryFields([])
    setStatusMessage?.({
      type: 'info',
      text: 'Đã đặt lại bộ lọc tìm kiếm về mặc định'
    })
  }, [setStatusMessage])

  return {
    // Filters & Values
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    // Master Table State
    masterList: displayedMasterList,
    setMasterList: setRawMasterList,
    masterCols,
    setMasterCols,
    defaultMasterCols,
    masterSelection,
    setMasterSelection: handleMasterRowSelect,
    selectedMasterIndex,
    setSelectedMasterIndex,
    selectedMasterRow,
    // Pagination (Infinite Scroll)
    pageInfo,
    fetchNextPage,
    onVisibleRegionChanged,
    isLoadingNextPage: pageInfo.isLoadingNextPage,
    // Actions & UI
    showSearch,
    setShowSearch,
    loading,
    handleSearch,
    handleExportExcel,
    handleReload
  }
}
