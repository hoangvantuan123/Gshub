/* eslint-disable react/prop-types */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Eye,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Layers
} from 'lucide-react'
import dayjs from 'dayjs'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import { showToast } from './toast'

export default function DatasetsTab({ localMasters = [], onDeleteMaster, onRefresh }) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [copiedCode, setCopiedCode] = useState(null)
  const [deleteTargetCode, setDeleteTargetCode] = useState(null)

  // Pagination (OpenAI style)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredMasters = useMemo(() => {
    let result = localMasters
    if (statusFilter !== 'ALL') {
      result = result.filter(
        (m) => String(m.status || m.Status || 'DRAFT').toUpperCase() === statusFilter
      )
    }
    if (searchText) {
      const q = searchText.toLowerCase().trim()
      result = result.filter((m) => {
        const code = String(m.regCode || m.RegCode || '').toLowerCase()
        const factory = String(m.factoryName || m.FactoryName || '').toLowerCase()
        const team = String(m.productionTeam || m.ProductionTeam || '').toLowerCase()
        const status = String(m.status || m.Status || '').toLowerCase()
        return code.includes(q) || factory.includes(q) || team.includes(q) || status.includes(q)
      })
    }
    return result
  }, [localMasters, searchText, statusFilter])

  useMemo(() => {
    setCurrentPage(1)
  }, [searchText, statusFilter])

  const totalPages = Math.ceil(filteredMasters.length / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMasters.slice(start, start + pageSize)
  }, [filteredMasters, currentPage, pageSize])

  const handleOpenDetail = (regCode) => {
    if (!regCode) return
    const isElectron = Boolean(window?.electron || window?.process?.type === 'renderer')
    if (isElectron) {
      try {
        openChildWindow({
          key: `calc-prod-detail-${regCode}`,
          title: `Báo cáo sản xuất - ${regCode}`,
          path: `/sub/report/calc-production-query/detail/${encodeURIComponent(regCode)}`,
          width: 1400,
          height: 900
        })
        return
      } catch (e) {
        console.warn('Không thể mở cửa sổ con:', e)
      }
    }
    navigate(`/erp/u/report/calc-production-query/detail/${encodeURIComponent(regCode)}`)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    showToast(`Đã sao chép mã: ${code}`)
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev))
    }, 2000)
  }

  const confirmDelete = async () => {
    if (!deleteTargetCode) return
    const code = deleteTargetCode
    setDeleteTargetCode(null)
    if (onDeleteMaster) {
      await onDeleteMaster(code)
    }
  }

  return (
    <div className="w-full space-y-5 font-sans pb-20 pt-1 text-slate-800 dark:text-zinc-100 select-none">
      {/* 1. NOTION / OPENAI PAGE HEADER */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Báo cáo Lưu trữ trên máy
          </h1>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="h-7 px-2.5 rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1.5 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Tải lại</span>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Danh sách các báo cáo sản xuất được lưu cục bộ để tra cứu tức thì không cần tải lại mạng.
        </p>
      </div>

      <hr className="border-t border-slate-200 dark:border-zinc-800" />

      {/* 2. THANH CÔNG CỤ TỐI GIẢN VỪA TẦM MẮT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: 'ALL', label: `Tất cả (${localMasters.length})` },
            { id: 'PUBLISHED', label: 'Đã công bố' },
            { id: 'DRAFT', label: 'Bản nháp' }
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã số, xưởng..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-7 pl-7 pr-2.5 text-xs rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* 4. BẢNG OPENAI NHỎ GỌN VỪA TẦM MẮT (COMPACT TABLE) */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-850/60">
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Mã Báo Cáo
                </th>
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Nhà Máy & Tổ
                </th>
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  Áp Dụng
                </th>
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                  Dung Lượng
                </th>
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Trạng Thái
                </th>
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                  Lần Lưu
                </th>
                <th className="py-2 px-3 text-[10.5px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                  Thao Tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {paginatedData.length > 0 ? (
                paginatedData.map((r) => {
                  const compressed = r.compressedSizeMB || 0
                  const raw = r.rawSizeMB || 0
                  const sizeVal = compressed > 0 ? compressed : raw
                  const s = String(r.status || 'DRAFT').toUpperCase()
                  const isCopied = copiedCode === r.regCode

                  return (
                    <tr
                      key={r.regCode || r.RegCode || Math.random()}
                      className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Mã Báo Cáo */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white select-all">
                            {r.regCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCode(r.regCode)}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Sao chép mã"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          {r.version && (
                            <span className="text-[9.5px] font-mono px-1 rounded bg-slate-100 text-slate-600">
                              v{r.version}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nhà Máy & Tổ */}
                      <td className="py-2 px-3">
                        <div className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                          {r.factoryName || r.FactoryName || 'Chưa phân loại'}
                        </div>
                        <div className="text-[10.5px] text-slate-400 dark:text-zinc-500 truncate">
                          {r.productionTeam || r.ProductionTeam || 'Toàn bộ xưởng'}
                        </div>
                      </td>

                      {/* Ngày Áp Dụng */}
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                        {r.applyDate ? dayjs(r.applyDate).format('DD/MM/YYYY') : '---'}
                      </td>

                      {/* Dung Lượng */}
                      <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                        {sizeVal > 0 ? `${sizeVal} MB` : 'Đã tối ưu'}
                      </td>

                      {/* Trạng Thái */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {s === 'PUBLISHED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>ĐÃ CÔNG BỐ</span>
                          </span>
                        ) : s === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>ĐÃ HỦY</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>BẢN NHÁP</span>
                          </span>
                        )}
                      </td>

                      {/* Lần Lưu */}
                      <td className="py-2 px-3 text-center font-mono text-[10.5px] text-slate-400 whitespace-nowrap">
                        {r.registeredAt ? dayjs(r.registeredAt).format('DD/MM/YYYY HH:mm') : '---'}
                      </td>

                      {/* Thao Tác */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(r.regCode)}
                            className="h-6 px-2 rounded border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTargetCode(r.regCode)}
                            className="h-6 w-6 rounded border border-transparent hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Xóa bản lưu này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                    <Layers className="w-7 h-7 text-slate-300 mx-auto mb-1.5 opacity-50" />
                    <p className="font-medium text-slate-600">Không tìm thấy báo cáo nào.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PHÂN TRANG NHỎ GỌN */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 text-[11px] text-slate-500">
          <div>
            <span>
              {filteredMasters.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
              {Math.min(currentPage * pageSize, filteredMasters.length)}
            </span>{' '}
            / <span className="font-medium">{filteredMasters.length}</span> báo cáo
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-6 px-1.5 text-[11px] rounded border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-6 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Trước</span>
              </button>

              <span className="px-1.5 font-mono text-[10.5px]">
                {currentPage}/{totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-6 px-2 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center gap-0.5"
              >
                <span>Sau</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. MODAL XÁC NHẬN XÓA NHỎ GỌN */}
      {deleteTargetCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 p-5 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-bold text-slate-900">Xác nhận xóa bản lưu?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bản lưu ngoại tuyến của báo cáo{' '}
              <b className="font-mono text-slate-900">{deleteTargetCode}</b> trên máy tính này sẽ bị
              xóa. Dữ liệu trên hệ thống trung tâm luôn an toàn.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTargetCode(null)}
                className="h-7 px-3 rounded border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-7 px-3 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Xóa bản lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
