import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'
import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import { app } from 'electron'

export function registerExportHandlers() {
  // Helper function to get app data path
  const getAppDataPath = () => {
    return path.join(app.getPath('userData'), 'studio-data')
  }

  // Export audio with effects applied using ffmpeg
  ipcMain.handle(
    'export-audio-with-effects',
    async (
      _event,
      payload: {
        inputPath: string
        trackId: number
        speed?: number
        pitch?: number
        volume?: number
        label?: string
      }
    ) => {
      try {
        const { inputPath, trackId, speed = 1.0, pitch = 0, volume = 0, label } = payload

        log.info({ trackId, speed, pitch, volume, inputPath }, 'Exporting audio with effects')
        console.log('[Export] Starting export:', { trackId, speed, pitch, volume, inputPath })

        // Get track info
        const track = await prisma.track.findUnique({
          where: { id: trackId },
        })

        if (!track) {
          console.error('[Export] Track not found:', trackId)
          return { success: false, error: 'Track not found' }
        }

        // Check if input file exists
        const inputExists = await fs.pathExists(inputPath)
        console.log('[Export] Input file exists:', inputExists, inputPath)

        if (!inputExists) {
          console.error('[Export] Input file not found:', inputPath)
          return { success: false, error: `Input file not found: ${inputPath}` }
        }

        // Create output directory
        const timestamp = Date.now()
        const appDataPath = getAppDataPath()
        console.log('[Export] App data path:', appDataPath)

        const versionDir = path.join(
          appDataPath,
          'projects',
          track.projectId.toString(),
          'versions',
          trackId.toString(),
          timestamp.toString()
        )

        console.log('[Export] Creating version directory:', versionDir)
        await fs.mkdir(versionDir, { recursive: true })
        console.log('[Export] Version directory created successfully')

        // Generate output filename
        const ext = path.extname(inputPath)
        const outputFileName = `edited_${timestamp}${ext}`
        const outputPath = path.join(versionDir, outputFileName)

        // Build ffmpeg command
        const ffmpegPath = process.resourcesPath
          ? path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
          : path.join(process.cwd(), 'resources', 'bin', 'ffmpeg.exe')

        console.log('[Export] ffmpeg path:', ffmpegPath)
        const ffmpegExists = await fs.pathExists(ffmpegPath)
        console.log('[Export] ffmpeg exists:', ffmpegExists)

        if (!ffmpegExists) {
          // Try alternative paths
          const altPath1 = path.join(process.cwd(), 'resources', 'bin', 'ffmpeg.exe')
          const altPath2 = 'ffmpeg' // System PATH
          console.log('[Export] Trying alternative paths:', { altPath1, altPath2 })

          return {
            success: false,
            error: `ffmpeg not found at ${ffmpegPath}. Please ensure ffmpeg is installed.`,
          }
        }

        const filters: string[] = []

        // Audio processing logic matching in-app playback:
        // - App uses playbackRate for speed (varispeed - affects both speed and pitch)
        // - App uses detune for pitch (separate pitch shift)
        //
        // Export strategy:
        // 1. If only speed changed: use varispeed (asetrate) to match app behavior
        // 2. If only pitch changed: use pitch shift (asetrate)
        // 3. If both changed: combine both effects

        const hasSpeedChange = speed !== 1.0
        const hasPitchChange = pitch !== 0

        if (hasSpeedChange && !hasPitchChange) {
          // Varispeed mode: speed affects both tempo and pitch (matches playbackRate in app)
          const clampedSpeed = Math.max(0.5, Math.min(2.0, speed))
          const newSampleRate = Math.round(44100 * clampedSpeed)
          filters.push(`asetrate=${newSampleRate},aresample=44100`)
          console.log('[Export] Using varispeed mode (speed only):', clampedSpeed)
        } else if (!hasSpeedChange && hasPitchChange) {
          // Pitch shift only (no speed change)
          const ratio = Math.pow(2, pitch / 12)
          const newSampleRate = Math.round(44100 * ratio)
          filters.push(`asetrate=${newSampleRate},aresample=44100`)
          console.log('[Export] Using pitch shift only:', pitch, 'semitones')
        } else if (hasSpeedChange && hasPitchChange) {
          // Both speed and pitch: combine effects
          // First apply speed (varispeed), then apply additional pitch shift
          const clampedSpeed = Math.max(0.5, Math.min(2.0, speed))
          const pitchRatio = Math.pow(2, pitch / 12)
          const combinedRatio = clampedSpeed * pitchRatio
          const newSampleRate = Math.round(44100 * combinedRatio)
          filters.push(`asetrate=${newSampleRate},aresample=44100`)
          console.log('[Export] Using combined speed+pitch:', {
            speed: clampedSpeed,
            pitch,
            combinedRatio,
          })
        }

        // Volume filter
        if (volume !== 0) {
          filters.push(`volume=${volume}dB`)
        }

        const args: string[] = [
          '-i',
          inputPath,
          '-y', // Overwrite output file
        ]

        if (filters.length > 0) {
          args.push('-af', filters.join(','))
        }

        args.push(outputPath)

        console.log('[Export] Running ffmpeg:', { ffmpegPath, args })
        console.log(
          '[Export] Full command:',
          `"${ffmpegPath}" ${args.map((a) => `"${a}"`).join(' ')}`
        )
        log.info({ ffmpegPath, args }, 'Running ffmpeg command')

        // Run ffmpeg
        await new Promise<void>((resolve, reject) => {
          const ffmpeg = spawn(ffmpegPath, args)

          let stderr = ''
          let stdout = ''

          ffmpeg.stdout.on('data', (data) => {
            stdout += data.toString()
          })

          ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString()
          })

          ffmpeg.on('close', (code) => {
            console.log('[Export] ffmpeg process closed with code:', code)
            console.log('[Export] ffmpeg stdout:', stdout)
            console.log('[Export] ffmpeg stderr:', stderr)

            if (code !== 0) {
              log.error({ code, stderr, stdout }, 'ffmpeg failed')
              console.error('[Export] ffmpeg failed with code:', code)
              reject(new Error(`ffmpeg process exited with code ${code}: ${stderr}`))
            } else {
              console.log('[Export] ffmpeg completed successfully')
              resolve()
            }
          })

          ffmpeg.on('error', (err) => {
            log.error({ error: err }, 'ffmpeg spawn error')
            console.error('[Export] ffmpeg spawn error:', err)
            reject(err)
          })
        })

        // Verify output file exists
        console.log('[Export] Checking if output file exists:', outputPath)
        const outputExists = await fs.pathExists(outputPath)
        console.log('[Export] Output file exists:', outputExists)

        if (!outputExists) {
          throw new Error(`Output file was not created: ${outputPath}`)
        }

        // Get file stats
        const stats = await fs.stat(outputPath)
        console.log('[Export] Output file created:', { outputPath, size: stats.size })

        // Create version record
        const versionLabel = label || `Edited (${new Date().toLocaleString()})`
        console.log('[Export] Creating version record with label:', versionLabel)

        const version = await prisma.fileVersion.create({
          data: {
            trackId,
            label: versionLabel,
            originalPath: outputPath,
            storedPath: outputPath,
            storageMode: 'copy',
            sizeBytes: stats.size,
          },
        })

        console.log('[Export] Version record created:', version.id)

        // Update track to use this new version
        await prisma.track.update({
          where: { id: trackId },
          data: {
            latestVersionId: version.id,
          },
        })

        console.log('[Export] Track updated with new version:', { trackId, versionId: version.id })
        log.info({ versionId: version.id, outputPath }, 'Audio exported with effects')

        return { success: true, data: { outputPath, versionId: version.id } }
      } catch (error) {
        console.error('[Export] Export failed with error:', error)
        log.error({ error, payload }, 'Failed to export audio with effects')
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export audio with effects',
        }
      }
    }
  )
}
