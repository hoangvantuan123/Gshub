import { useState, useEffect, useCallback, useRef } from 'react'
import ProductionStatisticsReport from './components/ProductionStatisticsReport'
import { initialHanoiGs1Stats } from '../../../common/reportUtils'
import {
  queryPlanMaster,
  queryProdStatsDetail,
  queryPlanDetail
} from '../../../data/import/services/planRegistrationService'

/**
 * Chuyển đổi và tính toán chính xác Thời gian thao tác theo PHÚT (Duration in Minutes)
 */
function parseDurationToMinutes(rawTime, startTime, endTime) {
  // 1. Nếu có StartTime và EndTime
  if (startTime && endTime) {
    const sStr = String(startTime).trim()
    const eStr = String(endTime).trim()

    const sDate = new Date(sStr.includes('T') ? sStr : sStr.replace(' ', 'T')).getTime()
    const eDate = new Date(eStr.includes('T') ? eStr : eStr.replace(' ', 'T')).getTime()
    if (!isNaN(sDate) && !isNaN(eDate) && eDate >= sDate) {
      const diffMin = (eDate - sDate) / (1000 * 60)
      if (diffMin >= 0 && diffMin <= 1440) {
        return Number(diffMin.toFixed(1))
      }
    }

    if (sStr.includes(':') && eStr.includes(':')) {
      const sParts = sStr.split(' ').pop().split(':').map((v) => parseFloat(v) || 0)
      const eParts = eStr.split(' ').pop().split(':').map((v) => parseFloat(v) || 0)
      const sMin = (sParts[0] || 0) * 60 + (sParts[1] || 0) + (sParts[2] || 0) / 60
      const eMin = (eParts[0] || 0) * 60 + (eParts[1] || 0) + (eParts[2] || 0) / 60
      let diff = eMin - sMin
      if (diff < 0) diff += 1440
      if (diff >= 0 && diff <= 1440) return Number(diff.toFixed(1))
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
 * Hàm chuyển đổi bản ghi Chi tiết TKSX/KHSX từ Database sang định dạng chuẩn của Báo cáo Thống kê Sản xuất
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

  // Tính toán durationMinutes và runtimeHours chính xác theo phút
  const durationMinutes =
    item.DurationMinutes !== undefined && item.DurationMinutes !== null && item.DurationMinutes !== ''
      ? Number(item.DurationMinutes)
      : item.durationMinutes !== undefined && item.durationMinutes !== null && item.durationMinutes !== ''
        ? Number(item.durationMinutes)
        : undefined

  const finalDurationMinutes =
    durationMinutes !== undefined
      ? durationMinutes
      : parseDurationToMinutes(
          item.ActualRunTime || item.ActualProdTime || item.BreakdownMinutes,
          item.StartTime || item.startTime || item.TicketCreatedDate,
          item.EndTime || item.endTime || item.MesApprovalTime
        )

  const runtimeHours =
    item.RuntimeHours !== undefined && item.RuntimeHours !== null && item.RuntimeHours !== ''
      ? Number(item.RuntimeHours)
      : Number((finalDurationMinutes / 60).toFixed(2))

  const prodDate =
    item.StatDate ||
    item.StartDate ||
    item.OpDate ||
    masterInfo?.ApplyDate ||
    new Date().toISOString().slice(0, 10)

  const machineCode =
    item.MachineCode ||
    (item.MachineName
      ? String(item.MachineName).toUpperCase().replace(/\s+/g, '_').slice(0, 15)
      : `MC-${String((idx % 32) + 1).padStart(2, '0')}`)
  const machineName = item.MachineName || `Máy ${machineCode}`

  return {
    id: item.IdSeq ? String(item.IdSeq) : item.StatTicketNo || `HN-STAT-${idx + 1}`,
    ticketNo:
      item.StatTicketNo ||
      item.OperationNo ||
      item.RegCode ||
      `PTK-HN-${String(idx + 1).padStart(3, '0')}`,
    docNo:
      item.OperationNo ||
      item.OrderNo ||
      item.RoutingDocNo ||
      `LSX-HN-2026-${String(idx + 1).padStart(4, '0')}`,
    team: item.TeamName || item.OperationName || 'Tổ In Offset',
    teamCode: item.TeamName ? item.TeamName.toUpperCase().replace(/\s+/g, '_') : 'TO_IN',
    machineName,
    machineCode,
    isManual: false,
    itemCode: item.ItemCode || 'BOX-GOLDSUN',
    itemName: item.ItemName || 'Bao bì cao cấp Goldsun',
    unit: item.Unit || item.RoutingUnit || 'Chiếc',
    planQty,
    actualQty,
    passQty,
    defectQty,
    passRate,
    runtimeHours,
    durationMinutes: finalDurationMinutes,
    AuditCategory:
      finalDurationMinutes < 5
        ? 'UNDER_5MIN'
        : finalDurationMinutes > 720
          ? 'OVER_12H'
          : '5MIN_12H',
    shift: item.Shift || 'Ca 1',
    prodDate,
    startTime:
      item.StartTime ||
      item.startTime ||
      (item.TicketCreatedDate
        ? String(item.TicketCreatedDate).slice(0, 19).replace('T', ' ')
        : `${prodDate} 07:30:00`),
    endTime:
      item.EndTime ||
      item.endTime ||
      (item.MesApprovalTime
        ? String(item.MesApprovalTime).slice(0, 19).replace('T', ' ')
        : `${prodDate} 15:30:00`),
    StartTime:
      item.StartTime ||
      item.startTime ||
      (item.TicketCreatedDate
        ? String(item.TicketCreatedDate).slice(0, 19).replace('T', ' ')
        : `${prodDate} 07:30:00`),
    EndTime:
      item.EndTime ||
      item.endTime ||
      (item.MesApprovalTime
        ? String(item.MesApprovalTime).slice(0, 19).replace('T', ' ')
        : `${prodDate} 15:30:00`),
    createdSource: item.TicketCreationLocation || 'MES',
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
      item.MainWorker || item.StatStaff || item.PicDp || item.CreatedByName || 'Quản lý sản xuất',
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

export default function HanoiGs1StatPage() {
  const [loading, setLoading] = useState(false)
  const [masterList, setMasterList] = useState([])
  const [selectedMasterKey, setSelectedMasterKey] = useState(null)
  const [currentMaster, setCurrentMaster] = useState(null)
  const [statDataset, setStatDataset] = useState(initialHanoiGs1Stats)
  const [dataSourceType, setDataSourceType] = useState('sample') // 'database' | 'sample'
  const cachedStatDataRef = useRef({})

  // Tải chi tiết cho 1 Master cụ thể (sử dụng in-memory cache để chuyển đổi tức thì 0ms)
  const loadDetailForMaster = async (master, forceRefresh = false) => {
    if (!master) return
    const regCode = master.RegCode || master.regCode || String(master.IdSeq || master.MasterSeq)

    if (!forceRefresh && cachedStatDataRef.current[regCode]) {
      setStatDataset(cachedStatDataRef.current[regCode])
      setDataSourceType('database')
      return
    }

    setLoading(true)
    try {
      let rows = []
      const apiRegCode = master.RegCode || master.regCode

      // 1. Ưu tiên thử lấy từ _ERPProdStatsDetail (Chi tiết TKSX) theo RegCode
      if (apiRegCode) {
        try {
          const resStats = await queryProdStatsDetail({ RegCode: apiRegCode, pageSize: '10000' })
          if (resStats?.data && resStats.data.length > 0) {
            rows = resStats.data
          }
        } catch (errStats) {
          console.warn('Không tìm thấy trong ProdStatsDetail:', errStats)
        }

        // 2. Nếu không có ở bảng TKSX, lấy từ _ERPPlanDetail (Chi tiết KHSX)
        if (rows.length === 0) {
          try {
            const resPlan = await queryPlanDetail({ RegCode: apiRegCode, pageSize: '10000' })
            if (resPlan?.data && resPlan.data.length > 0) {
              rows = resPlan.data
            }
          } catch (errPlan) {
            console.warn('Không tìm thấy trong PlanDetail:', errPlan)
          }
        }
      }

      if (rows.length > 0) {
        const mappedData = rows.map((item, idx) => mapDBRowToStatItem(item, idx, master))
        cachedStatDataRef.current[regCode] = mappedData
        setStatDataset(mappedData)
        setDataSourceType('database')
      } else {
        // Master rỗng dòng detail -> Fallback dữ liệu mẫu
        setStatDataset(initialHanoiGs1Stats)
        setDataSourceType('sample')
      }
    } catch (err) {
      console.error(`Lỗi tải chi tiết đợt ${regCode}:`, err)
      setStatDataset(initialHanoiGs1Stats)
      setDataSourceType('sample')
    } finally {
      setLoading(false)
    }
  }

  // Fetch danh sách Master các đợt đăng ký từ CSDL
  const fetchMastersAndLatestData = useCallback(async (targetRegCode = null, clearCache = false) => {
    if (clearCache) {
      cachedStatDataRef.current = {}
    }
    setLoading(true)
    try {
      // 1. Lấy danh sách master đăng ký từ DB và lọc CHẶT CHẼ theo mã nhà máy GS1 (Hà Nội) ngay từ API
      const resAll = await queryPlanMaster({ FactoryCode: 'GS1' })
      const allMasters = resAll?.data || []

      const masters = allMasters.filter((m) => {
        const code = String(m.FactoryCode || m.factoryCode || '')
          .toUpperCase()
          .trim()
        const f = String(m.FactoryName || m.factoryName || '')
          .toLowerCase()
          .trim()
        const isHanoi =
          code === 'GS1' ||
          f.includes('hà nội') ||
          f.includes('gs1') ||
          f.includes('hanoi') ||
          (!f.includes('quế võ') && !f.includes('gs5') && !f.includes('quevo'))
        const isStat =
          !m.ReportType ||
          m.ReportType === 'statistics' ||
          m.ReportType === 'tksx' ||
          m.ReportType === 'Thống kê sản xuất'
        return isHanoi && isStat
      })

      // Sắp xếp master mới nhất lên đầu
      masters.sort((a, b) => {
        const dateA = new Date(a.CreatedAt || a.ApplyDate || 0).getTime()
        const dateB = new Date(b.CreatedAt || b.ApplyDate || 0).getTime()
        return dateB - dateA || (b.IdSeq || b.MasterSeq || 0) - (a.IdSeq || a.MasterSeq || 0)
      })

      setMasterList(masters)

      if (masters.length > 0) {
        // Tìm master mục tiêu hoặc lấy master mới nhất (ưu tiên đợt TKSX nếu có)
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

        // 2. Tải dữ liệu chi tiết của master này
        await loadDetailForMaster(activeMaster, clearCache)
      } else {
        // Không có dữ liệu đăng ký trong DB -> Dùng dữ liệu mẫu
        setStatDataset(initialHanoiGs1Stats)
        setDataSourceType('sample')
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu đăng ký TKSX GS1 Hà Nội:', err)
      setStatDataset(initialHanoiGs1Stats)
      setDataSourceType('sample')
    } finally {
      setLoading(false)
    }
  }, [])

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
          plantKey="hanoi_gs1"
          plantName="Nhà máy GS Hà Nội"
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
