import { notification } from 'antd'

const key = 'handleSaveAll'

const notificationStyle = {}

export const showLoadingNotifiAorU = () => {
  notification.open({
    key,
    message: 'Đang lưu',
    description: 'Đang lưu dữ liệu...',
    duration: 0,
    type: 'info',
    style: notificationStyle
  })
}

export const showSuccessNotifiAorU = () => {
  notification.open({
    key,
    message: 'Thành công',
    description: 'Lưu dữ liệu thành công!',
    type: 'success',
    style: notificationStyle
  })
}

export const showErrorNotifiAorU = (errorMessages) => {
  notification.open({
    key,
    message: 'Lỗi',
    description: `Có lỗi xảy ra khi lưu dữ liệu: ${errorMessages.join(', ')}`,
    type: 'error',
    style: notificationStyle
  })
}

export const showWarningNotifiAorU = (warningMessage) => {
  notification.open({
    key,
    message: 'Cảnh báo',
    description: warningMessage,
    type: 'warning',
    style: notificationStyle
  })
}
export const showSuccessNotifiStatus = (description) => {
  notification.open({
    key,
    message: 'Thành công',
    description: description,
    type: 'success',
    style: notificationStyle
  })
}

export const closeNotifiAorU = () => {
  notification.close('handleSaveAll')
}
