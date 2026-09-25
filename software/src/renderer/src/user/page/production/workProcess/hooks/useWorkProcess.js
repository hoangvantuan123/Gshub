/* eslint-disable no-unused-vars */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { CompactSelection } from '@glideapps/glide-data-grid'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { getNow_yyyymmdd_hhmmss } from '../../../../../utils/getToday_yyyymmdd_hhmmss'
import { useWorkProcessMasterColumns, useWorkProcessStepColumns } from '../columns/workProcessColumns'
import { queryWorkProcess, queryWorkProcessSteps } from '../../../../../api/production/workProcessApi'
import { usePageData } from '../../../../../context/PageDataContext'

/**
 * Chuyển đổi dữ liệu từ API DataHub thành danh sách Master Lệnh CĐ
 */
export function parseApiDataToMasterRows(apiData) {
  if (!apiData || !Array.isArray(apiData.data)) {
    return []
  }

  const masterList = []
  let masterIdx = 1

  apiData.data.forEach((item) => {
    const master = item.master || {}
    const details = item.details || []

    if (details.length === 0) {
      masterList.push({
        id: `m_${masterIdx++}`,
        WorkingTag: '',
        DocNo: master.DocNo || '',
        StageOrderNo: master.DocNo || '',
        DocNo_Detail: master.DocNo || '',
        RowId: master.Stt || master.Id || '',
        ItemCode: master.ItemCode || '',
        ItemName: master.ItemName || '',
        Unit: '',
        StepCount: null,
        QuantitySO: master.Quantity,
        QuantityCDIssue: null,
        QuantityProduce: master.Quantity,
        QuantityPass: master.Quantity,
        DocDate: master.DocDate ? master.DocDate.split('T')[0] : '',
        FactoryName: master.FactoryName || '',
        CustomerName: master.CustomerName || '',
        CreatedBy_Name: master.CreatedBy_Name || '',
        Description: master.Description || ''
      })
    } else {
      details.forEach((d) => {
        const detail = d.detail || {}
        const currentStageOrderNo = detail.DocNo_Detail || master.DocNo || ''
        const rowId = detail.RowId || detail.RowId_CD || detail.Id || ''

        masterList.push({
          id: `m_${masterIdx++}`,
          WorkingTag: '',
          DocNo: master.DocNo || '',
          StageOrderNo: currentStageOrderNo,
          DocNo_Detail: currentStageOrderNo,
          RowId: String(rowId),
          ItemCode: detail.ItemCode || master.ItemCode || '',
          ItemName: detail.ItemName || master.ItemName || '',
          Unit: detail.Unit || '',
          StepCount: null,
          QuantitySO: detail.QuantitySO,
          QuantityCDIssue: detail.QuantityCDIssue,
          QuantityProduce: detail.QuantityProduce,
          QuantityPass: detail.QuantityPass,
          DocDate: master.DocDate ? master.DocDate.split('T')[0] : '',
          FactoryName: master.FactoryName || '',
          CustomerName: detail.CustomerName || master.CustomerName || '',
          CreatedBy_Name: master.CreatedBy_Name || '',
          Description: master.Description || ''
        })
      })
    }
  })

  return masterList
}

export function useWorkProcess({ loadingBarRef }) {
  const { setStatusMessage, setPageData } = usePageData() || {}

  // 1. Query Filters (Hỗ trợ tìm kiếm lọc theo tất cả các cột)
  const [searchValues, setSearchValues] = useState({
    StageOrderNo: '',
    BranchCode: 'A01',
    FiscalYear: '2026',
    ItemCode: '',
    ItemName: '',
    OperationCode: ''
  })
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  // 2. State 2 Bảng Master & Steps (Raw data từ backend)
  const [rawMasterList, setRawMasterList] = useState([])
  const [selectedMasterIndex, setSelectedMasterIndex] = useState(-1)
  const [stepsCache, setStepsCache] = useState({}) // { [rowId]: Array of steps }
  const [loading, setLoading] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState(false)

  // 3. Columns configuration (Không icon tiêu đề)
  const defaultMasterCols = useWorkProcessMasterColumns()
  const defaultStepCols = useWorkProcessStepColumns()

  const [masterCols, setMasterCols] = useState(() => defaultMasterCols.filter((c) => c.visible !== false))
  const [stepCols, setStepCols] = useState(() => defaultStepCols.filter((c) => c.visible !== false))

  // 4. Selection State
  const [masterSelection, setMasterSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [stepSelection, setStepSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })

  const [showSearch, setShowSearch] = useState(false)

  // Lọc trực tiếp từng cột trên Bảng Master (Mã hàng, Tên hàng, Số lượng SO, SL sản xuất, SL đạt, Khách hàng, Diễn giải...)
  const displayedMasterList = useMemo(() => {
    let list = rawMasterList
    if (!list || list.length === 0) return []

    // Duyệt qua tất cả các trường đang có giá trị tìm kiếm
    Object.entries(searchValues).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      const strVal = String(val).trim().toLowerCase()
      if (!strVal) return

      // BranchCode và FiscalYear chỉ dùng cho API query
      if (key === 'BranchCode' || key === 'FiscalYear' || key === 'OperationCode') {
        return
      }

      // Tách nhiều giá trị phân tách bằng dấu phẩy (,), chấm phẩy (;), hoặc gạch đứng (|)
      const subVals = strVal
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean)

      if (subVals.length === 0) return

      list = list.filter((row) => {
        const fieldVal = row[key]
        if (fieldVal === undefined || fieldVal === null) return false
        const targetStr = String(fieldVal).toLowerCase()
        // Điều kiện OR: thỏa mãn bất kỳ giá trị nào được nhập
        return subVals.some((v) => targetStr.includes(v))
      })
    })

    return list
  }, [rawMasterList, searchValues])

  // Selected Master Row
  const selectedMasterRow = useMemo(() => {
    if (displayedMasterList.length === 0) return null
    if (selectedMasterIndex >= 0 && selectedMasterIndex < displayedMasterList.length) {
      return displayedMasterList[selectedMasterIndex]
    }
    return displayedMasterList[0] || null
  }, [displayedMasterList, selectedMasterIndex])

  // Lọc chi tiết Thao tác TT (theo mã thao tác, tên thao tác, mã máy...)
  const currentStepData = useMemo(() => {
    if (!selectedMasterRow || !selectedMasterRow.RowId) return []
    let steps = stepsCache[selectedMasterRow.RowId] || []
    const opQuery = searchValues.OperationCode?.trim()?.toLowerCase()
    if (opQuery) {
      const subOps = opQuery
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean)

      if (subOps.length > 0) {
        steps = steps.filter((s) => {
          const op = s.OperationCode?.toLowerCase() || ''
          const name = s.WorkStepTypeName?.toLowerCase() || ''
          const mCode = s.MachineCode?.toLowerCase() || ''
          const mName = s.MachineName?.toLowerCase() || ''
          return subOps.some(
            (v) => op.includes(v) || name.includes(v) || mCode.includes(v) || mName.includes(v)
          )
        })
      }
    }
    return steps
  }, [selectedMasterRow, stepsCache, searchValues.OperationCode])

  // Fetch Steps on Demand khi click 1 dòng Lệnh CĐ
  const fetchStepsForRow = useCallback(
    async (row) => {
      if (!row || !row.RowId) return
      const rowId = row.RowId

      // Nếu đã có trong cache thì hiển thị ngay lập tức
      if (stepsCache[rowId]) {
        return
      }

      setLoadingSteps(true)
      try {
        const res = await queryWorkProcessSteps({
          row_id: rowId,
          branch_code: searchValues.BranchCode || 'A01',
          fiscal_year: searchValues.FiscalYear || '2026'
        })

        if (res.success && Array.isArray(res.data)) {
          let sIdx = 1
          const formatted = res.data.map((st) => ({
            id: `st_${rowId}_${sIdx++}`,
            WorkingTag: '',
            StageOrderNo: row.StageOrderNo || '',
            DocNo_Detail: row.DocNo_Detail || '',
            BuiltinOrder: st.BuiltinOrder,
            OperationCode: st.WorkStepCode || '',
            WorkStepCode: st.WorkStepCode || '',
            WorkStepTypeName: st.WorkStepTypeName || st.WorkStepName || '',
            MachineCode: st.MachineCode || '',
            MachineName: st.MachineName || '',
            QuantityProduce: st.QuantityProduce != null ? st.QuantityProduce : row.QuantityProduce,
            QuantityPass: st.QuantityPass != null ? st.QuantityPass : row.QuantityPass,
            QuantityTransfered: st.QuantityTransfered,
            QuantityProductTransfered: st.QuantityProductTransfered,
            FactoryName: st.FactoryName || row.FactoryName || ''
          }))

          setStepsCache((prev) => ({
            ...prev,
            [rowId]: formatted
          }))

          // Cập nhật StepCount cho dòng Master
          setRawMasterList((prev) =>
            prev.map((m) => (m.RowId === rowId ? { ...m, StepCount: formatted.length } : m))
          )

          setStatusMessage?.({
            type: 'info',
            text: `Đã tải ${formatted.length} thao tác TT cho lệnh ${row.StageOrderNo || row.DocNo_Detail}`
          })
        } else {
          setStepsCache((prev) => ({
            ...prev,
            [rowId]: []
          }))
          setStatusMessage?.({
            type: 'warning',
            text: `Lệnh ${row.StageOrderNo || row.DocNo_Detail} không có thao tác TT nào`
          })
        }
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: 'Lỗi khi lấy danh sách thao tác TT: ' + (err.message || err)
        })
      } finally {
        setLoadingSteps(false)
      }
    },
    [searchValues, stepsCache, setStatusMessage]
  )

  // Khi chọn dòng trên Master Table -> update selectedMasterIndex và gọi API lấy Thao Tác
  const handleMasterRowSelect = useCallback(
    (newSelection) => {
      setMasterSelection(newSelection)
      if (newSelection?.rows?.length > 0) {
        const firstIdx = newSelection.rows.first()
        if (firstIdx !== undefined && firstIdx >= 0 && firstIdx < displayedMasterList.length) {
          setSelectedMasterIndex(firstIdx)
          const targetRow = displayedMasterList[firstIdx]
          if (targetRow) {
            fetchStepsForRow(targetRow)
          }
        }
      }
    },
    [displayedMasterList, fetchStepsForRow]
  )

  // 5. API Search Query
  const handleSearch = useCallback(
    async (overrideDocNo = null) => {
      const targetDocNo = overrideDocNo || searchValues.StageOrderNo
      const hasAnySearchCriterion =
        Boolean(targetDocNo?.trim()) ||
        Boolean(searchValues.ItemCode?.trim()) ||
        Boolean(searchValues.ItemName?.trim()) ||
        Boolean(searchValues.CustomerName?.trim()) ||
        Boolean(searchValues.Unit?.trim()) ||
        Boolean(searchValues.Description?.trim())

      if (!hasAnySearchCriterion) {
        setStatusMessage?.({
          type: 'warning',
          text: 'Vui lòng nhập ít nhất một điều kiện (Mã Lệnh, Mã Hàng, Tên Hàng...) để tra cứu'
        })
        return
      }

      setLoading(true)
      loadingBarRef?.current?.continuousStart?.()
      const searchSummary = targetDocNo?.trim() || searchValues.ItemCode?.trim() || searchValues.ItemName?.trim() || 'điều kiện lọc'
      setStatusMessage?.({
        type: 'info',
        text: `Đang tra cứu theo "${searchSummary}" từ Bravo ERP...`
      })

      try {
        const res = await queryWorkProcess({
          doc_no: targetDocNo?.trim() || undefined,
          item_code: searchValues.ItemCode?.trim() || undefined,
          item_name: searchValues.ItemName?.trim() || undefined,
          unit: searchValues.Unit?.trim() || undefined,
          customer_name: searchValues.CustomerName?.trim() || undefined,
          description: searchValues.Description?.trim() || undefined,
          branch_code: searchValues.BranchCode || 'A01',
          fiscal_year: searchValues.FiscalYear || '2026',
          fetch_steps: false,
          include_raw: false
        })

        if (res.success && res.data) {
          const mList = parseApiDataToMasterRows(res.data)

          setRawMasterList(mList)
          setStepsCache({}) // Reset cache khi tìm kiếm mới
          setSelectedMasterIndex(0)
          setMasterSelection({
            columns: CompactSelection.empty(),
            rows: mList.length > 0 ? CompactSelection.empty().add(0) : CompactSelection.empty()
          })

          setPageData?.((prev) => ({ ...prev, total: mList.length }))
          setStatusMessage?.({
            type: 'success',
            text: `Tìm thấy ${mList.length} lệnh công đoạn (${res.latency} ms)`
          })

          if (mList.length > 0) {
            fetchStepsForRow(mList[0])
          }
        } else {
          setRawMasterList([])
          setStepsCache({})
          setSelectedMasterIndex(-1)
          setPageData?.((prev) => ({ ...prev, total: 0 }))
          setStatusMessage?.({
            type: 'warning',
            text: res.message || 'Không tìm thấy dữ liệu từ Bravo ERP'
          })
        }
      } catch (err) {
        setStatusMessage?.({
          type: 'error',
          text: err.message || 'Lỗi khi gọi API DataHub'
        })
      } finally {
        setLoading(false)
        loadingBarRef?.current?.complete?.()
      }
    },
    [searchValues, loadingBarRef, fetchStepsForRow, setStatusMessage, setPageData]
  )

  // 6. Excel Export
  const handleExportExcel = useCallback(() => {
    try {
      const exportMasterCols = masterCols.filter((c) => c.id !== 'WorkingTag' && c.visible !== false)
      const exportStepCols = stepCols.filter((c) => c.id !== 'WorkingTag' && c.visible !== false)

      const masterDataToExport = displayedMasterList.map((row, index) => {
        const rowObj = { STT: index + 1 }
        exportMasterCols.forEach((c) => {
          rowObj[c.title || c.id] = row[c.id] ?? ''
        })
        return rowObj
      })

      const allLoadedSteps = Object.values(stepsCache).flat()
      const stepDataToExport = allLoadedSteps.map((row, index) => {
        const rowObj = { STT: index + 1 }
        exportStepCols.forEach((c) => {
          rowObj[c.title || c.id] = row[c.id] ?? ''
        })
        return rowObj
      })

      const wb = XLSX.utils.book_new()
      const wsMaster = XLSX.utils.json_to_sheet(masterDataToExport)
      const wsSteps = XLSX.utils.json_to_sheet(stepDataToExport)

      XLSX.utils.book_append_sheet(wb, wsMaster, 'LenhCongDoan')
      XLSX.utils.book_append_sheet(wb, wsSteps, 'ThaoTacTT')

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const dataBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(dataBlob, `LenhCongDoan_Va_ThaoTac_${getNow_yyyymmdd_hhmmss()}.xlsx`)
      setStatusMessage?.({
        type: 'success',
        text: 'Xuất file Excel thành công cả 2 bảng Lệnh Công Đoạn & Thao Tác TT'
      })
    } catch (e) {
      setStatusMessage?.({
        type: 'error',
        text: 'Lỗi khi xuất file Excel: ' + (e.message || e)
      })
    }
  }, [masterCols, stepCols, displayedMasterList, stepsCache, setStatusMessage])

  const handleReload = useCallback(() => {
    if (searchValues.StageOrderNo?.trim()) {
      handleSearch()
    } else {
      setRawMasterList([])
      setStepsCache({})
      setSelectedMasterIndex(-1)
      setPageData?.((prev) => ({ ...prev, total: 0 }))
      setStatusMessage?.({
        type: 'info',
        text: 'Đã làm mới dữ liệu'
      })
    }
  }, [handleSearch, searchValues.StageOrderNo, setStatusMessage, setPageData])

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
      BranchCode: 'A01',
      FiscalYear: '2026',
      ItemCode: '',
      ItemName: '',
      OperationCode: ''
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
    // Step Table State
    currentStepData,
    stepCols,
    setStepCols,
    defaultStepCols,
    stepSelection,
    setStepSelection,
    loadingSteps,
    fetchStepsForRow,
    // Actions & UI
    showSearch,
    setShowSearch,
    loading,
    handleSearch,
    handleExportExcel,
    handleReload
  }
}
