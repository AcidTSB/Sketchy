/**
 * Notification Service - Handles email, push, and in-app notifications
 * Triggers notifications based on user settings and app events
 */

import { prisma } from '../db/client'
import { log } from '../utils/logger'
import { eventBus, EventPayload } from './eventBus'
import { Notification } from 'electron'

interface EmailNotification {
  to: string
  subject: string
  body: string
}

interface PushNotification {
  title: string
  body: string
  icon?: string
}

class NotificationService {
  constructor() {
    // Listen to all events for collaboration notifications
    eventBus.onAnyEvent((event, payload) => {
      this.handleEvent(event, payload)
    })
  }

  /**
   * Send email notification (stub - to be implemented with real email service)
   */
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      log.info({ to: notification.to, subject: notification.subject }, 'Email notification (stub)')
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      // For now, just log
      return true
    } catch (error) {
      log.error({ error }, 'Failed to send email')
      return false
    }
  }

  /**
   * Send desktop push notification
   */
  async sendPush(notification: PushNotification): Promise<boolean> {
    try {
      const electronNotification = new Notification({
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        urgency: 'critical',
        timeoutType: 'never',
      })

      electronNotification.show()
      log.info({ title: notification.title }, 'Desktop notification sent')
      return true
    } catch (error) {
      console.error('❌ sendPush ERROR:', error)
      log.error({ error }, 'Failed to send desktop notification')
      return false
    }
  }

  /**
   * Handle app events and trigger notifications based on user settings
   */
  private async handleEvent(event: string, payload: EventPayload) {
    try {
      // Get user settings
      const settings = await prisma.userSettings.findUnique({
        where: { userId: payload.userId },
      })

      if (!settings) return

      // Check if collaboration notifications are enabled
      if (!settings.collaborationNotifications) return

      // Determine notification message
      const message = this.getNotificationMessage(event, payload)
      if (!message) return

      // Send notifications based on user preferences
      const promises = []

      if (settings.pushNotifications) {
        promises.push(
          this.sendPush({
            title: 'Collaboration Update',
            body: message,
          })
        )
      }

      if (settings.emailNotifications) {
        const user = await prisma.userProfile.findUnique({
          where: { id: payload.userId },
        })

        if (user) {
          promises.push(
            this.sendEmail({
              to: user.email,
              subject: 'Collaboration Update',
              body: message,
            })
          )
        }
      }

      await Promise.all(promises)
    } catch (error) {
      log.error({ error, event, payload }, 'Failed to handle event notification')
    }
  }

  /**
   * Get notification message based on event type
   */
  private getNotificationMessage(event: string, payload: EventPayload): string | null {
    switch (event) {
      case 'file:imported':
        return `New file imported: ${payload.metadata?.fileName || 'Unknown'}`

      case 'version:created':
        return `New version created for track: ${payload.metadata?.trackName || 'Unknown'}`

      case 'note:added':
        return `New note added to ${payload.entityType}: ${typeof payload.metadata?.content === 'string' ? payload.metadata.content.substring(0, 50) : 'New note'}`

      case 'project:updated':
        if (payload.action === 'create_folder') {
          return `New folder created: ${payload.metadata?.folderName || 'Unknown'}`
        } else if (payload.action === 'delete_folder') {
          return `Folder deleted: ${payload.metadata?.folderName || 'Unknown'}`
        } else if (payload.action === 'create') {
          return `New project created: ${payload.metadata?.projectName || 'Unknown'}`
        } else {
          return `Project updated: ${payload.metadata?.projectName || 'Unknown'}`
        }

      case 'project:deleted':
        return `Project deleted: ${payload.metadata?.projectName || 'Unknown'}`

      case 'track:created': {
        const source = payload.metadata?.source === 'recording' ? 'recorded' : 'imported'
        return `New track ${source}: ${payload.metadata?.trackName || 'Unknown'}`
      }

      case 'track:deleted':
        return `Track deleted: ${payload.metadata?.trackName || 'Unknown'}`

      case 'collaboration:change':
        return (
          (typeof payload.metadata?.message === 'string' ? payload.metadata.message : null) ||
          'Collaboration change detected'
        )

      default:
        return null
    }
  }

  /**
   * Test notification (for settings page)
   */
  async sendTestNotification(userId: number): Promise<boolean> {
    try {
      log.info({ userId }, 'sendTestNotification called')

      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      })

      if (!settings) {
        log.warn({ userId }, 'No settings found for user')
        return false
      }

      if (settings.pushNotifications) {
        log.info('Push notifications enabled, sending...')
        await this.sendPush({
          title: 'Test Notification',
          body: 'This is a test notification from your audio production app!',
        })
      } else {
        log.warn('Push notifications disabled')
      }

      return true
    } catch (error) {
      console.error('💥💥💥 ERROR in sendTestNotification:', error)
      log.error({ error }, 'Failed to send test notification')
      return false
    }
  }
}

export const notificationService = new NotificationService()
