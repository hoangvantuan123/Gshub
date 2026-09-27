/**
 * Realtime API - Disabled (WebSocket and gRPC removed)
 */
class RealtimeServiceBridge {
  constructor() {
    this.statusListeners = new Set()
    this.dataListeners = new Set()
    this.currentStatus = {
      status: 'DISCONNECTED',
      message: 'Realtime WebSocket & gRPC đã được tắt'
    }
  }

  connect() {
    // Disabled
  }

  disconnect() {
    // Disabled
  }

  notifyStatus(statusObj) {
    this.currentStatus = statusObj
    this.statusListeners.forEach((cb) => {
      try {
        cb(statusObj)
      } catch (_) {}
    })
  }

  notifyData(data) {
    this.dataListeners.forEach((cb) => {
      try {
        cb(data)
      } catch (_) {}
    })
  }

  publish() {
    return Promise.resolve({ success: true })
  }

  onStatus(cb) {
    if (typeof cb !== 'function') return () => {}
    this.statusListeners.add(cb)
    cb(this.currentStatus)
    return () => {
      this.statusListeners.delete(cb)
    }
  }

  onData(cb) {
    if (typeof cb !== 'function') return () => {}
    this.dataListeners.add(cb)
    return () => {
      this.dataListeners.delete(cb)
    }
  }
}

export const realtimeApi = new RealtimeServiceBridge()
export default realtimeApi
