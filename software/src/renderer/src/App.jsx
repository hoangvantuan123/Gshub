import { useEffect, useState } from 'react'
import UserRouter from './user/routes/userRouter'
import '@glideapps/glide-data-grid/dist/index.css'
import './App.css'
import { Modal } from 'antd'
import { initializeDatabase } from './IndexedDB/initializeDatabase'
const App = () => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const isIndexedDBSupported = () => {
    return 'indexedDB' in window
  }
  const isWebWorkerSupported = () => {
    return typeof Worker !== 'undefined'
  }
  const checkBrowserSupport = () => {
    const indexedDBSupported = isIndexedDBSupported()
    const webWorkerSupported = isWebWorkerSupported()

    if (!indexedDBSupported) {
      setIsModalVisible(true)
    }

    if (!webWorkerSupported) {
      setIsModalVisible(true)
    }

    if (!indexedDBSupported || !webWorkerSupported) {
      setIsModalVisible(true)
    }
  }

  useEffect(() => {
    checkBrowserSupport()
  }, [])

  useEffect(() => {
    const updateTitle = () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const envSelection = localStorage.getItem('envSelection') || 'official'
      const envLabel = envSelection === 'official' ? 'Goldsun PROD' : 'Goldsun DEV'

      if (userInfo.UserName) {
        document.title = `GsHub System - ${userInfo.UserName} (${envLabel})`
      } else {
        document.title = 'GsHub System'
      }
    }

    updateTitle()
    window.addEventListener('storage', updateTitle)
    window.addEventListener('env-changed', updateTitle)
    window.addEventListener('TITLE_UPDATE', updateTitle)

    return () => {
      window.removeEventListener('storage', updateTitle)
      window.removeEventListener('env-changed', updateTitle)
      window.removeEventListener('TITLE_UPDATE', updateTitle)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      await initializeDatabase()
    }

    initialize()
  }, [])

  const isElectron = typeof window !== 'undefined' && !!window.electron

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <UserRouter />
      </div>
      <Modal
        title="Cảnh báo"
        open={isModalVisible}
        footer={null}
        closable={false}
        maskClosable={false}
        centered={true}
      >
        <p>
          Môi trường của bạn không hỗ trợ các tính năng cần thiết. Vui lòng sử dụng môi trường hiện
          đại hơn để tiếp tục.
        </p>
      </Modal>
    </div>
  )
}

export default App
