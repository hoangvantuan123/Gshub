/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useRoleDataScopeColumns = () => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true
      },

      {
        title: t('system.id', 'ID'),
        id: 'Id',
        kind: 'Text',
        readonly: true,
        width: 70,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.scopeCode', 'Mã Quy Tắc Phạm Vi'),
        id: 'ScopeCode',
        kind: 'Text',
        readonly: true,
        width: 190,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.scopeName', 'Tên Quy Tắc Phạm Vi'),
        id: 'ScopeName',
        kind: 'Text',
        readonly: true,
        width: 250,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.operationName', 'Thao Tác Nghiệp Vụ'),
        id: 'OperationName',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.allow', 'Cho Phép (Allow)'),
        id: 'Allow',
        kind: 'Boolean',
        readonly: false,
        width: 120,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.dataScopeLabel', 'Cấp Phạm Vi Dữ Liệu'),
        id: 'DataScopeLabel',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.ruleConditionLabel', 'Điều Kiện Trạng Thái Phiếu'),
        id: 'RuleConditionLabel',
        kind: 'Text',
        readonly: true,
        width: 230,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.comment', 'Mô Tả Quy Tắc Nghiệp Vụ'),
        id: 'Comment',
        kind: 'Text',
        readonly: true,
        width: 280,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      }
    ]

    return cols
  }, [t])
}
