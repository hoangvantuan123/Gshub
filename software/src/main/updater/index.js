import { app, ipcMain, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import fs from 'fs'
import crypto from 'crypto'
import https from 'https'
import http from 'http'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { is } from '@electron-toolkit/utils'

const execAsync = promisify(exec)

// Khóa bảo mật AES-256 dùng để giải mã gói OTA giao diện
const OTA_SECRET_PASS = 'GsHub-Enterprise-ERP-Secret-OTA-Key-2026'
const OTA_SECRET_KEY = crypto.createHash('sha256').update(OTA_SECRET_PASS).digest()

function decryptOtaBuffer(encryptedBuffer) {
  const iv = encryptedBuffer.subarray(0, 16)
  const ciphertext = encryptedBuffer.subarray(16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', OTA_SECRET_KEY, iv)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

// ==========================================
// CẤU HÌNH GITHUB REPOSITORY DÙNG ĐỂ UPDATE
// ==========================================
export const GITHUB_CONFIG = {
  owner: 'hoangvantuan123',
  repo: 'gshub-releases',
  // Link raw file manifest để kiểm tra Hot Update UI nhanh
  get rawUiManifestUrl() {
    return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/ui-release.json`
  },
  // API lấy release mới nhất của UI từ GitHub Releases
  get latestUiReleaseUrl() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}/releases/tags/ui-latest`
  },
  // API lấy danh sách releases từ GitHub Releases
  get releasesApiUrl() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}/releases`
  }
}

// Đường dẫn lưu trữ UI bundle cục bộ trên máy người dùng
const USER_DATA_DIR = app.getPath('userData')
const UI_BUNDLES_DIR = join(USER_DATA_DIR, 'ui_bundles')
const ACTIVE_UI_CONFIG_PATH = join(USER_DATA_DIR, 'active_ui.json')
const DEFAULT_RENDERER_DIR = join(__dirname, '../renderer')

// State quản lý trạng thái update trong Main process
let updateState = {
  status: 'idle', // 'idle' | 'checking' | 'ui-available' | 'native-available' | 'downloading' | 'ui-ready' | 'native-ready' | 'error' | 'up-to-date',
  message: 'Hệ thống đã sẵn sàng',
  nativeVersion: app.getVersion(),
  uiVersion: app.getVersion(),
  newUiVersion: null,
  newNativeVersion: null,
  progress: 0,
  releaseNotes: '',
  uiDownloadUrl: '',
  nativeDownloadUrl: ''
}

// ==========================================
// 1. QUẢN LÝ PHIÊN BẢN VÀ ĐƯỜNG DẪN RENDERER
// ==========================================

export function getActiveUiInfo() {
  const nativeVersion = app.getVersion()

  try {
    if (fs.existsSync(ACTIVE_UI_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(ACTIVE_UI_CONFIG_PATH, 'utf8'))
      const customUiVersion = data.uiVersion || '0.0.0'

      // Nếu phiên bản app native chính thức lớn hơn hoặc bằng bản UI OTA cũ đã lưu
      // -> Bản build native đã chứa renderer mới nhất, lập tức bỏ qua UI OTA cũ
      if (!isNewerVersion(customUiVersion, nativeVersion)) {
        console.log(
          `[Updater] Phiên bản Native (v${nativeVersion}) mới hơn hoặc bằng UI OTA cũ (v${customUiVersion}). Tự động dùng UI gốc của bộ cài.`
        )
        try {
          fs.unlinkSync(ACTIVE_UI_CONFIG_PATH)
        } catch {}

        return {
          bundlePath: DEFAULT_RENDERER_DIR,
          uiVersion: nativeVersion,
          isCustomBundle: false
        }
      }

      const indexPath = join(data.bundlePath, 'index.html')
      if (fs.existsSync(indexPath)) {
        return {
          bundlePath: data.bundlePath,
          uiVersion: customUiVersion,
          isCustomBundle: true
        }
      }
    }
  } catch (err) {
    console.warn('[Updater] Không thể đọc active_ui.json, dùng bundle mặc định:', err.message)
  }

  return {
    bundlePath: DEFAULT_RENDERER_DIR,
    uiVersion: nativeVersion,
    isCustomBundle: false
  }
}

export function getRendererUrl(routePath = '') {
  const normalizedRoute = routePath.startsWith('#')
    ? routePath
    : routePath.startsWith('/')
      ? `#${routePath}`
      : `#/${routePath}`

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const devBase = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
    return `${devBase}/${normalizedRoute}`
  }

  const { bundlePath } = getActiveUiInfo()
  const indexPath = join(bundlePath, 'index.html')

  // Trả về định dạng file:///...#route
  const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`
  return `${fileUrl}${normalizedRoute}`
}

// Thông báo trạng thái tới tất cả các cửa sổ Renderer
function broadcastStatus(patch = {}) {
  updateState = { ...updateState, ...patch }
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('updater:status-changed', updateState)
    }
  })
}

// Helper tải file qua HTTPS
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const options = {
      headers: {
        'User-Agent': 'GsHub-Desktop-App',
        Accept: 'application/octet-stream, application/json, */*'
      }
    }

    const request = client.get(url, options, (res) => {
      // Xử lý chuyển hướng redirect (301, 302) của GitHub Releases
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Lỗi tải file: HTTP ${res.statusCode}`))
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
      let downloadedBytes = 0

      const fileStream = fs.createWriteStream(destPath)
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length
        if (totalBytes > 0 && onProgress) {
          const percent = Math.round((downloadedBytes / totalBytes) * 100)
          onProgress(percent)
        }
      })

      fileStream.on('finish', () => {
        fileStream.close(() => resolve(destPath))
      })

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => reject(err))
      })
      res.pipe(fileStream)
    })

    request.on('error', reject)
    request.setTimeout(30000, () => {
      request.destroy()
      reject(new Error('Hết thời gian chờ tải file (Timeout)'))
    })
  })
}

// Helper giải nén file zip (Sử dụng lệnh hệ thống OS có sẵn, không cần native library phức tạp)
async function extractZip(zipPath, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  if (process.platform === 'win32') {
    // Windows PowerShell giải nén cực nhanh và an toàn
    const command = `powershell.exe -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`
    await execAsync(command)
  } else {
    // macOS / Linux sử dụng tar hoặc unzip
    const command = `unzip -o -q "${zipPath}" -d "${targetDir}"`
    await execAsync(command)
  }
}

// So sánh phiên bản semver (v1.0.1 > v1.0.0)
function isNewerVersion(remoteVer, currentVer) {
  if (!remoteVer || !currentVer) return false
  const clean = (v) => v.replace(/^v/, '').split('.').map(Number)
  const [r1 = 0, r2 = 0, r3 = 0] = clean(remoteVer)
  const [c1 = 0, c2 = 0, c3 = 0] = clean(currentVer)

  if (r1 > c1) return true
  if (r1 === c1 && r2 > c2) return true
  if (r1 === c1 && r2 === c2 && r3 > c3) return true
  return false
}

// ==========================================
// 2. LOẠI 1: HOT UPDATE GIAO DIỆN (OTA UI UPDATE)
// ==========================================

export async function checkUiHotUpdate(options = { autoDownload: true }) {
  const { uiVersion } = getActiveUiInfo()
  const nativeVersion = app.getVersion()
  const baseVersion = isNewerVersion(uiVersion, nativeVersion) ? uiVersion : nativeVersion

  try {
    broadcastStatus({
      status: 'checking',
      message: 'Đang kiểm tra cập nhật giao diện...'
    })

    // 1. Thử kiểm tra qua raw json (Cách nhanh nhất và không bị giới hạn GitHub API rate-limit)
    const manifest = await fetchJson(GITHUB_CONFIG.rawUiManifestUrl).catch(() => null)

    if (manifest && manifest.version) {
      // Chỉ tải và áp dụng UI mới khi version OTA lớn hơn cả bản build Native và bản UI hiện tại
      if (isNewerVersion(manifest.version, baseVersion)) {
        broadcastStatus({
          status: 'ui-available',
          message: `Phát hiện giao diện mới v${manifest.version}!`,
          newUiVersion: manifest.version,
          releaseNotes: manifest.description || 'Cập nhật và tối ưu giao diện người dùng.',
          uiDownloadUrl: manifest.downloadUrl
        })

        // Tự động tải ngầm và chuẩn bị sẵn nếu bật autoDownload
        if (options.autoDownload && manifest.downloadUrl) {
          updateState.uiDownloadUrl = manifest.downloadUrl
          updateState.newUiVersion = manifest.version
          downloadAndApplyUiUpdate().catch((err) => {
            console.warn('[Auto OTA Download Error]:', err.message)
          })
        }

        return { available: true, manifest }
      }
    }

    // 2. Nếu không có bản mới
    broadcastStatus({
      status: 'up-to-date',
      message: 'Giao diện đã ở phiên bản mới nhất.'
    })
    return { available: false }
  } catch (error) {
    console.error('[Updater OTA Error]:', error.message)
    broadcastStatus({
      status: 'error',
      message: `Lỗi kiểm tra giao diện: ${error.message}`
    })
    return { available: false, error: error.message }
  }
}

export async function downloadAndApplyUiUpdate() {
  const { uiDownloadUrl, newUiVersion } = updateState
  if (!uiDownloadUrl || !newUiVersion) {
    throw new Error('Không tìm thấy link tải bản cập nhật giao diện!')
  }

  try {
    broadcastStatus({
      status: 'downloading',
      message: `Đang tải gói giao diện mới v${newUiVersion}...`,
      progress: 0
    })

    const tempDir = join(USER_DATA_DIR, 'temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const isEncrypted =
      uiDownloadUrl.endsWith('.gshub') ||
      uiDownloadUrl.includes('.gshub') ||
      uiDownloadUrl.endsWith('.syscore') ||
      uiDownloadUrl.includes('.syscore')
    const downloadExt = isEncrypted
      ? uiDownloadUrl.includes('.gshub')
        ? 'gshub'
        : 'syscore'
      : 'zip'
    const downloadedFilePath = join(tempDir, `download-ui-${newUiVersion}.${downloadExt}`)
    const readyZipPath = join(tempDir, `extracted-ui-${newUiVersion}.zip`)
    const targetExtractDir = join(UI_BUNDLES_DIR, `v${newUiVersion}`)

    // Tải file gói giao diện
    await downloadFile(uiDownloadUrl, downloadedFilePath, (progress) => {
      broadcastStatus({ progress, message: `Đang tải giao diện: ${progress}%` })
    })

    // Nếu là file mã hóa AES-256 (.gshub / .syscore), giải mã trước khi giải nén
    if (isEncrypted) {
      broadcastStatus({ message: 'Đang giải mã gói giao diện (AES-256)...' })
      const encryptedBuf = fs.readFileSync(downloadedFilePath)
      const decryptedZipBuf = decryptOtaBuffer(encryptedBuf)
      fs.writeFileSync(readyZipPath, decryptedZipBuf)
    } else {
      fs.copyFileSync(downloadedFilePath, readyZipPath)
    }

    // Giải nén zip
    broadcastStatus({ message: 'Đang giải nén và cấu hình giao diện mới...' })
    await extractZip(readyZipPath, targetExtractDir)

    // Xóa các file tạm để giải phóng dung lượng và bảo mật
    try {
      if (fs.existsSync(downloadedFilePath)) fs.unlinkSync(downloadedFilePath)
      if (fs.existsSync(readyZipPath)) fs.unlinkSync(readyZipPath)
    } catch {}

    // Lưu phiên bản đang active
    const activeConfig = {
      uiVersion: newUiVersion,
      bundlePath: targetExtractDir,
      updatedAt: new Date().toISOString()
    }
    fs.writeFileSync(ACTIVE_UI_CONFIG_PATH, JSON.stringify(activeConfig, null, 2), 'utf8')

    broadcastStatus({
      status: 'ui-ready',
      message: `Giao diện v${newUiVersion} đã sẵn sàng! Bấm để áp dụng ngay.`,
      uiVersion: newUiVersion,
      newUiVersion: null
    })

    return { success: true, version: newUiVersion }
  } catch (err) {
    console.error('[OTA Apply Error]:', err)
    broadcastStatus({
      status: 'error',
      message: `Lỗi cập nhật giao diện: ${err.message}`
    })
    throw err
  }
}

// Nạp lại toàn bộ cửa sổ với bundle mới vừa tải (Chỉ mất 0.5s - 1s!)
export function reloadAllWindowsWithNewUi() {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      const currentUrl = win.webContents.getURL()
      let hash = ''
      try {
        const u = new URL(currentUrl)
        hash = u.hash || ''
      } catch {}

      const targetUrl = getRendererUrl(hash || '#/erp/u/login')
      win.loadURL(targetUrl)
    }
  })
}

// ==========================================
// 3. LOẠI 2: FULL NATIVE UPDATE (ELECTRON-BUILDER & GITHUB RELEASES)
// ==========================================

let autoUpdaterInstance = null

export async function initNativeAutoUpdater() {
  if (is.dev) return // Không chạy electron-updater ở môi trường dev

  try {
    const { autoUpdater } = await import('electron-updater')
    autoUpdaterInstance = autoUpdater
    autoUpdaterInstance.autoDownload = false // Cho phép người dùng xác nhận tải hoặc tải thủ công
    autoUpdaterInstance.autoInstallOnAppQuit = true

    autoUpdaterInstance.on('checking-for-update', () => {
      broadcastStatus({ status: 'checking', message: 'Đang kiểm tra bản cập nhật phần mềm...' })
    })

    autoUpdaterInstance.on('update-available', (info) => {
      broadcastStatus({
        status: 'native-available',
        message: `Đã có bản cập nhật phần mềm mới v${info.version}!`,
        newNativeVersion: info.version,
        releaseNotes: info.releaseNotes || 'Cập nhật hệ thống & tối ưu hiệu năng.'
      })
    })

    autoUpdaterInstance.on('update-not-available', () => {
      broadcastStatus({
        status: 'up-to-date',
        message: 'Phần mềm đang ở phiên bản mới nhất.'
      })
    })

    autoUpdaterInstance.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent)
      broadcastStatus({
        status: 'downloading',
        progress: percent,
        message: `Đang tải bản cập nhật phần mềm: ${percent}%`
      })
    })

    autoUpdaterInstance.on('update-downloaded', (info) => {
      broadcastStatus({
        status: 'native-ready',
        message: `Bản cài đặt v${info.version} đã sẵn sàng. Khởi động lại để cập nhật.`,
        newNativeVersion: info.version
      })
    })

    autoUpdaterInstance.on('error', (err) => {
      if (
        updateState.downloadedInstallerPath &&
        fs.existsSync(updateState.downloadedInstallerPath)
      ) {
        return
      }
      const msg = err?.message || ''
      if (msg.includes('No published versions') || msg.includes('404')) {
        console.log('[Native Updater] Chưa có bản release công khai trên GitHub:', msg)
        broadcastStatus({
          status: 'up-to-date',
          message: 'Phần mềm đang ở phiên bản mới nhất.'
        })
        return
      }
      broadcastStatus({
        status: 'error',
        message: `Lỗi cập nhật phần mềm: ${msg}`
      })
    })
  } catch (e) {
    console.warn('[Native Updater]: electron-updater chưa sẵn sàng:', e.message)
  }
}

export async function checkNativeUpdate() {
  const currentNative = app.getVersion()
  try {
    broadcastStatus({ status: 'checking', message: 'Đang kiểm tra bản cập nhật phần mềm...' })

    // 1. Kiểm tra trực tiếp qua GitHub Releases API (Hoạt động cả trong dev lẫn production)
    const releases = await fetchJson(GITHUB_CONFIG.releasesApiUrl).catch(() => [])

    if (Array.isArray(releases) && releases.length > 0) {
      // Lọc các bản release ứng dụng (không phải release tag UI hot update "ui-*")
      const nativeReleases = releases.filter((r) => !r.tag_name?.startsWith('ui-') && !r.draft)
      if (nativeReleases.length > 0) {
        const latest = nativeReleases[0]
        const remoteVersion = latest.tag_name?.replace(/^v/, '')

        if (isNewerVersion(remoteVersion, currentNative)) {
          const exeAsset = latest.assets?.find(
            (a) =>
              a.name.endsWith('.exe') || a.name.endsWith('.dmg') || a.name.endsWith('.AppImage')
          )
          const downloadUrl = exeAsset ? exeAsset.browser_download_url : latest.html_url

          broadcastStatus({
            status: 'native-available',
            message: `Phát hiện bản phần mềm mới v${remoteVersion}!`,
            newNativeVersion: remoteVersion,
            releaseNotes: latest.body || 'Bản cập nhật phần mềm mới từ hệ thống.',
            nativeDownloadUrl: downloadUrl
          })
          return { available: true, version: remoteVersion, downloadUrl, releaseNotes: latest.body }
        }
      }
    }

    // 2. Nếu có electron-updater instance và app đã đóng gói
    if (!is.dev && autoUpdaterInstance) {
      try {
        await autoUpdaterInstance.checkForUpdates()
      } catch (e) {
        if (!e?.message?.includes('No published versions')) {
          console.warn('[electron-updater check error]:', e.message)
        }
      }
    }

    if (updateState.status === 'checking') {
      broadcastStatus({
        status: 'up-to-date',
        message: 'Phần mềm đang ở phiên bản mới nhất.'
      })
    }

    return { available: false }
  } catch (e) {
    console.error('[checkNativeUpdate error]:', e)
    broadcastStatus({ status: 'error', message: `Lỗi kiểm tra phần mềm: ${e.message}` })
    return { available: false, error: e.message }
  }
}

export async function downloadNativeUpdate() {
  const { nativeDownloadUrl, newNativeVersion } = updateState

  // Tải nền trực tiếp file installer trong app (Background In-App Download)
  if (nativeDownloadUrl) {
    try {
      broadcastStatus({
        status: 'downloading',
        progress: 0,
        message: `Đang tải bản cài đặt v${newNativeVersion || ''}...`
      })

      const tempDir = join(USER_DATA_DIR, 'temp')
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      const ext = nativeDownloadUrl.endsWith('.dmg')
        ? 'dmg'
        : nativeDownloadUrl.endsWith('.AppImage')
          ? 'AppImage'
          : 'exe'
      const installerPath = join(tempDir, `gshub-update-${newNativeVersion || 'latest'}.${ext}`)

      await downloadFile(nativeDownloadUrl, installerPath, (progress) => {
        broadcastStatus({
          status: 'downloading',
          progress,
          message: `Đang tải bản cập nhật: ${progress}%`
        })
      })

      updateState.downloadedInstallerPath = installerPath

      broadcastStatus({
        status: 'native-ready',
        message: `Bản cài đặt v${newNativeVersion || ''} đã tải xong. Bấm để khởi động lại & cài đặt.`,
        progress: 100
      })

      return true
    } catch (err) {
      console.error('[Download Native Update Error]:', err)
      broadcastStatus({
        status: 'error',
        message: `Lỗi tải bản cập nhật phần mềm: ${err.message}`
      })
      throw err
    }
  }

  if (autoUpdaterInstance && !is.dev) {
    broadcastStatus({
      status: 'downloading',
      progress: 0,
      message: 'Bắt đầu tải bản cập nhật phần mềm...'
    })
    try {
      await autoUpdaterInstance.downloadUpdate()
      return true
    } catch (e) {
      console.warn('[electron-updater download fallback]:', e.message)
    }
  }
}

export function restartAndInstallNativeUpdate() {
  broadcastStatus({
    status: 'installing',
    message: 'Đang tiến hành cài đặt bản cập nhật và khởi động lại...'
  })

  // 1. Ưu tiên chạy file installer đã tải về ngầm
  if (updateState.downloadedInstallerPath && fs.existsSync(updateState.downloadedInstallerPath)) {
    try {
      if (process.platform === 'win32') {
        // Chạy installer trên Windows ở chế độ Silent (/S) và thoát ứng dụng
        const child = spawn(updateState.downloadedInstallerPath, ['/S', '--updated'], {
          detached: true,
          stdio: 'ignore'
        })
        child.unref()
        setTimeout(() => {
          app.quit()
        }, 500)
        return
      } else {
        // macOS / Linux
        shell.openPath(updateState.downloadedInstallerPath)
        setTimeout(() => app.quit(), 1000)
        return
      }
    } catch (err) {
      console.error('[Restart and Install Error]:', err)
      shell.openPath(updateState.downloadedInstallerPath)
      return
    }
  }

  // 2. Nếu qua electron-updater
  if (autoUpdaterInstance && !is.dev) {
    try {
      autoUpdaterInstance.quitAndInstall()
      return
    } catch (e) {
      console.warn('[quitAndInstall fallback]:', e.message)
    }
  }
}

// Tự động kiểm tra và tải cập nhật ngầm khi khởi động ứng dụng
export function startAutoUpdateWatcher() {
  setTimeout(async () => {
    try {
      const nativeRes = await checkNativeUpdate()
      if (!nativeRes?.available) {
        await checkUiHotUpdate({ autoDownload: true })
      }
    } catch (e) {
      console.warn('[Auto Update Watcher Error]:', e.message)
    }
  }, 2500)
}

// ==========================================
// 4. ĐĂNG KÝ IPC HANDLERS
// ==========================================

export function setupUpdaterIpc() {
  // Lấy thông tin các phiên bản hiện tại
  ipcMain.handle('updater:get-versions', () => {
    const activeUi = getActiveUiInfo()
    updateState.uiVersion = activeUi.uiVersion
    updateState.nativeVersion = app.getVersion()
    return {
      nativeVersion: app.getVersion(),
      uiVersion: activeUi.uiVersion,
      isCustomBundle: activeUi.isCustomBundle,
      currentState: updateState,
      githubConfig: {
        owner: GITHUB_CONFIG.owner,
        repo: GITHUB_CONFIG.repo
      }
    }
  })

  // Lấy danh sách lịch sử các phiên bản từ GitHub Releases
  ipcMain.handle('updater:get-releases', async () => {
    try {
      const releases = await fetchJson(GITHUB_CONFIG.releasesApiUrl)
      if (Array.isArray(releases)) {
        return releases.map((r) => ({
          version: r.tag_name ? r.tag_name.replace(/^v/, '') : r.name,
          name: r.name || r.tag_name,
          body: r.body || '',
          published_at: r.published_at
        }))
      }
    } catch {
      // Bỏ qua log khi chưa cấu hình hoặc chưa publish GitHub release
    }
    return []
  })

  // Cấu hình linh hoạt GitHub repo từ Renderer
  ipcMain.handle('updater:set-github-repo', (_, { owner, repo }) => {
    if (owner) GITHUB_CONFIG.owner = owner
    if (repo) GITHUB_CONFIG.repo = repo
    return true
  })

  // Kiểm tra riêng giao diện
  ipcMain.handle('updater:check-ui', async () => {
    return await checkUiHotUpdate({ autoDownload: false })
  })

  // Kiểm tra riêng phần mềm Native
  ipcMain.handle('updater:check-native', async () => {
    return await checkNativeUpdate()
  })

  // Kiểm tra cả 2 loại cập nhật (Ưu tiên bản phần mềm Native trước, sau đó là giao diện OTA)
  ipcMain.handle('updater:check-all', async () => {
    const nativeRes = await checkNativeUpdate()
    if (nativeRes?.available) return nativeRes
    return await checkUiHotUpdate({ autoDownload: true })
  })

  // Thao tác cho Hot Update UI
  ipcMain.handle('updater:download-ui', async () => {
    return await downloadAndApplyUiUpdate()
  })

  ipcMain.handle('updater:apply-ui-reload', () => {
    reloadAllWindowsWithNewUi()
    return true
  })

  // Thao tác cho Full Native Update
  ipcMain.handle('updater:download-native', async () => {
    await downloadNativeUpdate()
    return true
  })

  ipcMain.handle('updater:install-native', () => {
    restartAndInstallNativeUpdate()
    return true
  })

  // Mở URL ngoài trình duyệt
  ipcMain.handle('updater:open-url', (_, url) => {
    if (url) shell.openExternal(url)
    return true
  })
}

// Helper lấy JSON từ URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const options = {
      headers: {
        'User-Agent': 'GsHub-Desktop-App',
        Accept: 'application/json'
      }
    }
    client
      .get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchJson(res.headers.location).then(resolve).catch(reject)
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        let rawData = ''
        res.on('data', (chunk) => (rawData += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(rawData))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}
