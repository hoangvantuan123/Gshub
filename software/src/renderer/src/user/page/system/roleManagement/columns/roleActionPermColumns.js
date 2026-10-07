/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useRoleActionPermColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.orderSeq', 'Thứ Tự'),
        id: 'IdxNo',
        kind: 'Text',
        readonly: true,
        width: 70,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.actionKey', 'Mã Nút Lệnh (Action Key)'),
        id: 'ActionKey',
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.actionName', 'Tên Nút Lệnh / Hành Động'),
        id: 'ActionName',
        kind: 'Text',
        readonly: true,
        width: 260,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.description', 'Mô Tả / Quy Trình'),
        id: 'Description',
        kind: 'Text',
        readonly: true,
        width: 320,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.allow', 'Cho Phép Thực Hiện (Allow)'),
        id: 'Allow',
        kind: 'Boolean',
        readonly: false,
        width: 180,
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

