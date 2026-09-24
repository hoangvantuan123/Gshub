import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useRoleMenuColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
      },
      {
        title: t('system.roleId', 'Mã Quyền'),
        id: 'Id',
        kind: 'Text',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.menuHierarchy', 'Phân Cấp Menu & Chức Năng'),
        id: 'MenuLabel',
        kind: 'Text',
        readonly: true,
        width: 380,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.menuKey', 'Mã Định Danh (Key)'),
        id: 'MenuKey',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.menuType', 'Phân Loại'),
        id: 'MenuType',
        kind: 'Text',
        readonly: true,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.view', 'Xem (View)'),
        id: 'View',
        kind: 'Boolean',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      }
    ]

    return cols
      .filter((col) => !isFieldVisible || isFieldVisible(col.id))
      .map((col) => ({
        ...col,
        readonly: isFieldReadOnly ? isFieldReadOnly(col.id) || col.readonly : col.readonly
      }))
  }, [t, isFieldVisible, isFieldReadOnly])
}
