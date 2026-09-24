import { useEffect, useRef } from 'react'
import { useOpenInNewWindow } from './useOpenInNewWindow'

export function usePageHotkeys({ onSearch, onSave, onDelete, onOpenNewWindow, disabled = false }) {
  const { openInNewWindow } = useOpenInNewWindow()
  const defaultOpenNewWindow = () => openInNewWindow()

  const actionsRef = useRef({ onSearch, onSave, onDelete, onOpenNewWindow, disabled })
  const lastTriggerTimeRef = useRef({})

  actionsRef.current = { onSearch, onSave, onDelete, onOpenNewWindow, disabled }

  useEffect(() => {
    const triggerAction = (actionName, callback) => {
      if (actionsRef.current.disabled) return
      if (typeof callback !== 'function') return

      const now = Date.now()
      const lastTime = lastTriggerTimeRef.current[actionName] || 0
      if (now - lastTime < 400) {
        return
      }
      lastTriggerTimeRef.current[actionName] = now
      callback()
    }

    let unsubscribeSearch = null
    let unsubscribeSave = null
    let unsubscribeDelete = null
    let unsubscribeApp = null

    if (window.electron) {
      if (window.electron.onActionSearch) {
        unsubscribeSearch = window.electron.onActionSearch(() => {
          triggerAction('search', actionsRef.current.onSearch)
        })
      }

      if (window.electron.onActionSave) {
        unsubscribeSave = window.electron.onActionSave(() => {
          triggerAction('save', actionsRef.current.onSave)
        })
      }

      if (window.electron.onActionDelete) {
        unsubscribeDelete = window.electron.onActionDelete(() => {
          triggerAction('delete', actionsRef.current.onDelete)
        })
      }

      if (window.electron.onAppAction && !window.electron.onActionSearch) {
        unsubscribeApp = window.electron.onAppAction((action) => {
          if (action === 'search') {
            triggerAction('search', actionsRef.current.onSearch)
          } else if (action === 'save') {
            triggerAction('save', actionsRef.current.onSave)
          } else if (action === 'delete') {
            triggerAction('delete', actionsRef.current.onDelete)
          }
        })
      }
    }

    const handleKeyDown = (e) => {
      if (actionsRef.current.disabled) return

      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      if (!isCtrlOrMeta) return

      const key = e.key ? e.key.toLowerCase() : ''
      const code = e.code || ''
      const keyCode = e.keyCode || e.which

      if (key === 'q' || code === 'KeyQ' || keyCode === 81) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        triggerAction('search', actionsRef.current.onSearch)
        return
      }

      if ((key === 's' || code === 'KeyS' || keyCode === 83) && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        triggerAction('save', actionsRef.current.onSave)
        return
      }

      if ((key === 'd' || code === 'KeyD' || keyCode === 68) && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        triggerAction('delete', actionsRef.current.onDelete)
        return
      }

      if ((key === 'n' || code === 'KeyN' || keyCode === 78) && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        triggerAction('openNewWindow', actionsRef.current.onOpenNewWindow || defaultOpenNewWindow)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      if (unsubscribeSearch) unsubscribeSearch()
      if (unsubscribeSave) unsubscribeSave()
      if (unsubscribeDelete) unsubscribeDelete()
      if (unsubscribeApp) unsubscribeApp()
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])
}

export default usePageHotkeys
