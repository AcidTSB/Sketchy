export interface Folder {
  id: string
  title: string
  coverArt: string
  projectCount: number
  createdAt: Date
  offline: boolean
  muted: boolean
}

export interface Project {
  id: string
  folderId: string | null // null = root level project (không thuộc folder nào)
  title: string
  artist: string
  coverArt: string
  description?: string // Optional description for project
  trackCount: number
  duration: number
  createdAt: Date
  offline: boolean
  muted: boolean
  // Audio production metadata
  bpm?: number | null
  musicalKey?: string | null
  mood?: string | null
  genre?: string | null
  notesJson?: string | null
  // Tracks list
  tracks?: Track[]
}

export interface Track {
  id: string
  projectId: string
  title: string
  artist?: string
  coverArt?: string
  duration: number
  type: 'draft' | 'beat' | 'final'
  status?: 'draft' | 'review' | 'approved' | 'final' // Backend status field
  bpm?: number | null // Detected BPM
  key?: string | null // Detected musical key (e.g., "Am", "C#")
  waveformData: number[]
  audioUrl?: string
  createdAt: Date
  tags?: { trackId: number; tagId: number; tag: { id: number; name: string } }[]
}

// Share settings cho Folder, Project hoặc Track
export interface ShareSettings {
  id: string
  targetType: 'folder' | 'project' | 'track'
  targetId: string
  isPublic: boolean
  allowEditing: boolean
  allowDownloads: boolean
  requireAccount: boolean
  shareLink?: string
  collaborators: Collaborator[]
}

export interface Listener {
  id: string
  name: string
  avatar: string
  plays: number
  lastPlayed: Date
}

export interface TrackStats {
  trackId: string
  plays: number
  saves: number
  listeners: Listener[]
}

export interface User {
  id: string
  name: string
  avatar: string
  email: string
}

export interface Collaborator extends User {
  role: 'owner' | 'editor' | 'viewer'
  canEdit: boolean
  canDownload: boolean
}

export interface Tag {
  id: number
  name: string
}

export interface TrackTag {
  trackId: number
  tagId: number
  tag: Tag
}

// ============================================
// Batch Processing Types
// ============================================

export interface BatchProgress {
  batchId: string
  currentFile: string
  currentIndex: number
  totalFiles: number
  status: 'processing' | 'complete' | 'error'
  message?: string
  error?: string
}

export interface BatchResultItem {
  trackId: number
  success: boolean
  outputPath?: string
  newName?: string
  trimmedMs?: number
  message?: string
  error?: string
}

export interface BatchResult {
  batchId: string
  results: BatchResultItem[]
}
