import { notification } from 'antd'

const key = 'updatable'

const notificationStyle = {}

export const showLoadingNotifiD = () => {
  notification.open({
    key,
    message: 'Đang xử lý',
    description: 'Vui lòng chờ trong giây lát...',
    duration: 0,
    type: 'info',
    style: notificationStyle
  })
}

export const showSuccessNotifiD = () => {
  notification.open({
    key,
    message: 'Xóa thành công',
    description: 'Dữ liệu đã được xóa thành công.',
    type: 'success',
    style: notificationStyle
  })
}

export const showErrorNotifiD = (errorMessages) => {
  notification.open({
    key,
    message: 'Xóa thất bại',
    description: `Có lỗi xảy ra: ${errorMessages.join(', ')}`,
    type: 'error',
    style: notificationStyle
  })
}

export const showWarningNotifiD = (warningMessage) => {
  notification.open({
    key,
    message: 'Cảnh báo',
    description: warningMessage,
    type: 'warning',
    style: notificationStyle
  })
}

export const closeNotifiD = () => {
  notification.close(key)
}
