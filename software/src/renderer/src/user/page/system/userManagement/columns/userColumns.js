/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useUserColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        title: t('system.userId', 'Tài khoản (UserId) *'),
        id: 'UserId',
        kind: 'Text',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true,
        themeOverride: { textHeader: '#DD1144', textDark: '#1d4ed8', baseFontStyle: 'bold 12px' }
      },
      {
        title: t('system.userName', 'Tên người dùng / Họ tên *'),
        id: 'UserName',
        kind: 'Text',
        readonly: false,
        width: 230,
        hasMenu: true,
        visible: true,
        themeOverride: { textHeader: '#DD1144' }
      },
      {
        title: t('system.roleGroup', 'Nhóm quyền hệ thống [F2]'),
        id: 'GroupName',
        kind: 'Text',
        readonly: false,
        width: 210,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.empCode', 'Mã nhân viên [F2]'),
        id: 'EmpCode',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.empName', 'Tên nhân viên'),
        id: 'EmpName',
        kind: 'Text',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.deptName', 'Phòng ban / Bộ phận [F2]'),
        id: 'DeptName',
        kind: 'Text',
        readonly: false,
        width: 190,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.email', 'Email'),
        id: 'Email',
        kind: 'Text',
        readonly: false,
        width: 210,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.statusAcc', 'Khóa tài khoản'),
        id: 'StatusAcc',
        kind: 'Boolean',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.remark', 'Ghi chú'),
        id: 'Remark',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.lastLogin', 'Đăng nhập gần nhất'),
        id: 'LastLoginDate',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: false
      },
      {
        title: t('system.createdAt', 'Thời gian tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 160,
        hasMenu: true,
        visible: false
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
