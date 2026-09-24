import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GridColumnIcon } from '@glideapps/glide-data-grid'

export const useTblGrpPermCols = () => {
  const { t } = useTranslation()

  const defaultCols = useMemo(
    () => [
      {
        title: '',
        id: 'Status',
        kind: 'Text',
        readonly: true,
        width: 50,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' },
        icon: GridColumnIcon.HeaderLookup
      },
      {
        title: t('system.tblGrpPermName', 'Nhóm quyền'),
        id: 'TblGrpPermName',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      }
    ],
    [t]
  )

  const defaultColsB = useMemo(
    () => [
      {
        title: '',
        id: 'Status',
        kind: 'Text',
        readonly: true,
        width: 50,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' },
        icon: GridColumnIcon.HeaderLookup
      },
      {
        title: t('system.tblGrpCode', 'Khóa bảng'),
        id: 'TblGrpCode',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      }
    ],
    [t]
  )

  const defaultColsC = useMemo(
    () => [
      {
        title: '',
        id: 'Status',
        kind: 'Text',
        readonly: true,
        width: 50,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' },
        icon: GridColumnIcon.HeaderLookup
      },
      {
        title: t('system.tblGrpItemCode', 'Khóa cột'),
        id: 'TblGrpItemCode',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.view', 'View'),
        id: 'View',
        kind: 'Text',
        readonly: false,
        width: 60,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.edit', 'Edit'),
        id: 'Edit',
        kind: 'Text',
        readonly: false,
        width: 60,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      }
    ],
    [t]
  )

  const defaultColsD = useMemo(
    () => [
      {
        title: '',
        id: 'Status',
        kind: 'Text',
        readonly: true,
        width: 50,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' },
        icon: GridColumnIcon.HeaderLookup
      },
      {
        title: t('system.userId', 'Tài khoản'),
        id: 'UserId',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.userName', 'Người dùng'),
        id: 'UserName',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      }
    ],
    [t]
  )

  return { defaultCols, defaultColsB, defaultColsC, defaultColsD }
}
