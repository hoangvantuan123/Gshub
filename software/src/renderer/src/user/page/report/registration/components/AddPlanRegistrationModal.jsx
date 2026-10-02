/* eslint-disable react/prop-types */
import { Modal } from 'antd'
import PlanRegistrationFormCore from './PlanRegistrationFormCore'

/**
 * AddPlanRegistrationModal - Modal Pop-up Đăng ký nạp báo cáo nhanh
 * Tái sử dụng 100% logic từ PlanRegistrationFormCore
 */
export default function AddPlanRegistrationModal({ isOpen, onClose, onSaveSuccess }) {
  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width="94vw"
      style={{ maxWidth: 1400, paddingBottom: 0 }}
      styles={{
        content: {
          padding: 0,
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column'
        },
        body: { padding: 0, height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }
      }}
    >
      <div className="flex flex-col h-full w-full bg-white overflow-hidden">
        {/* Header Modal: Nền sáng tối giản, chỉ gồm tiêu đề và nút đóng ✕ */}
        <div className="flex items-center justify-between px-3 h-8 min-h-[32px] bg-[#f8fafc] text-slate-800 select-none shrink-0 border-b border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
            ĐĂNG KÝ & NẠP DỮ LIỆU BÁO CÁO SẢN XUẤT (KHSX / TKSX)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors text-sm font-bold cursor-pointer"
            title="Đóng (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Nội dung form */}
        <div className="flex-1 w-full min-h-0 overflow-hidden">
          <PlanRegistrationFormCore
            mode="modal"
            onClose={onClose}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
      </div>
    </Modal>
  )
}

