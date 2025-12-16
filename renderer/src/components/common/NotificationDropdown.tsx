import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotificationStore } from '@/store/notificationStore'
import { cn } from '@/lib/utils'

export function NotificationDropdown() {
  const { notifications, removeNotification, clearAll } = useNotificationStore()

  const hasUnread = notifications.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 hover:opacity-80 rounded-apple transition-smooth">
          <Bell className="h-5 w-5" style={{ color: 'var(--text)' }} />
          {hasUnread && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-apple-lg">
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--surface)' }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
            Notifications
          </h3>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--surface)' }}>
              {notifications.map((notification) => (
                <div key={notification.id} className="px-4 py-3 hover:opacity-80 transition-smooth">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                        {notification.title}
                      </p>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {notification.message}
                      </p>
                      {notification.progress !== undefined && (
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 rounded-full h-1.5 overflow-hidden"
                            style={{ backgroundColor: 'var(--surface)' }}
                          >
                            <div
                              className={cn(
                                'h-full transition-all duration-300',
                                notification.type === 'error'
                                  ? 'bg-red-500'
                                  : notification.type === 'success'
                                    ? 'bg-green-500'
                                    : 'bg-purple-500'
                              )}
                              style={{ width: `${notification.progress}%` }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {notification.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="hover:opacity-80"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
