/* eslint-disable react/prop-types */
import { Zap, HardDrive, ArrowRight, Layers } from 'lucide-react'

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function OverviewTab({ storageStats, ramStats, localMasters = [], onSelectTab }) {
  const isDesktop =
    typeof window !== 'undefined' &&
    Boolean(window.electron?.ipcRenderer || window.process?.type === 'renderer')
  const totalSizeBytes = storageStats?.totalSizeBytes || storageStats?.fileSizeBytes || 0

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 font-sans pb-20 pt-2 text-[#37352F] dark:text-[#E6E6E5]">
      {/* 1. NOTION PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E6E5]">
          Tổng quan Dung lượng & Bộ nhớ
        </h1>
        <p className="text-xs text-[#787774] dark:text-[#9B9A97]">
          Giám sát dung lượng ổ cứng, thông số các bộ nhớ lưu trữ và chi tiết bản ghi phân vùng.
        </p>
      </div>

      <hr className="border-t border-[#EDEDEB] dark:border-[#2F2F2F]" />

      {/* 2. CÔNG NGHỆ BỘ NHỚ LƯU TRỮ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
            Phương thức Lưu trữ ({isDesktop ? 'Ứng dụng Máy tính Desktop' : 'Trình duyệt Web'})
          </h3>
        </div>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F] bg-white dark:bg-[#191919]">
          <div className="flex items-center justify-between px-4 py-3 text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <Zap className="w-4 h-4 text-[#37352F] dark:text-[#E6E6E5] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                    Lưu trữ Tệp trên Máy tính
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#E3E2E0] dark:bg-[#2F2F2F] text-[#37352F] dark:text-[#E6E6E5] font-medium">
                    Tệp dữ liệu cục bộ
                  </span>
                </div>
                <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5 truncate">
                  Lưu trữ trực tiếp vào tệp dữ liệu trên máy để mở báo cáo tức thì không phụ thuộc
                  mạng.
                </p>
              </div>
            </div>
            <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#E8F3FF] dark:bg-[#1C2C3F] text-[#0B6BCB] dark:text-[#70B1FF] font-medium shrink-0 ml-3">
              Đang hoạt động
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3 text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <HardDrive className="w-4 h-4 text-[#37352F] dark:text-[#E6E6E5] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                    Bộ nhớ Phiên làm việc
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#E3E2E0] dark:bg-[#2F2F2F] text-[#37352F] dark:text-[#E6E6E5] font-medium">
                    Bộ nhớ tạm thời
                  </span>
                </div>
                <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5 truncate">
                  Dữ liệu tạm trong lúc mở báo cáo. Tự động làm mới khi đóng ứng dụng.
                </p>
              </div>
            </div>
            <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#E8F3FF] dark:bg-[#1C2C3F] text-[#0B6BCB] dark:text-[#70B1FF] font-medium shrink-0 ml-3">
              Đang hoạt động
            </span>
          </div>
        </div>
      </div>

      {/* 3. CARD THỐNG KÊ DUNG LƯỢNG */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
            Chỉ số Dung lượng & Bản ghi
          </h3>
          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('datasets')}
              className="text-xs font-medium text-[#0B6BCB] hover:text-[#084B8A] flex items-center gap-1 cursor-pointer"
            >
              <span>Xem danh sách báo cáo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#191919]">
            <div className="text-[10.5px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
              Dung lượng đã dùng
            </div>
            <div className="text-xl font-bold text-[#37352F] dark:text-[#E6E6E5] mt-1 font-mono">
              {formatBytes(totalSizeBytes)}
            </div>
            <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
              Lưu trên thiết bị
            </div>
          </div>

          <div
            onClick={() => onSelectTab && onSelectTab('datasets')}
            className="p-4 rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#191919] hover:bg-[#F7F6F3]/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
                Báo cáo đã lưu
              </span>
              <Layers className="w-3.5 h-3.5 text-[#787774] group-hover:text-[#37352F]" />
            </div>
            <div className="text-xl font-bold text-[#37352F] dark:text-[#E6E6E5] mt-1 font-mono">
              {storageStats?.masterCount ?? localMasters.length}{' '}
              <span className="text-xs font-normal text-[#787774]">bản ghi</span>
            </div>
            <div className="text-[11px] text-[#0B6BCB] mt-0.5 flex items-center gap-1">
              <span>Bấm để mở danh sách</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          <div className="p-4 rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#191919]">
            <div className="text-[10.5px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
              Tệp dữ liệu chi tiết
            </div>
            <div className="text-xl font-bold text-[#37352F] dark:text-[#E6E6E5] mt-1 font-mono">
              {storageStats?.chunkCount || 0}{' '}
              <span className="text-xs font-normal text-[#787774]">khối dữ liệu</span>
            </div>
            <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
              Bảng tính phân tích
            </div>
          </div>

          <div className="p-4 rounded-md border border-[#EDEDEB] dark:border-[#2F2F2F] bg-white dark:bg-[#191919]">
            <div className="text-[10.5px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
              Bộ nhớ tạm thời
            </div>
            <div className="text-xl font-bold text-[#37352F] dark:text-[#E6E6E5] mt-1 font-mono">
              {ramStats?.masterCount || 0}{' '}
              <span className="text-xs font-normal text-[#787774]">báo cáo</span>
            </div>
            <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
              Đang mở trong phiên
            </div>
          </div>
        </div>
      </div>

      {/* 4. TRẠNG THÁI LƯU TRỮ */}
      <div className="p-4 rounded-md bg-[#F7F6F3] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2F2F2F] flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
            Trạng thái lưu trữ thiết bị
          </div>
          <div className="text-[11.5px] text-[#787774] dark:text-[#9B9A97] mt-0.5">
            Dữ liệu ngoại tuyến được quản lý an toàn và bảo mật nội bộ trên máy tính của bạn.
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#107569] dark:text-[#15B79E] font-medium font-mono shrink-0 ml-3">
          <span className="w-2 h-2 rounded-full bg-[#107569] dark:bg-[#15B79E] animate-pulse" />
          <span>Sẵn sàng ngoại tuyến</span>
        </div>
      </div>
    </div>
  )
}
