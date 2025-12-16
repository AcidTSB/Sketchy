import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { log } from '../utils/logger'

/**
 * AUTO ORGANIZATION SYSTEM
 * Smart folder organizer based on file names
 */

export function registerOrganizeHandlers() {
  // Patterns for auto-organization
  const FOLDER_PATTERNS: { folder: string; patterns: RegExp[] }[] = [
    {
      folder: 'Drums',
      patterns: [
        /kick/i,
        /snare/i,
        /hat/i,
        /hi-hat/i,
        /hihat/i,
        /808/i,
        /drum/i,
        /clap/i,
        /perc/i,
        /cymbal/i,
        /tom/i,
        /ride/i,
        /crash/i,
        /shaker/i,
      ],
    },
    {
      folder: 'Vocals',
      patterns: [
        /vocal/i,
        /vox/i,
        /voice/i,
        /sing/i,
        /main.*vocal/i,
        /lead.*vocal/i,
        /backing/i,
        /harmony/i,
        /chorus/i,
        /verse/i,
        /hook/i,
        /adlib/i,
        /ad-lib/i,
      ],
    },
    {
      folder: 'Bass',
      patterns: [/bass/i, /sub/i, /low/i, /808.*bass/i],
    },
    {
      folder: 'Synths',
      patterns: [
        /synth/i,
        /pad/i,
        /lead/i,
        /keys/i,
        /keyboard/i,
        /piano/i,
        /organ/i,
        /arp/i,
        /chord/i,
        /pluck/i,
      ],
    },
    {
      folder: 'Guitars',
      patterns: [/guitar/i, /gtr/i, /acoustic/i, /electric/i, /strum/i, /riff/i],
    },
    {
      folder: 'FX',
      patterns: [
        /fx/i,
        /effect/i,
        /sfx/i,
        /riser/i,
        /sweep/i,
        /impact/i,
        /transition/i,
        /whoosh/i,
        /reverse/i,
      ],
    },
    {
      folder: 'Strings',
      patterns: [/string/i, /violin/i, /cello/i, /orchestra/i, /orchestral/i, /ensemble/i],
    },
    {
      folder: 'Samples',
      patterns: [/sample/i, /loop/i, /one-shot/i, /oneshot/i],
    },
  ]

  // Detect folder for a track based on its title
  const detectFolder = (title: string): string | null => {
    for (const { folder, patterns } of FOLDER_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(title)) {
          return folder
        }
      }
    }
    return null
  }

  // Auto-organize project tracks into folders
  ipcMain.handle('organize-project', async (_event, projectId: number) => {
    try {
      // Get all tracks
      const tracks = await prisma.track.findMany({
        where: { projectId },
        include: { folder: true },
      })

      // Get or create folders
      const folderMap = new Map<string, number>()
      const existingFolders = await prisma.folder.findMany({
        where: { projectId },
      })

      for (const folder of existingFolders) {
        folderMap.set(folder.name, folder.id)
      }

      const results = {
        organized: 0,
        skipped: 0,
        foldersCreated: 0,
        details: [] as { trackId: number; title: string; folder: string }[],
      }

      // Process each track
      for (const track of tracks) {
        const detectedFolder = detectFolder(track.title)

        if (!detectedFolder) {
          results.skipped++
          continue
        }

        // Create folder if needed
        if (!folderMap.has(detectedFolder)) {
          const newFolder = await prisma.folder.create({
            data: {
              projectId,
              name: detectedFolder,
            },
          })
          folderMap.set(detectedFolder, newFolder.id)
          results.foldersCreated++
        }

        const folderId = folderMap.get(detectedFolder)!

        // Skip if already in correct folder
        if (track.folderId === folderId) {
          results.skipped++
          continue
        }

        // Move track to folder
        await prisma.track.update({
          where: { id: track.id },
          data: { folderId },
        })

        results.organized++
        results.details.push({
          trackId: track.id,
          title: track.title,
          folder: detectedFolder,
        })
      }

      log.info({ projectId, results }, 'Project organized')
      return { success: true, data: results }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to organize project')
      return { success: false, error: 'Failed to organize project' }
    }
  })

  // Preview organization (dry run)
  ipcMain.handle('preview-organize-project', async (_event, projectId: number) => {
    try {
      const tracks = await prisma.track.findMany({
        where: { projectId },
        include: { folder: true },
      })

      const preview = tracks.map((track) => {
        const detectedFolder = detectFolder(track.title)
        return {
          trackId: track.id,
          title: track.title,
          currentFolder: track.folder?.name || null,
          suggestedFolder: detectedFolder,
          willMove: detectedFolder !== null && track.folder?.name !== detectedFolder,
        }
      })

      return { success: true, data: preview }
    } catch (error) {
      log.error({ error, projectId }, 'Failed to preview organization')
      return { success: false, error: 'Failed to preview organization' }
    }
  })

  // Get folder suggestions for a single track
  ipcMain.handle('suggest-folder', async (_event, title: string) => {
    try {
      const suggestion = detectFolder(title)
      return { success: true, data: { suggestion } }
    } catch (error) {
      log.error({ error, title }, 'Failed to suggest folder')
      return { success: false, error: 'Failed to suggest folder' }
    }
  })
}
