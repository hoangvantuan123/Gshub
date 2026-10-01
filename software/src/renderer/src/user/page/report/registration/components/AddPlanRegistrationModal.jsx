/* eslint-disable react/prop-types */
import { Modal } from 'antd'
import PlanRegistrationFormCore from './PlanRegistrationFormCore'

/**
 * AddPlanRegistrationModal - Modal Pop-up Đăng ký nạp báo cáo nhanh
 * Tái sử dụng 100% logic từ PlanRegistrationFormCore
 */
export default function AddPlanRegistrationModal({ isOpen, onClose, onSaveSuccess }) {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={1380}
      styles={{
        content: {
          padding: 0,
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column'
        },
        body: { padding: 0, height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }
      }}
    >
      <div className="flex flex-col h-full w-full bg-white overflow-hidden">
        <PlanRegistrationFormCore
          mode="modal"
          onClose={onClose}
          onSaveSuccess={onSaveSuccess}
        />
      </div>
    </Modal>
  )
}
