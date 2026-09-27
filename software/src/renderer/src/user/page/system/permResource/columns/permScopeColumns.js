import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const CODE_HELP_COLUMNS_SCOPE = ['OperationCode', 'DefaultScopeLevel', 'RuleCondition']

export const usePermScopeColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
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
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 13px' }
      },
      {
        title: t('system.idSeq', 'IdSeq (UUIDv7)'),
        id: 'IdSeq',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.scopeCode', 'Mã Quy Tắc Phạm Vi *'),
        id: 'ScopeCode',
        kind: 'Text',
        readonly: false,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.scopeName', 'Tên Quy Tắc Phạm Vi *'),
        id: 'ScopeName',
        kind: 'Text',
        readonly: false,
        width: 280,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { textHeader: '#DD1144', bgIconHeader: '#DD1144', fontFamily: '' }
      },
      {
        title: t('system.operationCode', 'Mã Thao Tác'),
        id: 'OperationCode',
        kind: 'Text',
        readonly: false,
        width: 140,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.operationName', 'Tên Thao Tác Nghiệp Vụ'),
        id: 'OperationName',
        kind: 'Text',
        readonly: true,
        width: 200,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { bgCell: '#f8fafc', textDark: '#64748b' }
      },
      {
        title: t('system.langKey', 'Mã Key Ngôn Ngữ'),
        id: 'LangKey',
        kind: 'Text',
        readonly: false,
        width: 170,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.defaultScopeLevel', 'Mã Cấp Phạm Vi'),
        id: 'DefaultScopeLevel',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.defaultScopeLevelLabel', 'Cấp Phạm Vi Dữ Liệu'),
        id: 'DefaultScopeLevelLabel',
        kind: 'Text',
        readonly: true,
        width: 190,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { bgCell: '#f8fafc', textDark: '#64748b' }
      },
      {
        title: t('system.ruleCondition', 'Mã Điều Kiện Phiếu'),
        id: 'RuleCondition',
        kind: 'Text',
        readonly: false,
        width: 150,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.ruleConditionLabel', 'Điều Kiện Trạng Thái Phiếu'),
        id: 'RuleConditionLabel',
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true },
        themeOverride: { bgCell: '#f8fafc', textDark: '#64748b' }
      },
      {
        title: t('system.orderNo', 'Thứ Tự / STT'),
        id: 'OrderNo',
        kind: 'Number',
        readonly: false,
        width: 100,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.comment', 'Mô Tả Quy Tắc Nghiệp Vụ'),
        id: 'Comment',
        kind: 'Text',
        readonly: false,
        width: 320,
        hasMenu: true,
        visible: true,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.rowVersion', 'RowVersion'),
        id: 'RowVersion',
        kind: 'Number',
        readonly: true,
        width: 90,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdAt', 'Thời Gian Tạo'),
        id: 'CreatedAt',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.createdByName', 'Người Tạo'),
        id: 'CreatedByName',
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedAt', 'Thời Gian Cập Nhật'),
        id: 'UpdatedAt',
        kind: 'Text',
        readonly: true,
        width: 150,
        hasMenu: true,
        visible: false,
        trailingRowOptions: { disabled: true }
      },
      {
        title: t('system.updatedByName', 'Người Cập Nhật'),
        id: 'UpdatedByName',
        kind: 'Text',
        readonly: true,
        width: 130,
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
