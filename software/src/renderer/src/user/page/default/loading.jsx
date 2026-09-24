// loading.js
import { message } from 'antd'

let loadingInstance = null

const loading = {
  show: (messageText = 'Đang tải...') => {
    if (!loadingInstance) {
      loadingInstance = message.loading({
        content: messageText,
        duration: 0 // Duration là 0 để loading không tự động ẩn
      })
    }
  },
  hide: () => {
    if (loadingInstance) {
      loadingInstance()
      loadingInstance = null
    }
  }
}

export default loading
