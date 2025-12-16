/**
 * Event Bus - Central event emitter for app-wide events
 * Used to trigger notifications and track activities
 */

import { EventEmitter } from 'events'
import { log } from '../utils/logger'

export type AppEvent =
  | 'file:imported'
  | 'file:deleted'
  | 'version:created'
  | 'version:deleted'
  | 'note:added'
  | 'note:updated'
  | 'note:deleted'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'track:created'
  | 'track:updated'
  | 'track:deleted'
  | 'collaboration:change'

export interface EventPayload {
  userId: number
  entityType: 'project' | 'track' | 'file' | 'note' | 'version'
  entityId: number
  action: string
  metadata?: Record<string, unknown>
}

class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100) // Increase listener limit for scalability
  }

  /**
   * Emit an app event
   */
  emitAppEvent(event: AppEvent, payload: EventPayload) {
    log.debug({ event, payload }, 'Event emitted')
    this.emit(event, payload)
    // Also emit wildcard for global listeners
    this.emit('*', event, payload)
  }

  /**
   * Subscribe to specific event
   */
  onAppEvent(event: AppEvent, handler: (payload: EventPayload) => void) {
    this.on(event, handler)
    return () => this.off(event, handler)
  }

  /**
   * Subscribe to all events
   */
  onAnyEvent(handler: (event: AppEvent, payload: EventPayload) => void) {
    this.on('*', handler)
    return () => this.off('*', handler)
  }
}

export const eventBus = new EventBus()
