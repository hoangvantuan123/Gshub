/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  PlusSquare,
  MinusSquare,
  LayoutGrid
} from 'lucide-react'

import { MOCK_ROOT_MENUS, MOCK_FLAT_MENUS_SQL } from '../../../roleManagement/mock/mockRoleData'

// Xây dựng cây phân cấp hoàn chỉnh: Phân Hệ (Cấp 0) -> Submenu (Cấp 1) -> Menu (Cấp 2) -> MenuItem (Cấp 3)
export function buildHierarchicalModuleTree(
  rootMenus = MOCK_ROOT_MENUS,
  flatMenus = MOCK_FLAT_MENUS_SQL
) {
  if (!Array.isArray(rootMenus) || rootMenus.length === 0) return []

  return rootMenus.map((root) => {
    const rootId = root.RootMenuId || root.Id
    // Lấy các Submenu thuộc phân hệ này (Level 0 trong SQL flat rows)
    const submenus = (flatMenus || []).filter(
      (r) =>
        (r.RootMenuId === rootId || r.RootMenuKey === root.RootMenuKey) &&
        (r.Level === 0 || r.Type === 'submenu')
    )

    const submenuNodes = submenus.map((sub) => {
      // Lấy các Menu thuộc Submenu này (Level 1)
      const menus = (flatMenus || []).filter(
        (r) => r.ParentId === sub.Id && (r.Level === 1 || r.Type === 'menu')
      )

      const menuNodes = menus.map((menu) => {
        // Lấy các MenuItem thuộc Menu này (Level 2)
        const menuItems = (flatMenus || []).filter(
          (r) => r.ParentId === menu.Id && (r.Level === 2 || r.Type === 'menuitem')
        )

        return {
          ...menu,
          Id: `menu_${menu.Id}`,
          Key: menu.Key,
          MenuKey: menu.Key,
          Label: menu.Label,
          RawLabel: menu.Label,
          RootMenuName: root.RootMenuLabel,
          SubmenuName: sub.Label || sub.SubmenuName,
          TableName: menu.TableName || '',
          Level: 2,
          Type: 'menu',
          Children: menuItems.map((item) => ({
            ...item,
            Id: `item_${item.Id}`,
            Key: item.Key,
            MenuKey: item.Key,
            Label: item.Label,
            RawLabel: item.Label,
            RootMenuName: root.RootMenuLabel,
            SubmenuName: sub.Label || sub.SubmenuName,
            TableName: item.TableName || '',
            Level: 3,
            Type: 'menuitem',
            Children: []
          }))
        }
      })

      return {
        ...sub,
        Id: `sub_${sub.Id}`,
        Key: sub.Key || sub.SubmenuKey || `sub_${sub.Id}`,
        Label: sub.Label || sub.SubmenuName,
        RawLabel: sub.Label || sub.SubmenuName,
        RootMenuName: root.RootMenuLabel,
        Level: 1,
        Type: 'submenu',
        Children: menuNodes
      }
    })

    return {
      Id: `root_${rootId}`,
      Key: root.RootMenuKey || `root_${rootId}`,
      Label: root.RootMenuLabel,
      RawLabel: root.RootMenuLabel,
      RootMenuId: rootId,
      RootMenuName: root.RootMenuLabel,
      Level: 0,
      Type: 'root',
      Children: submenuNodes
    }
  })
}

// Thu thập tất cả ID của các node cha có con
function getAllParentIds(nodes = []) {
  const ids = []
  const walk = (items) => {
    for (const item of items) {
      if (Array.isArray(item.Children) && item.Children.length > 0) {
        ids.push(item.Id)
        walk(item.Children)
      }
    }
  }
  walk(nodes)
  return ids
}

// Component Node Đơn Lẻ trong Cây Phân Hệ & Menu
function TreeNodeItem({
  node,
  depth = 0,
  expandedIds,
  onToggleExpand,
  selectedResource,
  onSelectNode
}) {
  const hasChildren = Array.isArray(node.Children) && node.Children.length > 0
  const isExpanded = expandedIds.has(node.Id)
  const isSelected =
    selectedResource?.ResourceCode &&
    (node.Key === selectedResource.ResourceCode || node.MenuKey === selectedResource.ResourceCode)

  const isFolder =
    node.Level === 0 ||
    node.Level === 1 ||
    node.Type === 'root' ||
    node.Type === 'submenu' ||
    hasChildren

  const handleClick = (e) => {
    e.stopPropagation()
    if (isFolder && hasChildren) {
      // Nhấp vào Phân hệ hoặc Submenu/thư mục: chỉ đóng/mở nhánh cây
      onToggleExpand(node.Id)
    } else {
      // Chỉ khi nhấp vào menu hoặc menuitem thực tế thì mới chọn và nạp dữ liệu bên phải
      onSelectNode({
        ResourceCode: node.Key || node.MenuKey || '',
        ResourceName: node.RawLabel || node.Label || '',
        RootMenuName: node.RootMenuName || '',
        SubmenuName: node.SubmenuName || '',
        TableName: node.TableName || '',
        Type: node.Type || 'menu',
        ...node
      })
    }
  }

  return (
    <div className="flex flex-col select-none relative">
      {/* Dòng hiển thị Node */}
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${Math.max(6, depth * 16 + 6)}px` }}
        className={`group flex items-center gap-1.5 py-1 pr-2 rounded-xs cursor-pointer transition-colors duration-100 text-xs min-h-[26px] border-l-2 ${
          isSelected
            ? 'bg-blue-50 text-blue-700 font-semibold border-blue-600 shadow-2xs'
            : node.Level === 0
              ? 'text-slate-900 bg-slate-100/80 hover:bg-slate-200/90 font-bold border-transparent'
              : isFolder
                ? 'text-slate-800 hover:bg-slate-100 font-semibold border-transparent'
                : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900 font-normal border-transparent'
        }`}
      >
        {/* Nút mũi tên Chevron mở/đóng */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.Id)
            }}
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0 transition-transform"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 shrink-0 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-slate-400" />
          </span>
        )}

        {/* Biểu tượng phân cấp trang nhã */}
        <div className="shrink-0 flex items-center">
          {node.Level === 0 ? (
            <LayoutGrid className="w-3.5 h-3.5 text-blue-700" />
          ) : isFolder ? (
            isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-500" />
            )
          ) : (
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
          )}
        </div>

        {/* Tên Phân Hệ / Menu */}
        <span className="truncate flex-1 min-w-0" title={node.Label}>
          {node.Label}
        </span>
      </div>

      {/* Các Node Con */}
      {hasChildren && isExpanded && (
        <div className="relative flex flex-col border-l border-slate-200 ml-3.5 pl-0">
          {node.Children.map((child) => (
            <TreeNodeItem
              key={child.Id || child.Key}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              selectedResource={selectedResource}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PermResourceMenuTree({ onSelectResource, selectedResource = {} }) {
  const { t } = useTranslation()

  // Xây dựng cây phân cấp hoàn chỉnh từ Phân Hệ -> Submenu -> Menu -> MenuItem
  const fullTreeData = useMemo(
    () => buildHierarchicalModuleTree(MOCK_ROOT_MENUS, MOCK_FLAT_MENUS_SQL),
    []
  )

  // Quản lý danh sách node đang mở rộng (Mặc định mở toàn bộ)
  const allParentIds = useMemo(() => getAllParentIds(fullTreeData), [fullTreeData])
  const [expandedIds, setExpandedIds] = useState(() => new Set(allParentIds))

  // Tự động kích hoạt chọn Menu chức năng đầu tiên (leaf menu/menuitem) khi khởi tạo
  useEffect(() => {
    if (!selectedResource?.ResourceCode && fullTreeData.length > 0) {
      const findFirstActionableMenu = (items) => {
        for (const item of items) {
          if (!item.Children || item.Children.length === 0) {
            return item
          }
          const found = findFirstActionableMenu(item.Children)
          if (found) return found
        }
        return null
      }

      const firstMenu = findFirstActionableMenu(fullTreeData)
      if (firstMenu && onSelectResource) {
        onSelectResource({
          ResourceCode: firstMenu.Key || firstMenu.MenuKey,
          ResourceName: firstMenu.RawLabel || firstMenu.Label,
          RootMenuName: firstMenu.RootMenuName,
          SubmenuName: firstMenu.SubmenuName,
          TableName: firstMenu.TableName || '',
          Type: firstMenu.Type || 'menu',
          ...firstMenu
        })
      }
    }
  }, [selectedResource, onSelectResource, fullTreeData])

  const toggleExpand = useCallback((nodeId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(allParentIds))
  }, [allParentIds])

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  return (
    <div className="flex flex-col h-full w-full bg-white select-none overflow-hidden">
      {/* 1. THANH HEADER ĐIỀU KHIỂN CÂY MENU (Chuẩn 28px) */}
      <div className="h-7 min-h-[28px] px-2.5 bg-slate-200/90 border-b border-slate-300 flex items-center justify-between shrink-0 text-xs font-semibold text-slate-700">
        <div className="flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
          <span>{t('system.systemMenuTree', 'Cây Phân Hệ & Menu Chức Năng')}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            className="p-0.5 rounded hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
            title={t('system.expandAll', 'Mở rộng tất cả')}
          >
            <PlusSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="p-0.5 rounded hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
            title={t('system.collapseAll', 'Thu gọn tất cả')}
          >
            <MinusSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. THÂN CÂY PHÂN HỆ & MENU PHÂN CẤP */}
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5">
        {fullTreeData.map((node) => (
          <TreeNodeItem
            key={node.Id || node.Key}
            node={node}
            depth={0}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            selectedResource={selectedResource}
            onSelectNode={onSelectResource}
          />
        ))}
      </div>

      {/* 3. FOOTER THỐNG KÊ */}
      <div className="h-6 min-h-[24px] px-2.5 bg-slate-100 border-t border-slate-300 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>{t('system.ready', 'Sẵn sàng')}</span>
        </span>
        <span className="font-mono text-slate-600 font-medium">
          {fullTreeData.length} {t('system.rootModulesCount', 'phân hệ')}
        </span>
      </div>
    </div>
  )
}
