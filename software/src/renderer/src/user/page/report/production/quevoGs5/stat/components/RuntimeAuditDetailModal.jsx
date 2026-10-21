import { RuntimeAuditDetailModal as SharedRuntimeAuditDetailModal } from '../../../hanoiGs1/stat/components/RuntimeAuditDetailModal'

// Nhật trình GS5 giữ giao diện và chế độ lưu cục bộ; quyền sửa trong modal này
// không phụ thuộc quyền Edit của trang.
export const RuntimeAuditDetailModal = (props) => (
  <SharedRuntimeAuditDetailModal {...props} localOnly canEdit showWorkingTag />
)
