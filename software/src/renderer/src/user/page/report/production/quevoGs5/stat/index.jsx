/* eslint-disable react/prop-types */
import ProductionStatisticsReport from './components/ProductionStatisticsReport'
import { useQuevoStatData } from './hooks/useQuevoStatData'
import { usePagePermissions } from '@renderer/user/hooks/usePagePermissions'

export default function QuevoGs5StatPage({ permissions = [] }) {
  // 1. Tích hợp phân quyền hệ thống cho module Thống kê sản xuất GS5
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_quevo_gs5_stat'
  })

  // 2. Quản lý dữ liệu riêng biệt cho GS5 Quế Võ
  const {
    loading,
    masterList,
    selectedMasterKey,
    currentMaster,
    statDataset,
    dataSourceType,
    handleSelectMaster,
    handleRefresh
  } = useQuevoStatData({ pagePerms })

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f0fdf4]/50">
      <div className="flex-1 w-full overflow-y-auto">
        <ProductionStatisticsReport
          plantKey="quevo_gs5"
          plantName="Nhà máy GS Quế Võ 1B"
          dataset={statDataset}
          initialData={statDataset}
          masterList={masterList}
          selectedMasterKey={selectedMasterKey}
          onSelectMaster={handleSelectMaster}
          onRefreshMaster={handleRefresh}
          currentMaster={currentMaster}
          dataSourceType={dataSourceType}
          loadingMaster={loading}
          permissions={pagePerms}
        />
      </div>
    </div>
  )
}
