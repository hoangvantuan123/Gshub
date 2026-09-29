import { useNavigate } from 'react-router-dom'
import ProductionStatisticsReport from '../../components/ProductionStatisticsReport'
import { initialQuevoGs5Stats } from '../../../common/reportUtils'

export default function QuevoGs5StatPage() {
  const navigate = useNavigate()

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50/60">
      <ProductionStatisticsReport
        plantKey="quevo_gs5"
        plantName="GS5 Quế Võ - Bao bì Carton Sóng"
        initialData={initialQuevoGs5Stats}
        activeMainTab="stat"
        onMainTabChange={(tab) => {
          if (tab === 'plan') {
            navigate('/erp/u/report/production/que-vo-gs5/plan')
          }
        }}
      />
    </div>
  )
}
