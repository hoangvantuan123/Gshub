import { useEffect, useRef } from 'react'
import { useRealtimeContext } from '../../api/realtime/context/RealtimeContext'

/**
 * Hook lắng nghe Realtime Event để hiển thị thông báo dưới thanh status bottom
 * @param {Object} options
 * @param {string[]} options.eventTypes - Danh sách event types cần lắng nghe
 * @param {Function} options.setStatusMessage - Hàm cập nhật thanh trạng thái dưới cùng
 * @param {string} [options.tableName='Danh mục'] - Tên bảng để hiển thị thông báo
 */
export function useRealtimeTableSync({ eventTypes = [], setStatusMessage, tableName = 'Dữ liệu' }) {
  const { latestEvent } = useRealtimeContext() || {}
  const lastProcessedEventId = useRef(null)
  const eventTypesKey = Array.isArray(eventTypes) ? eventTypes.join(',') : String(eventTypes || '')

  useEffect(() => {
    if (!latestEvent || !latestEvent.payload) return

    // Tránh xử lý lặp cùng 1 event ID
    if (latestEvent.eventId && latestEvent.eventId === lastProcessedEventId.current) {
      return
    }
    lastProcessedEventId.current = latestEvent.eventId

    let eventPayload = null
    try {
      eventPayload =
        typeof latestEvent.payload === 'string'
          ? JSON.parse(latestEvent.payload)
          : latestEvent.payload
    } catch {
      return
    }

    const eventName = eventPayload?.event || eventPayload?.eventType || ''
    const typesList = eventTypesKey.split(',').filter(Boolean)
    if (!typesList.includes(eventName)) {
      return
    }

    if (typeof setStatusMessage === 'function') {
      setStatusMessage({
        type: 'info',
        text: `[Realtime] ${tableName} vừa có thay đổi trên hệ thống từ người dùng khác.`
      })
    }
  }, [latestEvent, eventTypesKey, setStatusMessage, tableName])
}
