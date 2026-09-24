import { useMemo } from 'react'
import { findMenuByKey } from '../../permissions'

/**
 * Hook phân quyền tổng hợp chuẩn hóa cho toàn bộ Page trong ERP.
 * Hỗ trợ đầy đủ 6 nhóm quyền nghiệp vụ theo chuẩn Enterprise:
 *
 * 1. Quyền thao tác: canView, canCreate, canEdit, canDelete, canCopy, canImport, canExport
 * 2. Quyền nghiệp vụ: canSubmit, canApprove, canReject, canCancel, canConfirm, canExecute
 * 3. Quyền phạm vi dữ liệu: dataScope ('all' | 'company' | 'branch' | 'department' | 'project' | 'owner')
 * 4. Quyền trường dữ liệu: checkFieldAccess(fieldName), getFieldReadOnly(fieldName)
 * 5. Quyền kiểm soát kỳ: canLock, canUnlock, canClosePeriod, canReopenPeriod, canAdjust, canCreateVersion
 * 6. Quyền quản trị: canConfig, canAssignPerm, canChangeWorkflow, canManageDict, canViewAuditLog
 *
 * @param {Object} props
 * @param {Object} [props.permissions] - Danh sách full permission của user từ JWT/API
 * @param {string} [props.menuKey] - Mã định danh menu (vd: 'role_user_mgmt', 'tech_menu_items')
 * @param {boolean} [props.canCreate] - Quyền thêm từ Router
 * @param {boolean} [props.canEdit] - Quyền sửa từ Router
 * @param {boolean} [props.canDelete] - Quyền xóa từ Router
 * @param {boolean} [props.canView] - Quyền xem từ Router
 */
export function usePagePermissions({
  permissions = [],
  menuKey = '',
  canCreate = false,
  canEdit = false,
  canDelete = false,
  canView,
  ...extraProps
} = {}) {
  return useMemo(() => {
    // 1. Tìm thông tin quyền chi tiết của menu từ permissions list nếu có
    const currentMenuPerm = findMenuByKey(permissions, menuKey)

    // 2. Nhóm quyền thao tác cơ bản (Operations)
    // Kiểm tra nghiêm ngặt:
    // a. Nếu canView được truyền tường minh từ Router -> dùng canView
    // b. Nếu tìm thấy menu trong permissions -> dùng currentMenuPerm.View
    // c. Nếu có permissions list mà không có menu này -> chặn tuyệt đối (false)
    let computedCanView = true
    if (canView !== undefined) {
      computedCanView = Boolean(canView)
    } else if (currentMenuPerm && currentMenuPerm.View !== undefined) {
      computedCanView = Boolean(currentMenuPerm.View)
    } else {
      computedCanView = true
    }

    const actions = {
      canView: computedCanView,
      canSearch: computedCanView, // Không có quyền Xem thì KHÔNG được Tìm kiếm (Search)
      canCreate: computedCanView && Boolean(currentMenuPerm?.Create ?? canCreate ?? false),
      canEdit: computedCanView && Boolean(currentMenuPerm?.Edit ?? canEdit ?? false),
      canDelete: computedCanView && Boolean(currentMenuPerm?.Delete ?? canDelete ?? false),
      canCopy: computedCanView && Boolean(currentMenuPerm?.Copy ?? extraProps?.canCopy ?? false),
      canImport:
        computedCanView && Boolean(currentMenuPerm?.Import ?? extraProps?.canImport ?? false),
      canExport:
        computedCanView && Boolean(currentMenuPerm?.Export ?? extraProps?.canExport ?? false)
    }

    // 3. Nhóm quyền quy trình nghiệp vụ (Workflow / Approvals)
    const workflow = {
      canSubmit: currentMenuPerm?.Submit ?? extraProps?.canSubmit ?? false,
      canApprove: currentMenuPerm?.Approve ?? extraProps?.canApprove ?? false,
      canReject: currentMenuPerm?.Reject ?? extraProps?.canReject ?? false,
      canCancel: currentMenuPerm?.Cancel ?? extraProps?.canCancel ?? false,
      canConfirm: currentMenuPerm?.Confirm ?? extraProps?.canConfirm ?? false,
      canExecute: currentMenuPerm?.Execute ?? extraProps?.canExecute ?? false
    }

    // 4. Nhóm quyền phạm vi dữ liệu (Data Scope)
    // Các mức: 'all' (toàn bộ), 'company', 'branch', 'department', 'project', 'owner' (cá nhân)
    const dataScope = currentMenuPerm?.DataScope || extraProps?.dataScope || 'all'
    const scope = {
      dataScope,
      isScopeAll: dataScope === 'all',
      isScopeCompany: dataScope === 'company',
      isScopeDept: dataScope === 'department',
      isScopeOwner: dataScope === 'owner'
    }

    // 5. Nhóm quyền kiểm soát kỳ & đóng mở dữ liệu (Audit & Period Control)
    const control = {
      canLock: currentMenuPerm?.Lock ?? extraProps?.canLock ?? false,
      canUnlock: currentMenuPerm?.Unlock ?? extraProps?.canUnlock ?? false,
      canClosePeriod: currentMenuPerm?.ClosePeriod ?? extraProps?.canClosePeriod ?? false,
      canReopenPeriod: currentMenuPerm?.ReopenPeriod ?? extraProps?.canReopenPeriod ?? false,
      canAdjust: currentMenuPerm?.Adjust ?? extraProps?.canAdjust ?? false,
      canCreateVersion: currentMenuPerm?.CreateVersion ?? extraProps?.canCreateVersion ?? false
    }

    // 6. Nhóm quyền quản trị hệ thống (System & Administration)
    const admin = {
      canConfig: currentMenuPerm?.Config ?? extraProps?.canConfig ?? false,
      canAssignPerm: currentMenuPerm?.AssignPerm ?? extraProps?.canAssignPerm ?? false,
      canChangeWorkflow: currentMenuPerm?.ChangeWorkflow ?? extraProps?.canChangeWorkflow ?? false,
      canManageDict: currentMenuPerm?.ManageDict ?? extraProps?.canManageDict ?? false,
      canViewAuditLog: currentMenuPerm?.ViewAuditLog ?? extraProps?.canViewAuditLog ?? false
    }

    // 7. Nhóm quyền kiểm soát trường dữ liệu (Field-Level Permissions)
    const hiddenFields = new Set(currentMenuPerm?.HiddenFields || extraProps?.hiddenFields || [])
    const readOnlyFields = new Set(
      currentMenuPerm?.ReadOnlyFields || extraProps?.readOnlyFields || []
    )
    const requiredFields = new Set(
      currentMenuPerm?.RequiredFields || extraProps?.requiredFields || []
    )

    const fieldPerms = {
      isFieldVisible: (fieldId) => !hiddenFields.has(fieldId),
      isFieldReadOnly: (fieldId) => !actions.canEdit || readOnlyFields.has(fieldId),
      isFieldRequired: (fieldId) => requiredFields.has(fieldId)
    }

    return {
      raw: currentMenuPerm,
      ...actions,
      ...workflow,
      ...scope,
      ...control,
      ...admin,
      ...fieldPerms
    }
  }, [
    permissions,
    menuKey,
    canCreate,
    canEdit,
    canDelete,
    canView,
    extraProps?.hiddenFields,
    extraProps?.readOnlyFields,
    extraProps?.requiredFields,
    extraProps?.dataScope
  ])
}

export default usePagePermissions
