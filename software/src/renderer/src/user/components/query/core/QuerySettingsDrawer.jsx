import { memo } from 'react'
import { Drawer, Checkbox, Button } from 'antd'
import { Filter, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * QuerySettingsDrawer - Drawer cài đặt ẩn/hiện điều kiện tìm kiếm và nút Đặt lại mặc định
 */
const QuerySettingsDrawer = memo(function QuerySettingsDrawer({
  isOpen,
  onClose,
  fieldsList = [],
  visibleKeys = new Set(),
  onToggleField,
  onResetFields
}) {
  const { t } = useTranslation()

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full text-xs font-bold uppercase text-slate-700">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('CÀI ĐẶT ĐIỀU KIỆN')}</span>
          </span>
        </div>
      }
      styles={{ body: { padding: '12px 16px' } }}
      onClose={onClose}
      open={isOpen}
      width={300}
      footer={
        <div className="flex items-center justify-between px-1 py-0.5">
          <Button
            size="small"
            icon={<RotateCcw className="w-3 h-3" />}
            onClick={() => {
              if (onResetFields) onResetFields()
            }}
            className="text-xs"
          >
            {t('Mặc định')}
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs"
          >
            {t('Đóng')}
          </Button>
        </div>
      }
    >
      <div className="space-y-1.5">
        {fieldsList.map((f) => {
          const isChecked = visibleKeys.has(f.key)
          return (
            <div
              key={f.key}
              className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-50 border border-slate-100 transition-colors"
            >
              <Checkbox
                checked={isChecked}
                onChange={(e) => {
                  if (onToggleField) {
                    onToggleField(f.key, e.target.checked, f)
                  }
                }}
              >
                <span className="text-xs font-medium text-slate-700">{t(f.label || f.key)}</span>
              </Checkbox>
              <span className="text-[10px] text-slate-400 font-mono">{f.key}</span>
            </div>
          )
        })}
      </div>
    </Drawer>
  )
})

export default QuerySettingsDrawer
