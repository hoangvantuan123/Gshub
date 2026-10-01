/* eslint-disable react/prop-types */
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageData } from '../../../../../context/PageDataContext'
import PlanRegistrationFormCore from './PlanRegistrationFormCore'

/**
 * PlanRegistrationCreateView - Màn hình tạo mới đăng ký báo cáo (KHSX & TKSX)
 * Chạy trên cửa sổ con độc lập (Electron Sub-window) hoặc Full View Tab
 */
export default function PlanRegistrationCreateView({ onClose, onSaveSuccess }) {
  const navigate = useNavigate()
  const { setStatusMessage } = usePageData()
  const loadingBarRef = useRef(null)

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else if (window.electron?.closeChildWindow) {
      window.electron.closeChildWindow()
    } else if (window.opener) {
      window.close()
    } else {
      navigate('/erp/u/report/registration')
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-white">
      <PlanRegistrationFormCore
        mode="full"
        loadingBarRef={loadingBarRef}
        setStatusMessage={setStatusMessage}
        onClose={handleClose}
        onSaveSuccess={onSaveSuccess}
      />
    </div>
  )
}
