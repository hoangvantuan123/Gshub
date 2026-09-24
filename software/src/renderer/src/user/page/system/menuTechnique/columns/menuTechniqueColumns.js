import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useMenuTechniqueColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.type', 'Loại Menu *'),
        id: 'Type',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.orderSeq', 'STT'),
        id: 'OrderSeq',
        kind: 'Number',
        readonly: false,
        width: 90,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.moduleLevel1', 'Module (Cấp 1)'),
        id: 'MenuRootName',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.submenuLevel2', 'Submenu (Cấp 2)'),
        id: 'MenuSubRootName',
        kind: 'Text',
        readonly: false,
        width: 240,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.key', 'Mã Key *'),
        id: 'Key',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.label', 'Tên Menu *'),
        id: 'Label',
        kind: 'Text',
        readonly: false,
        width: 250,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.link', 'Đường dẫn (Link)'),
        id: 'Link',
        kind: 'Text',
        readonly: false,
        width: 280,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.dictSeq', 'Mã từ điển'),
        id: 'DictSeq',
        kind: 'Text',
        readonly: false,
        width: 110,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdBy', 'Người tạo'),
        id: 'CreatedByName',
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
        id: 'UpdatedByName',
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
