/**
 * Authentication Context
 * Manages current user session for IPC handlers
 */

let currentUserId: number | null = null

export function setCurrentUserId(userId: number | null) {
  currentUserId = userId
}

export function getCurrentUserId(): number {
  if (!currentUserId) {
    throw new Error('No user logged in. Please authenticate first.')
  }
  return currentUserId
}

export function isAuthenticated(): boolean {
  return currentUserId !== null
}

export function clearCurrentUserId() {
  currentUserId = null
}
