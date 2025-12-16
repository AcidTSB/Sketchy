import { X, Minus, Square } from 'lucide-react'

export function WindowsControls() {
  const handleMinimize = () => {
    if (window.electronAPI) {
      // @ts-expect-error - Optional method in electronAPI
      window.electronAPI.minimize?.()
    }
  }

  const handleMaximize = () => {
    if (window.electronAPI) {
      // @ts-expect-error - Optional method in electronAPI
      window.electronAPI.maximize?.()
    }
  }

  const handleClose = () => {
    if (window.electronAPI) {
      // @ts-expect-error - Optional method in electronAPI
      window.electronAPI.close?.()
    }
  }

  // Only show on Windows
  if (navigator.userAgent.indexOf('Win') === -1) {
    return null
  }

  return (
    <div className="flex items-center gap-0 non-draggable">
      <button
        onClick={handleMinimize}
        className="h-8 w-12 hover:bg-white/10 transition-colors flex items-center justify-center"
        title="Minimize"
      >
        <Minus className="h-3 w-3" style={{ color: 'var(--text)' }} />
      </button>
      <button
        onClick={handleMaximize}
        className="h-8 w-12 hover:bg-white/10 transition-colors flex items-center justify-center"
        title="Maximize"
      >
        <Square className="h-3 w-3" style={{ color: 'var(--text)' }} />
      </button>
      <button
        onClick={handleClose}
        className="h-8 w-12 hover:bg-red-600 transition-colors flex items-center justify-center"
        title="Close"
      >
        <X className="h-4 w-4" style={{ color: 'var(--text)' }} />
      </button>
    </div>
  )
}
