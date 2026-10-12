import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export function showToast(msg, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('private_toast_event', {
      detail: { id: Date.now() + Math.random(), msg, type }
    })
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (e) => {
      const { id, msg, type } = e.detail
      setToasts((prev) => [...prev, { id, msg, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    }

    window.addEventListener('private_toast_event', handleToast)
    return () => window.removeEventListener('private_toast_event', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none select-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 border ${
            t.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
              : t.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                : 'bg-white text-slate-800 border-slate-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800'
          }`}
        >
          {t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : t.type === 'info' ? (
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <span>{t.msg}</span>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
