import { ipcMain, app } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * VERSION TIMELINE & SNAPSHOT SYSTEM
 * Handles project versioning, snapshots, and version comparison
 */

export function registerVersionHandlers() {
  // Get app data directory for storing snapshots
  const getAppDataPath = () => {
    return path.join(app.getPath('appData'), 'AudioProjectManager')
  }

  // ============================================
  // PROJECT SNAPSHOTS
  // ============================================

  // Create a new project snapshot
  ipcMain.handle(
    'create-project-snapshot',
    async (_event, projectId: number, name: string, description?: string) => {
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            tracks: {
              include: {
                latestVersion: true,
                tags: { include: { tag: true } },
              },
            },
            folders: true,
          },
        })

        if (!project) {
          return { success: false, error: 'Project not found' }
        }

        // Create snapshot directory
        const timestamp = Date.now()
        const snapshotDir = path.join(
          getAppDataPath(),
          'projects',
          projectId.toString(),
          'snapshots',
          timestamp.toString()
        )
        await fs.mkdir(snapshotDir, { recursive: true })

        // Copy all audio files to snapshot directory
        for (const track of project.tracks) {
          if (track.latestVersion?.originalPath) {
            const srcPath = track.latestVersion.originalPath
            const destPath = path.join(snapshotDir, `track_${track.id}_${path.basename(srcPath)}`)
            try {
              await fs.copyFile(srcPath, destPath)
            } catch (copyError) {
              log.warn({ srcPath, destPath, error: copyError }, 'Failed to copy file for snapshot')
            }
          }
        }

        // Create metadata JSON
        const metadata = {
          projectName: project.name,
          projectDescription: project.description,
          bpm: project.bpm,
          musicalKey: project.musicalKey,
          mood: project.mood,
          genre: project.genre,
          tracks: project.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            stemType: t.stemType,
            tags: t.tags.map((tt) => tt.tag.name),
            versionLabel: t.latestVersion?.label,
            durationMs: t.latestVersion?.durationMs,
          })),
          folders: project.folders.map((f) => ({ id: f.id, name: f.name })),
          createdAt: new Date().toISOString(),
        }

        // Save metadata file
        await fs.writeFile(
          path.join(snapshotDir, 'metadata.json'),
          JSON.stringify(metadata, null, 2)
        )

        // Create snapshot record in database
        const snapshot = await prisma.projectSnapshot.create({
          data: {
            projectId,
            name,
            description,
            snapshotPath: snapshotDir,
            metadataJson: JSON.stringify(metadata),
          },
        })

        log.info({ projectId, snapshotId: snapshot.id }, 'Project snapshot created')
        return { success: true, data: snapshot }
      } catch (error) {
        log.error({ error, projectId }, 'Failed to create project snapshot')
        return { success: false, error: 'Failed to create project snapshot' }
      }
    }
  )

  // Get all snapshots for a project
  ipcMain.handle('get-project-snapshots', async (_event, projectId: number) => {
    try {
      const snapshots = await prisma.projectSnapshot.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      })

      // Parse metadata for each snapshot
      const snapshotsWithMeta = snapshots.map((s) => ({
        ...s,
        metadata: s.metadataJson ? JSON.parse(s.metadataJson) : null,
      }))

      return { success: true, data: snapshotsWithMeta }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to get project snapshots')
      return { success: false, error: 'Failed to get project snapshots' }
    }
  })

  // Restore project from snapshot
  ipcMain.handle('restore-project-snapshot', async (_event, snapshotId: number) => {
    try {
      const snapshot = await prisma.projectSnapshot.findUnique({
        where: { id: snapshotId },
      })

      if (!snapshot) {
        return { success: false, error: 'Snapshot not found' }
      }

      // Read metadata from snapshot
      const metadataPath = path.join(snapshot.snapshotPath, 'metadata.json')
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)

      // Update project metadata
      await prisma.project.update({
        where: { id: snapshot.projectId },
        data: {
          bpm: metadata.bpm,
          musicalKey: metadata.musicalKey,
          mood: metadata.mood,
          genre: metadata.genre,
        },
      })

      log.info({ snapshotId }, 'Project restored from snapshot')
      return { success: true, data: { message: 'Project restored from snapshot', metadata } }
    } catch (error) {
      log.error({ error, snapshotId }, 'Failed to restore project snapshot')
      return { success: false, error: 'Failed to restore project snapshot' }
    }
  })

  // Delete snapshot
  ipcMain.handle('delete-project-snapshot', async (_event, snapshotId: number) => {
    try {
      const snapshot = await prisma.projectSnapshot.findUnique({
        where: { id: snapshotId },
      })

      if (!snapshot) {
        return { success: false, error: 'Snapshot not found' }
      }

      // Delete snapshot files
      try {
        await fs.rm(snapshot.snapshotPath, { recursive: true, force: true })
      } catch (fsError) {
        log.warn(
          { fsError, snapshotPath: snapshot.snapshotPath },
          'Failed to delete snapshot files'
        )
      }

      // Delete from database
      await prisma.projectSnapshot.delete({
        where: { id: snapshotId },
      })

      log.info({ snapshotId }, 'Project snapshot deleted')
      return { success: true }
    } catch (error) {
      log.error({ error, snapshotId }, 'Failed to delete project snapshot')
      return { success: false, error: 'Failed to delete project snapshot' }
    }
  })

  // ============================================
  // VERSION COMPARISON (A/B MODE)
  // ============================================

  // Get audio file for comparison
  ipcMain.handle(
    'get-version-audio',
    async (_event, versionId: number, versionType: 'file_version' | 'snapshot') => {
      try {
        if (versionType === 'file_version') {
          const version = await prisma.fileVersion.findUnique({
            where: { id: versionId },
          })
          if (!version) {
            return { success: false, error: 'Version not found' }
          }
          return {
            success: true,
            data: {
              path: version.originalPath,
              label: version.label,
              durationMs: version.durationMs,
            },
          }
        } else {
          const snapshot = await prisma.projectSnapshot.findUnique({
            where: { id: versionId },
          })
          if (!snapshot) {
            return { success: false, error: 'Snapshot not found' }
          }
          // Return snapshot metadata for comparison
          return {
            success: true,
            data: {
              path: snapshot.snapshotPath,
              label: snapshot.name,
              metadata: snapshot.metadataJson ? JSON.parse(snapshot.metadataJson) : null,
            },
          }
        }
      } catch (error) {
        log.error({ error, versionId, versionType }, 'Failed to get version audio')
        return { success: false, error: 'Failed to get version audio' }
      }
    }
  )

  // Save comparison session
  ipcMain.handle(
    'save-compare-session',
    async (
      _event,
      data: {
        projectId: number
        versionAId: number
        versionBId: number
        versionAType: string
        versionBType: string
        notes?: string
      }
    ) => {
      try {
        const session = await prisma.compareSession.create({
          data: {
            projectId: data.projectId,
            versionAId: data.versionAId,
            versionBId: data.versionBId,
            versionAType: data.versionAType,
            versionBType: data.versionBType,
            notes: data.notes,
          },
        })
        return { success: true, data: session }
      } catch (error) {
        log.error({ error, data }, 'Failed to save compare session')
        return { success: false, error: 'Failed to save compare session' }
      }
    }
  )

  // ============================================
  // FILE VERSION TIMELINE
  // ============================================

  // Get version timeline for a track
  ipcMain.handle('get-version-timeline', async (_event, trackId: number) => {
    try {
      const versions = await prisma.fileVersion.findMany({
        where: { trackId },
        orderBy: { createdAt: 'asc' },
      })

      // Get track info
      const track = await prisma.track.findUnique({
        where: { id: trackId },
        include: { latestVersion: true },
      })

      return {
        success: true,
        data: {
          trackId,
          trackTitle: track?.title,
          currentVersionId: track?.latestVersionId,
          versions: versions.map((v) => ({
            id: v.id,
            label: v.label || `Version ${v.id}`,
            createdAt: v.createdAt,
            durationMs: v.durationMs,
            sizeBytes: v.sizeBytes,
            isCurrent: v.id === track?.latestVersionId,
          })),
        },
      }
    } catch (error) {
      log.error({ error, trackId }, 'Failed to get version timeline')
      return { success: false, error: 'Failed to get version timeline' }
    }
  })

  // Create new version from existing file
  ipcMain.handle(
    'create-track-version',
    async (_event, trackId: number, label: string, sourcePath?: string) => {
      try {
        const track = await prisma.track.findUnique({
          where: { id: trackId },
          include: { latestVersion: true },
        })

        if (!track) {
          return { success: false, error: 'Track not found' }
        }

        // Use provided source path or copy from current version
        const fileToVersion = sourcePath || track.latestVersion?.originalPath
        if (!fileToVersion) {
          return { success: false, error: 'No source file to create version from' }
        }

        // Create version directory
        const timestamp = Date.now()
        const versionDir = path.join(
          getAppDataPath(),
          'projects',
          track.projectId.toString(),
          'versions',
          trackId.toString(),
          timestamp.toString()
        )
        await fs.mkdir(versionDir, { recursive: true })

        // Copy file to version directory
        const fileName = path.basename(fileToVersion)
        const destPath = path.join(versionDir, fileName)
        await fs.copyFile(fileToVersion, destPath)

        // Get file stats
        const stats = await fs.stat(destPath)

        // Create version record
        const version = await prisma.fileVersion.create({
          data: {
            trackId,
            label,
            originalPath: destPath,
            storedPath: destPath,
            storageMode: 'copy',
            sizeBytes: stats.size,
          },
        })

        log.info({ trackId, versionId: version.id }, 'Track version created')
        return { success: true, data: version }
      } catch (error) {
        log.error({ error, trackId }, 'Failed to create track version')
        return { success: false, error: 'Failed to create track version' }
      }
    }
  )
}
