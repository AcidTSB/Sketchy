import { ipcMain } from 'electron'
import { log } from '../utils/logger'
import { notificationService } from '../services/notificationService'

export function registerNotificationHandlers() {
  /**
   * Request notification permission (for desktop notifications)
   */
  ipcMain.handle('notification-request-permission', async () => {
    try {
      // Electron notifications don't require explicit permission like Web API
      // Just return success
      return { success: true }
    } catch (error) {
      log.error({ error }, 'Failed to request notification permission')
      return { success: false, error: 'Failed to request permission' }
    }
  })

  /**
   * Send test notification
   */
  ipcMain.handle('notification-send-test', async (_event, userId: number) => {
    try {
      log.info({ userId }, 'IPC notification-send-test called')
      const success = await notificationService.sendTestNotification(userId)
      log.info({ success }, 'IPC notification-send-test completed')
      return { success }
    } catch (error) {
      console.error('❌ IPC HANDLER ERROR:', error)
      log.error({ error }, 'Failed to send test notification')
      return { success: false, error: 'Failed to send test notification' }
    }
  })
}
