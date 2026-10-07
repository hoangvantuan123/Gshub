import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export function useRoleGroupUsersColumns() {
  const { t } = useTranslation()

  return useMemo(
    () => [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        width: 45,
        readonly: true,
        visible: true,
        hasMenu: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
      },
      {
        title: t('system.userId', 'Mã Tài Khoản (UserId) * [F2]'),
        id: 'UserId',
        kind: 'Text',
        width: 190,
        readonly: false,
        visible: true,
        hasMenu: true,
        themeOverride: { textHeader: '#DD1144', textDark: '#1d4ed8', baseFontStyle: 'bold 12px' }
      },
      {
        title: t('system.userName', 'Họ Và Tên'),
        id: 'UserName',
        kind: 'Text',
        width: 240,
        readonly: true,
        visible: true,
        hasMenu: true
      },
      {
        title: t('system.empCode', 'Mã Nhân Viên'),
        id: 'EmpID',
        kind: 'Text',
        width: 130,
        readonly: true,
        visible: true,
        hasMenu: true
      },
      {
        title: t('system.deptName', 'Phòng Ban'),
        id: 'DeptName',
        kind: 'Text',
        width: 180,
        readonly: true,
        visible: true,
        hasMenu: true
      },
      {
        title: t('system.roleGroup', 'Nhóm Quyền'),
        id: 'GroupName',
        kind: 'Text',
        width: 200,
        readonly: true,
        visible: true,
        hasMenu: true
      },
      {
        title: t('system.createdAt', 'Thời Gian Gán'),
        id: 'CreatedAt',
        kind: 'Text',
        width: 170,
        readonly: true,
        visible: false,
        hasMenu: true
      }
    ],
    [t]
  )
}
