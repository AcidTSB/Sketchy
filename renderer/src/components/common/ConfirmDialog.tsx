import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconColor: '#ef4444',
      confirmBg: '#ef4444',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#f59e0b',
      confirmBg: '#f59e0b',
    },
    info: {
      icon: AlertTriangle,
      iconColor: 'var(--primary)',
      confirmBg: 'var(--primary)',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onCancel}
    >
      <div
        className="glass-elevated rounded-apple-xl p-6 w-[450px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-apple" style={{ backgroundColor: `${style.iconColor}20` }}>
            <Icon size={24} style={{ color: style.iconColor }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              {title}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-apple hover:opacity-80 transition-smooth"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <X size={20} style={{ color: 'var(--text)' }} />
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-apple hover:opacity-80 transition-smooth font-medium"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-apple hover:opacity-90 transition-smooth font-medium"
            style={{
              backgroundColor: style.confirmBg,
              color: 'white',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
