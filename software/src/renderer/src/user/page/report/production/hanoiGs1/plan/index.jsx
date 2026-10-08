/* eslint-disable react/prop-types */
import HanoiGs1PlanReport from './components/HanoiGs1PlanReport'
import { useHanoiPlanData } from './hooks/useHanoiPlanData'
import { usePagePermissions } from '@renderer/user/hooks/usePagePermissions'

export default function HanoiGs1PlanPage({ permissions = [] }) {
  // 1. Tích hợp phân quyền hệ thống cho module Kế hoạch sản xuất GS1
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_hanoi_gs1_plan'
  })

  // 2. Quản lý dữ liệu riêng biệt cho GS1 Hà Nội
  const {
    loading,
    masterList,
    selectedMasterKey,
    currentMaster,
    planDataset,
    dataSourceType,
    handleSelectMaster,
    handleRefresh
  } = useHanoiPlanData({ pagePerms })

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 w-full overflow-y-auto">
        <HanoiGs1PlanReport
          plantKey="hanoi_gs1"
          plantName="Nhà máy GS1 Hà Nội"
          dataset={planDataset}
          initialData={planDataset}
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
