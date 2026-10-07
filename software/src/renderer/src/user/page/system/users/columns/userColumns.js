import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useUserColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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

      // ── Thông tin tài khoản
      {
        title: t('system.user.userId', 'Mã người dùng'),
        id: 'UserId',
        group: 'Thông tin tài khoản',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#2563eb', baseFontStyle: '600 12px' }
      },
      {
        title: t('system.user.userName', 'Họ và tên'),
        id: 'UserName',
        group: 'Thông tin tài khoản',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
      },

      // ── Tổ chức & Vai trò
      {
        title: t('system.user.department', 'Phòng ban / Bộ phận'),
        id: 'Department',
        group: 'Tổ chức & Vai trò',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.user.roleNames', 'Nhóm quyền / Vai trò'),
        id: 'RoleNames',
        group: 'Tổ chức & Vai trò',
        kind: 'Text',
        readonly: true,
        width: 230,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#7c3aed', baseFontStyle: '600 12px' }
      },

      // ── Liên hệ
      {
        title: t('system.user.email', 'Địa chỉ Email'),
        id: 'Email',
        group: 'Liên hệ',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.user.phone', 'Số điện thoại'),
        id: 'Phone',
        group: 'Liên hệ',
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true
      },

      // ── Trạng thái & Hệ thống
      {
        title: t('system.user.statusAcc', 'Trạng thái tài khoản'),
        id: 'StatusAccName',
        group: 'Trạng thái & Hệ thống',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true,
        themeOverride: { baseFontStyle: 'bold 11px' }
      },
      {
        title: t('system.user.language', 'Ngôn ngữ'),
        id: 'Language',
        group: 'Trạng thái & Hệ thống',
        kind: 'Text',
        readonly: true,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.user.lastLogin', 'Đăng nhập gần nhất'),
        id: 'LastLogin',
        group: 'Trạng thái & Hệ thống',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.user.createdAt', 'Ngày tạo tài khoản'),
        id: 'CreatedAt',
        group: 'Trạng thái & Hệ thống',
        kind: 'Text',
        readonly: true,
        width: 150,
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
