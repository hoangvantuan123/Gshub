/**
 * Quản lý định nghĩa và quy tắc cho các cột hệ thống trong toàn bộ ứng dụng ERP
 */

// Cột hệ thống cố định ở vị trí đầu tiên (WorkingTag - Trạng thái dòng)
export const SYSTEM_LOCKED_FIRST_COLUMNS = new Set(['WorkingTag', 'Status'])

// Các trường hệ thống nội bộ mặc định ẩn hoàn toàn trên Sheet và không hiển thị trong Cài đặt Sheet
export const SYSTEM_INTERNAL_HIDDEN_COLUMNS = new Set([
  'IdSeq',
  'IDSeq',
  'Id',
  'IdRow',
  'RowVersion',
  'rowversion',
  'AttrGroupSeq',
  'PermActionSeq',
  'ScopeLevelSeq',
  'RuleConditionSeq',
  'LanguageSeq',
  'isEdited',
  'Idx'
])

// Tập hợp tất cả các cột hệ thống không cho phép người dùng cấu hình ẩn/hiện trong Drawer Cài đặt Sheet
export const SYSTEM_NON_CONFIGURABLE_COLUMNS = new Set([
  ...SYSTEM_LOCKED_FIRST_COLUMNS,
  ...SYSTEM_INTERNAL_HIDDEN_COLUMNS
])

/**
 * Kiểm tra xem 1 cột có phải cột hệ thống không được phép hiển thị trong Drawer Cài đặt Sheet hay không
 * @param {Object|string} colOrId
 * @returns {boolean}
 */
export const isSystemHiddenColumn = (colOrId) => {
  if (!colOrId) return false
  const id = typeof colOrId === 'string' ? colOrId : colOrId.id || colOrId.key || ''
  if (SYSTEM_NON_CONFIGURABLE_COLUMNS.has(id)) {
    return true
  }
  if (typeof colOrId === 'object' && colOrId.isSystem === true) {
    return true
  }
  return false
}

/**
 * Lọc danh sách các cột người dùng có thể cấu hình ẩn / hiện trong Drawer Cài đặt Sheet
 * @param {Array} defaultCols
 * @returns {Array}
 */
export const filterConfigurableColumns = (defaultCols) => {
  if (!Array.isArray(defaultCols)) return []
  return defaultCols.filter((col) => !isSystemHiddenColumn(col))
}

/**
 * Đảm bảo cột WorkingTag (hoặc Status) luôn nằm ở vị trí đầu tiên (index 0) trên bảng Sheet
 * @param {Array} cols
 * @param {Array} defaultCols
 * @returns {Array}
 */
export const ensureWorkingTagFirstColumn = (cols = [], defaultCols = []) => {
  const cleanCols = (cols || []).filter(
    (col) =>
      !SYSTEM_INTERNAL_HIDDEN_COLUMNS.has(col.id) &&
      col.id !== 'WorkingTag' &&
      col.id !== 'Status'
  )
  const workingTagCol =
    (cols || []).find((c) => c.id === 'WorkingTag') ||
    (defaultCols || []).find((c) => c.id === 'WorkingTag') ||
    (cols || []).find((c) => c.id === 'Status') ||
    (defaultCols || []).find((c) => c.id === 'Status') || {
      title: '',
      id: 'WorkingTag',
      kind: 'Text',
      readonly: true,
      width: 45,
      hasMenu: true,
      visible: true,
      themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
    }

  return [workingTagCol, ...cleanCols]
}

// Alias tương thích ngược
export const ensureStatusFirstColumn = ensureWorkingTagFirstColumn
