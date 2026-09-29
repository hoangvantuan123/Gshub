import { useNavigate } from 'react-router-dom'
import ProductionStatisticsReport from '../../components/ProductionStatisticsReport'
import { initialHanoiGs1Stats } from '../../../common/reportUtils'

export default function HanoiGs1StatPage() {
  const navigate = useNavigate()

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50/60">
      <ProductionStatisticsReport
        plantKey="hanoi_gs1"
        plantName="GS1 Hà Nội - Bao bì Cao cấp"
        initialData={initialHanoiGs1Stats}
        activeMainTab="stat"
        onMainTabChange={(tab) => {
          if (tab === 'plan') {
            navigate('/erp/u/report/production/hanoi-gs1/plan')
          }
        }}
      />
    </div>
  )
}
