import { Bell, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNotificationStore, SystemNotification } from '@/store/notificationStore'
import { useClickOutside } from '@/hooks/useClickOutside'

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const notifications = useNotificationStore((state) => state.notifications)
  const removeNotification = useNotificationStore((state) => state.removeNotification)
  const clearAll = useNotificationStore((state) => state.clearAll)
  const panelRef = useRef<HTMLDivElement>(null)

  // Đóng panel khi click ra ngoài
  useClickOutside(panelRef, () => {
    if (isOpen) {
      setIsOpen(false)
    }
  })

  const unreadCount = notifications.filter(
    (n) => n.progress !== undefined || n.type === 'error'
  ).length

  const getNotificationColor = (type: SystemNotification['type']) => {
    switch (type) {
      case 'import':
      case 'convert':
      case 'export':
        return 'border-blue-500/30'
      case 'success':
        return 'border-green-500/30'
      case 'error':
        return 'border-red-500/30'
      case 'info':
      default:
        return ''
    }
  }

  const getNotificationIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'import':
        return '📥'
      case 'convert':
        return '🔄'
      case 'export':
        return '📤'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  const clearNotification = (id: string) => {
    removeNotification(id)
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Bell Icon */}
      <button
        className="relative p-2 rounded-apple hover:opacity-80 transition glass"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" style={{ color: 'var(--text)' }} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white font-semibold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel (Drawer) */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="fixed top-0 right-0 h-full w-96 glass-elevated border-l z-50 shadow-2xl flex flex-col"
            style={{ borderColor: 'var(--surface)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: 'var(--surface)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                System Tasks
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell
                    className="h-12 w-12 mx-auto mb-3"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <p style={{ color: 'var(--text-secondary)' }}>No active tasks</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 rounded-apple-lg border transition-all surface-subtle',
                      getNotificationColor(notification.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                            {notification.title}
                          </p>
                          <button
                            className="hover:opacity-70 transition"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={() => clearNotification(notification.id)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {notification.message}
                        </p>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                          {formatTimestamp(notification.timestamp)}
                        </p>

                        {/* Progress Bar */}
                        {notification.progress !== undefined && (
                          <div className="mt-3">
                            <div
                              className="flex items-center justify-between text-xs mb-1"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <span>Progress</span>
                              <span>{notification.progress}%</span>
                            </div>
                            <div
                              className="h-2 rounded-full overflow-hidden"
                              style={{ backgroundColor: 'var(--accent)' }}
                            >
                              <div
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${notification.progress}%`,
                                  backgroundColor: 'var(--primary)',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t" style={{ borderColor: 'var(--surface)' }}>
                <Button variant="ghost" className="w-full" onClick={() => clearAll()}>
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
