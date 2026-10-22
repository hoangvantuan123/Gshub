/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import DynamicQueryBar from '../../../../../components/query/core/DynamicQueryBar'

export default function ProdMachineQuery({ filters, setFilters, handleSearchData, disabled = false }) {
  const fields = useMemo(
    () => [
      {
        key: 'TKSXRegCode',
        label: 'Mã báo cáo TKSX',
        type: 'text',
        placeholder: 'Nhập mã báo cáo TKSX để nạp phiếu hoặc truy vấn đã đăng ký'
      },
      {
        key: 'StatSlipNo',
        label: 'Phiếu thống kê',
        type: 'text',
        placeholder: 'Lọc theo số phiếu thống kê'
      }
    ],
    []
  )

  return (
    <DynamicQueryBar
      fields={fields}
      values={filters}
      onChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))}
      onSearch={handleSearchData}
      onReset={() => setFilters({ TKSXRegCode: '', StatSlipNo: '' })}
      disabled={disabled}
      storageKey="q_report_prod_machine_registration"
    />
  )
}
