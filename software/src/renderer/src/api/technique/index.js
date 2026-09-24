import { apiPost } from '../../services/apiClient'

// ── Table Groups APIs (/role/TblGrp*) ──────────────────────
export const TblGrpA = (result, options = {}) => apiPost('/role/TblGrpA', { result }, options)
export const TblGrpU = (result, options = {}) => apiPost('/role/TblGrpU', { result }, options)
export const TblGrpD = (result, options = {}) => apiPost('/role/TblGrpD', { result }, options)
export const TblGrpQ = (result, options = {}) => apiPost('/role/TblGrpQ', { result }, options)

// ── Table Group Items APIs (/role/TblGrpItem*) ─────────────
export const TblGrpItemA = (result, options = {}) =>
  apiPost('/role/TblGrpItemA', { result }, options)
export const TblGrpItemU = (result, options = {}) =>
  apiPost('/role/TblGrpItemU', { result }, options)
export const TblGrpItemD = (result, options = {}) =>
  apiPost('/role/TblGrpItemD', { result }, options)
export const TblGrpItemQ = (result, options = {}) =>
  apiPost('/role/TblGrpItemQ', { result }, options)

// ── Table Group Permissions APIs (/role/TblGrpPerm*) ───────
export const TblGrpPermA = (result, options = {}) =>
  apiPost('/role/TblGrpPermA', { result }, options)
export const TblGrpPermU = (result, options = {}) =>
  apiPost('/role/TblGrpPermU', { result }, options)
export const TblGrpPermD = (result, options = {}) =>
  apiPost('/role/TblGrpPermD', { result }, options)
export const TblGrpPermQ = (result, options = {}) =>
  apiPost('/role/TblGrpPermQ', { result }, options)

// ── Table Group Role Permissions APIs (/role/TblGrpPermRole*) ──
export const TblGrpPermRoleA = (result, options = {}) =>
  apiPost('/role/TblGrpPermRoleA', { result }, options)
export const TblGrpPermRoleU = (result, options = {}) =>
  apiPost('/role/TblGrpPermRoleU', { result }, options)
export const TblGrpPermRoleD = (result, options = {}) =>
  apiPost('/role/TblGrpPermRoleD', { result }, options)
export const TblGrpPermRoleQ = (result, options = {}) =>
  apiPost('/role/TblGrpPermRoleQ', { result }, options)
