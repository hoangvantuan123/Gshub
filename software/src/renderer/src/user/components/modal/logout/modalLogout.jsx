/* eslint-disable react/prop-types */
import SystemConfirmModal from '../SystemConfirmModal'
import { useTranslation } from 'react-i18next'

export default function ModalLogout({ modalOpen, setModalOpen, confirmLogout }) {
  const { t } = useTranslation()

  return (
    <SystemConfirmModal
      isOpen={modalOpen}
      type="danger"
      confirmVariant="danger"
      title={t('Xác nhận đăng xuất')}
      message={t('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')}
      subMessage={t(
        'Sau khi đăng xuất, phiên làm việc hiện tại sẽ kết thúc và bạn cần đăng nhập lại để tiếp tục sử dụng.'
      )}
      confirmText={t('Đăng xuất')}
      cancelText={t('Hủy')}
      onConfirm={confirmLogout}
      onCancel={() => setModalOpen(false)}
    />
  )
}
