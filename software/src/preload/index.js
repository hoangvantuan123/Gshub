import { contextBridge, ipcRenderer } from 'electron'

const api = {
  openRoute: (path) => ipcRenderer.send('open-route-in-new-window', path),
  openChildWindow: (options) => ipcRenderer.send('window:open-child', options),
  saveDataToFile: (filePath, data) => ipcRenderer.invoke('save-to-file', filePath, data),
  saveBinaryFile: (filePath, bufferBase64) =>
    ipcRenderer.invoke('save-binary-file', filePath, bufferBase64),
  saveFileAbsolute: (fullFilePath, base64Data, options) =>
    ipcRenderer.invoke('file:save-file-absolute', fullFilePath, base64Data, options),
  getDefaultDownloadPath: () => ipcRenderer.invoke('system:get-download-path'),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:select-directory', defaultPath),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:show-save-dialog', options),
  getTemplatePath: (folderName, fileName) =>
    ipcRenderer.invoke('get-template-path', folderName, fileName),
  convertDocxToPdf: (docxRelativePath, pdfRelativePath) =>
    ipcRenderer.invoke('convert-docx-to-pdf', docxRelativePath, pdfRelativePath),
  openPath: (relativePath) => ipcRenderer.invoke('open-path', relativePath),
  showItemInFolder: (relativePath) => ipcRenderer.invoke('show-item-in-folder', relativePath),
  readDataFromFile: (filePath) => ipcRenderer.invoke('read-from-file', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  openPDFWindow: (pdfUrl) => ipcRenderer.send('open-pdf-window', pdfUrl),
  openPDFWindowView: (pdfUrl) => ipcRenderer.send('open-pdf-window-view', pdfUrl),
  openAppRoute: (path) => ipcRenderer.send('open-app-route-in-new-window', path),
  printPDF: (url) => ipcRenderer.send('PRINT_PDF', url),

  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  encryptDevicePayload: (payload) => ipcRenderer.invoke('security:encrypt-device-payload', payload),
  getDeviceToken: (userToken) => ipcRenderer.invoke('security:get-device-token', userToken),

  // Window control & sizing
  logout: () => ipcRenderer.send('app:logout'),
  closeAllChildWindows: () => ipcRenderer.send('window:close-all-children'),
  setLoginSize: () => ipcRenderer.send('window:set-login-size'),
  setMainSize: () => ipcRenderer.send('window:set-main-size'),
  openSettingsWindow: () => ipcRenderer.send('window:open-settings-window'),
  closeSettingsWindow: () => ipcRenderer.send('window:close-settings-window'),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  toggleMaximize: () => ipcRenderer.send('window:maximize'),
  unmaximize: () => ipcRenderer.send('window:unmaximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback) => {
    const listener = (_, isMax) => callback(isMax)
    ipcRenderer.on('window:maximized-change', listener)
    return () => ipcRenderer.removeListener('window:maximized-change', listener)
  },
  setBusy: (isBusy) => ipcRenderer.send('window:set-busy', isBusy),
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  notifyEnvChange: (env) => ipcRenderer.send('env-change', env),
  onEnvChanged: (callback) => {
    const listener = (_, env) => callback(env)
    ipcRenderer.on('env-changed', listener)
    return () => ipcRenderer.removeListener('env-changed', listener)
  },

  // Keyboard Action Listeners (Ctrl+S, Ctrl+F, Ctrl+Del)
  onAppAction: (callback) => {
    const listener = (_, action) => callback(action)
    ipcRenderer.on('app-action', listener)
    return () => ipcRenderer.removeListener('app-action', listener)
  },
  onActionSave: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('action:save', listener)
    return () => ipcRenderer.removeListener('action:save', listener)
  },
  onActionSearch: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('action:search', listener)
    return () => ipcRenderer.removeListener('action:search', listener)
  },
  onActionFind: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('action:find', listener)
    return () => ipcRenderer.removeListener('action:find', listener)
  },
  onActionDelete: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('action:delete', listener)
    return () => ipcRenderer.removeListener('action:delete', listener)
  },

  onLogoutEvent: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('auth:logout-event', listener)
    return () => ipcRenderer.removeListener('auth:logout-event', listener)
  },

  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, listener) => {
      const wrappedListener = (event, ...args) => listener(event, ...args)
      ipcRenderer.on(channel, wrappedListener)
      return () => ipcRenderer.removeListener(channel, wrappedListener)
    },
    removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  },

  // Realtime Streaming API
  realtimeConnect: (options) => ipcRenderer.send('realtime:connect', options),
  realtimeDisconnect: () => ipcRenderer.send('realtime:disconnect'),
  realtimePublish: (data) => ipcRenderer.invoke('realtime:publish', data),
  onRealtimeStatus: (callback) => {
    const listener = (_, data) => callback(data)
    ipcRenderer.on('realtime:status', listener)
    return () => ipcRenderer.removeListener('realtime:status', listener)
  },
  onRealtimeData: (callback) => {
    const listener = (_, data) => callback(data)
    ipcRenderer.on('realtime:data-received', listener)
    return () => ipcRenderer.removeListener('realtime:data-received', listener)
  },

  // 2-Tier Auto Updater API (Hot OTA UI & Full Native)
  updater: {
    getVersions: () => ipcRenderer.invoke('updater:get-versions'),
    getReleases: () => ipcRenderer.invoke('updater:get-releases'),
    checkAll: () => ipcRenderer.invoke('updater:check-all'),
    checkNative: () => ipcRenderer.invoke('updater:check-native'),
    checkUi: () => ipcRenderer.invoke('updater:check-ui'),
    downloadUi: () => ipcRenderer.invoke('updater:download-ui'),
    applyUiReload: () => ipcRenderer.invoke('updater:apply-ui-reload'),
    downloadNative: () => ipcRenderer.invoke('updater:download-native'),
    installNative: () => ipcRenderer.invoke('updater:install-native'),
    openUrl: (url) => ipcRenderer.invoke('updater:open-url', url),
    setGithubRepo: (config) => ipcRenderer.invoke('updater:set-github-repo', config),
    onStatusChanged: (callback) => {
      const listener = (_, state) => callback(state)
      ipcRenderer.on('updater:status-changed', listener)
      return () => ipcRenderer.removeListener('updater:status-changed', listener)
    }
  },

  // DataHub Direct gRPC API (:9644)
  datahub: {
    queryWorkProcess: (payload) => ipcRenderer.invoke('datahub:query-work-process', payload),
    getFactories: (payload) => ipcRenderer.invoke('datahub:get-factories', payload)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
  } catch (error) {
    console.error('❌ Lỗi khi expose Electron API:', error)
  }
} else {
  window.electron = api
}
