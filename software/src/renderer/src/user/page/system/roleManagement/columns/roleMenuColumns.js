/* eslint-disable react/prop-types, no-unused-vars, no-empty */
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
        visible: true
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
        title: t('system.orderSeq', 'Thứ Tự'),
        id: 'OrderSeq',
        kind: 'Text',
        readonly: true,
        width: 70,
        hasMenu: true,
        visible: true,
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
        width: 200,
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
        title: t('system.view', 'Xem / Truy Cập (View)'),
        id: 'View',
        kind: 'Boolean',
        readonly: false,
        width: 150,
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

