import decodeJWT from './decode-JWT.js'

// Parsing for UI only. Backend authorization verifies signature and database grants.
export function parseRolesMenu(rawToken, userInfo = {}, now = Date.now()) {
  if (typeof rawToken !== 'string' || rawToken.split('.').length !== 3) {
    throw new Error(
      'Server chưa trả token quyền menu hợp lệ. Vui lòng cập nhật backend và đăng nhập lại.'
    )
  }
  const claims = decodeJWT(rawToken)
  if (!Array.isArray(claims?.data) || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now) {
    throw new Error('Token quyền menu thiếu dữ liệu hoặc đã hết hạn. Vui lòng đăng nhập lại.')
  }
  if (
    (claims.token_use && claims.token_use !== 'permissions') ||
    (claims.sub && String(claims.sub) !== String(userInfo.UserSeq))
  ) {
    throw new Error('Token quyền menu không thuộc tài khoản đang đăng nhập.')
  }
  const section = (name) => {
    const rows = claims.data.find((value) => value && Object.hasOwn(value, name))?.[name] ?? []
    if (!Array.isArray(rows)) throw new Error('Dữ liệu quyền menu từ server không đúng cấu trúc.')
    return rows
  }
  return {
    settingItems: section('menu'),
    rootMenuItems: section('rootMenu'),
    menuItemList: section('menuItem'),
    roleTable: section('roleTable'),
    actions: section('action'),
    userId: userInfo.UserId || '',
    userSeq: userInfo.UserSeq || claims.sub || '',
    expiresAt: claims.exp * 1000
  }
}
