/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cpu,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  Building2,
  Layers,
  Wrench
} from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export default function FactoryMachineListModal({
  isOpen = false,
  onClose,
  factoryName = 'GS1 Hà Nội',
  factoryKey = 'GS1',
  machines = [],
  onReloadFromServer,
  isReloading = false
}) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMachines = useMemo(() => {
    if (!searchTerm.trim()) return machines
    const term = searchTerm.trim().toLowerCase()
    return machines.filter((m) => {
      const code = String(m.MachineCode || m.machine_code || m.code || '').toLowerCase()
      const name = String(m.MachineName || m.machine_name || m.name || '').toLowerCase()
      const team = String(m.TeamName || m.team_name || m.team || '').toLowerCase()
      const fac = String(m.Factory || m['Nhà máy'] || '').toLowerCase()
      return code.includes(term) || name.includes(term) || team.includes(term) || fac.includes(term)
    })
  }, [machines, searchTerm])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Cpu size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">
                  {t('DANH MỤC MÁY MÓC THEO NHÀ MÁY')}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {factoryName}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Key: {factoryKey}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {t('Danh sách máy được nạp vào bộ nhớ để đối chiếu [Thuộc nhà máy] ở Tab số 7')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search & Reload */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Tìm kiếm theo mã máy, tên máy, tổ đội...')}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">
              {t('Tổng số:')}{' '}
              <strong className="text-indigo-700 font-bold">{filteredMachines.length}</strong> /{' '}
              {machines.length} {t('máy')}
            </span>

            {typeof onReloadFromServer === 'function' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReloadFromServer}
                disabled={isReloading}
                className="h-8 px-2.5 text-xs font-semibold text-indigo-700 border-indigo-300 hover:bg-indigo-50 gap-1.5"
                title={t('Tải lại danh sách máy mới nhất từ API máy chủ')}
              >
                <RefreshCw size={13} className={isReloading ? 'animate-spin text-indigo-600' : 'text-indigo-600'} />
                <span>{isReloading ? t('Đang tải...') : t('Tải lại từ máy chủ')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Machine Table */}
        <div className="flex-1 overflow-auto p-3 bg-white">
          {filteredMachines.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Wrench size={32} className="text-slate-300" />
              <p className="text-sm font-medium">
                {searchTerm
                  ? t('Không tìm thấy máy nào khớp với từ khóa tìm kiếm')
                  : t('Chưa có danh mục máy nào được nạp cho nhà máy này')}
              </p>
              {typeof onReloadFromServer === 'function' && (
                <Button
                  size="sm"
                  onClick={onReloadFromServer}
                  disabled={isReloading}
                  className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  <RefreshCw size={13} className={isReloading ? 'animate-spin' : ''} />
                  <span>{t('Bấm để tải máy từ máy chủ')}</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2 px-3 w-12 text-center">STT</th>
                    <th className="py-2 px-3 w-40">{t('Mã máy (Code)')}</th>
                    <th className="py-2 px-3">{t('Tên máy móc')}</th>
                    <th className="py-2 px-3 w-44">{t('Tổ đội / Phân xưởng')}</th>
                    <th className="py-2 px-3 w-28 text-center">{t('Nhà máy')}</th>
                    <th className="py-2 px-3 w-24 text-center">{t('Trạng thái')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMachines.map((m, idx) => {
                    const code = m.MachineCode || m.machine_code || m.code || '-'
                    const name = m.MachineName || m.machine_name || m.name || '-'
                    const team = m.TeamName || m.team_name || m.TeamCode || '-'
                    const fac = m.Factory || m['Nhà máy'] || factoryKey
                    const isActive = m.IsActive !== false && m.is_active !== false

                    return (
                      <tr
                        key={m.IdSeq || m.id || idx}
                        className="hover:bg-indigo-50/50 transition-colors"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11.5px]">
                            {code}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{name}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11.5px]">{team}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {fac}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 size={10} className="text-emerald-600" />
                              {t('Sử dụng')}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 italic">
                              {t('Ngừng')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 italic">
            {t('* Mã máy trong danh mục này sẽ được dùng để đánh giá [Thuộc nhà máy = TRUE] ở Tab số 7')}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 text-xs"
          >
            {t('Đóng')}
          </Button>
        </div>
      </div>
    </div>
  )
}
