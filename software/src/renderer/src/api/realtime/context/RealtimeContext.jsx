import { createContext, useContext, useState } from 'react'

const RealtimeContext = createContext(null)

export function RealtimeProvider({ children }) {
  const [statusInfo] = useState({
    status: 'DISCONNECTED',
    message: 'Realtime WebSocket / gRPC đã tắt'
  })
  const [events] = useState([])
  const [latestEvent] = useState(null)
  const [currentUser] = useState(null)

  const value = {
    status: statusInfo.status,
    statusMessage: statusInfo.message,
    isConnected: false,
    events,
    latestEvent,
    currentUser,
    connect: () => {},
    disconnect: () => {},
    publish: () => Promise.resolve({ success: true })
  }

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext)
  if (!context) {
    return {
      status: 'DISCONNECTED',
      statusMessage: 'Realtime đã tắt',
      isConnected: false,
      events: [],
      latestEvent: null,
      currentUser: null,
      connect: () => {},
      disconnect: () => {},
      publish: () => Promise.resolve({ success: true })
    }
  }
  return context
}

export default RealtimeContext
