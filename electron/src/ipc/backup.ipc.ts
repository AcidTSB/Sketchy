import { ipcMain, app, dialog, shell } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import archiver from 'archiver'
import extract from 'extract-zip'
import { getCurrentUserId } from './auth-context'

/**
 * LOCAL BACKUP & EXPORT SYSTEM
 * Handles project backup, export to zip, and import from backup
 */

export function registerBackupHandlers() {
  const getAppDataPath = () => {
    return path.join(app.getPath('appData'), 'AudioProjectManager')
  }

  // ============================================
  // BACKUP & EXPORT
  // ============================================

  // Export project to zip file
  ipcMain.handle('export-project', async (_event, projectId: number) => {
    try {
      // Get project data
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tracks: {
            include: {
              latestVersion: true,
              versions: true,
              tags: { include: { tag: true } },
              notes: true,
            },
          },
          folders: true,
          snapshots: true,
        },
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Project',
        defaultPath: `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup.zip`,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      const zipPath = result.filePath

      // Create zip archive
      const output = fsSync.createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      return new Promise((resolve) => {
        output.on('close', async () => {
          // Save backup record
          const stats = await fs.stat(zipPath)
          await prisma.projectBackup.create({
            data: {
              projectId,
              backupPath: zipPath,
              sizeBytes: stats.size,
              isAutoBackup: false,
            },
          })

          log.info({ projectId, zipPath, size: stats.size }, 'Project exported')
          resolve({ success: true, data: { path: zipPath, size: stats.size } })
        })

        archive.on('error', (err) => {
          log.error({ error: err, projectId }, 'Failed to create archive')
          resolve({ success: false, error: 'Failed to create archive' })
        })

        archive.pipe(output)

        // Add metadata.json
        const metadata = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            bpm: project.bpm,
            musicalKey: project.musicalKey,
            mood: project.mood,
            genre: project.genre,
            notesJson: project.notesJson,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
          folders: project.folders,
          tracks: project.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            stemType: t.stemType,
            folderId: t.folderId,
            tags: t.tags.map((tt) => tt.tag.name),
            notes: t.notes,
            versions: t.versions.map((v) => ({
              id: v.id,
              label: v.label,
              fileName: path.basename(v.originalPath),
              durationMs: v.durationMs,
              sizeBytes: v.sizeBytes,
              createdAt: v.createdAt,
            })),
          })),
          snapshots: project.snapshots.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            createdAt: s.createdAt,
          })),
        }
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

        // Add audio files
        for (const track of project.tracks) {
          for (const version of track.versions) {
            if (version.originalPath && fsSync.existsSync(version.originalPath)) {
              const fileName = `tracks/${track.id}/${path.basename(version.originalPath)}`
              archive.file(version.originalPath, { name: fileName })
            }
          }
        }

        // Add snapshot files
        for (const snapshot of project.snapshots) {
          if (fsSync.existsSync(snapshot.snapshotPath)) {
            archive.directory(snapshot.snapshotPath, `snapshots/${snapshot.id}`)
          }
        }

        archive.finalize()
      })
    } catch (error) {
      log.error({ error, projectId }, 'Failed to export project')
      return { success: false, error: 'Failed to export project' }
    }
  })

  // Import project from zip file
  ipcMain.handle('import-project', async () => {
    try {
      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Import Project',
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        properties: ['openFile'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' }
      }

      const zipPath = result.filePaths[0]

      // Extract to temp directory
      const tempDir = path.join(getAppDataPath(), 'temp', `import_${Date.now()}`)
      await fs.mkdir(tempDir, { recursive: true })

      await extract(zipPath, { dir: tempDir })

      // Read metadata
      const metadataPath = path.join(tempDir, 'metadata.json')
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(metadataContent)

      const userId = getCurrentUserId()

      // Create new project
      const project = await prisma.project.create({
        data: {
          name: `${metadata.project.name} (Imported)`,
          description: metadata.project.description,
          bpm: metadata.project.bpm,
          musicalKey: metadata.project.musicalKey,
          mood: metadata.project.mood,
          genre: metadata.project.genre,
          notesJson: metadata.project.notesJson,
          userId,
        },
      })

      // Create folders
      const folderMap = new Map<number, number>()
      for (const folderData of metadata.folders || []) {
        const folder = await prisma.folder.create({
          data: {
            projectId: project.id,
            name: folderData.name,
          },
        })
        folderMap.set(folderData.id, folder.id)
      }

      // Create tracks and versions
      for (const trackData of metadata.tracks || []) {
        const track = await prisma.track.create({
          data: {
            projectId: project.id,
            title: trackData.title,
            status: trackData.status,
            stemType: trackData.stemType,
            folderId: trackData.folderId ? folderMap.get(trackData.folderId) : null,
          },
        })

        // Create tags
        for (const tagName of trackData.tags || []) {
          let tag = await prisma.tag.findUnique({ where: { name: tagName } })
          if (!tag) {
            tag = await prisma.tag.create({ data: { name: tagName } })
          }
          await prisma.trackTag.create({
            data: { trackId: track.id, tagId: tag.id },
          })
        }

        // Create notes
        for (const note of trackData.notes || []) {
          await prisma.note.create({
            data: {
              trackId: track.id,
              content: note.content,
            },
          })
        }

        // Import versions (copy files)
        const projectDir = path.join(
          getAppDataPath(),
          'projects',
          project.id.toString(),
          'tracks',
          track.id.toString()
        )
        await fs.mkdir(projectDir, { recursive: true })

        let latestVersionId: number | null = null
        for (const versionData of trackData.versions || []) {
          const srcPath = path.join(
            tempDir,
            'tracks',
            trackData.id.toString(),
            versionData.fileName
          )
          if (fsSync.existsSync(srcPath)) {
            const destPath = path.join(projectDir, versionData.fileName)
            await fs.copyFile(srcPath, destPath)

            const version = await prisma.fileVersion.create({
              data: {
                trackId: track.id,
                label: versionData.label,
                originalPath: destPath,
                storedPath: destPath,
                storageMode: 'copy',
                durationMs: versionData.durationMs,
                sizeBytes: versionData.sizeBytes,
              },
            })
            latestVersionId = version.id
          }
        }

        // Set latest version
        if (latestVersionId) {
          await prisma.track.update({
            where: { id: track.id },
            data: { latestVersionId },
          })
        }
      }

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true })

      log.info({ projectId: project.id }, 'Project imported')
      return { success: true, data: project }
    } catch (error) {
      log.error({ error }, 'Failed to import project')
      return { success: false, error: 'Failed to import project' }
    }
  })

  // Get backup history for a project
  ipcMain.handle('get-project-backups', async (_event, projectId: number) => {
    try {
      const backups = await prisma.projectBackup.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      })
      return { success: true, data: backups }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to get project backups')
      return { success: false, error: 'Failed to get project backups' }
    }
  })

  // Auto backup (called periodically)
  ipcMain.handle('auto-backup-project', async (_event, projectId: number) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tracks: { include: { latestVersion: true } },
        },
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      // Create auto backup directory
      const backupDir = path.join(getAppDataPath(), 'backups', 'auto')
      await fs.mkdir(backupDir, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const zipPath = path.join(backupDir, `${project.name}_auto_${timestamp}.zip`)

      // Create simple backup (metadata + current versions only)
      const output = fsSync.createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 6 } })

      return new Promise((resolve) => {
        output.on('close', async () => {
          const stats = await fs.stat(zipPath)
          await prisma.projectBackup.create({
            data: {
              projectId,
              backupPath: zipPath,
              sizeBytes: stats.size,
              isAutoBackup: true,
            },
          })

          // Clean old auto backups (keep last 5)
          const oldBackups = await prisma.projectBackup.findMany({
            where: { projectId, isAutoBackup: true },
            orderBy: { createdAt: 'desc' },
            skip: 5,
          })

          for (const backup of oldBackups) {
            try {
              await fs.unlink(backup.backupPath)
            } catch (e) {
              // Ignore if file doesn't exist
            }
            await prisma.projectBackup.delete({ where: { id: backup.id } })
          }

          log.info({ projectId, zipPath }, 'Auto backup created')
          resolve({ success: true, data: { path: zipPath, size: stats.size } })
        })

        archive.on('error', (err) => {
          resolve({ success: false, error: err.message })
        })

        archive.pipe(output)

        // Quick metadata
        const metadata = {
          projectId: project.id,
          name: project.name,
          backupType: 'auto',
          createdAt: new Date().toISOString(),
        }
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' })

        // Add current version files only
        for (const track of project.tracks) {
          if (
            track.latestVersion?.originalPath &&
            fsSync.existsSync(track.latestVersion.originalPath)
          ) {
            archive.file(track.latestVersion.originalPath, {
              name: `tracks/${track.id}_${path.basename(track.latestVersion.originalPath)}`,
            })
          }
        }

        archive.finalize()
      })
    } catch (error) {
      log.error({ error, projectId }, 'Failed to create auto backup')
      return { success: false, error: 'Failed to create auto backup' }
    }
  })

  // Delete a backup
  ipcMain.handle('delete-backup', async (_event, backupId: number) => {
    try {
      const backup = await prisma.projectBackup.findUnique({
        where: { id: backupId },
      })

      if (!backup) {
        return { success: false, error: 'Backup not found' }
      }

      // Delete file
      try {
        await fs.unlink(backup.backupPath)
      } catch (e) {
        // Ignore if file doesn't exist
        log.warn({ backupPath: backup.backupPath }, 'Backup file not found during delete')
      }

      // Delete from database
      await prisma.projectBackup.delete({
        where: { id: backupId },
      })

      log.info({ backupId }, 'Backup deleted')
      return { success: true }
    } catch (error) {
      log.error({ error, backupId }, 'Failed to delete backup')
      return { success: false, error: 'Failed to delete backup' }
    }
  })

  // Show item in folder (open in file explorer)
  ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (error) {
      log.error({ error, filePath }, 'Failed to show item in folder')
      return { success: false, error: 'Failed to show item in folder' }
    }
  })

  // Show open dialog
  ipcMain.handle(
    'show-open-dialog',
    async (
      _event,
      options: {
        title?: string
        defaultPath?: string
        buttonLabel?: string
        filters?: { name: string; extensions: string[] }[]
        properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[]
      }
    ) => {
      try {
        const result = await dialog.showOpenDialog(options)
        return result
      } catch (error) {
        log.error({ error }, 'Failed to show open dialog')
        return { canceled: true, filePaths: [] }
      }
    }
  )
}
