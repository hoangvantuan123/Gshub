/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react'
import HanoiGs1PlanReport from './components/HanoiGs1PlanReport'
import {
  queryPlanMaster,
  queryPlanDetail,
  queryProductionPlanReport
} from '../../../registration/services/planRegistrationService'

export function parseCleanNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val

  let s = String(val).trim().replace(/\s+/g, '')
  if (!s) return defaultVal

  if (s.includes('.') && s.includes(',')) {
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (s.includes('.')) {
    const parts = s.split('.')
    if (parts.length > 2) {
      s = parts.join('')
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      s = parts[0] + parts[1]
    }
  } else if (s.includes(',')) {
    const parts = s.split(',')
    if (parts.length > 2) {
      s = parts.join('')
    } else if (parts.length === 2) {
      if (parts[1].length === 3 && parts[0].length >= 1) {
        s = parts[0] + parts[1]
      } else {
        s = parts[0] + '.' + parts[1]
      }
    }
  }

  const num = Number(s)
  return isNaN(num) ? defaultVal : num
}

export function normalizeDateString(dateStr) {
  if (!dateStr) return ''
  const s = String(dateStr).trim()
  if (!s) return ''

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10)
  }

  // Format M/D/YY or M/D/YYYY (e.g. 9/29/26 or 09/29/2026)
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      let [m, d, y] = parts
      if (y.length === 2) y = `20${y}`
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // Format DD-MM-YYYY
  if (s.includes('-')) {
    const parts = s.split(' ')[0].split('-')
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      const [d, m, y] = parts
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  return s
}

/**
 * Mapper chuyển đổi bản ghi DB _ERPPlanDetail sang đối tượng hiển thị KHSX chuẩn hóa
 */
function mapDBRowToPlanItem(item, idx, master) {
  const planQty = parseCleanNumber(
    item.TargetProdQty ?? item.TargetPassQty ?? item.PlanQty ?? item.planQty ?? item.RequiredQty,
    0
  )
  const actualQty = parseCleanNumber(
    item.StatPassQty ?? item.ActualQty ?? item.actualQty ?? item.CompletedQty ?? item.TargetPassQty,
    planQty
  )

  const rawPlanDate = item.RoutingDocDate || item.PlanDate || item.planDate || item.StartDate || ''
  const rawActualDate =
    item.OpDate || item.ActualDate || item.actualDate || item.ProdDate || item.EndDate || ''

  const planDate =
    normalizeDateString(rawPlanDate) ||
    normalizeDateString(rawActualDate) ||
    (master?.ApplyDate ? String(master.ApplyDate).slice(0, 10) : '2026-09-29')
  const actualDate = normalizeDateString(rawActualDate) || planDate

  // Trạng thái ĐP - SX
  let dpStatusText = String(
    item.StatusDpSx || item.DpStatusText || item.dpStatusText || item.Status || ''
  ).trim()
  let dpStatusCode = 'KHOP_SL'

  const lowerDp = dpStatusText.toLowerCase()
  if (lowerDp.includes('sai ngày')) {
    dpStatusCode = 'SX_SAI_NGAY'
    dpStatusText = 'SX sai ngày KH'
  } else if (lowerDp.includes('trượt')) {
    dpStatusCode = 'TRUOT_KH'
    dpStatusText = 'Trượt KH'
  } else if (lowerDp.includes('khớp số lượng') || lowerDp.includes('khớp sl')) {
    dpStatusCode = 'KHOP_SL'
    dpStatusText = 'Khớp số lượng'
  } else if (lowerDp.includes('khớp job') || lowerDp.includes('job')) {
    dpStatusCode = 'KHOP_JOB'
    dpStatusText = 'Khớp job'
  } else {
    if (planDate && actualDate && planDate !== actualDate) {
      dpStatusCode = 'SX_SAI_NGAY'
      dpStatusText = 'SX sai ngày KH'
    } else if (planQty > 0 && actualQty < planQty * 0.9) {
      dpStatusCode = 'TRUOT_KH'
      dpStatusText = 'Trượt KH'
    } else {
      dpStatusCode = 'KHOP_SL'
      dpStatusText = 'Khớp số lượng'
    }
  }

  // Trạng thái Thời gian
  let timeStatus = String(item.TimeStatus || item.timeStatus || 'Đúng ĐM').trim()
  let timeStatusText = timeStatus

  // Trạng thái Capa
  let capaStatus = String(item.CapaStatus || item.capaStatus || 'Trống / Đúng capa').trim()
  let capaStatusText = capaStatus

  const docNo =
    item.OperationNo ||
    item.RoutingDocNo ||
    item.DocNo ||
    item.docNo ||
    item.PlanNo ||
    `LSX-HN-${String(idx + 1).padStart(4, '0')}`
  const orderNo = item.RoutingDocNo || item.OrderNo || item.orderNo || item.SoNo || 'SO-2026-0000'
  const planNo =
    item.OperationNo ||
    item.PlanNo ||
    item.planNo ||
    `KH-HN-W39-${String(idx + 1).padStart(3, '0')}`
  const pic =
    item.PicDp || item.pic || item.Pic || item.Dispatcher || item.Planner || 'Chưa phân công'

  return {
    ...item,
    // Cột chuẩn 100% theo schema usePlanImportColumns
    PicDp: pic,
    OperationNo: item.OperationNo || planNo,
    OpDate: item.OpDate || planDate,
    RoutingDocNo: item.RoutingDocNo || orderNo,
    RoutingDocDate: item.RoutingDocDate || actualDate,
    ItemCode: item.ItemCode || item.itemCode || 'CAN-FSB-00360',
    ItemName: item.ItemName || item.itemName || 'Sản phẩm GS1',
    OperationName: item.OperationName || item.operationName || '',
    OpTypeName: item.OpTypeName || item.opTypeName || '',
    MachineName: item.MachineName || item.machineName || item.MachineCode || 'CHUNG',
    Unit: item.Unit || item.unit || 'Pcs',
    TargetPassQty: parseCleanNumber(item.TargetPassQty, planQty),
    TargetProdQty: parseCleanNumber(item.TargetProdQty, planQty),
    StatPassQty: parseCleanNumber(item.StatPassQty, actualQty),
    StartTime: item.StartTime || '',
    EndTime: item.EndTime || '',
    StandardProdTime: parseCleanNumber(item.StandardProdTime, 0),
    ActualProdTime: parseCleanNumber(item.ActualProdTime, 0),
    StandardCapa: parseCleanNumber(item.StandardCapa, 0),
    ActualCapa: parseCleanNumber(item.ActualCapa, 0),
    StatusDpSx: dpStatusText,
    TimeStatus: timeStatusText,
    CapaStatus: capaStatusText,

    // Dữ liệu nội bộ cho biểu đồ và KPI
    id: item.IdSeq || item.id || `HN-PL-${String(idx + 1).padStart(4, '0')}`,
    docNo,
    orderNo,
    planNo,
    pic,
    machineCode: item.MachineCode || item.machineCode || item.MachineName || 'CHUNG',
    machineName: item.MachineName || item.machineName || 'Thiết bị sản xuất',
    teamName:
      item.OpTypeName || item.OperationName || item.TeamName || item.teamName || 'Tổ sản xuất',
    itemCode: item.ItemCode || item.itemCode || 'CAN-FSB-00360',
    itemName: item.ItemName || item.itemName || 'Sản phẩm GS1',
    operationNo: item.OperationNo || planNo,
    operationName: item.OperationName || '',
    opTypeName: item.OpTypeName || '',
    unit: item.Unit || item.unit || 'Pcs',
    customer: item.CustomerName || item.customer || 'Khách hàng Goldsun',
    planDate,
    actualDate,
    rawPlanDate,
    rawActualDate,
    planQty,
    actualQty,
    targetPassQty: parseCleanNumber(item.TargetPassQty, planQty),
    targetProdQty: parseCleanNumber(item.TargetProdQty, planQty),
    statPassQty: parseCleanNumber(item.StatPassQty, actualQty),
    startTime: item.StartTime || '',
    endTime: item.EndTime || '',
    standardProdTime: parseCleanNumber(item.StandardProdTime, 0),
    actualProdTime: parseCleanNumber(item.ActualProdTime, 0),
    standardCapa: parseCleanNumber(item.StandardCapa, 0),
    actualCapa: parseCleanNumber(item.ActualCapa, 0),
    dpStatusCode,
    dpStatusText,
    timeStatus,
    timeStatusText,
    capaStatus,
    capaStatusText,
    note: item.UserMemo || item.note || item.Remark || ''
  }
}

import {
  getCachedMasters,
  setCachedMasters,
  getCachedDetail,
  setCachedDetail,
  getCachedActiveMaster,
  setCachedActiveMaster,
  clearReportCache
} from '../../../common/reportDataCache'

export default function HanoiGs1PlanPage() {
  const cacheKey = 'hanoi_plan'
  const cachedInitialMasters = getCachedMasters(cacheKey) || []
  const cachedInitialActiveMaster =
    getCachedActiveMaster(cacheKey) ||
    (cachedInitialMasters.length > 0 ? cachedInitialMasters[0] : null)
  const initialDetailKey = cachedInitialActiveMaster
    ? cachedInitialActiveMaster.RegCode || cachedInitialActiveMaster.IdSeq
    : null
  const cachedInitialDataset = initialDetailKey
    ? getCachedDetail(`hanoi_plan_${initialDetailKey}`) || []
    : []

  const [loading, setLoading] = useState(cachedInitialMasters.length === 0)
  const [masterList, setMasterList] = useState(cachedInitialMasters)
  const [selectedMasterKey, setSelectedMasterKey] = useState(
    initialDetailKey ? String(initialDetailKey) : null
  )
  const [currentMaster, setCurrentMaster] = useState(cachedInitialActiveMaster)
  const [planDataset, setPlanDataset] = useState(cachedInitialDataset)
  const [dataSourceType, setDataSourceType] = useState(
    cachedInitialDataset.length > 0 ? 'database' : 'empty'
  )

  const loadDetailForMaster = useCallback(async (master, forceRefresh = false) => {
    if (!master) return
    const regCode = master.RegCode || master.regCode
    const masterSeq = master.MasterSeq || master.IdSeq
    const detailKey = `hanoi_plan_${regCode || masterSeq}`

    if (!forceRefresh) {
      const cached = getCachedDetail(detailKey)
      if (cached && cached.length > 0) {
        setPlanDataset(cached)
        setDataSourceType('database')
        setLoading(false)
        return
      }
    }

    setLoading(true)
    try {
      let rows = []
      // 1. Ưu tiên gọi API Tổng Hợp KHSX từ Backend
      if (regCode || masterSeq) {
        try {
          const resAgg = await queryProductionPlanReport({
            regCode: regCode,
            masterSeq: masterSeq,
            factoryCode: 'GS1',
            pageSize: '10000'
          })
          if (resAgg?.data?.items && resAgg.data.items.length > 0) {
            const beItems = resAgg.data.items
            const mappedData = beItems.map((item, idx) => mapDBRowToPlanItem(item, idx, master))
            setCachedDetail(detailKey, mappedData)
            setPlanDataset(mappedData)
            setDataSourceType('database')
            setLoading(false)
            return
          }
        } catch (errAgg) {
          console.warn('Fallback sang truy vấn chi tiết PlanDetail:', errAgg)
        }
      }

      // 2. Fallback sang truy vấn trực tiếp PlanDetail nếu cần
      if (regCode || masterSeq) {
        try {
          const resPlan = await queryPlanDetail({
            RegCode: regCode,
            MasterSeq: masterSeq,
            pageSize: '10000'
          })
          if (resPlan?.data && resPlan.data.length > 0) {
            rows = resPlan.data
          }
        } catch (errPlan) {
          console.warn('Không tìm thấy trong PlanDetail:', errPlan)
        }
      }

      if (rows.length > 0) {
        const mappedData = rows.map((item, idx) => mapDBRowToPlanItem(item, idx, master))
        setCachedDetail(detailKey, mappedData)
        setPlanDataset(mappedData)
        setDataSourceType('database')
      } else {
        setPlanDataset([])
        setDataSourceType('empty')
      }
    } catch (err) {
      console.error(`Lỗi tải chi tiết đợt ${regCode}:`, err)
      setPlanDataset([])
      setDataSourceType('empty')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch danh sách Master các đợt đăng ký từ CSDL (SWR Caching)
  const fetchMastersAndLatestData = useCallback(
    async (targetRegCode = null, forceRefresh = false) => {
      if (forceRefresh) {
        clearReportCache(cacheKey)
      }
      if (!getCachedMasters(cacheKey) || forceRefresh) {
        setLoading(true)
      }
      try {
        const resAll = await queryPlanMaster({ FactoryCode: 'GS1', ReportType: 'plan' })
        const allMasters = resAll?.data || []

        const masters = allMasters.filter((m) => {
          const code = String(m.FactoryCode || m.factoryCode || '')
            .toUpperCase()
            .trim()
          const f = String(m.FactoryName || m.factoryName || '')
            .toLowerCase()
            .trim()
          const isHanoi =
            (code === 'GS1' ||
              code === 'HANOI' ||
              f.includes('hà nội') ||
              f.includes('ha noi') ||
              f.includes('hanoi') ||
              f.includes('gs1')) &&
            !f.includes('quế võ') &&
            !f.includes('gs5') &&
            !f.includes('quevo') &&
            code !== 'GS5'
          const isPlan =
            m.ReportType === 'plan' ||
            m.ReportType === 'khsx' ||
            m.ReportType === 'Kế hoạch sản xuất' ||
            String(m.ReportType || '')
              .toLowerCase()
              .includes('kế hoạch') ||
            String(m.ReportType || '')
              .toLowerCase()
              .includes('plan')
          return isHanoi && isPlan
        })

        masters.sort((a, b) => {
          const dateA = new Date(a.CreatedAt || a.ApplyDate || 0).getTime()
          const dateB = new Date(b.CreatedAt || b.ApplyDate || 0).getTime()
          return dateB - dateA || (b.IdSeq || b.MasterSeq || 0) - (a.IdSeq || a.MasterSeq || 0)
        })

        setCachedMasters(cacheKey, masters)
        setMasterList(masters)

        if (masters.length > 0) {
          let activeMaster = null
          if (targetRegCode) {
            activeMaster = masters.find(
              (m) =>
                (m.RegCode || m.regCode) === targetRegCode ||
                String(m.IdSeq || m.MasterSeq) === String(targetRegCode)
            )
          }
          if (!activeMaster) {
            activeMaster =
              masters.find((m) => m.ReportType === 'plan' || m.ReportType === 'khsx') || masters[0]
          }

          const activeKey =
            activeMaster.RegCode ||
            activeMaster.regCode ||
            String(activeMaster.IdSeq || activeMaster.MasterSeq)
          setSelectedMasterKey(activeKey)
          setCurrentMaster(activeMaster)
          setCachedActiveMaster(cacheKey, activeMaster)

          await loadDetailForMaster(activeMaster, forceRefresh)
        } else {
          setSelectedMasterKey(null)
          setCurrentMaster(null)
          setPlanDataset([])
          setDataSourceType('empty')
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu đăng ký KHSX GS1 Hà Nội:', err)
        if (!getCachedMasters(cacheKey)) {
          setSelectedMasterKey(null)
          setCurrentMaster(null)
          setPlanDataset([])
          setDataSourceType('empty')
        }
      } finally {
        setLoading(false)
      }
    },
    [loadDetailForMaster]
  )

  useEffect(() => {
    fetchMastersAndLatestData()
  }, [fetchMastersAndLatestData])

  const handleSelectMaster = (regCode) => {
    if (!regCode) return
    setSelectedMasterKey(regCode)
    const found = masterList.find(
      (m) =>
        (m.RegCode || m.regCode) === regCode || String(m.IdSeq || m.MasterSeq) === String(regCode)
    )
    if (found) {
      setCurrentMaster(found)
      setCachedActiveMaster(cacheKey, found)
      loadDetailForMaster(found)
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 w-full overflow-y-auto">
        <HanoiGs1PlanReport
          plantKey="hanoi_gs1"
          plantName="Nhà máy GS1 Hà Nội"
          dataset={planDataset}
          initialData={planDataset}
          masterList={masterList}
          selectedMasterKey={selectedMasterKey}
          onSelectMaster={handleSelectMaster}
          onRefreshMaster={() => fetchMastersAndLatestData(null, true)}
          currentMaster={currentMaster}
          dataSourceType={dataSourceType}
          loadingMaster={loading}
        />
      </div>
    </div>
  )
}
