/**
 * Utility mở Form / Màn hình chi tiết độc lập
 * - Trên Electron: Mở BrowserWindow con (hỗ trợ kéo thả, không có sidebar, quản lý theo ID tránh trùng lặp)
 * - Trên Web: Mở New Tab trình duyệt (window.open url, '_blank')
 *
 * @param {Object} options
 * @param {string} options.path Đường dẫn route nội bộ (ví dụ: '/sub/system/user-detail/123')
 * @param {string} [options.title] Tiêu đề cửa sổ
 * @param {number} [options.width=1050] Chiều rộng cửa sổ (Electron)
 * @param {number} [options.height=750] Chiều cao cửa sổ (Electron)
 * @param {string} [options.id] Mã định danh duy nhất (để focus lại nếu cửa sổ đã mở)
 */
export const openChildWindow = ({
  path,
  title = 'Chi tiết dữ liệu',
  width = 1050,
  height = 750,
  id = null
}) => {
  if (!path) return

  // Đảm bảo path bắt đầu bằng /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const windowId = id || cleanPath

  if (window.electron?.openChildWindow) {
    window.electron.openChildWindow({
      routePath: cleanPath,
      title,
      width,
      height,
      id: windowId
    })
  } else if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('window:open-child', {
      routePath: cleanPath,
      title,
      width,
      height,
      id: windowId
    })
  } else {
    // Trên Web: Mở new tab với HashRouter path
    const targetUrl = `${window.location.origin}${window.location.pathname}#${cleanPath}`
    window.open(targetUrl, '_blank')
  }
}
