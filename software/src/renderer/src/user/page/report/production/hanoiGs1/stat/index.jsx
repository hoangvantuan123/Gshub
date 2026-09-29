import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, Tag, Spin, Tooltip } from 'antd'
import { RotateCw, Database, Calendar, Layers, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import ProductionStatisticsReport from '../../components/ProductionStatisticsReport'
import { initialHanoiGs1Stats } from '../../../common/reportUtils'
import {
  queryPlanMaster,
  queryProdStatsDetail,
  queryPlanDetail
} from '../../../data/import/services/planRegistrationService'

/**
 * Chuyển đổi định dạng thời gian (HH:mm hoặc số phút/giờ) sang Giờ thực tế (Hours)
 */
function parseRuntimeToHours(rawTime, startTime, endTime, qty = 0) {
  // 1. Nếu có StartTime và EndTime dạng giờ:phút
  if (startTime && endTime) {
    const sStr = String(startTime).trim()
    const eStr = String(endTime).trim()
    if (sStr.includes(':') && eStr.includes(':')) {
      const sParts = sStr.split(':').map((v) => parseFloat(v) || 0)
      const eParts = eStr.split(':').map((v) => parseFloat(v) || 0)
      const sHour = sParts[0] + (sParts[1] || 0) / 60
      const eHour = eParts[0] + (eParts[1] || 0) / 60
      let diff = eHour - sHour
      if (diff < 0) diff += 24 // Qua đêm
      if (diff > 0 && diff <= 24) return Number(diff.toFixed(2))
    }
  }

  // 2. Nếu có chuỗi thời gian ActualRunTime
  if (rawTime !== undefined && rawTime !== null && rawTime !== '') {
    const str = String(rawTime).trim().replace(',', '.')
    if (str.includes(':')) {
      const parts = str.split(':').map((v) => parseFloat(v) || 0)
      const hrs = parts[0] + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600
      if (hrs > 0) return Number(hrs.toFixed(2))
    }
    const val = parseFloat(str)
    if (!isNaN(val) && val > 0) {
      // Nếu giá trị > 24, trong sản xuất bao bì thường được ghi theo số phút (e.g. 450 phút = 7.5 giờ)
      if (val > 24) {
        return Number((val / 60).toFixed(2))
      }
      return Number(val.toFixed(2))
    }
  }

  // 3. Ước tính từ sản lượng nếu không có thời gian ghi nhận (định mức ~3500 sp/giờ)
  if (qty > 0) {
    const est = qty / 3500
    return Number(Math.min(12, Math.max(0.5, est)).toFixed(1))
  }

  return 7.5
}

/**
 * Hàm chuyển đổi bản ghi Chi tiết TKSX/KHSX từ Database sang định dạng chuẩn của Báo cáo Thống kê Sản xuất
 */
function mapDBRowToStatItem(item, idx, masterInfo) {
  const planQty =
    parseFloat(item.TargetProdQty || item.TargetPassQty || item.StandardMeters || 0) || 0
  const actualQty =
    parseFloat(item.ProdQty || item.ActualMeters || item.StatPassQty || 0) || planQty || 0
  const passQty =
    parseFloat(item.PassQty || item.StatPassQty || item.ProdQty || 0) || actualQty || 0
  const defectQty =
    parseFloat(item.DefectQty || 0) ||
    Math.max(0, actualQty - passQty) ||
    0
  const passRate =
    actualQty > 0
      ? Number(Math.min(100, Math.max(0, (passQty / actualQty) * 100)).toFixed(2))
      : 100

  // Tính toán runtime chính xác
  const runtimeHours = parseRuntimeToHours(
    item.ActualRunTime || item.ActualProdTime || item.BreakdownMinutes,
    item.StartTime,
    item.EndTime,
    actualQty || planQty
  )

  const prodDate =
    item.StatDate ||
    item.StartDate ||
    item.OpDate ||
    masterInfo?.ApplyDate ||
    new Date().toISOString().slice(0, 10)

  const machineCode = item.MachineCode || (item.MachineName ? String(item.MachineName).toUpperCase().replace(/\s+/g, '_').slice(0, 15) : `MC-${String(idx % 32 + 1).padStart(2, '0')}`)
  const machineName = item.MachineName || `Máy ${machineCode}`

  return {
    id: item.IdSeq ? String(item.IdSeq) : (item.StatTicketNo || `HN-STAT-${idx + 1}`),
    ticketNo: item.StatTicketNo || item.OperationNo || item.RegCode || `PTK-HN-${String(idx + 1).padStart(3, '0')}`,
    docNo: item.OperationNo || item.OrderNo || item.RoutingDocNo || `LSX-HN-2026-${String(idx + 1).padStart(4, '0')}`,
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
    shift: item.Shift || 'Ca 1',
    prodDate,
    createdSource: item.TicketCreationLocation || 'MES',
    syncDelayMinutes: parseFloat(item.SyncDelayMinutes || 0) || 3.0,
    isDuplicate: item.IsDuplicateTicket === 'true' || item.IsDuplicateTicket === '1',
    autoExportNote: item.AutoExport === 'true' || item.AutoExport === '1' || Boolean(item.ExportDocNo),
    supervisor: item.MainWorker || item.StatStaff || item.PicDp || item.CreatedByName || 'Quản lý sản xuất',
    status: item.Status || item.StatusDpSx || 'Hoàn thành',
    createdTime: item.TicketCreatedDate || (item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('vi-VN') : `${prodDate} 08:00:00`),
    syncTime: item.MesApprovalTime || (item.CreatedAt ? new Date(item.CreatedAt).toLocaleString('vi-VN') : `${prodDate} 08:05:00`),
    note: item.UserMemo || item.BreakdownReason || (item.ExportDocNo ? `Phiếu xuất ${item.ExportDocNo}` : '') || ''
  }
}

export default function HanoiGs1StatPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [masterList, setMasterList] = useState([])
  const [selectedMasterKey, setSelectedMasterKey] = useState(null)
  const [currentMaster, setCurrentMaster] = useState(null)
  const [statDataset, setStatDataset] = useState(initialHanoiGs1Stats)
  const [dataSourceType, setDataSourceType] = useState('sample') // 'database' | 'sample'

  // Fetch danh sách Master các đợt đăng ký từ CSDL
  const fetchMastersAndLatestData = useCallback(async (targetRegCode = null) => {
    setLoading(true)
    try {
      // 1. Lấy danh sách master đăng ký (ưu tiên GS1 Hà Nội, nếu không có lấy tất cả)
      let masters = []
      try {
        const resMaster = await queryPlanMaster({ FactoryName: 'GS1 Hà Nội' })
        masters = resMaster?.data || []
      } catch (e) {
        console.warn('Không lấy được master GS1 Hà Nội, thử lấy tất cả:', e)
      }

      if (masters.length === 0) {
        const resAll = await queryPlanMaster({})
        masters = resAll?.data || []
      }

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
            (m) => (m.RegCode || m.regCode) === targetRegCode || String(m.IdSeq || m.MasterSeq) === String(targetRegCode)
          )
        }
        if (!activeMaster) {
          activeMaster =
            masters.find((m) => m.ReportType === 'statistics' || m.ReportType === 'tksx') ||
            masters[0]
        }

        const activeKey = activeMaster.RegCode || activeMaster.regCode || String(activeMaster.IdSeq || activeMaster.MasterSeq)
        setSelectedMasterKey(activeKey)
        setCurrentMaster(activeMaster)

        // 2. Tải dữ liệu chi tiết của master này
        await loadDetailForMaster(activeMaster)
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

  // Tải chi tiết cho 1 Master cụ thể
  const loadDetailForMaster = async (master) => {
    if (!master) return
    const regCode = master.RegCode || master.regCode

    setLoading(true)
    try {
      let rows = []

      // 1. Ưu tiên thử lấy từ _ERPProdStatsDetail (Chi tiết TKSX) theo RegCode
      if (regCode) {
        try {
          const resStats = await queryProdStatsDetail({ RegCode: regCode })
          if (resStats?.data && resStats.data.length > 0) {
            rows = resStats.data
          }
        } catch (errStats) {
          console.warn('Không tìm thấy trong ProdStatsDetail:', errStats)
        }

        // 2. Nếu không có ở bảng TKSX, lấy từ _ERPPlanDetail (Chi tiết KHSX)
        if (rows.length === 0) {
          try {
            const resPlan = await queryPlanDetail({ RegCode: regCode })
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

  // Tự động tải dữ liệu khi trang mở
  useEffect(() => {
    fetchMastersAndLatestData()
  }, [fetchMastersAndLatestData])

  // Xử lý khi người dùng đổi đợt đăng ký từ dropdown
  const handleSelectMaster = (regCode) => {
    if (!regCode) return
    setSelectedMasterKey(regCode)
    const found = masterList.find(
      (m) => (m.RegCode || m.regCode) === regCode || String(m.IdSeq || m.MasterSeq) === String(regCode)
    )
    if (found) {
      setCurrentMaster(found)
      loadDetailForMaster(found)
    }
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
          onRefreshMaster={fetchMastersAndLatestData}
          currentMaster={currentMaster}
          dataSourceType={dataSourceType}
          loadingMaster={loading}
        />
      </div>
    </div>
  )
}
