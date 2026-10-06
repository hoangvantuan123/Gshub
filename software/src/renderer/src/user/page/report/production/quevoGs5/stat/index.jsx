function getMasterEffectiveDate(item) {
  if (!item) return 0
  // 1. Ưu tiên 1: ApplyDate (Ngày áp dụng thực tế của đợt KHSX / TKSX)
  if (item.ApplyDate) {
    const t = new Date(item.ApplyDate).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  // 2. Ưu tiên 2: Trích xuất từ mã RegCode (ví dụ: KHSX_20261003_8800 hoặc TKSX_20261003_...)
  const reg = String(item.RegCode || item.regCode || '')
  const match = reg.match(/_(\d{4})(\d{2})(\d{2})_/)
  if (match) {
    const t = new Date(`${match[1]}-${match[2]}-${match[3]}`).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  // 3. Ưu tiên 3: Trường Date
  if (item.Date) {
    const t = new Date(item.Date).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  // 4. Ưu tiên 4: CreatedAt (Thời điểm tạo/nạp phiếu)
  if (item.CreatedAt) {
    const t = new Date(item.CreatedAt).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  return 0
}

import { useState, useEffect, useCallback, useRef } from 'react'
import ProductionStatisticsReport from './components/ProductionStatisticsReport'
import { getCleanDate } from '../../../common/reportUtils'
import {
  queryPlanMaster,
  queryQuevoGs5StatReport
} from '../../../registration/services/planRegistrationService'
import {
  getCachedMasters,
  setCachedMasters,
  getCachedDetail,
  setCachedDetail,
  getCachedActiveMaster,
  setCachedActiveMaster,
  clearReportCache
} from '../../../common/reportDataCache'

/**
 * Chuyển đổi và tính toán chính xác Thời gian thao tác theo PHÚT (Duration in Minutes)
 */
function parseDurationToMinutes(rawTime, startTime, endTime, startDate = '', endDate = '') {
  // 1. Nếu có StartTime và EndTime
  if (startTime && endTime) {
    const sStr = String(startTime).trim()
    const eStr = String(endTime).trim()
    const sDateStr = String(startDate || '').trim()
    const eDateStr = String(endDate || '').trim()

    // Ghép đầy đủ ngày và giờ nếu có mốc ngày
    let sFull = sStr
    let eFull = eStr
    if (sDateStr && !sStr.includes(' ') && !sStr.includes('T')) {
      sFull = `${sDateStr} ${sStr}`
    }
    if (eDateStr && !eStr.includes(' ') && !eStr.includes('T')) {
      eFull = `${eDateStr} ${eStr}`
    }

    const parseTS = (fullStr) => {
      if (!fullStr) return null
      let [d, t] = fullStr.includes('T') ? fullStr.split('T') : fullStr.split(' ')
      if (!t && d && d.includes(':')) {
        t = d
        d = ''
      }
      let y, m, day
      if (d) {
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
          const p = d.slice(0, 10).split('-').map(Number)
          y = p[0]
          if (p[2] === 10 && p[1] <= 31) {
            day = p[1]
            m = p[2]
          } else {
            m = p[1]
            day = p[2]
          }
        } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(d)) {
          const p = d.split('/').map(Number)
          day = p[0]
          m = p[1]
          y = p[2] < 100 ? 2000 + p[2] : p[2]
        }
      }
      let hh = 0, mm = 0, ss = 0
      if (t && t.includes(':')) {
        const tp = t.split(':').map(Number)
        hh = tp[0] || 0
        mm = tp[1] || 0
        ss = tp[2] || 0
      }
      if (y && m && day) {
        return new Date(y, m - 1, day, hh, mm, ss).getTime()
      }
      return null
    }

    const sTs = parseTS(sFull)
    const eTs = parseTS(eFull)
    if (sTs !== null && eTs !== null && eTs >= sTs) {
      const diffMin = (eTs - sTs) / (1000 * 60)
      return Number(diffMin.toFixed(1))
    }

    if (sStr.includes(':') && eStr.includes(':')) {
      const sParts = sStr
        .split(' ')
        .pop()
        .split(':')
        .map((v) => parseFloat(v) || 0)
      const eParts = eStr
        .split(' ')
        .pop()
        .split(':')
        .map((v) => parseFloat(v) || 0)
      const sMin = (sParts[0] || 0) * 60 + (sParts[1] || 0) + (sParts[2] || 0) / 60
      const eMin = (eParts[0] || 0) * 60 + (eParts[1] || 0) + (eParts[2] || 0) / 60
      let diff = eMin - sMin
      if (diff < 0) diff += 1440
      return Number(diff.toFixed(1))
    }
  }

  // 2. Nếu có chuỗi thời gian ActualRunTime (Đơn vị trong hệ thống MES/ERP luôn là PHÚT)
  if (rawTime !== undefined && rawTime !== null && rawTime !== '') {
    const str = String(rawTime).trim().replace(',', '.')
    if (str.includes(':')) {
      const parts = str.split(':').map((v) => parseFloat(v) || 0)
      const totalMin = parts[0] * 60 + (parts[1] || 0) + (parts[2] || 0) / 60
      if (totalMin >= 0) return Number(totalMin.toFixed(1))
    }
    const val = parseFloat(str)
    if (!isNaN(val) && val >= 0) {
      return Number(val.toFixed(1))
    }
  }

  return 0
}

export function parseCleanNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return defaultVal
    // Fast path for plain integers or decimals without comma separators
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed)
      return isNaN(n) ? defaultVal : n
    }

    let s = trimmed.replace(/\s+/g, '')
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

    const num = parseFloat(s)
    return isNaN(num) ? defaultVal : num
  }

  const num = parseFloat(val)
  return isNaN(num) ? defaultVal : num
}

/**
 * Hàm chuyển đổi bản ghi Chi tiết TKSX/KHSX từ Database sang định dạng chuẩn của Báo cáo Thống kê Sản xuất GS5 Quế Võ
 */
function mapDBRowToStatItem(item, idx, masterInfo) {
  const planQty = parseCleanNumber(
    item.TargetProdQty || item.TargetPassQty || item.StandardMeters || 0
  )
  const actualQty =
    parseCleanNumber(item.ProdQty || item.ActualMeters || item.StatPassQty || 0) || planQty || 0
  const passQty =
    parseCleanNumber(item.PassQty || item.StatPassQty || item.ProdQty || 0) || actualQty || 0
  const parsedDefect = parseCleanNumber(item.DefectQty, 0)
  const defectQty = parsedDefect > 0 ? parsedDefect : Math.max(0, actualQty - passQty)
  const passRate =
    actualQty > 0 ? Number(Math.min(100, Math.max(0, (passQty / actualQty) * 100)).toFixed(2)) : 100

  const rawStart = item.StartTime || item.startTime || item.TicketCreatedDate || ''
  const rawEnd = item.EndTime || item.endTime || item.MesApprovalTime || ''
  const rawStartDate = item.StartDate || item.startDate || item.StatDate || item.statDate || ''
  const rawEndDate = item.EndDate || item.endDate || item.StatDate || item.statDate || ''

  // Tính toán durationMinutes và runtimeHours chính xác theo phút (hỗ trợ thông ngày)
  const finalDurationMinutes = parseDurationToMinutes(
    item.DurationMinutes ||
      item.durationMinutes ||
      item.ActualRunTime ||
      item.ActualProdTime ||
      item.BreakdownMinutes,
    rawStart,
    rawEnd,
    rawStartDate,
    rawEndDate
  )

  const runtimeHours = Number((finalDurationMinutes / 60).toFixed(2))

  const rawDate =
    item.StatDate ||
    item.statDate ||
    item.StartDate ||
    item.startDate ||
    item.OpDate ||
    item.opDate ||
    item.TicketCreatedDate ||
    item.ticketCreatedDate ||
    masterInfo?.ApplyDate ||
    new Date().toISOString().slice(0, 10)

  const prodDate = getCleanDate(rawDate) || new Date().toISOString().slice(0, 10)

  const rawMachineCode =
    item.MachineCode ||
    item.machineCode ||
    item.MachineId ||
    item.machineId ||
    item.RawLineCode ||
    item.rawLineCode ||
    ''

  const rawMachineName =
    item.MachineName ||
    item.machineName ||
    item.RawLineName ||
    item.rawLineName ||
    item.WorkCenter ||
    item.workCenter ||
    ''

  let machineCode = rawMachineCode ? String(rawMachineCode).trim() : ''
  let machineName = rawMachineName ? String(rawMachineName).trim() : machineCode || ''

  const rawTeam =
    item.TeamName ||
    item.teamName ||
    item.team ||
    item.OpTypeName ||
    item.opTypeName ||
    item.OperationName ||
    item.operationName ||
    item.ProcessName ||
    item.processName ||
    item.SectionName ||
    item.DeptName ||
    ''

  const team = rawTeam ? String(rawTeam).trim() : ''
  const teamCode = team
    ? team
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')
    : ''

  return {
    ...item,
    id: item.IdSeq ? String(item.IdSeq) : item.StatTicketNo || String(idx + 1),
    ticketNo: item.StatTicketNo || item.statTicketNo || item.ticketNo || item.RegCode || '',
    StatTicketNo: item.StatTicketNo || item.statTicketNo || item.ticketNo || item.RegCode || '',
    docNo: item.OperationNo || item.operationNo || item.RoutingDocNo || item.routingDocNo || '',
    OperationNo:
      item.OperationNo || item.operationNo || item.RoutingDocNo || item.routingDocNo || '',
    OrderNo: item.OrderNo || item.orderNo || '',
    orderNo: item.OrderNo || item.orderNo || '',
    team,
    teamCode,
    TeamName: item.TeamName || item.teamName || team,
    machineName,
    machineCode,
    MachineCode: item.MachineCode || machineCode,
    MachineName: item.MachineName || machineName,
    isManual: false,
    itemCode: item.ItemCode || item.itemCode || '',
    itemName: item.ItemName || item.itemName || '',
    ItemCode: item.ItemCode || item.itemCode || '',
    ItemName: item.ItemName || item.itemName || '',
    Customer: item.Customer || item.customer || '',
    customer: item.Customer || item.customer || '',
    ProcessName: item.ProcessName || item.processName || '',
    MainWorker: item.MainWorker || item.mainWorker || item.PicDp || '',
    SubWorker1: item.SubWorker1 || item.subWorker1 || '',
    SubWorker2: item.SubWorker2 || item.subWorker2 || '',
    StatStaff: item.StatStaff || item.statStaff || '',
    SalesStaff: item.SalesStaff || item.salesStaff || '',
    BreakdownReason: item.BreakdownReason || item.breakdownReason || '',
    StandardMeters: parseCleanNumber(item.StandardMeters || item.standardMeters, 0),
    ActualMeters: parseCleanNumber(item.ActualMeters || item.actualMeters, 0),
    unit: item.Unit || item.unit || item.RoutingUnit || '',
    Unit: item.Unit || item.unit || item.RoutingUnit || '',
    planQty,
    actualQty,
    ProdQty: actualQty,
    passQty,
    PassQty: passQty,
    defectQty,
    passRate,
    PassRate: passRate,
    runtimeHours,
    durationMinutes: finalDurationMinutes,
    AuditCategory:
      finalDurationMinutes < 5
        ? 'UNDER_5MIN'
        : finalDurationMinutes > 720
          ? 'OVER_12H'
          : '5MIN_12H',
    shift: item.Shift || item.shift || '',
    Shift: item.Shift || item.shift || '',
    prodDate,
    StatDate: item.StatDate || item.statDate || prodDate,
    StartDate: item.StartDate || item.startDate || prodDate,
    EndDate: item.EndDate || item.endDate || prodDate,
    startTime: rawStart ? String(rawStart).replace('T', ' ') : '',
    endTime: rawEnd ? String(rawEnd).replace('T', ' ') : '',
    StartTime: rawStart ? String(rawStart).replace('T', ' ') : '',
    EndTime: rawEnd ? String(rawEnd).replace('T', ' ') : '',
    createdSource: item.TicketCreationLocation || item.createdSource || item.origin || '',
    syncDelayMinutes:
      item.SyncDelayMinutes !== undefined && item.SyncDelayMinutes !== null
        ? item.SyncDelayMinutes
        : item.syncDelayMinutes !== undefined && item.syncDelayMinutes !== null
          ? item.syncDelayMinutes
          : '',
    SyncDelayMinutes:
      item.SyncDelayMinutes !== undefined && item.SyncDelayMinutes !== null
        ? item.SyncDelayMinutes
        : item.syncDelayMinutes !== undefined && item.syncDelayMinutes !== null
          ? item.syncDelayMinutes
          : '',
    TicketCreatedDate: item.TicketCreatedDate || item.ticketCreatedDate || '',
    MesApprovalTime: item.MesApprovalTime || item.mesApprovalTime || '',
    isDuplicate: item.IsDuplicateTicket === 'true' || item.IsDuplicateTicket === '1',
    autoExportNote:
      item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo),
    AutoIoStatus:
      item.AutoIoStatus ||
      item.autoIoStatus ||
      item.AutoIOStatus ||
      (item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo)
        ? 'Có XKTĐ'
        : 'Không áp dụng XNTĐ'),
    autoIoStatus:
      item.AutoIoStatus ||
      item.autoIoStatus ||
      item.AutoIOStatus ||
      (item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo)
        ? 'Có XKTĐ'
        : 'Không áp dụng XNTĐ'),
    supervisor:
      item.MainWorker ||
      item.StatStaff ||
      item.PicDp ||
      item.CreatedByName ||
      'Quản lý sản xuất GS5',
    status: item.Status || item.StatusDpSx || 'Hoàn thành',
    createdTime:
      item.TicketCreatedDate ||
      (item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('vi-VN') : `${prodDate} 08:00:00`),
    syncTime:
      item.MesApprovalTime ||
      (item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('vi-VN') : `${prodDate} 08:05:00`),
    note:
      item.UserMemo ||
      item.BreakdownReason ||
      (item.ExportDocNo ? `Phiếu xuất ${item.ExportDocNo}` : '') ||
      ''
  }
}

export default function QuevoGs5StatPage() {
  const cacheKey = 'quevo_stat'
  const cachedInitialMasters = getCachedMasters(cacheKey) || []
  const cachedInitialActiveMaster =
    getCachedActiveMaster(cacheKey) ||
    (cachedInitialMasters.length > 0 ? cachedInitialMasters[0] : null)
  const initialDetailKey = cachedInitialActiveMaster
    ? cachedInitialActiveMaster.RegCode || cachedInitialActiveMaster.IdSeq
    : null
  const cachedInitialDataset = initialDetailKey
    ? getCachedDetail(`quevo_stat_${initialDetailKey}`) || []
    : []

  const [loading, setLoading] = useState(cachedInitialMasters.length === 0)
  const [masterList, setMasterList] = useState(cachedInitialMasters)
  const [selectedMasterKey, setSelectedMasterKey] = useState(
    initialDetailKey ? String(initialDetailKey) : null
  )
  const [currentMaster, setCurrentMaster] = useState(cachedInitialActiveMaster)
  const [statDataset, setStatDataset] = useState(
    cachedInitialDataset && cachedInitialDataset.length > 0 ? cachedInitialDataset : []
  )
  const [dataSourceType, setDataSourceType] = useState(
    cachedInitialDataset && cachedInitialDataset.length > 0 ? 'database' : 'empty'
  )

  // Tải chi tiết cho 1 Master cụ thể (sử dụng in-memory cache để chuyển đổi tức thì 0ms)
  const loadDetailForMaster = useCallback(async (master, forceRefresh = false) => {
    if (!master) return
    const regCode = master.RegCode || master.regCode || String(master.IdSeq || master.MasterSeq)
    const detailKey = `quevo_stat_${regCode}`

    if (!forceRefresh) {
      const cached = getCachedDetail(detailKey)
      if (cached && cached.length > 0) {
        setStatDataset(cached)
        setDataSourceType('database')
        setLoading(false)
        return
      }
    }

    setLoading(true)
    try {
      const apiRegCode = master.RegCode || master.regCode

      if (apiRegCode) {
        const resAgg = await queryQuevoGs5StatReport({
          regCode: apiRegCode,
          factoryCode: 'GS5',
          pageSize: '10000'
        })
        const beItems =
          resAgg?.data?.items ||
          resAgg?.data?.data?.items ||
          (Array.isArray(resAgg?.data) ? resAgg.data : [])
        if (beItems && beItems.length > 0) {
          const mappedData = beItems.map((item, idx) => mapDBRowToStatItem(item, idx, master))
          setCachedDetail(detailKey, mappedData)
          setStatDataset(mappedData)
          setDataSourceType('database')
          setLoading(false)
          return
        }
      }

      setStatDataset([])
      setDataSourceType('empty')
    } catch (err) {
      console.error(`Lỗi tải chi tiết đợt GS5 ${regCode}:`, err)
      setStatDataset([])
      setDataSourceType('empty')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch danh sách Master các đợt đăng ký từ CSDL cho GS5 Quế Võ
  const fetchMastersAndLatestData = useCallback(
    async (targetRegCode = null, clearCache = false) => {
      if (clearCache) {
        clearReportCache(cacheKey)
      }
      if (!getCachedMasters(cacheKey) || clearCache) {
        setLoading(true)
      }
      try {
        // 1. Lấy danh sách master đăng ký từ DB và lọc theo mã nhà máy GS5 (Quế Võ) và loại TKSX
        const resAll = await queryPlanMaster({ FactoryCode: 'GS5', ReportType: 'statistics' })
        const allMasters = resAll?.data || []

        const masters = allMasters.filter((m) => {
          const code = String(m.FactoryCode || m.factoryCode || '')
            .toUpperCase()
            .trim()
          const f = String(m.FactoryName || m.factoryName || '')
            .toLowerCase()
            .trim()
          const isQuevo =
            (code === 'GS5' ||
              code === 'QUEVO' ||
              f.includes('quế võ') ||
              f.includes('que vo') ||
              f.includes('quevo') ||
              f.includes('gs5')) &&
            !f.includes('hà nội') &&
            !f.includes('gs1') &&
            !f.includes('hanoi') &&
            code !== 'GS1'
          const isStat =
            m.ReportType === 'statistics' ||
            m.ReportType === 'tksx' ||
            m.ReportType === 'Thống kê sản xuất' ||
            String(m.ReportType || '')
              .toLowerCase()
              .includes('thống kê') ||
            String(m.ReportType || '')
              .toLowerCase()
              .includes('stat')
          return isQuevo && isStat
        })

        // Sắp xếp master mới nhất lên đầu
        masters.sort((a, b) => {
          const dateA = getMasterEffectiveDate(a)
          const dateB = getMasterEffectiveDate(b)
          if (dateB !== dateA) return dateB - dateA
          const createA = new Date(a.CreatedAt || 0).getTime()
          const createB = new Date(b.CreatedAt || 0).getTime()
          if (createB !== createA) return createB - createA
          return (b.IdSeq || b.MasterSeq || 0) - (a.IdSeq || a.MasterSeq || 0)
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
              masters.find((m) => m.ReportType === 'statistics' || m.ReportType === 'tksx') ||
              masters[0]
          }

          const activeKey =
            activeMaster.RegCode ||
            activeMaster.regCode ||
            String(activeMaster.IdSeq || activeMaster.MasterSeq)
          setSelectedMasterKey(activeKey)
          setCurrentMaster(activeMaster)
          setCachedActiveMaster(cacheKey, activeMaster)

          // 2. Tải dữ liệu chi tiết của master này
          await loadDetailForMaster(activeMaster, clearCache)
        } else {
          setSelectedMasterKey(null)
          setCurrentMaster(null)
          setStatDataset([])
          setDataSourceType('empty')
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu đăng ký TKSX GS5 Quế Võ:', err)
        if (!getCachedMasters(cacheKey)) {
          setSelectedMasterKey(null)
          setCurrentMaster(null)
          setStatDataset([])
          setDataSourceType('empty')
        }
      } finally {
        setLoading(false)
      }
    },
    [loadDetailForMaster]
  )

  // Tự động tải dữ liệu khi trang mở
  useEffect(() => {
    fetchMastersAndLatestData()
  }, [fetchMastersAndLatestData])

  // Xử lý khi người dùng đổi đợt đăng ký từ dropdown
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

  const handleRefresh = () => {
    fetchMastersAndLatestData(null, true)
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f0fdf4]/50">
      <div className="flex-1 w-full overflow-y-auto">
        <ProductionStatisticsReport
          plantKey="quevo_gs5"
          plantName="Nhà máy GS5 Quế Võ"
          dataset={statDataset}
          initialData={statDataset}
          masterList={masterList}
          selectedMasterKey={selectedMasterKey}
          onSelectMaster={handleSelectMaster}
          onRefreshMaster={handleRefresh}
          currentMaster={currentMaster}
          dataSourceType={dataSourceType}
          loadingMaster={loading}
        />
      </div>
    </div>
  )
}
