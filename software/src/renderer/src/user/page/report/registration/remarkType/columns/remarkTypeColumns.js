/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GridColumnIcon } from '@glideapps/glide-data-grid'

export function useRemarkTypeColumns({ isFieldVisible, isFieldReadOnly } = {}) {
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
        title: t('Mã phân loại *'),
        id: 'TypeCode',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('Tên phân loại *'),
        id: 'TypeName',
        kind: 'Text',
        readonly: false,
        width: 280,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('Diễn giải'),
        id: 'Description',
        kind: 'Text',
        readonly: false,
        width: 420,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString
      },
      {
        title: t('Đang sử dụng'),
        id: 'IsActive',
        kind: 'Boolean',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('ID'),
        id: 'IdSeq',
        kind: 'Text',
        readonly: true,
        width: 100,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('Người tạo'),
        id: 'CreatedByName',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('Thời gian tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('Người cập nhật'),
        id: 'UpdatedByName',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('Thời gian cập nhật'),
        id: 'UpdatedAt',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('Phiên bản dòng'),
        id: 'RowVersion',
        kind: 'Number',
        readonly: true,
        width: 100,
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
