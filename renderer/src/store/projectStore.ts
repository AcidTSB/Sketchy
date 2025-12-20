import { create } from 'zustand'
import type {
  Project as ElectronProject,
  Folder as ElectronFolder,
  Track as ElectronTrack,
} from '../types/electron'
import type { Project, Folder, Track } from '../types'
import { notifications } from '@/services/notificationClient'

interface ProjectStore {
  // State
  folders: Folder[]
  projects: Project[]
  tracks: Track[]
  currentProject: Project | null
  currentTrack: Track | null
  playbackStems: {
    trackId: string
    stems: { vocals?: string; drums?: string; bass?: string; other?: string }
  } | null
  shouldAutoPlay: boolean // Flag to auto-play after track changes
  loading: boolean
  error: string | null

  // Folder actions
  loadFolders: (projectId: number) => Promise<void>
  createFolder: (projectId: number, name: string) => Promise<void>
  updateFolder: (folderId: number, name: string) => Promise<void>
  deleteFolder: (folderId: number) => Promise<void>

  // Project actions
  loadProjects: () => Promise<void>
  loadProject: (projectId: number) => Promise<void>
  createProject: (name: string, description?: string, coverArt?: string) => Promise<void>
  updateProject: (projectId: number, name: string, description?: string) => Promise<void>
  deleteProject: (projectId: number) => Promise<void>
  setCurrentProject: (projectId: string | null) => void

  // Track actions
  loadTracks: (projectId: number, folderId?: number) => Promise<void>
  loadTrack: (trackId: number) => Promise<void>
  updateTrack: (trackId: number, title: string, folderId?: number | null) => Promise<void>
  deleteTrack: (trackId: number) => Promise<void>
  setCurrentTrack: (trackId: string | null, autoPlay?: boolean) => void
  setPlaybackStems: (
    trackId: string,
    stems: { vocals?: string; drums?: string; bass?: string; other?: string } | null
  ) => void
  addTrack: (track: Track) => void
  addTrackFromBackend: (trackData: ElectronTrack) => Promise<void>

  // Helper functions
  getFolderProjects: (folderId: string) => Project[]
  getProjectTracks: (projectId: string) => Track[]
  getRootProjects: () => Project[]

  // Check if running in Electron
  isElectronAvailable: () => boolean
}

// Helper: Convert backend Project to frontend Project
function convertProject(p: ElectronProject): Project {
  return {
    id: p.id.toString(),
    folderId: null, // Backend doesn't have folder concept yet
    title: p.name,
    artist: 'Unknown', // TODO: Add artist field to backend
    coverArt: (p as { coverArt?: string }).coverArt || '', // Use uploaded cover art if available
    description: (p as { description?: string }).description || '', // Add description field
    trackCount: p.tracks?.length || 0,
    duration: p.tracks?.reduce((sum, t) => sum + (t.latestVersion?.durationMs || 0), 0) || 0,
    createdAt: new Date(p.createdAt),
    offline: false,
    muted: false,
    // Audio production metadata
    bpm: (p as { bpm?: number }).bpm || null,
    musicalKey: (p as { musicalKey?: string }).musicalKey || null,
    mood: (p as { mood?: string }).mood || null,
    genre: (p as { genre?: string }).genre || null,
    notesJson: (p as { notesJson?: string }).notesJson || null,
    // Note: tracks are loaded separately, not here
    tracks: [],
  }
}

// Helper: Convert backend Folder to frontend Folder
function convertFolder(f: ElectronFolder): Folder {
  return {
    id: f.id.toString(),
    title: f.name,
    coverArt: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    projectCount: f.tracks?.length || 0,
    createdAt: new Date(),
    offline: false,
    muted: false,
  }
}

// Helper: Convert backend Track to frontend Track
// Uses local HTTP server for efficient audio streaming
async function convertTrack(t: ElectronTrack, projectCoverArt?: string): Promise<Track> {
  let audioUrl: string | undefined

  // Try to get file path if track has a latest version
  if (t.latestVersionId) {
    try {
      const response = await window.electronAPI.getFilePath(t.latestVersionId)
      if (response.success && response.data) {
        // Use local HTTP server for streaming (works in both dev and production)
        // Server runs on localhost:45678 and handles security checks
        const encodedPath = encodeURIComponent(response.data.path)
        audioUrl = `http://localhost:45678?path=${encodedPath}`
      }
    } catch (error) {
      console.error('Failed to get file path for track:', t.id, error)
    }
  }

  return {
    id: t.id.toString(),
    projectId: t.projectId.toString(),
    title: t.title,
    artist: undefined,
    coverArt: projectCoverArt, // Use project cover art
    duration: (t.latestVersion?.durationMs || 0) / 1000, // Convert ms to seconds
    type: 'final', // TODO: Add type field to backend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: ((t as any).status as 'draft' | 'review' | 'final' | 'approved') || 'draft',
    waveformData: [], // TODO: Generate waveform
    audioUrl,
    createdAt: new Date(t.createdAt),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: (t as any).tags as
      | { trackId: number; tagId: number; tag: { id: number; name: string } }[]
      | undefined,
  }
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  folders: [],
  projects: [],
  tracks: [],
  currentProject: null,
  currentTrack: null,
  playbackStems: null,
  shouldAutoPlay: false,
  loading: false,
  error: null,

  // Folder actions
  loadFolders: async (projectId: number) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.getFolders(projectId)
      if (success && data) {
        set({ folders: data.map(convertFolder), loading: false })
      } else {
        set({ error: error || 'Failed to load folders', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  createFolder: async (projectId: number, name: string) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.createFolder({ projectId, name })
      if (success && data) {
        set((state) => ({
          folders: [...state.folders, convertFolder(data)],
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to create folder', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  updateFolder: async (folderId: number, name: string) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.updateFolder(folderId, name)
      if (success && data) {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === data.id.toString() ? convertFolder(data) : f
          ),
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to update folder', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  deleteFolder: async (folderId: number) => {
    set({ loading: true, error: null })
    try {
      const { success, error } = await window.electronAPI.deleteFolder(folderId)
      if (success) {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId.toString()),
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to delete folder', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  // Project actions
  loadProjects: async () => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.getProjects()
      if (success && data) {
        set({ projects: data.map(convertProject), loading: false })

        // Load tracks for all projects to populate sidebar
        const allTracks: Track[] = []
        for (const project of data) {
          try {
            const tracksResponse = await window.electronAPI.getTracks(project.id)
            if (tracksResponse.success && tracksResponse.data) {
              const projectCoverArt = (project as { coverArt?: string }).coverArt || ''
              const tracks = await Promise.all(
                tracksResponse.data.map((t) => convertTrack(t, projectCoverArt))
              )
              allTracks.push(...tracks)
            }
          } catch (err) {
            console.error(`Failed to load tracks for project ${project.id}:`, err)
          }
        }

        // Update tracks in store
        set({ tracks: allTracks })
      } else {
        set({ error: error || 'Failed to load projects', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  loadProject: async (projectId: number) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.getProject(projectId)
      if (success && data) {
        const project = convertProject(data)
        set((state) => ({
          projects: state.projects.some((p) => p.id === project.id)
            ? state.projects.map((p) => (p.id === project.id ? project : p))
            : [...state.projects, project],
          currentProject: project,
          loading: false,
        }))

        // Reload tracks with new cover art if project has changed
        const currentTracks = get().tracks
        if (currentTracks.length > 0 && currentTracks[0]?.projectId === project.id) {
          await get().loadTracks(projectId)
        }
      } else {
        set({ error: error || 'Failed to load project', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  createProject: async (name: string, description?: string, coverArt?: string) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.createProject({
        name,
        description,
        coverArt,
      })
      if (success && data) {
        set((state) => ({
          projects: [...state.projects, convertProject(data)],
          loading: false,
        }))
        notifications.success('Project created', `"${name}" has been created successfully`)
      } else {
        set({ error: error || 'Failed to create project', loading: false })
        notifications.error('Failed to create project', error || 'Please try again')
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      notifications.error('Failed to create project', String(error))
    }
  },

  updateProject: async (projectId: number, name: string, description?: string) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.updateProject(projectId, {
        name,
        description,
      })
      if (success && data) {
        const updated = convertProject(data)
        set((state) => ({
          projects: state.projects.map((p) => (p.id === String(projectId) ? updated : p)),
          currentProject:
            state.currentProject?.id === String(projectId) ? updated : state.currentProject,
          loading: false,
        }))
        notifications.success('Project updated', `"${name}" has been updated`)
      } else {
        set({ error: error || 'Failed to update project', loading: false })
        notifications.error('Failed to update project', error || 'Please try again')
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      notifications.error('Failed to update project', String(error))
    }
  },

  deleteProject: async (projectId: number) => {
    set({ loading: true, error: null })
    try {
      const { success, error } = await window.electronAPI.deleteProject(projectId)
      if (success) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId.toString()),
          currentProject:
            state.currentProject?.id === projectId.toString() ? null : state.currentProject,
          loading: false,
        }))
        notifications.success('Project deleted', 'Project has been deleted successfully')
      } else {
        set({ error: error || 'Failed to delete project', loading: false })
        notifications.error('Failed to delete project', error || 'Please try again')
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      notifications.error('Failed to delete project', String(error))
    }
  },

  setCurrentProject: (projectId: string | null) => {
    if (projectId === null) {
      set({ currentProject: null })
      return
    }
    const project = get().projects.find((p) => p.id === projectId)
    set({ currentProject: project || null })
  },

  // Track actions
  loadTracks: async (projectId: number, folderId?: number) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.getTracks(projectId, folderId)
      if (success && data) {
        // Get project cover art
        const project =
          get().currentProject || get().projects.find((p) => p.id === projectId.toString())
        const projectCoverArt = project?.coverArt

        // Convert tracks with async operations and project cover art
        const newTracks = await Promise.all(data.map((t) => convertTrack(t, projectCoverArt)))

        // Merge with existing tracks (replace tracks of this project, keep others)
        set((state) => ({
          tracks: [
            ...state.tracks.filter((t) => t.projectId !== projectId.toString()),
            ...newTracks,
          ],
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to load tracks', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  loadTrack: async (trackId: number) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.getTrack(trackId)
      if (success && data) {
        // Get project cover art
        const project =
          get().currentProject || get().projects.find((p) => p.id === data.projectId.toString())
        const projectCoverArt = project?.coverArt

        const track = await convertTrack(data, projectCoverArt)
        set((state) => ({
          tracks: state.tracks.some((t) => t.id === track.id)
            ? state.tracks.map((t) => (t.id === track.id ? track : t))
            : [...state.tracks, track],
          currentTrack: track,
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to load track', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  updateTrack: async (trackId: number, title: string, folderId?: number | null) => {
    set({ loading: true, error: null })
    try {
      const { data, success, error } = await window.electronAPI.updateTrack(trackId, {
        title,
        folderId,
      })
      if (success && data) {
        // Get project cover art
        const project =
          get().currentProject || get().projects.find((p) => p.id === data.projectId.toString())
        const projectCoverArt = project?.coverArt

        const updated = await convertTrack(data, projectCoverArt)
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === updated.id ? updated : t)),
          currentTrack: state.currentTrack?.id === updated.id ? updated : state.currentTrack,
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to update track', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  deleteTrack: async (trackId: number) => {
    set({ loading: true, error: null })
    try {
      const { success, error } = await window.electronAPI.deleteTrack(trackId)
      if (success) {
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== trackId.toString()),
          currentTrack: state.currentTrack?.id === trackId.toString() ? null : state.currentTrack,
          loading: false,
        }))
      } else {
        set({ error: error || 'Failed to delete track', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  setCurrentTrack: (trackId: string | null, autoPlay: boolean = false) => {
    if (trackId === null) {
      set({ currentTrack: null, shouldAutoPlay: false })
      return
    }
    const track = get().tracks.find((t) => t.id === trackId)
    set({ currentTrack: track || null, shouldAutoPlay: autoPlay })
  },

  setPlaybackStems: (trackId, stems) => {
    if (!stems) {
      set({ playbackStems: null })
      return
    }
    set({ playbackStems: { trackId, stems } })
  },

  addTrack: (track: Track) => {
    set((state) => ({
      tracks: [...state.tracks, track],
    }))
  },

  addTrackFromBackend: async (trackData: ElectronTrack) => {
    const project =
      get().currentProject || get().projects.find((p) => p.id === trackData.projectId.toString())
    const projectCoverArt = project?.coverArt
    const track = await convertTrack(trackData, projectCoverArt)
    get().addTrack(track)
  },

  // Helper functions
  getFolderProjects: (folderId: string) => get().projects.filter((p) => p.folderId === folderId),
  getProjectTracks: (projectId: string) => get().tracks.filter((t) => t.projectId === projectId),
  getRootProjects: () => get().projects.filter((p) => !p.folderId || p.folderId === null),

  // Check if running in Electron
  isElectronAvailable: () => {
    return typeof window !== 'undefined' && !!window.electronAPI
  },
}))
