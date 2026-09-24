import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useRoleRootMenuColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.groupId', 'Mã Nhóm'),
        id: 'GroupId',
        kind: 'Text',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
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
        title: t('system.rootMenuId', 'Mã Module Root'),
        id: 'RootMenuId',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.rootMenuLabel', 'Module (Root Menu)'),
        id: 'RootMenuLabel',
        kind: 'Text',
        readonly: true,
        width: 320,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.view', 'Xem (View)'),
        id: 'View',
        kind: 'Boolean',
        readonly: false,
        width: 130,
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
