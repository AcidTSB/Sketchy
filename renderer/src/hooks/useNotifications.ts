/**
 * Notifications Hook - Request browser notification permission
 */

import { useState, useEffect } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if notifications are supported (always true in Electron)
    setIsSupported(true)
    setPermission('granted') // Electron doesn't require permission
  }, [])

  const requestPermission = async () => {
    try {
      const result = await window.electronAPI.notificationRequestPermission()
      if (result.success) {
        setPermission('granted')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  const sendTestNotification = async (userId: number) => {
    try {
      if (!window.electronAPI.notificationSendTest) {
        console.error('❌ notificationSendTest method not found!')
        return false
      }

      const result = await window.electronAPI.notificationSendTest(userId)
      return result.success
    } catch (error) {
      console.error('Failed to send test notification:', error)
      return false
    }
  }

  const success = async (title: string, message: string) => {
    // Check user settings before showing notification
    try {
      const { useUserStore } = await import('@/store/userStore')
      const settings = useUserStore.getState().settings

      // Only show if push notifications are enabled
      if (!settings.pushNotifications) {
        return
      }
    } catch (error) {
      console.error('Failed to check notification settings:', error)
      return
    }

    // Use browser Notification API in Electron
    if (permission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        body: message,
        icon: '/icon.png',
      })
    }
  }

  const error = async (title: string, message: string) => {
    // Check user settings before showing notification
    try {
      const { useUserStore } = await import('@/store/userStore')
      const settings = useUserStore.getState().settings

      // Only show if push notifications are enabled
      if (!settings.pushNotifications) {
        return
      }
    } catch (error) {
      console.error('Failed to check notification settings:', error)
      return
    }

    if (permission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        body: message,
        icon: '/icon.png',
      })
    }
  }

  return {
    permission,
    isSupported,
    requestPermission,
    sendTestNotification,
    success,
    error,
  }
}
