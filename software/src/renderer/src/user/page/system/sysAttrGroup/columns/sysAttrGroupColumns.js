import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const CODE_HELP_COLUMNS_ATTR_GROUP = []

export const useSysAttrGroupColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.groupCode', 'Mã Nhóm Thuộc Tính *'),
        id: 'GroupCode',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.groupName', 'Tên Nhóm Thuộc Tính *'),
        id: 'GroupName',
        kind: 'Text',
        readonly: false,
        width: 320,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.codeHelp', 'Mã CodeHelp *'),
        id: 'CodeHelp',
        kind: 'Number',
        readonly: false,
        width: 130,
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
        width: 180,
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
