export function getNow_yyyymmdd_hhmmss() {
  const now = new Date()

  const pad = (n) => String(n).padStart(2, '0')

  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const hh = pad(now.getHours())
  const mi = pad(now.getMinutes())
  const ss = pad(now.getSeconds())

  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`
}
