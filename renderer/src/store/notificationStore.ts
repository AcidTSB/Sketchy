import { create } from 'zustand'

export interface SystemNotification {
  id: string
  type: 'import' | 'convert' | 'export' | 'error' | 'success' | 'info'
  title: string
  message: string
  progress?: number // 0-100 for ongoing tasks
  timestamp: Date
}

interface NotificationStore {
  notifications: SystemNotification[]
  addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => void
  updateNotification: (id: string, updates: Partial<SystemNotification>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: Date.now().toString(),
          timestamp: new Date(),
        },
        ...state.notifications,
      ],
    })),

  updateNotification: (id, updates) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}))

// Helper functions to add common notification types
export const notifyImportStart = (total: number) => {
  const id = Date.now().toString()
  useNotificationStore.getState().addNotification({
    type: 'import',
    title: 'Importing files...',
    message: `Starting import of ${total} files`,
    progress: 0,
  })
  return id
}

export const notifyImportProgress = (id: string, current: number, total: number) => {
  useNotificationStore.getState().updateNotification(id, {
    message: `${current}/${total} files processed`,
    progress: Math.round((current / total) * 100),
  })
}

export const notifyImportComplete = (id: string) => {
  useNotificationStore.getState().updateNotification(id, {
    type: 'success',
    title: 'Import complete',
    message: 'All files imported successfully',
    progress: 100,
  })

  // Auto-remove after 5 seconds
  setTimeout(() => {
    useNotificationStore.getState().removeNotification(id)
  }, 5000)
}

export const notifyConvertStart = (filename: string) => {
  const id = Date.now().toString()
  useNotificationStore.getState().addNotification({
    type: 'convert',
    title: 'Converting...',
    message: `Converting ${filename}`,
    progress: 0,
  })
  return id
}

export const notifyConvertComplete = (id: string, filename: string) => {
  useNotificationStore.getState().updateNotification(id, {
    type: 'success',
    title: 'Conversion complete',
    message: `${filename} successfully converted`,
    progress: 100,
  })

  setTimeout(() => {
    useNotificationStore.getState().removeNotification(id)
  }, 5000)
}

export const notifyError = (title: string, message: string) => {
  useNotificationStore.getState().addNotification({
    type: 'error',
    title,
    message,
  })
}

export const notifySuccess = (title: string, message: string) => {
  const id = Date.now().toString()
  useNotificationStore.getState().addNotification({
    type: 'success',
    title,
    message,
  })
  // Auto-remove after 5 seconds
  setTimeout(() => {
    useNotificationStore.getState().removeNotification(id)
  }, 5000)
  return id
}

export const notifyInfo = (title: string, message: string) => {
  const id = Date.now().toString()
  useNotificationStore.getState().addNotification({
    type: 'info',
    title,
    message,
  })
  // Auto-remove after 5 seconds
  setTimeout(() => {
    useNotificationStore.getState().removeNotification(id)
  }, 5000)
  return id
}
