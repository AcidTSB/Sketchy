import { ipcMain, app } from 'electron'
import { prisma } from '../db/client'
import { UpdateTrackSchema, SaveRecordingSchema } from './schemas'
import { log } from '../utils/logger'
import { eventBus } from '../services/eventBus'
import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'

export function registerTrackHandlers() {
  // Get all tracks for a project
  ipcMain.handle('get-tracks', async (_event, projectId: number) => {
    try {
      const tracks = await prisma.track.findMany({
        where: { projectId },
        include: {
          latestVersion: true,
          folder: true,
          tags: {
            include: {
              tag: true,
            },
          },
          notes: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          versions: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      return { success: true, data: tracks }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to get tracks')
      return { success: false, error: 'Failed to get tracks' }
    }
  })

  // Get single track
  ipcMain.handle('get-track', async (_event, id: number) => {
    try {
      const track = await prisma.track.findUnique({
        where: { id },
        include: {
          latestVersion: true,
          folder: true,
          project: true,
          tags: {
            include: {
              tag: true,
            },
          },
          notes: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          versions: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      if (!track) {
        return { success: false, error: 'Track not found' }
      }

      return { success: true, data: track }
    } catch (error) {
      log.error({ error, id }, 'Failed to get track')
      return { success: false, error: 'Failed to get track' }
    }
  })

  // Update track
  ipcMain.handle('update-track', async (_event, id: number, payload: unknown) => {
    try {
      // Check if track is locked (status = "final")
      const existingTrack = await prisma.track.findUnique({
        where: { id },
        select: { status: true, title: true },
      })

      if (!existingTrack) {
        return { success: false, error: 'Track not found' }
      }

      const validated = UpdateTrackSchema.parse(payload)

      // If track is "final", only allow status change (unlock) or non-destructive updates
      if (existingTrack.status === 'final') {
        // Allow changing status (to unlock the track)
        if (validated.status && validated.status !== 'final') {
          log.info({ trackId: id }, 'Unlocking final track')
        } else if (!validated.status) {
          // Trying to modify locked track without changing status
          log.warn({ trackId: id }, 'Attempted to modify locked track')
          return {
            success: false,
            error: `Track "${existingTrack.title}" is locked (status: final). Change status to unlock.`,
          }
        }
      }

      const track = await prisma.track.update({
        where: { id },
        data: validated,
        include: {
          latestVersion: true,
          folder: true,
          tags: {
            include: {
              tag: true,
            },
          },
          notes: true,
          versions: true,
        },
      })
      log.info({ trackId: id }, 'Track updated')
      return { success: true, data: track }
    } catch (error) {
      log.error({ error, id, payload }, 'Failed to update track')
      return { success: false, error: 'Failed to update track' }
    }
  })

  // Delete track
  ipcMain.handle('delete-track', async (_event, id: number) => {
    try {
      // Check if track is locked (status = "final")
      const existingTrack = await prisma.track.findUnique({
        where: { id },
        select: { status: true, title: true },
      })

      if (!existingTrack) {
        return { success: false, error: 'Track not found' }
      }

      if (existingTrack.status === 'final') {
        log.warn({ trackId: id }, 'Attempted to delete locked track')
        return {
          success: false,
          error: `Cannot delete locked track "${existingTrack.title}". Change status from "final" to delete.`,
        }
      }

      const track = await prisma.track.findUnique({
        where: { id },
        include: { project: true },
      })

      await prisma.track.delete({
        where: { id },
      })
      log.info({ trackId: id }, 'Track deleted')

      // Emit track deleted event for notifications
      if (track) {
        eventBus.emitAppEvent('track:deleted', {
          userId: track.project.userId,
          entityType: 'track',
          entityId: id,
          action: 'delete',
          metadata: {
            trackName: track.title,
            projectId: track.projectId,
          },
        })
      }

      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete track')
      return { success: false, error: 'Failed to delete track' }
    }
  })

  // Get file versions for a track
  ipcMain.handle('get-file-versions', async (_event, trackId: number) => {
    try {
      const versions = await prisma.fileVersion.findMany({
        where: { trackId },
        orderBy: {
          createdAt: 'desc',
        },
      })
      return { success: true, data: versions }
    } catch (error) {
      log.error({ error, trackId }, 'Failed to get file versions')
      return { success: false, error: 'Failed to get file versions' }
    }
  })

  // Set latest version for a track
  ipcMain.handle('set-latest-version', async (_event, trackId: number, versionId: number) => {
    try {
      // Check if track is locked
      const existingTrack = await prisma.track.findUnique({
        where: { id: trackId },
        select: { status: true, title: true },
      })

      if (!existingTrack) {
        return { success: false, error: 'Track not found' }
      }

      if (existingTrack.status === 'final') {
        log.warn({ trackId }, 'Attempted to change version on locked track')
        return {
          success: false,
          error: `Track "${existingTrack.title}" is locked. Change status from "final" to modify.`,
        }
      }

      const track = await prisma.track.update({
        where: { id: trackId },
        data: {
          latestVersionId: versionId,
        },
        include: {
          latestVersion: true,
          versions: true,
        },
      })
      log.info({ trackId, versionId }, 'Latest version set')
      return { success: true, data: track }
    } catch (error) {
      log.error({ error, trackId, versionId }, 'Failed to set latest version')
      return { success: false, error: 'Failed to set latest version' }
    }
  })

  // Delete file version
  ipcMain.handle('delete-file-version', async (_event, id: number) => {
    try {
      // Check if this is the latest version
      const version = await prisma.fileVersion.findUnique({
        where: { id },
        include: {
          track: true,
        },
      })

      if (!version) {
        return { success: false, error: 'Version not found' }
      }

      // Check if track is locked
      if (version.track.status === 'final') {
        log.warn(
          { versionId: id, trackId: version.trackId },
          'Attempted to delete version on locked track'
        )
        return {
          success: false,
          error: `Track "${version.track.title}" is locked. Change status from "final" to delete versions.`,
        }
      }

      // If this is the latest version, clear the latest version
      if (version.track.latestVersionId === id) {
        await prisma.track.update({
          where: { id: version.trackId },
          data: {
            latestVersionId: null,
          },
        })
      }

      await prisma.fileVersion.delete({
        where: { id },
      })

      log.info({ versionId: id }, 'File version deleted')
      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete file version')
      return { success: false, error: 'Failed to delete file version' }
    }
  })

  // Move track to folder
  ipcMain.handle('move-track', async (_event, trackId: number, folderId: number | null) => {
    try {
      const track = await prisma.track.update({
        where: { id: trackId },
        data: {
          folderId,
        },
        include: {
          folder: true,
          latestVersion: true,
        },
      })
      log.info({ trackId, folderId }, 'Track moved')
      return { success: true, data: track }
    } catch (error) {
      log.error({ error, trackId, folderId }, 'Failed to move track')
      return { success: false, error: 'Failed to move track' }
    }
  })

  // Get stems for a track (permanent from DB + temporary from temp folder)
  ipcMain.handle('get-track-stems', async (_event, trackId: number) => {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const { app } = await import('electron')

      // 1. Get permanent stems from database
      const permanentStems = await prisma.track.findMany({
        where: {
          parentTrackId: trackId,
          stemType: { not: null },
        },
        include: {
          latestVersion: true,
        },
      })

      // 2. Get parent track info for projectId
      const parentTrack = await prisma.track.findUnique({
        where: { id: trackId },
        select: { projectId: true },
      })

      if (!parentTrack) {
        return { success: false, error: 'Parent track not found' }
      }

      // 3. Check temporary stems folder
      const appDataRoot = app.getPath('appData')
      const tempStemsDir = path.join(
        appDataRoot,
        'Sketchy',
        'projects',
        parentTrack.projectId.toString(),
        'temp-stems',
        trackId.toString()
      )

      const temporaryStems: { stem: string; path: string }[] = []
      try {
        const files = await fs.readdir(tempStemsDir)
        for (const file of files) {
          if (file.endsWith('.wav')) {
            const stemName = file.replace('.wav', '')
            const stemPath = path.join(tempStemsDir, file)
            temporaryStems.push({ stem: stemName, path: stemPath })
          }
        }
      } catch (error) {
        // Temp folder doesn't exist - that's OK
      }

      // 4. Format response
      const result = {
        permanent: permanentStems.map((track) => ({
          trackId: track.id,
          stem: track.stemType!,
          path: track.latestVersion?.originalPath || '',
          title: track.title,
        })),
        temporary: temporaryStems,
      }

      log.info({ trackId, result }, 'Got track stems')
      return { success: true, data: result }
    } catch (error) {
      log.error({ error, trackId }, 'Failed to get track stems')
      return { success: false, error: 'Failed to get track stems' }
    }
  })

  // Save recording from browser
  ipcMain.handle('save-recording', async (_event, payload: unknown) => {
    try {
      const validated = SaveRecordingSchema.parse(payload)
      const { projectId, folderId, name, durationMs, audioData, mimeType } = validated

      log.info({ projectId, name, durationMs }, 'Saving recording')

      // Determine file extension from mime type
      const extMap: Record<string, string> = {
        'audio/webm': '.webm',
        'audio/mp4': '.m4a',
        'audio/ogg': '.ogg',
        'audio/wav': '.wav',
        'audio/mpeg': '.mp3',
      }
      const ext = extMap[mimeType] || '.webm'

      // Create storage directory
      const appDataDir = app.getPath('appData')
      const storageDir = path.join(
        appDataDir,
        'Sketchy',
        'projects',
        String(projectId),
        'recordings'
      )
      await fs.ensureDir(storageDir)

      // Decode base64 audio data
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '')
      const audioBuffer = Buffer.from(base64Data, 'base64')

      // Generate unique filename
      const timestamp = Date.now()
      const randomId = crypto.randomBytes(4).toString('hex')
      const filename = `recording_${timestamp}_${randomId}${ext}`
      const filePath = path.join(storageDir, filename)

      // Write audio file
      await fs.writeFile(filePath, audioBuffer)

      // Compute checksum
      const checksum = crypto.createHash('sha256').update(audioBuffer).digest('hex')

      // Create track
      const track = await prisma.track.create({
        data: {
          projectId,
          folderId: folderId ?? null,
          title: name,
        },
      })

      // Create file version
      const fileVersion = await prisma.fileVersion.create({
        data: {
          trackId: track.id,
          originalPath: filePath,
          storedPath: filePath,
          storageMode: 'copy',
          checksum,
          mimeType,
          sizeBytes: audioBuffer.length,
          durationMs,
          metadataJson: JSON.stringify({
            source: 'recording',
            recordedAt: new Date().toISOString(),
          }),
        },
      })

      // Update track with latest version
      await prisma.track.update({
        where: { id: track.id },
        data: { latestVersionId: fileVersion.id },
      })

      // Fetch complete track data
      const completeTrack = await prisma.track.findUnique({
        where: { id: track.id },
        include: {
          latestVersion: true,
          folder: true,
          project: true,
        },
      })

      // Emit track created event for notifications
      if (completeTrack) {
        eventBus.emitAppEvent('track:created', {
          userId: completeTrack.project.userId,
          entityType: 'track',
          entityId: track.id,
          action: 'create',
          metadata: {
            trackName: completeTrack.title,
            projectId: completeTrack.projectId,
            source: 'recording',
          },
        })
      }

      log.info({ trackId: track.id, versionId: fileVersion.id }, 'Recording saved successfully')
      return { success: true, data: completeTrack }
    } catch (error) {
      log.error({ error }, 'Failed to save recording')
      return { success: false, error: 'Failed to save recording' }
    }
  })
}
