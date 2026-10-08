/* eslint-disable react/prop-types */
import HanoiGs1PlanReport from '../../hanoiGs1/plan/components/HanoiGs1PlanReport'
import { useQuevoPlanData } from './hooks/useQuevoPlanData'
import { usePagePermissions } from '@renderer/user/hooks/usePagePermissions'

export default function QuevoGs5PlanPage({ permissions = [] }) {
  // 1. Tích hợp phân quyền hệ thống cho module Kế hoạch sản xuất GS5
  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'report_quevo_gs5_plan'
  })

  // 2. Quản lý dữ liệu riêng biệt cho GS5 Quế Võ
  const {
    loading,
    masterList,
    selectedMasterKey,
    currentMaster,
    planDataset,
    dataSourceType,
    handleSelectMaster,
    handleRefresh
  } = useQuevoPlanData({ pagePerms })

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 w-full overflow-y-auto">
        <HanoiGs1PlanReport
          plantKey="quevo_gs5"
          plantName="Nhà máy GS Quế Võ 1B"
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
