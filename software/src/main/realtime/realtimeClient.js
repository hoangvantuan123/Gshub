import path from 'path'
import fs from 'fs'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

let client = null
let currentStream = null
let reconnectTimer = null
let isManuallyClosed = false
let retryAttempt = 0
let activeParams = null
let isWatchingChannel = false

const INITIAL_RETRY_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 30000

function sendToWindow(targetWindow, channel, payload) {
  if (!targetWindow) return
  try {
    if (typeof targetWindow.send === 'function') {
      targetWindow.send(channel, payload)
    } else if (targetWindow.webContents && typeof targetWindow.webContents.send === 'function') {
      targetWindow.webContents.send(channel, payload)
    }
  } catch (err) {
    console.error(`[IPC Send Error on channel ${channel}]`, err)
  }
}

function calculateJitterBackoff(attempt) {
  // Exponential Backoff với Full Jitter: Tránh Thundering Herd DDOS Server khi khôi phục mạng hàng loạt
  const expDelay = Math.min(MAX_RETRY_DELAY_MS, INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt))
  const jitteredDelay = Math.floor(expDelay * (0.5 + Math.random() * 0.5))
  return jitteredDelay
}

function getProtoPath() {
  const sharedProto = path.resolve(process.cwd(), '../service/proto/realtime/realtime.proto')
  if (fs.existsSync(sharedProto)) return sharedProto

  const internalDevProto = path.resolve(process.cwd(), 'src/main/realtime/proto/realtime.proto')
  if (fs.existsSync(internalDevProto)) return internalDevProto

  return path.resolve(__dirname, './proto/realtime.proto')
}

let currentServerAddress = ''

function getRealtimeClient(customAddress = null) {
  const serverAddress =
    customAddress ||
    process.env.VITE_REALTIME_HUB_ADDR ||
    process.env.REALTIME_HUB_ADDR ||
    '127.0.0.1:50055'

  if (client && currentServerAddress === serverAddress) return client

  if (client) {
    try {
      client.close()
    } catch (_) {}
    client = null
  }

  currentServerAddress = serverAddress

  const protoPath = getProtoPath()
  console.log('[gRPC Client] Loading proto file from:', protoPath)

  if (!fs.existsSync(protoPath)) {
    throw new Error(`Proto file not found at path: ${protoPath}`)
  }

  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
  const realtimeProto =
    protoDescriptor['realtime.realtime'] ||
    protoDescriptor.realtime?.realtime ||
    protoDescriptor.realtime

  if (!realtimeProto || !realtimeProto.RealtimeService) {
    console.error('[gRPC Client] Available packages in descriptor:', Object.keys(protoDescriptor))
    throw new Error('RealtimeService not found in loaded proto descriptor')
  }

  console.log('[gRPC Client] Connecting to Realtime Hub at:', serverAddress)

  client = new realtimeProto.RealtimeService(serverAddress, grpc.credentials.createInsecure(), {
    'grpc.keepalive_time_ms': 60000, // Ping mỗi 60s
    'grpc.keepalive_timeout_ms': 20000,
    'grpc.keepalive_permit_without_calls': 0, // Không ping khi không có stream
    'grpc.http2.min_ping_interval_without_data_ms': 30000
  })

  return client
}

/**
 * Hủy stream một cách an toàn tuyệt đối, không bao giờ để lọt lỗi Uncaught Exception vào Node.js / Electron
 */
function cleanupStream(stream) {
  if (!stream) return
  try {
    // 1. Gỡ các listener hiện tại
    stream.removeAllListeners()
    // 2. QUAN TRỌNG: Luôn gắn no-op error handler để gRPC-js nếu có emit async error/status sau khi hủy
    // thì Node.js EventEmitter sẽ KHÔNG coi đó là Uncaught Exception làm hiện popup lỗi Windows
    stream.on('error', () => {})
    if (typeof stream.cancel === 'function') {
      stream.cancel()
    }
    if (typeof stream.destroy === 'function') {
      stream.destroy()
    }
  } catch (_) {}
}

function scheduleReconnect(targetWindow) {
  if (isManuallyClosed || !activeParams) return
  if (reconnectTimer) return

  const delay = calculateJitterBackoff(retryAttempt)
  retryAttempt++

  sendToWindow(targetWindow, 'realtime:status', {
    status: 'RECONNECTING',
    message: `Mất kết nối với Server. Tự động thử lại sau ${(delay / 1000).toFixed(1)}s (Lần ${retryAttempt})...`
  })

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (!isManuallyClosed && activeParams) {
      connectRealtimeStream(targetWindow, activeParams, true)
    }
  }, delay)
}

function monitorChannelState(targetWindow, clientInstance) {
  if (isWatchingChannel || isManuallyClosed || !clientInstance) return
  isWatchingChannel = true

  try {
    const channel = clientInstance.getChannel()
    if (!channel || typeof channel.getConnectivityState !== 'function') {
      isWatchingChannel = false
      return
    }

    const currentState = channel.getConnectivityState(true)

    channel.watchConnectivityState(currentState, Date.now() + 3600000, function onStateChange(err) {
      isWatchingChannel = false
      if (err || isManuallyClosed) return

      try {
        const newState = channel.getConnectivityState(false)
        // Nếu channel chuyển sang READY, kích hoạt kết nối Stream lại ngay lập tức
        if (newState === grpc.connectivityState.READY && !currentStream && activeParams) {
          console.log('[gRPC Channel] Server READY detected! Connecting stream immediately...')
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
          retryAttempt = 0
          connectRealtimeStream(targetWindow, activeParams, true)
        } else if (!isManuallyClosed && activeParams) {
          monitorChannelState(targetWindow, clientInstance)
        }
      } catch (_) {}
    })
  } catch (_) {
    isWatchingChannel = false
  }
}

export function connectRealtimeStream(targetWindow, params = {}, isInternalRetry = false) {
  const {
    userId,
    apiKey,
    deviceId = 'DEV_LOCAL',
    topic = '*',
    channel = 'default',
    serverAddress = null
  } = params

  if (!userId || !apiKey) {
    console.warn('[gRPC Stream] Rejecting connection: Missing authenticated userId or JWT Token!')
    sendToWindow(targetWindow, 'realtime:status', {
      status: 'DISCONNECTED',
      message: 'Authentication Required: Missing UserId or JWT Token'
    })
    return
  }

  // Chống kết nối lặp: Nếu đang có stream hoạt động với cùng thông số thì giữ nguyên
  if (
    !isInternalRetry &&
    currentStream &&
    activeParams &&
    activeParams.userId === userId &&
    activeParams.apiKey === apiKey &&
    activeParams.deviceId === deviceId &&
    activeParams.topic === topic &&
    activeParams.channel === channel &&
    activeParams.serverAddress === serverAddress
  ) {
    return
  }

  isManuallyClosed = false
  activeParams = { userId, apiKey, deviceId, topic, channel, serverAddress }

  if (!isInternalRetry) {
    retryAttempt = 0
    console.log(
      `[gRPC Stream] Connect requested by User: ${userId} (Device: ${deviceId}), Topic: ${topic}`
    )
  }

  if (currentStream) {
    cleanupStream(currentStream)
    currentStream = null
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  try {
    const clientInstance = getRealtimeClient(serverAddress)
    monitorChannelState(targetWindow, clientInstance)

    const metadata = new grpc.Metadata()
    metadata.add('x-user-id', userId)
    metadata.add('x-api-key', apiKey)
    metadata.add('x-device-id', deviceId)

    if (!isInternalRetry) {
      sendToWindow(targetWindow, 'realtime:status', {
        status: 'CONNECTING',
        message: `Connecting to gRPC Server ${currentServerAddress}...`
      })
    }

    const stream = clientInstance.SubscribeEvents({ topic, channel, user_id: userId }, metadata)
    currentStream = stream

    stream.on('data', (data) => {
      // Khi nhận tin nhắn thành công -> reset ngay số lần thử lại
      retryAttempt = 0
      sendToWindow(targetWindow, 'realtime:status', {
        status: 'CONNECTED',
        message: `Realtime Stream Active (Topic: ${topic})`
      })
      sendToWindow(targetWindow, 'realtime:data-received', data)
    })

    stream.on('error', (err) => {
      const errMsg = err?.details || err?.message || 'Stream error'
      const errCode = err?.code

      // Clean up stream an toàn
      if (currentStream === stream) {
        cleanupStream(currentStream)
        currentStream = null
      } else {
        cleanupStream(stream)
      }

      // Nếu lỗi xác thực token -> ngắt hẳn không bao giờ retry
      if (errCode === grpc.status.UNAUTHENTICATED) {
        console.warn('[gRPC Stream Auth Rejected]: Invalid or expired token. Stream stopped.')
        isManuallyClosed = true
        activeParams = null
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        sendToWindow(targetWindow, 'realtime:status', {
          status: 'AUTH_ERROR',
          message: `Authentication error: ${errMsg}`
        })
        return
      }

      // Xử lý log im lặng gọn gàng khi Server offline, không làm rác log console
      if (errCode === grpc.status.UNAVAILABLE || errMsg.includes('ECONNREFUSED')) {
        if (retryAttempt === 1 || retryAttempt % 5 === 0) {
          console.warn(
            `[gRPC Stream Offline] Server unavailable at ${currentServerAddress}. Retrying silently...`
          )
        }
      } else if (errCode !== grpc.status.CANCELLED) {
        console.error('[gRPC Stream ERROR]', errCode, errMsg)
      }

      sendToWindow(targetWindow, 'realtime:status', {
        status: 'DISCONNECTED',
        message: `Stream Error (${errCode}): ${errMsg}`
      })

      scheduleReconnect(targetWindow)
    })

    stream.on('status', (status) => {
      if (status && status.code !== grpc.status.OK && status.code !== grpc.status.CANCELLED) {
        // Status event handled cleanly
      }
    })

    stream.on('end', () => {
      if (currentStream === stream) {
        cleanupStream(currentStream)
        currentStream = null
      } else {
        cleanupStream(stream)
      }

      if (!isManuallyClosed) {
        sendToWindow(targetWindow, 'realtime:status', {
          status: 'DISCONNECTED',
          message: 'Realtime Stream Disconnected by Server'
        })
        scheduleReconnect(targetWindow)
      }
    })
  } catch (err) {
    console.error('[gRPC Exception]', err?.message || err)
    sendToWindow(targetWindow, 'realtime:status', {
      status: 'DISCONNECTED',
      message: `Connection Exception: ${err?.message || err}`
    })
    scheduleReconnect(targetWindow)
  }
}

export function disconnectRealtimeStream(targetWindow) {
  isManuallyClosed = true
  activeParams = null
  retryAttempt = 0

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (currentStream) {
    cleanupStream(currentStream)
    currentStream = null
  }
  sendToWindow(targetWindow, 'realtime:status', {
    status: 'DISCONNECTED',
    message: 'Disconnected by User'
  })
}

export function publishRealtimeEvent({
  userId,
  apiKey,
  topic = 'erp.client.events',
  key = `KEY_${Date.now()}`,
  payload
}) {
  if (!userId || !apiKey) {
    return Promise.reject(new Error('Publish rejected: Missing authenticated UserId or JWT Token'))
  }
  return new Promise((resolve, reject) => {
    try {
      const clientInstance = getRealtimeClient()
      const metadata = new grpc.Metadata()
      metadata.add('x-user-id', userId)
      metadata.add('x-api-key', apiKey)

      clientInstance.PublishEvent(
        {
          topic,
          key,
          payload: typeof payload === 'object' ? JSON.stringify(payload) : payload,
          user_id: userId
        },
        metadata,
        (err, response) => {
          if (err) {
            console.error('[gRPC Publish Error]', err?.message || err)
            reject(err)
          } else {
            console.log('[gRPC Publish Success]', response)
            resolve(response)
          }
        }
      )
    } catch (err) {
      reject(err)
    }
  })
}
