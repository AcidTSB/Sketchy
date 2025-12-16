/**
 * Client-side Notification Service
 * Coordinates desktop notifications (via Electron) and in-app toasts
 */

import { useToastStore } from '@/components/Toast'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationOptions {
  title: string
  description?: string
  type?: NotificationType
  desktop?: boolean // Show desktop notification
  inApp?: boolean // Show in-app toast
}

/**
 * Show notification (desktop and/or in-app)
 */
export async function notify(options: NotificationOptions) {
  const { title, description, type = 'info', inApp = true } = options

  // Show in-app toast
  if (inApp) {
    const message = description ? `${title}: ${description}` : title
    const toastType = type === 'warning' ? 'error' : type // Map warning to error since Toast only has success/error/info
    useToastStore.getState().addToast(toastType, message, 3000)
  }
}

export const notifications = {
  success: (title: string, description?: string, desktop = false) =>
    notify({ title, description, type: 'success', desktop, inApp: true }),

  error: (title: string, description?: string, desktop = false) =>
    notify({ title, description, type: 'error', desktop, inApp: true }),

  warning: (title: string, description?: string, desktop = false) =>
    notify({ title, description, type: 'warning', desktop, inApp: true }),

  info: (title: string, description?: string, desktop = false) =>
    notify({ title, description, type: 'info', desktop, inApp: true }),
}
