/* eslint-disable react/prop-types */
import { Table, Tag, Space, Button, Tooltip, Switch, Popconfirm, Tabs } from 'antd'
import {
  FolderTree,
  LayoutGrid,
  Folder,
  FileText,
  Link as LinkIcon,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'

export default function MenuTable({
  tableTitle = 'Đăng ký & Cấu trúc Menu Hệ Thống',
  activeTab = 'tree',
  onTabChange,
  treeData = [],
  rootMenus = [],
  loading = false,
  selectedItem,
  onSelectItem,
  onAddSubMenu,
  onAddMenuItem,
  onEditItem,
  onToggleView,
  onDeleteItem
}) {
  const treeColumns = [
    {
      title: 'Tên Menu / Module',
      key: 'Label',
      width: 340,
      render: (_, record) => {
        let tagColor = 'blue'
        let iconBg = 'bg-blue-50 text-blue-600'
        if (record.Type === 'Root Module') {
          tagColor = 'purple'
          iconBg = 'bg-purple-100 text-purple-700'
        } else if (record.Type === 'Submenu') {
          tagColor = 'cyan'
          iconBg = 'bg-emerald-50 text-emerald-600'
        }

        return (
          <div className="flex items-center gap-2.5 py-0.5">
            <div className={`p-1.5 rounded ${iconBg} shrink-0`}>
              {record.Type === 'Root Module' ? (
                <LayoutGrid className="w-4 h-4" />
              ) : record.Type === 'Submenu' ? (
                <Folder className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                <span>{record.Label}</span>
                <Tag color={tagColor} className="text-[10px] m-0 px-1 py-0 rounded">
                  {record.Type}
                </Tag>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">Icon: {record.Icon}</div>
            </div>
          </div>
        )
      }
    },
    {
      title: 'Mã Key (Permission)',
      dataIndex: 'KeyName',
      key: 'KeyName',
      width: 220,
      render: (key) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
          {key}
        </span>
      )
    },
    {
      title: 'Đường dẫn Route (Link)',
      dataIndex: 'Link',
      key: 'Link',
      width: 260,
      render: (link) =>
        link && link !== '-' ? (
          <div className="flex items-center gap-1 text-xs text-blue-600 font-mono">
            <LinkIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{link}</span>
          </div>
        ) : (
          <span className="text-slate-300">-</span>
        )
    },
    {
      title: 'Thứ tự',
      dataIndex: 'OrderSeq',
      key: 'OrderSeq',
      width: 80,
      align: 'center',
      render: (seq) => <span className="font-semibold text-xs text-slate-700">{seq}</span>
    },
    {
      title: 'Hiển thị',
      key: 'View',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.View}
          onChange={() => onToggleView?.(record)}
          checkedChildren={<Eye className="w-3 h-3" />}
          unCheckedChildren={<EyeOff className="w-3 h-3" />}
        />
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          {record.Type === 'Root Module' && (
            <Tooltip title="Thêm Submenu vào Root này">
              <Button
                type="text"
                size="small"
                icon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                onClick={() => onAddSubMenu?.(record)}
              />
            </Tooltip>
          )}

          {record.Type === 'Submenu' && (
            <Tooltip title="Thêm Menu con vào Submenu này">
              <Button
                type="text"
                size="small"
                icon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                onClick={() => onAddMenuItem?.(record)}
              />
            </Tooltip>
          )}

          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<Edit3 className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => onEditItem?.(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn có chắc muốn xóa "${record.Label}" không?`}
            onConfirm={() => onDeleteItem?.(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                size="small"
                icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const rootColumns = [
    {
      title: 'Tên Root Menu (Module Cấp 1)',
      key: 'RootMenuName',
      width: 280,
      render: (_, record) => {
        const label = record.RootMenuName || record.RootMenuLabel || record.Label
        return (
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-xs">{label}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                ID: {record.RootMenuId || record.Id}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      title: 'Mã Key',
      dataIndex: 'RootMenuKey',
      key: 'RootMenuKey',
      width: 200,
      render: (key, r) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
          {key || r.Key || r.Id}
        </span>
      )
    },
    {
      title: 'Icon Sidebar',
      dataIndex: 'RootMenuIcon',
      key: 'RootMenuIcon',
      width: 160,
      render: (icon, r) => (
        <span className="font-mono text-xs text-indigo-600">{icon || r.Icon || 'Settings'}</span>
      )
    },
    {
      title: 'Thứ tự',
      dataIndex: 'OrderSeq',
      key: 'OrderSeq',
      width: 90,
      align: 'center'
    },
    {
      title: 'Hiển thị',
      key: 'View',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.View !== false}
          onChange={() => onToggleView?.({ ...record, Type: 'Root Module' })}
        />
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<Edit3 className="w-3.5 h-3.5 text-blue-600" />}
            onClick={() => onEditItem?.({ ...record, Type: 'Root Module' })}
          />
          <Popconfirm
            title="Xóa Root Menu"
            description="Bạn có chắc chắn muốn xóa Root Menu này?"
            onConfirm={() => onDeleteItem?.({ ...record, Type: 'Root Module' })}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Table Header with Tabs */}
      <div className="flex items-center justify-between px-3 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {tableTitle}
          </span>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          className="menu-tabs mb-[-1px]"
          items={[
            {
              key: 'tree',
              label: <span className="text-xs font-semibold">Cây Cấu Trúc Menu</span>
            },
            {
              key: 'roots',
              label: (
                <span className="text-xs font-semibold">Root Modules ({rootMenus.length})</span>
              )
            }
          ]}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-2">
        {activeTab === 'tree' ? (
          <Table
            columns={treeColumns}
            dataSource={treeData}
            rowKey="key"
            loading={loading}
            pagination={false}
            scroll={{ x: 1100 }}
            size="small"
            defaultExpandAllRows={true}
            onRow={(record) => ({
              onClick: () => onSelectItem?.(record),
              className:
                selectedItem?.Id === record.Id || selectedItem?.key === record.key
                  ? 'cursor-pointer bg-indigo-50/40'
                  : 'cursor-pointer hover:bg-slate-50'
            })}
            className="system-erp-table menu-tree-table"
          />
        ) : (
          <Table
            columns={rootColumns}
            dataSource={rootMenus}
            rowKey={(r) => r.RootMenuId || r.Id}
            loading={loading}
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => onSelectItem?.({ ...record, Type: 'Root Module' }),
              className:
                selectedItem?.Id === record.Id || selectedItem?.RootMenuId === record.RootMenuId
                  ? 'cursor-pointer bg-indigo-50/40'
                  : 'cursor-pointer hover:bg-slate-50'
            })}
            className="system-erp-table"
          />
        )}
      </div>
    </div>
  )
}
