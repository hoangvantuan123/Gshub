/* eslint-disable react/prop-types */
import { Button } from 'antd'
import { SaveOutlined, SearchOutlined, DeleteRowOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export default function PermScopeActions({
  handleSearchData,
  handleSaveData,
  handleDeleteDataSheet,
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
          onClick={handleSearchData}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Tìm kiếm (Ctrl+Q)"
        >
          {t('TÌM KIẾM')}
        </Button>
      )}

      {canSave && (
        <Button
          key="Save"
          icon={<SaveOutlined className="text-green-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handleSaveData}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Lưu (Ctrl+S)"
        >
          {t('LƯU')}
        </Button>
      )}

      {handleDeleteDataSheet && canDelete && (
        <Button
          key="Delete"
          icon={<DeleteRowOutlined className="text-red-500" style={{ fontSize: '12px' }} />}
          size="small"
          onClick={handleDeleteDataSheet}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
          title="Xóa dòng (Ctrl+Shift+D)"
        >
          {t('XÓA SHEET')}
        </Button>
      )}
    </div>
  )
}
