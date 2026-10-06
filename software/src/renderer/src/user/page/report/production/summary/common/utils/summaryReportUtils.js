import { getCleanDate } from '../../../../common/reportUtils'

export const parseCleanNumber = (val, defaultVal = 0) => {
  if (val === null || val === undefined || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val
  const cleanStr = String(val).replace(/,/g, '').trim()
  const n = Number(cleanStr)
  return isNaN(n) ? defaultVal : n
}

export const parseDurationToMinutes = (val, start, end) => {
  const num = parseCleanNumber(val, 0)
  if (num > 0) return num
  if (start && end) {
    try {
      const s = new Date(start)
      const e = new Date(end)
      const diffMs = e.getTime() - s.getTime()
      if (diffMs > 0) return Math.round(diffMs / 60000)
    } catch {
      // ignore
    }
  }
  return 0
}

export const normalizeDateString = (dateVal) => {
  if (!dateVal) return ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }
  return getCleanDate(s) || s
}

export const formatVNDateShort = (dateVal) => {
  if (!dateVal) return ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.slice(0, 10).split('-')
    return `${parts[2]}/${parts[1]}` // dd/MM (Ngày trước, tháng sau)
  }
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}`
  }
  return s
}

export const formatVNDateFull = (dateVal) => {
  if (!dateVal) return ''
  const s = String(dateVal).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.slice(0, 10).split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}` // dd/MM/yyyy (Ngày trước, tháng sau)
  }
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`
  }
  return s
}

export const formatLocalDate = (d) => {
  if (!d) return ''
  const dateObj = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return ''
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMasterEffectiveDate(item) {
  if (!item) return 0
  if (item.ApplyDate) {
    const t = new Date(item.ApplyDate).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  const reg = String(item.RegCode || item.regCode || '')
  const match = reg.match(/_(\d{4})(\d{2})(\d{2})_/)
  if (match) {
    const t = new Date(`${match[1]}-${match[2]}-${match[3]}`).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  if (item.Date) {
    const t = new Date(item.Date).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  if (item.CreatedAt) {
    const t = new Date(item.CreatedAt).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  return 0
}

export const calculateTotalDays = (dateRange, dataset = []) => {
  if (dateRange && dateRange[0] && dateRange[1]) {
    const d1 = new Date(dateRange[0])
    const d2 = new Date(dateRange[1])
    const diff = Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (!isNaN(diff) && diff > 0) return diff
  }
  const distinctDates = new Set()
  dataset.forEach((item) => {
    if (item.date) distinctDates.add(item.date)
  })
  if (distinctDates.size > 0) return distinctDates.size
  return 1
}
