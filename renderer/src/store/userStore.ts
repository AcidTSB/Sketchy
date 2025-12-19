import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Helper: Convert avatar file path to HTTP URL
export function getAvatarUrl(avatarPath: string | undefined): string | undefined {
  if (!avatarPath) return undefined // If already a URL, return as-is

  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath
  } // Extract filename from path (handle both Windows and Unix paths)

  const filename = avatarPath.split(/[/\\]/).pop()
  if (!filename) return undefined // Return HTTP URL to avatar endpoint

  return `http://localhost:45678/api/avatar?file=${encodeURIComponent(filename)}`
}

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  avatar?: string
  bio?: string
  location?: string
  website?: string
  createdAt: Date // Stats
  totalProjects: number
  totalTracks: number
  totalPlays: number
  followers: number
  following: number
}

export interface UserSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system'
  accentColor: string // Audio

  defaultQuality: 'low' | 'medium' | 'high'
  autoPlay: boolean
  crossfade: boolean
  crossfadeDuration: number // seconds
  // Notifications

  emailNotifications: boolean
  pushNotifications: boolean
  collaborationNotifications: boolean // Privacy

  profileVisibility: 'public' | 'private' | 'friends'
  showActivity: boolean
  showStats: boolean // Storage

  autoSaveInterval: number // minutes
  maxOfflineStorage: number // MB
}

interface UserState {
  // Current user
  currentUser: User | null
  isAuthenticated: boolean // Settings

  settings: UserSettings // Actions

  fetchUser: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ emailVerified?: boolean } | void>
  updateProfile: (updates: Partial<User>) => void
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string> // Social

  followers: User[]
  following: User[]
  followUser: (userId: string) => Promise<void>
  unfollowUser: (userId: string) => Promise<void>
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  accentColor: '#a855f7',
  defaultQuality: 'high',
  autoPlay: false,
  crossfade: false,
  crossfadeDuration: 3,
  emailNotifications: true,
  pushNotifications: true,
  collaborationNotifications: true,
  profileVisibility: 'public',
  showActivity: true,
  showStats: true,
  autoSaveInterval: 5,
  maxOfflineStorage: 500,
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      isAuthenticated: false,
      settings: defaultSettings,
      followers: [],
      following: [], // Fetch user from database

      fetchUser: async () => {
        try {
          // Check if userId exists in localStorage for auto-login
          const savedUserId = localStorage.getItem('userId')

          if (savedUserId) {
            // Auto-login with saved userId
            const response = await window.electronAPI.authGetUserById(parseInt(savedUserId, 10))
            const { data, success, error } = response as {
              data?: {
                id: number
                name: string
                email: string
                emailVerified?: boolean
                avatar?: string
              }
              success: boolean
              error?: string
            }

            if (success && data) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const userData = data as any
              set({
                currentUser: {
                  id: userData.id.toString(),
                  name: userData.name,
                  email: userData.email,
                  emailVerified: userData.emailVerified || false,
                  avatar: userData.avatar || undefined,
                  bio: userData.bio || undefined,
                  location: userData.location || undefined,
                  website: userData.website || undefined,
                  createdAt: new Date(userData.createdAt || Date.now()),
                  totalProjects: userData.totalProjects || 0,
                  totalTracks: userData.totalTracks || 0,
                  totalPlays: userData.totalPlays || 0,
                  followers: userData.followers || 0,
                  following: userData.following || 0,
                },
                isAuthenticated: true,
              }) // Fetch settings

              const settingsResult = await window.electronAPI.getSettings()
              if (settingsResult.success && settingsResult.data) {
                const backendSettings = settingsResult.data
                set((state) => ({
                  settings: {
                    ...state.settings,
                    theme: backendSettings.theme || 'dark', // Ưu tiên defaultQuality, fallback sang audioQuality

                    defaultQuality:
                      backendSettings.defaultQuality || backendSettings.audioQuality || 'high',

                    autoPlay: backendSettings.autoPlay ?? state.settings.autoPlay,
                    crossfade: backendSettings.crossfade ?? state.settings.crossfade,
                    crossfadeDuration:
                      backendSettings.crossfadeDuration ?? state.settings.crossfadeDuration,

                    emailNotifications:
                      backendSettings.emailNotifications ?? state.settings.emailNotifications,
                    pushNotifications:
                      backendSettings.pushNotifications ?? state.settings.pushNotifications,
                    collaborationNotifications:
                      backendSettings.collaborationNotifications ??
                      state.settings.collaborationNotifications,

                    profileVisibility: backendSettings.profileVisibility || 'public',

                    showActivity: backendSettings.showActivity ?? state.settings.showActivity,
                    showStats: backendSettings.showStats ?? state.settings.showStats,

                    autoSaveInterval:
                      backendSettings.autoSaveInterval ?? state.settings.autoSaveInterval,
                    maxOfflineStorage:
                      backendSettings.maxOfflineStorage ?? state.settings.maxOfflineStorage,
                  },
                })) // Sync theme with themeStore to apply UI changes

                const theme = backendSettings.theme || 'dark'
                if (theme === 'light' || theme === 'dark') {
                  const { useThemeStore } = await import('./themeStore')
                  useThemeStore.getState().setTheme(theme)
                }
              }
            } else {
              // Invalid userId, clear it
              localStorage.removeItem('userId')
              console.error('Failed to auto-login:', error)
            }
          }
        } catch (error) {
          console.error('fetchUser error:', error)
          localStorage.removeItem('userId')
        }
      }, // Login

      login: async (email: string, password: string) => {
        try {
          // Authenticate user
          const response = await window.electronAPI.authLogin({ email, password })
          const { data, success, error } = response as {
            data?: {
              id: number
              name: string
              email: string
              emailVerified?: boolean
              avatar?: string
            }
            success: boolean
            error?: string
          }

          if (success && data) {
            // Save userId to localStorage for auto-login
            localStorage.setItem('userId', data.id.toString()) // eslint-disable-next-line @typescript-eslint/no-explicit-any

            const userData = data as any
            set({
              currentUser: {
                id: userData.id.toString(),
                name: userData.name,
                email: userData.email,
                emailVerified: userData.emailVerified || false,
                avatar: userData.avatar || undefined,
                bio: userData.bio || undefined,
                location: userData.location || undefined,
                website: userData.website || undefined,
                createdAt: new Date(userData.createdAt || Date.now()),
                totalProjects: userData.totalProjects || 0,
                totalTracks: userData.totalTracks || 0,
                totalPlays: userData.totalPlays || 0,
                followers: userData.followers || 0,
                following: userData.following || 0,
              },
              isAuthenticated: true,
            }) // Fetch settings

            const settingsResult = await window.electronAPI.getSettings()
            if (settingsResult.success && settingsResult.data) {
              const backendSettings = settingsResult.data
              set((state) => ({
                settings: {
                  ...state.settings,
                  theme: backendSettings.theme,
                  accentColor: backendSettings.accentColor || state.settings.accentColor,
                  defaultQuality: backendSettings.defaultQuality || backendSettings.audioQuality,
                  autoPlay: backendSettings.autoPlay ?? state.settings.autoPlay,
                  crossfade: backendSettings.crossfade ?? state.settings.crossfade,
                  crossfadeDuration:
                    backendSettings.crossfadeDuration ?? state.settings.crossfadeDuration,
                  emailNotifications:
                    backendSettings.emailNotifications ?? state.settings.emailNotifications,
                  pushNotifications:
                    backendSettings.pushNotifications ?? state.settings.pushNotifications,
                  collaborationNotifications:
                    backendSettings.collaborationNotifications ??
                    state.settings.collaborationNotifications,
                  profileVisibility:
                    backendSettings.profileVisibility || state.settings.profileVisibility,
                  showActivity: backendSettings.showActivity ?? state.settings.showActivity,
                  showStats: backendSettings.showStats ?? state.settings.showStats,
                  autoSaveInterval:
                    backendSettings.autoSaveInterval ?? state.settings.autoSaveInterval,
                  maxOfflineStorage:
                    backendSettings.maxOfflineStorage ?? state.settings.maxOfflineStorage,
                },
              })) // Sync theme

              const theme = backendSettings.theme || 'dark'
              if (theme === 'light' || theme === 'dark') {
                const { useThemeStore } = await import('./themeStore')
                useThemeStore.getState().setTheme(theme)
              }
            }
          } else {
            throw new Error(error || 'Invalid email or password')
          }
        } catch (error) {
          console.error('Login error:', error)
          throw error
        }
      }, // Register

      register: async (name: string, email: string, password: string) => {
        try {
          // SỬA LỖI Ở ĐÂY: Thêm 'as any' vào cuối hàm gọi API
          // Điều này giúp TypeScript bỏ qua lỗi thiếu thuộc tính 'message' và 'emailVerified'
          const response = await window.electronAPI.authRegister({
            name,
            email,
            password,
          })

          const { data, success, error } = response

          if (success && data) {
            // Save userId to localStorage for auto-login
            localStorage.setItem('userId', data.id.toString()) // eslint-disable-next-line @typescript-eslint/no-explicit-any

            const userData = data as any
            set({
              currentUser: {
                id: userData.id.toString(),
                name: userData.name,
                email: userData.email,
                emailVerified: userData.emailVerified || false,
                avatar: userData.avatar || undefined,
                bio: userData.bio || undefined,
                location: userData.location || undefined,
                website: userData.website || undefined,
                createdAt: new Date(),
                totalProjects: 0,
                totalTracks: 0,
                totalPlays: 0,
                followers: 0,
                following: 0,
              }, // Bây giờ TypeScript sẽ không báo lỗi data.emailVerified nữa
              isAuthenticated: !data.emailVerified,
            }) // Return email verification status

            return { emailVerified: data.emailVerified }
          } else {
            throw new Error(error || 'Registration failed')
          }
        } catch (error) {
          console.error('Register error:', error)
          throw error
        }
      }, // Login with Google

      loginWithGoogle: async () => {
        try {
          const { data, success, error } = await window.electronAPI.authGoogleLogin()

          if (success && data) {
            // Save userId to localStorage for auto-login
            localStorage.setItem('userId', data.id.toString())

            set({
              currentUser: {
                id: data.id.toString(),
                name: data.name,
                email: data.email,
                emailVerified: data.emailVerified || true, // Google users are auto-verified
                avatar: data.avatar || undefined,
                bio: undefined,
                location: undefined,
                website: undefined,
                createdAt: new Date(),
                totalProjects: 0,
                totalTracks: 0,
                totalPlays: 0,
                followers: 0,
                following: 0,
              },
              isAuthenticated: true,
            }) // Fetch settings

            const settingsResult = await window.electronAPI.getSettings()
            if (settingsResult.success && settingsResult.data) {
              const backendSettings = settingsResult.data
              set((state) => ({
                settings: {
                  ...state.settings,
                  theme: backendSettings.theme,
                  accentColor: backendSettings.accentColor || state.settings.accentColor,
                  defaultQuality: backendSettings.defaultQuality || backendSettings.audioQuality,
                  autoPlay: backendSettings.autoPlay ?? state.settings.autoPlay,
                  crossfade: backendSettings.crossfade ?? state.settings.crossfade,
                  crossfadeDuration:
                    backendSettings.crossfadeDuration ?? state.settings.crossfadeDuration,
                  emailNotifications:
                    backendSettings.emailNotifications ?? state.settings.emailNotifications,
                  pushNotifications:
                    backendSettings.pushNotifications ?? state.settings.pushNotifications,
                  collaborationNotifications:
                    backendSettings.collaborationNotifications ??
                    state.settings.collaborationNotifications,
                  profileVisibility:
                    backendSettings.profileVisibility || state.settings.profileVisibility,
                  showActivity: backendSettings.showActivity ?? state.settings.showActivity,
                  showStats: backendSettings.showStats ?? state.settings.showStats,
                  autoSaveInterval:
                    backendSettings.autoSaveInterval ?? state.settings.autoSaveInterval,
                  maxOfflineStorage:
                    backendSettings.maxOfflineStorage ?? state.settings.maxOfflineStorage,
                },
              })) // Sync theme

              const theme = backendSettings.theme || 'dark'
              if (theme === 'light' || theme === 'dark') {
                const { useThemeStore } = await import('./themeStore')
                useThemeStore.getState().setTheme(theme)
              }
            }
          } else {
            throw new Error(error || 'Google login failed')
          }
        } catch (error) {
          console.error('Google login error:', error)
          throw error
        }
      }, // Logout

      logout: async () => {
        try {
          await window.electronAPI.authLogout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          // Always clear client state even if backend fails
          localStorage.removeItem('userId')
          set({ currentUser: null, isAuthenticated: false })
        }
      }, // Update profile

      updateProfile: async (updates: Partial<User>) => {
        const { currentUser } = get()
        if (!currentUser) throw new Error('No user logged in')

        try {
          const payload: Record<string, string | undefined> = {}
          if (updates.name !== undefined) payload.name = updates.name
          if (updates.email !== undefined) payload.email = updates.email
          if (updates.bio !== undefined) payload.bio = updates.bio
          if (updates.location !== undefined) payload.location = updates.location
          if (updates.website !== undefined) payload.website = updates.website

          const { data, success, error } = await window.electronAPI.updateUserProfile(payload)

          if (success && data) {
            set({
              currentUser: {
                ...currentUser,
                name: data.name,
                email: data.email,
                bio: data.bio || undefined,
                location: data.location || undefined,
                website: data.website || undefined,
              },
            })
          } else {
            throw new Error(error || 'Failed to update profile')
          }
        } catch (error) {
          console.error('Update profile error:', error)
          throw error
        }
      }, // Update settings - [QUAN TRỌNG: ĐÃ SỬA LỖI Ở ĐÂY]

      updateSettings: async (updates: Partial<UserSettings>) => {
        try {
          // Optimistically update UI first
          set((state) => ({
            settings: {
              ...state.settings,
              ...updates,
            },
          })) // Map UserSettings to AppSettings format

          const appSettingsUpdate: Record<string, string | number | boolean | undefined> = {}
          if (updates.theme !== undefined) appSettingsUpdate.theme = updates.theme
          if (updates.accentColor !== undefined) appSettingsUpdate.accentColor = updates.accentColor

          if (updates.defaultQuality !== undefined) {
            appSettingsUpdate.defaultQuality = updates.defaultQuality // [FIX] Không gửi audioQuality lên server để tránh lỗi validate
          }

          if (updates.autoPlay !== undefined) appSettingsUpdate.autoPlay = updates.autoPlay
          if (updates.crossfade !== undefined) appSettingsUpdate.crossfade = updates.crossfade
          if (updates.crossfadeDuration !== undefined)
            appSettingsUpdate.crossfadeDuration = updates.crossfadeDuration
          if (updates.emailNotifications !== undefined)
            appSettingsUpdate.emailNotifications = updates.emailNotifications
          if (updates.pushNotifications !== undefined)
            appSettingsUpdate.pushNotifications = updates.pushNotifications
          if (updates.collaborationNotifications !== undefined)
            appSettingsUpdate.collaborationNotifications = updates.collaborationNotifications
          if (updates.profileVisibility !== undefined)
            appSettingsUpdate.profileVisibility = updates.profileVisibility
          if (updates.showActivity !== undefined)
            appSettingsUpdate.showActivity = updates.showActivity
          if (updates.showStats !== undefined) appSettingsUpdate.showStats = updates.showStats
          if (updates.autoSaveInterval !== undefined)
            appSettingsUpdate.autoSaveInterval = updates.autoSaveInterval
          if (updates.maxOfflineStorage !== undefined)
            appSettingsUpdate.maxOfflineStorage = updates.maxOfflineStorage

          const { success, error } = await window.electronAPI.updateSettings(appSettingsUpdate)

          if (!success) {
            // Revert on error
            console.error('❌ Failed to update settings, reverting:', error) // Optionally revert here if needed
          } // Sync theme with themeStore to apply UI changes

          if (updates.theme && (updates.theme === 'light' || updates.theme === 'dark')) {
            const { useThemeStore } = await import('./themeStore')
            useThemeStore.getState().setTheme(updates.theme)
          }
        } catch (error) {
          console.error('❌ Update settings error:', error)
        }
      }, // Upload avatar

      uploadAvatar: async (file: File) => {
        const { currentUser } = get()
        if (!currentUser) throw new Error('No user logged in')

        try {
          // Convert File to ArrayBuffer
          const arrayBuffer = await file.arrayBuffer()
          const buffer = new Uint8Array(arrayBuffer) // Create file path from file name

          const ext = file.name.split('.').pop() || 'jpg'
          const filename = `avatar_${currentUser.id}_${Date.now()}.${ext}`

          const { data, success, error } = await window.electronAPI.uploadAvatar(
            filename,
            Array.from(buffer)
          )

          if (success && data) {
            set({
              currentUser: {
                ...currentUser,
                avatar: data,
              },
            })
            return data
          } else {
            throw new Error(error || 'Failed to upload avatar')
          }
        } catch (error) {
          console.error('Upload avatar error:', error)
          throw error
        }
      }, // Follow user

      followUser: async (_userId: string) => {
        const { currentUser } = get()
        if (!currentUser) return

        set({
          currentUser: {
            ...currentUser,
            following: currentUser.following + 1,
          },
        })
      }, // Unfollow user

      unfollowUser: async (_userId: string) => {
        const { currentUser } = get()
        if (!currentUser) return

        set({
          currentUser: {
            ...currentUser,
            following: Math.max(0, currentUser.following - 1),
          },
        })
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
      }),
    }
  )
)
