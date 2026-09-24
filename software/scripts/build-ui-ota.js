import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Khóa bảo mật AES-256 (32 bytes) dùng để mã hóa gói giao diện
const OTA_SECRET_PASS = 'GsHub-Enterprise-ERP-Secret-OTA-Key-2026'
const OTA_SECRET_KEY = crypto.createHash('sha256').update(OTA_SECRET_PASS).digest()

// Đọc version từ package.json
const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const version = pkg.version

console.log(`🚀 [OTA Build] Bắt đầu build gói giao diện mã hóa AES-256 v${version}...`)

// 1. Build với electron-vite
console.log('📦 Đang đóng gói với electron-vite build...')
const buildCmd =
  process.platform === 'win32' ? 'npx.cmd electron-vite build' : 'npx electron-vite build'
execSync(buildCmd, { cwd: rootDir, stdio: 'inherit' })

const outRendererDir = path.join(rootDir, 'out', 'renderer')
const distOtaDir = path.join(rootDir, 'dist-ota')
if (!fs.existsSync(distOtaDir)) {
  fs.mkdirSync(distOtaDir, { recursive: true })
}

const tempZipPath = path.join(distOtaDir, `temp-renderer-v${version}.zip`)
const encryptedPkgPath = path.join(distOtaDir, `renderer-v${version}.gshub`)
const manifestPath = path.join(distOtaDir, 'ui-release.json')

// 2. Nén thư mục out/renderer thành zip tạm
console.log(`🗜️  Đang nén thư mục out/renderer...`)
if (process.platform === 'win32') {
  execSync(
    `powershell.exe -NoProfile -Command "Compress-Archive -Path '${outRendererDir}\\*' -DestinationPath '${tempZipPath}' -Force"`,
    { stdio: 'inherit' }
  )
} else {
  execSync(`cd "${outRendererDir}" && zip -r -q "${tempZipPath}" ./*`, { stdio: 'inherit' })
}

// 3. Mã hóa toàn bộ file zip bằng thuật toán AES-256-CBC
console.log('🔐 Đang mã hóa gói giao diện bằng AES-256 (Bảo mật 100%)...')
const rawZipBuffer = fs.readFileSync(tempZipPath)
const iv = crypto.randomBytes(16) // 16 bytes Initialization Vector ngẫu nhiên
const cipher = crypto.createCipheriv('aes-256-cbc', OTA_SECRET_KEY, iv)
const encryptedData = Buffer.concat([iv, cipher.update(rawZipBuffer), cipher.final()])

// Ghi file nhị phân đã mã hóa (.gshub)
fs.writeFileSync(encryptedPkgPath, encryptedData)

// Xóa file zip không mã hóa để bảo đảm an toàn
try {
  fs.unlinkSync(tempZipPath)
} catch {}

const encryptedFileSize = fs.statSync(encryptedPkgPath).size
const fileHashSha256 = crypto.createHash('sha256').update(encryptedData).digest('hex')

// 4. Tạo file manifest ui-release.json
const manifest = {
  version: version,
  releaseDate: new Date().toISOString().split('T')[0],
  description: `Bản cập nhật giao diện Hot Update v${version} (Đã mã hóa AES-256)`,
  format: 'gshub-aes256',
  downloadUrl: `https://github.com/hoangvantuan123/gshub-releases/releases/download/ui-v${version}/renderer-v${version}.syscore`,
  fileSize: encryptedFileSize,
  sha256: fileHashSha256
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

console.log('✅ [OTA Build Hoàn Tất]!')
console.log(
  `🔒 File gói giao diện MÃ HÓA: ${encryptedPkgPath} (${(encryptedFileSize / 1024 / 1024).toFixed(2)} MB)`
)
console.log(`📄 File manifest: ${manifestPath}`)
console.log(`
👉 Hướng dẫn phát hành bản cập nhật giao diện bảo mật:
1. Tạo Release trên GitHub với Tag: ui-v${version}
2. Upload file "${encryptedPkgPath}" vào Release đó.
3. Commit file "${manifestPath}" lên nhánh chính (main branch) của GitHub repository.
4. Mọi ứng dụng của người dùng sẽ tự động tải file mã hóa về, giải mã ngầm và cập nhật ngay trong 1 giây!
`)
