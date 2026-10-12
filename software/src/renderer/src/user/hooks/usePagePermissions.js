import { useMemo } from 'react'
import { findMenuByKey, resolveMenuOperation } from '../../permissions.js'

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
    const computedCanView = currentMenuPerm
      ? resolveMenuOperation(currentMenuPerm, 'View') && canView !== false
      : !menuKey && resolveMenuOperation({ View: canView }, 'View')

    const actions = {
      canView: computedCanView,
      canSearch:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Search', computedCanView),
      canCreate: computedCanView && resolveMenuOperation(currentMenuPerm, 'Create', canCreate),
      canPrint: computedCanView && resolveMenuOperation(currentMenuPerm, 'Print'),
      canSave:
        computedCanView &&
        resolveMenuOperation(
          currentMenuPerm,
          'Save',
          resolveMenuOperation(currentMenuPerm, 'Create', canCreate) ||
            resolveMenuOperation(currentMenuPerm, 'Edit', canEdit)
        ),
      canEdit: computedCanView && resolveMenuOperation(currentMenuPerm, 'Edit', canEdit),
      canDelete: computedCanView && resolveMenuOperation(currentMenuPerm, 'Delete', canDelete),
      canCopy:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Copy', extraProps?.canCopy),
      canImport:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Import', extraProps?.canImport),
      canExport:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Export', extraProps?.canExport)
    }

    // 3. Nhóm quyền quy trình nghiệp vụ (Workflow / Approvals)
    const workflow = {
      canSubmit:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Submit', extraProps?.canSubmit),
      canApprove:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Approve', extraProps?.canApprove),
      canReject:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Reject', extraProps?.canReject),
      canCancel:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Cancel', extraProps?.canCancel),
      canConfirm:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Confirm', extraProps?.canConfirm),
      canExecute:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Execute', extraProps?.canExecute)
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
      canLock:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Lock', extraProps?.canLock),
      canUnlock:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Unlock', extraProps?.canUnlock),
      canClosePeriod:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'ClosePeriod', extraProps?.canClosePeriod),
      canReopenPeriod:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'ReopenPeriod', extraProps?.canReopenPeriod),
      canAdjust:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Adjust', extraProps?.canAdjust),
      canCreateVersion:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'CreateVersion', extraProps?.canCreateVersion)
    }

    // 6. Nhóm quyền quản trị hệ thống (System & Administration)
    const admin = {
      canConfig:
        computedCanView && resolveMenuOperation(currentMenuPerm, 'Config', extraProps?.canConfig),
      canAssignPerm:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'AssignPerm', extraProps?.canAssignPerm),
      canChangeWorkflow:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'ChangeWorkflow', extraProps?.canChangeWorkflow),
      canManageDict:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'ManageDict', extraProps?.canManageDict),
      canViewAuditLog:
        computedCanView &&
        resolveMenuOperation(currentMenuPerm, 'ViewAuditLog', extraProps?.canViewAuditLog)
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
    extraProps?.dataScope,
    extraProps?.canCopy,
    extraProps?.canImport,
    extraProps?.canExport,
    extraProps?.canSubmit,
    extraProps?.canApprove,
    extraProps?.canReject,
    extraProps?.canCancel,
    extraProps?.canConfirm,
    extraProps?.canExecute,
    extraProps?.canLock,
    extraProps?.canUnlock,
    extraProps?.canClosePeriod,
    extraProps?.canReopenPeriod,
    extraProps?.canAdjust,
    extraProps?.canCreateVersion,
    extraProps?.canConfig,
    extraProps?.canAssignPerm,
    extraProps?.canChangeWorkflow,
    extraProps?.canManageDict,
    extraProps?.canViewAuditLog
  ])
}

export default usePagePermissions
