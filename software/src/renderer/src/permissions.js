// permissions.js

// Danh mục mapping tương đương giữa MenuKey cũ, MenuKey mới và URL Path
const KEY_ALIASES = [
  ['user_management', 'role_user_mgmt', 'user_access', 'user_mgmt', 'system_users'],
  ['role_management', 'role_mgmt', 'role_group', 'system_role_groups', 'PAGE_ROLE_GROUP'],
  [
    'role_perm',
    'role_permission',
    'PAGE_ROLE_MGMT',
    'system_permissions',
    'permission_assignment',
    'perm_assign'
  ],
  [
    'permission_assignment',
    'perm_assign',
    'tbl_grp_perm',
    'system_permissions',
    'system/permissions',
    '/erp/u/system/permissions'
  ],
  [
    'module_registry',
    'sys_module',
    'tech_root',
    'system_structure',
    'sys_structure',
    'system_modules',
    'system_root_modules'
  ],
  ['menu_registry', 'sys_menu', 'tech_menu_items', 'system_menus'],
  ['permission_catalog', 'perm_catalog'],
  ['permission_resource_registry', 'perm_resource', 'tbl_grp_reg'],
  ['permission_field_registry', 'perm_field'],
  ['permission_action_registry', 'perm_action', 'system_actions'],
  ['permission_scope_registry', 'perm_scope'],
  ['system_language', 'sys_lang', 'lang_sys', 'dict_mgmt'],
  ['system_dictionary', 'sys_dict', 'dict_sys_dict'],
  ['workflow_configuration', 'wf_config', 'wf_approval'],
  ['approval_delegation', 'wf_delegate'],
  ['workflow_catalog', 'wf_catalog'],
  ['workflow_status_registry', 'wf_status'],
  ['workflow_action_registry', 'wf_action'],
  ['workflow_assignee_registry', 'wf_assignee'],
  ['permission_inspection', 'audit_control', 'perm_check'],
  ['permission_lookup', 'perm_lookup'],
  ['permission_simulation', 'perm_sim'],
  ['system_audit', 'sys_audit'],
  ['authorization_audit_log', 'perm_log'],
  ['access_audit_log', 'access_log'],
  ['data_change_audit_log', 'change_log'],
  [
    'report_calc_production',
    'report_calc_production_query',
    'calc_production',
    'calc_production_query',
    'report/calc-production',
    'report/calc-production-query',
    'report_calc_production_group'
  ],
  ['report_registration', 'report_registration_group', 'report/registration'],
  ['report_plan_query', 'report/plan-query'],
  ['report_stat_query', 'report/stat-query'],
  ['report_handbook', 'report_handbook_group', 'report/handbook', 'report/handbook/formula']
]

const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, '')

const NORMALIZED_ALIASES = KEY_ALIASES.map((group) => new Set(group.map(normalize)))

const isKeyMatch = (key1, key2) => {
  if (!key1 || !key2) return false
  const n1 = normalize(key1)
  const n2 = normalize(key2)
  if (n1 === n2) return true

  for (const group of NORMALIZED_ALIASES) {
    if (group.has(n1) && group.has(n2)) {
      return true
    }
  }
  return false
}

export const findMenuByKey = (permissions, menuKey) => {
  if (!Array.isArray(permissions) || !menuKey) return null
  const target = String(menuKey).toLowerCase().trim()

  return (
    permissions.find((menu) => {
      if (!menu || menu.NavigationOnly) return false
      const k = String(menu.MenuKey || menu.menuKey || '')
        .toLowerCase()
        .trim()
      if (k && isKeyMatch(k, target)) return true

      // Khớp theo MenuLink nếu có (ví dụ URL link chứa key hoặc ngược lại)
      const link = String(menu.MenuLink || menu.menuLink || '')
        .toLowerCase()
        .trim()
      if (link) {
        const cleanLink = link.replace(/^\/erp\/u\//, '')
        if (isKeyMatch(link, target) || isKeyMatch(cleanLink, target)) return true
      }

      return false
    }) || null
  )
}

export const checkMenuPermission = (permissions, menuKey, action = 'View') => {
  const menu = findMenuByKey(permissions, menuKey)

  if (!menu) return false

  return resolveMenuOperation(menu, action)
}

const isAllowed = (value) =>
  value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'

// Legacy operation flags and BE action grants describe the same operation.
// Combine granted permissions; use the caller fallback only when BE declares neither.
export const resolveMenuOperation = (menu, operation, fallback = false) => {
  if (!menu) return isAllowed(fallback)
  const keys = new Set([normalize(operation), normalize(`BTN_${operation}`)])
  const values = [menu, menu.actions, menu.Actions]
    .filter((value) => value && typeof value === 'object')
    .flatMap((value) =>
      Object.entries(value)
        .filter(([key]) => keys.has(normalize(key)))
        .map(([, grant]) => grant)
    )
  return values.length ? values.some(isAllowed) : isAllowed(fallback)
}

export const checkActionPermission = (permissions, menuKey, actionKey) => {
  return checkMenuPermission(permissions, menuKey, actionKey)
}
