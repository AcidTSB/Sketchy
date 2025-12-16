import { create } from 'zustand'
import { Project, Track, Folder, Tag } from '../types/electron'

interface AppState {
  // Current selections
  currentProject: Project | null
  currentFolder: Folder | null
  currentTrack: Track | null

  // Lists
  projects: Project[]
  tracks: Track[]
  tags: Tag[]

  // UI state
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentProject: (project: Project | null) => void
  setCurrentFolder: (folder: Folder | null) => void
  setCurrentTrack: (track: Track | null) => void
  setProjects: (projects: Project[]) => void
  setTracks: (tracks: Track[]) => void
  setTags: (tags: Tag[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useStore = create<AppState>((set) => ({
  currentProject: null,
  currentFolder: null,
  currentTrack: null,
  projects: [],
  tracks: [],
  tags: [],
  isLoading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setProjects: (projects) => set({ projects }),
  setTracks: (tracks) => set({ tracks }),
  setTags: (tags) => set({ tags }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
