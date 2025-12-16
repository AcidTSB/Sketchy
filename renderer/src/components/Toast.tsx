import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore()

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  }

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  }

  return (
    <div
      className="glass-elevated rounded-apple-lg p-4 shadow-lg flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in"
      style={{
        borderLeft: `4px solid ${colors[toast.type]}`,
      }}
    >
      <div style={{ color: colors[toast.type] }}>{icons[toast.type]}</div>
      <p className="flex-1" style={{ color: 'var(--text)' }}>
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 hover:opacity-70 rounded-apple transition"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

// Helper hook for easy toast usage
export function useToast() {
  const { addToast } = useToastStore()

  return {
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  }
}
