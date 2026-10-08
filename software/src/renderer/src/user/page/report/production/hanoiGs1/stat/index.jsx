/* eslint-disable react/prop-types */
import ProductionStatisticsReport from './components/ProductionStatisticsReport'
import { useHanoiStatData } from './hooks/useHanoiStatData'
import { usePagePermissions } from '@renderer/user/hooks/usePagePermissions'

export default function HanoiGs1StatPage({ permissions = [] }) {
  // 1. Tích hợp phân quyền hệ thống cho module Thống kê sản xuất GS1
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_hanoi_gs1_stat'
  })

  // 2. Quản lý dữ liệu riêng biệt cho GS1 Hà Nội
  const {
    loading,
    masterList,
    selectedMasterKey,
    currentMaster,
    statDataset,
    dataSourceType,
    handleSelectMaster,
    handleRefresh
  } = useHanoiStatData({ pagePerms })

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f0fdf4]/50">
      <div className="flex-1 w-full overflow-y-auto">
        <ProductionStatisticsReport
          plantKey="hanoi_gs1"
          plantName="Nhà máy GS Hà Nội"
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
