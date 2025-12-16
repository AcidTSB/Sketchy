import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'
import fs from 'fs-extra'

// Audio player state - handled in renderer process via HTML5 Audio API
// Main process just sends commands to renderer
export function registerPlaybackHandlers() {
  // Get file path for playback
  ipcMain.handle('get-file-path', async (_event: unknown, fileVersionId: number) => {
    try {
      const fileVersion = await prisma.fileVersion.findUnique({
        where: { id: fileVersionId },
      })

      if (!fileVersion) {
        return { success: false, error: 'File version not found' }
      }

      let filePath: string
      if (fileVersion.storageMode === 'copy' && fileVersion.storedPath) {
        filePath = fileVersion.storedPath
      } else {
        filePath = fileVersion.originalPath
      }

      // Check if file exists
      const exists = await fs.pathExists(filePath)
      if (!exists) {
        return { success: false, error: 'File not found on disk' }
      }

      return {
        success: true,
        data: {
          path: filePath,
          mimeType: fileVersion.mimeType,
          durationMs: fileVersion.durationMs,
        },
      }
    } catch (error) {
      log.error({ error, fileVersionId }, 'Failed to get file path')
      return { success: false, error: 'Failed to get file path' }
    }
  })

  // Extract metadata using music-metadata
  ipcMain.handle('extract-metadata', async (_event: unknown, filePath: string) => {
    try {
      const mm = await import('music-metadata')
      const stats = await fs.stat(filePath)
      const metadata = await mm.parseFile(filePath)

      return {
        success: true,
        data: {
          durationMs: metadata.format.duration
            ? Math.round(metadata.format.duration * 1000)
            : undefined,
          sampleRate: metadata.format.sampleRate,
          bitrate: metadata.format.bitrate,
          codec: metadata.format.codec,
          mimeType: metadata.format.container ? `audio/${metadata.format.container}` : undefined,
          sizeBytes: stats.size,
          channels: metadata.format.numberOfChannels,
          title: metadata.common.title,
          artist: metadata.common.artist,
          album: metadata.common.album,
        },
      }
    } catch (error) {
      log.error({ error, filePath }, 'Failed to extract metadata')
      return { success: false, error: 'Failed to extract metadata' }
    }
  })

  // Audio control handlers - these will be handled by renderer's audio element
  // But we provide the IPC handlers for consistency
  ipcMain.handle('play-audio', async (_event: unknown, filePath: string) => {
    try {
      // Verify file exists
      const exists = await fs.pathExists(filePath)
      if (!exists) {
        return { success: false, error: 'Audio file not found' }
      }

      // Return success - actual playback handled in renderer
      return { success: true, data: { filePath } }
    } catch (error) {
      log.error({ error, filePath }, 'Failed to play audio')
      return { success: false, error: 'Failed to play audio' }
    }
  })

  ipcMain.handle('pause-audio', async () => {
    return { success: true }
  })

  ipcMain.handle('stop-audio', async () => {
    return { success: true }
  })

  ipcMain.handle('seek-audio', async (_event: unknown, position: number) => {
    return { success: true, data: { position } }
  })

  ipcMain.handle('set-volume', async (_event: unknown, volume: number) => {
    return { success: true, data: { volume } }
  })

  ipcMain.handle('set-playback-rate', async (_event: unknown, rate: number) => {
    return { success: true, data: { rate } }
  })

  ipcMain.handle('get-current-time', async () => {
    return { success: true, data: 0 }
  })

  ipcMain.handle('get-duration', async () => {
    return { success: true, data: 0 }
  })

  // Load audio file as buffer for blob URL creation
  ipcMain.handle('load-audio-file', async (_event: unknown, filePath: string) => {
    try {
      // Validate and sanitize file path
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid file path' }
      }

      // Check if file exists
      const exists = await fs.pathExists(filePath)
      if (!exists) {
        log.error({ filePath }, 'Audio file not found')
        return { success: false, error: 'File not found on disk' }
      }

      // Read file as buffer
      const buffer = await fs.readFile(filePath)

      // Get MIME type from file extension
      const ext = filePath.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        m4a: 'audio/mp4',
        flac: 'audio/flac',
        aac: 'audio/aac',
      }
      const mimeType = mimeTypes[ext || ''] || 'audio/mpeg'

      log.info({ filePath, size: buffer.length, mimeType }, 'Audio file loaded successfully')

      return {
        success: true,
        data: {
          buffer: Array.from(buffer), // Convert to array for IPC transfer
          mimeType,
        },
      }
    } catch (error) {
      log.error({ error, filePath }, 'Failed to load audio file')
      return { success: false, error: 'Failed to read audio file' }
    }
  })
}
