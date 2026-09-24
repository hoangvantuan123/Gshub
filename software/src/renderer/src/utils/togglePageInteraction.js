let lockCount = 0
let failsafeTimer = null

const blockEvent = (e) => {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault()
    if (typeof e.stopPropagation === 'function') e.stopPropagation()
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
  }
  return false
}

const EVENTS_TO_BLOCK = [
  'wheel',
  'mousewheel',
  'DOMMouseScroll',
  'mousedown',
  'pointerdown',
  'mouseup',
  'pointerup',
  'click',
  'dblclick',
  'keydown',
  'keypress',
  'keyup',
  'contextmenu',
  'dragstart',
  'touchstart',
  'touchmove',
  'scroll'
]

const SHIELD_ID = 'global-native-interaction-shield'

function createOrUpdateShield() {
  let shield = document.getElementById(SHIELD_ID)
  if (!shield) {
    shield = document.createElement('div')
    shield.id = SHIELD_ID
    shield.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      background: transparent !important;
      cursor: wait !important;
      user-select: none !important;
      touch-action: none !important;
      pointer-events: all !important;
    `
    // Chặn trực tiếp mọi sự kiện rơi vào chính shield
    EVENTS_TO_BLOCK.forEach((ev) => {
      shield.addEventListener(ev, blockEvent, { capture: true, passive: false })
    })

    document.body.appendChild(shield)
  }
}

function removeShield() {
  const shield = document.getElementById(SHIELD_ID)
  if (shield && shield.parentNode) {
    shield.parentNode.removeChild(shield)
  }
}

const cleanupLocks = () => {
  lockCount = 0
  if (failsafeTimer) {
    clearTimeout(failsafeTimer)
    failsafeTimer = null
  }

  const isElectron = Boolean(window?.electron || window?.electron?.ipcRenderer)

  // 1. Gỡ bỏ Real DOM Shield
  removeShield()

  // 2. Mở khóa cấp Native Phần mềm Electron Desktop
  if (isElectron) {
    try {
      if (typeof window.electron?.setBusy === 'function') {
        window.electron.setBusy(false)
      } else if (window.electron?.ipcRenderer?.send) {
        window.electron.ipcRenderer.send('window:set-busy', false)
      }
    } catch (err) {
      console.warn('[Desktop Unlock Error]', err)
    }
  }

  // 3. Gỡ bỏ khóa DOM / CSS
  if (typeof document !== 'undefined') {
    document.body.classList.remove('page-loading')
    document.documentElement.classList.remove('page-loading')
    EVENTS_TO_BLOCK.forEach((event) => {
      window.removeEventListener(event, blockEvent, { capture: true })
      document.removeEventListener(event, blockEvent, { capture: true })
    })
  }
}

/**
 * togglePageInteraction: Cơ chế khóa tương tác thông minh Hybrid (Web & Electron Desktop)
 * - Môi trường Electron: Tận dụng IPC Main Process, Native Window State, và ProgressBar OS.
 * - Môi trường Web: Tận dụng Window Capture Phase Event Blocking + CSS Backdrop Overlay.
 */
export const togglePageInteraction = (isLoading) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const isElectron = Boolean(window?.electron || window?.electron?.ipcRenderer)

  if (isLoading) {
    lockCount++
    if (lockCount === 1) {
      // 1. Tối ưu hóa cấp Native Phần mềm Electron Desktop (OS / Hardware Level)
      if (isElectron) {
        try {
          if (typeof window.electron?.setBusy === 'function') {
            window.electron.setBusy(true)
          } else if (window.electron?.ipcRenderer?.send) {
            window.electron.ipcRenderer.send('window:set-busy', true)
          }
        } catch (err) {
          console.warn('[Desktop Lock Error]', err)
        }
      }

      // 2. Chèn Real DOM Top-level Blocking Shield trong suốt (z-index: 2147483647)
      createOrUpdateShield()

      // 3. Tối ưu hóa DOM / CSS (Áp dụng cho cả Web và Electron)
      document.body.classList.add('page-loading')
      document.documentElement.classList.add('page-loading')
      EVENTS_TO_BLOCK.forEach((event) => {
        window.addEventListener(event, blockEvent, { capture: true, passive: false })
        document.addEventListener(event, blockEvent, { capture: true, passive: false })
      })

      // Failsafe timer: tự động mở khóa sau tối đa 15 giây nếu có tiến trình nào quên unlock
      if (failsafeTimer) clearTimeout(failsafeTimer)
      failsafeTimer = setTimeout(() => {
        cleanupLocks()
      }, 15000)
    }
  } else {
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      cleanupLocks()
    }
  }
}

export const forceUnlockPageInteraction = () => {
  cleanupLocks()
}

export const isPageBusy = () => lockCount > 0
