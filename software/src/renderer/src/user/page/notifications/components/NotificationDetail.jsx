/* eslint-disable react/prop-types */
import { Mail, MailOpen, Trash2, X, Check, Copy, FolderSearch } from 'lucide-react'

export default function NotificationDetail({
  selectedRecord,
  parsedErrorLines = [],
  onToggleReadStatus,
  onDeleteSingle,
  onClose,
  onCopyText,
  copiedKey
}) {
  if (!selectedRecord) {
    return (
      <div className="flex-1 bg-white flex flex-col min-w-0 h-full overflow-hidden">
        <div className="py-24 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <FolderSearch size={32} className="text-slate-300 stroke-[1.5]" />
          <span>Chọn một mục từ danh sách bên trái để xem nội dung thông báo chi tiết</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white flex flex-col min-w-0 h-full overflow-hidden">
      {/* 1. THANH TIÊU ĐỀ CHI TIẾT */}
      <div className="h-10 px-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 select-none bg-white">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="font-bold text-[12px] text-slate-800 tracking-wide shrink-0">
            Chi tiết
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Nút Chuyển đổi trạng thái Đã đọc / Chưa đọc */}
          <button
            type="button"
            onClick={(e) => onToggleReadStatus?.(selectedRecord.id, e)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
            title={selectedRecord.isRead ? 'Chuyển sang trạng thái Chưa đọc' : 'Đánh dấu là Đã đọc'}
          >
            {selectedRecord.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
          </button>

          {/* Nút Xóa thông báo */}
          <button
            type="button"
            onClick={(e) => onDeleteSingle?.(selectedRecord.id, e)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-[3px] transition-colors cursor-pointer"
            title="Xóa thông báo này"
          >
            <Trash2 size={14} />
          </button>

          {/* Nút Đóng chi tiết */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
            title="Đóng bảng chi tiết"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. THÂN CUỘN: CUỘN ĐỘC LẬP MƯỢT MÀ */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4 text-xs">
        {/* PHẦN 1: THÔNG TIN CHUNG */}
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Thông tin chung
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[11px]">Đường dẫn trang</span>
              <span className="font-mono text-slate-800 font-medium break-all text-[11.5px]">
                {selectedRecord.route || selectedRecord.endpoint || 'Hệ thống'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[11px]">Chức năng / Tác vụ</span>
              <span className="font-semibold text-slate-800 text-[11.5px]">
                {selectedRecord.action || selectedRecord.menuName || 'Sự kiện hệ thống'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[11px]">Dịch vụ liên kết</span>
              <span className="font-mono text-slate-800 font-medium break-all text-[11.5px]">
                {selectedRecord.endpoint || 'Thao tác trực tiếp'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[11px]">Thời gian ghi nhận</span>
              <span className="font-mono text-slate-700 text-[11px]">
                {selectedRecord.formattedTime}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[11px]">Thời gian phản hồi</span>
              <span className="font-mono text-slate-700 text-[11px]">
                {selectedRecord.durationMs !== undefined
                  ? `${selectedRecord.durationMs}ms`
                  : 'Tức thì'}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[11px]">Người thực hiện</span>
              <span className="text-slate-700 font-medium text-[11.5px]">
                {selectedRecord.userName
                  ? `${selectedRecord.userName}${selectedRecord.userId ? ` (${selectedRecord.userId})` : ''}`
                  : selectedRecord.userName || 'Chưa đăng nhập'}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* PHẦN 2: NỘI DUNG THÔNG BÁO CHI TIẾT */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Nội dung thông báo</span>
            <button
              type="button"
              onClick={() => onCopyText?.(selectedRecord.message, 'msg')}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] font-medium lowercase cursor-pointer"
              title="Sao chép nội dung"
            >
              {copiedKey === 'msg' ? (
                <Check size={12} className="text-emerald-600" />
              ) : (
                <Copy size={12} />
              )}
              <span>Sao chép</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5 select-text">
            {parsedErrorLines.length > 0 ? (
              parsedErrorLines.map((line, idx) => (
                <div
                  key={idx}
                  className="border-l-2 border-rose-500 pl-2.5 py-0.5 text-xs text-slate-800 leading-relaxed font-normal break-words"
                >
                  {line}
                </div>
              ))
            ) : (
              <div className="text-slate-400 italic text-xs py-1">
                Không có nội dung thông báo cụ thể
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
