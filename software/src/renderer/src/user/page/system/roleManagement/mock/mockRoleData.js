/* eslint-disable react/prop-types, no-unused-vars, no-empty */
// Dữ liệu mẫu chuẩn hóa cho Module, Submenu, Menu, Menu Item & Action, Column Setup cho GSHub

export const MOCK_ROLE_GROUPS = [
  {
    Id: '1',
    Name: 'Quản trị viên cấp cao (SUPER_ADMIN)',
    Comment: 'Toàn quyền cấu hình & quản trị toàn bộ hệ thống GSHub',
    CreatedByName: 'Administrator'
  },
  {
    Id: '2',
    Name: 'Ban Giám Đốc (BOD_MANAGER)',
    Comment: 'Xem toàn bộ báo cáo sản xuất, thống kê tiến độ và phân tích số liệu',
    CreatedByName: 'Administrator'
  },
  {
    Id: '3',
    Name: 'Quản đốc nhà máy GS Hà Nội (MANAGER_HN)',
    Comment: 'Xem và quản lý kế hoạch / thống kê sản xuất nhà máy GS Hà Nội',
    CreatedByName: 'Administrator'
  },
  {
    Id: '4',
    Name: 'Quản đốc nhà máy GS Quế Võ 1B (MANAGER_QV)',
    Comment: 'Xem và quản lý kế hoạch / thống kê sản xuất nhà máy GS Quế Võ 1B',
    CreatedByName: 'Administrator'
  },
  {
    Id: '5',
    Name: 'Chuyên viên kế hoạch sản xuất (PLANNING_STAFF)',
    Comment: 'Nhập liệu kế hoạch sản xuất, tính toán và đăng ký báo cáo',
    CreatedByName: 'Administrator'
  },
  {
    Id: '6',
    Name: 'Chuyên viên thống kê sản xuất (STAT_STAFF)',
    Comment: 'Cập nhật thống kê sản lượng, tra cứu công thức cẩm nang',
    CreatedByName: 'Administrator'
  }
]

// 1. Phân hệ lớn (Root Modules) của GSHub
export const MOCK_ROOT_MENUS = [
  {
    Id: 1,
    RootMenuId: 1,
    RootMenuKey: 'report',
    RootMenuLabel: 'Báo Cáo Sản Xuất',
    View: true
  },
  {
    Id: 2,
    RootMenuId: 2,
    RootMenuKey: 'system',
    RootMenuLabel: 'Quản Trị Hệ Thống',
    View: true
  }
]

// 2. DỮ LIỆU MẢNG PHẲNG 100% THUẦN SQL TRẢ VỀ TỪ BACKEND DATABASE CHO GSHUB
export const MOCK_FLAT_MENUS_SQL = [
  // =========================================================================
  // PHÂN HỆ 1: BÁO CÁO SẢN XUẤT (RootMenuId: 1)
  // =========================================================================

  // --- 1.1 SUBMENU: BÁO CÁO TỔNG HỢP (Id: 100) ---
  {
    Id: 100,
    ParentId: 0,
    Level: 0,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_summary',
    SubmenuName: 'Báo cáo tổng hợp',
    Type: 'submenu',
    Key: 'report_prod_summary',
    Label: 'Báo cáo tổng hợp',
    Link: '',
    View: true
  },
  {
    Id: 101,
    ParentId: 100,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_summary',
    SubmenuName: 'Báo cáo tổng hợp',
    Type: 'menu',
    Key: 'report_prod_summary_plan',
    Label: 'Kế hoạch sản xuất (KHSX)',
    Link: '/erp/u/report/production/summary/plan',
    View: true
  },
  {
    Id: 102,
    ParentId: 100,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_summary',
    SubmenuName: 'Báo cáo tổng hợp',
    Type: 'menu',
    Key: 'report_prod_summary_stat',
    Label: 'Thống kê sản xuất (TKSX)',
    Link: '/erp/u/report/production/summary/statistics',
    View: true
  },

  // --- 1.2 SUBMENU: BÁO CÁO SẢN XUẤT GS HÀ NỘI (Id: 200) ---
  {
    Id: 200,
    ParentId: 0,
    Level: 0,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_hn',
    SubmenuName: 'Báo cáo sản xuất GS Hà Nội',
    Type: 'submenu',
    Key: 'report_prod_hn',
    Label: 'Báo cáo sản xuất GS Hà Nội',
    Link: '',
    View: true
  },
  {
    Id: 201,
    ParentId: 200,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_hn',
    SubmenuName: 'Báo cáo sản xuất GS Hà Nội',
    Type: 'menu',
    Key: 'report_prod_hn_plan',
    Label: 'Kế hoạch sản xuất GS Hà Nội',
    Link: '/erp/u/report/production/hanoi-gs1/plan',
    View: true
  },
  {
    Id: 202,
    ParentId: 200,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_hn',
    SubmenuName: 'Báo cáo sản xuất GS Hà Nội',
    Type: 'menu',
    Key: 'report_prod_hn_stat',
    Label: 'Thống kê sản xuất GS Hà Nội',
    Link: '/erp/u/report/production/hanoi-gs1/statistics',
    View: true
  },

  // --- 1.3 SUBMENU: BÁO CÁO SẢN XUẤT GS QUẾ VÕ 1B (Id: 300) ---
  {
    Id: 300,
    ParentId: 0,
    Level: 0,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_qv',
    SubmenuName: 'Báo cáo sản xuất GS Quế Võ 1B',
    Type: 'submenu',
    Key: 'report_prod_qv',
    Label: 'Báo cáo sản xuất GS Quế Võ 1B',
    Link: '',
    View: true
  },
  {
    Id: 301,
    ParentId: 300,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_qv',
    SubmenuName: 'Báo cáo sản xuất GS Quế Võ 1B',
    Type: 'menu',
    Key: 'report_prod_qv_plan',
    Label: 'Kế hoạch sản xuất GS Quế Võ 1B',
    Link: '/erp/u/report/production/quevo-gs5/plan',
    View: true
  },
  {
    Id: 302,
    ParentId: 300,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_prod_qv',
    SubmenuName: 'Báo cáo sản xuất GS Quế Võ 1B',
    Type: 'menu',
    Key: 'report_prod_qv_stat',
    Label: 'Thống kê sản xuất GS Quế Võ 1B',
    Link: '/erp/u/report/production/quevo-gs5/statistics',
    View: true
  },

  // --- 1.4 SUBMENU: ĐĂNG KÝ BÁO CÁO (Id: 400) ---
  {
    Id: 400,
    ParentId: 0,
    Level: 0,
    OrderNo: 4,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_registration_grp',
    SubmenuName: 'Đăng ký báo cáo',
    Type: 'submenu',
    Key: 'report_registration_grp',
    Label: 'Đăng ký báo cáo',
    Link: '',
    View: true
  },
  {
    Id: 401,
    ParentId: 400,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_registration_grp',
    SubmenuName: 'Đăng ký báo cáo',
    Type: 'menu',
    Key: 'report_registration',
    Label: 'Đăng ký biểu mẫu báo cáo',
    Link: '/erp/u/report/registration',
    View: true
  },
  {
    Id: 402,
    ParentId: 400,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_registration_grp',
    SubmenuName: 'Đăng ký báo cáo',
    Type: 'menu',
    Key: 'report_plan_query',
    Label: 'Truy vấn kế hoạch sản xuất',
    Link: '/erp/u/report/plan-query',
    View: true
  },
  {
    Id: 403,
    ParentId: 400,
    Level: 1,
    OrderNo: 3,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_registration_grp',
    SubmenuName: 'Đăng ký báo cáo',
    Type: 'menu',
    Key: 'report_stat_query',
    Label: 'Truy vấn thống kê sản xuất',
    Link: '/erp/u/report/stat-query',
    View: true
  },

  // --- 1.5 SUBMENU: TÍNH TOÁN SẢN XUẤT (Id: 500) ---
  {
    Id: 500,
    ParentId: 0,
    Level: 0,
    OrderNo: 5,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_calc_grp',
    SubmenuName: 'Tính toán sản xuất',
    Type: 'submenu',
    Key: 'report_calc_grp',
    Label: 'Tính toán sản xuất',
    Link: '',
    View: true
  },
  {
    Id: 501,
    ParentId: 500,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_calc_grp',
    SubmenuName: 'Tính toán sản xuất',
    Type: 'menu',
    Key: 'report_calc_prod',
    Label: 'Tính KHSX / TKSX',
    Link: '/erp/u/report/calc-production',
    View: true
  },
  {
    Id: 502,
    ParentId: 500,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_calc_grp',
    SubmenuName: 'Tính toán sản xuất',
    Type: 'menu',
    Key: 'report_calc_prod_query',
    Label: 'Truy vấn tính KHSX / TKSX',
    Link: '/erp/u/report/calc-production-query',
    View: true
  },

  // --- 1.6 SUBMENU: CẨM NANG (Id: 600) ---
  {
    Id: 600,
    ParentId: 0,
    Level: 0,
    OrderNo: 6,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_handbook_grp',
    SubmenuName: 'Cẩm nang',
    Type: 'submenu',
    Key: 'report_handbook_grp',
    Label: 'Cẩm nang',
    Link: '',
    View: true
  },
  {
    Id: 601,
    ParentId: 600,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 1,
    RootMenuName: 'Báo Cáo Sản Xuất',
    SubmenuKey: 'report_handbook_grp',
    SubmenuName: 'Cẩm nang',
    Type: 'menu',
    Key: 'report_handbook_formula',
    Label: 'Tra cứu công thức',
    Link: '/erp/u/report/handbook/formula',
    View: true
  },

  // =========================================================================
  // PHÂN HỆ 2: QUẢN TRỊ HỆ THỐNG (RootMenuId: 2)
  // =========================================================================

  // --- 2.1 SUBMENU: NGƯỜI DÙNG & PHÂN QUYỀN (Id: 700) ---
  {
    Id: 700,
    ParentId: 0,
    Level: 0,
    OrderNo: 1,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_user_access',
    SubmenuName: 'Người dùng & Phân quyền',
    Type: 'submenu',
    Key: 'sys_user_access',
    Label: 'Người dùng & Phân quyền',
    Link: '',
    View: true
  },
  {
    Id: 701,
    ParentId: 700,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_user_access',
    SubmenuName: 'Người dùng & Phân quyền',
    Type: 'menu',
    Key: 'sys_users',
    Label: 'Đăng ký Người dùng',
    Link: '/erp/u/system/users',
    View: true
  },
  {
    Id: 702,
    ParentId: 700,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_user_access',
    SubmenuName: 'Người dùng & Phân quyền',
    Type: 'menu',
    Key: 'sys_role_groups',
    Label: 'Đăng ký Nhóm phân quyền',
    Link: '/erp/u/system/role-groups',
    View: true
  },
  {
    Id: 703,
    ParentId: 700,
    Level: 1,
    OrderNo: 3,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_user_access',
    SubmenuName: 'Người dùng & Phân quyền',
    Type: 'menu',
    Key: 'sys_role_mgmt',
    Label: 'Quản lý Phân quyền',
    Link: '/erp/u/system/permissions',
    View: true
  },

  // --- 2.2 SUBMENU: CẤU TRÚC HỆ THỐNG (Id: 800) ---
  {
    Id: 800,
    ParentId: 0,
    Level: 0,
    OrderNo: 2,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc Hệ thống',
    Type: 'submenu',
    Key: 'sys_structure',
    Label: 'Cấu trúc Hệ thống',
    Link: '',
    View: true
  },
  {
    Id: 801,
    ParentId: 800,
    Level: 1,
    OrderNo: 1,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc Hệ thống',
    Type: 'menu',
    Key: 'sys_root_menus',
    Label: 'Đăng ký Module gốc',
    Link: '/erp/u/system/modules',
    View: true
  },
  {
    Id: 802,
    ParentId: 800,
    Level: 1,
    OrderNo: 2,
    RootMenuId: 2,
    RootMenuName: 'Quản Trị Hệ Thống',
    SubmenuKey: 'sys_structure',
    SubmenuName: 'Cấu trúc Hệ thống',
    Type: 'menu',
    Key: 'sys_menus',
    Label: 'Đăng ký Submenu & Menu',
    Link: '/erp/u/system/menus',
    View: true
  }
]

// =========================================================================
// HÀM TỰ ĐỘNG CHUYỂN ĐỔI MẢNG PHẲNG TỪ SQL THÀNH CÂY TREE
// =========================================================================
export function buildMenuTreeFromFlatRows(flatRows = []) {
  if (!Array.isArray(flatRows) || flatRows.length === 0) return []

  const tree = []
  const nodeMap = new Map()

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

  for (const row of flatRows) {
    const id = String(row.Id != null ? row.Id : row.Key)
    const node = nodeMap.get(id)
    if (!node) continue

    let parentNode = null
    if (row.ParentId != null && row.ParentId !== 0 && row.ParentId !== '') {
      parentNode = nodeMap.get(String(row.ParentId))
    } else if (row.ParentKey) {
      parentNode = nodeMap.get(String(row.ParentKey))
    }

    if (parentNode && parentNode.Id !== node.Id) {
      parentNode.Children.push(node)
      parentNode.IsGroup = true
    } else if (node.Level === 0 || row.Type === 'submenu' || (!row.ParentId && !row.ParentKey)) {
      tree.push(node)
    }
  }

  return tree
}

export const MOCK_MENU_TREE = buildMenuTreeFromFlatRows(MOCK_FLAT_MENUS_SQL)

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

export function getFlatMenuList(flatOrTree = [], rootMenuId = null) {
  if (Array.isArray(flatOrTree) && flatOrTree.length > 0 && flatOrTree[0].Type) {
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

// 4. Danh sách Cấu hình Cột mẫu cho từng màn hình
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
    FieldCode: 'ItemCode',
    FieldName: 'Mã Sản Phẩm / Mã Báo Cáo',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Mã định danh nghiệp vụ'
  },
  {
    FieldCode: 'ItemName',
    FieldName: 'Tên Sản Phẩm / Tên Mục',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Tên hiển thị'
  },
  {
    FieldCode: 'FactoryCode',
    FieldName: 'Nhà Máy / Phân Xưởng',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Hà Nội (GS1), Quế Võ (GS5)'
  },
  {
    FieldCode: 'PlanQuantity',
    FieldName: 'Sản Lượng Kế Hoạch',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Số lượng theo KHSX'
  },
  {
    FieldCode: 'ActualQuantity',
    FieldName: 'Sản Lượng Thực Tế / Thống Kê',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Số lượng theo TKSX'
  },
  {
    FieldCode: 'CostPrice',
    FieldName: 'Đơn Giá / Định Mức Chi Phí',
    Visible: true,
    MaskValue: true,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Thông tin chi phí nhạy cảm (Khóa/Che giấu ***)'
  },
  {
    FieldCode: 'Status',
    FieldName: 'Trạng Thái Báo Cáo',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Trạng thái hoạt động'
  },
  {
    FieldCode: 'CreatedDate',
    FieldName: 'Ngày Lập / Ngày Báo Cáo',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Thời gian khởi tạo'
  },
  {
    FieldCode: 'CreatedBy',
    FieldName: 'Người Tạo',
    Visible: true,
    MaskValue: false,
    TargetType: 'Group',
    TargetName: 'Nhóm quyền',
    Comment: 'Tài khoản khởi tạo'
  }
]

// 5. Danh sách Phân Quyền Phạm Vi Dữ Liệu (Data Scope)
export const DEFAULT_DATA_SCOPES_TEMPLATE = [
  {
    ScopeCode: 'SCOPE_VIEW_FACTORY',
    ScopeName: 'Xem báo cáo cùng nhà máy / phân xưởng',
    OperationCode: 'BTN_SEARCH',
    OperationName: 'Truy vấn / Tìm kiếm dữ liệu (Search)',
    DataScope: 'BRANCH',
    DataScopeLabel: 'Nhà máy / Chi nhánh (FACTORY / BRANCH)',
    RuleCondition: 'ALL_STATUS',
    RuleConditionLabel: 'Mọi trạng thái báo cáo',
    Allow: true,
    Comment: 'Cho phép xem dữ liệu sản xuất trong cùng nhà máy'
  },
  {
    ScopeCode: 'SCOPE_CREATE_FACTORY',
    ScopeName: 'Lập báo cáo cho nhà máy / phân xưởng',
    OperationCode: 'BTN_CREATE',
    OperationName: 'Thêm mới dữ liệu (Create / Insert)',
    DataScope: 'BRANCH',
    DataScopeLabel: 'Nhà máy / Chi nhánh (FACTORY / BRANCH)',
    RuleCondition: 'ALL_STATUS',
    RuleConditionLabel: 'Mọi trạng thái báo cáo',
    Allow: true,
    Comment: 'Cho phép nhập dữ liệu sản xuất cho nhà máy'
  },
  {
    ScopeCode: 'SCOPE_EDIT_SELF_DRAFT',
    ScopeName: 'Sửa báo cáo do mình tạo (Bản nháp)',
    OperationCode: 'BTN_SAVE',
    OperationName: 'Lưu thay đổi dữ liệu (Save)',
    DataScope: 'SELF',
    DataScopeLabel: 'Chính mình (SELF - Phiếu của ai người đấy sửa)',
    RuleCondition: 'DRAFT_ONLY',
    RuleConditionLabel: 'Chỉ sửa khi là Bản nháp / Mới tạo',
    Allow: true,
    Comment: 'Chỉ được sửa báo cáo do chính mình tạo khi chưa chốt'
  },
  {
    ScopeCode: 'SCOPE_DELETE_SELF_DRAFT',
    ScopeName: 'Xóa báo cáo do mình tạo (Bản nháp)',
    OperationCode: 'BTN_DELETE',
    OperationName: 'Xóa dữ liệu / Xóa dòng sheet (Delete)',
    DataScope: 'SELF',
    DataScopeLabel: 'Chính mình (SELF - Phiếu của ai người đấy xóa)',
    RuleCondition: 'DRAFT_ONLY',
    RuleConditionLabel: 'Chỉ xóa khi là Bản nháp',
    Allow: true,
    Comment: 'Chỉ được xóa báo cáo nháp do chính mình tạo'
  },
  {
    ScopeCode: 'SCOPE_APPROVE_FACTORY',
    ScopeName: 'Phê duyệt báo cáo sản xuất nhà máy',
    OperationCode: 'BTN_APPROVE',
    OperationName: 'Phê duyệt chứng từ (Approve)',
    DataScope: 'BRANCH',
    DataScopeLabel: 'Nhà máy / Quản đốc (FACTORY)',
    RuleCondition: 'PENDING_APPROVAL',
    RuleConditionLabel: 'Báo cáo đang chờ duyệt',
    Allow: false,
    Comment: 'Quyền duyệt báo cáo cấp Quản đốc'
  },
  {
    ScopeCode: 'SCOPE_LOCK_COMPANY',
    ScopeName: 'Khóa chốt số liệu sản xuất toàn công ty',
    OperationCode: 'BTN_LOCK',
    OperationName: 'Khóa / Chốt dữ liệu (Lock)',
    DataScope: 'ALL',
    DataScopeLabel: 'Toàn công ty (ALL)',
    RuleCondition: 'APPROVED_ONLY',
    RuleConditionLabel: 'Đã duyệt hoàn tất',
    Allow: false,
    Comment: 'Quyền khóa kỳ báo cáo sản xuất'
  }
]

// 6. Hàm lấy danh sách quyền, cột, phạm vi chuyên biệt cho từng Menu
export function getRegisteredMenuPermissions(menuId, menuKey = '', menuLabel = '') {
  const key = String(menuKey || '').toLowerCase()
  const label = String(menuLabel || '').toLowerCase()

  // Phân hệ Quản trị hệ thống (User, Role, Menu, RootMenu)
  if (
    key.includes('sys') ||
    key.includes('role') ||
    key.includes('user') ||
    key.includes('menu') ||
    label.includes('hệ thống') ||
    label.includes('quyền')
  ) {
    return {
      actions: [
        {
          ActionCode: 'BTN_SEARCH',
          ActionName: 'Truy vấn dữ liệu (Search / F4)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Tìm kiếm dữ liệu hệ thống'
        },
        {
          ActionCode: 'BTN_CREATE',
          ActionName: 'Thêm mới bản ghi (Insert / F2)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Thêm mới cấu hình hệ thống'
        },
        {
          ActionCode: 'BTN_EDIT',
          ActionName: 'Chỉnh sửa cấu hình (Edit)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Chỉnh sửa thông tin'
        },
        {
          ActionCode: 'BTN_DELETE',
          ActionName: 'Xóa bản ghi (Delete / F8)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Xóa cấu hình'
        },
        {
          ActionCode: 'BTN_SAVE',
          ActionName: 'Lưu thay đổi (Save / F10)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Lưu thay đổi trên bảng dữ liệu'
        },
        {
          ActionCode: 'BTN_EXPORT',
          ActionName: 'Xuất file Excel (Export / F9)',
          TargetType: 'Group',
          TargetName: 'Nhóm quyền',
          Allow: true,
          Comment: 'Xuất danh mục hệ thống'
        }
      ],
      columns: DEFAULT_COLUMNS_TEMPLATE,
      scopes: [
        {
          ScopeCode: 'SCOPE_VIEW_ALL',
          ScopeName: 'Xem cấu hình toàn hệ thống',
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
          ScopeName: 'Chỉnh sửa cấu hình toàn hệ thống',
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

  // Phân hệ Báo cáo sản xuất và các màn hình khác
  return {
    actions: DEFAULT_ACTIONS_TEMPLATE,
    columns: DEFAULT_COLUMNS_TEMPLATE,
    scopes: DEFAULT_DATA_SCOPES_TEMPLATE
  }
}
