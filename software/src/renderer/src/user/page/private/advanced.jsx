/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Trash2, Zap, Sparkles, AlertTriangle, X } from 'lucide-react'

export default function AdvancedTab({
  onClearRam,
  onVacuumAndClean,
  onClearAllCache,
  actionLoading = false
}) {
  const [modalVisible, setModalVisible] = useState(false)
  const [deleteMode, setDeleteMode] = useState('preserve_masters')

  const handleConfirm = async () => {
    setModalVisible(false)
    if (onClearAllCache) {
      await onClearAllCache(deleteMode === 'preserve_masters')
    }
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 font-sans pb-20 pt-2 text-[#37352F] dark:text-[#E6E6E5]">
      {/* 1. NOTION PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#E03E3E] dark:text-[#FF7373]">
          Vùng An toàn & Dọn dẹp
        </h1>
        <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">
          Các thao tác làm mới bộ nhớ tạm và dọn dẹp dữ liệu cục bộ đã lưu trên thiết bị.
        </p>
      </div>

      <hr className="border-t border-[#EDEDEB] dark:border-[#2F2F2F]" />

      {/* 2. CÁC THAO TÁC BẢO TRÌ BỘ NHỚ NHẸ */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
          Bảo trì & Tối ưu hiệu năng
        </h3>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F] bg-white dark:bg-[#191919]">
          {/* Dọn bộ nhớ tạm */}
          <div className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                  Làm mới bộ nhớ tạm thời
                </div>
                <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
                  Giải phóng bộ nhớ phiên làm việc của các báo cáo đang mở để ứng dụng chạy nhẹ hơn
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearRam}
              className="h-8 px-3 rounded-md border border-[#EDEDEB] hover:bg-[#F7F6F3] text-xs font-medium text-[#37352F] shrink-0 transition-colors cursor-pointer"
            >
              Làm mới bộ nhớ
            </button>
          </div>

          {/* Tối ưu dung lượng đĩa */}
          <div className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                  Tối ưu dung lượng ổ cứng
                </div>
                <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
                  Dọn dẹp các khối dữ liệu dư thừa và thu hồi không gian lưu trữ trống trên máy
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onVacuumAndClean}
              disabled={actionLoading}
              className="h-8 px-3 rounded-md border border-[#EDEDEB] hover:bg-[#F7F6F3] text-xs font-medium text-[#37352F] shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Đang tối ưu...' : 'Tối ưu dung lượng'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. NOTION DANGER CALLOUT */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E03E3E] dark:text-[#FF7373]">
          Vùng nguy hiểm
        </h3>

        <div className="p-4 rounded-md bg-[#FDF5F5] dark:bg-[#2B1B1B] border border-[#F5D5D5] dark:border-[#4D2424] space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#E03E3E] dark:text-[#FF7373]">
              Làm sạch toàn bộ dữ liệu lưu trữ trên máy tính
            </div>
            <div className="text-[11.5px] text-[#787774] dark:text-[#9B9A97] leading-relaxed">
              Thao tác này sẽ xóa các báo cáo và tệp tính toán đã tải về thiết bị này để giải phóng
              ổ cứng. Mọi dữ liệu gốc trên hệ thống trung tâm luôn an toàn và có thể tải lại bất kỳ
              lúc nào.
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setModalVisible(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#E03E3E] hover:bg-[#C92A2A] text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xác nhận làm sạch dữ liệu</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DIALOG XÁC NHẬN (Zero antd) */}
      {modalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between text-[#E03E3E]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xác Nhận Dọn Dẹp Dữ Liệu Lưu Trên Máy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#787774] mb-0">Vui lòng chọn hình thức dọn dẹp phù hợp:</p>

            <div className="space-y-2.5">
              <label
                onClick={() => setDeleteMode('preserve_masters')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  deleteMode === 'preserve_masters'
                    ? 'border-slate-800 bg-slate-50/50 dark:border-zinc-400 dark:bg-zinc-800/40'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50/30'
                }`}
              >
                <input
                  type="radio"
                  name="cleanMode"
                  checked={deleteMode === 'preserve_masters'}
                  onChange={() => setDeleteMode('preserve_masters')}
                  className="mt-0.5 text-slate-900 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-xs text-[#37352F] dark:text-white">
                    Chỉ dọn tệp chi tiết & bảng tính tạm (Khuyên dùng)
                  </div>
                  <div className="text-[11px] text-[#787774] dark:text-zinc-400 mt-0.5">
                    Giải phóng phần lớn dung lượng bộ nhớ nhưng vẫn giữ lại danh sách báo cáo để tra
                    cứu nhanh.
                  </div>
                </div>
              </label>

              <label
                onClick={() => setDeleteMode('clean_all')}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  deleteMode === 'clean_all'
                    ? 'border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/40'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50/30'
                }`}
              >
                <input
                  type="radio"
                  name="cleanMode"
                  checked={deleteMode === 'clean_all'}
                  onChange={() => setDeleteMode('clean_all')}
                  className="mt-0.5 text-rose-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-xs text-[#E03E3E] dark:text-rose-400">
                    Xóa toàn bộ bản lưu trên máy tính này
                  </div>
                  <div className="text-[11px] text-[#787774] dark:text-zinc-400 mt-0.5">
                    Làm trống hoàn toàn mọi danh sách và tệp báo cáo đã tải về thiết bị.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className="h-8 px-3 rounded-md border border-slate-200 dark:border-zinc-700 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={actionLoading}
                className="h-8 px-3 rounded-md bg-[#E03E3E] hover:bg-[#C92A2A] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Đang dọn dẹp...' : 'Bắt đầu dọn dẹp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
