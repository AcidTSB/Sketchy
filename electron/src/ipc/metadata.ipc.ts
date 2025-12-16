import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'

/**
 * PROJECT METADATA SYSTEM
 * Enhanced metadata management for audio production (BPM, Key, Mood, Genre)
 */

// Musical keys for validation
const MUSICAL_KEYS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
  'Cm',
  'C#m',
  'Dbm',
  'Dm',
  'D#m',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gbm',
  'Gm',
  'G#m',
  'Abm',
  'Am',
  'A#m',
  'Bbm',
  'Bm',
]

// Common moods
const MOODS = [
  'Energetic',
  'Chill',
  'Dark',
  'Happy',
  'Sad',
  'Aggressive',
  'Romantic',
  'Melancholic',
  'Uplifting',
  'Dreamy',
  'Intense',
  'Peaceful',
  'Mysterious',
  'Nostalgic',
  'Epic',
  'Playful',
  'Atmospheric',
  'Raw',
  'Smooth',
]

// Common genres
const GENRES = [
  'Hip-Hop',
  'Pop',
  'R&B',
  'EDM',
  'House',
  'Techno',
  'Rock',
  'Metal',
  'Jazz',
  'Classical',
  'Country',
  'Folk',
  'Reggae',
  'Soul',
  'Funk',
  'Trap',
  'Drill',
  'Lo-Fi',
  'Ambient',
  'Indie',
  'Alternative',
  'Dance',
  'Dubstep',
  'Drum & Bass',
  'Future Bass',
  'Synthwave',
]

export function registerMetadataHandlers() {
  // Get metadata options (for dropdowns)
  ipcMain.handle('get-metadata-options', async () => {
    return {
      success: true,
      data: {
        keys: MUSICAL_KEYS,
        moods: MOODS,
        genres: GENRES,
      },
    }
  })

  // Get project metadata
  ipcMain.handle('get-project-metadata', async (_event, projectId: number) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          bpm: true,
          musicalKey: true,
          mood: true,
          genre: true,
          notesJson: true,
        },
      })

      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      return { success: true, data: project }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to get project metadata')
      return { success: false, error: 'Failed to get project metadata' }
    }
  })

  // Update project metadata
  ipcMain.handle(
    'update-project-metadata',
    async (
      _event,
      projectId: number,
      metadata: {
        bpm?: number | null
        musicalKey?: string | null
        mood?: string | null
        genre?: string | null
      }
    ) => {
      try {
        // Validate BPM
        if (metadata.bpm !== undefined && metadata.bpm !== null) {
          if (metadata.bpm < 20 || metadata.bpm > 300) {
            return { success: false, error: 'BPM must be between 20 and 300' }
          }
        }

        // Validate key
        if (
          metadata.musicalKey !== undefined &&
          metadata.musicalKey !== null &&
          metadata.musicalKey !== ''
        ) {
          if (!MUSICAL_KEYS.includes(metadata.musicalKey)) {
            return { success: false, error: 'Invalid musical key' }
          }
        }

        const project = await prisma.project.update({
          where: { id: projectId },
          data: {
            bpm: metadata.bpm,
            musicalKey: metadata.musicalKey,
            mood: metadata.mood,
            genre: metadata.genre,
          },
        })

        log.info({ projectId, metadata }, 'Project metadata updated')
        return { success: true, data: project }
      } catch (error) {
        log.error({ error, projectId, metadata }, 'Failed to update project metadata')
        return { success: false, error: 'Failed to update project metadata' }
      }
    }
  )

  // Batch update metadata for multiple projects
  ipcMain.handle(
    'batch-update-metadata',
    async (
      _event,
      updates: {
        projectId: number
        bpm?: number | null
        musicalKey?: string | null
        mood?: string | null
        genre?: string | null
      }[]
    ) => {
      try {
        const results = []
        for (const update of updates) {
          const project = await prisma.project.update({
            where: { id: update.projectId },
            data: {
              bpm: update.bpm,
              musicalKey: update.musicalKey,
              mood: update.mood,
              genre: update.genre,
            },
          })
          results.push(project)
        }

        log.info({ count: updates.length }, 'Batch metadata update completed')
        return { success: true, data: results }
      } catch (error) {
        log.error({ error, updates }, 'Failed to batch update metadata')
        return { success: false, error: 'Failed to batch update metadata' }
      }
    }
  )

  // Search projects by metadata
  ipcMain.handle(
    'search-projects-by-metadata',
    async (
      _event,
      filters: {
        bpmMin?: number
        bpmMax?: number
        musicalKey?: string
        mood?: string
        genre?: string
      }
    ) => {
      try {
        const where: {
          bpm?: { gte?: number; lte?: number }
          musicalKey?: string
          mood?: string | { contains: string }
          genre?: string | { contains: string }
        } = {}

        if (filters.bpmMin !== undefined || filters.bpmMax !== undefined) {
          where.bpm = {}
          if (filters.bpmMin !== undefined) where.bpm.gte = filters.bpmMin
          if (filters.bpmMax !== undefined) where.bpm.lte = filters.bpmMax
        }

        if (filters.musicalKey) {
          where.musicalKey = filters.musicalKey
        }

        if (filters.mood) {
          where.mood = { contains: filters.mood }
        }

        if (filters.genre) {
          where.genre = { contains: filters.genre }
        }

        const projects = await prisma.project.findMany({
          where,
          include: {
            tracks: {
              include: { latestVersion: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })

        return { success: true, data: projects }
      } catch (error) {
        log.error({ error, filters }, 'Failed to search projects by metadata')
        return { success: false, error: 'Failed to search projects by metadata' }
      }
    }
  )
}
