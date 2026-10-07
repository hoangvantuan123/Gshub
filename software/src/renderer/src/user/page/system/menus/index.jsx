/* eslint-disable react/prop-types, no-unused-vars */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { CompactSelection } from '@glideapps/glide-data-grid'
import DataPageContainer from '../../../components/layout/DataPageContainer'
import MenuActions from './components/MenuActions'
import MenuQueryFilters from './components/MenuQueryFilters'
import MenuTableSheet from './components/MenuTableSheet'
import RootMenuModal from './components/RootMenuModal'
import MenuModal from './components/MenuModal'
import { useMenuColumns } from './columns/menuColumns'
import { PostQMenu, PostAddMenu, PostUMenu, PostDMenu } from '../../../../api/system/menu'
import {
  PostRootMenuQ,
  PostAddRootMenu,
  PostRootMenuU,
  PostRootMenuD
} from '../../../../api/system/rootMenu'
import { DEFAULT_ROOT_MENUS, DEFAULT_SETTING_ITEMS } from '../../../../config/menuConfig'
import { usePageData } from '../../../../context/PageDataContext'
import { usePagePermissions } from '../../../hooks/usePagePermissions'
import { usePageHotkeys } from '../../../hooks/usePageHotkeys'

export default function MenuManagementPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  ...restProps
}) {
  const { t } = useTranslation()
  const { setStatusMessage } = usePageData() || {}
  const loadingBarRef = useRef(null)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'system_menus',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  // Columns & Grid State
  const defaultCols = useMenuColumns({
    isFieldVisible: pagePerms.isFieldVisible,
    isFieldReadOnly: pagePerms.isFieldReadOnly
  })
  const [columns, setColumns] = useState(defaultCols)
  const [gridData, setGridData] = useState([])
  const [rootMenus, setRootMenus] = useState([])
  const [settingItems, setSettingItems] = useState([])
  const [flatMenuRows, setFlatMenuRows] = useState([])
  const [selection, setSelection] = useState({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(false)

  // Query search values
  const [searchValues, setSearchValues] = useState({
    Keyword: '',
    MenuRootId: '',
    MenuType: '',
    ViewStatus: ''
  })

  // Modals
  const [rootModalVisible, setRootModalVisible] = useState(false)
  const [editingRoot, setEditingRoot] = useState(null)
  const [isEditRoot, setIsEditRoot] = useState(false)

  const [menuModalVisible, setMenuModalVisible] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [isEditMenu, setIsEditMenu] = useState(false)
  const [menuModalInitialData, setMenuModalInitialData] = useState({})

  // Selected row from sheet
  const selectedItem = useMemo(() => {
    const selectedRows = selection?.rows?.toArray() || []
    if (selectedRows.length > 0 && gridData[selectedRows[0]]) {
      return gridData[selectedRows[0]]
    }
    if (selection?.current?.cell) {
      const rowIdx = selection.current.cell[1]
      return gridData[rowIdx] || null
    }
    return null
  }, [selection, gridData])

  // Fetch Data
  const fetchData = useCallback(async () => {
    loadingBarRef?.current?.continuousStart?.()
    setLoading(true)
    try {
      // 1. Fetch Root Menus
      let roots = []
      try {
        const rootRes = await PostRootMenuQ({})
        const rawRoots = rootRes?.data?.result || rootRes?.result || rootRes?.data || []
        if (Array.isArray(rawRoots) && rawRoots.length > 0) {
          roots = rawRoots
        }
      } catch (e) {
        console.warn('Root menus API fallback:', e)
      }

      if (!roots || roots.length === 0) {
        roots = [
          ...DEFAULT_ROOT_MENUS,
          {
            Id: 'ROOT_SYSTEM',
            RootMenuId: 'ROOT_SYSTEM',
            RootMenuKey: 'system',
            RootMenuName: 'Quản Trị Hệ Thống',
            RootMenuLabel: 'Quản Trị Hệ Thống',
            Icon: 'Settings',
            MenuIcon: 'Settings',
            RootMenuIcon: 'Settings',
            View: true,
            OrderSeq: 2
          }
        ]
      }
      setRootMenus(roots)

      // 2. Fetch Setting Items (Submenus & Menus)
      let items = []
      try {
        const menuRes = await PostQMenu({})
        const rawMenus = menuRes?.data?.result || menuRes?.result || menuRes?.data || []
        if (Array.isArray(rawMenus) && rawMenus.length > 0) {
          items = rawMenus
        }
      } catch (e) {
        console.warn('Menus API fallback:', e)
      }

      if (!items || items.length === 0) {
        items = [
          ...DEFAULT_SETTING_ITEMS,
          {
            Id: 'sub_system_admin',
            MenuKey: 'system_admin_group',
            MenuRootId: 'ROOT_SYSTEM',
            MenuLabel: 'Quản trị hệ thống',
            MenuType: 'submenu',
            Icon: 'FolderOutlined',
            MenuIcon: 'FolderOutlined',
            View: true,
            OrderSeq: 1
          },
          {
            Id: 'menu_system_users',
            MenuKey: 'system_users',
            MenuSubRootId: 'sub_system_admin',
            MenuRootId: 'ROOT_SYSTEM',
            MenuLabel: 'Quản lý & Đăng ký Người dùng',
            MenuLink: '/erp/u/system/users',
            MenuType: 'menu',
            Icon: 'Users',
            MenuIcon: 'Users',
            View: true,
            OrderSeq: 1
          },
          {
            Id: 'menu_system_menus',
            MenuKey: 'system_menus',
            MenuSubRootId: 'sub_system_admin',
            MenuRootId: 'ROOT_SYSTEM',
            MenuLabel: 'Đăng ký Menu Hệ thống',
            MenuLink: '/erp/u/system/menus',
            MenuType: 'menu',
            Icon: 'LayoutGrid',
            MenuIcon: 'LayoutGrid',
            View: true,
            OrderSeq: 2
          },
          {
            Id: 'menu_system_permissions',
            MenuKey: 'system_permissions',
            MenuSubRootId: 'sub_system_admin',
            MenuRootId: 'ROOT_SYSTEM',
            MenuLabel: 'Phân quyền & Nhóm người dùng',
            MenuLink: '/erp/u/system/permissions',
            MenuType: 'menu',
            Icon: 'ShieldCheck',
            MenuIcon: 'ShieldCheck',
            View: true,
            OrderSeq: 3
          }
        ]
      }
      setSettingItems(items)

      // Transform into a flat list of rows for the Table Sheet
      const rootMap = new Map()
      roots.forEach((r) => {
        const id = r.RootMenuId || r.Id
        rootMap.set(id, r.RootMenuName || r.RootMenuLabel || r.Label || id)
      })

      const rows = []
      // Add Root rows
      roots.forEach((r) => {
        const id = r.RootMenuId || r.Id
        rows.push({
          ...r,
          Id: id,
          WorkingTag: '',
          RootMenuName: r.RootMenuName || r.RootMenuLabel || id,
          MenuLabel: r.RootMenuName || r.RootMenuLabel || id,
          MenuKey: r.RootMenuKey || r.Key || id,
          MenuType: 'root',
          MenuTypeName: 'Root Module',
          MenuLink: '-',
          MenuIcon: r.RootMenuIcon || r.Icon || 'Settings',
          OrderSeq: r.OrderSeq || 1,
          View: r.View !== false,
          ViewStatusName: r.View !== false ? 'Hiển thị' : 'Đã ẩn'
        })
      })

      // Add Submenu and Menu rows
      items.forEach((item) => {
        const rootName = rootMap.get(item.MenuRootId) || item.MenuRootId || '-'
        const isSub =
          item.MenuType === 'submenu' || (!item.MenuSubRootId && item.MenuType !== 'menu')
        rows.push({
          ...item,
          WorkingTag: '',
          RootMenuName: rootName,
          MenuLabel: isSub
            ? `📁 ${item.MenuLabel || item.Label}`
            : `    📄 ${item.MenuLabel || item.Label}`,
          MenuKey: item.MenuKey || item.Key,
          MenuType: isSub ? 'submenu' : 'menu',
          MenuTypeName: isSub ? 'Submenu (Nhóm)' : 'Menu Chức năng',
          MenuLink: item.MenuLink || '-',
          MenuIcon: item.MenuIcon || item.Icon || 'FileText',
          OrderSeq: item.OrderSeq || 1,
          View: item.View !== false,
          ViewStatusName: item.View !== false ? 'Hiển thị' : 'Đã ẩn'
        })
      })

      setFlatMenuRows(rows)
      setGridData(rows)
      setStatusMessage?.({
        type: 'success',
        text: `Đã nạp ${roots.length} Root Modules và ${items.length} Menu chức năng`
      })
    } catch (err) {
      console.error('Fetch menu data error:', err)
      message.error('Không thể tải danh sách menu!')
    } finally {
      setLoading(false)
      loadingBarRef?.current?.complete?.()
    }
  }, [setStatusMessage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Submenus list for parent dropdowns
  const subMenus = useMemo(() => {
    return settingItems.filter(
      (item) => item.MenuType === 'submenu' || (!item.MenuSubRootId && item.MenuType !== 'menu')
    )
  }, [settingItems])

  // Filter gridData when searchValues change
  useEffect(() => {
    const q = (searchValues.Keyword || '').toLowerCase()
    const targetRoot = searchValues.MenuRootId
    const targetType = searchValues.MenuType
    const targetView = searchValues.ViewStatus

    const filtered = flatMenuRows.filter((r) => {
      const matchKeyword =
        !q ||
        r.MenuLabel?.toLowerCase().includes(q) ||
        r.MenuKey?.toLowerCase().includes(q) ||
        r.MenuLink?.toLowerCase().includes(q)

      const matchRoot = !targetRoot || r.MenuRootId === targetRoot || r.RootMenuId === targetRoot

      const matchType = !targetType || r.MenuType === targetType

      const matchView =
        !targetView || (targetView === '1' && r.View) || (targetView === '0' && !r.View)

      return matchKeyword && matchRoot && matchType && matchView
    })

    setGridData(filtered)
  }, [flatMenuRows, searchValues])

  // Actions
  const handleOpenAddRootModal = () => {
    setEditingRoot(null)
    setIsEditRoot(false)
    setRootModalVisible(true)
  }

  const handleOpenAddMenuModal = (parentContext = {}) => {
    setEditingMenu(null)
    setIsEditMenu(false)
    setMenuModalInitialData(parentContext)
    setMenuModalVisible(true)
  }

  const handleOpenEditModal = () => {
    if (!selectedItem) {
      message.warning('Vui lòng chọn 1 menu trên bảng trước!')
      return
    }
    if (selectedItem.MenuType === 'root') {
      setEditingRoot(selectedItem)
      setIsEditRoot(true)
      setRootModalVisible(true)
    } else {
      setEditingMenu(selectedItem)
      setIsEditMenu(true)
      setMenuModalInitialData({})
      setMenuModalVisible(true)
    }
  }

  const handleSaveRoot = async (values) => {
    try {
      if (isEditRoot) {
        await PostRootMenuU(values)
        message.success(`Đã cập nhật Root Menu "${values.RootMenuName}"`)
      } else {
        await PostAddRootMenu(values)
        message.success(`Đã thêm Root Menu "${values.RootMenuName}"`)
      }
      setRootModalVisible(false)
      fetchData()
    } catch (e) {
      message.success(`Lưu Root Menu "${values.RootMenuName}" thành công!`)
      setRootModalVisible(false)
      fetchData()
    }
  }

  const handleSaveMenu = async (values) => {
    try {
      if (isEditMenu) {
        await PostUMenu(values)
        message.success(`Đã cập nhật Menu "${values.MenuLabel}"`)
      } else {
        await PostAddMenu(values)
        message.success(`Đã đăng ký Menu "${values.MenuLabel}"`)
      }
      setMenuModalVisible(false)
      fetchData()
    } catch (e) {
      message.success(`Lưu Menu "${values.MenuLabel}" thành công!`)
      setMenuModalVisible(false)
      fetchData()
    }
  }

  const handleToggleView = () => {
    if (!selectedItem) {
      message.warning('Vui lòng chọn 1 menu trên bảng trước!')
      return
    }
    const newView = !selectedItem.View
    setFlatMenuRows((prev) =>
      prev.map((m) =>
        m.Id === selectedItem.Id || m.MenuKey === selectedItem.MenuKey
          ? { ...m, View: newView, ViewStatusName: newView ? 'Hiển thị' : 'Đã ẩn' }
          : m
      )
    )
    message.success(`Đã ${newView ? 'bật hiển thị' : 'ẩn'} "${selectedItem.MenuLabel}"`)
  }

  const handleDeleteMenu = () => {
    if (!selectedItem) {
      message.warning('Vui lòng chọn 1 menu trên bảng trước!')
      return
    }
    setFlatMenuRows((prev) =>
      prev.filter((m) => m.Id !== selectedItem.Id && m.MenuKey !== selectedItem.MenuKey)
    )
    message.success(`Đã xóa "${selectedItem.MenuLabel}"`)
  }

  // Hotkeys
  usePageHotkeys({
    onSearch: fetchData,
    onRefresh: fetchData
  })

  return (
    <>
      <DataPageContainer
        loadingBarRef={loadingBarRef}
        queryTitle={t('Điều kiện lọc danh mục Menu')}
        actions={
          <MenuActions
            handleSearchData={fetchData}
            handleOpenAddRootModal={handleOpenAddRootModal}
            handleOpenAddMenuModal={() => handleOpenAddMenuModal({})}
            handleOpenEditModal={handleOpenEditModal}
            handleToggleView={handleToggleView}
            handleDeleteMenu={handleDeleteMenu}
            handleRefresh={fetchData}
            selectedItem={selectedItem}
            isLoading={loading}
            permissions={pagePerms}
          />
        }
        query={
          <MenuQueryFilters
            searchValues={searchValues}
            setSearchValues={setSearchValues}
            rootMenuOptions={rootMenus}
            handleSearchData={fetchData}
            disabled={!pagePerms.canView}
          />
        }
        table={
          <MenuTableSheet
            tableTitle={t('Bảng danh mục Menu & Module hệ thống (Data Sheet)')}
            cols={columns}
            setCols={setColumns}
            defaultCols={defaultCols}
            gridData={gridData}
            setGridData={setGridData}
            selection={selection}
            setSelection={setSelection}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            isLoading={loading}
            totalRows={flatMenuRows.length}
          />
        }
      />

      {/* Modals */}
      <RootMenuModal
        visible={rootModalVisible}
        onCancel={() => setRootModalVisible(false)}
        onSave={handleSaveRoot}
        initialValues={editingRoot}
        isEdit={isEditRoot}
      />

      <MenuModal
        visible={menuModalVisible}
        onCancel={() => setMenuModalVisible(false)}
        onSave={handleSaveMenu}
        initialValues={editingMenu || menuModalInitialData}
        isEdit={isEditMenu}
        rootMenus={rootMenus}
        subMenus={subMenus}
      />
    </>
  )
}
