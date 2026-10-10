/**
 * Global High-Speed In-Memory SWR Cache for Production Reports
 * - Instant 0ms page opening (no blank screens, no freezes)
 * - Background revalidation (Stale-While-Revalidate)
 * - Isolated per-plant and per-report partitioning
 * - Caches both Master batches and Detail records
 */

const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes fresh cache

const memoryCache = {
  masters: {}, // cacheKey -> { data, timestamp }
  details: {}, // detailKey -> { data, timestamp }
  activeMaster: {} // cacheKey -> masterObj
}

export function getCachedMasters(cacheKey) {
  const entry = memoryCache.masters[cacheKey]
  if (!entry) return null
  return entry.data
}

export function setCachedMasters(cacheKey, data) {
  memoryCache.masters[cacheKey] = {
    data,
    timestamp: Date.now()
  }
}

export function getCachedDetail(detailKey) {
  const entry = memoryCache.details[detailKey]
  if (!entry) return null
  return entry.data
}

export function setCachedDetail(detailKey, data) {
  memoryCache.details[detailKey] = {
    data,
    timestamp: Date.now()
  }
}

export function getCachedActiveMaster(cacheKey) {
  return memoryCache.activeMaster[cacheKey] || null
}

export function setCachedActiveMaster(cacheKey, master) {
  memoryCache.activeMaster[cacheKey] = master
}

export function isCacheFresh(cacheKey) {
  const entry = memoryCache.masters[cacheKey]
  if (!entry) return false
  return Date.now() - entry.timestamp < CACHE_TTL_MS
}

export function clearReportCache(cacheKey) {
  if (cacheKey) {
    delete memoryCache.masters[cacheKey]
    delete memoryCache.activeMaster[cacheKey]
    if (memoryCache.details) {
      Object.keys(memoryCache.details).forEach((k) => {
        if (k.startsWith(cacheKey) || k.includes(cacheKey)) {
          delete memoryCache.details[k]
        }
      })
    }
  } else {
    memoryCache.masters = {}
    memoryCache.details = {}
    memoryCache.activeMaster = {}
  }
}

export default {
  getCachedMasters,
  setCachedMasters,
  getCachedDetail,
  setCachedDetail,
  getCachedActiveMaster,
  setCachedActiveMaster,
  isCacheFresh,
  clearReportCache
}
