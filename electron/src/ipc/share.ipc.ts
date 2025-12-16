import { ipcMain } from 'electron'
import { prisma } from '../db/client'
import { CreateShareLinkSchema } from './schemas'
import { log } from '../utils/logger'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { uploadAudioFile, createShareLinkRecord } from '../lib/supabase'

export function registerShareHandlers() {
  // Get all share links
  ipcMain.handle('get-share-links', async () => {
    try {
      const links = await prisma.shareLink.findMany({
        where: {
          revoked: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      return { success: true, data: links }
    } catch (error) {
      log.error({ error }, 'Failed to get share links')
      return { success: false, error: 'Failed to get share links' }
    }
  })

  // Get single share link
  ipcMain.handle('get-share-link', async (_event, token: string) => {
    try {
      const link = await prisma.shareLink.findUnique({
        where: { token },
      })

      if (!link) {
        return { success: false, error: 'Share link not found' }
      }

      // Check if link is expired
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return { success: false, error: 'Share link expired' }
      }

      // Check if link is revoked
      if (link.revoked) {
        return { success: false, error: 'Share link revoked' }
      }

      return { success: true, data: link }
    } catch (error) {
      log.error({ error, token }, 'Failed to get share link')
      return { success: false, error: 'Failed to get share link' }
    }
  })

  // Create share link
  ipcMain.handle('create-share-link', async (_event, payload: unknown) => {
    try {
      const validated = CreateShareLinkSchema.parse(payload)

      // Generate random token
      const token = crypto.randomBytes(16).toString('hex')

      // Hash password if provided
      let passwordHash: string | undefined
      if (validated.password) {
        passwordHash = await bcrypt.hash(validated.password, 10)
      }

      let cloudFileUrl: string | undefined
      let projectName: string | undefined

      // If sharing a track, upload the audio file to cloud storage
      if (validated.trackId) {
        const track = await prisma.track.findUnique({
          where: { id: validated.trackId },
          include: {
            latestVersion: true,
          },
        })

        if (!track) {
          return { success: false, error: 'Track not found' }
        }

        projectName = track.title

        // Upload file to Supabase Storage if configured and localPath exists
        if (
          track.latestVersion?.storedPath &&
          process.env.SUPABASE_URL &&
          process.env.SUPABASE_SERVICE_KEY
        ) {
          try {
            // Read file from local storage
            const filePath = track.latestVersion.storedPath

            if (fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath)
              const fileExt = path.extname(filePath)
              const fileName = `${token}/${track.title}${fileExt}`

              // Upload to Supabase
              cloudFileUrl = await uploadAudioFile(fileBuffer, fileName)
              log.info({ trackId: track.id, cloudFileUrl }, 'Audio file uploaded to cloud')
            } else {
              log.warn({ filePath }, 'Local file not found, skipping upload')
            }
          } catch (uploadError) {
            log.error({ uploadError }, 'Failed to upload audio file')
            // Continue without cloud file URL
          }
        } else if (!process.env.SUPABASE_URL) {
          log.info('Supabase not configured, sharing local-only')
        }
      } else if (validated.projectId) {
        const project = await prisma.project.findUnique({
          where: { id: validated.projectId },
          select: { name: true },
        })
        projectName = project?.name
      }

      // Store in local SQLite database
      const shareLink = await prisma.shareLink.create({
        data: {
          token,
          trackId: validated.trackId,
          projectId: validated.projectId,
          passwordHash,
          expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
          cloudFileUrl,
          projectName,
        },
      })

      // Also store in Supabase for public access (if configured)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          await createShareLinkRecord({
            token,
            projectName,
            cloudFileUrl,
            passwordHash,
            expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
          })
          log.info({ token }, 'Share link synced to Supabase')
        } catch (supabaseError) {
          log.error({ supabaseError }, 'Failed to sync to Supabase')
          // Continue with local link only
        }
      }

      // Generate the public share URL
      const shareUrl = `${process.env.WEB_VIEWER_URL || 'http://localhost:3000'}/share/${token}`

      log.info({ shareLinkId: shareLink.id, token, shareUrl }, 'Share link created')
      return { success: true, data: { ...shareLink, shareUrl } }
    } catch (error) {
      log.error({ error, payload }, 'Failed to create share link')
      return { success: false, error: 'Failed to create share link' }
    }
  })

  // Verify share link password
  ipcMain.handle('verify-share-link-password', async (_event, token: string, password: string) => {
    try {
      const link = await prisma.shareLink.findUnique({
        where: { token },
      })

      if (!link || !link.passwordHash) {
        return { success: false, error: 'Invalid share link' }
      }

      const isValid = await bcrypt.compare(password, link.passwordHash)
      return { success: true, data: { valid: isValid } }
    } catch (error) {
      log.error({ error, token }, 'Failed to verify share link password')
      return { success: false, error: 'Failed to verify password' }
    }
  })

  // Revoke share link
  ipcMain.handle('revoke-share-link', async (_event, id: number) => {
    try {
      const link = await prisma.shareLink.update({
        where: { id },
        data: {
          revoked: true,
        },
      })
      log.info({ shareLinkId: id }, 'Share link revoked')
      return { success: true, data: link }
    } catch (error) {
      log.error({ error, id }, 'Failed to revoke share link')
      return { success: false, error: 'Failed to revoke share link' }
    }
  })

  // Delete share link
  ipcMain.handle('delete-share-link', async (_event, id: number) => {
    try {
      await prisma.shareLink.delete({
        where: { id },
      })
      log.info({ shareLinkId: id }, 'Share link deleted')
      return { success: true }
    } catch (error) {
      log.error({ error, id }, 'Failed to delete share link')
      return { success: false, error: 'Failed to delete share link' }
    }
  })

  // Get shared track/project data
  ipcMain.handle('get-shared-content', async (_event, token: string, password?: string) => {
    try {
      const link = await prisma.shareLink.findUnique({
        where: { token },
      })

      if (!link) {
        return { success: false, error: 'Share link not found' }
      }

      // Check expiration and revocation
      if (link.revoked) {
        return { success: false, error: 'Share link revoked' }
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return { success: false, error: 'Share link expired' }
      }

      // Check Password Logic
      if (link.passwordHash) {
        if (!password) {
          return {
            success: false,
            error: 'Password required',
            needsPassword: true,
          }
        }
        const isValid = await bcrypt.compare(password, link.passwordHash)
        if (!isValid) {
          return { success: false, error: 'Invalid password' }
        }
      }

      let data: unknown

      if (link.trackId) {
        // Get track data
        data = await prisma.track.findUnique({
          where: { id: link.trackId },
          include: {
            latestVersion: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      } else if (link.projectId) {
        // Get project data
        data = await prisma.project.findUnique({
          where: { id: link.projectId },
          include: {
            folders: {
              include: {
                tracks: {
                  include: {
                    latestVersion: true,
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
              },
            },
          },
        })
      }

      if (!data) {
        return { success: false, error: 'Shared content not found' }
      }

      return { success: true, data }
    } catch (error) {
      log.error({ error, token }, 'Failed to get shared content')
      return { success: false, error: 'Failed to get shared content' }
    }
  })

  // Get web viewer URL
  ipcMain.handle('get-web-viewer-url', async () => {
    try {
      const url = process.env.WEB_VIEWER_URL || 'http://localhost:3000'
      return { success: true, data: url }
    } catch (error) {
      log.error({ error }, 'Failed to get web viewer URL')
      return { success: false, error: 'Failed to get web viewer URL' }
    }
  })
}
