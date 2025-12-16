import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { CreateTagSchema, AddTagToTrackSchema, CreateNoteSchema, UpdateNoteSchema } from './schemas'
import { log } from '../utils/logger'
import { eventBus } from '../services/eventBus'

export function registerTagsNotesHandlers() {
  // Get all tags
  ipcMain.handle('get-tags', async () => {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: {
          name: 'asc',
        },
      })
      return { success: true, data: tags }
    } catch (error) {
      log.error({ error }, 'Failed to get tags')
      return { success: false, error: 'Failed to get tags' }
    }
  })

  // Create tag
  ipcMain.handle('create-tag', async (_event: unknown, payload: unknown) => {
    try {
      const validated = CreateTagSchema.parse(payload)
      const tag = await prisma.tag.create({
        data: validated,
      })
      log.info({ tagId: tag.id }, 'Tag created')
      return { success: true, data: tag }
    } catch (error) {
      log.error({ error, payload }, 'Failed to create tag')
      return { success: false, error: 'Failed to create tag' }
    }
  })

  // Add tag to track
  ipcMain.handle('add-tag-to-track', async (_event: unknown, payload: unknown) => {
    try {
      const validated = AddTagToTrackSchema.parse(payload)
      await prisma.trackTag.create({
        data: validated,
      })
      log.info(validated, 'Tag added to track')
      return { success: true }
    } catch (error) {
      log.error({ error, payload }, 'Failed to add tag to track')
      return { success: false, error: 'Failed to add tag to track' }
    }
  })

  // Remove tag from track
  ipcMain.handle(
    'remove-tag-from-track',
    async (_event: unknown, trackId: number, tagId: number) => {
      try {
        await prisma.trackTag.delete({
          where: {
            trackId_tagId: {
              trackId,
              tagId,
            },
          },
        })
        log.info({ trackId, tagId }, 'Tag removed from track')
        return { success: true }
      } catch (error) {
        log.error({ error, trackId, tagId }, 'Failed to remove tag from track')
        return { success: false, error: 'Failed to remove tag from track' }
      }
    }
  )

  // Get notes for track
  ipcMain.handle('get-notes', async (_event: unknown, trackId: number) => {
    try {
      const notes = await prisma.note.findMany({
        where: { trackId },
        orderBy: {
          createdAt: 'desc',
        },
      })
      return { success: true, data: notes }
    } catch (error) {
      log.error({ error, trackId }, 'Failed to get notes')
      return { success: false, error: 'Failed to get notes' }
    }
  })

  // Create note
  ipcMain.handle('create-note', async (_event: unknown, payload: unknown) => {
    try {
      const validated = CreateNoteSchema.parse(payload)
      const note = await prisma.note.create({
        data: validated,
      })
      log.info({ noteId: note.id }, 'Note created')

      // Emit note added event for notifications
      const track = await prisma.track.findUnique({
        where: { id: validated.trackId },
        include: { project: true },
      })
      if (track) {
        eventBus.emitAppEvent('note:added', {
          userId: track.project.userId,
          entityType: 'note',
          entityId: note.id,
          action: 'create',
          metadata: {
            trackId: track.id,
            trackName: track.title,
            noteContent: note.content.substring(0, 100),
          },
        })
      }

      return { success: true, data: note }
    } catch (error) {
      log.error({ error, payload }, 'Failed to create note')
      return { success: false, error: 'Failed to create note' }
    }
  })

  // Update note
  ipcMain.handle('update-note', async (_event: unknown, id: number, payload: unknown) => {
    try {
      const validated = UpdateNoteSchema.parse(payload)
      const note = await prisma.note.update({
        where: { id },
        data: validated,
      })
      log.info({ noteId: id }, 'Note updated')
      return { success: true, data: note }
    } catch (error) {
      log.error({ error, id, payload }, 'Failed to update note')
      return { success: false, error: 'Failed to update note' }
    }
  })

  // Delete note
  ipcMain.handle('delete-note', async (_event: unknown, id: number) => {
    try {
      await prisma.note.delete({
        where: { id },
      })
      log.info({ noteId: id }, 'Note deleted')
      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete note')
      return { success: false, error: 'Failed to delete note' }
    }
  })
}
