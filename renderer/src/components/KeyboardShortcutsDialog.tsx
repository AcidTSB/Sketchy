import { X, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  if (!isOpen) return null

  const categories = [
    { key: 'playback', title: 'Playback', icon: '▶️' },
    { key: 'volume', title: 'Volume', icon: '🔊' },
    { key: 'navigation', title: 'Navigation', icon: '🧭' },
    { key: 'general', title: 'General', icon: '⚙️' },
  ] as const

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Dialog */}
        <div className="relative glass-elevated rounded-apple-xl p-6 w-full max-w-lg shadow-apple-lg max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-apple flex items-center justify-center"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Keyboard className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                Keyboard Shortcuts
              </h2>
            </div>
            <Button variant="ghost" size="icon" className="rounded-apple" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {categories.map(({ key, title, icon }) => (
              <div key={key}>
                <h3
                  className="text-sm font-medium mb-3 flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>{icon}</span>
                  {title}
                </h3>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS[key].map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2 px-3 rounded-apple"
                      style={{ backgroundColor: 'var(--surface)' }}
                    >
                      <span style={{ color: 'var(--text)' }}>{shortcut.description}</span>
                      <kbd
                        className="px-2 py-1 rounded text-xs font-mono"
                        style={{
                          backgroundColor: 'var(--card)',
                          color: 'var(--text)',
                          border: '1px solid var(--accent)',
                        }}
                      >
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--accent)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              Press{' '}
              <kbd
                className="px-1 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)' }}
              >
                ?
              </kbd>{' '}
              or{' '}
              <kbd
                className="px-1 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)' }}
              >
                Ctrl + /
              </kbd>{' '}
              to toggle this dialog
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
