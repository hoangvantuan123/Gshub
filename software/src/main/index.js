import { app, shell, BrowserWindow, ipcMain, screen, globalShortcut, clipboard } from 'electron'
import { join } from 'path'
import path from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import icon from '../../resources/icon.png?asset'
import { setupRealtimeIpc } from './realtime/index.js'
import { setupSecurityIpc } from './security/cryptoService.js'
import {
  setupUpdaterIpc,
  initNativeAutoUpdater,
  getRendererUrl,
  startAutoUpdateWatcher
} from './updater/index.js'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

process.on('uncaughtException', (error) => {
  console.error('[Electron Main Uncaught Exception]:', error?.message || error)
  if (error?.stack) {
    console.error(error.stack)
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('[Electron Main Unhandled Rejection]:', reason)
})

const execAsync = promisify(exec)

const BASE_URL = 'http://localhost:5173'

// Tối ưu hóa GPU & giới hạn RAM thông minh cho máy cấu hình thấp (Low-spec / POS / Office PC)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512')
app.commandLine.appendSwitch('renderer-process-limit', '4')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('log-level', '3')

let width, height
let mainWindow
let settingsWindow = null
let preMaxBounds = null
let isWindowMaximized = false
let currentWindowMode = 'login'

function toggleMaximizeWindow(win) {
  if (!win || win.isDestroyed()) return
  if (win === mainWindow && currentWindowMode === 'login') return // Không cho phép phóng to khi đang ở màn hình Login

  if (process.platform === 'darwin') {
    const isFull = win.isFullScreen()
    win.setFullScreen(!isFull)
    if (win === mainWindow) {
      isWindowMaximized = !isFull
    }
    win.webContents.send('window:maximized-change', !isFull)
    return
  }

  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
}

function getSettingsWindowPosition(settingsW, settingsH) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { center: true }
  }

  const [mainX, mainY] = mainWindow.getPosition()
  const [mainW] = mainWindow.getSize()

  const display = screen.getDisplayMatching(mainWindow.getBounds())
  const workArea = display.workArea

  const gap = 5
  let targetX = mainX + mainW + gap
  let targetY = mainY

  targetY = Math.max(
    workArea.y + 5,
    Math.min(targetY, workArea.y + workArea.height - settingsH - 5)
  )

  if (targetX + settingsW > workArea.x + workArea.width - 5) {
    const leftX = mainX - settingsW - gap
    if (leftX >= workArea.x + 5) {
      targetX = leftX
    } else {
      targetX = Math.max(
        workArea.x + 5,
        Math.min(targetX, workArea.x + workArea.width - settingsW - 5)
      )
    }
  }

  return { x: targetX, y: targetY }
}

function openSettingsWindow() {
  if (currentWindowMode !== 'login') {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide()
    }
    return
  }

  const settingsW = 580
  const settingsH = 680
  const pos = getSettingsWindowPosition(settingsW, settingsH)

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (!pos.center) {
      settingsWindow.setPosition(pos.x, pos.y)
    }
    settingsWindow.show()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: settingsW,
    height: settingsH,
    minWidth: settingsW,
    maxWidth: settingsW,
    minHeight: settingsH,
    maxHeight: settingsH,
    resizable: false,
    ...(pos.center ? { center: true } : { x: pos.x, y: pos.y }),
    show: true,
    frame: false,
    autoHideMenuBar: true,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : null,
    modal: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  settingsWindow.setMenuBarVisibility(false)

  settingsWindow.on('close', (e) => {
    if (
      settingsWindow &&
      !settingsWindow.isDestroyed() &&
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      e.preventDefault()
      settingsWindow.hide()
    }
  })

  const loadUrl = getRendererUrl('/erp/u/settings')
  settingsWindow.loadURL(loadUrl)
}

function getCursorAdjustedPosition(windowWidth, windowHeight) {
  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)

  const adjustedX = Math.min(
    cursorPoint.x,
    display.workArea.x + display.workArea.width - windowWidth
  )
  const adjustedY = Math.min(
    cursorPoint.y,
    display.workArea.y + display.workArea.height - windowHeight
  )

  return {
    x: adjustedX,
    y: adjustedY
  }
}

function registerWindowShortcuts(win) {
  if (!win || win.isDestroyed()) return

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return

    // DevTools lock in Production
    if (
      !is.dev &&
      (input.key === 'F12' || (input.control && input.shift && input.key?.toLowerCase() === 'i'))
    ) {
      event.preventDefault()
      return
    }

    const isCtrlOrCmd = input.control || input.meta
    if (isCtrlOrCmd) {
      const key = input.key ? input.key.toLowerCase() : ''
      // Ctrl + S: Save
      if (key === 's' && !input.shift) {
        event.preventDefault()
        win.webContents.send('action:save')
      }
      // Ctrl + Q: Search (Query data from server)
      else if (key === 'q') {
        event.preventDefault()
        win.webContents.send('action:search')
      }
      // Ctrl + F: Find (Filter / Find on Sheet)
      else if (key === 'f') {
        event.preventDefault()
        win.webContents.send('action:find')
      }
      // Ctrl + Shift + D: Delete sheet row (or Ctrl + Delete)
      else if (
        (key === 'd' && input.shift) ||
        input.key === 'Delete' ||
        input.key === 'Del' ||
        key === 'delete'
      ) {
        event.preventDefault()
        win.webContents.send('action:delete')
      }
    }
  })
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workAreaSize = primaryDisplay.workAreaSize
  width = workAreaSize.width
  height = workAreaSize.height

  mainWindow = new BrowserWindow({
    width: 750,
    height: 420,
    minWidth: 750,
    maxWidth: 750,
    minHeight: 420,
    maxHeight: 420,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux'
      ? {
          icon
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      nativeWindowOpen: true,
      backgroundThrottling: true,
      webgl: true,
      devTools: is.dev // Khóa hoàn toàn F12 / DevTools trên môi trường Production
    }
  })

  // Đăng ký phím tắt hệ thống (Ctrl+S, Ctrl+F, Ctrl+Del) và bảo mật DevTools
  registerWindowShortcuts(mainWindow)

  mainWindow.setMenuBarVisibility(false)

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.session.setSpellCheckerLanguages(['vi-VN', 'en-US'])
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Pre-warm settingsWindow in background so clicking Settings icon is 0ms instant!
    setTimeout(() => {
      if (!settingsWindow) {
        openSettingsWindow()
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.hide()
        }
      }
    }, 1000)
  })

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (currentWindowMode === 'login') {
        mainWindow.unmaximize()
        return
      }
      isWindowMaximized = true
      mainWindow.webContents.send('window:maximized-change', true)
    }
  })

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      isWindowMaximized = false
      mainWindow.webContents.send('window:maximized-change', false)
    }
  })

  mainWindow.on('enter-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (currentWindowMode === 'login') {
        mainWindow.setFullScreen(false)
        return
      }
      isWindowMaximized = true
      mainWindow.webContents.send('window:maximized-change', true)
    }
  })

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      isWindowMaximized = false
      mainWindow.webContents.send('window:maximized-change', false)
    }
  })

  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed() && currentWindowMode === 'main') {
      const isMax = mainWindow.isMaximized() || mainWindow.isFullScreen()
      isWindowMaximized = isMax
      mainWindow.webContents.send('window:maximized-change', isMax)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return {
      action: 'deny'
    }
  })

  const loadUrl = getRendererUrl('/erp/u/login')
  mainWindow.loadURL(loadUrl).catch(() => {
    const html = `
        <html>
          <head><title>Offline</title></head>
          <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
            <h2>Không thể kết nối tới ứng dụng.<br />Vui lòng kiểm tra mạng hoặc thử lại sau.</h2>
          </body>
        </html>
      `
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  })

  const { Menu } = require('electron')

  const menu = Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        {
          type: 'separator'
        },
        {
          role: 'resetZoom'
        },
        {
          role: 'zoomIn'
        },
        {
          role: 'zoomOut'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          role: 'reload'
        },
        {
          role: 'forceReload'
        },
        {
          role: 'toggleDevTools'
        },
        {
          role: 'undo'
        },
        {
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        },
        {
          role: 'selectAll'
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ]
    }
  ])

  Menu.setApplicationMenu(menu)
}

ipcMain.on('open-pdf-window-view', (_, pdfUrl) => {
  const win = new BrowserWindow({
    width: 650,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  })

  win.loadURL(pdfUrl)
})

ipcMain.on('open-pdf-window', async (event, pdfUrl) => {
  const printWindow = new BrowserWindow({
    width: 650,
    height: 1000,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  })

  printWindow.loadURL(pdfUrl)

  printWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true
        },
        (success, errorType) => {
          if (!success) {
            console.error('error', errorType)
          } else {
            console.log('In thành công')
          }
        }
      )
    }, 1500) // ← điều chỉnh thời gian nếu cần
  })

  printWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Không tải được file PDF:', errorDescription)
    printWindow.close()
  })
})

ipcMain.on('PRINT_PDF', (event, url) => {
  const win = new BrowserWindow({ show: false })

  win.loadURL(url)
  win.webContents.on('did-finish-load', () => {
    win.webContents.print({ silent: false, printBackground: true }, () => win.close())
  })
})

ipcMain.handle('save-to-file', async (event, filePath, data) => {
  const userDirectory = app.getPath('userData')
  const normalizedPath = path.join(userDirectory, filePath)
  const directory = path.dirname(normalizedPath)
  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, {
        recursive: true
      })
    }

    await fs.promises.writeFile(normalizedPath, JSON.stringify(data, null, 2))
    return 'File saved successfully'
  } catch (error) {
    throw new Error(`Failed to save file: ${error.message}`)
  }
})

ipcMain.handle('read-from-file', async (event, filePath) => {
  const userDirectory = app.getPath('userData')
  const normalizedPath = path.join(userDirectory, filePath)

  try {
    if (!fs.existsSync(normalizedPath)) {
      // Nếu file chưa có, trả về mảng rỗng thay vì lỗi
      return []
    }

    const fileData = await fs.promises.readFile(normalizedPath, 'utf-8')
    return JSON.parse(fileData)
  } catch (error) {
    console.error('Failed to read file:', error)
    // Trả về giá trị mặc định thay vì throw error
    return []
  }
})

ipcMain.handle('delete-file', async (_, filePath) => {
  const userDirectory = app.getPath('userData')
  const normalizedPath = path.join(userDirectory, filePath)

  try {
    if (fs.existsSync(normalizedPath)) {
      fs.unlinkSync(normalizedPath)
      return {
        success: true
      }
    } else {
      return {
        success: false,
        error: 'File not found'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('save-binary-file', async (event, filePath, bufferBase64) => {
  const userDirectory = app.getPath('userData')
  const normalizedPath = path.join(userDirectory, filePath)
  const directory = path.dirname(normalizedPath)
  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }
    const buffer = Buffer.from(bufferBase64, 'base64')
    await fs.promises.writeFile(normalizedPath, buffer)
    return 'Binary file saved successfully'
  } catch (error) {
    throw new Error(`Failed to save binary file: ${error.message}`)
  }
})

ipcMain.handle('get-template-path', async (event, folderName, fileName) => {
  const userDirectory = app.getPath('userData')
  const updatedPath = path.join(userDirectory, folderName, fileName)
  if (fs.existsSync(updatedPath)) {
    return updatedPath
  }
  const defaultPath = path.join(app.getAppPath(), folderName, fileName)
  return defaultPath
})

async function convertDocxToPdf(docxPath, pdfPath) {
  if (process.platform === 'win32') {
    const psCommand = `
      $word = New-Object -ComObject Word.Application;
      $word.Visible = $false;
      try {
        $doc = $word.Documents.Open('${docxPath.replace(/'/g, "''")}');
        $doc.SaveAs([ref]'${pdfPath.replace(/'/g, "''")}', [ref]17);
        $doc.Close([ref]0);
      } finally {
        $word.Quit();
      }
    `
    const base64Command = Buffer.from(psCommand, 'utf16le').toString('base64')
    await execAsync(`powershell -NoProfile -EncodedCommand ${base64Command}`)
  } else if (process.platform === 'darwin') {
    const appleScript = `
      tell application "Microsoft Word"
        set doc to open POSIX file "${docxPath}"
        save as doc file format format PDF file name "${pdfPath}"
        close doc saving no
      end tell
    `
    try {
      await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`)
    } catch (err) {
      try {
        await execAsync(
          `/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir "${path.dirname(pdfPath)}" "${docxPath}"`
        )
      } catch (err2) {
        throw new Error(
          'Không tìm thấy Microsoft Word hoặc LibreOffice trên macOS để chuyển đổi PDF.'
        )
      }
    }
  } else {
    throw new Error('Hệ điều hành không hỗ trợ chuyển đổi DOCX sang PDF tự động.')
  }
}

ipcMain.handle('convert-docx-to-pdf', async (event, docxRelativePath, pdfRelativePath) => {
  const userDirectory = app.getPath('userData')
  const docxPath = path.isAbsolute(docxRelativePath)
    ? docxRelativePath
    : path.join(userDirectory, docxRelativePath)
  const pdfPath = path.isAbsolute(pdfRelativePath)
    ? pdfRelativePath
    : path.join(userDirectory, pdfRelativePath)

  if (!fs.existsSync(docxPath)) {
    throw new Error(`File DOCX không tồn tại tại đường dẫn: ${docxPath}`)
  }

  const pdfDir = path.dirname(pdfPath)
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true })
  }

  await convertDocxToPdf(docxPath, pdfPath)
  return pdfPath
})

ipcMain.handle('open-path', async (event, relativePath) => {
  const userDirectory = app.getPath('userData')
  const fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(userDirectory, relativePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Đường dẫn không tồn tại: ${fullPath}`)
  }
  await shell.openPath(fullPath)
  return true
})

ipcMain.handle('show-item-in-folder', async (event, relativePath) => {
  const userDirectory = app.getPath('userData')
  const fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(userDirectory, relativePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Đường dẫn không tồn tại: ${fullPath}`)
  }
  shell.showItemInFolder(fullPath)
  return true
})

function openAppRouteInNewWindow(routePath) {
  const newWindow = new BrowserWindow({
    width: 550,
    height: 1000,
    minWidth: 550,
    maxWidth: 550,
    minHeight: 1000,
    maxHeight: 1000,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      nativeWindowOpen: true
    }
  })

  newWindow.webContents.on('did-finish-load', () => {
    newWindow.webContents.session.setSpellCheckerLanguages(['vi-VN', 'en-US'])
  })

  newWindow.loadURL(getRendererUrl(routePath)).catch(() => {
    const html = `
      <html>
        <head><title>Offline</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
          <h2>Không thể kết nối tới ứng dụng.<br />Vui lòng kiểm tra mạng hoặc thử lại sau.</h2>
        </body>
      </html>
    `
    newWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  })
}
function openRouteInNewWindow(routePath) {
  const windowWidth = width - 150
  const windowHeight = height - 80
  const position = getCursorAdjustedPosition(windowWidth, windowHeight)

  const newWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: position.x,
    y: position.y,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      nativeWindowOpen: true
    }
  })

  newWindow.webContents.on('did-finish-load', () => {
    newWindow.webContents.session.setSpellCheckerLanguages(['vi-VN', 'en-US'])
  })

  newWindow.loadURL(getRendererUrl(routePath)).catch(() => {
    const html = `
      <html>
        <head><title>Offline</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
          <h2>Không thể kết nối tới ứng dụng.<br />Vui lòng kiểm tra mạng hoặc thử lại sau.</h2>
        </body>
      </html>
    `
    newWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  })
}
const childWindows = new Map()

function openChildWindow(options = {}) {
  const {
    routePath = '',
    title = 'GsHub ERP',
    width: requestedW = 1050,
    height: requestedH = 750,
    id = null
  } = options

  if (id && childWindows.has(id)) {
    const existingWin = childWindows.get(id)
    if (existingWin && !existingWin.isDestroyed()) {
      existingWin.show()
      existingWin.focus()
      return
    }
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workArea
  const winW = Math.min(requestedW, workArea.width - 40)
  const winH = Math.min(requestedH, workArea.height - 40)

  const childWin = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: 600,
    minHeight: 400,
    center: true,
    title: title,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  })

  childWin.webContents.on('did-finish-load', () => {
    childWin.webContents.session.setSpellCheckerLanguages(['vi-VN', 'en-US'])
  })

  childWin.on('maximize', () => {
    if (childWin && !childWin.isDestroyed()) {
      childWin.webContents.send('window:maximized-change', true)
    }
  })

  childWin.on('unmaximize', () => {
    if (childWin && !childWin.isDestroyed()) {
      childWin.webContents.send('window:maximized-change', false)
    }
  })

  childWin.once('ready-to-show', () => {
    childWin.show()
  })

  if (id) {
    childWindows.set(id, childWin)
    childWin.on('closed', () => {
      childWindows.delete(id)
    })
  }

  const loadUrl = getRendererUrl(routePath)

  childWin.loadURL(loadUrl).catch(() => {
    const html = `
      <html>
        <head><title>Offline</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
          <h2>Không thể kết nối tới ứng dụng.<br />Vui lòng kiểm tra mạng hoặc thử lại sau.</h2>
        </body>
      </html>
    `
    childWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  })
}

function closeAllChildWindows() {
  for (const [id, win] of childWindows.entries()) {
    if (win && !win.isDestroyed()) {
      try {
        win.destroy()
      } catch (err) {
        console.error(`Error closing child window ${id}:`, err)
      }
    }
  }
  childWindows.clear()

  BrowserWindow.getAllWindows().forEach((win) => {
    if (win && !win.isDestroyed() && win !== mainWindow) {
      try {
        win.destroy()
      } catch (err) {
        console.error('Error destroying extra window:', err)
      }
    }
  })
}

function setWindowToLoginMode() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  currentWindowMode = 'login'
  isWindowMaximized = false

  // 1. Cho phép resize & unmaximize tạm thời để không bị khóa trạng thái maximize trên Windows
  mainWindow.setResizable(true)
  mainWindow.setMaximizable(true)
  mainWindow.setFullScreenable(true)

  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false)
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  }

  // 2. Mở rộng min/max bounds trước khi đặt kích thước chuẩn
  mainWindow.setMinimumSize(100, 100)
  mainWindow.setMaximumSize(100000, 100000)

  // 3. Đặt kích thước cố định màn hình đăng nhập (750x420)
  mainWindow.setSize(750, 420)
  mainWindow.center()

  // 4. Khóa cứng kích thước (Fixed frame, không kéo dãn, không phóng to)
  mainWindow.setMinimumSize(750, 420)
  mainWindow.setMaximumSize(750, 420)
  mainWindow.setResizable(false)
  mainWindow.setMaximizable(false)
  mainWindow.setFullScreenable(false)
  mainWindow.setAutoHideMenuBar(true)
  mainWindow.setMenuBarVisibility(false)
}

function getSystemInfo() {
  const interfaces = os.networkInterfaces()
  let localIP = 'Unknown'

  for (const [name, list] of Object.entries(interfaces)) {
    console.log(`Interface: ${name}`)
    for (const iface of list) {
      console.log(
        `  -> IP: ${iface.address}, Family: ${iface.family}, MAC: ${iface.mac}, Internal: ${iface.internal}`
      )
    }
  }

  const cpus = os.cpus()
  const user = os.userInfo()

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    osType: os.type(),
    arch: os.arch(),
    release: os.release(),
    uptimeSeconds: os.uptime(),
    totalMemoryGB: (os.totalmem() / 1024 ** 3).toFixed(2),
    freeMemoryGB: (os.freemem() / 1024 ** 3).toFixed(2),
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
    localIP,
    username: user.username,
    homedir: user.homedir,
    networkInterfaces: interfaces
  }
}

ipcMain.handle('get-system-info', async () => {
  return getSystemInfo()
})

app.whenReady().then(() => {
  const primaryDisplay = screen.getPrimaryDisplay()
  const workAreaSize = primaryDisplay.workAreaSize
  width = workAreaSize.width
  height = workAreaSize.height

  electronApp.setAppUserModelId('com.gshub.app')

  // Khởi động Hệ thống Bảo mật & Mã hóa đối xứng AES-256-GCM
  setupSecurityIpc()

  // Khởi động Hệ thống Cập nhật tự động 2 tầng (OTA Hot Update & Full Native Update)
  setupUpdaterIpc()
  initNativeAutoUpdater()
  startAutoUpdateWatcher()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.on('open-route-in-new-window', (_, routePath) => openRouteInNewWindow(routePath))
  ipcMain.on('open-app-route-in-new-window', (_, routePath) => openAppRouteInNewWindow(routePath))
  ipcMain.on('window:open-child', (_, options) => openChildWindow(options))
  ipcMain.on('window:close-all-children', () => closeAllChildWindows())

  ipcMain.on('app:logout', () => {
    // 1. Đóng sạch toàn bộ các cửa sổ con đang mở
    closeAllChildWindows()

    // 2. Đóng cửa sổ Settings nếu đang mở
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide()
    }

    // 3. Đưa mainWindow về chế độ Login và cố định kích thước 750x420
    if (mainWindow && !mainWindow.isDestroyed()) {
      setWindowToLoginMode()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('auth:logout-event')
    }
  })

  ipcMain.on('window:set-login-size', () => {
    setWindowToLoginMode()
  })

  ipcMain.on('window:set-main-size', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide()
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (currentWindowMode === 'main') return
      currentWindowMode = 'main'
      // Tự động kiểm tra bản cập nhật khi người dùng login vào màn hình chính
      startAutoUpdateWatcher()
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width: sysW, height: sysH } = primaryDisplay.workAreaSize
      mainWindow.setResizable(true)
      mainWindow.setMaximizable(true)
      mainWindow.setFullScreenable(true)
      mainWindow.setMinimumSize(800, 500)
      mainWindow.setMaximumSize(100000, 100000)
      const targetW = Math.max(900, Math.min(sysW - 80, 1600))
      const targetH = Math.max(600, Math.min(sysH - 60, 1000))
      mainWindow.setSize(targetW, targetH)
      mainWindow.center()
      preMaxBounds = mainWindow.getBounds()
      isWindowMaximized = false
      mainWindow.setAutoHideMenuBar(true)
      mainWindow.setMenuBarVisibility(false)
    }
  })

  ipcMain.on('window:open-settings-window', () => {
    if (currentWindowMode === 'login') {
      openSettingsWindow()
    } else {
      console.warn('🔒 Security Block: Refused opening settings window after login.')
    }
  })
  ipcMain.on('window:close-settings-window', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.hide()
    }
  })

  ipcMain.on('window:set-busy', (event, isBusy) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win && !win.isDestroyed()) {
        win.setProgressBar(isBusy ? 2 : -1)
      }
    } catch {}
  })

  ipcMain.handle('clipboard:write-text', (_, text) => {
    try {
      clipboard.writeText(typeof text === 'string' ? text : String(text || ''))
      return true
    } catch (err) {
      console.error('❌ Native Clipboard write error:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:read-text', () => {
    try {
      return clipboard.readText()
    } catch {
      return ''
    }
  })

  ipcMain.on('env-change', (_, env) => {
    // Security Guard: Prevent changing server environment / host endpoint when logged in
    if (currentWindowMode !== 'login') {
      console.warn(
        '🔒 Security Block: Changing server environment is strictly forbidden after login.'
      )
      return
    }
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('env-changed', env)
      }
    })
  })

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && !win.isDestroyed()) win.close()
  })

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && !win.isDestroyed()) win.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    toggleMaximizeWindow(win)
  })

  ipcMain.on('window:unmaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (!win || win.isDestroyed()) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else if (win.isFullScreen()) {
      win.setFullScreen(false)
    }
  })

  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (!win || win.isDestroyed()) return false
    return win.isMaximized() || win.isFullScreen()
  })

  // Realtime gRPC Stream IPC setup
  setupRealtimeIpc(mainWindow)

  createWindow()

  globalShortcut.register('Control+Alt+Space', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
