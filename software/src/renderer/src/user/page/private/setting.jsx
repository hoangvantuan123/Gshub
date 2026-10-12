import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { User, HardDrive, Layers, Sliders, Trash2, Cpu, RefreshCw } from 'lucide-react'

import storageAdapter from '../report/production/calcProduction/storage'
import { getMemoryCacheStats, clearReportCache } from '../report/common/reportDataCache'
import { showToast, ToastContainer } from './toast'

import AccountTab from './account'
import OverviewTab from './overview'
import DatasetsTab from './datasets'
import PreferencesTab from './preferences'
import AdvancedTab from './advanced'
import SystemTab from './system'

export const TAB_CATEGORIES = [
  {
    category: 'TÀI KHOẢN & NGƯỜI DÙNG',
    items: [
      {
        id: 'account',
        name: 'Tài khoản & Hồ sơ',
        icon: User,
        desc: 'Thông tin tài khoản & hồ sơ nhân sự'
      }
    ]
  },
  {
    category: 'DỮ LIỆU & BỘ NHỚ',
    items: [
      {
        id: 'overview',
        name: 'Tổng quan dung lượng',
        icon: HardDrive,
        desc: 'Dung lượng dữ liệu & bộ nhớ máy'
      },
      {
        id: 'datasets',
        name: 'Báo cáo đã lưu',
        icon: Layers,
        desc: 'Chi tiết các báo cáo lưu ngoại tuyến trên máy',
        showCount: true
      }
    ]
  },
  {
    category: 'TÙY CHỈNH & GIAO DIỆN',
    items: [
      {
        id: 'preferences',
        name: 'Tùy chỉnh hiển thị',
        icon: Sliders,
        desc: 'Ngôn ngữ, chủ đề & định dạng hiển thị'
      }
    ]
  },
  {
    category: 'BẢO TRÌ & THÔNG TIN',
    items: [
      {
        id: 'advanced',
        name: 'Vùng an toàn & Dọn dẹp',
        icon: Trash2,
        desc: 'Dọn dẹp dữ liệu & tối ưu hóa'
      },
      {
        id: 'system',
        name: 'Thông tin phần mềm',
        icon: Cpu,
        desc: 'Phiên bản GsHub & thiết bị'
      }
    ]
  }
]

export default function SettingPrivate() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')

  // Map URL tabs accurately to avoid snapping back to account
  const resolveInitialTab = (tab) => {
    if (!tab) return 'account'
    if (tab === 'overview' || tab === 'cache' || tab === 'storage') return 'overview'
    if (tab === 'datasets' || tab === 'reports') return 'datasets'
    if (tab === 'profile' || tab === 'account') return 'account'
    if (tab === 'preferences') return 'preferences'
    if (tab === 'advanced') return 'advanced'
    if (tab === 'system') return 'system'
    return tab
  }

  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(rawTab))
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [storageStats, setStorageStats] = useState(null)
  const [ramStats, setRamStats] = useState(null)
  const [localMasters, setLocalMasters] = useState([])

  useEffect(() => {
    if (rawTab) {
      const resolved = resolveInitialTab(rawTab)
      if (resolved !== activeTab) {
        setActiveTab(resolved)
      }
    }
  }, [rawTab, activeTab])

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  // Tải thống kê dung lượng và danh sách báo cáo
  const loadAllStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const ram = getMemoryCacheStats()
      setRamStats(ram)

      const stats = await storageAdapter.getStorageStats()
      setStorageStats(stats)

      const masters = await storageAdapter.getAllMasterRegistrations()
      setLocalMasters(Array.isArray(masters) ? masters : [])
    } catch (err) {
      console.error('[SettingPrivate] Lỗi đọc thông tin bộ nhớ:', err)
      if (!isSilent) {
        showToast('Không thể nạp dữ liệu thống kê bộ nhớ', 'error')
      }
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllStats()
  }, [loadAllStats])

  // Giải phóng bộ nhớ tạm
  const handleClearRam = () => {
    try {
      storageAdapter.clearMemoryCache()
      const ram = getMemoryCacheStats()
      setRamStats(ram)
      showToast('Đã làm mới bộ nhớ tạm thời thành công.')
    } catch (err) {
      showToast('Lỗi khi làm mới bộ nhớ: ' + err?.message, 'error')
    }
  }

  // Tối ưu hóa dung lượng ổ đĩa
  const handleVacuumAndClean = async () => {
    setActionLoading(true)
    try {
      await storageAdapter.cleanCache()
      await storageAdapter.vacuumDb()
      await loadAllStats(true)
      showToast('Đã tối ưu hóa dung lượng lưu trữ trên máy thành công.')
    } catch (err) {
      showToast('Lỗi khi tối ưu hóa dung lượng: ' + err?.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Xóa bản lưu của 1 báo cáo
  const handleDeleteMaster = async (regCode) => {
    if (!regCode) return
    setActionLoading(true)
    try {
      await storageAdapter.deleteMasterRegistration(regCode)
      clearReportCache(regCode)
      showToast(`Đã xóa bản lưu của báo cáo [${regCode}] trên máy tính.`)
      await loadAllStats(true)
    } catch (err) {
      showToast(`Không thể xóa bản lưu [${regCode}]: ` + err?.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Xóa toàn bộ dữ liệu lưu trữ
  const handleClearAllCache = async (preserveMasters = true) => {
    setActionLoading(true)
    try {
      await storageAdapter.clearAllCalcCache({ preserveMasters })
      await loadAllStats(true)
      if (preserveMasters) {
        showToast(
          'Đã giải phóng các tệp chi tiết trên máy. Danh sách báo cáo vẫn được lưu lại an toàn.'
        )
      } else {
        showToast('Đã xóa toàn bộ dữ liệu lưu ngoại tuyến của module báo cáo trên máy tính này.')
      }
    } catch (err) {
      showToast('Lỗi khi dọn dẹp dữ liệu: ' + err?.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="h-full w-full flex bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E5] font-sans select-none overflow-hidden relative">
      <ToastContainer />
      {/* 1. NOTION / DATAHUB SETTINGS SIDEBAR (Rộng 256px thoáng mát, không bị che text) */}
      <aside className="w-64 border-r border-[#EDEDEB] dark:border-[#2F2F2F] bg-[#F7F6F3] dark:bg-[#202020] flex flex-col shrink-0 p-3.5 select-none transition-all duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-2 py-1.5 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
            Cài đặt & Bộ nhớ
          </span>
          <button
            type="button"
            onClick={() => loadAllStats(false)}
            disabled={loading}
            className="p-1 rounded text-[#787774] hover:text-[#37352F] dark:hover:text-[#E6E6E5] hover:bg-[#EFEFED] dark:hover:bg-[#2B2B2B] transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2383E2]' : ''}`} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 custom-scrollbar">
          {TAB_CATEGORIES.map((cat) => (
            <div key={cat.category} className="space-y-0.5">
              <div className="px-2 pb-1 text-[10px] font-semibold text-[#9B9A97] dark:text-[#6E6D6A] uppercase tracking-wider">
                {cat.category}
              </div>
              <div className="space-y-0.5">
                {cat.items.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      title={tab.name}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-[#EFEFED] dark:bg-[#2B2B2B] text-[#37352F] dark:text-[#E6E6E5] font-semibold'
                          : 'text-[#5A5955] dark:text-[#9B9A97] hover:bg-[#EAE9E5] dark:hover:bg-[#262626] hover:text-[#37352F] dark:hover:text-[#E6E6E5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#37352F] dark:text-[#E6E6E5]'
                              : 'text-[#787774] dark:text-[#9B9A97]'
                          }`}
                        />
                        <span className="truncate text-[12.5px]">{tab.name}</span>
                      </div>

                      {tab.showCount && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono transition-colors shrink-0 ml-1.5 ${
                            isActive
                              ? 'bg-[#E3E2E0] dark:bg-[#383838] text-[#37352F] dark:text-[#E6E6E5]'
                              : 'text-[#9B9A97] dark:text-[#6E6D6A]'
                          }`}
                        >
                          {localMasters.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA (Độ rộng thoáng đãng, co giãn linh hoạt) */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-[#191919] px-6 py-6 lg:px-10 lg:py-8 custom-scrollbar">
        {activeTab === 'account' && <AccountTab />}

        {activeTab === 'overview' && (
          <OverviewTab
            storageStats={storageStats}
            ramStats={ramStats}
            localMasters={localMasters}
            onSelectTab={handleSelectTab}
          />
        )}

        {activeTab === 'datasets' && (
          <DatasetsTab
            localMasters={localMasters}
            loading={loading || actionLoading}
            onDeleteMaster={handleDeleteMaster}
            onRefresh={() => loadAllStats(false)}
          />
        )}

        {activeTab === 'preferences' && <PreferencesTab />}

        {activeTab === 'advanced' && (
          <AdvancedTab
            onClearRam={handleClearRam}
            onVacuumAndClean={handleVacuumAndClean}
            onClearAllCache={handleClearAllCache}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'system' && <SystemTab />}
      </main>
    </div>
  )
}
