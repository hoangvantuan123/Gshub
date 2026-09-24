import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useRoleColumnSetupColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.id', 'ID'),
        id: 'Id',
        kind: 'Text',
        readonly: true,
        width: 70,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.fieldCode', 'Mã Cột / Trường'),
        id: 'FieldCode',
        kind: 'Text',
        readonly: true,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.fieldName', 'Tên Hiển Thị Cột'),
        id: 'FieldName',
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.visible', 'Hiển Thị (Visible)'),
        id: 'Visible',
        kind: 'Boolean',
        readonly: false,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.maskValue', 'Khóa / Ẩn (***)'),
        id: 'MaskValue',
        kind: 'Boolean',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.targetType', 'Áp Dụng Cho'),
        id: 'TargetType',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.targetName', 'Đối Tượng (Nhóm / User)'),
        id: 'TargetName',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.comment', 'Ghi Chú'),
        id: 'Comment',
        kind: 'Text',
        readonly: true,
        width: 220,
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
