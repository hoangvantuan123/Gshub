/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { Button } from 'antd'
import { SaveOutlined, SearchOutlined, DeleteRowOutlined, TeamOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export default function RoleManagementActions({
  activeSheet = 'menu',
  handleSearch,
  handleSave,
  handleDelete,
  onOpenMembersModal,
  permissions = {}
}) {
  const { t } = useTranslation()

  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)

  return (
    <div className="flex items-center gap-3 py-0.5 overflow-x-auto max-w-full">
      {canSearch && (
        <Button
          key="Search"
          icon={<SearchOutlined className="text-blue-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handleSearch}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Truy vấn bảng đang làm việc (Ctrl+Q)"
        >
          {t('TÌM KIẾM')}
        </Button>
      )}

      {canSave && (
        <Button
          key="Save"
          icon={<SaveOutlined className="text-green-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handleSave}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Lưu (Ctrl+S)"
        >
          {t('LƯU')}
        </Button>
      )}

      {handleDelete && canDelete && (
        <Button
          key="Delete"
          icon={<DeleteRowOutlined className="text-red-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handleDelete}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Xóa dòng phân quyền đang chọn (Ctrl+Shift+D)"
        >
          {t('XÓA')}
        </Button>
      )}
      <span className="text-xs text-slate-500 whitespace-nowrap border-l border-slate-200 pl-3">
        Đang làm việc:{' '}
        {activeSheet === 'users'
          ? 'Thành viên'
          : activeSheet === 'actions'
            ? 'Quyền thao tác'
            : 'Quyền menu'}
      </span>
    </div>
  )
}
