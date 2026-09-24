import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const CODE_HELP_COLUMNS_ACTION = []

export const usePermActionColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.idSeq', 'IdSeq (UUIDv7)'),
        id: 'IdSeq',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.actionCode', 'Mã Hành Động / Nút *'),
        id: 'ActionCode',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.actionName', 'Tên Hành Động / Nút *'),
        id: 'ActionName',
        kind: 'Text',
        readonly: false,
        width: 300,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.langKey', 'Mã Key Ngôn Ngữ'),
        id: 'LangKey',
        kind: 'Text',
        readonly: false,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.isDefaultAllow', 'Mặc Định Cho Phép'),
        id: 'IsDefaultAllow',
        kind: 'Boolean',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.comment', 'Ghi Chú / Diễn Giải'),
        id: 'Comment',
        kind: 'Text',
        readonly: false,
        width: 320,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.rowVersion', 'RowVersion'),
        id: 'RowVersion',
        kind: 'Number',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdAt', 'Thời Gian Tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdByName', 'Người Tạo'),
        id: 'CreatedByName',
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedAt', 'Thời Gian Cập Nhật'),
        id: 'UpdatedAt',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedByName', 'Người Cập Nhật'),
        id: 'UpdatedByName',
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: false,
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
