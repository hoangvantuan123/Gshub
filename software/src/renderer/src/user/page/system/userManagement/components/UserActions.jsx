import { useMemo } from 'react'
import { Button, Dropdown } from 'antd'
import {
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteRowOutlined
} from '@ant-design/icons'
import { SquareArrowOutUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function UserActions({
  handleSearchData,
  handleUpdatePassUsers,
  handleSaveData,
  handleDeleteDataSheet,
  handleUpdateStatusAcc,
  handleOpenDetailForm,
  permissions = {}
}) {
  const { t } = useTranslation()

  // Kiểm tra quyền thao tác: mặc định cho phép trừ khi bị cấm rõ ràng
  const canSearch = permissions.canSearch !== undefined ? Boolean(permissions.canSearch) : true
  const canSave = Boolean(permissions.canEdit || permissions.canCreate)
  const canDelete = Boolean(permissions.canDelete)
  const canViewDetail = permissions.canView !== undefined ? Boolean(permissions.canView) : true
  const canOperate = permissions.canView !== undefined ? Boolean(permissions.canView) : true

  const handleMenuClick = ({ key }) => {
    switch (key) {
      case 'openDetail':
        handleOpenDetailForm && handleOpenDetailForm()
        break
      case 'updatePass':
        handleUpdatePassUsers && handleUpdatePassUsers()
        break
      case 'lutru':
        handleUpdateStatusAcc && handleUpdateStatusAcc(true)
        break
      case 'bolutru':
        handleUpdateStatusAcc && handleUpdateStatusAcc(false)
        break
      default:
        break
    }
  }

  const menuItems = useMemo(
    () => [
      {
        key: 'openDetail',
        disabled: !canViewDetail,
        icon: <SquareArrowOutUpRight className="text-blue-500" style={{ width: 12, height: 12 }} />,
        label: t('Mở chi tiết')
      },
      {
        key: 'updatePass',
        disabled: !canSave,
        icon: <LockOutlined className="text-amber-500" />,
        label: t('Đặt lại mật khẩu mặc định')
      },
      {
        key: 'lutru',
        disabled: !canSave,
        icon: <SaveOutlined className="text-teal-500" />,
        label: t('Lưu trữ')
      },
      {
        key: 'bolutru',
        disabled: !canSave,
        icon: <UnlockOutlined className="text-indigo-500" />,
        label: t('Bỏ lưu trữ')
      }
    ],
    [canViewDetail, canSave, t]
  )

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

      {handleOpenDetailForm && canViewDetail && (
        <Button
          key="Detail"
          icon={
            <SquareArrowOutUpRight className="text-amber-500" style={{ width: 12, height: 12 }} />
          }
          size="small"
          onClick={handleOpenDetailForm}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
          color="default"
          variant="link"
        >
          {t('MỞ')}
        </Button>
      )}

      <Dropdown
        menu={{ items: menuItems, onClick: handleMenuClick }}
        trigger={canOperate ? ['click'] : []}
        disabled={!canOperate}
      >
        <Button
          color="default"
          size="small"
          variant="link"
          disabled={!canOperate}
          className="uppercase text-[10px] whitespace-nowrap font-medium"
          style={{ fontSize: '10px', padding: '2px 4px', height: '24px' }}
        >
          <SettingOutlined className="text-slate-600" style={{ fontSize: '12px' }} />{' '}
          {t('THAO TÁC')}
        </Button>
      </Dropdown>
    </div>
  )
}
