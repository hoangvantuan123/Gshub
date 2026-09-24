import { ipcMain } from 'electron'
import {
  connectRealtimeStream,
  disconnectRealtimeStream,
  publishRealtimeEvent
} from './realtimeClient.js'

export function setupRealtimeIpc() {
  ipcMain.on('realtime:connect', (event, options) => {
    try {
      // Sử dụng event.sender (WebContents) làm target window an toàn 100%
      connectRealtimeStream(event.sender, options || {})
    } catch (err) {
      console.error('[IPC realtime:connect Error]', err)
    }
  })

  ipcMain.on('realtime:disconnect', (event) => {
    try {
      disconnectRealtimeStream(event.sender)
    } catch (err) {
      console.error('[IPC realtime:disconnect Error]', err)
    }
  })

  ipcMain.handle('realtime:publish', async (event, data) => {
    try {
      return await publishRealtimeEvent(data)
    } catch (err) {
      console.error('[IPC realtime:publish Error]', err)
      return { error: err?.message || 'Publish failed' }
    }
  })
}

export * from './realtimeClient.js'
