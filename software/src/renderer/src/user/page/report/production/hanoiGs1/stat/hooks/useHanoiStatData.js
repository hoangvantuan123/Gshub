import { useState, useEffect, useCallback } from 'react'
import {
  queryPlanMaster,
  queryHanoiGs1StatReport
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
import { mapHanoiStatRow } from '../utils/hanoiStatMapper'

const CACHE_KEY = 'hanoi_stat'

export function useHanoiStatData({ pagePerms } = {}) {
  const cachedInitialMasters = getCachedMasters(CACHE_KEY) || []
  const cachedInitialActiveMaster =
    getCachedActiveMaster(CACHE_KEY) ||
    (cachedInitialMasters.length > 0 ? cachedInitialMasters[0] : null)
  const initialDetailKey = cachedInitialActiveMaster
    ? cachedInitialActiveMaster.RegCode || cachedInitialActiveMaster.IdSeq
    : null
  const cachedInitialDataset = initialDetailKey
    ? getCachedDetail(`hanoi_stat_${initialDetailKey}`) || []
    : []

  const [loading, setLoading] = useState(cachedInitialMasters.length === 0)
  const [masterList, setMasterList] = useState(cachedInitialMasters)
  const [selectedMasterKey, setSelectedMasterKey] = useState(
    initialDetailKey ? String(initialDetailKey) : null
  )
  const [currentMaster, setCurrentMaster] = useState(cachedInitialActiveMaster)
  const [statDataset, setStatDataset] = useState(cachedInitialDataset)
  const [dataSourceType, setDataSourceType] = useState(
    cachedInitialDataset.length > 0 ? 'database' : 'empty'
  )

  const loadDetailForMaster = useCallback(async (master, forceRefresh = false) => {
    if (!master) return
    const regCode = master.RegCode || master.regCode || String(master.IdSeq || master.MasterSeq)
    const detailKey = `hanoi_stat_${regCode}`

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
        const resAgg = await queryHanoiGs1StatReport({
          regCode: apiRegCode,
          factoryCode: 'GS1',
          pageSize: '10000'
        })
        const beItems =
          resAgg?.data?.items ||
          resAgg?.data?.data?.items ||
          (Array.isArray(resAgg?.data) ? resAgg.data : [])
        if (beItems && beItems.length > 0) {
          const mappedData = beItems.map((item, idx) => mapHanoiStatRow(item, idx, master))
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
      console.error(`Lỗi tải chi tiết đợt ${regCode}:`, err)
      setStatDataset([])
      setDataSourceType('empty')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMastersAndLatestData = useCallback(
    async (targetRegCode = null, clearCache = false) => {
      if (clearCache) {
        clearReportCache(CACHE_KEY)
      }
      if (!getCachedMasters(CACHE_KEY) || clearCache) {
        setLoading(true)
      }
      try {
        const resAll = await queryPlanMaster({ FactoryCode: 'GS1', ReportType: 'statistics' })
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
          const isStat =
            m.ReportType === 'statistics' ||
            m.reportType === 'statistics' ||
            m.ReportType === 'tksx' ||
            m.reportType === 'tksx' ||
            m.ReportType === 'Thống kê sản xuất' ||
            m.reportType === 'Thống kê sản xuất' ||
            String(m.ReportType || m.reportType || '')
              .toLowerCase()
              .includes('thống kê') ||
            String(m.ReportType || m.reportType || '')
              .toLowerCase()
              .includes('stat')
          return isHanoi && isStat
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
              masters.find((m) => m.ReportType === 'statistics' || m.ReportType === 'tksx') ||
              masters[0]
          }

          const activeKey =
            activeMaster.RegCode ||
            activeMaster.regCode ||
            String(activeMaster.IdSeq || activeMaster.MasterSeq)
          setSelectedMasterKey(activeKey)
          setCurrentMaster(activeMaster)
          setCachedActiveMaster(CACHE_KEY, activeMaster)

          await loadDetailForMaster(activeMaster, clearCache)
        } else {
          setSelectedMasterKey(null)
          setCurrentMaster(null)
          setStatDataset([])
          setDataSourceType('empty')
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu đăng ký TKSX GS1 Hà Nội:', err)
        if (!getCachedMasters(CACHE_KEY)) {
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
    statDataset,
    dataSourceType,
    handleSelectMaster,
    handleRefresh
  }
}
