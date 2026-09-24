import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const CODE_HELP_COLUMNS_ATTR_VALUE = ['GroupCode']

export const useSysAttrValueColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.attrGroupSeq', 'AttrGroupSeq'),
        id: 'AttrGroupSeq',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.groupCode', 'Mã Nhóm *'),
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
        title: t('system.groupName', 'Tên Nhóm'),
        id: 'GroupName',
        kind: 'Text',
        readonly: true,
        width: 260,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { bgCell: '#f8fafc', textDark: '#64748b' }
      },
      {
        title: t('system.attrValueCode', 'Mã Giá Trị Thuộc Tính *'),
        id: 'AttrValueCode',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.attrValueName', 'Tên Giá Trị Hiển Thị *'),
        id: 'AttrValueName',
        kind: 'Text',
        readonly: false,
        width: 280,
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
        title: t('system.extraValue', 'Giá Trị / SQL Template'),
        id: 'ExtraValue',
        kind: 'Text',
        readonly: false,
        width: 240,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.isActive', 'Kích Hoạt (Active)'),
        id: 'IsActive',
        kind: 'Boolean',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.comment', 'Ghi Chú / Diễn Giải'),
        id: 'Comment',
        kind: 'Text',
        readonly: false,
        width: 300,
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
