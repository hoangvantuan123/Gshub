// Dữ liệu mẫu chuẩn hóa cho Module, Submenu, Menu, Menu Item & Action, Column Setup
export const MOCK_ROLE_GROUPS = [
  {
    Id: '1',
    Name: 'Quản trị viên cấp cao (SUPER_ADMIN)',
    Comment: 'Toàn quyền cấu hình & quản trị toàn bộ hệ thống ERP GsHub',
    CreatedByName: 'Administrator'
  },
  {
    Id: '2',
    Name: 'Ban Giám Đốc (BOD_MANAGER)',
    Comment: 'Xem toàn bộ báo cáo điều hành và phê duyệt cấp cao',
    CreatedByName: 'Administrator'
  },
  {
    Id: '3',
    Name: 'Kế toán trưởng (CHIEF_ACCOUNTANT)',
    Comment: 'Quản trị phân hệ tài chính kế toán, sổ cái & khóa sổ kỳ',
    CreatedByName: 'Administrator'
  },
  {
    Id: '4',
    Name: 'Trưởng phòng kinh doanh (SALES_HEAD)',
    Comment: 'Quản lý khách hàng, báo giá, hợp đồng & đơn bán hàng',
    CreatedByName: 'Administrator'
  },
  {
    Id: '5',
    Name: 'Thủ kho tổng (WAREHOUSE_LEAD)',
    Comment: 'Quản lý nhập xuất tồn, điều chuyển và kiểm kê kho',
    CreatedByName: 'Administrator'
  }
]

// 1. Phân hệ lớn (Root Modules)
export const MOCK_ROOT_MENUS = [
  {
    Id: 1,
    RootMenuId: 1,
    RootMenuKey: 'sys_admin',
    RootMenuLabel: 'Quản trị hệ thống',
    View: true
  },
  {
    Id: 2,
    RootMenuId: 2,
    RootMenuKey: 'finance',
    RootMenuLabel: 'Tài chính - Kế toán',
    View: true
  },
  {
    Id: 3,
    RootMenuId: 3,
    RootMenuKey: 'sales',
    RootMenuLabel: 'Bán hàng & Phân phối',
    View: true
  },
  {
    Id: 4,
    RootMenuId: 4,
    RootMenuKey: 'purchase',
    RootMenuLabel: 'Mua hàng & Cung ứng',
    View: true
  },
  {
    Id: 5,
    RootMenuId: 5,
    RootMenuKey: 'inventory',
    RootMenuLabel: 'Quản lý kho & Tồn kho',
    View: true
  },
  {
    Id: 6,
    RootMenuId: 6,
    RootMenuKey: 'hr_payroll',
    RootMenuLabel: 'Nhân sự & Tiền lương',
    View: true
  },
  {
    Id: 7,
    RootMenuId: 7,
    RootMenuKey: 'manufacturing',
    RootMenuLabel: 'Quản lý sản xuất',
    View: true
  }
]

// 2. DỮ LIỆU MẢNG PHẲNG 100% THUẦN SQL TRẢ VỀ TỪ BACKEND DATABASE
// Cấu trúc bảng SQL: Id, ParentId, Level, OrderNo, RootMenuId, RootMenuName, Key, Label, Link, View
export const MOCK_FLAT_MENUS_SQL = [
  // =========================================================================
  // PHÂN HỆ 1: QUẢN TRỊ HỆ THỐNG (RootMenuId: 1)
  // =========================================================================

  // --- 1.1 SUBMENU: CẤU TRÚC HỆ THỐNG (Id: 100, ParentId: 0, Level: 0) ---
  {
    Id: 100,
    ParentId: 0,
    Level: 0,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    Type: 'submenu',
    Key: 'sys_structure',
    Label: 'Cấu trúc hệ thống',
    Link: '/erp/u/system-settings/structure',
    View: true
  },
  {
    Id: 101,
    ParentId: 100,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    Type: 'menu',
    Key: 'sys_module',
    Label: 'Đăng ký phân hệ lớn',
    Link: '/erp/u/system-settings/structure/modules',
    View: true
  },
  {
    Id: 102,
    ParentId: 100,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    Type: 'menu',
    Key: 'sys_menu',
    Label: 'Đăng ký phân hệ nhỏ',
    Link: '/erp/u/system-settings/structure/menus',
    View: true
  },
  {
    Id: 103,
    ParentId: 100,
    Level: 1,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    Type: 'menu',
    Key: 'perm_catalog',
    Label: 'Danh mục phân quyền',
    Link: '/erp/u/system-settings/structure/permissions',
    View: true
  },
  {
    Id: 1031,
    ParentId: 103,
    Level: 2,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    ParentKey: 'perm_catalog',
    Type: 'menuitem',
    Key: 'perm_resource',
    Label: 'Đăng ký chức năng nhóm quyền',
    Link: '/erp/u/system-settings/structure/permissions/resources',
    View: true
  },
  {
    Id: 1032,
    ParentId: 103,
    Level: 2,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    ParentKey: 'perm_catalog',
    Type: 'menuitem',
    Key: 'perm_field',
    Label: 'Đăng ký trường dữ liệu phân quyền',
    Link: '/erp/u/system-settings/structure/permissions/fields',
    View: true
  },
  {
    Id: 1033,
    ParentId: 103,
    Level: 2,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    ParentKey: 'perm_catalog',
    Type: 'menuitem',
    Key: 'perm_action',
    Label: 'Đăng ký hành động quyền hạn',
    Link: '/erp/u/system-settings/structure/permissions/actions',
    View: true
  },
  {
    Id: 1034,
    ParentId: 103,
    Level: 2,
    OrderNo: 4,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc hệ thống',
    ParentKey: 'perm_catalog',
    Type: 'menuitem',
    Key: 'perm_scope',
    Label: 'Đăng ký phạm vi dữ liệu',
    Link: '/erp/u/system-settings/structure/permissions/scopes',
    View: true
  },

  // --- 1.2 SUBMENU: NGƯỜI DÙNG & TRUY CẬP (Id: 200, ParentId: 0, Level: 0) ---
  {
    Id: 200,
    ParentId: 0,
    Level: 0,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'user_access',
    SubmenuName: 'Người dùng & Truy cập',
    Type: 'submenu',
    Key: 'user_access',
    Label: 'Người dùng & Truy cập',
    Link: '/erp/u/system-settings/users',
    View: true
  },
  {
    Id: 201,
    ParentId: 200,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'user_access',
    SubmenuName: 'Người dùng & Truy cập',
    Type: 'menu',
    Key: 'user_mgmt',
    Label: 'Quản lý tài khoản',
    Link: '/erp/u/system-settings/users/user-management',
    View: true
  },

  // --- 1.3 SUBMENU: VAI TRÒ HỆ THỐNG (Id: 300, ParentId: 0, Level: 0) ---
  {
    Id: 300,
    ParentId: 0,
    Level: 0,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'role_perm',
    SubmenuName: 'Vai trò hệ thống',
    Type: 'submenu',
    Key: 'role_perm',
    Label: 'Vai trò hệ thống',
    Link: '/erp/u/system-settings/roles',
    View: true
  },
  {
    Id: 301,
    ParentId: 300,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'role_perm',
    SubmenuName: 'Vai trò hệ thống',
    Type: 'menu',
    Key: 'role_mgmt',
    Label: 'Đăng ký vài trò hệ thống',
    Link: '/erp/u/system-settings/roles/role-management',
    View: true
  },
  {
    Id: 302,
    ParentId: 300,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'role_perm',
    SubmenuName: 'Vai trò hệ thống',
    Type: 'menu',
    Key: 'perm_assign',
    Label: 'Thiết lập phân quyền',
    Link: '/erp/u/system-settings/roles/permission-assignment',
    View: true
  },
  {
    Id: 303,
    ParentId: 300,
    Level: 1,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'role_perm',
    SubmenuName: 'Vai trò hệ thống',
    Type: 'menu',
    Key: 'role_group',
    Label: 'Đăng ký nhóm quyền',
    Link: '/erp/u/system-settings/role-groups',
    View: true
  },

  // --- 1.4 SUBMENU: QUẢN LÝ TỪ ĐIỂN (Id: 400, ParentId: 0, Level: 0) ---
  {
    Id: 400,
    ParentId: 0,
    Level: 0,
    OrderNo: 4,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'dict_mgmt',
    SubmenuName: 'Quản lý từ điển',
    Type: 'submenu',
    Key: 'dict_mgmt',
    Label: 'Quản lý từ điển',
    Link: '/erp/u/system-settings/dictionaries',
    View: true
  },
  {
    Id: 401,
    ParentId: 400,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'dict_mgmt',
    SubmenuName: 'Quản lý từ điển',
    Type: 'menu',
    Key: 'sys_lang',
    Label: 'Ngôn ngữ hệ thống',
    Link: '/erp/u/system-settings/dictionaries/languages',
    View: true
  },
  {
    Id: 402,
    ParentId: 400,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'dict_mgmt',
    SubmenuName: 'Quản lý từ điển',
    Type: 'menu',
    Key: 'sys_dict',
    Label: 'Từ điển hệ thống',
    Link: '/erp/u/system-settings/dictionaries/entries',
    View: true
  },

  // --- 1.5 SUBMENU: QUY TRÌNH & PHÊ DUYỆT (Id: 500, ParentId: 0, Level: 0) ---
  {
    Id: 500,
    ParentId: 0,
    Level: 0,
    OrderNo: 5,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    Type: 'submenu',
    Key: 'wf_approval',
    Label: 'Quy trình & Phê duyệt',
    Link: '/erp/u/system-settings/workflows',
    View: true
  },
  {
    Id: 501,
    ParentId: 500,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    Type: 'menu',
    Key: 'wf_config',
    Label: 'Thiết lập quy trình',
    Link: '/erp/u/system-settings/workflows/configuration',
    View: true
  },
  {
    Id: 502,
    ParentId: 500,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    Type: 'menu',
    Key: 'wf_delegate',
    Label: 'Ủy quyền phê duyệt',
    Link: '/erp/u/system-settings/workflows/delegations',
    View: true
  },
  {
    Id: 503,
    ParentId: 500,
    Level: 1,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    Type: 'menu',
    Key: 'wf_catalog',
    Label: 'Danh mục quy trình',
    Link: '/erp/u/system-settings/workflows/catalog',
    View: true
  },
  {
    Id: 5031,
    ParentId: 503,
    Level: 2,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    ParentKey: 'wf_catalog',
    Type: 'menuitem',
    Key: 'wf_status',
    Label: 'Đăng ký trạng thái quy trình',
    Link: '/erp/u/system-settings/workflows/catalog/statuses',
    View: true
  },
  {
    Id: 5032,
    ParentId: 503,
    Level: 2,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    ParentKey: 'wf_catalog',
    Type: 'menuitem',
    Key: 'wf_action',
    Label: 'Đăng ký thao tác quy trình',
    Link: '/erp/u/system-settings/workflows/catalog/actions',
    View: true
  },
  {
    Id: 5033,
    ParentId: 503,
    Level: 2,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'wf_approval',
    SubmenuName: 'Quy trình & Phê duyệt',
    ParentKey: 'wf_catalog',
    Type: 'menuitem',
    Key: 'wf_assignee',
    Label: 'Đăng ký đối tượng xử lý',
    Link: '/erp/u/system-settings/workflows/catalog/assignees',
    View: true
  },

  // --- 1.6 SUBMENU: KIỂM SOÁT & NHẬT KÝ (Id: 600, ParentId: 0, Level: 0) ---
  {
    Id: 600,
    ParentId: 0,
    Level: 0,
    OrderNo: 6,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    Type: 'submenu',
    Key: 'audit_control',
    Label: 'Kiểm soát & Nhật ký',
    Link: '/erp/u/system-settings/audit-control',
    View: true
  },
  {
    Id: 601,
    ParentId: 600,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    Type: 'menu',
    Key: 'perm_check',
    Label: 'Kiểm soát truy cập',
    Link: '/erp/u/system-settings/audit-control/access',
    View: true
  },
  {
    Id: 6011,
    ParentId: 601,
    Level: 2,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    ParentKey: 'perm_check',
    Type: 'menuitem',
    Key: 'perm_sim',
    Label: 'Kiểm tra / Giả lập quyền',
    Link: '/erp/u/system-settings/audit-control/access/permission-simulation',
    View: true
  },
  {
    Id: 6012,
    ParentId: 601,
    Level: 2,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    ParentKey: 'perm_check',
    Type: 'menuitem',
    Key: 'perm_lookup',
    Label: 'Tra cứu quyền người dùng',
    Link: '/erp/u/system-settings/audit-control/access/permission-lookup',
    View: true
  },
  {
    Id: 602,
    ParentId: 600,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    Type: 'menu',
    Key: 'sys_audit',
    Label: 'Nhật ký hệ thống',
    Link: '/erp/u/system-settings/audit-control/logs',
    View: true
  },
  {
    Id: 6021,
    ParentId: 602,
    Level: 2,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    ParentKey: 'sys_audit',
    Type: 'menuitem',
    Key: 'perm_log',
    Label: 'Nhật ký phân quyền',
    Link: '/erp/u/system-settings/audit-control/logs/authorizations',
    View: true
  },
  {
    Id: 6022,
    ParentId: 602,
    Level: 2,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    ParentKey: 'sys_audit',
    Type: 'menuitem',
    Key: 'access_log',
    Label: 'Nhật ký truy cập',
    Link: '/erp/u/system-settings/audit-control/logs/access',
    View: true
  },
  {
    Id: 6023,
    ParentId: 602,
    Level: 2,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Quản trị hệ thống',
    SubmenuKey: 'audit_control',
    SubmenuName: 'Kiểm soát & Nhật ký',
    ParentKey: 'sys_audit',
    Type: 'menuitem',
    Key: 'change_log',
    Label: 'Nhật ký thay đổi dữ liệu',
    Link: '/erp/u/system-settings/audit-control/logs/data-changes',
    View: true
  },

  // =========================================================================
  // PHÂN HỆ 2: TÀI CHÍNH - KẾ TOÁN (RootMenuId: 2)
  // =========================================================================

  // --- 2.1 SUBMENU: KẾ TOÁN TỔNG HỢP (Id: 1000, ParentId: 0, Level: 0) ---
  {
    Id: 1000,
    ParentId: 0,
    Level: 0,
    OrderNo: 1,
    RootMenuId: 2,
    RootMenuName: 'Tài chính - Kế toán',
    SubmenuKey: 'gl_accounting',
    SubmenuName: 'Kế toán tổng hợp',
    Type: 'submenu',
    Key: 'gl_accounting',
    Label: 'Kế toán tổng hợp',
    Link: '',
    View: true
  },
  {
    Id: 1001,
    ParentId: 1000,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 2,
    RootMenuName: 'Tài chính - Kế toán',
    SubmenuKey: 'gl_accounting',
    SubmenuName: 'Kế toán tổng hợp',
    Type: 'menu',
    Key: 'gl_voucher',
    Label: 'Chứng từ kế toán tổng hợp',
    Link: '/finance/gl-voucher',
    View: true
  },
  {
    Id: 1002,
    ParentId: 1000,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 2,
    RootMenuName: 'Tài chính - Kế toán',
    SubmenuKey: 'gl_accounting',
    SubmenuName: 'Kế toán tổng hợp',
    Type: 'menu',
    Key: 'gl_ledger',
    Label: 'Sổ cái & Sổ nhật ký chung',
    Link: '/finance/gl-ledger',
    View: true
  },

  // --- 2.2 SUBMENU: TIỀN MẶT & NGÂN HÀNG (Id: 1100, ParentId: 0, Level: 0) ---
  {
    Id: 1100,
    ParentId: 0,
    Level: 0,
    OrderNo: 2,
    RootMenuId: 2,
    RootMenuName: 'Tài chính - Kế toán',
    SubmenuKey: 'cash_bank',
    SubmenuName: 'Quản lý Tiền mặt & Ngân hàng',
    Type: 'submenu',
    Key: 'cash_bank',
    Label: 'Quản lý Tiền mặt & Ngân hàng',
    Link: '',
    View: true
  },
  {
    Id: 1101,
    ParentId: 1100,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 2,
    RootMenuName: 'Tài chính - Kế toán',
    SubmenuKey: 'cash_bank',
    SubmenuName: 'Quản lý Tiền mặt & Ngân hàng',
    Type: 'menu',
    Key: 'cash_receipt',
    Label: 'Phiếu thu tiền mặt',
    Link: '/finance/cash-receipt',
    View: true
  },
  {
    Id: 1102,
    ParentId: 1100,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 2,
    RootMenuName: 'Tài chính - Kế toán',
    SubmenuKey: 'cash_bank',
    SubmenuName: 'Quản lý Tiền mặt & Ngân hàng',
    Type: 'menu',
    Key: 'cash_payment',
    Label: 'Phiếu chi tiền mặt',
    Link: '/finance/cash-payment',
    View: true
  }
]

// =========================================================================
// HÀM TỰ ĐỘNG CHUYỂN ĐỔI MẢNG PHẲNG TỪ SQL THÀNH CÂY TREE (AUTO-GROUPING ENGINE)
// Nhận vào mảng phẳng thuần SQL từ backend với các mã số (Id, ParentId, Level, OrderNo)
// và tự động xây dựng cây phân cấp O(N) tức thì
// =========================================================================
export function buildMenuTreeFromFlatRows(flatRows = []) {
  if (!Array.isArray(flatRows) || flatRows.length === 0) return []

  const tree = []
  const nodeMap = new Map()

  // Bước 1: Khởi tạo tất cả các Node vào Map theo mã số Id (hoặc Key)
  for (const row of flatRows) {
    const id = row.Id != null ? row.Id : row.Key
    const level =
      typeof row.Level === 'number'
        ? row.Level
        : row.Type === 'submenu'
          ? 0
          : row.Type === 'menu'
            ? 1
            : 2
    const isGroupType = level === 0 || row.Type === 'submenu'

    const node = {
      ...row,
      Id: id,
      Key: row.Key || String(id),
      Label: row.Label || row.SubmenuName || row.Key,
      RootMenuId: row.RootMenuId || 1,
      Level: level,
      OrderNo: row.OrderNo || 0,
      Type: level === 0 ? 'Submenu' : level === 1 ? 'Menu' : 'MenuItem',
      Link: row.Link || '',
      IsGroup: isGroupType,
      View: row.View !== false,
      Children: []
    }
    nodeMap.set(String(id), node)
  }

  // Bước 2: Ghép con vào cha dựa vào mã số ParentId (hoặc ParentKey / SubmenuKey)
  for (const row of flatRows) {
    const id = String(row.Id != null ? row.Id : row.Key)
    const node = nodeMap.get(id)
    if (!node) continue

    // Tìm ParentId theo số hoặc theo Key
    let parentNode = null
    if (row.ParentId != null && row.ParentId !== 0 && row.ParentId !== '') {
      parentNode = nodeMap.get(String(row.ParentId))
    } else if (row.ParentKey) {
      parentNode = nodeMap.get(String(row.ParentKey)) || nodeMap.get(`m_${row.ParentKey}`)
    } else if (row.SubmenuKey && row.Type !== 'submenu' && node.Level !== 0) {
      parentNode = nodeMap.get(`g_${row.SubmenuKey}`) || nodeMap.get(String(row.SubmenuKey))
    }

    if (parentNode && parentNode.Id !== node.Id) {
      parentNode.Children.push(node)
      parentNode.IsGroup = true
      if (parentNode.Level === 1) {
        parentNode.Type = 'Nhóm Menu'
      }
    } else if (node.Level === 0 || row.Type === 'submenu' || (!row.ParentId && !row.ParentKey)) {
      tree.push(node)
    }
  }

  return tree
}

// Cây Tree được xây dựng tự động từ mảng phẳng SQL
export const MOCK_MENU_TREE = buildMenuTreeFromFlatRows(MOCK_FLAT_MENUS_SQL)

// Hàm chuyển đổi cây Tree thành danh sách phân cấp có hỗ trợ đóng mở nhóm
export function flattenMenuTree(tree = [], expandedIds = new Set(), rootMenuId = null) {
  const result = []

  function traverse(nodes, depth = 0) {
    for (const node of nodes) {
      if (rootMenuId && node.RootMenuId && node.RootMenuId !== rootMenuId) {
        continue
      }

      const hasChildren = Array.isArray(node.Children) && node.Children.length > 0
      const isExpanded = expandedIds.has(node.Id)
      const count = hasChildren ? node.Children.length : 0

      // Ký hiệu phân cấp thuần text không dùng icon emoji
      // Chỉ nhóm cha (Submenu / Menu có con) mới dùng [-] hoặc [+]
      // Các mục con (Menu đơn hoặc MenuItem) dùng gạch đầu dòng '-'
      let displayPrefix = ''
      if (node.Level === 0) {
        displayPrefix = isExpanded ? '[-] ' : '[+] '
      } else if (node.Level === 1) {
        displayPrefix = hasChildren ? (isExpanded ? '    [-] ' : '    [+] ') : '    - '
      } else {
        displayPrefix = '        - '
      }

      const countSuffix = hasChildren ? ` (${count})` : ''
      const treeDisplay = `${displayPrefix}${node.Label}${countSuffix}`

      result.push({
        ...node,
        MenuId: node.Id,
        MenuKey: node.Key,
        MenuLabel: treeDisplay,
        RawLabel: node.Label,
        MenuType: node.Type,
        _depth: depth,
        _hasChildren: hasChildren,
        _isExpanded: isExpanded,
        _childCount: count
      })

      if (hasChildren && isExpanded) {
        traverse(node.Children, depth + 1)
      }
    }
  }

  traverse(tree, 0)
  return result
}

// Hàm lấy danh sách phẳng thuần (Bỏ gom nhóm)
export function getFlatMenuList(flatOrTree = [], rootMenuId = null) {
  if (Array.isArray(flatOrTree) && flatOrTree.length > 0 && flatOrTree[0].Type) {
    // Nếu truyền vào mảng phẳng SQL
    return flatOrTree
      .filter((r) => r.Type !== 'submenu')
      .filter((r) => !rootMenuId || r.RootMenuId === rootMenuId)
      .map((r) => ({
        ...r,
        MenuId: r.Id,
        MenuKey: r.Key,
        MenuSubRootName: r.SubmenuName || '',
        MenuLabel: r.Label,
        RawLabel: r.Label,
        MenuType: r.Type === 'menuitem' ? 'MenuItem' : 'Menu'
      }))
  }

  // Nếu truyền vào cây Tree
  const result = []
  function traverse(nodes, currentSubmenu = '') {
    for (const node of nodes) {
      if (rootMenuId && node.RootMenuId && node.RootMenuId !== rootMenuId) {
        continue
      }
      const submenuName = node.Level === 0 ? node.Label : currentSubmenu
      if (!node.IsGroup && (!node.Children || node.Children.length === 0)) {
        result.push({
          ...node,
          MenuId: node.Id,
          MenuKey: node.Key,
          MenuSubRootName: submenuName,
          MenuLabel: node.Label,
          RawLabel: node.Label,
          MenuType: node.Type
        })
      }
      if (node.Children && node.Children.length > 0) {
        traverse(node.Children, submenuName)
      }
    }
  }
  traverse(flatOrTree, '')
  return result
}

// Thu thập tất cả các ID nhóm để mở tất cả (Expand All)
export const getAllGroupIds = (nodes = []) => {
  const ids = []
  const walk = (items) => {
    for (const item of items) {
      if (item.IsGroup || (Array.isArray(item.Children) && item.Children.length > 0)) {
        ids.push(item.Id)
        if (item.Children) walk(item.Children)
      }
    }
  }
  walk(nodes)
  return ids
}

// Danh sách Menu mặc định dạng cây gom nhóm phân cấp (mở tất cả theo mặc định)
export const MOCK_MENUS = flattenMenuTree(MOCK_MENU_TREE, new Set(getAllGroupIds(MOCK_MENU_TREE)))

// 3. Danh sách Action chuẩn mẫu cho từng màn hình
export const DEFAULT_ACTIONS_TEMPLATE = [
  {
    ActionCode: 'BTN_SEARCH',
    ActionName: 'Truy vấn dữ liệu (Search / F4)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép tìm kiếm và nạp danh sách dữ liệu'
  },
  {
    ActionCode: 'BTN_CREATE',
    ActionName: 'Thêm mới bản ghi (Insert / F2)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép thêm mới dữ liệu'
  },
  {
    ActionCode: 'BTN_EDIT',
    ActionName: 'Chỉnh sửa dữ liệu (Edit / Update)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép sửa thông tin bản ghi'
  },
  {
    ActionCode: 'BTN_DELETE',
    ActionName: 'Xóa bản ghi (Delete / F8)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép xóa dữ liệu đã chọn'
  },
  {
    ActionCode: 'BTN_SAVE',
    ActionName: 'Lưu thay đổi (Save / F10)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép lưu các bản ghi thêm/sửa'
  },
  {
    ActionCode: 'BTN_PRINT',
    ActionName: 'In biểu mẫu / Chứng từ (Print / F7)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép in tài liệu, biểu mẫu báo cáo'
  },
  {
    ActionCode: 'BTN_EXPORT',
    ActionName: 'Xuất file Excel / CSV (Export / F9)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: true,
    Comment: 'Cho phép trích xuất dữ liệu ra bảng tính'
  },
  {
    ActionCode: 'BTN_IMPORT',
    ActionName: 'Nhập file từ Excel (Import / F11)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: false,
    Comment: 'Cho phép tải dữ liệu hàng loạt từ file Excel'
  },
  {
    ActionCode: 'BTN_APPROVE',
    ActionName: 'Phê duyệt / Ký số (Approve)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: false,
    Comment: 'Quyền duyệt chứng từ hoặc chuyển bước quy trình'
  },
  {
    ActionCode: 'BTN_LOCK',
    ActionName: 'Khóa dữ liệu / Chốt sổ (Lock)',
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Allow: false,
    Comment: 'Khóa dữ liệu không cho chỉnh sửa'
  }
]

// 4. Danh sách Cấu hình Cột mẫu cho từng màn hình (Bảo mật cột & Khóa ẩn)
export const DEFAULT_COLUMNS_TEMPLATE = [
  {
    FieldCode: 'Id',
    FieldName: 'Mã định danh (ID)',
    Visible: false,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Khóa chính hệ thống'
  },
  {
    FieldCode: 'Code',
    FieldName: 'Mã nghiệp vụ / Mã đối tượng',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Mã duy nhất'
  },
  {
    FieldCode: 'Name',
    FieldName: 'Tên đối tượng / Tên chức năng',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Tên hiển thị'
  },
  {
    FieldCode: 'Category',
    FieldName: 'Phân loại / Danh mục',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Phân nhóm nghiệp vụ'
  },
  {
    FieldCode: 'CostPrice',
    FieldName: 'Đơn giá vốn / Giá nhập',
    Visible: true,
    MaskValue: true, // Mặc định khóa giá trị nhạy cảm (***)
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Giá vốn nhạy cảm (Khóa/Che dấu ***)'
  },
  {
    FieldCode: 'SalaryAmount',
    FieldName: 'Mức lương / Thu nhập',
    Visible: true,
    MaskValue: true, // Mặc định khóa giá trị nhạy cảm (***)
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Lương & thu nhập nhạy cảm (Che dấu ***)'
  },
  {
    FieldCode: 'Amount',
    FieldName: 'Số tiền / Giá trị giao dịch',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Giá trị tiền tệ giao dịch'
  },
  {
    FieldCode: 'DiscountRate',
    FieldName: 'Tỷ lệ chiết khấu (%)',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Chiết khấu thương mại'
  },
  {
    FieldCode: 'Status',
    FieldName: 'Trạng thái xử lý',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Trạng thái hoạt động'
  },
  {
    FieldCode: 'CreatedDate',
    FieldName: 'Ngày lập / Ngày tạo',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Thời gian khởi tạo'
  },
  {
    FieldCode: 'CreatedBy',
    FieldName: 'Người lập / Người tạo',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Tài khoản khởi tạo'
  },
  {
    FieldCode: 'Comment',
    FieldName: 'Ghi chú / Diễn giải',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Thông tin ghi chú'
  }
]

// 5. Danh sách Phân Quyền Phạm Vi Dữ Liệu & Quy Tắc Sửa Phiếu (Tab 3)
export const DEFAULT_DATA_SCOPES_TEMPLATE = [
  {
    ScopeCode: 'SCOPE_VIEW_DEPT',
    ScopeName: 'Xem chứng từ cùng phòng ban',
    OperationCode: 'BTN_SEARCH',
    OperationName: 'Truy vấn / Tìm kiếm dữ liệu (Search)',
    DataScope: 'DEPARTMENT', // Toàn bộ / Chi nhánh / Phòng ban / Cá nhân
    DataScopeLabel: 'Phòng ban (DEPT)',
    RuleCondition: 'ALL_STATUS',
    RuleConditionLabel: 'Mọi trạng thái phiếu',
    Allow: true,
    Comment: 'Cho phép xem chứng từ trong cùng phòng ban'
  },
  {
    ScopeCode: 'SCOPE_CREATE_DEPT',
    ScopeName: 'Lập mới chứng từ cho phòng ban',
    OperationCode: 'BTN_CREATE',
    OperationName: 'Thêm mới dữ liệu (Create / Insert)',
    DataScope: 'DEPARTMENT',
    DataScopeLabel: 'Phòng ban (DEPT)',
    RuleCondition: 'ALL_STATUS',
    RuleConditionLabel: 'Mọi trạng thái phiếu',
    Allow: true,
    Comment: 'Cho phép lập chứng từ mới cho phòng ban'
  },
  {
    ScopeCode: 'SCOPE_EDIT_SELF_DRAFT',
    ScopeName: 'Sửa phiếu do mình tạo (Bản nháp)',
    OperationCode: 'BTN_SAVE',
    OperationName: 'Lưu thay đổi dữ liệu (Save)',
    DataScope: 'SELF', // "Phiếu của ai người đấy sửa"
    DataScopeLabel: 'Chính mình (SELF - Phiếu của ai người đấy sửa)',
    RuleCondition: 'DRAFT_ONLY',
    RuleConditionLabel: 'Chỉ sửa khi là Bản nháp / Mới tạo',
    Allow: true,
    Comment: 'Chỉ được sửa phiếu do chính mình tạo khi chưa gửi duyệt'
  },
  {
    ScopeCode: 'SCOPE_DELETE_SELF_DRAFT',
    ScopeName: 'Xóa phiếu do mình tạo (Bản nháp)',
    OperationCode: 'BTN_DELETE',
    OperationName: 'Xóa dữ liệu / Xóa dòng sheet (Delete)',
    DataScope: 'SELF',
    DataScopeLabel: 'Chính mình (SELF - Phiếu của ai người đấy xóa)',
    RuleCondition: 'DRAFT_ONLY',
    RuleConditionLabel: 'Chỉ xóa khi là Bản nháp',
    Allow: true,
    Comment: 'Chỉ được xóa phiếu nháp do chính mình tạo'
  },
  {
    ScopeCode: 'SCOPE_APPROVE_DEPT',
    ScopeName: 'Phê duyệt chứng từ phòng ban',
    OperationCode: 'BTN_APPROVE',
    OperationName: 'Phê duyệt chứng từ (Approve)',
    DataScope: 'DEPARTMENT',
    DataScopeLabel: 'Phòng ban (DEPT)',
    RuleCondition: 'PENDING_APPROVAL',
    RuleConditionLabel: 'Phiếu đang chờ duyệt',
    Allow: false,
    Comment: 'Quyền duyệt chứng từ cấp quản lý phòng ban'
  },
  {
    ScopeCode: 'SCOPE_LOCK_BRANCH',
    ScopeName: 'Khóa sổ chứng từ toàn chi nhánh',
    OperationCode: 'BTN_LOCK',
    OperationName: 'Khóa / Chốt dữ liệu (Lock)',
    DataScope: 'BRANCH',
    DataScopeLabel: 'Chi nhánh (BRANCH)',
    RuleCondition: 'APPROVED_ONLY',
    RuleConditionLabel: 'Đã duyệt hoàn tất',
    Allow: false,
    Comment: 'Quyền khóa sổ kế toán chi nhánh'
  }
]

// 6. Hàm lấy Danh Sách Cột, Nút Lệnh, Phạm Vi Đăng Ký Riêng Biệt Cho Từng Menu
export function getRegisteredMenuPermissions(menuId, menuKey = '', menuLabel = '') {
  const key = String(menuKey || '').toLowerCase()
  const label = String(menuLabel || '').toLowerCase()

  // Case 1: Phân hệ Kỹ thuật Đăng Ký Root Menu / Menu Items (root_menu, perm_resource, etc.)
  if (
    key.includes('root') ||
    key.includes('module') ||
    key.includes('resource') ||
    label.includes('root menu')
  ) {
    return {
      actions: [
        {
          ActionCode: 'BTN_SEARCH',
          ActionName: 'Truy vấn phân hệ (Search / F4)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Tìm kiếm phân hệ'
        },
        {
          ActionCode: 'BTN_CREATE',
          ActionName: 'Thêm mới Root Menu (Insert / F2)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Tạo mới root menu'
        },
        {
          ActionCode: 'BTN_EDIT',
          ActionName: 'Sửa cấu hình Root Menu (Edit)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Chỉnh sửa thông tin'
        },
        {
          ActionCode: 'BTN_DELETE',
          ActionName: 'Xóa Root Menu (Delete / F8)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Xóa root menu'
        },
        {
          ActionCode: 'BTN_SAVE',
          ActionName: 'Lưu thay đổi (Save / F10)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Lưu thay đổi trên sheet'
        },
        {
          ActionCode: 'BTN_EXPORT',
          ActionName: 'Xuất file Excel (Export / F9)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Xuất danh mục phân hệ'
        }
      ],
      columns: [
        {
          FieldCode: 'Label',
          FieldName: 'Tên Root Menu *',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Tên phân hệ gốc'
        },
        {
          FieldCode: 'Key',
          FieldName: 'Mã Key Phân Hệ *',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Mã định danh duy nhất'
        },
        {
          FieldCode: 'Link',
          FieldName: 'Đường dẫn (Link)',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Đường dẫn router'
        },
        {
          FieldCode: 'Icon',
          FieldName: 'Biểu tượng (Icon)',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Icon hiển thị'
        },
        {
          FieldCode: 'Utilities',
          FieldName: 'Tiện ích hệ thống',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Cờ tiện ích'
        },
        {
          FieldCode: 'CreatedByName',
          FieldName: 'Người tạo',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Tài khoản khởi tạo'
        },
        {
          FieldCode: 'CreatedAt',
          FieldName: 'Thời gian tạo',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Ngày giờ tạo'
        }
      ],
      scopes: [
        {
          ScopeCode: 'SCOPE_VIEW_ALL',
          ScopeName: 'Xem danh mục toàn hệ thống',
          OperationCode: 'BTN_SEARCH',
          OperationName: 'Truy vấn / Tìm kiếm dữ liệu (Search)',
          DataScope: 'ALL',
          DataScopeLabel: 'Toàn hệ thống (ALL)',
          RuleCondition: 'ALL_STATUS',
          RuleConditionLabel: 'Mọi trạng thái',
          Allow: true,
          Comment: 'Toàn quyền xem'
        },
        {
          ScopeCode: 'SCOPE_EDIT_ALL',
          ScopeName: 'Chỉnh sửa danh mục toàn hệ thống',
          OperationCode: 'BTN_SAVE',
          OperationName: 'Lưu thay đổi dữ liệu (Save)',
          DataScope: 'ALL',
          DataScopeLabel: 'Toàn hệ thống (ALL)',
          RuleCondition: 'ALL_STATUS',
          RuleConditionLabel: 'Mọi trạng thái',
          Allow: true,
          Comment: 'Toàn quyền sửa'
        }
      ]
    }
  }

  // Case 2: Phân hệ Phân Quyền & Quản Lý Vai Trò Người Dùng (role_mgmt, role_user, sys_users)
  if (
    key.includes('role') ||
    key.includes('group') ||
    key.includes('user') ||
    label.includes('quyền')
  ) {
    return {
      actions: [
        {
          ActionCode: 'BTN_SEARCH',
          ActionName: 'Tìm kiếm nhóm quyền (Search / F4)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Truy vấn nhóm'
        },
        {
          ActionCode: 'BTN_CREATE',
          ActionName: 'Thêm nhóm quyền (Insert / F2)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Thêm vai trò mới'
        },
        {
          ActionCode: 'BTN_EDIT',
          ActionName: 'Phân quyền chi tiết (Edit / Update)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Chỉnh sửa ma trận quyền'
        },
        {
          ActionCode: 'BTN_DELETE',
          ActionName: 'Xóa nhóm quyền (Delete / F8)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Xóa vai trò'
        },
        {
          ActionCode: 'BTN_SAVE',
          ActionName: 'Lưu ma trận phân quyền (Save / F10)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Lưu thay đổi phân quyền'
        }
      ],
      columns: [
        {
          FieldCode: 'GroupId',
          FieldName: 'Mã Nhóm Quyền',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Khóa nhóm'
        },
        {
          FieldCode: 'GroupName',
          FieldName: 'Tên Nhóm Quyền',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Tên vai trò'
        },
        {
          FieldCode: 'UserCount',
          FieldName: 'Số Lượng Thành Viên',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Số user trong nhóm'
        },
        {
          FieldCode: 'Comment',
          FieldName: 'Diễn giải / Ghi chú',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Mô tả quyền hạn'
        }
      ],
      scopes: [
        {
          ScopeCode: 'SCOPE_VIEW_ALL',
          ScopeName: 'Xem danh sách vai trò toàn công ty',
          OperationCode: 'BTN_SEARCH',
          OperationName: 'Truy vấn / Tìm kiếm dữ liệu (Search)',
          DataScope: 'ALL',
          DataScopeLabel: 'Toàn công ty (ALL)',
          RuleCondition: 'ALL_STATUS',
          RuleConditionLabel: 'Mọi trạng thái',
          Allow: true,
          Comment: 'Xem nhóm'
        },
        {
          ScopeCode: 'SCOPE_EDIT_ALL',
          ScopeName: 'Phân quyền vai trò toàn công ty',
          OperationCode: 'BTN_SAVE',
          OperationName: 'Lưu thay đổi dữ liệu (Save)',
          DataScope: 'ALL',
          DataScopeLabel: 'Toàn công ty (ALL)',
          RuleCondition: 'ALL_STATUS',
          RuleConditionLabel: 'Mọi trạng thái',
          Allow: true,
          Comment: 'Chỉnh sửa nhóm'
        }
      ]
    }
  }

  // Case 3: Phân hệ Nghiệp vụ Bán hàng / Mua hàng / Đơn hàng / Hóa đơn
  if (
    key.includes('sale') ||
    key.includes('order') ||
    key.includes('invoice') ||
    key.includes('purchase') ||
    label.includes('đơn') ||
    label.includes('bán') ||
    label.includes('mua')
  ) {
    return {
      actions: [
        {
          ActionCode: 'BTN_SEARCH',
          ActionName: 'Truy vấn đơn hàng (Search / F4)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Tìm kiếm đơn'
        },
        {
          ActionCode: 'BTN_CREATE',
          ActionName: 'Lập đơn hàng mới (Insert / F2)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Thêm chứng từ bán hàng'
        },
        {
          ActionCode: 'BTN_EDIT',
          ActionName: 'Sửa chứng từ bán hàng (Edit)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Sửa thông tin đơn hàng'
        },
        {
          ActionCode: 'BTN_DELETE',
          ActionName: 'Xóa/Hủy đơn hàng (Delete / F8)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Hủy đơn hàng'
        },
        {
          ActionCode: 'BTN_SAVE',
          ActionName: 'Lưu đơn hàng (Save / F10)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Lưu dữ liệu'
        },
        {
          ActionCode: 'BTN_PRINT',
          ActionName: 'In hóa đơn / Phiếu xuất (Print / F7)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'In ấn chứng từ'
        },
        {
          ActionCode: 'BTN_EXPORT',
          ActionName: 'Xuất file Excel (Export / F9)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Xuất báo cáo bán hàng'
        },
        {
          ActionCode: 'BTN_APPROVE',
          ActionName: 'Phê duyệt đơn hàng (Approve)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: false,
          Comment: 'Duyệt đơn hàng trên hạn mức'
        },
        {
          ActionCode: 'BTN_LOCK',
          ActionName: 'Khóa chốt đơn hàng (Lock)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: false,
          Comment: 'Khóa không cho chỉnh sửa'
        }
      ],
      columns: [
        {
          FieldCode: 'OrderCode',
          FieldName: 'Số Chứng Từ / Mã Đơn',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Số phiếu duy nhất'
        },
        {
          FieldCode: 'CustomerName',
          FieldName: 'Tên Khách Hàng / Đối Tác',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Thông tin đối tác'
        },
        {
          FieldCode: 'OrderDate',
          FieldName: 'Ngày Lập Đơn',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Thời gian phát sinh'
        },
        {
          FieldCode: 'CostPrice',
          FieldName: 'Giá Vốn Hàng Bán',
          Visible: true,
          MaskValue: true,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Giá vốn nhạy cảm (Khóa/Che giấu ***)'
        },
        {
          FieldCode: 'SellingPrice',
          FieldName: 'Đơn Giá Bán',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Giá bán niêm yết'
        },
        {
          FieldCode: 'DiscountRate',
          FieldName: 'Tỷ Lệ Chiết Khấu (%)',
          Visible: true,
          MaskValue: true,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Chiết khấu hoa hồng (Khóa/Che giấu ***)'
        },
        {
          FieldCode: 'TotalAmount',
          FieldName: 'Tổng Tiền Thanh Toán',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Tổng giá trị hóa đơn'
        },
        {
          FieldCode: 'Status',
          FieldName: 'Trạng Thái Đơn Hàng',
          Visible: true,
          MaskValue: false,
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Comment: 'Trạng thái xử lý'
        }
      ],
      scopes: [
        {
          ScopeCode: 'SCOPE_VIEW_DEPT',
          ScopeName: 'Xem đơn hàng cùng phòng ban',
          OperationCode: 'BTN_SEARCH',
          OperationName: 'Truy vấn / Tìm kiếm dữ liệu (Search)',
          DataScope: 'DEPARTMENT',
          DataScopeLabel: 'Phòng ban (DEPT)',
          RuleCondition: 'ALL_STATUS',
          RuleConditionLabel: 'Mọi trạng thái',
          Allow: true,
          Comment: 'Xem đơn cùng phòng ban'
        },
        {
          ScopeCode: 'SCOPE_CREATE_SELF',
          ScopeName: 'Tự lập đơn hàng mới',
          OperationCode: 'BTN_CREATE',
          OperationName: 'Thêm mới dữ liệu (Create / Insert)',
          DataScope: 'SELF',
          DataScopeLabel: 'Chính mình (SELF)',
          RuleCondition: 'ALL_STATUS',
          RuleConditionLabel: 'Mọi trạng thái',
          Allow: true,
          Comment: 'Tự lập đơn'
        },
        {
          ScopeCode: 'SCOPE_EDIT_SELF_DRAFT',
          ScopeName: 'Sửa đơn của mình khi là Bản nháp',
          OperationCode: 'BTN_SAVE',
          OperationName: 'Lưu thay đổi dữ liệu (Save)',
          DataScope: 'SELF',
          DataScopeLabel: 'Chính mình (SELF - Phiếu của ai người đấy sửa)',
          RuleCondition: 'DRAFT_ONLY',
          RuleConditionLabel: 'Chỉ sửa khi là Bản nháp',
          Allow: true,
          Comment: 'Chỉ sửa đơn của chính mình khi chưa duyệt'
        },
        {
          ScopeCode: 'SCOPE_DELETE_SELF_DRAFT',
          ScopeName: 'Hủy đơn của mình khi là Bản nháp',
          OperationCode: 'BTN_DELETE',
          OperationName: 'Xóa dữ liệu / Xóa dòng sheet (Delete)',
          DataScope: 'SELF',
          DataScopeLabel: 'Chính mình (SELF - Phiếu của ai người đấy hủy)',
          RuleCondition: 'DRAFT_ONLY',
          RuleConditionLabel: 'Chỉ xóa khi là Bản nháp',
          Allow: true,
          Comment: 'Chỉ xóa đơn của mình'
        }
      ]
    }
  }

  // Mặc định chung cho các màn hình nghiệp vụ khác
  return {
    actions: DEFAULT_ACTIONS_TEMPLATE,
    columns: DEFAULT_COLUMNS_TEMPLATE,
    scopes: DEFAULT_DATA_SCOPES_TEMPLATE
  }
}
