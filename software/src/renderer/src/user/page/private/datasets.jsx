/* eslint-disable react/prop-types */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Eye,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Layers,
  Loader2
} from 'lucide-react'
import dayjs from 'dayjs'
import { openChildWindow } from '@renderer/utils/openChildWindow'
import { showToast } from './toast'

const INITIAL_BATCH = 25
const BATCH_SIZE = 20

export default function DatasetsTab({ localMasters = [], onDeleteMaster, onRefresh }) {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [copiedCode, setCopiedCode] = useState(null)
  const [deleteTargetCode, setDeleteTargetCode] = useState(null)

  // Infinite Scroll Loading State
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const tableContainerRef = useRef(null)

  // Filtered dataset
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

  // Reset scroll limit whenever filters change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH)
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0
    }
  }, [searchText, statusFilter])

  const visibleData = useMemo(() => {
    return filteredMasters.slice(0, visibleCount)
  }, [filteredMasters, visibleCount])

  const hasMore = visibleData.length < filteredMasters.length

  // Infinite scroll trigger handler
  const handleScroll = useCallback(
    (e) => {
      const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoadingMore) {
        setIsLoadingMore(true)
        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredMasters.length))
          setIsLoadingMore(false)
        }, 150)
      }
    },
    [hasMore, isLoadingMore, filteredMasters.length]
  )

  const publishedCount = useMemo(() => {
    return localMasters.filter(
      (m) => String(m.status || m.Status || '').toUpperCase() === 'PUBLISHED'
    ).length
  }, [localMasters])

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
    <div className="w-full space-y-4 font-sans pb-10 pt-1 text-[#37352F] dark:text-[#E6E6E5] select-none">
      {/* 1. HEADER CHUẨN PHẦN MỀM */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E6E5]">
              Báo cáo đã lưu trên máy
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#EFEFED] dark:bg-[#2B2B2B] text-[#5A5955] dark:text-[#9B9A97] font-semibold">
              {filteredMasters.length} báo cáo
            </span>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="h-7 px-2.5 rounded bg-white dark:bg-[#191919] border border-[#EDEDEB] dark:border-[#2F2F2F] hover:bg-[#F7F6F3] dark:hover:bg-[#202020] text-xs font-medium flex items-center gap-1.5 text-[#37352F] dark:text-[#E6E6E5] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-[#787774]" />
              <span>Làm mới</span>
            </button>
          )}
        </div>
        <p className="text-xs text-[#787774] dark:text-[#9B9A97]">
          Danh sách dữ liệu báo cáo lưu cục bộ trên thiết bị, tự động nạp liên tục khi cuộn.
        </p>
      </div>

      <hr className="border-t border-[#EDEDEB] dark:border-[#2F2F2F]" />

      {/* 2. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: `Tất cả (${localMasters.length})` },
            { id: 'PUBLISHED', label: `Đã công bố (${publishedCount})` },
            { id: 'DRAFT', label: `Bản nháp (${localMasters.length - publishedCount})` }
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-[#37352F] text-white dark:bg-[#E6E6E5] dark:text-[#191919] font-medium'
                  : 'bg-[#F7F6F3] dark:bg-[#202020] text-[#787774] dark:text-[#9B9A97] hover:bg-[#EFEFED] hover:text-[#37352F]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã, xưởng, tổ..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-7 pl-7 pr-7 text-xs rounded border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E5] placeholder:text-[#9B9A97] focus:outline-none focus:border-[#787774] transition-colors"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#37352F] text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. TABLE PHẦN MỀM THUẦN TÚY (KHÔNG ĐÓNG KHUNG BO GÓC, KHÔNG CÓ FOOTER THỪA) */}
      <div
        ref={tableContainerRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[380px] custom-scrollbar border-t border-b border-[#EDEDEB] dark:border-[#2F2F2F]"
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#FAFAFA] dark:bg-[#1E1E1E] border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
            <tr>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
                Mã Báo Cáo
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
                Nhà Máy & Tổ
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
                Ngày Áp Dụng
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider text-right">
                Dung Lượng
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider text-center">
                Trạng Thái
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider text-center">
                Lần Lưu
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider text-right">
                Thao Tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
            {visibleData.length > 0 ? (
              visibleData.map((r) => {
                const compressed = r.compressedSizeMB || 0
                const raw = r.rawSizeMB || 0
                const sizeVal = compressed > 0 ? compressed : raw
                const s = String(r.status || 'DRAFT').toUpperCase()
                const isCopied = copiedCode === r.regCode

                return (
                  <tr
                    key={r.regCode || r.RegCode || Math.random()}
                    className="hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors"
                  >
                    {/* Mã Báo Cáo */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5] select-all">
                          {r.regCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(r.regCode)}
                          className="p-1 rounded text-[#787774] hover:text-[#37352F] hover:bg-[#EFEFED] dark:hover:bg-[#2B2B2B] transition-colors"
                          title="Sao chép mã"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {r.version && (
                          <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-[#EFEFED] dark:bg-[#2B2B2B] text-[#787774] dark:text-[#9B9A97]">
                            v{r.version}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nhà Máy & Tổ */}
                    <td className="py-2 px-3">
                      <div className="text-xs font-medium text-[#37352F] dark:text-[#E6E6E5] truncate">
                        {r.factoryName || r.FactoryName || 'Chưa phân loại'}
                      </div>
                      <div className="text-[10.5px] text-[#787774] dark:text-[#9B9A97] truncate">
                        {r.productionTeam || r.ProductionTeam || 'Toàn bộ xưởng'}
                      </div>
                    </td>

                    {/* Ngày Áp Dụng */}
                    <td className="py-2 px-3 font-mono text-[11px] text-[#5A5955] dark:text-[#9B9A97] whitespace-nowrap">
                      {r.applyDate ? dayjs(r.applyDate).format('DD/MM/YYYY') : '---'}
                    </td>

                    {/* Dung Lượng */}
                    <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5] whitespace-nowrap">
                      {sizeVal > 0 ? `${sizeVal} MB` : 'Đã tối ưu'}
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {s === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>ĐÃ CÔNG BỐ</span>
                        </span>
                      ) : s === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>ĐÃ HỦY</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>BẢN NHÁP</span>
                        </span>
                      )}
                    </td>

                    {/* Lần Lưu */}
                    <td className="py-2 px-3 text-center font-mono text-[10.5px] text-[#787774] dark:text-[#9B9A97] whitespace-nowrap">
                      {r.registeredAt ? dayjs(r.registeredAt).format('DD/MM/YYYY HH:mm') : '---'}
                    </td>

                    {/* Thao Tác */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(r.regCode)}
                          className="h-6 px-2.5 rounded bg-white dark:bg-[#191919] border border-[#EDEDEB] dark:border-[#2F2F2F] hover:bg-[#F7F6F3] dark:hover:bg-[#202020] text-[11px] font-medium text-[#37352F] dark:text-[#E6E6E5] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#787774]" />
                          <span>Xem</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTargetCode(r.regCode)}
                          className="h-6 w-6 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#787774] hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
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
                <td
                  colSpan={7}
                  className="py-14 text-center text-xs text-[#787774] dark:text-[#9B9A97]"
                >
                  <Layers className="w-7 h-7 text-[#787774] mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-[#37352F] dark:text-[#E6E6E5]">
                    Không tìm thấy báo cáo nào.
                  </p>
                </td>
              </tr>
            )}

            {/* Hàng báo trạng thái đang cuộn tải thêm (chỉ hiển thị tạm thời khi đang scroll) */}
            {isLoadingMore && (
              <tr>
                <td
                  colSpan={7}
                  className="py-2.5 text-center text-xs text-[#787774] dark:text-[#9B9A97] bg-[#FAFAFA] dark:bg-[#1E1E1E]"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin inline-block mr-1.5 text-[#2383E2]" />
                  <span>Đang tải thêm dữ liệu...</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. MODAL XÁC NHẬN XÓA */}
      {deleteTargetCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#191919] border border-[#EDEDEB] dark:border-[#2F2F2F] p-5 shadow-xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-bold text-[#37352F] dark:text-[#E6E6E5]">
                Xác nhận xóa bản lưu?
              </h3>
            </div>

            <p className="text-xs text-[#787774] dark:text-[#9B9A97] leading-relaxed">
              Bản lưu ngoại tuyến của báo cáo{' '}
              <b className="font-mono text-[#37352F] dark:text-[#E6E6E5]">{deleteTargetCode}</b>{' '}
              trên máy tính này sẽ bị xóa. Dữ liệu trên hệ thống trung tâm luôn an toàn.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTargetCode(null)}
                className="h-7 px-3 rounded border border-[#EDEDEB] dark:border-[#2F2F2F] hover:bg-[#F7F6F3] dark:hover:bg-[#202020] text-xs font-medium text-[#37352F] dark:text-[#E6E6E5] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-7 px-3 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
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
