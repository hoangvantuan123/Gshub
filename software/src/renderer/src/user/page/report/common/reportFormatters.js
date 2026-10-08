/**
 * Pure Utility & Formatting Functions for Production Reports
 */

export function parseCleanNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return defaultVal
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

export function parseDurationToMinutes(rawTime, startTime, endTime, _startDate = '', _endDate = '') {
  // 1. Ưu tiên số phút từ ActualRunTime từ MES nếu có giá trị > 0
  if (rawTime !== undefined && rawTime !== null && rawTime !== '') {
    const str = String(rawTime).trim().replace(',', '.')
    if (str.includes(':')) {
      const parts = str.split(':').map((v) => parseFloat(v) || 0)
      const totalMin = parts[0] * 60 + (parts[1] || 0) + (parts[2] || 0) / 60
      if (totalMin > 0) return Number(totalMin.toFixed(1))
    }
    const val = parseFloat(str)
    if (!isNaN(val) && val > 0) {
      return Number(val.toFixed(1))
    }
  }

  // 2. Nếu không có ActualRunTime, tính toán trực tiếp từ chênh lệch StartTime và EndTime
  if (startTime && endTime) {
    const sStr = String(startTime).trim()
    const eStr = String(endTime).trim()

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
      if (diff < 0) diff += 1440 // Ca làm việc qua đêm
      if (diff >= 0 && diff <= 1440) {
        return Number(diff.toFixed(1))
      }
    }
  }

  if (rawTime !== undefined && rawTime !== null && String(rawTime).trim() === '0') {
    return 0
  }
  return 0
}

export function normalizeDateString(dateStr) {
  if (!dateStr) return ''
  const s = String(dateStr).trim()
  if (!s) return ''

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10)
  }

  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/')
    if (parts.length === 3) {
      let [m, d, y] = parts
      if (y.length === 2) y = `20${y}`
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  if (s.includes('-')) {
    const parts = s.split(' ')[0].split('-')
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      const [d, m, y] = parts
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  return s
}

export function getMasterEffectiveDate(item) {
  if (!item) return 0
  const applyDate = item.ApplyDate || item.applyDate
  if (applyDate) {
    const t = new Date(applyDate).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  const reg = String(item.RegCode || item.regCode || '')
  const match = reg.match(/_(\d{4})(\d{2})(\d{2})_/)
  if (match) {
    const t = new Date(`${match[1]}-${match[2]}-${match[3]}`).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  const date = item.Date || item.date
  if (date) {
    const t = new Date(date).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  const created = item.CreatedAt || item.createdAt
  if (created) {
    const t = new Date(created).getTime()
    if (!isNaN(t) && t > 0) return t
  }
  return 0
}
