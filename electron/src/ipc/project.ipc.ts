import { ipcMain, dialog } from 'electron'
import { prisma } from '../db/client'
import { CreateProjectSchema, UpdateProjectSchema, CreateFolderSchema } from './schemas'
import { log } from '../utils/logger'
import { getCurrentUserId } from './auth-context'
import { eventBus } from '../services/eventBus'
import path from 'path'
import fs from 'fs'

export function registerProjectHandlers() {
  // Select audio files dialog
  ipcMain.handle('select-audio-files', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled) {
        return { success: false, error: 'Cancelled' }
      }

      return {
        success: true,
        data: result.filePaths.map((filePath) => ({
          path: filePath,
          name: path.basename(filePath),
        })),
      }
    } catch (error) {
      log.error({ error }, 'Failed to select audio files')
      return { success: false, error: 'Failed to select audio files' }
    }
  })

  // Select image file dialog
  ipcMain.handle('select-image-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null }
      }

      const filePath = result.filePaths[0]

      // Convert image to base64 data URL
      const imageBuffer = fs.readFileSync(filePath)
      const mimeType = getMimeType(filePath)
      const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`

      return {
        success: true,
        data: {
          path: filePath,
          name: path.basename(filePath),
          base64: base64Image,
        },
      }
    } catch (error) {
      log.error({ error }, 'Failed to select image file')
      return { success: false, error: 'Failed to select image file' }
    }
  })

  // Helper to get MIME type
  function getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
    }
    return mimeTypes[ext || ''] || 'image/jpeg'
  }

  // Get all projects
  ipcMain.handle('get-projects', async () => {
    try {
      const userId = getCurrentUserId()
      const projects = await prisma.project.findMany({
        where: { userId },
        include: {
          folders: true,
          tracks: {
            include: {
              latestVersion: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
      return { success: true, data: projects }
    } catch (error) {
      log.error({ error }, 'Failed to get projects')
      return { success: false, error: 'Failed to get projects' }
    }
  })

  // Get single project
  ipcMain.handle('get-project', async (_event, id: number) => {
    try {
      const userId = getCurrentUserId()
      const project = await prisma.project.findFirst({
        where: {
          id,
          userId, // Security: only get project if it belongs to current user
        },
        include: {
          folders: {
            include: {
              tracks: {
                include: {
                  latestVersion: true,
                  tags: {
                    include: {
                      tag: true,
                    },
                  },
                  notes: true,
                },
              },
            },
          },
          tracks: {
            where: {
              folderId: null,
            },
            include: {
              latestVersion: true,
              tags: {
                include: {
                  tag: true,
                },
              },
              notes: true,
            },
          },
        },
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      return { success: true, data: project }
    } catch (error) {
      log.error({ error, id }, 'Failed to get project')
      return { success: false, error: 'Failed to get project' }
    }
  })

  // Create project
  ipcMain.handle('create-project', async (_event, payload: unknown) => {
    try {
      const userId = getCurrentUserId()
      const validated = CreateProjectSchema.parse(payload)
      const project = await prisma.project.create({
        data: {
          ...validated,
          userId,
        },
        include: {
          folders: true,
          tracks: true,
        },
      })
      log.info({ projectId: project.id, userId }, 'Project created')

      // Emit project created event for notifications
      eventBus.emitAppEvent('project:updated', {
        userId,
        entityType: 'project',
        entityId: project.id,
        action: 'create',
        metadata: {
          projectName: project.name,
        },
      })

      return { success: true, data: project }
    } catch (error) {
      log.error({ error, payload }, 'Failed to create project')
      return { success: false, error: 'Failed to create project' }
    }
  })

  // Update project
  ipcMain.handle('update-project', async (_event, id: number, payload: unknown) => {
    try {
      const validated = UpdateProjectSchema.parse(payload)
      const project = await prisma.project.update({
        where: { id },
        data: validated,
        include: {
          folders: true,
          tracks: true,
        },
      })
      log.info({ projectId: id }, 'Project updated')

      // Emit project updated event for notifications
      eventBus.emitAppEvent('project:updated', {
        userId: project.userId,
        entityType: 'project',
        entityId: project.id,
        action: 'update',
        metadata: {
          projectName: project.name,
        },
      })

      return { success: true, data: project }
    } catch (error) {
      log.error({ error, id, payload }, 'Failed to update project')
      return { success: false, error: 'Failed to update project' }
    }
  })

  // Delete project
  ipcMain.handle('delete-project', async (_event, id: number) => {
    try {
      const userId = getCurrentUserId()
      const project = await prisma.project.findUnique({ where: { id } })

      await prisma.project.delete({
        where: { id },
      })
      log.info({ projectId: id }, 'Project deleted')

      // Emit project deleted event for notifications
      if (project) {
        eventBus.emitAppEvent('project:deleted', {
          userId,
          entityType: 'project',
          entityId: project.id,
          action: 'delete',
          metadata: {
            projectName: project.name,
          },
        })
      }

      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete project')
      return { success: false, error: 'Failed to delete project' }
    }
  })

  // Get folders
  ipcMain.handle('get-folders', async (_event, projectId: number) => {
    try {
      const folders = await prisma.folder.findMany({
        where: { projectId },
        include: {
          tracks: {
            include: {
              latestVersion: true,
            },
          },
        },
      })
      return { success: true, data: folders }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to get folders')
      return { success: false, error: 'Failed to get folders' }
    }
  })

  // Create folder
  ipcMain.handle('create-folder', async (_event, payload: unknown) => {
    try {
      const userId = getCurrentUserId()
      const validated = CreateFolderSchema.parse(payload)
      const folder = await prisma.folder.create({
        data: validated,
        include: {
          tracks: true,
        },
      })
      log.info({ folderId: folder.id }, 'Folder created')

      // Emit folder created event for notifications
      eventBus.emitAppEvent('project:updated', {
        userId,
        entityType: 'project',
        entityId: validated.projectId,
        action: 'create_folder',
        metadata: {
          folderName: folder.name,
        },
      })

      return { success: true, data: folder }
    } catch (error) {
      log.error({ error, payload }, 'Failed to create folder')
      return { success: false, error: 'Failed to create folder' }
    }
  })

  // Update folder
  ipcMain.handle('update-folder', async (_event, id: number, name: string) => {
    try {
      const folder = await prisma.folder.update({
        where: { id },
        data: { name },
        include: {
          tracks: true,
        },
      })
      log.info({ folderId: id }, 'Folder updated')
      return { success: true, data: folder }
    } catch (error) {
      log.error({ error, id, name }, 'Failed to update folder')
      return { success: false, error: 'Failed to update folder' }
    }
  })

  // Delete folder
  ipcMain.handle('delete-folder', async (_event, id: number) => {
    try {
      const userId = getCurrentUserId()
      const folder = await prisma.folder.findUnique({
        where: { id },
        include: { project: true },
      })

      await prisma.folder.delete({
        where: { id },
      })
      log.info({ folderId: id }, 'Folder deleted')

      // Emit folder deleted event for notifications
      if (folder) {
        eventBus.emitAppEvent('project:updated', {
          userId,
          entityType: 'project',
          entityId: folder.projectId,
          action: 'delete_folder',
          metadata: {
            folderName: folder.name,
          },
        })
      }

      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete folder')
      return { success: false, error: 'Failed to delete folder' }
    }
  })
}
