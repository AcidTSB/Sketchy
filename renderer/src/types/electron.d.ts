// Type definitions for Electron API
export interface ElectronAPI {
  // Project
  getProjects: () => Promise<APIResponse<Project[]>>
  getProject: (id: number) => Promise<APIResponse<Project>>
  createProject: (payload: CreateProjectDTO) => Promise<APIResponse<Project>>
  updateProject: (id: number, payload: UpdateProjectDTO) => Promise<APIResponse<Project>>
  deleteProject: (id: number) => Promise<APIResponse<void>>
  selectAudioFiles: () => Promise<APIResponse<{ path: string; name: string }[]>>
  selectImageFile: () => Promise<APIResponse<{ path: string; name: string; base64: string } | null>>

  // Folder
  getFolders: (projectId: number) => Promise<APIResponse<Folder[]>>
  createFolder: (payload: CreateFolderDTO) => Promise<APIResponse<Folder>>
  updateFolder: (id: number, name: string) => Promise<APIResponse<Folder>>
  deleteFolder: (id: number) => Promise<APIResponse<void>>

  // Import
  importFiles: (payload: ImportFilesDTO) => Promise<APIResponse<{ importId: string }>>
  cancelImport: (importId: string) => Promise<APIResponse<void>>
  onImportProgress: (callback: (data: ImportProgress) => void) => () => void

  // Tracks
  getTracks: (projectId: number, folderId?: number) => Promise<APIResponse<Track[]>>
  getTrack: (trackId: number) => Promise<APIResponse<Track>>
  updateTrack: (trackId: number, payload: UpdateTrackDTO) => Promise<APIResponse<Track>>
  deleteTrack: (trackId: number) => Promise<APIResponse<void>>
  getTrackStems: (trackId: number) => Promise<APIResponse<TrackStemsInfo>>

  // Recording
  saveRecording: (payload: SaveRecordingDTO) => Promise<APIResponse<Track>>

  // File Versions
  getFileVersions: (trackId: number) => Promise<APIResponse<FileVersion[]>>
  setLatestVersion: (trackId: number, versionId: number) => Promise<APIResponse<Track>>
  deleteFileVersion: (versionId: number) => Promise<APIResponse<void>>

  // Playback
  getFilePath: (fileVersionId: number) => Promise<APIResponse<FilePathData>>
  extractMetadata: (filePath: string) => Promise<APIResponse<MetadataResult>>
  loadAudioFile: (filePath: string) => Promise<APIResponse<AudioFileData>>

  // Audio Control
  playAudio: (filePath: string) => Promise<APIResponse<void>>
  pauseAudio: () => Promise<APIResponse<void>>
  stopAudio: () => Promise<APIResponse<void>>
  seekAudio: (position: number) => Promise<APIResponse<void>>
  setVolume: (volume: number) => Promise<APIResponse<void>>
  setPlaybackRate: (rate: number) => Promise<APIResponse<void>>
  getCurrentTime: () => Promise<APIResponse<number>>
  getDuration: () => Promise<APIResponse<number>>
  onAudioTimeUpdate: (callback: (time: number) => void) => () => void
  onAudioEnded: (callback: () => void) => () => void

  // Tags
  getTags: () => Promise<APIResponse<Tag[]>>
  createTag: (payload: CreateTagDTO) => Promise<APIResponse<Tag>>
  addTagToTrack: (payload: AddTagToTrackDTO) => Promise<APIResponse<void>>
  removeTagFromTrack: (trackId: number, tagId: number) => Promise<APIResponse<void>>

  // Notes
  getNotes: (trackId: number) => Promise<APIResponse<Note[]>>
  createNote: (payload: CreateNoteDTO) => Promise<APIResponse<Note>>
  updateNote: (id: number, payload: UpdateNoteDTO) => Promise<APIResponse<Note>>
  deleteNote: (id: number) => Promise<APIResponse<void>>

  // User
  getCurrentUser: () => Promise<APIResponse<UserData>>
  updateUserProfile: (payload: UpdateUserProfileDTO) => Promise<APIResponse<UserData>>
  uploadAvatar: (filename: string, buffer: number[]) => Promise<APIResponse<string>>
  getSettings: () => Promise<APIResponse<AppSettings>>
  updateSettings: (payload: Partial<AppSettings>) => Promise<APIResponse<AppSettings>>
  logout: () => Promise<APIResponse<void>>
  deleteAccount: (userId: number) => Promise<APIResponse<void>>

  // Authentication
  authRegister: (payload: { name: string; email: string; password: string }) => Promise<
    APIResponse<{ id: number; name: string; email: string; emailVerified: boolean }> & {
      message?: string
    }
  >
  authLogin: (payload: {
    email: string
    password: string
  }) => Promise<APIResponse<{ id: number; name: string; email: string; emailVerified: boolean }>>
  authGetUserById: (userId: number) => Promise<APIResponse<UserData>>

  // Share
  createShareLink: (payload: CreateShareLinkDTO) => Promise<APIResponse<ShareLinkResponse>>
  getShareLink: (token: string) => Promise<APIResponse<ShareLinkInfo>>
  verifyShareLinkPassword: (
    token: string,
    password: string
  ) => Promise<APIResponse<{ valid: boolean }>>
  revokeShareLink: (id: number) => Promise<APIResponse<void>>
  getSharedContent: (token: string, password?: string) => Promise<APIResponse<SharedContent>>
  getWebViewerUrl: () => Promise<APIResponse<string>>

  // Stem Extraction
  splitStems: (payload: SplitStemsDTO) => Promise<APIResponse<{ extractionId: string }>>
  cancelStemExtraction: (extractionId: string) => Promise<APIResponse<void>>
  onStemProgress: (callback: (progress: StemProgress) => void) => () => void

  // Audio Analysis
  analyzeAudio: (payload: { trackId: number }) => Promise<APIResponse<AudioAnalysisResult>>
  onAudioAnalysisProgress: (callback: (progress: AudioAnalysisProgress) => void) => () => void

  // Project Snapshots (Version Timeline)
  createProjectSnapshot: (
    projectId: number,
    name: string,
    description?: string
  ) => Promise<APIResponse<ProjectSnapshot>>
  getProjectSnapshots: (projectId: number) => Promise<APIResponse<ProjectSnapshot[]>>
  restoreProjectSnapshot: (snapshotId: number) => Promise<APIResponse<void>>
  deleteProjectSnapshot: (snapshotId: number) => Promise<APIResponse<void>>

  // Backup & Export
  exportProject: (projectId: number) => Promise<APIResponse<{ path: string; size: number }>>
  importProject: (filePath: string) => Promise<APIResponse<Project>>
  getBackups: (projectId: number) => Promise<APIResponse<ProjectBackup[]>>
  createAutoBackup: (projectId: number) => Promise<APIResponse<ProjectBackup>>
  deleteBackup: (backupId: number) => Promise<APIResponse<void>>

  // Checklist & Notes (Project-level)
  getChecklist: (projectId: number) => Promise<APIResponse<ChecklistData>>
  updateChecklist: (projectId: number, data: ChecklistData) => Promise<APIResponse<void>>

  // Auto-Organization
  organizeProject: (projectId: number) => Promise<APIResponse<OrganizeResult>>

  // Metadata
  getMetadata: (projectId: number) => Promise<APIResponse<ProjectMetadata>>
  updateMetadata: (projectId: number, data: Partial<ProjectMetadata>) => Promise<APIResponse<void>>

  // Batch Processing
  batchConvert: (options: BatchConvertOptions) => Promise<APIResponse<BatchResult>>
  batchRename: (options: BatchRenameOptions) => Promise<APIResponse<BatchResult>>
  batchNormalize: (options: BatchNormalizeOptions) => Promise<APIResponse<BatchResult>>
  batchTrimSilence: (options: BatchTrimSilenceOptions) => Promise<APIResponse<BatchResult>>
  cancelBatch: (batchId: string) => Promise<APIResponse<void>>
  onBatchProgress: (callback: (progress: BatchProgress) => void) => () => void

  // File Dialog
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>
  showItemInFolder: (path: string) => Promise<void>

  // Analytics & User Tracking
  startSession: (userId?: number) => Promise<APIResponse<{ sessionId: number }>>
  endSession: () => Promise<APIResponse<{ durationMins: number | null }>>
  trackActivity: (payload: {
    action: 'play' | 'import' | 'export' | 'create' | 'delete' | 'edit'
    trackId?: number
    projectId?: number
    metadata?: Record<string, unknown>
  }) => Promise<APIResponse<void>>
  trackPlay: (
    trackId: number,
    projectId: number,
    duration: number,
    completed: boolean
  ) => Promise<APIResponse<void>>
  getAnalyticsSummary: (query: {
    period: 'daily' | 'weekly' | 'monthly'
    startDate?: Date
    endDate?: Date
  }) => Promise<APIResponse<unknown>>
  getPopularTracks: (period: string, limit: number) => Promise<APIResponse<unknown[]>>
  getActivityTimeline: (days: number) => Promise<APIResponse<unknown[]>>
  getListeningStats: () => Promise<APIResponse<unknown>>
  getMostActiveProjects: (days: number, limit: number) => Promise<APIResponse<MostActiveProject[]>>

  // Notifications
  notificationRequestPermission: () => Promise<APIResponse<void>>
  notificationSendTest: (userId: number) => Promise<APIResponse<void>>

  //window controls
  minimize: () => void
  maximize: () => void
  close: () => void

  // Authentication
  authRegister: (payload: { name: string; email: string; password: string }) => Promise<
    APIResponse<{ id: number; name: string; email: string; emailVerified: boolean }> & {
      message?: string
    }
  >
  authLogin: (payload: {
    email: string
    password: string
  }) => Promise<APIResponse<{ id: number; name: string; email: string; emailVerified: boolean }>>
  authGoogleLogin: () => Promise<
    APIResponse<{
      id: number
      name: string
      email: string
      avatar?: string
      emailVerified: boolean
    }>
  >
  authLogout: () => Promise<APIResponse<void>>
  authGetUserById: (userId: number) => Promise<
    APIResponse<{
      id: number
      name: string
      email: string
      emailVerified: boolean
      avatar?: string
    }>
  >

  // Email verification
  verifyEmail: (token: string) => Promise<APIResponse<void> & { message?: string }>
  resendVerificationEmail: (email: string) => Promise<APIResponse<void> & { message?: string }>

  // Password reset
  requestPasswordReset: (email: string) => Promise<APIResponse<void> & { message?: string }>
  resetPassword: (payload: {
    token: string
    newPassword: string
  }) => Promise<APIResponse<void> & { message?: string }>
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface CreateProjectDTO {
  name: string
  description?: string
  coverArt?: string
}

export interface CreateFolderDTO {
  projectId: number
  name: string
}

export interface ImportFilesDTO {
  projectId: number
  folderId?: number
  files: { path: string; name: string }[]
  storageMode: 'copy' | 'reference'
}

export interface UpdateTrackDTO {
  title?: string
  folderId?: number | null
  status?: string | null // "draft" | "review" | "approved" | "final"
}

export interface SaveRecordingDTO {
  projectId: number
  folderId?: number
  name: string
  durationMs: number
  audioData: string // Base64 encoded audio
  mimeType?: string
}

export interface CreateTagDTO {
  name: string
}

export interface AddTagToTrackDTO {
  trackId: number
  tagId: number
}

export interface CreateNoteDTO {
  trackId: number
  content: string
}

export interface UpdateNoteDTO {
  content: string
}

export interface ImportProgress {
  importId: string
  file: string
  progress: number
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export interface FilePathData {
  path: string
  mimeType?: string | null
  durationMs?: number | null
}

export interface AudioFileData {
  buffer: number[]
  mimeType: string
}

export interface MetadataResult {
  durationMs?: number
  sampleRate?: number
  bitrate?: number
  codec?: string
  mimeType?: string
  sizeBytes: number
  channels?: number
  title?: string
  artist?: string
  album?: string
}

export interface Project {
  id: number
  name: string
  description?: string | null
  coverArt?: string | null
  bpm?: number | null
  musicalKey?: string | null
  mood?: string | null
  genre?: string | null
  notesJson?: string | null
  createdAt: string
  updatedAt: string
  folders?: Folder[]
  tracks?: Track[]
}

export interface Folder {
  id: number
  name: string
  projectId: number
  tracks?: Track[]
}

export interface Track {
  id: number
  projectId: number
  folderId?: number | null
  title: string
  status?: string | null // "draft" | "review" | "approved" | "final"
  latestVersionId?: number | null
  bpm?: number | null // Detected BPM
  key?: string | null // Detected musical key (e.g., "Am", "C#")
  createdAt: string
  latestVersion?: FileVersion
  versions?: FileVersion[]
  tags?: TrackTag[]
  notes?: Note[]
}

export interface FileVersion {
  id: number
  trackId: number
  createdAt: string
  createdBy?: string | null
  label?: string | null // Version label: "Demo", "Final Mix", "Master", etc.
  originalPath: string
  storedPath?: string | null
  storageMode: string
  mimeType?: string | null
  sizeBytes?: number | null
  durationMs?: number | null
  checksum?: string | null
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

export interface Note {
  id: number
  trackId: number
  content: string
  createdAt: string
}

export interface UserData {
  id: number
  name: string
  email: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  createdAt: string
  totalProjects: number
  totalTracks: number
  totalPlays: number
  followers: number
  following: number
}

export interface UpdateUserProfileDTO {
  name?: string
  email?: string
  bio?: string
  location?: string
  website?: string
}

export interface AppSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system'
  accentColor?: string

  // Audio
  audioQuality: 'low' | 'medium' | 'high'
  defaultQuality?: 'low' | 'medium' | 'high'
  autoSave: boolean
  autoPlay?: boolean
  crossfade?: boolean
  crossfadeDuration?: number

  // Storage & Location
  storageLocation: string
  autoSaveInterval?: number
  maxOfflineStorage?: number

  // Notifications
  notifications: boolean
  emailNotifications?: boolean
  pushNotifications?: boolean
  collaborationNotifications?: boolean

  // Privacy
  profileVisibility?: 'public' | 'private' | 'friends'
  showActivity?: boolean
  showStats?: boolean

  // Updates
  autoUpdate: boolean
}

export interface CreateShareLinkDTO {
  projectId?: number
  trackId?: number
  password?: string
  expiresAt?: string
}

export interface ShareLinkResponse {
  id: number
  token: string
  projectId?: number | null
  trackId?: number | null
  hasPassword: boolean
  expiresAt?: string | null
  createdAt: string
}

export interface ShareLinkInfo {
  id: number
  token: string
  projectId?: number | null
  trackId?: number | null
  hasPassword: boolean
  expiresAt?: string | null
  createdAt: string
  project?: Project | null
  track?: Track | null
}

export interface SharedContent {
  // Track data (khi share track)
  id?: number
  title?: string
  name?: string
  updatedAt?: string
  latestVersion?: FileVersion
  project?: {
    id: number
    name: string
  }
  // Project data (khi share project)
  folders?: Folder[]
  tracks?: Track[]
}

// Stem Extraction Types
export interface SplitStemsDTO {
  trackId: number
  stems: ('vocals' | 'drums' | 'bass' | 'other')[]
  outputFormat?: 'wav' | 'mp3'
}

export interface StemProgress {
  extractionId: string
  trackId: number
  progress: number // 0-100
  currentStem: string
  status: 'processing' | 'complete' | 'error'
  message?: string
}

export interface TrackStemsInfo {
  permanent: { trackId: number; stem: string; path: string; title: string }[]
  temporary: { stem: string; path: string }[]
}

// Audio Analysis Types
export interface AudioAnalysisResult {
  bpm?: number
  key?: string
  loudness?: LoudnessResult
  sampleType?: string // 'kick' | 'snare' | 'hihat' | 'bass' | 'vocal' | 'fx' | 'loop' | 'one-shot'
  error?: string
}

export interface AudioAnalysisProgress {
  trackId: number
  status: 'analyzing' | 'complete' | 'error'
  message: string
  bpm?: number
  key?: string
}

// Project Snapshot (Version Timeline)
export interface ProjectSnapshot {
  id: number
  projectId: number
  name: string
  description?: string | null
  snapshotPath: string
  metadata?: {
    projectName: string
    tracks: { id: number; title: string; status: string }[]
  } | null
  sizeBytes?: number | null
  createdAt: string
}

// Project Backup
export interface ProjectBackup {
  id: number
  projectId: number
  name: string
  backupPath: string
  metadata?: {
    projectName: string
    trackCount: number
    version: string
  } | null
  sizeBytes?: number | null
  isAutomatic: boolean
  createdAt: string
}

// Checklist Data
export interface ChecklistItem {
  text: string
  completed: boolean
}

export interface ChecklistData {
  notes: string[]
  checklist: ChecklistItem[]
  priority: 'low' | 'medium' | 'high' | null
  deadline: string | null
}

// Organization Result
export interface OrganizeResult {
  moved: { trackId: number; fromFolder?: string; toFolder: string }[]
  created: string[]
  unchanged: number
}

// Project Metadata
export interface ProjectMetadata {
  bpm: number | null
  musicalKey: string | null
  mood: string | null
  genre: string | null
}

// File Dialog Options
export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: { name: string; extensions: string[] }[]
  properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
}

export interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

// Batch Processing Types
export interface BatchConvertOptions {
  trackIds: number[]
  outputFormat: 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac'
  bitrate?: string
  sampleRate?: number
  outputDir?: string
}

export interface BatchRenameOptions {
  trackIds: number[]
  template: string // e.g., "[BPM]_[KEY]_[NAME]"
  startNumber?: number
}

export interface BatchNormalizeOptions {
  trackIds: number[]
  targetLUFS?: number // default: -14 LUFS
  targetPeak?: number // default: -1 dBTP
  createNewVersion?: boolean
}

export interface BatchTrimSilenceOptions {
  trackIds: number[]
  threshold?: number // dB threshold, default: -50dB
  minSilenceMs?: number // minimum silence duration to trim
  createNewVersion?: boolean
}

export interface BatchProgress {
  batchId: string
  currentFile: string
  currentIndex: number
  totalFiles: number
  status: 'processing' | 'complete' | 'error'
  message?: string
  error?: string
}

export interface BatchResult {
  batchId: string
  results: {
    trackId: number
    success: boolean
    outputPath?: string
    newName?: string
    trimmedMs?: number
    error?: string
  }[]
}

// LUFS Loudness Result
export interface LoudnessResult {
  integratedLUFS: number
  shortTermLUFS: number
  momentaryLUFS: number
  truePeak: number
  peak: number
  loudnessRange: number
}

// Extended Audio Analysis Result
export interface AudioAnalysisResultExtended {
  bpm?: number
  key?: string
  loudness?: LoudnessResult
  sampleType?: string // 'kick' | 'snare' | 'hihat' | 'bass' | 'vocal' | 'fx' | 'loop' | 'one-shot'
  error?: string
}

export interface MostActiveProject {
  id: number
  name: string
  tracksCount: number
  activityCount: number
  lastActivity: Date
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

import 'react'

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}
