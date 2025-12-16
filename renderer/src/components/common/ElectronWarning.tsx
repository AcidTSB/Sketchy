import { AlertCircle } from 'lucide-react'

export function ElectronWarning() {
  // Only show if NOT in Electron
  if (typeof window !== 'undefined' && window.electronAPI) {
    return null
  }

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl mx-auto"
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <div
        className="flex items-start gap-3 p-4 rounded-apple-lg shadow-apple-lg backdrop-blur-apple"
        style={{
          backgroundColor: 'rgba(255, 193, 7, 0.95)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
        }}
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#000' }} />
        <div className="flex-1">
          <h3 className="font-semibold mb-1" style={{ color: '#000' }}>
            Running in Web Mode - Limited Functionality
          </h3>
          <p className="text-sm mb-2" style={{ color: '#000', opacity: 0.9 }}>
            You&apos;re viewing this app in a web browser. Most features (create projects, import
            audio, etc.) require the desktop app.
          </p>
          <div
            className="text-xs font-mono px-2 py-1 rounded"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', color: '#000' }}
          >
            To use full features, run: <strong>pnpm dev</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add animation
const style = document.createElement('style')
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translate(-50%, -20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`
document.head.appendChild(style)
