import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Projects
  createProject: (p: Record<string, unknown>) => ipcRenderer.invoke('create-project', p),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getProject: (id: number) => ipcRenderer.invoke('get-project', id),
  updateProject: (id: number, payload: Record<string, unknown>) =>
    ipcRenderer.invoke('update-project', id, payload),
  deleteProject: (id: number) => ipcRenderer.invoke('delete-project', id),
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),

  // Folders
  getFolders: (projectId: number) => ipcRenderer.invoke('get-folders', projectId),
  createFolder: (payload: Record<string, unknown>) => ipcRenderer.invoke('create-folder', payload),
  updateFolder: (id: number, name: string) => ipcRenderer.invoke('update-folder', id, name),
  deleteFolder: (id: number) => ipcRenderer.invoke('delete-folder', id),

  // Tracks
  getTracks: (projectId: number, folderId?: number) =>
    ipcRenderer.invoke('get-tracks', projectId, folderId),
  getTrack: (trackId: number) => ipcRenderer.invoke('get-track', trackId),
  updateTrack: (trackId: number, payload: Record<string, unknown>) =>
    ipcRenderer.invoke('update-track', trackId, payload),
  deleteTrack: (trackId: number) => ipcRenderer.invoke('delete-track', trackId),

  // Recording
  saveRecording: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke('save-recording', payload),

  // Import
  importFiles: (payload: Record<string, unknown>) => ipcRenderer.invoke('import-files', payload),
  cancelImport: (importId: string) => ipcRenderer.invoke('cancel-import', importId),
  onImportProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('import-progress', handler)
    return () => ipcRenderer.removeListener('import-progress', handler)
  },

  // File versions
  getFileVersions: (trackId: number) => ipcRenderer.invoke('get-file-versions', trackId),
  setLatestVersion: (trackId: number, versionId: number) =>
    ipcRenderer.invoke('set-latest-version', trackId, versionId),
  deleteFileVersion: (versionId: number) => ipcRenderer.invoke('delete-file-version', versionId),
  getFilePath: (fileVersionId: number) => ipcRenderer.invoke('get-file-path', fileVersionId),
  extractMetadata: (filePath: string) => ipcRenderer.invoke('extract-metadata', filePath),
  loadAudioFile: (filePath: string) => ipcRenderer.invoke('load-audio-file', filePath),
  getTrackStems: (trackId: number) => ipcRenderer.invoke('get-track-stems', trackId),

  // Audio Control
  playAudio: (filePath: string) => ipcRenderer.invoke('play-audio', filePath),
  pauseAudio: () => ipcRenderer.invoke('pause-audio'),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  seekAudio: (position: number) => ipcRenderer.invoke('seek-audio', position),
  setVolume: (volume: number) => ipcRenderer.invoke('set-volume', volume),
  setPlaybackRate: (rate: number) => ipcRenderer.invoke('set-playback-rate', rate),
  getCurrentTime: () => ipcRenderer.invoke('get-current-time'),
  getDuration: () => ipcRenderer.invoke('get-duration'),
  onAudioTimeUpdate: (callback: (time: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, time: number) => callback(time)
    ipcRenderer.on('audio-time-update', handler)
    return () => ipcRenderer.removeListener('audio-time-update', handler)
  },
  onAudioEnded: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('audio-ended', handler)
    return () => ipcRenderer.removeListener('audio-ended', handler)
  },

  // Tags
  getTags: () => ipcRenderer.invoke('get-tags'),
  createTag: (payload: Record<string, unknown>) => ipcRenderer.invoke('create-tag', payload),
  addTagToTrack: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke('add-tag-to-track', payload),
  removeTagFromTrack: (trackId: number, tagId: number) =>
    ipcRenderer.invoke('remove-tag-from-track', trackId, tagId),

  // Notes
  getNotes: (trackId: number) => ipcRenderer.invoke('get-notes', trackId),
  createNote: (payload: Record<string, unknown>) => ipcRenderer.invoke('create-note', payload),
  updateNote: (id: number, payload: Record<string, unknown>) =>
    ipcRenderer.invoke('update-note', id, payload),
  deleteNote: (id: number) => ipcRenderer.invoke('delete-note', id),

  // Sharing
  getShareLinks: () => ipcRenderer.invoke('get-share-links'),
  getShareLink: (token: string) => ipcRenderer.invoke('get-share-link', token),
  createShareLink: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke('create-share-link', payload),
  verifyShareLinkPassword: (token: string, password: string) =>
    ipcRenderer.invoke('verify-share-link-password', token, password),
  revokeShareLink: (id: number) => ipcRenderer.invoke('revoke-share-link', id),
  deleteShareLink: (id: number) => ipcRenderer.invoke('delete-share-link', id),
  getSharedContent: (token: string, password?: string) =>
    ipcRenderer.invoke('get-shared-content', token, password),
  getWebViewerUrl: () => ipcRenderer.invoke('get-web-viewer-url'),

  // User
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  updateUserProfile: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke('update-user-profile', payload),
  uploadAvatar: (filename: string, buffer: number[]) =>
    ipcRenderer.invoke('upload-avatar', filename, buffer),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke('update-settings', payload),
  logout: () => ipcRenderer.invoke('logout'),
  deleteAccount: (userId: number) => ipcRenderer.invoke('delete-account', userId),

  // Authentication
  authRegister: (payload: { name: string; email: string; password: string }) =>
    ipcRenderer.invoke('auth-register', payload),
  authLogin: (payload: { email: string; password: string }) =>
    ipcRenderer.invoke('auth-login', payload),
  authGoogleLogin: () => ipcRenderer.invoke('auth-google-login'),
  authLogout: () => ipcRenderer.invoke('auth-logout'),
  authGetUserById: (userId: number) => ipcRenderer.invoke('auth-get-user-by-id', userId),

  // Email verification
  verifyEmail: (token: string) => ipcRenderer.invoke('auth-verify-email', token),
  resendVerificationEmail: (email: string) => ipcRenderer.invoke('auth-resend-verification', email),

  // Password reset
  requestPasswordReset: (email: string) => ipcRenderer.invoke('auth-request-password-reset', email),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    ipcRenderer.invoke('auth-reset-password', payload),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Stem Extraction
  splitStems: async (payload: Record<string, unknown>) => {
    try {
      const data = await ipcRenderer.invoke('stem:extract', payload)
      return { success: true, data }
    } catch (error) {
      console.error('[Preload] stem:extract error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
  cancelStemExtraction: (extractionId: string) => ipcRenderer.invoke('stem:cancel', extractionId),
  onStemProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress)
    ipcRenderer.on('stem:progress', handler)
    return () => ipcRenderer.removeListener('stem:progress', handler)
  },

  // Audio Analysis
  analyzeAudio: async (payload: Record<string, unknown>) => {
    try {
      const data = await ipcRenderer.invoke('audio-analysis:analyze', payload)
      return { success: true, data }
    } catch (error) {
      console.error('[Preload] audio-analysis:analyze error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
  onAudioAnalysisProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress)
    ipcRenderer.on('audio-analysis:progress', handler)
    return () => ipcRenderer.removeListener('audio-analysis:progress', handler)
  },

  // ============================================
  // NEW FEATURES: Version Timeline & Snapshots
  // ============================================

  // Project Snapshots
  createProjectSnapshot: (projectId: number, name: string, description?: string) =>
    ipcRenderer.invoke('create-project-snapshot', projectId, name, description),
  getProjectSnapshots: (projectId: number) =>
    ipcRenderer.invoke('get-project-snapshots', projectId),
  restoreProjectSnapshot: (snapshotId: number) =>
    ipcRenderer.invoke('restore-project-snapshot', snapshotId),
  deleteProjectSnapshot: (snapshotId: number) =>
    ipcRenderer.invoke('delete-project-snapshot', snapshotId),

  // Version Timeline
  getVersionTimeline: (trackId: number) => ipcRenderer.invoke('get-version-timeline', trackId),
  createTrackVersion: (trackId: number, label: string, sourcePath?: string) =>
    ipcRenderer.invoke('create-track-version', trackId, label, sourcePath),
  getVersionAudio: (versionId: number, versionType: string) =>
    ipcRenderer.invoke('get-version-audio', versionId, versionType),
  saveCompareSession: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('save-compare-session', data),

  // ============================================
  // NEW FEATURES: Backup & Export
  // ============================================

  exportProject: (projectId: number) => ipcRenderer.invoke('export-project', projectId),
  importProject: () => ipcRenderer.invoke('import-project'),
  getBackups: (projectId: number) => ipcRenderer.invoke('get-project-backups', projectId),
  createAutoBackup: (projectId: number) => ipcRenderer.invoke('auto-backup-project', projectId),
  deleteBackup: (backupId: number) => ipcRenderer.invoke('delete-backup', backupId),
  showOpenDialog: (options: Record<string, unknown>) =>
    ipcRenderer.invoke('show-open-dialog', options),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),

  // ============================================
  // NEW FEATURES: Checklist & Notes
  // ============================================

  getChecklist: (projectId: number) => ipcRenderer.invoke('get-checklist', projectId),
  updateChecklist: (projectId: number, data: Record<string, unknown>) =>
    ipcRenderer.invoke('update-checklist', projectId, data),

  // ============================================
  // NEW FEATURES: Auto Organization
  // ============================================

  organizeProject: (projectId: number) => ipcRenderer.invoke('organize-project', projectId),
  previewOrganizeProject: (projectId: number) =>
    ipcRenderer.invoke('preview-organize-project', projectId),
  suggestFolder: (title: string) => ipcRenderer.invoke('suggest-folder', title),

  // ============================================
  // NEW FEATURES: Metadata System
  // ============================================

  getMetadata: (projectId: number) => ipcRenderer.invoke('get-project-metadata', projectId),
  updateMetadata: (projectId: number, metadata: Record<string, unknown>) =>
    ipcRenderer.invoke('update-project-metadata', projectId, metadata),
  searchProjectsByMetadata: (filters: Record<string, unknown>) =>
    ipcRenderer.invoke('search-projects-by-metadata', filters),

  // ============================================
  // NEW FEATURES: Batch Processing
  // ============================================

  // Batch convert audio files
  batchConvert: (options: Record<string, unknown>) => ipcRenderer.invoke('batch:convert', options),

  // Batch rename tracks using template
  batchRename: (options: Record<string, unknown>) => ipcRenderer.invoke('batch:rename', options),

  // Normalize audio files to target LUFS
  batchNormalize: (options: Record<string, unknown>) =>
    ipcRenderer.invoke('batch:normalize', options),

  // Trim silence from audio files
  batchTrimSilence: (options: Record<string, unknown>) =>
    ipcRenderer.invoke('batch:trim-silence', options),

  // Cancel batch operation
  cancelBatch: (batchId: string) => ipcRenderer.invoke('batch:cancel', batchId),

  // Batch progress listener
  onBatchProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress)
    ipcRenderer.on('batch:progress', handler)
    return () => ipcRenderer.removeListener('batch:progress', handler)
  },

  // ============================================
  // NEW FEATURES: Analytics & User Tracking
  // ============================================

  // Analytics - Session
  startSession: (userId?: number) => ipcRenderer.invoke('analytics:start-session', userId),
  endSession: () => ipcRenderer.invoke('analytics:end-session'),

  // Analytics - Activity Tracking
  trackActivity: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke('analytics:track-activity', payload),
  trackPlay: (trackId: number, projectId: number, duration: number, completed: boolean) =>
    ipcRenderer.invoke('analytics:track-play', trackId, projectId, duration, completed),

  // Analytics - Data Retrieval
  getAnalyticsSummary: (query: Record<string, unknown>) =>
    ipcRenderer.invoke('analytics:get-summary', query),
  getPopularTracks: (period: string, limit: number) =>
    ipcRenderer.invoke('analytics:get-popular-tracks', period, limit),
  getActivityTimeline: (days: number) => ipcRenderer.invoke('analytics:get-timeline', days),
  getListeningStats: () => ipcRenderer.invoke('analytics:get-listening-stats'),
  getMostActiveProjects: (days: number, limit: number) =>
    ipcRenderer.invoke('analytics:get-most-active-projects', days, limit),

  // ============================================
  // NEW FEATURES: Notifications
  // ============================================

  notificationRequestPermission: () => ipcRenderer.invoke('notification-request-permission'),
  notificationSendTest: (userId: number) => ipcRenderer.invoke('notification-send-test', userId),
})
