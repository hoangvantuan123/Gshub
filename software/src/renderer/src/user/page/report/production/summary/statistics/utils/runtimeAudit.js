const HN_SON_PREFIX = 'HN-SON'

/** HN-SON machines keep their production data, but are excluded from runtime audits. */
export const isRuntimeAuditExcludedMachine = (item = {}) => {
  if (item.runtimeAuditExcluded === true || item.RuntimeAuditExcluded === true) return true

  const auditCategory = String(item.auditCategory || item.AuditCategory || '')
    .trim()
    .toUpperCase()
  if (auditCategory === 'EXCLUDED_MACHINE') return true

  const machineIdentifiers = [
    item.machineCode,
    item.MachineCode,
    item.MachineCodeVal,
    item.MachineId,
    item.RawLineCode,
    item.rawLineCode,
    item.machineName,
    item.MachineName,
    item.MachineNameVal,
    item.RawLineName,
    item.rawLineName,
    item.WorkCenter,
    item.workCenter
  ]

  return machineIdentifiers.some((value) =>
    String(value ?? '')
      .trim()
      .toUpperCase()
      .startsWith(HN_SON_PREFIX)
  )
}
