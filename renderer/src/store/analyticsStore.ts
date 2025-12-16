import { create } from 'zustand'

// Move fetching flags OUTSIDE state to prevent infinite re-renders
const fetchingFlags = {
  summary: false,
  popularTracks: false,
  timeline: false,
  listeningStats: false,
  mostActiveProjects: false,
}

// ... (Giữ nguyên các interface ActivityLog, AnalyticsSummary, PopularTrack, ListeningStats cũ) ...

interface ActivityLog {
  id: number
  userId: number
  action: string
  entityType: string | null
  entityId: number | null
  metadata: string | null
  createdAt: Date
}

interface AnalyticsSummary {
  id: number
  userId: number
  date: Date
  period: string
  projectsCreated: number
  tracksImported: number
  tracksPlayed: number
  playTimeSeconds: number
  exportsCount: number
  sessionsCount: number
  avgSessionMins: number
}

interface PopularTrack {
  id: number
  name: string
  playsCount: number
  rankScore: number
  lastPlayedAt: Date | null
  project: {
    id: number
    name: string
  }
}

interface ListeningStats {
  totalPlayTimeSeconds: number
  totalPlays: number
  mostPlayedTrackId?: number
  playsByDay: Array<{
    date: string
    totalSeconds: number
  }>
}

interface MostActiveProject {
  id: number
  name: string
  tracksCount: number
  activityCount: number
  lastActivity: Date
}

interface AnalyticsStore {
  sessionId: number | null
  summary: AnalyticsSummary | null
  popularTracks: PopularTrack[]
  recentActivities: ActivityLog[]
  listeningStats: ListeningStats
  mostActiveProjects: MostActiveProject[]

  // Remove fetchingFlags from state - use external variable instead
  error: string | null

  // Actions
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  trackActivity: (
    action: 'play' | 'import' | 'export' | 'create' | 'delete' | 'edit',
    trackId?: number,
    projectId?: number,
    metadata?: Record<string, unknown>
  ) => Promise<void>
  trackPlay: (
    trackId: number,
    projectId: number,
    duration: number,
    completed: boolean
  ) => Promise<void>

  // Thêm param 'force' để ép buộc hiện loading nếu cần
  fetchSummary: (period: 'daily' | 'weekly' | 'monthly', force?: boolean) => Promise<void>
  fetchPopularTracks: (period: string, limit: number, force?: boolean) => Promise<void>
  fetchTimeline: (days: number, force?: boolean) => Promise<void>
  fetchListeningStats: (force?: boolean) => Promise<void>
  fetchMostActiveProjects: (days: number, limit: number, force?: boolean) => Promise<void>
  reset: () => void
}

const initialState = {
  sessionId: null,
  summary: null,
  popularTracks: [],
  recentActivities: [],
  listeningStats: {
    totalPlayTimeSeconds: 0,
    totalPlays: 0,
    playsByDay: [],
  },
  mostActiveProjects: [],
  error: null,
}

export const useAnalyticsStore = create<AnalyticsStore>()((set, _get) => ({
  ...initialState,

  startSession: async () => {
    // ... (Giữ nguyên logic cũ)
    try {
      if (!window.electronAPI) return
      const result = await window.electronAPI.startSession()
      if (result.success && result.data) {
        set({ sessionId: result.data.sessionId })
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  },

  endSession: async () => {
    // ... (Giữ nguyên logic cũ)
    try {
      if (!window.electronAPI) return
      await window.electronAPI.endSession()
      set({ sessionId: null })
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  },

  trackActivity: async (action, trackId, projectId, metadata) => {
    // ... (Giữ nguyên logic cũ)
    try {
      if (!window.electronAPI) return
      await window.electronAPI.trackActivity({
        action,
        trackId,
        projectId,
        metadata,
      })
    } catch (error) {
      console.error('Failed to track activity:', error)
    }
  },

  trackPlay: async (trackId, projectId, duration, completed) => {
    try {
      if (!window.electronAPI) {
        console.warn('[Analytics] electronAPI not available')
        return
      }
      await window.electronAPI.trackPlay(trackId, projectId, duration, completed)

      // Refresh user stats (total plays) right after a play is recorded
      try {
        const { useUserStore } = await import('./userStore')
        await useUserStore.getState().fetchUser()
      } catch (e) {
        console.warn('[Analytics] Failed to refresh user stats after trackPlay', e)
      }
    } catch (error) {
      console.error('Failed to track play:', error)
    }
  },

  // --- FIX QUAN TRỌNG Ở CÁC HÀM FETCH BÊN DƯỚI ---

  fetchSummary: async (period, _force = false) => {
    // Use external flag to prevent re-renders
    if (fetchingFlags.summary) {
      return
    }
    fetchingFlags.summary = true

    try {
      if (!window.electronAPI) {
        console.warn('[Analytics] electronAPI not available')
        return
      }

      const result = await window.electronAPI.getAnalyticsSummary({ period })

      if (result.success && result.data) {
        set({ summary: result.data as AnalyticsSummary, error: null })
      } else {
        set({ error: result.error || 'Failed to fetch summary' })
      }
    } catch (error) {
      set({ error: 'Failed to fetch summary' })
      console.error('[Analytics] fetchSummary error:', error)
    } finally {
      fetchingFlags.summary = false
    }
  },

  fetchPopularTracks: async (period = 'all_time', limit = 10, _force = false) => {
    if (fetchingFlags.popularTracks) {
      return
    }
    fetchingFlags.popularTracks = true

    try {
      if (!window.electronAPI) {
        console.warn('[Analytics] electronAPI not available')
        return
      }

      const result = await window.electronAPI.getPopularTracks(period, limit)

      if (result.success && result.data) {
        set({ popularTracks: result.data as PopularTrack[], error: null })
      }
    } catch (error) {
      set({ error: 'Failed to fetch popular tracks' })
      console.error('[Analytics] fetchPopularTracks error:', error)
    } finally {
      fetchingFlags.popularTracks = false
    }
  },

  fetchTimeline: async (days = 30, _force = false) => {
    if (fetchingFlags.timeline) {
      return
    }
    fetchingFlags.timeline = true

    try {
      if (!window.electronAPI) {
        console.warn('[Analytics] electronAPI not available')
        return
      }

      const result = await window.electronAPI.getActivityTimeline(days)

      if (result.success && result.data) {
        set({ recentActivities: result.data as ActivityLog[], error: null })
      }
    } catch (error) {
      set({ error: 'Failed to fetch timeline' })
      console.error('[Analytics] fetchTimeline error:', error)
    } finally {
      fetchingFlags.timeline = false
    }
  },

  fetchListeningStats: async (_force = false) => {
    if (fetchingFlags.listeningStats) {
      return
    }
    fetchingFlags.listeningStats = true

    try {
      if (!window.electronAPI) {
        console.warn('[Analytics] electronAPI not available')
        return
      }

      const result = await window.electronAPI.getListeningStats()

      if (result.success && result.data) {
        set({ listeningStats: result.data as ListeningStats, error: null })
      }
    } catch (error) {
      set({ error: 'Failed to fetch listening stats' })
      console.error('[Analytics] fetchListeningStats error:', error)
    } finally {
      fetchingFlags.listeningStats = false
    }
  },

  fetchMostActiveProjects: async (days = 30, limit = 5, _force = false) => {
    if (fetchingFlags.mostActiveProjects) {
      return
    }
    fetchingFlags.mostActiveProjects = true

    try {
      if (!window.electronAPI) {
        console.warn('[Analytics] electronAPI not available')
        return
      }

      const result = await window.electronAPI.getMostActiveProjects(days, limit)

      if (result.success && result.data) {
        set({ mostActiveProjects: result.data as MostActiveProject[], error: null })
      }
    } catch (error) {
      set({ error: 'Failed to fetch most active projects' })
      console.error('[Analytics] fetchMostActiveProjects error:', error)
    } finally {
      fetchingFlags.mostActiveProjects = false
    }
  },

  reset: () => set(initialState),
}))
