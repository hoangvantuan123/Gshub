/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Select, Tooltip, message } from 'antd'
import { BarChart3, Calendar, Copy, LogIn, Globe, Building2, Check } from 'lucide-react'
import ProductionStatisticsReport from '../production/hanoiGs1/stat/components/ProductionStatisticsReport'
import {
  initialHanoiGs1Stats,
  initialHanoiGs1Plans,
  initialQuevoGs5Stats,
  initialQuevoGs5Plans
} from '../common/reportUtils'

export default function PublicReportViewer() {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  // Đọc tham số từ URL hoặc route params
  const paramPlant = params['*'] || params.plantKey || searchParams.get('plant') || 'hanoi-gs1'
  const paramTab = searchParams.get('type') || (paramPlant.includes('plan') ? 'plan' : 'stat')

  const [selectedPlant, setSelectedPlant] = useState(() => {
    if (paramPlant.includes('quevo') || paramPlant.includes('gs5')) return 'quevo_gs5'
    return 'hanoi_gs1'
  })

  const [activeTab, setActiveTab] = useState(() => {
    return paramTab === 'plan' ? 'plan' : 'stat'
  })

  const plantInfo = useMemo(() => {
    if (selectedPlant === 'quevo_gs5') {
      return {
        key: 'quevo_gs5',
        name: 'GS5 Quế Võ 1B - Carton & Sóng',
        initialData: activeTab === 'stat' ? initialQuevoGs5Stats : initialQuevoGs5Plans
      }
    }
    return {
      key: 'hanoi_gs1',
      name: 'GS1 Hà Nội - Bao bì Cao cấp',
      initialData: activeTab === 'stat' ? initialHanoiGs1Stats : initialHanoiGs1Plans
    }
  }, [selectedPlant, activeTab])

  const handleCopyLink = () => {
    const fullUrl = window.location.href
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      message.success('Đã sao chép đường link báo cáo công khai!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleGoToLogin = () => {
    navigate('/erp/u/login')
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Public Top Navbar */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              GS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 tracking-tight">
                  GOLDSUN PACKAGING
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" /> PUBLIC BI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none">
                Hệ thống báo cáo sản xuất công khai & thời gian thực
              </p>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Plant Selector */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <Select
              size="small"
              value={selectedPlant}
              onChange={setSelectedPlant}
              className="w-48 text-xs font-medium"
              options={[
                { value: 'hanoi_gs1', label: '🏭 GS1 Hà Nội (Bao bì cao cấp)' },
                { value: 'quevo_gs5', label: '🏭 GS5 Quế Võ (Carton & Sóng)' }
              ]}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Switcher: Thống kê vs Kế hoạch */}
          <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => setActiveTab('stat')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeTab === 'stat'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Thống kê SX</span>
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeTab === 'plan'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Kế hoạch SX</span>
            </button>
          </div>

          <Tooltip title="Sao chép liên kết chia sẻ công khai">
            <Button
              size="small"
              icon={
                copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              onClick={handleCopyLink}
              className="text-xs font-medium"
            >
              {copied ? 'Đã chép' : 'Sao chép link'}
            </Button>
          </Tooltip>

          <Button
            type="primary"
            size="small"
            icon={<LogIn className="w-3.5 h-3.5" />}
            onClick={handleGoToLogin}
            className="bg-[#2B3A42] hover:!bg-[#1F2B32] text-xs font-semibold"
          >
            Đăng nhập ERP
          </Button>
        </div>
      </header>

      {/* Main Report Container */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
        <ProductionStatisticsReport
          plantKey={plantInfo.key}
          plantName={plantInfo.name}
          initialData={plantInfo.initialData}
          activeMainTab={activeTab}
          onMainTabChange={setActiveTab}
        />
      </main>
    </div>
  )
}
