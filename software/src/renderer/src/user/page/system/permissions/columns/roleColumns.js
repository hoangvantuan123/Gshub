import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useRoleColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      // ── Cột trạng thái hệ thống
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 12px' }
      },

      // ── Nhóm quyền
      {
        title: t('system.permission.roleId', 'Mã nhóm quyền'),
        id: 'RoleId',
        group: 'Thông tin vai trò',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#7c3aed', baseFontStyle: 'bold 12px' }
      },
      {
        title: t('system.permission.roleName', 'Tên nhóm quyền / Vai trò'),
        id: 'RoleName',
        group: 'Thông tin vai trò',
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
      },
      {
        title: t('system.permission.memberCount', 'Số lượng thành viên'),
        id: 'MemberCount',
        group: 'Thông tin vai trò',
        kind: 'Number',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#2563eb', baseFontStyle: 'bold 12px' }
      },
      {
        title: t('system.permission.comment', 'Mô tả nhiệm vụ & Quyền hạn'),
        id: 'Comment',
        group: 'Thông tin vai trò',
        kind: 'Text',
        readonly: true,
        width: 320,
        hasMenu: true,
        visible: true
      }
    ]

    return cols.map((col) => {
      let isVis = col.visible !== false
      let isRO = Boolean(col.readonly)

      if (typeof isFieldVisible === 'function') {
        isVis = isFieldVisible(col.id, isVis)
      }
      if (typeof isFieldReadOnly === 'function') {
        isRO = isFieldReadOnly(col.id, isRO)
      }

      return {
        ...col,
        visible: isVis,
        readonly: isRO
      }
    })
  }, [t, isFieldVisible, isFieldReadOnly])
}
