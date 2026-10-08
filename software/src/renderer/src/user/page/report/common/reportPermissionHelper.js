/**
 * Helper utilities for Report Permissions and Data Scoping
 */

/**
 * Lọc danh sách bản ghi hoặc master theo DataScope của người dùng
 * @param {Array} items - Danh sách bản ghi
 * @param {Object} pagePerms - Quyền từ hook usePagePermissions
 * @param {Object} currentUser - Thông tin tài khoản người dùng hiện tại
 */
export function applyDataScopeFilter(items = [], pagePerms = {}, currentUser = {}) {
  if (!Array.isArray(items) || items.length === 0) return []
  if (!pagePerms || pagePerms.isScopeAll) return items

  const userName = String(
    currentUser.UserName || currentUser.Login || currentUser.EmpName || ''
  ).toLowerCase()
  const userDept = String(currentUser.DeptName || currentUser.Department || '').toLowerCase()

  return items.filter((item) => {
    // 1. Nếu scope là 'owner' -> Chỉ xem dữ liệu do mình phụ trách / tạo
    if (pagePerms.isScopeOwner) {
      const pic = String(
        item.MainWorker || item.PicDp || item.CreatedByName || item.CreatedBy || ''
      ).toLowerCase()
      return pic.includes(userName)
    }

    // 2. Nếu scope là 'department' -> Chỉ xem tổ / bộ phận của mình
    if (pagePerms.isScopeDept) {
      const team = String(item.TeamName || item.teamName || item.OpTypeName || '').toLowerCase()
      return team.includes(userDept)
    }

    return true
  })
}

export default {
  applyDataScopeFilter
}
