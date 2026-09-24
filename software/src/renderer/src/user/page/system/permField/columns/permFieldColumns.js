import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const CODE_HELP_COLUMNS_FIELD = ['ResourceCode']

export const usePermFieldColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.resourceSeq', 'ResourceSeq'),
        id: 'ResourceSeq',
        kind: 'Text',
        readonly: true,
        width: 120,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.resourceCode', 'Mã Chức Năng *'),
        id: 'ResourceCode',
        kind: 'Text',
        readonly: false,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.resourceName', 'Tên Chức Năng / Menu'),
        id: 'ResourceName',
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.fieldCode', 'Mã Trường Dữ Liệu *'),
        id: 'FieldCode',
        kind: 'Text',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.fieldName', 'Tên Trường Dữ Liệu *'),
        id: 'FieldName',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.dictSeq', 'Mã Từ Điển'),
        id: 'DictSeq',
        kind: 'Number',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
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
        title: t('system.isMaskable', 'Cho Phép Ẩn (***)'),
        id: 'IsMaskable',
        kind: 'Boolean',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.isSensitive', 'Dữ Liệu Nhạy Cảm'),
        id: 'IsSensitive',
        kind: 'Boolean',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.orderNo', 'Thứ Tự'),
        id: 'OrderNo',
        kind: 'Number',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.comment', 'Ghi Chú / Diễn Giải'),
        id: 'Comment',
        kind: 'Text',
        readonly: false,
        width: 250,
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
