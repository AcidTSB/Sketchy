import { create } from 'zustand'
import type { ShareLinkResponse, ShareLinkInfo, SharedContent } from '../types/electron'

interface ShareState {
  // State
  shareLinks: ShareLinkResponse[]
  currentShareLink: ShareLinkInfo | null
  sharedContent: SharedContent | null
  loading: boolean
  error: string | null

  // Actions
  createShareLink: (
    projectId?: number,
    trackId?: number,
    password?: string,
    expiresAt?: string
  ) => Promise<ShareLinkResponse | null>
  getShareLink: (token: string) => Promise<ShareLinkInfo | null>
  verifyPassword: (token: string, password: string) => Promise<boolean>
  revokeShareLink: (id: number) => Promise<void>
  getSharedContent: (token: string, password?: string) => Promise<SharedContent | null>
  clearError: () => void
}

export const useShareStore = create<ShareState>((set) => ({
  // Initial state
  shareLinks: [],
  currentShareLink: null,
  sharedContent: null,
  loading: false,
  error: null,

  // Create share link
  createShareLink: async (projectId?, trackId?, password?, expiresAt?) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.createShareLink({
        projectId,
        trackId,
        password,
        expiresAt,
      })

      if (success && data) {
        set((state) => ({
          shareLinks: [...state.shareLinks, data],
          currentShareLink: data, // Set currentShareLink để ShareDialog hiển thị được
          loading: false,
        }))
        return data
      } else {
        set({ error: error || 'Failed to create share link', loading: false })
        return null
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return null
    }
  },

  // Get share link info
  getShareLink: async (token: string) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.getShareLink(token)

      if (success && data) {
        set({ currentShareLink: data, loading: false })
        return data
      } else {
        set({ error: error || 'Failed to get share link', loading: false })
        return null
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return null
    }
  },

  // Verify share link password
  verifyPassword: async (token: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.verifyShareLinkPassword(
        token,
        password
      )

      if (success && data) {
        set({ loading: false })
        return data.valid
      } else {
        set({ error: error || 'Failed to verify password', loading: false })
        return false
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return false
    }
  },

  // Revoke share link
  revokeShareLink: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const { success, error } = await window.electronAPI.revokeShareLink(id)

      if (success) {
        set((state) => ({
          shareLinks: state.shareLinks.filter((link) => link.id !== id),
          currentShareLink: state.currentShareLink?.id === id ? null : state.currentShareLink,
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to revoke share link', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  // Get shared content
  getSharedContent: async (token: string, password?: string) => {
    set({ loading: true, error: null })
    try {
      const result = await window.electronAPI.getSharedContent(token, password)
      const { data, success, error } = result as {
        data?: unknown
        success: boolean
        error?: string
        needsPassword?: boolean
      }

      if (success && data) {
        set({ sharedContent: data, loading: false })
        return data
      } else {
        // Check if password is required
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((result as any).needsPassword) {
          set({ error: 'Password required', loading: false })
        } else {
          set({ error: error || 'Failed to get shared content', loading: false })
        }
        return null
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return null
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}))
