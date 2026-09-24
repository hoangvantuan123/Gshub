import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useLangSysColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.languageCode', 'Mã ngôn ngữ *'),
        id: 'LanguageCode',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('system.languageName', 'Tên ngôn ngữ *'),
        id: 'LanguageName',
        kind: 'Text',
        readonly: false,
        width: 260,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('system.remark', 'Ghi chú'),
        id: 'Remark',
        kind: 'Text',
        readonly: false,
        width: 300,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.languageSeq', 'Mã ID'),
        id: 'LanguageSeq',
        kind: 'Text',
        readonly: true,
        width: 120,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdBy', 'Người tạo'),
        id: 'CreatedBy',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdAt', 'Thời gian tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 180,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedBy', 'Người cập nhật'),
        id: 'UpdatedBy',
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
        width: 180,
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
