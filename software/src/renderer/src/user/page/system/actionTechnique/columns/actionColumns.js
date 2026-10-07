/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useActionColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 50,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
      },
      {
        title: t('system.orderSeq', 'STT'),
        id: 'OrderSeq',
        kind: 'Number',
        readonly: false,
        width: 70,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.actionKey', 'Mã Hành Động (ActionKey) *'),
        id: 'ActionKey',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.actionName', 'Tên Hành Động / Nút Lệnh *'),
        id: 'ActionName',
        kind: 'Text',
        readonly: false,
        width: 260,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.description', 'Mô Tả Chức Năng'),
        id: 'Description',
        kind: 'Text',
        readonly: false,
        width: 300,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.icon', 'Biểu Tượng (Icon)'),
        id: 'Icon',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.active', 'Kích Hoạt'),
        id: 'Active',
        kind: 'Boolean',
        readonly: false,
        width: 95,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdAt', 'Thời gian tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedAt', 'Thời gian cập nhật'),
        id: 'UpdatedAt',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdBy', 'Người tạo'),
        id: 'CreatedByName',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedBy', 'Người sửa'),
        id: 'UpdatedByName',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      }
    ]

    return cols
      .filter((col) => {
        if (typeof isFieldVisible === 'function') {
          return isFieldVisible(col.id) !== false
        }
        return true
      })
      .map((col) => {
        if (typeof isFieldReadOnly === 'function' && isFieldReadOnly(col.id)) {
          return { ...col, readonly: true }
        }
        return col
      })
  }, [t, isFieldVisible, isFieldReadOnly])
}
