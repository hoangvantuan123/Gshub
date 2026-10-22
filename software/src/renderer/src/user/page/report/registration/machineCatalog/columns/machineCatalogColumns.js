/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GridColumnIcon } from '@glideapps/glide-data-grid'

export function useMachineCatalogColumns({ isFieldVisible, isFieldReadOnly } = {}) {
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
        title: t('Mã máy *'),
        id: 'MachineCode',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('Tên máy móc *'),
        id: 'MachineName',
        kind: 'Text',
        readonly: false,
        width: 260,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString,
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144' }
      },
      {
        title: t('Mã Tổ'),
        id: 'TeamCode',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString
      },
      {
        title: t('Tên tổ'),
        id: 'TeamName',
        kind: 'Text',
        readonly: false,
        width: 260,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString
      },
      {
        title: t('Nhà máy'),
        id: 'Factory',
        kind: 'Text',
        readonly: false,
        width: 160,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        icon: GridColumnIcon.HeaderString
      },
      {
        title: t('Diễn giải / Ghi chú'),
        id: 'Description',
        kind: 'Text',
        readonly: false,
        width: 300,
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
