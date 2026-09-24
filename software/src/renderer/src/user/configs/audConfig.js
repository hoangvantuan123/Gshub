export const DEFAULT_AUD_LIMIT = 3000
export const DEFAULT_QAUD_LIMIT = 3000
export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 1500

export const AUD_MENU_LIMITS = {
  DEFAULT: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  ROOT_MENU: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PAGE_ROOT_MENU: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  tech_root: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  MENU_TECHNIQUE: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PAGE_MENU: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  tech_menu_items: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  USER_MANAGEMENT: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  ROLE_MANAGEMENT: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  DICT_SYS: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PAGE_SYS_ATTR_GROUP: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  SYS_ATTR_GROUP: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  sys_attr_group: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PAGE_SYS_ATTR_VALUE: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  SYS_ATTR_VALUE: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  sys_attr_value: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PAGE_PERM_ACTION: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PERM_ACTION: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  perm_action: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PAGE_PERM_SCOPE: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  PERM_SCOPE: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  },
  perm_scope: {
    PAGE: 1,
    PAGE_SIZE: 1500,
    LIMIT: 1500,
    QUERY: 3000,
    SAVE: 3000,
    ADD: 3000,
    UPDATE: 3000,
    DELETE: 3000
  }
}

export const QAUD_MENU_LIMITS = AUD_MENU_LIMITS

export function getAudLimit(menuKey, actionType = 'SAVE', options = {}) {
  const { defaultLimit = DEFAULT_AUD_LIMIT, customLimits = {} } = options

  const action = String(actionType || 'SAVE').toUpperCase()
  const normalizedAction =
    action === 'PAGE'
      ? 'PAGE'
      : action === 'PAGE_SIZE' || action === 'PAGESIZE' || action === 'LIMIT'
        ? 'PAGE_SIZE'
        : action === 'Q' || action === 'SEARCH'
          ? 'QUERY'
          : action === 'A'
            ? 'ADD'
            : action === 'U'
              ? 'UPDATE'
              : action === 'D'
                ? 'DELETE'
                : action

  if (customLimits && typeof customLimits === 'object') {
    if (typeof customLimits[normalizedAction] === 'number') {
      return customLimits[normalizedAction]
    }
    if (typeof customLimits[action] === 'number') {
      return customLimits[action]
    }
    if (normalizedAction === 'PAGE_SIZE' && typeof customLimits.LIMIT === 'number') {
      return customLimits.LIMIT
    }
    if (typeof customLimits.LIMIT === 'number' && normalizedAction === 'QUERY') {
      return customLimits.LIMIT
    }
  }

  if (menuKey && AUD_MENU_LIMITS[menuKey]) {
    const menuConfig = AUD_MENU_LIMITS[menuKey]
    if (typeof menuConfig === 'number') {
      return menuConfig
    }
    if (menuConfig && typeof menuConfig[normalizedAction] === 'number') {
      return menuConfig[normalizedAction]
    }
    if (menuConfig && typeof menuConfig.LIMIT === 'number' && normalizedAction === 'PAGE_SIZE') {
      return menuConfig.LIMIT
    }
    if (menuConfig && typeof menuConfig.SAVE === 'number' && normalizedAction === 'SAVE') {
      return menuConfig.SAVE
    }
    if (menuConfig && typeof menuConfig.QUERY === 'number' && normalizedAction === 'QUERY') {
      return menuConfig.QUERY
    }
  }

  if (AUD_MENU_LIMITS.DEFAULT && typeof AUD_MENU_LIMITS.DEFAULT[normalizedAction] === 'number') {
    return AUD_MENU_LIMITS.DEFAULT[normalizedAction]
  }

  if (normalizedAction === 'PAGE') return DEFAULT_PAGE
  if (normalizedAction === 'PAGE_SIZE') return DEFAULT_PAGE_SIZE

  return defaultLimit || DEFAULT_AUD_LIMIT
}

export function getQueryPagination(menuKey, options = {}) {
  const custom = options.customLimits || options || {}
  const defaultCfg = AUD_MENU_LIMITS.DEFAULT || {}
  const menuCfg = (menuKey && AUD_MENU_LIMITS[menuKey]) || defaultCfg

  const page =
    typeof custom.PAGE === 'number'
      ? custom.PAGE
      : typeof custom.Page === 'number'
        ? custom.Page
        : typeof menuCfg.PAGE === 'number'
          ? menuCfg.PAGE
          : DEFAULT_PAGE

  const pageSize =
    typeof custom.PAGE_SIZE === 'number'
      ? custom.PAGE_SIZE
      : typeof custom.PageSize === 'number'
        ? custom.PageSize
        : typeof custom.LIMIT === 'number'
          ? custom.LIMIT
          : typeof custom.Limit === 'number'
            ? custom.Limit
            : typeof menuCfg.PAGE_SIZE === 'number'
              ? menuCfg.PAGE_SIZE
              : typeof menuCfg.LIMIT === 'number'
                ? menuCfg.LIMIT
                : DEFAULT_PAGE_SIZE

  const maxQueryLimit =
    typeof custom.QUERY === 'number'
      ? custom.QUERY
      : typeof custom.Query === 'number'
        ? custom.Query
        : typeof custom.MAX_LIMIT === 'number'
          ? custom.MAX_LIMIT
          : typeof menuCfg.QUERY === 'number'
            ? menuCfg.QUERY
            : DEFAULT_QAUD_LIMIT

  return {
    page,
    pageSize,
    limit: pageSize,
    maxQueryLimit
  }
}

export const getQaudLimit = getAudLimit
