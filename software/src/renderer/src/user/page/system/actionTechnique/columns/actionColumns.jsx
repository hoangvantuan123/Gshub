import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GridCellKind } from '@glideapps/glide-data-grid'

export function useActionColumns({ isFieldVisible, isFieldReadOnly } = {}) {
  const { t } = useTranslation()

  return useMemo(() => {
    const rawCols = [
      {
        id: 'ActionKey',
        title: t('system.actionKey', 'Mã Hành Động (ActionKey)'),
        width: 180,
        kind: GridCellKind.Text,
        readonly: false,
        required: true
      },
      {
        id: 'ActionName',
        title: t('system.actionName', 'Tên Hành Động / Nút Lệnh'),
        width: 220,
        kind: GridCellKind.Text,
        readonly: false,
        required: true
      },
      {
        id: 'Description',
        title: t('system.description', 'Mô Tả Chức Năng'),
        width: 280,
        kind: GridCellKind.Text,
        readonly: false
      },
      {
        id: 'Icon',
        title: t('system.icon', 'Biểu Tượng (Icon)'),
        width: 140,
        kind: GridCellKind.Text,
        readonly: false
      },
      {
        id: 'IdxNo',
        title: t('system.idxNo', 'Thứ Tự (STT)'),
        width: 100,
        kind: GridCellKind.Number,
        readonly: false
      },
      {
        id: 'Active',
        title: t('system.active', 'Kích Hoạt'),
        width: 100,
        kind: GridCellKind.Boolean,
        readonly: false
      },
      {
        id: 'UpdatedBy',
        title: t('system.updatedBy', 'Người Cập Nhật'),
        width: 130,
        kind: GridCellKind.Text,
        readonly: true
      },
      {
        id: 'UpdatedAt',
        title: t('system.updatedAt', 'Ngày Cập Nhật'),
        width: 160,
        kind: GridCellKind.Text,
        readonly: true
      }
    ]

    return rawCols
      .filter((col) => {
        if (typeof isFieldVisible === 'function') {
          return isFieldVisible(col.id) !== false
        }
        return true
      })
      .map((col) => {
        if (typeof isFieldReadOnly === 'function' && isFieldReadOnly(col.id)) {
          return { ...col, readonly: true }
        }
        return col
      })
  }, [t, isFieldVisible, isFieldReadOnly])
}
