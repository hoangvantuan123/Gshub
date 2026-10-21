/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function RemarkTypeQuery({
  filters,
  setFilters,
  handleSearchData,
  disabled = false
}) {
  const fields = useMemo(
    () => [
      { key: 'Keyword', label: 'Từ khóa', type: 'text', placeholder: 'Mã, tên hoặc diễn giải' },
      {
        key: 'IsActive',
        label: 'Trạng thái',
        type: 'select',
        options: [
          { value: '', label: 'Tất cả' },
          { value: 'true', label: 'Đang sử dụng' },
          { value: 'false', label: 'Ngừng sử dụng' }
        ]
      }
    ],
    []
  )

  return (
    <DynamicQueryBar
      fields={fields}
      values={filters}
      onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      onSearch={handleSearchData}
      onReset={() => setFilters({ Keyword: '', IsActive: '' })}
      disabled={disabled}
      storageKey="q_report_prod_stats_remark_type"
    />
  )
}
