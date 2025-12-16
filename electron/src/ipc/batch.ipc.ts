import { ipcMain, app, BrowserWindow } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import ffmpeg from 'fluent-ffmpeg'

/**
 * BATCH PROCESSING IPC HANDLERS
 * Handles batch conversion, renaming, normalization, and silence trimming
 */

export interface BatchConvertOptions {
  trackIds: number[]
  outputFormat: 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac'
  bitrate?: string // e.g., '320k', '256k', '192k'
  sampleRate?: number // e.g., 44100, 48000
  outputDir?: string
}

export interface BatchRenameOptions {
  trackIds: number[]
  template: string // e.g., "[BPM]_[KEY]_[NAME]"
  startNumber?: number
}

export interface NormalizeOptions {
  trackIds: number[]
  targetLUFS?: number // default: -14 LUFS (streaming standard)
  targetPeak?: number // default: -1 dBTP
  createNewVersion?: boolean
}

export interface TrimSilenceOptions {
  trackIds: number[]
  threshold?: number // dB threshold, default: -50dB
  minSilenceMs?: number // minimum silence duration to trim, default: 100ms
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

// Store for active batch operations
const activeBatches = new Map<string, { cancelled: boolean }>()

export function registerBatchHandlers(mainWindow: BrowserWindow) {
  const getAppDataPath = () => {
    return path.join(app.getPath('appData'), 'AudioProjectManager')
  }

  /**
   * Convert multiple audio files to a different format
   */
  ipcMain.handle('batch:convert', async (_event, options: BatchConvertOptions) => {
    const batchId = `convert_${Date.now()}`
    activeBatches.set(batchId, { cancelled: false })

    try {
      const { trackIds, outputFormat, bitrate, sampleRate, outputDir } = options
      const results: { trackId: number; success: boolean; outputPath?: string; error?: string }[] =
        []

      for (let i = 0; i < trackIds.length; i++) {
        const batch = activeBatches.get(batchId)
        if (batch?.cancelled) {
          break
        }

        const trackId = trackIds[i]

        try {
          const track = await prisma.track.findUnique({
            where: { id: trackId },
            include: { latestVersion: true, project: true },
          })

          if (!track?.latestVersion?.originalPath) {
            results.push({ trackId, success: false, error: 'No audio file found' })
            continue
          }

          // Send progress
          mainWindow.webContents.send('batch:progress', {
            batchId,
            currentFile: track.title,
            currentIndex: i + 1,
            totalFiles: trackIds.length,
            status: 'processing',
            message: `Converting ${track.title}...`,
          } as BatchProgress)

          const inputPath = track.latestVersion.originalPath
          const outputDirectory =
            outputDir ||
            path.join(getAppDataPath(), 'projects', track.projectId.toString(), 'converted')
          await fs.mkdir(outputDirectory, { recursive: true })

          const baseName = path.basename(inputPath, path.extname(inputPath))
          const outputPath = path.join(outputDirectory, `${baseName}.${outputFormat}`)

          await convertAudioFile(inputPath, outputPath, outputFormat, bitrate, sampleRate)

          results.push({ trackId, success: true, outputPath })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ trackId, success: false, error: errorMsg })
        }
      }

      mainWindow.webContents.send('batch:progress', {
        batchId,
        currentFile: '',
        currentIndex: trackIds.length,
        totalFiles: trackIds.length,
        status: 'complete',
        message: 'Batch conversion complete',
      } as BatchProgress)

      activeBatches.delete(batchId)
      return { success: true, data: { batchId, results } }
    } catch (error) {
      log.error({ error }, 'Batch convert failed')
      activeBatches.delete(batchId)
      return { success: false, error: 'Batch conversion failed' }
    }
  })

  /**
   * Batch rename tracks using template
   */
  ipcMain.handle('batch:rename', async (_event, options: BatchRenameOptions) => {
    const batchId = `rename_${Date.now()}`

    try {
      const { trackIds, template, startNumber = 1 } = options
      const results: { trackId: number; success: boolean; newName?: string; error?: string }[] = []

      for (let i = 0; i < trackIds.length; i++) {
        const trackId = trackIds[i]

        try {
          const track = await prisma.track.findUnique({
            where: { id: trackId },
            include: { latestVersion: true, project: true },
          })

          if (!track) {
            results.push({ trackId, success: false, error: 'Track not found' })
            continue
          }

          // Parse template
          let newName = template
            .replace('[NAME]', track.title)
            .replace('[TITLE]', track.title)
            .replace('[PROJECT]', track.project.name)
            .replace('[NUMBER]', String(startNumber + i).padStart(2, '0'))
            .replace('[INDEX]', String(i + 1).padStart(2, '0'))

          // Get BPM and Key from project metadata or analyze
          if (template.includes('[BPM]')) {
            const bpm = track.project.bpm || 'Unknown'
            newName = newName.replace('[BPM]', String(bpm))
          }

          if (template.includes('[KEY]')) {
            const key = track.project.musicalKey || 'Unknown'
            newName = newName.replace('[KEY]', key)
          }

          // Update track title
          await prisma.track.update({
            where: { id: trackId },
            data: { title: newName },
          })

          results.push({ trackId, success: true, newName })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ trackId, success: false, error: errorMsg })
        }
      }

      return { success: true, data: { batchId, results } }
    } catch (error) {
      log.error({ error }, 'Batch rename failed')
      return { success: false, error: 'Batch rename failed' }
    }
  })

  /**
   * Normalize audio files to target loudness
   */
  ipcMain.handle('batch:normalize', async (_event, options: NormalizeOptions) => {
    const batchId = `normalize_${Date.now()}`
    activeBatches.set(batchId, { cancelled: false })

    try {
      const { trackIds, targetLUFS = -14, targetPeak = -1, createNewVersion = true } = options
      const results: { trackId: number; success: boolean; outputPath?: string; error?: string }[] =
        []

      for (let i = 0; i < trackIds.length; i++) {
        const batch = activeBatches.get(batchId)
        if (batch?.cancelled) break

        const trackId = trackIds[i]

        try {
          const track = await prisma.track.findUnique({
            where: { id: trackId },
            include: { latestVersion: true },
          })

          if (!track?.latestVersion?.originalPath) {
            results.push({ trackId, success: false, error: 'No audio file found' })
            continue
          }

          mainWindow.webContents.send('batch:progress', {
            batchId,
            currentFile: track.title,
            currentIndex: i + 1,
            totalFiles: trackIds.length,
            status: 'processing',
            message: `Normalizing ${track.title}...`,
          } as BatchProgress)

          const inputPath = track.latestVersion.originalPath
          const ext = path.extname(inputPath)
          const baseName = path.basename(inputPath, ext)

          let outputPath: string
          if (createNewVersion) {
            const versionDir = path.join(
              getAppDataPath(),
              'projects',
              track.projectId.toString(),
              'versions',
              trackId.toString(),
              Date.now().toString()
            )
            await fs.mkdir(versionDir, { recursive: true })
            outputPath = path.join(versionDir, `${baseName}_normalized${ext}`)
          } else {
            outputPath = inputPath.replace(ext, `_normalized${ext}`)
          }

          await normalizeAudioFile(inputPath, outputPath, targetLUFS, targetPeak)

          // Create new version if requested
          if (createNewVersion) {
            const stats = await fs.stat(outputPath)
            const version = await prisma.fileVersion.create({
              data: {
                trackId,
                label: `Normalized (${targetLUFS} LUFS)`,
                originalPath: outputPath,
                storedPath: outputPath,
                storageMode: 'copy',
                sizeBytes: stats.size,
              },
            })

            await prisma.track.update({
              where: { id: trackId },
              data: { latestVersionId: version.id },
            })
          }

          results.push({ trackId, success: true, outputPath })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ trackId, success: false, error: errorMsg })
        }
      }

      mainWindow.webContents.send('batch:progress', {
        batchId,
        currentFile: '',
        currentIndex: trackIds.length,
        totalFiles: trackIds.length,
        status: 'complete',
        message: 'Normalization complete',
      } as BatchProgress)

      activeBatches.delete(batchId)
      return { success: true, data: { batchId, results } }
    } catch (error) {
      log.error({ error }, 'Batch normalize failed')
      activeBatches.delete(batchId)
      return { success: false, error: 'Batch normalization failed' }
    }
  })

  /**
   * Trim silence from audio files
   */
  ipcMain.handle('batch:trim-silence', async (_event, options: TrimSilenceOptions) => {
    const batchId = `trim_${Date.now()}`
    activeBatches.set(batchId, { cancelled: false })

    try {
      const { trackIds, threshold = -50, minSilenceMs = 100, createNewVersion = true } = options
      const results: {
        trackId: number
        success: boolean
        outputPath?: string
        trimmedMs?: number
        error?: string
      }[] = []

      for (let i = 0; i < trackIds.length; i++) {
        const batch = activeBatches.get(batchId)
        if (batch?.cancelled) break

        const trackId = trackIds[i]

        try {
          const track = await prisma.track.findUnique({
            where: { id: trackId },
            include: { latestVersion: true },
          })

          if (!track?.latestVersion?.originalPath) {
            results.push({ trackId, success: false, error: 'No audio file found' })
            continue
          }

          mainWindow.webContents.send('batch:progress', {
            batchId,
            currentFile: track.title,
            currentIndex: i + 1,
            totalFiles: trackIds.length,
            status: 'processing',
            message: `Trimming silence from ${track.title}...`,
          } as BatchProgress)

          const inputPath = track.latestVersion.originalPath
          const ext = path.extname(inputPath)
          const baseName = path.basename(inputPath, ext)

          let outputPath: string
          if (createNewVersion) {
            const versionDir = path.join(
              getAppDataPath(),
              'projects',
              track.projectId.toString(),
              'versions',
              trackId.toString(),
              Date.now().toString()
            )
            await fs.mkdir(versionDir, { recursive: true })
            outputPath = path.join(versionDir, `${baseName}_trimmed${ext}`)
          } else {
            outputPath = inputPath.replace(ext, `_trimmed${ext}`)
          }

          const trimmedMs = await trimSilence(inputPath, outputPath, threshold, minSilenceMs)

          if (createNewVersion && trimmedMs > 0) {
            const stats = await fs.stat(outputPath)
            const version = await prisma.fileVersion.create({
              data: {
                trackId,
                label: 'Silence Trimmed',
                originalPath: outputPath,
                storedPath: outputPath,
                storageMode: 'copy',
                sizeBytes: stats.size,
              },
            })

            await prisma.track.update({
              where: { id: trackId },
              data: { latestVersionId: version.id },
            })
          }

          results.push({ trackId, success: true, outputPath, trimmedMs })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.push({ trackId, success: false, error: errorMsg })
        }
      }

      mainWindow.webContents.send('batch:progress', {
        batchId,
        currentFile: '',
        currentIndex: trackIds.length,
        totalFiles: trackIds.length,
        status: 'complete',
        message: 'Silence trimming complete',
      } as BatchProgress)

      activeBatches.delete(batchId)
      return { success: true, data: { batchId, results } }
    } catch (error) {
      log.error({ error }, 'Batch trim silence failed')
      activeBatches.delete(batchId)
      return { success: false, error: 'Batch silence trimming failed' }
    }
  })

  /**
   * Cancel a batch operation
   */
  ipcMain.handle('batch:cancel', async (_event, batchId: string) => {
    const batch = activeBatches.get(batchId)
    if (batch) {
      batch.cancelled = true
      return { success: true }
    }
    return { success: false, error: 'Batch not found' }
  })
}

/**
 * Convert audio file using ffmpeg
 */
async function convertAudioFile(
  inputPath: string,
  outputPath: string,
  format: string,
  bitrate?: string,
  sampleRate?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath).toFormat(format)

    if (bitrate) {
      command = command.audioBitrate(bitrate)
    }

    if (sampleRate) {
      command = command.audioFrequency(sampleRate)
    }

    command
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath)
  })
}

/**
 * Normalize audio file to target LUFS
 */
async function normalizeAudioFile(
  inputPath: string,
  outputPath: string,
  targetLUFS: number,
  targetPeak: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Two-pass loudness normalization using loudnorm filter
    ffmpeg(inputPath)
      .audioFilters([`loudnorm=I=${targetLUFS}:TP=${targetPeak}:LRA=11:print_format=summary`])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath)
  })
}

/**
 * Trim silence from audio file
 * Returns the amount of silence trimmed in milliseconds
 */
async function trimSilence(
  inputPath: string,
  outputPath: string,
  thresholdDb: number,
  minSilenceMs: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    // Use silenceremove filter to trim silence from start and end
    const silenceDuration = minSilenceMs / 1000

    ffmpeg(inputPath)
      .audioFilters([
        // Remove silence from start
        `silenceremove=start_periods=1:start_duration=${silenceDuration}:start_threshold=${thresholdDb}dB`,
        // Remove silence from end (reverse, trim, reverse)
        `areverse`,
        `silenceremove=start_periods=1:start_duration=${silenceDuration}:start_threshold=${thresholdDb}dB`,
        `areverse`,
      ])
      .on('end', async () => {
        try {
          // Calculate trimmed duration
          const inputStats = await getAudioDuration(inputPath)
          const outputStats = await getAudioDuration(outputPath)
          const trimmedMs = Math.max(0, (inputStats - outputStats) * 1000)
          resolve(trimmedMs)
        } catch {
          resolve(0)
        }
      })
      .on('error', (err) => reject(err))
      .save(outputPath)
  })
}

/**
 * Get audio duration in seconds using ffprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
      } else {
        resolve(metadata.format.duration || 0)
      }
    })
  })
}
