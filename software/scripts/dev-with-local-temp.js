import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create a project-local temp directory to avoid Windows %TEMP% permission issues
const localTempDir = path.resolve(__dirname, '../.tmp')
if (!fs.existsSync(localTempDir)) {
  fs.mkdirSync(localTempDir, { recursive: true })
}

const env = {
  ...process.env,
  TMP: localTempDir,
  TEMP: localTempDir
}

const isWin = process.platform === 'win32'
const cmd = isWin ? 'npx.cmd' : 'npx'

const child = spawn(cmd, ['electron-vite', 'dev'], {
  stdio: 'inherit',
  env,
  shell: true
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
