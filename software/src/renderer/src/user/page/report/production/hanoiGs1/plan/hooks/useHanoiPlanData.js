import { useState, useEffect, useCallback } from 'react'
import {
  queryPlanMaster,
  queryHanoiGs1PlanReport
} from '../../../../registration/services/planRegistrationService'
import {
  getCachedMasters,
  setCachedMasters,
  getCachedDetail,
  setCachedDetail,
  getCachedActiveMaster,
  setCachedActiveMaster,
  clearReportCache
} from '../../../../common/reportDataCache'
import { getMasterEffectiveDate } from '../../../../common/reportFormatters'
import { mapHanoiPlanRow } from '../utils/hanoiPlanMapper'

const CACHE_KEY = 'hanoi_plan'

export function useHanoiPlanData({ pagePerms } = {}) {
  const cachedInitialMasters = getCachedMasters(CACHE_KEY) || []
  const cachedInitialActiveMaster =
    getCachedActiveMaster(CACHE_KEY) ||
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
      if (regCode || masterSeq) {
        const resAgg = await queryHanoiGs1PlanReport({
          regCode: regCode,
          masterSeq: masterSeq,
          factoryCode: 'GS1',
          pageSize: '10000'
        })
        const beItems =
          resAgg?.data?.items ||
          resAgg?.data?.data?.items ||
          (Array.isArray(resAgg?.data) ? resAgg.data : [])
        if (beItems && beItems.length > 0) {
          const mappedData = beItems.map((item, idx) => mapHanoiPlanRow(item, idx, master))
          setCachedDetail(detailKey, mappedData)
          setPlanDataset(mappedData)
          setDataSourceType('database')
          setLoading(false)
          return
        }
      }

      setPlanDataset([])
      setDataSourceType('empty')
    } catch (err) {
      console.error(`Lỗi tải chi tiết đợt ${regCode}:`, err)
      setPlanDataset([])
      setDataSourceType('empty')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMastersAndLatestData = useCallback(
    async (targetRegCode = null, forceRefresh = false) => {
      if (forceRefresh) {
        clearReportCache(CACHE_KEY)
      }
      if (!getCachedMasters(CACHE_KEY) || forceRefresh) {
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
            m.reportType === 'plan' ||
            m.ReportType === 'khsx' ||
            m.reportType === 'khsx' ||
            m.ReportType === 'Kế hoạch sản xuất' ||
            m.reportType === 'Kế hoạch sản xuất' ||
            String(m.ReportType || m.reportType || '')
              .toLowerCase()
              .includes('kế hoạch') ||
            String(m.ReportType || m.reportType || '')
              .toLowerCase()
              .includes('plan')
          return isHanoi && isPlan
        })

        masters.sort((a, b) => {
          const dateA = getMasterEffectiveDate(a)
          const dateB = getMasterEffectiveDate(b)
          if (dateB !== dateA) return dateB - dateA
          const createA = new Date(a.CreatedAt || a.createdAt || 0).getTime()
          const createB = new Date(b.CreatedAt || b.createdAt || 0).getTime()
          if (createB !== createA) return createB - createA
          return String(b.IdSeq || b.idSeq || b.RegCode || b.regCode || '').localeCompare(
            String(a.IdSeq || a.idSeq || a.RegCode || a.regCode || '')
          )
        })

        setCachedMasters(CACHE_KEY, masters)
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
          setCachedActiveMaster(CACHE_KEY, activeMaster)

          await loadDetailForMaster(activeMaster, forceRefresh)
        } else {
          setSelectedMasterKey(null)
          setCurrentMaster(null)
          setPlanDataset([])
          setDataSourceType('empty')
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu đăng ký KHSX GS1 Hà Nội:', err)
        if (!getCachedMasters(CACHE_KEY)) {
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
      setCachedActiveMaster(CACHE_KEY, found)
      loadDetailForMaster(found)
    }
  }

  const handleRefresh = () => {
    fetchMastersAndLatestData(null, true)
  }

  return {
    loading,
    masterList,
    selectedMasterKey,
    currentMaster,
    planDataset,
    dataSourceType,
    handleSelectMaster,
    handleRefresh
  }
}
