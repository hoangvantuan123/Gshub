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
        title: t('system.userName', 'Tên người dùng *'),
        id: 'UserName',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.userId', 'Tài khoản *'),
        id: 'UserId',
        kind: 'Text',
        readonly: false,
        width: 240,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },

      {
        title: t('system.email', 'Email'),
        id: 'Email',
        kind: 'Text',
        readonly: false,
        width: 240,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.empCode', 'Mã nhân viên'),
        id: 'EmpCode',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.empName', 'Nhân viên'),
        id: 'EmpName',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.deptName', 'Bộ phận làm việc'),
        id: 'DeptName',
        kind: 'Text',
        readonly: false,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.managerName', 'Quản lý'),
        id: 'ManagerName',
        kind: 'Text',
        readonly: false,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.statusAcc', 'Lưu trữ'),
        id: 'StatusAcc',
        kind: 'Boolean',
        readonly: true,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.checkPass1', 'Đổi MK lần đầu'),
        id: 'CheckPass1',
        kind: 'Boolean',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.lastLogin', 'Đăng nhập gần nhất'),
        id: 'LastLoginDate',
        kind: 'Text',
        readonly: true,
        width: 180,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.remark', 'Ghi chú'),
        id: 'Remark',
        kind: 'Text',
        readonly: false,
        width: 220,
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
