/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function MenuQueryFilters({
  searchValues = {},
  setSearchValues,
  rootMenuOptions = [],
  handleSearchData,
  disabled = false
}) {
  const { t } = useTranslation()

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'Keyword',
        label: t('system.menu.keyword', 'Từ khóa tìm kiếm'),
        type: 'text',
        placeholder: 'Tên Menu, Mã Key, Link route...'
      },
      {
        key: 'MenuRootId',
        label: t('system.menu.rootModule', 'Root Module (Cấp 1)'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả Root Module' },
          ...rootMenuOptions.map((r) => {
            const id = r.RootMenuId || r.Id
            const label = r.RootMenuName || r.RootMenuLabel || r.Label || id
            return { value: id, label: `${label} (${id})` }
          })
        ]
      },
      {
        key: 'MenuType',
        label: t('system.menu.type', 'Loại Menu'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả loại menu' },
          { value: 'root', label: 'Root Module (Cấp 1)' },
          { value: 'submenu', label: 'Submenu (Nhóm)' },
          { value: 'menu', label: 'Menu chức năng (Liên kết trang)' }
        ]
      },
      {
        key: 'ViewStatus',
        label: t('system.menu.viewStatus', 'Trạng thái hiển thị'),
        type: 'select',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: '1', label: 'Đang hiển thị' },
          { value: '0', label: 'Đã ẩn' }
        ]
      }
    ],
    [t, rootMenuOptions]
  )

  const handleChange = (fieldKey, value) => {
    setSearchValues((prev) => ({
      ...prev,
      [fieldKey]: value
    }))
  }

  return (
    <div className="bg-white border-b border-slate-200 px-2 py-1.5">
      <DynamicQueryBar
        fields={allAvailableFields}
        allAvailableFields={allAvailableFields}
        values={searchValues}
        onChange={handleChange}
        onSearch={handleSearchData}
        disabled={disabled}
        columns={4}
        showSettings={false}
      />
    </div>
  )
}
