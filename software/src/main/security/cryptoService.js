import crypto from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { app, ipcMain } from 'electron'

// Phân rã mảng byte khóa chính và khóa phụ kết hợp XOR Mask chống quét chuỗi tĩnh (Decompilation Static String Scan)
const XOR_MASK = 0x5a
const OBFUSCATED_KEY_MAIN = [
  0x6a, 0x6b, 0x68, 0x69, 0x6e, 0x6f, 0x6c, 0x6d, 0x62, 0x63, 0x3b, 0x38, 0x39, 0x3e, 0x3f, 0x3c,
  0x6a, 0x6b, 0x68, 0x69, 0x6e, 0x6f, 0x6c, 0x6d, 0x62, 0x63, 0x3b, 0x38, 0x39, 0x3e, 0x3f, 0x3c
]

const OBFUSCATED_KEY_SUB = [
  0x3b, 0x38, 0x39, 0x3e, 0x3f, 0x3c, 0x6a, 0x6b, 0x68, 0x69, 0x6e, 0x6f, 0x6c, 0x6d, 0x62, 0x63,
  0x3b, 0x38, 0x39, 0x3e, 0x3f, 0x3c, 0x6a, 0x6b, 0x68, 0x69, 0x6e, 0x6f, 0x6c, 0x6d, 0x62, 0x63
]

function getSecretKey(obfuscatedArray) {
  return Buffer.from(obfuscatedArray.map((b) => b ^ XOR_MASK))
}

/**
 * Mã hóa AES-256-GCM
 */
export function encryptAES256GCM(data, keyBuffer) {
  const iv = crypto.randomBytes(12) // 12 bytes IV chuẩn AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)

  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
  const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag() // 16 bytes Authentication Tag

  // Ghép Ciphertext + Tag (Chuẩn AES-GCM của Web Crypto & Golang)
  const fullCipher = Buffer.concat([encrypted, tag])

  return {
    iv: iv.toString('base64'),
    data: fullCipher.toString('base64')
  }
}

/**
 * Lấy hoặc sinh mã DeviceId vĩnh viễn lưu an toàn trong userData của máy
 */
function getPersistentDeviceId() {
  try {
    const userDataPath = app.getPath('userData')
    const deviceIdPath = path.join(userDataPath, '.sys_device_id')
    if (fs.existsSync(deviceIdPath)) {
      const id = fs.readFileSync(deviceIdPath, 'utf8').trim()
      if (id) return id
    }
    const newId = crypto.randomUUID()
    fs.writeFileSync(deviceIdPath, newId, 'utf8')
    return newId
  } catch {
    return crypto.randomUUID()
  }
}

/**
 * Khởi tạo IPC handlers phục vụ bảo mật ở Main Process
 */
export function setupSecurityIpc() {
  const mainKey = getSecretKey(OBFUSCATED_KEY_MAIN)
  const subKey = getSecretKey(OBFUSCATED_KEY_SUB)

  ipcMain.handle('security:encrypt-device-payload', async (_, payload) => {
    try {
      return encryptAES256GCM(payload, mainKey)
    } catch (err) {
      console.error('[Security] Encrypt payload failed:', err)
      throw err
    }
  })

  ipcMain.handle('security:get-device-token', async (_, userToken) => {
    try {
      const deviceId = getPersistentDeviceId()
      const payload = {
        deviceId,
        token: userToken || crypto.randomUUID(),
        ts: Date.now()
      }

      // Mã hóa lớp 1 với khóa chính
      const firstLayer = encryptAES256GCM(payload, mainKey)
      // Mã hóa lớp 2 với khóa phụ
      const secondLayer = encryptAES256GCM(firstLayer, subKey)

      return JSON.stringify(secondLayer)
    } catch (err) {
      console.error('[Security] Get device token failed:', err)
      return null
    }
  })
}
